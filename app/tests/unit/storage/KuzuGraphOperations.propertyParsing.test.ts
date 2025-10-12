/**
 * Property Parsing Validation Tests for KuzuGraphOperations
 *
 * Tests the explicit structure validation in getEdges() property parsing.
 * These tests ensure that unexpected data structures are caught and logged.
 *
 * Task: TECH-001 - Property Parsing Validation Enhancement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuzuGraphOperations, KuzuGraphOperationsDeps } from '../../../src/storage/adapters/KuzuGraphOperations'
import { GraphEntity, KuzuStorageConfig } from '../../../src/storage/types/GraphTypes'
import { PerformanceMonitor } from '../../../src/utils/PerformanceMonitor'

describe('KuzuGraphOperations - Property Parsing Validation', () => {
  let mockDeps: KuzuGraphOperationsDeps
  let graphOps: KuzuGraphOperations
  let logWarnSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    logWarnSpy = vi.fn()

    // Create mock dependencies
    mockDeps = {
      connection: {} as any,
      secureQueryBuilder: {} as any,
      cache: new Map<string, GraphEntity>(),
      config: {
        database: ':memory:',
        debug: true // Enable debug mode to test logging
      } as KuzuStorageConfig,
      performanceMonitor: new PerformanceMonitor({ enabled: false }),
      executeSecureQuery: vi.fn(),
      buildSecureQuery: vi.fn(),
      set: vi.fn(),
      log: vi.fn(),
      logWarn: logWarnSpy
    }

    graphOps = new KuzuGraphOperations(mockDeps)
  })

  describe('Property Parsing - Standard Cases', () => {
    it('should parse properties from edge object with properties field', async () => {
      // Arrange: Standard case - parsed object has 'properties' field
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': JSON.stringify({
                properties: { weight: 1.5, label: 'test' }
              })
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({ weight: 1.5, label: 'test' })
      expect(logWarnSpy).not.toHaveBeenCalled()
    })

    it('should parse properties when r.data is already an object (not string)', async () => {
      // Arrange: r.data is object, not JSON string
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': {
                properties: { key: 'value' }
              }
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({ key: 'value' })
      expect(logWarnSpy).not.toHaveBeenCalled()
    })

    it('should handle properties object directly (no edge metadata)', async () => {
      // Arrange: parsed is the properties object directly
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': JSON.stringify({ weight: 2.0, category: 'A' })
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({ weight: 2.0, category: 'A' })
      expect(logWarnSpy).not.toHaveBeenCalled()
    })

    it('should return empty properties when r.data is empty', async () => {
      // Arrange: No r.data field
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO'
              // No r.data field
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({})
      expect(logWarnSpy).not.toHaveBeenCalled()
    })
  })

  describe('Property Parsing - Unexpected Structures (Should Log Warnings)', () => {
    it('should log warning for unexpected edge object structure with from/to/type but no properties', async () => {
      // Arrange: parsed has edge metadata fields (from, to, type) but no properties field
      // This is unexpected - should log warning
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': JSON.stringify({
                from: 'node1',
                to: 'node2',
                type: 'CONNECTS_TO'
                // No properties field - unexpected structure
              })
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({}) // Should fallback to empty object
      expect(logWarnSpy).toHaveBeenCalled()
      expect(logWarnSpy.mock.calls[0][0]).toContain('Unexpected edge data structure')
    })

    it('should log warning when properties field exists but is not an object', async () => {
      // Arrange: properties exists but is a string (unexpected)
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': JSON.stringify({
                properties: 'invalid-not-an-object' // Should be object, not string
              })
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({}) // Should fallback to empty object
      expect(logWarnSpy).toHaveBeenCalled()
      expect(logWarnSpy.mock.calls[0][0]).toContain('Unexpected edge data structure')
    })

    it('should handle null parsed value gracefully', async () => {
      // Arrange: r.data parses to null
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': 'null' // JSON.parse('null') === null
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({})
      expect(logWarnSpy).not.toHaveBeenCalled() // null is handled gracefully without warning
    })
  })

  describe('Property Parsing - Error Cases', () => {
    it('should log warning for invalid JSON in r.data', async () => {
      // Arrange: r.data contains invalid JSON
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': '{invalid-json}' // Invalid JSON
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({}) // Should fallback to empty object
      expect(logWarnSpy).toHaveBeenCalled()
      expect(logWarnSpy.mock.calls[0][0]).toContain('Could not parse edge properties')
    })

    it('should not log warnings when debug mode is disabled', async () => {
      // Arrange: Debug mode OFF
      mockDeps.config.debug = false

      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': '{invalid-json}' // Invalid JSON - would normally trigger warning
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(1)
      expect(edges[0].properties).toEqual({})
      expect(logWarnSpy).not.toHaveBeenCalled() // No warnings when debug is off
    })
  })

  describe('Property Parsing - Multiple Edges', () => {
    it('should parse properties correctly for multiple edges with mixed structures', async () => {
      // Arrange: Multiple edges with different property structures
      const mockQueryResult = {
        success: true,
        data: {
          getAll: async () => [
            {
              'a.id': 'node1',
              'b.id': 'node2',
              'r.type': 'CONNECTS_TO',
              'r.data': JSON.stringify({ properties: { weight: 1.0 } })
            },
            {
              'a.id': 'node1',
              'b.id': 'node3',
              'r.type': 'KNOWS',
              'r.data': JSON.stringify({ since: '2024' }) // Direct properties
            },
            {
              'a.id': 'node1',
              'b.id': 'node4',
              'r.type': 'LINKS_TO'
              // No r.data
            }
          ]
        }
      }

      mockDeps.buildSecureQuery = vi.fn().mockReturnValue('mock-query')
      mockDeps.executeSecureQuery = vi.fn().mockResolvedValue(mockQueryResult)

      // Act
      const edges = await graphOps.getEdges('node1')

      // Assert
      expect(edges).toHaveLength(3)
      expect(edges[0].properties).toEqual({ weight: 1.0 })
      expect(edges[1].properties).toEqual({ since: '2024' })
      expect(edges[2].properties).toEqual({})
      expect(logWarnSpy).not.toHaveBeenCalled()
    })
  })
})
