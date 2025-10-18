/**
 * Connection Pool Interface and Types
 *
 * Provides generic connection pooling for database adapters to improve
 * performance under concurrent load by reusing connections.
 */

/**
 * Configuration for connection pool
 */
export interface ConnectionPoolConfig {
  /** Minimum number of connections to maintain in the pool */
  minConnections: number

  /** Maximum number of connections allowed in the pool */
  maxConnections: number

  /** Maximum time (ms) to wait for an available connection */
  acquireTimeout: number

  /** Time (ms) before an idle connection is closed */
  idleTimeout: number

  /** Interval (ms) between connection health checks */
  healthCheckInterval?: number

  /** Enable debug logging */
  debug?: boolean
}

/**
 * Statistics about the connection pool
 */
export interface PoolStats {
  /** Total number of connections (active + idle) */
  totalConnections: number

  /** Number of connections currently in use */
  activeConnections: number

  /** Number of idle connections available for use */
  idleConnections: number

  /** Number of requests waiting for a connection */
  waitingRequests: number

  /** Total connections created since pool initialization */
  totalCreated: number

  /** Total connections destroyed since pool initialization */
  totalDestroyed: number

  /** Total successful connection acquisitions */
  totalAcquired: number

  /** Total connection releases */
  totalReleased: number

  /** Total acquisition timeouts */
  totalTimeouts: number
}

/**
 * Generic Connection Pool interface
 *
 * Provides connection pooling capabilities for any connection type.
 * Implementations should handle connection lifecycle, health checks,
 * and resource cleanup.
 *
 * @template T The connection type
 */
export interface ConnectionPool<T> {
  /**
   * Acquire a connection from the pool
   *
   * Waits for an available connection up to the configured acquireTimeout.
   * If no connection is available within the timeout, throws an error.
   *
   * @returns Promise resolving to a pooled connection
   * @throws Error if acquisition times out or pool is closed
   */
  acquire(): Promise<T>

  /**
   * Release a connection back to the pool
   *
   * Returns the connection to the pool for reuse. If the connection
   * is unhealthy or the pool is at capacity, the connection may be closed.
   *
   * @param connection The connection to release
   * @returns Promise that resolves when the connection is released
   */
  release(connection: T): Promise<void>

  /**
   * Close the connection pool and all connections
   *
   * Prevents new connections from being acquired and closes all
   * existing connections gracefully. Waits for active connections
   * to be released before closing them.
   *
   * @param drainTimeout Maximum time (ms) to wait for active connections to drain
   * @returns Promise that resolves when all connections are closed
   */
  close(drainTimeout?: number): Promise<void>

  /**
   * Get current pool statistics
   *
   * @returns Current pool statistics
   */
  getStats(): PoolStats

  /**
   * Check if the pool is closed
   *
   * @returns true if the pool is closed, false otherwise
   */
  isClosed(): boolean
}

/**
 * Factory function for creating new connections
 *
 * @template T The connection type
 */
export type ConnectionFactory<T> = () => Promise<T>

/**
 * Function to close/destroy a connection
 *
 * @template T The connection type
 */
export type ConnectionDestroyer<T> = (connection: T) => Promise<void>

/**
 * Function to validate if a connection is healthy
 *
 * @template T The connection type
 */
export type ConnectionValidator<T> = (connection: T) => Promise<boolean>
