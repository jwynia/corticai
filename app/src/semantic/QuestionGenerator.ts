/**
 * Question Generator
 *
 * Generates natural language questions from document content to enable
 * vocabulary bridging. Questions help users find documents using different
 * terminology than what appears in the source content.
 *
 * This is a write-time enrichment component - questions are generated once
 * during document ingestion, not at query time.
 *
 * @see context-network/architecture/semantic-processing/write-time-enrichment.md
 * @see context-network/planning/semantic-processing-implementation/README.md (Phase 2)
 */

import type { Entity } from '../types/entity'

/**
 * Generated question-answer pair
 */
export interface QuestionAnswerPair {
  /** The question (natural language) */
  question: string

  /** The answer (extracted from document or summary) */
  answer: string

  /** Confidence score (0.0-1.0) */
  confidence: number

  /** Source entity ID */
  sourceEntityId: string

  /** Location in source document (character offset or line range) */
  sourceLocation?: {
    start: number
    end: number
  }
}

/**
 * Question generation result
 */
export interface QuestionGenerationResult {
  /** Generated Q&A pairs */
  questions: QuestionAnswerPair[]

  /** Processing time in milliseconds */
  processingTimeMs: number

  /** Any warnings or issues encountered */
  warnings: string[]
}

/**
 * LLM provider interface (abstract for testing and flexibility)
 */
export interface LLMProvider {
  /**
   * Generate questions from content
   *
   * @param content Document content
   * @param context Additional context (title, type, etc.)
   * @returns Generated questions
   */
  generateQuestions(
    content: string,
    context?: Record<string, unknown>
  ): Promise<string[]>

  /**
   * Extract answer for a question from content
   *
   * @param question The question
   * @param content Document content
   * @returns Extracted answer
   */
  extractAnswer(question: string, content: string): Promise<string>
}

/**
 * Configuration for question generation
 */
export interface QuestionGeneratorConfig {
  /** LLM provider for question generation */
  llmProvider?: LLMProvider

  /** Target number of questions to generate (default: 3-5) */
  targetQuestionCount?: number

  /** Minimum confidence threshold (0.0-1.0, default: 0.6) */
  minConfidence?: number

  /** Maximum content length to process (default: 10000 chars) */
  maxContentLength?: number

  /** Enable caching of generated questions (default: true) */
  enableCaching?: boolean

  /** Maximum cache size (default: 1000 entries) */
  maxCacheSize?: number
}

/**
 * Cache entry with LRU tracking
 */
interface CacheEntry {
  questions: QuestionAnswerPair[]
  lastAccessed: number
}

/**
 * Question Generator
 *
 * Generates natural language questions from document content using
 * configurable LLM providers or rule-based patterns.
 */
export class QuestionGenerator {
  // Confidence score constants for question generation
  private static readonly LLM_QUESTION_CONFIDENCE = 0.8 as const
  private static readonly RULE_BASED_CONFIDENCE_WHAT = 0.7 as const
  private static readonly RULE_BASED_CONFIDENCE_HOW = 0.6 as const
  private static readonly RULE_BASED_CONFIDENCE_WHY = 0.6 as const
  private static readonly RULE_BASED_CONFIDENCE_WHEN = 0.5 as const

  private llmProvider?: LLMProvider
  private cache: Map<string, CacheEntry> = new Map()
  private config: {
    llmProvider?: LLMProvider
    targetQuestionCount: number
    minConfidence: number
    maxContentLength: number
    enableCaching: boolean
    maxCacheSize: number
  }

  constructor(config?: QuestionGeneratorConfig) {
    this.llmProvider = config?.llmProvider
    this.config = {
      llmProvider: config?.llmProvider,
      targetQuestionCount: config?.targetQuestionCount ?? 4,
      minConfidence: config?.minConfidence ?? 0.6,
      maxContentLength: config?.maxContentLength ?? 10000,
      enableCaching: config?.enableCaching ?? true,
      maxCacheSize: config?.maxCacheSize ?? 1000,
    }
  }

  /**
   * Generate questions from an entity
   *
   * @param entity Entity to generate questions for
   * @returns Question generation result
   */
  async generate(entity: Entity): Promise<QuestionGenerationResult> {
    if (!entity) {
      throw new Error('Entity is required')
    }

    // Check if content exists and is not empty
    if (entity.content === undefined || entity.content === null) {
      return {
        questions: [],
        processingTimeMs: 0,
        warnings: ['No content available for question generation'],
      }
    }

    if (entity.content.trim().length === 0) {
      return {
        questions: [],
        processingTimeMs: 0,
        warnings: ['Content is empty'],
      }
    }

    const content = entity.content
    const context = {
      entityId: entity.id,
      entityType: entity.type,
      ...entity.metadata,
    }

    return this.generateFromContent(content, entity.id, context)
  }

  /**
   * Generate questions from raw content
   *
   * @param content Document content (will be validated and truncated if necessary)
   * @param entityId Source entity ID (used for caching key generation)
   * @param context Additional context (passed to LLM provider if available)
   * @returns Question generation result with questions, processing time, and warnings
   *
   * @remarks
   * Input Handling:
   * - Content is trimmed and validated before processing
   * - Empty or whitespace-only content returns early with warning
   * - Content exceeding maxContentLength (default 10000 chars) is truncated with warning
   * - Special characters and malformed content are handled gracefully by pattern matching
   *
   * Caching Behavior:
   * - Results are cached based on entityId + content hash (if enableCaching is true)
   * - Cache key format: `${entityId}:${hash}` where hash is a simple non-cryptographic hash
   * - Cache is not bounded and may grow indefinitely (see tech debt task for LRU cache)
   *
   * Error Handling:
   * - All errors from LLM providers are caught and returned in warnings array
   * - Processing continues with empty results rather than throwing
   * - Validation errors result in early return with appropriate warnings
   *
   * Performance:
   * - LLM calls are made sequentially (one for questions, one per answer)
   * - Rule-based fallback is synchronous and fast
   * - Caching significantly improves performance for repeated content
   */
  async generateFromContent(
    content: string,
    entityId: string,
    context?: Record<string, unknown>
  ): Promise<QuestionGenerationResult> {
    const startTime = Date.now()
    const warnings: string[] = []
    const questions: QuestionAnswerPair[] = []

    // Validate content
    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      warnings.push('Content is empty')
      return {
        questions: [],
        processingTimeMs: Date.now() - startTime,
        warnings,
      }
    }

    // Truncate if too long
    let processedContent = content
    if (content.length > this.config.maxContentLength) {
      processedContent = content.substring(0, this.config.maxContentLength)
      warnings.push(`Content truncated to ${this.config.maxContentLength} characters`)
    }

    // Check cache
    const cacheKey = `${entityId}:${this.hashContent(processedContent)}`
    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!
      // Update LRU: mark as recently accessed
      entry.lastAccessed = Date.now()
      return {
        questions: entry.questions,
        processingTimeMs: Date.now() - startTime,
        warnings,
      }
    }

    // Generate questions
    try {
      if (this.llmProvider) {
        // Use LLM provider
        const generatedQuestions = await this.llmProvider.generateQuestions(
          processedContent,
          context
        )

        for (const question of generatedQuestions.slice(0, this.config.targetQuestionCount)) {
          const answer = await this.llmProvider.extractAnswer(question, processedContent)
          const qa: QuestionAnswerPair = {
            question,
            answer,
            confidence: QuestionGenerator.LLM_QUESTION_CONFIDENCE,
            sourceEntityId: entityId,
          }
          questions.push(qa)
        }
      } else {
        // Fallback to rule-based generation
        const ruleBasedQuestions = this.generateRuleBasedQuestions(processedContent, entityId)
        questions.push(...ruleBasedQuestions)
      }

      // Filter by minimum confidence
      const filteredQuestions = questions.filter(
        q => q.confidence >= this.config.minConfidence
      )

      // Cache results with LRU eviction
      if (this.config.enableCaching) {
        // Evict oldest entry if cache is full
        if (this.cache.size >= this.config.maxCacheSize) {
          let oldestKey: string | null = null
          let oldestTime = Infinity

          for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
              oldestTime = entry.lastAccessed
              oldestKey = key
            }
          }

          if (oldestKey) {
            this.cache.delete(oldestKey)
          }
        }

        // Add new entry
        this.cache.set(cacheKey, {
          questions: filteredQuestions,
          lastAccessed: Date.now()
        })
      }

      return {
        questions: filteredQuestions,
        processingTimeMs: Date.now() - startTime,
        warnings,
      }
    } catch (error) {
      warnings.push(`Error generating questions: ${error instanceof Error ? error.message : String(error)}`)
      return {
        questions: [],
        processingTimeMs: Date.now() - startTime,
        warnings,
      }
    }
  }

  /**
   * Generate rule-based questions from content (fallback when no LLM)
   *
   * @param content Document content
   * @param entityId Source entity ID
   * @returns Generated Q&A pairs
   */
  private generateRuleBasedQuestions(
    content: string,
    entityId: string
  ): QuestionAnswerPair[] {
    const questions: QuestionAnswerPair[] = []

    // Extract sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)

    if (sentences.length === 0) {
      return questions
    }

    // Generate "What" question from first sentence
    if (sentences[0]) {
      questions.push({
        question: 'What is the main topic discussed?',
        answer: sentences[0].trim(),
        confidence: QuestionGenerator.RULE_BASED_CONFIDENCE_WHAT,
        sourceEntityId: entityId,
      })
    }

    // Generate "How" question if content contains "how" or imperative verbs
    const hasHowContent = /\b(how|implement|create|build|configure|setup)\b/i.test(content)
    if (hasHowContent && sentences[1]) {
      questions.push({
        question: 'How does this work?',
        answer: sentences.slice(0, 2).join('. ').trim(),
        confidence: QuestionGenerator.RULE_BASED_CONFIDENCE_HOW,
        sourceEntityId: entityId,
      })
    }

    // Generate "Why" question if content explains reasons
    const hasWhyContent = /\b(why|because|reason|purpose|benefit)\b/i.test(content)
    if (hasWhyContent) {
      const whySentence = sentences.find(s => /\b(why|because|reason)\b/i.test(s))
      if (whySentence) {
        questions.push({
          question: 'Why is this important?',
          answer: whySentence.trim(),
          confidence: QuestionGenerator.RULE_BASED_CONFIDENCE_WHY,
          sourceEntityId: entityId,
        })
      }
    }

    // Generate "When" question if content has temporal context
    const hasWhenContent = /\b(when|after|before|during|while)\b/i.test(content)
    if (hasWhenContent) {
      const whenSentence = sentences.find(s => /\b(when|after|before)\b/i.test(s))
      if (whenSentence) {
        questions.push({
          question: 'When should this be used?',
          answer: whenSentence.trim(),
          confidence: QuestionGenerator.RULE_BASED_CONFIDENCE_WHEN,
          sourceEntityId: entityId,
        })
      }
    }

    return questions.slice(0, this.config.targetQuestionCount)
  }

  /**
   * Hash content for caching
   *
   * @param content Content to hash
   * @returns Simple hash string
   */
  private hashContent(content: string): string {
    // Simple hash for caching (not cryptographic)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Clear the question cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}
