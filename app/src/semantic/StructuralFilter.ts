/**
 * StructuralFilter - Stage 2 of Semantic Pipeline
 *
 * Performs structural filtering to reduce the knowledge base to ~100 candidate results.
 * Uses lifecycle metadata and literal text matching (grep-style) for fast filtering.
 *
 * Key responsibilities:
 * - Filter by lifecycle state (current, stable, deprecated, etc.)
 * - Perform literal text matching on entity content
 * - Score results by term coverage (0-1)
 * - Exclude negated terms
 * - Reduce to top N candidates by score
 *
 * Performance target: <10ms for typical queries
 */

import type { ParsedQuery, CandidateResult, PipelineConfig, LifecycleState } from './types'

/**
 * Entity structure expected from storage layer
 * Minimal interface for filtering operations
 */
export interface FilterableEntity {
  id: string
  type: string
  properties: Record<string, any>
  lifecycle?: {
    state: LifecycleState
    confidence: 'high' | 'medium' | 'low'
    manual: boolean
  }
}

/**
 * Entity provider function type
 * Abstracts storage layer for testability
 */
export type EntityProvider = () => Promise<FilterableEntity[]>

/**
 * StructuralFilter implementation
 */
export class StructuralFilter {
  private entityProvider: EntityProvider

  /**
   * Create a new StructuralFilter
   *
   * @param entityProvider - Function that returns all filterable entities
   */
  constructor(entityProvider: EntityProvider) {
    this.entityProvider = entityProvider
  }

  /**
   * Filter entities based on parsed query and configuration
   *
   * @param parsedQuery - Parsed query from Stage 1 (QueryParser)
   * @param config - Pipeline configuration
   * @returns Filtered and scored candidate results
   */
  async filter(parsedQuery: ParsedQuery, config?: PipelineConfig): Promise<CandidateResult[]> {
    // Fetch all entities
    const entities = await this.entityProvider()

    // Apply filters and scoring
    let candidates = entities
      .map(entity => this.toCandidateResult(entity, parsedQuery, config))
      .filter(candidate => {
        // Filter by lifecycle if specified
        if (config?.lifecycleFilters && config.lifecycleFilters.length > 0) {
          if (!candidate.lifecycle) return false
          if (!config.lifecycleFilters.includes(candidate.lifecycle.state)) return false
          candidate.matchedLifecycleFilter = true
        }

        // Filter by negated terms
        if (parsedQuery.hasNegation && parsedQuery.negatedTerms.length > 0) {
          if (this.containsNegatedTerms(candidate, parsedQuery.negatedTerms)) {
            return false
          }
        }

        // Filter by minimum score
        const minScore = config?.minLiteralScore ?? 0.1
        return candidate.literalMatchScore >= minScore
      })

    // Sort by score descending (highest scores first)
    candidates.sort((a, b) => b.literalMatchScore - a.literalMatchScore)

    // Limit to maxCandidates
    const maxCandidates = config?.maxCandidates ?? 100
    if (candidates.length > maxCandidates) {
      candidates = candidates.slice(0, maxCandidates)
    }

    return candidates
  }

  /**
   * Convert entity to CandidateResult with scoring
   */
  private toCandidateResult(
    entity: FilterableEntity,
    parsedQuery: ParsedQuery,
    config?: PipelineConfig
  ): CandidateResult {
    // Calculate literal match score
    const literalMatchScore = this.calculateLiteralMatchScore(entity, parsedQuery.literalTerms)

    return {
      id: entity.id,
      type: entity.type,
      properties: entity.properties,
      lifecycle: entity.lifecycle,
      literalMatchScore,
      matchedLifecycleFilter: false, // Will be set during filtering
    }
  }

  /**
   * Calculate literal match score based on term coverage
   *
   * Score = (number of matched terms) / (total literal terms)
   * Returns 0 if no literal terms provided
   */
  private calculateLiteralMatchScore(entity: FilterableEntity, literalTerms: string[]): number {
    if (literalTerms.length === 0) {
      return 0
    }

    // Extract searchable text from entity
    const searchableText = this.extractSearchableText(entity).toLowerCase()

    // Count how many terms match
    let matchedTerms = 0
    for (const term of literalTerms) {
      if (searchableText.includes(term.toLowerCase())) {
        matchedTerms++
      }
    }

    return matchedTerms / literalTerms.length
  }

  /**
   * Check if entity contains any negated terms
   */
  private containsNegatedTerms(candidate: CandidateResult, negatedTerms: string[]): boolean {
    const searchableText = this.extractSearchableText(candidate).toLowerCase()

    for (const term of negatedTerms) {
      if (searchableText.includes(term.toLowerCase())) {
        return true
      }
    }

    return false
  }

  /**
   * Extract all searchable text from an entity
   * Includes all string properties (title, content, etc.)
   */
  private extractSearchableText(entity: FilterableEntity | CandidateResult): string {
    const textParts: string[] = []

    // Add all string properties
    for (const [key, value] of Object.entries(entity.properties)) {
      if (typeof value === 'string') {
        textParts.push(value)
      } else if (Array.isArray(value)) {
        // Handle arrays of strings
        for (const item of value) {
          if (typeof item === 'string') {
            textParts.push(item)
          }
        }
      }
    }

    // Add lifecycle state text (for matching against "deprecated", etc.)
    if (entity.lifecycle) {
      textParts.push(entity.lifecycle.state)
    }

    return textParts.join(' ')
  }
}
