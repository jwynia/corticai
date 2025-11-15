/**
 * QueryParser - Stage 1 of Semantic Pipeline
 *
 * Parses user queries to extract semantic signals while preserving user specificity.
 * Key principle: NO term expansion - preserve exactly what the user asked for.
 *
 * Extracts:
 * - Intent classification (what/why/how/when/where/who)
 * - Negation detection (don't, avoid, not, never, without)
 * - Preposition extraction (FROM x TO y, WITH z, ABOUT q)
 * - Literal terms (preserved for exact matching)
 */

import type { ParsedQuery, QueryIntent } from './types'

/**
 * Stop words to exclude from literal terms
 * Common words that don't add semantic value, plus intent keywords
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
  'if', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'such', 'that',
  'the', 'their', 'then', 'there', 'these', 'they', 'this', 'to',
  'was', 'will', 'with',
  // Intent keywords (not search terms)
  'what', 'how', 'why', 'when', 'where', 'who', 'which'
])

/**
 * Intent keywords and their priorities
 * Higher priority wins in case of multiple matches
 */
const INTENT_PATTERNS: Array<{ intent: QueryIntent; pattern: RegExp; priority: number; confidence: number }> = [
  // Primary intent keywords (high confidence)
  { intent: 'what', pattern: /\bwhat\s+(is|are|was|were|does|do)\b/i, priority: 10, confidence: 0.95 },
  { intent: 'how', pattern: /\bhow\s+(do|to|can|should|does)\b/i, priority: 10, confidence: 0.95 },
  { intent: 'why', pattern: /\bwhy\s+(is|are|was|were|does|do|did|should)\b/i, priority: 10, confidence: 0.95 },
  { intent: 'when', pattern: /\bwhen\s+(is|are|was|were|does|do|did|should)\b/i, priority: 10, confidence: 0.95 },
  { intent: 'where', pattern: /\bwhere\s+(is|are|was|were|does|do|can)\b/i, priority: 10, confidence: 0.95 },
  { intent: 'who', pattern: /\bwho\s+(is|are|was|were|does|do|did)\b/i, priority: 10, confidence: 0.95 },

  // Secondary intent keywords (medium confidence)
  { intent: 'what', pattern: /\b(define|definition|describe|describe|explain)\b/i, priority: 5, confidence: 0.7 },
  { intent: 'how', pattern: /\b(implement|process|procedure|steps|guide)\b/i, priority: 5, confidence: 0.7 },
  { intent: 'why', pattern: /\b(reason|rationale|motivation|purpose)\b/i, priority: 5, confidence: 0.7 },
  { intent: 'when', pattern: /\b(timing|schedule|date|time)\b/i, priority: 5, confidence: 0.7 },
  { intent: 'where', pattern: /\b(location|place|position|file|path)\b/i, priority: 5, confidence: 0.7 },
  { intent: 'who', pattern: /\b(author|creator|developer|team)\b/i, priority: 5, confidence: 0.7 },

  // Single-word intent markers (lower confidence)
  { intent: 'what', pattern: /^\s*what\b/i, priority: 3, confidence: 0.8 },
  { intent: 'how', pattern: /^\s*how\b/i, priority: 3, confidence: 0.8 },
  { intent: 'why', pattern: /^\s*why\b/i, priority: 3, confidence: 0.8 },
  { intent: 'when', pattern: /^\s*when\b/i, priority: 3, confidence: 0.8 },
  { intent: 'where', pattern: /^\s*where\b/i, priority: 3, confidence: 0.8 },
  { intent: 'who', pattern: /^\s*who\b/i, priority: 3, confidence: 0.8 },
]

/**
 * Negation patterns to detect
 * Used to identify terms/concepts the user wants to avoid
 */
const NEGATION_PATTERNS = [
  { pattern: /\bnot\s+(\w+)/gi, operator: 'not' },
  { pattern: /\bdon'?t\s+(\w+)/gi, operator: "don't" },
  { pattern: /(\w+)\s+(?:to\s+)?avoid/gi, operator: 'avoid' },
  { pattern: /\bnever\s+(?:\w+\s+)?(\w+)/gi, operator: 'never' },
  { pattern: /\bwithout\s+(\w+)/gi, operator: 'without' },
]

/**
 * Preposition patterns to extract
 * Captures relationships between concepts in the query
 * Note: "to" pattern prioritizes context after "from" or action verbs
 */
const PREPOSITION_PATTERNS = [
  { prep: 'from', pattern: /\bfrom\s+(\w+)/i },
  // Try "FROM x TO y" first, then action verbs with "to", avoiding "how to" etc
  { prep: 'to', pattern: /\b(?:from\s+\w+\s+to|(?:migrate|move|switch|change|go)\s+(?:from\s+\w+\s+)?to)\s+(\w+)/i },
  { prep: 'with', pattern: /\bwith\s+(.+?)(?:\s+(?:in|for|and)\b|\s*$)/i },
  { prep: 'about', pattern: /\babout\s+(.+?)(?:\s+(?:in|for|and)\b|\s*$)/i },
  { prep: 'in', pattern: /\bin\s+(.+?)(?:\s+(?:for|and)\b|\s*$)/i },
  { prep: 'for', pattern: /\bfor\s+(.+?)(?:\s+and\b|\s*$)/i },
]

/**
 * QueryParser implementation
 */
export class QueryParser {
  /**
   * Parse a query string into structured ParsedQuery
   *
   * @param query - The raw query string from the user
   * @returns Parsed query with intent, negations, prepositions, and literal terms
   */
  parse(query: string): ParsedQuery {
    // Handle empty query
    if (!query || query.trim().length === 0) {
      return {
        original: query,
        intent: 'unknown',
        hasNegation: false,
        negatedTerms: [],
        prepositions: {},
        literalTerms: [],
        confidence: 0.0,
      }
    }

    // Detect intent
    const { intent, confidence } = this.detectIntent(query)

    // Detect negations
    const { hasNegation, negatedTerms } = this.detectNegations(query)

    // Extract prepositions
    const prepositions = this.extractPrepositions(query)

    // Extract literal terms (for exact matching)
    const literalTerms = this.extractLiteralTerms(query)

    return {
      original: query, // NEVER modify the original query
      intent,
      hasNegation,
      negatedTerms,
      prepositions,
      literalTerms,
      confidence,
    }
  }

  /**
   * Detect query intent
   * Returns the intent type and confidence level
   */
  private detectIntent(query: string): { intent: QueryIntent; confidence: number } {
    let bestMatch: { intent: QueryIntent; priority: number; confidence: number } | null = null

    // Try all intent patterns
    for (const { intent, pattern, priority, confidence } of INTENT_PATTERNS) {
      if (pattern.test(query)) {
        // Keep the highest priority match
        if (!bestMatch || priority > bestMatch.priority) {
          bestMatch = { intent, priority, confidence }
        }
      }
    }

    // Return best match or unknown
    if (bestMatch) {
      return { intent: bestMatch.intent, confidence: bestMatch.confidence }
    }

    return { intent: 'unknown', confidence: 0.3 }
  }

  /**
   * Detect negations in the query
   * Returns whether negations exist and the negated terms
   */
  private detectNegations(query: string): { hasNegation: boolean; negatedTerms: string[] } {
    const negatedTerms: string[] = []

    for (const { pattern } of NEGATION_PATTERNS) {
      const matches = query.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          negatedTerms.push(match[1].toLowerCase())
        }
      }
    }

    return {
      hasNegation: negatedTerms.length > 0,
      negatedTerms,
    }
  }

  /**
   * Extract prepositions and their objects
   * Returns a map of preposition -> object
   */
  private extractPrepositions(query: string): Record<string, string> {
    const prepositions: Record<string, string> = {}

    for (const { prep, pattern } of PREPOSITION_PATTERNS) {
      const match = query.match(pattern)
      if (match && match[1]) {
        prepositions[prep] = match[1].trim()
      }
    }

    return prepositions
  }

  /**
   * Extract literal terms for exact matching
   * Excludes stop words and preserves quoted strings
   */
  private extractLiteralTerms(query: string): string[] {
    // Handle quoted strings first
    const quotedStrings: string[] = []
    let queryWithoutQuotes = query.replace(/"([^"]+)"/g, (_, quoted) => {
      quotedStrings.push(quoted.toLowerCase())
      return '' // Remove from main query
    })

    // Split remaining query into words
    const words = queryWithoutQuotes
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w-]/g, '')) // Keep hyphens, remove other punctuation
      .filter(word => word.length > 0)
      .filter(word => !STOP_WORDS.has(word))

    // Combine quoted strings and words
    return [...quotedStrings, ...words]
  }
}
