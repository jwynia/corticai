/**
 * Relationship Inference
 *
 * Infers semantic relationships between entities based on content analysis.
 * Detects mentions, references, supersessions, and other relationships that
 * can be used to build a semantic graph.
 *
 * This is a write-time enrichment component - relationships are inferred once
 * during document ingestion, not at query time.
 *
 * @see context-network/architecture/semantic-processing/write-time-enrichment.md
 * @see context-network/planning/semantic-processing-implementation/README.md (Phase 2)
 */

import type { Entity } from '../types/entity'

/**
 * Types of semantic relationships
 */
export type RelationshipType =
  | 'mentions' // Document mentions another entity
  | 'references' // Document references/cites another entity
  | 'supersedes' // Document supersedes/replaces another entity
  | 'related-to' // Generic semantic relation
  | 'depends-on' // Document depends on another entity

/**
 * Inferred relationship between entities
 */
export interface InferredRelationship {
  /** Type of relationship */
  type: RelationshipType

  /** Source entity ID */
  fromEntityId: string

  /** Target entity ID (or pattern for unresolved references) */
  toEntityIdOrPattern: string

  /** Confidence score (0.0-1.0) */
  confidence: number

  /** Evidence from content (text that triggered inference) */
  evidence: string

  /** Location in source document */
  sourceLocation?: {
    start: number
    end: number
  }

  /** Whether target entity has been resolved */
  resolved: boolean
}

/**
 * Relationship inference result
 */
export interface RelationshipInferenceResult {
  /** Inferred relationships */
  relationships: InferredRelationship[]

  /** Processing time in milliseconds */
  processingTimeMs: number

  /** Any warnings or issues encountered */
  warnings: string[]
}

/**
 * Configuration for relationship inference
 */
export interface RelationshipInferenceConfig {
  /** Minimum confidence threshold (0.0-1.0, default: 0.6) */
  minConfidence?: number

  /** Enable detection of mentions (default: true) */
  detectMentions?: boolean

  /** Enable detection of references (default: true) */
  detectReferences?: boolean

  /** Enable detection of supersessions (default: true) */
  detectSupersessions?: boolean

  /** Maximum content length to process (default: 10000 chars) */
  maxContentLength?: number
}

/**
 * Relationship Inference Engine
 *
 * Analyzes document content to infer semantic relationships between entities.
 * Uses pattern matching and natural language processing to detect various
 * types of relationships.
 */
export class RelationshipInference {
  /**
   * Maximum content length for regex operations (ReDoS protection)
   *
   * Content longer than this limit is truncated before regex processing
   * to prevent catastrophic backtracking in complex patterns.
   *
   * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
   */
  private static readonly MAX_REGEX_CONTENT_LENGTH = 50000

  private config: Required<RelationshipInferenceConfig>

  constructor(config?: RelationshipInferenceConfig) {
    // Use the smaller of user-specified maxContentLength or ReDoS protection limit
    const requestedMax = config?.maxContentLength ?? 10000
    const effectiveMax = Math.min(requestedMax, RelationshipInference.MAX_REGEX_CONTENT_LENGTH)

    this.config = {
      minConfidence: config?.minConfidence ?? 0.6,
      detectMentions: config?.detectMentions ?? true,
      detectReferences: config?.detectReferences ?? true,
      detectSupersessions: config?.detectSupersessions ?? true,
      maxContentLength: effectiveMax,
    }
  }

  /**
   * Infer relationships from an entity
   *
   * @param entity Entity to analyze
   * @returns Relationship inference result
   */
  async infer(entity: Entity): Promise<RelationshipInferenceResult> {
    if (!entity) {
      throw new Error('Entity is required')
    }

    // Check if content exists and is not empty
    if (entity.content === undefined || entity.content === null) {
      return {
        relationships: [],
        processingTimeMs: 0,
        warnings: ['No content available for relationship inference'],
      }
    }

    if (entity.content.trim().length === 0) {
      return {
        relationships: [],
        processingTimeMs: 0,
        warnings: ['Content is empty'],
      }
    }

    return this.inferFromContent(entity.content, entity.id)
  }

  /**
   * Infer relationships from raw content
   *
   * @param content Document content
   * @param entityId Source entity ID
   * @returns Relationship inference result
   */
  async inferFromContent(
    content: string,
    entityId: string
  ): Promise<RelationshipInferenceResult> {
    const startTime = Date.now()
    const warnings: string[] = []
    const relationships: InferredRelationship[] = []

    // Validate content
    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      return {
        relationships: [],
        processingTimeMs: Date.now() - startTime,
        warnings: ['Content is empty'],
      }
    }

    // Truncate if too long
    let processedContent = content
    if (content.length > this.config.maxContentLength) {
      processedContent = content.substring(0, this.config.maxContentLength)
      warnings.push(`Content truncated to ${this.config.maxContentLength} characters`)
    }

    // Detect different types of relationships
    if (this.config.detectMentions) {
      const mentions = this.detectMentionRelationships(processedContent, entityId)
      relationships.push(...mentions)
    }

    if (this.config.detectReferences) {
      const references = this.detectReferenceRelationships(processedContent, entityId)
      relationships.push(...references)
    }

    if (this.config.detectSupersessions) {
      const supersessions = this.detectSupersessionRelationships(processedContent, entityId)
      relationships.push(...supersessions)
    }

    // Filter by minimum confidence
    const filteredRelationships = relationships.filter(
      r => r.confidence >= this.config.minConfidence
    )

    return {
      relationships: filteredRelationships,
      processingTimeMs: Date.now() - startTime,
      warnings,
    }
  }

  /**
   * Extract relationships from content using a regex pattern
   *
   * Helper method to reduce code duplication across detection methods.
   * Extracts target from either markdown link format or plain path.
   *
   * @param content Document content to search
   * @param entityId Source entity ID
   * @param regex Pattern to match (should have capture groups for link text and path)
   * @param relationshipType Type of relationship being detected
   * @param confidence Confidence score for this pattern type
   * @returns Array of detected relationships
   */
  private extractRelationshipsFromPattern(
    content: string,
    entityId: string,
    regex: RegExp,
    relationshipType: RelationshipType,
    confidence: number
  ): InferredRelationship[] {
    const relationships: InferredRelationship[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      // Extract target from either markdown link (match[2]) or plain path (match[3])
      const target = match[2] || match[3]
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      if (target) {
        relationships.push({
          type: relationshipType,
          fromEntityId: entityId,
          toEntityIdOrPattern: target,
          confidence,
          evidence: match[0],
          sourceLocation: { start: matchStart, end: matchEnd },
          resolved: false,
        })
      }
    }

    return relationships
  }

  /**
   * Detect supersession relationships
   *
   * Looks for patterns like "superseded by X", "see X instead", "moved to X"
   *
   * @param content Document content
   * @param entityId Source entity ID
   * @returns Detected supersession relationships
   */
  private detectSupersessionRelationships(
    content: string,
    entityId: string
  ): InferredRelationship[] {
    const relationships: InferredRelationship[] = []

    // Define patterns with their confidence scores
    const patterns: Array<{ regex: RegExp; confidence: number }> = [
      {
        // "superseded by X" or "replaced by X"
        regex: /(?:superseded by|replaced by)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi,
        confidence: 0.9, // Very high confidence
      },
      {
        // "see X instead" or "use X instead"
        regex: /(?:see|use|refer to)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))\s+instead/gi,
        confidence: 0.85, // High confidence
      },
      {
        // "moved to X" or "relocated to X"
        regex: /(?:moved to|relocated to|now at)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi,
        confidence: 0.85, // High confidence
      },
    ]

    // Extract relationships using each pattern
    for (const { regex, confidence } of patterns) {
      const detected = this.extractRelationshipsFromPattern(
        content,
        entityId,
        regex,
        'supersedes',
        confidence
      )
      relationships.push(...detected)
    }

    return relationships
  }

  /**
   * Detect mention relationships
   *
   * Looks for entity references in markdown links, file paths, etc.
   *
   * @param content Document content
   * @param entityId Source entity ID
   * @returns Detected mention relationships
   */
  private detectMentionRelationships(
    content: string,
    entityId: string
  ): InferredRelationship[] {
    const relationships: InferredRelationship[] = []

    // Detect markdown links: [text](path)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match: RegExpExecArray | null
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const linkText = match[1]
      const linkPath = match[2]
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      relationships.push({
        type: 'mentions',
        fromEntityId: entityId,
        toEntityIdOrPattern: linkPath,
        confidence: 0.8, // High confidence for explicit markdown links
        evidence: match[0],
        sourceLocation: { start: matchStart, end: matchEnd },
        resolved: false,
      })
    }

    // Detect file path patterns: path/to/file.ext
    const filePathRegex = /(?:^|\s)((?:\.\/|\.\.\/|[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)(?:\s|$|[,.])/g
    while ((match = filePathRegex.exec(content)) !== null) {
      const filePath = match[1]
      const matchStart = match.index + (match[0].startsWith(' ') ? 1 : 0)
      const matchEnd = matchStart + filePath.length

      // Skip if already captured by markdown link
      const alreadyCaptured = relationships.some(
        r => r.sourceLocation &&
             r.sourceLocation.start <= matchStart &&
             r.sourceLocation.end >= matchEnd
      )

      if (!alreadyCaptured) {
        relationships.push({
          type: 'mentions',
          fromEntityId: entityId,
          toEntityIdOrPattern: filePath,
          confidence: 0.7, // Good confidence for file paths
          evidence: filePath,
          sourceLocation: { start: matchStart, end: matchEnd },
          resolved: false,
        })
      }
    }

    return relationships
  }

  /**
   * Detect reference relationships
   *
   * Looks for citations, references to other documents
   *
   * @param content Document content
   * @param entityId Source entity ID
   * @returns Detected reference relationships
   */
  private detectReferenceRelationships(
    content: string,
    entityId: string
  ): InferredRelationship[] {
    const relationships: InferredRelationship[] = []

    // Detect @see references
    const seeRefRegex = /@see\s+([^\s]+(?:\s+[^\n]+)?)/gi
    let match: RegExpExecArray | null
    while ((match = seeRefRegex.exec(content)) !== null) {
      const reference = match[1].trim()
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      relationships.push({
        type: 'references',
        fromEntityId: entityId,
        toEntityIdOrPattern: reference,
        confidence: 0.85, // High confidence for explicit @see
        evidence: match[0],
        sourceLocation: { start: matchStart, end: matchEnd },
        resolved: false,
      })
    }

    // Detect RFC/issue references: RFC-123, TASK-456, #789
    const citationRegex = /\b(RFC-\d+|TASK-\d+|#\d+)\b/g
    while ((match = citationRegex.exec(content)) !== null) {
      const citation = match[1]
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      relationships.push({
        type: 'references',
        fromEntityId: entityId,
        toEntityIdOrPattern: citation,
        confidence: 0.8, // High confidence for explicit citations
        evidence: citation,
        sourceLocation: { start: matchStart, end: matchEnd },
        resolved: false,
      })
    }

    // Detect "as described in X" patterns
    const describedInRegex = /(?:as described in|according to|based on)\s+([a-zA-Z0-9_/-]+(?:\.[a-zA-Z0-9]+)?)/gi
    while ((match = describedInRegex.exec(content)) !== null) {
      const reference = match[1]
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      relationships.push({
        type: 'references',
        fromEntityId: entityId,
        toEntityIdOrPattern: reference,
        confidence: 0.75, // Good confidence for contextual references
        evidence: match[0],
        sourceLocation: { start: matchStart, end: matchEnd },
        resolved: false,
      })
    }

    return relationships
  }
}
