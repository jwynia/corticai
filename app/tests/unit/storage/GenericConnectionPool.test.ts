/**
 * Connection Pool Tests
 *
 * Test-Driven Development: These tests are written BEFORE implementation
 * to define the expected behavior of the connection pool.
 *
 * Test Coverage:
 * - Connection acquisition and release
 * - Concurrent operations
 * - Connection limits and queueing
 * - Health checks and validation
 * - Graceful shutdown
 * - Error handling
 * - Resource cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ConnectionPool,
  ConnectionPoolConfig,
  ConnectionFactory,
  ConnectionDestroyer,
  ConnectionValidator
} from '../../../src/storage/pool/ConnectionPool'
import { GenericConnectionPool } from '../../../src/storage/pool/GenericConnectionPool'

// Mock connection type for testing
interface MockConnection {
  id: number
  isOpen: boolean
  lastUsed: number
}

describe('GenericConnectionPool', () => {
  let pool: ConnectionPool<MockConnection>
  let connectionIdCounter: number
  let createdConnections: MockConnection[]
  let destroyedConnections: MockConnection[]

  // Factory function to create mock connections
  const createConnection: ConnectionFactory<MockConnection> = vi.fn(async () => {
    const connection: MockConnection = {
      id: ++connectionIdCounter,
      isOpen: true,
      lastUsed: Date.now()
    }
    createdConnections.push(connection)
    return connection
  })

  // Destroyer function to close mock connections
  const destroyConnection: ConnectionDestroyer<MockConnection> = vi.fn(async (conn) => {
    conn.isOpen = false
    destroyedConnections.push(conn)
  })

  // Validator function to check connection health
  const validateConnection: ConnectionValidator<MockConnection> = vi.fn(async (conn) => {
    return conn.isOpen
  })

  beforeEach(() => {
    connectionIdCounter = 0
    createdConnections = []
    destroyedConnections = []
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (pool && !pool.isClosed()) {
      await pool.close(1000)
    }
  })

  describe('Initialization', () => {
    it('should create pool with valid configuration', () => {
      const config: ConnectionPoolConfig = {
        minConnections: 1,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }

      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      expect(pool).toBeDefined()
      expect(pool.isClosed()).toBe(false)
    })

    it('should initialize with zero connections', () => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }

      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      const stats = pool.getStats()
      expect(stats.totalConnections).toBe(0)
      expect(stats.activeConnections).toBe(0)
      expect(stats.idleConnections).toBe(0)
    })

    it('should reject invalid configuration (min > max)', () => {
      const config: ConnectionPoolConfig = {
        minConnections: 10,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }

      expect(() => {
        pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
      }).toThrow(/min.*max/)
    })

    it('should reject negative pool sizes', () => {
      const config: ConnectionPoolConfig = {
        minConnections: -1,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }

      expect(() => {
        pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
      }).toThrow(/negative/)
    })

    it('should reject negative timeouts', () => {
      const config: ConnectionPoolConfig = {
        minConnections: 1,
        maxConnections: 5,
        acquireTimeout: -1000,
        idleTimeout: 30000
      }

      expect(() => {
        pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
      }).toThrow(/negative/)
    })
  })

  describe('Connection Acquisition', () => {
    beforeEach(() => {
      const config: ConnectionPoolConfig = {
        minConnections: 1,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
    })

    it('should acquire a connection', async () => {
      const conn = await pool.acquire()

      expect(conn).toBeDefined()
      expect(conn.id).toBeGreaterThan(0)
      expect(conn.isOpen).toBe(true)

      const stats = pool.getStats()
      expect(stats.activeConnections).toBe(1)
      expect(stats.totalAcquired).toBe(1)
    })

    it('should create connection on first acquire', async () => {
      expect(createdConnections).toHaveLength(0)

      await pool.acquire()

      expect(createdConnections).toHaveLength(1)
      expect(createConnection).toHaveBeenCalledTimes(1)
    })

    it('should reuse released connections', async () => {
      const conn1 = await pool.acquire()
      await pool.release(conn1)

      const conn2 = await pool.acquire()

      expect(conn2.id).toBe(conn1.id) // Same connection reused
      expect(createConnection).toHaveBeenCalledTimes(1) // Only one creation
    })

    it('should create new connections up to max limit', async () => {
      const connections = await Promise.all([
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
        pool.acquire()
      ])

      expect(connections).toHaveLength(5)
      expect(createdConnections).toHaveLength(5)

      const stats = pool.getStats()
      expect(stats.activeConnections).toBe(5)
      expect(stats.totalConnections).toBe(5)
    })

    it('should wait for available connection when at max capacity', async () => {
      // Acquire all connections
      const connections = await Promise.all([
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
        pool.acquire()
      ])

      // Attempt to acquire one more (should wait)
      const acquirePromise = pool.acquire()

      // Give it a moment to start waiting
      await new Promise(resolve => setTimeout(resolve, 100))

      const stats = pool.getStats()
      expect(stats.waitingRequests).toBe(1)

      // Release a connection
      await pool.release(connections[0])

      // The waiting request should now complete
      const conn = await acquirePromise
      expect(conn).toBeDefined()
    })

    it('should timeout if no connection available within acquireTimeout', async () => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 2,
        acquireTimeout: 500, // Short timeout
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      // Acquire all connections
      await pool.acquire()
      await pool.acquire()

      // Attempt to acquire one more without releasing
      await expect(pool.acquire()).rejects.toThrow(/timeout/)

      const stats = pool.getStats()
      expect(stats.totalTimeouts).toBe(1)
    })

    it('should throw error when acquiring from closed pool', async () => {
      await pool.close()

      await expect(pool.acquire()).rejects.toThrow(/closed/)
    })
  })

  describe('Connection Release', () => {
    beforeEach(() => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
    })

    it('should release connection back to pool', async () => {
      const conn = await pool.acquire()

      const statsBefore = pool.getStats()
      expect(statsBefore.activeConnections).toBe(1)
      expect(statsBefore.idleConnections).toBe(0)

      await pool.release(conn)

      const statsAfter = pool.getStats()
      expect(statsAfter.activeConnections).toBe(0)
      expect(statsAfter.idleConnections).toBe(1)
      expect(statsAfter.totalReleased).toBe(1)
    })

    it('should allow released connection to be reacquired', async () => {
      const conn1 = await pool.acquire()
      await pool.release(conn1)

      const conn2 = await pool.acquire()

      expect(conn2.id).toBe(conn1.id)
    })

    it('should handle double release gracefully', async () => {
      const conn = await pool.acquire()

      await pool.release(conn)
      await pool.release(conn) // Second release should be ignored

      const stats = pool.getStats()
      expect(stats.idleConnections).toBe(1) // Only one idle connection
    })

    it('should destroy unhealthy connections on release', async () => {
      const conn = await pool.acquire()

      // Make connection unhealthy
      conn.isOpen = false

      await pool.release(conn)

      const stats = pool.getStats()
      expect(stats.totalConnections).toBe(0) // Connection destroyed
      expect(destroyedConnections).toContain(conn)
    })

    it('should notify waiting requests on release', async () => {
      // Fill the pool
      const conn1 = await pool.acquire()
      const conn2 = await pool.acquire()
      const conn3 = await pool.acquire()
      const conn4 = await pool.acquire()
      const conn5 = await pool.acquire()

      // Start a waiting request
      const waitingPromise = pool.acquire()

      // Give it time to start waiting
      await new Promise(resolve => setTimeout(resolve, 100))

      // Release should fulfill the waiting request
      await pool.release(conn1)

      const conn = await waitingPromise
      expect(conn).toBeDefined()
    })
  })

  describe('Concurrent Operations', () => {
    beforeEach(() => {
      const config: ConnectionPoolConfig = {
        minConnections: 2,
        maxConnections: 10,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
    })

    it('should handle concurrent acquisitions', async () => {
      const acquirePromises = Array.from({ length: 10 }, () => pool.acquire())

      const connections = await Promise.all(acquirePromises)

      expect(connections).toHaveLength(10)
      expect(new Set(connections.map(c => c.id)).size).toBe(10) // All unique

      const stats = pool.getStats()
      expect(stats.activeConnections).toBe(10)
      expect(stats.totalAcquired).toBe(10)
    })

    it('should handle concurrent releases', async () => {
      const connections = await Promise.all([
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
        pool.acquire(),
        pool.acquire()
      ])

      await Promise.all(connections.map(conn => pool.release(conn)))

      const stats = pool.getStats()
      expect(stats.activeConnections).toBe(0)
      expect(stats.idleConnections).toBe(5)
      expect(stats.totalReleased).toBe(5)
    })

    it('should handle mixed acquire and release operations', async () => {
      // Simulate realistic workload with mixed operations
      const operations: Promise<void>[] = []

      for (let i = 0; i < 20; i++) {
        operations.push(
          pool.acquire().then(async conn => {
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
            await pool.release(conn)
          })
        )
      }

      await Promise.all(operations)

      const stats = pool.getStats()
      expect(stats.activeConnections).toBe(0)
      expect(stats.totalAcquired).toBe(20)
      expect(stats.totalReleased).toBe(20)
    })

    it('should not exceed max connections under concurrent load', async () => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      // Try to acquire 20 connections concurrently (more than max)
      const operations: Promise<void>[] = []

      for (let i = 0; i < 20; i++) {
        operations.push(
          pool.acquire().then(async conn => {
            await new Promise(resolve => setTimeout(resolve, 10))
            await pool.release(conn)
          })
        )
      }

      await Promise.all(operations)

      const stats = pool.getStats()
      expect(stats.totalCreated).toBeLessThanOrEqual(5)
    })
  })

  describe('Health Checks', () => {
    beforeEach(() => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000,
        healthCheckInterval: 100 // Fast health checks for testing
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
    })

    it('should validate connections before acquisition', async () => {
      const conn1 = await pool.acquire()
      await pool.release(conn1)

      // Make connection unhealthy
      conn1.isOpen = false

      // Next acquire should detect unhealthy connection and create new one
      const conn2 = await pool.acquire()

      expect(conn2.id).not.toBe(conn1.id) // Different connection
      expect(validateConnection).toHaveBeenCalled()
      expect(destroyedConnections).toContain(conn1)
    })

    it('should remove unhealthy connections during health checks', async () => {
      const conn = await pool.acquire()
      await pool.release(conn)

      // Verify connection is in pool
      let stats = pool.getStats()
      expect(stats.idleConnections).toBe(1)

      // Make connection unhealthy
      conn.isOpen = false

      // Wait for health check to run
      await new Promise(resolve => setTimeout(resolve, 150))

      // Connection should be removed
      stats = pool.getStats()
      expect(stats.totalConnections).toBe(0)
      expect(destroyedConnections).toContain(conn)
    })

    it('should keep healthy connections during health checks', async () => {
      const conn = await pool.acquire()
      await pool.release(conn)

      const initialStats = pool.getStats()
      expect(initialStats.idleConnections).toBe(1)

      // Wait for health check to run
      await new Promise(resolve => setTimeout(resolve, 150))

      // Connection should still be there
      const stats = pool.getStats()
      expect(stats.idleConnections).toBe(1)
      expect(conn.isOpen).toBe(true)
    })
  })

  describe('Idle Timeout', () => {
    it('should close connections idle for longer than idleTimeout', async () => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 200, // 200ms idle timeout
        healthCheckInterval: 50
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      const conn = await pool.acquire()
      await pool.release(conn)

      // Verify connection is in pool
      let stats = pool.getStats()
      expect(stats.idleConnections).toBe(1)

      // Wait for idle timeout + health check
      await new Promise(resolve => setTimeout(resolve, 300))

      // Connection should be closed
      stats = pool.getStats()
      expect(stats.totalConnections).toBe(0)
      expect(destroyedConnections).toContain(conn)
    })

    it('should maintain minConnections even with idle timeout', async () => {
      const config: ConnectionPoolConfig = {
        minConnections: 2,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 200,
        healthCheckInterval: 50
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      // Create some connections
      const conn1 = await pool.acquire()
      const conn2 = await pool.acquire()
      const conn3 = await pool.acquire()

      await pool.release(conn1)
      await pool.release(conn2)
      await pool.release(conn3)

      // Wait for idle timeout
      await new Promise(resolve => setTimeout(resolve, 300))

      // Should maintain at least minConnections
      const stats = pool.getStats()
      expect(stats.totalConnections).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Graceful Shutdown', () => {
    beforeEach(() => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
    })

    it('should close all idle connections immediately', async () => {
      const conn1 = await pool.acquire()
      const conn2 = await pool.acquire()

      await pool.release(conn1)
      await pool.release(conn2)

      await pool.close()

      expect(destroyedConnections).toHaveLength(2)
      expect(pool.isClosed()).toBe(true)
    })

    it('should wait for active connections to be released', async () => {
      const conn = await pool.acquire()

      // Start close operation
      const closePromise = pool.close(1000)

      // Give it a moment
      await new Promise(resolve => setTimeout(resolve, 100))

      // Pool should be closing but not closed yet
      expect(pool.isClosed()).toBe(true)

      // Release the connection
      await pool.release(conn)

      // Close should complete
      await closePromise

      expect(destroyedConnections).toContain(conn)
    })

    it('should force close active connections after drain timeout', async () => {
      const conn = await pool.acquire()

      // Close with short timeout
      await pool.close(100)

      // Connection should be forcefully closed
      expect(destroyedConnections).toContain(conn)
      expect(pool.isClosed()).toBe(true)
    })

    it('should reject acquisitions after close', async () => {
      await pool.close()

      await expect(pool.acquire()).rejects.toThrow(/closed/)
    })

    it('should handle close on already closed pool gracefully', async () => {
      await pool.close()
      await pool.close() // Second close should not throw

      expect(pool.isClosed()).toBe(true)
    })
  })

  describe('Statistics', () => {
    beforeEach(() => {
      const config: ConnectionPoolConfig = {
        minConnections: 1,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
    })

    it('should track total connections created', async () => {
      await pool.acquire()
      await pool.acquire()
      await pool.acquire()

      const stats = pool.getStats()
      expect(stats.totalCreated).toBe(3)
    })

    it('should track total connections destroyed', async () => {
      const conn1 = await pool.acquire()
      const conn2 = await pool.acquire()

      conn1.isOpen = false
      conn2.isOpen = false

      await pool.release(conn1)
      await pool.release(conn2)

      const stats = pool.getStats()
      expect(stats.totalDestroyed).toBe(2)
    })

    it('should track acquisitions and releases', async () => {
      const conn = await pool.acquire()
      await pool.release(conn)
      await pool.acquire()

      const stats = pool.getStats()
      expect(stats.totalAcquired).toBe(2)
      expect(stats.totalReleased).toBe(1)
    })

    it('should track timeouts', async () => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 1,
        acquireTimeout: 100,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      await pool.acquire()

      try {
        await pool.acquire()
      } catch (e) {
        // Expected timeout
      }

      const stats = pool.getStats()
      expect(stats.totalTimeouts).toBe(1)
    })

    it('should track waiting requests', async () => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 2,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)

      const conn1 = await pool.acquire()
      const conn2 = await pool.acquire()

      const acquirePromise = pool.acquire()

      await new Promise(resolve => setTimeout(resolve, 100))

      const stats = pool.getStats()
      expect(stats.waitingRequests).toBe(1)

      // Cleanup - release connections to prevent timeout
      await pool.release(conn1)
      await pool.release(conn2)

      try {
        await acquirePromise
      } catch (e) {
        // May timeout
      }
    }, 10000)
  })

  describe('Error Handling', () => {
    it('should handle connection creation failures', async () => {
      const failingFactory = vi.fn(async () => {
        throw new Error('Connection failed')
      })

      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, failingFactory, destroyConnection, validateConnection)

      await expect(pool.acquire()).rejects.toThrow('Connection failed')
    })

    it('should handle connection destruction failures gracefully', async () => {
      const failingDestroyer = vi.fn(async () => {
        throw new Error('Destroy failed')
      })

      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, failingDestroyer, validateConnection)

      const conn = await pool.acquire()
      conn.isOpen = false

      // Should not throw even though destroyer fails
      await expect(pool.release(conn)).resolves.not.toThrow()
    })

    it('should handle validation failures gracefully', async () => {
      const failingValidator = vi.fn(async () => {
        throw new Error('Validation failed')
      })

      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, failingValidator)

      const conn = await pool.acquire()
      await pool.release(conn)

      // Should treat failed validation as unhealthy connection
      const conn2 = await pool.acquire()
      expect(conn2.id).not.toBe(conn.id)
    })
  })

  describe('Resource Cleanup', () => {
    beforeEach(() => {
      const config: ConnectionPoolConfig = {
        minConnections: 0,
        maxConnections: 5,
        acquireTimeout: 5000,
        idleTimeout: 30000,
        healthCheckInterval: 100
      }
      pool = new GenericConnectionPool(config, createConnection, destroyConnection, validateConnection)
    })

    it('should stop health check timer on close', async () => {
      const conn = await pool.acquire()
      await pool.release(conn)

      await pool.close()

      const validateCallsBefore = validateConnection.mock.calls.length

      // Wait to ensure health check doesn't run
      await new Promise(resolve => setTimeout(resolve, 200))

      const validateCallsAfter = validateConnection.mock.calls.length

      expect(validateCallsAfter).toBe(validateCallsBefore)
    }, 10000)

    it('should clear all internal data structures on close', async () => {
      const conn1 = await pool.acquire()
      const conn2 = await pool.acquire()

      // Release connections before closing
      await pool.release(conn1)
      await pool.release(conn2)

      await pool.close()

      const stats = pool.getStats()
      expect(stats.totalConnections).toBe(0)
      expect(stats.waitingRequests).toBe(0)
    }, 10000)
  })
})
