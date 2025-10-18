/**
 * DuckDB Connection Pool
 *
 * Provides connection pooling for DuckDB connections with proper
 * lifecycle management and health checks.
 */

import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api'
import {
  ConnectionPool,
  ConnectionPoolConfig,
  PoolStats
} from './ConnectionPool'
import { GenericConnectionPool } from './GenericConnectionPool'
import { StorageError, StorageErrorCode, DuckDBStorageConfig } from '../interfaces/Storage'
import { Logger } from '../../utils/Logger'

/**
 * DuckDB connection pool configuration
 */
export interface DuckDBConnectionPoolConfig extends ConnectionPoolConfig {
  /** Database path */
  database: string

  /** DuckDB configuration options */
  options?: {
    access_mode?: 'read_write' | 'read_only'
    max_memory?: string
    threads?: string
  }

  /** Number of threads for DuckDB */
  threads?: number
}

/**
 * Pooled connection with database instance
 */
interface DuckDBPooledConnection {
  connection: DuckDBConnection
  database: DuckDBInstance
}

/**
 * Connection pool for DuckDB connections
 *
 * Manages a pool of DuckDB connections with automatic creation,
 * validation, and cleanup. Each connection has its own database
 * instance for isolation.
 */
export class DuckDBConnectionPool implements ConnectionPool<DuckDBConnection> {
  private pool: GenericConnectionPool<DuckDBPooledConnection>
  private readonly config: DuckDBConnectionPoolConfig
  private readonly logger: Logger

  // Shared database instance (DuckDB can share database across connections)
  private sharedDatabase: DuckDBInstance | null = null

  constructor(config: DuckDBConnectionPoolConfig) {
    if (!config.database) {
      throw new StorageError(
        'Database path is required for DuckDB connection pool',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    this.config = config
    this.logger = Logger.createConsoleLogger('DuckDBConnectionPool')

    // Create generic pool with DuckDB-specific functions
    const poolConfig: ConnectionPoolConfig = {
      minConnections: config.minConnections,
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
  async acquire(): Promise<DuckDBConnection> {
    const pooled = await this.pool.acquire()
    return pooled.connection
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: DuckDBConnection): Promise<void> {
    // Note: This is a simplified implementation
    // In production, we'd maintain a WeakMap<DuckDBConnection, DuckDBPooledConnection>
    // to properly track the pooled connection metadata
    const pooled: DuckDBPooledConnection = {
      connection,
      database: (connection as any)._database || this.sharedDatabase!
    }

    await this.pool.release(pooled)
  }

  /**
   * Close the pool and all connections
   */
  async close(drainTimeout?: number): Promise<void> {
    await this.pool.close(drainTimeout)

    // Close shared database if exists
    if (this.sharedDatabase) {
      try {
        this.sharedDatabase.closeSync()
        this.sharedDatabase = null
      } catch (error) {
        if (this.config.debug) {
          this.logger.warn('[DuckDBConnectionPool] Error closing shared database', { error: String(error) })
        }
      }
    }
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
   * Create a new DuckDB connection
   */
  private async createConnection(): Promise<DuckDBPooledConnection> {
    try {
      // Create or reuse shared database instance
      if (!this.sharedDatabase) {
        this.sharedDatabase = await DuckDBInstance.create(
          this.config.database,
          this.config.options
        )

        // Configure threads if specified
        if (this.config.threads && this.config.threads > 1) {
          const tempConn = await this.sharedDatabase.connect()
          try {
            await tempConn.run(`PRAGMA threads=${this.config.threads}`)
          } finally {
            tempConn.closeSync()
          }
        }
      }

      // Create a new connection from the shared database
      const connection = await this.sharedDatabase.connect()

      // Store database reference for tracking
      ;(connection as any)._database = this.sharedDatabase

      return {
        connection,
        database: this.sharedDatabase
      }
    } catch (error) {
      throw new StorageError(
        `Failed to create DuckDB connection: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { database: this.config.database, error }
      )
    }
  }

  /**
   * Destroy a DuckDB connection
   */
  private async destroyConnection(pooled: DuckDBPooledConnection): Promise<void> {
    try {
      if (pooled.connection) {
        pooled.connection.closeSync()
      }
      // Don't close the shared database - it's reused across connections
    } catch (error) {
      if (this.config.debug) {
        this.logger.warn('[DuckDBConnectionPool] Error destroying connection', { error: String(error) })
      }
    }
  }

  /**
   * Validate a DuckDB connection
   */
  private async validateConnection(pooled: DuckDBPooledConnection): Promise<boolean> {
    try {
      // Try a simple query to verify connection is alive
      await pooled.connection.run('SELECT 1')
      return true
    } catch (error) {
      return false
    }
  }
}
