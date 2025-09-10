/**
 * Tests for MemoryQueryExecutor
 * 
 * This test file follows strict TDD principles and defines the expected behavior
 * for the MemoryQueryExecutor class before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { MemoryQueryExecutor } from '../../../src/query/executors/MemoryQueryExecutor'
import { Query, QueryResult } from '../../../src/query/types'
import { QueryBuilder } from '../../../src/query/QueryBuilder'

describe('MemoryQueryExecutor', () => {
  interface TestEntity {
    id: string
    name: string
    age: number
    active: boolean
    tags: string[]
    createdAt: Date
    score?: number
  }

  const testData: TestEntity[] = [
    {
      id: '1',
      name: 'Alice Johnson',
      age: 25,
      active: true,
      tags: ['developer', 'typescript'],
      createdAt: new Date('2024-01-15'),
      score: 95
    },
    {
      id: '2', 
      name: 'Bob Smith',
      age: 30,
      active: false,
      tags: ['designer', 'ui'],
      createdAt: new Date('2024-02-20'),
      score: 87
    },
    {
      id: '3',
      name: 'Charlie Brown',
      age: 35,
      active: true,
      tags: ['manager'],
      createdAt: new Date('2024-03-10')
      // score is undefined
    },
    {
      id: '4',
      name: 'Diana Prince',
      age: 28,
      active: true,
      tags: ['developer', 'python', 'ai'],
      createdAt: new Date('2024-01-05'),
      score: 92
    },
    {
      id: '5',
      name: 'Eve Wilson',
      age: 22,
      active: false,
      tags: [],
      createdAt: new Date('2024-04-01'),
      score: 78
    }
  ]

  let executor: MemoryQueryExecutor<TestEntity>

  beforeEach(() => {
    executor = new MemoryQueryExecutor<TestEntity>()
  })

  describe('Constructor', () => {
    it('should create a new MemoryQueryExecutor instance', () => {
      expect(executor).toBeInstanceOf(MemoryQueryExecutor)
    })
  })

  describe('execute() method', () => {
    describe('Basic filtering', () => {
      it('should filter by equality condition', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .build()
          
        const result = executor.execute(query, testData)
        
        expect(result.data).toHaveLength(3)
        expect(result.data.every(item => item.active)).toBe(true)
        expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0)
        expect(result.metadata.fromCache).toBe(false)
        expect(result.metadata.totalCount).toBe(3)
      })


    })






  })


})