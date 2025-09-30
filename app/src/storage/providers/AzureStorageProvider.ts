/**
 * Azure Storage Provider
 *
 * Implements the storage provider interface using Azure CosmosDB for both
 * primary and semantic storage roles. Provides cloud-native storage with
 * global distribution and elastic scaling.
 */

import { CosmosDBStorageAdapter } from '../adapters/CosmosDBStorageAdapter'
import {
  IStorageProvider,
  PrimaryStorage,
  SemanticStorage,
  StorageProviderConfig,
  StorageProviderStatus,
  SearchOptions,
  AggregateOperation
} from './IStorageProvider'
import { CosmosDBStorageConfig } from '../interfaces/Storage'
import { Logger } from '../../utils/Logger'

const logger = Logger.createConsoleLogger('AzureStorageProvider')

/**
 * Configuration for Azure storage provider
 */
export interface AzureStorageConfig extends StorageProviderConfig {
  type: 'azure'
  primary: CosmosDBStorageConfig    // Primary storage configuration
  semantic: CosmosDBStorageConfig   // Semantic storage configuration
}

/**
 * Enhanced CosmosDB adapter for primary storage with graph operations
 */
class PrimaryCosmosDBAdapter<T = any> extends CosmosDBStorageAdapter<T> implements PrimaryStorage<T> {
  protected async persist(): Promise<void> {
    // CosmosDB is always persistent, no action needed
  }
  /**
   * Traverse graph relationships using CosmosDB queries
   */
  async traverse(sourceId: string, relationshipType?: string, maxDepth: number = 3): Promise<T[]> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new Error('Container not initialized')
    }

    try {
      // Build query to find connected entities
      let query = `
        SELECT * FROM c
        WHERE c.id = @sourceId
      `

      const parameters = [
        { name: '@sourceId', value: sourceId }
      ]

      // Add relationship type filter if specified
      if (relationshipType) {
        query += ` OR (c.type = @relationshipType AND (c.from = @sourceId OR c.to = @sourceId))`
        parameters.push({ name: '@relationshipType', value: relationshipType })
      }

      const { resources } = await this.container.items.query({
        query,
        parameters
      }).fetchAll()

      return resources.map(resource => resource.value as T)
    } catch (error) {
      logger.error('Failed to traverse graph:', (error as any).message)
      return []
    }
  }

  /**
   * Find connected entities
   */
  async findConnected(entityId: string, connectionType?: string): Promise<T[]> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new Error('Container not initialized')
    }

    try {
      let query = `
        SELECT * FROM c
        WHERE c.from = @entityId OR c.to = @entityId
      `

      const parameters = [
        { name: '@entityId', value: entityId }
      ]

      if (connectionType) {
        query += ` AND c.type = @connectionType`
        parameters.push({ name: '@connectionType', value: connectionType })
      }

      const { resources } = await this.container.items.query({
        query,
        parameters
      }).fetchAll()

      return resources.map(resource => resource.value as T)
    } catch (error) {
      logger.error('Failed to find connected entities:', (error as any).message)
      return []
    }
  }

  /**
   * Add entity with graph metadata
   */
  async addEntity(entity: T): Promise<void> {
    const id = (entity as any).id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Add graph metadata
    const enhancedEntity = {
      ...entity,
      id,
      entityType: (entity as any).type || 'entity',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.set(id, enhancedEntity as T)
  }

  /**
   * Add relationship between entities
   */
  async addRelationship(from: string, to: string, type: string, properties?: any): Promise<void> {
    const relationshipId = `rel_${from}_${type}_${to}_${Date.now()}`
    const relationship = {
      id: relationshipId,
      from,
      to,
      type,
      properties: properties || {},
      entityType: 'relationship',
      createdAt: new Date().toISOString()
    }

    await this.set(relationshipId, relationship as T)
  }

  /**
   * Get entity by ID
   */
  async getEntity(id: string): Promise<T | undefined> {
    return this.get(id)
  }

  /**
   * Get relationships for an entity
   */
  async getRelationships(entityId: string): Promise<T[]> {
    return this.findConnected(entityId)
  }
}

/**
 * Enhanced CosmosDB adapter for semantic storage with search and analytics
 */
class SemanticCosmosDBAdapter<T = any> extends CosmosDBStorageAdapter<T> implements SemanticStorage<T> {
  protected async persist(): Promise<void> {
    // CosmosDB is always persistent, no action needed
  }
  /**
   * Full-text search using CosmosDB queries
   */
  async search(query: string, options: SearchOptions = {}): Promise<T[]> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new Error('Container not initialized')
    }

    try {
      const limit = options.limit || 100
      const offset = options.offset || 0

      // Build search query - CosmosDB supports CONTAINS for text search
      let sqlQuery = `
        SELECT * FROM c
        WHERE CONTAINS(LOWER(ToString(c.value)), LOWER(@searchTerm))
        ORDER BY c._ts DESC
        OFFSET @offset LIMIT @limit
      `

      const parameters = [
        { name: '@searchTerm', value: query },
        { name: '@offset', value: offset },
        { name: '@limit', value: limit }
      ]

      // Add field-specific filters if specified
      if (options.fields && options.fields.length > 0) {
        const fieldConditions = options.fields.map((field, index) => {
          parameters.push({ name: `@field${index}`, value: field })
          return `CONTAINS(LOWER(ToString(c.value["${field}"])), LOWER(@searchTerm))`
        }).join(' OR ')

        sqlQuery = `
          SELECT * FROM c
          WHERE (${fieldConditions})
          ORDER BY c._ts DESC
          OFFSET @offset LIMIT @limit
        `
      }

      const { resources } = await this.container.items.query({
        query: sqlQuery,
        parameters
      }).fetchAll()

      return resources.map(resource => resource.value as T)
    } catch (error) {
      logger.error('Search failed:', (error as any).message)
      return []
    }
  }

  /**
   * Aggregate operations using CosmosDB SQL
   */
  async aggregate(operation: AggregateOperation): Promise<any> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new Error('Container not initialized')
    }

    try {
      let query: string
      const parameters: any[] = []

      switch (operation.type) {
        case 'count':
          query = 'SELECT VALUE COUNT(1) FROM c'
          break

        case 'sum':
          if (!operation.field) throw new Error('Field required for sum operation')
          query = `SELECT VALUE SUM(c.value["${operation.field}"]) FROM c`
          break

        case 'avg':
          if (!operation.field) throw new Error('Field required for avg operation')
          query = `SELECT VALUE AVG(c.value["${operation.field}"]) FROM c`
          break

        case 'min':
          if (!operation.field) throw new Error('Field required for min operation')
          query = `SELECT VALUE MIN(c.value["${operation.field}"]) FROM c`
          break

        case 'max':
          if (!operation.field) throw new Error('Field required for max operation')
          query = `SELECT VALUE MAX(c.value["${operation.field}"]) FROM c`
          break

        case 'group':
          if (!operation.groupBy || operation.groupBy.length === 0) {
            throw new Error('groupBy fields required for group operation')
          }
          const groupFields = operation.groupBy.map(field => `c.value["${field}"]`).join(', ')
          query = `SELECT ${groupFields}, COUNT(1) as count FROM c GROUP BY ${groupFields}`
          break

        default:
          throw new Error(`Unsupported aggregate operation: ${operation.type}`)
      }

      const { resources } = await this.container.items.query({
        query,
        parameters
      }).fetchAll()

      return resources.length > 0 ? resources[0] : 0
    } catch (error) {
      logger.error('Aggregate operation failed:', (error as any).message)
      throw error
    }
  }

  /**
   * Create materialized view
   */
  async createView(name: string, query: string): Promise<void> {
    const viewDefinition = {
      id: `__view_${name}`,
      name,
      query,
      createdAt: new Date().toISOString(),
      entityType: 'view'
    }

    await this.set(`__view_${name}`, viewDefinition as T)
  }

  /**
   * Refresh materialized view
   */
  async refreshView(name: string): Promise<void> {
    const viewDef = await this.get(`__view_${name}`) as any

    if (!viewDef) {
      throw new Error(`View ${name} not found`)
    }

    // Execute the view query and store results
    try {
      const { resources } = await this.container!.items.query(viewDef.query).fetchAll()

      const viewData = {
        id: `__view_data_${name}`,
        viewName: name,
        data: resources.map(r => r.value),
        lastRefreshed: new Date().toISOString(),
        entityType: 'view_data'
      }

      await this.set(`__view_data_${name}`, viewData as T)

      // Update view definition timestamp
      viewDef.lastRefreshed = new Date().toISOString()
      await this.set(`__view_${name}`, viewDef)
    } catch (error) {
      logger.error(`Failed to refresh view ${name}:`, (error as any).message)
      throw error
    }
  }

  /**
   * Get materialized view data
   */
  async getView(name: string): Promise<T[]> {
    const viewData = await this.get(`__view_data_${name}`) as any

    if (!viewData) {
      return []
    }

    return viewData.data || []
  }

  /**
   * Create index (CosmosDB handles this automatically)
   */
  async createIndex(fields: string[]): Promise<void> {
    // CosmosDB automatically indexes based on indexing policy
    if (this.config.debug) {
      logger.debug(`Index creation requested for fields: ${fields.join(', ')} (handled automatically by CosmosDB)`)
    }
  }

  /**
   * Drop index (CosmosDB handles this automatically)
   */
  async dropIndex(fields: string[]): Promise<void> {
    // CosmosDB automatically manages indexes
    if (this.config.debug) {
      logger.debug(`Index removal requested for fields: ${fields.join(', ')} (handled automatically by CosmosDB)`)
    }
  }
}

/**
 * Azure Storage Provider Implementation
 */
export class AzureStorageProvider implements IStorageProvider {
  private primaryAdapter: PrimaryCosmosDBAdapter | null = null
  private semanticAdapter: SemanticCosmosDBAdapter | null = null
  private config: AzureStorageConfig
  private initialized = false

  constructor(config: AzureStorageConfig) {
    this.config = config
  }

  /**
   * Get primary storage instance
   */
  get primary(): PrimaryStorage {
    if (!this.primaryAdapter) {
      throw new Error('AzureStorageProvider not initialized')
    }
    return this.primaryAdapter
  }

  /**
   * Get semantic storage instance
   */
  get semantic(): SemanticStorage {
    if (!this.semanticAdapter) {
      throw new Error('AzureStorageProvider not initialized')
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
      // Initialize primary storage (CosmosDB for graph operations)
      this.primaryAdapter = new PrimaryCosmosDBAdapter(this.config.primary)

      // Initialize semantic storage (CosmosDB for analytics)
      this.semanticAdapter = new SemanticCosmosDBAdapter(this.config.semantic)

      this.initialized = true

      if (this.config.debug) {
        logger.debug('Azure storage provider initialized', {
          primaryContainer: this.config.primary.container,
          semanticContainer: this.config.semantic.container
        })
      }
    } catch (error) {
      throw new Error(`Failed to initialize Azure storage provider: ${(error as any).message}`)
    }
  }

  /**
   * Close storage connections
   */
  async close(): Promise<void> {
    if (this.primaryAdapter) {
      await this.primaryAdapter.close()
      this.primaryAdapter = null
    }

    if (this.semanticAdapter) {
      await this.semanticAdapter.close()
      this.semanticAdapter = null
    }

    this.initialized = false

    if (this.config.debug) {
      logger.debug('Azure storage provider closed')
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

    let latency: number | undefined

    if (healthy) {
      // Measure latency with a simple operation
      const start = Date.now()
      try {
        await this.primary.size()
        latency = Date.now() - start
      } catch (error) {
        // Ignore latency measurement errors
      }
    }

    return {
      type: 'azure',
      healthy,
      primaryReady: this.primaryAdapter !== null,
      semanticReady: this.semanticAdapter !== null,
      latency,
      uptime: process.uptime()
    }
  }
}