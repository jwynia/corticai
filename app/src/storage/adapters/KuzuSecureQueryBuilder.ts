/**
 * Secure Query Builder for Kuzu Database
 *
 * Provides parameterized query construction to prevent SQL injection
 * vulnerabilities while working with Kuzu's Cypher-like query language.
 */

import { Connection, PreparedStatement } from 'kuzu'

export interface QueryParameters {
  [key: string]: string | number | boolean | null
}

export interface SecureQuery {
  statement: string
  parameters: QueryParameters
}

export class KuzuSecureQueryBuilder {
  private connection: Connection

  constructor(connection: Connection) {
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
      statement: 'MATCH (e:Entity {id: $id}) DELETE e',
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
   */
  buildGetEdgesQuery(nodeId: string): SecureQuery {
    return {
      statement: 'MATCH (a:Entity {id: $nodeId})-[r:Relationship]->(b:Entity) RETURN a.id, b.id, r.type, r.data',
      parameters: {
        nodeId: nodeId
      }
    }
  }

  /**
   * Build a secure query for graph traversal
   */
  buildTraversalQuery(
    startNodeId: string,
    relationshipPattern: string,
    maxDepth: number,
    edgeTypes?: string[]
  ): SecureQuery {
    // Replace the literal relationship pattern with parameterized version
    const parameterizedPattern = relationshipPattern.replace(/\*1\.\.\d+/, '*1..$maxDepth')
    let statement = `MATCH path = (start:Entity {id: $startNodeId})${parameterizedPattern}(end:Entity)`
    const parameters: QueryParameters = {
      startNodeId: startNodeId,
      maxDepth: maxDepth
    }

    if (edgeTypes && edgeTypes.length > 0) {
      // For edge type filtering, we'll use IN operator with parameter array
      statement += ` WHERE r.type IN $edgeTypes`
      parameters.edgeTypes = edgeTypes
    }

    statement += ` RETURN path, length(r) as pathLength LIMIT 100`

    return {
      statement,
      parameters
    }
  }

  /**
   * Build a secure query for finding connected nodes
   */
  buildFindConnectedQuery(nodeId: string, depth: number): SecureQuery {
    return {
      statement: `MATCH (start:Entity {id: $nodeId})-[*1..$depth]-(connected:Entity) WHERE connected.id <> $nodeId RETURN DISTINCT connected.id as id, connected.type as type, connected.data as data LIMIT 1000`,
      parameters: {
        nodeId: nodeId,
        depth: depth
      }
    }
  }

  /**
   * Build a secure query for shortest path
   */
  buildShortestPathQuery(fromId: string, toId: string, maxDepth: number): SecureQuery {
    return {
      statement: `MATCH path = (from:Entity {id: $fromId})-[r* SHORTEST 1..$maxDepth]-(to:Entity {id: $toId}) RETURN path, length(r) as pathLength LIMIT 1`,
      parameters: {
        fromId: fromId,
        toId: toId,
        maxDepth: maxDepth
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
        if (value.length > 1000000) { // 1MB limit for string parameters
          throw new Error(`Parameter '${key}' exceeds maximum length`)
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
      console.log(`[SecureQuery] Executing: ${secureQuery.statement}`)
      console.log(`[SecureQuery] Parameters: ${Object.keys(secureQuery.parameters).length} params`)
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