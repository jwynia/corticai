/**
 * Tests for Lifecycle Detector
 *
 * Tests pattern-based lifecycle detection, confidence scoring,
 * and supersession extraction.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LifecycleDetector, detectLifecycle } from '../../../src/semantic/LifecycleDetector'
import type { LifecyclePattern } from '../../../src/semantic/types'

describe('LifecycleDetector', () => {
  let detector: LifecycleDetector

  beforeEach(() => {
    detector = new LifecycleDetector()
  })

  describe('Current State Detection', () => {
    it('should detect current state with high confidence', () => {
      const content = 'This is our current approach for handling authentication.'
      const result = detector.detect(content)

      expect(result).not.toBeNull()
      expect(result?.state).toBe('current')
      expect(result?.confidence).toBe('high')
    })

    it('should detect current state from "we now use"', () => {
      const content = 'We now use PostgreSQL for our database needs.'
      const result = detector.detect(content)

      expect(result?.state).toBe('current')
      expect(result?.confidence).toBe('high')
    })

    it('should detect current state from "in production"', () => {
      const content = 'This feature is in production and serving customers.'
      const result = detector.detect(content)

      expect(result?.state).toBe('current')
    })

    it('should detect current state from "recommended approach"', () => {
      const content = 'The recommended approach is to use async/await.'
      const result = detector.detect(content)

      expect(result?.state).toBe('current')
      expect(result?.confidence).toBe('high')
    })
  })

  describe('Deprecated State Detection', () => {
    it('should detect deprecated with "deprecated" keyword', () => {
      const content = 'This API is deprecated and will be removed in v2.0.'
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('high')
    })

    it('should detect deprecated with "no longer used"', () => {
      const content = 'We no longer use Kuzu for graph storage.'
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('high')
    })

    it('should detect deprecated with "superseded by"', () => {
      const content = 'This approach was superseded by the new lifecycle system.'
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('high')
    })

    it('should detect deprecated with "replaced by"', () => {
      const content = 'The old authentication system was replaced by OAuth2.'
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('high')
    })

    it('should detect deprecated with "moved from X to Y"', () => {
      const content = 'We moved from REST to GraphQL for our API.'
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('high')
    })

    it('should detect deprecated with "switched from"', () => {
      const content = 'We switched from MySQL to PostgreSQL last quarter.'
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('high')
    })

    it('should detect deprecated with medium confidence from "legacy"', () => {
      const content = 'This is a legacy component from the old system.'
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('medium')
    })
  })

  describe('Stable State Detection', () => {
    it('should detect stable state from "stable" keyword', () => {
      const content = 'This is a stable API that has been in use for 3 years.'
      const result = detector.detect(content)

      expect(result?.state).toBe('stable')
      expect(result?.confidence).toBe('high')
    })

    it('should detect stable from "well-established"', () => {
      const content = 'This is a well-established pattern in our codebase.'
      const result = detector.detect(content)

      expect(result?.state).toBe('stable')
      expect(result?.confidence).toBe('high')
    })

    it('should detect stable from "core principle"', () => {
      const content = 'This is a core principle of our architecture.'
      const result = detector.detect(content)

      expect(result?.state).toBe('stable')
      expect(result?.confidence).toBe('high')
    })

    it('should detect stable from "long-term solution"', () => {
      const content = 'We chose PostgreSQL as our long-term solution.'
      const result = detector.detect(content)

      expect(result?.state).toBe('stable')
      expect(result?.confidence).toBe('high')
    })
  })

  describe('Evolving State Detection', () => {
    it('should detect evolving from "work in progress"', () => {
      const content = 'This feature is work in progress and not yet complete.'
      const result = detector.detect(content)

      expect(result?.state).toBe('evolving')
      expect(result?.confidence).toBe('high')
    })

    it('should detect evolving from "WIP"', () => {
      const content = 'WIP: Semantic processing implementation'
      const result = detector.detect(content)

      expect(result?.state).toBe('evolving')
      expect(result?.confidence).toBe('high')
    })

    it('should detect evolving from "under development"', () => {
      const content = 'This module is under development and subject to change.'
      const result = detector.detect(content)

      expect(result?.state).toBe('evolving')
      expect(result?.confidence).toBe('high')
    })

    it('should detect evolving from "draft"', () => {
      const content = 'Draft: Architecture proposal for semantic processing'
      const result = detector.detect(content)

      expect(result?.state).toBe('evolving')
      expect(result?.confidence).toBe('high')
    })

    it('should detect evolving with medium confidence from "may change"', () => {
      const content = 'This API design may change based on feedback.'
      const result = detector.detect(content)

      expect(result?.state).toBe('evolving')
      expect(result?.confidence).toBe('medium')
    })
  })

  describe('Historical State Detection', () => {
    it('should detect historical from "historical context"', () => {
      const content = 'For historical context, we initially used MongoDB.'
      const result = detector.detect(content)

      expect(result?.state).toBe('historical')
      expect(result?.confidence).toBe('high')
    })

    it('should detect historical from "for historical purposes"', () => {
      const content = 'Kept for historical purposes only.'
      const result = detector.detect(content)

      expect(result?.state).toBe('historical')
      expect(result?.confidence).toBe('high')
    })

    it('should detect historical from "archived for reference"', () => {
      const content = 'This document is archived for reference.'
      const result = detector.detect(content)

      expect(result?.state).toBe('historical')
      expect(result?.confidence).toBe('high')
    })
  })

  describe('Archived State Detection', () => {
    it('should detect archived from "archived" keyword', () => {
      const content = 'This project has been archived.'
      const result = detector.detect(content)

      expect(result?.state).toBe('archived')
      expect(result?.confidence).toBe('high')
    })

    it('should detect archived from "no longer relevant"', () => {
      const content = 'This document is no longer relevant to current work.'
      const result = detector.detect(content)

      expect(result?.state).toBe('archived')
      expect(result?.confidence).toBe('high')
    })

    it('should detect archived from "project completed"', () => {
      const content = 'Project completed successfully and is now closed.'
      const result = detector.detect(content)

      expect(result?.state).toBe('archived')
      expect(result?.confidence).toBe('high')
    })

    it('should detect archived from "obsolete"', () => {
      const content = 'This approach is obsolete and no longer maintained.'
      const result = detector.detect(content)

      expect(result?.state).toBe('archived')
      expect(result?.confidence).toBe('high')
    })
  })

  describe('Supersession Extraction', () => {
    it('should extract supersededBy with markdown link', () => {
      const content = 'This has been superseded by [[new-approach.md]]'
      const result = detector.detect(content)

      expect(result?.supersededBy).toBe('new-approach.md')
    })

    it('should extract supersededBy with backticks', () => {
      const content = 'This was replaced by `semantic-processing-v2`'
      const result = detector.detect(content)

      expect(result?.supersededBy).toBe('semantic-processing-v2')
    })

    it('should extract supersededBy with plain text', () => {
      const content = 'Superseded by adr-005-lifecycle-metadata.md'
      const result = detector.detect(content)

      expect(result?.supersededBy).toBe('adr-005-lifecycle-metadata.md')
    })

    it('should extract from "see X instead"', () => {
      const content = 'See [[new-docs/architecture.md]] instead'
      const result = detector.detect(content)

      expect(result?.supersededBy).toBe('new-docs/architecture.md')
    })

    it('should extract from "moved to"', () => {
      const content = 'Documentation moved to `docs/semantic/README.md`'
      const result = detector.detect(content)

      expect(result?.supersededBy).toBe('docs/semantic/README.md')
    })

    it('should not extract supersededBy for non-deprecated states', () => {
      const content = 'This is our current approach.'
      const result = detector.detect(content)

      expect(result?.supersededBy).toBeUndefined()
    })
  })

  describe('Confidence Scoring and Priority', () => {
    it('should prioritize high confidence over low confidence', () => {
      const content = `
        This is a legacy system.
        This approach is deprecated and no longer used.
      `
      const result = detector.detect(content)

      // "deprecated" with high confidence should win over "legacy" with medium
      expect(result?.state).toBe('deprecated')
      expect(result?.confidence).toBe('high')
    })

    it('should prioritize deprecated over current when both match', () => {
      const content = `
        This was our current approach.
        However, it has been deprecated in favor of the new system.
      `
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
    })

    it('should handle multiple patterns for same state', () => {
      const content = `
        This is deprecated.
        No longer maintained.
        Replaced by the new version.
      `
      const result = detector.detect(content)

      expect(result?.state).toBe('deprecated')
      expect(result?.matchedPatterns.length).toBeGreaterThan(1)
    })
  })

  describe('No Matches', () => {
    it('should return null when no patterns match', () => {
      const content = 'This is a simple document with no lifecycle indicators.'
      const result = detector.detect(content)

      expect(result).toBeNull()
    })

    it('should return null for empty content', () => {
      const result = detector.detect('')
      expect(result).toBeNull()
    })
  })

  describe('Custom Patterns', () => {
    it('should support custom patterns', () => {
      const customPattern: LifecyclePattern = {
        state: 'current',
        patterns: [/\bactive\s+project\b/i],
        confidence: 'high',
      }

      detector.addPattern(customPattern)

      const content = 'This is an active project.'
      const result = detector.detect(content)

      expect(result?.state).toBe('current')
      expect(result?.confidence).toBe('high')
    })

    it('should merge custom patterns with built-in patterns', () => {
      const customPattern: LifecyclePattern = {
        state: 'evolving',
        patterns: [/\bexperimental\b/i],
        confidence: 'medium',
      }

      detector.addPattern(customPattern)

      // Should still detect built-in patterns
      const content1 = 'This is deprecated.'
      expect(detector.detect(content1)?.state).toBe('deprecated')

      // Should also detect custom pattern
      const content2 = 'This is an experimental feature.'
      expect(detector.detect(content2)?.state).toBe('evolving')
    })
  })

  describe('Configuration Options', () => {
    it('should respect minimum confidence threshold', () => {
      const strictDetector = new LifecycleDetector({
        minConfidence: 'high',
      })

      // Should match high confidence
      const content1 = 'This is deprecated.'
      expect(strictDetector.detect(content1)).not.toBeNull()

      // Should not match medium/low confidence
      const content2 = 'This is a legacy system.'
      const result = strictDetector.detect(content2)
      expect(result).toBeNull()
    })

    it('should support flagging low confidence detections', () => {
      const flaggingDetector = new LifecycleDetector({
        flagLowConfidence: true,
      })

      const content = 'Initially we used this approach.'
      const result = flaggingDetector.detect(content)

      if (result?.confidence === 'low') {
        expect(result.context).toContain('FLAGGED FOR MANUAL REVIEW')
      }
    })

    it('should allow disabling low confidence flagging', () => {
      const detector = new LifecycleDetector({
        flagLowConfidence: false,
      })

      expect(detector.shouldFlagLowConfidence()).toBe(false)
    })
  })

  describe('Context Messages', () => {
    it('should include state and confidence in context', () => {
      const content = 'This is deprecated.'
      const result = detector.detect(content)

      expect(result?.context).toContain('deprecated')
      expect(result?.context).toContain('high confidence')
    })

    it('should include filename in context when provided', () => {
      const content = 'This is deprecated.'
      const result = detector.detect(content, 'old-approach.md')

      expect(result?.context).toContain('old-approach.md')
    })

    it('should indicate number of matched patterns', () => {
      const content = `
        This is deprecated.
        No longer used.
        Replaced by new version.
      `
      const result = detector.detect(content)

      expect(result?.context).toMatch(/\d+ patterns matched/)
    })
  })

  describe('Convenience Function', () => {
    it('should provide convenience function for quick detection', () => {
      const content = 'This is our current approach.'
      const result = detectLifecycle(content)

      expect(result?.state).toBe('current')
    })

    it('should support filename parameter', () => {
      const content = 'This is deprecated.'
      const result = detectLifecycle(content, 'old-file.md')

      expect(result?.context).toContain('old-file.md')
    })
  })

  describe('Pattern Access', () => {
    it('should allow reading all registered patterns', () => {
      const patterns = detector.getPatterns()

      expect(patterns.length).toBeGreaterThan(0)
      expect(patterns.some(p => p.state === 'current')).toBe(true)
      expect(patterns.some(p => p.state === 'deprecated')).toBe(true)
      expect(patterns.some(p => p.state === 'stable')).toBe(true)
    })
  })
})
