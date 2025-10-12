/**
 * Kuzu Storage Operations Module
 *
 * Handles CRUD operations for Kuzu storage adapter.
 * Designed for unit testability through dependency injection.
 *
 * Design Principles:
 * - Dependencies injected via constructor
 * - No direct database instantiation
 * - Easily mockable for unit tests
 * - Single Responsibility: Storage operations only
 */

import { Connection } from 'kuzu'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import { GraphEntity, KuzuStorageConfig } from '../types/GraphTypes'
import { StorageValidator } from '../helpers/StorageValidator'
import { KuzuSecureQueryBuilder, QueryExecutionResult } from './KuzuSecureQueryBuilder'
import * as KuzuQueryHelpers from './KuzuQueryHelpers'

/**
 * Dependencies required by KuzuStorageOperations
 */
export interface KuzuStorageOperationsDeps {
  connection: Connection
  secureQueryBuilder: KuzuSecureQueryBuilder
  cache: Map<string, GraphEntity>
  config: KuzuStorageConfig
  executeSecureQuery: (secureQuery: any) => Promise<QueryExecutionResult>
  log?: (message: string) => void
  logWarn?: (message: string) => void
}

/**
 * Kuzu Storage Operations
 *
 * Encapsulates all storage CRUD operations with clear dependency boundaries.
 */
export class KuzuStorageOperations {
  constructor(private deps: KuzuStorageOperationsDeps) {}

  /**
   * Store entity in both memory cache and database
   */
  async set(key: string, value: GraphEntity): Promise<void> {
    StorageValidator.validateKey(key)
    StorageValidator.validateValue(value)

    // Additional validation for GraphEntity structure
    if (typeof value.id !== 'string' || value.id === '') {
      throw new StorageError(
        'Entity ID must be a non-empty string',
        StorageErrorCode.INVALID_VALUE,
        { entityId: value.id, type: typeof value.id }
      )
    }

    if (typeof value.type !== 'string' || value.type === '') {
      throw new StorageError(
        'Entity type must be a non-empty string',
        StorageErrorCode.INVALID_VALUE,
        { entityType: value.type, type: typeof value.type }
      )
    }

    if (!value.properties || typeof value.properties !== 'object') {
      throw new StorageError(
        'Entity properties must be an object',
        StorageErrorCode.INVALID_VALUE,
        { properties: value.properties, type: typeof value.properties }
      )
    }

    try {
      // Add storage metadata
      const storageMetadata = KuzuQueryHelpers.generateStorageMetadata(value)
      const entityWithStorage: GraphEntity = {
        ...value,
        _storage: storageMetadata
      }

      // Store in database using secure parameterized queries
      const serializedData = JSON.stringify(entityWithStorage)

      // Use secure query builder to prevent SQL injection
      const secureQuery = this.deps.secureQueryBuilder.buildEntityStoreQuery(
        key,
        value.id,
        value.type,
        serializedData
      )
      const result = await this.deps.executeSecureQuery(secureQuery)

      if (!result.success) {
        throw new StorageError(
          `Failed to store entity: ${result.error}`,
          StorageErrorCode.WRITE_FAILED,
          { key, value, error: result.error }
        )
      }

      // Store in memory cache
      this.deps.cache.set(key, entityWithStorage)

      if (this.deps.config.debug && this.deps.log) {
        this.deps.log(`SET ${key} -> stored entity with type ${value.type}`)
      }
    } catch (error) {
      throw new StorageError(
        `Failed to store entity: ${error}`,
        StorageErrorCode.WRITE_FAILED,
        { key, error }
      )
    }
  }

  /**
   * Delete entity from both memory cache and database
   */
  async delete(key: string): Promise<boolean> {
    StorageValidator.validateKey(key)

    try {
      const existed = this.deps.cache.has(key)

      if (existed) {
        // Delete from database using secure parameterized query
        const entity = this.deps.cache.get(key)
        if (entity) {
          const secureQuery = this.deps.secureQueryBuilder.buildEntityDeleteQuery(entity.id)
          const result = await this.deps.executeSecureQuery(secureQuery)

          if (!result.success) {
            throw new StorageError(
              `Failed to delete entity: ${result.error}`,
              StorageErrorCode.DELETE_FAILED,
              { key, error: result.error }
            )
          }
        }

        // Delete from memory cache
        this.deps.cache.delete(key)

        if (this.deps.config.debug && this.deps.log) {
          this.deps.log(`DELETE ${key} -> entity removed`)
        }
      }

      return existed
    } catch (error) {
      throw new StorageError(
        `Failed to delete entity: ${error}`,
        StorageErrorCode.IO_ERROR,
        { key, error }
      )
    }
  }

  /**
   * Clear all data from both memory cache and database
   */
  async clear(): Promise<void> {
    try {
      // Clear database - use DETACH DELETE to automatically handle connected edges
      await this.deps.connection.query('MATCH (e:Entity) DETACH DELETE e')

      // Clear memory cache
      const sizeBefore = this.deps.cache.size
      this.deps.cache.clear()

      if (this.deps.config.debug && this.deps.log) {
        this.deps.log(`CLEAR -> removed ${sizeBefore} entities`)
      }
    } catch (error) {
      throw new StorageError(
        `Failed to clear database: ${error}`,
        StorageErrorCode.IO_ERROR,
        { error }
      )
    }
  }
}
