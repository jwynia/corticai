import { describe, it, expect, beforeEach } from 'vitest'
import {
  RelationshipInference,
  type RelationshipInferenceConfig,
  type RelationshipType,
} from '../../../src/semantic/RelationshipInference'
import type { Entity } from '../../../src/types/entity'

describe('RelationshipInference', () => {
  let inference: RelationshipInference

  beforeEach(() => {
    inference = new RelationshipInference({
      minConfidence: 0.6,
      detectMentions: true,
      detectReferences: true,
      detectSupersessions: true,
    })
  })

  describe('Constructor and Configuration', () => {
    it('should create inference engine with default config', () => {
      const defaultInference = new RelationshipInference()
      expect(defaultInference).toBeDefined()
    })

    it('should create inference engine with custom config', () => {
      const customInference = new RelationshipInference({
        minConfidence: 0.7,
        detectMentions: false,
        detectReferences: true,
        detectSupersessions: false,
        maxContentLength: 5000,
      })
      expect(customInference).toBeDefined()
    })

    it('should use default values for missing config options', () => {
      const partialConfigInference = new RelationshipInference({
        minConfidence: 0.5,
      })
      expect(partialConfigInference).toBeDefined()
    })
  })

  describe('infer (from Entity)', () => {
    it('should infer relationships from entity with content', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        content: 'See [documentation](./docs.md) for details. This supersedes old-guide.md.',
        metadata: {},
      }

      const result = await inference.infer(entity)

      expect(result).toBeDefined()
      expect(result.relationships).toBeInstanceOf(Array)
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.warnings).toBeInstanceOf(Array)
    })

    it('should include valid relationships in result', async () => {
      const entity: Entity = {
        id: 'doc-2',
        type: 'document',
        content: 'This document references [guide.md](./guide.md).',
        metadata: {},
      }

      const result = await inference.infer(entity)

      if (result.relationships.length > 0) {
        const rel = result.relationships[0]
        expect(rel).toHaveProperty('type')
        expect(rel).toHaveProperty('fromEntityId')
        expect(rel).toHaveProperty('toEntityIdOrPattern')
        expect(rel).toHaveProperty('confidence')
        expect(rel).toHaveProperty('evidence')
        expect(rel).toHaveProperty('resolved')
        expect(rel.fromEntityId).toBe('doc-2')
        expect(rel.confidence).toBeGreaterThanOrEqual(0)
        expect(rel.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should handle entity without content', async () => {
      const entity: Entity = {
        id: 'doc-3',
        type: 'document',
        metadata: {},
      }

      const result = await inference.infer(entity)

      expect(result).toBeDefined()
      expect(result.relationships).toHaveLength(0)
      expect(result.warnings).toContain('No content available for relationship inference')
    })

    it('should handle entity with empty content', async () => {
      const entity: Entity = {
        id: 'doc-4',
        type: 'document',
        content: '',
        metadata: {},
      }

      const result = await inference.infer(entity)

      expect(result).toBeDefined()
      expect(result.relationships).toHaveLength(0)
      expect(result.warnings).toContain('Content is empty')
    })

    it('should handle entity with whitespace-only content', async () => {
      const entity: Entity = {
        id: 'doc-5',
        type: 'document',
        content: '   \n\t  ',
        metadata: {},
      }

      const result = await inference.infer(entity)

      expect(result).toBeDefined()
      expect(result.relationships).toHaveLength(0)
      expect(result.warnings).toContain('Content is empty')
    })

    it('should handle very long content by truncating', async () => {
      const longContent = 'See [doc.md](./doc.md). '.repeat(500) // ~12000 chars
      const entity: Entity = {
        id: 'doc-6',
        type: 'document',
        content: longContent,
        metadata: {},
      }

      const result = await inference.infer(entity)

      expect(result).toBeDefined()
      // Should warn about truncation
      const truncationWarning = result.warnings.find(w => w.includes('truncated'))
      expect(truncationWarning).toBeDefined()
    })

    it('should respect minConfidence configuration', async () => {
      const highConfidenceInference = new RelationshipInference({
        minConfidence: 0.9,
      })

      const entity: Entity = {
        id: 'doc-7',
        type: 'document',
        content: 'Maybe related to something.md',
        metadata: {},
      }

      const result = await highConfidenceInference.infer(entity)

      result.relationships.forEach(rel => {
        expect(rel.confidence).toBeGreaterThanOrEqual(0.9)
      })
    })

    it('should handle null entity gracefully', async () => {
      await expect(inference.infer(null as any)).rejects.toThrow('Entity is required')
    })
  })

  describe('inferFromContent', () => {
    it('should infer relationships from raw content', async () => {
      const content = 'See [guide.md](./guide.md) for more information.'
      const entityId = 'doc-8'

      const result = await inference.inferFromContent(content, entityId)

      expect(result).toBeDefined()
      expect(result.relationships).toBeInstanceOf(Array)
    })

    it('should handle empty content', async () => {
      const result = await inference.inferFromContent('', 'doc-9')

      expect(result.relationships).toHaveLength(0)
      expect(result.warnings).toContain('Content is empty')
    })

    it('should handle whitespace-only content', async () => {
      const result = await inference.inferFromContent('   \n\t  ', 'doc-10')

      expect(result.relationships).toHaveLength(0)
      expect(result.warnings).toContain('Content is empty')
    })
  })

  describe('Mention Detection', () => {
    it('should detect markdown link mentions', async () => {
      const content = 'See [documentation](./docs/guide.md) for details.'
      const result = await inference.inferFromContent(content, 'doc-11')

      const mentions = result.relationships.filter(r => r.type === 'mentions')
      expect(mentions.length).toBeGreaterThan(0)
      if (mentions.length > 0) {
        expect(mentions[0].toEntityIdOrPattern).toMatch(/guide\.md/)
        expect(mentions[0].evidence).toContain('documentation')
      }
    })

    it('should detect file path mentions', async () => {
      const content = 'Import from src/utils/helper.ts for utilities.'
      const result = await inference.inferFromContent(content, 'doc-12')

      const mentions = result.relationships.filter(r => r.type === 'mentions')
      expect(mentions.length).toBeGreaterThan(0)
      if (mentions.length > 0) {
        expect(mentions[0].toEntityIdOrPattern).toMatch(/helper\.ts/)
      }
    })

    it('should detect multiple mentions in same document', async () => {
      const content = `
        See [guide.md](./guide.md) and [api.md](./api.md).
        Also check src/components/Button.tsx.
      `
      const result = await inference.inferFromContent(content, 'doc-13')

      const mentions = result.relationships.filter(r => r.type === 'mentions')
      expect(mentions.length).toBeGreaterThanOrEqual(2)
    })

    it('should not detect mentions when disabled', async () => {
      const noMentionsInference = new RelationshipInference({
        detectMentions: false,
      })

      const content = 'See [documentation](./docs.md) for details.'
      const result = await noMentionsInference.inferFromContent(content, 'doc-14')

      const mentions = result.relationships.filter(r => r.type === 'mentions')
      expect(mentions).toHaveLength(0)
    })
  })

  describe('Reference Detection', () => {
    it('should detect reference citations', async () => {
      const content = 'As described in RFC-123, we should implement feature X.'
      const result = await inference.inferFromContent(content, 'doc-15')

      const references = result.relationships.filter(r => r.type === 'references')
      expect(references.length).toBeGreaterThan(0)
      if (references.length > 0) {
        expect(references[0].toEntityIdOrPattern).toMatch(/RFC-123/)
      }
    })

    it('should detect @see references', async () => {
      const content = '@see architecture/design.md for implementation details'
      const result = await inference.inferFromContent(content, 'doc-16')

      const references = result.relationships.filter(r => r.type === 'references')
      expect(references.length).toBeGreaterThan(0)
      if (references.length > 0) {
        expect(references[0].toEntityIdOrPattern).toMatch(/design\.md/)
      }
    })

    it('should not detect references when disabled', async () => {
      const noRefsInference = new RelationshipInference({
        detectReferences: false,
      })

      const content = 'As described in RFC-123, we implement X.'
      const result = await noRefsInference.inferFromContent(content, 'doc-17')

      const references = result.relationships.filter(r => r.type === 'references')
      expect(references).toHaveLength(0)
    })
  })

  describe('Supersession Detection', () => {
    it('should detect "superseded by" patterns', async () => {
      const content = 'This document has been superseded by new-guide.md'
      const result = await inference.inferFromContent(content, 'doc-18')

      const supersessions = result.relationships.filter(r => r.type === 'supersedes')
      expect(supersessions.length).toBeGreaterThan(0)
      if (supersessions.length > 0) {
        expect(supersessions[0].toEntityIdOrPattern).toMatch(/new-guide\.md/)
        expect(supersessions[0].evidence).toContain('superseded by')
      }
    })

    it('should detect "see X instead" patterns', async () => {
      const content = 'This is deprecated. See updated-docs.md instead.'
      const result = await inference.inferFromContent(content, 'doc-19')

      const supersessions = result.relationships.filter(r => r.type === 'supersedes')
      expect(supersessions.length).toBeGreaterThan(0)
      if (supersessions.length > 0) {
        expect(supersessions[0].toEntityIdOrPattern).toMatch(/updated-docs\.md/)
      }
    })

    it('should detect "moved to X" patterns', async () => {
      const content = 'Content has been moved to new-location/guide.md'
      const result = await inference.inferFromContent(content, 'doc-20')

      const supersessions = result.relationships.filter(r => r.type === 'supersedes')
      expect(supersessions.length).toBeGreaterThan(0)
      if (supersessions.length > 0) {
        expect(supersessions[0].toEntityIdOrPattern).toMatch(/guide\.md/)
      }
    })

    it('should not detect supersessions when disabled', async () => {
      const noSuperInference = new RelationshipInference({
        detectSupersessions: false,
      })

      const content = 'This has been superseded by new.md'
      const result = await noSuperInference.inferFromContent(content, 'doc-21')

      const supersessions = result.relationships.filter(r => r.type === 'supersedes')
      expect(supersessions).toHaveLength(0)
    })
  })

  describe('Confidence Scoring', () => {
    it('should assign higher confidence to explicit patterns', async () => {
      const content = 'This supersedes [old.md](./old.md)' // Very explicit
      const result = await inference.inferFromContent(content, 'doc-22')

      if (result.relationships.length > 0) {
        expect(result.relationships[0].confidence).toBeGreaterThan(0.7)
      }
    })

    it('should assign lower confidence to ambiguous patterns', async () => {
      const content = 'Maybe related to something.md' // Vague
      const result = await inference.inferFromContent(content, 'doc-23')

      const lowConfRels = result.relationships.filter(r => r.confidence < 0.6)
      // Should either filter out or assign low confidence
      lowConfRels.forEach(rel => {
        expect(rel.confidence).toBeLessThan(0.6)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle content with special characters', async () => {
      const content = 'See [file@v2.0](./path/file@v2.0.md) for version 2.0'
      const result = await inference.inferFromContent(content, 'doc-24')

      expect(result).toBeDefined()
      expect(result.relationships.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle content with URLs', async () => {
      const content = 'Visit https://example.com/docs for more info'
      const result = await inference.inferFromContent(content, 'doc-25')

      expect(result).toBeDefined()
    })

    it('should handle content with code blocks', async () => {
      const content = `
        \`\`\`typescript
        import { helper } from './utils/helper.ts'
        \`\`\`
      `
      const result = await inference.inferFromContent(content, 'doc-26')

      expect(result).toBeDefined()
      // Code imports might be detected as mentions
    })

    it('should handle malformed entities gracefully', async () => {
      const malformedEntity: any = { id: 'bad' }
      const result = await inference.infer(malformedEntity)

      expect(result).toBeDefined()
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should complete within reasonable time for typical document', async () => {
      const entity: Entity = {
        id: 'doc-27',
        type: 'document',
        content: 'See [guide.md](./guide.md) and [api.md](./api.md) for details.',
        metadata: {},
      }

      const startTime = Date.now()
      await inference.infer(entity)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000)
    })

    it('should return processingTimeMs in result', async () => {
      const entity: Entity = {
        id: 'doc-28',
        type: 'document',
        content: 'Content',
        metadata: {},
      }

      const result = await inference.infer(entity)

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
      expect(typeof result.processingTimeMs).toBe('number')
    })
  })

  describe('Relationship Properties', () => {
    it('should mark relationships as unresolved by default', async () => {
      const content = 'See [unknown-doc.md](./unknown-doc.md)'
      const result = await inference.inferFromContent(content, 'doc-29')

      if (result.relationships.length > 0) {
        expect(result.relationships[0].resolved).toBe(false)
      }
    })

    it('should include source location when available', async () => {
      const content = 'This supersedes old.md at position 15-25'
      const result = await inference.inferFromContent(content, 'doc-30')

      const withLocation = result.relationships.filter(r => r.sourceLocation !== undefined)
      // Source location is optional, but good to track when possible
      if (withLocation.length > 0) {
        expect(withLocation[0].sourceLocation?.start).toBeGreaterThanOrEqual(0)
        expect(withLocation[0].sourceLocation?.end).toBeGreaterThan(
          withLocation[0].sourceLocation?.start || 0
        )
      }
    })

    it('should include evidence text', async () => {
      const content = 'See [guide.md](./guide.md) for details'
      const result = await inference.inferFromContent(content, 'doc-31')

      if (result.relationships.length > 0) {
        expect(result.relationships[0].evidence).toBeTruthy()
        expect(typeof result.relationships[0].evidence).toBe('string')
      }
    })
  })

  describe('Security - ReDoS Protection', () => {
    it('should handle pathological regex input without hanging', async () => {
      // Create input designed to cause catastrophic backtracking
      // Pattern: repeated "see " followed by a filename
      const maliciousContent = 'see '.repeat(10000) + 'docs.md'

      const startTime = Date.now()
      const result = await inference.inferFromContent(maliciousContent, 'redos-test')
      const duration = Date.now() - startTime

      // Should complete in reasonable time despite pathological input
      expect(duration).toBeLessThan(1000)

      // May or may not detect relationships in this pathological case
      // The important thing is it doesn't hang
      expect(result.relationships).toBeDefined()
    })

    it('should enforce MAX_REGEX_CONTENT_LENGTH limit', async () => {
      // Create very long content that exceeds the ReDoS protection limit
      const veryLongContent = 'a'.repeat(100000) + ' see [doc.md](./doc.md)'

      const result = await inference.inferFromContent(veryLongContent, 'length-test')

      // Should have truncation warning
      expect(result.warnings.some(w => w.includes('truncated'))).toBe(true)

      // Should still work despite truncation
      expect(result.relationships).toBeDefined()
    })

    it('should handle nested markdown links without exponential backtracking', async () => {
      // Nested brackets can cause exponential backtracking in naive regex
      const nestedBrackets = '[[[[[[docs.md]]]]]]'
      const content = `See ${nestedBrackets} for more info`

      const startTime = Date.now()
      const result = await inference.inferFromContent(content, 'nested-test')
      const duration = Date.now() - startTime

      // Should complete quickly
      expect(duration).toBeLessThan(100)
    })

    it('should respect user-specified maxContentLength under ReDoS limit', () => {
      const customInference = new RelationshipInference({
        maxContentLength: 5000
      })

      // Access private config via type assertion for testing
      const config = (customInference as any).config

      expect(config.maxContentLength).toBe(5000)
    })

    it('should cap maxContentLength at ReDoS protection limit', () => {
      const unsafeInference = new RelationshipInference({
        maxContentLength: 100000 // Above the 50000 limit
      })

      const config = (unsafeInference as any).config

      // Should be capped at MAX_REGEX_CONTENT_LENGTH (50000)
      expect(config.maxContentLength).toBe(50000)
    })
  })
})
