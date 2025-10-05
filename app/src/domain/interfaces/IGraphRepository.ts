/**
 * Graph Repository Interface
 *
 * Defines the contract for graph data access operations.
 * Implementations handle the actual I/O with specific database technologies (Kuzu, Neo4j, etc.)
 * while keeping business logic independent of infrastructure details.
 *
 * This interface follows the Repository pattern and Dependency Inversion Principle,
 * allowing business logic to depend on abstractions rather than concrete implementations.
 */

import { GraphNode, GraphEdge, GraphPath } from '../../storage/types/GraphTypes'

/**
 * Repository interface for graph data access
 *
 * Pure I/O operations with no business logic.
 * Implementations should be thin wrappers around database queries.
 */
export interface IGraphRepository {
  /**
   * Retrieve a single node by ID
   * @param id - Node identifier
   * @returns The node or null if not found
   */
  getNode(id: string): Promise<GraphNode | null>

  /**
   * Retrieve multiple nodes by IDs
   * @param ids - Array of node identifiers
   * @returns Array of found nodes (may be fewer than requested if some don't exist)
   */
  getNodes(ids: string[]): Promise<GraphNode[]>

  /**
   * Get all edges for a specific node
   * @param nodeId - Node identifier
   * @param direction - Optional: 'outgoing', 'incoming', or 'both' (default: 'both')
   * @returns Array of edges connected to the node
   */
  getEdges(nodeId: string, direction?: 'outgoing' | 'incoming' | 'both'): Promise<GraphEdge[]>

  /**
   * Get immediate neighbors of a node (one hop away)
   * @param nodeId - Node identifier
   * @param edgeTypes - Optional: Filter by specific edge types
   * @param direction - Optional: 'outgoing', 'incoming', or 'both' (default: 'outgoing')
   * @returns Array of neighbor node IDs
   */
  getNeighbors(
    nodeId: string,
    edgeTypes?: string[],
    direction?: 'outgoing' | 'incoming' | 'both'
  ): Promise<string[]>

  /**
   * Find the shortest path between two nodes
   * @param fromId - Starting node ID
   * @param toId - Target node ID
   * @param maxDepth - Maximum path length to search
   * @returns The shortest path or null if no path exists
   */
  findShortestPath(fromId: string, toId: string, maxDepth: number): Promise<GraphPath | null>

  /**
   * Add a new node to the graph
   * @param node - Node to add
   */
  addNode(node: GraphNode): Promise<void>

  /**
   * Add a new edge to the graph
   * @param edge - Edge to add
   */
  addEdge(edge: GraphEdge): Promise<void>

  /**
   * Delete a node from the graph
   * @param id - Node identifier
   */
  deleteNode(id: string): Promise<void>

  /**
   * Delete an edge from the graph
   * @param id - Edge identifier
   */
  deleteEdge(id: string): Promise<void>

  /**
   * Check if a node exists
   * @param id - Node identifier
   * @returns True if node exists
   */
  nodeExists(id: string): Promise<boolean>
}
