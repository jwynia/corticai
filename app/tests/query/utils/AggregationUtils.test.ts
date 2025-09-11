/**
 * AggregationUtils Tests
 * 
 * Test-driven development for shared aggregation utilities
 * These tests define the expected behavior before implementation
 */

import { describe, it, expect } from 'vitest'
import { AggregationUtils, AggregationError } from '../../../src/query/utils/AggregationUtils'
import { Aggregation, QueryError } from '../../../src/query/types'

describe('AggregationUtils', () => {
  interface TestEntity {
    id: string
    name: string
    age: number
    department: string
    salary: number
    active: boolean
    bonus?: number
    joinedAt: Date
  }

  const testData: TestEntity[] = [
    { id: '1', name: 'Alice', age: 30, department: 'Engineering', salary: 75000, active: true, bonus: 5000, joinedAt: new Date('2020-01-01') },
    { id: '2', name: 'Bob', age: 25, department: 'Engineering', salary: 70000, active: true, bonus: 3000, joinedAt: new Date('2021-01-01') },
    { id: '3', name: 'Charlie', age: 35, department: 'Marketing', salary: 80000, active: false, joinedAt: new Date('2019-01-01') },
    { id: '4', name: 'Diana', age: 30, department: 'Engineering', salary: 85000, active: true, bonus: 7000, joinedAt: new Date('2020-06-01') },
    { id: '5', name: 'Eve', age: 25, department: 'Marketing', salary: 60000, active: true, bonus: 2000, joinedAt: new Date('2021-06-01') },
  ]

  describe('calculateCount', () => {
    it('should count all records', () => {
      const result = AggregationUtils.calculateCount(testData)
      expect(result).toBe(5)
    })

    it('should count empty array as 0', () => {
      const result = AggregationUtils.calculateCount([])
      expect(result).toBe(0)
    })

    it('should handle null/undefined records', () => {
      const dataWithNulls = [testData[0], null as any, testData[1], undefined as any]
      const result = AggregationUtils.calculateCount(dataWithNulls)
      expect(result).toBe(4) // Count includes null/undefined entries
    })
  })

  describe('calculateCountDistinct', () => {
    it('should count distinct values in a field', () => {
      const result = AggregationUtils.calculateCountDistinct(testData, 'department')
      expect(result).toBe(2) // Engineering and Marketing
    })

    it('should handle null/undefined values by excluding them', () => {
      const dataWithNulls = [
        ...testData.slice(0, 3),
        { ...testData[3], bonus: undefined },
        { ...testData[4], bonus: undefined }
      ]
      const result = AggregationUtils.calculateCountDistinct(dataWithNulls, 'bonus')
      expect(result).toBe(2) // Only 5000 and 3000 (Charlie has no bonus originally)
    })

    it('should return 0 for empty array', () => {
      const result = AggregationUtils.calculateCountDistinct([], 'department')
      expect(result).toBe(0)
    })

    it('should handle all null values', () => {
      const dataWithAllNulls = testData.map(item => ({ ...item, bonus: null }))
      const result = AggregationUtils.calculateCountDistinct(dataWithAllNulls, 'bonus')
      expect(result).toBe(0)
    })
  })

  describe('calculateSum', () => {
    it('should sum numeric values', () => {
      const result = AggregationUtils.calculateSum(testData, 'salary')
      expect(result).toBe(75000 + 70000 + 80000 + 85000 + 60000) // 370000
    })

    it('should return 0 for empty array', () => {
      const result = AggregationUtils.calculateSum([], 'salary')
      expect(result).toBe(0)
    })

    it('should skip null/undefined values', () => {
      const dataWithNulls = [
        ...testData.slice(0, 2),
        { ...testData[2], bonus: undefined },
        { ...testData[3], bonus: null as any },
        testData[4]
      ]
      const result = AggregationUtils.calculateSum(dataWithNulls, 'bonus')
      expect(result).toBe(5000 + 3000 + 2000) // 10000
    })

    it('should throw error for non-numeric field', () => {
      expect(() => {
        AggregationUtils.calculateSum(testData, 'name')
      }).toThrow(QueryError)
    })

    it('should throw error with specific message for non-numeric field', () => {
      expect(() => {
        AggregationUtils.calculateSum(testData, 'name')
      }).toThrow('Cannot apply sum to non-numeric field: name')
    })

    it('should handle NaN values', () => {
      const dataWithNaN = [
        { ...testData[0], salary: NaN },
        testData[1],
        testData[2]
      ]
      const result = AggregationUtils.calculateSum(dataWithNaN, 'salary')
      expect(result).toBe(70000 + 80000) // Skip NaN value
    })
  })

  describe('calculateAvg', () => {
    it('should calculate average of numeric values', () => {
      const result = AggregationUtils.calculateAvg(testData, 'age')
      expect(result).toBe((30 + 25 + 35 + 30 + 25) / 5) // 29
    })

    it('should return null for empty array', () => {
      const result = AggregationUtils.calculateAvg([], 'age')
      expect(result).toBeNull()
    })

    it('should skip null/undefined values in calculation', () => {
      const dataWithNulls = [
        testData[0], // bonus: 5000
        testData[1], // bonus: 3000
        { ...testData[2], bonus: undefined },
        { ...testData[3], bonus: null as any },
        testData[4]  // bonus: 2000
      ]
      const result = AggregationUtils.calculateAvg(dataWithNulls, 'bonus')
      expect(result).toBe((5000 + 3000 + 2000) / 3) // 3333.33...
    })

    it('should return null when all values are null/undefined', () => {
      const dataWithAllNulls = testData.map(item => ({ ...item, bonus: null }))
      const result = AggregationUtils.calculateAvg(dataWithAllNulls, 'bonus')
      expect(result).toBeNull()
    })

    it('should throw error for non-numeric field', () => {
      expect(() => {
        AggregationUtils.calculateAvg(testData, 'department')
      }).toThrow(QueryError)
    })

    it('should handle NaN values by skipping them', () => {
      const dataWithNaN = [
        testData[0], // age: 30
        { ...testData[1], age: NaN },
        testData[2]  // age: 35
      ]
      const result = AggregationUtils.calculateAvg(dataWithNaN, 'age')
      expect(result).toBe((30 + 35) / 2) // 32.5
    })
  })

  describe('calculateMin', () => {
    it('should find minimum numeric value', () => {
      const result = AggregationUtils.calculateMin(testData, 'salary')
      expect(result).toBe(60000) // Eve's salary
    })

    it('should return null for empty array', () => {
      const result = AggregationUtils.calculateMin([], 'salary')
      expect(result).toBeNull()
    })

    it('should skip null/undefined values', () => {
      const dataWithNulls = [
        { ...testData[0], salary: null as any },
        testData[1], // 70000
        testData[2], // 80000
        { ...testData[3], salary: undefined as any },
        testData[4]  // 60000
      ]
      const result = AggregationUtils.calculateMin(dataWithNulls, 'salary')
      expect(result).toBe(60000)
    })

    it('should return null when all values are null/undefined', () => {
      const dataWithAllNulls = testData.map(item => ({ ...item, salary: null }))
      const result = AggregationUtils.calculateMin(dataWithAllNulls, 'salary')
      expect(result).toBeNull()
    })

    it('should work with Date values', () => {
      const result = AggregationUtils.calculateMin(testData, 'joinedAt')
      expect(result).toEqual(new Date('2019-01-01')) // Charlie's join date
    })

    it('should work with string values', () => {
      const result = AggregationUtils.calculateMin(testData, 'name')
      expect(result).toBe('Alice') // Alphabetically first
    })
  })

  describe('calculateMax', () => {
    it('should find maximum numeric value', () => {
      const result = AggregationUtils.calculateMax(testData, 'salary')
      expect(result).toBe(85000) // Diana's salary
    })

    it('should return null for empty array', () => {
      const result = AggregationUtils.calculateMax([], 'salary')
      expect(result).toBeNull()
    })

    it('should skip null/undefined values', () => {
      const dataWithNulls = [
        testData[0], // 75000
        { ...testData[1], salary: null as any },
        { ...testData[2], salary: undefined as any },
        testData[3], // 85000
        testData[4]  // 60000
      ]
      const result = AggregationUtils.calculateMax(dataWithNulls, 'salary')
      expect(result).toBe(85000)
    })

    it('should return null when all values are null/undefined', () => {
      const dataWithAllNulls = testData.map(item => ({ ...item, salary: null }))
      const result = AggregationUtils.calculateMax(dataWithAllNulls, 'salary')
      expect(result).toBeNull()
    })

    it('should work with Date values', () => {
      const result = AggregationUtils.calculateMax(testData, 'joinedAt')
      expect(result).toEqual(new Date('2021-06-01')) // Eve's join date
    })

    it('should work with string values', () => {
      const result = AggregationUtils.calculateMax(testData, 'name')
      expect(result).toBe('Eve') // Alphabetically last
    })
  })

  describe('calculateAggregation', () => {
    it('should delegate to correct calculation method for count', () => {
      const aggregation: Aggregation<TestEntity> = {
        type: 'count',
        alias: 'total'
      }
      const result = AggregationUtils.calculateAggregation(testData, aggregation)
      expect(result).toBe(5)
    })

    it('should delegate to correct calculation method for count_distinct', () => {
      const aggregation: Aggregation<TestEntity> = {
        type: 'count_distinct',
        field: 'department',
        alias: 'unique_depts'
      }
      const result = AggregationUtils.calculateAggregation(testData, aggregation)
      expect(result).toBe(2)
    })

    it('should delegate to correct calculation method for sum', () => {
      const aggregation: Aggregation<TestEntity> = {
        type: 'sum',
        field: 'salary',
        alias: 'total_salary'
      }
      const result = AggregationUtils.calculateAggregation(testData, aggregation)
      expect(result).toBe(370000)
    })

    it('should delegate to correct calculation method for avg', () => {
      const aggregation: Aggregation<TestEntity> = {
        type: 'avg',
        field: 'age',
        alias: 'avg_age'
      }
      const result = AggregationUtils.calculateAggregation(testData, aggregation)
      expect(result).toBe(29)
    })

    it('should delegate to correct calculation method for min', () => {
      const aggregation: Aggregation<TestEntity> = {
        type: 'min',
        field: 'salary',
        alias: 'min_salary'
      }
      const result = AggregationUtils.calculateAggregation(testData, aggregation)
      expect(result).toBe(60000)
    })

    it('should delegate to correct calculation method for max', () => {
      const aggregation: Aggregation<TestEntity> = {
        type: 'max',
        field: 'salary',
        alias: 'max_salary'
      }
      const result = AggregationUtils.calculateAggregation(testData, aggregation)
      expect(result).toBe(85000)
    })

    it('should throw error for unknown aggregation type', () => {
      const aggregation = {
        type: 'unknown',
        alias: 'test'
      } as any
      expect(() => {
        AggregationUtils.calculateAggregation(testData, aggregation)
      }).toThrow('Unknown aggregation type: unknown')
    })

    it('should throw error for aggregations requiring field when field is missing', () => {
      const aggregation: Aggregation<TestEntity> = {
        type: 'sum',
        alias: 'test'
        // missing field
      } as any
      expect(() => {
        AggregationUtils.calculateAggregation(testData, aggregation)
      }).toThrow('sum requires a field')
    })
  })

  describe('validateAggregationField', () => {
    it('should validate numeric field for sum operation', () => {
      expect(() => {
        AggregationUtils.validateAggregationField(testData, 'sum', 'salary')
      }).not.toThrow()
    })

    it('should throw error for non-numeric field with sum operation', () => {
      expect(() => {
        AggregationUtils.validateAggregationField(testData, 'sum', 'name')
      }).toThrow('Cannot apply sum to non-numeric field: name')
    })

    it('should validate numeric field for avg operation', () => {
      expect(() => {
        AggregationUtils.validateAggregationField(testData, 'avg', 'age')
      }).not.toThrow()
    })

    it('should throw error for non-numeric field with avg operation', () => {
      expect(() => {
        AggregationUtils.validateAggregationField(testData, 'avg', 'department')
      }).toThrow('Cannot apply avg to non-numeric field: department')
    })

    it('should allow any field type for min/max operations', () => {
      expect(() => {
        AggregationUtils.validateAggregationField(testData, 'min', 'name')
      }).not.toThrow()

      expect(() => {
        AggregationUtils.validateAggregationField(testData, 'max', 'joinedAt')
      }).not.toThrow()
    })

    it('should allow any field type for count_distinct operation', () => {
      expect(() => {
        AggregationUtils.validateAggregationField(testData, 'count_distinct', 'active')
      }).not.toThrow()
    })

    it('should handle empty data gracefully', () => {
      expect(() => {
        AggregationUtils.validateAggregationField([], 'sum', 'salary')
      }).not.toThrow()
    })
  })

  describe('isNumericField', () => {
    it('should return true for numeric field', () => {
      const result = AggregationUtils.isNumericField(testData, 'salary')
      expect(result).toBe(true)
    })

    it('should return false for string field', () => {
      const result = AggregationUtils.isNumericField(testData, 'name')
      expect(result).toBe(false)
    })

    it('should return false for boolean field', () => {
      const result = AggregationUtils.isNumericField(testData, 'active')
      expect(result).toBe(false)
    })

    it('should return false for date field', () => {
      const result = AggregationUtils.isNumericField(testData, 'joinedAt')
      expect(result).toBe(false)
    })

    it('should return true for numeric field with some null values', () => {
      const dataWithNulls = [
        testData[0],
        { ...testData[1], salary: null as any },
        testData[2]
      ]
      const result = AggregationUtils.isNumericField(dataWithNulls, 'salary')
      expect(result).toBe(true)
    })

    it('should return false for mixed type field', () => {
      const mixedData = [
        testData[0],
        { ...testData[1], salary: 'invalid' as any },
        testData[2]
      ]
      const result = AggregationUtils.isNumericField(mixedData, 'salary')
      expect(result).toBe(false)
    })

    it('should return true for empty array (default to true)', () => {
      const result = AggregationUtils.isNumericField([], 'anyField')
      expect(result).toBe(true)
    })
  })

  describe('AggregationError', () => {
    it('should be an instance of Error', () => {
      const error = new AggregationError('test message')
      expect(error).toBeInstanceOf(Error)
    })

    it('should have correct name', () => {
      const error = new AggregationError('test message')
      expect(error.name).toBe('AggregationError')
    })

    it('should preserve message', () => {
      const error = new AggregationError('test message')
      expect(error.message).toBe('test message')
    })
  })

  describe('Type Safety', () => {
    it('should preserve TypeScript type safety for field names', () => {
      // This test documents that the utilities maintain type safety
      // TypeScript should enforce that field names are valid keys of T
      const result = AggregationUtils.calculateSum(testData, 'salary')
      expect(typeof result).toBe('number')

      // This should cause a TypeScript error if uncommented:
      // AggregationUtils.calculateSum(testData, 'invalidField')
    })

    it('should handle generic types properly', () => {
      interface CustomEntity {
        value: number
        category: string
      }

      const customData: CustomEntity[] = [
        { value: 10, category: 'A' },
        { value: 20, category: 'B' },
        { value: 30, category: 'A' }
      ]

      const sum = AggregationUtils.calculateSum(customData, 'value')
      expect(sum).toBe(60)

      const distinctCategories = AggregationUtils.calculateCountDistinct(customData, 'category')
      expect(distinctCategories).toBe(2)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      // Create a large dataset
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        value: Math.floor(Math.random() * 1000),
        category: `category_${i % 10}`
      }))

      const startTime = performance.now()
      const sum = AggregationUtils.calculateSum(largeData, 'value')
      const endTime = performance.now()

      expect(typeof sum).toBe('number')
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })
  })
})