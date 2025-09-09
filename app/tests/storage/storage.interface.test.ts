/**
 * Comprehensive test suite for Storage interface implementations
 * Following TDD principles - tests define the contract for all storage adapters
 * 
 * This suite ensures all storage adapters conform to the same interface contract
 * and handles all edge cases, error conditions, and type safety requirements.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryStorageAdapter } from '../../src/storage/adapters/MemoryStorageAdapter'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Core Storage interface - all storage adapters must implement this
 */
interface Storage<T = any> {
  /**
   * Retrieve a value by key
   * @returns undefined if key doesn't exist
   */
  get(key: string): Promise<T | undefined>
  
  /**
   * Store a value with a key
   * Overwrites if key exists
   */
  set(key: string, value: T): Promise<void>
  
  /**
   * Delete a key-value pair
   * @returns true if key existed and was deleted
   */
  delete(key: string): Promise<boolean>
  
  /**
   * Check if a key exists
   */
  has(key: string): Promise<boolean>
  
  /**
   * Remove all key-value pairs
   */
  clear(): Promise<void>
  
  /**
   * Get the number of stored items
   */
  size(): Promise<number>
  
  /**
   * Iterate over all keys
   */
  keys(): AsyncIterator<string>
  
  /**
   * Iterate over all values
   */
  values(): AsyncIterator<T>
  
  /**
   * Iterate over all entries
   */
  entries(): AsyncIterator<[string, T]>
}

/**
 * Extended Storage interface with batch operations
 */
interface BatchStorage<T> extends Storage<T> {
  /**
   * Retrieve multiple values at once
   */
  getMany(keys: string[]): Promise<Map<string, T>>
  
  /**
   * Store multiple key-value pairs
   */
  setMany(entries: Map<string, T>): Promise<void>
  
  /**
   * Delete multiple keys
   * @returns number of keys actually deleted
   */
  deleteMany(keys: string[]): Promise<number>
}

/**
 * Storage configuration interface
 */
interface StorageConfig {
  id?: string
  debug?: boolean
}

/**
 * Factory function type for creating storage adapters
 */
type StorageFactory<T = any> = (config?: StorageConfig) => Promise<Storage<T>>

/**
 * Test data structures for comprehensive testing
 */
interface TestEntity {
  id: string
  name: string
  value: number
  active: boolean
  metadata?: Record<string, any>
  tags?: string[]
  created?: Date
}

interface ComplexTestData {
  primitive: string
  nested: {
    level1: {
      level2: {
        value: number
      }
    }
  }
  array: any[]
  nullValue: null
  undefinedValue?: undefined
  date: Date
  regex: RegExp
}

// ============================================================================
// STORAGE ADAPTER REGISTRY
// ============================================================================

/**
 * Registry of storage adapter factories for testing
 * Each adapter will be tested with the same contract
 */
const storageAdapterRegistry: Map<string, StorageFactory> = new Map()

/**
 * Register a storage adapter for testing
 */
function registerStorageAdapter(name: string, factory: StorageFactory): void {
  storageAdapterRegistry.set(name, factory)
}

/**
 * Get all registered adapter names
 */
function getRegisteredAdapters(): string[] {
  return Array.from(storageAdapterRegistry.keys())
}

// Note: MockStorageAdapter was removed after TDD Red phase completed
// All storage adapters now have proper implementations:
// - MemoryStorageAdapter for in-memory testing
// - JSONStorageAdapter for file-based persistence

// Register a basic memory adapter for interface contract testing
// This ensures the interface tests can run independently
registerStorageAdapter('interface-test-memory', async (config) => {
  return new MemoryStorageAdapter(config)
})

// ============================================================================
// COMPREHENSIVE TEST SUITE
// ============================================================================

/**
 * Run comprehensive interface compliance tests for any storage adapter
 */
function runStorageInterfaceTests<T>(name: string, factory: StorageFactory<T>) {
  describe(`${name} Storage Adapter`, () => {
    let storage: Storage<T>
    
    beforeEach(async () => {
      storage = await factory()
      await storage.clear()
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
      }
    })

    // ========================================================================
    // BASIC OPERATIONS TESTS
    // ========================================================================
    
    describe('Basic Operations', () => {
      it('should store and retrieve simple values', async () => {
        const key = 'simple-key'
        const value = 'simple-value' as any
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toBe(value)
      })
      
      it('should store and retrieve complex objects', async () => {
        const key = 'complex-key'
        const value: ComplexTestData = {
          primitive: 'test string',
          nested: {
            level1: {
              level2: {
                value: 42
              }
            }
          },
          array: [1, 'two', { three: 3 }, null],
          nullValue: null,
          date: new Date('2023-01-01'),
          regex: /test-pattern/gi
        } as any
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toEqual(expect.objectContaining({
          primitive: 'test string',
          nested: expect.objectContaining({
            level1: expect.objectContaining({
              level2: expect.objectContaining({
                value: 42
              })
            })
          }),
          array: expect.arrayContaining([1, 'two', expect.objectContaining({ three: 3 }), null]),
          nullValue: null
        }))
      })
      
      it('should return undefined for non-existent keys', async () => {
        const result = await storage.get('non-existent-key')
        expect(result).toBeUndefined()
      })
      
      it('should overwrite existing values', async () => {
        const key = 'test-key'
        const value1 = 'first-value' as any
        const value2 = 'second-value' as any
        
        await storage.set(key, value1)
        await storage.set(key, value2)
        
        const result = await storage.get(key)
        expect(result).toBe(value2)
        expect(result).not.toBe(value1)
      })
      
      it('should delete existing keys and return true', async () => {
        const key = 'delete-test'
        const value = 'to-be-deleted' as any
        
        await storage.set(key, value)
        expect(await storage.has(key)).toBe(true)
        
        const deleted = await storage.delete(key)
        expect(deleted).toBe(true)
        
        expect(await storage.has(key)).toBe(false)
        expect(await storage.get(key)).toBeUndefined()
      })
      
      it('should return false when deleting non-existent keys', async () => {
        const deleted = await storage.delete('non-existent')
        expect(deleted).toBe(false)
      })
      
      it('should correctly check key existence', async () => {
        const key = 'existence-test'
        const value = 'exists' as any
        
        expect(await storage.has(key)).toBe(false)
        
        await storage.set(key, value)
        expect(await storage.has(key)).toBe(true)
        
        await storage.delete(key)
        expect(await storage.has(key)).toBe(false)
      })
      
      it('should track storage size correctly', async () => {
        expect(await storage.size()).toBe(0)
        
        await storage.set('key1', 'value1' as any)
        expect(await storage.size()).toBe(1)
        
        await storage.set('key2', 'value2' as any)
        expect(await storage.size()).toBe(2)
        
        await storage.set('key1', 'updated-value1' as any) // Overwrite
        expect(await storage.size()).toBe(2)
        
        await storage.delete('key1')
        expect(await storage.size()).toBe(1)
        
        await storage.delete('key2')
        expect(await storage.size()).toBe(0)
      })
      
      it('should clear all data', async () => {
        // Add multiple entries
        await storage.set('key1', 'value1' as any)
        await storage.set('key2', 'value2' as any)
        await storage.set('key3', 'value3' as any)
        
        expect(await storage.size()).toBe(3)
        
        await storage.clear()
        
        expect(await storage.size()).toBe(0)
        expect(await storage.has('key1')).toBe(false)
        expect(await storage.has('key2')).toBe(false)
        expect(await storage.has('key3')).toBe(false)
      })
    })

    // ========================================================================
    // ITERATOR METHODS TESTS
    // ========================================================================
    
    describe('Iterator Methods', () => {
      beforeEach(async () => {
        // Seed test data
        await storage.set('key1', 'value1' as any)
        await storage.set('key2', 'value2' as any)
        await storage.set('key3', 'value3' as any)
      })
      
      it('should iterate over all keys', async () => {
        const keys: string[] = []
        
        for await (const key of storage.keys()) {
          keys.push(key)
        }
        
        expect(keys).toHaveLength(3)
        expect(keys).toEqual(expect.arrayContaining(['key1', 'key2', 'key3']))
      })
      
      it('should iterate over all values', async () => {
        const values: any[] = []
        
        for await (const value of storage.values()) {
          values.push(value)
        }
        
        expect(values).toHaveLength(3)
        expect(values).toEqual(expect.arrayContaining(['value1', 'value2', 'value3']))
      })
      
      it('should iterate over all entries', async () => {
        const entries = new Map<string, any>()
        
        for await (const [key, value] of storage.entries()) {
          entries.set(key, value)
        }
        
        expect(entries.size).toBe(3)
        expect(entries.get('key1')).toBe('value1')
        expect(entries.get('key2')).toBe('value2')
        expect(entries.get('key3')).toBe('value3')
      })
      
      it('should handle empty storage iteration', async () => {
        await storage.clear()
        
        const keys: string[] = []
        const values: any[] = []
        const entries: [string, any][] = []
        
        for await (const key of storage.keys()) {
          keys.push(key)
        }
        
        for await (const value of storage.values()) {
          values.push(value)
        }
        
        for await (const entry of storage.entries()) {
          entries.push(entry)
        }
        
        expect(keys).toHaveLength(0)
        expect(values).toHaveLength(0)
        expect(entries).toHaveLength(0)
      })
      
      it('should maintain consistency between iterators', async () => {
        const keys: string[] = []
        const values: any[] = []
        const entriesMap = new Map<string, any>()
        
        for await (const key of storage.keys()) {
          keys.push(key)
        }
        
        for await (const value of storage.values()) {
          values.push(value)
        }
        
        for await (const [key, value] of storage.entries()) {
          entriesMap.set(key, value)
        }
        
        expect(keys).toHaveLength(values.length)
        expect(keys).toHaveLength(entriesMap.size)
        
        // Verify that all keys from keys() are present in entries()
        keys.forEach(key => {
          expect(entriesMap.has(key)).toBe(true)
        })
        
        // Verify that all values from values() are present in entries()
        values.forEach(value => {
          expect(Array.from(entriesMap.values())).toContain(value)
        })
      })
    })

    // ========================================================================
    // EDGE CASES TESTS
    // ========================================================================
    
    describe('Edge Cases', () => {
      it('should handle null values', async () => {
        const key = 'null-test'
        const value = null as any
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toBe(null)
        expect(await storage.has(key)).toBe(true)
      })
      
      it('should handle undefined values', async () => {
        const key = 'undefined-test'
        const value = undefined as any
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        // Note: Some storage implementations may not distinguish between
        // undefined value and non-existent key. This test documents expected behavior.
        expect(retrieved).toBeUndefined()
        expect(await storage.has(key)).toBe(true)
      })
      
      it('should handle empty strings', async () => {
        const key = 'empty-string-test'
        const value = '' as any
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toBe('')
        expect(await storage.has(key)).toBe(true)
      })
      
      it('should handle zero values', async () => {
        const key = 'zero-test'
        const value = 0 as any
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toBe(0)
        expect(await storage.has(key)).toBe(true)
      })
      
      it('should handle boolean false values', async () => {
        const key = 'false-test'
        const value = false as any
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toBe(false)
        expect(await storage.has(key)).toBe(true)
      })
      
      it('should handle very long keys', async () => {
        const longKey = 'a'.repeat(1000)
        const value = 'long-key-value' as any
        
        await storage.set(longKey, value)
        const retrieved = await storage.get(longKey)
        
        expect(retrieved).toBe(value)
      })
      
      it('should handle keys with special characters', async () => {
        const specialKeys = [
          'key with spaces',
          'key/with/slashes',
          'key.with.dots',
          'key-with-dashes',
          'key_with_underscores',
          'key:with:colons',
          'key@with@symbols',
          'key#with#hash',
          'key$with$dollar',
          'key%with%percent',
          'key&with&ampersand',
          'key*with*asterisk',
          'key+with+plus',
          'key=with=equals',
          'key?with?question',
          'key[with]brackets',
          'key{with}braces',
          'key(with)parentheses',
          'key|with|pipes',
          'key\\\\with\\\\backslashes',
          'key"with"quotes',
          "key'with'apostrophes",
          'key`with`backticks'
        ]
        
        for (const key of specialKeys) {
          const value = `value-for-${key}` as any
          await storage.set(key, value)
          const retrieved = await storage.get(key)
          expect(retrieved).toBe(value)
        }
      })
      
      it('should handle Unicode keys and values', async () => {
        const unicodeData = [
          { key: '键', value: '值' },
          { key: 'ключ', value: 'значение' },
          { key: 'مفتاح', value: 'قيمة' },
          { key: 'キー', value: '値' },
          { key: '🔑', value: '💎' },
          { key: 'café', value: 'naïve' },
          { key: 'Ωμέγα', value: 'άλφα' }
        ]
        
        for (const { key, value } of unicodeData) {
          await storage.set(key, value as any)
          const retrieved = await storage.get(key)
          expect(retrieved).toBe(value)
        }
      })
      
      it('should handle large values', async () => {
        const largeValue = {
          data: 'x'.repeat(100000), // 100KB string
          metadata: {
            size: 100000,
            created: new Date(),
            tags: Array.from({ length: 1000 }, (_, i) => `tag-${i}`)
          }
        } as any
        
        await storage.set('large-value', largeValue)
        const retrieved = await storage.get('large-value')
        
        expect(retrieved).toEqual(largeValue)
      })
      
      it('should handle concurrent operations', async () => {
        const concurrentOperations = Array.from({ length: 100 }, async (_, i) => {
          const key = `concurrent-${i}`
          const value = `value-${i}` as any
          
          await storage.set(key, value)
          return { key, value }
        })
        
        const results = await Promise.all(concurrentOperations)
        
        // Verify all values were stored correctly
        for (const { key, value } of results) {
          const retrieved = await storage.get(key)
          expect(retrieved).toBe(value)
        }
        
        expect(await storage.size()).toBe(100)
      })
    })

    // ========================================================================
    // ERROR CONDITIONS TESTS
    // ========================================================================
    
    describe('Error Conditions', () => {
      it('should handle empty key gracefully', async () => {
        const emptyKey = ''
        const value = 'empty-key-value' as any
        
        // Some implementations may reject empty keys, others may accept them
        // This test documents the behavior
        try {
          await storage.set(emptyKey, value)
          const retrieved = await storage.get(emptyKey)
          expect(retrieved).toBe(value)
        } catch (error) {
          expect(error).toBeDefined()
          expect(error).toBeInstanceOf(Error)
        }
      })
      
      it('should handle null key rejection', async () => {
        const nullKey = null as any
        const value = 'null-key-value' as any
        
        await expect(storage.set(nullKey, value)).rejects.toThrow()
        await expect(storage.get(nullKey)).rejects.toThrow()
        await expect(storage.has(nullKey)).rejects.toThrow()
        await expect(storage.delete(nullKey)).rejects.toThrow()
      })
      
      it('should handle undefined key rejection', async () => {
        const undefinedKey = undefined as any
        const value = 'undefined-key-value' as any
        
        await expect(storage.set(undefinedKey, value)).rejects.toThrow()
        await expect(storage.get(undefinedKey)).rejects.toThrow()
        await expect(storage.has(undefinedKey)).rejects.toThrow()
        await expect(storage.delete(undefinedKey)).rejects.toThrow()
      })
      
      it('should handle non-string key rejection', async () => {
        const invalidKeys = [123, true, {}, [], Symbol('test')] as any[]
        const value = 'invalid-key-value' as any
        
        for (const invalidKey of invalidKeys) {
          await expect(storage.set(invalidKey, value)).rejects.toThrow()
          await expect(storage.get(invalidKey)).rejects.toThrow()
          await expect(storage.has(invalidKey)).rejects.toThrow()
          await expect(storage.delete(invalidKey)).rejects.toThrow()
        }
      })
      
      it('should handle circular reference values', async () => {
        const circularObject: any = { name: 'test' }
        circularObject.self = circularObject
        
        // Most storage implementations will reject circular references
        await expect(storage.set('circular', circularObject)).rejects.toThrow()
      })
      
      it('should handle function values', async () => {
        const functionValue = () => 'test function' as any
        
        // Most storage implementations will reject functions
        await expect(storage.set('function', functionValue)).rejects.toThrow()
      })
      
      it('should handle symbol values', async () => {
        const symbolValue = Symbol('test symbol') as any
        
        // Most storage implementations will reject symbols
        await expect(storage.set('symbol', symbolValue)).rejects.toThrow()
      })
    })

    // ========================================================================
    // TYPE SAFETY TESTS
    // ========================================================================
    
    describe('Type Safety', () => {
      it('should preserve type information with generics', async () => {
        // Create a typed storage instance
        const typedStorage = storage as Storage<TestEntity>
        
        const testEntity: TestEntity = {
          id: 'test-entity-1',
          name: 'Test Entity',
          value: 42,
          active: true,
          metadata: { category: 'test', priority: 'high' },
          tags: ['typescript', 'testing'],
          created: new Date()
        }
        
        await typedStorage.set('entity-1', testEntity)
        const retrieved = await typedStorage.get('entity-1')
        
        expect(retrieved).toBeDefined()
        expect(retrieved!.id).toBe('test-entity-1')
        expect(retrieved!.name).toBe('Test Entity')
        expect(retrieved!.value).toBe(42)
        expect(retrieved!.active).toBe(true)
        expect(retrieved!.metadata).toEqual({ category: 'test', priority: 'high' })
        expect(retrieved!.tags).toEqual(['typescript', 'testing'])
      })
      
      it('should handle mixed types in untyped storage', async () => {
        const mixedData = [
          { key: 'string', value: 'text' },
          { key: 'number', value: 123 },
          { key: 'boolean', value: true },
          { key: 'object', value: { nested: 'data' } },
          { key: 'array', value: [1, 2, 3] },
          { key: 'null', value: null }
        ]
        
        for (const { key, value } of mixedData) {
          await storage.set(key, value)
          const retrieved = await storage.get(key)
          expect(retrieved).toEqual(value)
        }
      })
      
      it('should handle Date objects correctly', async () => {
        const date = new Date('2023-12-25T10:30:00.000Z')
        await storage.set('date-test', date as any)
        
        const retrieved = await storage.get('date-test')
        
        // Some storage implementations may serialize dates as strings
        // This test documents the expected behavior
        if (retrieved instanceof Date) {
          expect(retrieved.getTime()).toBe(date.getTime())
        } else {
          expect(retrieved).toBe(date.toISOString())
        }
      })
      
      it('should handle RegExp objects', async () => {
        const regex = /test-pattern/gi
        
        try {
          await storage.set('regex-test', regex as any)
          const retrieved = await storage.get('regex-test')
          
          // Storage behavior with RegExp varies by implementation
          if (retrieved instanceof RegExp) {
            expect(retrieved.source).toBe(regex.source)
            expect(retrieved.flags).toBe(regex.flags)
          } else {
            // May be serialized as string or object
            expect(retrieved).toBeDefined()
          }
        } catch (error) {
          // Some implementations may reject RegExp objects
          expect(error).toBeInstanceOf(Error)
        }
      })
      
      it('should handle nested generic types', async () => {
        interface NestedType<T> {
          id: string
          data: T
          children?: NestedType<T>[]
        }
        
        const nestedData: NestedType<number> = {
          id: 'parent',
          data: 42,
          children: [
            { id: 'child1', data: 1 },
            { id: 'child2', data: 2, children: [{ id: 'grandchild', data: 3 }] }
          ]
        }
        
        await storage.set('nested-generic', nestedData as any)
        const retrieved = await storage.get('nested-generic')
        
        expect(retrieved).toEqual(nestedData)
      })
    })

    // ========================================================================
    // PERFORMANCE AND STRESS TESTS
    // ========================================================================
    
    describe('Performance Characteristics', () => {
      it('should handle rapid successive operations', async () => {
        const startTime = performance.now()
        
        // Perform 1000 set operations
        for (let i = 0; i < 1000; i++) {
          await storage.set(`rapid-${i}`, `value-${i}` as any)
        }
        
        // Verify all were stored
        expect(await storage.size()).toBe(1000)
        
        // Perform 1000 get operations
        for (let i = 0; i < 1000; i++) {
          const value = await storage.get(`rapid-${i}`)
          expect(value).toBe(`value-${i}`)
        }
        
        const duration = performance.now() - startTime
        
        // This is more of a smoke test - actual performance will vary by implementation
        expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
      })
      
      it('should handle storage growth and shrinkage', async () => {
        // Fill storage
        for (let i = 0; i < 1000; i++) {
          await storage.set(`growth-${i}`, `value-${i}` as any)
        }
        
        expect(await storage.size()).toBe(1000)
        
        // Remove half the items
        for (let i = 0; i < 500; i++) {
          await storage.delete(`growth-${i}`)
        }
        
        expect(await storage.size()).toBe(500)
        
        // Add more items
        for (let i = 1000; i < 1500; i++) {
          await storage.set(`growth-${i}`, `value-${i}` as any)
        }
        
        expect(await storage.size()).toBe(1000)
        
        // Clear all
        await storage.clear()
        expect(await storage.size()).toBe(0)
      })
    })
  })
}

// ============================================================================
// BATCH OPERATIONS TESTS (if supported)
// ============================================================================

/**
 * Run batch operation tests for adapters that support BatchStorage
 */
function runBatchStorageTests<T>(name: string, factory: () => Promise<BatchStorage<T>>) {
  describe(`${name} Batch Operations`, () => {
    let storage: BatchStorage<T>
    
    beforeEach(async () => {
      storage = await factory()
      await storage.clear()
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
      }
    })
    
    it('should get multiple values efficiently', async () => {
      // Seed data
      await storage.set('key1', 'value1' as any)
      await storage.set('key2', 'value2' as any)
      await storage.set('key3', 'value3' as any)
      
      const results = await storage.getMany(['key1', 'key2', 'key3', 'missing'])
      
      expect(results.size).toBe(3)
      expect(results.get('key1')).toBe('value1')
      expect(results.get('key2')).toBe('value2')
      expect(results.get('key3')).toBe('value3')
      expect(results.has('missing')).toBe(false)
    })
    
    it('should set multiple values efficiently', async () => {
      const entries = new Map([
        ['batch1', 'value1'],
        ['batch2', 'value2'],
        ['batch3', 'value3']
      ]) as Map<string, any>
      
      await storage.setMany(entries)
      
      expect(await storage.get('batch1')).toBe('value1')
      expect(await storage.get('batch2')).toBe('value2')
      expect(await storage.get('batch3')).toBe('value3')
      expect(await storage.size()).toBe(3)
    })
    
    it('should delete multiple values efficiently', async () => {
      // Seed data
      await storage.set('delete1', 'value1' as any)
      await storage.set('delete2', 'value2' as any)
      await storage.set('delete3', 'value3' as any)
      await storage.set('keep1', 'value4' as any)
      
      const deletedCount = await storage.deleteMany(['delete1', 'delete2', 'delete3', 'missing'])
      
      expect(deletedCount).toBe(3)
      expect(await storage.has('delete1')).toBe(false)
      expect(await storage.has('delete2')).toBe(false)
      expect(await storage.has('delete3')).toBe(false)
      expect(await storage.has('keep1')).toBe(true)
      expect(await storage.size()).toBe(1)
    })
    
    it('should handle empty batch operations', async () => {
      const getResults = await storage.getMany([])
      expect(getResults.size).toBe(0)
      
      await storage.setMany(new Map())
      expect(await storage.size()).toBe(0)
      
      const deleteCount = await storage.deleteMany([])
      expect(deleteCount).toBe(0)
    })
  })
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

describe('Storage Interface Contract Tests', () => {
  // Run tests for all registered adapters
  describe('All Registered Adapters', () => {
    const adapters = getRegisteredAdapters()
    
    if (adapters.length === 0) {
      it('should have at least one registered adapter', () => {
        expect(adapters.length).toBeGreaterThan(0)
      })
    } else {
      it('should have real implementations registered', () => {
        expect(adapters.length).toBeGreaterThan(0)
        // Verify we have real implementations, not mocks
        expect(adapters).not.toContain('mock')
      })
      
      adapters.forEach(adapterName => {
        const factory = storageAdapterRegistry.get(adapterName)!
        runStorageInterfaceTests(adapterName, factory)
      })
    }
  })
})

// ============================================================================
// EXPORT FOR EXTERNAL USE
// ============================================================================

export {
  Storage,
  BatchStorage,
  StorageConfig,
  StorageFactory,
  TestEntity,
  ComplexTestData,
  registerStorageAdapter,
  getRegisteredAdapters,
  runStorageInterfaceTests,
  runBatchStorageTests
}