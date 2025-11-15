/**
 * LifecycleAnalyzer Tests
 *
 * Tests for lifecycle management and content freshness tracking.
 * Following TDD: These tests are written BEFORE implementation.
 *
 * Test Coverage:
 * - Supersession chain detection
 * - Stale content identification
 * - Archival candidate suggestions
 * - Content age tracking
 * - MaintenanceScheduler integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LifecycleAnalyzer,
  AnalyzerConfig,
  SupersessionChain,
  StaleContentReport,
  ArchivalCandidate,
} from '../../../../src/semantic/maintenance/LifecycleAnalyzer'
import { MaintenanceScheduler } from '../../../../src/semantic/maintenance/MaintenanceScheduler'

// Mock entity type
interface MockEntity {
  id: string
  properties: {
    name: string
    createdAt: number
    lastModified: number
    supersededBy?: string
    supersedes?: string
  }
  lifecycle?: {
    state: 'current' | 'evolving' | 'deprecated' | 'archived'
    supersededBy?: string
  }
  relationships?: Array<{
    type: string
    targetId: string
  }>
}

// Mock storage interface
interface MockStorage {
  getEntityById(id: string): Promise<MockEntity | null>
  getAllEntities(): Promise<MockEntity[]>
  getEntitiesByState(state: string): Promise<MockEntity[]>
  updateEntityLifecycle(id: string, lifecycle: any): Promise<void>
  getRelationships(entityId: string, type: string): Promise<Array<{ targetId: string }>>
}

describe('LifecycleAnalyzer', () => {
  let analyzer: LifecycleAnalyzer
  let mockStorage: MockStorage

  beforeEach(() => {
    // Create mock storage
    mockStorage = {
      getEntityById: vi.fn(),
      getAllEntities: vi.fn(),
      getEntitiesByState: vi.fn(),
      updateEntityLifecycle: vi.fn(),
      getRelationships: vi.fn(),
    }

    analyzer = new LifecycleAnalyzer({
      storage: mockStorage,
    })
  })

  describe('Supersession Chain Detection', () => {
    it('should detect simple supersession chain', async () => {
      // Setup chain: A -> B -> C (A supersedes B, B supersedes C)
      const now = Date.now()

      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        const entities: Record<string, MockEntity> = {
          'A': {
            id: 'A',
            properties: {
              name: 'Current',
              createdAt: now,
              lastModified: now,
              supersedes: 'B',
            },
            lifecycle: { state: 'current' },
          },
          'B': {
            id: 'B',
            properties: {
              name: 'Previous',
              createdAt: now - 1000,
              lastModified: now - 1000,
              supersedes: 'C',
              supersededBy: 'A',
            },
            lifecycle: { state: 'deprecated', supersededBy: 'A' },
          },
          'C': {
            id: 'C',
            properties: {
              name: 'Oldest',
              createdAt: now - 2000,
              lastModified: now - 2000,
              supersededBy: 'B',
            },
            lifecycle: { state: 'deprecated', supersededBy: 'B' },
          },
        }
        return entities[id] || null
      })

      const chain = await analyzer.detectSupersessionChain('A')

      expect(chain.entities).toHaveLength(3)
      expect(chain.entities.map(e => e.id)).toEqual(['A', 'B', 'C'])
      expect(chain.isValid).toBe(true)
    })

    it('should detect circular supersession (invalid chain)', async () => {
      // Setup circular: A -> B -> C -> A
      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        const entities: Record<string, MockEntity> = {
          'A': { id: 'A', properties: { name: 'A', createdAt: Date.now(), lastModified: Date.now(), supersedes: 'B' }, lifecycle: { state: 'current' } },
          'B': { id: 'B', properties: { name: 'B', createdAt: Date.now(), lastModified: Date.now(), supersedes: 'C', supersededBy: 'A' }, lifecycle: { state: 'deprecated' } },
          'C': { id: 'C', properties: { name: 'C', createdAt: Date.now(), lastModified: Date.now(), supersedes: 'A', supersededBy: 'B' }, lifecycle: { state: 'deprecated' } },
        }
        return entities[id] || null
      })

      const chain = await analyzer.detectSupersessionChain('A')

      expect(chain.isValid).toBe(false)
      expect(chain.errors).toContain('circular reference detected')
    })

    it('should detect orphaned supersession references', async () => {
      // A points to B, but B doesn't exist
      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        if (id === 'A') {
          return {
            id: 'A',
            properties: { name: 'A', createdAt: Date.now(), lastModified: Date.now(), supersedes: 'B' },
            lifecycle: { state: 'current' },
          }
        }
        return null
      })

      const chain = await analyzer.detectSupersessionChain('A')

      expect(chain.isValid).toBe(false)
      expect(chain.errors).toContain('orphaned reference to B')
    })

    it('should build complete chain from any point', async () => {
      // Chain: A -> B -> C, start from B
      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        const entities: Record<string, MockEntity> = {
          'A': { id: 'A', properties: { name: 'A', createdAt: Date.now(), lastModified: Date.now(), supersedes: 'B' }, lifecycle: { state: 'current' } },
          'B': { id: 'B', properties: { name: 'B', createdAt: Date.now(), lastModified: Date.now(), supersedes: 'C', supersededBy: 'A' }, lifecycle: { state: 'deprecated', supersededBy: 'A' } },
          'C': { id: 'C', properties: { name: 'C', createdAt: Date.now(), lastModified: Date.now(), supersededBy: 'B' }, lifecycle: { state: 'deprecated', supersededBy: 'B' } },
        }
        return entities[id] || null
      })

      const chain = await analyzer.detectSupersessionChain('B')

      expect(chain.entities).toHaveLength(3)
      expect(chain.entities[0].id).toBe('A') // Should find head
    })
  })

  describe('Stale Content Identification', () => {
    it('should identify content not modified in staleness window', async () => {
      const staleDate = Date.now() - (91 * 24 * 60 * 60 * 1000) // 91 days ago

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        {
          id: 'stale-1',
          properties: { name: 'Old Doc', createdAt: staleDate, lastModified: staleDate },
          lifecycle: { state: 'current' },
        },
        {
          id: 'fresh-1',
          properties: { name: 'New Doc', createdAt: Date.now(), lastModified: Date.now() },
          lifecycle: { state: 'current' },
        },
      ])

      const report = await analyzer.identifyStaleContent({
        stalenessDays: 90,
      })

      expect(report.staleEntities).toHaveLength(1)
      expect(report.staleEntities[0].id).toBe('stale-1')
      expect(report.freshEntities).toHaveLength(1)
    })

    it('should exclude deprecated content from stale check', async () => {
      const staleDate = Date.now() - (91 * 24 * 60 * 60 * 1000)

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        {
          id: 'deprecated-1',
          properties: { name: 'Deprecated', createdAt: staleDate, lastModified: staleDate },
          lifecycle: { state: 'deprecated' },
        },
      ])

      const report = await analyzer.identifyStaleContent({
        stalenessDays: 90,
      })

      expect(report.staleEntities).toHaveLength(0) // Deprecated content doesn't count as stale
    })

    it('should calculate staleness score based on age', async () => {
      const veryOld = Date.now() - (365 * 24 * 60 * 60 * 1000) // 1 year
      const old = Date.now() - (100 * 24 * 60 * 60 * 1000) // 100 days

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        {
          id: 'very-old',
          properties: { name: 'Very Old', createdAt: veryOld, lastModified: veryOld },
          lifecycle: { state: 'current' },
        },
        {
          id: 'old',
          properties: { name: 'Old', createdAt: old, lastModified: old },
          lifecycle: { state: 'current' },
        },
      ])

      const report = await analyzer.identifyStaleContent({ stalenessDays: 90 })

      expect(report.staleEntities[0].stalenessScore).toBeGreaterThan(
        report.staleEntities[1].stalenessScore
      )
    })
  })

  describe('Archival Candidate Suggestions', () => {
    it('should suggest deprecated content for archival', async () => {
      const oldDate = Date.now() - (180 * 24 * 60 * 60 * 1000) // 6 months

      mockStorage.getEntitiesByState = vi.fn().mockResolvedValue([
        {
          id: 'deprecated-1',
          properties: { name: 'Deprecated Doc', createdAt: oldDate, lastModified: oldDate },
          lifecycle: { state: 'deprecated', supersededBy: 'current-1' },
        },
      ])

      const candidates = await analyzer.suggestArchivalCandidates({
        minDeprecationDays: 90,
      })

      expect(candidates).toHaveLength(1)
      expect(candidates[0].id).toBe('deprecated-1')
      expect(candidates[0].reason).toContain('deprecated')
    })

    it('should suggest orphaned content for archival', async () => {
      mockStorage.getEntitiesByState = vi.fn().mockResolvedValue([]) // No deprecated

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        {
          id: 'orphan-1',
          properties: { name: 'Orphaned', createdAt: Date.now(), lastModified: Date.now() },
          lifecycle: { state: 'current' },
          relationships: [],
        },
      ])

      mockStorage.getRelationships = vi.fn().mockResolvedValue([])

      const candidates = await analyzer.suggestArchivalCandidates({
        includeOrphans: true,
      })

      expect(candidates.some(c => c.id === 'orphan-1')).toBe(true)
      expect(candidates.find(c => c.id === 'orphan-1')?.reason).toContain('orphan')
    })

    it('should prioritize archival candidates by score', async () => {
      const veryOld = Date.now() - (365 * 24 * 60 * 60 * 1000)
      const old = Date.now() - (180 * 24 * 60 * 60 * 1000)

      mockStorage.getEntitiesByState = vi.fn().mockResolvedValue([
        {
          id: 'very-old',
          properties: { name: 'Very Old', createdAt: veryOld, lastModified: veryOld },
          lifecycle: { state: 'deprecated' },
        },
        {
          id: 'old',
          properties: { name: 'Old', createdAt: old, lastModified: old },
          lifecycle: { state: 'deprecated' },
        },
      ])

      const candidates = await analyzer.suggestArchivalCandidates({
        minDeprecationDays: 90,
      })

      expect(candidates[0].archivalScore).toBeGreaterThan(candidates[1].archivalScore)
    })
  })

  describe('Content Age Tracking', () => {
    it('should track content age distribution', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', properties: { name: '1', createdAt: Date.now() - (10 * 24 * 60 * 60 * 1000), lastModified: Date.now() }, lifecycle: { state: 'current' } },
        { id: '2', properties: { name: '2', createdAt: Date.now() - (60 * 24 * 60 * 60 * 1000), lastModified: Date.now() }, lifecycle: { state: 'current' } },
        { id: '3', properties: { name: '3', createdAt: Date.now() - (200 * 24 * 60 * 60 * 1000), lastModified: Date.now() }, lifecycle: { state: 'current' } },
      ])

      const ageStats = await analyzer.getContentAgeStats()

      expect(ageStats).toHaveProperty('avgAgeDays')
      expect(ageStats).toHaveProperty('distribution')
      expect(ageStats.distribution).toHaveProperty('0-30')
      expect(ageStats.distribution).toHaveProperty('31-90')
      expect(ageStats.distribution).toHaveProperty('91-180')
      expect(ageStats.distribution).toHaveProperty('181+')
    })

    it('should track modification freshness', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', properties: { name: '1', createdAt: Date.now() - (100 * 24 * 60 * 60 * 1000), lastModified: Date.now() - (5 * 24 * 60 * 60 * 1000) }, lifecycle: { state: 'current' } },
      ])

      const stats = await analyzer.getContentAgeStats()

      expect(stats.avgModificationAgeDays).toBeLessThan(10)
    })
  })

  describe('Auto-marking Stale Content', () => {
    it('should auto-mark stale content as evolving', async () => {
      const staleDate = Date.now() - (91 * 24 * 60 * 60 * 1000)

      const staleEntity = {
        id: 'stale-1',
        properties: { name: 'Stale', createdAt: staleDate, lastModified: staleDate },
        lifecycle: { state: 'current' },
      }

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([staleEntity])
      mockStorage.getEntityById = vi.fn().mockResolvedValue(staleEntity)

      await analyzer.autoMarkStaleContent({
        stalenessDays: 90,
        markAs: 'evolving',
      })

      expect(mockStorage.updateEntityLifecycle).toHaveBeenCalledWith(
        'stale-1',
        expect.objectContaining({ state: 'evolving' })
      )
    })

    it('should not auto-mark if dry-run enabled', async () => {
      const staleDate = Date.now() - (91 * 24 * 60 * 60 * 1000)

      const staleEntity = {
        id: 'stale-1',
        properties: { name: 'Stale', createdAt: staleDate, lastModified: staleDate },
        lifecycle: { state: 'current' },
      }

      mockStorage.getAllEntities = vi.fn().mockResolvedValue([staleEntity])
      mockStorage.getEntityById = vi.fn().mockResolvedValue(staleEntity)

      const result = await analyzer.autoMarkStaleContent({
        stalenessDays: 90,
        dryRun: true,
      })

      expect(mockStorage.updateEntityLifecycle).not.toHaveBeenCalled()
      expect(result.wouldMark).toHaveLength(1)
    })
  })

  describe('MaintenanceScheduler Integration', () => {
    it('should create lifecycle analysis job', () => {
      const job = analyzer.createAnalysisJob({
        stalenessDays: 90,
      })

      expect(job).toHaveProperty('id')
      expect(job).toHaveProperty('name')
      expect(job).toHaveProperty('execute')
      expect(job.name).toContain('Lifecycle Analysis')
    })

    it('should report progress during analysis', async () => {
      mockStorage.getAllEntities = vi.fn().mockResolvedValue([
        { id: '1', properties: { name: '1', createdAt: Date.now(), lastModified: Date.now() }, lifecycle: { state: 'current' } },
        { id: '2', properties: { name: '2', createdAt: Date.now(), lastModified: Date.now() }, lifecycle: { state: 'current' } },
      ])

      const job = analyzer.createAnalysisJob({ stalenessDays: 90 })

      let lastProgress = 0
      const mockContext = {
        updateProgress: vi.fn((p) => { lastProgress = p }),
        isCancelled: vi.fn(() => false),
        log: vi.fn(),
      }

      await job.execute(mockContext)

      expect(mockContext.updateProgress).toHaveBeenCalled()
      expect(lastProgress).toBeGreaterThan(0)
    })

    it('should respect cancellation', async () => {
      const job = analyzer.createAnalysisJob({})

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

  describe('Chain Validation', () => {
    it('should validate chronological order in chain', async () => {
      // Setup invalid chain: newer entity supersedes older
      mockStorage.getEntityById = vi.fn().mockImplementation(async (id) => {
        const entities: Record<string, MockEntity> = {
          'A': { id: 'A', properties: { name: 'A', createdAt: Date.now() - 1000, lastModified: Date.now(), supersedes: 'B' }, lifecycle: { state: 'current' } },
          'B': { id: 'B', properties: { name: 'B', createdAt: Date.now(), lastModified: Date.now(), supersededBy: 'A' }, lifecycle: { state: 'deprecated' } },
        }
        return entities[id] || null
      })

      const chain = await analyzer.detectSupersessionChain('A')

      expect(chain.isValid).toBe(false)
      expect(chain.errors).toContain('chronological order violated')
    })
  })

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.getAllEntities = vi.fn().mockRejectedValue(new Error('DB error'))

      const report = await analyzer.identifyStaleContent({
        stalenessDays: 90,
        continueOnError: true,
      })

      expect(report.errors).toContain('DB error')
    })

    it('should validate configuration', async () => {
      await expect(
        analyzer.identifyStaleContent({
          stalenessDays: -1,
        })
      ).rejects.toThrow('Invalid staleness days')
    })
  })
})
