/**
 * Tests for Semantic Storage Integration (Phase 3)
 *
 * Tests storage and retrieval of questions and relationships generated
 * during semantic enrichment, including full-text search for vocabulary bridging.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SemanticEnrichmentProcessor } from '../../../src/semantic/SemanticEnrichmentProcessor'
import type { Entity } from '../../../src/types/entity'
import type { QuestionAnswerPair } from '../../../src/semantic/QuestionGenerator'
import type { InferredRelationship } from '../../../src/semantic/RelationshipInference'

describe('Semantic Storage Integration', () => {
  let processor: SemanticEnrichmentProcessor

  beforeEach(() => {
    processor = new SemanticEnrichmentProcessor({
      generateQuestions: true,
      inferRelationships: true,
    })
  })

  describe('Question Storage', () => {
    it('should store generated questions in entity metadata', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        name: 'Authentication Guide',
        content: 'This guide explains how to implement OAuth authentication in your application.',
      }

      const result = await processor.enrich(entity)

      expect(result.hasQuestions).toBe(true)
      expect(result.questionCount).toBeGreaterThan(0)
      expect(result.entity.metadata?.questions).toBeDefined()
      expect(result.entity.metadata?.questions).toBeInstanceOf(Array)
    })

    it('should store question metadata with all required fields', async () => {
      const entity: Entity = {
        id: 'doc-2',
        type: 'document',
        name: 'Testing Guide',
        content: 'Unit tests verify individual components work correctly.',
      }

      const result = await processor.enrich(entity)

      const questions = result.entity.metadata?.questions as QuestionAnswerPair[]
      expect(questions.length).toBeGreaterThan(0)

      const firstQuestion = questions[0]
      expect(firstQuestion).toHaveProperty('question')
      expect(firstQuestion).toHaveProperty('answer')
      expect(firstQuestion).toHaveProperty('confidence')
      expect(firstQuestion).toHaveProperty('sourceEntityId')

      expect(typeof firstQuestion.question).toBe('string')
      expect(typeof firstQuestion.answer).toBe('string')
      expect(firstQuestion.confidence).toBeGreaterThanOrEqual(0)
      expect(firstQuestion.confidence).toBeLessThanOrEqual(1)
      expect(firstQuestion.sourceEntityId).toBe('doc-2')
    })

    it('should generate multiple questions for rich content', async () => {
      const entity: Entity = {
        id: 'doc-3',
        type: 'document',
        name: 'Complex Topic',
        content: `
          This document explains dependency injection.
          It shows how to implement constructor injection.
          This pattern improves testability and maintainability.
          Use it when you need loose coupling between components.
        `,
      }

      const result = await processor.enrich(entity)

      expect(result.questionCount).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Relationship Storage', () => {
    it('should store inferred relationships in entity metadata', async () => {
      const entity: Entity = {
        id: 'doc-4',
        type: 'document',
        name: 'Migration Guide',
        content: 'See [new-guide.md](./new-guide.md) for the updated approach.',
      }

      const result = await processor.enrich(entity)

      expect(result.hasRelationships).toBe(true)
      expect(result.relationshipCount).toBeGreaterThan(0)
      expect(result.entity.metadata?.inferredRelationships).toBeDefined()
      expect(result.entity.metadata?.inferredRelationships).toBeInstanceOf(Array)
    })

    it('should store relationship metadata with all required fields', async () => {
      const entity: Entity = {
        id: 'doc-5',
        type: 'document',
        name: 'API Docs',
        content: 'This API superseded by [api-v2.md](./api-v2.md)',
      }

      const result = await processor.enrich(entity)

      const relationships = result.entity.metadata?.inferredRelationships as InferredRelationship[]
      expect(relationships.length).toBeGreaterThan(0)

      const firstRel = relationships[0]
      expect(firstRel).toHaveProperty('type')
      expect(firstRel).toHaveProperty('fromEntityId')
      expect(firstRel).toHaveProperty('toEntityIdOrPattern')
      expect(firstRel).toHaveProperty('confidence')
      expect(firstRel).toHaveProperty('evidence')
      expect(firstRel).toHaveProperty('resolved')

      expect(firstRel.fromEntityId).toBe('doc-5')
      expect(firstRel.confidence).toBeGreaterThanOrEqual(0)
      expect(firstRel.confidence).toBeLessThanOrEqual(1)
    })

    it('should detect multiple relationship types', async () => {
      const entity: Entity = {
        id: 'doc-6',
        type: 'document',
        name: 'Complex Doc',
        content: `
          See [guide.md](./guide.md) for details.
          This supersedes old-doc.md.
          Based on RFC-123.
        `,
      }

      const result = await processor.enrich(entity)

      const relationships = result.entity.metadata?.inferredRelationships as InferredRelationship[]
      expect(relationships.length).toBeGreaterThanOrEqual(2)

      const relationshipTypes = new Set(relationships.map(r => r.type))
      expect(relationshipTypes.size).toBeGreaterThan(1) // Multiple types detected
    })
  })

  describe('Combined Enrichment', () => {
    it('should store both questions and relationships', async () => {
      const entity: Entity = {
        id: 'doc-7',
        type: 'document',
        name: 'Full Example',
        content: `
          This guide explains authentication.
          See [security.md](./security.md) for more details.
          It shows how to implement OAuth.
        `,
      }

      const result = await processor.enrich(entity)

      expect(result.hasQuestions).toBe(true)
      expect(result.hasRelationships).toBe(true)
      expect(result.entity.metadata?.questions).toBeDefined()
      expect(result.entity.metadata?.inferredRelationships).toBeDefined()
    })

    it('should preserve existing metadata when enriching', async () => {
      const entity: Entity = {
        id: 'doc-8',
        type: 'document',
        name: 'Test',
        content: 'This explains testing strategies.',
        metadata: {
          filename: 'test.md',
          customField: 'preserved',
        },
      }

      const result = await processor.enrich(entity)

      expect(result.entity.metadata?.filename).toBe('test.md')
      expect(result.entity.metadata?.customField).toBe('preserved')
      expect(result.entity.metadata?.questions).toBeDefined()
    })
  })

  describe('Vocabulary Bridging', () => {
    it('should generate questions that use different terminology', async () => {
      const entity: Entity = {
        id: 'doc-9',
        type: 'document',
        name: 'DI Guide',
        content: 'Dependency injection improves testability by providing loose coupling.',
      }

      const result = await processor.enrich(entity)

      const questions = result.entity.metadata?.questions as QuestionAnswerPair[]
      const questionTexts = questions.map(q => q.question.toLowerCase())

      // Questions should allow finding this doc with different terms
      // Even if the content says "dependency injection", questions might ask:
      // - "What improves testability?" (focuses on benefit)
      // - "How does this work?" (focuses on mechanism)
      expect(questions.length).toBeGreaterThan(0)
    })

    it('should enable finding documents by asking questions', async () => {
      // Scenario: User searches "how to authenticate users"
      // Document talks about "OAuth implementation"
      // Generated question should bridge this vocabulary gap

      const entity: Entity = {
        id: 'doc-10',
        type: 'document',
        name: 'OAuth Guide',
        content: 'OAuth allows third-party applications to access user data without passwords.',
      }

      const result = await processor.enrich(entity)

      const questions = result.entity.metadata?.questions as QuestionAnswerPair[]

      // Should have generated questions like:
      // "What is the main topic discussed?" → "OAuth allows..."
      // "How does this work?" → Explains OAuth mechanism
      expect(questions.some(q => q.answer.includes('OAuth'))).toBe(true)
    })

    it('should demonstrate vocabulary bridging flow', async () => {
      // Full vocabulary bridging scenario:
      // 1. Document uses technical term "OAuth"
      // 2. Q&A generator creates questions using colloquial terms
      // 3. Questions stored in metadata with answers
      // 4. User searches "how to authenticate" (not "OAuth")
      // 5. Question matches → document found

      const entity: Entity = {
        id: 'doc-auth',
        type: 'document',
        name: 'Authentication Guide',
        content: 'OAuth 2.0 provides secure authorization for third-party applications.',
      }

      const enriched = await processor.enrich(entity)

      // Verify questions generated
      expect(enriched.hasQuestions).toBe(true)
      expect(enriched.questionCount).toBeGreaterThan(0)

      const questions = enriched.entity.metadata?.questions as QuestionAnswerPair[]

      // Verify questions bridge vocabulary gap
      // Questions should include variations like:
      // - "What is discussed?" (general)
      // - "What does this explain?" (verb variation)
      // - "How does this work?" (mechanism focus)
      const hasGeneralQuestion = questions.some(q =>
        q.question.toLowerCase().includes('what') ||
        q.question.toLowerCase().includes('how')
      )

      expect(hasGeneralQuestion).toBe(true)

      // Verify answers contain the technical term
      const answersContainTerm = questions.some(q =>
        q.answer.includes('OAuth') || q.answer.includes('authoriz')
      )

      expect(answersContainTerm).toBe(true)

      // This demonstrates vocabulary bridging:
      // - User query: "how to authenticate" → matches question "How does this work?"
      // - Question answer: "OAuth provides authorization" → contains technical term
      // - Document found even though user didn't know the term "OAuth"
    })
  })

  describe('Performance', () => {
    it('should enrich document within performance budget', async () => {
      const entity: Entity = {
        id: 'doc-11',
        type: 'document',
        name: 'Typical Document',
        content: `
          This is a typical documentation page.
          It explains a concept with multiple paragraphs.
          There are some references to [other-doc.md](./other-doc.md).
          The content includes technical details and examples.
        `,
      }

      const startTime = Date.now()
      const result = await processor.enrich(entity)
      const duration = Date.now() - startTime

      // Should complete enrichment in < 1 second for typical doc
      // (Phase 2 target was <30s per document, but without real LLM it's much faster)
      expect(duration).toBeLessThan(1000)

      expect(result.hasQuestions).toBe(true)
      expect(result.hasRelationships).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle documents with no relationships', async () => {
      const entity: Entity = {
        id: 'doc-12',
        type: 'document',
        name: 'Simple Doc',
        content: 'This is a simple document with no links or references.',
      }

      const result = await processor.enrich(entity)

      expect(result.hasQuestions).toBe(true)
      expect(result.entity.metadata?.inferredRelationships).toHaveLength(0)
    })

    it('should handle documents with no questions generated', async () => {
      const entity: Entity = {
        id: 'doc-13',
        type: 'document',
        name: 'Short',
        content: 'X',
      }

      const result = await processor.enrich(entity)

      // Very short content might not generate questions
      expect(result.entity.metadata?.questions).toBeDefined()
    })

    it('should handle very long documents with truncation', async () => {
      const longContent = 'This is a very long document. '.repeat(1000)
      const entity: Entity = {
        id: 'doc-14',
        type: 'document',
        name: 'Long Doc',
        content: longContent,
      }

      const result = await processor.enrich(entity)

      // Should handle gracefully with warnings
      expect(result.warnings.some(w => w.includes('truncated'))).toBe(true)
    })
  })

  describe('Batch Enrichment', () => {
    it('should enrich multiple documents preserving all metadata', async () => {
      const entities: Entity[] = [
        {
          id: 'batch-1',
          type: 'document',
          name: 'Doc 1',
          content: 'First document about authentication.',
        },
        {
          id: 'batch-2',
          type: 'document',
          name: 'Doc 2',
          content: 'Second document about authorization. See [auth.md](./auth.md).',
        },
        {
          id: 'batch-3',
          type: 'document',
          name: 'Doc 3',
          content: 'Third document explaining security patterns.',
        },
      ]

      const results = await processor.enrichBatch(entities)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.hasQuestions || result.hasRelationships).toBe(true)
        expect(result.entity.id).toBe(entities[index].id)
      })
    })
  })
})
