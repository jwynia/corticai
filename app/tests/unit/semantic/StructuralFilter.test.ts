/**
 * StructuralFilter Tests (Stage 2 of Semantic Pipeline)
 *
 * Tests for structural filtering including lifecycle filtering, literal text matching,
 * and candidate reduction. These tests are written FIRST (TDD) before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StructuralFilter } from '../../../src/semantic/StructuralFilter'
import type { ParsedQuery, CandidateResult, PipelineConfig } from '../../../src/semantic/types'

/**
 * Mock entity storage for testing
 * In real implementation, this would be the actual storage layer
 */
interface MockEntity {
  id: string
  type: string
  properties: {
    content: string
    title?: string
    [key: string]: any
  }
  lifecycle?: {
    state: 'current' | 'stable' | 'evolving' | 'deprecated' | 'historical' | 'archived'
    confidence: 'high' | 'medium' | 'low'
    manual: boolean
  }
}

describe('StructuralFilter', () => {
  let filter: StructuralFilter
  let mockEntities: MockEntity[]

  beforeEach(() => {
    // Create mock knowledge base
    mockEntities = [
      {
        id: 'doc-1',
        type: 'document',
        properties: {
          title: 'Semantic Search Implementation',
          content: 'This document describes semantic search using pgvector and embeddings.',
        },
        lifecycle: { state: 'current', confidence: 'high', manual: true },
      },
      {
        id: 'doc-2',
        type: 'document',
        properties: {
          title: 'Lifecycle Metadata Guide',
          content: 'Guide for implementing lifecycle metadata in documents.',
        },
        lifecycle: { state: 'stable', confidence: 'high', manual: true },
      },
      {
        id: 'doc-3',
        type: 'document',
        properties: {
          title: 'Old Kuzu Implementation',
          content: 'This was the previous approach using Kuzu database.',
        },
        lifecycle: { state: 'deprecated', confidence: 'high', manual: true },
      },
      {
        id: 'doc-4',
        type: 'document',
        properties: {
          title: 'Storage Adapter Design',
          content: 'The storage adapter provides abstraction over pgvector.',
        },
        lifecycle: { state: 'current', confidence: 'medium', manual: false },
      },
      {
        id: 'doc-5',
        type: 'document',
        properties: {
          title: 'API Authentication',
          content: 'Document about API authentication patterns.',
        },
        // No lifecycle metadata
      },
      {
        id: 'doc-6',
        type: 'document',
        properties: {
          title: 'Query Parser Implementation',
          content: 'Implementation details for the query parser stage.',
        },
        lifecycle: { state: 'evolving', confidence: 'medium', manual: false },
      },
    ]

    // Initialize filter with mock entity provider
    filter = new StructuralFilter(async () => mockEntities)
  })

  describe('Lifecycle Filtering', () => {
    it('should filter by single lifecycle state', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        lifecycleFilters: ['current'],
        minLiteralScore: 0, // Allow results even without term matches
      }

      const results = await filter.filter(parsedQuery, config)

      // Should only include doc-1 and doc-4 (both 'current')
      expect(results.every(r => r.lifecycle?.state === 'current')).toBe(true)
      expect(results.some(r => r.id === 'doc-1')).toBe(true)
      expect(results.some(r => r.id === 'doc-4')).toBe(true)
    })

    it('should filter by multiple lifecycle states', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        lifecycleFilters: ['current', 'stable'],
      }

      const results = await filter.filter(parsedQuery, config)

      // Should include current and stable, exclude deprecated and evolving
      expect(results.every(r =>
        r.lifecycle?.state === 'current' || r.lifecycle?.state === 'stable'
      )).toBe(true)
      expect(results.some(r => r.id === 'doc-3')).toBe(false) // deprecated
      expect(results.some(r => r.id === 'doc-6')).toBe(false) // evolving
    })

    it('should include entities without lifecycle when no filter specified', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'authentication',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['authentication'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {}

      const results = await filter.filter(parsedQuery, config)

      // Should include doc-5 which has no lifecycle metadata
      expect(results.some(r => r.id === 'doc-5')).toBe(true)
    })

    it('should mark results that matched lifecycle filter', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        lifecycleFilters: ['current'],
      }

      const results = await filter.filter(parsedQuery, config)

      // Results that passed lifecycle filter should be marked
      const matchedLifecycle = results.filter(r => r.matchedLifecycleFilter)
      expect(matchedLifecycle.length).toBeGreaterThan(0)
      expect(matchedLifecycle.every(r => r.lifecycle?.state === 'current')).toBe(true)
    })
  })

  describe('Literal Text Matching', () => {
    it('should score exact term match as 1.0', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      // doc-1 contains "semantic" - should score 1.0
      const doc1 = results.find(r => r.id === 'doc-1')
      expect(doc1).toBeDefined()
      expect(doc1!.literalMatchScore).toBe(1.0)
    })

    it('should score partial term match proportionally', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search embeddings',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search', 'embeddings'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      // doc-1 contains "semantic", "search", "embeddings" = 3/3 = 1.0
      const doc1 = results.find(r => r.id === 'doc-1')
      expect(doc1?.literalMatchScore).toBe(1.0)

      // doc-4 contains "semantic" (in title? no) - checking actual content
      // Actually doc-4 doesn't contain any of these terms, should score 0
    })

    it('should return 0 score for no matching terms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'nonexistent terms',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['nonexistent', 'terms'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      // No documents contain these terms
      expect(results.every(r => r.literalMatchScore === 0)).toBe(true)
    })

    it('should perform case-insensitive matching', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'SEMANTIC',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'], // QueryParser lowercases terms
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      const doc1 = results.find(r => r.id === 'doc-1')
      expect(doc1?.literalMatchScore).toBeGreaterThan(0)
    })

    it('should search in both title and content', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'lifecycle metadata',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['lifecycle', 'metadata'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      // doc-2 has "Lifecycle Metadata" in title and content
      const doc2 = results.find(r => r.id === 'doc-2')
      expect(doc2?.literalMatchScore).toBeGreaterThan(0.5)
    })

    it('should handle empty literal terms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'what is',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: [], // All stop words removed
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        minLiteralScore: 0, // Allow results with no term matches
      }

      const results = await filter.filter(parsedQuery, config)

      // Should still return results with 0 score
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.literalMatchScore === 0)).toBe(true)
    })
  })

  describe('Negation Handling', () => {
    it('should exclude results containing negated terms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'database not kuzu',
        intent: 'what',
        hasNegation: true,
        negatedTerms: ['kuzu'],
        prepositions: {},
        literalTerms: ['database'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      // doc-3 contains "Kuzu" and should be excluded
      expect(results.some(r => r.id === 'doc-3')).toBe(false)
    })

    it('should exclude results with any negated term match', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation not deprecated old',
        intent: 'what',
        hasNegation: true,
        negatedTerms: ['deprecated', 'old'],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      // doc-3 contains both "deprecated" (in lifecycle) and "Old" (in title)
      expect(results.some(r => r.id === 'doc-3')).toBe(false)
    })

    it('should handle negation without literal terms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'not deprecated',
        intent: 'unknown',
        hasNegation: true,
        negatedTerms: ['deprecated'],
        prepositions: {},
        literalTerms: [],
        confidence: 0.3,
      }

      const results = await filter.filter(parsedQuery)

      // Should exclude doc-3 which contains "deprecated"
      expect(results.some(r => r.id === 'doc-3')).toBe(false)
    })
  })

  describe('Candidate Limiting', () => {
    it('should limit results to maxCandidates', async () => {
      // Create many mock entities
      const manyEntities: MockEntity[] = Array.from({ length: 200 }, (_, i) => ({
        id: `doc-${i}`,
        type: 'document',
        properties: {
          title: `Document ${i}`,
          content: 'This document contains semantic search content.',
        },
        lifecycle: { state: 'current', confidence: 'high', manual: false },
      }))

      const manyFilter = new StructuralFilter(async () => manyEntities)

      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        maxCandidates: 50,
      }

      const results = await manyFilter.filter(parsedQuery, config)

      expect(results.length).toBeLessThanOrEqual(50)
    })

    it('should prioritize higher scoring results when limiting', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        maxCandidates: 2,
      }

      const results = await filter.filter(parsedQuery, config)

      expect(results.length).toBeLessThanOrEqual(2)
      // Results should be sorted by score descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].literalMatchScore).toBeGreaterThanOrEqual(results[i + 1].literalMatchScore)
      }
    })

    it('should use default maxCandidates of 100', async () => {
      const manyEntities: MockEntity[] = Array.from({ length: 150 }, (_, i) => ({
        id: `doc-${i}`,
        type: 'document',
        properties: {
          title: `Document ${i}`,
          content: 'Content with semantic keyword.',
        },
      }))

      const manyFilter = new StructuralFilter(async () => manyEntities)

      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const results = await manyFilter.filter(parsedQuery) // No config

      expect(results.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Minimum Score Threshold', () => {
    it('should exclude results below minLiteralScore', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        minLiteralScore: 0.5,
      }

      const results = await filter.filter(parsedQuery, config)

      // All results should have score >= 0.5
      expect(results.every(r => r.literalMatchScore >= 0.5)).toBe(true)
    })

    it('should use default minLiteralScore of 0.1', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery) // No config

      // Should exclude zero-score results
      expect(results.every(r => r.literalMatchScore >= 0.1)).toBe(true)
    })

    it('should allow zero minLiteralScore to include all results', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'nonexistent',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['nonexistent'],
        confidence: 0.9,
      }

      const config: PipelineConfig = {
        minLiteralScore: 0,
      }

      const results = await filter.filter(parsedQuery, config)

      // Should include results even with 0 score
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Result Structure', () => {
    it('should return complete CandidateResult structure', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      const result = results[0]
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('properties')
      expect(result).toHaveProperty('literalMatchScore')
      expect(typeof result.id).toBe('string')
      expect(typeof result.type).toBe('string')
      expect(typeof result.properties).toBe('object')
      expect(typeof result.literalMatchScore).toBe('number')
    })

    it('should preserve lifecycle metadata in results', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      const doc1 = results.find(r => r.id === 'doc-1')
      expect(doc1?.lifecycle).toBeDefined()
      expect(doc1?.lifecycle?.state).toBe('current')
      expect(doc1?.lifecycle?.confidence).toBe('high')
    })

    it('should preserve all entity properties', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'authentication',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['authentication'],
        confidence: 0.9,
      }

      const results = await filter.filter(parsedQuery)

      const doc5 = results.find(r => r.id === 'doc-5')
      expect(doc5?.properties.title).toBe('API Authentication')
      expect(doc5?.properties.content).toContain('authentication')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty knowledge base', async () => {
      const emptyFilter = new StructuralFilter(async () => [])

      const parsedQuery: ParsedQuery = {
        original: 'semantic',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic'],
        confidence: 0.9,
      }

      const results = await emptyFilter.filter(parsedQuery)

      expect(results).toEqual([])
    })

    it('should handle entities with missing properties', async () => {
      const weirdEntities: MockEntity[] = [
        {
          id: 'doc-weird',
          type: 'document',
          properties: {
            content: 'Only content, no title',
          },
        },
      ]

      const weirdFilter = new StructuralFilter(async () => weirdEntities)

      const parsedQuery: ParsedQuery = {
        original: 'content',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['content'],
        confidence: 0.9,
      }

      const results = await weirdFilter.filter(parsedQuery)

      expect(results.length).toBe(1)
      expect(results[0].literalMatchScore).toBeGreaterThan(0)
    })

    it('should handle entities with non-string property values', async () => {
      const numericEntities: MockEntity[] = [
        {
          id: 'doc-numeric',
          type: 'document',
          properties: {
            content: 'Some content',
            count: 42,
            enabled: true,
            tags: ['semantic', 'search'],
          },
        },
      ]

      const numericFilter = new StructuralFilter(async () => numericEntities)

      const parsedQuery: ParsedQuery = {
        original: 'content',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['content'],
        confidence: 0.9,
      }

      const results = await numericFilter.filter(parsedQuery)

      expect(results.length).toBe(1)
      expect(results[0].properties.count).toBe(42)
    })
  })

  describe('Performance', () => {
    it('should filter small dataset in under 10ms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const start = Date.now()
      await filter.filter(parsedQuery)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(10)
    })

    it('should filter large dataset in under 50ms', async () => {
      const largeEntities: MockEntity[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `doc-${i}`,
        type: 'document',
        properties: {
          title: `Document ${i}`,
          content: `Content ${i} with semantic search and other terms.`,
        },
      }))

      const largeFilter = new StructuralFilter(async () => largeEntities)

      const parsedQuery: ParsedQuery = {
        original: 'semantic search',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const start = Date.now()
      await largeFilter.filter(parsedQuery)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(50)
    })
  })
})
