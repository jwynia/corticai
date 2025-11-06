/**
 * Lifecycle Detector
 *
 * Automatically detects lifecycle states for documents based on content analysis
 * and pattern matching. Provides confidence scoring and manual review flagging.
 *
 * @see context-network/architecture/semantic-processing/write-time-enrichment.md
 */

import type {
  LifecycleState,
  LifecycleConfidence,
  LifecyclePattern,
  LifecycleDetectionResult,
  LifecycleDetectorConfig,
} from './types'

/**
 * Built-in lifecycle detection patterns
 *
 * These patterns detect lifecycle states based on keywords and phrases
 * commonly used in documentation.
 */
const BUILT_IN_PATTERNS: LifecyclePattern[] = [
  // CURRENT state patterns
  {
    state: 'current',
    patterns: [
      /\bcurrent\s+(approach|implementation|design|architecture|strategy)\b/i,
      /\bwe\s+(now|currently)\s+use\b/i,
      /\bactive\s+(development|implementation)\b/i,
      /\bin\s+production\b/i,
      /\brecommended\s+approach\b/i,
    ],
    confidence: 'high',
  },
  {
    state: 'current',
    patterns: [
      /\bthis\s+is\s+(how|what|where)\s+we\b/i,
      /\bour\s+standard\b/i,
    ],
    confidence: 'medium',
  },

  // DEPRECATED state patterns
  {
    state: 'deprecated',
    patterns: [
      /\bdeprecated\b/i,
      /\bno\s+longer\s+(used|maintained|supported|recommended)\b/i,
      /\bsuperseded\s+by\b/i,
      /\breplaced\s+by\b/i,
      /\bmoved\s+(away\s+)?from\s+[\w\s]+\s+to\b/i,
      /\bswitched\s+(from|away\s+from)\b/i,
    ],
    confidence: 'high',
  },
  {
    state: 'deprecated',
    patterns: [
      /\bold\s+(approach|implementation|design|architecture)\b/i,
      /\bprevious(ly)?\s+(used|implemented)\b/i,
      /\blegacy\b/i,
    ],
    confidence: 'medium',
  },

  // HISTORICAL state patterns
  {
    state: 'historical',
    patterns: [
      /\bhistorical\s+(context|background|reference)\b/i,
      /\bfor\s+historical\s+purposes\b/i,
      /\barchived\s+for\s+reference\b/i,
    ],
    confidence: 'high',
  },
  {
    state: 'historical',
    patterns: [
      /\b(back\s+)?in\s+\d{4}\b/i,
      /\binitially\s+we\b/i,
      /\bearly\s+in\s+the\s+project\b/i,
    ],
    confidence: 'low',
  },

  // STABLE state patterns
  {
    state: 'stable',
    patterns: [
      /\bstable\b/i,
      /\bwell[\s-]established\b/i,
      /\bproven\s+(approach|pattern|design)\b/i,
      /\blong[\s-]term\s+solution\b/i,
      /\bcore\s+(principle|pattern|architecture)\b/i,
    ],
    confidence: 'high',
  },
  {
    state: 'stable',
    patterns: [
      /\bhas\s+been\s+(working|used|in\s+place)\s+for\b/i,
      /\btime[\s-]tested\b/i,
    ],
    confidence: 'medium',
  },

  // EVOLVING state patterns
  {
    state: 'evolving',
    patterns: [
      /\bwork\s+in\s+progress\b/i,
      /\bWIP\b/,
      /\bevolving\b/i,
      /\bunder\s+(development|construction|review)\b/i,
      /\bin\s+progress\b/i,
      /\bdraft\b/i,
    ],
    confidence: 'high',
  },
  {
    state: 'evolving',
    patterns: [
      /\bmay\s+change\b/i,
      /\bsubject\s+to\s+change\b/i,
      /\bnot\s+yet\s+(finalized|complete|stable)\b/i,
    ],
    confidence: 'medium',
  },

  // ARCHIVED state patterns
  {
    state: 'archived',
    patterns: [
      /\barchived\b/i,
      /\bno\s+longer\s+relevant\b/i,
      /\bobsolete\b/i,
      /\bproject\s+(completed|cancelled|abandoned)\b/i,
    ],
    confidence: 'high',
  },
]

/**
 * Extracts superseding document reference from content
 *
 * Looks for patterns like "superseded by X", "replaced by X", "see X instead"
 */
function extractSupersededBy(content: string): string | undefined {
  const patterns = [
    /superseded\s+by\s+\[\[([^\]]+)\]\]/i,
    /superseded\s+by\s+`([^`]+)`/i,
    /superseded\s+by\s+([a-zA-Z0-9\-_.\/]+)/i,
    /replaced\s+by\s+\[\[([^\]]+)\]\]/i,
    /replaced\s+by\s+`([^`]+)`/i,
    /replaced\s+by\s+([a-zA-Z0-9\-_.\/]+)/i,
    /see\s+\[\[([^\]]+)\]\]\s+instead/i,
    /see\s+`([^`]+)`\s+instead/i,
    /moved\s+to\s+\[\[([^\]]+)\]\]/i,
    /moved\s+to\s+`([^`]+)`/i,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return undefined
}

/**
 * Lifecycle Detector
 *
 * Analyzes document content to detect lifecycle state automatically.
 */
export class LifecycleDetector {
  private patterns: LifecyclePattern[]
  private minConfidence: LifecycleConfidence
  private flagLowConfidence: boolean

  /**
   * Create a new lifecycle detector
   *
   * @param config Configuration options
   */
  constructor(config?: LifecycleDetectorConfig) {
    this.patterns = [...BUILT_IN_PATTERNS, ...(config?.customPatterns || [])]
    this.minConfidence = config?.minConfidence || 'low'
    this.flagLowConfidence = config?.flagLowConfidence !== false
  }

  /**
   * Detect lifecycle state from document content
   *
   * @param content Document content to analyze
   * @param filename Optional filename for additional context
   * @returns Detection result with state, confidence, and metadata
   */
  detect(content: string, filename?: string): LifecycleDetectionResult | null {
    const matches: Array<{
      state: LifecycleState
      confidence: LifecycleConfidence
      pattern: string
    }> = []

    // Check each pattern against the content
    for (const { state, patterns, confidence, validate } of this.patterns) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          // Additional validation if provided
          if (validate && !validate(content)) {
            continue
          }

          matches.push({
            state,
            confidence,
            pattern: pattern.source,
          })
        }
      }
    }

    // No matches found
    if (matches.length === 0) {
      return null
    }

    // Score matches and select best candidate
    const scored = this.scoreMatches(matches)
    const best = scored[0]

    // Check if confidence meets minimum threshold
    if (!this.meetsMinConfidence(best.confidence)) {
      return null
    }

    // Extract superseding document if applicable
    const supersededBy =
      best.state === 'deprecated' || best.state === 'historical'
        ? extractSupersededBy(content)
        : undefined

    // Build context message
    const context = this.buildContext(best, matches.length, filename)

    return {
      state: best.state,
      confidence: best.confidence,
      matchedPatterns: matches.map(m => m.pattern),
      supersededBy,
      context,
    }
  }

  /**
   * Score and rank matches to find the best candidate
   *
   * Higher confidence matches get priority. If multiple matches have the
   * same confidence, certain states take precedence based on semantic importance.
   */
  private scoreMatches(
    matches: Array<{
      state: LifecycleState
      confidence: LifecycleConfidence
    }>
  ): Array<{ state: LifecycleState; confidence: LifecycleConfidence }> {
    const confidenceScore = {
      high: 3,
      medium: 2,
      low: 1,
    }

    // State priority: deprecated > current > evolving > stable > historical > archived
    const statePriority: Record<LifecycleState, number> = {
      deprecated: 6,
      current: 5,
      evolving: 4,
      stable: 3,
      historical: 2,
      archived: 1,
    }

    // Aggregate by state and take highest confidence
    const stateMap = new Map<LifecycleState, LifecycleConfidence>()

    for (const match of matches) {
      const existing = stateMap.get(match.state)
      if (!existing || confidenceScore[match.confidence] > confidenceScore[existing]) {
        stateMap.set(match.state, match.confidence)
      }
    }

    // Convert back to array and sort
    const aggregated = Array.from(stateMap.entries()).map(([state, confidence]) => ({
      state,
      confidence,
    }))

    return aggregated.sort((a, b) => {
      // First by confidence
      const confDiff = confidenceScore[b.confidence] - confidenceScore[a.confidence]
      if (confDiff !== 0) return confDiff

      // Then by state priority
      return statePriority[b.state] - statePriority[a.state]
    })
  }

  /**
   * Check if confidence meets minimum threshold
   */
  private meetsMinConfidence(confidence: LifecycleConfidence): boolean {
    const levels: Record<LifecycleConfidence, number> = {
      high: 3,
      medium: 2,
      low: 1,
    }

    return levels[confidence] >= levels[this.minConfidence]
  }

  /**
   * Build context message for detection result
   */
  private buildContext(
    best: { state: LifecycleState; confidence: LifecycleConfidence },
    matchCount: number,
    filename?: string
  ): string {
    const parts: string[] = []

    parts.push(`Detected ${best.state} state with ${best.confidence} confidence`)

    if (matchCount > 1) {
      parts.push(`(${matchCount} patterns matched)`)
    }

    if (filename) {
      parts.push(`in ${filename}`)
    }

    if (best.confidence === 'low' && this.flagLowConfidence) {
      parts.push('- FLAGGED FOR MANUAL REVIEW')
    }

    return parts.join(' ')
  }

  /**
   * Add custom detection pattern
   *
   * @param pattern Custom lifecycle pattern
   */
  addPattern(pattern: LifecyclePattern): void {
    this.patterns.push(pattern)
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): LifecyclePattern[] {
    return [...this.patterns]
  }

  /**
   * Check if low confidence detections should be flagged
   */
  shouldFlagLowConfidence(): boolean {
    return this.flagLowConfidence
  }
}

/**
 * Default lifecycle detector instance
 */
export const defaultLifecycleDetector = new LifecycleDetector()

/**
 * Convenience function for quick lifecycle detection
 *
 * @param content Document content
 * @param filename Optional filename
 * @returns Detection result or null
 */
export function detectLifecycle(
  content: string,
  filename?: string
): LifecycleDetectionResult | null {
  return defaultLifecycleDetector.detect(content, filename)
}
