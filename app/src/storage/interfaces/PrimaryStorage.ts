/**
 * Primary Storage Interface
 *
 * Defines the contract for the Primary Storage role in CorticAI's dual-role
 * storage architecture. Primary Storage handles graph operations, flexible
 * schema data, and real-time ingestion.
 *
 * ## Dual-Role Architecture
 *
 * CorticAI separates storage concerns into two roles:
 * - **Primary Storage**: Graph relationships, flexible schema, real-time data
 * - **Semantic Storage**: Analytics, aggregations, typed projections
 *
 * This separation allows:
 * - Optimal backend selection for each role
 * - Independent scaling of graph vs analytics workloads
 * - Technology flexibility (local vs cloud, embedded vs server)
 *
 * ## Backend Options
 *
 * Primary Storage can be implemented by:
 * - **SurrealDB**: Multi-model embedded database (recommended)
 * - **Kuzu**: Embedded graph database (EOL, legacy)
 * - **Neo4j**: Enterprise graph database (server-based)
 * - **FalkorDB**: Cypher-compatible graph database
 * - **Azure Cosmos DB**: Cloud-native graph + document database
 *
 * @see GraphStorage - Graph operations interface
 * @see SemanticStorage - Complementary analytics role
 * @see dual-role-storage-architecture - Architecture documentation
 */

import { GraphStorage, GraphStorageConfig } from './GraphStorage'
import { GraphEntity, GraphNode } from '../types/GraphTypes'

/**
 * Primary Storage Interface
 *
 * Combines graph operations with flexible schema capabilities for
 * storing context networks, episodes, and relationships.
 *
 * Key Characteristics:
 * - **Schema Flexibility**: Can store any data structure via JSON properties
 * - **Graph Native**: Optimized for relationship traversal and pattern matching
 * - **Real-Time Ingestion**: High write throughput for streaming data
 * - **Relationship Discovery**: Efficient queries for finding connections
 * - **Universal Patterns**: Works across all context networks
 *
 * @template T Entity type (defaults to GraphEntity for maximum flexibility)
 */
export interface PrimaryStorage<T extends GraphEntity = GraphEntity> extends GraphStorage<T> {
  // Inherits all GraphStorage operations: addNode, addEdge, traverse, etc.

  // ============================================================================
  // FLEXIBLE SCHEMA OPERATIONS
  // ============================================================================

  /**
   * Store any entity with flexible properties
   *
   * Unlike strict-schema systems, Primary Storage can store entities with
   * any structure. This enables storing diverse context network data without
   * pre-defined schemas.
   *
   * @param entity - Entity with arbitrary properties
   * @returns Promise resolving when stored
   *
   * @example
   * ```typescript
   * // Store different entity types without schema definition
   * await storage.storeEntity({
   *   id: 'file:123',
   *   type: 'File',
   *   properties: { path: '/src/index.ts', language: 'TypeScript' }
   * });
   *
   * await storage.storeEntity({
   *   id: 'concept:456',
   *   type: 'Concept',
   *   properties: { name: 'Dependency Injection', definition: '...' }
   * });
   * ```
   */
  storeEntity(entity: T): Promise<void>

  /**
   * Stream episode data for temporal analysis
   *
   * Episodes represent temporal events or state changes in the system.
   * Primary Storage optimizes for high-throughput episode ingestion.
   *
   * @param episodes - Array of episode entities to stream
   * @returns Promise resolving when episodes are stored
   *
   * @example
   * ```typescript
   * await storage.streamEpisodes([
   *   {
   *     id: 'episode:001',
   *     type: 'Episode',
   *     properties: {
   *       timestamp: '2025-10-13T10:00:00Z',
   *       action: 'file_modified',
   *       file: '/src/index.ts'
   *     }
   *   }
   * ]);
   * ```
   */
  streamEpisodes(episodes: T[]): Promise<void>

  /**
   * Find entities by pattern matching across properties
   *
   * Flexible query across any property without requiring indexes.
   * Useful for exploratory queries in context networks.
   *
   * @param pattern - Property pattern to match (supports wildcards, regex)
   * @returns Promise resolving to matching entities
   *
   * @example
   * ```typescript
   * // Find all TypeScript files
   * const tsFiles = await storage.findByPattern({
   *   type: 'File',
   *   'properties.language': 'TypeScript'
   * });
   *
   * // Pattern matching with wildcards
   * const testFiles = await storage.findByPattern({
   *   'properties.path': '*.test.ts'
   * });
   * ```
   */
  findByPattern(pattern: Record<string, any>): Promise<T[]>

  // ============================================================================
  // REAL-TIME OPERATIONS
  // ============================================================================

  /**
   * Subscribe to real-time updates for entities
   *
   * Optional feature for backends supporting real-time queries (e.g., SurrealDB).
   * Enables live updates as data changes.
   *
   * @param query - Query defining what to watch
   * @param callback - Function called when matching entities change
   * @returns Promise resolving to subscription ID for unsubscribing
   *
   * @example
   * ```typescript
   * const subId = await storage.subscribe(
   *   { type: 'File', 'properties.modified': { $gt: Date.now() } },
   *   (updated) => {
   *     console.log('File updated:', updated);
   *   }
   * );
   *
   * // Later: unsubscribe
   * await storage.unsubscribe(subId);
   * ```
   */
  subscribe?(query: Record<string, any>, callback: (entity: T) => void): Promise<string>

  /**
   * Unsubscribe from real-time updates
   *
   * @param subscriptionId - ID returned from subscribe()
   * @returns Promise resolving when unsubscribed
   */
  unsubscribe?(subscriptionId: string): Promise<void>

  // ============================================================================
  // CROSS-REFERENCE & NAVIGATION
  // ============================================================================

  /**
   * Create cross-reference index for fast navigation
   *
   * Indexes entity properties for fast lookup without requiring
   * explicit schema definition.
   *
   * @param entityType - Type of entity to index
   * @param property - Property path to index
   * @returns Promise resolving when index is created
   *
   * @example
   * ```typescript
   * // Create index on file paths for fast lookup
   * await storage.createIndex('File', 'properties.path');
   *
   * // Create index on concept names
   * await storage.createIndex('Concept', 'properties.name');
   * ```
   */
  createIndex(entityType: string, property: string): Promise<void>

  /**
   * List all indexes for a given entity type
   *
   * @param entityType - Type of entity
   * @returns Promise resolving to array of indexed properties
   */
  listIndexes(entityType: string): Promise<string[]>

  // ============================================================================
  // GRAPH-SPECIFIC EXTENSIONS
  // ============================================================================

  /**
   * Discover new relationships by analyzing entity properties
   *
   * Analyzes entity properties to find implicit relationships and
   * creates explicit graph edges for better traversal performance.
   *
   * @param entityTypes - Types of entities to analyze
   * @param rules - Rules for relationship discovery
   * @returns Promise resolving to number of relationships discovered
   *
   * @example
   * ```typescript
   * // Discover import relationships from file properties
   * const discovered = await storage.discoverRelationships(
   *   ['File'],
   *   {
   *     'properties.imports': {
   *       createEdge: { type: 'imports', to: 'properties.imports[*]' }
   *     }
   *   }
   * );
   * console.log(`Discovered ${discovered} import relationships`);
   * ```
   */
  discoverRelationships?(
    entityTypes: string[],
    rules: Record<string, any>
  ): Promise<number>
}

/**
 * Primary Storage Configuration
 *
 * Extends GraphStorageConfig with Primary Storage-specific options
 */
export interface PrimaryStorageConfig extends GraphStorageConfig {
  /** Connection string or database path */
  connectionString: string

  /** Database namespace (for multi-tenancy) */
  namespace?: string

  /** Database name */
  database: string

  /** Enable real-time subscriptions (if supported) */
  enableRealTime?: boolean

  /** Schema enforcement mode */
  schemaMode?: 'flexible' | 'enforced'

  /** Auto-create indexes on frequently queried properties */
  autoIndex?: boolean

  /** Maximum depth for relationship traversal */
  maxTraversalDepth?: number
}

/**
 * Type guard to check if a storage adapter implements Primary Storage
 *
 * @param storage - Storage adapter to check
 * @returns True if adapter implements PrimaryStorage interface
 */
export function isPrimaryStorage<T extends GraphEntity = GraphEntity>(
  storage: any
): storage is PrimaryStorage<T> {
  return (
    typeof storage?.storeEntity === 'function' &&
    typeof storage?.streamEpisodes === 'function' &&
    typeof storage?.findByPattern === 'function' &&
    typeof storage?.addNode === 'function' &&
    typeof storage?.traverse === 'function'
  )
}

/**
 * Primary Storage Factory Type
 *
 * Factory function signature for creating Primary Storage instances
 */
export type PrimaryStorageFactory<T extends GraphEntity = GraphEntity> = (
  config: PrimaryStorageConfig
) => Promise<PrimaryStorage<T>>
