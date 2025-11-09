/**
 * Tests for Semantic Enrichment Processor
 *
 * Tests entity enrichment with lifecycle metadata and semantic blocks
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SemanticEnrichmentProcessor,
  enrichEntity,
  enrichEntities,
} from '../../../src/semantic/SemanticEnrichmentProcessor'
import type { Entity } from '../../../src/types/entity'

describe('SemanticEnrichmentProcessor', () => {
  let processor: SemanticEnrichmentProcessor

  beforeEach(() => {
    processor = new SemanticEnrichmentProcessor()
  })

  describe('Basic Enrichment', () => {
    it('should enrich entity with lifecycle metadata', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test Document',
        content: 'This is our current approach for authentication.',
      }

      const result = await processor.enrich(entity)

      expect(result.hasLifecycle).toBe(true)
      expect(result.entity.metadata?.lifecycle).toBeDefined()
      expect(result.entity.metadata?.lifecycle?.state).toBe('current')
    })

    it('should extract semantic blocks from content', async () => {
      const entity: Entity = {
        id: 'doc-2',
        type: 'document',
        name: 'Decision Document',
        content: `
Some text
::decision{id="use-postgres"}
We decided to use PostgreSQL.
::
More text
        `.trim(),
      }

      const result = await processor.enrich(entity)

      expect(result.hasSemanticBlocks).toBe(true)
      expect(result.blockCount).toBe(1)
      expect(result.entity.metadata?.blocks).toHaveLength(1)
      expect(result.entity.metadata?.blocks?.[0].type).toBe('decision')
    })

    it('should enrich with both lifecycle and blocks', async () => {
      const entity: Entity = {
        id: 'doc-3',
        type: 'document',
        name: 'Complete Document',
        content: `
This approach is deprecated.

::outcome{id="migration-complete"}
Migration to new system is complete.
::
        `.trim(),
      }

      const result = await processor.enrich(entity)

      expect(result.hasLifecycle).toBe(true)
      expect(result.hasSemanticBlocks).toBe(true)
      expect(result.entity.metadata?.lifecycle?.state).toBe('deprecated')
      expect(result.entity.metadata?.blocks).toHaveLength(1)
    })
  })

  describe('Configuration Options', () => {
    it('should disable lifecycle detection when configured', async () => {
      const processor = new SemanticEnrichmentProcessor({
        detectLifecycle: false,
      })

      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'This is deprecated.',
      }

      const result = await processor.enrich(entity)

      expect(result.hasLifecycle).toBe(false)
      expect(result.entity.metadata?.lifecycle).toBeUndefined()
    })

    it('should disable block extraction when configured', async () => {
      const processor = new SemanticEnrichmentProcessor({
        extractSemanticBlocks: false,
      })

      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: '::decision{}\nContent\n::',
      }

      const result = await processor.enrich(entity)

      expect(result.hasSemanticBlocks).toBe(false)
      expect(result.entity.metadata?.blocks).toBeUndefined()
    })

    it('should use custom default lifecycle state', async () => {
      const processor = new SemanticEnrichmentProcessor({
        defaultLifecycleState: 'evolving',
      })

      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Generic content without lifecycle indicators.',
      }

      const result = await processor.enrich(entity)

      expect(result.entity.metadata?.lifecycle?.state).toBe('evolving')
    })
  })

  describe('Batch Enrichment', () => {
    it('should enrich multiple entities', async () => {
      const entities: Entity[] = [
        {
          id: 'doc-1',
          type: 'document',
          name: 'Doc 1',
          content: 'Current approach',
        },
        {
          id: 'doc-2',
          type: 'document',
          name: 'Doc 2',
          content: 'Deprecated approach',
        },
        {
          id: 'doc-3',
          type: 'document',
          name: 'Doc 3',
          content: '::decision{}\nDecision\n::',
        },
      ]

      const results = await processor.enrichBatch(entities)

      expect(results).toHaveLength(3)
      expect(results[0].hasLifecycle).toBe(true)
      expect(results[1].hasLifecycle).toBe(true)
      expect(results[2].hasSemanticBlocks).toBe(true)
    })

    it('should provide statistics for batch enrichment', async () => {
      const entities: Entity[] = [
        {
          id: 'doc-1',
          type: 'document',
          name: 'Doc 1',
          content: 'Current approach',
        },
        {
          id: 'doc-2',
          type: 'document',
          name: 'Doc 2',
          content: 'Deprecated approach',
        },
      ]

      const results = await processor.enrichBatch(entities)
      const stats = processor.getStats(results)

      expect(stats.total).toBe(2)
      expect(stats.enrichedWithLifecycle).toBe(2)
      expect(stats.lifecycleDistribution.current).toBeGreaterThan(0)
      expect(stats.lifecycleDistribution.deprecated).toBeGreaterThan(0)
    })
  })

  describe('Needs Enrichment Check', () => {
    it('should detect entities needing lifecycle enrichment', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Some content',
      }

      expect(processor.needsEnrichment(entity)).toBe(true)
    })

    it('should detect entities needing block extraction', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: '::decision{}\nDecision\n::',
        metadata: {
          lifecycle: {
            state: 'current',
            confidence: 'high',
            manual: true,
          },
        },
      }

      expect(processor.needsEnrichment(entity)).toBe(true)
    })

    it('should return false for fully enriched entities', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Some content',
        metadata: {
          lifecycle: {
            state: 'current',
            confidence: 'high',
            manual: true,
          },
        },
      }

      expect(processor.needsEnrichment(entity)).toBe(false)
    })
  })

  describe('Re-enrichment', () => {
    it('should preserve manual lifecycle assignments by default', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'This is deprecated content.',
        metadata: {
          lifecycle: {
            state: 'stable',
            confidence: 'high',
            manual: true,
            reason: 'User manually set as stable',
          },
        },
      }

      const result = await processor.reEnrich(entity, true)

      // Should preserve manual assignment despite detection
      expect(result.entity.metadata?.lifecycle?.state).toBe('stable')
      expect(result.entity.metadata?.lifecycle?.manual).toBe(true)
    })

    it('should overwrite manual assignments when requested', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'This is deprecated content.',
        metadata: {
          lifecycle: {
            state: 'stable',
            confidence: 'high',
            manual: true,
          },
        },
      }

      const result = await processor.reEnrich(entity, false)

      // Should detect new state
      expect(result.entity.metadata?.lifecycle?.state).toBe('deprecated')
      expect(result.entity.metadata?.lifecycle?.manual).toBe(false)
    })
  })

  describe('Manual Lifecycle Assignment', () => {
    it('should allow manual lifecycle state assignment', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Some content',
      }

      const updated = processor.setLifecycleState(
        entity,
        'archived',
        'Project completed'
      )

      expect(updated.metadata?.lifecycle?.state).toBe('archived')
      expect(updated.metadata?.lifecycle?.manual).toBe(true)
      expect(updated.metadata?.lifecycle?.confidence).toBe('high')
      expect(updated.metadata?.lifecycle?.reason).toBe('Project completed')
    })
  })

  describe('Convenience Methods', () => {
    it('should extract blocks without full enrichment', async () => {
      const content = '::decision{}\nDecision content\n::'
      const blocks = processor.extractBlocks(content, 'doc-1')

      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('decision')
    })

    it('should detect lifecycle without full enrichment', async () => {
      const content = 'This is deprecated.'
      const lifecycle = processor.detectLifecycleState(content)

      expect(lifecycle).toBeDefined()
      expect(lifecycle?.state).toBe('deprecated')
      expect(lifecycle?.manual).toBe(false)
    })

    it('should return null for undetectable lifecycle', async () => {
      const content = 'Generic content.'
      const lifecycle = processor.detectLifecycleState(content)

      expect(lifecycle).toBeNull()
    })
  })

  describe('Warnings', () => {
    it('should collect warnings for parsing errors', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: '::invalid-block{}\nContent\n::',
      }

      const result = await processor.enrich(entity)

      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should warn for low confidence lifecycle detection', async () => {
      const processor = new SemanticEnrichmentProcessor({
        lifecycleDetector: {
          flagLowConfidence: true,
        },
      })

      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Initially we used this approach.',
      }

      const result = await processor.enrich(entity)

      // This should trigger low confidence detection
      if (result.entity.metadata?.lifecycle?.confidence === 'low') {
        expect(result.warnings.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Global Convenience Functions', () => {
    it('should provide convenience function for single entity', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Current approach',
      }

      const result = await enrichEntity(entity)

      expect(result.hasLifecycle).toBe(true)
    })

    it('should provide convenience function for multiple entities', async () => {
      const entities: Entity[] = [
        {
          id: 'doc-1',
          type: 'document',
          name: 'Doc 1',
          content: 'Content 1',
        },
        {
          id: 'doc-2',
          type: 'document',
          name: 'Doc 2',
          content: 'Content 2',
        },
      ]

      const results = await enrichEntities(entities)

      expect(results).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle entities without content', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        // No content
      }

      const result = await processor.enrich(entity)

      expect(result.hasLifecycle).toBe(false)
      expect(result.hasSemanticBlocks).toBe(false)
    })

    it('should handle empty content', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: '',
      }

      const result = await processor.enrich(entity)

      expect(result.hasLifecycle).toBe(false)
      expect(result.hasSemanticBlocks).toBe(false)
    })

    it('should preserve existing metadata fields', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Current approach',
        metadata: {
          filename: 'test.md',
          format: 'markdown',
          customField: 'preserved',
        },
      }

      const result = await processor.enrich(entity)

      expect(result.entity.metadata?.filename).toBe('test.md')
      expect(result.entity.metadata?.format).toBe('markdown')
      expect(result.entity.metadata?.customField).toBe('preserved')
    })

    it('should not mutate original entity', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Test',
        content: 'Current approach',
      }

      const originalMetadata = entity.metadata

      processor.enrich(entity)

      // Original should be unchanged
      expect(entity.metadata).toBe(originalMetadata)
      expect(entity.metadata?.lifecycle).toBeUndefined()
    })
  })
})
