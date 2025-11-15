/**
 * ProjectionEngine Tests
 *
 * Tests for depth-based projection and progressive loading system.
 * Following TDD: These tests are written BEFORE implementation.
 *
 * Test Coverage:
 * - Depth-based projection (SIGNATURE → HISTORICAL)
 * - Progressive loading with expansion hints
 * - Smart depth selection based on query intent
 * - Caching of loaded projections
 * - Performance requirements (<50ms overhead)
 * - Memory reduction (70%+ vs full loading)
 * - Integration with ContextDepth enum
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ProjectionEngine } from '../../../src/semantic/ProjectionEngine'
import { ContextDepth } from '../../../src/types/context'
import type { RankedResult, PresentedResult } from '../../../src/semantic/types'

describe('ProjectionEngine', () => {
  let engine: ProjectionEngine

  beforeEach(() => {
    engine = new ProjectionEngine()
  })

  describe('Constructor and Configuration', () => {
    it('should create ProjectionEngine with default configuration', () => {
      expect(engine).toBeDefined()
      expect(engine).toBeInstanceOf(ProjectionEngine)
    })

    it('should accept custom cache configuration', () => {
      const customEngine = new ProjectionEngine({
        cacheSize: 1000,
        defaultDepth: ContextDepth.SEMANTIC,
      })
      expect(customEngine).toBeDefined()
    })

    it('should set default depth to STRUCTURE if not specified', () => {
      const result = createMockRankedResult()
      const projected = engine.project([result], { depth: undefined })

      // Should apply STRUCTURE level by default (includes relationships)
      expect(projected[0].depthLevel).toBe(ContextDepth.STRUCTURE)
    })
  })

  describe('Depth-Based Projection', () => {
    describe('SIGNATURE Level (Depth 1)', () => {
      it('should project only id, type, and basic properties at SIGNATURE level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })

        expect(projected).toHaveLength(1)
        const first = projected[0]

        // Should include SIGNATURE properties
        expect(first.result.id).toBeDefined()
        expect(first.result.type).toBeDefined()
        expect(first.result.properties).toBeDefined()
        expect(first.result.properties.name).toBeDefined()

        // Should indicate this is a projection
        expect(first.depthLevel).toBe(ContextDepth.SIGNATURE)
        expect(first.isProjected).toBe(true)

        // Should provide expansion hints
        expect(first.expansionHints).toBeDefined()
        expect(first.expansionHints?.availableDepths).toContain(ContextDepth.STRUCTURE)
        expect(first.expansionHints?.availableDepths).toContain(ContextDepth.SEMANTIC)
      })

      it('should exclude semantic blocks at SIGNATURE level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })

        expect(projected[0].relevantBlocks).toEqual([])
      })

      it('should exclude context chains at SIGNATURE level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })

        expect(projected[0].contextChain).toBeUndefined()
      })

      it('should achieve significant memory reduction at SIGNATURE level', () => {
        const result = createLargeRankedResult()
        const fullSize = JSON.stringify(createFullPresentedResult(result)).length

        const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })
        const projectedSize = JSON.stringify(projected[0]).length

        const reduction = (fullSize - projectedSize) / fullSize
        expect(reduction).toBeGreaterThan(0.7) // 70%+ reduction
      })
    })

    describe('STRUCTURE Level (Depth 2)', () => {
      it('should include relationships at STRUCTURE level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.STRUCTURE })

        const first = projected[0]
        expect(first.depthLevel).toBe(ContextDepth.STRUCTURE)

        // Should include basic context chain (structure)
        expect(first.contextChain).toBeDefined()
        expect(first.contextChain?.length).toBeGreaterThan(0)
      })

      it('should still exclude semantic blocks at STRUCTURE level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.STRUCTURE })

        expect(projected[0].relevantBlocks).toEqual([])
      })

      it('should include navigation hints at STRUCTURE level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.STRUCTURE })

        expect(projected[0].navigationHints).toBeDefined()
        expect(projected[0].navigationHints.length).toBeGreaterThan(0)
      })
    })

    describe('SEMANTIC Level (Depth 3)', () => {
      it('should include semantic blocks at SEMANTIC level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.SEMANTIC })

        const first = projected[0]
        expect(first.depthLevel).toBe(ContextDepth.SEMANTIC)
        expect(first.relevantBlocks.length).toBeGreaterThan(0)
      })

      it('should include related suggestions at SEMANTIC level', () => {
        const results = [createFullRankedResult(), createFullRankedResult()]
        const projected = engine.project(results, { depth: ContextDepth.SEMANTIC })

        expect(projected[0].relatedSuggestions).toBeDefined()
      })

      it('should provide meaningful semantic content', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.SEMANTIC })

        // Should have rich semantic information
        expect(projected[0].relevantBlocks.length).toBeGreaterThan(0)
        expect(projected[0].result.lifecycle).toBeDefined()
      })
    })

    describe('DETAILED Level (Depth 4)', () => {
      it('should include full properties at DETAILED level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.DETAILED })

        const first = projected[0]
        expect(first.depthLevel).toBe(ContextDepth.DETAILED)

        // Should have all content
        expect(first.result.properties.content).toBeDefined()
        expect(first.relevantBlocks.length).toBeGreaterThan(0)
        expect(first.contextChain).toBeDefined()
      })

      it('should include score breakdown at DETAILED level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.DETAILED })

        expect(projected[0].result.scoreBreakdown).toBeDefined()
      })
    })

    describe('HISTORICAL Level (Depth 5)', () => {
      it('should include version history at HISTORICAL level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.HISTORICAL })

        const first = projected[0]
        expect(first.depthLevel).toBe(ContextDepth.HISTORICAL)

        // Should include full history
        expect(first.result.temporalContext).toBeDefined()
      })

      it('should not reduce size at HISTORICAL level', () => {
        const result = createFullRankedResult()
        const projected = engine.project([result], { depth: ContextDepth.HISTORICAL })

        // At HISTORICAL level, we want everything
        expect(projected[0].isProjected).toBe(false) // No projection applied
      })
    })
  })

  describe('Progressive Loading', () => {
    it('should provide expansion hints for deeper content', () => {
      const result = createFullRankedResult()
      const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })

      const hints = projected[0].expansionHints
      expect(hints).toBeDefined()
      expect(hints?.availableDepths).toContain(ContextDepth.STRUCTURE)
      expect(hints?.availableDepths).toContain(ContextDepth.SEMANTIC)
      expect(hints?.availableDepths).toContain(ContextDepth.DETAILED)
      expect(hints?.availableDepths).toContain(ContextDepth.HISTORICAL)
    })

    it('should indicate what content is available at each depth', () => {
      const result = createFullRankedResult()
      const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })

      const hints = projected[0].expansionHints
      expect(hints?.descriptions).toBeDefined()
      expect(hints?.descriptions?.[ContextDepth.STRUCTURE]).toContain('relationships')
      expect(hints?.descriptions?.[ContextDepth.SEMANTIC]).toContain('semantic')
      expect(hints?.descriptions?.[ContextDepth.DETAILED]).toContain('full')
    })

    it('should track what is loaded vs available', () => {
      const result = createFullRankedResult()
      const projected = engine.project([result], { depth: ContextDepth.STRUCTURE })

      expect(projected[0].loadedContent).toBeDefined()
      expect(projected[0].loadedContent?.includes).toContain('signature')
      expect(projected[0].loadedContent?.includes).toContain('relationships')
      expect(projected[0].loadedContent?.available).toContain('semanticBlocks')
      expect(projected[0].loadedContent?.available).toContain('fullContent')
    })

    it('should support progressive expansion to deeper levels', () => {
      const result = createFullRankedResult()

      // Start at SIGNATURE
      let projected = engine.project([result], { depth: ContextDepth.SIGNATURE })
      expect(projected[0].depthLevel).toBe(ContextDepth.SIGNATURE)

      // Expand to STRUCTURE
      projected = engine.project([result], { depth: ContextDepth.STRUCTURE })
      expect(projected[0].depthLevel).toBe(ContextDepth.STRUCTURE)
      expect(projected[0].contextChain).toBeDefined()

      // Expand to SEMANTIC
      projected = engine.project([result], { depth: ContextDepth.SEMANTIC })
      expect(projected[0].depthLevel).toBe(ContextDepth.SEMANTIC)
      expect(projected[0].relevantBlocks.length).toBeGreaterThan(0)
    })
  })

  describe('Smart Depth Selection', () => {
    it('should suggest STRUCTURE depth for "what" queries', () => {
      const suggestedDepth = engine.suggestDepth({ intent: 'what' })
      expect(suggestedDepth).toBe(ContextDepth.STRUCTURE)
    })

    it('should suggest SEMANTIC depth for "why" queries', () => {
      const suggestedDepth = engine.suggestDepth({ intent: 'why' })
      expect(suggestedDepth).toBe(ContextDepth.SEMANTIC)
    })

    it('should suggest DETAILED depth for "how" queries', () => {
      const suggestedDepth = engine.suggestDepth({ intent: 'how' })
      expect(suggestedDepth).toBe(ContextDepth.DETAILED)
    })

    it('should suggest SIGNATURE depth for "when" queries', () => {
      const suggestedDepth = engine.suggestDepth({ intent: 'when' })
      expect(suggestedDepth).toBe(ContextDepth.SIGNATURE)
    })

    it('should allow user to override suggested depth', () => {
      const result = createFullRankedResult()
      const projected = engine.project([result], {
        suggestedDepth: ContextDepth.SEMANTIC,
        depth: ContextDepth.SIGNATURE, // User override
      })

      expect(projected[0].depthLevel).toBe(ContextDepth.SIGNATURE)
    })

    it('should remember user preferences per entity type', () => {
      const documentResult = createFullRankedResult('document')
      const codeResult = createFullRankedResult('code')

      // User prefers DETAILED for documents
      engine.rememberPreference('document', ContextDepth.DETAILED)

      // User prefers SIGNATURE for code
      engine.rememberPreference('code', ContextDepth.SIGNATURE)

      const docDepth = engine.getPreferredDepth('document')
      const codeDepth = engine.getPreferredDepth('code')

      expect(docDepth).toBe(ContextDepth.DETAILED)
      expect(codeDepth).toBe(ContextDepth.SIGNATURE)
    })
  })

  describe('Caching', () => {
    it('should cache projected results for same input', () => {
      const result = createFullRankedResult()

      const start1 = performance.now()
      const projected1 = engine.project([result], { depth: ContextDepth.SEMANTIC })
      const time1 = performance.now() - start1

      const start2 = performance.now()
      const projected2 = engine.project([result], { depth: ContextDepth.SEMANTIC })
      const time2 = performance.now() - start2

      // Second call should be significantly faster (from cache)
      expect(time2).toBeLessThan(time1 * 0.5)

      // Results should be equivalent
      expect(projected1[0].result.id).toBe(projected2[0].result.id)
      expect(projected1[0].depthLevel).toBe(projected2[0].depthLevel)
    })

    it('should invalidate cache when content changes', () => {
      const result = createFullRankedResult()

      // First projection (cached)
      engine.project([result], { depth: ContextDepth.SEMANTIC })
      expect(engine.isCached(result.id, ContextDepth.SEMANTIC)).toBe(true)

      // Invalidate cache for this entity
      engine.invalidateCache(result.id)

      // Cache should be cleared
      expect(engine.isCached(result.id, ContextDepth.SEMANTIC)).toBe(false)

      // Second projection should work fine (not from cache)
      const projected2 = engine.project([result], { depth: ContextDepth.SEMANTIC })
      expect(projected2).toHaveLength(1)
      expect(projected2[0].result.id).toBe(result.id)
    })

    it('should respect cache size limits', () => {
      const smallEngine = new ProjectionEngine({ cacheSize: 3 })

      // Add 5 items (exceeds cache size)
      for (let i = 0; i < 5; i++) {
        const result = createFullRankedResult(`entity-${i}`)
        smallEngine.project([result], { depth: ContextDepth.SEMANTIC })
      }

      // Cache should only have 3 items (LRU eviction)
      const cacheSize = smallEngine.getCacheSize()
      expect(cacheSize).toBeLessThanOrEqual(3)
    })

    it('should use LRU eviction strategy', async () => {
      const engine = new ProjectionEngine({ cacheSize: 2 })

      const result1 = createFullRankedResult('entity-1')
      const result2 = createFullRankedResult('entity-2')
      const result3 = createFullRankedResult('entity-3')

      // Fill cache with small delays to ensure different timestamps
      engine.project([result1], { depth: ContextDepth.SEMANTIC })
      await new Promise(resolve => setTimeout(resolve, 2))

      engine.project([result2], { depth: ContextDepth.SEMANTIC })
      await new Promise(resolve => setTimeout(resolve, 2))

      // Access result1 (makes it most recently used)
      engine.project([result1], { depth: ContextDepth.SEMANTIC })
      await new Promise(resolve => setTimeout(resolve, 2))

      // Add result3 (should evict result2, not result1)
      engine.project([result3], { depth: ContextDepth.SEMANTIC })

      // result1 and result3 should be cached, result2 evicted
      expect(engine.isCached(result1.id, ContextDepth.SEMANTIC)).toBe(true)
      expect(engine.isCached(result3.id, ContextDepth.SEMANTIC)).toBe(true)
      expect(engine.isCached(result2.id, ContextDepth.SEMANTIC)).toBe(false)
    })
  })

  describe('Performance Requirements', () => {
    it('should project in < 50ms per result (overhead requirement)', () => {
      const results = Array.from({ length: 10 }, (_, i) =>
        createFullRankedResult(`entity-${i}`)
      )

      const start = performance.now()
      const projected = engine.project(results, { depth: ContextDepth.SEMANTIC })
      const totalTime = performance.now() - start

      const timePerResult = totalTime / results.length
      expect(timePerResult).toBeLessThan(50) // < 50ms per result
    })

    it('should handle large result sets efficiently', () => {
      const results = Array.from({ length: 100 }, (_, i) =>
        createFullRankedResult(`entity-${i}`)
      )

      const start = performance.now()
      engine.project(results, { depth: ContextDepth.SIGNATURE })
      const time = performance.now() - start

      // Should complete in reasonable time even for 100 results
      expect(time).toBeLessThan(5000) // < 5 seconds for 100 results
    })

    it('should not leak memory with repeated projections', () => {
      const engine = new ProjectionEngine()
      const initialMemory = process.memoryUsage().heapUsed

      // Perform many projections
      for (let i = 0; i < 1000; i++) {
        const result = createFullRankedResult(`entity-${i}`)
        engine.project([result], { depth: ContextDepth.SEMANTIC })
      }

      const finalMemory = process.memoryUsage().heapUsed
      const growth = finalMemory - initialMemory

      // Memory growth should be reasonable (< 50MB for 1000 projections)
      expect(growth).toBeLessThan(50 * 1024 * 1024)
    })
  })

  describe('Integration with ContextDepth Enum', () => {
    it('should use existing ContextDepth enum values', () => {
      expect(ContextDepth.SIGNATURE).toBe(1)
      expect(ContextDepth.STRUCTURE).toBe(2)
      expect(ContextDepth.SEMANTIC).toBe(3)
      expect(ContextDepth.DETAILED).toBe(4)
      expect(ContextDepth.HISTORICAL).toBe(5)
    })

    it('should accept all ContextDepth values', () => {
      const result = createFullRankedResult()

      const depths = [
        ContextDepth.SIGNATURE,
        ContextDepth.STRUCTURE,
        ContextDepth.SEMANTIC,
        ContextDepth.DETAILED,
        ContextDepth.HISTORICAL,
      ]

      depths.forEach(depth => {
        const projected = engine.project([result], { depth })
        expect(projected).toHaveLength(1)
        expect(projected[0].depthLevel).toBe(depth)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty result arrays', () => {
      const projected = engine.project([], { depth: ContextDepth.SEMANTIC })
      expect(projected).toEqual([])
    })

    it('should handle results with missing properties', () => {
      const minimalResult: RankedResult = {
        id: 'test-1',
        type: 'document',
        properties: { name: 'Test' },
        lifecycle: undefined,
        literalMatchScore: 0.5,
        polarity: 'neutral',
        relevanceFactors: { recency: 0.5, authority: 0.5, completeness: 0.5 },
        intentAlignment: 0.5,
        polarityAlignment: 0.5,
        authorityScore: 0.5,
        relevanceScore: 0.5,
        scoreBreakdown: {
          literal: 0.5,
          intent: 0.5,
          polarity: 0.5,
          authority: 0.5,
          recency: 0.5,
        },
      }

      const projected = engine.project([minimalResult], { depth: ContextDepth.SEMANTIC })
      expect(projected).toHaveLength(1)
      expect(projected[0].result.id).toBe('test-1')
    })

    it('should handle invalid depth values gracefully', () => {
      const result = createFullRankedResult()

      // Should default to STRUCTURE for invalid depth
      const projected = engine.project([result], { depth: 99 as ContextDepth })
      expect(projected[0].depthLevel).toBe(ContextDepth.STRUCTURE)
    })

    it('should handle null/undefined configuration', () => {
      const result = createFullRankedResult()
      const projected = engine.project([result], undefined)

      // Should use default depth
      expect(projected).toHaveLength(1)
      expect(projected[0].depthLevel).toBeDefined()
    })

    it('should handle results with very large properties', () => {
      const result = createFullRankedResult()
      result.properties.largeContent = 'x'.repeat(1000000) // 1MB of content

      const start = performance.now()
      const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })
      const time = performance.now() - start

      // Should still be fast at SIGNATURE level (minimal properties)
      expect(time).toBeLessThan(50)

      // Should not include large content at SIGNATURE level
      expect(projected[0].result.properties.largeContent).toBeUndefined()
    })
  })

  describe('Expansion Hints Generation', () => {
    it('should generate context-aware expansion hints', () => {
      const result = createFullRankedResult()
      result.lifecycle = {
        state: 'deprecated',
        confidence: 'high',
        manual: false,
        supersededBy: 'new-doc-id',
      }

      const projected = engine.project([result], { depth: ContextDepth.SIGNATURE })

      const hints = projected[0].expansionHints
      expect(hints?.suggestedNextDepth).toBe(ContextDepth.STRUCTURE)
      expect(hints?.reasons).toContain('deprecated') // Hint about deprecated status
    })

    it('should suggest appropriate depths based on content type', () => {
      const codeResult = createFullRankedResult('code')
      const docResult = createFullRankedResult('document')

      const codeProjected = engine.project([codeResult], { depth: ContextDepth.SIGNATURE })
      const docProjected = engine.project([docResult], { depth: ContextDepth.SIGNATURE })

      // Code might suggest DETAILED (need full code)
      // Documents might suggest SEMANTIC (need summary first)
      expect(codeProjected[0].expansionHints?.suggestedNextDepth).toBeDefined()
      expect(docProjected[0].expansionHints?.suggestedNextDepth).toBeDefined()
    })
  })
})

// Test Helper Functions

function createMockRankedResult(id = 'test-1'): RankedResult {
  return {
    id,
    type: 'document',
    properties: { name: 'Test Document' },
    literalMatchScore: 0.8,
    polarity: 'positive',
    relevanceFactors: {
      recency: 0.9,
      authority: 0.8,
      completeness: 0.7,
    },
    intentAlignment: 0.85,
    polarityAlignment: 0.9,
    authorityScore: 0.8,
    relevanceScore: 0.83,
    scoreBreakdown: {
      literal: 0.8,
      intent: 0.85,
      polarity: 0.9,
      authority: 0.8,
      recency: 0.9,
    },
  }
}

function createFullRankedResult(id = 'test-1'): RankedResult {
  return {
    id,
    type: 'document',
    properties: {
      name: 'Test Document',
      content: 'This is the full content of the document with lots of details.',
      metadata: { tags: ['test', 'documentation'], version: '1.0' },
    },
    lifecycle: {
      state: 'current',
      confidence: 'high',
      manual: false,
    },
    literalMatchScore: 0.8,
    polarity: 'positive',
    supersessionChain: ['old-doc-1', 'old-doc-2'],
    temporalContext: {
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-11-15T00:00:00Z',
    },
    relevanceFactors: {
      recency: 0.9,
      authority: 0.8,
      completeness: 0.7,
    },
    embeddingSimilarity: 0.92,
    intentAlignment: 0.85,
    polarityAlignment: 0.9,
    authorityScore: 0.8,
    relevanceScore: 0.87,
    scoreBreakdown: {
      literal: 0.8,
      embedding: 0.92,
      intent: 0.85,
      polarity: 0.9,
      authority: 0.8,
      recency: 0.9,
    },
  }
}

function createLargeRankedResult(id = 'large-1'): RankedResult {
  const result = createFullRankedResult(id)
  result.properties.content = 'x'.repeat(10000) // Large content
  result.properties.extraData = Array.from({ length: 100 }, (_, i) => ({
    key: `field-${i}`,
    value: `value-${i}`.repeat(100),
  }))
  return result
}

function createFullPresentedResult(result: RankedResult): PresentedResult {
  return {
    result,
    relevantBlocks: [
      {
        id: 'block-1',
        type: 'decision',
        content: 'This is a semantic block',
        importance: 'high',
        attributes: {},
        parentId: result.id,
      },
      {
        id: 'block-2',
        type: 'outcome',
        content: 'Another semantic block',
        importance: 'medium',
        attributes: {},
        parentId: result.id,
      },
    ],
    contextChain: [
      {
        id: 'old-doc-1',
        type: 'document',
        properties: { name: 'Old Version 1' },
        relationship: 'SUPERSEDES',
      },
      {
        id: 'old-doc-2',
        type: 'document',
        properties: { name: 'Old Version 2' },
        relationship: 'SUPERSEDES',
      },
    ],
    navigationHints: [
      'Try "how to implement" for step-by-step guidance',
      'See current version for latest guidance',
    ],
    relatedSuggestions: [
      {
        id: 'related-1',
        reason: 'Highly relevant',
        relevance: 0.85,
      },
      {
        id: 'related-2',
        reason: 'Alternative perspective',
        relevance: 0.72,
      },
    ],
  }
}
