/**
 * ProjectionEngine Storage Integration Tests (TASK-005)
 *
 * Tests for integrating ProjectionEngine with real storage providers.
 * Written BEFORE implementation following TDD principles.
 *
 * Test Coverage:
 * - Provider interfaces (BlockProvider, SuggestionProvider)
 * - Async projection behavior
 * - Block fetching from storage
 * - Suggestion generation
 * - Error handling and fallbacks
 * - Performance with async operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectionEngine } from '../../../src/semantic/ProjectionEngine'
import type { BlockProvider, SuggestionProvider } from '../../../src/semantic/ProjectionEngine'
import { ContextDepth } from '../../../src/types/context'
import type { RankedResult, SemanticBlock } from '../../../src/semantic/types'

describe('ProjectionEngine - Storage Integration (TASK-005)', () => {
  describe('Provider Interfaces', () => {
    it('should accept BlockProvider in constructor', () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      expect(engine).toBeDefined()
      expect(engine).toBeInstanceOf(ProjectionEngine)
    })

    it('should accept SuggestionProvider in constructor', () => {
      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, undefined, mockSuggestionProvider)
      expect(engine).toBeDefined()
      expect(engine).toBeInstanceOf(ProjectionEngine)
    })

    it('should accept both providers in constructor', () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider, mockSuggestionProvider)
      expect(engine).toBeDefined()
    })

    it('should work without any providers (backward compatibility)', () => {
      const engine = new ProjectionEngine()
      expect(engine).toBeDefined()
    })
  })

  describe('Async Projection', () => {
    it('should make project() method async and return Promise', async () => {
      const engine = new ProjectionEngine()
      const result = createMockRankedResult()

      const projectedPromise = engine.project([result], { depth: ContextDepth.SIGNATURE })

      // Should return a Promise
      expect(projectedPromise).toBeInstanceOf(Promise)

      // Should resolve to projected results
      const projected = await projectedPromise
      expect(projected).toHaveLength(1)
      expect(projected[0].result.id).toBe(result.id)
    })

    it('should handle async projection at all depth levels', async () => {
      const engine = new ProjectionEngine()
      const result = createMockRankedResult()

      const depths = [
        ContextDepth.SIGNATURE,
        ContextDepth.STRUCTURE,
        ContextDepth.SEMANTIC,
        ContextDepth.DETAILED,
        ContextDepth.HISTORICAL,
      ]

      for (const depth of depths) {
        const projected = await engine.project([result], { depth })
        expect(projected).toHaveLength(1)
        expect(projected[0].depthLevel).toBe(depth)
      }
    })

    it('should maintain cache behavior with async projection', async () => {
      const engine = new ProjectionEngine({ cacheSize: 10 })
      const result = createMockRankedResult()

      // First call - not cached
      const first = await engine.project([result], { depth: ContextDepth.SEMANTIC })
      expect(first).toHaveLength(1)

      // Second call - should hit cache
      const second = await engine.project([result], { depth: ContextDepth.SEMANTIC })
      expect(second).toHaveLength(1)
      expect(second[0].result.id).toBe(first[0].result.id)

      // Cache should have one entry
      expect(engine.getCacheSize()).toBe(1)
    })

    it('should handle concurrent projections correctly', async () => {
      const engine = new ProjectionEngine()
      const results = [
        createMockRankedResult('entity-1'),
        createMockRankedResult('entity-2'),
        createMockRankedResult('entity-3'),
      ]

      // Project all concurrently
      const promises = results.map(r =>
        engine.project([r], { depth: ContextDepth.SEMANTIC })
      )

      const allProjected = await Promise.all(promises)

      expect(allProjected).toHaveLength(3)
      expect(allProjected[0][0].result.id).toBe('entity-1')
      expect(allProjected[1][0].result.id).toBe('entity-2')
      expect(allProjected[2][0].result.id).toBe('entity-3')
    })
  })

  describe('BlockProvider Integration', () => {
    it('should fetch blocks from BlockProvider when provided', async () => {
      const mockBlocks: SemanticBlock[] = [
        {
          id: 'storage-block-1',
          type: 'decision',
          content: 'Real decision from storage',
          importance: 'high',
          attributes: { author: 'system' },
          parentId: 'entity-1',
        },
        {
          id: 'storage-block-2',
          type: 'outcome',
          content: 'Real outcome from storage',
          importance: 'medium',
          attributes: {},
          parentId: 'entity-1',
        },
      ]

      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue(mockBlocks),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const result = createMockRankedResult('entity-1')

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should call provider with correct entity ID and depth
      expect(mockBlockProvider.fetchBlocksForEntity).toHaveBeenCalledWith(
        'entity-1',
        ContextDepth.SEMANTIC
      )

      // Should include blocks from provider
      expect(projected[0].relevantBlocks).toEqual(mockBlocks)
    })

    it('should not fetch blocks at depths below SEMANTIC', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const result = createMockRankedResult()

      // SIGNATURE and STRUCTURE should not fetch blocks
      await engine.project([result], { depth: ContextDepth.SIGNATURE })
      expect(mockBlockProvider.fetchBlocksForEntity).not.toHaveBeenCalled()

      mockBlockProvider.fetchBlocksForEntity.mockClear()
      await engine.project([result], { depth: ContextDepth.STRUCTURE })
      expect(mockBlockProvider.fetchBlocksForEntity).not.toHaveBeenCalled()

      // SEMANTIC should fetch blocks
      mockBlockProvider.fetchBlocksForEntity.mockClear()
      await engine.project([result], { depth: ContextDepth.SEMANTIC })
      expect(mockBlockProvider.fetchBlocksForEntity).toHaveBeenCalled()
    })

    it('should fetch blocks at DETAILED depth', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const result = createMockRankedResult()

      // DETAILED should fetch blocks
      await engine.project([result], { depth: ContextDepth.DETAILED })
      expect(mockBlockProvider.fetchBlocksForEntity).toHaveBeenCalledWith(
        result.id,
        ContextDepth.DETAILED
      )
    })

    it('should not fetch blocks at HISTORICAL depth (full result returned)', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const result = createMockRankedResult()

      // HISTORICAL returns full result, so no need to fetch blocks separately
      await engine.project([result], { depth: ContextDepth.HISTORICAL })
      expect(mockBlockProvider.fetchBlocksForEntity).not.toHaveBeenCalled()
    })

    it('should fall back to mock blocks when no provider given', async () => {
      const engine = new ProjectionEngine() // No provider
      const result = createFullRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should have mock blocks (generated from result properties)
      expect(projected[0].relevantBlocks.length).toBeGreaterThan(0)
      expect(projected[0].relevantBlocks[0].id).toMatch(/^block-/)
    })

    it('should handle provider errors gracefully', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockRejectedValue(new Error('Storage error')),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const result = createMockRankedResult()

      // Should not throw, but fall back to empty blocks or mock
      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      expect(projected).toBeDefined()
      expect(projected).toHaveLength(1)
      // On error, should fall back to mock blocks
      expect(projected[0].relevantBlocks).toBeDefined()
    })

    it('should fetch blocks for multiple results', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockImplementation(async (id: string) => [
          {
            id: `block-${id}`,
            type: 'decision',
            content: `Block for ${id}`,
            importance: 'high',
            attributes: {},
            parentId: id,
          },
        ]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const results = [
        createMockRankedResult('entity-1'),
        createMockRankedResult('entity-2'),
        createMockRankedResult('entity-3'),
      ]

      const projected = await engine.project(results, { depth: ContextDepth.SEMANTIC })

      // Should call provider for each entity
      expect(mockBlockProvider.fetchBlocksForEntity).toHaveBeenCalledTimes(3)

      // Each result should have its blocks
      expect(projected[0].relevantBlocks[0].parentId).toBe('entity-1')
      expect(projected[1].relevantBlocks[0].parentId).toBe('entity-2')
      expect(projected[2].relevantBlocks[0].parentId).toBe('entity-3')
    })

    it('should handle empty blocks from provider', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const result = createMockRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      expect(projected[0].relevantBlocks).toEqual([])
    })
  })

  describe('SuggestionProvider Integration', () => {
    it('should generate suggestions using SuggestionProvider when provided', async () => {
      const mockSuggestions = [
        {
          id: 'related-entity-1',
          reason: 'Current alternative',
          relevance: 0.92,
        },
        {
          id: 'related-entity-2',
          reason: 'Similar content',
          relevance: 0.78,
        },
      ]

      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue(mockSuggestions),
      }

      const engine = new ProjectionEngine({}, undefined, mockSuggestionProvider)
      const result = createMockRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should call provider with result and depth
      expect(mockSuggestionProvider.generateSuggestions).toHaveBeenCalledWith(
        result,
        ContextDepth.SEMANTIC,
        expect.objectContaining({ allResults: expect.any(Array) })
      )

      // Should include suggestions from provider
      expect(projected[0].relatedSuggestions).toEqual(mockSuggestions)
    })

    it('should not generate suggestions at depths below SEMANTIC', async () => {
      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, undefined, mockSuggestionProvider)
      const result = createMockRankedResult()

      // SIGNATURE and STRUCTURE should not generate suggestions
      await engine.project([result], { depth: ContextDepth.SIGNATURE })
      expect(mockSuggestionProvider.generateSuggestions).not.toHaveBeenCalled()

      mockSuggestionProvider.generateSuggestions.mockClear()
      await engine.project([result], { depth: ContextDepth.STRUCTURE })
      expect(mockSuggestionProvider.generateSuggestions).not.toHaveBeenCalled()

      // SEMANTIC and above should generate suggestions
      mockSuggestionProvider.generateSuggestions.mockClear()
      await engine.project([result], { depth: ContextDepth.SEMANTIC })
      expect(mockSuggestionProvider.generateSuggestions).toHaveBeenCalled()
    })

    it('should return empty suggestions when no provider given', async () => {
      const engine = new ProjectionEngine() // No provider
      const result = createMockRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should have empty suggestions
      expect(projected[0].relatedSuggestions).toEqual([])
    })

    it('should handle provider errors gracefully', async () => {
      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockRejectedValue(new Error('Suggestion error')),
      }

      const engine = new ProjectionEngine({}, undefined, mockSuggestionProvider)
      const result = createMockRankedResult()

      // Should not throw, but fall back to empty suggestions
      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      expect(projected).toBeDefined()
      expect(projected[0].relatedSuggestions).toEqual([])
    })

    it('should pass all results to provider for context', async () => {
      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, undefined, mockSuggestionProvider)
      const results = [
        createMockRankedResult('entity-1'),
        createMockRankedResult('entity-2'),
        createMockRankedResult('entity-3'),
      ]

      await engine.project(results, { depth: ContextDepth.SEMANTIC })

      // Provider should receive calls for each result
      expect(mockSuggestionProvider.generateSuggestions).toHaveBeenCalledTimes(3)

      // Each call should have access to all results
      for (let i = 0; i < 3; i++) {
        expect(mockSuggestionProvider.generateSuggestions).toHaveBeenNthCalledWith(
          i + 1,
          expect.objectContaining({ id: `entity-${i + 1}` }),
          ContextDepth.SEMANTIC,
          expect.objectContaining({
            allResults: expect.arrayContaining([
              expect.objectContaining({ id: 'entity-1' }),
              expect.objectContaining({ id: 'entity-2' }),
              expect.objectContaining({ id: 'entity-3' }),
            ]),
          })
        )
      }
    })

    it('should handle empty suggestions from provider', async () => {
      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, undefined, mockSuggestionProvider)
      const result = createMockRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      expect(projected[0].relatedSuggestions).toEqual([])
    })
  })

  describe('Combined Provider Integration', () => {
    it('should use both providers when both are provided', async () => {
      const mockBlocks: SemanticBlock[] = [
        {
          id: 'block-1',
          type: 'decision',
          content: 'Real block',
          importance: 'high',
          attributes: {},
          parentId: 'entity-1',
        },
      ]

      const mockSuggestions = [
        {
          id: 'suggestion-1',
          reason: 'Related',
          relevance: 0.85,
        },
      ]

      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue(mockBlocks),
      }

      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue(mockSuggestions),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider, mockSuggestionProvider)
      const result = createMockRankedResult('entity-1')

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should call both providers
      expect(mockBlockProvider.fetchBlocksForEntity).toHaveBeenCalled()
      expect(mockSuggestionProvider.generateSuggestions).toHaveBeenCalled()

      // Should have both blocks and suggestions
      expect(projected[0].relevantBlocks).toEqual(mockBlocks)
      expect(projected[0].relatedSuggestions).toEqual(mockSuggestions)
    })

    it('should handle one provider failing while other succeeds', async () => {
      const mockBlocks: SemanticBlock[] = [
        {
          id: 'block-1',
          type: 'decision',
          content: 'Real block',
          importance: 'high',
          attributes: {},
          parentId: 'entity-1',
        },
      ]

      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue(mockBlocks),
      }

      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockRejectedValue(new Error('Suggestion error')),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider, mockSuggestionProvider)
      const result = createMockRankedResult('entity-1')

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should have blocks from successful provider
      expect(projected[0].relevantBlocks).toEqual(mockBlocks)

      // Should have empty suggestions due to error
      expect(projected[0].relatedSuggestions).toEqual([])
    })
  })

  describe('Performance with Providers', () => {
    it('should complete projection with providers in <50ms per result', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([
          {
            id: 'block-1',
            type: 'decision',
            content: 'Fast block',
            importance: 'high',
            attributes: {},
            parentId: 'entity-1',
          },
        ]),
      }

      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([
          {
            id: 'suggestion-1',
            reason: 'Fast suggestion',
            relevance: 0.8,
          },
        ]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider, mockSuggestionProvider)
      const result = createMockRankedResult()

      const start = performance.now()
      await engine.project([result], { depth: ContextDepth.SEMANTIC })
      const duration = performance.now() - start

      // Should complete in <50ms (generous for async operations)
      expect(duration).toBeLessThan(50)
    })

    it('should handle 100 results in <5s with providers', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider, mockSuggestionProvider)

      // Create 100 results
      const results = Array.from({ length: 100 }, (_, i) =>
        createMockRankedResult(`entity-${i}`)
      )

      const start = performance.now()
      await engine.project(results, { depth: ContextDepth.SEMANTIC })
      const duration = performance.now() - start

      // Should complete in <5s
      expect(duration).toBeLessThan(5000)
    })
  })

  describe('Backward Compatibility', () => {
    it('should work without providers (mock fallback)', async () => {
      const engine = new ProjectionEngine() // No providers
      const result = createMockRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should complete successfully
      expect(projected).toHaveLength(1)
      expect(projected[0].depthLevel).toBe(ContextDepth.SEMANTIC)

      // Should have mock blocks (from mock generator)
      expect(projected[0].relevantBlocks).toBeDefined()

      // Should have empty suggestions
      expect(projected[0].relatedSuggestions).toEqual([])
    })

    it('should work with only BlockProvider', async () => {
      const mockBlockProvider: BlockProvider = {
        fetchBlocksForEntity: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, mockBlockProvider)
      const result = createMockRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should call block provider
      expect(mockBlockProvider.fetchBlocksForEntity).toHaveBeenCalled()

      // Should have empty suggestions (no provider)
      expect(projected[0].relatedSuggestions).toEqual([])
    })

    it('should work with only SuggestionProvider', async () => {
      const mockSuggestionProvider: SuggestionProvider = {
        generateSuggestions: vi.fn().mockResolvedValue([]),
      }

      const engine = new ProjectionEngine({}, undefined, mockSuggestionProvider)
      const result = createMockRankedResult()

      const projected = await engine.project([result], { depth: ContextDepth.SEMANTIC })

      // Should call suggestion provider
      expect(mockSuggestionProvider.generateSuggestions).toHaveBeenCalled()

      // Should have mock blocks (no provider)
      expect(projected[0].relevantBlocks).toBeDefined()
    })
  })
})

// Test Helper Functions

function createMockRankedResult(id = 'entity-1'): RankedResult {
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

function createFullRankedResult(id = 'entity-1'): RankedResult {
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
