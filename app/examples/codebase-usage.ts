/**
 * CodebaseAdapter Usage Example
 *
 * This example demonstrates how to use the CodebaseAdapter to extract
 * entities and relationships from TypeScript/JavaScript code files.
 */

import { CodebaseAdapter } from '../src/adapters/CodebaseAdapter';
import type { Entity, FileMetadata } from '../src/types/entity';

// ============================================================================
// Example 1: Basic Function Extraction
// ============================================================================

console.log('='.repeat(70));
console.log('Example 1: Basic Function Extraction');
console.log('='.repeat(70));

const functionCode = `
/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum of a and b
 */
export function calculateSum(a: number, b: number): number {
  return a + b;
}

// Arrow function with async
export const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}
`;

const adapter = new CodebaseAdapter();
const functionMetadata: FileMetadata = {
  path: '/examples/functions.ts',
  filename: 'functions.ts',
  extension: '.ts'
};

const functionEntities = adapter.extract(functionCode, functionMetadata);
const functions = functionEntities.filter(e => e.metadata?.entityType === 'function');

console.log(`\nExtracted ${functions.length} functions:\n`);
functions.forEach(fn => {
  console.log(`Function: ${fn.name}`);
  console.log(`  Parameters: ${fn.metadata?.parameters?.join(', ') || 'none'}`);
  console.log(`  Return Type: ${fn.metadata?.returnType || 'unspecified'}`);
  console.log(`  Async: ${fn.metadata?.async || false}`);
  if (fn.metadata?.jsDoc) {
    console.log(`  JSDoc: ${fn.metadata.jsDoc.description}`);
  }
  console.log();
});

// ============================================================================
// Example 2: Class Extraction with Inheritance
// ============================================================================

console.log('='.repeat(70));
console.log('Example 2: Class Extraction with Inheritance');
console.log('='.repeat(70));

const classCode = `
interface IAnimal {
  makeSound(): void;
}

abstract class Animal implements IAnimal {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract makeSound(): void;

  getName(): string {
    return this.name;
  }
}

export class Dog extends Animal {
  private breed: string;

  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }

  makeSound(): void {
    console.log('Woof!');
  }

  static isDog(animal: Animal): boolean {
    return animal instanceof Dog;
  }
}
`;

const classMetadata: FileMetadata = {
  path: '/examples/animals.ts',
  filename: 'animals.ts',
  extension: '.ts'
};

const classEntities = adapter.extract(classCode, classMetadata);
const classes = classEntities.filter(e => e.metadata?.entityType === 'class');
const interfaces = classEntities.filter(e => e.metadata?.entityType === 'interface');

console.log(`\nExtracted ${classes.length} classes and ${interfaces.length} interfaces:\n`);

interfaces.forEach(iface => {
  console.log(`Interface: ${iface.name}`);
  console.log(`  Methods: ${iface.metadata?.methods?.length || 0}`);
  console.log();
});

classes.forEach(cls => {
  console.log(`Class: ${cls.name}`);
  console.log(`  Abstract: ${cls.metadata?.abstract || false}`);
  console.log(`  Extends: ${cls.metadata?.extends || 'none'}`);
  console.log(`  Implements: ${cls.metadata?.implements?.join(', ') || 'none'}`);
  console.log(`  Methods: ${cls.metadata?.methods?.length || 0}`);
  console.log(`  Properties: ${cls.metadata?.properties?.length || 0}`);

  if (cls.metadata?.methods && cls.metadata.methods.length > 0) {
    console.log('\n  Method Details:');
    cls.metadata.methods.forEach((method: any) => {
      const visibility = method.visibility || 'public';
      const staticStr = method.static ? 'static ' : '';
      const asyncStr = method.async ? 'async ' : '';
      console.log(`    ${visibility} ${staticStr}${asyncStr}${method.name}(${method.parameters?.join(', ') || ''}): ${method.returnType || 'void'}`);
    });
  }
  console.log();
});

// ============================================================================
// Example 3: Import/Export Analysis
// ============================================================================

console.log('='.repeat(70));
console.log('Example 3: Import/Export Analysis');
console.log('='.repeat(70));

const importCode = `
// External dependencies
import React, { useState, useEffect } from 'react';
import * as lodash from 'lodash';
import type { User, Post } from './types';

// Local modules
import { api } from './services/api';
import { logger } from './utils/logger';

// Exports
export { api, logger };
export default class App extends React.Component {}
`;

const importMetadata: FileMetadata = {
  path: '/examples/imports.tsx',
  filename: 'imports.tsx',
  extension: '.tsx'
};

const importEntities = adapter.extract(importCode, importMetadata);
const imports = importEntities.filter(e => e.metadata?.entityType === 'import');
const exports = importEntities.filter(e => e.metadata?.entityType === 'export');

console.log(`\nExtracted ${imports.length} imports and ${exports.length} exports:\n`);

console.log('Imports:');
imports.forEach(imp => {
  const type = imp.metadata?.importType || 'unknown';
  const source = imp.metadata?.source || 'unknown';
  const isLocal = imp.metadata?.isLocal ? '(local)' : '(external)';

  console.log(`  ${type}: ${source} ${isLocal}`);

  if (imp.metadata?.imports) {
    console.log(`    Named: ${imp.metadata.imports.join(', ')}`);
  }
  if (imp.metadata?.defaultImport) {
    console.log(`    Default: ${imp.metadata.defaultImport}`);
  }
  if (imp.metadata?.namespace) {
    console.log(`    Namespace: ${imp.metadata.namespace}`);
  }
});

console.log('\nExports:');
exports.forEach(exp => {
  const items = exp.metadata?.exports?.join(', ') || 'none';
  const isDefault = exp.metadata?.isDefault ? '(default)' : '';
  console.log(`  ${items} ${isDefault}`);
});

// ============================================================================
// Example 4: Relationship Detection
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('Example 4: Relationship Detection');
console.log('='.repeat(70));

const relationshipCode = `
class Database {
  connect() {
    return true;
  }
}

class Repository extends Database {
  private cache: Map<string, any>;

  constructor() {
    super();
    this.cache = new Map();
  }

  findById(id: string) {
    if (this.connect()) {
      return this.cache.get(id);
    }
  }
}

function initializeApp() {
  const repo = new Repository();
  return repo.findById('123');
}
`;

const relationshipMetadata: FileMetadata = {
  path: '/examples/relationships.ts',
  filename: 'relationships.ts',
  extension: '.ts'
};

const relationshipEntities = adapter.extract(relationshipCode, relationshipMetadata);
const relationships = adapter.detectRelationships(relationshipEntities);

console.log(`\nDetected ${relationships.length} relationships:\n`);

const relationshipClasses = relationshipEntities.filter(e => e.metadata?.entityType === 'class');
relationshipClasses.forEach(cls => {
  console.log(`Class: ${cls.name}`);
  if (cls.metadata?.extends) {
    console.log(`  → Extends: ${cls.metadata.extends}`);
  }
});

const inheritanceRels = relationships.filter(r => r.metadata?.relationshipType === 'extends');
console.log(`\nInheritance relationships: ${inheritanceRels.length}`);
inheritanceRels.forEach(rel => {
  console.log(`  ${rel.metadata?.child} extends ${rel.metadata?.parent}`);
});

const callRels = relationships.filter(r => r.type === 'calls');
console.log(`\nFunction call relationships: ${callRels.length}`);
callRels.forEach(rel => {
  console.log(`  ${rel.metadata?.caller} calls ${rel.metadata?.callee}`);
});

// ============================================================================
// Example 5: Complete File Analysis
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('Example 5: Complete File Analysis');
console.log('='.repeat(70));

const completeCode = `
import { EventEmitter } from 'events';

/**
 * Configuration options for the service
 */
interface ServiceConfig {
  apiUrl: string;
  timeout: number;
  retries: number;
}

/**
 * HTTP Service for making API requests
 * Extends EventEmitter to provide event-driven architecture
 */
export class HttpService extends EventEmitter {
  private config: ServiceConfig;
  private requestCount: number = 0;

  constructor(config: ServiceConfig) {
    super();
    this.config = config;
  }

  /**
   * Makes a GET request to the specified endpoint
   * @param endpoint API endpoint path
   * @returns Promise resolving to the response data
   */
  async get<T>(endpoint: string): Promise<T> {
    this.requestCount++;
    this.emit('request', { method: 'GET', endpoint });

    try {
      const response = await this.makeRequest('GET', endpoint);
      this.emit('success', response);
      return response as T;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async makeRequest(method: string, endpoint: string): Promise<any> {
    const url = \`\${this.config.apiUrl}\${endpoint}\`;
    const response = await fetch(url, {
      method,
      timeout: this.config.timeout
    });
    return response.json();
  }

  getStats() {
    return { requestCount: this.requestCount };
  }
}

export function createService(config: ServiceConfig): HttpService {
  return new HttpService(config);
}
`;

const completeMetadata: FileMetadata = {
  path: '/examples/http-service.ts',
  filename: 'http-service.ts',
  extension: '.ts'
};

const completeEntities = adapter.extract(completeCode, completeMetadata);

console.log('\nComplete file analysis:\n');
console.log(`Total entities extracted: ${completeEntities.length}`);

const entityCounts = completeEntities.reduce((acc, entity) => {
  const type = entity.metadata?.entityType || entity.type;
  acc[type] = (acc[type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\nEntity breakdown:');
Object.entries(entityCounts).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Show detailed information for main entities
const mainEntities = completeEntities.filter(e =>
  ['class', 'interface', 'function'].includes(e.metadata?.entityType || '')
);

console.log('\nMain entities:');
mainEntities.forEach(entity => {
  const type = entity.metadata?.entityType;
  console.log(`\n  ${type}: ${entity.name}`);

  if (type === 'class' || type === 'interface') {
    const methods = entity.metadata?.methods || [];
    const properties = entity.metadata?.properties || [];
    console.log(`    Methods: ${methods.length}`);
    console.log(`    Properties: ${properties.length}`);

    if (entity.metadata?.extends) {
      console.log(`    Extends: ${entity.metadata.extends}`);
    }
  }

  if (type === 'function') {
    const params = entity.metadata?.parameters || [];
    const returnType = entity.metadata?.returnType || 'void';
    console.log(`    Signature: (${params.join(', ')}) => ${returnType}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('Examples Complete!');
console.log('='.repeat(70));
