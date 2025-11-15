/**
 * QualityMetrics Tests
 *
 * Tests for semantic quality monitoring and metrics tracking.
 * Following TDD: These tests are written BEFORE implementation.
 *
 * Test Coverage:
 * - Embedding quality scores
 * - Relationship consistency
 * - Orphaned content detection
 * - Search relevance tracking
 * - MaintenanceScheduler integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  QualityMetrics,
  MetricsConfig,
  QualityScore,
  ConsistencyReport,
  OrphanReport,
} from '../../../../src/semantic/maintenance/QualityMetrics'
import { MaintenanceScheduler } from '../../../../src/semantic/maintenance/MaintenanceScheduler'

// Mock storage interface
interface MockStorage {
  getAllEntities(): Promise<any[]>
  getEntityById(id: string): Promise<any | null>
  getRelationships(entityId: string): Promise<any[]>
  getEmbedding(entityId: string): Promise<number[] | null>
}

describe('QualityMetrics', () => {
  let metrics: QualityMetrics
  let mockStorage: MockStorage

  beforeEach(() => {
    mockStorage = {
      getAllEntities: vi.fn(),
      getEntityById: vi.fn(),
      getRelationships: vi.fn(),
      getEmbedding: vi.fn(),
    }

    metrics = new QualityMetrics({
      storage: mockStorage,
    })
  })

  describe('Embedding Quality Scores', () => {
    it('should calculate quality score for entity', async () => {
      const embedding = new Array(384).fill(0.5)

      mockStorage.getEmbedding = vi.fn().mockResolvedValue(embedding)

      const score = await metrics.calculateEmbeddingQuality('entity-1')

      expect(score).toHaveProperty('entityId', 'entity-1')
      expect(score).toHaveProperty('score')
      expect(score.score).toBeGreaterThanOrEqual(0)
      expect(score.score).toBeLessThanOrEqual(1)
    })

    it('should detect poor quality embeddings', async () => {
      // Zero vector = poor quality
      const poorEmbedding = new Array(384).fill(0)

      mockStorage.getEmbedding = vi.fn().mockResolvedValue(poorEmbedding)

      const score = await metrics.calculateEmbeddingQuality('entity-1')

      expect(score.score).toBeLessThan(0.3)
      expect(score.quality).toBe('poor')
    })

    it('should identify good quality embeddings', async () => {
      // Normalized vector with variation
      const goodEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(i) * 0.1)

      mockStorage.getEmbedding = vi.fn().mockResolvedValue(goodEmbedding)

      const score = await metrics.calculateEmbeddingQuality('entity-1')

      expect(score.score).toBeGreaterThan(0.5)
      expect(score.quality).toBeOneOf(['good', 'excellent'])
    })

    it('should handle missing embeddings', async () => {
      mockStorage.getEmbedding = vi.fn().mockResolvedValue(null)

      const score = await metrics.calculateEmbeddingQuality('entity-1')

      expect(score.score).toBe(0)
      expect(score.quality).toBe('missing')
    })
  })

  describe('Relationship Consistency', () => {
    it('should detect bidirectional relationship mismatches', async () => {
      // A SUPERSEDES B, but B doesn't have SUPERSEDED_BY A
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: 'A', relationships: [{ type: 'SUPERSEDES', targetId: 'B' }] },
        { id: 'B', relationships: [] }, // Missing SUPERSEDED_BY
      ])

      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        const entities: Record<string, any> = {
          'A': { id: 'A', relationships: [{ type: 'SUPERSEDES', targetId: 'B' }] },
          'B': { id: 'B', relationships: [] },
        }
        return entities[id] || null
      })

      const report = await metrics.checkRelationshipConsistency()

      expect(report.inconsistencies.length).toBeGreaterThan(0)
      expect(report.inconsistencies[0]).toHaveProperty('type', 'missing_reverse')
    })

    it('should detect dangling relationships (target does not exist)', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: 'A', relationships: [{ type: 'SUPERSEDES', targetId: 'NONEXISTENT' }] },
      ])

      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        if (id === 'A') {
          return { id: 'A', relationships: [{ type: 'SUPERSEDES', targetId: 'NONEXISTENT' }] }
        }
        return null
      })

      const report = await metrics.checkRelationshipConsistency()

      expect(report.inconsistencies.some(i => i.type === 'dangling_reference')).toBe(true)
    })

    it('should validate all entities have valid relationships', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: 'A', relationships: [{ type: 'SUPERSEDES', targetId: 'B' }] },
        { id: 'B', relationships: [{ type: 'SUPERSEDED_BY', targetId: 'A' }] },
      ])

      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        const entities: Record<string, any> = {
          'A': { id: 'A', relationships: [{ type: 'SUPERSEDES', targetId: 'B' }] },
          'B': { id: 'B', relationships: [{ type: 'SUPERSEDED_BY', targetId: 'A' }] },
        }
        return entities[id] || null
      })

      const report = await metrics.checkRelationshipConsistency()

      expect(report.inconsistencies).toHaveLength(0)
      expect(report.isConsistent).toBe(true)
    })
  })

  describe('Orphaned Content Detection', () => {
    it('should identify entities with no relationships', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: 'orphan-1', relationships: [] },
        { id: 'connected-1', relationships: [{ type: 'RELATES_TO', targetId: 'connected-2' }] },
      ])

      const report = await metrics.detectOrphanedContent()

      expect(report.orphans.length).toBeGreaterThan(0)
      expect(report.orphans[0].id).toBe('orphan-1')
    })

    it('should exclude intentionally standalone entities', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: 'root-1', properties: { isRoot: true }, relationships: [] },
      ])

      const report = await metrics.detectOrphanedContent({
        excludeRoots: true,
      })

      expect(report.orphans).toHaveLength(0)
    })

    it('should calculate orphan severity', async () => {
      const old = Date.now() - (365 * 24 * 60 * 60 * 1000) // 1 year old
      const recent = Date.now() - (10 * 24 * 60 * 60 * 1000) // 10 days old

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: 'old-orphan', relationships: [], properties: { createdAt: old } },
        { id: 'new-orphan', relationships: [], properties: { createdAt: recent } },
      ])

      const report = await metrics.detectOrphanedContent()

      const oldOrphan = report.orphans.find(o => o.id === 'old-orphan')
      const newOrphan = report.orphans.find(o => o.id === 'new-orphan')

      expect(oldOrphan?.severity).toBeGreaterThan(newOrphan?.severity!)
    })
  })

  describe('Overall Quality Score', () => {
    it('should calculate aggregate quality score', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', relationships: [{ type: 'RELATES_TO', targetId: '2' }] },
        { id: '2', relationships: [{ type: 'RELATES_TO', targetId: '1' }] },
      ])

      mockStorage.getEmbedding = vi.fn().mockResolvedValue(
        Array.from({ length: 384 }, () => Math.random() * 0.2)
      )

      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        const entities: Record<string, any> = {
          '1': { id: '1', relationships: [{ type: 'RELATES_TO', targetId: '2' }] },
          '2': { id: '2', relationships: [{ type: 'RELATES_TO', targetId: '1' }] },
        }
        return entities[id] || null
      })

      const overall = await metrics.calculateOverallQuality()

      expect(overall).toHaveProperty('embeddingQuality')
      expect(overall).toHaveProperty('relationshipQuality')
      expect(overall).toHaveProperty('orphanRatio')
      expect(overall).toHaveProperty('overallScore')
      expect(overall.overallScore).toBeGreaterThanOrEqual(0)
      expect(overall.overallScore).toBeLessThanOrEqual(1)
    })

    it('should weight different quality factors', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', relationships: [] }, // Orphan
      ])

      mockStorage.getEmbedding = vi.fn().mockResolvedValue(
        new Array(384).fill(0) // Poor embedding
      )

      mockStorage.getEntityById = vi.fn().mockResolvedValue(null)

      const overall = await metrics.calculateOverallQuality({
        weights: {
          embeddingQuality: 0.5,
          relationshipQuality: 0.3,
          orphanPenalty: 0.2,
        },
      })

      expect(overall.overallScore).toBeLessThan(0.5)
    })
  })

  describe('Metrics History', () => {
    it('should track quality metrics over time', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', relationships: [] },
      ])

      mockStorage.getEmbedding = vi.fn().mockResolvedValue(
        Array.from({ length: 384 }, () => Math.random() * 0.2)
      )

      mockStorage.getEntityById = vi.fn().mockResolvedValue(null)

      // Take multiple snapshots
      await metrics.recordSnapshot()
      await metrics.recordSnapshot()
      await metrics.recordSnapshot()

      const history = metrics.getHistory()

      expect(history.length).toBe(3)
      expect(history[0]).toHaveProperty('timestamp')
      expect(history[0]).toHaveProperty('overallScore')
    })

    it('should detect quality trends', async () => {
      // Mock improving quality over time
      let snapshotCount = 0
      mockStorage.getEmbedding = vi.fn().mockImplementation(async () => {
        snapshotCount++
        const variance = 0.02 + (snapshotCount * 0.01) // Increasing variance = improving quality
        // Create embedding with increasing variance
        return Array.from({ length: 384 }, (_, i) => 0.5 + (Math.random() - 0.5) * variance)
      })

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', relationships: [] },
      ])

      mockStorage.getEntityById = vi.fn().mockResolvedValue(null)

      await metrics.recordSnapshot()
      await metrics.recordSnapshot()
      await metrics.recordSnapshot()

      const trend = metrics.getTrend()

      expect(trend.direction).toBe('improving')
      expect(trend.change).toBeGreaterThan(0)
    })
  })

  describe('MaintenanceScheduler Integration', () => {
    it('should create quality check job', () => {
      const job = metrics.createQualityCheckJob({})

      expect(job).toHaveProperty('id')
      expect(job).toHaveProperty('name')
      expect(job).toHaveProperty('execute')
      expect(job.name).toContain('Quality Check')
    })

    it('should report metrics during job execution', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', relationships: [] },
      ])

      mockStorage.getEmbedding = vi.fn().mockResolvedValue(
        Array.from({ length: 384 }, () => 0.5)
      )

      mockStorage.getEntityById = vi.fn().mockResolvedValue(null)

      const job = metrics.createQualityCheckJob({})

      let lastProgress = 0
      const mockContext = {
        updateProgress: vi.fn((p) => { lastProgress = p }),
        isCancelled: vi.fn(() => false),
        log: vi.fn(),
      }

      const result = await job.execute(mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.updateProgress).toHaveBeenCalled()
      expect(lastProgress).toBeGreaterThan(0)
      expect(result).toHaveProperty('overallScore')
    })

    it('should respect cancellation', async () => {
      const job = metrics.createQualityCheckJob({})

      const mockContext = {
        updateProgress: vi.fn(),
        isCancelled: vi.fn(() => true),
        log: vi.fn(),
      }

      const result = await job.execute(mockContext)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('cancelled')
    })
  })

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.getAllEntities = vi.fn().mockRejectedValue(new Error('DB error'))

      const report = await metrics.detectOrphanedContent({
        continueOnError: true,
      })

      expect(report.errors).toContain('DB error')
    })

    it('should handle corrupted embeddings', async () => {
      mockStorage.getEmbedding = vi.fn().mockResolvedValue([NaN, Infinity, -Infinity])

      const score = await metrics.calculateEmbeddingQuality('entity-1')

      expect(score.quality).toBe('poor')
      expect(score.warnings).toContain('corrupted embedding')
    })
  })
})
