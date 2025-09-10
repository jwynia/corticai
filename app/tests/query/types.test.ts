/**
 * Tests for Query Interface Types
 * 
 * This test file follows strict TDD principles and defines the expected behavior
 * for all query interface types before implementation.
 */

import { describe, it, expect, test } from 'vitest'

import { 
  Query,
  QueryResult,
  QueryMetadata,
  Condition,
  EqualityCondition,
  ComparisonCondition,
  CompositeCondition,
  PatternCondition,
  OrderBy,
  Pagination,
  QueryError,
  QueryErrorCode,
  validateQuery,
  validateCondition,
  isEqualityCondition,
  isComparisonCondition,
  isPatternCondition,
  isCompositeCondition
} from '../../src/query/types'

describe('Query Interface Types', () => {
  describe('Query<T> interface', () => {
    it('should have all required properties', () => {
      const query: Query<{ name: string; age: number }> = {
        conditions: [],
        ordering: []
      }
      expect(query.conditions).toBeDefined()
      expect(query.ordering).toBeDefined()
      expect(Array.isArray(query.conditions)).toBe(true)
      expect(Array.isArray(query.ordering)).toBe(true)
    })

    it('should support generic type parameter', () => {
      interface TestEntity {
        id: string
        name: string
        active: boolean
      }
      
      const query: Query<TestEntity> = {
        conditions: [{
          type: 'equality',
          field: 'name', // Should be typed as keyof TestEntity
          operator: '=',
          value: 'test'
        }],
        ordering: [{
          field: 'id', // Should be typed as keyof TestEntity
          direction: 'asc'
        }]
      }
      
      expect(query.conditions[0].field).toBe('name')
      expect(query.ordering[0].field).toBe('id')
    })

    it('should support optional properties correctly', () => {
      const query: Query<{ name: string }> = {
        conditions: [],
        ordering: [],
        pagination: { limit: 10, offset: 0 },
        grouping: { fields: ['name'] },
        aggregations: [{ type: 'count', alias: 'total' }]
      }
      
      expect(query.pagination).toBeDefined()
      expect(query.grouping).toBeDefined()
      expect(query.aggregations).toBeDefined()
    })
  })

  describe('Condition types', () => {
    describe('EqualityCondition', () => {
      it('should support equality operations', () => {
        const equalCondition: EqualityCondition<{ name: string; age: number }> = {
          type: 'equality',
          field: 'name',
          operator: '=',
          value: 'John'
        }
        
        const notEqualCondition: EqualityCondition<{ name: string; age: number }> = {
          type: 'equality',
          field: 'age',
          operator: '!=',
          value: 25
        }
        
        expect(isEqualityCondition(equalCondition)).toBe(true)
        expect(isEqualityCondition(notEqualCondition)).toBe(true)
        expect(equalCondition.operator).toBe('=')
        expect(notEqualCondition.operator).toBe('!=')
      })

      it('should be type-safe with field references', () => {
        interface TestEntity {
          id: string
          name: string
          active: boolean
        }
        
        const condition: EqualityCondition<TestEntity> = {
          type: 'equality',
          field: 'name', // TypeScript should enforce this is keyof TestEntity
          operator: '=',
          value: 'test'
        }
        
        expect(condition.field).toBe('name')
        expect(typeof condition.value).toBe('string')
      })
    })



  })





})

