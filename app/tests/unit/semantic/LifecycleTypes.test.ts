/**
 * Tests for Semantic Processing Lifecycle Types
 *
 * Tests lifecycle metadata schema, semantic blocks, and related type structures
 */

import { describe, it, expect } from 'vitest'
import type {
  LifecycleState,
  LifecycleConfidence,
  LifecycleMetadata,
  SemanticBlockType,
  BlockImportance,
  SemanticBlock,
  SemanticRelationType,
  SemanticRelationship,
  LifecycleDetectionResult,
} from '../../../src/semantic/types'

describe('Lifecycle Types', () => {
  describe('LifecycleState', () => {
    it('should accept all valid lifecycle states', () => {
      const states: LifecycleState[] = [
        'current',
        'stable',
        'evolving',
        'deprecated',
        'historical',
        'archived',
      ]

      // Type check - if this compiles, the types are valid
      states.forEach(state => {
        expect(state).toBeDefined()
      })
    })
  })

  describe('LifecycleMetadata', () => {
    it('should create valid lifecycle metadata with required fields', () => {
      const metadata: LifecycleMetadata = {
        state: 'current',
        confidence: 'high',
        manual: true,
      }

      expect(metadata.state).toBe('current')
      expect(metadata.confidence).toBe('high')
      expect(metadata.manual).toBe(true)
    })

    it('should support optional supersededBy field', () => {
      const metadata: LifecycleMetadata = {
        state: 'deprecated',
        confidence: 'high',
        manual: false,
        supersededBy: 'doc-123',
      }

      expect(metadata.supersededBy).toBe('doc-123')
    })

    it('should support optional reason field', () => {
      const metadata: LifecycleMetadata = {
        state: 'archived',
        confidence: 'high',
        manual: true,
        reason: 'Project completed and no longer relevant',
      }

      expect(metadata.reason).toBe('Project completed and no longer relevant')
    })

    it('should support timestamp and change tracking', () => {
      const now = new Date()
      const metadata: LifecycleMetadata = {
        state: 'stable',
        confidence: 'high',
        manual: true,
        stateChangedAt: now,
        stateChangedBy: 'manual',
      }

      expect(metadata.stateChangedAt).toBe(now)
      expect(metadata.stateChangedBy).toBe('manual')
    })

    it('should support automatic detection metadata', () => {
      const metadata: LifecycleMetadata = {
        state: 'deprecated',
        confidence: 'medium',
        manual: false,
        stateChangedBy: 'automatic',
      }

      expect(metadata.manual).toBe(false)
      expect(metadata.stateChangedBy).toBe('automatic')
    })
  })

  describe('SemanticBlock', () => {
    it('should create valid semantic block with required fields', () => {
      const block: SemanticBlock = {
        id: 'decision-001',
        type: 'decision',
        content: 'We decided to use PostgreSQL for storage',
        attributes: {},
        parentId: 'doc-123',
      }

      expect(block.id).toBe('decision-001')
      expect(block.type).toBe('decision')
      expect(block.content).toBe('We decided to use PostgreSQL for storage')
      expect(block.parentId).toBe('doc-123')
    })

    it('should support importance levels', () => {
      const block: SemanticBlock = {
        id: 'decision-002',
        type: 'decision',
        content: 'Critical architectural decision',
        importance: 'critical',
        attributes: {},
        parentId: 'doc-123',
      }

      expect(block.importance).toBe('critical')
    })

    it('should support location tracking', () => {
      const block: SemanticBlock = {
        id: 'outcome-001',
        type: 'outcome',
        content: 'Tests passing 100%',
        attributes: {},
        location: [45, 52],
        parentId: 'doc-456',
      }

      expect(block.location).toEqual([45, 52])
    })

    it('should support custom attributes', () => {
      const block: SemanticBlock = {
        id: 'example-001',
        type: 'example',
        content: 'Example code snippet',
        attributes: {
          language: 'typescript',
          scenario: 'error-handling',
        },
        parentId: 'doc-789',
      }

      expect(block.attributes.language).toBe('typescript')
      expect(block.attributes.scenario).toBe('error-handling')
    })

    it('should support all semantic block types', () => {
      const types: SemanticBlockType[] = [
        'decision',
        'outcome',
        'quote',
        'theme',
        'principle',
        'example',
        'anti-pattern',
      ]

      types.forEach(type => {
        const block: SemanticBlock = {
          id: `block-${type}`,
          type,
          content: `Content for ${type}`,
          attributes: {},
          parentId: 'doc-test',
        }

        expect(block.type).toBe(type)
      })
    })
  })

  describe('SemanticRelationship', () => {
    it('should create valid semantic relationship', () => {
      const relationship: SemanticRelationship = {
        type: 'SUPERSEDES',
        sourceId: 'doc-new',
        targetId: 'doc-old',
        confidence: 0.95,
        detectedBy: 'automatic',
      }

      expect(relationship.type).toBe('SUPERSEDES')
      expect(relationship.sourceId).toBe('doc-new')
      expect(relationship.targetId).toBe('doc-old')
      expect(relationship.confidence).toBe(0.95)
      expect(relationship.detectedBy).toBe('automatic')
    })

    it('should support manual relationships', () => {
      const relationship: SemanticRelationship = {
        type: 'MOTIVATES',
        sourceId: 'decision-001',
        targetId: 'outcome-002',
        confidence: 1.0,
        detectedBy: 'manual',
        context: 'User explicitly linked these documents',
      }

      expect(relationship.detectedBy).toBe('manual')
      expect(relationship.confidence).toBe(1.0)
      expect(relationship.context).toBe('User explicitly linked these documents')
    })

    it('should support all semantic relationship types', () => {
      const types: SemanticRelationType[] = [
        'SUPERSEDES',
        'SUPERSEDED_BY',
        'MOTIVATES',
        'MOTIVATED_BY',
        'CITES',
        'CONTRADICTS',
        'RELATES_TO',
        'TEMPORAL',
      ]

      types.forEach(type => {
        const relationship: SemanticRelationship = {
          type,
          sourceId: 'source',
          targetId: 'target',
          confidence: 0.8,
          detectedBy: 'inferred',
        }

        expect(relationship.type).toBe(type)
      })
    })

    it('should support timestamp tracking', () => {
      const now = new Date()
      const relationship: SemanticRelationship = {
        type: 'CITES',
        sourceId: 'doc-a',
        targetId: 'doc-b',
        confidence: 0.9,
        detectedBy: 'automatic',
        createdAt: now,
      }

      expect(relationship.createdAt).toBe(now)
    })
  })

  describe('LifecycleDetectionResult', () => {
    it('should create valid detection result', () => {
      const result: LifecycleDetectionResult = {
        state: 'deprecated',
        confidence: 'high',
        matchedPatterns: ['deprecated in favor of', 'superseded by'],
        supersededBy: 'doc-new',
        context: 'Found explicit deprecation notice',
      }

      expect(result.state).toBe('deprecated')
      expect(result.confidence).toBe('high')
      expect(result.matchedPatterns).toHaveLength(2)
      expect(result.supersededBy).toBe('doc-new')
      expect(result.context).toBe('Found explicit deprecation notice')
    })

    it('should handle low-confidence detection', () => {
      const result: LifecycleDetectionResult = {
        state: 'evolving',
        confidence: 'low',
        matchedPatterns: ['work in progress'],
      }

      expect(result.confidence).toBe('low')
      expect(result.supersededBy).toBeUndefined()
    })
  })

  describe('EntityMetadata Integration', () => {
    it('should integrate lifecycle metadata with entity metadata', () => {
      const entity = {
        id: 'doc-123',
        type: 'document' as const,
        name: 'Architecture Decision',
        content: 'We decided to use PostgreSQL',
        metadata: {
          filename: 'decision.md',
          lifecycle: {
            state: 'current' as const,
            confidence: 'high' as const,
            manual: true,
          },
          blocks: [
            {
              id: 'decision-001',
              type: 'decision',
              content: 'Use PostgreSQL',
              attributes: {},
            },
          ],
          topics: ['database', 'storage'],
          technologies: ['PostgreSQL'],
        },
      }

      expect(entity.metadata.lifecycle?.state).toBe('current')
      expect(entity.metadata.blocks).toHaveLength(1)
      expect(entity.metadata.topics).toContain('database')
      expect(entity.metadata.technologies).toContain('PostgreSQL')
    })
  })
})
