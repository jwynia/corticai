#!/usr/bin/env ts-node

/**
 * CodebaseAdapter Demo
 *
 * Demonstrates the capabilities of the CodebaseAdapter for analyzing
 * TypeScript/JavaScript code and extracting functions, classes,
 * interfaces, types, and dependencies.
 */

import { CodebaseAdapter } from '../src/adapters/CodebaseAdapter';
import type { FileMetadata } from '../src/types/entity';

// Sample TypeScript code to analyze
const sampleCode = `
import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import type { Config } from './types';

/**
 * User service for managing user operations
 */
export class UserService extends EventEmitter {
  private users: Map<string, User> = new Map();
  public readonly config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  /**
   * Create a new user
   * @param userData - User data to create
   * @returns Promise that resolves to the created user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const user = this.buildUser(userData);
    this.users.set(user.id, user);
    this.emit('userCreated', user);
    return user;
  }

  private buildUser(userData: CreateUserData): User {
    return {
      id: generateId(),
      ...userData,
      createdAt: new Date()
    };
  }

  public async loadConfig(path: string): Promise<Config> {
    const configData = await readFile(path, 'utf8');
    return JSON.parse(configData);
  }
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface CreateUserData {
  name: string;
  email: string;
}

type UserRole = 'admin' | 'user' | 'guest';

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export const VERSION = '1.0.0';
`;

async function runDemo() {
  console.log('🔍 CodebaseAdapter Demo\n');
  console.log('Analyzing TypeScript code sample...\n');

  // Create adapter instance
  const adapter = new CodebaseAdapter();

  // Prepare metadata
  const metadata: FileMetadata = {
    path: '/demo/user-service.ts',
    filename: 'user-service.ts',
    extension: '.ts',
    size: sampleCode.length
  };

  // Extract entities
  console.log('⚡ Extracting entities...');
  const entities = adapter.extract(sampleCode, metadata);

  // Display results by category
  console.log('\n📊 Extraction Results:');
  console.log(`Total entities extracted: ${entities.length}\n`);

  // Functions
  const functions = entities.filter(e => e.metadata?.entityType === 'function');
  console.log(`🔧 Functions (${functions.length}):`);
  functions.forEach(func => {
    const params = func.metadata?.parameters?.join(', ') || '';
    const returnType = func.metadata?.returnType || 'unknown';
    const isAsync = func.metadata?.async ? 'async ' : '';
    console.log(`  - ${isAsync}${func.name}(${params}): ${returnType}`);
    if (func.metadata?.jsDoc) {
      console.log(`    📝 ${func.metadata.jsDoc.description}`);
    }
  });

  // Classes
  const classes = entities.filter(e => e.metadata?.entityType === 'class');
  console.log(`\n🏗️  Classes (${classes.length}):`);
  classes.forEach(cls => {
    const extendsInfo = cls.metadata?.extends ? ` extends ${cls.metadata.extends}` : '';
    console.log(`  - ${cls.name}${extendsInfo}`);

    const properties = cls.metadata?.properties || [];
    if (properties.length > 0) {
      console.log('    Properties:');
      properties.forEach((prop: any) => {
        const visibility = prop.visibility !== 'public' ? `${prop.visibility} ` : '';
        const readonly = prop.readonly ? 'readonly ' : '';
        console.log(`      - ${visibility}${readonly}${prop.name}: ${prop.type}`);
      });
    }

    const methods = cls.metadata?.methods || [];
    if (methods.length > 0) {
      console.log('    Methods:');
      methods.forEach((method: any) => {
        const visibility = method.visibility !== 'public' ? `${method.visibility} ` : '';
        const params = method.parameters?.join(', ') || '';
        console.log(`      - ${visibility}${method.name}(${params}): ${method.returnType || 'void'}`);
      });
    }
  });

  // Interfaces
  const interfaces = entities.filter(e => e.metadata?.entityType === 'interface');
  console.log(`\n🔌 Interfaces (${interfaces.length}):`);
  interfaces.forEach(iface => {
    console.log(`  - ${iface.name}`);
    const properties = iface.metadata?.properties || [];
    properties.forEach((prop: any) => {
      console.log(`    - ${prop.name}: ${prop.type}`);
    });
  });

  // Types
  const types = entities.filter(e => e.metadata?.entityType === 'type');
  console.log(`\n📝 Type Aliases (${types.length}):`);
  types.forEach(type => {
    console.log(`  - ${type.name} = ${type.metadata?.definition}`);
  });

  // Enums
  const enums = entities.filter(e => e.metadata?.entityType === 'enum');
  console.log(`\n📋 Enums (${enums.length}):`);
  enums.forEach(enumEntity => {
    console.log(`  - ${enumEntity.name}`);
    const values = enumEntity.metadata?.values || [];
    values.forEach((value: any) => {
      console.log(`    - ${value.name} = ${value.value}`);
    });
  });

  // Imports
  const imports = entities.filter(e => e.metadata?.entityType === 'import');
  console.log(`\n📥 Imports (${imports.length}):`);
  imports.forEach(imp => {
    const source = imp.metadata?.source;
    const importType = imp.metadata?.importType;
    const isLocal = imp.metadata?.isLocal ? '(local)' : '(external)';

    if (importType === 'named') {
      const imports = imp.metadata?.imports?.join(', ') || '';
      console.log(`  - { ${imports} } from '${source}' ${isLocal}`);
    } else if (importType === 'default') {
      const defaultImport = imp.metadata?.defaultImport;
      console.log(`  - ${defaultImport} from '${source}' ${isLocal}`);
    } else if (importType === 'namespace') {
      const namespace = imp.metadata?.namespace;
      console.log(`  - * as ${namespace} from '${source}' ${isLocal}`);
    }
  });

  // Exports
  const exports = entities.filter(e => e.metadata?.entityType === 'export');
  console.log(`\n📤 Exports (${exports.length}):`);
  exports.forEach(exp => {
    const exports = exp.metadata?.exports?.join(', ') || '';
    const isDefault = exp.metadata?.isDefault ? '(default)' : '';
    console.log(`  - ${exports} ${isDefault}`);
  });

  // Analyze relationships
  console.log('\n🔗 Analyzing relationships...');
  const relationships = adapter.detectRelationships!(entities);
  console.log(`Total relationships: ${relationships.length}\n`);

  // Group relationships by type
  const relationshipTypes = new Map<string, number>();
  relationships.forEach(rel => {
    const relType = rel.metadata?.relationshipType || rel.type;
    relationshipTypes.set(relType, (relationshipTypes.get(relType) || 0) + 1);
  });

  console.log('📊 Relationship Types:');
  relationshipTypes.forEach((count, type) => {
    console.log(`  - ${type}: ${count}`);
  });

  // Show some specific relationships
  const callRelationships = relationships.filter(r => r.metadata?.relationshipType === 'calls');
  if (callRelationships.length > 0) {
    console.log('\n📞 Function Call Relationships:');
    callRelationships.slice(0, 5).forEach(rel => {
      const caller = rel.metadata?.caller;
      const callee = rel.metadata?.callee;
      console.log(`  - ${caller} calls ${callee}`);
    });
    if (callRelationships.length > 5) {
      console.log(`  ... and ${callRelationships.length - 5} more`);
    }
  }

  const inheritanceRelationships = relationships.filter(r => r.metadata?.relationshipType === 'extends');
  if (inheritanceRelationships.length > 0) {
    console.log('\n🏗️  Inheritance Relationships:');
    inheritanceRelationships.forEach(rel => {
      const child = rel.metadata?.child;
      const parent = rel.metadata?.parent;
      console.log(`  - ${child} extends ${parent}`);
    });
  }

  // Performance information
  const startTime = performance.now();
  adapter.extract(sampleCode, metadata);
  const endTime = performance.now();
  const processingTime = Math.round((endTime - startTime) * 100) / 100;

  console.log(`\n⚡ Performance:`);
  console.log(`  - Processing time: ${processingTime}ms`);
  console.log(`  - Content size: ${sampleCode.length} characters`);
  console.log(`  - Entities per ms: ${Math.round((entities.length / processingTime) * 100) / 100}`);

  console.log('\n✅ Demo completed successfully!');
  console.log('\n💡 The CodebaseAdapter successfully extracted:');
  console.log('   • Function definitions with parameters and return types');
  console.log('   • Class hierarchies with methods and properties');
  console.log('   • Interface and type definitions');
  console.log('   • Import/export dependencies');
  console.log('   • Enum definitions with values');
  console.log('   • Various code relationships');
  console.log('\nThis demonstrates the adapter\'s ability to understand and analyze');
  console.log('TypeScript/JavaScript code structure for intelligent context extraction.');
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };