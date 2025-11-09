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
  private config: Required<RelationshipInferenceConfig>

  constructor(config?: RelationshipInferenceConfig) {
    this.config = {
      minConfidence: config?.minConfidence ?? 0.6,
      detectMentions: config?.detectMentions ?? true,
      detectReferences: config?.detectReferences ?? true,
      detectSupersessions: config?.detectSupersessions ?? true,
      maxContentLength: config?.maxContentLength ?? 10000,
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

    // Detect "superseded by X" patterns
    const supersededByRegex = /(?:superseded by|replaced by)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi
    let match: RegExpExecArray | null
    while ((match = supersededByRegex.exec(content)) !== null) {
      // Extract target from either markdown link or plain file path
      const target = match[2] || match[3] // markdown path or plain path
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      if (target) {
        relationships.push({
          type: 'supersedes',
          fromEntityId: entityId,
          toEntityIdOrPattern: target,
          confidence: 0.9, // Very high confidence for explicit supersession
          evidence: match[0],
          sourceLocation: { start: matchStart, end: matchEnd },
          resolved: false,
        })
      }
    }

    // Detect "see X instead" patterns
    const seeInsteadRegex = /(?:see|use|refer to)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))\s+instead/gi
    while ((match = seeInsteadRegex.exec(content)) !== null) {
      const target = match[2] || match[3]
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      if (target) {
        relationships.push({
          type: 'supersedes',
          fromEntityId: entityId,
          toEntityIdOrPattern: target,
          confidence: 0.85, // High confidence for "instead" pattern
          evidence: match[0],
          sourceLocation: { start: matchStart, end: matchEnd },
          resolved: false,
        })
      }
    }

    // Detect "moved to X" patterns
    const movedToRegex = /(?:moved to|relocated to|now at)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi
    while ((match = movedToRegex.exec(content)) !== null) {
      const target = match[2] || match[3]
      const matchStart = match.index
      const matchEnd = match.index + match[0].length

      if (target) {
        relationships.push({
          type: 'supersedes',
          fromEntityId: entityId,
          toEntityIdOrPattern: target,
          confidence: 0.85, // High confidence for move pattern
          evidence: match[0],
          sourceLocation: { start: matchStart, end: matchEnd },
          resolved: false,
        })
      }
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
