/**
 * SemanticEnricher Tests (Stage 3 of Semantic Pipeline)
 *
 * Tests for semantic enrichment including polarity detection, supersession chain
 * building, temporal context extraction, and relevance factor calculation.
 * These tests are written FIRST (TDD) before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SemanticEnricher } from '../../../src/semantic/SemanticEnricher'
import type {
  CandidateResult,
  EnrichedResult,
  ParsedQuery,
  PipelineConfig,
} from '../../../src/semantic/types'

/**
 * Mock entity lookup for supersession chain resolution
 */
interface EntityLookup {
  [id: string]: {
    id: string
    type: string
    properties: Record<string, any>
    lifecycle?: {
      state: 'current' | 'stable' | 'evolving' | 'deprecated' | 'historical' | 'archived'
      confidence: 'high' | 'medium' | 'low'
      manual: boolean
      supersededBy?: string
    }
  }
}

describe('SemanticEnricher', () => {
  let enricher: SemanticEnricher
  let mockEntityLookup: EntityLookup

  beforeEach(() => {
    // Create mock entity lookup for supersession chains
    mockEntityLookup = {
      'doc-1': {
        id: 'doc-1',
        type: 'document',
        properties: {
          title: 'Current Implementation',
          content: 'This is the current approach using pgvector.',
          createdAt: '2025-11-01T10:00:00Z',
          updatedAt: '2025-11-10T15:00:00Z',
        },
        lifecycle: { state: 'current', confidence: 'high', manual: true },
      },
      'doc-2': {
        id: 'doc-2',
        type: 'document',
        properties: {
          title: 'Deprecated Implementation',
          content: 'This was the old approach using Kuzu.',
          createdAt: '2024-05-01T10:00:00Z',
          updatedAt: '2024-08-15T12:00:00Z',
        },
        lifecycle: {
          state: 'deprecated',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-1',
        },
      },
      'doc-3': {
        id: 'doc-3',
        type: 'document',
        properties: {
          title: 'Historical Implementation',
          content: 'This was an even older approach using custom storage.',
          createdAt: '2023-01-01T10:00:00Z',
        },
        lifecycle: {
          state: 'historical',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-2',
        },
      },
    }

    // Initialize enricher with mock entity lookup
    enricher = new SemanticEnricher(async (id: string) => mockEntityLookup[id])
  })

  describe('Polarity Detection', () => {
    it('should detect positive polarity for affirming content', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'best practices for pgvector',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['best', 'practices', 'pgvector'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'PGVector is excellent for semantic search. We recommend using it.',
          },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].polarity).toBe('positive')
    })

    it('should detect negative polarity for critical content', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'kuzu implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['kuzu', 'implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-2',
          type: 'document',
          properties: {
            content: 'Kuzu had significant limitations and should be avoided.',
          },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].polarity).toBe('negative')
    })

    it('should detect neutral polarity for descriptive content', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'storage implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['storage', 'implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: {
            content: 'The storage layer provides an abstraction over the database.',
          },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].polarity).toBe('neutral')
    })

    it('should detect polarity from lifecycle state', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation approach',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation', 'approach'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-2',
          type: 'document',
          properties: {
            content: 'This approach was used in the past.',
          },
          lifecycle: {
            state: 'deprecated',
            confidence: 'high',
            manual: true,
          },
          literalMatchScore: 0.5,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // Deprecated state should bias toward negative polarity
      expect(results[0].polarity).toBe('negative')
    })
  })

  describe('Supersession Chain Building', () => {
    it('should build single-level supersession chain', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-2',
          type: 'document',
          properties: mockEntityLookup['doc-2'].properties,
          lifecycle: mockEntityLookup['doc-2'].lifecycle,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].supersessionChain).toEqual(['doc-1'])
    })

    it('should build multi-level supersession chain', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-3',
          type: 'document',
          properties: mockEntityLookup['doc-3'].properties,
          lifecycle: mockEntityLookup['doc-3'].lifecycle,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // doc-3 -> doc-2 -> doc-1
      expect(results[0].supersessionChain).toEqual(['doc-2', 'doc-1'])
    })

    it('should limit supersession chain depth', async () => {
      // Create a long chain: doc-5 -> doc-4 -> doc-3 -> doc-2 -> doc-1
      mockEntityLookup['doc-4'] = {
        id: 'doc-4',
        type: 'document',
        properties: { content: 'Version 4' },
        lifecycle: {
          state: 'historical',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-3',
        },
      }
      mockEntityLookup['doc-5'] = {
        id: 'doc-5',
        type: 'document',
        properties: { content: 'Version 5' },
        lifecycle: {
          state: 'archived',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-4',
        },
      }

      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-5',
          type: 'document',
          properties: mockEntityLookup['doc-5'].properties,
          lifecycle: mockEntityLookup['doc-5'].lifecycle,
          literalMatchScore: 1.0,
        },
      ]

      const config: PipelineConfig = {
        maxSupersessionDepth: 3,
      }

      const results = await enricher.enrich(candidates, parsedQuery, config)

      // Should limit to 3 levels: doc-4, doc-3, doc-2 (stopping before doc-1)
      expect(results[0].supersessionChain?.length).toBeLessThanOrEqual(3)
    })

    it('should handle circular supersession chains gracefully', async () => {
      // Create circular reference: doc-6 -> doc-7 -> doc-6
      mockEntityLookup['doc-6'] = {
        id: 'doc-6',
        type: 'document',
        properties: { content: 'Version 6' },
        lifecycle: {
          state: 'deprecated',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-7',
        },
      }
      mockEntityLookup['doc-7'] = {
        id: 'doc-7',
        type: 'document',
        properties: { content: 'Version 7' },
        lifecycle: {
          state: 'deprecated',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-6', // Circular!
        },
      }

      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-6',
          type: 'document',
          properties: mockEntityLookup['doc-6'].properties,
          lifecycle: mockEntityLookup['doc-6'].lifecycle,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // Should detect circular reference and stop
      expect(results[0].supersessionChain).toBeDefined()
      expect(results[0].supersessionChain!.length).toBeLessThan(10) // No infinite loop
    })

    it('should not build chain for current/stable documents', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          lifecycle: mockEntityLookup['doc-1'].lifecycle,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // Current documents don't have supersession chains
      expect(results[0].supersessionChain).toBeUndefined()
    })
  })

  describe('Temporal Context Extraction', () => {
    it('should extract createdAt and updatedAt from properties', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].temporalContext?.createdAt).toBe('2025-11-01T10:00:00Z')
      expect(results[0].temporalContext?.updatedAt).toBe('2025-11-10T15:00:00Z')
    })

    it('should handle missing temporal fields', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-no-dates',
          type: 'document',
          properties: {
            content: 'Content without dates',
          },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].temporalContext).toBeDefined()
      expect(results[0].temporalContext?.createdAt).toBeUndefined()
      expect(results[0].temporalContext?.updatedAt).toBeUndefined()
    })

    it('should infer relevantPeriod from query prepositions', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'changes in 2024',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: { in: '2024' },
        literalTerms: ['changes'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-2',
          type: 'document',
          properties: mockEntityLookup['doc-2'].properties,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].temporalContext?.relevantPeriod).toBe('2024')
    })
  })

  describe('Relevance Factor Calculation', () => {
    it('should calculate recency factor (1.0 for very recent)', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // doc-1 updated 2025-11-10, very recent
      expect(results[0].relevanceFactors.recency).toBeGreaterThan(0.8)
    })

    it('should calculate lower recency for old documents', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-3',
          type: 'document',
          properties: mockEntityLookup['doc-3'].properties,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // doc-3 created 2023-01-01, quite old
      expect(results[0].relevanceFactors.recency).toBeLessThan(0.5)
    })

    it('should calculate authority based on lifecycle state', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          lifecycle: { state: 'current', confidence: 'high', manual: true },
          literalMatchScore: 1.0,
        },
        {
          id: 'doc-2',
          type: 'document',
          properties: mockEntityLookup['doc-2'].properties,
          lifecycle: { state: 'deprecated', confidence: 'high', manual: true },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // Current should have higher authority than deprecated
      const currentAuthority = results.find(r => r.id === 'doc-1')!.relevanceFactors.authority
      const deprecatedAuthority = results.find(r => r.id === 'doc-2')!.relevanceFactors.authority

      expect(currentAuthority).toBeGreaterThan(deprecatedAuthority)
    })

    it('should calculate completeness based on property richness', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'rich-doc',
          type: 'document',
          properties: {
            title: 'Complete Document',
            content: 'Detailed content here.',
            author: 'John Doe',
            tags: ['semantic', 'search'],
            createdAt: '2025-11-01T10:00:00Z',
          },
          literalMatchScore: 1.0,
        },
        {
          id: 'sparse-doc',
          type: 'document',
          properties: {
            content: 'Minimal content.',
            title: '', // Empty property
            author: null, // Null property
          },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      const richCompleteness = results.find(r => r.id === 'rich-doc')!.relevanceFactors.completeness
      const sparseCompleteness = results.find(r => r.id === 'sparse-doc')!.relevanceFactors.completeness

      expect(richCompleteness).toBeGreaterThan(sparseCompleteness)
    })

    it('should ensure all relevance factors are between 0 and 1', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      const factors = results[0].relevanceFactors
      expect(factors.recency).toBeGreaterThanOrEqual(0)
      expect(factors.recency).toBeLessThanOrEqual(1)
      expect(factors.authority).toBeGreaterThanOrEqual(0)
      expect(factors.authority).toBeLessThanOrEqual(1)
      expect(factors.completeness).toBeGreaterThanOrEqual(0)
      expect(factors.completeness).toBeLessThanOrEqual(1)
    })
  })

  describe('Result Structure', () => {
    it('should preserve all CandidateResult fields', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          lifecycle: mockEntityLookup['doc-1'].lifecycle,
          literalMatchScore: 0.75,
          matchedLifecycleFilter: true,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].id).toBe('doc-1')
      expect(results[0].type).toBe('document')
      expect(results[0].properties).toEqual(mockEntityLookup['doc-1'].properties)
      expect(results[0].lifecycle).toEqual(mockEntityLookup['doc-1'].lifecycle)
      expect(results[0].literalMatchScore).toBe(0.75)
      expect(results[0].matchedLifecycleFilter).toBe(true)
    })

    it('should add all EnrichedResult fields', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0]).toHaveProperty('polarity')
      expect(results[0]).toHaveProperty('temporalContext')
      expect(results[0]).toHaveProperty('relevanceFactors')
      expect(results[0].relevanceFactors).toHaveProperty('recency')
      expect(results[0].relevanceFactors).toHaveProperty('authority')
      expect(results[0].relevanceFactors).toHaveProperty('completeness')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty candidates array', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const results = await enricher.enrich([], parsedQuery)

      expect(results).toEqual([])
    })

    it('should handle candidates without lifecycle metadata', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-no-lifecycle',
          type: 'document',
          properties: {
            content: 'Content without lifecycle',
          },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      expect(results[0].polarity).toBeDefined()
      expect(results[0].relevanceFactors).toBeDefined()
      expect(results[0].supersessionChain).toBeUndefined()
    })

    it('should handle missing supersededBy entity gracefully', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-broken-chain',
          type: 'document',
          properties: {
            content: 'Document with broken supersession chain',
          },
          lifecycle: {
            state: 'deprecated',
            confidence: 'high',
            manual: true,
            supersededBy: 'nonexistent-id', // Entity doesn't exist
          },
          literalMatchScore: 1.0,
        },
      ]

      const results = await enricher.enrich(candidates, parsedQuery)

      // Should not crash, chain should be empty or contain only found entities
      expect(results[0].supersessionChain).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should enrich small batch in under 10ms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          properties: mockEntityLookup['doc-1'].properties,
          literalMatchScore: 1.0,
        },
        {
          id: 'doc-2',
          type: 'document',
          properties: mockEntityLookup['doc-2'].properties,
          literalMatchScore: 0.8,
        },
      ]

      const start = Date.now()
      await enricher.enrich(candidates, parsedQuery)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(10)
    })

    it('should enrich large batch (100 candidates) in under 50ms', async () => {
      const parsedQuery: ParsedQuery = {
        original: 'implementation',
        intent: 'what',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: ['implementation'],
        confidence: 0.9,
      }

      const candidates: CandidateResult[] = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        type: 'document',
        properties: {
          content: `Document ${i} content`,
        },
        literalMatchScore: Math.random(),
      }))

      const start = Date.now()
      await enricher.enrich(candidates, parsedQuery)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(50)
    })
  })
})
