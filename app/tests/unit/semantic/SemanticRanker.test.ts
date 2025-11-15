/**
 * SemanticRanker Tests (Stage 4 of Semantic Pipeline)
 *
 * Tests for semantic ranking with multi-signal scoring including intent alignment,
 * polarity alignment, authority scoring, and weighted relevance calculation.
 * These tests are written FIRST (TDD) before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SemanticRanker } from '../../../src/semantic/SemanticRanker'
import type {
  EnrichedResult,
  RankedResult,
  ParsedQuery,
  PipelineConfig,
} from '../../../src/semantic/types'

describe('SemanticRanker', () => {
  let ranker: SemanticRanker

  beforeEach(() => {
    ranker = new SemanticRanker()
  })

  describe('Intent Alignment Scoring', () => {
    it('should score high for "what" intent matching definition content', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'what is semantic search?',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'Semantic search is a technique for finding information based on meaning.',
          },
          literalMatchScore: 1.0,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.8,
            authority: 0.9,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].intentAlignment).toBeGreaterThan(0.7)
    })

    it('should score high for "how" intent matching instructional content', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'how do I implement semantic search?',
        intent: 'how',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implement', 'semantic', 'search'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'First, install pgvector. Second, create embeddings. Third, configure the search.',
          },
          literalMatchScore: 0.8,
          polarity: 'positive',
          relevanceFactors: {
            recency: 0.9,
            authority: 0.8,
            completeness: 0.9,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].intentAlignment).toBeGreaterThan(0.7)
    })

    it('should score high for "why" intent matching rationale content', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'why use pgvector instead of kuzu?',
        intent: 'why',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['pgvector', 'kuzu'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'The reason for choosing pgvector is better performance and scalability.',
          },
          literalMatchScore: 0.9,
          polarity: 'positive',
          relevanceFactors: {
            recency: 0.8,
            authority: 0.9,
            completeness: 0.7,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].intentAlignment).toBeGreaterThan(0.7)
    })

    it('should score lower for mismatched intent', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'how to implement semantic search?',
        intent: 'how',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implement', 'semantic', 'search'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'Semantic search is a technique for finding information.', // Definition, not instruction
          },
          literalMatchScore: 0.8,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.8,
            authority: 0.8,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].intentAlignment).toBeLessThan(0.6)
    })
  })

  describe('Polarity Alignment Scoring', () => {
    it('should score high when both query and result are positive', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'best practices for pgvector',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['best', 'practices', 'pgvector'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'PGVector is excellent and we recommend using it.',
          },
          literalMatchScore: 1.0,
          polarity: 'positive',
          relevanceFactors: {
            recency: 0.8,
            authority: 0.9,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].polarityAlignment).toBeGreaterThan(0.7)
    })

    it('should score high when query seeks negative info and result is negative', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'problems with kuzu',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['problems', 'kuzu'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'Kuzu had significant limitations and performance issues.',
          },
          literalMatchScore: 1.0,
          polarity: 'negative',
          relevanceFactors: {
            recency: 0.5,
            authority: 0.7,
            completeness: 0.7,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].polarityAlignment).toBeGreaterThan(0.7)
    })

    it('should score medium for neutral polarity matches', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search', 'implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'The semantic search implementation uses pgvector.',
          },
          literalMatchScore: 1.0,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.8,
            authority: 0.8,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].polarityAlignment).toBeGreaterThan(0.4)
      expect(results[0].polarityAlignment).toBeLessThan(0.8)
    })

    it('should score lower for polarity mismatch', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'best practices',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['best', 'practices'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'This approach has many problems and should be avoided.',
          },
          literalMatchScore: 0.5,
          polarity: 'negative',
          relevanceFactors: {
            recency: 0.7,
            authority: 0.6,
            completeness: 0.7,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].polarityAlignment).toBeLessThan(0.5)
    })
  })

  describe('Authority Score Calculation', () => {
    it('should calculate authority from lifecycle and relevance factors', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-current',
          type: 'document',
          properties: { content: 'Current approach' },
          lifecycle: { state: 'current', confidence: 'high', manual: true },
          literalMatchScore: 1.0,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.9,
            authority: 1.0, // From lifecycle
            completeness: 0.8,
          },
        },
        {
          id: 'doc-deprecated',
          type: 'document',
          properties: { content: 'Deprecated approach' },
          lifecycle: { state: 'deprecated', confidence: 'high', manual: true },
          literalMatchScore: 1.0,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.3,
            authority: 0.3, // From lifecycle
            completeness: 0.7,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      const currentAuthority = results.find(r => r.id === 'doc-current')!.authorityScore
      const deprecatedAuthority = results.find(r => r.id === 'doc-deprecated')!.authorityScore

      expect(currentAuthority).toBeGreaterThan(deprecatedAuthority)
    })
  })

  describe('Relevance Score Combination', () => {
    it('should combine all signals into relevance score', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'what is semantic search?',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'Semantic search is a technique for finding information.',
          },
          literalMatchScore: 1.0,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.9,
            authority: 0.9,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].relevanceScore).toBeGreaterThan(0)
      expect(results[0].relevanceScore).toBeLessThanOrEqual(1)
      expect(results[0].scoreBreakdown).toBeDefined()
    })

    it('should use custom weights when provided', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: { content: 'Implementation details' },
          literalMatchScore: 0.8,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.5,
            authority: 0.9,
            completeness: 0.7,
          },
        },
      ]

      const config: PipelineConfig = {
        rankingWeights: {
          literal: 0.5,
          authority: 0.3,
          recency: 0.1,
          intent: 0.1,
        },
      }

      const results = await ranker.rank(enriched, parsedQuery, config)

      // With high literal weight, score should emphasize literal match
      expect(results[0].scoreBreakdown.literal).toBe(0.8)
    })

    it('should sort results by relevance score descending', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-low',
          type: 'document',
          properties: { content: 'Barely relevant' },
          literalMatchScore: 0.2,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.3,
            authority: 0.3,
            completeness: 0.5,
          },
        },
        {
          id: 'doc-high',
          type: 'document',
          properties: { content: 'Semantic search is excellent' },
          literalMatchScore: 1.0,
          polarity: 'positive',
          relevanceFactors: {
            recency: 0.9,
            authority: 1.0,
            completeness: 0.9,
          },
        },
        {
          id: 'doc-medium',
          type: 'document',
          properties: { content: 'Semantic search information' },
          literalMatchScore: 0.7,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.7,
            authority: 0.7,
            completeness: 0.7,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0].id).toBe('doc-high')
      expect(results[1].id).toBe('doc-medium')
      expect(results[2].id).toBe('doc-low')

      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].relevanceScore).toBeGreaterThanOrEqual(results[i + 1].relevanceScore)
      }
    })
  })

  describe('Score Breakdown', () => {
    it('should include all score components in breakdown', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'what is semantic search?',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: { content: 'Semantic search explanation' },
          literalMatchScore: 0.8,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.7,
            authority: 0.9,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      const breakdown = results[0].scoreBreakdown
      expect(breakdown).toHaveProperty('literal')
      expect(breakdown).toHaveProperty('intent')
      expect(breakdown).toHaveProperty('polarity')
      expect(breakdown).toHaveProperty('authority')
      expect(breakdown).toHaveProperty('recency')
    })

    it('should include embedding score when present', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'semantic search',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['semantic', 'search'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: { content: 'Content' },
          literalMatchScore: 0.8,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.7,
            authority: 0.9,
            completeness: 0.8,
          },
        },
      ]

      // Mock embedding similarity
      const mockEmbeddingSimilarity = async (_enriched: EnrichedResult[], _query: ParsedQuery) => {
        return [{ id: 'doc-1', similarity: 0.85 }]
      }

      const rankerWithEmbeddings = new SemanticRanker(mockEmbeddingSimilarity)
      const results = await rankerWithEmbeddings.rank(enriched, parsedQuery)

      expect(results[0].embeddingSimilarity).toBe(0.85)
      expect(results[0].scoreBreakdown.embedding).toBe(0.85)
    })
  })

  describe('Result Structure', () => {
    it('should preserve all EnrichedResult fields', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: { content: 'Content', title: 'Title' },
          lifecycle: { state: 'current', confidence: 'high', manual: true },
          literalMatchScore: 0.8,
          matchedLifecycleFilter: true,
          polarity: 'positive',
          supersessionChain: ['doc-2'],
          temporalContext: {
            createdAt: '2025-11-01T10:00:00Z',
            updatedAt: '2025-11-10T15:00:00Z',
          },
          relevanceFactors: {
            recency: 0.9,
            authority: 1.0,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      const result = results[0]
      expect(result.id).toBe('doc-1')
      expect(result.type).toBe('document')
      expect(result.properties).toEqual({ content: 'Content', title: 'Title' })
      expect(result.lifecycle).toBeDefined()
      expect(result.literalMatchScore).toBe(0.8)
      expect(result.matchedLifecycleFilter).toBe(true)
      expect(result.polarity).toBe('positive')
      expect(result.supersessionChain).toEqual(['doc-2'])
      expect(result.temporalContext).toBeDefined()
      expect(result.relevanceFactors).toBeDefined()
    })

    it('should add all RankedResult fields', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: { content: 'Content' },
          literalMatchScore: 0.8,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.7,
            authority: 0.9,
            completeness: 0.8,
          },
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results[0]).toHaveProperty('intentAlignment')
      expect(results[0]).toHaveProperty('polarityAlignment')
      expect(results[0]).toHaveProperty('authorityScore')
      expect(results[0]).toHaveProperty('relevanceScore')
      expect(results[0]).toHaveProperty('scoreBreakdown')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty enriched array', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const results = await ranker.rank([], parsedQuery)

      expect(results).toEqual([])
    })

    it('should handle results with missing optional fields', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-minimal',
          type: 'document',
          properties: { content: 'Minimal content' },
          literalMatchScore: 0.5,
          polarity: 'neutral',
          relevanceFactors: {
            recency: 0.5,
            authority: 0.5,
            completeness: 0.5,
          },
          // No lifecycle, no supersessionChain, no temporalContext
        },
      ]

      const results = await ranker.rank(enriched, parsedQuery)

      expect(results.length).toBe(1)
      expect(results[0].relevanceScore).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should rank small batch in under 5ms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: { content: 'Content 1' },
          literalMatchScore: 0.8,
          polarity: 'neutral',
          relevanceFactors: { recency: 0.8, authority: 0.9, completeness: 0.8 },
        },
        {
          id: 'doc-2',
          type: 'document',
          properties: { content: 'Content 2' },
          literalMatchScore: 0.7,
          polarity: 'positive',
          relevanceFactors: { recency: 0.7, authority: 0.8, completeness: 0.7 },
        },
      ]

      const start = Date.now()
      await ranker.rank(enriched, parsedQuery)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5)
    })

    it('should rank large batch (100 results) in under 20ms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const enriched: EnrichedResult[] = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        type: 'document',
        properties: { content: `Content ${i}` },
        literalMatchScore: Math.random(),
        polarity: 'neutral' as const,
        relevanceFactors: {
          recency: Math.random(),
          authority: Math.random(),
          completeness: Math.random(),
        },
      }))

      const start = Date.now()
      await ranker.rank(enriched, parsedQuery)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(20)
    })
  })
})
