/**
 * Test suite for DuckDBStorageAdapter
 * Following TDD principles - tests written BEFORE implementation
 * 
 * This comprehensive test suite validates:
 * 1. Storage interface compliance
 * 2. DuckDB-specific features
 * 3. Error handling
 * 4. Performance characteristics
 * 5. Type safety
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import { DuckDBStorageAdapter } from '../../src/storage/adapters/DuckDBStorageAdapter'
import { DuckDBStorageConfig, StorageError, StorageErrorCode } from '../../src/storage/interfaces/Storage'

// Test data types
interface TestData {
  id: number
  name: string
  metadata?: {
    created: Date
    tags: string[]
  }
}

// Test configuration
const TEST_DB_PATH = path.join(__dirname, '../fixtures/test.duckdb')
const TEST_DB_DIR = path.dirname(TEST_DB_PATH)

describe('DuckDBStorageAdapter', () => {
  let storage: DuckDBStorageAdapter<TestData>
  
  // Cleanup helper
  const cleanup = async () => {
    try {
      await fs.unlink(TEST_DB_PATH)
    } catch (e) {
      // File doesn't exist, that's fine
    }
  }
  
  beforeAll(async () => {
    // Ensure test directory exists
    await fs.mkdir(TEST_DB_DIR, { recursive: true })
  })
  
  afterAll(async () => {
    // Clean up test database
    await cleanup()
  })
  
  describe('Initialization', () => {
    it('should create adapter with in-memory database', async () => {
      const config: DuckDBStorageConfig = {
        type: 'duckdb',
        database: ':memory:'
      }
      
      storage = new DuckDBStorageAdapter(config)
      expect(storage).toBeDefined()
      expect(storage).toBeInstanceOf(DuckDBStorageAdapter)
    })
    
    it('should create adapter with file database', async () => {
      const config: DuckDBStorageConfig = {
        type: 'duckdb',
        database: TEST_DB_PATH
      }
      
      storage = new DuckDBStorageAdapter(config)
      expect(storage).toBeDefined()
      
      // Initialize connection
      await storage.get('test')
      
      // Check that database file was created
      const stats = await fs.stat(TEST_DB_PATH)
      expect(stats.isFile()).toBe(true)
    })
    
    it('should accept custom table name', async () => {
      const config: DuckDBStorageConfig = {
        type: 'duckdb',
        database: ':memory:',
        tableName: 'custom_storage'
      }
      
      storage = new DuckDBStorageAdapter(config)
      await storage.set('key', { id: 1, name: 'test' })
      
      // Should work with custom table
      const value = await storage.get('key')
      expect(value).toBeDefined()
    })
    
    it('should handle configuration options', async () => {
      const config: DuckDBStorageConfig = {
        type: 'duckdb',
        database: ':memory:',
        threads: 4,
        options: {
          max_memory: '1GB',
          access_mode: 'read_write'
        }
      }
      
      storage = new DuckDBStorageAdapter(config)
      expect(storage).toBeDefined()
    })
    
    it('should throw error for invalid database path', () => {
      const config: DuckDBStorageConfig = {
        type: 'duckdb',
        database: ''
      }
      
      expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
    })
  })
  
  describe('Basic Storage Operations', () => {
    beforeEach(async () => {
      await cleanup()
      storage = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: ':memory:'
      })
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
        await storage.close()
      }
    })
    
    describe('set()', () => {
      it('should store a simple value', async () => {
        const key = 'test-key'
        const value: TestData = { id: 1, name: 'Test Item' }
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toEqual(value)
      })
      
      it('should overwrite existing value', async () => {
        const key = 'test-key'
        const value1: TestData = { id: 1, name: 'First' }
        const value2: TestData = { id: 2, name: 'Second' }
        
        await storage.set(key, value1)
        await storage.set(key, value2)
        
        const retrieved = await storage.get(key)
        expect(retrieved).toEqual(value2)
      })
      
      it('should handle complex nested objects', async () => {
        const key = 'complex'
        const value: TestData = {
          id: 1,
          name: 'Complex',
          metadata: {
            created: new Date('2024-01-01'),
            tags: ['tag1', 'tag2', 'tag3']
          }
        }
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toEqual(value)
        expect(retrieved?.metadata?.tags).toHaveLength(3)
      })
      
      it('should reject invalid keys', async () => {
        await expect(storage.set('', { id: 1, name: 'test' }))
          .rejects.toThrow(StorageError)
        
        await expect(storage.set(null as any, { id: 1, name: 'test' }))
          .rejects.toThrow(StorageError)
      })
      
      it('should handle special characters in keys', async () => {
        const key = "key-with-'quotes\"-and-special!@#$%^&*()"
        const value: TestData = { id: 1, name: 'Special' }
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toEqual(value)
      })
    })
    
    describe('get()', () => {
      it('should retrieve stored value', async () => {
        const key = 'test-key'
        const value: TestData = { id: 1, name: 'Test' }
        
        await storage.set(key, value)
        const retrieved = await storage.get(key)
        
        expect(retrieved).toEqual(value)
      })
      
      it('should return undefined for non-existent key', async () => {
        const retrieved = await storage.get('non-existent')
        expect(retrieved).toBeUndefined()
      })
      
      it('should handle null values correctly', async () => {
        await storage.set('null-key', null as any)
        const retrieved = await storage.get('null-key')
        expect(retrieved).toBeNull()
      })
      
      it('should maintain type safety', async () => {
        const typed = new DuckDBStorageAdapter<{ count: number }>({
          type: 'duckdb',
          database: ':memory:'
        })
        
        await typed.set('counter', { count: 42 })
        const value = await typed.get('counter')
        
        expect(value?.count).toBe(42)
        await typed.close()
      })
    })
    
    describe('delete()', () => {
      it('should delete existing key', async () => {
        const key = 'delete-me'
        await storage.set(key, { id: 1, name: 'Delete' })
        
        const deleted = await storage.delete(key)
        expect(deleted).toBe(true)
        
        const retrieved = await storage.get(key)
        expect(retrieved).toBeUndefined()
      })
      
      it('should return false for non-existent key', async () => {
        const deleted = await storage.delete('non-existent')
        expect(deleted).toBe(false)
      })
      
      it('should handle multiple deletes', async () => {
        const key = 'multi-delete'
        await storage.set(key, { id: 1, name: 'Multi' })
        
        const first = await storage.delete(key)
        expect(first).toBe(true)
        
        const second = await storage.delete(key)
        expect(second).toBe(false)
      })
    })
    
    describe('has()', () => {
      it('should return true for existing key', async () => {
        await storage.set('exists', { id: 1, name: 'Exists' })
        const exists = await storage.has('exists')
        expect(exists).toBe(true)
      })
      
      it('should return false for non-existent key', async () => {
        const exists = await storage.has('not-exists')
        expect(exists).toBe(false)
      })
      
      it('should work after delete', async () => {
        const key = 'has-delete'
        await storage.set(key, { id: 1, name: 'Has' })
        expect(await storage.has(key)).toBe(true)
        
        await storage.delete(key)
        expect(await storage.has(key)).toBe(false)
      })
    })
    
    describe('clear()', () => {
      it('should remove all entries', async () => {
        await storage.set('key1', { id: 1, name: 'One' })
        await storage.set('key2', { id: 2, name: 'Two' })
        await storage.set('key3', { id: 3, name: 'Three' })
        
        expect(await storage.size()).toBe(3)
        
        await storage.clear()
        expect(await storage.size()).toBe(0)
        
        expect(await storage.get('key1')).toBeUndefined()
        expect(await storage.get('key2')).toBeUndefined()
        expect(await storage.get('key3')).toBeUndefined()
      })
      
      it('should work on empty storage', async () => {
        await storage.clear()
        expect(await storage.size()).toBe(0)
        
        await storage.clear() // Should not throw
        expect(await storage.size()).toBe(0)
      })
    })
    
    describe('size()', () => {
      it('should return correct count', async () => {
        expect(await storage.size()).toBe(0)
        
        await storage.set('key1', { id: 1, name: 'One' })
        expect(await storage.size()).toBe(1)
        
        await storage.set('key2', { id: 2, name: 'Two' })
        expect(await storage.size()).toBe(2)
        
        await storage.delete('key1')
        expect(await storage.size()).toBe(1)
        
        await storage.clear()
        expect(await storage.size()).toBe(0)
      })
      
      it('should not count overwrites', async () => {
        await storage.set('key', { id: 1, name: 'First' })
        expect(await storage.size()).toBe(1)
        
        await storage.set('key', { id: 2, name: 'Second' })
        expect(await storage.size()).toBe(1)
      })
    })
  })
  
  describe('Iterator Operations', () => {
    beforeEach(async () => {
      storage = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: ':memory:'
      })
      
      // Add test data
      await storage.set('key1', { id: 1, name: 'One' })
      await storage.set('key2', { id: 2, name: 'Two' })
      await storage.set('key3', { id: 3, name: 'Three' })
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
        await storage.close()
      }
    })
    
    describe('keys()', () => {
      it('should iterate over all keys', async () => {
        const keys: string[] = []
        for await (const key of storage.keys()) {
          keys.push(key)
        }
        
        expect(keys).toHaveLength(3)
        expect(keys).toContain('key1')
        expect(keys).toContain('key2')
        expect(keys).toContain('key3')
      })
      
      it('should handle empty storage', async () => {
        await storage.clear()
        
        const keys: string[] = []
        for await (const key of storage.keys()) {
          keys.push(key)
        }
        
        expect(keys).toHaveLength(0)
      })
    })
    
    describe('values()', () => {
      it('should iterate over all values', async () => {
        const values: TestData[] = []
        for await (const value of storage.values()) {
          values.push(value)
        }
        
        expect(values).toHaveLength(3)
        expect(values.some(v => v.name === 'One')).toBe(true)
        expect(values.some(v => v.name === 'Two')).toBe(true)
        expect(values.some(v => v.name === 'Three')).toBe(true)
      })
    })
    
    describe('entries()', () => {
      it('should iterate over all entries', async () => {
        const entries: [string, TestData][] = []
        for await (const entry of storage.entries()) {
          entries.push(entry)
        }
        
        expect(entries).toHaveLength(3)
        
        const map = new Map(entries)
        expect(map.get('key1')?.name).toBe('One')
        expect(map.get('key2')?.name).toBe('Two')
        expect(map.get('key3')?.name).toBe('Three')
      })
    })
  })
  
  describe('Batch Operations', () => {
    beforeEach(async () => {
      storage = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: ':memory:'
      })
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
        await storage.close()
      }
    })
    
    describe('getMany()', () => {
      it('should retrieve multiple values', async () => {
        await storage.set('key1', { id: 1, name: 'One' })
        await storage.set('key2', { id: 2, name: 'Two' })
        await storage.set('key3', { id: 3, name: 'Three' })
        
        const result = await storage.getMany(['key1', 'key3'])
        
        expect(result.size).toBe(2)
        expect(result.get('key1')?.name).toBe('One')
        expect(result.get('key3')?.name).toBe('Three')
      })
      
      it('should handle non-existent keys', async () => {
        await storage.set('exists', { id: 1, name: 'Exists' })
        
        const result = await storage.getMany(['exists', 'not-exists'])
        
        expect(result.size).toBe(1)
        expect(result.has('exists')).toBe(true)
        expect(result.has('not-exists')).toBe(false)
      })
      
      it('should handle empty array', async () => {
        const result = await storage.getMany([])
        expect(result.size).toBe(0)
      })
    })
    
    describe('setMany()', () => {
      it('should store multiple values', async () => {
        const entries = new Map<string, TestData>([
          ['key1', { id: 1, name: 'One' }],
          ['key2', { id: 2, name: 'Two' }],
          ['key3', { id: 3, name: 'Three' }]
        ])
        
        await storage.setMany(entries)
        
        expect(await storage.size()).toBe(3)
        expect(await storage.get('key1')).toEqual({ id: 1, name: 'One' })
        expect(await storage.get('key2')).toEqual({ id: 2, name: 'Two' })
        expect(await storage.get('key3')).toEqual({ id: 3, name: 'Three' })
      })
      
      it('should overwrite existing values', async () => {
        await storage.set('key1', { id: 0, name: 'Old' })
        
        const entries = new Map<string, TestData>([
          ['key1', { id: 1, name: 'New' }],
          ['key2', { id: 2, name: 'Two' }]
        ])
        
        await storage.setMany(entries)
        
        expect(await storage.get('key1')).toEqual({ id: 1, name: 'New' })
      })
      
      it('should handle empty map', async () => {
        await storage.setMany(new Map())
        expect(await storage.size()).toBe(0)
      })
    })
    
    describe('deleteMany()', () => {
      it('should delete multiple keys', async () => {
        await storage.set('key1', { id: 1, name: 'One' })
        await storage.set('key2', { id: 2, name: 'Two' })
        await storage.set('key3', { id: 3, name: 'Three' })
        
        const deleted = await storage.deleteMany(['key1', 'key3'])
        
        expect(deleted).toBe(2)
        expect(await storage.has('key1')).toBe(false)
        expect(await storage.has('key2')).toBe(true)
        expect(await storage.has('key3')).toBe(false)
      })
      
      it('should handle non-existent keys', async () => {
        await storage.set('exists', { id: 1, name: 'Exists' })
        
        const deleted = await storage.deleteMany(['exists', 'not-exists'])
        
        expect(deleted).toBe(1)
        expect(await storage.has('exists')).toBe(false)
      })
      
      it('should handle empty array', async () => {
        const deleted = await storage.deleteMany([])
        expect(deleted).toBe(0)
      })
    })
    
    describe('batch()', () => {
      it('should execute mixed operations atomically', async () => {
        await storage.set('existing', { id: 0, name: 'Existing' })
        
        const operations = [
          { type: 'set' as const, key: 'new1', value: { id: 1, name: 'New1' } },
          { type: 'set' as const, key: 'new2', value: { id: 2, name: 'New2' } },
          { type: 'delete' as const, key: 'existing' },
          { type: 'set' as const, key: 'new3', value: { id: 3, name: 'New3' } }
        ]
        
        const result = await storage.batch(operations)
        
        expect(result.success).toBe(true)
        expect(result.operations).toBe(4)
        
        expect(await storage.has('existing')).toBe(false)
        expect(await storage.get('new1')).toEqual({ id: 1, name: 'New1' })
        expect(await storage.get('new2')).toEqual({ id: 2, name: 'New2' })
        expect(await storage.get('new3')).toEqual({ id: 3, name: 'New3' })
      })
      
      it('should rollback on error', async () => {
        await storage.set('key1', { id: 1, name: 'Original' })
        
        const operations = [
          { type: 'set' as const, key: 'key2', value: { id: 2, name: 'New' } },
          { type: 'set' as const, key: '', value: { id: 3, name: 'Invalid' } }, // Invalid key
          { type: 'set' as const, key: 'key3', value: { id: 4, name: 'Never' } }
        ]
        
        const result = await storage.batch(operations)
        
        expect(result.success).toBe(false)
        expect(result.errors).toBeDefined()
        
        // Original state should be preserved
        expect(await storage.get('key1')).toEqual({ id: 1, name: 'Original' })
        expect(await storage.has('key2')).toBe(false)
        expect(await storage.has('key3')).toBe(false)
      })
      
      it('should handle clear operation', async () => {
        await storage.set('key1', { id: 1, name: 'One' })
        await storage.set('key2', { id: 2, name: 'Two' })
        
        const operations = [
          { type: 'clear' as const },
          { type: 'set' as const, key: 'new', value: { id: 3, name: 'New' } }
        ]
        
        const result = await storage.batch(operations)
        
        expect(result.success).toBe(true)
        expect(await storage.size()).toBe(1)
        expect(await storage.has('key1')).toBe(false)
        expect(await storage.has('key2')).toBe(false)
        expect(await storage.has('new')).toBe(true)
      })
    })
  })
  
  describe('DuckDB-Specific Features', () => {
    beforeEach(async () => {
      storage = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: ':memory:',
        enableParquet: true
      })
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
        await storage.close()
      }
    })
    
    describe('SQL Query Support', () => {
      it('should execute raw SQL queries', async () => {
        await storage.set('item1', { id: 1, name: 'First' })
        await storage.set('item2', { id: 2, name: 'Second' })
        await storage.set('item3', { id: 3, name: 'Third' })
        
        const results = await storage.query<{ key: string, value: any }>(
          'SELECT * FROM storage WHERE key LIKE ?',
          ['item%']
        )
        
        expect(results).toHaveLength(3)
      })
      
      it('should support aggregation queries', async () => {
        for (let i = 1; i <= 10; i++) {
          await storage.set(`item${i}`, { id: i, name: `Item ${i}` })
        }
        
        const result = await storage.query<{ count: number }>(
          'SELECT COUNT(*) as count FROM storage'
        )
        
        expect(result[0].count).toBe(10)
      })
      
      it('should handle parameterized queries safely', async () => {
        await storage.set('test-key', { id: 1, name: 'Test' })
        
        // This should be safe from SQL injection
        const maliciousInput = "'; DROP TABLE storage; --"
        const results = await storage.query(
          'SELECT * FROM storage WHERE key = ?',
          [maliciousInput]
        )
        
        expect(results).toHaveLength(0)
        // Table should still exist
        expect(await storage.size()).toBe(1)
      })
    })
    
    describe('Parquet Support', () => {
      const parquetPath = path.join(TEST_DB_DIR, 'test.parquet')
      
      afterEach(async () => {
        try {
          await fs.unlink(parquetPath)
        } catch (e) {
          // File doesn't exist, that's fine
        }
      })
      
      it('should export data to Parquet file', async () => {
        await storage.set('export1', { id: 1, name: 'Export One' })
        await storage.set('export2', { id: 2, name: 'Export Two' })
        
        await storage.exportParquet(parquetPath)
        
        const stats = await fs.stat(parquetPath)
        expect(stats.isFile()).toBe(true)
      })
      
      it('should import data from Parquet file', async () => {
        // First export some data
        await storage.set('import1', { id: 1, name: 'Import One' })
        await storage.set('import2', { id: 2, name: 'Import Two' })
        await storage.exportParquet(parquetPath)
        
        // Clear and import
        await storage.clear()
        expect(await storage.size()).toBe(0)
        
        await storage.importParquet(parquetPath)
        
        expect(await storage.size()).toBe(2)
        expect(await storage.get('import1')).toEqual({ id: 1, name: 'Import One' })
        expect(await storage.get('import2')).toEqual({ id: 2, name: 'Import Two' })
      })
      
      it('should query Parquet files directly', async () => {
        // Create a parquet file
        await storage.set('query1', { id: 1, name: 'Query One' })
        await storage.set('query2', { id: 2, name: 'Query Two' })
        await storage.exportParquet(parquetPath)
        
        // Query the file directly without importing
        const results = await storage.queryParquet(
          parquetPath,
          'SELECT * FROM read_parquet(?) WHERE key LIKE ?',
          ['query%']
        )
        
        expect(results).toHaveLength(2)
      })
    })
    
    describe('Transaction Support', () => {
      it('should execute operations in transaction', async () => {
        await storage.transaction(async () => {
          await storage.set('tx1', { id: 1, name: 'Tx One' })
          await storage.set('tx2', { id: 2, name: 'Tx Two' })
          await storage.set('tx3', { id: 3, name: 'Tx Three' })
        })
        
        expect(await storage.size()).toBe(3)
      })
      
      it('should rollback transaction on error', async () => {
        await storage.set('before', { id: 0, name: 'Before' })
        
        try {
          await storage.transaction(async () => {
            await storage.set('tx1', { id: 1, name: 'Tx One' })
            await storage.set('tx2', { id: 2, name: 'Tx Two' })
            throw new Error('Rollback test')
          })
        } catch (e) {
          // Expected error
        }
        
        // Only original data should exist
        expect(await storage.size()).toBe(1)
        expect(await storage.has('before')).toBe(true)
        expect(await storage.has('tx1')).toBe(false)
        expect(await storage.has('tx2')).toBe(false)
      })
      
      it('should support nested transactions', async () => {
        await storage.transaction(async () => {
          await storage.set('outer1', { id: 1, name: 'Outer One' })
          
          await storage.transaction(async () => {
            await storage.set('inner1', { id: 2, name: 'Inner One' })
            await storage.set('inner2', { id: 3, name: 'Inner Two' })
          })
          
          await storage.set('outer2', { id: 4, name: 'Outer Two' })
        })
        
        expect(await storage.size()).toBe(4)
      })
    })
  })
  
  describe('Performance Characteristics', () => {
    beforeEach(async () => {
      storage = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: ':memory:',
        options: {
          threads: '4'
        }
      })
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
        await storage.close()
      }
    })
    
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now()
      const count = 10000
      
      // Bulk insert
      const entries = new Map<string, TestData>()
      for (let i = 0; i < count; i++) {
        entries.set(`key${i}`, { id: i, name: `Item ${i}` })
      }
      
      await storage.setMany(entries)
      const insertTime = Date.now() - startTime
      
      expect(await storage.size()).toBe(count)
      expect(insertTime).toBeLessThan(10000) // Should complete in < 10 seconds
      
      // Test query performance
      const queryStart = Date.now()
      const results = await storage.query(
        'SELECT COUNT(*) as count FROM storage'
      )
      const queryTime = Date.now() - queryStart
      
      expect(results[0].count).toBe(count)
      expect(queryTime).toBeLessThan(100) // Aggregation should be fast
    })
    
    it('should use columnar storage efficiently', async () => {
      // Insert data with repeated patterns (good for columnar compression)
      const entries = new Map<string, TestData>()
      for (let i = 0; i < 1000; i++) {
        entries.set(`key${i}`, {
          id: i % 10, // Repeated values
          name: `Category ${i % 5}` // Repeated strings
        })
      }
      
      await storage.setMany(entries)
      
      // Columnar storage should handle aggregations efficiently
      const results = await storage.query<{ category: string, count: number }>(
        `SELECT JSON_EXTRACT(value, '$.name') as category, COUNT(*) as count 
         FROM storage 
         GROUP BY category`
      )
      
      expect(results).toHaveLength(5) // 5 unique categories
      expect(results.reduce((sum, r) => sum + r.count, 0)).toBe(1000)
    })
  })
  
  describe('Error Handling', () => {
    beforeEach(async () => {
      storage = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: ':memory:'
      })
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
        await storage.close()
      }
    })
    
    it('should handle connection errors gracefully', async () => {
      // Close connection
      await storage.close()
      
      // Operations should reconnect automatically
      const result = await storage.get('test')
      expect(result).toBeUndefined() // Key doesn't exist, but connection should work
      
      // Verify the adapter can still be used normally after reconnection
      await storage.set('reconnect-test', { id: 1, name: 'Reconnected' })
      const retrieved = await storage.get('reconnect-test')
      expect(retrieved).toEqual({ id: 1, name: 'Reconnected' })
    })
    
    it('should handle type conversion errors', async () => {
      // Try to store a value that can't be serialized
      const circular: any = { id: 1, name: 'Circular' }
      circular.self = circular
      
      await expect(storage.set('circular', circular)).rejects.toThrow()
    })
    
    it('should provide meaningful error messages', async () => {
      try {
        await storage.set('', { id: 1, name: 'Invalid' })
      } catch (error: any) {
        expect(error).toBeInstanceOf(StorageError)
        expect(error.code).toBe(StorageErrorCode.INVALID_KEY)
        expect(error.message).toContain('key')
      }
    })
  })
  
  describe('Resource Management', () => {
    it('should clean up connections properly', async () => {
      const storage1 = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: TEST_DB_PATH
      })
      
      await storage1.set('key1', { id: 1, name: 'One' })
      await storage1.close()
      
      // Should be able to create new connection to same database
      const storage2 = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: TEST_DB_PATH
      })
      
      const value = await storage2.get('key1')
      expect(value).toEqual({ id: 1, name: 'One' })
      
      await storage2.close()
    })
    
    it('should handle multiple connections with pooling', async () => {
      const config: DuckDBStorageConfig = {
        type: 'duckdb',
        database: ':memory:',
        poolSize: 3
      }
      
      const storage = new DuckDBStorageAdapter<TestData>(config)
      
      // Simulate concurrent operations
      await Promise.all([
        storage.set('c1', { id: 1, name: 'Concurrent 1' }),
        storage.set('c2', { id: 2, name: 'Concurrent 2' }),
        storage.set('c3', { id: 3, name: 'Concurrent 3' })
      ])
      
      expect(await storage.size()).toBe(3)
      await storage.close()
    })
  })
  
  describe('Type Safety', () => {
    it('should maintain type safety for specific types', async () => {
      interface User {
        id: string
        email: string
        age: number
        active: boolean
      }
      
      const userStorage = new DuckDBStorageAdapter<User>({
        type: 'duckdb',
        database: ':memory:'
      })
      
      const user: User = {
        id: 'user1',
        email: 'test@example.com',
        age: 30,
        active: true
      }
      
      await userStorage.set('user1', user)
      const retrieved = await userStorage.get('user1')
      
      expect(retrieved?.id).toBe('user1')
      expect(retrieved?.email).toBe('test@example.com')
      expect(retrieved?.age).toBe(30)
      expect(retrieved?.active).toBe(true)
      
      await userStorage.close()
    })
    
    it('should handle Date types correctly', async () => {
      interface Event {
        id: number
        name: string
        timestamp: Date
      }
      
      const eventStorage = new DuckDBStorageAdapter<Event>({
        type: 'duckdb',
        database: ':memory:'
      })
      
      const event: Event = {
        id: 1,
        name: 'Test Event',
        timestamp: new Date('2024-01-01T12:00:00Z')
      }
      
      await eventStorage.set('event1', event)
      const retrieved = await eventStorage.get('event1')
      
      expect(retrieved?.timestamp).toBeInstanceOf(Date)
      expect(retrieved?.timestamp.toISOString()).toBe('2024-01-01T12:00:00.000Z')
      
      await eventStorage.close()
    })
  })
})

// Add interface for DuckDBStorageAdapter to have close method
declare module '../../src/storage/adapters/DuckDBStorageAdapter' {
  interface DuckDBStorageAdapter<T> {
    close(): Promise<void>
    query<R = any>(sql: string, params?: any[]): Promise<R[]>
    exportParquet(filePath: string): Promise<void>
    importParquet(filePath: string): Promise<void>
    queryParquet<R = any>(filePath: string, sql: string, params?: any[]): Promise<R[]>
    transaction<R>(fn: () => Promise<R>): Promise<R>
  }
}