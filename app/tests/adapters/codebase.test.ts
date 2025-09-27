import { CodebaseAdapter } from '../../src/adapters/CodebaseAdapter';
import type { FileMetadata, Entity, Relationship } from '../../src/types/entity';

describe('CodebaseAdapter', () => {
  let adapter: CodebaseAdapter;
  let mockMetadata: FileMetadata;

  beforeEach(() => {
    adapter = new CodebaseAdapter();
    mockMetadata = {
      path: '/test/example.ts',
      filename: 'example.ts',
      extension: '.ts',
      size: 1024
    };
  });

  describe('constructor', () => {
    it('should create instance extending UniversalFallbackAdapter', () => {
      expect(adapter).toBeInstanceOf(CodebaseAdapter);
      expect(typeof adapter.extract).toBe('function');
      expect(typeof adapter.detectRelationships).toBe('function');
    });
  });

  describe('extract - Function Definitions', () => {
    it('should extract basic function definitions with parameters and return types', () => {
      const content = `
function calculateSum(a: number, b: number): number {
  return a + b;
}

const multiply = (x: number, y: number): number => x * y;

async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      // Should include base entities from UniversalFallbackAdapter plus code entities
      const functionEntities = entities.filter(e => e.metadata?.entityType === 'function');

      expect(functionEntities).toHaveLength(3);

      // Test calculateSum function
      const calculateSumEntity = functionEntities.find(e => e.name === 'calculateSum');
      expect(calculateSumEntity).toBeDefined();
      expect(calculateSumEntity?.metadata?.parameters).toEqual(['a: number', 'b: number']);
      expect(calculateSumEntity?.metadata?.returnType).toBe('number');
      expect(calculateSumEntity?.metadata?.async).toBe(false);

      // Test multiply arrow function
      const multiplyEntity = functionEntities.find(e => e.name === 'multiply');
      expect(multiplyEntity).toBeDefined();
      expect(multiplyEntity?.metadata?.parameters).toEqual(['x: number', 'y: number']);
      expect(multiplyEntity?.metadata?.returnType).toBe('number');

      // Test async function
      const fetchDataEntity = functionEntities.find(e => e.name === 'fetchData');
      expect(fetchDataEntity).toBeDefined();
      expect(fetchDataEntity?.metadata?.async).toBe(true);
      expect(fetchDataEntity?.metadata?.returnType).toBe('Promise<Response>');
    });

    it('should extract functions with JSDoc comments', () => {
      const content = `
/**
 * Calculates the area of a rectangle
 * @param width - The width of the rectangle
 * @param height - The height of the rectangle
 * @returns The area of the rectangle
 */
function calculateArea(width: number, height: number): number {
  return width * height;
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const functionEntity = entities.find(e => e.metadata?.entityType === 'function' && e.name === 'calculateArea');

      expect(functionEntity).toBeDefined();
      expect(functionEntity?.metadata?.jsDoc).toBeDefined();
      expect(functionEntity?.metadata?.jsDoc?.description).toBe('Calculates the area of a rectangle');
      expect(functionEntity?.metadata?.jsDoc?.params).toEqual([
        { name: 'width', description: 'The width of the rectangle' },
        { name: 'height', description: 'The height of the rectangle' }
      ]);
      expect(functionEntity?.metadata?.jsDoc?.returns).toBe('The area of the rectangle');
    });

    it('should extract generic functions with type parameters', () => {
      const content = `
function identity<T>(arg: T): T {
  return arg;
}

function createArray<T>(length: number, value: T): T[] {
  return new Array(length).fill(value);
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const functionEntities = entities.filter(e => e.metadata?.entityType === 'function');

      const identityEntity = functionEntities.find(e => e.name === 'identity');
      expect(identityEntity?.metadata?.genericTypes).toEqual(['T']);

      const createArrayEntity = functionEntities.find(e => e.name === 'createArray');
      expect(createArrayEntity?.metadata?.genericTypes).toEqual(['T']);
      expect(createArrayEntity?.metadata?.returnType).toBe('T[]');
    });
  });

  describe('extract - Class Definitions', () => {
    it('should extract class definitions with methods, properties, and inheritance', () => {
      const content = `
class Animal {
  protected name: string;
  private age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  public speak(): string {
    return "Some sound";
  }

  protected getAge(): number {
    return this.age;
  }
}

class Dog extends Animal {
  private breed: string;

  constructor(name: string, age: number, breed: string) {
    super(name, age);
    this.breed = breed;
  }

  public speak(): string {
    return "Woof!";
  }

  public getBreed(): string {
    return this.breed;
  }
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const classEntities = entities.filter(e => e.metadata?.entityType === 'class');

      expect(classEntities).toHaveLength(2);

      // Test Animal class
      const animalEntity = classEntities.find(e => e.name === 'Animal');
      expect(animalEntity).toBeDefined();
      expect(animalEntity?.metadata?.properties).toEqual([
        { name: 'name', type: 'string', visibility: 'protected' },
        { name: 'age', type: 'number', visibility: 'private' }
      ]);
      expect(animalEntity?.metadata?.methods).toEqual([
        { name: 'constructor', parameters: ['name: string', 'age: number'], visibility: 'public' },
        { name: 'speak', returnType: 'string', visibility: 'public' },
        { name: 'getAge', returnType: 'number', visibility: 'protected' }
      ]);

      // Test Dog class inheritance
      const dogEntity = classEntities.find(e => e.name === 'Dog');
      expect(dogEntity).toBeDefined();
      expect(dogEntity?.metadata?.extends).toBe('Animal');
      expect(dogEntity?.metadata?.methods?.find(m => m.name === 'speak')?.returnType).toBe('string');
    });

    it('should extract abstract classes and interfaces', () => {
      const content = `
interface Flyable {
  fly(): void;
  altitude: number;
}

abstract class Vehicle {
  protected speed: number = 0;

  abstract start(): void;

  stop(): void {
    this.speed = 0;
  }
}

class Car extends Vehicle implements Flyable {
  altitude: number = 0;

  start(): void {
    console.log("Car started");
  }

  fly(): void {
    console.log("Cars don't fly!");
  }
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      const interfaceEntity = entities.find(e => e.metadata?.entityType === 'interface' && e.name === 'Flyable');
      expect(interfaceEntity).toBeDefined();
      expect(interfaceEntity?.metadata?.methods).toEqual([
        { name: 'fly', returnType: 'void' }
      ]);
      expect(interfaceEntity?.metadata?.properties).toEqual([
        { name: 'altitude', type: 'number' }
      ]);

      const abstractEntity = entities.find(e => e.metadata?.entityType === 'class' && e.name === 'Vehicle');
      expect(abstractEntity?.metadata?.abstract).toBe(true);

      const carEntity = entities.find(e => e.metadata?.entityType === 'class' && e.name === 'Car');
      expect(carEntity?.metadata?.implements).toEqual(['Flyable']);
      expect(carEntity?.metadata?.extends).toBe('Vehicle');
    });
  });

  describe('extract - Import/Export Dependencies', () => {
    it('should detect import statements and create dependency relationships', () => {
      const content = `
import { readFile } from 'fs/promises';
import express from 'express';
import { DatabaseConnection } from './database';
import * as utils from '../utils/helpers';
import type { UserConfig } from './types/config';

export { DatabaseConnection };
export const VERSION = '1.0.0';
export default class ApiServer {
  // class implementation
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      const importEntities = entities.filter(e => e.metadata?.entityType === 'import');
      expect(importEntities).toHaveLength(5);

      // Named import
      const fsImport = importEntities.find(e => e.metadata?.source === 'fs/promises');
      expect(fsImport?.metadata?.imports).toEqual(['readFile']);
      expect(fsImport?.metadata?.importType).toBe('named');

      // Default import
      const expressImport = importEntities.find(e => e.metadata?.source === 'express');
      expect(expressImport?.metadata?.defaultImport).toBe('express');
      expect(expressImport?.metadata?.importType).toBe('default');

      // Local import
      const dbImport = importEntities.find(e => e.metadata?.source === './database');
      expect(dbImport?.metadata?.imports).toEqual(['DatabaseConnection']);
      expect(dbImport?.metadata?.isLocal).toBe(true);

      // Namespace import
      const utilsImport = importEntities.find(e => e.metadata?.source === '../utils/helpers');
      expect(utilsImport?.metadata?.namespace).toBe('utils');
      expect(utilsImport?.metadata?.importType).toBe('namespace');

      // Type-only import
      const typeImport = importEntities.find(e => e.metadata?.source === './types/config');
      expect(typeImport?.metadata?.typeOnly).toBe(true);

      // Export entities
      const exportEntities = entities.filter(e => e.metadata?.entityType === 'export');
      expect(exportEntities.length).toBeGreaterThan(0);
    });
  });

  describe('extract - TypeScript Constructs', () => {
    it('should handle TypeScript-specific constructs (interfaces, types, generics)', () => {
      const content = `
type StringOrNumber = string | number;
type UserRole = 'admin' | 'user' | 'guest';

interface BaseEntity<T> {
  id: T;
  createdAt: Date;
  updatedAt?: Date;
}

interface User extends BaseEntity<string> {
  name: string;
  email: string;
  role: UserRole;
}

enum Status {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      // Type aliases
      const typeEntities = entities.filter(e => e.metadata?.entityType === 'type');
      expect(typeEntities).toHaveLength(2);

      const stringOrNumberType = typeEntities.find(e => e.name === 'StringOrNumber');
      expect(stringOrNumberType?.metadata?.definition).toBe('string | number');

      const userRoleType = typeEntities.find(e => e.name === 'UserRole');
      expect(userRoleType?.metadata?.definition).toBe("'admin' | 'user' | 'guest'");

      // Generic interface
      const baseEntityInterface = entities.find(e => e.metadata?.entityType === 'interface' && e.name === 'BaseEntity');
      expect(baseEntityInterface?.metadata?.genericTypes).toEqual(['T']);

      // Interface inheritance
      const userInterface = entities.find(e => e.metadata?.entityType === 'interface' && e.name === 'User');
      expect(userInterface?.metadata?.extends).toBe('BaseEntity<string>');

      // Enum
      const enumEntity = entities.find(e => e.metadata?.entityType === 'enum' && e.name === 'Status');
      expect(enumEntity?.metadata?.values).toEqual([
        { name: 'PENDING', value: 'pending' },
        { name: 'COMPLETED', value: 'completed' },
        { name: 'FAILED', value: 'failed' }
      ]);
    });
  });

  describe('detectRelationships - Call Graph Analysis', () => {
    it('should create call graph relationships between functions', () => {
      const content = `
function add(a: number, b: number): number {
  return a + b;
}

function multiply(x: number, y: number): number {
  return x * y;
}

function calculateTotal(items: number[]): number {
  let sum = 0;
  for (const item of items) {
    sum = add(sum, item); // Call to add function
  }
  return multiply(sum, 1.1); // Call to multiply function
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const relationships = adapter.detectRelationships!(entities);

      // Find call relationships
      const callRelationships = relationships.filter(r => r.metadata?.relationshipType === 'calls');
      expect(callRelationships.length).toBeGreaterThan(0);

      // calculateTotal should call both add and multiply
      const calculateTotalEntity = entities.find(e => e.metadata?.entityType === 'function' && e.name === 'calculateTotal');
      const addEntity = entities.find(e => e.metadata?.entityType === 'function' && e.name === 'add');
      const multiplyEntity = entities.find(e => e.metadata?.entityType === 'function' && e.name === 'multiply');

      expect(calculateTotalEntity).toBeDefined();
      expect(addEntity).toBeDefined();
      expect(multiplyEntity).toBeDefined();

      const callsAdd = callRelationships.some(r =>
        r.type === 'calls' &&
        entities.find(e => e.id === r.target)?.name === 'add'
      );
      const callsMultiply = callRelationships.some(r =>
        r.type === 'calls' &&
        entities.find(e => e.id === r.target)?.name === 'multiply'
      );

      expect(callsAdd).toBe(true);
      expect(callsMultiply).toBe(true);
    });
  });

  describe('detectRelationships - Inheritance Analysis', () => {
    it('should create inheritance relationships between classes', () => {
      const content = `
class Animal {
  name: string;
}

class Dog extends Animal {
  breed: string;
}

class Puppy extends Dog {
  age: number;
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const relationships = adapter.detectRelationships!(entities);

      const inheritanceRelationships = relationships.filter(r => r.metadata?.relationshipType === 'extends');
      expect(inheritanceRelationships).toHaveLength(2);

      // Verify Dog extends Animal
      const animalEntity = entities.find(e => e.metadata?.entityType === 'class' && e.name === 'Animal');
      const dogEntity = entities.find(e => e.metadata?.entityType === 'class' && e.name === 'Dog');
      const puppyEntity = entities.find(e => e.metadata?.entityType === 'class' && e.name === 'Puppy');

      expect(animalEntity).toBeDefined();
      expect(dogEntity).toBeDefined();
      expect(puppyEntity).toBeDefined();

      const dogExtendsAnimal = inheritanceRelationships.find(r =>
        entities.find(e => e.id === r.target)?.name === 'Animal'
      );
      const puppyExtendsDog = inheritanceRelationships.find(r =>
        entities.find(e => e.id === r.target)?.name === 'Dog'
      );

      expect(dogExtendsAnimal).toBeDefined();
      expect(puppyExtendsDog).toBeDefined();
    });
  });

  describe('detectRelationships - Dependency Analysis', () => {
    it('should create dependency relationships for imports', () => {
      const content = `
import { DatabaseConnection } from './database';
import { Logger } from '../utils/logger';

class UserService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(db: DatabaseConnection, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const relationships = adapter.detectRelationships!(entities);

      const dependencyRelationships = relationships.filter(r => r.metadata?.relationshipType === 'depends-on');
      expect(dependencyRelationships.length).toBeGreaterThan(0);

      // UserService should depend on DatabaseConnection and Logger
      const userServiceEntity = entities.find(e => e.metadata?.entityType === 'class' && e.name === 'UserService');
      expect(userServiceEntity).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should process files >50KB in <200ms', async () => {
      // Generate a large TypeScript file content
      const largeContent = Array.from({ length: 1000 }, (_, i) => `
function generatedFunction${i}(param${i}: number): string {
  return "Function ${i} with param " + param${i};
}

class GeneratedClass${i} {
  private value${i}: number = ${i};

  public getValue${i}(): number {
    return this.value${i};
  }
}
      `).join('\n');

      expect(largeContent.length).toBeGreaterThan(50000); // >50KB

      const startTime = performance.now();
      const entities = adapter.extract(largeContent, mockMetadata);
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(200); // <200ms
      expect(entities.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with UniversalFallbackAdapter', () => {
    it('should include base entities from UniversalFallbackAdapter without breaking functionality', () => {
      const content = `
# This is a markdown header

This is some paragraph content.

function exampleFunction(): void {
  console.log("Hello World");
}

## Another section

- List item 1
- List item 2
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      // Should have base entities (document, paragraphs) from Universal Adapter
      // Note: .ts files are processed as plain text, creating paragraphs, not sections
      const documentEntities = entities.filter(e => e.type === 'document');
      const paragraphEntities = entities.filter(e => e.type === 'paragraph');
      const functionEntities = entities.filter(e => e.metadata?.entityType === 'function');

      expect(documentEntities.length).toBeGreaterThan(0);
      expect(paragraphEntities.length).toBeGreaterThan(0);
      expect(functionEntities.length).toBeGreaterThan(0);

      // Verify we get the function from CodebaseAdapter
      const exampleFunction = functionEntities.find(e => e.name === 'exampleFunction');
      expect(exampleFunction).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed TypeScript code gracefully', () => {
      const malformedContent = `
function incomplete(param: string {
  // Missing closing parenthesis and return statement
}

class BrokenClass extends NonExistentParent
  // Missing opening brace
  public method(): void;
  // Missing implementation
}
      `.trim();

      expect(() => {
        const entities = adapter.extract(malformedContent, mockMetadata);
        expect(entities).toBeDefined();
      }).not.toThrow();
    });

    it('should handle empty content', () => {
      const entities = adapter.extract('', mockMetadata);
      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);
    });

    it('should handle non-TypeScript content', () => {
      const nonTsContent = `
This is just plain text.
No code here at all.
Just some sentences.
      `.trim();

      const entities = adapter.extract(nonTsContent, mockMetadata);
      expect(entities).toBeDefined();
      expect(Array.isArray(entities)).toBe(true);

      // Should still get base entities from Universal Adapter
      const documentEntities = entities.filter(e => e.type === 'document');
      expect(documentEntities.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle complex nested structures', () => {
      const content = `
namespace MyNamespace {
  export interface Config {
    database: {
      host: string;
      port: number;
    };
  }

  export class DatabaseManager<T extends Config> {
    constructor(private config: T) {}

    connect(): Promise<Connection> {
      return new Promise((resolve, reject) => {
        // Complex nested promise handling
        setTimeout(() => {
          if (this.config.database.host) {
            resolve(new Connection());
          } else {
            reject(new Error('No host'));
          }
        }, 100);
      });
    }
  }
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);

      const namespaceEntities = entities.filter(e => e.metadata?.entityType === 'namespace');
      const classEntities = entities.filter(e => e.metadata?.entityType === 'class');
      const interfaceEntities = entities.filter(e => e.metadata?.entityType === 'interface');

      expect(namespaceEntities.length).toBeGreaterThan(0);
      expect(classEntities.length).toBeGreaterThan(0);
      expect(interfaceEntities.length).toBeGreaterThan(0);
    });

    it('should handle decorators and advanced TypeScript features', () => {
      const content = `
@Component({
  selector: 'app-user',
  template: '<div>User Component</div>'
})
class UserComponent {
  @Input() userId: string;
  @Output() userSelected = new EventEmitter<string>();

  @ViewChild('userTemplate') template: TemplateRef<any>;

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    this.userSelected.emit(this.userId);
  }
}
      `.trim();

      const entities = adapter.extract(content, mockMetadata);
      const classEntity = entities.find(e => e.metadata?.entityType === 'class' && e.name === 'UserComponent');

      expect(classEntity).toBeDefined();
      if (classEntity?.metadata?.decorators) {
        expect(classEntity.metadata.decorators.length).toBeGreaterThan(0);
      }
    });
  });
});