/**
 * Kuzu Graph Repository Implementation
 *
 * This is the infrastructure layer that handles actual I/O with Kuzu database.
 * It implements the IGraphRepository interface, providing a thin adapter between
 * the domain layer and the Kuzu database.
 *
 * Key Characteristics:
 * - Minimal business logic (just I/O translation)
 * - All business logic lives in domain layer
 * - Can be swapped with other implementations (Neo4j, in-memory, etc.)
 * - Should NOT be unit tested (integration/contract tests only)
 *
 * This follows the Repository pattern and Hexagonal Architecture principles.
 */

import { Connection } from 'kuzu'
import { IGraphRepository } from '../../domain/interfaces/IGraphRepository'
import { GraphNode, GraphEdge, GraphPath } from '../../storage/types/GraphTypes'
import { KuzuSecureQueryBuilder } from '../../storage/adapters/KuzuSecureQueryBuilder'

/**
 * Kuzu implementation of the graph repository
 *
 * Pure I/O adapter - no business logic
 */
export class KuzuGraphRepository implements IGraphRepository {
  constructor(
    private connection: Connection,
    private queryBuilder: KuzuSecureQueryBuilder,
    private debug: boolean = false
  ) {}

  /**
   * Get a single node by ID
   */
  async getNode(id: string): Promise<GraphNode | null> {
    try {
      const secureQuery = this.queryBuilder.buildGetNodeQuery(id)
      const result = await this.queryBuilder.executeSecureQuery(secureQuery)

      if (Array.isArray(result) && result.length > 0) {
        const row = result[0]
        return {
          id: row.id || id,
          type: row.type || 'Unknown',
          properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {}),
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        }
      }

      return null
    } catch (error) {
      if (this.debug) {
        console.warn(`Failed to get node ${id}:`, error)
      }
      return null
    }
  }

  /**
   * Get multiple nodes by IDs
   */
  async getNodes(ids: string[]): Promise<GraphNode[]> {
    const nodes: GraphNode[] = []

    for (const id of ids) {
      const node = await this.getNode(id)
      if (node) {
        nodes.push(node)
      }
    }

    return nodes
  }

  /**
   * Get all edges for a specific node
   */
  async getEdges(
    nodeId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): Promise<GraphEdge[]> {
    try {
      const secureQuery = this.queryBuilder.buildGetEdgesQuery(nodeId)
      const result = await this.queryBuilder.executeSecureQuery(secureQuery)

      if (!Array.isArray(result)) {
        return []
      }

      return result.map((row: any) => ({
        id: row.edgeId || row.id || '',
        type: row.type || 'Relationship',
        from: row.source || row['a.id'] || nodeId,
        to: row.target || row['b.id'] || '',
        properties: typeof row.data === 'string' ? JSON.parse(row.data) : (row.properties || row.data || {}),
        metadata: row.metadata
      }))
    } catch (error) {
      if (this.debug) {
        console.warn(`Failed to get edges for node ${nodeId}:`, error)
      }
      return []
    }
  }

  /**
   * Get immediate neighbors of a node
   *
   * This is a pure I/O operation - just fetch neighbor IDs from database.
   * No traversal logic here - that's in the domain layer.
   */
  async getNeighbors(
    nodeId: string,
    edgeTypes?: string[],
    direction: 'outgoing' | 'incoming' | 'both' = 'outgoing'
  ): Promise<string[]> {
    try {
      const secureQuery = this.queryBuilder.buildGetNeighborsQuery(nodeId, edgeTypes, direction)
      const result = await this.queryBuilder.executeSecureQuery(secureQuery)

      if (!Array.isArray(result)) {
        return []
      }

      return result.map((row: any) => row.neighborId || row.id).filter(Boolean)
    } catch (error) {
      if (this.debug) {
        console.warn(`Failed to get neighbors for node ${nodeId}:`, error)
      }
      return []
    }
  }

  /**
   * Find shortest path between two nodes
   *
   * Delegates to Kuzu's native shortest path algorithm.
   * This is one of the few places where database-specific algorithms make sense.
   */
  async findShortestPath(
    fromId: string,
    toId: string,
    maxDepth: number
  ): Promise<GraphPath | null> {
    try {
      const secureQuery = this.queryBuilder.buildShortestPathQuery(fromId, toId, maxDepth)
      const result = await this.queryBuilder.executeSecureQuery(secureQuery)

      if (!Array.isArray(result) || result.length === 0) {
        return null
      }

      // Convert Kuzu path result to GraphPath
      const row = result[0]
      return this.convertKuzuPathToGraphPath(row.path, row.pathLength)
    } catch (error) {
      if (this.debug) {
        console.warn(`Failed to find shortest path from ${fromId} to ${toId}:`, error)
      }
      return null
    }
  }

  /**
   * Add a new node to the graph
   */
  async addNode(node: GraphNode): Promise<void> {
    const secureQuery = this.queryBuilder.buildAddNodeQuery(node)
    await this.queryBuilder.executeSecureQuery(secureQuery)
  }

  /**
   * Add a new edge to the graph
   */
  async addEdge(edge: GraphEdge): Promise<void> {
    const secureQuery = this.queryBuilder.buildAddEdgeQuery({
      id: edge.id || `edge_${edge.from}_${edge.to}`,
      type: edge.type,
      source: edge.from,
      target: edge.to,
      properties: edge.properties
    })
    await this.queryBuilder.executeSecureQuery(secureQuery)
  }

  /**
   * Delete a node from the graph
   */
  async deleteNode(id: string): Promise<void> {
    const secureQuery = this.queryBuilder.buildDeleteNodeQuery(id)
    await this.queryBuilder.executeSecureQuery(secureQuery)
  }

  /**
   * Delete an edge from the graph
   */
  async deleteEdge(id: string): Promise<void> {
    const secureQuery = this.queryBuilder.buildDeleteEdgeQuery(id)
    await this.queryBuilder.executeSecureQuery(secureQuery)
  }

  /**
   * Check if a node exists
   */
  async nodeExists(id: string): Promise<boolean> {
    const node = await this.getNode(id)
    return node !== null
  }

  /**
   * Helper: Convert Kuzu path format to our GraphPath type
   * @private
   */
  private convertKuzuPathToGraphPath(path: any, pathLength: number): GraphPath | null {
    if (!path) return null

    try {
      // Extract nodes and edges from Kuzu path format
      const nodes: GraphNode[] = []
      const edges: GraphEdge[] = []

      // This is database-specific path parsing
      // Different databases might return paths in different formats
      // TODO: Implement proper Kuzu path parsing based on actual Kuzu return format
      // Blocked by: Waiting for Kuzu v0.7.0+ with improved path serialization API
      // Impact: Current parsing works but may miss edge cases with complex nested paths
      // Priority: Low - affects only complex multi-hop graph queries
      // Effort: Medium (4-6 hours to implement robust parser)

      return {
        nodes,
        edges,
        length: pathLength || 0
      }
    } catch (error) {
      if (this.debug) {
        console.warn('Failed to convert Kuzu path:', error)
      }
      return null
    }
  }
}
