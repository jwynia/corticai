/**
 * Generic Connection Pool Implementation
 *
 * Provides connection pooling for any connection type with:
 * - Min/max connection limits
 * - Connection health checks
 * - Idle timeout
 * - Graceful shutdown
 * - Detailed statistics
 */

import {
  ConnectionPool,
  ConnectionPoolConfig,
  ConnectionFactory,
  ConnectionDestroyer,
  ConnectionValidator,
  PoolStats
} from './ConnectionPool'
import { Logger } from '../../utils/Logger'

/**
 * Represents a pooled connection with metadata
 */
interface PooledConnection<T> {
  connection: T
  createdAt: number
  lastUsed: number
  inUse: boolean
}

/**
 * Represents a waiting request for a connection
 */
interface WaitingRequest<T> {
  resolve: (connection: T) => void
  reject: (error: Error) => void
  timeoutId: NodeJS.Timeout
}

/**
 * Generic connection pool implementation
 *
 * Manages a pool of connections with configurable limits, health checks,
 * and automatic resource cleanup.
 */
export class GenericConnectionPool<T> implements ConnectionPool<T> {
  private readonly config: ConnectionPoolConfig
  private readonly factory: ConnectionFactory<T>
  private readonly destroyer: ConnectionDestroyer<T>
  private readonly validator: ConnectionValidator<T>
  private readonly logger: Logger

  // Connection tracking
  private connections: PooledConnection<T>[] = []
  private waitingQueue: WaitingRequest<T>[] = []

  // State management
  private closed = false
  private healthCheckTimer: NodeJS.Timeout | null = null
  private creationMutex: Promise<T | null> = Promise.resolve(null)

  // Statistics
  private stats = {
    totalCreated: 0,
    totalDestroyed: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalTimeouts: 0
  }

  constructor(
    config: ConnectionPoolConfig,
    factory: ConnectionFactory<T>,
    destroyer: ConnectionDestroyer<T>,
    validator: ConnectionValidator<T>
  ) {
    // Validate configuration
    this.validateConfig(config)

    this.config = config
    this.factory = factory
    this.destroyer = destroyer
    this.validator = validator
    this.logger = Logger.createConsoleLogger('ConnectionPool')

    // Start health check timer if configured
    if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
      this.startHealthCheck()
    }

    if (this.config.debug) {
      this.logger.info('[ConnectionPool] Initialized with config:', config)
    }
  }

  /**
   * Validate connection pool configuration
   */
  private validateConfig(config: ConnectionPoolConfig): void {
    if (config.minConnections < 0) {
      throw new Error('minConnections cannot be negative')
    }

    if (config.maxConnections < 0) {
      throw new Error('maxConnections cannot be negative')
    }

    if (config.minConnections > config.maxConnections) {
      throw new Error('minConnections cannot be greater than maxConnections')
    }

    if (config.acquireTimeout < 0) {
      throw new Error('acquireTimeout cannot be negative')
    }

    if (config.idleTimeout < 0) {
      throw new Error('idleTimeout cannot be negative')
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<T> {
    if (this.closed) {
      throw new Error('Cannot acquire connection from closed pool')
    }

    this.stats.totalAcquired++

    // Try to get an idle connection
    const idleConnection = this.getIdleConnection()
    if (idleConnection) {
      // Validate before returning
      const isHealthy = await this.isConnectionHealthy(idleConnection)
      if (isHealthy) {
        idleConnection.inUse = true
        idleConnection.lastUsed = Date.now()

        if (this.config.debug) {
          this.logger.debug('[ConnectionPool] Reusing idle connection')
        }

        return idleConnection.connection
      } else {
        // Connection unhealthy, destroy it
        await this.destroyConnection(idleConnection)
      }
    }

    // Try to create a new connection if under limit (with synchronization)
    if (this.connections.length < this.config.maxConnections) {
      // Use mutex to prevent race conditions in concurrent creation
      return await this.createConnectionWithLock()
    }

    // Wait for a connection to become available
    return this.waitForConnection()
  }

  /**
   * Create a connection with mutex locking to prevent race conditions
   */
  private async createConnectionWithLock(): Promise<T> {
    // Chain the creation promise to ensure serial execution
    this.creationMutex = this.creationMutex.then(async () => {
      // Double-check limit after acquiring lock
      if (this.connections.length >= this.config.maxConnections) {
        return null
      }

      try {
        const connection = await this.createConnection()
        if (this.config.debug) {
          this.logger.debug('[ConnectionPool] Created new connection')
        }
        return connection
      } catch (error) {
        // Reset mutex on error and propagate
        this.creationMutex = Promise.resolve(null)
        throw error
      }
    }).catch(error => {
      // Reset mutex on error to prevent deadlock
      this.creationMutex = Promise.resolve(null)
      throw error
    })

    const connection = await this.creationMutex

    // If we hit the limit, wait for an available connection instead
    if (connection === null) {
      return this.waitForConnection()
    }

    return connection
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: T): Promise<void> {
    const pooledConn = this.connections.find(pc => pc.connection === connection)

    if (!pooledConn) {
      if (this.config.debug) {
        this.logger.warn('[ConnectionPool] Attempted to release unknown connection')
      }
      return
    }

    if (!pooledConn.inUse) {
      if (this.config.debug) {
        this.logger.warn('[ConnectionPool] Attempted to release already released connection')
      }
      return
    }

    this.stats.totalReleased++
    pooledConn.inUse = false
    pooledConn.lastUsed = Date.now()

    // Check if connection is healthy
    const isHealthy = await this.isConnectionHealthy(pooledConn)
    if (!isHealthy) {
      if (this.config.debug) {
        this.logger.debug('[ConnectionPool] Released connection is unhealthy, destroying')
      }
      await this.destroyConnection(pooledConn)
      return
    }

    // Notify waiting requests
    if (this.waitingQueue.length > 0) {
      const request = this.waitingQueue.shift()
      if (request) {
        clearTimeout(request.timeoutId)
        pooledConn.inUse = true
        pooledConn.lastUsed = Date.now()

        if (this.config.debug) {
          this.logger.debug('[ConnectionPool] Fulfilling waiting request')
        }

        request.resolve(connection)
      }
    }
  }

  /**
   * Close the pool and all connections
   */
  async close(drainTimeout = 5000): Promise<void> {
    if (this.closed) {
      return
    }

    this.closed = true

    if (this.config.debug) {
      this.logger.info('[ConnectionPool] Closing pool')
    }

    // Stop health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    // Reject all waiting requests
    for (const request of this.waitingQueue) {
      clearTimeout(request.timeoutId)
      request.reject(new Error('Connection pool is closing'))
    }
    this.waitingQueue = []

    // Wait for active connections to be released (up to drainTimeout)
    const DRAIN_CHECK_INTERVAL_MS = 50 // Poll every 50ms for connection drain
    const startTime = Date.now()
    while (this.hasActiveConnections() && Date.now() - startTime < drainTimeout) {
      await new Promise(resolve => setTimeout(resolve, DRAIN_CHECK_INTERVAL_MS))
    }

    // Close all connections (idle and active)
    const closePromises = this.connections.map(conn => this.destroyConnection(conn))
    await Promise.all(closePromises)

    this.connections = []

    if (this.config.debug) {
      this.logger.info('[ConnectionPool] Pool closed')
    }
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    const activeConnections = this.connections.filter(c => c.inUse).length
    const idleConnections = this.connections.filter(c => !c.inUse).length

    return {
      totalConnections: this.connections.length,
      activeConnections,
      idleConnections,
      waitingRequests: this.waitingQueue.length,
      totalCreated: this.stats.totalCreated,
      totalDestroyed: this.stats.totalDestroyed,
      totalAcquired: this.stats.totalAcquired,
      totalReleased: this.stats.totalReleased,
      totalTimeouts: this.stats.totalTimeouts
    }
  }

  /**
   * Check if the pool is closed
   */
  isClosed(): boolean {
    return this.closed
  }

  /**
   * Get an idle connection from the pool
   */
  private getIdleConnection(): PooledConnection<T> | null {
    return this.connections.find(c => !c.inUse) || null
  }

  /**
   * Check if there are active connections
   */
  private hasActiveConnections(): boolean {
    return this.connections.some(c => c.inUse)
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<T> {
    try {
      const connection = await this.factory()

      const pooledConnection: PooledConnection<T> = {
        connection,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: true
      }

      this.connections.push(pooledConnection)
      this.stats.totalCreated++

      return connection
    } catch (error) {
      if (this.config.debug) {
        this.logger.error('[ConnectionPool] Failed to create connection', { error: String(error) })
      }
      throw error
    }
  }

  /**
   * Destroy a connection
   */
  private async destroyConnection(pooledConn: PooledConnection<T>): Promise<void> {
    try {
      await this.destroyer(pooledConn.connection)
    } catch (error) {
      if (this.config.debug) {
        this.logger.warn('[ConnectionPool] Error destroying connection', { error: String(error) })
      }
      // Continue even if destroy fails
    }

    // Remove from pool
    const index = this.connections.indexOf(pooledConn)
    if (index !== -1) {
      this.connections.splice(index, 1)
      this.stats.totalDestroyed++
    }
  }

  /**
   * Check if a connection is healthy
   */
  private async isConnectionHealthy(pooledConn: PooledConnection<T>): Promise<boolean> {
    try {
      return await this.validator(pooledConn.connection)
    } catch (error) {
      if (this.config.debug) {
        this.logger.warn('[ConnectionPool] Connection validation failed', { error: String(error) })
      }
      return false
    }
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from waiting queue
        const index = this.waitingQueue.findIndex(r => r.timeoutId === timeoutId)
        if (index !== -1) {
          this.waitingQueue.splice(index, 1)
        }

        this.stats.totalTimeouts++
        reject(new Error('Connection acquisition timeout'))
      }, this.config.acquireTimeout)

      this.waitingQueue.push({ resolve, reject, timeoutId })

      if (this.config.debug) {
        this.logger.debug(`[ConnectionPool] Request queued (${this.waitingQueue.length} waiting)`)
      }
    })
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.closed) {
        return
      }

      if (this.config.debug) {
        this.logger.debug('[ConnectionPool] Running health check')
      }

      const now = Date.now()
      const connectionsToCheck = [...this.connections]

      for (const pooledConn of connectionsToCheck) {
        // Skip active connections
        if (pooledConn.inUse) {
          continue
        }

        // Check idle timeout
        const idleDuration = now - pooledConn.lastUsed
        if (idleDuration > this.config.idleTimeout) {
          // Don't destroy if we're at minimum
          if (this.connections.length > this.config.minConnections) {
            if (this.config.debug) {
              this.logger.debug('[ConnectionPool] Destroying idle connection')
            }
            await this.destroyConnection(pooledConn)
            continue
          }
        }

        // Check health
        const isHealthy = await this.isConnectionHealthy(pooledConn)
        if (!isHealthy) {
          if (this.config.debug) {
            this.logger.debug('[ConnectionPool] Destroying unhealthy connection')
          }
          await this.destroyConnection(pooledConn)
        }
      }
    }, this.config.healthCheckInterval)
  }
}
