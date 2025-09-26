import { UniversalFallbackAdapter } from './UniversalFallbackAdapter';
import type {
  DomainAdapter,
  Entity,
  FileMetadata,
  Relationship,
  EntityMetadata
} from '../types/entity';

/**
 * Codebase Adapter - Specialized for TypeScript/JavaScript code analysis
 *
 * Extends the Universal Fallback Adapter to provide enhanced analysis
 * for code files, including:
 * - Function detection with parameters, return types, and JSDoc
 * - Class analysis with methods, properties, and inheritance
 * - Import/export dependency tracking
 * - Call graph relationship detection
 * - TypeScript-specific constructs (interfaces, types, generics)
 */
export class CodebaseAdapter extends UniversalFallbackAdapter implements DomainAdapter {
  private entityCounter = 0;

  /**
   * Main extraction method - processes code content and returns enhanced entities
   */
  extract(content: string, metadata: FileMetadata): Entity[] {
    // First, get the base entities from the Universal Fallback Adapter
    const baseEntities = super.extract(content, metadata);

    // Reset counter for each extraction
    this.entityCounter = 0;

    // Only process TypeScript/JavaScript files
    if (!this.isCodeFile(metadata.extension)) {
      return baseEntities;
    }

    // Extract code-specific entities
    const codeEntities = this.extractCodeStructure(content, metadata);

    // Combine and return all entities
    return [...baseEntities, ...codeEntities];
  }

  /**
   * Enhanced relationship detection for code structures
   */
  detectRelationships(entities: Entity[]): Relationship[] {
    const baseRelationships = super.detectRelationships ? super.detectRelationships(entities) : [];

    // Get the full file content from the document entity to analyze function calls
    const documentEntity = entities.find(e => e.type === 'document');
    const fullContent = documentEntity?.content || '';

    const codeRelationships = [
      ...this.detectCallRelationships(entities, fullContent),
      ...this.detectInheritanceRelationships(entities),
      ...this.detectDependencyRelationships(entities)
    ];

    return [...baseRelationships, ...codeRelationships];
  }

  /**
   * Check if file extension indicates a code file
   */
  private isCodeFile(extension: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    return codeExtensions.includes(extension);
  }

  /**
   * Extract code-specific entities (functions, classes, imports, etc.)
   */
  private extractCodeStructure(content: string, metadata: FileMetadata): Entity[] {
    const entities: Entity[] = [];

    // Extract different types of code entities
    entities.push(...this.extractFunctions(content, metadata));
    entities.push(...this.extractClasses(content, metadata));
    entities.push(...this.extractInterfaces(content, metadata));
    entities.push(...this.extractTypes(content, metadata));
    entities.push(...this.extractEnums(content, metadata));
    entities.push(...this.extractImports(content, metadata));
    entities.push(...this.extractExports(content, metadata));
    entities.push(...this.extractNamespaces(content, metadata));

    return entities;
  }

  /**
   * Generate a unique ID for code entities
   */
  private generateCodeId(prefix: string): string {
    return `${prefix}_${++this.entityCounter}_${Date.now()}`;
  }

  /**
   * Extract function definitions with parameters, return types, and JSDoc
   */
  private extractFunctions(content: string, metadata: FileMetadata): Entity[] {
    const functions: Entity[] = [];
    const lines = content.split('\n');

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        continue;
      }

      // Try to match function declarations
      let functionName: string | undefined;
      let parameters: string[] = [];
      let returnType: string = '';
      let genericTypes: string[] = [];

      // Regular function declaration
      let match = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:<([^>]+)>)?\s*\(([^)]*)\)\s*:\s*([^{;]+)/.exec(trimmedLine);
      if (match) {
        functionName = match[1];
        genericTypes = match[2] ? match[2].split(',').map(t => t.trim()) : [];
        parameters = this.parseParameters(match[3]);
        returnType = this.parseReturnType(match[4]);
      } else {
        // Arrow function expression
        match = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*:\s*([^=]+)\s*=>/.exec(trimmedLine);
        if (match) {
          functionName = match[1];
          parameters = this.parseParameters(match[2]);
          returnType = this.parseReturnType(match[3]);
        }
      }

      if (functionName) {
        // Check for JSDoc comment above
        const jsDoc = this.extractJSDoc(lines, lineNumber - 1);

        functions.push({
          id: this.generateCodeId('function'),
          type: 'reference', // Using reference type with entityType metadata
          name: functionName,
          content: trimmedLine,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [lineNumber, lineNumber] as [number, number],
            entityType: 'function',
            parameters: parameters,
            returnType: returnType,
            genericTypes: genericTypes.length > 0 ? genericTypes : undefined,
            async: trimmedLine.includes('async'),
            jsDoc: jsDoc,
            format: metadata.extension
          }
        });
      }
    }

    return functions;
  }

  /**
   * Extract class definitions with methods, properties, and inheritance
   */
  private extractClasses(content: string, metadata: FileMetadata): Entity[] {
    const classes: Entity[] = [];
    const lines = content.split('\n');

    // Pattern for class declarations
    const classPattern = /(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+([a-zA-Z_$][a-zA-Z0-9_$<>]+))?\s*(?:implements\s+([a-zA-Z_$][a-zA-Z0-9_$<>,\s]+))?\s*{/g;

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      const match = classPattern.exec(trimmedLine);
      if (match) {
        const className = match[1];
        const extendsClass = match[2];
        const implementsInterfaces = match[3] ? match[3].split(',').map(i => i.trim()) : [];

        // Extract class body to analyze methods and properties
        const classBody = this.extractClassBody(lines, lineNumber);
        const methods = this.extractClassMethods(classBody);
        const properties = this.extractClassProperties(classBody);

        classes.push({
          id: this.generateCodeId('class'),
          type: 'container', // Classes are containers of methods and properties
          name: className,
          content: trimmedLine,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [lineNumber, lineNumber] as [number, number],
            entityType: 'class',
            extends: extendsClass,
            implements: implementsInterfaces.length > 0 ? implementsInterfaces : undefined,
            abstract: trimmedLine.includes('abstract'),
            methods: methods,
            properties: properties,
            format: metadata.extension
          }
        });
      }
      classPattern.lastIndex = 0; // Reset pattern
    }

    return classes;
  }

  /**
   * Extract interface definitions
   */
  private extractInterfaces(content: string, metadata: FileMetadata): Entity[] {
    const interfaces: Entity[] = [];
    const lines = content.split('\n');

    const interfacePattern = /(?:export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:<([^>]+)>)?\s*(?:extends\s+([a-zA-Z_$][a-zA-Z0-9_$<>,\s]+))?\s*{/g;

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      const match = interfacePattern.exec(trimmedLine);
      if (match) {
        const interfaceName = match[1];
        const genericTypes = match[2] ? match[2].split(',').map(t => t.trim()) : [];
        const extendsInterfaces = match[3] ? match[3].split(',').map(i => i.trim()) : [];

        // Extract interface body
        const interfaceBody = this.extractClassBody(lines, lineNumber);
        const methods = this.extractInterfaceMethods(interfaceBody);
        const properties = this.extractInterfaceProperties(interfaceBody);

        interfaces.push({
          id: this.generateCodeId('interface'),
          type: 'container',
          name: interfaceName,
          content: trimmedLine,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [lineNumber, lineNumber] as [number, number],
            entityType: 'interface',
            genericTypes: genericTypes.length > 0 ? genericTypes : undefined,
            extends: extendsInterfaces.length > 0 ? extendsInterfaces.join(', ') : undefined,
            methods: methods,
            properties: properties,
            format: metadata.extension
          }
        });
      }
      interfacePattern.lastIndex = 0;
    }

    return interfaces;
  }

  /**
   * Extract type definitions
   */
  private extractTypes(content: string, metadata: FileMetadata): Entity[] {
    const types: Entity[] = [];
    const lines = content.split('\n');

    const typePattern = /(?:export\s+)?type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(.+);/g;

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      const match = typePattern.exec(trimmedLine);
      if (match) {
        const typeName = match[1];
        const definition = match[2].trim();

        types.push({
          id: this.generateCodeId('type'),
          type: 'reference',
          name: typeName,
          content: trimmedLine,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [lineNumber, lineNumber] as [number, number],
            entityType: 'type',
            definition: definition,
            format: metadata.extension
          }
        });
      }
      typePattern.lastIndex = 0;
    }

    return types;
  }

  /**
   * Extract enum definitions
   */
  private extractEnums(content: string, metadata: FileMetadata): Entity[] {
    const enums: Entity[] = [];
    const lines = content.split('\n');

    const enumPattern = /(?:export\s+)?enum\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*{/g;

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      const match = enumPattern.exec(trimmedLine);
      if (match) {
        const enumName = match[1];
        const enumBody = this.extractClassBody(lines, lineNumber);
        const values = this.extractEnumValues(enumBody);

        enums.push({
          id: this.generateCodeId('enum'),
          type: 'container',
          name: enumName,
          content: trimmedLine,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [lineNumber, lineNumber] as [number, number],
            entityType: 'enum',
            values: values,
            format: metadata.extension
          }
        });
      }
      enumPattern.lastIndex = 0;
    }

    return enums;
  }

  /**
   * Extract import statements
   */
  private extractImports(content: string, metadata: FileMetadata): Entity[] {
    const imports: Entity[] = [];
    const lines = content.split('\n');

    const patterns = [
      // Named imports: import { a, b } from 'module'
      /import\s*{\s*([^}]+)\s*}\s*from\s*['"']([^'"]+)['"];?/g,
      // Default imports: import defaultExport from 'module'
      /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*from\s*['"']([^'"]+)['"];?/g,
      // Namespace imports: import * as name from 'module'
      /import\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*from\s*['"']([^'"]+)['"];?/g,
      // Type-only imports: import type { Type } from 'module'
      /import\s+type\s*{\s*([^}]+)\s*}\s*from\s*['"']([^'"]+)['"];?/g
    ];

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      if (!trimmedLine.startsWith('import')) continue;

      for (const [index, pattern] of patterns.entries()) {
        pattern.lastIndex = 0;
        const match = pattern.exec(trimmedLine);

        if (match) {
          const source = match[2];
          let importType: string;
          let importData: any = {};

          switch (index) {
            case 0: // Named imports
              importType = 'named';
              importData.imports = match[1].split(',').map(imp => imp.trim());
              break;
            case 1: // Default imports
              importType = 'default';
              importData.defaultImport = match[1];
              break;
            case 2: // Namespace imports
              importType = 'namespace';
              importData.namespace = match[1];
              break;
            case 3: // Type-only imports
              importType = 'named';
              importData.imports = match[1].split(',').map(imp => imp.trim());
              importData.typeOnly = true;
              break;
          }

          imports.push({
            id: this.generateCodeId('import'),
            type: 'reference',
            name: `import from ${source}`,
            content: trimmedLine,
            metadata: {
              filename: metadata.filename,
              lineNumbers: [lineNumber, lineNumber] as [number, number],
              entityType: 'import',
              source: source,
              importType: importType,
              isLocal: source.startsWith('.'),
              ...importData,
              format: metadata.extension
            }
          });
          break;
        }
      }
    }

    return imports;
  }

  /**
   * Extract export statements
   */
  private extractExports(content: string, metadata: FileMetadata): Entity[] {
    const exports: Entity[] = [];
    const lines = content.split('\n');

    const exportPattern = /export\s*(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)?\s*(?:{\s*([^}]+)\s*})?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)?/g;

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      if (!trimmedLine.startsWith('export')) continue;

      const match = exportPattern.exec(trimmedLine);
      if (match) {
        const namedExports = match[1] ? match[1].split(',').map(exp => exp.trim()) : [];
        const directExport = match[2];

        exports.push({
          id: this.generateCodeId('export'),
          type: 'reference',
          name: `export: ${directExport || namedExports.join(', ')}`,
          content: trimmedLine,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [lineNumber, lineNumber] as [number, number],
            entityType: 'export',
            exports: namedExports.length > 0 ? namedExports : [directExport].filter(Boolean),
            isDefault: trimmedLine.includes('export default'),
            format: metadata.extension
          }
        });
      }
      exportPattern.lastIndex = 0;
    }

    return exports;
  }

  /**
   * Extract namespace definitions
   */
  private extractNamespaces(content: string, metadata: FileMetadata): Entity[] {
    const namespaces: Entity[] = [];
    const lines = content.split('\n');

    const namespacePattern = /(?:export\s+)?namespace\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*{/g;

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      const match = namespacePattern.exec(trimmedLine);
      if (match) {
        const namespaceName = match[1];

        namespaces.push({
          id: this.generateCodeId('namespace'),
          type: 'container',
          name: namespaceName,
          content: trimmedLine,
          metadata: {
            filename: metadata.filename,
            lineNumbers: [lineNumber, lineNumber] as [number, number],
            entityType: 'namespace',
            format: metadata.extension
          }
        });
      }
      namespacePattern.lastIndex = 0;
    }

    return namespaces;
  }

  /**
   * Detect call relationships between functions
   */
  private detectCallRelationships(entities: Entity[], fullContent: string): Relationship[] {
    const relationships: Relationship[] = [];
    const functionEntities = entities.filter(e => e.metadata?.entityType === 'function');

    // Create a map of function names for quick lookup
    const functionMap = new Map<string, Entity>();
    functionEntities.forEach(func => {
      functionMap.set(func.name, func);
    });

    // Analyze the full content for function calls
    const callPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match;
    const foundCalls = new Set<string>(); // Track unique calls to avoid duplicates

    while ((match = callPattern.exec(fullContent)) !== null) {
      const calledFunction = match[1];

      // Skip language keywords and built-ins
      if (this.isLanguageKeyword(calledFunction)) continue;

      // Check if this is a call to a function we've extracted
      const targetFunction = functionMap.get(calledFunction);
      if (targetFunction) {
        // Try to find which function contains this call
        // This is a simplified approach - in a real implementation,
        // we'd need more sophisticated parsing to determine the calling context

        // For now, create relationships between functions that are called
        for (const func of functionEntities) {
          if (func.name !== calledFunction) {
            const callKey = `${func.name}->${calledFunction}`;
            if (!foundCalls.has(callKey)) {
              foundCalls.add(callKey);

              relationships.push({
                type: 'references',
                target: targetFunction.id,
                metadata: {
                  relationshipType: 'calls',
                  caller: func.name,
                  callee: calledFunction
                }
              });
            }
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Detect inheritance relationships between classes
   */
  private detectInheritanceRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    const classEntities = entities.filter(e => e.metadata?.entityType === 'class');

    for (const cls of classEntities) {
      const extendsClass = cls.metadata?.extends;
      if (extendsClass) {
        // Find the parent class entity
        const parentClass = classEntities.find(c => c.name === extendsClass);
        if (parentClass) {
          relationships.push({
            type: 'references', // Using references for inheritance
            target: parentClass.id,
            metadata: {
              relationshipType: 'extends',
              child: cls.name,
              parent: extendsClass
            }
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Detect dependency relationships for imports
   */
  private detectDependencyRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    const importEntities = entities.filter(e => e.metadata?.entityType === 'import');

    for (const imp of importEntities) {
      // Create dependency relationship
      relationships.push({
        type: 'references', // Using references for dependencies
        target: imp.id, // Self-reference for now, could be enhanced
        metadata: {
          relationshipType: 'depends-on',
          source: imp.metadata?.source,
          importType: imp.metadata?.importType,
          isLocal: imp.metadata?.isLocal
        }
      });
    }

    return relationships;
  }

  /**
   * Helper methods for parsing
   */
  private parseParameters(paramString: string): string[] {
    if (!paramString.trim()) return [];
    return paramString.split(',').map(p => p.trim()).filter(p => p);
  }

  private parseReturnType(returnString: string): string {
    return returnString.replace(/[{}]/g, '').trim();
  }

  private extractJSDoc(lines: string[], lineIndex: number): any {
    // Look for JSDoc comment above the current line
    let jsDocStart = -1;
    let jsDocEnd = -1;

    // Scan backwards for JSDoc start
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.endsWith('*/')) {
        jsDocEnd = i;
      }
      if (line.startsWith('/**')) {
        jsDocStart = i;
        break;
      }
      if (!line.startsWith('*') && !line.startsWith('*/') && line !== '') {
        break; // Found non-JSDoc content
      }
    }

    if (jsDocStart === -1 || jsDocEnd === -1) return undefined;

    // Extract JSDoc content
    const jsDocLines = lines.slice(jsDocStart, jsDocEnd + 1);
    const jsDocText = jsDocLines.join('\n');

    // Parse JSDoc (simplified parsing)
    const description = this.parseJSDocDescription(jsDocText);
    const params = this.parseJSDocParams(jsDocText);
    const returns = this.parseJSDocReturns(jsDocText);

    return { description, params, returns };
  }

  private parseJSDocDescription(jsDoc: string): string {
    const lines = jsDoc.split('\n');
    const descriptionLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('/**') || trimmed.startsWith('*/')) continue;
      if (trimmed.startsWith('* @')) break; // Stop at first tag
      if (trimmed.startsWith('*')) {
        descriptionLines.push(trimmed.substring(1).trim());
      }
    }

    return descriptionLines.join(' ').trim();
  }

  private parseJSDocParams(jsDoc: string): any[] {
    const paramPattern = /\*\s*@param\s+(\w+)\s*-?\s*(.+)/g;
    const params = [];
    let match;

    while ((match = paramPattern.exec(jsDoc)) !== null) {
      params.push({
        name: match[1],
        description: match[2].trim()
      });
    }

    return params;
  }

  private parseJSDocReturns(jsDoc: string): string | undefined {
    const returnPattern = /\*\s*@returns?\s+(.+)/;
    const match = returnPattern.exec(jsDoc);
    return match ? match[1].trim() : undefined;
  }

  private extractClassBody(lines: string[], startLine: number): string[] {
    const body = [];
    let braceCount = 0;
    let started = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (started) {
        body.push(line);
      }

      if (started && braceCount === 0) {
        break;
      }
    }

    return body;
  }

  private extractClassMethods(classBody: string[]): any[] {
    const methods = [];
    const methodPattern = /(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(async)\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*:\s*([^{;]+)/g;

    for (const line of classBody) {
      const match = methodPattern.exec(line.trim());
      if (match) {
        methods.push({
          name: match[4],
          visibility: match[1] || 'public',
          static: !!match[2],
          async: !!match[3],
          parameters: this.parseParameters(match[5]),
          returnType: match[6].trim()
        });
      }
      methodPattern.lastIndex = 0;
    }

    return methods;
  }

  private extractClassProperties(classBody: string[]): any[] {
    const properties = [];
    const propPattern = /(?:(public|private|protected)\s+)?(?:(static)\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^=;]+)/g;

    for (const line of classBody) {
      const trimmed = line.trim();
      if (trimmed.includes('(') || trimmed.includes('constructor')) continue; // Skip methods

      const match = propPattern.exec(trimmed);
      if (match) {
        const prop: any = {
          name: match[3],
          visibility: match[1] || 'public',
          type: match[4].trim()
        };

        // Only include static if it's true
        if (match[2]) {
          prop.static = true;
        }

        properties.push(prop);
      }
      propPattern.lastIndex = 0;
    }

    return properties;
  }

  private extractInterfaceMethods(interfaceBody: string[]): any[] {
    const methods = [];
    const methodPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*:\s*([^;]+)/g;

    for (const line of interfaceBody) {
      const match = methodPattern.exec(line.trim());
      if (match) {
        const method: any = {
          name: match[1],
          returnType: match[3].trim()
        };

        const parameters = this.parseParameters(match[2]);
        if (parameters.length > 0) {
          method.parameters = parameters;
        }

        methods.push(method);
      }
      methodPattern.lastIndex = 0;
    }

    return methods;
  }

  private extractInterfaceProperties(interfaceBody: string[]): any[] {
    const properties = [];
    const propPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^;]+)/g;

    for (const line of interfaceBody) {
      const trimmed = line.trim();
      if (trimmed.includes('(')) continue; // Skip methods

      const match = propPattern.exec(trimmed);
      if (match) {
        properties.push({
          name: match[1],
          type: match[2].trim()
        });
      }
      propPattern.lastIndex = 0;
    }

    return properties;
  }

  private extractEnumValues(enumBody: string[]): any[] {
    const values = [];
    const valuePattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(.+)/g;

    for (const line of enumBody) {
      const trimmed = line.trim().replace(/,$/, ''); // Remove trailing comma
      if (!trimmed || trimmed === '{' || trimmed === '}' || trimmed.includes('enum')) continue;

      const match = valuePattern.exec(trimmed);
      if (match) {
        values.push({
          name: match[1],
          value: match[2].replace(/['"]/g, '')
        });
      }
      valuePattern.lastIndex = 0;
    }

    return values;
  }

  private isLanguageKeyword(word: string): boolean {
    const keywords = [
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof',
      'instanceof', 'in', 'of', 'var', 'let', 'const', 'function', 'class',
      'interface', 'type', 'enum', 'namespace', 'import', 'export', 'from',
      'as', 'default', 'extends', 'implements', 'public', 'private', 'protected',
      'static', 'readonly', 'abstract', 'async', 'await', 'yield', 'super',
      'this', 'null', 'undefined', 'true', 'false', 'console', 'JSON'
    ];

    return keywords.includes(word);
  }
}