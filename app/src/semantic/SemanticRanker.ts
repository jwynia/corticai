/**
 * SemanticRanker - Stage 4 of Semantic Pipeline
 *
 * Ranks enriched results using multi-signal scoring.
 * Combines literal matching, intent alignment, polarity alignment, authority,
 * and recency into a final relevance score.
 *
 * Key responsibilities:
 * - Calculate intent alignment (does result match query intent?)
 * - Calculate polarity alignment (does result sentiment match query?)
 * - Calculate authority score (from lifecycle + evidence)
 * - Combine all signals with weighted formula
 * - Sort results by relevance score descending
 *
 * Performance target: <20ms for 100 results
 */

import type {
  EnrichedResult,
  RankedResult,
  ParsedQuery,
  PipelineConfig,
  QueryIntent,
  Polarity,
} from './types'

/**
 * Embedding similarity function type
 * Optional function to calculate vector similarity
 */
export type EmbeddingSimilarityFn = (
  enriched: EnrichedResult[],
  query: ParsedQuery
) => Promise<Array<{ id: string; similarity: number }>>

/**
 * Intent detection keywords for content analysis
 */
const INTENT_CONTENT_PATTERNS: Record<QueryIntent, RegExp[]> = {
  what: [
    /\bis\b/i,
    /\bare\b/i,
    /definition/i,
    /means/i,
    /refers to/i,
    /technique/i,
    /approach/i,
  ],
  how: [
    /first/i,
    /second/i,
    /step/i,
    /install/i,
    /configure/i,
    /implement/i,
    /process/i,
    /procedure/i,
  ],
  why: [
    /reason/i,
    /because/i,
    /rationale/i,
    /motivation/i,
    /\bchoos/i, // Matches chose, chosen, choosing
    /advantage/i,
    /benefit/i,
    /performance/i, // Common in "why" explanations
    /better/i, // Comparative reasons
  ],
  when: [/when/i, /timing/i, /schedule/i, /date/i, /time/i, /period/i],
  where: [/where/i, /location/i, /place/i, /file/i, /path/i, /repository/i],
  who: [/who/i, /author/i, /team/i, /developer/i, /person/i, /people/i],
  unknown: [],
}

/**
 * Positive query keywords (for polarity detection)
 */
const POSITIVE_QUERY_KEYWORDS = ['best', 'good', 'effective', 'recommended', 'advantage', 'benefit']

/**
 * Negative query keywords (for polarity detection)
 */
const NEGATIVE_QUERY_KEYWORDS = [
  'problem',
  'issue',
  'avoid',
  'limitation',
  'bad',
  'worse',
  'deprecated',
]

/**
 * Default ranking weights
 */
const DEFAULT_WEIGHTS = {
  literal: 0.25,
  embedding: 0.20,
  intent: 0.15,
  polarity: 0.10,
  authority: 0.20,
  recency: 0.10,
}

/**
 * SemanticRanker implementation
 */
export class SemanticRanker {
  private embeddingSimilarityFn?: EmbeddingSimilarityFn

  /**
   * Create a new SemanticRanker
   *
   * @param embeddingSimilarityFn - Optional function to calculate embedding similarity
   */
  constructor(embeddingSimilarityFn?: EmbeddingSimilarityFn) {
    this.embeddingSimilarityFn = embeddingSimilarityFn
  }

  /**
   * Rank enriched results by relevance
   *
   * @param enriched - Enriched results from Stage 3 (SemanticEnricher)
   * @param parsedQuery - Parsed query from Stage 1 (QueryParser)
   * @param config - Pipeline configuration
   * @returns Ranked results sorted by relevance score descending
   */
  async rank(
    enriched: EnrichedResult[],
    parsedQuery: ParsedQuery,
    config?: PipelineConfig
  ): Promise<RankedResult[]> {
    if (enriched.length === 0) {
      return []
    }

    // Get embedding similarities if available
    let embeddingSimilarities: Map<string, number> | undefined
    if (this.embeddingSimilarityFn) {
      const similarities = await this.embeddingSimilarityFn(enriched, parsedQuery)
      embeddingSimilarities = new Map(similarities.map(s => [s.id, s.similarity]))
    }

    // Infer query polarity from keywords
    const queryPolarity = this.inferQueryPolarity(parsedQuery)

    // Score each result
    const ranked = enriched.map(result => {
      const intentAlignment = this.calculateIntentAlignment(result, parsedQuery)
      const polarityAlignment = this.calculatePolarityAlignment(result, queryPolarity)
      const authorityScore = result.relevanceFactors.authority
      const embeddingSimilarity = embeddingSimilarities?.get(result.id)

      // Calculate combined relevance score
      const { relevanceScore, scoreBreakdown } = this.calculateRelevanceScore(
        {
          literal: result.literalMatchScore,
          embedding: embeddingSimilarity,
          intent: intentAlignment,
          polarity: polarityAlignment,
          authority: authorityScore,
          recency: result.relevanceFactors.recency,
        },
        config
      )

      return {
        ...result,
        embeddingSimilarity,
        intentAlignment,
        polarityAlignment,
        authorityScore,
        relevanceScore,
        scoreBreakdown,
      }
    })

    // Sort by relevance score descending
    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return ranked
  }

  /**
   * Infer query polarity from keywords
   */
  private inferQueryPolarity(parsedQuery: ParsedQuery): Polarity {
    const queryText = parsedQuery.original.toLowerCase()

    let positiveCount = 0
    let negativeCount = 0

    for (const keyword of POSITIVE_QUERY_KEYWORDS) {
      if (queryText.includes(keyword)) {
        positiveCount++
      }
    }

    for (const keyword of NEGATIVE_QUERY_KEYWORDS) {
      if (queryText.includes(keyword)) {
        negativeCount++
      }
    }

    if (positiveCount > negativeCount) {
      return 'positive'
    } else if (negativeCount > positiveCount) {
      return 'negative'
    } else {
      return 'neutral'
    }
  }

  /**
   * Calculate intent alignment score (0-1)
   * How well does the result content match the query intent?
   */
  private calculateIntentAlignment(result: EnrichedResult, parsedQuery: ParsedQuery): number {
    if (parsedQuery.intent === 'unknown') {
      return 0.5 // Default for unknown intent
    }

    const content = this.extractContent(result).toLowerCase()
    const patterns = INTENT_CONTENT_PATTERNS[parsedQuery.intent]

    let matchCount = 0
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        matchCount++
      }
    }

    // Score based on pattern matches
    if (matchCount === 0) {
      return 0.3 // Low alignment
    } else if (matchCount === 1) {
      return 0.6 // Medium alignment
    } else {
      return 0.9 // High alignment
    }
  }

  /**
   * Calculate polarity alignment score (0-1)
   * How well does the result polarity match the query polarity?
   */
  private calculatePolarityAlignment(result: EnrichedResult, queryPolarity: Polarity): number {
    if (queryPolarity === 'neutral' && result.polarity === 'neutral') {
      return 0.6 // Neutral-neutral: medium alignment
    }

    if (queryPolarity === result.polarity) {
      return 0.9 // Perfect match
    }

    if (queryPolarity === 'neutral' || result.polarity === 'neutral') {
      return 0.5 // One is neutral: medium alignment
    }

    // Polarity mismatch (positive-negative or negative-positive)
    return 0.2
  }

  /**
   * Calculate combined relevance score using weighted formula
   */
  private calculateRelevanceScore(
    scores: {
      literal: number
      embedding?: number
      intent: number
      polarity: number
      authority: number
      recency: number
    },
    config?: PipelineConfig
  ): {
    relevanceScore: number
    scoreBreakdown: {
      literal: number
      embedding?: number
      intent: number
      polarity: number
      authority: number
      recency: number
    }
  } {
    // Get weights (custom or default)
    const weights = {
      literal: config?.rankingWeights?.literal ?? DEFAULT_WEIGHTS.literal,
      embedding: config?.rankingWeights?.embedding ?? DEFAULT_WEIGHTS.embedding,
      intent: config?.rankingWeights?.intent ?? DEFAULT_WEIGHTS.intent,
      polarity: config?.rankingWeights?.polarity ?? DEFAULT_WEIGHTS.polarity,
      authority: config?.rankingWeights?.authority ?? DEFAULT_WEIGHTS.authority,
      recency: config?.rankingWeights?.recency ?? DEFAULT_WEIGHTS.recency,
    }

    // Calculate weighted sum
    let relevanceScore = 0
    let totalWeight = 0

    // Literal matching
    relevanceScore += scores.literal * weights.literal
    totalWeight += weights.literal

    // Embedding similarity (if available)
    if (scores.embedding !== undefined) {
      relevanceScore += scores.embedding * weights.embedding
      totalWeight += weights.embedding
    }

    // Intent alignment
    relevanceScore += scores.intent * weights.intent
    totalWeight += weights.intent

    // Polarity alignment
    relevanceScore += scores.polarity * weights.polarity
    totalWeight += weights.polarity

    // Authority
    relevanceScore += scores.authority * weights.authority
    totalWeight += weights.authority

    // Recency
    relevanceScore += scores.recency * weights.recency
    totalWeight += weights.recency

    // Normalize by total weight
    relevanceScore = relevanceScore / totalWeight

    return {
      relevanceScore: Math.max(0, Math.min(1, relevanceScore)),
      scoreBreakdown: {
        literal: scores.literal,
        embedding: scores.embedding,
        intent: scores.intent,
        polarity: scores.polarity,
        authority: scores.authority,
        recency: scores.recency,
      },
    }
  }

  /**
   * Extract searchable content from result
   */
  private extractContent(result: EnrichedResult): string {
    const textParts: string[] = []

    for (const value of Object.values(result.properties)) {
      if (typeof value === 'string') {
        textParts.push(value)
      }
    }

    return textParts.join(' ')
  }
}
