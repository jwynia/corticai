/**
 * ContextPipeline Integration Tests
 *
 * Tests for the full 5-stage semantic pipeline orchestrator.
 * Verifies end-to-end query processing from parsing to presentation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ContextPipeline, type ContextPipelineConfig } from '../../../src/semantic/ContextPipeline'

describe('ContextPipeline', () => {
  let pipeline: ContextPipeline
  let mockEntities: any[]

  beforeEach(() => {
    // Mock entity database
    mockEntities = [
      {
        id: 'doc-1',
        type: 'document',
        properties: {
          title: 'Semantic Search Guide',
          content: 'Semantic search is a technique for finding information based on meaning using embeddings.',
          createdAt: '2025-11-01T10:00:00Z',
          updatedAt: '2025-11-10T15:00:00Z',
        },
        lifecycle: { state: 'current', confidence: 'high', manual: true },
      },
      {
        id: 'doc-2',
        type: 'document',
        properties: {
          title: 'How to Implement Semantic Search',
          content: 'First, install pgvector. Second, generate embeddings. Third, configure the search index.',
          createdAt: '2025-11-05T10:00:00Z',
        },
        lifecycle: { state: 'current', confidence: 'high', manual: true },
      },
      {
        id: 'doc-3',
        type: 'document',
        properties: {
          title: 'Old Kuzu Implementation',
          content: 'This was the deprecated approach using Kuzu database.',
          createdAt: '2024-05-01T10:00:00Z',
        },
        lifecycle: {
          state: 'deprecated',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-1',
        },
      },
    ]

    const config: ContextPipelineConfig = {
      entityProvider: async () => mockEntities,
      entityLookup: async (id: string) => mockEntities.find(e => e.id === id),
      maxCandidates: 10,
      minLiteralScore: 0.1,
    }

    pipeline = new ContextPipeline(config)
  })

  describe('Full Pipeline Execution', () => {
    it('should execute all 5 stages successfully', async () => {
      const result = await pipeline.execute('what is semantic search?')

      expect(result).toBeDefined()
      expect(result.query).toBe('what is semantic search?')
      expect(result.parsedQuery).toBeDefined()
      expect(result.candidates).toBeInstanceOf(Array)
      expect(result.enrichedResults).toBeInstanceOf(Array)
      expect(result.rankedResults).toBeInstanceOf(Array)
      expect(result.presentedResults).toBeInstanceOf(Array)
      expect(result.executionTime).toBeGreaterThan(0)
      expect(result.stageTimings).toBeDefined()
    })

    it('should correctly parse query in Stage 1', async () => {
      const result = await pipeline.execute('what is semantic search?')

      expect(result.parsedQuery.intent).toBe('what')
      expect(result.parsedQuery.literalTerms).toContain('semantic')
      expect(result.parsedQuery.literalTerms).toContain('search')
      expect(result.parsedQuery.hasNegation).toBe(false)
    })

    it('should filter and score candidates in Stage 2', async () => {
      const result = await pipeline.execute('semantic search')

      expect(result.candidates.length).toBeGreaterThan(0)
      expect(result.candidates[0]).toHaveProperty('literalMatchScore')
      expect(result.candidates[0]).toHaveProperty('id')
      expect(result.candidates[0]).toHaveProperty('properties')
    })

    it('should enrich results in Stage 3', async () => {
      const result = await pipeline.execute('semantic search')

      expect(result.enrichedResults.length).toBeGreaterThan(0)
      expect(result.enrichedResults[0]).toHaveProperty('polarity')
      expect(result.enrichedResults[0]).toHaveProperty('relevanceFactors')
      expect(result.enrichedResults[0].relevanceFactors).toHaveProperty('recency')
      expect(result.enrichedResults[0].relevanceFactors).toHaveProperty('authority')
      expect(result.enrichedResults[0].relevanceFactors).toHaveProperty('completeness')
    })

    it('should rank results in Stage 4', async () => {
      const result = await pipeline.execute('semantic search')

      expect(result.rankedResults.length).toBeGreaterThan(0)
      expect(result.rankedResults[0]).toHaveProperty('relevanceScore')
      expect(result.rankedResults[0]).toHaveProperty('intentAlignment')
      expect(result.rankedResults[0]).toHaveProperty('polarityAlignment')
      expect(result.rankedResults[0]).toHaveProperty('authorityScore')

      // Verify sorted by relevance
      for (let i = 0; i < result.rankedResults.length - 1; i++) {
        expect(result.rankedResults[i].relevanceScore).toBeGreaterThanOrEqual(
          result.rankedResults[i + 1].relevanceScore
        )
      }
    })

    it('should present results in Stage 5', async () => {
      const result = await pipeline.execute('semantic search')

      expect(result.presentedResults.length).toBeGreaterThan(0)
      expect(result.presentedResults[0]).toHaveProperty('result')
      expect(result.presentedResults[0]).toHaveProperty('relevantBlocks')
      expect(result.presentedResults[0]).toHaveProperty('navigationHints')
      expect(result.presentedResults[0]).toHaveProperty('relatedSuggestions')
    })

    it('should build supersession chains for deprecated documents', async () => {
      const result = await pipeline.execute('kuzu implementation')

      const deprecatedDoc = result.enrichedResults.find(r => r.id === 'doc-3')
      expect(deprecatedDoc?.supersessionChain).toEqual(['doc-1'])
    })

    it('should handle "how" intent queries', async () => {
      const result = await pipeline.execute('how do I implement semantic search?')

      expect(result.parsedQuery.intent).toBe('how')
      expect(result.rankedResults[0].intentAlignment).toBeGreaterThan(0)
    })

    it('should respect lifecycle filters', async () => {
      const result = await pipeline.execute('implementation', {
        lifecycleFilters: ['current'],
        minLiteralScore: 0,
      })

      expect(result.candidates.every(c => c.lifecycle?.state === 'current')).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should complete pipeline in under 100ms', async () => {
      const result = await pipeline.execute('semantic search')

      expect(result.executionTime).toBeLessThan(100)
    })

    it('should report timing for each stage', async () => {
      const result = await pipeline.execute('semantic search')

      // Stages may be very fast (< 1ms), so check they're non-negative
      expect(result.stageTimings.stage1).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage2).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage3).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage4).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage5).toBeGreaterThanOrEqual(0)

      const totalStageTime =
        result.stageTimings.stage1 +
        result.stageTimings.stage2 +
        result.stageTimings.stage3 +
        result.stageTimings.stage4 +
        result.stageTimings.stage5

      // Total stage time should roughly equal execution time (within tolerance for overhead)
      expect(totalStageTime).toBeLessThanOrEqual(result.executionTime + 10)
    })
  })

  describe('Query Convenience Method', () => {
    it('should return only final results', async () => {
      const results = await pipeline.query('semantic search')

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('result')
      expect(results[0]).toHaveProperty('relevantBlocks')
    })
  })

  describe('Configuration', () => {
    it('should apply custom maxCandidates', async () => {
      const result = await pipeline.execute('implementation', {
        maxCandidates: 1,
        minLiteralScore: 0,
      })

      expect(result.candidates.length).toBeLessThanOrEqual(1)
    })

    it('should apply custom ranking weights', async () => {
      const result = await pipeline.execute('semantic search', {
        rankingWeights: {
          literal: 0.8,
          authority: 0.2,
        },
      })

      // Verify ranking used custom weights
      expect(result.rankedResults[0].scoreBreakdown).toBeDefined()
    })
  })
})
