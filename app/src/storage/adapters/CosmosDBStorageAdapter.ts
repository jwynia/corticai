/**
 * Azure CosmosDB Storage Adapter
 *
 * Implementation of storage adapter using Azure CosmosDB as the backend.
 * Provides NoSQL document storage with global distribution, elastic scaling,
 * and multiple consistency models for cloud-native applications.
 */

import { CosmosClient, Container, Database, ItemResponse, FeedResponse, SqlQuerySpec, PatchOperation, PartitionKeyKind } from '@azure/cosmos'
import { BaseStorageAdapter } from '../base/BaseStorageAdapter'
import { CosmosDBStorageConfig, StorageError, StorageErrorCode, Operation, BatchResult } from '../interfaces/Storage'
import { Logger } from '../../utils/Logger'

// Create logger for CosmosDB adapter
const logger = Logger.createConsoleLogger('CosmosDBStorageAdapter')

/**
 * Document structure for storing key-value pairs in CosmosDB
 */
interface StorageDocument {
  id: string          // Document ID (same as key)
  key: string         // Storage key (for queries)
  value: any          // Stored value
  _ts?: number        // CosmosDB timestamp
  _etag?: string      // CosmosDB etag
  entityType?: string // Partition key
}

/**
 * Azure CosmosDB Storage Adapter
 *
 * Features:
 * - NoSQL document storage with JSON support
 * - Global distribution and elastic scaling
 * - Multiple consistency models
 * - Automatic indexing and query optimization
 * - Request Unit (RU) cost optimization
 * - Retry logic for transient failures
 * - Batch operations for efficiency
 */
export class CosmosDBStorageAdapter<T = any> extends BaseStorageAdapter<T> {
  protected config: CosmosDBStorageConfig
  private client: CosmosClient | null = null
  private database: Database | null = null
  protected container: Container | null = null
  private isLoaded = false
  private ensureLoadedMutex = Promise.resolve()

  constructor(config: CosmosDBStorageConfig) {
    super(config)

    // Validate required configuration
    this.validateConfig(config)

    this.config = {
      partitionKey: '/entityType',
      consistencyLevel: 'Session',
      connectionPolicy: {
        maxRetryAttempts: 3,
        maxRetryWaitTime: 30000,
        enableEndpointDiscovery: true
      },
      ...config
    }

    if (this.config.debug) {
      logger.debug(`Initializing CosmosDB adapter`, {
        database: this.config.database,
        container: this.config.container,
        consistencyLevel: this.config.consistencyLevel
      })
    }
  }

  /**
   * Validate CosmosDB configuration
   */
  private validateConfig(config: CosmosDBStorageConfig): void {
    if (!config.database) {
      throw new StorageError(
        'Database name is required for CosmosDB storage',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    if (!config.container) {
      throw new StorageError(
        'Container name is required for CosmosDB storage',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    // Must have either connection string or endpoint+key
    if (!config.connectionString && (!config.endpoint || !config.key)) {
      throw new StorageError(
        'Either connectionString or both endpoint and key are required for CosmosDB storage',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Initialize CosmosDB client and ensure database/container exist
   */
  protected async ensureLoaded(): Promise<void> {
    return this.ensureLoadedMutex = this.ensureLoadedMutex.then(async () => {
      if (this.isLoaded) {
        return
      }

      try {
        // Initialize CosmosDB client
        await this.initializeClient()

        // Ensure database exists
        await this.ensureDatabase()

        // Ensure container exists
        await this.ensureContainer()

        this.isLoaded = true

        if (this.config.debug) {
          logger.debug('CosmosDB adapter loaded successfully')
        }
      } catch (error: any) {
        throw new StorageError(
          `Failed to initialize CosmosDB adapter: ${error.message}`,
          StorageErrorCode.CONNECTION_FAILED,
          { originalError: error, config: this.config }
        )
      }
    })
  }

  /**
   * Initialize CosmosDB client with configuration
   */
  private async initializeClient(): Promise<void> {
    try {
      if (this.config.connectionString) {
        // Use connection string
        this.client = new CosmosClient({
          connectionString: this.config.connectionString,
          consistencyLevel: this.config.consistencyLevel,
          connectionPolicy: this.config.connectionPolicy
        })
      } else if (this.config.auth?.type === 'managed-identity' || this.config.auth?.type === 'default-azure-credential') {
        // Use Azure credential authentication (requires @azure/identity package)
        try {
          const { DefaultAzureCredential } = await import('@azure/identity')
          const credential = new DefaultAzureCredential()

          this.client = new CosmosClient({
            endpoint: this.config.endpoint!,
            aadCredentials: credential,
            consistencyLevel: this.config.consistencyLevel,
            connectionPolicy: this.config.connectionPolicy
          })
        } catch (importError) {
          throw new Error('@azure/identity package is required for managed identity authentication')
        }
      } else {
        // Use endpoint + key
        this.client = new CosmosClient({
          endpoint: this.config.endpoint!,
          key: this.config.key!,
          consistencyLevel: this.config.consistencyLevel,
          connectionPolicy: this.config.connectionPolicy
        })
      }

      if (this.config.debug) {
        logger.debug('CosmosDB client initialized')
      }
    } catch (error: any) {
      throw new StorageError(
        `Failed to initialize CosmosDB client: ${error.message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { originalError: error }
      )
    }
  }

  /**
   * Ensure database exists
   */
  private async ensureDatabase(): Promise<void> {
    if (!this.client) {
      throw new StorageError('CosmosDB client not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const { database } = await this.client.databases.createIfNotExists({
        id: this.config.database,
        throughput: this.config.throughput?.type === 'manual' ? this.config.throughput.value : undefined
      })

      this.database = database

      if (this.config.debug) {
        logger.debug(`Database "${this.config.database}" ready`)
      }
    } catch (error: any) {
      throw new StorageError(
        `Failed to create or access database: ${error.message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { originalError: error, database: this.config.database }
      )
    }
  }

  /**
   * Ensure container exists with proper partition key and indexing
   */
  private async ensureContainer(): Promise<void> {
    if (!this.database) {
      throw new StorageError('Database not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const containerDef = {
        id: this.config.container,
        partitionKey: {
          paths: [this.config.partitionKey!],
          kind: PartitionKeyKind.Hash
        },
        indexingPolicy: {
          indexingMode: 'consistent' as const,
          automatic: true,
          includedPaths: [
            { path: '/key/?' },
            { path: '/entityType/?' },
            { path: '/_ts/?' }
          ],
          excludedPaths: [
            { path: '/value/*' }  // Exclude value content from indexing to save RUs
          ]
        }
      }

      const throughputOptions = this.config.throughput?.type === 'autoscale'
        ? { maxThroughput: this.config.throughput.value }
        : this.config.throughput?.type === 'manual'
          ? { throughput: this.config.throughput.value }
          : undefined

      const { container } = await this.database.containers.createIfNotExists(
        containerDef,
        throughputOptions as any
      )

      this.container = container

      if (this.config.debug) {
        logger.debug(`Container "${this.config.container}" ready`)
      }
    } catch (error: any) {
      throw new StorageError(
        `Failed to create or access container: ${error.message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { originalError: error, container: this.config.container }
      )
    }
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  /**
   * Save current state - no-op for CosmosDB as it's always persistent
   */
  protected async persist(): Promise<void> {
    // CosmosDB is always persistent, no action needed
  }

  // ============================================================================
  // STORAGE INTERFACE IMPLEMENTATION
  // ============================================================================

  /**
   * Retrieve a value by key
   */
  async get(key: string): Promise<T | undefined> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const itemRef = this.container.item(key, this.getPartitionKeyValue(key))
      const { resource } = await itemRef.read<StorageDocument>()
      return resource?.value as T
    } catch (error: any) {
      if (error.code === 404) {
        return undefined
      }

      throw new StorageError(
        `Failed to get item: ${(error as any).message}`,
        StorageErrorCode.QUERY_FAILED,
        { key, originalError: error }
      )
    }
  }

  /**
   * Store a value with a key
   */
  async set(key: string, value: T): Promise<void> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const document: StorageDocument = {
        id: key,
        key,
        value,
        entityType: this.getPartitionKeyValue(key)
      }

      await this.container.items.upsert(document)

      if (this.config.debug) {
        logger.debug(`Set key: ${key}`)
      }
    } catch (error: any) {
      throw new StorageError(
        `Failed to set item: ${error.message}`,
        StorageErrorCode.WRITE_FAILED,
        { key, originalError: error }
      )
    }
  }

  /**
   * Delete a key-value pair
   */
  async delete(key: string): Promise<boolean> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      await this.container.item(key, this.getPartitionKeyValue(key)).delete()

      if (this.config.debug) {
        logger.debug(`Deleted key: ${key}`)
      }

      return true
    } catch (error: any) {
      if (error.code === 404) {
        return false
      }

      throw new StorageError(
        `Failed to delete item: ${(error as any).message}`,
        StorageErrorCode.DELETE_FAILED,
        { key, originalError: error }
      )
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== undefined
  }

  /**
   * Remove all key-value pairs
   */
  async clear(): Promise<void> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      // Get all items and delete them
      const querySpec: SqlQuerySpec = {
        query: 'SELECT c.id, c.entityType FROM c'
      }

      const { resources } = await this.container.items.query(querySpec).fetchAll()

      // Delete in batches to avoid RU limits
      const batchSize = 100
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize)
        await Promise.all(
          batch.map(item =>
            this.container!.item(item.id, item.entityType).delete().catch((error: any) => {
              // Only ignore 404 errors (item already deleted)
              // Log other errors for debugging
              if (error.code !== 404) {
                if (this.config.debug) {
                  logger.debug(`Failed to delete item ${item.id} during clear: ${error.message}`)
                }
              }
            })
          )
        )
      }

      if (this.config.debug) {
        logger.debug(`Cleared ${resources.length} items`)
      }
    } catch (error: any) {
      throw new StorageError(
        `Failed to clear container: ${error.message}`,
        StorageErrorCode.DELETE_FAILED,
        { originalError: error }
      )
    }
  }

  /**
   * Get the number of stored items
   */
  async size(): Promise<number> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const querySpec: SqlQuerySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c'
      }

      const { resources } = await this.container.items.query(querySpec).fetchAll()
      return resources[0] || 0
    } catch (error: any) {
      throw new StorageError(
        `Failed to get container size: ${error.message}`,
        StorageErrorCode.QUERY_FAILED,
        { originalError: error }
      )
    }
  }

  // ============================================================================
  // ITERATOR IMPLEMENTATIONS
  // ============================================================================

  /**
   * Iterate over all keys
   */
  async* keys(): AsyncIterable<string> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const querySpec: SqlQuerySpec = {
        query: 'SELECT c.key FROM c'
      }

      const iterator = this.container.items.query(querySpec)
      let response: FeedResponse<any>

      do {
        response = await iterator.fetchNext()
        for (const item of response.resources) {
          yield item.key
        }
      } while (response.continuationToken)
    } catch (error: any) {
      throw new StorageError(
        `Failed to iterate keys: ${error.message}`,
        StorageErrorCode.QUERY_FAILED,
        { originalError: error }
      )
    }
  }

  /**
   * Iterate over all values
   */
  async* values(): AsyncIterable<T> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const querySpec: SqlQuerySpec = {
        query: 'SELECT c.value FROM c'
      }

      const iterator = this.container.items.query(querySpec)
      let response: FeedResponse<any>

      do {
        response = await iterator.fetchNext()
        for (const item of response.resources) {
          yield item.value as T
        }
      } while (response.continuationToken)
    } catch (error: any) {
      throw new StorageError(
        `Failed to iterate values: ${error.message}`,
        StorageErrorCode.QUERY_FAILED,
        { originalError: error }
      )
    }
  }

  /**
   * Iterate over all entries
   */
  async* entries(): AsyncIterable<[string, T]> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      const querySpec: SqlQuerySpec = {
        query: 'SELECT c.key, c.value FROM c'
      }

      const iterator = this.container.items.query(querySpec)
      let response: FeedResponse<any>

      do {
        response = await iterator.fetchNext()
        for (const item of response.resources) {
          yield [item.key, item.value as T]
        }
      } while (response.continuationToken)
    } catch (error: any) {
      throw new StorageError(
        `Failed to iterate entries: ${error.message}`,
        StorageErrorCode.QUERY_FAILED,
        { originalError: error }
      )
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Retrieve multiple values at once
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    const result = new Map<string, T>()

    try {
      // Use parallel reads for better performance
      const promises = keys.map(async (key) => {
        try {
          const value = await this.get(key)
          if (value !== undefined) {
            result.set(key, value)
          }
        } catch (error) {
          // Continue on individual failures
          if (this.config.debug) {
            logger.debug(`Failed to get key ${key}:`, error as any)
          }
        }
      })

      await Promise.all(promises)
      return result
    } catch (error: any) {
      throw new StorageError(
        `Failed to get multiple items: ${error.message}`,
        StorageErrorCode.QUERY_FAILED,
        { keys, originalError: error }
      )
    }
  }

  /**
   * Store multiple key-value pairs
   */
  async setMany(entries: Map<string, T>): Promise<void> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    try {
      // Use parallel writes for better performance
      const promises = Array.from(entries.entries()).map(([key, value]) =>
        this.set(key, value)
      )

      await Promise.all(promises)

      if (this.config.debug) {
        logger.debug(`Set ${entries.size} items`)
      }
    } catch (error: any) {
      throw new StorageError(
        `Failed to set multiple items: ${error.message}`,
        StorageErrorCode.WRITE_FAILED,
        { entryCount: entries.size, originalError: error }
      )
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    await this.ensureLoaded()

    if (!this.container) {
      throw new StorageError('Container not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    let deletedCount = 0

    try {
      // Use parallel deletes for better performance
      const promises = keys.map(async (key) => {
        try {
          const deleted = await this.delete(key)
          if (deleted) {
            deletedCount++
          }
        } catch (error) {
          // Continue on individual failures
          if (this.config.debug) {
            logger.debug(`Failed to delete key ${key}:`, error as any)
          }
        }
      })

      await Promise.all(promises)
      return deletedCount
    } catch (error: any) {
      throw new StorageError(
        `Failed to delete multiple items: ${error.message}`,
        StorageErrorCode.DELETE_FAILED,
        { keys, originalError: error }
      )
    }
  }

  /**
   * Perform multiple operations atomically
   */
  async batch(operations: Operation<T>[]): Promise<BatchResult> {
    await this.ensureLoaded()

    const result: BatchResult = {
      success: true,
      operations: operations.length,
      errors: []
    }

    try {
      // CosmosDB doesn't support true cross-partition transactions
      // We'll execute operations in sequence for consistency
      for (const operation of operations) {
        try {
          switch (operation.type) {
            case 'set':
              await this.set(operation.key, operation.value)
              break
            case 'delete':
              await this.delete(operation.key)
              break
            case 'clear':
              await this.clear()
              break
          }
        } catch (error) {
          result.success = false
          result.errors = result.errors || []
          result.errors.push(error as Error)
        }
      }

      if (this.config.debug) {
        logger.debug(`Batch completed: ${operations.length} operations, ${result.errors?.length || 0} errors`)
      }

      return result
    } catch (error: any) {
      throw new StorageError(
        `Failed to execute batch operations: ${error.message}`,
        StorageErrorCode.WRITE_FAILED,
        { operationCount: operations.length, originalError: error }
      )
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get partition key value for a given storage key
   * Uses a simple hash of the key to distribute load
   */
  private getPartitionKeyValue(key: string): string {
    // Simple hash to distribute keys across partitions
    // In a real implementation, you might want more sophisticated partitioning
    const hash = key.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)

    return `partition_${hash % 10}`  // 10 partitions
  }

  /**
   * Close connections and cleanup resources
   */
  async close(): Promise<void> {
    // CosmosDB client doesn't require explicit cleanup
    this.client = null
    this.database = null
    this.container = null
    this.isLoaded = false

    if (this.config.debug) {
      logger.debug('CosmosDB adapter closed')
    }
  }
}