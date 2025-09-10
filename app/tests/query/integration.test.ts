/**
 * Integration tests for Query Interface with Storage Adapters
 * 
 * This test file demonstrates that the query interface works correctly
 * with actual storage adapter implementations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryBuilder, QueryExecutor } from '../../src/query'
import { MemoryStorageAdapter } from '../../src/storage/adapters/MemoryStorageAdapter'
import { JSONStorageAdapter } from '../../src/storage/adapters/JSONStorageAdapter'
import { promises as fs } from 'fs'
import path from 'path'

describe('Query Interface Integration', () => {
  interface User {
    id: string
    name: string
    email: string
    age: number
    active: boolean
    tags: string[]
    createdAt: Date
  }

  const testUsers: User[] = [
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
      active: true,
      tags: ['developer', 'typescript'],
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      age: 32,
      active: false,
      tags: ['designer'],
      createdAt: new Date('2024-02-20')
    },
    {
      id: '3',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      age: 25,
      active: true,
      tags: ['manager', 'scrum'],
      createdAt: new Date('2024-03-10')
    },
    {
      id: '4',
      name: 'Diana Prince',
      email: 'diana@example.com',
      age: 35,
      active: true,
      tags: ['lead', 'architecture'],
      createdAt: new Date('2024-01-05')
    }
  ]

  describe('MemoryStorageAdapter Integration', () => {
    let storage: MemoryStorageAdapter<User>
    let queryExecutor: QueryExecutor<User>

    beforeEach(async () => {
      storage = new MemoryStorageAdapter<User>()
      queryExecutor = new QueryExecutor<User>()

      // Populate with test data
      for (const user of testUsers) {
        await storage.set(user.id, user)
      }
    })

    it('should execute simple equality queries', async () => {
      const query = QueryBuilder.create<User>()
        .whereEqual('active', true)
        .build()

      const result = await queryExecutor.execute(query, storage)

      expect(result.data).toHaveLength(3)
      expect(result.data.every(user => user.active)).toBe(true)
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0)
      expect(result.metadata.fromCache).toBe(false)
    })

    it('should execute complex queries with filtering and sorting', async () => {
      const query = QueryBuilder.create<User>()
        .whereEqual('active', true)
        .whereGreaterThan('age', 25)
        .orderByDesc('age')
        .limit(2)
        .build()

      const result = await queryExecutor.execute(query, storage)

      expect(result.data).toHaveLength(2)
      expect(result.data[0].age).toBeGreaterThanOrEqual(result.data[1].age)
      expect(result.data.every(user => user.active && user.age > 25)).toBe(true)
      expect(result.metadata.totalCount).toBe(2)
    })

    it('should execute pattern matching queries', async () => {
      const query = QueryBuilder.create<User>()
        .whereContains('name', 'o')
        .orderByAsc('name')
        .build()

      const result = await queryExecutor.execute(query, storage)

      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data.every(user => user.name.toLowerCase().includes('o'))).toBe(true)
    })

    it('should use the built-in query method', async () => {
      const query = QueryBuilder.create<User>()
        .whereEqual('active', true)
        .build()

      // Use the query method added to BaseStorageAdapter
      const result = await storage.query(query)

      expect(result.data).toHaveLength(3)
      expect(result.data.every(user => user.active)).toBe(true)
    })
  })

  describe('JSONStorageAdapter Integration', () => {
    let storage: JSONStorageAdapter<User>
    let queryExecutor: QueryExecutor<User>
    let tempFilePath: string

    beforeEach(async () => {
      tempFilePath = path.join(process.cwd(), `test-users-${Date.now()}.json`)
      storage = new JSONStorageAdapter<User>({
        type: 'json',
        filePath: tempFilePath
      })
      queryExecutor = new QueryExecutor<User>()

      // Populate with test data
      for (const user of testUsers) {
        await storage.set(user.id, user)
      }
    })

    afterEach(async () => {
      try {
        await fs.unlink(tempFilePath)
      } catch (error) {
        // File might not exist, ignore error
      }
    })

    it('should execute queries against persisted JSON data', async () => {
      const query = QueryBuilder.create<User>()
        .whereGreaterThanOrEqual('age', 30)
        .orderByAsc('age')
        .build()

      const result = await queryExecutor.execute(query, storage)

      expect(result.data).toHaveLength(2)
      expect(result.data.every(user => user.age >= 30)).toBe(true)
      expect(result.data[0].age).toBeLessThanOrEqual(result.data[1].age)
    })

    it('should handle empty result sets', async () => {
      const query = QueryBuilder.create<User>()
        .whereEqual('name', 'Non-existent User')
        .build()

      const result = await queryExecutor.execute(query, storage)

      expect(result.data).toHaveLength(0)
      expect(result.metadata.totalCount).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should detect JSON adapter type correctly', () => {
      const adapterType = queryExecutor.detectAdapterType(storage)
      expect(adapterType).toBe('json')
    })
  })

  describe('Query Builder with Real Data', () => {
    let storage: MemoryStorageAdapter<User>

    beforeEach(async () => {
      storage = new MemoryStorageAdapter<User>()
      
      // Populate with test data
      for (const user of testUsers) {
        await storage.set(user.id, user)
      }
    })

    it('should support complex query building patterns', async () => {
      // Build query conditionally
      let query = QueryBuilder.create<User>()
        .whereEqual('active', true)

      // Add age filter conditionally
      const minAge = 30
      if (minAge) {
        query = query.whereGreaterThanOrEqual('age', minAge)
      }

      // Add sorting and pagination
      const finalQuery = query
        .orderByDesc('createdAt')
        .limit(10)
        .build()

      const queryExecutor = new QueryExecutor<User>()
      const result = await queryExecutor.execute(finalQuery, storage)

      expect(result.data.every(user => user.active && user.age >= minAge)).toBe(true)
    })

    it('should handle multiple condition types in one query', async () => {
      const query = QueryBuilder.create<User>()
        .whereEqual('active', true)
        .whereContains('email', '@example.com')
        .whereIn('id', ['1', '3', '4'])
        .orderByAsc('name')
        .build()

      const queryExecutor = new QueryExecutor<User>()
      const result = await queryExecutor.execute(query, storage)

      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data.every(user => 
        user.active && 
        user.email.includes('@example.com') &&
        ['1', '3', '4'].includes(user.id)
      )).toBe(true)
    })
  })

  describe('Error Handling', () => {
    let storage: MemoryStorageAdapter<User>
    let queryExecutor: QueryExecutor<User>

    beforeEach(() => {
      storage = new MemoryStorageAdapter<User>()
      queryExecutor = new QueryExecutor<User>()
    })

    it('should handle storage adapter errors gracefully', async () => {
      // Create a query against empty storage
      const query = QueryBuilder.create<User>()
        .whereEqual('active', true)
        .build()

      const result = await queryExecutor.execute(query, storage)

      expect(result.data).toHaveLength(0)
      expect(result.metadata.totalCount).toBe(0)
      expect(result.errors).toEqual([])
    })
  })
})