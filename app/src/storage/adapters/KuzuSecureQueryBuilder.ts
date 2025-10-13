/**
 * Secure Query Builder for Kuzu Database
 *
 * Provides parameterized query construction to prevent SQL injection
 * vulnerabilities while working with Kuzu's Cypher-like query language.
 *
 * This class delegates query language syntax to CypherQueryBuilder and focuses on:
 * - Parameter validation and sanitization
 * - Query execution with Kuzu connection
 * - Error handling and monitoring
 */

import { Connection, PreparedStatement } from 'kuzu'
import { Logger } from '../../utils/Logger'
import { CypherQueryBuilder } from '../query-builders/CypherQueryBuilder'

// Module-level logger for external functions
const queryExecutionLogger = Logger.createConsoleLogger('KuzuQueryExecution')

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
  private readonly logger: Logger
  private readonly cypherBuilder: CypherQueryBuilder

  constructor(connection: Connection) {
    this.logger = Logger.createConsoleLogger('KuzuSecureQueryBuilder')
    this.connection = connection
    this.cypherBuilder = new CypherQueryBuilder()
  }

  /**
   * Build a secure query for storing/updating an entity
   */
  buildEntityStoreQuery(key: string, entityId: string, type: string, data: string): SecureQuery {
    const template = this.cypherBuilder.buildEntityStoreQuery()
    return {
      statement: template.statement,
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
    const template = this.cypherBuilder.buildEntityDeleteQuery()
    return {
      statement: template.statement,
      parameters: {
        id: entityId
      }
    }
  }

  /**
   * Build a secure query for creating an edge between entities
   */
  buildEdgeCreateQuery(fromId: string, toId: string, edgeType: string, edgeData: string): SecureQuery {
    const template = this.cypherBuilder.buildEdgeCreateQuery()
    return {
      statement: template.statement,
      parameters: {
        fromId: fromId,
        toId: toId,
        edgeType: edgeType,
        edgeData: edgeData
      }
    }
  }

  /**
   * Build a secure query for finding outgoing edges from a node
   * Returns only outgoing relationships where the node is the source
   * @param nodeId - The node ID to get edges from
   * @param edgeTypes - Optional array of edge types to filter by
   */
  buildGetEdgesQuery(nodeId: string, edgeTypes?: string[]): SecureQuery {
    const template = this.cypherBuilder.buildGetEdgesQuery()

    // Build edge type filter and inject into query
    const typeFilter = this.cypherBuilder.buildEdgeTypeFilter(edgeTypes)
    const statement = template.statement.replace(':Relationship', typeFilter)

    return {
      statement,
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for graph traversal
   * With Kuzu 0.11.3, we can use proper variable-length paths with query-level edge type filtering
   *
   * @param startNodeId - The ID of the starting node
   * @param relationshipPattern - The relationship pattern (e.g., '-[r*1..2]->')
   * @param maxDepth - Maximum depth for traversal
   * @param edgeTypes - Optional array of edge types to filter at query level
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

    // Build edge type filter and inject into relationship pattern
    const typeFilter = this.cypherBuilder.buildEdgeTypeFilter(edgeTypes)
    const normalizedPattern = this.cypherBuilder.injectTypeFilterIntoPattern(relationshipPattern, typeFilter)

    // Get query template from Cypher builder
    const template = this.cypherBuilder.buildTraversalQuery(normalizedPattern, maxDepth, resultLimit)

    return {
      statement: template.statement,
      parameters: {
        startNodeId: startNodeId
      }
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

    // Get query template from Cypher builder
    const template = this.cypherBuilder.buildFindConnectedQuery(depth, resultLimit)

    return {
      statement: template.statement,
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

    // Get query template from Cypher builder
    const template = this.cypherBuilder.buildShortestPathQuery(maxDepth, resultLimit)

    return {
      statement: template.statement,
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
    const template = this.cypherBuilder.buildGetNodeQuery()
    return {
      statement: template.statement,
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
    // Get query template from Cypher builder
    const template = this.cypherBuilder.buildGetNeighborsQuery(direction)

    // Build edge type filter and inject into query
    const typeFilter = this.cypherBuilder.buildEdgeTypeFilter(edgeTypes)
    const statement = template.statement.replace(':Relationship', typeFilter)

    return {
      statement,
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for adding a node
   */
  buildAddNodeQuery(node: { id: string; type: string; properties?: any; metadata?: any }): SecureQuery {
    const template = this.cypherBuilder.buildAddNodeQuery()
    return {
      statement: template.statement,
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
    const template = this.cypherBuilder.buildEdgeCreateQuery()
    return {
      statement: template.statement,
      parameters: {
        id: edge.id,
        type: edge.type,
        fromId: edge.source,
        toId: edge.target,
        edgeType: edge.type,
        edgeData: JSON.stringify(edge.properties || {})
      }
    }
  }

  /**
   * Build a secure query for deleting a node
   */
  buildDeleteNodeQuery(nodeId: string): SecureQuery {
    const template = this.cypherBuilder.buildDeleteNodeQuery()
    return {
      statement: template.statement,
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for deleting an edge
   */
  buildDeleteEdgeQuery(edgeId: string): SecureQuery {
    const template = this.cypherBuilder.buildDeleteEdgeQuery()
    return {
      statement: template.statement,
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
      queryExecutionLogger.info(`[SecureQuery] Executing: ${secureQuery.statement}`)
      queryExecutionLogger.info(`[SecureQuery] Parameters: ${Object.keys(secureQuery.parameters).length} params`)
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