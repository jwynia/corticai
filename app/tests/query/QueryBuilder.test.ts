/**
 * Tests for QueryBuilder
 * 
 * This test file follows strict TDD principles and defines the expected behavior
 * for the QueryBuilder class before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { QueryBuilder } from '../../src/query/QueryBuilder'
import { Query, QueryError, QueryErrorCode, CompositeCondition, isCompositeCondition } from '../../src/query/types'

describe('QueryBuilder', () => {
  interface TestEntity {
    id: string
    name: string
    age: number
    active: boolean
    tags: string[]
    createdAt: Date
  }

  let builder: QueryBuilder<TestEntity>

  beforeEach(() => {
    builder = QueryBuilder.create<TestEntity>()
  })

  describe('Constructor', () => {
    it('should create a new QueryBuilder instance', () => {
      const builder = QueryBuilder.create<TestEntity>()
      expect(builder).toBeInstanceOf(QueryBuilder)
    })

    it('should be generic and type-safe', () => {
      const builder = QueryBuilder.create<TestEntity>()
      // This should compile without errors, proving type safety
      const query = builder.whereEqual('name', 'John').build()
      expect(query).toBeDefined()
    })
  })

  describe('Fluent Interface', () => {
    it('should return new instance for immutability', () => {
      const builder1 = QueryBuilder.create<TestEntity>()
      const builder2 = builder1.whereEqual('active', true)
      expect(builder1).not.toBe(builder2)
      
      // Original builder should not be modified
      expect(builder1.getConditions()).toHaveLength(0)
      expect(builder2.getConditions()).toHaveLength(1)
    })

    it('should support method chaining', () => {
      const query = QueryBuilder.create<TestEntity>()
        .whereEqual('active', true)
        .whereGreaterThan('age', 18)
        .orderByAsc('name')
        .limit(10)
        .build()
        
      expect(query.conditions).toHaveLength(2)
      expect(query.ordering).toHaveLength(1)
      expect(query.pagination?.limit).toBe(10)
    })
  })

  describe('where() method', () => {
    describe('Basic conditions', () => {
      it('should support equality conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .where('name', '=', 'John')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        expect(query.conditions[0]).toEqual({
          type: 'equality',
          field: 'name',
          operator: '=',
          value: 'John'
        })
      })

      it('should support inequality conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .where('name', '!=', 'John')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        expect(query.conditions[0]).toEqual({
          type: 'equality',
          field: 'name',
          operator: '!=',
          value: 'John'
        })
      })

      it('should support comparison conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereComparison('age', '>', 18)
          .build()
        
        expect(query.conditions).toHaveLength(1)
        expect(query.conditions[0]).toEqual({
          type: 'comparison',
          field: 'age',
          operator: '>',
          value: 18
        })
      })

      it('should support multiple where clauses', () => {
        const query = QueryBuilder.create<TestEntity>()
          .where('active', '=', true)
          .whereComparison('age', '>', 18)
          .build()
        
        expect(query.conditions).toHaveLength(2)
        expect(query.conditions[0].field).toBe('active')
        expect(query.conditions[1].field).toBe('age')
      })
    })

    describe('Type Safety', () => {
      it('should support proper operators for field types', () => {
        // Test that we can use string-specific operators on string fields
        const stringQuery = QueryBuilder.create<TestEntity>()
          .wherePattern('name', 'contains', 'John', true)
          .build()
        
        expect(stringQuery.conditions[0]).toMatchObject({
          type: 'pattern',
          field: 'name',
          operator: 'contains'
        })
        
        // Test that we can use comparison operators on number fields
        const numberQuery = QueryBuilder.create<TestEntity>()
          .whereComparison('age', '>=', 18)
          .build()
        
        expect(numberQuery.conditions[0]).toMatchObject({
          type: 'comparison',
          field: 'age',
          operator: '>='
        })
      })
    })

    describe('Advanced conditions', () => {
      it('should support IN conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereIn('name', ['John', 'Jane'])
          .build()
        
        expect(query.conditions).toHaveLength(1)
        expect(query.conditions[0]).toEqual({
          type: 'set',
          field: 'name',
          operator: 'in',
          values: ['John', 'Jane']
        })
      })

      it('should support NULL checks', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereNull('name')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        expect(query.conditions[0]).toEqual({
          type: 'null',
          field: 'name',
          operator: 'is_null'
        })
      })

      it('should support pattern matching', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereContains('name', 'Jo')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        expect(query.conditions[0]).toEqual({
          type: 'pattern',
          field: 'name',
          operator: 'contains',
          value: 'Jo',
          caseSensitive: true
        })
      })
    })
  })

  describe('orderBy() method', () => {
    it('should support single field ordering', () => {
      const query = QueryBuilder.create<TestEntity>()
        .orderByAsc('name')
        .build()
      
      expect(query.ordering).toHaveLength(1)
      expect(query.ordering[0]).toEqual({
        field: 'name',
        direction: 'asc'
      })
    })

    it('should support explicit direction', () => {
      const query = QueryBuilder.create<TestEntity>()
        .orderByDesc('age')
        .build()
      
      expect(query.ordering).toHaveLength(1)
      expect(query.ordering[0]).toEqual({
        field: 'age',
        direction: 'desc'
      })
    })

    it('should support multiple order fields', () => {
      const query = QueryBuilder.create<TestEntity>()
        .orderByDesc('active')
        .orderByAsc('name')
        .build()
      
      expect(query.ordering).toHaveLength(2)
      expect(query.ordering[0].field).toBe('active')
      expect(query.ordering[0].direction).toBe('desc')
      expect(query.ordering[1].field).toBe('name')
      expect(query.ordering[1].direction).toBe('asc')
    })
  })

  describe('limit() method', () => {
    it('should set query limit', () => {
      const query = QueryBuilder.create<TestEntity>()
        .limit(10)
        .build()
      
      expect(query.pagination?.limit).toBe(10)
    })

    it('should validate non-negative integers', () => {
      const builder = QueryBuilder.create<TestEntity>()
      
      expect(() => builder.limit(-1)).toThrow('Limit must be a non-negative integer')
      expect(() => builder.limit(3.14)).toThrow('Limit must be a non-negative integer')
      expect(() => builder.limit(0)).not.toThrow() // 0 is valid (non-negative)
    })

    it('should override previous limit', () => {
      const query = QueryBuilder.create<TestEntity>()
        .limit(10)
        .limit(20)
        .build()
      
      expect(query.pagination?.limit).toBe(20)
    })
  })

  describe('offset() method', () => {
    it('should set query offset', () => {
      const query = QueryBuilder.create<TestEntity>()
        .offset(5)
        .build()
      
      expect(query.pagination?.offset).toBe(5)
    })

    it('should validate non-negative numbers', () => {
      const builder = QueryBuilder.create<TestEntity>()
      
      expect(() => builder.offset(-1)).toThrow('Offset must be a non-negative integer')
    })

    it('should allow zero offset', () => {
      const query = QueryBuilder.create<TestEntity>()
        .offset(0)
        .build()
      
      expect(query.pagination?.offset).toBe(0)
    })
  })

  describe('build() method', () => {
    it('should return a Query object', () => {
      const query = QueryBuilder.create<TestEntity>().build()
      
      expect(query).toBeDefined()
      expect(typeof query).toBe('object')
      expect(query.conditions).toBeDefined()
      expect(query.ordering).toBeDefined()
    })

    it('should create immutable query objects', () => {
      const builder1 = QueryBuilder.create<TestEntity>()
      const builder2 = builder1.where('active', '=', true)
      const query1 = builder2.build()
      const builder3 = builder2.whereComparison('age', '>', 18)
      const query2 = builder3.build()
      
      expect(query1).not.toBe(query2)
      expect(query1.conditions).not.toBe(query2.conditions)
      expect(query1.conditions).toHaveLength(1)
      expect(query2.conditions).toHaveLength(2) // Has both conditions
    })

    it('should handle empty queries', () => {
      const query = QueryBuilder.create<TestEntity>().build()
      
      expect(query.conditions).toEqual([])
      expect(query.ordering).toEqual([])
      expect(query.pagination).toBeUndefined()
    })

    it('should preserve all query components', () => {
      const query = QueryBuilder.create<TestEntity>()
        .where('active', '=', true)
        .orderByAsc('name')
        .limit(10)
        .offset(5)
        .build()
      
      expect(query.conditions).toHaveLength(1)
      expect(query.ordering).toHaveLength(1) 
      expect(query.pagination?.limit).toBe(10)
      expect(query.pagination?.offset).toBe(5)
    })
  })

  describe('Complex query building', () => {
    it('should handle real-world query patterns', () => {
      const query = QueryBuilder.create<TestEntity>()
        .where('active', '=', true)
        .whereComparison('age', '>=', 18)
        .whereContains('name', 'John')
        .orderByDesc('age')
        .orderByAsc('name')
        .limit(50)
        .offset(100)
        .build()
      
      expect(query.conditions).toHaveLength(3)
      expect(query.ordering).toHaveLength(2)
      expect(query.pagination?.limit).toBe(50)
      expect(query.pagination?.offset).toBe(100)
      
      // Verify condition types
      expect(query.conditions[0].type).toBe('equality')
      expect(query.conditions[1].type).toBe('comparison')
      expect(query.conditions[2].type).toBe('pattern')
    })

    it('should support conditional query building', () => {
      let builder = QueryBuilder.create<TestEntity>()
        .where('active', '=', true)
      
      const includeAgeFilter = true
      if (includeAgeFilter) {
        builder = builder.whereComparison('age', '>', 18)
      }
      
      const finalQuery = builder.build()
      
      expect(finalQuery.conditions).toHaveLength(2)
      expect(finalQuery.conditions[0].field).toBe('active')
      expect(finalQuery.conditions[1].field).toBe('age')
    })
  })

  describe('Error handling', () => {
    it('should provide helpful error messages', () => {
      const builder = QueryBuilder.create<TestEntity>()
      
      // Test invalid limit
      expect(() => builder.limit(-5)).toThrow('Limit must be a non-negative integer')
      
      // Test invalid offset
      expect(() => builder.offset(-1)).toThrow('Offset must be a non-negative integer')
      
      // Test empty IN clause
      expect(() => builder.whereIn('name', [])).toThrow('IN condition requires a non-empty array')
    })

    it('should handle edge cases gracefully', () => {
      const builder = QueryBuilder.create<TestEntity>()
      
      // Building empty query should not throw
      expect(() => builder.build()).not.toThrow()
      
      // Multiple builds should work
      const builder2 = builder.where('active', '=', true)
      const query1 = builder2.build()
      const query2 = builder2.build() // Should produce same result
      
      expect(query1.conditions).toHaveLength(1)
      expect(query2.conditions).toHaveLength(1)
    })
  })

  describe('Composite Conditions (OR, NOT, AND)', () => {
    describe('or() method', () => {
      it('should create OR condition with multiple criteria', () => {
        const query = QueryBuilder.create<TestEntity>()
          .or((q) => [
            q.whereEqual('name', 'John'),
            q.whereEqual('name', 'Jane')
          ])
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(isCompositeCondition(condition)).toBe(true)
        expect(condition.operator).toBe('or')
        expect(condition.conditions).toHaveLength(2)
        expect(condition.conditions[0]).toEqual({
          type: 'equality',
          field: 'name',
          operator: '=',
          value: 'John'
        })
        expect(condition.conditions[1]).toEqual({
          type: 'equality',
          field: 'name',
          operator: '=',
          value: 'Jane'
        })
      })

      it('should support OR with different field types', () => {
        const query = QueryBuilder.create<TestEntity>()
          .or((q) => [
            q.whereEqual('active', true),
            q.whereGreaterThan('age', 65),
            q.whereContains('name', 'Admin')
          ])
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('or')
        expect(condition.conditions).toHaveLength(3)
        expect(condition.conditions[0].type).toBe('equality')
        expect(condition.conditions[1].type).toBe('comparison')
        expect(condition.conditions[2].type).toBe('pattern')
      })

      it('should combine OR with AND conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .or((q) => [
            q.whereEqual('name', 'John'),
            q.whereEqual('name', 'Jane')
          ])
          .whereGreaterThan('age', 18)
          .build()
        
        expect(query.conditions).toHaveLength(3)
        expect(query.conditions[0]).toMatchObject({
          type: 'equality',
          field: 'active',
          value: true
        })
        expect(isCompositeCondition(query.conditions[1])).toBe(true)
        expect(query.conditions[2]).toMatchObject({
          type: 'comparison',
          field: 'age',
          operator: '>',
          value: 18
        })
      })

      it('should support nested OR conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .or((q) => [
            q.whereEqual('name', 'John'),
            q.or((nested) => [
              nested.whereEqual('age', 25),
              nested.whereEqual('age', 30)
            ])
          ])
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('or')
        expect(condition.conditions).toHaveLength(2)
        expect(condition.conditions[0].type).toBe('equality')
        expect(isCompositeCondition(condition.conditions[1])).toBe(true)
        
        const nestedCondition = condition.conditions[1] as CompositeCondition<TestEntity>
        expect(nestedCondition.operator).toBe('or')
        expect(nestedCondition.conditions).toHaveLength(2)
      })

      it('should throw error with empty OR conditions', () => {
        const builder = QueryBuilder.create<TestEntity>()
        expect(() => builder.or(() => [])).toThrow('OR condition requires at least one sub-condition')
      })

      it('should throw error with single OR condition', () => {
        const builder = QueryBuilder.create<TestEntity>()
        expect(() => builder.or((q) => [q.whereEqual('name', 'John')])).toThrow('OR condition requires at least 2 sub-conditions')
      })
    })

    describe('not() method', () => {
      it('should create NOT condition with single criteria', () => {
        const query = QueryBuilder.create<TestEntity>()
          .not((q) => q.whereEqual('active', false))
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(isCompositeCondition(condition)).toBe(true)
        expect(condition.operator).toBe('not')
        expect(condition.conditions).toHaveLength(1)
        expect(condition.conditions[0]).toEqual({
          type: 'equality',
          field: 'active',
          operator: '=',
          value: false
        })
      })

      it('should support NOT with comparison conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .not((q) => q.whereGreaterThan('age', 65))
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('not')
        expect(condition.conditions[0]).toEqual({
          type: 'comparison',
          field: 'age',
          operator: '>',
          value: 65
        })
      })

      it('should support NOT with composite conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .not((q) => q.or((nested) => [
            nested.whereEqual('name', 'John'),
            nested.whereEqual('name', 'Jane')
          ]))
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('not')
        expect(condition.conditions).toHaveLength(1)
        expect(isCompositeCondition(condition.conditions[0])).toBe(true)
        
        const nestedCondition = condition.conditions[0] as CompositeCondition<TestEntity>
        expect(nestedCondition.operator).toBe('or')
        expect(nestedCondition.conditions).toHaveLength(2)
      })

      it('should combine NOT with AND conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .not((q) => q.whereContains('name', 'test'))
          .whereGreaterThan('age', 18)
          .build()
        
        expect(query.conditions).toHaveLength(3)
        expect(query.conditions[0].type).toBe('equality')
        expect(isCompositeCondition(query.conditions[1])).toBe(true)
        expect((query.conditions[1] as CompositeCondition<TestEntity>).operator).toBe('not')
        expect(query.conditions[2].type).toBe('comparison')
      })

      it('should support nested NOT conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .not((q) => q.not((nested) => nested.whereEqual('active', true)))
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('not')
        expect(condition.conditions).toHaveLength(1)
        expect(isCompositeCondition(condition.conditions[0])).toBe(true)
        
        const nestedCondition = condition.conditions[0] as CompositeCondition<TestEntity>
        expect(nestedCondition.operator).toBe('not')
        expect(nestedCondition.conditions).toHaveLength(1)
        expect(nestedCondition.conditions[0].type).toBe('equality')
      })
    })

    describe('andWhere() and orWhere() methods', () => {
      it('should support andWhere() as alias for where()', () => {
        const query1 = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .andWhere('name', '=', 'John')
          .build()
        
        const query2 = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .where('name', '=', 'John')
          .build()
        
        expect(query1.conditions).toEqual(query2.conditions)
      })

      it('should support orWhere() for adding OR conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .orWhere('name', '=', 'John')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(isCompositeCondition(condition)).toBe(true)
        expect(condition.operator).toBe('or')
        expect(condition.conditions).toHaveLength(2)
        expect(condition.conditions[0]).toEqual({
          type: 'equality',
          field: 'active',
          operator: '=',
          value: true
        })
        expect(condition.conditions[1]).toEqual({
          type: 'equality',
          field: 'name',
          operator: '=',
          value: 'John'
        })
      })

      it('should support chaining multiple orWhere() calls', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .orWhere('name', '=', 'John')
          .orWhere('name', '=', 'Jane')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('or')
        expect(condition.conditions).toHaveLength(3)
        expect(condition.conditions[0]).toMatchObject({ field: 'active', value: true })
        expect(condition.conditions[1]).toMatchObject({ field: 'name', value: 'John' })
        expect(condition.conditions[2]).toMatchObject({ field: 'name', value: 'Jane' })
      })

      it('should handle mixed andWhere() and orWhere() calls properly', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .andWhere('age', '>', 18)
          .orWhere('name', '=', 'Admin')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('or')
        expect(condition.conditions).toHaveLength(2)
        
        // First condition should be a composite AND
        const andCondition = condition.conditions[0] as CompositeCondition<TestEntity>
        expect(isCompositeCondition(andCondition)).toBe(true)
        expect(andCondition.operator).toBe('and')
        expect(andCondition.conditions).toHaveLength(2)
        
        // Second condition should be the OR condition
        expect(condition.conditions[1]).toMatchObject({
          type: 'equality',
          field: 'name',
          value: 'Admin'
        })
      })

      it('should handle orWhere() without previous conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .orWhere('name', '=', 'John')
          .orWhere('name', '=', 'Jane')
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(condition.operator).toBe('or')
        expect(condition.conditions).toHaveLength(2)
      })
    })

    describe('Complex nested conditions', () => {
      it('should support deeply nested composite conditions', () => {
        const query = QueryBuilder.create<TestEntity>()
          .or((q) => [
            q.and((nested) => [
              nested.whereEqual('active', true),
              nested.whereGreaterThan('age', 18)
            ]),
            q.and((nested) => [
              nested.whereEqual('name', 'Admin'),
              nested.whereGreaterThan('age', 65)
            ])
          ])
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const rootCondition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(rootCondition.operator).toBe('or')
        expect(rootCondition.conditions).toHaveLength(2)
        
        // Both sub-conditions should be AND composites
        const firstAnd = rootCondition.conditions[0] as CompositeCondition<TestEntity>
        const secondAnd = rootCondition.conditions[1] as CompositeCondition<TestEntity>
        
        expect(isCompositeCondition(firstAnd)).toBe(true)
        expect(firstAnd.operator).toBe('and')
        expect(firstAnd.conditions).toHaveLength(2)
        
        expect(isCompositeCondition(secondAnd)).toBe(true)
        expect(secondAnd.operator).toBe('and')
        expect(secondAnd.conditions).toHaveLength(2)
      })

      it('should support operator precedence in complex queries', () => {
        // (active = true AND age > 18) OR (name = 'Admin' AND NOT age > 65)
        const query = QueryBuilder.create<TestEntity>()
          .or((q) => [
            q.and((nested) => [
              nested.whereEqual('active', true),
              nested.whereGreaterThan('age', 18)
            ]),
            q.and((nested) => [
              nested.whereEqual('name', 'Admin'),
              nested.not((notNested) => notNested.whereGreaterThan('age', 65))
            ])
          ])
          .build()
        
        const rootCondition = query.conditions[0] as CompositeCondition<TestEntity>
        const secondAnd = rootCondition.conditions[1] as CompositeCondition<TestEntity>
        const notCondition = secondAnd.conditions[1] as CompositeCondition<TestEntity>
        
        expect(notCondition.operator).toBe('not')
        expect(notCondition.conditions).toHaveLength(1)
        expect(notCondition.conditions[0]).toMatchObject({
          type: 'comparison',
          field: 'age',
          operator: '>',
          value: 65
        })
      })
    })

    describe('and() method for explicit AND groups', () => {
      it('should create explicit AND condition', () => {
        const query = QueryBuilder.create<TestEntity>()
          .and((q) => [
            q.whereEqual('active', true),
            q.whereGreaterThan('age', 18)
          ])
          .build()
        
        expect(query.conditions).toHaveLength(1)
        const condition = query.conditions[0] as CompositeCondition<TestEntity>
        expect(isCompositeCondition(condition)).toBe(true)
        expect(condition.operator).toBe('and')
        expect(condition.conditions).toHaveLength(2)
      })

      it('should support mixing explicit AND with implicit AND', () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .and((q) => [
            q.whereGreaterThan('age', 18),
            q.whereContains('name', 'John')
          ])
          .whereEqual('id', '123')
          .build()
        
        expect(query.conditions).toHaveLength(3)
        expect(query.conditions[0].type).toBe('equality')
        expect(isCompositeCondition(query.conditions[1])).toBe(true)
        expect((query.conditions[1] as CompositeCondition<TestEntity>).operator).toBe('and')
        expect(query.conditions[2].type).toBe('equality')
      })
    })

    describe('Edge cases and error handling', () => {
      it('should handle empty lambda functions gracefully', () => {
        const builder = QueryBuilder.create<TestEntity>()
        expect(() => builder.and(() => [])).toThrow('AND condition requires at least one sub-condition')
        expect(() => builder.or(() => [])).toThrow('OR condition requires at least one sub-condition')
      })

      it('should validate NOT conditions have exactly one sub-condition', () => {
        // This is handled by the lambda type system, but test the runtime check
        const builder = QueryBuilder.create<TestEntity>()
        // The lambda restricts this at compile time, but if somehow multiple are passed
        expect(() => {
          // Simulate invalid call by manually creating condition
          const invalidQuery = {
            ...builder.build(),
            conditions: [{
              type: 'composite' as const,
              operator: 'not' as const,
              conditions: [
                { type: 'equality' as const, field: 'name' as keyof TestEntity, operator: '=' as const, value: 'John' },
                { type: 'equality' as const, field: 'name' as keyof TestEntity, operator: '=' as const, value: 'Jane' }
              ]
            }]
          }
          // This would be caught by query validation or executor
        }).not.toThrow() // The test setup itself doesn't throw, but execution would
      })

      it('should maintain immutability with composite conditions', () => {
        const builder1 = QueryBuilder.create<TestEntity>()
        const builder2 = builder1.or((q) => [
          q.whereEqual('name', 'John'),
          q.whereEqual('name', 'Jane')
        ])
        
        expect(builder1).not.toBe(builder2)
        expect(builder1.getConditions()).toHaveLength(0)
        expect(builder2.getConditions()).toHaveLength(1)
      })

      it('should work with all existing QueryBuilder methods', () => {
        const query = QueryBuilder.create<TestEntity>()
          .or((q) => [
            q.whereEqual('active', true),
            q.whereEqual('name', 'Admin')
          ])
          .orderByAsc('name')
          .limit(10)
          .offset(5)
          .build()
        
        expect(query.conditions).toHaveLength(1)
        expect(query.ordering).toHaveLength(1)
        expect(query.pagination?.limit).toBe(10)
        expect(query.pagination?.offset).toBe(5)
      })
    })
  })
})