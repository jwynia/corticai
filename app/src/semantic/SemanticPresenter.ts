/**
 * SemanticPresenter - Stage 5 of Semantic Pipeline
 *
 * Presents ranked results with extracted blocks, context chains, and suggestions.
 * Final stage that formats results for user consumption.
 *
 * Key responsibilities:
 * - Extract relevant semantic blocks from results
 * - Build context chains (supersession relationships)
 * - Generate navigation hints
 * - Create "you might also want to know" suggestions
 *
 * Performance target: <10ms for typical result sets
 */

import type {
  RankedResult,
  PresentedResult,
  ParsedQuery,
  PipelineConfig,
  SemanticBlock,
} from './types'

/**
 * Block lookup function type
 * Used to retrieve semantic blocks for entities
 */
export type BlockLookupFn = (entityId: string) => Promise<SemanticBlock[]>

/**
 * Entity lookup for context chains
 */
export type ChainEntityLookupFn = (entityId: string) => Promise<{
  id: string
  type: string
  properties: Record<string, any>
} | undefined>

/**
 * SemanticPresenter implementation
 */
export class SemanticPresenter {
  private blockLookup?: BlockLookupFn
  private chainEntityLookup?: ChainEntityLookupFn

  /**
   * Create a new SemanticPresenter
   *
   * @param blockLookup - Function to look up semantic blocks
   * @param chainEntityLookup - Function to look up entities for context chains
   */
  constructor(blockLookup?: BlockLookupFn, chainEntityLookup?: ChainEntityLookupFn) {
    this.blockLookup = blockLookup
    this.chainEntityLookup = chainEntityLookup
  }

  /**
   * Present ranked results with formatting and enhancements
   *
   * @param ranked - Ranked results from Stage 4 (SemanticRanker)
   * @param parsedQuery - Parsed query from Stage 1 (QueryParser)
   * @param config - Pipeline configuration
   * @returns Presented results ready for user display
   */
  async present(
    ranked: RankedResult[],
    parsedQuery: ParsedQuery,
    config?: PipelineConfig
  ): Promise<PresentedResult[]> {
    const maxBlocksPerResult = config?.maxBlocksPerResult ?? 3
    const maxSuggestions = config?.maxSuggestions ?? 5

    const presentedPromises = ranked.map(async (result) => {
      // Extract relevant blocks
      const relevantBlocks = await this.extractRelevantBlocks(result, maxBlocksPerResult)

      // Build context chain
      const contextChain = await this.buildContextChain(result)

      // Generate navigation hints
      const navigationHints = this.generateNavigationHints(result, parsedQuery)

      // Generate related suggestions (from top ranked results excluding current)
      const relatedSuggestions = this.generateSuggestions(
        result,
        ranked,
        maxSuggestions
      )

      return {
        result,
        relevantBlocks,
        contextChain,
        navigationHints,
        relatedSuggestions,
      }
    })

    return Promise.all(presentedPromises)
  }

  /**
   * Extract relevant semantic blocks from result
   */
  private async extractRelevantBlocks(
    result: RankedResult,
    maxBlocks: number
  ): Promise<SemanticBlock[]> {
    if (!this.blockLookup) {
      return []
    }

    const blocks = await this.blockLookup(result.id)

    // Return top N blocks (could be ranked by importance in future)
    return blocks.slice(0, maxBlocks)
  }

  /**
   * Build context chain from supersession relationships
   */
  private async buildContextChain(result: RankedResult): Promise<Array<{
    id: string
    type: string
    properties: Record<string, any>
    relationship: string
  }> | undefined> {
    if (!result.supersessionChain || result.supersessionChain.length === 0) {
      return undefined
    }

    if (!this.chainEntityLookup) {
      return undefined
    }

    const chain: Array<{
      id: string
      type: string
      properties: Record<string, any>
      relationship: string
    }> = []

    for (const entityId of result.supersessionChain) {
      const entity = await this.chainEntityLookup(entityId)
      if (entity) {
        chain.push({
          ...entity,
          relationship: 'SUPERSEDES',
        })
      }
    }

    return chain.length > 0 ? chain : undefined
  }

  /**
   * Generate navigation hints based on result and query
   */
  private generateNavigationHints(
    result: RankedResult,
    parsedQuery: ParsedQuery
  ): string[] {
    const hints: string[] = []

    // Suggest viewing superseding documents if deprecated
    if (result.lifecycle?.state === 'deprecated' && result.supersessionChain) {
      hints.push(`This document is deprecated. See current version for latest guidance.`)
    }

    // Suggest "how" if user asked "what"
    if (parsedQuery.intent === 'what') {
      hints.push(`Try "how to implement" for step-by-step guidance`)
    }

    // Suggest "why" if user asked "how"
    if (parsedQuery.intent === 'how') {
      hints.push(`Try "why" to understand rationale behind these approaches`)
    }

    // Suggest exploring related topics from prepositions
    if (parsedQuery.prepositions.from && parsedQuery.prepositions.to) {
      hints.push(`Compare ${parsedQuery.prepositions.from} vs ${parsedQuery.prepositions.to}`)
    }

    return hints
  }

  /**
   * Generate related suggestions from other top results
   */
  private generateSuggestions(
    currentResult: RankedResult,
    allRanked: RankedResult[],
    maxSuggestions: number
  ): Array<{
    id: string
    reason: string
    relevance: number
  }> {
    const suggestions: Array<{
      id: string
      reason: string
      relevance: number
    }> = []

    for (const other of allRanked) {
      if (other.id === currentResult.id) {
        continue
      }

      if (suggestions.length >= maxSuggestions) {
        break
      }

      // Determine reason for suggestion
      let reason = 'Related content'

      if (other.lifecycle?.state === 'current' && currentResult.lifecycle?.state === 'deprecated') {
        reason = 'Current alternative to this deprecated approach'
      } else if (other.polarity !== currentResult.polarity) {
        reason = 'Alternative perspective'
      } else if (other.relevanceScore > 0.7) {
        reason = 'Highly relevant'
      }

      suggestions.push({
        id: other.id,
        reason,
        relevance: other.relevanceScore,
      })
    }

    return suggestions
  }
}
