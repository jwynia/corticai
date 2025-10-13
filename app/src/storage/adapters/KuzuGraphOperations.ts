/**
 * Kuzu Graph Operations Module
 *
 * Handles all graph-specific operations for Kuzu storage adapter.
 * Designed for unit testability through dependency injection.
 *
 * Design Principles:
 * - Dependencies injected via constructor
 * - No direct database instantiation
 * - Easily mockable for unit tests
 * - Single Responsibility: Graph operations only
 */

import { Connection } from 'kuzu'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import {
  GraphNode,
  GraphEdge,
  GraphPath,
  GraphEntity,
  TraversalPattern,
  KuzuStorageConfig,
  GraphBatchOperation,
  GraphBatchResult,
  GraphStats
} from '../types/GraphTypes'
import { KuzuSecureQueryBuilder, QueryExecutionResult } from './KuzuSecureQueryBuilder'
import { PerformanceMonitor } from '../../utils/PerformanceMonitor'
import * as KuzuQueryHelpers from './KuzuQueryHelpers'
import { CypherQueryBuilder } from '../query-builders/CypherQueryBuilder'

// Query limits and constraints
const DEFAULT_MAX_TRAVERSAL_DEPTH = 10

/**
 * Dependencies required by KuzuGraphOperations
 */
export interface KuzuGraphOperationsDeps {
  connection: Connection
  secureQueryBuilder: KuzuSecureQueryBuilder
  cache: Map<string, GraphEntity>
  config: KuzuStorageConfig
  performanceMonitor: PerformanceMonitor
  executeSecureQuery: (secureQuery: any) => Promise<QueryExecutionResult>
  buildSecureQuery: (queryType: string, ...args: any[]) => any
  set: (key: string, value: GraphEntity) => Promise<void>
  log?: (message: string) => void
  logWarn?: (message: string) => void
}

/**
 * Kuzu Graph Operations
 *
 * Encapsulates all graph-specific operations with clear dependency boundaries.
 */
export class KuzuGraphOperations {
  private readonly cypherBuilder: CypherQueryBuilder

  constructor(private deps: KuzuGraphOperationsDeps) {
    this.cypherBuilder = new CypherQueryBuilder()
  }

  /**
   * Add a node to the graph database
   */
  async addNode(node: GraphNode): Promise<string> {
    return this.deps.performanceMonitor.measure('graph.addNode', async () => {
      // Convert GraphNode to GraphEntity for storage
      const entity: GraphEntity = {
        ...node,
        _storage: KuzuQueryHelpers.generateStorageMetadata(node as GraphEntity)
      }

      await this.deps.set(node.id, entity)
      return node.id
    }, { operation: 'addNode', nodeId: node.id, nodeType: node.type })
  }

  /**
   * Get a node by ID
   */
  async getNode(nodeId: string): Promise<GraphNode | null> {
    const entity = this.deps.cache.get(nodeId)
    return entity || null
  }

  /**
   * Add an edge between two nodes
   */
  async addEdge(edge: GraphEdge): Promise<void> {
    return this.deps.performanceMonitor.measure('graph.addEdge', async () => {
      try {
        // Verify source and target nodes exist by entity ID (not storage key)
        if (!await this.hasEntityById(edge.from)) {
          throw new StorageError(
            `Source node '${edge.from}' does not exist`,
            StorageErrorCode.INVALID_VALUE,
            { edge }
          )
        }

        if (!await this.hasEntityById(edge.to)) {
          throw new StorageError(
            `Target node '${edge.to}' does not exist`,
            StorageErrorCode.INVALID_VALUE,
            { edge }
          )
        }

        // Add relationship to database using secure parameterized query
        const serializedEdgeData = JSON.stringify(edge)

        const secureQuery = this.deps.buildSecureQuery('edgeCreate', edge.from, edge.to, edge.type, serializedEdgeData)
        const result = await this.deps.executeSecureQuery(secureQuery)

        if (!result.success) {
          throw new StorageError(
            `Failed to add edge: ${result.error}`,
            StorageErrorCode.WRITE_FAILED,
            { edge, error: result.error }
          )
        }

        if (this.deps.config.debug && this.deps.log) {
          this.deps.log(`Added edge: ${edge.from} -[${edge.type}]-> ${edge.to}`)
        }
      } catch (error) {
        if (error instanceof StorageError) {
          throw error
        }
        throw new StorageError(
          `Failed to add edge: ${error}`,
          StorageErrorCode.WRITE_FAILED,
          { edge, error }
        )
      }
    }, { operation: 'addEdge', from: edge.from, to: edge.to, edgeType: edge.type })
  }

  /**
   * Get all edges from a node
   * @param nodeId - The node ID to get edges from
   * @param edgeTypes - Optional array of edge types to filter by
   */
  async getEdges(nodeId: string, edgeTypes?: string[]): Promise<GraphEdge[]> {
    // Create mutable metadata object that can be updated with edge count
    const metadata: { operation: string; nodeId: string; edgeCount: number } = {
      operation: 'getEdges',
      nodeId,
      edgeCount: 0
    }

    const edges = await this.deps.performanceMonitor.measure('graph.getEdges', async () => {
      try {
        // Use secure parameterized query for getEdges
        const secureQuery = this.deps.buildSecureQuery('getEdges', nodeId, edgeTypes)
        const queryResult = await this.deps.executeSecureQuery(secureQuery)

        if (!queryResult.success) {
          if (this.deps.config.debug && this.deps.logWarn) {
            this.deps.logWarn(`Could not get edges for node ${nodeId}: ${queryResult.error}`)
          }
          return []
        }

        // Process the query results to build edge objects
        const edges: GraphEdge[] = []

        if (queryResult.data && typeof queryResult.data.getAll === 'function') {
          const rows = await queryResult.data.getAll()

          for (const row of rows) {
            // Row should contain: a.id, b.id, r.type, r.data
            // Parse properties from r.data field with explicit structure validation
            let properties = {}
            try {
              const dataField = row['r.data']
              if (dataField) {
                // r.data contains the full edge object as JSON string
                const parsed = typeof dataField === 'string' ? JSON.parse(dataField) : dataField

                // More explicit structure validation
                if (parsed && typeof parsed === 'object') {
                  if ('properties' in parsed) {
                    // Check if properties field is actually an object
                    if (typeof parsed.properties === 'object' && parsed.properties !== null) {
                      // Standard case: parsed is the full edge object with valid properties field
                      properties = parsed.properties
                    } else {
                      // properties field exists but is not a valid object (e.g., string, number)
                      if (this.deps.config.debug && this.deps.logWarn) {
                        this.deps.logWarn(`Unexpected edge data structure: properties field is ${typeof parsed.properties}, not object`)
                      }
                      properties = {}
                    }
                  } else if (!('from' in parsed) && !('to' in parsed) && !('type' in parsed)) {
                    // Edge case: parsed is the properties object directly (no edge metadata)
                    properties = parsed
                  } else {
                    // Unexpected structure - has edge metadata but no properties field
                    if (this.deps.config.debug && this.deps.logWarn) {
                      this.deps.logWarn(`Unexpected edge data structure: ${JSON.stringify(Object.keys(parsed))}`)
                    }
                    properties = {}
                  }
                }
              }
            } catch (error) {
              if (this.deps.config.debug && this.deps.logWarn) {
                this.deps.logWarn(`Could not parse edge properties: ${error}`)
              }
              properties = {}
            }

            const edge: GraphEdge = {
              from: row['a.id'],
              to: row['b.id'],
              type: row['r.type'],
              properties
            }
            edges.push(edge)
          }
        }

        // Update mutable metadata object with actual edge count
        metadata.edgeCount = edges.length
        return edges
      } catch (error) {
        // Return empty array instead of throwing to prevent test hangs
        if (this.deps.config.debug && this.deps.logWarn) {
          this.deps.logWarn(`Could not get edges for node ${nodeId}: ${error}`)
        }
        return []
      }
    }, metadata)

    return edges
  }

  /**
   * Traverse the graph according to a pattern
   * Executes graph traversal queries to find paths matching specified criteria
   */
  async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
    return this.deps.performanceMonitor.measure('graph.traverse', async () => {
      // Validate maxDepth parameter before try block to ensure validation errors are thrown
      const depth = parseInt(String(pattern.maxDepth), 10)
      if (!Number.isInteger(depth) || depth < 1 || depth > DEFAULT_MAX_TRAVERSAL_DEPTH) {
        throw new StorageError(
          `Traversal depth must be an integer between 1 and ${DEFAULT_MAX_TRAVERSAL_DEPTH}`,
          StorageErrorCode.INVALID_VALUE,
          { maxDepth: pattern.maxDepth }
        )
      }

      try {
        // Use validated depth
        const maxDepth = depth

        // Build the relationship pattern based on direction
        // Note: Need to include relationship type :Relationship for Kuzu
        let relationshipPattern = ''
        if (pattern.direction === 'outgoing') {
          relationshipPattern = `-[r:Relationship*1..${maxDepth}]->`
        } else if (pattern.direction === 'incoming') {
          relationshipPattern = `<-[r:Relationship*1..${maxDepth}]-`
        } else {
          // Both directions
          relationshipPattern = `-[r:Relationship*1..${maxDepth}]-`
        }

        // Use secure parameterized query builder
        const secureQuery = this.deps.buildSecureQuery('traversal', pattern.startNode, relationshipPattern, maxDepth, pattern.edgeTypes)
        const result = await this.deps.executeSecureQuery(secureQuery)

        if (!result.success) {
          if (this.deps.config.debug && this.deps.logWarn) {
            this.deps.logWarn(`Traversal query failed: ${result.error}`)
          }
          return []
        }

        // Convert all paths to GraphPath objects
        // Edge type filtering now handled at query level for better performance
        const paths: GraphPath[] = []
        if (result.data && result.data.length > 0) {
          for (const row of result.data) {
            const graphPath = this.convertToGraphPath(row.path, row.pathLength)
            if (graphPath) {
              paths.push(graphPath)
            }
          }
        }

        if (this.deps.config.debug && this.deps.log) {
          this.deps.log(`Found ${paths.length} paths`)
        }

        return paths
      } catch (error) {
        if (this.deps.config.debug && this.deps.logWarn) {
          this.deps.logWarn(`Could not traverse graph: ${error}`)
        }
        return []
      }
    }, {
      operation: 'traverse',
      startNode: pattern.startNode,
      direction: pattern.direction,
      maxDepth: pattern.maxDepth,
      edgeTypes: pattern.edgeTypes?.length || 0
    })
  }

  /**
   * Find nodes connected to a given node within specified depth
   * Uses breadth-first search to discover all reachable nodes up to N hops away
   */
  async findConnected(nodeId: string, depth: number): Promise<GraphNode[]> {
    // Validate depth parameter BEFORE try-catch to ensure validation errors are thrown
    if (!Number.isInteger(depth) || depth < 1 || depth > DEFAULT_MAX_TRAVERSAL_DEPTH) {
      throw new StorageError(`Depth must be an integer between 1 and ${DEFAULT_MAX_TRAVERSAL_DEPTH}`, StorageErrorCode.INVALID_VALUE)
    }

    try {
      // Use secure parameterized query builder
      const secureQuery = this.deps.buildSecureQuery('findConnected', nodeId, depth)
      const result = await this.deps.executeSecureQuery(secureQuery)

      if (!result.success) {
        if (this.deps.config.debug && this.deps.logWarn) {
          this.deps.logWarn(`findConnected query failed: ${result.error}`)
        }
        return []
      }

      // Convert results to GraphNode objects
      const connectedNodes: GraphNode[] = []
      if (result.data && result.data.length > 0) {
        for (const row of result.data) {
          const node: GraphNode = {
            id: row.id || '',
            type: row.type || 'Entity',
            properties: typeof row.data === 'string' ? JSON.parse(row.data || '{}') : (row.data || {})
          }
          connectedNodes.push(node)
        }
      }

      if (this.deps.config.debug && this.deps.log) {
        this.deps.log(`Found ${connectedNodes.length} connected nodes`)
      }

      return connectedNodes
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not find connected nodes: ${error}`)
      }
      return []
    }
  }

  /**
   * Find shortest path between two nodes
   * Uses Kuzu's SHORTEST algorithm to find the optimal path between two nodes
   */
  async shortestPath(fromId: string, toId: string, edgeTypes?: string[]): Promise<GraphPath | null> {
    try {
      // Use secure parameterized query builder
      const secureQuery = this.deps.buildSecureQuery('shortestPath', fromId, toId, DEFAULT_MAX_TRAVERSAL_DEPTH)
      const result = await this.deps.executeSecureQuery(secureQuery)

      if (!result.success) {
        if (this.deps.config.debug && this.deps.logWarn) {
          this.deps.logWarn(`shortestPath query failed: ${result.error}`)
        }
        return null
      }

      // Check if a path was found
      if (!result.data || result.data.length === 0) {
        if (this.deps.config.debug && this.deps.log) {
          this.deps.log(`No path found from ${fromId} to ${toId}`)
        }
        return null
      }

      // Convert the result to GraphPath
      const row = result.data[0]
      const graphPath = this.convertToGraphPath(row.path, row.pathLength)

      return graphPath
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not find shortest path: ${error}`)
      }
      return null
    }
  }

  /**
   * Update a node's properties
   */
  async updateNode(nodeId: string, properties: Partial<GraphNode['properties']>): Promise<boolean> {
    try {
      const node = await this.getNode(nodeId)
      if (!node) {
        return false
      }

      // Merge properties, filtering out undefined values
      const filteredProperties = Object.entries(properties).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, string | number | boolean | null>)

      const updatedNode: GraphNode = {
        ...node,
        properties: { ...node.properties, ...filteredProperties }
      }

      // Update in cache and database
      await this.deps.set(nodeId, updatedNode as GraphEntity)
      return true
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not update node ${nodeId}: ${error}`)
      }
      return false
    }
  }

  /**
   * Delete a node from the graph
   */
  async deleteNode(nodeId: string): Promise<boolean> {
    try {
      // Check if node exists
      const node = await this.getNode(nodeId)
      if (!node) {
        return false
      }

      // Delete from cache
      this.deps.cache.delete(nodeId)

      // Delete from database using secure query
      const secureQuery = this.deps.buildSecureQuery('entityDelete', nodeId)
      const result = await this.deps.executeSecureQuery(secureQuery)

      return result.success
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not delete node ${nodeId}: ${error}`)
      }
      return false
    }
  }

  /**
   * Query nodes by type and optional property filters
   */
  async queryNodes(type: string, properties?: Record<string, any>): Promise<GraphNode[]> {
    try {
      const nodes: GraphNode[] = []

      // Search in cache
      for (const [key, entity] of this.deps.cache.entries()) {
        if (entity.type === type) {
          // Check property filters if provided
          if (properties) {
            let matches = true
            for (const [propKey, propValue] of Object.entries(properties)) {
              if (entity.properties[propKey] !== propValue) {
                matches = false
                break
              }
            }
            if (!matches) continue
          }

          nodes.push({
            id: entity.id,
            type: entity.type,
            properties: entity.properties
          })
        }
      }

      return nodes
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not query nodes of type ${type}: ${error}`)
      }
      return []
    }
  }

  /**
   * Update an edge's properties
   */
  async updateEdge(
    from: string,
    to: string,
    type: string,
    properties: Partial<GraphEdge['properties']>
  ): Promise<boolean> {
    try {
      // Get current edges
      const edges = await this.getEdges(from)
      const edge = edges.find(e => e.to === to && e.type === type)

      if (!edge) {
        return false
      }

      // Merge properties, filtering out undefined values
      const filteredProperties = Object.entries(properties).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, string | number | boolean | null>)

      // Update edge properties
      const updatedEdge: GraphEdge = {
        ...edge,
        properties: { ...edge.properties, ...filteredProperties }
      }

      // Re-add edge with updated properties
      // Note: This is a simplified implementation
      // A more complete implementation would use Kuzu's UPDATE syntax
      await this.addEdge(updatedEdge)
      return true
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not update edge ${from} -> ${to}: ${error}`)
      }
      return false
    }
  }

  /**
   * Delete an edge between two nodes
   */
  async deleteEdge(from: string, to: string, type: string): Promise<boolean> {
    try {
      // Use Cypher query builder for safe parameterized query
      const template = this.cypherBuilder.buildDeleteEdgeBetweenNodesQuery()
      const query = await this.deps.connection.prepare(template.statement)

      if (!query.isSuccess()) {
        throw new Error(`Failed to prepare delete edge query: ${query.getErrorMessage()}`)
      }

      const result = await this.deps.connection.execute(query, {
        fromId: from,
        toId: to,
        edgeType: type
      })

      return true
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not delete edge ${from} -> ${to}: ${error}`)
      }
      return false
    }
  }

  /**
   * Execute multiple graph operations in a batch
   */
  async batchGraphOperations(operations: GraphBatchOperation[]): Promise<GraphBatchResult> {
    const startTime = Date.now()
    const errors: Error[] = []
    let nodesAffected = 0
    let edgesAffected = 0

    try {
      for (const op of operations) {
        try {
          switch (op.type) {
            case 'addNode':
              if (op.node) {
                await this.addNode(op.node)
                nodesAffected++
              }
              break
            case 'addEdge':
              if (op.edge) {
                await this.addEdge(op.edge)
                edgesAffected++
              }
              break
            case 'updateNode':
              if (op.id && op.node) {
                const success = await this.updateNode(op.id, op.node.properties)
                if (success) nodesAffected++
              }
              break
            case 'updateEdge':
              if (op.edge) {
                const success = await this.updateEdge(
                  op.edge.from,
                  op.edge.to,
                  op.edge.type,
                  op.edge.properties
                )
                if (success) edgesAffected++
              }
              break
            case 'deleteNode':
              if (op.id) {
                const success = await this.deleteNode(op.id)
                if (success) nodesAffected++
              }
              break
            case 'deleteEdge':
              if (op.edge) {
                const success = await this.deleteEdge(op.edge.from, op.edge.to, op.edge.type)
                if (success) edgesAffected++
              }
              break
          }
        } catch (error) {
          errors.push(error as Error)
        }
      }

      return {
        success: errors.length === 0,
        operations: operations.length,
        nodesAffected,
        edgesAffected,
        errors: errors.length > 0 ? errors : undefined,
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        operations: operations.length,
        nodesAffected,
        edgesAffected,
        errors: [error as Error],
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Get statistics about the graph
   */
  async getGraphStats(): Promise<GraphStats> {
    try {
      const nodesByType: Record<string, number> = {}
      const edgesByType: Record<string, number> = {}

      // Count nodes by type from cache
      for (const [key, entity] of this.deps.cache.entries()) {
        nodesByType[entity.type] = (nodesByType[entity.type] || 0) + 1
      }

      const nodeCount = this.deps.cache.size

      // Get edge count from database using Cypher query builder
      let edgeCount = 0
      try {
        const template = this.cypherBuilder.buildCountEdgesQuery()
        const query = await this.deps.connection.prepare(template.statement)

        if (query.isSuccess()) {
          const result = await this.deps.connection.execute(query, {})
          const rows = Array.isArray(result) ? result : await result.getAll()
          if (rows && rows.length > 0) {
            // Safely access count property with type checking
            const row = rows[0] as any
            edgeCount = (typeof row === 'object' && row !== null && 'count' in row) ? (row.count || 0) : 0
          }
        }
      } catch (error) {
        // Ignore errors in edge counting
      }

      return {
        nodeCount,
        edgeCount,
        nodesByType,
        edgesByType,
        databaseSize: 0, // Not available without file system inspection
        lastUpdated: new Date()
      }
    } catch (error) {
      // Return empty stats on error
      return {
        nodeCount: 0,
        edgeCount: 0,
        nodesByType: {},
        edgesByType: {},
        databaseSize: 0,
        lastUpdated: new Date()
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if an entity exists in the database by its entity ID
   * @param entityId - The entity ID to check
   * @returns Promise<boolean> - True if entity exists
   */
  private async hasEntityById(entityId: string): Promise<boolean> {
    try {
      // Use the entity ID to find matching entities
      // Check both the in-memory cache and database
      for (const [key, entity] of this.deps.cache.entries()) {
        if (entity.id === entityId) {
          return true
        }
      }

      // If not found in cache, check database using Cypher query builder
      const template = this.cypherBuilder.buildEntityExistsQuery()
      const preparedQuery = await this.deps.connection.prepare(template.statement)

      if (!preparedQuery.isSuccess()) {
        return false
      }

      const result = await this.deps.connection.execute(preparedQuery, { entityId: entityId })
      const rows = Array.isArray(result) ? result : await result.getAll()
      return rows && rows.length > 0
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Could not check entity existence: ${error}`)
      }
      return false
    }
  }

  /**
   * Convert Kuzu path result to GraphPath interface
   * @param pathResult - Raw path result from Kuzu query
   * @param pathLength - Length of the path
   * @returns Formatted GraphPath object
   */
  private convertToGraphPath(pathResult: any, pathLength?: number): GraphPath | null {
    if (!pathResult) return null

    try {
      const nodes: GraphNode[] = []
      const edges: GraphEdge[] = []

      // Debug log to understand the structure
      if (this.deps.config.debug && this.deps.log) {
        this.deps.log(`Path result type: ${typeof pathResult}, keys: ${Object.keys(pathResult || {}).join(', ')}`)
      }

      // Kuzu returns RECURSIVE_REL type for paths
      // The structure should have _nodes and _rels arrays
      if (pathResult._nodes && Array.isArray(pathResult._nodes)) {
        // Extract nodes - they should have Entity properties
        for (const node of pathResult._nodes) {
          nodes.push({
            id: node['Entity.id'] || node.id || '',
            type: node['Entity.type'] || node.type || 'Entity',
            properties: KuzuQueryHelpers.extractProperties(node)
          })
        }

        // Extract edges
        if (pathResult._rels && Array.isArray(pathResult._rels)) {
          for (let i = 0; i < pathResult._rels.length; i++) {
            const rel = pathResult._rels[i]
            edges.push({
              from: nodes[i]?.id || '',
              to: nodes[i + 1]?.id || '',
              type: rel['Relationship.type'] || rel.type || 'Relationship',
              properties: KuzuQueryHelpers.extractProperties(rel)
            })
          }
        }
      } else {
        // If the structure is different, log it for debugging
        if (this.deps.config.debug && this.deps.logWarn) {
          this.deps.logWarn(`Unexpected path structure: ${JSON.stringify(pathResult).substring(0, 200)}`)
        }
        // Try to create a simple path with just the start node
        return {
          nodes: [{
            id: pathResult.id || '',
            type: pathResult.type || 'Entity',
            properties: {}
          }],
          edges: [],
          length: 0
        }
      }

      return {
        nodes,
        edges,
        length: pathLength !== undefined ? pathLength : edges.length
      }
    } catch (error) {
      if (this.deps.config.debug && this.deps.logWarn) {
        this.deps.logWarn(`Error converting path: ${error}`)
      }
      return null
    }
  }
}
