/**
 * DuckDB Connection Manager
 * 
 * Manages database connections, connection pooling, and lifecycle operations
 * for DuckDB storage adapters. Provides caching, automatic reconnection,
 * and synchronization utilities.
 */

import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api'
import { DuckDBStorageConfig, StorageError, StorageErrorCode } from '../interfaces/Storage'

/**
 * Connection Manager for DuckDB Storage Adapters
 * 
 * Features:
 * - Connection caching and pooling
 * - Automatic reconnection support
 * - Table creation synchronization
 * - Thread configuration management
 */
export class DuckDBConnectionManager {
  private database: DuckDBInstance | null = null
  private connection: DuckDBConnection | null = null
  private readonly config: DuckDBStorageConfig
  private readonly debug: boolean
  
  // Global connection cache shared across all adapters
  private static connectionCache = new Map<string, DuckDBInstance>()
  
  // Global table creation mutex to prevent concurrent table creation conflicts
  // Key format: `${database}:${tableName}`
  private static tableCreationMutexes = new Map<string, Promise<void>>()
  
  constructor(config: DuckDBStorageConfig, debug = false) {
    this.config = config
    this.debug = debug
  }
  
  /**
   * Get or create database connection with caching and automatic reconnection
   */
  async getDatabase(): Promise<DuckDBInstance> {
    if (this.database) {
      return this.database
    }
    
    const cacheKey = this.config.database
    
    // Check cache for existing connection
    if (DuckDBConnectionManager.connectionCache.has(cacheKey)) {
      this.database = DuckDBConnectionManager.connectionCache.get(cacheKey)!
      return this.database
    }
    
    try {
      this.database = await DuckDBInstance.create(this.config.database, this.config.options)
      
      // Configure DuckDB settings
      if (this.config.threads && this.config.threads > 1) {
        const conn = await this.database.connect()
        try {
          await conn.run(`PRAGMA threads=${this.config.threads}`)
        } finally {
          conn.closeSync()
        }
      }
      
      // Cache the connection for reuse
      DuckDBConnectionManager.connectionCache.set(cacheKey, this.database)
      
      if (this.debug) {
        console.log(`[DuckDBConnectionManager] Connected to database: ${this.config.database}`)
      }
      
      return this.database
    } catch (error) {
      throw new StorageError(
        `Failed to connect to DuckDB: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { database: this.config.database, originalError: error }
      )
    }
  }
  
  /**
   * Get database connection with automatic reconnection support
   */
  async getConnection(): Promise<DuckDBConnection> {
    if (this.connection) {
      return this.connection
    }
    
    // If database is null, try to reconnect instead of throwing error
    if (this.database === null) {
      if (this.debug) {
        console.log('[DuckDBConnectionManager] Database connection was closed, attempting to reconnect')
      }
    }
    
    const database = await this.getDatabase()
    this.connection = await database.connect()
    
    return this.connection
  }
  
  /**
   * Get a mutex key for table creation synchronization
   */
  private getTableMutexKey(): string {
    return `${this.config.database}:${this.config.tableName}`
  }

  /**
   * Synchronize table creation to prevent concurrent conflicts
   */
  async withTableCreationMutex<T>(operation: () => Promise<T>): Promise<T> {
    const mutexKey = this.getTableMutexKey()

    // Get or create a mutex for this database+table combination
    const existingMutex = DuckDBConnectionManager.tableCreationMutexes.get(mutexKey)

    if (existingMutex) {
      // Wait for the existing operation to complete before proceeding
      await existingMutex
    }

    // Execute the operation and store the result
    const operationPromise = operation()

    // Create a cleanup promise for the mutex
    const mutexPromise = operationPromise.finally(() => {
      // Clean up the mutex when our operation completes
      if (DuckDBConnectionManager.tableCreationMutexes.get(mutexKey) === mutexPromise) {
        DuckDBConnectionManager.tableCreationMutexes.delete(mutexKey)
      }
    }) as Promise<void>

    // Store the mutex so other operations can wait for it
    DuckDBConnectionManager.tableCreationMutexes.set(mutexKey, mutexPromise)

    // Return the actual operation result
    return operationPromise
  }

  /**
   * Create storage table if it doesn't exist
   */
  async createTableIfNeeded(): Promise<void> {
    // Synchronize table creation to prevent race conditions
    return this.withTableCreationMutex(async () => {
      const connection = await this.getConnection()
      const tableName = this.config.tableName!
      
      try {
        // Create table with proper schema for key-value storage
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            key VARCHAR PRIMARY KEY,
            value JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
        
        await connection.run(createTableSQL)
        
        if (this.debug) {
          console.log(`[DuckDBConnectionManager] Created/verified table: ${tableName}`)
        }
        
      } catch (error) {
        throw new StorageError(
          `Failed to create storage table: ${(error as Error).message}`,
          StorageErrorCode.CONNECTION_FAILED,
          { tableName, originalError: error }
        )
      }
    })
  }
  
  /**
   * Close the current connection
   */
  async closeConnection(): Promise<void> {
    if (this.connection) {
      this.connection.closeSync()
      this.connection = null
    }
  }
  
  /**
   * Close the database instance and remove from cache
   */
  async closeDatabase(): Promise<void> {
    await this.closeConnection()
    
    if (this.database) {
      const cacheKey = this.config.database
      DuckDBConnectionManager.connectionCache.delete(cacheKey)
      this.database.closeSync()
      this.database = null
    }
  }
  
  /**
   * Clear all cached connections (useful for cleanup in tests)
   */
  static clearCache(): void {
    for (const database of DuckDBConnectionManager.connectionCache.values()) {
      try {
        database.closeSync()
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    DuckDBConnectionManager.connectionCache.clear()
    DuckDBConnectionManager.tableCreationMutexes.clear()
  }
  
  /**
   * Get connection cache statistics
   */
  static getCacheStats(): { cachedConnections: number; activeMutexes: number } {
    return {
      cachedConnections: DuckDBConnectionManager.connectionCache.size,
      activeMutexes: DuckDBConnectionManager.tableCreationMutexes.size
    }
  }
}