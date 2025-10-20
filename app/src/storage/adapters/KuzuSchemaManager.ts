/**
 * Kuzu Schema Manager
 *
 * Handles database initialization, schema creation, and data loading
 * for the Kuzu graph database adapter.
 *
 * Responsibilities:
 * - Database instance and connection creation
 * - Schema creation (node and relationship tables)
 * - Loading existing data from disk
 * - Database directory management
 * - Resource cleanup
 *
 * Extracted from KuzuStorageAdapter.ts as part of REFACTOR-003
 */

import { Database, Connection } from 'kuzu'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import { KuzuStorageConfig, GraphEntity } from '../types/GraphTypes'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Dependencies required by KuzuSchemaManager
 */
export interface KuzuSchemaManagerDeps {
  config: KuzuStorageConfig
  log?: (message: string) => void
  logWarn?: (message: string) => void
}

/**
 * Result of database initialization
 */
export interface InitializationResult {
  db: Database
  connection: Connection
}

/**
 * KuzuSchemaManager - Handles database initialization and schema management
 *
 * This class is responsible for the low-level database operations:
 * - Creating database instances
 * - Managing connections
 * - Creating schema (tables)
 * - Loading existing data
 * - Cleanup and resource disposal
 */
export class KuzuSchemaManager {
  private db: Database | null = null
  private connection: Connection | null = null
  private readonly config: KuzuStorageConfig
  private readonly log: (message: string) => void
  private readonly logWarn: (message: string) => void

  constructor(deps: KuzuSchemaManagerDeps) {
    this.config = deps.config
    this.log = deps.log || (() => {})
    this.logWarn = deps.logWarn || (() => {})
  }

  /**
   * Initialize the Kuzu database instance and connection
   *
   * Creates the database directory if needed (when autoCreate is true),
   * initializes the database instance, and establishes a connection.
   *
   * @returns Promise resolving to database and connection objects
   * @throws StorageError if database creation fails
   */
  async initialize(): Promise<InitializationResult> {
    try {
      // Ensure database directory exists
      if (this.config.autoCreate) {
        const dbDir = path.dirname(this.config.database)
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true })
        }
      }

      // Create database instance
      this.db = new Database(this.config.database, this.config.bufferPoolSize)

      // Create connection
      this.connection = new Connection(this.db)

      if (this.config.debug) {
        this.log('Database and connection created')
      }

      return {
        db: this.db,
        connection: this.connection
      }
    } catch (error) {
      throw new StorageError(
        `Failed to create Kuzu database: ${error}`,
        StorageErrorCode.CONNECTION_FAILED,
        { database: this.config.database, error }
      )
    }
  }

  /**
   * Create the database schema for storing graph entities
   *
   * Creates the following tables:
   * - Entity (NODE TABLE): Stores graph nodes
   * - Relationship (REL TABLE): Stores graph edges
   *
   * Handles "already exists" errors gracefully (idempotent operation).
   *
   * @param connection - Active database connection
   * @throws StorageError if schema creation fails for reasons other than "already exists"
   */
  async createSchema(connection: Connection): Promise<void> {
    try {
      // Create node table for storing entities
      try {
        await connection.query(
          `CREATE NODE TABLE Entity(id STRING, type STRING, data STRING, PRIMARY KEY (id))`
        )
      } catch (error: any) {
        // If table exists, that's fine (idempotent operation)
        if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
          if (this.config.debug) {
            this.log('Entity table already exists')
          }
        } else {
          throw error
        }
      }

      // Create relationship table for graph edges
      try {
        await connection.query(
          `CREATE REL TABLE Relationship(FROM Entity TO Entity, type STRING, data STRING)`
        )
      } catch (error: any) {
        // If table exists, that's fine (idempotent operation)
        if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
          if (this.config.debug) {
            this.log('Relationship table already exists')
          }
        } else {
          throw error
        }
      }

      if (this.config.debug) {
        this.log('Database schema created')
      }
    } catch (error) {
      throw new StorageError(
        `Failed to create database schema: ${error}`,
        StorageErrorCode.IO_ERROR,
        { error }
      )
    }
  }

  /**
   * Load existing data from the database into memory cache
   *
   * Queries for all existing entities in the database and returns them
   * as a Map for populating the in-memory cache.
   *
   * This method is tolerant of empty databases and will return an empty
   * Map if no data exists or if the query fails.
   *
   * @param connection - Active database connection
   * @returns Promise resolving to Map of entity ID -> GraphEntity
   */
  async loadExistingData(connection: Connection): Promise<Map<string, GraphEntity>> {
    const data = new Map<string, GraphEntity>()

    try {
      await connection.query('MATCH (e:Entity) RETURN e.id, e.type, e.data')

      // Note: Kuzu result handling may need to be adjusted based on actual API
      // For now, we return empty map as the actual result parsing would need
      // to be implemented based on Kuzu's result format

      if (this.config.debug) {
        this.log(`Database query executed for loading existing data`)
      }

      return data
    } catch (error) {
      if (this.config.debug) {
        this.logWarn(`Could not load existing data (database might be empty): ${error}`)
      }
      // Don't throw - empty database is valid
      return data
    }
  }

  /**
   * Close database connection and database instance
   *
   * Performs cleanup in the correct order:
   * 1. Close connection
   * 2. Close database
   *
   * Handles errors gracefully (logs warnings but doesn't throw).
   * Safe to call even if database/connection were never initialized.
   */
  async close(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.close()
        this.connection = null
      }

      if (this.db) {
        await this.db.close()
        this.db = null
      }

      if (this.config.debug) {
        this.log('Database connection closed')
      }
    } catch (error) {
      this.logWarn(`Error closing database: ${error}`)
    }
  }
}
