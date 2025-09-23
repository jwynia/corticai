/**
 * Tests for QueryBuilder Depth Support
 *
 * Test-driven implementation of depth-aware query functionality.
 * These tests define the behavior before implementation.
 */

import { describe, it, expect } from 'vitest'
import { QueryBuilder } from '../../src/query/QueryBuilder'
import { ContextDepth } from '../../src/types/context'
import { Query } from '../../src/query/types'

describe('QueryBuilder Depth Support', () => {
  describe('withDepth method', () => {
    it('should add depth parameter to query', () => {
      const query = QueryBuilder.create<any>()
        .where('id', '=', 'test-id')
        .withDepth(ContextDepth.SIGNATURE)
        .build()

      expect(query.depth).toBe(ContextDepth.SIGNATURE)
    })

    it('should support all depth levels', () => {
      const signatureQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.SIGNATURE)
        .build()
      expect(signatureQuery.depth).toBe(ContextDepth.SIGNATURE)

      const structureQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.STRUCTURE)
        .build()
      expect(structureQuery.depth).toBe(ContextDepth.STRUCTURE)

      const semanticQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.SEMANTIC)
        .build()
      expect(semanticQuery.depth).toBe(ContextDepth.SEMANTIC)

      const detailedQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.DETAILED)
        .build()
      expect(detailedQuery.depth).toBe(ContextDepth.DETAILED)

      const historicalQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.HISTORICAL)
        .build()
      expect(historicalQuery.depth).toBe(ContextDepth.HISTORICAL)
    })

    it('should validate depth values', () => {
      expect(() => {
        QueryBuilder.create<any>()
          .withDepth(0 as any)
          .build()
      }).toThrow('Invalid depth value: 0')

      expect(() => {
        QueryBuilder.create<any>()
          .withDepth(6 as any)
          .build()
      }).toThrow('Invalid depth value: 6')

      expect(() => {
        QueryBuilder.create<any>()
          .withDepth(null as any)
          .build()
      }).toThrow('Invalid depth value: null')
    })

    it('should allow depth to be changed', () => {
      const builder = QueryBuilder.create<any>()
        .where('type', '=', 'document')
        .withDepth(ContextDepth.SIGNATURE)

      const query1 = builder.build()
      expect(query1.depth).toBe(ContextDepth.SIGNATURE)

      const query2 = builder.withDepth(ContextDepth.DETAILED).build()
      expect(query2.depth).toBe(ContextDepth.DETAILED)

      // Original query should be unchanged (immutability)
      expect(query1.depth).toBe(ContextDepth.SIGNATURE)
    })
  })

  describe('depth with other query operations', () => {
    it('should work with where conditions', () => {
      const query = QueryBuilder.create<any>()
        .where('type', '=', 'document')
        .where('name', 'like', '%test%')
        .withDepth(ContextDepth.SEMANTIC)
        .build()

      expect(query.conditions).toHaveLength(2)
      expect(query.depth).toBe(ContextDepth.SEMANTIC)
    })

    it('should work with ordering', () => {
      const query = QueryBuilder.create<any>()
        .orderBy('name', 'asc')
        .withDepth(ContextDepth.STRUCTURE)
        .build()

      expect(query.ordering).toHaveLength(1)
      expect(query.ordering[0].field).toBe('name')
      expect(query.depth).toBe(ContextDepth.STRUCTURE)
    })

    it('should work with pagination', () => {
      const query = QueryBuilder.create<any>()
        .limit(10)
        .offset(20)
        .withDepth(ContextDepth.DETAILED)
        .build()

      expect(query.pagination?.limit).toBe(10)
      expect(query.pagination?.offset).toBe(20)
      expect(query.depth).toBe(ContextDepth.DETAILED)
    })

    it('should work with projection', () => {
      const query = QueryBuilder.create<any>()
        .select('id', 'name', 'type')
        .withDepth(ContextDepth.SIGNATURE)
        .build()

      expect(query.projection?.fields).toEqual(['id', 'name', 'type'])
      expect(query.depth).toBe(ContextDepth.SIGNATURE)
    })
  })

  describe('depth inheritance and defaults', () => {
    it('should have no depth by default', () => {
      const query = QueryBuilder.create<any>()
        .where('id', '=', 'test')
        .build()

      expect(query.depth).toBeUndefined()
    })

    it('should maintain depth through chaining', () => {
      const query = QueryBuilder.create<any>()
        .withDepth(ContextDepth.SEMANTIC)
        .where('type', '=', 'document')
        .orderBy('name', 'asc')
        .limit(5)
        .build()

      expect(query.depth).toBe(ContextDepth.SEMANTIC)
      expect(query.conditions).toHaveLength(1)
      expect(query.ordering).toHaveLength(1)
      expect(query.pagination?.limit).toBe(5)
    })
  })

  describe('depth for performance optimization', () => {
    it('should provide performance hints in query metadata', () => {
      const query = QueryBuilder.create<any>()
        .where('type', '=', 'document')
        .withDepth(ContextDepth.SIGNATURE)
        .build()

      expect(query.depth).toBe(ContextDepth.SIGNATURE)
      expect(query.performanceHints?.expectedMemoryReduction).toBe(true)
      expect(query.performanceHints?.optimizedFields).toEqual(['id', 'type', 'name'])
    })

    it('should indicate no optimization for full depth', () => {
      const query = QueryBuilder.create<any>()
        .where('type', '=', 'document')
        .withDepth(ContextDepth.HISTORICAL)
        .build()

      expect(query.depth).toBe(ContextDepth.HISTORICAL)
      expect(query.performanceHints?.expectedMemoryReduction).toBe(false)
    })

    it('should calculate estimated memory factor', () => {
      const signatureQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.SIGNATURE)
        .build()
      expect(signatureQuery.performanceHints?.estimatedMemoryFactor).toBe(0.05)

      const structureQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.STRUCTURE)
        .build()
      expect(structureQuery.performanceHints?.estimatedMemoryFactor).toBe(0.2)

      const historicalQuery = QueryBuilder.create<any>()
        .withDepth(ContextDepth.HISTORICAL)
        .build()
      expect(historicalQuery.performanceHints?.estimatedMemoryFactor).toBe(1.5)
    })
  })

  describe('depth validation in complex queries', () => {
    it('should validate depth with grouping', () => {
      const query = QueryBuilder.create<any>()
        .where('type', '=', 'document')
        .groupBy('category')
        .withDepth(ContextDepth.SEMANTIC)
        .build()

      expect(query.depth).toBe(ContextDepth.SEMANTIC)
      expect(query.grouping?.fields).toEqual(['category'])
    })

    it('should validate depth with having clauses', () => {
      const query = QueryBuilder.create<any>()
        .where('type', '=', 'document')
        .groupBy('category')
        .having('total', '>', 5)
        .withDepth(ContextDepth.STRUCTURE)
        .build()

      expect(query.depth).toBe(ContextDepth.STRUCTURE)
      expect(query.having).toBeDefined()
    })
  })
})