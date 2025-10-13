/**
 * Graph Storage Interface
 *
 * Defines the contract for graph database storage adapters, enabling
 * pluggable backends (Kuzu, SurrealDB, Neo4j, etc.) without changing
 * application code.
 *
 * This interface extends the base Storage interface with graph-specific
 * operations for nodes, edges, traversal, and path finding.
 *
 * @see Storage - Base key-value storage interface
 * @see GraphTypes - Type definitions for graph entities
 * @see PrimaryStorage - Role-based interface combining storage + graph
 */

import { Storage, BatchStorage } from './Storage'
import {
  GraphNode,
  GraphEdge,
  GraphPath,
  GraphEntity,
  TraversalPattern,
  GraphQueryResult,
  GraphBatchOperation,
  GraphBatchResult,
  GraphStats
} from '../types/GraphTypes'

/**
 * Graph Storage Interface
 *
 * Provides graph database operations including nodes, edges, traversal,
 * and path finding. Implementations must handle their specific query
 * languages (Cypher, SurrealQL, Gremlin, etc.) internally.
 *
 * Design Principles:
 * - **Backend Agnostic**: No assumptions about query language or storage format
 * - **Type Safe**: Strong typing for nodes, edges, and paths
 * - **Async First**: All operations return Promises
 * - **Performant**: Batch operations for efficiency
 * - **Extensible**: Easy to add backend-specific optimizations
 *
 * @template T The type of entities stored (typically GraphEntity or subtype)
 */
export interface GraphStorage<T extends GraphEntity = GraphEntity> extends BatchStorage<T> {
  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

  /**
   * Add a node to the graph
   *
   * @param node - The node to add with id, type, and properties
   * @returns Promise resolving to the node ID
   * @throws StorageError if node creation fails
   *
   * @example
   * ```typescript
   * const nodeId = await storage.addNode({
   *   id: 'person:alice',
   *   type: 'Person',
   *   properties: { name: 'Alice', age: 30 }
   * });
   * ```
   */
  addNode(node: GraphNode): Promise<string>

  /**
   * Retrieve a node by its ID
   *
   * @param nodeId - The unique identifier of the node
   * @returns Promise resolving to the node, or null if not found
   *
   * @example
   * ```typescript
   * const node = await storage.getNode('person:alice');
   * if (node) {
   *   console.log(node.properties.name); // 'Alice'
   * }
   * ```
   */
  getNode(nodeId: string): Promise<GraphNode | null>

  /**
   * Update a node's properties
   *
   * @param nodeId - The unique identifier of the node
   * @param properties - Partial properties to update (merged with existing)
   * @returns Promise resolving to true if updated, false if node not found
   * @throws StorageError if update fails
   *
   * @example
   * ```typescript
   * await storage.updateNode('person:alice', { age: 31 });
   * ```
   */
  updateNode(nodeId: string, properties: Partial<GraphNode['properties']>): Promise<boolean>

  /**
   * Delete a node from the graph
   * Also deletes all edges connected to this node
   *
   * @param nodeId - The unique identifier of the node to delete
   * @returns Promise resolving to true if deleted, false if node not found
   * @throws StorageError if deletion fails
   *
   * @example
   * ```typescript
   * const deleted = await storage.deleteNode('person:alice');
   * ```
   */
  deleteNode(nodeId: string): Promise<boolean>

  /**
   * Query nodes by type and optional property filters
   *
   * @param type - Node type to filter by
   * @param properties - Optional property filters (AND logic)
   * @returns Promise resolving to array of matching nodes
   *
   * @example
   * ```typescript
   * // Find all people over 25
   * const adults = await storage.queryNodes('Person', { age: { $gt: 25 } });
   * ```
   */
  queryNodes(type: string, properties?: Record<string, any>): Promise<GraphNode[]>

  // ============================================================================
  // EDGE OPERATIONS
  // ============================================================================

  /**
   * Add an edge (relationship) between two nodes
   *
   * @param edge - The edge to add with from, to, type, and properties
   * @returns Promise that resolves when edge is created
   * @throws StorageError if edge creation fails or nodes don't exist
   *
   * @example
   * ```typescript
   * await storage.addEdge({
   *   from: 'person:alice',
   *   to: 'person:bob',
   *   type: 'knows',
   *   properties: { since: '2020', strength: 'strong' }
   * });
   * ```
   */
  addEdge(edge: GraphEdge): Promise<void>

  /**
   * Get all edges from a node, optionally filtered by edge type
   *
   * @param nodeId - The node ID to get edges from
   * @param edgeTypes - Optional array of edge types to filter by
   * @returns Promise resolving to array of edges
   *
   * @example
   * ```typescript
   * // Get all edges
   * const allEdges = await storage.getEdges('person:alice');
   *
   * // Get only 'knows' and 'follows' edges
   * const socialEdges = await storage.getEdges('person:alice', ['knows', 'follows']);
   * ```
   */
  getEdges(nodeId: string, edgeTypes?: string[]): Promise<GraphEdge[]>

  /**
   * Update an edge's properties
   *
   * @param edgeId - The unique identifier of the edge (if supported)
   * @param from - Source node ID
   * @param to - Target node ID
   * @param type - Edge type
   * @param properties - Partial properties to update
   * @returns Promise resolving to true if updated, false if edge not found
   * @throws StorageError if update fails
   */
  updateEdge(
    from: string,
    to: string,
    type: string,
    properties: Partial<GraphEdge['properties']>
  ): Promise<boolean>

  /**
   * Delete an edge between two nodes
   *
   * @param from - Source node ID
   * @param to - Target node ID
   * @param type - Edge type
   * @returns Promise resolving to true if deleted, false if edge not found
   * @throws StorageError if deletion fails
   */
  deleteEdge(from: string, to: string, type: string): Promise<boolean>

  // ============================================================================
  // GRAPH TRAVERSAL
  // ============================================================================

  /**
   * Traverse the graph according to a pattern
   *
   * Executes graph traversal to find paths matching specified criteria.
   * Supports filtering by node types, edge types, depth, and direction.
   *
   * @param pattern - Traversal pattern specifying start node, edge types, direction, depth
   * @returns Promise resolving to array of paths found
   * @throws StorageError if traversal fails
   *
   * @example
   * ```typescript
   * const paths = await storage.traverse({
   *   startNode: 'person:alice',
   *   edgeTypes: ['knows', 'follows'],
   *   direction: 'outgoing',
   *   maxDepth: 3,
   *   nodeFilter: { types: ['Person'] }
   * });
   * ```
   */
  traverse(pattern: TraversalPattern): Promise<GraphPath[]>

  /**
   * Find all nodes connected to a given node within specified depth
   *
   * Uses breadth-first search to discover all reachable nodes up to N hops away.
   * More efficient than traverse() when you only need connected nodes, not paths.
   *
   * @param nodeId - Starting node ID
   * @param depth - Maximum number of hops (1 = immediate neighbors)
   * @returns Promise resolving to array of connected nodes
   * @throws StorageError if query fails
   *
   * @example
   * ```typescript
   * // Find all nodes within 2 hops of Alice
   * const connected = await storage.findConnected('person:alice', 2);
   * ```
   */
  findConnected(nodeId: string, depth: number): Promise<GraphNode[]>

  /**
   * Find shortest path between two nodes
   *
   * Uses backend-specific shortest path algorithm (Dijkstra, A*, etc.)
   * to find the optimal path between two nodes.
   *
   * @param fromId - Starting node ID
   * @param toId - Target node ID
   * @param edgeTypes - Optional array of edge types to follow
   * @returns Promise resolving to the shortest path, or null if no path exists
   * @throws StorageError if query fails
   *
   * @example
   * ```typescript
   * const path = await storage.shortestPath('person:alice', 'person:bob');
   * if (path) {
   *   console.log(`Path length: ${path.length}`);
   *   console.log(`Nodes: ${path.nodes.map(n => n.id).join(' -> ')}`);
   * }
   * ```
   */
  shortestPath(fromId: string, toId: string, edgeTypes?: string[]): Promise<GraphPath | null>

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Execute multiple graph operations in a batch
   *
   * Performs multiple node/edge operations efficiently, ideally in a transaction.
   * Batch operations can improve performance for bulk data loading.
   *
   * @param operations - Array of operations to perform
   * @returns Promise resolving to batch result with success status and stats
   * @throws StorageError if batch operation fails critically
   *
   * @example
   * ```typescript
   * const result = await storage.batchGraphOperations([
   *   { type: 'addNode', node: { id: 'person:1', type: 'Person', properties: {...} } },
   *   { type: 'addNode', node: { id: 'person:2', type: 'Person', properties: {...} } },
   *   { type: 'addEdge', edge: { from: 'person:1', to: 'person:2', type: 'knows', properties: {} } }
   * ]);
   *
   * if (result.success) {
   *   console.log(`Processed ${result.operations} operations`);
   * }
   * ```
   */
  batchGraphOperations(operations: GraphBatchOperation[]): Promise<GraphBatchResult>

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Execute a backend-specific graph query
   *
   * Allows execution of native query language (Cypher, SurrealQL, Gremlin, etc.)
   * for advanced use cases not covered by the interface methods.
   *
   * ⚠️ **Use with caution**: Reduces portability between backends.
   * Prefer interface methods when possible.
   *
   * @param query - Native query string in backend's query language
   * @param params - Optional query parameters (for parameterized queries)
   * @returns Promise resolving to query result
   * @throws StorageError if query fails
   *
   * @example
   * ```typescript
   * // Cypher (Kuzu)
   * const result = await storage.executeQuery(
   *   'MATCH (p:Person)-[:KNOWS]->(f:Person) WHERE p.name = $name RETURN f',
   *   { name: 'Alice' }
   * );
   *
   * // SurrealQL (SurrealDB)
   * const result = await storage.executeQuery(
   *   'SELECT ->knows->person FROM person WHERE name = $name',
   *   { name: 'Alice' }
   * );
   * ```
   */
  executeQuery?(query: string, params?: Record<string, any>): Promise<GraphQueryResult>

  // ============================================================================
  // ANALYTICS & STATISTICS
  // ============================================================================

  /**
   * Get statistics about the graph
   *
   * Provides metrics about graph structure: node counts, edge counts,
   * distribution by type, etc.
   *
   * @returns Promise resolving to graph statistics
   *
   * @example
   * ```typescript
   * const stats = await storage.getGraphStats();
   * console.log(`Total nodes: ${stats.nodeCount}`);
   * console.log(`Total edges: ${stats.edgeCount}`);
   * console.log(`Node types:`, stats.nodesByType);
   * ```
   */
  getGraphStats(): Promise<GraphStats>

  // ============================================================================
  // TRANSACTION SUPPORT (Optional)
  // ============================================================================

  /**
   * Execute multiple operations in a transaction
   *
   * Provides ACID guarantees for complex multi-step operations.
   * If any operation fails, all changes are rolled back.
   *
   * Optional: Not all backends support transactions
   *
   * @param fn - Function containing operations to execute transactionally
   * @returns Promise resolving to the function's return value
   * @throws StorageError if transaction fails
   *
   * @example
   * ```typescript
   * await storage.transaction(async () => {
   *   await storage.addNode(node1);
   *   await storage.addNode(node2);
   *   await storage.addEdge({ from: node1.id, to: node2.id, type: 'related', properties: {} });
   *   // If any operation fails, all are rolled back
   * });
   * ```
   */
  transaction?<R>(fn: () => Promise<R>): Promise<R>
}

/**
 * Type guard to check if a storage adapter implements graph operations
 *
 * @param storage - Storage adapter to check
 * @returns True if adapter implements GraphStorage interface
 *
 * @example
 * ```typescript
 * if (isGraphStorage(storage)) {
 *   const node = await storage.getNode('person:alice');
 * }
 * ```
 */
export function isGraphStorage<T = any>(
  storage: Storage<T>
): storage is GraphStorage<T & GraphEntity> {
  return (
    typeof (storage as any).addNode === 'function' &&
    typeof (storage as any).addEdge === 'function' &&
    typeof (storage as any).traverse === 'function'
  )
}

/**
 * Graph Storage Configuration
 *
 * Base configuration extended by specific adapters
 */
export interface GraphStorageConfig {
  /** Storage backend type */
  type: 'kuzu' | 'surrealdb' | 'neo4j' | 'falkordb' | 'custom'
  /** Storage identifier for debugging */
  id?: string
  /** Enable debug logging */
  debug?: boolean
  /** Enable performance monitoring */
  performanceMonitoring?: {
    enabled?: boolean
    slowOperationThreshold?: number
  }
}
