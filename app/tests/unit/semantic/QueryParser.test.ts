/**
 * QueryParser Tests (Stage 1 of Semantic Pipeline)
 *
 * Tests for query parsing including intent classification, negation detection,
 * and preposition extraction. These tests are written FIRST (TDD) before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { QueryParser } from '../../../src/semantic/QueryParser'
import type { ParsedQuery, QueryIntent } from '../../../src/semantic/types'

describe('QueryParser', () => {
  let parser: QueryParser

  beforeEach(() => {
    parser = new QueryParser()
  })

  describe('Intent Classification', () => {
    it('should detect "what" intent for definition queries', () => {
      const result = parser.parse('what is semantic search?')
      expect(result.intent).toBe('what')
      expect(result.original).toBe('what is semantic search?')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect "how" intent for process queries', () => {
      const result = parser.parse('how do I implement lifecycle metadata?')
      expect(result.intent).toBe('how')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect "why" intent for reasoning queries', () => {
      const result = parser.parse('why was pgvector chosen over other databases?')
      expect(result.intent).toBe('why')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect "when" intent for temporal queries', () => {
      const result = parser.parse('when should I use lifecycle lenses?')
      expect(result.intent).toBe('when')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect "where" intent for location queries', () => {
      const result = parser.parse('where is the storage adapter implemented?')
      expect(result.intent).toBe('where')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should detect "who" intent for attribution queries', () => {
      const result = parser.parse('who decided on the semantic architecture?')
      expect(result.intent).toBe('who')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should return "unknown" intent for ambiguous queries', () => {
      const result = parser.parse('semantic storage')
      expect(result.intent).toBe('unknown')
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should handle mixed intent keywords by prioritizing pattern priority', () => {
      const result = parser.parse('what is the reason why we use pgvector?')
      // Both "what is" and "why" are present, "what is" has higher priority pattern
      expect(result.intent).toBe('what')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should handle case-insensitive intent detection', () => {
      const result = parser.parse('WHAT is semantic search?')
      expect(result.intent).toBe('what')
    })
  })

  describe('Negation Detection', () => {
    it('should detect "not" negation', () => {
      const result = parser.parse('how to avoid breaking changes that are not tested')
      expect(result.hasNegation).toBe(true)
      expect(result.negatedTerms).toContain('tested')
    })

    it('should detect "don\'t" negation', () => {
      const result = parser.parse('features we don\'t want to implement')
      expect(result.hasNegation).toBe(true)
      // "don't want" = they don't want it, so "want" is negated
      expect(result.negatedTerms).toContain('want')
    })

    it('should detect "avoid" negation', () => {
      const result = parser.parse('patterns to avoid in semantic processing')
      expect(result.hasNegation).toBe(true)
      expect(result.negatedTerms).toContain('patterns')
    })

    it('should detect "never" negation', () => {
      const result = parser.parse('never use deprecated APIs')
      expect(result.hasNegation).toBe(true)
      expect(result.negatedTerms).toContain('deprecated')
    })

    it('should detect "without" negation', () => {
      const result = parser.parse('queries without embeddings')
      expect(result.hasNegation).toBe(true)
      expect(result.negatedTerms).toContain('embeddings')
    })

    it('should detect multiple negations', () => {
      const result = parser.parse('don\'t use patterns we avoid or never tested')
      expect(result.hasNegation).toBe(true)
      expect(result.negatedTerms.length).toBeGreaterThanOrEqual(2)
    })

    it('should not detect false positives for "nothing" as a term', () => {
      const result = parser.parse('nothing special about this query')
      // "nothing" is not a negation operator, it's a term
      expect(result.hasNegation).toBe(false)
    })

    it('should return empty array when no negations', () => {
      const result = parser.parse('what is semantic search?')
      expect(result.hasNegation).toBe(false)
      expect(result.negatedTerms).toEqual([])
    })
  })

  describe('Preposition Extraction', () => {
    it('should extract FROM...TO pattern', () => {
      const result = parser.parse('how to migrate from Kuzu to pgvector')
      expect(result.prepositions['from']).toBe('Kuzu')
      expect(result.prepositions['to']).toBe('pgvector')
    })

    it('should extract WITH pattern', () => {
      const result = parser.parse('queries with lifecycle metadata')
      expect(result.prepositions['with']).toBe('lifecycle metadata')
    })

    it('should extract ABOUT pattern', () => {
      const result = parser.parse('documents about semantic processing')
      expect(result.prepositions['about']).toBe('semantic processing')
    })

    it('should extract IN pattern', () => {
      const result = parser.parse('functions in the storage adapter')
      expect(result.prepositions['in']).toBe('the storage adapter')
    })

    it('should extract FOR pattern', () => {
      const result = parser.parse('patterns for error handling')
      expect(result.prepositions['for']).toBe('error handling')
    })

    it('should handle multiple prepositions', () => {
      const result = parser.parse('migrate from Kuzu to pgvector for better performance')
      expect(result.prepositions['from']).toBe('Kuzu')
      expect(result.prepositions['to']).toBe('pgvector')
      expect(result.prepositions['for']).toBe('better performance')
    })

    it('should return empty object when no prepositions', () => {
      const result = parser.parse('semantic search')
      expect(result.prepositions).toEqual({})
    })

    it('should handle capitalized prepositions', () => {
      const result = parser.parse('FROM old TO new')
      expect(result.prepositions['from']).toBe('old')
      expect(result.prepositions['to']).toBe('new')
    })
  })

  describe('Literal Term Preservation', () => {
    it('should preserve all terms as literal by default', () => {
      const result = parser.parse('semantic search lifecycle')
      expect(result.literalTerms).toContain('semantic')
      expect(result.literalTerms).toContain('search')
      expect(result.literalTerms).toContain('lifecycle')
    })

    it('should exclude stop words from literal terms', () => {
      const result = parser.parse('what is the semantic search')
      expect(result.literalTerms).not.toContain('what')
      expect(result.literalTerms).not.toContain('is')
      expect(result.literalTerms).not.toContain('the')
      expect(result.literalTerms).toContain('semantic')
      expect(result.literalTerms).toContain('search')
    })

    it('should preserve quoted strings as single literal term', () => {
      const result = parser.parse('search for "lifecycle metadata" in documents')
      expect(result.literalTerms).toContain('lifecycle metadata')
    })

    it('should preserve terms in mixed case', () => {
      const result = parser.parse('PgVector SemanticStorage')
      expect(result.literalTerms).toContain('pgvector')
      expect(result.literalTerms).toContain('semanticstorage')
    })

    it('should handle empty query gracefully', () => {
      const result = parser.parse('')
      expect(result.literalTerms).toEqual([])
      expect(result.intent).toBe('unknown')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long queries', () => {
      const longQuery = 'what is ' + 'semantic '.repeat(100) + 'processing'
      const result = parser.parse(longQuery)
      expect(result.original).toBe(longQuery)
      expect(result.intent).toBe('what')
    })

    it('should handle special characters', () => {
      const result = parser.parse('what is @semantic #search?')
      expect(result.intent).toBe('what')
      expect(result.original).toContain('@semantic')
    })

    it('should handle Unicode characters', () => {
      const result = parser.parse('¿qué es semantic search?')
      expect(result.original).toContain('¿qué')
    })

    it('should handle queries with only stop words', () => {
      const result = parser.parse('the and or but')
      expect(result.literalTerms).toEqual([])
      expect(result.intent).toBe('unknown')
    })

    it('should handle mixed punctuation', () => {
      const result = parser.parse('what is semantic-search, lifecycle_metadata?')
      expect(result.intent).toBe('what')
    })
  })

  describe('Confidence Scoring', () => {
    it('should return high confidence for clear intent keywords', () => {
      const result = parser.parse('what is semantic search?')
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should return medium confidence for implied intent', () => {
      const result = parser.parse('explain semantic search')
      // "explain" implies "what" or "how" but not explicit
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.confidence).toBeLessThan(0.9)
    })

    it('should return low confidence for ambiguous queries', () => {
      const result = parser.parse('semantic search')
      expect(result.confidence).toBeLessThan(0.5)
    })
  })

  describe('Original Query Preservation', () => {
    it('should never modify the original query string', () => {
      const original = '  What IS   semantic    search?  '
      const result = parser.parse(original)
      expect(result.original).toBe(original)
    })

    it('should preserve all whitespace and formatting', () => {
      const original = 'what\nis\nsemantic\tsearch?'
      const result = parser.parse(original)
      expect(result.original).toBe(original)
    })
  })

  describe('Performance', () => {
    it('should parse simple query in under 10ms', () => {
      const start = Date.now()
      parser.parse('what is semantic search?')
      const duration = Date.now() - start
      expect(duration).toBeLessThan(10)
    })

    it('should parse complex query in under 20ms', () => {
      const start = Date.now()
      parser.parse('how to migrate from Kuzu to pgvector without breaking changes that we don\'t want')
      const duration = Date.now() - start
      expect(duration).toBeLessThan(20)
    })
  })
})
