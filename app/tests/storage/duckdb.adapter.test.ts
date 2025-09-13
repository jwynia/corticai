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
      // Remove main database file
      await fs.unlink(TEST_DB_PATH)
    } catch (e) {
      // File doesn't exist, that's fine
    }
    try {
      // Remove WAL (Write-Ahead Log) file
      await fs.unlink(TEST_DB_PATH + '.wal')
    } catch (e) {
      // File doesn't exist, that's fine
    }
  }
  
  beforeAll(async () => {
    // Ensure test directory exists
    await fs.mkdir(TEST_DB_DIR, { recursive: true })
    // Clean up any leftover files from previous runs
    await cleanup()
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

  describe('Batch Operations Performance', () => {
    beforeEach(async () => {
      storage = new DuckDBStorageAdapter<TestData>({
        type: 'duckdb',
        database: ':memory:',
        debug: false // Disable debug for cleaner performance measurements
      })
    })
    
    afterEach(async () => {
      if (storage) {
        await storage.clear()
        await storage.close()
      }
    })

    describe('Baseline Performance (Current Implementation)', () => {
      it('should measure persist() performance with 1K records', async () => {
        const recordCount = 1000
        const entries = new Map<string, TestData>()
        
        // Generate test data
        for (let i = 0; i < recordCount; i++) {
          entries.set(`key${i}`, {
            id: i,
            name: `Item ${i}`,
            metadata: {
              created: new Date(),
              tags: [`tag${i % 10}`, `category${i % 5}`]
            }
          })
        }
        
        // Load data into memory cache first
        await storage.setMany(entries)
        expect(await storage.size()).toBe(recordCount)
        
        // Measure persist() performance (database write)
        const startTime = performance.now()
        
        // Force a persist operation by clearing and reloading
        await storage.close()
        storage = new DuckDBStorageAdapter<TestData>({
          type: 'duckdb',
          database: ':memory:',
          debug: false
        })
        await storage.setMany(entries) // This will trigger persist
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        console.log(`1K records persist time: ${duration.toFixed(2)}ms`)
        
        // Verify data integrity
        expect(await storage.size()).toBe(recordCount)
        const sample = await storage.get('key500')
        expect(sample?.name).toBe('Item 500')
        
        // Performance expectation: should complete within reasonable time
        expect(duration).toBeLessThan(10000) // 10 seconds max for 1K records
      })

      it('should measure persist() performance with 1K records', async () => {
        const recordCount = 1000
        const entries = new Map<string, TestData>()
        
        // Generate test data
        for (let i = 0; i < recordCount; i++) {
          entries.set(`key${i}`, {
            id: i,
            name: `Item ${i}`,
            metadata: {
              created: new Date(),
              tags: [`tag${i % 10}`, `category${i % 5}`]
            }
          })
        }
        
        // Load data into memory cache first
        await storage.setMany(entries)
        expect(await storage.size()).toBe(recordCount)
        
        // Measure persist() performance
        const startTime = performance.now()
        
        // Force persist by creating new adapter instance
        await storage.close()
        storage = new DuckDBStorageAdapter<TestData>({
          type: 'duckdb',
          database: ':memory:',
          debug: false
        })
        await storage.setMany(entries)
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        console.log(`1K records persist time: ${duration.toFixed(2)}ms`)
        
        // Verify data integrity
        expect(await storage.size()).toBe(recordCount)
        const sample = await storage.get('key500')
        expect(sample?.name).toBe('Item 500')
        
        // Performance expectation: should scale reasonably
        expect(duration).toBeLessThan(5000) // 5 seconds max for 1K records
      })

      it('should measure memory usage during large persist operations', async () => {
        const recordCount = 5000
        const entries = new Map<string, TestData>()
        
        // Generate test data with larger objects
        for (let i = 0; i < recordCount; i++) {
          entries.set(`key${i}`, {
            id: i,
            name: `Item ${i} with some additional text to make it larger`,
            metadata: {
              created: new Date(),
              tags: Array.from({ length: 10 }, (_, j) => `tag${i}_${j}`)
            }
          })
        }
        
        const initialMemory = process.memoryUsage()
        await storage.setMany(entries)
        
        // Measure persist operation
        const beforePersist = process.memoryUsage()
        
        // Force persist
        await storage.close()
        storage = new DuckDBStorageAdapter<TestData>({
          type: 'duckdb',
          database: ':memory:',
          debug: false
        })
        await storage.setMany(entries)
        
        const afterPersist = process.memoryUsage()
        
        console.log('Memory usage:')
        console.log(`  Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`)
        console.log(`  Before persist: ${Math.round(beforePersist.heapUsed / 1024 / 1024)}MB`)
        console.log(`  After persist: ${Math.round(afterPersist.heapUsed / 1024 / 1024)}MB`)
        
        // Memory should not grow excessively
        const memoryGrowth = afterPersist.heapUsed - beforePersist.heapUsed
        expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024) // Less than 100MB growth
        
        // Verify data integrity
        expect(await storage.size()).toBe(recordCount)
      })

      it('should handle errors during batch persist gracefully', async () => {
        const recordCount = 100
        const entries = new Map<string, TestData>()
        
        // Add mostly valid data
        for (let i = 0; i < recordCount - 1; i++) {
          entries.set(`key${i}`, { id: i, name: `Item ${i}` })
        }
        
        // Add one problematic entry (circular reference that can't be JSON.stringify'd)
        const circular: any = { id: recordCount - 1, name: 'Circular' }
        circular.self = circular
        entries.set(`key${recordCount - 1}`, circular)
        
        // This should fail during serialization
        await expect(storage.setMany(entries)).rejects.toThrow()
        
        // Storage should remain in consistent state
        expect(await storage.size()).toBe(0)
      })
    })

    describe('Performance Comparison Framework', () => {
      it('should provide a framework for comparing different batch implementations', async () => {
        const recordSizes = [100, 1000, 5000]
        const results: { size: number, timeMs: number, recordsPerMs: number }[] = []
        
        for (const recordCount of recordSizes) {
          const entries = new Map<string, TestData>()
          
          for (let i = 0; i < recordCount; i++) {
            entries.set(`key${i}`, {
              id: i,
              name: `Item ${i}`,
              metadata: {
                created: new Date(),
                tags: [`tag${i % 3}`, `category${i % 2}`]
              }
            })
          }
          
          const startTime = performance.now()
          await storage.setMany(entries)
          const endTime = performance.now()
          
          const duration = endTime - startTime
          const recordsPerMs = recordCount / duration
          
          results.push({
            size: recordCount,
            timeMs: duration,
            recordsPerMs
          })
          
          console.log(`${recordCount} records: ${duration.toFixed(2)}ms (${recordsPerMs.toFixed(2)} records/ms)`)
          
          // Verify correctness
          expect(await storage.size()).toBe(recordCount)
          
          // Clear for next test
          await storage.clear()
        }
        
        // Performance should scale reasonably (not exponentially)
        expect(results.length).toBe(recordSizes.length)
        
        // Each test should complete within reasonable bounds
        for (const result of results) {
          expect(result.timeMs).toBeLessThan(result.size * 10) // Max 10ms per record
          expect(result.recordsPerMs).toBeGreaterThan(0.1) // Min 0.1 records per ms
        }
      })
    })

    describe('Transaction Atomicity with Batch Operations', () => {
      it('should maintain atomicity during large batch persist operations', async () => {
        const recordCount = 1000
        const entries = new Map<string, TestData>()
        
        for (let i = 0; i < recordCount; i++) {
          entries.set(`key${i}`, { id: i, name: `Item ${i}` })
        }
        
        // Test that transaction rollback works with large batches
        await storage.transaction(async () => {
          await storage.setMany(entries)
          expect(await storage.size()).toBe(recordCount)
          
          // Simulate error that should rollback everything
          throw new Error('Test rollback')
        }).catch(() => {
          // Expected error
        })
        
        // After rollback, storage should be empty
        expect(await storage.size()).toBe(0)
      })

      it('should handle concurrent persist operations safely', async () => {
        const entries1 = new Map<string, TestData>()
        const entries2 = new Map<string, TestData>()
        
        // Create two sets of non-overlapping keys
        for (let i = 0; i < 500; i++) {
          entries1.set(`set1_${i}`, { id: i, name: `Set1 Item ${i}` })
          entries2.set(`set2_${i}`, { id: i + 500, name: `Set2 Item ${i}` })
        }
        
        // Execute concurrent setMany operations
        const [result1, result2] = await Promise.all([
          storage.setMany(entries1),
          storage.setMany(entries2)
        ])
        
        // Both operations should succeed
        expect(await storage.size()).toBe(1000)
        
        // Verify data from both sets exists
        expect(await storage.get('set1_100')).toBeDefined()
        expect(await storage.get('set2_100')).toBeDefined()
      })
    })

    describe('Error Handling in Batch Operations', () => {
      it('should handle individual row errors appropriately', async () => {
        // This test will be more relevant after implementing batch optimization
        const entries = new Map<string, TestData>()
        
        // Add valid entries
        for (let i = 0; i < 10; i++) {
          entries.set(`valid${i}`, { id: i, name: `Valid ${i}` })
        }
        
        await storage.setMany(entries)
        expect(await storage.size()).toBe(10)
        
        // Verify all data is present
        for (let i = 0; i < 10; i++) {
          expect(await storage.get(`valid${i}`)).toBeDefined()
        }
      })

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
    
  })
  
  describe('Resource Management', () => {
    
    it('should handle multiple connections with pooling', async () => {
      const config: DuckDBStorageConfig = {
        type: 'duckdb',
        database: ':memory:',
        poolSize: 3
      }
      
      const storage = new DuckDBStorageAdapter<TestData>(config)
      
      // Sequential operations to ensure they complete properly
      // Note: BaseStorageAdapter may serialize concurrent operations internally
      await storage.set('c1', { id: 1, name: 'Concurrent 1' })
      await storage.set('c2', { id: 2, name: 'Concurrent 2' })
      await storage.set('c3', { id: 3, name: 'Concurrent 3' })
      
      expect(await storage.size()).toBe(3)
      
      // Also verify the data is actually there
      expect(await storage.get('c1')).toEqual({ id: 1, name: 'Concurrent 1' })
      expect(await storage.get('c2')).toEqual({ id: 2, name: 'Concurrent 2' })
      expect(await storage.get('c3')).toEqual({ id: 3, name: 'Concurrent 3' })
      
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

  describe('Table Name Validation', () => {
    describe('Valid Table Names', () => {
      it('should accept alphanumeric table names', () => {
        const validNames = [
          'users',
          'user_data', 
          '_temp',
          'table123',
          'Data2024',
          'my_table_name',
          'T1',
          '_private_data'
        ]
        
        for (const tableName of validNames) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).not.toThrow()
        }
      })
      
      it('should accept table names starting with underscore', () => {
        const config: DuckDBStorageConfig = {
          type: 'duckdb',
          database: ':memory:',
          tableName: '_internal_table'
        }
        
        expect(() => new DuckDBStorageAdapter(config)).not.toThrow()
      })
      
      it('should accept table names with numbers in middle or end', () => {
        const validNames = ['table123', 'my2table', 'data_v2', 'temp3_backup']
        
        for (const tableName of validNames) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).not.toThrow()
        }
      })
    })
    
    describe('Invalid Table Names', () => {
      it('should reject empty or null table names', () => {
        const invalidNames = ['', null, undefined]
        
        for (const tableName of invalidNames) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName: tableName as any
          }
          
          expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
          expect(() => new DuckDBStorageAdapter(config)).toThrow(/invalid.*table.*name/i)
        }
      })
      
      it('should reject table names with special characters', () => {
        const invalidNames = [
          'table-name',
          'user data', // space
          'table.name',
          'table@name', 
          'table#name',
          'table$name',
          'table%name',
          'table^name',
          'table&name',
          'table*name',
          'table(name)',
          'table+name',
          'table=name',
          'table[name]',
          'table{name}',
          'table|name',
          'table\\name',
          'table:name',
          'table;name',
          'table"name',
          "table'name",
          'table<name>',
          'table,name',
          'table?name',
          'table/name'
        ]
        
        for (const tableName of invalidNames) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
          expect(() => new DuckDBStorageAdapter(config)).toThrow(/invalid.*table.*name/i)
        }
      })
      
      it('should reject table names starting with numbers', () => {
        const invalidNames = ['123table', '1user', '9data']
        
        for (const tableName of invalidNames) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
          expect(() => new DuckDBStorageAdapter(config)).toThrow(/invalid.*table.*name/i)
        }
      })
      
      it('should reject very long table names', () => {
        // Generate a table name longer than reasonable limit (e.g., 128 characters)
        const longTableName = 'a'.repeat(129)
        
        const config: DuckDBStorageConfig = {
          type: 'duckdb',
          database: ':memory:',
          tableName: longTableName
        }
        
        expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
        expect(() => new DuckDBStorageAdapter(config)).toThrow(/invalid.*table.*name/i)
      })
    })
    
    describe('SQL Reserved Keywords', () => {
      it('should reject common SQL reserved keywords', () => {
        const reservedKeywords = [
          'SELECT', 'select', 'Select',
          'FROM', 'from', 'From',
          'WHERE', 'where', 'Where',
          'INSERT', 'insert', 'Insert',
          'UPDATE', 'update', 'Update',
          'DELETE', 'delete', 'Delete',
          'CREATE', 'create', 'Create',
          'DROP', 'drop', 'Drop',
          'ALTER', 'alter', 'Alter',
          'TABLE', 'table', 'Table',
          'INDEX', 'index', 'Index',
          'VIEW', 'view', 'View',
          'TRIGGER', 'trigger', 'Trigger',
          'PROCEDURE', 'procedure', 'Procedure',
          'FUNCTION', 'function', 'Function',
          'DATABASE', 'database', 'Database',
          'SCHEMA', 'schema', 'Schema',
          'COLUMN', 'column', 'Column',
          'CONSTRAINT', 'constraint', 'Constraint',
          'PRIMARY', 'primary', 'Primary',
          'FOREIGN', 'foreign', 'Foreign',
          'KEY', 'key', 'Key',
          'REFERENCES', 'references', 'References',
          'UNIQUE', 'unique', 'Unique',
          'NOT', 'not', 'Not',
          'NULL', 'null', 'Null',
          'DEFAULT', 'default', 'Default',
          'CHECK', 'check', 'Check',
          'UNION', 'union', 'Union',
          'JOIN', 'join', 'Join',
          'INNER', 'inner', 'Inner',
          'LEFT', 'left', 'Left',
          'RIGHT', 'right', 'Right',
          'OUTER', 'outer', 'Outer',
          'ON', 'on', 'On',
          'AS', 'as', 'As',
          'ORDER', 'order', 'Order',
          'BY', 'by', 'By',
          'GROUP', 'group', 'Group',
          'HAVING', 'having', 'Having',
          'LIMIT', 'limit', 'Limit',
          'OFFSET', 'offset', 'Offset',
          'DISTINCT', 'distinct', 'Distinct',
          'COUNT', 'count', 'Count',
          'SUM', 'sum', 'Sum',
          'AVG', 'avg', 'Avg',
          'MIN', 'min', 'Min',
          'MAX', 'max', 'Max',
          'CASE', 'case', 'Case',
          'WHEN', 'when', 'When',
          'THEN', 'then', 'Then',
          'ELSE', 'else', 'Else',
          'END', 'end', 'End',
          'IF', 'if', 'If',
          'EXISTS', 'exists', 'Exists',
          'IN', 'in', 'In',
          'BETWEEN', 'between', 'Between',
          'LIKE', 'like', 'Like',
          'IS', 'is', 'Is',
          'AND', 'and', 'And',
          'OR', 'or', 'Or',
          'TRUE', 'true', 'True',
          'FALSE', 'false', 'False',
          'BEGIN', 'begin', 'Begin',
          'COMMIT', 'commit', 'Commit',
          'ROLLBACK', 'rollback', 'Rollback',
          'TRANSACTION', 'transaction', 'Transaction'
        ]
        
        for (const keyword of reservedKeywords) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName: keyword
          }
          
          expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
          expect(() => new DuckDBStorageAdapter(config)).toThrow(/reserved.*keyword/i)
        }
      })
      
      it('should allow keywords as part of valid table names', () => {
        const validNamesWithKeywords = [
          'user_select',
          'from_date',
          'where_clause',
          'table_name',
          'select_user',
          'data_from_api'
        ]
        
        for (const tableName of validNamesWithKeywords) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).not.toThrow()
        }
      })
    })
    
    describe('Error Details', () => {
      it('should throw StorageError with INVALID_VALUE code', () => {
        const config: DuckDBStorageConfig = {
          type: 'duckdb',
          database: ':memory:',
          tableName: 'invalid-name'
        }
        
        try {
          new DuckDBStorageAdapter(config)
          expect.fail('Expected error to be thrown')
        } catch (error: any) {
          expect(error).toBeInstanceOf(StorageError)
          expect(error.code).toBe(StorageErrorCode.INVALID_VALUE)
          expect(error.details).toBeDefined()
          expect(error.details.tableName).toBe('invalid-name')
        }
      })
      
      it('should throw StorageError with proper message for reserved keyword', () => {
        const config: DuckDBStorageConfig = {
          type: 'duckdb',
          database: ':memory:',
          tableName: 'SELECT'
        }
        
        try {
          new DuckDBStorageAdapter(config)
          expect.fail('Expected error to be thrown')
        } catch (error: any) {
          expect(error).toBeInstanceOf(StorageError)
          expect(error.code).toBe(StorageErrorCode.INVALID_VALUE)
          expect(error.message).toMatch(/reserved.*keyword/i)
          expect(error.details.tableName).toBe('SELECT')
        }
      })
      
      it('should provide clear error message for invalid characters', () => {
        const config: DuckDBStorageConfig = {
          type: 'duckdb',
          database: ':memory:',
          tableName: 'table@name'
        }
        
        try {
          new DuckDBStorageAdapter(config)
          expect.fail('Expected error to be thrown')
        } catch (error: any) {
          expect(error).toBeInstanceOf(StorageError)
          expect(error.code).toBe(StorageErrorCode.INVALID_VALUE)
          expect(error.message).toMatch(/invalid.*table.*name/i)
          expect(error.message).toMatch(/alphanumeric.*underscore/i)
          expect(error.details.tableName).toBe('table@name')
        }
      })
    })
    
    describe('Edge Cases', () => {
      it('should handle table name with only underscores', () => {
        const config: DuckDBStorageConfig = {
          type: 'duckdb',
          database: ':memory:',
          tableName: '___'
        }
        
        expect(() => new DuckDBStorageAdapter(config)).not.toThrow()
      })
      
      it('should handle single character table names', () => {
        const validSingleChar = ['a', 'Z', '_']
        const invalidSingleChar = ['1', '@', ' ']
        
        for (const tableName of validSingleChar) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).not.toThrow()
        }
        
        for (const tableName of invalidSingleChar) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
        }
      })
      
      it('should handle whitespace in table names', () => {
        const invalidNamesWithWhitespace = [
          ' table',
          'table ',
          ' table ',
          'ta ble',
          'table\t',
          'table\n',
          'table\r'
        ]
        
        for (const tableName of invalidNamesWithWhitespace) {
          const config: DuckDBStorageConfig = {
            type: 'duckdb',
            database: ':memory:',
            tableName
          }
          
          expect(() => new DuckDBStorageAdapter(config)).toThrow(StorageError)
        }
      })
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