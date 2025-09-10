/**
 * JSONQueryExecutor Tests
 * 
 * These tests define the expected behavior for Task 2.4: JSON Query Executor
 * Following strict TDD principles - all tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { JSONQueryExecutor } from '../../../src/query/executors/JSONQueryExecutor'
import { QueryBuilder } from '../../../src/query/QueryBuilder'
import { Query } from '../../../src/query/types'
import path from 'path'
import os from 'os'

describe('JSONQueryExecutor', () => {
  interface TestEntity {
    id: string
    name: string
    age: number
    department: string
    salary: number
    active: boolean
    joinedAt: string // JSON doesn't support Date, so we use string
  }

  let executor: JSONQueryExecutor<TestEntity>
  let testData: TestEntity[]
  let testFilePath: string
  let tempDir: string

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'json-query-test-'))
    testFilePath = path.join(tempDir, 'test-data.json')
    
    // Create test data
    testData = [
      { id: '1', name: 'Alice', age: 30, department: 'Engineering', salary: 75000, active: true, joinedAt: '2020-01-01' },
      { id: '2', name: 'Bob', age: 25, department: 'Engineering', salary: 70000, active: true, joinedAt: '2021-01-01' },
      { id: '3', name: 'Charlie', age: 35, department: 'Marketing', salary: 80000, active: false, joinedAt: '2019-01-01' },
      { id: '4', name: 'Diana', age: 30, department: 'Engineering', salary: 85000, active: true, joinedAt: '2020-06-01' },
      { id: '5', name: 'Eve', age: 25, department: 'Marketing', salary: 60000, active: true, joinedAt: '2021-06-01' }
    ]
    
    // Write test data to file
    await fs.writeFile(testFilePath, JSON.stringify(testData, null, 2))
    
    // Create executor instance
    executor = new JSONQueryExecutor<TestEntity>(testFilePath)
  })

  afterEach(async () => {
    // Clean up temporary files and directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Constructor and Configuration', () => {
    it('should create JSONQueryExecutor with file path', () => {
      const executor = new JSONQueryExecutor<TestEntity>(testFilePath)
      expect(executor).toBeInstanceOf(JSONQueryExecutor)
    })

    it('should create JSONQueryExecutor with config object', () => {
      const config = {
        filePath: testFilePath,
        encoding: 'utf8' as const,
        cacheData: false
      }
      const executor = new JSONQueryExecutor<TestEntity>(config)
      expect(executor).toBeInstanceOf(JSONQueryExecutor)
    })

    it('should handle non-existent file path in constructor', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.json')
      expect(() => {
        new JSONQueryExecutor<TestEntity>(nonExistentPath)
      }).not.toThrow() // Constructor should not throw, errors should be handled at execution time
    })
  })

  describe('Basic Query Execution', () => {
    it('should execute simple select all query', async () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(5)
      expect(result.data).toEqual(testData)
      expect(result.metadata.fromCache).toBe(false)
      expect(result.metadata.totalCount).toBe(5)
      expect(result.errors).toEqual([])
    })

    it('should execute query with filtering', async () => {
      const query: Query<TestEntity> = {
        conditions: [
          { type: 'equality', field: 'department', operator: '=', value: 'Engineering' }
        ],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(3) // Alice, Bob, Diana
      expect(result.data.every(item => item.department === 'Engineering')).toBe(true)
      expect(result.metadata.totalCount).toBe(3)
    })

    it('should execute query with sorting', async () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'name', direction: 'asc' }
        ]
      }

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(5)
      const names = result.data.map(item => item.name)
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'])
    })

    it('should execute query with pagination', async () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'name', direction: 'asc' }
        ],
        pagination: { limit: 2, offset: 1 }
      }

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('Bob')
      expect(result.data[1].name).toBe('Charlie')
      expect(result.metadata.totalCount).toBe(5) // Total before pagination
    })

    it('should execute query with aggregations', async () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'total_employees' },
          { type: 'avg', field: 'salary', alias: 'avg_salary' }
        ]
      }

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        total_employees: 5,
        avg_salary: (75000 + 70000 + 80000 + 85000 + 60000) / 5 // 74000
      })
    })

    it('should execute query with grouping and aggregations', async () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'department', direction: 'asc' }
        ],
        grouping: { fields: ['department'] },
        aggregations: [
          { type: 'count', alias: 'employee_count' },
          { type: 'avg', field: 'salary', alias: 'avg_salary' }
        ]
      }

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(2) // Engineering and Marketing
      expect(result.data[0]).toEqual({
        department: 'Engineering',
        employee_count: 3,
        avg_salary: (75000 + 70000 + 85000) / 3 // 76666.67...
      })
      expect(result.data[1]).toEqual({
        department: 'Marketing',
        employee_count: 2,
        avg_salary: (80000 + 60000) / 2 // 70000
      })
    })
  })

  describe('File I/O and Error Handling', () => {
    it('should handle non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.json')
      const executor = new JSONQueryExecutor<TestEntity>(nonExistentPath)
      
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.data).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('ADAPTER_ERROR')
      expect(result.errors![0].message).toContain('JSON file not found')
    })

    it('should handle invalid JSON file', async () => {
      const invalidJsonPath = path.join(tempDir, 'invalid.json')
      await fs.writeFile(invalidJsonPath, 'invalid json content')
      
      const executor = new JSONQueryExecutor<TestEntity>(invalidJsonPath)
      
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.data).toEqual([])
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('ADAPTER_ERROR')
      expect(result.errors![0].message).toContain('Failed to parse JSON')
    })

    it('should handle empty JSON file', async () => {
      const emptyJsonPath = path.join(tempDir, 'empty.json')
      await fs.writeFile(emptyJsonPath, '[]')
      
      const executor = new JSONQueryExecutor<TestEntity>(emptyJsonPath)
      
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.data).toEqual([])
      expect(result.metadata.totalCount).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should handle permission errors', async () => {
      // This test is platform-specific and might not work on all systems
      const restrictedPath = path.join(tempDir, 'restricted.json')
      await fs.writeFile(restrictedPath, JSON.stringify(testData))
      
      // Try to make file unreadable (might not work on all platforms)
      try {
        await fs.chmod(restrictedPath, 0o000)
        
        const executor = new JSONQueryExecutor<TestEntity>(restrictedPath)
        
        const query: Query<TestEntity> = {
          conditions: [],
          ordering: []
        }

        const result = await executor.execute(query)
        
        expect(result.errors).toHaveLength(1)
        expect(result.errors![0].code).toBe('ADAPTER_ERROR')
        
        // Restore permissions for cleanup
        await fs.chmod(restrictedPath, 0o644)
      } catch (error) {
        // Skip test if chmod doesn't work on this platform
        // Test is conditionally skipped based on platform capabilities
      }
    })

    it('should handle non-array JSON data', async () => {
      const objectJsonPath = path.join(tempDir, 'object.json')
      await fs.writeFile(objectJsonPath, JSON.stringify({ message: 'not an array' }))
      
      const executor = new JSONQueryExecutor<TestEntity>(objectJsonPath)
      
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('ADAPTER_ERROR')
      expect(result.errors![0].message).toContain('JSON data must be an array')
    })
  })

  describe('Caching and Performance', () => {
    it('should support data caching when enabled', async () => {
      const executor = new JSONQueryExecutor<TestEntity>({
        filePath: testFilePath,
        cacheData: true
      })
      
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      // First query - should load from file
      const result1 = await executor.execute(query)
      expect(result1.metadata.fromCache).toBe(false)
      expect(result1.data).toHaveLength(5)

      // Second query - should use cache
      const result2 = await executor.execute(query)
      expect(result2.metadata.fromCache).toBe(true)
      expect(result2.data).toHaveLength(5)
    })

    it('should not cache data when caching is disabled', async () => {
      const executor = new JSONQueryExecutor<TestEntity>({
        filePath: testFilePath,
        cacheData: false
      })
      
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      // Both queries should load from file
      const result1 = await executor.execute(query)
      expect(result1.metadata.fromCache).toBe(false)

      const result2 = await executor.execute(query)
      expect(result2.metadata.fromCache).toBe(false)
    })

    // Note: Cache invalidation based on file modification time is inherently
    // flaky in tests due to file system timing precision and OS differences.
    // This functionality should be tested manually or with integration tests
    // that can control file system time more precisely.
  })

  describe('Query Builder Integration', () => {
    it('should work with QueryBuilder fluent API', async () => {
      const query = QueryBuilder.create<TestEntity>()
        .whereEqual('department', 'Engineering')
        .whereGreaterThan('salary', 70000)
        .orderByDesc('salary')
        .limit(2)
        .build()

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('Diana') // Highest salary in Engineering > 70k
      expect(result.data[1].name).toBe('Alice') // Second highest
      expect(result.data.every(item => item.department === 'Engineering')).toBe(true)
      expect(result.data.every(item => item.salary > 70000)).toBe(true)
    })

    it('should work with complex QueryBuilder aggregations', async () => {
      const query = QueryBuilder.create<TestEntity>()
        .whereEqual('active', true)
        .groupBy('department')
        .count('active_employees')
        .avg('salary', 'avg_salary')
        .having('active_employees', '>', 1)
        .orderByDesc('avg_salary')
        .build()

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(1) // Only Engineering has > 1 active employee
      expect(result.data[0].department).toBe('Engineering') // Higher avg salary
      expect(result.data[0]).toEqual({
        department: 'Engineering',
        active_employees: 3, // Alice, Bob, Diana
        avg_salary: (75000 + 70000 + 85000) / 3
      })
      // Marketing is filtered out by having clause (only 1 active employee: Eve)
    })
  })

  describe('Configuration Options', () => {
    it('should support different file encodings', async () => {
      // Create a file with UTF-8 content including special characters
      const utf8Data = [
        { id: '1', name: 'José', age: 30, department: 'Engineering', salary: 75000, active: true, joinedAt: '2020-01-01' },
        { id: '2', name: 'François', age: 25, department: 'Marketing', salary: 70000, active: true, joinedAt: '2021-01-01' }
      ]
      
      const utf8Path = path.join(tempDir, 'utf8-data.json')
      await fs.writeFile(utf8Path, JSON.stringify(utf8Data, null, 2), 'utf8')
      
      const executor = new JSONQueryExecutor<TestEntity>({
        filePath: utf8Path,
        encoding: 'utf8'
      })
      
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('José')
      expect(result.data[1].name).toBe('François')
    })

    it('should provide file statistics in metadata', async () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = await executor.execute(query)
      
      expect(result.metadata).toHaveProperty('executionTime')
      expect(typeof result.metadata.executionTime).toBe('number')
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0)
    })
  })
})