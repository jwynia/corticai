/**
 * Semantic Processing Types
 *
 * Core types for CorticAI's semantic processing system, including lifecycle
 * metadata, semantic blocks, and related structures.
 *
 * @see context-network/architecture/semantic-processing/
 * @see context-network/planning/semantic-processing-implementation/
 */

import { ContextDepth } from '../types/context'

/**
 * Lifecycle state for documents and entities
 *
 * Represents the semantic lifecycle of content, determining its relevance
 * and authority in search results. Age doesn't equal irrelevance - a 2-year-old
 * principle can be 'current', while a 2-week-old plan can be 'deprecated'.
 *
 * States:
 * - **current**: Active guidance that should be prioritized
 * - **stable**: Established patterns/principles unlikely to change
 * - **evolving**: Work in progress, may change soon
 * - **deprecated**: Superseded by newer approach, kept for context
 * - **historical**: No longer applicable but valuable for understanding evolution
 * - **archived**: Retained for completeness, rarely relevant
 */
export type LifecycleState =
  | 'current'
  | 'stable'
  | 'evolving'
  | 'deprecated'
  | 'historical'
  | 'archived'

/**
 * Confidence level for automated lifecycle detection
 */
export type LifecycleConfidence = 'high' | 'medium' | 'low'

/**
 * Lifecycle metadata attached to entities
 */
export interface LifecycleMetadata {
  /** Current lifecycle state */
  state: LifecycleState

  /** Confidence in the detected/assigned lifecycle state */
  confidence: LifecycleConfidence

  /**
   * Whether this lifecycle state was manually assigned (true)
   * or automatically detected (false)
   */
  manual: boolean

  /**
   * Reference to superseding document (if deprecated/historical)
   * Points to the ID of the entity that replaces this one
   */
  supersededBy?: string

  /**
   * Reason for lifecycle state (for manual assignments)
   */
  reason?: string

  /**
   * When the lifecycle state was last updated (ISO 8601 string)
   * @example "2025-11-06T15:30:00.000Z"
   */
  stateChangedAt?: string

  /**
   * Who/what changed the lifecycle state
   */
  stateChangedBy?: 'manual' | 'automatic' | 'migration'
}

/**
 * Semantic block types
 *
 * Structured content markers that can be parsed from documents
 * using the ::type{} syntax (e.g., ::decision{id="x"})
 */
export type SemanticBlockType =
  | 'decision'    // Architectural or process decisions
  | 'outcome'     // Results or current state
  | 'quote'       // Important quoted text or references
  | 'theme'       // Recurring themes or patterns
  | 'principle'   // Core principles or guidelines
  | 'example'     // Concrete examples
  | 'anti-pattern' // Things to avoid

/**
 * Importance level for semantic blocks
 */
export type BlockImportance = 'critical' | 'high' | 'medium' | 'low'

/**
 * Semantic block metadata
 *
 * Represents a parsed semantic block from a document with its
 * structured metadata and content.
 */
export interface SemanticBlock {
  /** Unique identifier for this block */
  id: string

  /** Type of semantic block */
  type: SemanticBlockType

  /** The content within the block */
  content: string

  /** Importance level (if specified) */
  importance?: BlockImportance

  /** Additional attributes from the block definition */
  attributes: Record<string, string>

  /** Line numbers where this block appears [start, end] */
  location?: [number, number]

  /** ID of the parent entity/document containing this block */
  parentId: string
}

/**
 * Polarity of a mention (for semantic ranking)
 * Used to determine if a document speaks positively or negatively about a topic
 */
export type Polarity = 'positive' | 'negative' | 'neutral'

/**
 * Semantic relationship types
 * Extends base relationship types with semantic-specific relationships
 */
export type SemanticRelationType =
  | 'SUPERSEDES'    // This document replaces another
  | 'SUPERSEDED_BY' // This document is replaced by another
  | 'MOTIVATES'     // This decision/outcome motivated another
  | 'MOTIVATED_BY'  // This was motivated by another decision/outcome
  | 'CITES'         // Direct citation or reference
  | 'CONTRADICTS'   // Conflicting information (flagged for review)
  | 'RELATES_TO'    // General semantic relationship
  | 'TEMPORAL'      // Same time period relationship

/**
 * Semantic relationship metadata
 */
export interface SemanticRelationship {
  /** Relationship type */
  type: SemanticRelationType

  /** Source entity ID */
  sourceId: string

  /** Target entity ID */
  targetId: string

  /** Confidence in this relationship */
  confidence: number

  /** How this relationship was detected */
  detectedBy: 'manual' | 'automatic' | 'inferred'

  /** When this relationship was created (ISO 8601 string) */
  createdAt?: string

  /** Additional context about the relationship */
  context?: string
}

/**
 * Extended entity metadata with lifecycle support
 *
 * This extends the base EntityMetadata to include lifecycle information
 * for semantic processing.
 */
export interface SemanticEntityMetadata {
  /** Lifecycle metadata */
  lifecycle?: LifecycleMetadata

  /** Semantic blocks extracted from this entity */
  blocks?: SemanticBlock[]

  /** Semantic relationships */
  semanticRelationships?: SemanticRelationship[]

  /** Topics/tags for categorization */
  topics?: string[]

  /** Technologies mentioned */
  technologies?: string[]

  /** Participants (people, teams) involved */
  participants?: string[]

  /** Original metadata fields */
  [key: string]: any
}

/**
 * Detection pattern for lifecycle states
 */
export interface LifecyclePattern {
  /** Lifecycle state this pattern detects */
  state: LifecycleState

  /** Regular expression pattern(s) to match */
  patterns: RegExp[]

  /** Confidence level when this pattern matches */
  confidence: LifecycleConfidence

  /** Optional: additional validation logic */
  validate?: (context: string) => boolean
}

/**
 * Result of lifecycle detection
 */
export interface LifecycleDetectionResult {
  /** Detected lifecycle state */
  state: LifecycleState

  /** Confidence in detection */
  confidence: LifecycleConfidence

  /** Patterns that matched */
  matchedPatterns: string[]

  /** Suggested superseding document ID (if deprecated/historical) */
  supersededBy?: string

  /** Additional context from detection */
  context?: string
}

/**
 * Configuration for lifecycle detection
 */
export interface LifecycleDetectorConfig {
  /** Custom patterns to add to built-in patterns */
  customPatterns?: LifecyclePattern[]

  /** Minimum confidence threshold for automatic assignment */
  minConfidence?: LifecycleConfidence

  /** Whether to flag low-confidence detections for manual review */
  flagLowConfidence?: boolean
}

// ============================================================================
// Phase 3: Semantic Pipeline Types (Query-Time Processing)
// ============================================================================

/**
 * Query intent classification
 * Helps determine what the user is looking for and how to rank results
 */
export type QueryIntent = 'what' | 'why' | 'how' | 'when' | 'where' | 'who' | 'unknown'

/**
 * Parsed query structure from Stage 1
 * Preserves user specificity while extracting semantic signals
 */
export interface ParsedQuery {
  /** Original query string (unchanged) */
  original: string

  /** Detected intent */
  intent: QueryIntent

  /** Whether query contains negations ("don't", "avoid", "not") */
  hasNegation: boolean

  /** Negated terms extracted */
  negatedTerms: string[]

  /** Prepositions and their objects (e.g., "FROM x TO y") */
  prepositions: Record<string, string>

  /** Literal terms that should match exactly (no expansion) */
  literalTerms: string[]

  /** Confidence in intent detection */
  confidence: number
}

/**
 * Candidate result from Stage 2 structural filtering
 * Reduced set of potential matches before expensive semantic operations
 */
export interface CandidateResult {
  /** Entity ID */
  id: string

  /** Entity type */
  type: string

  /** Entity properties */
  properties: Record<string, any>

  /** Lifecycle metadata (if available) */
  lifecycle?: LifecycleMetadata

  /** Literal match score (0-1, based on grep-style matching) */
  literalMatchScore: number

  /** Matched lifecycle filter (if filtered by lifecycle) */
  matchedLifecycleFilter?: boolean
}

/**
 * Enriched result from Stage 3
 * Adds semantic signals for ranking
 */
export interface EnrichedResult extends CandidateResult {
  /** Polarity of mentions (positive/negative/neutral) */
  polarity: Polarity

  /** Supersession chain (if deprecated/historical) */
  supersessionChain?: string[]

  /** Temporal context extracted */
  temporalContext?: {
    createdAt?: string
    updatedAt?: string
    relevantPeriod?: string
  }

  /** Relevance factors computed */
  relevanceFactors: {
    recency: number // 0-1
    authority: number // 0-1
    completeness: number // 0-1
  }
}

/**
 * Ranked result from Stage 4
 * Final scored results ready for presentation
 */
export interface RankedResult extends EnrichedResult {
  /** Embedding similarity score (0-1, if vector search used) */
  embeddingSimilarity?: number

  /** Intent alignment score (0-1, how well result matches query intent) */
  intentAlignment: number

  /** Polarity alignment score (0-1, positive match if polarities align) */
  polarityAlignment: number

  /** Authority score (0-1, based on lifecycle + evidence) */
  authorityScore: number

  /** Combined relevance score (0-1, weighted combination) */
  relevanceScore: number

  /** Breakdown of score components for debugging */
  scoreBreakdown: {
    literal: number
    embedding?: number
    intent: number
    polarity: number
    authority: number
    recency: number
  }
}

/**
 * Presented result from Stage 5
 * Final result with extracted blocks, context chains, and suggestions
 */
export interface PresentedResult {
  /** Original ranked result */
  result: RankedResult

  /** Extracted relevant semantic blocks */
  relevantBlocks: SemanticBlock[]

  /** Context chain (supersession chain with full entities) */
  contextChain?: Array<{
    id: string
    type: string
    properties: Record<string, any>
    relationship: string // "SUPERSEDES", "MOTIVATES", etc.
  }>

  /** Navigation hints */
  navigationHints: string[]

  /** "You might also want to know" suggestions */
  relatedSuggestions: Array<{
    id: string
    reason: string // Why this is suggested
    relevance: number // 0-1
  }>

  /** Citations/references */
  citations?: string[]
}

/**
 * Pipeline configuration
 * Controls behavior of all 5 stages
 */
export interface PipelineConfig {
  /** Stage 2: Maximum candidates to pass to semantic stages */
  maxCandidates?: number // default: 100

  /** Stage 2: Minimum literal match score to include candidate */
  minLiteralScore?: number // default: 0.1

  /** Stage 2: Lifecycle filters to apply */
  lifecycleFilters?: LifecycleState[]

  /** Stage 3: Enable polarity detection */
  enablePolarity?: boolean // default: true

  /** Stage 3: Maximum supersession chain depth */
  maxSupersessionDepth?: number // default: 5

  /** Stage 4: Ranking weights for score combination */
  rankingWeights?: {
    literal?: number
    embedding?: number
    intent?: number
    polarity?: number
    authority?: number
    recency?: number
  }

  /** Stage 4: Minimum relevance score to include in results */
  minRelevanceScore?: number // default: 0.1

  /** Stage 5: Maximum number of related suggestions */
  maxSuggestions?: number // default: 5

  /** Stage 5: Maximum blocks to extract per result */
  maxBlocksPerResult?: number // default: 3

  /** Stage 5 (Phase 4): Depth level for progressive loading */
  depth?: ContextDepth // default: STRUCTURE

  /** Performance: Enable vector search for embedding similarity */
  enableVectorSearch?: boolean // default: true

  /** Performance: Query timeout in milliseconds */
  queryTimeout?: number // default: 100
}

/**
 * Pipeline execution result
 * Contains all stage results for debugging/logging
 */
export interface PipelineResult {
  /** Original query */
  query: string

  /** Parsed query from Stage 1 */
  parsedQuery: ParsedQuery

  /** Candidates from Stage 2 */
  candidates: CandidateResult[]

  /** Enriched results from Stage 3 */
  enrichedResults: EnrichedResult[]

  /** Ranked results from Stage 4 */
  rankedResults: RankedResult[]

  /** Final presented results from Stage 5 */
  presentedResults: PresentedResult[]

  /** Projected results from Stage 5 (Phase 4) */
  projectedResults?: import('./ProjectionEngine').ProjectedResult[]

  /** Execution time in milliseconds */
  executionTime: number

  /** Performance breakdown by stage */
  stageTimings: {
    stage1: number
    stage2: number
    stage3: number
    stage4: number
    stage5: number
  }
}
