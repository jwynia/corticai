/**
 * Kuzu Connection Pool
 *
 * Provides connection pooling for Kuzu graph database connections.
 * Uses the GenericConnectionPool with Kuzu-specific factory, destroyer,
 * and validator functions.
 */

import { Database, Connection } from 'kuzu'
import {
  ConnectionPool,
  ConnectionPoolConfig,
  PoolStats
} from './ConnectionPool'
import { GenericConnectionPool } from './GenericConnectionPool'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'

/**
 * Kuzu connection pool configuration
 */
export interface KuzuConnectionPoolConfig extends Omit<ConnectionPoolConfig, 'minConnections'> {
  /** Database path or instance */
  database: string | Database

  /** Buffer pool size (only used when database is a string path) */
  bufferPoolSize?: number

  /** Minimum connections (Kuzu uses 1 connection per pool) */
  minConnections?: 1
}

/**
 * Pooled connection for Kuzu
 */
interface KuzuPooledConnection {
  connection: Connection
  database: Database
}

/**
 * Connection pool for Kuzu database connections
 *
 * Note: Kuzu's architecture typically uses one connection per database instance.
 * This pool manages Connection objects, with each having its own Database instance
 * to avoid conflicts.
 */
export class KuzuConnectionPool implements ConnectionPool<Connection> {
  private pool: GenericConnectionPool<KuzuPooledConnection>
  private readonly databasePath: string
  private readonly bufferPoolSize: number

  constructor(config: KuzuConnectionPoolConfig) {
    if (!config.database) {
      throw new StorageError(
        'Database path is required for Kuzu connection pool',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    if (typeof config.database !== 'string') {
      throw new StorageError(
        'Kuzu connection pool requires database path (not Database instance)',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    this.databasePath = config.database
    this.bufferPoolSize = config.bufferPoolSize || 64 * 1024 * 1024 // 64MB default

    // Create generic pool with Kuzu-specific functions
    const poolConfig: ConnectionPoolConfig = {
      minConnections: config.minConnections || 1,
      maxConnections: config.maxConnections,
      acquireTimeout: config.acquireTimeout,
      idleTimeout: config.idleTimeout,
      healthCheckInterval: config.healthCheckInterval,
      debug: config.debug
    }

    this.pool = new GenericConnectionPool(
      poolConfig,
      this.createConnection.bind(this),
      this.destroyConnection.bind(this),
      this.validateConnection.bind(this)
    )
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<Connection> {
    const pooled = await this.pool.acquire()
    return pooled.connection
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: Connection): Promise<void> {
    // Find the pooled connection that contains this connection
    // Note: This is a workaround since we can't directly map Connection to KuzuPooledConnection
    // In practice, we need to maintain this mapping
    // For now, we'll just release by creating a minimal pooled object
    const pooled: KuzuPooledConnection = {
      connection,
      database: (connection as any)._database // Access internal database reference
    }

    await this.pool.release(pooled)
  }

  /**
   * Close the pool
   */
  async close(drainTimeout?: number): Promise<void> {
    await this.pool.close(drainTimeout)
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    return this.pool.getStats()
  }

  /**
   * Check if pool is closed
   */
  isClosed(): boolean {
    return this.pool.isClosed()
  }

  /**
   * Create a new Kuzu connection
   */
  private async createConnection(): Promise<KuzuPooledConnection> {
    try {
      // Create a new Database instance for this connection
      const database = new Database(this.databasePath, this.bufferPoolSize)

      // Create a connection from the database
      const connection = new Connection(database)

      // Store database reference for cleanup
      ;(connection as any)._database = database

      return {
        connection,
        database
      }
    } catch (error) {
      throw new StorageError(
        `Failed to create Kuzu connection: ${error}`,
        StorageErrorCode.CONNECTION_FAILED,
        { database: this.databasePath, error }
      )
    }
  }

  /**
   * Destroy a Kuzu connection
   */
  private async destroyConnection(pooled: KuzuPooledConnection): Promise<void> {
    try {
      // Close connection first
      if (pooled.connection) {
        await pooled.connection.close()
      }

      // Then close database
      if (pooled.database) {
        await pooled.database.close()
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  /**
   * Validate a Kuzu connection
   */
  private async validateConnection(pooled: KuzuPooledConnection): Promise<boolean> {
    try {
      // Execute a simple query to verify the connection is actually working
      const result = await pooled.connection.query('RETURN 1 AS test')
      return result !== null && result !== undefined
    } catch (error) {
      return false
    }
  }
}
