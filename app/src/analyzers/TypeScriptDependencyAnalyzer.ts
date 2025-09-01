import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  FileAnalysis,
  DependencyGraph,
  Cycle,
  Import,
  Export,
  ProjectAnalysis,
  Report,
  Node,
  Edge,
  AnalysisError,
  ModuleImportInfo,
  AnalyzerOptions
} from './types';

// Constants
const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const DEFAULT_EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];

/**
 * TypeScript Dependency Analyzer
 * Extracts and analyzes import/export relationships in TypeScript projects
 */
export class TypeScriptDependencyAnalyzer {
  private options: AnalyzerOptions;
  private compilerOptions: ts.CompilerOptions;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      includeJavaScript: true,
      includeNodeModules: false,
      extensions: DEFAULT_EXTENSIONS,
      excludeDirs: DEFAULT_EXCLUDE_DIRS,
      maxDepth: DEFAULT_MAX_DEPTH,
      verbose: false,
      ...options
    };

    // Set up TypeScript compiler options
    this.compilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      allowJs: this.options.includeJavaScript,
      resolveJsonModule: true,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs
    };
  }

  /**
   * Analyze a single TypeScript file
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis> {
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
              
              // Resolve dependency path
              const resolvedPath = this.resolveDependencyPath(filePath, source);
              this.addDependencyIfNew(dependencies, resolvedPath);
            }
          }

          // Handle require() calls (CommonJS)
          if (ts.isCallExpression(node) && 
              node.expression.getText() === 'require' &&
              node.arguments.length > 0) {
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
                    .filter(e => ts.isBindingElement(e) && e.name && ts.isIdentifier(e.name))
                    .map(e => e.name && ts.isIdentifier(e.name) ? e.name.text : '')
                    .filter(Boolean);
                }
              }

              imports.push({
                source,
                type: 'commonjs',
                specifiers
              });

              const resolvedPath = this.resolveDependencyPath(filePath, source);
              this.addDependencyIfNew(dependencies, resolvedPath);
            }
          }

          // Handle export declarations
          if (ts.isExportDeclaration(node)) {
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
              node.exportClause.elements.forEach(element => {
                exports.push({
                  name: element.name.text,
                  type: node.moduleSpecifier ? 're-export' : 'named'
                });
              });
            } else if (node.moduleSpecifier) {
              // export * from '...'
              exports.push({
                name: '*',
                type: 're-export'
              });
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
          if (ts.canHaveModifiers(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            if (ts.isFunctionDeclaration(node) || 
                ts.isClassDeclaration(node) ||
                ts.isVariableStatement(node)) {
              
              // Check for default export
              const hasDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) || false;
              
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
                  node.declarationList.declarations.forEach(decl => {
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
      const diagnostics = ts.getPreEmitDiagnostics(
        ts.createProgram([filePath], this.compilerOptions)
      );
      
      if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
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
      // We still parse if there are minor diagnostic issues (like missing files)
      // but skip if there are actual syntax problems
      const hasCriticalError = diagnostics.some(d => 
        d.category === ts.DiagnosticCategory.Error && 
        d.code >= 1000 && d.code < 2000 // Syntax error codes
      );
      
      if (!hasCriticalError) {
        visit(sourceFile);
      }

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
   * Add dependency to list if it's new
   */
  private addDependencyIfNew(dependencies: string[], path: string | null): void {
    if (path && !dependencies.includes(path)) {
      dependencies.push(path);
    }
  }

  /**
   * Extract import information from an import declaration
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
        importClause.namedBindings.elements.forEach(element => {
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
   * Resolve dependency path from import source
   */
  private resolveDependencyPath(fromFile: string, importSource: string): string | null {
    // Skip node_modules unless explicitly included
    if (!this.options.includeNodeModules && !importSource.startsWith('.')) {
      return null;
    }

    const dir = path.dirname(fromFile);
    
    // Handle relative imports
    if (importSource.startsWith('.')) {
      const basePath = path.resolve(dir, importSource);
      
      // Check if it already has an extension
      const extensions = this.options.extensions || DEFAULT_EXTENSIONS;
      for (const ext of extensions) {
        if (basePath.endsWith(ext)) {
          return basePath;
        }
      }
      
      // For files without extension, append .ts by default (TypeScript priority)
      // This matches TypeScript's module resolution
      if (!path.extname(basePath)) {
        return basePath + '.ts';
      }
      
      return basePath;
    }

    return null;
  }

  /**
   * Analyze all TypeScript files in a directory
   */
  async analyzeDirectory(dirPath: string): Promise<ProjectAnalysis> {
    const files: FileAnalysis[] = [];
    const allFiles = await this.findTypeScriptFiles(dirPath);
    
    for (const filePath of allFiles) {
      try {
        const analysis = await this.analyzeFile(filePath);
        files.push(analysis);
      } catch (error) {
        // Skip files that can't be analyzed, logging is handled by verbose option
        if (this.options.verbose) {
          // In production, errors should be handled by the caller or a logging service
          // For now, we silently skip files that can't be analyzed
        }
      }
    }

    // Calculate totals
    const totalImports = files.reduce((sum, f) => sum + f.imports.length, 0);
    const totalExports = files.reduce((sum, f) => sum + f.exports.length, 0);

    // Build dependency graph
    const graph = this.buildDependencyGraph(files);

    return {
      rootPath: dirPath,
      files,
      totalImports,
      totalExports,
      graph,
      timestamp: new Date()
    };
  }

  /**
   * Find all TypeScript files in directory recursively
   */
  private async findTypeScriptFiles(dirPath: string, depth = 0): Promise<string[]> {
    if (depth > (this.options.maxDepth || 10)) {
      return [];
    }

    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (this.options.excludeDirs?.includes(entry.name)) {
          continue;
        }
        
        const subFiles = await this.findTypeScriptFiles(fullPath, depth + 1);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.options.extensions?.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Build dependency graph from file analyses
   */
  buildDependencyGraph(files: FileAnalysis[]): DependencyGraph {
    const nodes = new Map<string, Node>();
    const edges = new Map<string, Edge[]>();

    // Create nodes
    for (const file of files) {
      nodes.set(file.path, {
        path: file.path,
        imports: file.imports.length,
        exports: file.exports.length
      });
    }

    // Create edges and update dependents
    for (const file of files) {
      const fileEdges: Edge[] = [];
      
      for (const dep of file.dependencies) {
        // Find the dependent file in our analysis
        // Need to handle path matching with/without extensions
        const dependentFile = files.find(f => {
          // Exact match
          if (f.path === dep) return true;
          // Match without extension
          const depWithoutExt = dep.replace(/\.(ts|tsx|js|jsx)$/, '');
          const fPathWithoutExt = f.path.replace(/\.(ts|tsx|js|jsx)$/, '');
          return depWithoutExt === fPathWithoutExt;
        });
        
        if (dependentFile) {
          // Update dependents array
          if (!dependentFile.dependents.includes(file.path)) {
            dependentFile.dependents.push(file.path);
          }
          
          // Add edge to the actual file path
          fileEdges.push({
            from: file.path,
            to: dependentFile.path,
            type: 'import'
          });
          
          // Also add this file as a node if it doesn't exist
          if (!nodes.has(dependentFile.path)) {
            nodes.set(dependentFile.path, {
              path: dependentFile.path,
              imports: dependentFile.imports.length,
              exports: dependentFile.exports.length
            });
          }
        }
      }

      if (fileEdges.length > 0) {
        edges.set(file.path, fileEdges);
      }
    }

    // Detect cycles
    const cycles = this.detectCycles({ nodes, edges, cycles: [] });

    return { nodes, edges, cycles };
  }

  /**
   * Detect circular dependencies using Tarjan's algorithm
   */
  detectCycles(graph: DependencyGraph): Cycle[] {
    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recursionStack.add(node);
      pathStack.push(node);

      const nodeEdges = graph.edges.get(node) || [];
      for (const edge of nodeEdges) {
        if (!visited.has(edge.to)) {
          dfs(edge.to);
        } else if (recursionStack.has(edge.to)) {
          // Found a cycle
          const cycleStartIndex = pathStack.indexOf(edge.to);
          const cycleNodes = pathStack.slice(cycleStartIndex);
          
          // Build cycle edges
          const cycleEdges: Edge[] = [];
          for (let i = 0; i < cycleNodes.length; i++) {
            const from = cycleNodes[i];
            const to = cycleNodes[(i + 1) % cycleNodes.length];
            cycleEdges.push({ from, to, type: 'import' });
          }

          // Check if this cycle is already recorded (in different order)
          const cycleSet = new Set(cycleNodes);
          const isNewCycle = !cycles.some(c => 
            c.nodes.length === cycleNodes.length &&
            c.nodes.every(n => cycleSet.has(n))
          );

          if (isNewCycle) {
            cycles.push({ nodes: cycleNodes, edges: cycleEdges });
          }
        }
      }

      recursionStack.delete(node);
      pathStack.pop();
    };

    // Run DFS from each unvisited node
    for (const node of graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Export graph as JSON
   */
  exportToJSON(graph: DependencyGraph): string {
    const jsonGraph = {
      nodes: Array.from(graph.nodes.entries()).map(([filePath, node]) => ({
        ...node,
        path: filePath
      })),
      edges: Array.from(graph.edges.entries()).flatMap(([from, edges]) =>
        edges.map(edge => ({ from, to: edge.to, type: edge.type }))
      ),
      cycles: graph.cycles
    };

    return JSON.stringify(jsonGraph, null, 2);
  }

  /**
   * Export graph in DOT format for Graphviz
   */
  exportToDOT(graph: DependencyGraph): string {
    const lines: string[] = ['digraph dependencies {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');
    
    // Create a set of nodes involved in cycles
    const cycleNodes = new Set<string>();
    graph.cycles.forEach(cycle => {
      cycle.nodes.forEach(node => cycleNodes.add(node));
    });

    // Add nodes
    for (const [path, node] of graph.nodes) {
      const fileName = path.split('/').pop() || path;
      const color = cycleNodes.has(path) ? ', fillcolor=red, style=filled' : '';
      lines.push(`  "${path}" [label="${fileName}"${color}];`);
    }

    // Add edges
    for (const [from, edges] of graph.edges) {
      for (const edge of edges) {
        // Check if this edge is part of a cycle
        const isInCycle = graph.cycles.some(cycle =>
          cycle.edges.some(e => e.from === from && e.to === edge.to)
        );
        const color = isInCycle ? ' [color=red]' : '';
        lines.push(`  "${from}" -> "${edge.to}"${color};`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate comprehensive report from project analysis
   */
  generateReport(analysis: ProjectAnalysis): Report {
    // Calculate most imported modules
    const importCounts = new Map<string, { count: number; importedBy: string[] }>();
    
    for (const file of analysis.files) {
      for (const dep of file.dependencies) {
        const existing = importCounts.get(dep) || { count: 0, importedBy: [] };
        existing.count++;
        existing.importedBy.push(file.path);
        importCounts.set(dep, existing);
      }
    }

    const mostImported: ModuleImportInfo[] = Array.from(importCounts.entries())
      .map(([path, info]) => ({
        path,
        importCount: info.count,
        importedBy: info.importedBy
      }))
      .sort((a, b) => b.importCount - a.importCount)
      .slice(0, 10);

    // Find unused exports
    const allImportedItems = new Set<string>();
    for (const file of analysis.files) {
      for (const imp of file.imports) {
        imp.specifiers.forEach(spec => allImportedItems.add(spec));
      }
    }

    const unusedExports: string[] = [];
    for (const file of analysis.files) {
      for (const exp of file.exports) {
        if (!allImportedItems.has(exp.name) && exp.name !== 'default' && exp.name !== '*') {
          unusedExports.push(exp.name);
        }
      }
    }

    // Find isolated files
    const isolatedFiles = analysis.files
      .filter(f => f.imports.length === 0 && f.exports.length === 0)
      .map(f => f.path);

    return {
      summary: {
        totalFiles: analysis.files.length,
        totalImports: analysis.totalImports,
        totalExports: analysis.totalExports,
        totalCycles: analysis.graph?.cycles.length || 0
      },
      mostImported,
      unusedExports,
      circularDependencies: analysis.graph?.cycles || [],
      isolatedFiles,
      timestamp: new Date()
    };
  }
}