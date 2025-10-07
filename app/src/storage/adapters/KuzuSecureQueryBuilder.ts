/**
 * Secure Query Builder for Kuzu Database
 *
 * Provides parameterized query construction to prevent SQL injection
 * vulnerabilities while working with Kuzu's Cypher-like query language.
 */

import { Connection, PreparedStatement } from 'kuzu'
import { Logger } from '../../utils/Logger'

// Constants for validation limits
const MAX_STRING_PARAMETER_LENGTH = 1000000 // 1MB limit for string parameters
const MAX_DEPTH_LIMIT = 50 // Maximum depth for graph traversal to prevent performance issues
const MAX_RESULT_LIMIT = 10000 // Maximum result limit to prevent resource exhaustion
const DEFAULT_TRAVERSAL_LIMIT = 100 // Default limit for traversal queries
const DEFAULT_SEARCH_LIMIT = 1000 // Default limit for search/connected queries
const DEFAULT_SHORTEST_PATH_LIMIT = 1 // Default limit for shortest path queries

export interface QueryParameters {
  [key: string]: string | number | boolean | null
}

export interface QueryOptions {
  resultLimit?: number
}

export interface SecureQuery {
  statement: string
  parameters: QueryParameters
}

export class KuzuSecureQueryBuilder {
  private connection: Connection
  public logger: Logger

  constructor(connection: Connection) {
    this.logger = Logger.createConsoleLogger('KuzuSecureQueryBuilder');
    this.connection = connection
  }

  /**
   * Build a secure query for storing/updating an entity
   */
  buildEntityStoreQuery(key: string, entityId: string, type: string, data: string): SecureQuery {
    return {
      statement: 'MERGE (e:Entity {id: $id}) SET e.type = $type, e.data = $data',
      parameters: {
        id: entityId,
        type: type,
        data: data
      }
    }
  }

  /**
   * Build a secure query for deleting an entity
   */
  buildEntityDeleteQuery(entityId: string): SecureQuery {
    return {
      statement: 'MATCH (e:Entity {id: $id}) DETACH DELETE e',
      parameters: {
        id: entityId
      }
    }
  }

  /**
   * Build a secure query for creating an edge between entities
   */
  buildEdgeCreateQuery(fromId: string, toId: string, edgeType: string, edgeData: string): SecureQuery {
    return {
      statement: 'MATCH (a:Entity), (b:Entity) WHERE a.id = $fromId AND b.id = $toId CREATE (a)-[:Relationship {type: $edgeType, data: $edgeData}]->(b)',
      parameters: {
        fromId: fromId,
        toId: toId,
        edgeType: edgeType,
        edgeData: edgeData
      }
    }
  }

  /**
   * Build a secure query for finding edges from a node
   * Returns both incoming and outgoing relationships (bidirectional)
   *
   * Uses UNION to combine outgoing and incoming edges while preserving direction
   */
  buildGetEdgesQuery(nodeId: string): SecureQuery {
    return {
      statement: `
        MATCH (a:Entity {id: $nodeId})-[r:Relationship]->(b:Entity)
        RETURN a.id, b.id, r.type, r.data
        UNION ALL
        MATCH (a:Entity)-[r:Relationship]->(b:Entity {id: $nodeId})
        RETURN a.id, b.id, r.type, r.data
      `.trim(),
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for graph traversal
   * With Kuzu 0.11.2, we can use proper variable-length paths
   *
   * @param startNodeId - The ID of the starting node
   * @param relationshipPattern - The relationship pattern (e.g., '-[r*1..2]->')
   * @param maxDepth - Maximum depth for traversal
   * @param edgeTypes - Optional array of edge types to filter (handled in post-processing)
   * @param options - Optional query options including resultLimit
   * @returns SecureQuery object with statement and parameters
   */
  buildTraversalQuery(
    startNodeId: string,
    relationshipPattern: string,
    maxDepth: number,
    edgeTypes?: string[],
    options?: QueryOptions
  ): SecureQuery {
    // Validate depth parameter
    this.validateDepthParameter(maxDepth)

    // Get validated result limit
    const resultLimit = this.getResultLimit(options, DEFAULT_TRAVERSAL_LIMIT)

    // Kuzu 0.11.2 supports variable-length paths with literal depth values
    // Note: 'start' and 'end' might be reserved, so using 'source' and 'target'
    // Normalize relationship pattern to include :Relationship if not specified
    let normalizedPattern = relationshipPattern
    if (normalizedPattern.includes('[') && !normalizedPattern.includes(':')) {
      // Add :Relationship type to patterns like -[r*1..2]- or -[*1..2]-
      // Type must come before the variable-length spec: -[r:Relationship*1..2]-
      normalizedPattern = normalizedPattern.replace(/\[([a-z]*)\*/, '[$1:Relationship*')
    }

    // Use the normalized relationshipPattern to respect direction
    let statement = `MATCH path = (source:Entity {id: $startNodeId})${normalizedPattern}(target:Entity)`
    const parameters: QueryParameters = {
      startNodeId: startNodeId
    }

    // For now, implement variable-length traversal without edge type filtering
    // Edge type filtering will be done in post-processing
    // NOTE: Edge type filtering for variable-length paths is tracked in tech-debt backlog
    // Currently handled in post-processing for performance reasons
    // Will implement when Kuzu adds better variable-length path filtering support

    // Note: edgeTypes are handled in post-processing, not as query parameters

    // For single-hop relationships, path length is always 1
    // For variable-length paths, we would use length(r)
    if (statement.includes('*')) {
      statement += ` RETURN path, length(r) as pathLength LIMIT ${resultLimit}`
    } else {
      statement += ` RETURN path, 1 as pathLength LIMIT ${resultLimit}`
    }

    return {
      statement,
      parameters
    }
  }

  /**
   * Build a secure query for finding connected nodes
   * With Kuzu 0.11.2, we can use variable-length paths properly
   *
   * @param nodeId - The ID of the node to find connections for
   * @param depth - Maximum depth for finding connections
   * @param options - Optional query options including resultLimit
   * @returns SecureQuery object with statement and parameters
   */
  buildFindConnectedQuery(nodeId: string, depth: number, options?: QueryOptions): SecureQuery {
    // Validate depth parameter
    this.validateDepthParameter(depth)

    // Get validated result limit
    const resultLimit = this.getResultLimit(options, DEFAULT_SEARCH_LIMIT)

    return {
      statement: `MATCH (source:Entity {id: $nodeId})-[*1..${depth}]-(connected:Entity) WHERE connected.id <> $nodeId RETURN DISTINCT connected.id as id, connected.type as type, connected.data as data LIMIT ${resultLimit}`,
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for shortest path
   * With Kuzu 0.11.2, we can use SHORTEST path algorithms
   *
   * @param fromId - The ID of the starting node
   * @param toId - The ID of the target node
   * @param maxDepth - Maximum depth for shortest path search
   * @param options - Optional query options including resultLimit
   * @returns SecureQuery object with statement and parameters
   */
  buildShortestPathQuery(fromId: string, toId: string, maxDepth: number, options?: QueryOptions): SecureQuery {
    // Validate depth parameter
    this.validateDepthParameter(maxDepth)

    // Get validated result limit
    const resultLimit = this.getResultLimit(options, DEFAULT_SHORTEST_PATH_LIMIT)

    return {
      statement: `MATCH path = (sourceNode:Entity {id: $fromId})-[r* SHORTEST 1..${maxDepth}]-(targetNode:Entity {id: $toId}) RETURN path, length(r) as pathLength LIMIT ${resultLimit}`,
      parameters: {
        fromId: fromId,
        toId: toId
      }
    }
  }

  /**
   * Build a secure query for getting a single node by ID
   */
  buildGetNodeQuery(nodeId: string): SecureQuery {
    return {
      statement: 'MATCH (n:Entity {id: $nodeId}) RETURN n.id as id, n.type as type, n.data as properties, n.metadata as metadata',
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for getting neighbors of a node
   */
  buildGetNeighborsQuery(
    nodeId: string,
    edgeTypes?: string[],
    direction: 'outgoing' | 'incoming' | 'both' = 'outgoing'
  ): SecureQuery {
    let relationshipPattern = ''

    if (direction === 'outgoing') {
      relationshipPattern = '-[r:Relationship]->'
    } else if (direction === 'incoming') {
      relationshipPattern = '<-[r:Relationship]-'
    } else {
      relationshipPattern = '-[r:Relationship]-'
    }

    // TODO: Add native edge type filtering when edgeTypes is provided
    // Blocked by: Kuzu 0.6.1 limitation - doesn't support edge type filtering in variable-length paths
    // Current workaround: Post-processing results to filter unwanted edge types
    // Impact: Performance - fetches extra paths that are filtered client-side
    // Priority: Medium - affects query efficiency for multi-type graphs
    // Effort: Small (30 min to update when Kuzu adds support)
    return {
      statement: `MATCH (n:Entity {id: $nodeId})${relationshipPattern}(neighbor:Entity) RETURN neighbor.id as neighborId`,
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for adding a node
   */
  buildAddNodeQuery(node: { id: string; type: string; properties?: any; metadata?: any }): SecureQuery {
    return {
      statement: 'CREATE (n:Entity {id: $id, type: $type, data: $properties, metadata: $metadata})',
      parameters: {
        id: node.id,
        type: node.type,
        properties: JSON.stringify(node.properties || {}),
        metadata: JSON.stringify(node.metadata || {})
      }
    }
  }

  /**
   * Build a secure query for adding an edge
   */
  buildAddEdgeQuery(edge: { id: string; type: string; source: string; target: string; properties?: any }): SecureQuery {
    return {
      statement: 'MATCH (a:Entity {id: $source}), (b:Entity {id: $target}) CREATE (a)-[r:Relationship {id: $id, type: $type, data: $properties}]->(b)',
      parameters: {
        id: edge.id,
        type: edge.type,
        source: edge.source,
        target: edge.target,
        properties: JSON.stringify(edge.properties || {})
      }
    }
  }

  /**
   * Build a secure query for deleting a node
   */
  buildDeleteNodeQuery(nodeId: string): SecureQuery {
    return {
      statement: 'MATCH (n:Entity {id: $nodeId}) DETACH DELETE n',
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for deleting an edge
   */
  buildDeleteEdgeQuery(edgeId: string): SecureQuery {
    return {
      statement: 'MATCH ()-[r:Relationship {id: $edgeId}]-() DELETE r',
      parameters: {
        edgeId: edgeId
      }
    }
  }

  /**
   * Prepare and execute a secure query
   */
  async executeSecureQuery(secureQuery: SecureQuery): Promise<any> {
    try {
      // Prepare the statement
      const preparedStatement = await this.connection.prepare(secureQuery.statement)

      if (!preparedStatement.isSuccess()) {
        throw new Error(`Failed to prepare statement: ${preparedStatement.getErrorMessage()}`)
      }

      // Execute with parameters
      const result = await this.connection.execute(preparedStatement, secureQuery.parameters)
      return result
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Validate depth parameters for variable-length paths
   */
  private validateDepthParameter(depth: number): void {
    if (!Number.isInteger(depth)) {
      throw new Error('Depth must be an integer')
    }
    if (depth < 1) {
      throw new Error('Invalid depth parameter: depth must be positive')
    }
    if (depth > MAX_DEPTH_LIMIT) {
      throw new Error(`Depth exceeds maximum allowed limit of ${MAX_DEPTH_LIMIT}`)
    }
  }

  /**
   * Validate result limit parameter
   */
  private validateResultLimit(limit: number): void {
    if (!Number.isInteger(limit)) {
      throw new Error('Result limit must be an integer')
    }
    if (limit < 1) {
      throw new Error('Result limit must be positive')
    }
    if (limit > MAX_RESULT_LIMIT) {
      throw new Error(`Result limit exceeds maximum allowed limit of ${MAX_RESULT_LIMIT}`)
    }
  }

  /**
   * Get validated result limit from options or return default
   */
  private getResultLimit(options: QueryOptions | undefined, defaultLimit: number): number {
    if (options?.resultLimit !== undefined) {
      this.validateResultLimit(options.resultLimit)
      return options.resultLimit
    }
    return defaultLimit
  }

  /**
   * Validate that a parameter value is safe
   */
  private validateParameter(value: any): boolean {
    // Basic validation - ensure we have valid parameter types
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      Array.isArray(value)
    )
  }

  /**
   * Sanitize parameters to ensure they're safe for database operations
   */
  sanitizeParameters(parameters: QueryParameters): QueryParameters {
    const sanitized: QueryParameters = {}

    for (const [key, value] of Object.entries(parameters)) {
      if (!this.validateParameter(value)) {
        throw new Error(`Invalid parameter type for key '${key}': ${typeof value}`)
      }

      // For string parameters, we still want to limit extremely long values
      if (typeof value === 'string') {
        if (value.length > MAX_STRING_PARAMETER_LENGTH) {
          throw new Error(`Parameter '${key}' exceeds maximum length of ${MAX_STRING_PARAMETER_LENGTH} characters`)
        }
      }

      sanitized[key] = value
    }

    return sanitized
  }
}

/**
 * Result wrapper for query execution with metadata
 */
export interface QueryExecutionResult {
  success: boolean
  data?: any
  error?: string
  executionTimeMs?: number
  queryInfo?: {
    statement: string
    parameterCount: number
  }
}

/**
 * Execute a secure query with full error handling and monitoring
 */
export async function executeSecureQueryWithMonitoring(
  queryBuilder: KuzuSecureQueryBuilder,
  secureQuery: SecureQuery,
  debugMode = false
): Promise<QueryExecutionResult> {
  const startTime = Date.now()

  try {
    // Validate and sanitize parameters
    const sanitizedParameters = queryBuilder.sanitizeParameters(secureQuery.parameters)

    const secureQueryToExecute = {
      statement: secureQuery.statement,
      parameters: sanitizedParameters
    }

    if (debugMode) {
      queryBuilder.logger.info(`[SecureQuery] Executing: ${secureQuery.statement}`)
      queryBuilder.logger.info(`[SecureQuery] Parameters: ${Object.keys(secureQuery.parameters).length} params`)
    }

    const result = await queryBuilder.executeSecureQuery(secureQueryToExecute)
    const executionTime = Date.now() - startTime

    return {
      success: true,
      data: result,
      executionTimeMs: executionTime,
      queryInfo: {
        statement: secureQuery.statement,
        parameterCount: Object.keys(secureQuery.parameters).length
      }
    }
  } catch (error) {
    const executionTime = Date.now() - startTime

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs: executionTime,
      queryInfo: {
        statement: secureQuery.statement,
        parameterCount: Object.keys(secureQuery.parameters).length
      }
    }
  }
}