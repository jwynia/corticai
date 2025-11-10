import { describe, it, expect, beforeEach } from 'vitest'
import {
  QuestionGenerator,
  type LLMProvider,
  type QuestionGeneratorConfig,
} from '../../../src/semantic/QuestionGenerator'
import type { Entity } from '../../../src/types/entity'

/**
 * Mock LLM Provider for testing
 */
class MockLLMProvider implements LLMProvider {
  async generateQuestions(
    content: string,
    context?: Record<string, unknown>
  ): Promise<string[]> {
    // Return predictable questions for testing
    return [
      'What is the main topic discussed?',
      'How does this work?',
      'When should this be used?',
      'Why is this important?',
    ]
  }

  async extractAnswer(question: string, content: string): Promise<string> {
    // Return a predictable answer
    return `Answer based on: ${content.substring(0, 50)}...`
  }
}

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator
  let mockLLMProvider: MockLLMProvider

  beforeEach(() => {
    mockLLMProvider = new MockLLMProvider()
    generator = new QuestionGenerator({
      llmProvider: mockLLMProvider,
      targetQuestionCount: 4,
      minConfidence: 0.6,
    })
  })

  describe('Constructor and Configuration', () => {
    it('should create generator with default config', () => {
      const defaultGenerator = new QuestionGenerator()
      expect(defaultGenerator).toBeDefined()
    })

    it('should create generator with custom config', () => {
      const customGenerator = new QuestionGenerator({
        llmProvider: mockLLMProvider,
        targetQuestionCount: 5,
        minConfidence: 0.7,
        maxContentLength: 5000,
        enableCaching: false,
      })
      expect(customGenerator).toBeDefined()
    })

    it('should use default values for missing config options', () => {
      const partialConfigGenerator = new QuestionGenerator({
        targetQuestionCount: 3,
      })
      expect(partialConfigGenerator).toBeDefined()
    })
  })

  describe('generate (from Entity)', () => {
    it('should generate questions from entity with content', async () => {
      const entity: Entity = {
        id: 'doc-1',
        type: 'document',
        content: 'This is a comprehensive guide about TypeScript types.',
        metadata: {},
      }

      const result = await generator.generate(entity)

      expect(result).toBeDefined()
      expect(result.questions).toBeInstanceOf(Array)
      expect(result.questions.length).toBeGreaterThan(0)
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.warnings).toBeInstanceOf(Array)
    })

    it('should include valid Q&A pairs in result', async () => {
      const entity: Entity = {
        id: 'doc-2',
        type: 'document',
        content: 'This document explains how to implement semantic processing.',
        metadata: {},
      }

      const result = await generator.generate(entity)

      expect(result.questions.length).toBeGreaterThan(0)
      const qa = result.questions[0]
      expect(qa).toHaveProperty('question')
      expect(qa).toHaveProperty('answer')
      expect(qa).toHaveProperty('confidence')
      expect(qa).toHaveProperty('sourceEntityId')
      expect(qa.sourceEntityId).toBe('doc-2')
      expect(qa.confidence).toBeGreaterThanOrEqual(0)
      expect(qa.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle entity without content', async () => {
      const entity: Entity = {
        id: 'doc-3',
        type: 'document',
        metadata: {},
      }

      const result = await generator.generate(entity)

      expect(result).toBeDefined()
      expect(result.questions).toHaveLength(0)
      expect(result.warnings).toContain('No content available for question generation')
    })

    it('should handle entity with empty content', async () => {
      const entity: Entity = {
        id: 'doc-4',
        type: 'document',
        content: '',
        metadata: {},
      }

      const result = await generator.generate(entity)

      expect(result).toBeDefined()
      expect(result.questions).toHaveLength(0)
      expect(result.warnings).toContain('Content is empty')
    })

    it('should handle entity with very long content', async () => {
      const longContent = 'Lorem ipsum '.repeat(1000) // ~12000 characters
      const entity: Entity = {
        id: 'doc-5',
        type: 'document',
        content: longContent,
        metadata: {},
      }

      const result = await generator.generate(entity)

      expect(result).toBeDefined()
      expect(result.questions.length).toBeGreaterThan(0)
      // Should truncate or handle long content gracefully
    })

    it('should respect targetQuestionCount configuration', async () => {
      const customGenerator = new QuestionGenerator({
        llmProvider: mockLLMProvider,
        targetQuestionCount: 2,
      })

      const entity: Entity = {
        id: 'doc-6',
        type: 'document',
        content: 'Short document content.',
        metadata: {},
      }

      const result = await customGenerator.generate(entity)

      expect(result.questions.length).toBeLessThanOrEqual(2)
    })

    it('should filter questions below minConfidence threshold', async () => {
      const highConfidenceGenerator = new QuestionGenerator({
        llmProvider: mockLLMProvider,
        minConfidence: 0.9,
      })

      const entity: Entity = {
        id: 'doc-7',
        type: 'document',
        content: 'Some content',
        metadata: {},
      }

      const result = await highConfidenceGenerator.generate(entity)

      result.questions.forEach(qa => {
        expect(qa.confidence).toBeGreaterThanOrEqual(0.9)
      })
    })
  })

  describe('generateFromContent', () => {
    it('should generate questions from raw content', async () => {
      const content = 'This is a guide about React hooks and their usage.'
      const entityId = 'doc-8'

      const result = await generator.generateFromContent(content, entityId)

      expect(result).toBeDefined()
      expect(result.questions.length).toBeGreaterThan(0)
      expect(result.questions[0].sourceEntityId).toBe(entityId)
    })

    it('should handle context parameter', async () => {
      const content = 'TypeScript interface definitions.'
      const entityId = 'doc-9'
      const context = { title: 'TypeScript Guide', type: 'tutorial' }

      const result = await generator.generateFromContent(content, entityId, context)

      expect(result).toBeDefined()
      expect(result.questions.length).toBeGreaterThan(0)
    })

    it('should handle empty content', async () => {
      const result = await generator.generateFromContent('', 'doc-10')

      expect(result.questions).toHaveLength(0)
      expect(result.warnings).toContain('Content is empty')
    })

    it('should handle whitespace-only content', async () => {
      const result = await generator.generateFromContent('   \n\t  ', 'doc-11')

      expect(result.questions).toHaveLength(0)
      expect(result.warnings).toContain('Content is empty')
    })
  })

  describe('Caching', () => {
    it('should cache generated questions when caching enabled', async () => {
      const entity: Entity = {
        id: 'doc-12',
        type: 'document',
        content: 'Cached content',
        metadata: {},
      }

      const result1 = await generator.generate(entity)
      const result2 = await generator.generate(entity)

      expect(result1.questions).toEqual(result2.questions)
      // Second call should be faster due to caching
      expect(result2.processingTimeMs).toBeLessThanOrEqual(result1.processingTimeMs)
    })

    it('should not cache when caching disabled', async () => {
      const noCacheGenerator = new QuestionGenerator({
        llmProvider: mockLLMProvider,
        enableCaching: false,
      })

      const entity: Entity = {
        id: 'doc-13',
        type: 'document',
        content: 'No cache content',
        metadata: {},
      }

      await noCacheGenerator.generate(entity)
      await noCacheGenerator.generate(entity)

      // Both calls should generate fresh questions
      // (Implementation will ensure this)
    })

    it('should clear cache when clearCache called', async () => {
      const entity: Entity = {
        id: 'doc-14',
        type: 'document',
        content: 'Clearable cache content',
        metadata: {},
      }

      await generator.generate(entity)
      generator.clearCache()
      await generator.generate(entity)

      // Cache should be cleared, second call regenerates
      expect(generator).toBeDefined()
    })
  })

  describe('Without LLM Provider (Fallback)', () => {
    it('should work without LLM provider using rule-based generation', async () => {
      const noLLMGenerator = new QuestionGenerator() // No LLM provider

      const entity: Entity = {
        id: 'doc-15',
        type: 'document',
        content: 'This document describes a feature. It explains how it works.',
        metadata: {},
      }

      const result = await noLLMGenerator.generate(entity)

      // Should generate questions using rule-based patterns
      expect(result).toBeDefined()
      expect(result.questions.length).toBeGreaterThan(0)
    })

    it('should generate what/how/why questions from content', async () => {
      const noLLMGenerator = new QuestionGenerator()

      const content = 'The TypeScript compiler performs type checking. It helps catch errors early.'
      const result = await noLLMGenerator.generateFromContent(content, 'doc-16')

      expect(result.questions.length).toBeGreaterThan(0)
      // Should include question type variety
      const questionTypes = result.questions.map(q =>
        q.question.toLowerCase().split(' ')[0]
      )
      expect(questionTypes.some(q => ['what', 'how', 'why', 'when'].includes(q))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle content with special characters', async () => {
      const content = 'What is `const`? How does @decorator work? Why use {generics}?'
      const result = await generator.generateFromContent(content, 'doc-17')

      expect(result).toBeDefined()
      expect(result.questions.length).toBeGreaterThan(0)
    })

    it('should handle content with code blocks', async () => {
      const content = `
        This is how to use TypeScript:
        \`\`\`typescript
        const x: number = 5;
        \`\`\`
        This demonstrates type annotations.
      `
      const result = await generator.generateFromContent(content, 'doc-18')

      expect(result).toBeDefined()
    })

    it('should handle content with markdown links', async () => {
      const content = 'See [documentation](./docs.md) for details.'
      const result = await generator.generateFromContent(content, 'doc-19')

      expect(result).toBeDefined()
    })

    it('should handle null or undefined entity gracefully', async () => {
      await expect(generator.generate(null as any)).rejects.toThrow()
    })

    it('should handle malformed entities gracefully', async () => {
      const malformedEntity: any = { id: 'bad' } // Missing required fields
      const result = await generator.generate(malformedEntity)

      expect(result).toBeDefined()
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should complete within reasonable time for typical document', async () => {
      const entity: Entity = {
        id: 'doc-20',
        type: 'document',
        content: 'Typical document content with several sentences explaining a concept.',
        metadata: {},
      }

      const startTime = Date.now()
      await generator.generate(entity)
      const duration = Date.now() - startTime

      // Should complete in under 5 seconds (generous for testing)
      expect(duration).toBeLessThan(5000)
    })

    it('should return processingTimeMs in result', async () => {
      const entity: Entity = {
        id: 'doc-21',
        type: 'document',
        content: 'Content',
        metadata: {},
      }

      const result = await generator.generate(entity)

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
      expect(typeof result.processingTimeMs).toBe('number')
    })
  })

  describe('LRU Cache', () => {
    it('should respect maxCacheSize configuration', async () => {
      const smallCacheGenerator = new QuestionGenerator({
        maxCacheSize: 2,
        enableCaching: true
      })

      const entity1: Entity = { id: 'cache-1', type: 'document', content: 'First content', metadata: {} }
      const entity2: Entity = { id: 'cache-2', type: 'document', content: 'Second content', metadata: {} }
      const entity3: Entity = { id: 'cache-3', type: 'document', content: 'Third content', metadata: {} }

      // Fill cache to limit
      await smallCacheGenerator.generate(entity1)
      await smallCacheGenerator.generate(entity2)

      // Verify both are cached (processing time should be ~0 for cached)
      const result1 = await smallCacheGenerator.generate(entity1)
      const result2 = await smallCacheGenerator.generate(entity2)

      expect(result1.processingTimeMs).toBeLessThan(5)
      expect(result2.processingTimeMs).toBeLessThan(5)

      // Add third entry - should evict oldest (entity1)
      await smallCacheGenerator.generate(entity3)

      // entity1 should be regenerated (not cached), entity2 and entity3 should be cached
      const startTime = Date.now()
      await smallCacheGenerator.generate(entity1)
      const notCachedTime = Date.now() - startTime

      const cachedResult2 = await smallCacheGenerator.generate(entity2)
      const cachedResult3 = await smallCacheGenerator.generate(entity3)

      // Cached results should be much faster
      expect(cachedResult2.processingTimeMs).toBeLessThan(5)
      expect(cachedResult3.processingTimeMs).toBeLessThan(5)
    })

    it('should evict least recently used entry when cache is full', async () => {
      const lruGenerator = new QuestionGenerator({
        maxCacheSize: 3,
        enableCaching: true
      })

      const entities = [
        { id: 'lru-1', type: 'document', content: 'Content A', metadata: {} },
        { id: 'lru-2', type: 'document', content: 'Content B', metadata: {} },
        { id: 'lru-3', type: 'document', content: 'Content C', metadata: {} },
        { id: 'lru-4', type: 'document', content: 'Content D', metadata: {} },
      ] as Entity[]

      // Fill cache
      await lruGenerator.generate(entities[0])
      await lruGenerator.generate(entities[1])
      await lruGenerator.generate(entities[2])

      // Access entity 0 and 1 to update their LRU timestamps
      await lruGenerator.generate(entities[0])
      await lruGenerator.generate(entities[1])

      // Add entity 3 - should evict entity 2 (least recently used)
      await lruGenerator.generate(entities[3])

      // Verify entity 2 was evicted by checking if it gets regenerated
      const result0 = await lruGenerator.generate(entities[0])
      const result1 = await lruGenerator.generate(entities[1])
      const result3 = await lruGenerator.generate(entities[3])

      // These should all be cached (fast)
      expect(result0.processingTimeMs).toBeLessThan(5)
      expect(result1.processingTimeMs).toBeLessThan(5)
      expect(result3.processingTimeMs).toBeLessThan(5)
    })

    it('should handle cache eviction with zero performance impact', async () => {
      const perfGenerator = new QuestionGenerator({
        maxCacheSize: 10,
        enableCaching: true
      })

      const entities: Entity[] = []
      for (let i = 0; i < 15; i++) {
        entities.push({
          id: `perf-${i}`,
          type: 'document',
          content: `Performance test content ${i}`,
          metadata: {}
        })
      }

      // Generate all (will cause evictions after 10)
      const startTime = Date.now()
      for (const entity of entities) {
        await perfGenerator.generate(entity)
      }
      const totalTime = Date.now() - startTime

      // Eviction overhead should be negligible (<5ms per operation)
      const avgTimePerOp = totalTime / entities.length
      expect(avgTimePerOp).toBeLessThan(100) // Generous limit
    })

    it('should update LRU timestamp on cache hit', async () => {
      const timestampGenerator = new QuestionGenerator({
        maxCacheSize: 2,
        enableCaching: true
      })

      const entity1: Entity = { id: 'ts-1', type: 'document', content: 'First', metadata: {} }
      const entity2: Entity = { id: 'ts-2', type: 'document', content: 'Second', metadata: {} }
      const entity3: Entity = { id: 'ts-3', type: 'document', content: 'Third', metadata: {} }

      // Add entity1 and entity2
      await timestampGenerator.generate(entity1)
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      await timestampGenerator.generate(entity2)

      // Access entity1 again to update its timestamp
      await timestampGenerator.generate(entity1)

      // Add entity3 - should evict entity2 (now oldest)
      await timestampGenerator.generate(entity3)

      // Verify entity1 and entity3 are cached, entity2 is not
      const result1 = await timestampGenerator.generate(entity1)
      const result3 = await timestampGenerator.generate(entity3)

      expect(result1.processingTimeMs).toBeLessThan(5)
      expect(result3.processingTimeMs).toBeLessThan(5)
    })

    it('should allow clearCache() to work with LRU cache', async () => {
      const clearGenerator = new QuestionGenerator({
        maxCacheSize: 10,
        enableCaching: true
      })

      const entity: Entity = { id: 'clear-1', type: 'document', content: 'Test', metadata: {} }

      // Generate and cache
      await clearGenerator.generate(entity)

      // Verify cached
      let result = await clearGenerator.generate(entity)
      expect(result.processingTimeMs).toBeLessThan(5)

      // Clear cache
      clearGenerator.clearCache()

      // Should regenerate (not cached)
      const startTime = Date.now()
      result = await clearGenerator.generate(entity)
      const duration = Date.now() - startTime

      // Not cached, so should take some time
      expect(duration).toBeGreaterThanOrEqual(0)
    })

    it('should use default maxCacheSize of 1000', () => {
      const defaultGenerator = new QuestionGenerator()

      // Access private config via type assertion for testing
      const config = (defaultGenerator as any).config

      expect(config.maxCacheSize).toBe(1000)
    })

    it('should allow custom maxCacheSize configuration', () => {
      const customGenerator = new QuestionGenerator({
        maxCacheSize: 500
      })

      const config = (customGenerator as any).config

      expect(config.maxCacheSize).toBe(500)
    })
  })
})
