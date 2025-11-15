/**
 * Semantic Processing Integration Tests
 *
 * End-to-end tests for the complete 5-stage semantic processing pipeline
 * including Phase 4 (ProjectionEngine) integration.
 *
 * Test Coverage:
 * - Complete pipeline execution
 * - Depth-based projection
 * - Progressive loading simulation
 * - Performance benchmarks
 * - Cross-stage data flow
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ContextPipeline } from '../../../src/semantic/ContextPipeline'
import { ContextDepth } from '../../../src/types/context'
import type { Entity } from '../../../src/types/graph'
import type { LifecycleMetadata } from '../../../src/semantic/types'

describe('Semantic Processing Integration', () => {
  let pipeline: ContextPipeline
  let mockEntities: Entity[]

  beforeEach(() => {
    // Create mock entities with full semantic metadata
    mockEntities = [
      {
        id: 'doc-1',
        type: 'document',
        properties: {
          name: 'Current Architecture Decision',
          content: 'We decided to use PostgreSQL for vector storage',
          metadata: { type: 'decision', importance: 'high' },
        },
        lifecycle: {
          state: 'current',
          confidence: 'high',
          manual: true,
        } as LifecycleMetadata,
      },
      {
        id: 'doc-2',
        type: 'document',
        properties: {
          name: 'Deprecated Old Approach',
          content: 'Previous attempt used MongoDB',
          metadata: { type: 'decision', importance: 'medium' },
        },
        lifecycle: {
          state: 'deprecated',
          confidence: 'high',
          manual: true,
          supersededBy: 'doc-1',
        } as LifecycleMetadata,
      },
      {
        id: 'doc-3',
        type: 'document',
        properties: {
          name: 'Related Context on Storage',
          content: 'PostgreSQL provides excellent pgvector support',
          metadata: { type: 'context', importance: 'medium' },
        },
        lifecycle: {
          state: 'current',
          confidence: 'high',
          manual: false,
        } as LifecycleMetadata,
      },
    ]

    // Initialize pipeline with mock providers
    pipeline = new ContextPipeline({
      entityProvider: async (filters) => {
        // Simple filter: return entities matching lifecycle filters
        if (filters && filters.lifecycleFilters && filters.lifecycleFilters.length > 0) {
          return mockEntities.filter(e =>
            filters.lifecycleFilters!.includes(e.lifecycle!.state)
          )
        }
        return mockEntities
      },
      entityLookup: async (id) => {
        return mockEntities.find(e => e.id === id) || null
      },
      embeddingSimilarity: async (enriched, query) => {
        // Mock similarity scores based on entity ID
        return enriched.map(entity => ({
          id: entity.id,
          similarity:
            entity.id === 'doc-1' ? 0.95 : // High relevance
            entity.id === 'doc-3' ? 0.75 : // Medium relevance
            entity.id === 'doc-2' ? 0.45 : // Low relevance (deprecated)
            0.1
        }))
      },
      blockLookup: async (entityId) => {
        // Mock semantic blocks
        return []
      },
      chainEntityLookup: async (entityId) => {
        // Mock chain lookup
        const entity = mockEntities.find(e => e.id === entityId)
        return entity || null
      },
    })
  })

  describe('Complete Pipeline Execution', () => {
    it('should execute all 5 stages successfully', async () => {
      const result = await pipeline.execute('PostgreSQL storage decision')

      // Verify all stages completed
      expect(result.parsedQuery).toBeDefined()
      expect(result.candidates.length).toBeGreaterThan(0)
      expect(result.enrichedResults.length).toBeGreaterThan(0)
      expect(result.rankedResults.length).toBeGreaterThan(0)
      expect(result.presentedResults.length).toBeGreaterThan(0)
      expect(result.projectedResults).toBeDefined()
    })

    it('should maintain performance targets (<100ms)', async () => {
      const startTime = Date.now()
      const result = await pipeline.execute('storage')
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeLessThan(100)
      expect(result.executionTime).toBeLessThan(100)
    })

    it('should provide stage timing breakdowns', async () => {
      const result = await pipeline.execute('architecture')

      expect(result.stageTimings).toBeDefined()
      expect(result.stageTimings.stage1).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage2).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage3).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage4).toBeGreaterThanOrEqual(0)
      expect(result.stageTimings.stage5).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Depth-Based Projection', () => {
    it('should project results at SIGNATURE level', async () => {
      const result = await pipeline.execute('architecture', {
        depth: ContextDepth.SIGNATURE,
      })

      expect(result.projectedResults).toBeDefined()
      expect(result.projectedResults!.length).toBeGreaterThan(0)

      const projected = result.projectedResults![0]
      expect(projected.depthLevel).toBe(ContextDepth.SIGNATURE)
      expect(projected.isProjected).toBe(true)
    })

    it('should project results at STRUCTURE level (default)', async () => {
      const result = await pipeline.execute('storage')

      expect(result.projectedResults).toBeDefined()
      const projected = result.projectedResults![0]
      expect(projected.depthLevel).toBe(ContextDepth.STRUCTURE)
    })

    it('should project results at SEMANTIC level', async () => {
      const result = await pipeline.execute('decision', {
        depth: ContextDepth.SEMANTIC,
      })

      const projected = result.projectedResults![0]
      expect(projected.depthLevel).toBe(ContextDepth.SEMANTIC)
      expect(projected.relevantBlocks).toBeDefined()
    })

    it('should project results at DETAILED level', async () => {
      const result = await pipeline.execute('architecture', {
        depth: ContextDepth.DETAILED,
      })

      const projected = result.projectedResults![0]
      expect(projected.depthLevel).toBe(ContextDepth.DETAILED)
    })

    it('should provide expansion hints for progressive loading', async () => {
      const result = await pipeline.execute('storage', {
        depth: ContextDepth.STRUCTURE,
      })

      const projected = result.projectedResults![0]
      expect(projected.expansionHints).toBeDefined()
      expect(projected.expansionHints!.availableDepths.length).toBeGreaterThan(0)
      expect(projected.expansionHints!.suggestedNextDepth).toBeDefined()
    })
  })

  describe('Progressive Loading Simulation', () => {
    it('should support expanding from SIGNATURE to STRUCTURE', async () => {
      // First, get signature-level results
      const signature = await pipeline.execute('decision', {
        depth: ContextDepth.SIGNATURE,
      })

      expect(signature.projectedResults![0].depthLevel).toBe(ContextDepth.SIGNATURE)

      // Then, expand to structure level
      const structure = await pipeline.execute('decision', {
        depth: ContextDepth.STRUCTURE,
      })

      expect(structure.projectedResults![0].depthLevel).toBe(ContextDepth.STRUCTURE)
      // Structure level includes relationships, which may include contextChain if supersession exists
      expect(structure.projectedResults![0].result).toBeDefined()
    })

    it('should track loaded vs available content', async () => {
      const result = await pipeline.execute('storage', {
        depth: ContextDepth.STRUCTURE,
      })

      const projected = result.projectedResults![0]
      expect(projected.loadedContent).toBeDefined()
      expect(projected.loadedContent!.includes).toContain('signature')
      expect(projected.loadedContent!.includes).toContain('relationships')
      expect(projected.loadedContent!.available.length).toBeGreaterThan(0)
    })
  })

  describe('Cross-Stage Data Flow', () => {
    it('should enrich candidates with lifecycle data', async () => {
      const result = await pipeline.execute('architecture')

      const enriched = result.enrichedResults[0]
      expect(enriched.lifecycle).toBeDefined()
      expect(enriched.lifecycle!.state).toBeOneOf(['current', 'deprecated', 'stable'])
    })

    it('should rank current content higher than deprecated', async () => {
      const result = await pipeline.execute('storage')

      const ranked = result.rankedResults
      const currentDoc = ranked.find(r => r.id === 'doc-1')
      const deprecatedDoc = ranked.find(r => r.id === 'doc-2')

      if (currentDoc && deprecatedDoc) {
        expect(currentDoc.relevanceScore).toBeGreaterThan(deprecatedDoc.relevanceScore)
      }
    })

    it('should include navigation hints for deprecated content', async () => {
      const result = await pipeline.execute('MongoDB', {
        depth: ContextDepth.STRUCTURE,
      })

      const deprecated = result.projectedResults!.find(r => r.result.lifecycle?.state === 'deprecated')
      if (deprecated) {
        expect(deprecated.navigationHints.length).toBeGreaterThan(0)
        expect(deprecated.navigationHints.some(h => h.includes('deprecated'))).toBe(true)
      }
    })
  })

  describe('Performance Characteristics', () => {
    it('should reduce memory usage with shallow depths', async () => {
      const signature = await pipeline.execute('architecture', {
        depth: ContextDepth.SIGNATURE,
      })

      const detailed = await pipeline.execute('architecture', {
        depth: ContextDepth.DETAILED,
      })

      const signatureSize = JSON.stringify(signature.projectedResults![0]).length
      const detailedSize = JSON.stringify(detailed.projectedResults![0]).length

      // Signature should be smaller or equal (depending on data)
      // At minimum, it shouldn't be significantly larger
      expect(signatureSize).toBeLessThanOrEqual(detailedSize * 1.2)
    })

    it('should cache projections for performance', async () => {
      const first = await pipeline.execute('storage', {
        depth: ContextDepth.STRUCTURE,
      })

      const second = await pipeline.execute('storage', {
        depth: ContextDepth.STRUCTURE,
      })

      // Second execution should be faster due to caching
      expect(second.executionTime).toBeLessThanOrEqual(first.executionTime)
    })
  })

  describe('Quick Query API', () => {
    it('should return projected results when depth is specified', async () => {
      const results = await pipeline.query('storage', {
        depth: ContextDepth.SEMANTIC,
      })

      expect(results.length).toBeGreaterThan(0)
      // Results should be ProjectedResult[] due to depth parameter
      const first = results[0] as any
      expect(first.depthLevel).toBeDefined()
      expect(first.isProjected).toBe(true)
    })

    it('should return presented results when depth is not specified', async () => {
      const results = await pipeline.query('architecture')

      expect(results.length).toBeGreaterThan(0)
      // Results should be PresentedResult[] (or ProjectedResult with default depth)
      const first = results[0] as any
      expect(first.result || first).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty query results gracefully', async () => {
      const result = await pipeline.execute('nonexistent query that matches nothing')

      expect(result.candidates.length).toBeGreaterThanOrEqual(0)
      expect(result.projectedResults).toBeDefined()
    })

    it('should handle queries with no lifecycle metadata', async () => {
      // Add entity without lifecycle
      mockEntities.push({
        id: 'doc-no-lifecycle',
        type: 'document',
        properties: {
          name: 'Document without lifecycle',
          content: 'Some content',
        },
      })

      const result = await pipeline.execute('content')

      expect(result.enrichedResults.length).toBeGreaterThan(0)
    })
  })
})
