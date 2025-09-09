/**
 * AttributeIndex Usage Examples
 * 
 * This file demonstrates how to use AttributeIndex with different storage adapters
 * while maintaining backward compatibility.
 */

import { AttributeIndex } from './AttributeIndex';
import { MemoryStorageAdapter, JSONStorageAdapter } from '../storage';
import type { Entity } from '../types/entity';

// Sample entities for demonstration
const sampleEntities: Entity[] = [
  {
    id: 'file1',
    type: 'document',
    name: 'UserService.ts',
    content: 'export class UserService { /* ... */ }',
    metadata: { language: 'typescript', size: 1000, entityType: 'module' }
  },
  {
    id: 'file2',
    type: 'document',
    name: 'Header.tsx',
    content: 'export function Header() { /* ... */ }',
    metadata: { language: 'typescript', framework: 'react', size: 500, entityType: 'component' }
  },
  {
    id: 'file3',
    type: 'document',
    name: 'UserService.test.ts',
    content: 'describe("UserService", () => { /* ... */ })',
    metadata: { language: 'typescript', testFramework: 'vitest', size: 800, entityType: 'test' }
  }
];

/**
 * Example 1: Using AttributeIndex with default behavior (backward compatibility)
 * This works exactly as before - data is saved to/loaded from JSON files
 */
export async function basicUsageExample() {
  console.log('\n=== Basic Usage Example (Backward Compatible) ===');
  
  // Create index with default behavior
  const index = new AttributeIndex();
  
  // Index entities
  index.indexEntities(sampleEntities);
  
  // Query entities
  const tsFiles = index.findByAttribute('language', 'typescript');
  console.log('TypeScript files:', Array.from(tsFiles));
  
  const components = index.findByAttribute('entityType', 'component');
  console.log('Components:', Array.from(components));
  
  // Save to file (backward compatible API)
  await index.save('./temp/basic-index.json');
  
  // Load from file (backward compatible API)
  const newIndex = new AttributeIndex();
  await newIndex.load('./temp/basic-index.json');
  
  console.log('Loaded data - TypeScript files:', Array.from(newIndex.findByAttribute('language', 'typescript')));
}

/**
 * Example 2: Using AttributeIndex with MemoryStorageAdapter
 * Perfect for testing or when persistence is handled externally
 */
export async function memoryStorageExample() {
  console.log('\n=== Memory Storage Example ===');
  
  // Create shared memory storage
  const memoryStorage = new MemoryStorageAdapter({ 
    debug: true, 
    id: 'index-storage' 
  });
  
  // Create index with memory storage
  const index1 = new AttributeIndex(memoryStorage);
  
  // Index entities
  index1.indexEntities(sampleEntities);
  
  // Complex query example
  const reactComponents = index1.findByAttributes([
    { attribute: 'framework', value: 'react', operator: 'equals' },
    { attribute: 'language', value: 'typescript', operator: 'equals' }
  ], 'AND');
  console.log('React TypeScript components:', Array.from(reactComponents));
  
  // Save to memory storage with a key
  await index1.save('project-index');
  
  // Create another index instance sharing the same storage
  const index2 = new AttributeIndex(memoryStorage);
  
  // Load from memory storage
  await index2.load('project-index');
  
  // Verify data was shared
  const loadedComponents = index2.findByAttribute('framework', 'react');
  console.log('Loaded from memory storage:', Array.from(loadedComponents));
}

/**
 * Example 3: Using AttributeIndex with JSONStorageAdapter
 * Provides more control over file operations and supports advanced features
 */
export async function jsonStorageExample() {
  console.log('\n=== JSON Storage Example ===');
  
  // Create JSON storage with configuration
  const jsonStorage = new JSONStorageAdapter({
    type: 'json',
    filePath: './temp/advanced-index.json',
    pretty: true,        // Pretty-print JSON
    atomic: true,        // Atomic writes for safety
    autoSave: true,      // Auto-save on every operation
    debug: true          // Debug logging
  });
  
  // Create index with JSON storage
  const index = new AttributeIndex(jsonStorage);
  
  // Index entities
  index.indexEntities(sampleEntities);
  
  // Advanced querying
  const largeFiles = index.findByAttributes([
    { attribute: 'size', value: 500, operator: 'equals' } // In real use, you'd want > operator
  ]);
  console.log('Large files:', Array.from(largeFiles));
  
  // Pattern-based queries
  const testFiles = index.findByAttributes([
    { attribute: 'entityType', value: 'test', operator: 'equals' }
  ]);
  console.log('Test files:', Array.from(testFiles));
  
  // Save with key (stored as single entry in JSON file)
  await index.save('main-project-index');
  
  // Create new index with new storage pointing to same file
  const newJsonStorage = new JSONStorageAdapter({
    type: 'json',
    filePath: './temp/advanced-index.json'
  });
  
  const newIndex = new AttributeIndex(newJsonStorage);
  await newIndex.load('main-project-index');
  
  // Show statistics
  const stats = newIndex.getStatistics();
  console.log('Index statistics:', stats);
}

/**
 * Example 4: Migration example - converting from file-based to storage adapter
 */
export async function migrationExample() {
  console.log('\n=== Migration Example ===');
  
  // Step 1: Create index with old API and save to file
  const oldIndex = new AttributeIndex();
  oldIndex.indexEntities(sampleEntities);
  await oldIndex.save('./temp/legacy-index.json');
  
  // Step 2: Load into new storage adapter
  // First load with backward compatible API
  const intermediateIndex = new AttributeIndex();
  await intermediateIndex.load('./temp/legacy-index.json');
  
  // Step 3: Create new storage adapter and save data there
  const modernStorage = new JSONStorageAdapter({
    type: 'json',
    filePath: './temp/modern-index.json',
    pretty: true
  });
  
  const modernIndex = new AttributeIndex(modernStorage);
  
  // Transfer data by reindexing (alternatively, you could copy serialized data)
  const allAttributes = intermediateIndex.getAllAttributes();
  for (const attr of allAttributes) {
    const values = intermediateIndex.getValuesForAttribute(attr);
    for (const value of values) {
      const entities = intermediateIndex.findByAttribute(attr, value);
      for (const entityId of entities) {
        modernIndex.addAttribute(entityId, attr, value);
      }
    }
  }
  
  // Save with modern storage
  await modernIndex.save('migrated-index');
  
  console.log('Migration completed. Modern index has', (await modernStorage.size()), 'entries');
}

/**
 * Example 5: Using multiple storage adapters for different purposes
 */
export async function multiStorageExample() {
  console.log('\n=== Multi-Storage Example ===');
  
  // Fast memory storage for temporary/cache data
  const cacheStorage = new MemoryStorageAdapter({ id: 'cache' });
  const cacheIndex = new AttributeIndex(cacheStorage);
  
  // Persistent JSON storage for permanent data
  const persistentStorage = new JSONStorageAdapter({
    type: 'json',
    filePath: './temp/persistent-index.json'
  });
  const persistentIndex = new AttributeIndex(persistentStorage);
  
  // Index same data in both
  cacheIndex.indexEntities(sampleEntities);
  persistentIndex.indexEntities(sampleEntities);
  
  // Save to both storages
  await cacheIndex.save('temp-data');
  await persistentIndex.save('permanent-data');
  
  // Demonstrate fast cache access
  console.time('Cache query');
  const cacheResult = cacheIndex.findByAttribute('entityType', 'module');
  console.timeEnd('Cache query');
  
  // Demonstrate persistent storage access
  console.time('Persistent query');
  const persistentResult = persistentIndex.findByAttribute('entityType', 'module');
  console.timeEnd('Persistent query');
  
  console.log('Results match:', 
    JSON.stringify(Array.from(cacheResult)) === JSON.stringify(Array.from(persistentResult))
  );
}

// Export a function to run all examples
export async function runAllExamples() {
  try {
    await basicUsageExample();
    await memoryStorageExample();
    await jsonStorageExample();
    await migrationExample();
    await multiStorageExample();
    
    console.log('\n✅ All AttributeIndex examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
    throw error;
  }
}

// If running this file directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}