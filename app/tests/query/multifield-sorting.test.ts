/**
 * Multi-field Sorting Tests for QueryBuilder and MemoryQueryExecutor
 * 
 * These tests define the expected behavior for Task 2.2: Multi-field Sorting
 * Following strict TDD principles - all tests written before implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { QueryBuilder } from '../../src/query/QueryBuilder'
import { MemoryQueryExecutor } from '../../src/query/executors/MemoryQueryExecutor'
import { Query } from '../../src/query/types'

describe('Multi-field Sorting', () => {
  interface TestEntity {
    id: string
    name: string
    age: number
    department: string
    salary: number
    active: boolean
    joinedAt: Date
  }

  let executor: MemoryQueryExecutor<TestEntity>
  let testData: TestEntity[]

  beforeEach(() => {
    executor = new MemoryQueryExecutor<TestEntity>()
    
    // Create test data that will clearly demonstrate multi-field sorting
    testData = [
      { id: '1', name: 'Alice', age: 30, department: 'Engineering', salary: 75000, active: true, joinedAt: new Date('2020-01-01') },
      { id: '2', name: 'Bob', age: 25, department: 'Engineering', salary: 70000, active: true, joinedAt: new Date('2021-01-01') },
      { id: '3', name: 'Charlie', age: 35, department: 'Marketing', salary: 80000, active: false, joinedAt: new Date('2019-01-01') },
      { id: '4', name: 'Diana', age: 30, department: 'Engineering', salary: 85000, active: true, joinedAt: new Date('2020-06-01') },
      { id: '5', name: 'Eve', age: 25, department: 'Marketing', salary: 60000, active: true, joinedAt: new Date('2021-06-01') },
      { id: '6', name: 'Frank', age: 35, department: 'Engineering', salary: 90000, active: false, joinedAt: new Date('2018-01-01') }
    ]
  })

  describe('QueryBuilder Multiple orderBy() Calls', () => {
    it('should support multiple orderBy() calls and maintain order priority', () => {
      const query = QueryBuilder.create<TestEntity>()
        .orderBy('department', 'asc')  // Primary sort
        .orderBy('age', 'desc')        // Secondary sort
        .orderBy('name', 'asc')        // Tertiary sort
        .build()

      expect(query.ordering).toHaveLength(3)
      expect(query.ordering[0]).toEqual({ field: 'department', direction: 'asc', nulls: undefined })
      expect(query.ordering[1]).toEqual({ field: 'age', direction: 'desc', nulls: undefined })
      expect(query.ordering[2]).toEqual({ field: 'name', direction: 'asc', nulls: undefined })
    })

    it('should support mixed sort directions', () => {
      const query = QueryBuilder.create<TestEntity>()
        .orderByDesc('salary')
        .orderByAsc('name')
        .build()

      expect(query.ordering).toHaveLength(2)
      expect(query.ordering[0]).toEqual({ field: 'salary', direction: 'desc', nulls: undefined })
      expect(query.ordering[1]).toEqual({ field: 'name', direction: 'asc', nulls: undefined })
    })

    it('should support null positioning in multi-field sorting', () => {
      const query = QueryBuilder.create<TestEntity>()
        .orderBy('department', 'asc', 'first')
        .orderBy('age', 'desc', 'last')
        .build()

      expect(query.ordering).toHaveLength(2)
      expect(query.ordering[0]).toEqual({ field: 'department', direction: 'asc', nulls: 'first' })
      expect(query.ordering[1]).toEqual({ field: 'age', direction: 'desc', nulls: 'last' })
    })
  })

  describe('MemoryQueryExecutor Multi-field Sorting', () => {
    it('should sort by primary field first, then secondary field', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'department', direction: 'asc' },
          { field: 'age', direction: 'desc' }
        ]
      }

      const result = executor.execute(query, testData)
      expect(result.data).toHaveLength(6)
      
      // Engineering department should come first (alphabetically)
      expect(result.data[0].department).toBe('Engineering')
      expect(result.data[1].department).toBe('Engineering')
      expect(result.data[2].department).toBe('Engineering')
      expect(result.data[3].department).toBe('Engineering')
      
      // Within Engineering, should be sorted by age descending: Frank(35), Alice(30), Diana(30), Bob(25)
      // Alice comes before Diana due to stable sort (original order preserved for equal values)
      expect(result.data[0].name).toBe('Frank') // 35, Engineering
      expect(result.data[1].name).toBe('Alice') // 30, Engineering (original index 0)
      expect(result.data[2].name).toBe('Diana') // 30, Engineering (original index 3)
      expect(result.data[3].name).toBe('Bob')   // 25, Engineering
      
      // Marketing department should come after
      expect(result.data[4].department).toBe('Marketing')
      expect(result.data[5].department).toBe('Marketing')
      
      // Within Marketing, sorted by age descending: Charlie(35), Eve(25)
      expect(result.data[4].name).toBe('Charlie') // 35, Marketing
      expect(result.data[5].name).toBe('Eve')     // 25, Marketing
    })

    it('should handle tertiary sort when first two fields are equal', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'department', direction: 'asc' },
          { field: 'age', direction: 'asc' },
          { field: 'name', direction: 'asc' }
        ]
      }

      const result = executor.execute(query, testData)
      
      // For Engineering department, age 30: Alice should come before Diana (alphabetical by name)
      const engineeringAge30 = result.data.filter(item => 
        item.department === 'Engineering' && item.age === 30
      )
      expect(engineeringAge30).toHaveLength(2)
      expect(engineeringAge30[0].name).toBe('Alice')
      expect(engineeringAge30[1].name).toBe('Diana')
    })

    it('should handle mixed directions in multi-field sorting', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'active', direction: 'desc' },  // Active users first
          { field: 'salary', direction: 'desc' },  // Then by highest salary
          { field: 'name', direction: 'asc' }      // Then alphabetically
        ]
      }

      const result = executor.execute(query, testData)
      
      // Active users should come first
      const activeUsers = result.data.slice(0, 4) // 4 active users
      activeUsers.forEach(user => expect(user.active).toBe(true))
      
      // Among active users, should be sorted by salary desc: Diana(85k), Alice(75k), Bob(70k), Eve(60k)
      expect(activeUsers[0].name).toBe('Diana')  // 85000
      expect(activeUsers[1].name).toBe('Alice')  // 75000
      expect(activeUsers[2].name).toBe('Bob')    // 70000
      expect(activeUsers[3].name).toBe('Eve')    // 60000
      
      // Inactive users should come after, sorted by salary desc: Frank(90k), Charlie(80k)
      const inactiveUsers = result.data.slice(4, 6)
      inactiveUsers.forEach(user => expect(user.active).toBe(false))
      expect(inactiveUsers[0].name).toBe('Frank')   // 90000
      expect(inactiveUsers[1].name).toBe('Charlie') // 80000
    })

    it('should handle null values with explicit positioning', () => {
      // Add test data with null values
      const dataWithNulls: TestEntity[] = [
        ...testData,
        { id: '7', name: 'Grace', age: 28, department: null as any, salary: 72000, active: true, joinedAt: new Date('2020-03-01') },
        { id: '8', name: 'Henry', age: null as any, department: 'Engineering', salary: 68000, active: true, joinedAt: new Date('2021-03-01') }
      ]

      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'department', direction: 'asc', nulls: 'first' },
          { field: 'age', direction: 'asc', nulls: 'last' },
          { field: 'name', direction: 'asc' }
        ]
      }

      const result = executor.execute(query, dataWithNulls)
      
      // Grace (null department) should come first due to nulls: 'first'
      expect(result.data[0].name).toBe('Grace')
      expect(result.data[0].department).toBeNull()
      
      // Henry (null age) in Engineering should come last among Engineering employees due to nulls: 'last'
      const engineeringEmployees = result.data.filter(item => item.department === 'Engineering')
      const henryIndex = engineeringEmployees.findIndex(emp => emp.name === 'Henry')
      expect(henryIndex).toBe(engineeringEmployees.length - 1) // Last in Engineering department
    })

    it('should maintain stable sort guarantee', () => {
      // Create data where some records are identical on sort fields
      const duplicateData: TestEntity[] = [
        { id: '1', name: 'Alice', age: 30, department: 'Engineering', salary: 75000, active: true, joinedAt: new Date('2020-01-01') },
        { id: '2', name: 'Alice', age: 30, department: 'Engineering', salary: 75000, active: true, joinedAt: new Date('2020-01-02') }, // Same except joinedAt
        { id: '3', name: 'Alice', age: 30, department: 'Engineering', salary: 75000, active: true, joinedAt: new Date('2020-01-03') }  // Same except joinedAt
      ]

      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'name', direction: 'asc' },
          { field: 'age', direction: 'asc' },
          { field: 'department', direction: 'asc' }
        ]
      }

      const result1 = executor.execute(query, duplicateData)
      const result2 = executor.execute(query, duplicateData)
      
      // Results should be identical (stable sort)
      expect(result1.data).toEqual(result2.data)
      
      // Original order should be preserved for equal elements
      expect(result1.data[0].id).toBe('1')
      expect(result1.data[1].id).toBe('2')
      expect(result1.data[2].id).toBe('3')
    })
  })

  describe('Multi-field Sorting with Other Operations', () => {
    it('should work with filtering and pagination', () => {
      const query: Query<TestEntity> = {
        conditions: [
          { type: 'equality', field: 'active', operator: '=', value: true }
        ],
        ordering: [
          { field: 'department', direction: 'asc' },
          { field: 'salary', direction: 'desc' }
        ],
        pagination: { limit: 2, offset: 0 }
      }

      const result = executor.execute(query, testData)
      
      // Should get top 2 active employees: Diana and Alice (both Engineering, sorted by salary desc)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('Diana') // Engineering, 85000
      expect(result.data[1].name).toBe('Alice') // Engineering, 75000
      expect(result.metadata.totalCount).toBe(4) // 4 active employees total
    })

    it('should work with projection (select)', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'department', direction: 'asc' },
          { field: 'salary', direction: 'desc' }
        ],
        projection: {
          fields: ['name', 'department', 'salary'],
          includeAll: false
        }
      }

      const result = executor.execute(query, testData)
      
      // Should only include selected fields but maintain sort order
      expect(result.data[0]).toEqual({ name: 'Frank', department: 'Engineering', salary: 90000 })
      expect(result.data[0]).not.toHaveProperty('id')
      expect(result.data[0]).not.toHaveProperty('age')
      expect(result.data[0]).not.toHaveProperty('active')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty ordering array (no sorting)', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: []
      }

      const result = executor.execute(query, testData)
      
      // Should return data in original order
      expect(result.data).toEqual(testData)
    })

    it('should handle single field sorting (backward compatibility)', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'name', direction: 'asc' }
        ]
      }

      const result = executor.execute(query, testData)
      
      // Should sort by name only
      const names = result.data.map(item => item.name)
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'])
    })

    it('should handle date field sorting in multi-field context', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'department', direction: 'asc' },
          { field: 'joinedAt', direction: 'asc' } // Earliest joiners first within department
        ]
      }

      const result = executor.execute(query, testData)
      
      // Engineering department: Frank(2018), Alice(2020-01), Diana(2020-06), Bob(2021)
      const engineeringEmployees = result.data.filter(emp => emp.department === 'Engineering')
      expect(engineeringEmployees[0].name).toBe('Frank')  // 2018-01-01
      expect(engineeringEmployees[1].name).toBe('Alice')  // 2020-01-01
      expect(engineeringEmployees[2].name).toBe('Diana')  // 2020-06-01
      expect(engineeringEmployees[3].name).toBe('Bob')    // 2021-01-01
    })
  })

})