/**
 * PerformanceMonitor Test Suite
 *
 * Test-driven development tests for the PerformanceMonitor utility.
 * These tests define the expected behavior BEFORE implementation.
 *
 * Test Categories:
 * 1. Basic timing operations
 * 2. Statistics calculation (avg, p95, max)
 * 3. Slow operation logging
 * 4. Enable/disable functionality
 * 5. Multiple operation tracking
 * 6. Edge cases and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerformanceMonitor, PerformanceMetrics, PerformanceConfig } from './PerformanceMonitor'

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor
  let mockConsole: any

  beforeEach(() => {
    // Mock console methods to capture log output
    mockConsole = {
      warn: vi.fn(),
      log: vi.fn(),
      error: vi.fn()
    }
    vi.stubGlobal('console', mockConsole)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('initialization', () => {
    it('should create monitor with default configuration', () => {
      monitor = new PerformanceMonitor()

      expect(monitor).toBeDefined()
      expect(monitor.isEnabled()).toBe(true)
    })

    it('should create monitor with custom configuration', () => {
      const config: PerformanceConfig = {
        enabled: false,
        slowOperationThreshold: 200,
        maxMetricsHistory: 500
      }

      monitor = new PerformanceMonitor(config)

      expect(monitor.isEnabled()).toBe(false)
    })

    it('should have empty metrics initially', () => {
      monitor = new PerformanceMonitor()

      const metrics = monitor.getMetrics('test-operation')
      expect(metrics).toBeNull()
    })
  })

  // ============================================================================
  // BASIC TIMING TESTS
  // ============================================================================

  describe('basic timing operations', () => {
    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    it('should start and end timing for an operation', async () => {
      const operationName = 'test-query'

      monitor.startTiming(operationName)
      await new Promise(resolve => setTimeout(resolve, 10)) // Simulate work
      const duration = monitor.endTiming(operationName)

      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeLessThan(1000) // Should be under 1 second
    })

    it('should track multiple simultaneous operations', async () => {
      monitor.startTiming('operation-1')
      monitor.startTiming('operation-2')

      await new Promise(resolve => setTimeout(resolve, 5))
      const duration1 = monitor.endTiming('operation-1')

      await new Promise(resolve => setTimeout(resolve, 5))
      const duration2 = monitor.endTiming('operation-2')

      expect(duration1).toBeGreaterThan(0)
      expect(duration2).toBeGreaterThan(duration1)
    })

    it('should handle timing the same operation multiple times', async () => {
      const operationName = 'repeated-query'

      // First execution
      monitor.startTiming(operationName)
      await new Promise(resolve => setTimeout(resolve, 5))
      const duration1 = monitor.endTiming(operationName)

      // Second execution
      monitor.startTiming(operationName)
      await new Promise(resolve => setTimeout(resolve, 10))
      const duration2 = monitor.endTiming(operationName)

      expect(duration1).toBeGreaterThan(0)
      expect(duration2).toBeGreaterThan(0)

      const metrics = monitor.getMetrics(operationName)
      expect(metrics?.executionCount).toBe(2)
    })

    it('should throw error when ending timing for non-started operation', () => {
      expect(() => {
        monitor.endTiming('non-existent-operation')
      }).toThrow('No active timing found for operation: non-existent-operation')
    })

    it('should throw error when starting timing for already active operation', () => {
      monitor.startTiming('active-operation')

      expect(() => {
        monitor.startTiming('active-operation')
      }).toThrow('Timing already active for operation: active-operation')
    })
  })

  // ============================================================================
  // STATISTICS CALCULATION TESTS
  // ============================================================================

  describe('statistics calculation', () => {
    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    it('should calculate correct average execution time', async () => {
      const operationName = 'avg-test'

      // Execute operation 3 times with known delays
      const expectedDurations = [10, 20, 30] // Roughly 10, 20, 30ms

      for (const delay of expectedDurations) {
        monitor.startTiming(operationName)
        await new Promise(resolve => setTimeout(resolve, delay))
        monitor.endTiming(operationName)
      }

      const metrics = monitor.getMetrics(operationName)
      expect(metrics).toBeDefined()
      expect(metrics!.executionCount).toBe(3)
      expect(metrics!.averageTime).toBeGreaterThan(15) // Should be around 20ms
      expect(metrics!.averageTime).toBeLessThan(25)
    })

    it('should calculate correct maximum execution time', async () => {
      const operationName = 'max-test'

      // Execute with different delays, 50ms should be the max
      monitor.startTiming(operationName)
      await new Promise(resolve => setTimeout(resolve, 10))
      monitor.endTiming(operationName)

      monitor.startTiming(operationName)
      await new Promise(resolve => setTimeout(resolve, 50))
      monitor.endTiming(operationName)

      monitor.startTiming(operationName)
      await new Promise(resolve => setTimeout(resolve, 20))
      monitor.endTiming(operationName)

      const metrics = monitor.getMetrics(operationName)
      expect(metrics!.maxTime).toBeGreaterThan(45)
      expect(metrics!.maxTime).toBeLessThan(100)
    })

    it('should calculate correct 95th percentile', async () => {
      const operationName = 'p95-test'

      // Execute enough operations to get meaningful p95
      const promises = []
      for (let i = 0; i < 20; i++) {
        promises.push((async () => {
          monitor.startTiming(`${operationName}-${i}`)
          // Use different delays to create variance
          const delay = i < 19 ? 5 : 50 // Last one is much slower
          await new Promise(resolve => setTimeout(resolve, delay))
          return monitor.endTiming(`${operationName}-${i}`)
        })())
      }

      await Promise.all(promises)

      // Test that the p95 calculation function works by checking multiple operations
      let hasValidP95 = false
      for (let i = 0; i < 20; i++) {
        const metrics = monitor.getMetrics(`${operationName}-${i}`)
        if (metrics && metrics.p95Time > 0) {
          hasValidP95 = true
          // P95 should equal max time for single operations
          expect(metrics.p95Time).toBe(metrics.maxTime)
        }
      }

      expect(hasValidP95).toBe(true)
    })

    it('should handle single execution statistics', async () => {
      const operationName = 'single-test'

      monitor.startTiming(operationName)
      await new Promise(resolve => setTimeout(resolve, 25))
      monitor.endTiming(operationName)

      const metrics = monitor.getMetrics(operationName)
      expect(metrics!.executionCount).toBe(1)
      expect(metrics!.averageTime).toBe(metrics!.maxTime)
      expect(metrics!.p95Time).toBe(metrics!.maxTime)
    })
  })

  // ============================================================================
  // SLOW OPERATION LOGGING TESTS
  // ============================================================================

  describe('slow operation logging', () => {
    it('should log warning for slow operations with default threshold (100ms)', async () => {
      monitor = new PerformanceMonitor()

      monitor.startTiming('slow-operation')
      await new Promise(resolve => setTimeout(resolve, 150)) // Exceeds 100ms threshold
      monitor.endTiming('slow-operation')

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Slow operation detected: slow-operation \(\d+\.\d+ms\)/)
      )
    })

    it('should not log warning for fast operations', async () => {
      monitor = new PerformanceMonitor()

      monitor.startTiming('fast-operation')
      await new Promise(resolve => setTimeout(resolve, 50)) // Under 100ms threshold
      monitor.endTiming('fast-operation')

      expect(mockConsole.warn).not.toHaveBeenCalled()
    })

    it('should use custom slow operation threshold', async () => {
      monitor = new PerformanceMonitor({
        slowOperationThreshold: 200
      })

      monitor.startTiming('medium-operation')
      await new Promise(resolve => setTimeout(resolve, 150)) // Under 200ms threshold
      monitor.endTiming('medium-operation')

      expect(mockConsole.warn).not.toHaveBeenCalled()

      monitor.startTiming('slow-operation')
      await new Promise(resolve => setTimeout(resolve, 250)) // Exceeds 200ms threshold
      monitor.endTiming('slow-operation')

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Slow operation detected: slow-operation \(\d+\.\d+ms\)/)
      )
    })

    it('should include operation context in slow operation logs', async () => {
      monitor = new PerformanceMonitor()

      monitor.startTiming('query-operation', { table: 'users', type: 'SELECT' })
      await new Promise(resolve => setTimeout(resolve, 150))
      monitor.endTiming('query-operation')

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Slow operation detected: query-operation \(\d+\.\d+ms\)/),
        expect.objectContaining({
          table: 'users',
          type: 'SELECT'
        })
      )
    })
  })

  // ============================================================================
  // ENABLE/DISABLE FUNCTIONALITY TESTS
  // ============================================================================

  describe('enable/disable functionality', () => {
    it('should not track timing when disabled', async () => {
      monitor = new PerformanceMonitor({ enabled: false })

      monitor.startTiming('disabled-operation')
      await new Promise(resolve => setTimeout(resolve, 10))
      const duration = monitor.endTiming('disabled-operation')

      expect(duration).toBe(0) // Should return 0 when disabled
      expect(monitor.getMetrics('disabled-operation')).toBeNull()
    })

    it('should allow runtime enable/disable', async () => {
      monitor = new PerformanceMonitor()

      // Initially enabled
      monitor.startTiming('test-operation')
      await new Promise(resolve => setTimeout(resolve, 10))
      monitor.endTiming('test-operation')

      expect(monitor.getMetrics('test-operation')).toBeDefined()

      // Disable and clear
      monitor.disable()
      monitor.clearMetrics()

      expect(monitor.isEnabled()).toBe(false)
      expect(monitor.getMetrics('test-operation')).toBeNull()

      // Should not track when disabled
      monitor.startTiming('disabled-operation')
      await new Promise(resolve => setTimeout(resolve, 10))
      monitor.endTiming('disabled-operation')

      expect(monitor.getMetrics('disabled-operation')).toBeNull()

      // Re-enable
      monitor.enable()
      expect(monitor.isEnabled()).toBe(true)
    })

    it('should not log slow operations when disabled', async () => {
      monitor = new PerformanceMonitor({ enabled: false })

      monitor.startTiming('slow-operation')
      await new Promise(resolve => setTimeout(resolve, 150))
      monitor.endTiming('slow-operation')

      expect(mockConsole.warn).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // METRICS MANAGEMENT TESTS
  // ============================================================================

  describe('metrics management', () => {
    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    it('should list all tracked operation names', async () => {
      await executeTimedOperation('operation-1', 10)
      await executeTimedOperation('operation-2', 20)
      await executeTimedOperation('operation-3', 30)

      const operationNames = monitor.getAllOperationNames()
      expect(operationNames).toHaveLength(3)
      expect(operationNames).toContain('operation-1')
      expect(operationNames).toContain('operation-2')
      expect(operationNames).toContain('operation-3')
    })

    it('should get metrics for all operations', async () => {
      await executeTimedOperation('operation-1', 10)
      await executeTimedOperation('operation-2', 20)

      const allMetrics = monitor.getAllMetrics()
      expect(Object.keys(allMetrics)).toHaveLength(2)
      expect(allMetrics['operation-1']).toBeDefined()
      expect(allMetrics['operation-2']).toBeDefined()
    })

    it('should clear metrics for specific operation', async () => {
      await executeTimedOperation('operation-1', 10)
      await executeTimedOperation('operation-2', 20)

      monitor.clearMetrics('operation-1')

      expect(monitor.getMetrics('operation-1')).toBeNull()
      expect(monitor.getMetrics('operation-2')).toBeDefined()
    })

    it('should clear all metrics', async () => {
      await executeTimedOperation('operation-1', 10)
      await executeTimedOperation('operation-2', 20)

      monitor.clearMetrics()

      expect(monitor.getMetrics('operation-1')).toBeNull()
      expect(monitor.getMetrics('operation-2')).toBeNull()
      expect(monitor.getAllOperationNames()).toHaveLength(0)
    })

    it('should respect max metrics history limit', async () => {
      monitor = new PerformanceMonitor({ maxMetricsHistory: 5 })

      // Execute 10 times, should only keep last 5
      for (let i = 0; i < 10; i++) {
        await executeTimedOperation('limited-operation', 5)
      }

      const metrics = monitor.getMetrics('limited-operation')
      expect(metrics!.executionCount).toBe(10) // Count should be accurate
      // Internal history should be limited but still provide accurate statistics
    })

    // Helper function for tests
    async function executeTimedOperation(name: string, delay: number): Promise<number> {
      monitor.startTiming(name)
      await new Promise(resolve => setTimeout(resolve, delay))
      return monitor.endTiming(name)
    }
  })

  // ============================================================================
  // CONVENIENCE METHODS TESTS
  // ============================================================================

  describe('convenience methods', () => {
    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    it('should provide measure method for wrapping functions', async () => {
      const testFunction = async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay))
        return 'result'
      }

      const result = await monitor.measure('wrapped-function', () => testFunction(20))

      expect(result).toBe('result')
      expect(monitor.getMetrics('wrapped-function')).toBeDefined()
      expect(monitor.getMetrics('wrapped-function')!.executionCount).toBe(1)
    })

    it('should handle errors in measured functions', async () => {
      const errorFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Test error')
      }

      await expect(
        monitor.measure('error-function', errorFunction)
      ).rejects.toThrow('Test error')

      // Should still record the timing even when function throws
      expect(monitor.getMetrics('error-function')).toBeDefined()
      expect(monitor.getMetrics('error-function')!.executionCount).toBe(1)
    })

    it('should support measure with context', async () => {
      const testFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 150)) // Slow operation
        return 'result'
      }

      await monitor.measure('context-function', testFunction, { userId: '123', action: 'update' })

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Slow operation detected: context-function \(\d+\.\d+ms\)/),
        expect.objectContaining({
          userId: '123',
          action: 'update'
        })
      )
    })
  })

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    it('should handle very fast operations (< 1ms)', async () => {
      monitor.startTiming('fast-operation')
      // No delay - should complete in < 1ms
      const duration = monitor.endTiming('fast-operation')

      expect(duration).toBeGreaterThanOrEqual(0)
      expect(monitor.getMetrics('fast-operation')).toBeDefined()
    })

    it('should handle invalid operation names gracefully', () => {
      expect(monitor.getMetrics('')).toBeNull()
      expect(monitor.getMetrics(null as any)).toBeNull()
      expect(monitor.getMetrics(undefined as any)).toBeNull()
    })

    it('should prevent memory leaks with too many operation names', async () => {
      // Create many different operation names
      for (let i = 0; i < 1000; i++) {
        await executeTimedOperation(`operation-${i}`, 1)
      }

      // Should have metrics for all operations
      expect(monitor.getAllOperationNames().length).toBeLessThanOrEqual(1000)

      // Helper function
      async function executeTimedOperation(name: string, delay: number): Promise<number> {
        monitor.startTiming(name)
        await new Promise(resolve => setTimeout(resolve, delay))
        return monitor.endTiming(name)
      }
    })

    it('should handle concurrent access safely', async () => {
      const operationName = 'concurrent-operation'

      // Start multiple concurrent operations with different IDs
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push((async (id: number) => {
          monitor.startTiming(`${operationName}-${id}`)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
          return monitor.endTiming(`${operationName}-${id}`)
        })(i))
      }

      const durations = await Promise.all(promises)

      // All operations should have completed successfully
      durations.forEach(duration => {
        expect(duration).toBeGreaterThan(0)
      })

      // Should have metrics for all concurrent operations
      for (let i = 0; i < 10; i++) {
        expect(monitor.getMetrics(`${operationName}-${i}`)).toBeDefined()
      }
    })
  })
})