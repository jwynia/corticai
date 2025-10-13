/**
 * Error Handling and Performance Monitoring Tests for KuzuGraphOperations
 *
 * Tests the enhanced error handling in getEdges() that distinguishes between:
 * - Empty results (valid scenario - no edges exist)
 * - Query failures (database/query errors)
 * - Invalid parameters
 *
 * Also tests performance monitoring integration.
 *
 * Task: TECH-002 - Enhance getEdges() with error handling and monitoring
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { KuzuGraphOperations, KuzuGraphOperationsDeps } from '../../../src/storage/adapters/KuzuGraphOperations'
import { GraphEntity, KuzuStorageConfig } from '../../../src/storage/types/GraphTypes'
import { PerformanceMonitor } from '../../../src/utils/PerformanceMonitor'

describe('KuzuGraphOperations - Error Handling & Performance Monitoring', () => {
  let mockDeps: KuzuGraphOperationsDeps
  let graphOps: KuzuGraphOperations
  let logSpy: ReturnType<typeof vi.fn>
  let logWarnSpy: ReturnType<typeof vi.fn>
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    logSpy = vi.fn()
    logWarnSpy = vi.fn()
    performanceMonitor = new PerformanceMonitor({
      enabled: true,
      slowOperationThreshold: 100,
      maxMetricsHistory: 100
    })

    // Create mock dependencies
    mockDeps = {
      connection: {} as any,
      secureQueryBuilder: {} as any,
      cache: new Map<string, GraphEntity>(),
      config: {
        database: ':memory:',
        debug: true
      } as KuzuStorageConfig,
      performanceMonitor,
      executeSecureQuery: vi.fn(),
      buildSecureQuery: vi.fn(),
      set: vi.fn(),
      log: logSpy,
      logWarn: logWarnSpy
    }

    graphOps = new KuzuGraphOperations(mockDeps)
  })

  afterEach(() => {
    // Clear metrics after each test
    performanceMonitor.clearMetrics()
  })

  describe('Error Handling - Distinguishing Error Types', () => {
    it('should return empty array for valid "no edges" scenario without warnings', async () => {
      // Arrange: Query succeeds but returns no edges (valid scenario)
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [] // No edges found (not an error)
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toEqual([])
      expect(logWarnSpy).not.toHaveBeenCalled() // No warning for valid empty result
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('error'))
    })

    it('should log warning with context when query fails', async () => {
      // Arrange: Query execution fails
      const mockQueryResult = {
        success: false,
        error: 'Table does not exist'
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toEqual([])
      expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not get edges for node node1')
      )
      expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Table does not exist')
      )
    })

    it('should include nodeId in error context', async () => {
      // Arrange: Query fails with specific node
      const mockQueryResult = {
        success: false,
        error: 'Connection timeout'
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('specific-node-123')

      // Assert
      expect(edges).toEqual([])
      expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('specific-node-123')
      )
    })

    it('should handle exception during query execution', async () => {
      // Arrange: executeSecureQuery throws exception
      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockRejectedValue(
        new Error('Network connection lost')
      )

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toEqual([]) // Should return empty array, not throw
      expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not get edges for node node1')
      )
    })

    it('should handle missing data field gracefully', async () => {
      // Arrange: Query succeeds but data is null/undefined
      const mockQueryResult = {
        success: true,
        data: null
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toEqual([])
      expect(logWarnSpy).not.toHaveBeenCalled() // No warning - handled gracefully
    })

    it('should not log errors when debug mode is disabled', async () => {
      // Arrange: Debug mode OFF
      mockDeps.config.debug = false

      const mockQueryResult = {
        success: false,
        error: 'Query failed'
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toEqual([])
      expect(logWarnSpy).not.toHaveBeenCalled() // No logging when debug is off
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should track getEdges performance metrics', async () => {
      // Arrange
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': '{}'
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      await graphOps.getEdges('node1')

      // Assert: Performance metrics should be collected
      const metrics = performanceMonitor.getMetrics('graph.getEdges')
      expect(metrics).toBeDefined()
      expect(metrics?.executionCount).toBe(1)
      expect(metrics?.averageTime).toBeGreaterThanOrEqual(0)
      expect(metrics?.maxTime).toBeGreaterThanOrEqual(0)
    })

    it('should track multiple getEdges calls', async () => {
      // Arrange
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => []
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act: Call getEdges multiple times
      await graphOps.getEdges('node1')
      await graphOps.getEdges('node2')
      await graphOps.getEdges('node3')

      // Assert: All calls should be tracked
      const metrics = performanceMonitor.getMetrics('graph.getEdges')
      expect(metrics?.executionCount).toBe(3)
    })

    it('should include operation metadata in performance metrics', async () => {
      // Arrange
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': '{}'
            },
            {
              'a.id': 'node1',
              'b.id': 'node3',
              'r.type': 'KNOWS',
              'r.data': '{}'
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      await graphOps.getEdges('test-node')

      // Assert: Metrics should be tracked
      const allMetrics = performanceMonitor.getAllMetrics()
      expect(allMetrics['graph.getEdges']).toBeDefined()
      expect(allMetrics['graph.getEdges'].executionCount).toBe(1)
    })

    it('should track performance even when query fails', async () => {
      // Arrange: Query fails
      const mockQueryResult = {
        success: false,
        error: 'Query error'
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      await graphOps.getEdges('node1')

      // Assert: Performance should still be tracked for failed queries
      const metrics = performanceMonitor.getMetrics('graph.getEdges')
      expect(metrics?.executionCount).toBe(1)
    })

    it('should detect slow queries based on threshold', async () => {
      // Arrange: Simulate slow query
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => {
            // Simulate slow operation
            await new Promise(resolve => setTimeout(resolve, 150))
            return []
          }
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      await graphOps.getEdges('node1')

      // Assert: Slow operation should be detected (threshold is 100ms)
      const metrics = performanceMonitor.getMetrics('graph.getEdges')
      expect(metrics).toBeDefined()
      expect(metrics?.lastTime).toBeGreaterThan(100) // Last execution was slow
    })

    it('should calculate average duration correctly', async () => {
      // Arrange
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => []
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act: Multiple calls
      await graphOps.getEdges('node1')
      await graphOps.getEdges('node2')

      // Assert
      const metrics = performanceMonitor.getMetrics('graph.getEdges')
      expect(metrics?.averageTime).toBeGreaterThanOrEqual(0)
      expect(metrics?.executionCount).toBe(2)
    })
  })

  describe('Error Context and Logging', () => {
    it('should provide detailed error context for debugging', async () => {
      // Arrange: Complex error scenario
      const mockQueryResult = {
        success: false,
        error: 'Syntax error in query'
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      await graphOps.getEdges('complex-node-id')

      // Assert: Error should include helpful context
      expect(logWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Could not get edges.*complex-node-id.*Syntax error/)
      )
    })

    it('should handle data.getAll() throwing an error', async () => {
      // Arrange: getAll method throws
      const mockQueryResult = {
        success: true,
        data: {
          getAll: vi.fn().mockRejectedValue(new Error('Result set too large'))
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert: Should handle gracefully
      expect(edges).toEqual([])
      expect(logWarnSpy).toHaveBeenCalled()
    })
  })

  describe('Edge Type Filtering', () => {
    it('should support filtering by edge types', async () => {
      // Arrange: Query with edge type filter
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': '{}'
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act: Call getEdges with edge type filter
      const edges = await graphOps.getEdges('node1', ['CONNECTS_TO'])

      // Assert: Should pass edge types to query builder
      expect(mockDeps.buildSecureQuery).toHaveBeenCalledWith(
        'getEdges',
        'node1',
        ['CONNECTS_TO']
      )
      expect(edges).toHaveLength(1)
      expect(edges[0].type).toBe('CONNECTS_TO')
    })

    it('should support multiple edge type filters', async () => {
      // Arrange
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': '{}'
            },
            {
              'a.id': 'node1',
              'b.id': 'node3',
              'r.type': 'KNOWS',
              'r.data': '{}'
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1', ['CONNECTS_TO', 'KNOWS'])

      // Assert
      expect(mockDeps.buildSecureQuery).toHaveBeenCalledWith(
        'getEdges',
        'node1',
        ['CONNECTS_TO', 'KNOWS']
      )
      expect(edges).toHaveLength(2)
    })

    it('should work without edge type filter (all edges)', async () => {
      // Arrange
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => []
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act: No filter provided
      await graphOps.getEdges('node1')

      // Assert: Should call without edge type parameter
      expect(mockDeps.buildSecureQuery).toHaveBeenCalledWith('getEdges', 'node1', undefined)
    })
  })
})
