/**
 * Kuzu Graph Database Storage Adapter
 *
 * Implementation of storage adapter using Kuzu graph database as the backend.
 * Provides graph-specific operations including nodes, edges, traversal, and path finding.
 *
 * Key Features:
 * - Graph database operations (nodes, edges, traversal)
 * - Extends BaseStorageAdapter for standard storage operations
 * - Cypher-like query capabilities
 * - Support for complex graph patterns and relationships
 * - High-performance graph analytics
 */

import { Database, Connection } from 'kuzu'
import { BaseStorageAdapter } from '../base/BaseStorageAdapter'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import { GraphStorage } from '../interfaces/GraphStorage'
import {
  GraphEntity,
  GraphNode,
  GraphEdge,
  GraphPath,
  TraversalPattern,
  KuzuStorageConfig,
  GraphQueryResult,
  GraphBatchOperation,
  GraphBatchResult,
  GraphStats
} from '../types/GraphTypes'
import { StorageValidator } from '../helpers/StorageValidator'
import {
  KuzuSecureQueryBuilder,
  executeSecureQueryWithMonitoring,
  QueryExecutionResult
} from './KuzuSecureQueryBuilder'
import { PerformanceMonitor } from '../../utils/PerformanceMonitor'
import * as fs from 'fs'
import * as path from 'path'
import * as KuzuQueryHelpers from './KuzuQueryHelpers'
import { KuzuStorageOperations } from './KuzuStorageOperations'
import { KuzuGraphOperations } from './KuzuGraphOperations'
import { KuzuSchemaManager } from './KuzuSchemaManager'
import { KuzuQueryExecutor } from './KuzuQueryExecutor'

// Default configuration constants
const DEFAULT_BUFFER_SIZE = 64 * 1024 * 1024 // 64MB in bytes
const DEFAULT_MAX_THREADS = 4
const DEFAULT_TIMEOUT_MS = 30000
const MIN_BUFFER_SIZE = 4 * 1024 // 4KB minimum

// Query limits and constraints
const DEFAULT_PATH_LIMIT = 100
const DEFAULT_CONNECTED_LIMIT = 1000
const DEFAULT_MAX_TRAVERSAL_DEPTH = 10

/**
 * Kuzu Storage Adapter
 *
 * Extends BaseStorageAdapter to provide graph database functionality using Kuzu.
 * Supports both traditional key-value operations and graph-specific operations.
 *
 * **IMPORTANT**: This adapter implements the GraphStorage interface, enabling
 * pluggable graph database backends. Kuzu is END-OF-LIFE (frozen Oct 2025).
 * This implementation serves as a reference for migrating to SurrealDB or other
 * graph databases.
 *
 * @implements {GraphStorage<GraphEntity>}
 * @see GraphStorage - Interface defining graph operations
 * @see SurrealDBStorageAdapter - Recommended replacement for Kuzu
 */
export class KuzuStorageAdapter
  extends BaseStorageAdapter<GraphEntity>
  implements GraphStorage<GraphEntity> {
  protected config: KuzuStorageConfig
  private db: Database | null = null
  private connection: Connection | null = null
  private secureQueryBuilder: KuzuSecureQueryBuilder | null = null
  private storageOps: KuzuStorageOperations | null = null
  private graphOps: KuzuGraphOperations | null = null
  private schemaManager: KuzuSchemaManager
  private queryExecutor: KuzuQueryExecutor | null = null
  private performanceMonitor: PerformanceMonitor
  private isLoaded = false
  private initMutex = Promise.resolve()

  constructor(config: KuzuStorageConfig) {
    super(config)

    // Validate configuration
    if (!config?.database) {
      throw new StorageError(
        'database path is required for Kuzu storage',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    if (typeof config.database !== 'string' || config.database.trim() === '') {
      throw new StorageError(
        'Database path must be a non-empty string',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    this.config = {
      autoCreate: true,
      readOnly: false,
      bufferPoolSize: DEFAULT_BUFFER_SIZE,
      maxNumThreads: DEFAULT_MAX_THREADS,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      ...config
    }

    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor({
      enabled: this.config.performanceMonitoring?.enabled ?? true,
      slowOperationThreshold: this.config.performanceMonitoring?.slowOperationThreshold ?? 100,
      maxMetricsHistory: this.config.performanceMonitoring?.maxMetricsHistory ?? 1000
    })

    // Initialize schema manager
    this.schemaManager = new KuzuSchemaManager({
      config: this.config,
      log: this.log.bind(this),
      logWarn: this.logWarn.bind(this)
    })

    if (this.config.debug) {
      this.log(`Initializing Kuzu adapter with database: ${this.config.database}`)
      this.log(`Performance monitoring: ${this.performanceMonitor.isEnabled() ? 'enabled' : 'disabled'}`)
    }
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS (BaseStorageAdapter)
  // ============================================================================

  /**
   * Initialize the Kuzu database connection and schema
   */
  protected async ensureLoaded(): Promise<void> {
    // Use mutex to prevent concurrent initialization
    this.initMutex = this.initMutex.then(async () => {
      if (this.isLoaded) {
        return
      }

      try {
        // Use schema manager for initialization
        const { db, connection } = await this.schemaManager.initialize()
        this.db = db
        this.connection = connection

        // Create schema
        await this.schemaManager.createSchema(connection)

        // Initialize secure query builder
        this.secureQueryBuilder = new KuzuSecureQueryBuilder(connection)

        // Initialize query executor
        this.queryExecutor = new KuzuQueryExecutor({
          connection,
          secureQueryBuilder: this.secureQueryBuilder,
          debug: this.config.debug
        })

        // Load existing data
        const existingData = await this.schemaManager.loadExistingData(connection)
        // Populate cache with existing data
        for (const [key, value] of existingData) {
          this.data.set(key, value)
        }

        // Initialize storage operations module
        if (this.connection && this.secureQueryBuilder) {
          this.storageOps = new KuzuStorageOperations({
            connection: this.connection,
            secureQueryBuilder: this.secureQueryBuilder,
            cache: this.data,
            config: this.config,
            executeSecureQuery: (sq) => this.queryExecutor!.executeSecureQuery(sq),
            log: this.log.bind(this),
            logWarn: this.logWarn.bind(this)
          })

          this.graphOps = new KuzuGraphOperations({
            connection: this.connection,
            secureQueryBuilder: this.secureQueryBuilder,
            cache: this.data,
            config: this.config,
            performanceMonitor: this.performanceMonitor,
            executeSecureQuery: (sq) => this.queryExecutor!.executeSecureQuery(sq),
            buildSecureQuery: (qt, ...args) => this.queryExecutor!.buildSecureQuery(qt, ...args),
            set: this.set.bind(this),
            log: this.log.bind(this),
            logWarn: this.logWarn.bind(this)
          })
        }

        this.isLoaded = true

        if (this.config.debug) {
          this.log('Database initialized successfully')
        }
      } catch (error) {
        this.logError('Failed to initialize database', error as Error)
        throw new StorageError(
          `Failed to initialize Kuzu database: ${error}`,
          StorageErrorCode.CONNECTION_FAILED,
          { database: this.config.database, error }
        )
      }
    })

    await this.initMutex
  }

  /**
   * Persist changes (Kuzu auto-commits, so this is a no-op)
   */
  protected async persist(): Promise<void> {
    // Kuzu auto-commits transactions, so no explicit persist needed
    // This method is required by BaseStorageAdapter but is essentially a no-op
    if (this.config.debug) {
      this.log('Persist called (auto-commit in Kuzu)')
    }
  }


  // ============================================================================
  // UTILITY METHODS (Delegated to KuzuQueryHelpers)
  // ============================================================================

  // These methods are now provided by KuzuQueryHelpers module
  // Keeping them as instance methods for backward compatibility with existing code

  // ============================================================================
  // OVERRIDDEN STORAGE METHODS
  // ============================================================================

  /**
   * Store entity in both memory cache and database
   */
  async set(key: string, value: GraphEntity): Promise<void> {
    return this.performanceMonitor.measure('storage.set', async () => {
      await this.ensureLoaded()

      if (!this.storageOps) {
        throw new StorageError('Storage operations not initialized', StorageErrorCode.CONNECTION_FAILED)
      }

      await this.storageOps.set(key, value)
    }, { operation: 'set', key, entityType: value.type })
  }

  /**
   * Delete entity from both memory cache and database
   */
  async delete(key: string): Promise<boolean> {
    return this.performanceMonitor.measure('storage.delete', async () => {
      await this.ensureLoaded()

      if (!this.storageOps) {
        throw new StorageError('Storage operations not initialized', StorageErrorCode.CONNECTION_FAILED)
      }

      return await this.storageOps.delete(key)
    }, { operation: 'delete', key })
  }

  /**
   * Clear all data from both memory cache and database
   */
  async clear(): Promise<void> {
    await this.ensureLoaded()

    if (!this.storageOps) {
      throw new StorageError('Storage operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    await this.storageOps.clear()
  }

  // ============================================================================
  // GRAPH-SPECIFIC OPERATIONS
  // ============================================================================

  /**
   * Add a node to the graph database
   */
  async addNode(node: GraphNode): Promise<string> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.addNode(node)
  }

  /**
   * Get a node by ID
   */
  async getNode(nodeId: string): Promise<GraphNode | null> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.getNode(nodeId)
  }

  /**
   * Add an edge between two nodes
   */
  async addEdge(edge: GraphEdge): Promise<void> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.addEdge(edge)
  }

  /**
   * Get all edges from a node
   * @param nodeId - The node ID to get edges from
   * @param edgeTypes - Optional array of edge types to filter by
   */
  async getEdges(nodeId: string, edgeTypes?: string[]): Promise<GraphEdge[]> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.getEdges(nodeId, edgeTypes)
  }

  /**
   * Traverse the graph according to a pattern
   * Executes graph traversal queries to find paths matching specified criteria
   */
  async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.traverse(pattern)
  }

  /**
   * Find nodes connected to a given node within specified depth
   * Uses breadth-first search to discover all reachable nodes up to N hops away
   */
  async findConnected(nodeId: string, depth: number): Promise<GraphNode[]> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.findConnected(nodeId, depth)
  }

  /**
   * Find shortest path between two nodes
   * Uses Kuzu's SHORTEST algorithm to find the optimal path between two nodes
   *
   * @param fromId - Starting node ID
   * @param toId - Target node ID
   * @param edgeTypes - Optional array of edge types to follow
   * @returns Promise resolving to the shortest path, or null if no path exists
   */
  async shortestPath(fromId: string, toId: string, edgeTypes?: string[]): Promise<GraphPath | null> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.shortestPath(fromId, toId, edgeTypes)
  }

  // ============================================================================
  // ADDITIONAL GRAPHSTORAGE INTERFACE METHODS
  // ============================================================================

  /**
   * Update a node's properties
   *
   * @param nodeId - The unique identifier of the node
   * @param properties - Partial properties to update (merged with existing)
   * @returns Promise resolving to true if updated, false if node not found
   */
  async updateNode(nodeId: string, properties: Partial<GraphNode['properties']>): Promise<boolean> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.updateNode(nodeId, properties)
  }

  /**
   * Delete a node from the graph
   * Also deletes all edges connected to this node
   *
   * @param nodeId - The unique identifier of the node to delete
   * @returns Promise resolving to true if deleted, false if node not found
   */
  async deleteNode(nodeId: string): Promise<boolean> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.deleteNode(nodeId)
  }

  /**
   * Query nodes by type and optional property filters
   *
   * @param type - Node type to filter by
   * @param properties - Optional property filters (AND logic)
   * @returns Promise resolving to array of matching nodes
   */
  async queryNodes(type: string, properties?: Record<string, any>): Promise<GraphNode[]> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.queryNodes(type, properties)
  }

  /**
   * Update an edge's properties
   *
   * @param from - Source node ID
   * @param to - Target node ID
   * @param type - Edge type
   * @param properties - Partial properties to update
   * @returns Promise resolving to true if updated, false if edge not found
   */
  async updateEdge(
    from: string,
    to: string,
    type: string,
    properties: Partial<GraphEdge['properties']>
  ): Promise<boolean> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.updateEdge(from, to, type, properties)
  }

  /**
   * Delete an edge between two nodes
   *
   * @param from - Source node ID
   * @param to - Target node ID
   * @param type - Edge type
   * @returns Promise resolving to true if deleted, false if edge not found
   */
  async deleteEdge(from: string, to: string, type: string): Promise<boolean> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.deleteEdge(from, to, type)
  }

  /**
   * Execute multiple graph operations in a batch
   *
   * @param operations - Array of operations to perform
   * @returns Promise resolving to batch result with success status and stats
   */
  async batchGraphOperations(operations: GraphBatchOperation[]): Promise<GraphBatchResult> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.batchGraphOperations(operations)
  }

  /**
   * Get statistics about the graph
   *
   * @returns Promise resolving to graph statistics
   */
  async getGraphStats(): Promise<GraphStats> {
    await this.ensureLoaded()

    if (!this.graphOps) {
      throw new StorageError('Graph operations not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return await this.graphOps.getGraphStats()
  }

  /**
   * Execute a native Cypher query (Kuzu-specific)
   *
   * Allows execution of raw Cypher queries for advanced use cases.
   * Note: This reduces portability to other graph databases.
   *
   * @param query - Cypher query string
   * @param params - Optional query parameters
   * @returns Promise resolving to query result
   */
  async executeQuery(query: string, params?: Record<string, any>): Promise<GraphQueryResult> {
    await this.ensureLoaded()

    if (!this.queryExecutor) {
      throw new StorageError('Query executor not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return this.queryExecutor.executeQuery(query, params)
  }

  /**
   * Execute operations in a transaction
   *
   * Note: Kuzu auto-commits, so this provides logical transaction semantics
   * but not true ACID isolation
   *
   * @param fn - Function containing operations to execute
   * @returns Promise resolving to the function's return value
   */
  async transaction<R>(fn: () => Promise<R>): Promise<R> {
    await this.ensureLoaded()

    if (!this.queryExecutor) {
      throw new StorageError('Query executor not initialized', StorageErrorCode.CONNECTION_FAILED)
    }

    return this.queryExecutor.transaction(fn)
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.schemaManager.close()
    this.connection = null
    this.db = null
    this.isLoaded = false
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Get the performance monitor instance for direct access
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor
  }

  /**
   * Check if performance monitoring is enabled
   */
  isPerformanceMonitoringEnabled(): boolean {
    return this.performanceMonitor.isEnabled()
  }

  /**
   * Enable or disable performance monitoring
   */
  setPerformanceMonitoring(enabled: boolean): void {
    if (enabled) {
      this.performanceMonitor.enable()
    } else {
      this.performanceMonitor.disable()
    }
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics(operation: string): any {
    return this.performanceMonitor.getMetrics(operation)
  }

  /**
   * Get all performance metrics
   */
  getPerformanceMetrics(): any {
    return this.performanceMonitor.getAllMetrics()
  }

  /**
   * Clear all performance metrics or metrics for a specific operation
   */
  clearPerformanceMetrics(operation?: string): void {
    // TODO: Implement clear() or clearOperation() methods on PerformanceMonitor
    if (operation) {
      // Clear specific operation metrics - not implemented in PerformanceMonitor yet
      // For now, do nothing
    } else {
      // Clear all metrics - create a new instance
      this.performanceMonitor = new PerformanceMonitor({
        enabled: this.performanceMonitor.isEnabled()
      })
    }
  }

}