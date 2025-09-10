/**
 * DuckDB Storage Adapter
 * 
 * Implementation of storage adapter using DuckDB as the backend.
 * Provides high-performance columnar storage with SQL query capabilities,
 * transaction support, and Parquet import/export functionality.
 */

import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api'
import { BaseStorageAdapter } from '../base/BaseStorageAdapter'
import { DuckDBStorageConfig, StorageError, StorageErrorCode } from '../interfaces/Storage'

/**
 * DuckDB Storage Adapter
 * 
 * Features:
 * - Columnar storage for analytics workloads
 * - SQL query support for complex operations
 * - Transaction support for atomicity
 * - Parquet import/export capabilities
 * - Connection pooling and resource management
 */
export class DuckDBStorageAdapter<T = any> extends BaseStorageAdapter<T> {
  private database: DuckDBInstance | null = null
  private connection: DuckDBConnection | null = null
  protected config: DuckDBStorageConfig
  private isLoaded = false
  private transactionDepth = 0
  private persistMutex = Promise.resolve()
  private static connectionCache = new Map<string, DuckDBInstance>()
  
  constructor(config: DuckDBStorageConfig) {
    super(config)
    
    // Validate configuration
    if (!config.database) {
      throw new StorageError(
        'Database path is required for DuckDB storage',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }
    
    this.config = {
      tableName: 'storage',
      threads: 1,
      enableParquet: false,
      poolSize: 1,
      autoCreate: true,
      ...config
    }
    
    if (this.config.debug) {
      this.log(`Initializing with database: ${this.config.database}`)
    }
  }
  
  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================
  
  /**
   * Get or create database connection with caching and automatic reconnection
   */
  private async getDatabase(): Promise<DuckDBInstance> {
    if (this.database) {
      return this.database
    }
    
    const cacheKey = this.config.database
    
    // Check cache for existing connection
    if (DuckDBStorageAdapter.connectionCache.has(cacheKey)) {
      this.database = DuckDBStorageAdapter.connectionCache.get(cacheKey)!
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
      DuckDBStorageAdapter.connectionCache.set(cacheKey, this.database)
      
      if (this.config.debug) {
        this.log(`Connected to database: ${this.config.database}`)
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
  private async getConnection(): Promise<DuckDBConnection> {
    if (this.connection) {
      return this.connection
    }
    
    // If database is null, try to reconnect instead of throwing error
    if (this.database === null) {
      if (this.config.debug) {
        this.log('Database connection was closed, attempting to reconnect')
      }
    }
    
    const database = await this.getDatabase()
    this.connection = await database.connect()
    
    return this.connection
  }
  
  /**
   * Create storage table if it doesn't exist
   */
  private async createTableIfNeeded(): Promise<void> {
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
      
      if (this.config.debug) {
        this.log(`Created/verified table: ${tableName}`)
      }
      
    } catch (error) {
      throw new StorageError(
        `Failed to create storage table: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { tableName, originalError: error }
      )
    }
  }
  
  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================
  
  /**
   * Load data from DuckDB into memory cache
   */
  protected async ensureLoaded(): Promise<void> {
    if (this.isLoaded) {
      return
    }
    
    try {
      await this.createTableIfNeeded()
      
      const connection = await this.getConnection()
      const tableName = this.config.tableName!
      
      // Load all data into memory for BaseStorageAdapter compatibility
      const reader = await connection.runAndReadAll(`SELECT key, value FROM ${tableName}`)
      const rows = reader.getRowObjectsJS()
      
      this.data.clear()
      for (const row of rows) {
        try {
          const value = JSON.parse(row.value as string)
          this.data.set(row.key as string, value)
        } catch (parseError) {
          this.logWarn(`Failed to parse JSON for key "${row.key}": ${parseError}`)
        }
      }
      
      this.isLoaded = true
      
      if (this.config.debug) {
        this.log(`Loaded ${this.data.size} entries from database`)
      }
      
    } catch (error) {
      throw new StorageError(
        `Failed to load data from DuckDB: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { originalError: error }
      )
    }
  }
  
  /**
   * Persist memory cache to DuckDB using a safer approach for concurrent operations
   * Uses a mutex to prevent concurrent persist operations from interfering
   */
  protected async persist(): Promise<void> {
    // Use mutex to serialize persist operations
    this.persistMutex = this.persistMutex
      .then(async () => await this.doPersist())
      .catch(error => {
        // Reset mutex on error to prevent deadlock
        this.persistMutex = Promise.resolve()
        throw error
      })
    return this.persistMutex
  }
  
  private async doPersist(): Promise<void> {
    try {
      const connection = await this.getConnection()
      const tableName = this.config.tableName!
      
      // Use INSERT OR REPLACE to handle concurrent operations safely
      // First delete all entries that are not in current memory cache
      if (this.data.size > 0) {
        const placeholders = Array.from(this.data.keys()).map(() => '?').join(',')
        await connection.run(
          `DELETE FROM ${tableName} WHERE key NOT IN (${placeholders})`,
          Array.from(this.data.keys())
        )
        
        // Then insert or replace all current data
        const insertSQL = `INSERT OR REPLACE INTO ${tableName} (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
        
        for (const [key, value] of this.data) {
          try {
            const serializedValue = JSON.stringify(value)
            await connection.run(insertSQL, [key, serializedValue])
          } catch (serializeError) {
            throw new StorageError(
              `Failed to serialize value for key "${key}": ${serializeError}`,
              StorageErrorCode.SERIALIZATION_FAILED,
              { key, value, originalError: serializeError }
            )
          }
        }
      } else {
        // If no data in memory, clear the table
        await connection.run(`DELETE FROM ${tableName}`)
      }
      
      if (this.config.debug) {
        this.log(`Persisted ${this.data.size} entries to database`)
      }
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      
      throw new StorageError(
        `Failed to persist data to DuckDB: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { originalError: error }
      )
    }
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Process BigInt values in query results, converting them to regular numbers
   * for JSON compatibility and test expectations
   */
  private processBigIntValues(rows: any[]): any[] {
    return rows.map(row => {
      if (row && typeof row === 'object') {
        const processed: any = {}
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'bigint') {
            // Convert BigInt to number only if it's within safe integer range
            if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
              processed[key] = Number(value)
            } else {
              processed[key] = value.toString()
            }
          } else {
            processed[key] = value
          }
        }
        return processed
      }
      return row
    })
  }
  
  // ============================================================================
  // DUCKDB-SPECIFIC FEATURES
  // ============================================================================
  
  /**
   * Execute raw SQL query
   */
  async query<R = any>(sql: string, params: any[] = []): Promise<R[]> {
    try {
      const connection = await this.getConnection()
      
      if (this.config.debug) {
        this.log(`Executing query: ${sql}`)
      }
      
      // For parameterized queries, we need to use prepared statements  
      if (params && params.length > 0) {
        // Convert ? placeholders to $1, $2, etc. for DuckDB
        let paramIndex = 1
        const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
        
        const prepared = await connection.prepare(convertedSql)
        
        // Bind parameters by type
        for (let i = 0; i < params.length; i++) {
          const param = params[i]
          const paramNum = i + 1
          
          if (param === null || param === undefined) {
            prepared.bindNull(paramNum)
          } else if (typeof param === 'string') {
            prepared.bindVarchar(paramNum, param)
          } else if (typeof param === 'number') {
            if (Number.isInteger(param)) {
              prepared.bindInteger(paramNum, param)
            } else {
              prepared.bindDouble(paramNum, param)
            }
          } else if (typeof param === 'boolean') {
            prepared.bindBoolean(paramNum, param)
          } else {
            // For complex objects, convert to string
            prepared.bindVarchar(paramNum, JSON.stringify(param))
          }
        }
        
        const reader = await prepared.runAndReadAll()
        const rows = reader.getRowObjectsJS()
        // Convert BigInt values to regular numbers for JSON compatibility
        const processedRows = this.processBigIntValues(rows)
        return processedRows as R[]
      } else {
        const reader = await connection.runAndReadAll(sql)
        const rows = reader.getRowObjectsJS()
        // Convert BigInt values to regular numbers for JSON compatibility
        const processedRows = this.processBigIntValues(rows)
        return processedRows as R[]
      }
      
    } catch (error) {
      throw new StorageError(
        `Query execution failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { sql, params, originalError: error }
      )
    }
  }
  
  /**
   * Export data to Parquet file
   */
  async exportParquet(filePath: string): Promise<void> {
    if (!this.config.enableParquet) {
      throw new StorageError(
        'Parquet support not enabled. Set enableParquet: true in configuration',
        StorageErrorCode.INVALID_VALUE,
        { enableParquet: this.config.enableParquet }
      )
    }
    
    try {
      const connection = await this.getConnection()
      const tableName = this.config.tableName!
      
      // Escape single quotes in file path to prevent SQL injection
      const safePath = filePath.replace(/'/g, "''")
      const exportSQL = `COPY (SELECT * FROM ${tableName}) TO '${safePath}' (FORMAT PARQUET)`
      await connection.run(exportSQL)
      
      if (this.config.debug) {
        this.log(`Exported data to Parquet file: ${filePath}`)
      }
      
    } catch (error) {
      throw new StorageError(
        `Parquet export failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { filePath, originalError: error }
      )
    }
  }
  
  /**
   * Import data from Parquet file
   */
  async importParquet(filePath: string): Promise<void> {
    if (!this.config.enableParquet) {
      throw new StorageError(
        'Parquet support not enabled. Set enableParquet: true in configuration',
        StorageErrorCode.INVALID_VALUE,
        { enableParquet: this.config.enableParquet }
      )
    }
    
    try {
      const connection = await this.getConnection()
      const tableName = this.config.tableName!
      
      // Import from Parquet file - escape single quotes to prevent SQL injection
      const safePath = filePath.replace(/'/g, "''")
      const importSQL = `INSERT INTO ${tableName} SELECT * FROM read_parquet('${safePath}')`
      await connection.run(importSQL)
      
      // Reload data into memory cache
      this.isLoaded = false
      await this.ensureLoaded()
      
      if (this.config.debug) {
        this.log(`Imported data from Parquet file: ${filePath}`)
      }
      
    } catch (error) {
      throw new StorageError(
        `Parquet import failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { filePath, originalError: error }
      )
    }
  }
  
  /**
   * Query Parquet file directly without importing
   */
  async queryParquet<R = any>(filePath: string, sql: string, params: any[] = []): Promise<R[]> {
    if (!this.config.enableParquet) {
      throw new StorageError(
        'Parquet support not enabled. Set enableParquet: true in configuration',
        StorageErrorCode.INVALID_VALUE,
        { enableParquet: this.config.enableParquet }
      )
    }
    
    try {
      const connection = await this.getConnection()
      
      if (this.config.debug) {
        this.log(`Querying Parquet file: ${filePath}`)
      }
      
      // Replace the first parameter with the file path for read_parquet
      // Escape single quotes to prevent SQL injection
      const safePath = filePath.replace(/'/g, "''")
      const finalSQL = sql.replace(/\?/, `'${safePath}'`)
      
      // Handle remaining parameters like in the regular query method
      if (params && params.length > 0) {
        // Convert remaining ? placeholders to $1, $2, etc. for DuckDB
        let paramIndex = 1
        const convertedSql = finalSQL.replace(/\?/g, () => `$${paramIndex++}`)
        
        const prepared = await connection.prepare(convertedSql)
        
        // Bind parameters by type
        for (let i = 0; i < params.length; i++) {
          const param = params[i]
          const paramNum = i + 1
          
          if (param === null || param === undefined) {
            prepared.bindNull(paramNum)
          } else if (typeof param === 'string') {
            prepared.bindVarchar(paramNum, param)
          } else if (typeof param === 'number') {
            if (Number.isInteger(param)) {
              prepared.bindInteger(paramNum, param)
            } else {
              prepared.bindDouble(paramNum, param)
            }
          } else if (typeof param === 'boolean') {
            prepared.bindBoolean(paramNum, param)
          } else {
            // For complex objects, convert to string
            prepared.bindVarchar(paramNum, JSON.stringify(param))
          }
        }
        
        const reader = await prepared.runAndReadAll()
        const rows = reader.getRowObjectsJS()
        const processedRows = this.processBigIntValues(rows)
        return processedRows as R[]
      } else {
        const reader = await connection.runAndReadAll(finalSQL)
        const rows = reader.getRowObjectsJS()
        const processedRows = this.processBigIntValues(rows)
        return processedRows as R[]
      }
      
    } catch (error) {
      throw new StorageError(
        `Parquet query failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { filePath, sql, params, originalError: error }
      )
    }
  }
  
  /**
   * Execute operations within a transaction
   */
  async transaction<R>(fn: () => Promise<R>): Promise<R> {
    const connection = await this.getConnection()
    
    // Save the current state of the in-memory cache
    const backupData = new Map(this.data)
    const currentDepth = this.transactionDepth++
    
    try {
      if (currentDepth === 0) {
        // Start a new transaction only for the outermost level
        await connection.run('BEGIN TRANSACTION')
        if (this.config.debug) {
          this.log('Started transaction')
        }
      } else {
        // For nested transactions, we just handle rollback in memory
        // DuckDB doesn't support savepoints in the version we're using
        if (this.config.debug) {
          this.log(`Started nested transaction (depth: ${currentDepth})`)
        }
      }
      
      const result = await fn()
      
      if (currentDepth === 0) {
        // Commit the main transaction
        await connection.run('COMMIT')
        if (this.config.debug) {
          this.log('Committed transaction')
        }
      } else {
        // For nested transactions, we just continue
        if (this.config.debug) {
          this.log(`Completed nested transaction (depth: ${currentDepth})`)
        }
      }
      
      this.transactionDepth--
      return result
      
    } catch (error) {
      try {
        if (currentDepth === 0) {
          // Rollback the main transaction
          await connection.run('ROLLBACK')
          if (this.config.debug) {
            this.log('Rolled back transaction')
          }
        } else {
          // For nested transactions, we don't do SQL rollback but still restore cache
          if (this.config.debug) {
            this.log(`Rolling back nested transaction (depth: ${currentDepth})`)
          }
        }
        
        // Always rollback the in-memory cache to the saved state
        this.data.clear()
        for (const [key, value] of backupData) {
          this.data.set(key, value)
        }
        
      } catch (rollbackError) {
        this.logError('Failed to rollback transaction', rollbackError as Error)
      }
      
      this.transactionDepth--
      throw error
    }
  }
  
  /**
   * Close database connection and cleanup resources
   * After closing, the adapter can be used again and will automatically reconnect
   */
  async close(): Promise<void> {
    try {
      // Ensure any pending data is persisted before closing
      if (this.isLoaded && this.data.size > 0) {
        await this.persist()
      }
      
      if (this.connection) {
        this.connection.closeSync()
        this.connection = null
      }
      
      if (this.database) {
        const cacheKey = this.config.database
        // Always remove from cache when explicitly closing
        DuckDBStorageAdapter.connectionCache.delete(cacheKey)
        
        this.database.closeSync()
        this.database = null
      }
      
      // Reset state to allow reconnection
      this.isLoaded = false
      this.data.clear()
      
      if (this.config.debug) {
        this.log('Closed database connection (adapter can reconnect automatically)')
      }
      
    } catch (error) {
      this.logError('Error closing database connection', error as Error)
      throw new StorageError(
        `Failed to close database connection: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { originalError: error }
      )
    }
  }
}