/**
 * Local Storage Provider
 *
 * Implements the storage provider interface using local file-based storage.
 * Uses KuzuStorageAdapter for primary storage (graph operations) and
 * DuckDBStorageAdapter for semantic storage (analytics and search).
 */

import { KuzuStorageAdapter } from '../adapters/KuzuStorageAdapter'
import { DuckDBStorageAdapter } from '../adapters/DuckDBStorageAdapter'
import {
  IStorageProvider,
  PrimaryStorage,
  SemanticStorage,
  StorageProviderConfig,
  StorageProviderStatus,
  SearchOptions,
  AggregateOperation
} from './IStorageProvider'
import { Logger } from '../../utils/Logger'

const logger = Logger.createConsoleLogger('LocalStorageProvider')

/**
 * Configuration for local storage provider
 */
export interface LocalStorageConfig extends StorageProviderConfig {
  type: 'local'
  primary: {
    database: string      // Path to Kuzu database
    readOnly?: boolean
  }
  semantic: {
    database: string      // Path to DuckDB database
    threads?: number
    memoryLimit?: string
  }
}

/**
 * Enhanced KuzuStorageAdapter with graph operations
 */
class EnhancedKuzuAdapter<T = any> extends KuzuStorageAdapter implements PrimaryStorage<T> {
  /**
   * Traverse graph relationships
   */
  async traverse(sourceId: string, relationshipType?: string, maxDepth: number = 3): Promise<T[]> {
    // Fallback implementation using basic queries
    const results: T[] = []

    try {
      // Start with the source entity
      const source = await this.get(sourceId)
      if (source) {
        results.push(source as T)
      }
    } catch (error) {
      // Ignore errors for now
    }

    // For now, return just the source entity
    // In a full implementation, this would traverse the graph
    return results
  }

  /**
   * Find connected entities
   */
  async findConnected(entityId: string, connectionType?: string): Promise<T[]> {
    // Fallback: return empty array
    return []
  }

  /**
   * Add entity to graph storage
   */
  async addEntity(entity: T): Promise<void> {
    // Extract ID from entity or generate one
    const id = (entity as any).id || `entity_${Date.now()}`
    await (this as any).set(id, entity)
  }

  /**
   * Add relationship between entities
   */
  async addRelationship(from: string, to: string, type: string, properties?: any): Promise<void> {
    const relationshipId = `${from}_${type}_${to}`
    const relationship = {
      id: relationshipId,
      from,
      to,
      type,
      properties: properties || {},
      createdAt: new Date().toISOString()
    }

    await (this as any).set(relationshipId, relationship as T)
  }

  /**
   * Get entity by ID
   */
  async getEntity(id: string): Promise<T | undefined> {
    return (this as any).get(id)
  }

  /**
   * Get relationships for an entity
   */
  async getRelationships(entityId: string): Promise<T[]> {
    const relationships: T[] = []

    try {
      // Iterate through all entries to find relationships
      for await (const [key, value] of (this as any).entries()) {
        const entity = value as any
        if (entity.from === entityId || entity.to === entityId) {
          relationships.push(value)
        }
      }
    } catch (error) {
      // Ignore iteration errors
    }

    return relationships
  }
}

/**
 * Enhanced DuckDBStorageAdapter with semantic operations
 */
class EnhancedDuckDBAdapter<T = any> extends DuckDBStorageAdapter<T> implements SemanticStorage<T> {
  /**
   * Search functionality using SQL queries
   */
  async search(query: string, options: SearchOptions = {}): Promise<T[]> {
    // For now, implement a simple text search
    const results: T[] = []
    const limit = options.limit || 100
    const offset = options.offset || 0
    let count = 0
    let skipped = 0

    for await (const [key, value] of this.entries()) {
      if (skipped < offset) {
        skipped++
        continue
      }

      if (count >= limit) {
        break
      }

      // Simple text matching
      const valueStr = JSON.stringify(value).toLowerCase()
      if (valueStr.includes(query.toLowerCase())) {
        results.push(value)
        count++
      }
    }

    return results
  }

  /**
   * Aggregate operations
   */
  async aggregate(operation: AggregateOperation): Promise<any> {
    const values: any[] = []

    for await (const value of this.values()) {
      values.push(value)
    }

    switch (operation.type) {
      case 'count':
        return values.length

      case 'sum':
        if (!operation.field) throw new Error('Field required for sum operation')
        return values.reduce((sum, item) => sum + (Number(item[operation.field!]) || 0), 0)

      case 'avg':
        if (!operation.field) throw new Error('Field required for avg operation')
        const sum = values.reduce((sum, item) => sum + (Number(item[operation.field!]) || 0), 0)
        return values.length > 0 ? sum / values.length : 0

      case 'min':
        if (!operation.field) throw new Error('Field required for min operation')
        return Math.min(...values.map(item => Number(item[operation.field!]) || 0))

      case 'max':
        if (!operation.field) throw new Error('Field required for max operation')
        return Math.max(...values.map(item => Number(item[operation.field!]) || 0))

      default:
        throw new Error(`Unsupported aggregate operation: ${operation.type}`)
    }
  }

  /**
   * Create materialized view (simplified implementation)
   */
  async createView(name: string, query: string): Promise<void> {
    // Store view definition
    await this.set(`__view_${name}`, { name, query, createdAt: new Date().toISOString() } as T)
  }

  /**
   * Refresh materialized view
   */
  async refreshView(name: string): Promise<void> {
    // In a full implementation, this would re-execute the view query
    // For now, just update the timestamp
    const view = await this.get(`__view_${name}`)
    if (view) {
      (view as any).lastRefreshed = new Date().toISOString()
      await this.set(`__view_${name}`, view)
    }
  }

  /**
   * Get materialized view data
   */
  async getView(name: string): Promise<T[]> {
    // For now, return empty array
    // In a full implementation, this would return the view's computed data
    return []
  }

  /**
   * Create index (no-op for DuckDB adapter)
   */
  async createIndex(fields: string[]): Promise<void> {
    // DuckDB handles indexing automatically
    if (this.config.debug) {
      logger.debug(`Index creation requested for fields: ${fields.join(', ')}`)
    }
  }

  /**
   * Drop index (no-op for DuckDB adapter)
   */
  async dropIndex(fields: string[]): Promise<void> {
    // DuckDB handles indexing automatically
    if (this.config.debug) {
      logger.debug(`Index removal requested for fields: ${fields.join(', ')}`)
    }
  }
}

/**
 * Local Storage Provider Implementation
 */
export class LocalStorageProvider implements IStorageProvider {
  private primaryAdapter: EnhancedKuzuAdapter | null = null
  private semanticAdapter: EnhancedDuckDBAdapter | null = null
  private config: LocalStorageConfig
  private initialized = false

  constructor(config: LocalStorageConfig) {
    this.config = config
  }

  /**
   * Get primary storage instance
   */
  get primary(): PrimaryStorage {
    if (!this.primaryAdapter) {
      throw new Error('LocalStorageProvider not initialized')
    }
    return this.primaryAdapter
  }

  /**
   * Get semantic storage instance
   */
  get semantic(): SemanticStorage {
    if (!this.semanticAdapter) {
      throw new Error('LocalStorageProvider not initialized')
    }
    return this.semanticAdapter
  }

  /**
   * Initialize the storage provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Initialize primary storage (Kuzu)
      this.primaryAdapter = new (EnhancedKuzuAdapter as any)({
        type: 'kuzu',
        database: this.config.primary.database,
        readOnly: this.config.primary.readOnly || false,
        debug: this.config.debug || false
      })

      // Initialize semantic storage (DuckDB)
      this.semanticAdapter = new EnhancedDuckDBAdapter({
        type: 'duckdb',
        database: this.config.semantic.database,
        threads: this.config.semantic.threads,
        options: {
          max_memory: this.config.semantic.memoryLimit
        },
        debug: this.config.debug || false
      })

      this.initialized = true

      if (this.config.debug) {
        logger.debug('Local storage provider initialized', {
          primary: this.config.primary.database,
          semantic: this.config.semantic.database
        })
      }
    } catch (error) {
      throw new Error(`Failed to initialize local storage provider: ${(error as any).message}`)
    }
  }

  /**
   * Close storage connections
   */
  async close(): Promise<void> {
    if (this.primaryAdapter) {
      await (this.primaryAdapter as any).close?.()
      this.primaryAdapter = null
    }

    if (this.semanticAdapter) {
      await (this.semanticAdapter as any).close?.()
      this.semanticAdapter = null
    }

    this.initialized = false

    if (this.config.debug) {
      logger.debug('Local storage provider closed')
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false
    }

    try {
      // Test primary storage
      await this.primary.size()

      // Test semantic storage
      await this.semantic.size()

      return true
    } catch (error) {
      if (this.config.debug) {
        logger.debug('Health check failed:', (error as any).message)
      }
      return false
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<StorageProviderStatus> {
    const healthy = await this.healthCheck()

    return {
      type: 'local',
      healthy,
      primaryReady: this.primaryAdapter !== null,
      semanticReady: this.semanticAdapter !== null,
      uptime: process.uptime()
    }
  }
}