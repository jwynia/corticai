import * as ts from 'typescript';
import * as fs from 'fs/promises';
import type { FileAnalysis, Import, Export, AnalysisError } from './types';
import type { TSImportResolver } from './TSImportResolver';

/**
 * Dependencies for TSASTParser
 * Follows dependency injection pattern from Kuzu refactoring
 */
export interface TSASTParserDeps {
  importResolver: TSImportResolver;
  compilerOptions?: ts.CompilerOptions;
  log?: (message: string) => void;
}

/**
 * TSASTParser
 *
 * Responsible for TypeScript AST (Abstract Syntax Tree) parsing.
 * Extracts import and export information from TypeScript source files.
 *
 * Key responsibilities:
 * - Parse TypeScript/JavaScript files using TypeScript Compiler API
 * - Extract ES6 imports (default, named, namespace, type-only)
 * - Extract CommonJS require() statements
 * - Extract export declarations (default, named, re-exports)
 * - Resolve import paths to absolute file paths
 * - Handle syntax errors gracefully
 *
 * Design: Uses dependency injection for TSImportResolver, making it easily testable
 */
export class TSASTParser {
  private readonly importResolver: TSImportResolver;
  private readonly compilerOptions: ts.CompilerOptions;
  private readonly log?: (message: string) => void;

  constructor(deps: TSASTParserDeps) {
    this.importResolver = deps.importResolver;
    this.log = deps.log;

    // Set up TypeScript compiler options
    this.compilerOptions = deps.compilerOptions || {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      resolveJsonModule: true,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs
    };
  }

  /**
   * Parse a TypeScript file and extract imports, exports, and dependencies
   *
   * @param filePath - Absolute path to the file to parse
   * @returns FileAnalysis containing imports, exports, dependencies, and errors
   * @throws Error if file doesn't exist or has encoding issues
   */
  async parseFile(filePath: string): Promise<FileAnalysis> {
    // Validate input
    if (filePath === null || filePath === undefined) {
      throw new Error('Invalid file path: must be a string');
    }
    if (typeof filePath !== 'string') {
      throw new Error('Invalid file path: must be a string');
    }
    if (filePath === '') {
      throw new Error('Invalid file path: must be a string');
    }

    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file content
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
        // Check for binary content (null bytes or other control characters)
        if (content.includes('\0') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content)) {
          throw new Error(`File encoding error: ${filePath}`);
        }
      } catch (error) {
        // Re-throw encoding errors
        if (error instanceof Error && error.message.includes('File encoding error')) {
          throw error;
        }
        // Handle other read errors
        if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('byte'))) {
          throw new Error(`File encoding error: ${filePath}`);
        }
        throw error;
      }

      // Create source file
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.ESNext,
        true
      );

      const imports: Import[] = [];
      const exports: Export[] = [];
      const dependencies: string[] = [];
      const errors: AnalysisError[] = [];

      // Parse the AST
      const visit = (node: ts.Node) => {
        try {
          // Handle import declarations
          if (ts.isImportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier;
            if (ts.isStringLiteral(moduleSpecifier)) {
              const source = moduleSpecifier.text;
              const importInfo = this.extractImportInfo(node, source);
              imports.push(importInfo);

              // Resolve dependency path using injected resolver
              this.resolveDependencyAsync(filePath, source, dependencies);
            }
          }

          // Handle require() calls (CommonJS)
          if (
            ts.isCallExpression(node) &&
            node.expression.getText() === 'require' &&
            node.arguments.length > 0
          ) {
            const firstArg = node.arguments[0];
            if (ts.isStringLiteral(firstArg)) {
              const source = firstArg.text;

              // Determine the import type based on parent
              let specifiers: string[] = [];
              const parent = node.parent;

              if (ts.isVariableDeclaration(parent)) {
                const name = parent.name;
                if (ts.isIdentifier(name)) {
                  specifiers = [name.text];
                } else if (ts.isObjectBindingPattern(name)) {
                  specifiers = name.elements
                    .filter((e) => ts.isBindingElement(e) && e.name && ts.isIdentifier(e.name))
                    .map((e) => (e.name && ts.isIdentifier(e.name) ? e.name.text : ''))
                    .filter(Boolean);
                }
              }

              imports.push({
                source,
                type: 'commonjs',
                specifiers
              });

              this.resolveDependencyAsync(filePath, source, dependencies);
            }
          }

          // Handle export declarations
          if (ts.isExportDeclaration(node)) {
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
              node.exportClause.elements.forEach((element) => {
                exports.push({
                  name: element.name.text,
                  type: node.moduleSpecifier ? 're-export' : 'named'
                });
              });

              // Re-exports create implicit imports
              if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const source = node.moduleSpecifier.text;
                const specifiers = node.exportClause.elements.map((e) => e.name.text);
                imports.push({
                  source,
                  type: 'named',
                  specifiers
                });
                this.resolveDependencyAsync(filePath, source, dependencies);
              }
            } else if (node.moduleSpecifier) {
              // export * from '...'
              exports.push({
                name: '*',
                type: 're-export'
              });

              // export * creates implicit import
              if (ts.isStringLiteral(node.moduleSpecifier)) {
                const source = node.moduleSpecifier.text;
                imports.push({
                  source,
                  type: 'namespace',
                  specifiers: ['*']
                });
                this.resolveDependencyAsync(filePath, source, dependencies);
              }
            }
          }

          // Handle export assignments (export default)
          if (ts.isExportAssignment(node)) {
            exports.push({
              name: 'default',
              type: 'default'
            });
          }

          // Handle exported declarations
          if (ts.canHaveModifiers(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isVariableStatement(node)) {
              // Check for default export
              const hasDefault = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) || false;

              if (hasDefault) {
                exports.push({
                  name: 'default',
                  type: 'default'
                });
              } else {
                // Named exports
                if (ts.isFunctionDeclaration(node) && node.name) {
                  exports.push({
                    name: node.name.text,
                    type: 'named'
                  });
                } else if (ts.isClassDeclaration(node) && node.name) {
                  exports.push({
                    name: node.name.text,
                    type: 'named'
                  });
                } else if (ts.isVariableStatement(node)) {
                  node.declarationList.declarations.forEach((decl) => {
                    if (ts.isIdentifier(decl.name)) {
                      exports.push({
                        name: decl.name.text,
                        type: 'named'
                      });
                    }
                  });
                }
              }
            }

            // Handle type/interface exports
            if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)) {
              if (node.name) {
                exports.push({
                  name: node.name.text,
                  type: 'named'
                });
              }
            }
          }
        } catch (error) {
          errors.push({
            type: 'parse',
            message: error instanceof Error ? error.message : 'Unknown parsing error',
            location: {
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1
            }
          });
        }

        ts.forEachChild(node, visit);
      };

      // Check for syntax errors
      const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filePath], this.compilerOptions));

      if (diagnostics.length > 0) {
        diagnostics.forEach((diagnostic) => {
          if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            errors.push({
              type: 'parse',
              message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
              location: { line: line + 1, column: character + 1 }
            });
          }
        });
      }

      // Visit AST unless there are critical syntax errors
      const hasCriticalError = diagnostics.some(
        (d) => d.category === ts.DiagnosticCategory.Error && d.code >= 1000 && d.code < 2000 // Syntax error codes
      );

      if (!hasCriticalError) {
        visit(sourceFile);
      }

      // Resolve all dependencies asynchronously
      // Note: We collected dependency promises during AST traversal
      // Now we need to await them all
      const resolvedDeps = await this.resolvePendingDependencies(filePath, imports);
      resolvedDeps.forEach(dep => {
        if (dep && !dependencies.includes(dep)) {
          dependencies.push(dep);
        }
      });

      return {
        path: filePath,
        imports,
        exports,
        dependencies,
        dependents: [], // Will be filled during graph building
        ...(errors.length > 0 && { errors })
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('File not found')) {
        throw error;
      }

      // Handle encoding errors
      if (error instanceof Error && error.message.includes('Unknown encoding')) {
        throw new Error(`File encoding error: ${filePath}`);
      }

      throw new Error(`Failed to parse file ${filePath}: ${error}`);
    }
  }

  /**
   * Extract import information from an import declaration
   *
   * @param node - TypeScript import declaration node
   * @param source - The module being imported from
   * @returns Import object with type and specifiers
   */
  private extractImportInfo(node: ts.ImportDeclaration, source: string): Import {
    const importClause = node.importClause;

    if (!importClause) {
      // import 'module'; (side-effect import)
      return { source, type: 'named', specifiers: [] };
    }

    const specifiers: string[] = [];
    let type: Import['type'] = 'named';

    // Check for type-only import
    if (node.importClause?.isTypeOnly) {
      type = 'type';
    }

    // Default import
    if (importClause.name) {
      specifiers.push(importClause.name.text);
      type = type === 'type' ? 'type' : 'default';
    }

    // Named imports
    if (importClause.namedBindings) {
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        // import * as name from 'module'
        specifiers.push(importClause.namedBindings.name.text);
        type = type === 'type' ? 'type' : 'namespace';
      } else if (ts.isNamedImports(importClause.namedBindings)) {
        // import { a, b } from 'module'
        importClause.namedBindings.elements.forEach((element) => {
          specifiers.push(element.name.text);
        });
        if (!importClause.name) {
          type = type === 'type' ? 'type' : 'named';
        }
      }
    }

    return { source, type, specifiers };
  }

  /**
   * Helper to queue dependency resolution (synchronous placeholder)
   * Actual resolution happens in resolvePendingDependencies
   */
  private resolveDependencyAsync(fromFile: string, importSource: string, dependencies: string[]): void {
    // This is a placeholder - we collect imports and resolve them later
    // The dependencies array will be populated after AST traversal
  }

  /**
   * Resolve all pending dependencies after AST traversal
   *
   * @param fromFile - The file doing the importing
   * @param imports - All imports found in the file
   * @returns Array of resolved dependency paths (or null for external deps)
   */
  private async resolvePendingDependencies(fromFile: string, imports: Import[]): Promise<(string | null)[]> {
    const resolutions = await Promise.all(
      imports.map((imp) => this.importResolver.resolveDependencyPath(fromFile, imp.source))
    );
    return resolutions;
  }
}
