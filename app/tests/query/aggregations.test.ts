/**
 * Aggregation Tests for QueryBuilder and MemoryQueryExecutor
 * 
 * These tests define the expected behavior for Task 2.3: Basic Aggregations
 * Following strict TDD principles - all tests written before implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { QueryBuilder } from '../../src/query/QueryBuilder'
import { MemoryQueryExecutor } from '../../src/query/executors/MemoryQueryExecutor'
import { Query, Aggregation } from '../../src/query/types'

describe('Aggregations', () => {
  interface TestEntity {
    id: string
    name: string
    age: number
    department: string
    salary: number
    active: boolean
    bonus?: number // Optional field for testing null handling
    joinedAt: Date
  }

  let executor: MemoryQueryExecutor<TestEntity>
  let testData: TestEntity[]

  beforeEach(() => {
    executor = new MemoryQueryExecutor<TestEntity>()
    
    testData = [
      { id: '1', name: 'Alice', age: 30, department: 'Engineering', salary: 75000, active: true, bonus: 5000, joinedAt: new Date('2020-01-01') },
      { id: '2', name: 'Bob', age: 25, department: 'Engineering', salary: 70000, active: true, bonus: 3000, joinedAt: new Date('2021-01-01') },
      { id: '3', name: 'Charlie', age: 35, department: 'Marketing', salary: 80000, active: false, joinedAt: new Date('2019-01-01') },
      { id: '4', name: 'Diana', age: 30, department: 'Engineering', salary: 85000, active: true, bonus: 7000, joinedAt: new Date('2020-06-01') },
      { id: '5', name: 'Eve', age: 25, department: 'Marketing', salary: 60000, active: true, bonus: 2000, joinedAt: new Date('2021-06-01') },
      { id: '6', name: 'Frank', age: 35, department: 'Engineering', salary: 90000, active: false, bonus: 4000, joinedAt: new Date('2018-01-01') }
    ]
  })

  describe('QueryBuilder Aggregation Methods', () => {
    it('should support count() aggregation', () => {
      const query = QueryBuilder.create<TestEntity>()
        .count('total_count')
        .build()

      expect(query.aggregations).toHaveLength(1)
      expect(query.aggregations?.[0]).toEqual({
        type: 'count',
        alias: 'total_count'
      })
    })

    it('should support countDistinct() aggregation', () => {
      const query = QueryBuilder.create<TestEntity>()
        .countDistinct('department', 'unique_departments')
        .build()

      expect(query.aggregations).toHaveLength(1)
      expect(query.aggregations?.[0]).toEqual({
        type: 'count_distinct',
        field: 'department',
        alias: 'unique_departments'
      })
    })

    it('should support sum() aggregation', () => {
      const query = QueryBuilder.create<TestEntity>()
        .sum('salary', 'total_salary')
        .build()

      expect(query.aggregations).toHaveLength(1)
      expect(query.aggregations?.[0]).toEqual({
        type: 'sum',
        field: 'salary',
        alias: 'total_salary'
      })
    })

    it('should support avg() aggregation', () => {
      const query = QueryBuilder.create<TestEntity>()
        .avg('age', 'average_age')
        .build()

      expect(query.aggregations).toHaveLength(1)
      expect(query.aggregations?.[0]).toEqual({
        type: 'avg',
        field: 'age',
        alias: 'average_age'
      })
    })

    it('should support min() aggregation', () => {
      const query = QueryBuilder.create<TestEntity>()
        .min('salary', 'min_salary')
        .build()

      expect(query.aggregations).toHaveLength(1)
      expect(query.aggregations?.[0]).toEqual({
        type: 'min',
        field: 'salary',
        alias: 'min_salary'
      })
    })

    it('should support max() aggregation', () => {
      const query = QueryBuilder.create<TestEntity>()
        .max('salary', 'max_salary')
        .build()

      expect(query.aggregations).toHaveLength(1)
      expect(query.aggregations?.[0]).toEqual({
        type: 'max',
        field: 'salary',
        alias: 'max_salary'
      })
    })

    it('should support multiple aggregations', () => {
      const query = QueryBuilder.create<TestEntity>()
        .count('total_employees')
        .avg('salary', 'avg_salary')
        .sum('salary', 'total_salary')
        .min('age', 'youngest')
        .max('age', 'oldest')
        .build()

      expect(query.aggregations).toHaveLength(5)
      expect(query.aggregations?.map(agg => agg.type)).toEqual([
        'count', 'avg', 'sum', 'min', 'max'
      ])
    })

    it('should support groupBy() with single field', () => {
      const query = QueryBuilder.create<TestEntity>()
        .groupBy('department')
        .count('employee_count')
        .build()

      expect(query.grouping?.fields).toEqual(['department'])
      expect(query.aggregations).toHaveLength(1)
    })

    it('should support groupBy() with multiple fields', () => {
      const query = QueryBuilder.create<TestEntity>()
        .groupBy('department', 'active')
        .avg('salary', 'avg_salary')
        .build()

      expect(query.grouping?.fields).toEqual(['department', 'active'])
      expect(query.aggregations).toHaveLength(1)
    })

    it('should support having() clause with grouped queries', () => {
      const query = QueryBuilder.create<TestEntity>()
        .groupBy('department')
        .count('employee_count')
        .having('employee_count', '>', 2)
        .build()

      expect(query.grouping?.fields).toEqual(['department'])
      expect(query.having).toBeDefined()
      expect(query.having).toEqual({
        field: 'employee_count',
        operator: '>',
        value: 2
      })
    })
  })

  describe('MemoryQueryExecutor Basic Aggregations (No Grouping)', () => {
    it('should execute count aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'total_count' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ total_count: 6 })
    })

    it('should execute count_distinct aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'count_distinct', field: 'department', alias: 'unique_departments' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ unique_departments: 2 }) // Engineering and Marketing
    })

    it('should execute sum aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'sum', field: 'salary', alias: 'total_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ 
        total_salary: 75000 + 70000 + 80000 + 85000 + 60000 + 90000 // 460000
      })
    })

    it('should execute avg aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'avg', field: 'age', alias: 'average_age' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ 
        average_age: (30 + 25 + 35 + 30 + 25 + 35) / 6 // 30
      })
    })

    it('should execute min aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'min', field: 'salary', alias: 'min_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ min_salary: 60000 }) // Eve's salary
    })

    it('should execute max aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'max', field: 'salary', alias: 'max_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({ max_salary: 90000 }) // Frank's salary
    })

    it('should execute multiple aggregations', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'total_employees' },
          { type: 'avg', field: 'salary', alias: 'avg_salary' },
          { type: 'sum', field: 'salary', alias: 'total_salary' },
          { type: 'min', field: 'age', alias: 'youngest' },
          { type: 'max', field: 'age', alias: 'oldest' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        total_employees: 6,
        avg_salary: 460000 / 6, // 76666.67...
        total_salary: 460000,
        youngest: 25,
        oldest: 35
      })
    })

    it('should handle null values in aggregations', () => {
      // Add data with null bonus values
      const dataWithNulls = [
        ...testData.slice(0, 3), // First 3 records with bonuses
        { ...testData[3], bonus: undefined }, // Diana with null bonus
        { ...testData[4], bonus: undefined }, // Eve with null bonus
        { ...testData[5], bonus: undefined }  // Frank with null bonus
      ]

      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'total_count' },
          { type: 'count_distinct', field: 'bonus', alias: 'non_null_bonuses' },
          { type: 'sum', field: 'bonus', alias: 'total_bonus' },
          { type: 'avg', field: 'bonus', alias: 'avg_bonus' }
        ]
      }

      const result = executor.execute(query, dataWithNulls)
      
      expect(result.data[0]).toEqual({
        total_count: 6, // All records counted
        non_null_bonuses: 2, // Only Alice and Bob have non-null bonuses (Charlie was originally undefined)
        total_bonus: 5000 + 3000, // Only Alice and Bob bonuses 
        avg_bonus: (5000 + 3000) / 2 // Average of non-null values only
      })
    })
  })

  describe('MemoryQueryExecutor Aggregations with Grouping', () => {
    it('should group by single field and aggregate', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        grouping: { fields: ['department'] },
        aggregations: [
          { type: 'count', alias: 'employee_count' },
          { type: 'avg', field: 'salary', alias: 'avg_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(2) // Engineering and Marketing
      
      const engineeringGroup = result.data.find((row: any) => row.department === 'Engineering')
      const marketingGroup = result.data.find((row: any) => row.department === 'Marketing')
      
      expect(engineeringGroup).toEqual({
        department: 'Engineering',
        employee_count: 4, // Alice, Bob, Diana, Frank
        avg_salary: (75000 + 70000 + 85000 + 90000) / 4 // 80000
      })
      
      expect(marketingGroup).toEqual({
        department: 'Marketing',
        employee_count: 2, // Charlie, Eve
        avg_salary: (80000 + 60000) / 2 // 70000
      })
    })

    it('should group by multiple fields', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        grouping: { fields: ['department', 'active'] },
        aggregations: [
          { type: 'count', alias: 'employee_count' },
          { type: 'max', field: 'salary', alias: 'max_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(4) // Engineering-true, Engineering-false, Marketing-true, Marketing-false
      
      // Find each group
      const engActive = result.data.find((row: any) => 
        row.department === 'Engineering' && row.active === true
      )
      const engInactive = result.data.find((row: any) => 
        row.department === 'Engineering' && row.active === false
      )
      const mktActive = result.data.find((row: any) => 
        row.department === 'Marketing' && row.active === true
      )
      
      expect(engActive).toEqual({
        department: 'Engineering',
        active: true,
        employee_count: 3, // Alice, Bob, Diana
        max_salary: 85000  // Diana
      })
      
      expect(engInactive).toEqual({
        department: 'Engineering',
        active: false,
        employee_count: 1, // Frank
        max_salary: 90000  // Frank
      })
      
      expect(mktActive).toEqual({
        department: 'Marketing',
        active: true,
        employee_count: 1, // Eve
        max_salary: 60000  // Eve
      })
      
      // Find the Marketing-false group (Charlie)
      const mktInactive = result.data.find((row: any) => 
        row.department === 'Marketing' && row.active === false
      )
      
      expect(mktInactive).toEqual({
        department: 'Marketing',
        active: false,
        employee_count: 1, // Charlie
        max_salary: 80000  // Charlie
      })
    })

    it('should handle having clause to filter groups', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        grouping: { fields: ['department'] },
        aggregations: [
          { type: 'count', alias: 'employee_count' },
          { type: 'avg', field: 'salary', alias: 'avg_salary' }
        ],
        having: {
          field: 'employee_count',
          operator: '>',
          value: 2
        }
      }

      const result = executor.execute(query, testData)
      
      // Only Engineering department has > 2 employees (4 employees)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        department: 'Engineering',
        employee_count: 4,
        avg_salary: 80000
      })
    })

    it('should support ordering with grouped results', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [
          { field: 'avg_salary', direction: 'desc' } // Order by aggregated field
        ],
        grouping: { fields: ['department'] },
        aggregations: [
          { type: 'count', alias: 'employee_count' },
          { type: 'avg', field: 'salary', alias: 'avg_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data).toHaveLength(2)
      // Engineering (80000) should come before Marketing (70000)
      expect(result.data[0].department).toBe('Engineering')
      expect(result.data[1].department).toBe('Marketing')
    })
  })

  describe('Aggregations with Filtering', () => {
    it('should apply filters before aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [
          { type: 'equality', field: 'active', operator: '=', value: true }
        ],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'active_employees' },
          { type: 'avg', field: 'salary', alias: 'avg_active_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      // Only 4 active employees: Alice, Bob, Diana, Eve
      expect(result.data[0]).toEqual({
        active_employees: 4,
        avg_active_salary: (75000 + 70000 + 85000 + 60000) / 4 // 72500
      })
    })

    it('should apply filters before grouping and aggregation', () => {
      const query: Query<TestEntity> = {
        conditions: [
          { type: 'comparison', field: 'salary', operator: '>=', value: 70000 }
        ],
        ordering: [],
        grouping: { fields: ['department'] },
        aggregations: [
          { type: 'count', alias: 'high_earner_count' },
          { type: 'min', field: 'salary', alias: 'min_high_salary' }
        ]
      }

      const result = executor.execute(query, testData)
      
      // Filter: salary >= 70000 removes Eve (60000)
      // Engineering: Alice (75k), Bob (70k), Diana (85k), Frank (90k)
      // Marketing: Charlie (80k)
      
      const engineeringGroup = result.data.find((row: any) => row.department === 'Engineering')
      const marketingGroup = result.data.find((row: any) => row.department === 'Marketing')
      
      expect(engineeringGroup).toEqual({
        department: 'Engineering',
        high_earner_count: 4,
        min_high_salary: 70000 // Bob
      })
      
      expect(marketingGroup).toEqual({
        department: 'Marketing',
        high_earner_count: 1,
        min_high_salary: 80000 // Charlie
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data set', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'total_count' },
          { type: 'sum', field: 'salary', alias: 'total_salary' }
        ]
      }

      const result = executor.execute(query, [])
      
      expect(result.data[0]).toEqual({
        total_count: 0,
        total_salary: 0
      })
    })

    it('should handle aggregation with no matching records after filtering', () => {
      const query: Query<TestEntity> = {
        conditions: [
          { type: 'equality', field: 'name', operator: '=', value: 'NonExistent' }
        ],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'matching_count' },
          { type: 'avg', field: 'age', alias: 'avg_age' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data[0]).toEqual({
        matching_count: 0,
        avg_age: null // or 0, depending on implementation choice
      })
    })

    it('should validate aggregation field types', () => {
      // This test documents expected behavior for type validation
      // Sum/avg should only work on numeric fields
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'sum', field: 'name', alias: 'invalid_sum' } // Should fail
        ]
      }

      const result = executor.execute(query, testData)
      
      // Should return error in result.errors rather than throwing
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe('TYPE_MISMATCH')
      expect(result.errors![0].message).toContain('Cannot apply sum to non-numeric field')
      expect(result.data).toEqual([])
    })

    it('should handle date aggregations', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'min', field: 'joinedAt', alias: 'earliest_joiner' },
          { type: 'max', field: 'joinedAt', alias: 'latest_joiner' }
        ]
      }

      const result = executor.execute(query, testData)
      
      expect(result.data[0]).toEqual({
        earliest_joiner: new Date('2018-01-01'), // Frank
        latest_joiner: new Date('2021-06-01')    // Eve
      })
    })
  })

  describe('Aggregation Result Types', () => {
    it('should return properly typed aggregation results', () => {
      const query: Query<TestEntity> = {
        conditions: [],
        ordering: [],
        aggregations: [
          { type: 'count', alias: 'total_count' },
          { type: 'sum', field: 'salary', alias: 'total_salary' },
          { type: 'avg', field: 'age', alias: 'average_age' }
        ]
      }

      const result = executor.execute(query, testData)
      
      // Verify result types
      expect(typeof result.data[0].total_count).toBe('number')
      expect(typeof result.data[0].total_salary).toBe('number')
      expect(typeof result.data[0].average_age).toBe('number')
      
      expect(Number.isInteger(result.data[0].total_count)).toBe(true)
      expect(Number.isInteger(result.data[0].total_salary)).toBe(true)
    })
  })
})