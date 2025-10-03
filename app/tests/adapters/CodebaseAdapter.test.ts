import { describe, it, expect, beforeEach } from 'vitest';
import { CodebaseAdapter } from '../../src/adapters/CodebaseAdapter';
import type { FileMetadata, Entity, Relationship } from '../../src/types/entity';

describe('CodebaseAdapter', () => {
  let adapter: CodebaseAdapter;
  let mockMetadata: FileMetadata;

  beforeEach(() => {
    adapter = new CodebaseAdapter();
    mockMetadata = {
      path: '/test/file.ts',
      filename: 'file.ts',
      extension: '.ts',
      size: 1000
    };
  });

  describe('File Type Detection', () => {
    it('should process TypeScript files', () => {
      const content = 'function test() { return 42; }';
      const metadata = { ...mockMetadata, extension: '.ts' };

      const entities = adapter.extract(content, metadata);

      expect(entities.length).toBeGreaterThan(1); // Document + function
    });

    it('should process JavaScript files', () => {
      const content = 'function test() { return 42; }';
      const metadata = { ...mockMetadata, extension: '.js', filename: 'file.js' };

      const entities = adapter.extract(content, metadata);

      expect(entities.length).toBeGreaterThan(1);
    });

    it('should process TSX files', () => {
      const content = 'const Component = () => <div>Test</div>';
      const metadata = { ...mockMetadata, extension: '.tsx', filename: 'file.tsx' };

      const entities = adapter.extract(content, metadata);

      expect(entities.length).toBeGreaterThan(0);
    });

    it('should process JSX files', () => {
      const content = 'const Component = () => <div>Test</div>';
      const metadata = { ...mockMetadata, extension: '.jsx', filename: 'file.jsx' };

      const entities = adapter.extract(content, metadata);

      expect(entities.length).toBeGreaterThan(0);
    });

    it('should return base entities for non-code files', () => {
      const content = 'This is plain text';
      const metadata = { ...mockMetadata, extension: '.txt', filename: 'file.txt' };

      const entities = adapter.extract(content, metadata);

      // Should have document entity from UniversalFallbackAdapter
      expect(entities.length).toBeGreaterThan(0);
      const hasDocument = entities.some(e => e.type === 'document');
      expect(hasDocument).toBe(true);
    });
  });

  describe('Function Extraction', () => {
    it('should extract regular function declarations', () => {
      const content = 'function calculateSum(a: number, b: number): number { return a + b; }';

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('calculateSum');
      expect(functions[0].metadata?.parameters).toEqual(['a: number', 'b: number']);
      expect(functions[0].metadata?.returnType).toBe('number');
    });

    it('should extract async function declarations', () => {
      const content = 'async function fetchData(url: string): Promise<Data> { return fetch(url); }';

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('fetchData');
      expect(functions[0].metadata?.async).toBe(true);
      expect(functions[0].metadata?.returnType).toBe('Promise<Data>');
    });

    it('should extract arrow function declarations', () => {
      const content = 'const multiply = (x: number, y: number): number => x * y;';

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('multiply');
      expect(functions[0].metadata?.parameters).toEqual(['x: number', 'y: number']);
      expect(functions[0].metadata?.returnType).toBe('number');
    });

    it('should extract exported functions', () => {
      const content = 'export function greet(name: string): string { return "Hello"; }';

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('greet');
    });

    it('should extract functions with generic types', () => {
      const content = 'function identity<T>(value: T): T { return value; }';

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('identity');
      expect(functions[0].metadata?.genericTypes).toEqual(['T']);
    });

    it('should extract functions with no parameters', () => {
      const content = 'function getCurrentTime(): Date { return new Date(); }';

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].name).toBe('getCurrentTime');
      expect(functions[0].metadata?.parameters).toEqual([]);
    });

    it('should extract JSDoc comments for functions', () => {
      const content = `
/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum
 */
function add(a: number, b: number): number { return a + b; }
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].metadata?.jsDoc).toBeDefined();
      expect(functions[0].metadata?.jsDoc.description).toContain('Calculates the sum');
      expect(functions[0].metadata?.jsDoc.params).toHaveLength(2);
      expect(functions[0].metadata?.jsDoc.returns).toContain('The sum');
    });
  });

  describe('Class Extraction', () => {
    it('should extract basic class declarations', () => {
      const content = 'class Person { name: string; }';

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('Person');
      expect(classes[0].type).toBe('container');
    });

    it('should extract classes with inheritance', () => {
      const content = 'class Student extends Person { grade: number; }';

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('Student');
      expect(classes[0].metadata?.extends).toBe('Person');
    });

    it('should extract classes with interfaces', () => {
      const content = 'class User implements IUser, IEntity { id: string; }';

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('User');
      expect(classes[0].metadata?.implements).toEqual(['IUser', 'IEntity']);
    });

    it('should extract abstract classes', () => {
      const content = 'abstract class Animal { abstract makeSound(): void; }';

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('Animal');
      expect(classes[0].metadata?.abstract).toBe(true);
    });

    it('should extract class methods', () => {
      const content = `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  subtract(a: number, b: number): number {
    return a - b;
  }
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      expect(classes[0].metadata?.methods).toBeDefined();
      expect(classes[0].metadata?.methods.length).toBe(2);
      expect(classes[0].metadata?.methods[0].name).toBe('add');
      expect(classes[0].metadata?.methods[1].name).toBe('subtract');
    });

    it('should extract class properties', () => {
      const content = `
class User {
  public name: string;
  private email: string;
  protected age: number;
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      expect(classes[0].metadata?.properties).toBeDefined();
      expect(classes[0].metadata?.properties.length).toBe(3);
    });

    it('should extract constructor', () => {
      const content = `
class Point {
  constructor(public x: number, public y: number) {}
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      expect(classes[0].metadata?.methods).toBeDefined();
      const constructor = classes[0].metadata?.methods.find((m: any) => m.name === 'constructor');
      expect(constructor).toBeDefined();
    });

    it('should extract static methods', () => {
      const content = `
class MathUtils {
  static PI = 3.14159;
  static square(x: number): number {
    return x * x;
  }
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const classes = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classes.length).toBe(1);
      const staticMethod = classes[0].metadata?.methods.find((m: any) => m.name === 'square');
      expect(staticMethod?.static).toBe(true);
    });
  });

  describe('Interface Extraction', () => {
    it('should extract basic interface declarations', () => {
      const content = 'interface User { name: string; email: string; }';

      const entities = adapter.extract(content, mockMetadata);
      const interfaces = entities.filter(e => e.metadata?.entityType === 'interface');

      expect(interfaces.length).toBe(1);
      expect(interfaces[0].name).toBe('User');
      expect(interfaces[0].type).toBe('container');
    });

    it('should extract interfaces with methods', () => {
      const content = `
interface Repository {
  save(item: any): Promise<void>;
  find(id: string): Promise<any>;
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const interfaces = entities.filter(e => e.metadata?.entityType === 'interface');

      expect(interfaces.length).toBe(1);
      expect(interfaces[0].metadata?.methods).toBeDefined();
      expect(interfaces[0].metadata?.methods.length).toBe(2);
    });

    it('should extract interfaces with properties', () => {
      const content = `
interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const interfaces = entities.filter(e => e.metadata?.entityType === 'interface');

      expect(interfaces.length).toBe(1);
      expect(interfaces[0].metadata?.properties).toBeDefined();
      expect(interfaces[0].metadata?.properties.length).toBe(3);
    });

    it('should extract interfaces with generic types', () => {
      const content = 'interface Container<T> { value: T; }';

      const entities = adapter.extract(content, mockMetadata);
      const interfaces = entities.filter(e => e.metadata?.entityType === 'interface');

      expect(interfaces.length).toBe(1);
      expect(interfaces[0].name).toBe('Container');
      expect(interfaces[0].metadata?.genericTypes).toEqual(['T']);
    });

    it('should extract interfaces that extend other interfaces', () => {
      const content = 'interface Admin extends User, Manager { permissions: string[]; }';

      const entities = adapter.extract(content, mockMetadata);
      const interfaces = entities.filter(e => e.metadata?.entityType === 'interface');

      expect(interfaces.length).toBe(1);
      expect(interfaces[0].name).toBe('Admin');
      expect(interfaces[0].metadata?.extends).toContain('User');
      expect(interfaces[0].metadata?.extends).toContain('Manager');
    });
  });

  describe('Type Alias Extraction', () => {
    it('should extract type aliases', () => {
      const content = 'type Status = "active" | "inactive" | "pending";';

      const entities = adapter.extract(content, mockMetadata);
      const types = entities.filter(e => e.metadata?.entityType === 'type');

      expect(types.length).toBe(1);
      expect(types[0].name).toBe('Status');
    });

    it('should extract exported type aliases', () => {
      const content = 'export type ID = string | number;';

      const entities = adapter.extract(content, mockMetadata);
      const types = entities.filter(e => e.metadata?.entityType === 'type');

      expect(types.length).toBe(1);
      expect(types[0].name).toBe('ID');
    });
  });

  describe('Enum Extraction', () => {
    it('should extract basic enums', () => {
      const content = `
enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue"
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const enums = entities.filter(e => e.metadata?.entityType === 'enum');

      expect(enums.length).toBe(1);
      expect(enums[0].name).toBe('Color');
      expect(enums[0].metadata?.values).toBeDefined();
      expect(enums[0].metadata?.values.length).toBe(3);
    });

    it('should extract exported enums', () => {
      const content = 'export enum Status { Active, Inactive }';

      const entities = adapter.extract(content, mockMetadata);
      const enums = entities.filter(e => e.metadata?.entityType === 'enum');

      expect(enums.length).toBe(1);
      expect(enums[0].name).toBe('Status');
    });
  });

  describe('Import Extraction', () => {
    it('should extract named imports', () => {
      const content = 'import { useState, useEffect } from "react";';

      const entities = adapter.extract(content, mockMetadata);
      const imports = entities.filter(e => e.metadata?.entityType === 'import');

      expect(imports.length).toBe(1);
      expect(imports[0].metadata?.source).toBe('react');
      expect(imports[0].metadata?.importType).toBe('named');
      expect(imports[0].metadata?.imports).toEqual(['useState', 'useEffect']);
    });

    it('should extract default imports', () => {
      const content = 'import React from "react";';

      const entities = adapter.extract(content, mockMetadata);
      const imports = entities.filter(e => e.metadata?.entityType === 'import');

      expect(imports.length).toBe(1);
      expect(imports[0].metadata?.source).toBe('react');
      expect(imports[0].metadata?.importType).toBe('default');
      expect(imports[0].metadata?.defaultImport).toBe('React');
    });

    it('should extract namespace imports', () => {
      const content = 'import * as fs from "fs";';

      const entities = adapter.extract(content, mockMetadata);
      const imports = entities.filter(e => e.metadata?.entityType === 'import');

      expect(imports.length).toBe(1);
      expect(imports[0].metadata?.source).toBe('fs');
      expect(imports[0].metadata?.importType).toBe('namespace');
      expect(imports[0].metadata?.namespace).toBe('fs');
    });

    it('should extract type-only imports', () => {
      const content = 'import type { Entity, Relationship } from "./types";';

      const entities = adapter.extract(content, mockMetadata);
      const imports = entities.filter(e => e.metadata?.entityType === 'import');

      expect(imports.length).toBe(1);
      expect(imports[0].metadata?.source).toBe('./types');
      expect(imports[0].metadata?.typeOnly).toBe(true);
    });

    it('should detect local vs external imports', () => {
      const localContent = 'import { helper } from "./utils/helper";';
      const externalContent = 'import { lodash } from "lodash";';

      const localEntities = adapter.extract(localContent, mockMetadata);
      const externalEntities = adapter.extract(externalContent, mockMetadata);

      const localImport = localEntities.find(e => e.metadata?.entityType === 'import');
      const externalImport = externalEntities.find(e => e.metadata?.entityType === 'import');

      expect(localImport?.metadata?.isLocal).toBe(true);
      expect(externalImport?.metadata?.isLocal).toBe(false);
    });
  });

  describe('Export Extraction', () => {
    it('should extract named exports', () => {
      const content = 'export { add, subtract };';

      const entities = adapter.extract(content, mockMetadata);
      const exports = entities.filter(e => e.metadata?.entityType === 'export');

      expect(exports.length).toBe(1);
      expect(exports[0].metadata?.exports).toEqual(['add', 'subtract']);
    });

    it('should extract default exports', () => {
      const content = 'export default class Application {}';

      const entities = adapter.extract(content, mockMetadata);
      const exports = entities.filter(e => e.metadata?.entityType === 'export');

      expect(exports.length).toBe(1);
      expect(exports[0].metadata?.isDefault).toBe(true);
    });
  });

  describe('Namespace Extraction', () => {
    it('should extract namespace declarations', () => {
      const content = 'namespace Utils { export function log() {} }';

      const entities = adapter.extract(content, mockMetadata);
      const namespaces = entities.filter(e => e.metadata?.entityType === 'namespace');

      expect(namespaces.length).toBe(1);
      expect(namespaces[0].name).toBe('Utils');
    });

    it('should extract exported namespaces', () => {
      const content = 'export namespace Validators { }';

      const entities = adapter.extract(content, mockMetadata);
      const namespaces = entities.filter(e => e.metadata?.entityType === 'namespace');

      expect(namespaces.length).toBe(1);
      expect(namespaces[0].name).toBe('Validators');
    });
  });

  describe('Relationship Detection', () => {
    it('should detect inheritance relationships', () => {
      const content = `
class Animal { }
class Dog extends Animal { }
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const relationships = adapter.detectRelationships(entities);

      const extendsRelationships = relationships.filter(r => r.metadata?.relationshipType === 'extends');
      expect(extendsRelationships.length).toBeGreaterThan(0);
    });

    it('should detect function call relationships', () => {
      const content = `
function helper() { return 42; }
function main() { const result = helper(); }
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const relationships = adapter.detectRelationships(entities);

      const callRelationships = relationships.filter(r => r.type === 'calls');
      expect(callRelationships.length).toBeGreaterThan(0);
    });

    it('should detect import dependency relationships', () => {
      const content = 'import { helper } from "./utils";';

      const entities = adapter.extract(content, mockMetadata);
      const relationships = adapter.detectRelationships(entities);

      const dependencyRelationships = relationships.filter(r => r.metadata?.relationshipType === 'depends-on');
      expect(dependencyRelationships.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', () => {
      const content = '';

      const entities = adapter.extract(content, mockMetadata);

      expect(entities.length).toBeGreaterThan(0); // Should have at least document entity
    });

    it('should handle files with only comments', () => {
      const content = `
// This is a comment
/* This is a block comment */
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      expect(entities.length).toBeGreaterThan(0);
    });

    it('should handle malformed code gracefully', () => {
      const content = 'function incomplete(';

      expect(() => {
        adapter.extract(content, mockMetadata);
      }).not.toThrow();
    });

    it('should handle multiple entities of the same type', () => {
      const content = `
function one() {}
function two() {}
function three() {}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(3);
    });

    it('should handle nested classes', () => {
      const content = `
class Outer {
  // Inner classes are not standard TS but let's ensure we don't break
  method() {
    const Inner = class { };
  }
}
      `.trim();

      expect(() => {
        adapter.extract(content, mockMetadata);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should extract all entities from a realistic file', () => {
      const content = `
import { Component } from "react";
import type { Props } from "./types";

interface State {
  count: number;
}

export class Counter extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { count: 0 };
  }

  increment(): void {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return null;
  }
}

export function createCounter(initial: number): Counter {
  return new Counter({ initial });
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      // Should have: document, imports, interface, class, function
      expect(entities.length).toBeGreaterThan(5);

      const imports = entities.filter(e => e.metadata?.entityType === 'import');
      const interfaces = entities.filter(e => e.metadata?.entityType === 'interface');
      const classes = entities.filter(e => e.metadata?.entityType === 'class');
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(imports.length).toBe(2);
      expect(interfaces.length).toBe(1);
      expect(classes.length).toBe(1);
      expect(functions.length).toBe(1);
    });

    it('should maintain correct line number information', () => {
      const content = `
line 1
function test() {}
line 3
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const functions = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functions.length).toBe(1);
      expect(functions[0].metadata?.lineNumbers).toBeDefined();
      expect(functions[0].metadata?.lineNumbers[0]).toBeGreaterThan(0);
    });
  });
});
