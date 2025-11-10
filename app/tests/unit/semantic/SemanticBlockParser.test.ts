/**
 * Tests for Semantic Block Parser
 *
 * Tests parsing of ::decision{}, ::outcome{}, ::quote{} and other
 * semantic block types from markdown content.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SemanticBlockParser,
  parseSemanticBlocks,
  hasSemanticBlocks,
} from '../../../src/semantic/SemanticBlockParser'

describe('SemanticBlockParser', () => {
  let parser: SemanticBlockParser

  beforeEach(() => {
    parser = new SemanticBlockParser()
  })

  describe('Basic Block Parsing', () => {
    it('should parse a simple decision block', () => {
      const content = `
::decision{id="use-postgres"}
We decided to use PostgreSQL for our database needs.
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].type).toBe('decision')
      expect(result.blocks[0].id).toBe('use-postgres')
      expect(result.blocks[0].content).toBe(
        'We decided to use PostgreSQL for our database needs.'
      )
      expect(result.blocks[0].parentId).toBe('doc-123')
      expect(result.errors).toHaveLength(0)
    })

    it('should parse an outcome block', () => {
      const content = `
::outcome{id="tests-passing"}
All 436 tests are now passing with 100% pass rate.
::
      `.trim()

      const result = parser.parse(content, 'doc-456')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].type).toBe('outcome')
      expect(result.blocks[0].id).toBe('tests-passing')
    })

    it('should parse a quote block', () => {
      const content = `
::quote{id="architecture-principle"}
"Simplicity is the ultimate sophistication."
::
      `.trim()

      const result = parser.parse(content, 'doc-789')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].type).toBe('quote')
    })

    it('should parse a theme block', () => {
      const content = `
::theme{id="performance"}
Focus on performance optimization
::
      `.trim()

      const result = parser.parse(content, 'doc-abc')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].type).toBe('theme')
    })

    it('should parse a principle block', () => {
      const content = `
::principle{id="test-first"}
Always write tests before implementation
::
      `.trim()

      const result = parser.parse(content, 'doc-def')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].type).toBe('principle')
    })

    it('should parse an example block', () => {
      const content = `
::example{id="auth-flow"}
Here's how the authentication flow works...
::
      `.trim()

      const result = parser.parse(content, 'doc-ghi')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].type).toBe('example')
    })

    it('should parse an anti-pattern block', () => {
      const content = `
::anti-pattern{id="god-class"}
Avoid creating classes with too many responsibilities
::
      `.trim()

      const result = parser.parse(content, 'doc-jkl')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].type).toBe('anti-pattern')
    })
  })

  describe('Block Attributes', () => {
    it('should parse block with importance attribute', () => {
      const content = `
::decision{id="arch-001" importance="critical"}
This is a critical architectural decision.
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].importance).toBe('critical')
      expect(result.blocks[0].attributes.importance).toBe('critical')
    })

    it('should parse block with multiple attributes', () => {
      const content = `
::decision{id="db-choice" importance="high" category="infrastructure"}
Database selection rationale
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].attributes.id).toBe('db-choice')
      expect(result.blocks[0].attributes.importance).toBe('high')
      expect(result.blocks[0].attributes.category).toBe('infrastructure')
    })

    it('should handle importance levels', () => {
      const levels = ['critical', 'high', 'medium', 'low']

      levels.forEach(level => {
        const content = `
::decision{id="test" importance="${level}"}
Content
::
        `.trim()

        const result = parser.parse(content, 'doc-test')
        expect(result.blocks[0].importance).toBe(level)
      })
    })

    it('should handle missing importance attribute', () => {
      const content = `
::decision{id="no-importance"}
Content without importance
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].importance).toBeUndefined()
    })

    it('should handle custom attributes', () => {
      const content = `
::example{id="test" scenario="error-handling" language="typescript"}
Example code here
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].attributes.scenario).toBe('error-handling')
      expect(result.blocks[0].attributes.language).toBe('typescript')
    })
  })

  describe('Auto-generated IDs', () => {
    it('should generate ID when not provided', () => {
      const content = `
::decision{}
Decision without explicit ID
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].id).toBeDefined()
      expect(result.blocks[0].id).toMatch(/^decision-doc-123-\d+$/)
    })

    it('should generate unique IDs for multiple blocks', () => {
      const content = `
::decision{}
First decision
::

::decision{}
Second decision
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks).toHaveLength(2)
      expect(result.blocks[0].id).not.toBe(result.blocks[1].id)
    })
  })

  describe('Multi-line Content', () => {
    it('should parse multi-line block content', () => {
      const content = `
::decision{id="multi-line"}
This is a decision
that spans multiple
lines of text.
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].content).toContain('multiple')
      expect(result.blocks[0].content.split('\n').length).toBeGreaterThan(1)
    })

    it('should preserve formatting in block content', () => {
      const content = `
::example{id="code-example"}
function example() {
  return true;
}
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].content).toContain('function example()')
      expect(result.blocks[0].content).toContain('return true')
    })
  })

  describe('Multiple Blocks', () => {
    it('should parse multiple blocks in same document', () => {
      const content = `
Some text before

::decision{id="decision-1"}
First decision
::

Some text between

::outcome{id="outcome-1"}
First outcome
::

Some text after
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks).toHaveLength(2)
      expect(result.blocks[0].type).toBe('decision')
      expect(result.blocks[1].type).toBe('outcome')
    })

    it('should parse blocks of different types', () => {
      const content = `
::decision{id="d1"}
Decision
::

::outcome{id="o1"}
Outcome
::

::quote{id="q1"}
Quote
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks).toHaveLength(3)
      expect(result.blocks.map(b => b.type)).toEqual(['decision', 'outcome', 'quote'])
    })
  })

  describe('Location Tracking', () => {
    it('should track block line numbers', () => {
      const content = `Line 1
::decision{id="test"}
Line 3
::
Line 5`

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].location).toEqual([2, 4])
    })

    it('should track correct line numbers for multiple blocks', () => {
      const content = `Line 1
::decision{id="d1"}
Content
::
Line 5
Line 6
::outcome{id="o1"}
Content
::
Line 10`

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].location).toEqual([2, 4])
      expect(result.blocks[1].location).toEqual([7, 9])
    })
  })

  describe('Error Handling', () => {
    // Parser generates 2 errors for invalid block types:
    // 1. Invalid type error
    // 2. Block end without start error (since invalid block start is skipped)
    it('should detect invalid block types', () => {
      const content = `
::invalid-type{id="test"}
Content
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks).toHaveLength(0)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].message).toContain('Invalid semantic block type')
      expect(result.errors[1].message).toContain('Block end marker without matching start')
    })

    it('should detect nested blocks', () => {
      const content = `
::decision{id="outer"}
Content
::decision{id="inner"}
Nested content
::
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.errors.some(e => e.message.includes('Nested'))).toBe(true)
    })

    it('should detect unclosed blocks', () => {
      const content = `
::decision{id="unclosed"}
Content without closing marker
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.errors.some(e => e.message.includes('Unclosed'))).toBe(true)
    })

    it('should detect block end without start', () => {
      const content = `
Some content
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.errors.some(e => e.message.includes('without matching start'))).toBe(
        true
      )
    })

    it('should detect empty blocks', () => {
      const content = `
::decision{id="empty"}
::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.errors.some(e => e.message.includes('no content'))).toBe(true)
    })

    it('should include line numbers in errors', () => {
      const content = `Line 1
Line 2
::invalid{id="test"}
Content
::
`

      const result = parser.parse(content, 'doc-123')

      expect(result.errors[0].line).toBe(3)
    })
  })

  describe('Filtering Methods', () => {
    const multiBlockContent = `
::decision{id="d1" importance="critical"}
Decision 1
::

::decision{id="d2" importance="high"}
Decision 2
::

::outcome{id="o1" importance="high"}
Outcome 1
::

::quote{id="q1" importance="low"}
Quote 1
::
    `.trim()

    it('should parse only specific types', () => {
      const result = parser.parseTypes(multiBlockContent, 'doc-123', ['decision'])

      expect(result.blocks).toHaveLength(2)
      expect(result.blocks.every(b => b.type === 'decision')).toBe(true)
    })

    it('should parse multiple specific types', () => {
      const result = parser.parseTypes(multiBlockContent, 'doc-123', [
        'decision',
        'outcome',
      ])

      expect(result.blocks).toHaveLength(3)
      expect(result.blocks.every(b => b.type === 'decision' || b.type === 'outcome')).toBe(
        true
      )
    })

    it('should find block by ID', () => {
      const result = parser.parse(multiBlockContent, 'doc-123')
      const block = parser.findBlockById(result.blocks, 'd2')

      expect(block).toBeDefined()
      expect(block?.id).toBe('d2')
      expect(block?.type).toBe('decision')
    })

    it('should find blocks by type', () => {
      const result = parser.parse(multiBlockContent, 'doc-123')
      const decisions = parser.findBlocksByType(result.blocks, 'decision')

      expect(decisions).toHaveLength(2)
      expect(decisions.every(b => b.type === 'decision')).toBe(true)
    })

    it('should find blocks by importance', () => {
      const result = parser.parse(multiBlockContent, 'doc-123')
      const highImportance = parser.findBlocksByImportance(result.blocks, 'high')

      expect(highImportance).toHaveLength(2)
      expect(highImportance.every(b => b.importance === 'high')).toBe(true)
    })
  })

  describe('Detection Methods', () => {
    it('should detect presence of semantic blocks', () => {
      const content = `
Regular content
::decision{id="test"}
Decision content
::
More content
      `

      expect(parser.hasSemanticBlocks(content)).toBe(true)
    })

    it('should return false when no blocks present', () => {
      const content = 'Just regular markdown content'

      expect(parser.hasSemanticBlocks(content)).toBe(false)
    })
  })

  describe('Convenience Functions', () => {
    it('should provide convenience function for parsing', () => {
      const content = `
::decision{id="test"}
Test content
::
      `.trim()

      const result = parseSemanticBlocks(content, 'doc-123')

      expect(result.blocks).toHaveLength(1)
      expect(result.blocks[0].id).toBe('test')
    })

    it('should provide convenience function for detection', () => {
      const contentWithBlocks = '::decision{id="test"}\nContent\n::'
      const contentWithoutBlocks = 'Regular content'

      expect(hasSemanticBlocks(contentWithBlocks)).toBe(true)
      expect(hasSemanticBlocks(contentWithoutBlocks)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = parser.parse('', 'doc-123')

      expect(result.blocks).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle content with only whitespace', () => {
      const result = parser.parse('   \n  \n  ', 'doc-123')

      expect(result.blocks).toHaveLength(0)
    })

    it('should trim whitespace from block content', () => {
      const content = `
::decision{id="test"}

  Content with whitespace

::
      `.trim()

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks[0].content).toBe('Content with whitespace')
    })

    it('should handle blocks at start of document', () => {
      const content = `::decision{id="first"}
Content
::`

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle blocks at end of document', () => {
      const content = `Some content
::decision{id="last"}
Final block
::`

      const result = parser.parse(content, 'doc-123')

      expect(result.blocks).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })
  })
})
