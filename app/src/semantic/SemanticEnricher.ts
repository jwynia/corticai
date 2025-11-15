/**
 * SemanticEnricher - Stage 3 of Semantic Pipeline
 *
 * Enriches candidate results with semantic signals for ranking.
 * Adds polarity detection, supersession chains, temporal context, and relevance factors.
 *
 * Key responsibilities:
 * - Detect polarity (positive/negative/neutral) of content
 * - Build supersession chains by following deprecated documents
 * - Extract temporal context (createdAt, updatedAt, relevantPeriod)
 * - Calculate relevance factors (recency, authority, completeness)
 *
 * Performance target: <50ms for 100 candidates
 */

import type {
  CandidateResult,
  EnrichedResult,
  ParsedQuery,
  PipelineConfig,
  Polarity,
  LifecycleState,
} from './types'

/**
 * Entity lookup function type
 * Used to resolve supersession chains
 */
export type EntityLookupFn = (id: string) => Promise<{
  id: string
  type: string
  properties: Record<string, any>
  lifecycle?: {
    state: LifecycleState
    confidence: 'high' | 'medium' | 'low'
    manual: boolean
    supersededBy?: string
  }
} | undefined>

/**
 * Positive sentiment keywords
 */
const POSITIVE_KEYWORDS = [
  'excellent',
  'recommend',
  'best',
  'effective',
  'should',
  'prefer',
  'advantage',
  'benefit',
  'improve',
  'good',
  'better',
  'optimal',
  'efficient',
]

/**
 * Negative sentiment keywords
 */
const NEGATIVE_KEYWORDS = [
  'avoid',
  'limitation',
  'problem',
  'deprecated',
  'shouldn\'t',
  'bad',
  'worse',
  'issue',
  'difficult',
  'slow',
  'obsolete',
  'broken',
]

/**
 * Authority scores by lifecycle state
 */
const LIFECYCLE_AUTHORITY: Record<LifecycleState, number> = {
  current: 1.0,
  stable: 0.9,
  evolving: 0.7,
  deprecated: 0.3,
  historical: 0.2,
  archived: 0.1,
}

/**
 * SemanticEnricher implementation
 */
export class SemanticEnricher {
  private entityLookup: EntityLookupFn

  /**
   * Create a new SemanticEnricher
   *
   * @param entityLookup - Function to look up entities by ID (for supersession chains)
   */
  constructor(entityLookup: EntityLookupFn) {
    this.entityLookup = entityLookup
  }

  /**
   * Enrich candidate results with semantic signals
   *
   * @param candidates - Candidate results from Stage 2 (StructuralFilter)
   * @param parsedQuery - Parsed query from Stage 1 (QueryParser)
   * @param config - Pipeline configuration
   * @returns Enriched results with polarity, chains, and relevance factors
   */
  async enrich(
    candidates: CandidateResult[],
    parsedQuery: ParsedQuery,
    config?: PipelineConfig
  ): Promise<EnrichedResult[]> {
    // Process all candidates in parallel for performance
    const enrichedPromises = candidates.map(candidate =>
      this.enrichCandidate(candidate, parsedQuery, config)
    )

    return Promise.all(enrichedPromises)
  }

  /**
   * Enrich a single candidate
   */
  private async enrichCandidate(
    candidate: CandidateResult,
    parsedQuery: ParsedQuery,
    config?: PipelineConfig
  ): Promise<EnrichedResult> {
    // Detect polarity
    const polarity = this.detectPolarity(candidate)

    // Build supersession chain (if applicable)
    const supersessionChain = await this.buildSupersessionChain(
      candidate,
      config?.maxSupersessionDepth ?? 5
    )

    // Extract temporal context
    const temporalContext = this.extractTemporalContext(candidate, parsedQuery)

    // Calculate relevance factors
    const relevanceFactors = this.calculateRelevanceFactors(candidate)

    return {
      ...candidate,
      polarity,
      supersessionChain,
      temporalContext,
      relevanceFactors,
    }
  }

  /**
   * Detect polarity (positive/negative/neutral) of content
   */
  private detectPolarity(candidate: CandidateResult): Polarity {
    // Extract searchable text
    const text = this.extractText(candidate).toLowerCase()

    // Count positive and negative keywords
    let positiveCount = 0
    let negativeCount = 0

    for (const keyword of POSITIVE_KEYWORDS) {
      if (text.includes(keyword)) {
        positiveCount++
      }
    }

    for (const keyword of NEGATIVE_KEYWORDS) {
      if (text.includes(keyword)) {
        negativeCount++
      }
    }

    // Consider lifecycle state
    if (candidate.lifecycle) {
      if (candidate.lifecycle.state === 'deprecated' || candidate.lifecycle.state === 'historical') {
        negativeCount += 2 // Strong bias toward negative
      } else if (candidate.lifecycle.state === 'current' || candidate.lifecycle.state === 'stable') {
        positiveCount += 1 // Slight bias toward positive
      }
    }

    // Determine polarity
    if (positiveCount > negativeCount) {
      return 'positive'
    } else if (negativeCount > positiveCount) {
      return 'negative'
    } else {
      return 'neutral'
    }
  }

  /**
   * Build supersession chain by following supersededBy links
   */
  private async buildSupersessionChain(
    candidate: CandidateResult,
    maxDepth: number
  ): Promise<string[] | undefined> {
    // Only build chains for deprecated/historical/archived documents
    if (!candidate.lifecycle) {
      return undefined
    }

    const state = candidate.lifecycle.state
    if (state !== 'deprecated' && state !== 'historical' && state !== 'archived') {
      return undefined
    }

    if (!candidate.lifecycle.supersededBy) {
      return undefined
    }

    // Follow the chain
    const chain: string[] = []
    const visited = new Set<string>([candidate.id]) // Detect circular references
    let currentId = candidate.lifecycle.supersededBy
    let depth = 0

    while (currentId && depth < maxDepth) {
      // Check for circular reference
      if (visited.has(currentId)) {
        break
      }

      chain.push(currentId)
      visited.add(currentId)

      // Look up next entity
      const entity = await this.entityLookup(currentId)
      if (!entity || !entity.lifecycle || !entity.lifecycle.supersededBy) {
        break
      }

      currentId = entity.lifecycle.supersededBy
      depth++
    }

    return chain.length > 0 ? chain : undefined
  }

  /**
   * Extract temporal context from candidate and query
   */
  private extractTemporalContext(
    candidate: CandidateResult,
    parsedQuery: ParsedQuery
  ): {
    createdAt?: string
    updatedAt?: string
    relevantPeriod?: string
  } {
    const context: {
      createdAt?: string
      updatedAt?: string
      relevantPeriod?: string
    } = {}

    // Extract createdAt and updatedAt from properties
    if (candidate.properties.createdAt) {
      context.createdAt = candidate.properties.createdAt
    }

    if (candidate.properties.updatedAt) {
      context.updatedAt = candidate.properties.updatedAt
    }

    // Extract relevantPeriod from query prepositions
    if (parsedQuery.prepositions.in) {
      context.relevantPeriod = parsedQuery.prepositions.in
    } else if (parsedQuery.prepositions.during) {
      context.relevantPeriod = parsedQuery.prepositions.during
    }

    return context
  }

  /**
   * Calculate relevance factors (recency, authority, completeness)
   */
  private calculateRelevanceFactors(candidate: CandidateResult): {
    recency: number
    authority: number
    completeness: number
  } {
    return {
      recency: this.calculateRecency(candidate),
      authority: this.calculateAuthority(candidate),
      completeness: this.calculateCompleteness(candidate),
    }
  }

  /**
   * Calculate recency score (0-1) based on updatedAt or createdAt
   * Exponential decay: score = e^(-age_in_days / halflife)
   * Halflife = 180 days (6 months)
   */
  private calculateRecency(candidate: CandidateResult): number {
    const dateStr = candidate.properties.updatedAt || candidate.properties.createdAt

    if (!dateStr) {
      return 0.5 // Default to middle if no date available
    }

    try {
      const date = new Date(dateStr)
      const now = new Date()
      const ageInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

      // Exponential decay with 180-day halflife
      const halflife = 180
      const score = Math.exp(-ageInDays / halflife)

      return Math.max(0, Math.min(1, score))
    } catch {
      return 0.5
    }
  }

  /**
   * Calculate authority score (0-1) based on lifecycle state
   */
  private calculateAuthority(candidate: CandidateResult): number {
    if (!candidate.lifecycle) {
      return 0.5 // Default authority if no lifecycle metadata
    }

    return LIFECYCLE_AUTHORITY[candidate.lifecycle.state] ?? 0.5
  }

  /**
   * Calculate completeness score (0-1) based on property richness
   * More non-empty properties = higher completeness
   */
  private calculateCompleteness(candidate: CandidateResult): number {
    const properties = candidate.properties
    let nonEmptyCount = 0
    let totalCount = 0

    for (const [key, value] of Object.entries(properties)) {
      totalCount++

      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'string' && value.trim().length > 0) {
          nonEmptyCount++
        } else if (typeof value !== 'string') {
          nonEmptyCount++
        }
      }
    }

    if (totalCount === 0) {
      return 0.5
    }

    return nonEmptyCount / totalCount
  }

  /**
   * Extract all text from candidate for polarity analysis
   */
  private extractText(candidate: CandidateResult): string {
    const textParts: string[] = []

    for (const value of Object.values(candidate.properties)) {
      if (typeof value === 'string') {
        textParts.push(value)
      }
    }

    // Add lifecycle state text
    if (candidate.lifecycle) {
      textParts.push(candidate.lifecycle.state)
    }

    return textParts.join(' ')
  }
}
