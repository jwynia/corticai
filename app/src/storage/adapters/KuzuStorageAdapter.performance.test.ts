/**
 * KuzuStorageAdapter Performance Monitoring Tests
 *
 * Tests for the performance monitoring integration in KuzuStorageAdapter.
 * These tests verify that performance metrics are properly collected and reported.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KuzuStorageAdapter } from './KuzuStorageAdapter'
import {
  GraphEntity,
  GraphNode,
  GraphEdge,
  TraversalPattern,
  KuzuStorageConfig
} from '../types/GraphTypes'
import * as fs from 'fs'
import * as path from 'path'

describe('KuzuStorageAdapter Performance Monitoring', () => {
  let adapter: KuzuStorageAdapter
  let testDbPath: string
  let config: KuzuStorageConfig
  let mockConsole: any

  beforeEach(() => {
    // Mock console to capture performance warnings
    mockConsole = {
      warn: vi.fn(),
      log: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }
    vi.stubGlobal('console', mockConsole)

    // Create unique database path for each test
    testDbPath = path.join('/tmp', `kuzu-perf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    config = {
      type: 'kuzu',
      database: testDbPath,
      id: 'perf-test-adapter',
      debug: true,
      autoCreate: true,
      performanceMonitoring: {
        enabled: true,
        slowOperationThreshold: 50, // Lower threshold for testing
        maxMetricsHistory: 100
      }
    }
  })

  afterEach(async () => {
    // Cleanup
    try {
      if (adapter) {
        await adapter.clear()
        if (typeof (adapter as any).close === 'function') {
          await (adapter as any).close()
        }
      }
    } catch (error) {
      console.debug('Cleanup error (non-critical):', error);
    }

    // Remove test database files
    try {
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true })
      }
    } catch (error) {
      console.debug('Cleanup error (non-critical):', error);
    }

    vi.restoreAllMocks()
  })

  // Helper function to create test entity
  function createTestEntity(id: string, type: string = 'TestEntity'): GraphEntity {
    return {
      id,
      type,
      properties: {
        name: `Entity ${id}`,
        value: Math.random()
      }
    }
  }

  // Helper function to create test node
  function createTestNode(id: string, type: string = 'TestNode'): GraphNode {
    return {
      id,
      type,
      properties: {
        name: `Node ${id}`,
        value: Math.random()
      }
    }
  }

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe('performance monitoring configuration', () => {
    it('should enable performance monitoring by default', () => {
      const defaultConfig: KuzuStorageConfig = {
        type: 'kuzu',
        database: testDbPath,
        autoCreate: true
      }

      adapter = new KuzuStorageAdapter(defaultConfig)
      expect(adapter.isPerformanceMonitoringEnabled()).toBe(true)
    })

    it('should respect disabled performance monitoring configuration', () => {
      const disabledConfig: KuzuStorageConfig = {
        ...config,
        performanceMonitoring: {
          enabled: false
        }
      }

      adapter = new KuzuStorageAdapter(disabledConfig)
      expect(adapter.isPerformanceMonitoringEnabled()).toBe(false)
    })

    it('should allow runtime enable/disable of performance monitoring', () => {
      adapter = new KuzuStorageAdapter(config)

      expect(adapter.isPerformanceMonitoringEnabled()).toBe(true)

      adapter.setPerformanceMonitoring(false)
      expect(adapter.isPerformanceMonitoringEnabled()).toBe(false)

      adapter.setPerformanceMonitoring(true)
      expect(adapter.isPerformanceMonitoringEnabled()).toBe(true)
    })
  })

  // ============================================================================
  // STORAGE OPERATION MONITORING TESTS
  // ============================================================================

  describe('storage operation monitoring', () => {
    beforeEach(() => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should track metrics for set operations', async () => {
      const entity = createTestEntity('test-set-1')

      await adapter.set('test-key-1', entity)

      const metrics = adapter.getOperationMetrics('storage.set')
      expect(metrics).toBeDefined()
      expect(metrics!.executionCount).toBe(1)
      expect(metrics!.averageTime).toBeGreaterThan(0)
    })

    it('should track metrics for multiple set operations', async () => {
      const entities = [
        createTestEntity('test-set-2'),
        createTestEntity('test-set-3'),
        createTestEntity('test-set-4')
      ]

      for (const entity of entities) {
        await adapter.set(`key-${entity.id}`, entity)
      }

      const metrics = adapter.getOperationMetrics('storage.set')
      expect(metrics).toBeDefined()
      expect(metrics!.executionCount).toBe(3)
      expect(metrics!.averageTime).toBeGreaterThan(0)
      expect(metrics!.maxTime).toBeGreaterThanOrEqual(metrics!.averageTime)
    })

    it('should track metrics for delete operations', async () => {
      const entity = createTestEntity('test-delete-1')

      // First set an entity
      await adapter.set('delete-key-1', entity)

      // Then delete it
      const deleted = await adapter.delete('delete-key-1')

      expect(deleted).toBe(true)

      const metrics = adapter.getOperationMetrics('storage.delete')
      expect(metrics).toBeDefined()
      expect(metrics!.executionCount).toBe(1)
      expect(metrics!.averageTime).toBeGreaterThan(0)
    })

    it('should not track metrics when monitoring is disabled', async () => {
      adapter.setPerformanceMonitoring(false)

      const entity = createTestEntity('test-disabled-1')
      await adapter.set('disabled-key-1', entity)

      const metrics = adapter.getOperationMetrics('storage.set')
      expect(metrics).toBeNull()
    })
  })

  // ============================================================================
  // GRAPH OPERATION MONITORING TESTS
  // ============================================================================

  describe('graph operation monitoring', () => {
    beforeEach(() => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should track metrics for addNode operations', async () => {
      const node = createTestNode('graph-node-1')

      await adapter.addNode(node)

      const metrics = adapter.getOperationMetrics('graph.addNode')
      expect(metrics).toBeDefined()
      expect(metrics!.executionCount).toBe(1)
      expect(metrics!.averageTime).toBeGreaterThan(0)
    })

    it('should track metrics for addEdge operations', async () => {
      // First create two nodes
      const node1 = createTestNode('edge-node-1')
      const node2 = createTestNode('edge-node-2')

      await adapter.addNode(node1)
      await adapter.addNode(node2)

      // Then create an edge between them
      const edge: GraphEdge = {
        from: node1.id,
        to: node2.id,
        type: 'test-edge',
        properties: {}
      }

      await adapter.addEdge(edge)

      const metrics = adapter.getOperationMetrics('graph.addEdge')
      expect(metrics).toBeDefined()
      expect(metrics!.executionCount).toBe(1)
      expect(metrics!.averageTime).toBeGreaterThan(0)
    })

    it('should track metrics for graph traversal operations', async () => {
      // Create a simple graph: node1 -> node2
      const node1 = createTestNode('traversal-node-1')
      const node2 = createTestNode('traversal-node-2')

      await adapter.addNode(node1)
      await adapter.addNode(node2)

      const edge: GraphEdge = {
        from: node1.id,
        to: node2.id,
        type: 'connects',
        properties: {}
      }

      await adapter.addEdge(edge)

      // Perform traversal
      const pattern: TraversalPattern = {
        startNode: node1.id,
        direction: 'outgoing',
        maxDepth: 2
      }

      await adapter.traverse(pattern)

      const metrics = adapter.getOperationMetrics('graph.traverse')
      expect(metrics).toBeDefined()
      expect(metrics!.executionCount).toBe(1)
      expect(metrics!.averageTime).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // SLOW OPERATION DETECTION TESTS
  // ============================================================================

  describe('slow operation detection', () => {
    beforeEach(() => {
      // Use a very low threshold to trigger slow operation warnings
      const slowConfig: KuzuStorageConfig = {
        ...config,
        performanceMonitoring: {
          enabled: true,
          slowOperationThreshold: 1, // 1ms threshold - almost everything will be slow
          maxMetricsHistory: 100
        }
      }
      adapter = new KuzuStorageAdapter(slowConfig)
    })

    it('should log warnings for slow set operations', async () => {
      const entity = createTestEntity('slow-set-1')

      await adapter.set('slow-key-1', entity)

      // Should have logged a slow operation warning
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Slow operation detected: storage\.set \(\d+\.\d+ms\)/),
        expect.objectContaining({
          operation: 'set',
          key: 'slow-key-1',
          entityType: 'TestEntity'
        })
      )
    })

    it('should log warnings for slow graph operations', async () => {
      const node = createTestNode('slow-graph-node-1')

      await adapter.addNode(node)

      // Should have logged slow operation warnings for both storage.set and graph.addNode
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Slow operation detected: graph\.addNode \(\d+\.\d+ms\)/),
        expect.objectContaining({
          operation: 'addNode',
          nodeId: 'slow-graph-node-1',
          nodeType: 'TestNode'
        })
      )
    })
  })

  // ============================================================================
  // METRICS RETRIEVAL TESTS
  // ============================================================================

  describe('metrics retrieval', () => {
    beforeEach(() => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should provide comprehensive metrics for all operations', async () => {
      // Perform various operations
      const entity = createTestEntity('metrics-entity-1')
      await adapter.set('metrics-key-1', entity)

      const node = createTestNode('metrics-node-1')
      await adapter.addNode(node)

      await adapter.delete('metrics-key-1')

      // Get all metrics
      const allMetrics = adapter.getPerformanceMetrics()

      expect(allMetrics).toBeDefined()
      expect(Object.keys(allMetrics)).toContain('storage.set')
      expect(Object.keys(allMetrics)).toContain('graph.addNode')
      expect(Object.keys(allMetrics)).toContain('storage.delete')

      // Verify structure of individual metrics
      const setMetrics = allMetrics['storage.set']
      expect(setMetrics).toBeDefined()
      expect(setMetrics.executionCount).toBeGreaterThan(0)
      expect(setMetrics.averageTime).toBeGreaterThan(0)
      expect(setMetrics.maxTime).toBeGreaterThan(0)
      expect(setMetrics.p95Time).toBeGreaterThan(0)
      expect(setMetrics.firstExecuted).toBeInstanceOf(Date)
      expect(setMetrics.lastExecuted).toBeInstanceOf(Date)
    })

    it('should allow clearing metrics', async () => {
      // Perform operations to generate metrics
      const entity = createTestEntity('clear-metrics-1')
      await adapter.set('clear-key-1', entity)

      // Verify metrics exist
      let metrics = adapter.getOperationMetrics('storage.set')
      expect(metrics).toBeDefined()

      // Clear specific operation metrics
      adapter.clearPerformanceMetrics('storage.set')
      metrics = adapter.getOperationMetrics('storage.set')
      expect(metrics).toBeNull()
    })

    it('should allow clearing all metrics', async () => {
      // Perform operations to generate metrics
      const entity = createTestEntity('clear-all-1')
      await adapter.set('clear-all-key-1', entity)

      const node = createTestNode('clear-all-node-1')
      await adapter.addNode(node)

      // Verify metrics exist
      let allMetrics = adapter.getPerformanceMetrics()
      expect(Object.keys(allMetrics)).toHaveLength(2) // storage.set and graph.addNode

      // Clear all metrics
      adapter.clearPerformanceMetrics()
      allMetrics = adapter.getPerformanceMetrics()
      expect(Object.keys(allMetrics)).toHaveLength(0)
    })
  })

  // ============================================================================
  // PERFORMANCE IMPACT TESTS
  // ============================================================================

  describe('performance impact', () => {
    it('should have minimal performance impact when disabled', async () => {
      const disabledConfig: KuzuStorageConfig = {
        ...config,
        performanceMonitoring: {
          enabled: false
        }
      }

      const disabledAdapter = new KuzuStorageAdapter(disabledConfig)
      const enabledAdapter = new KuzuStorageAdapter(config)

      const entity = createTestEntity('impact-test-1')

      // Time operations with monitoring disabled
      const startDisabled = performance.now()
      await disabledAdapter.set('disabled-key', entity)
      const disabledTime = performance.now() - startDisabled

      // Time operations with monitoring enabled
      const startEnabled = performance.now()
      await enabledAdapter.set('enabled-key', entity)
      const enabledTime = performance.now() - startEnabled

      // Performance monitoring should not add significant overhead
      // Allow up to 50% overhead for monitoring
      expect(enabledTime).toBeLessThan(disabledTime * 1.5)

      // Cleanup
      await disabledAdapter.clear()
      await enabledAdapter.clear()
      await (disabledAdapter as any).close()
      await (enabledAdapter as any).close()
    })
  })
})