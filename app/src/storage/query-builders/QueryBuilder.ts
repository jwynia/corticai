/**
 * Query Builder Interface
 *
 * Defines the contract for database query builders. This abstraction allows
 * CorticAI to support multiple query languages (Cypher, SurrealQL, etc.) by
 * implementing different query builders.
 *
 * Each query builder is responsible for:
 * - Generating query language-specific syntax
 * - Defining parameter placeholders
 * - Providing query templates for common operations
 *
 * Query builders do NOT handle:
 * - Parameter sanitization (handled by secure query executors)
 * - Query execution (handled by storage adapters)
 * - Result parsing (handled by storage adapters)
 */

/**
 * Query template with statement and parameter names
 */
export interface QueryTemplate {
  /** Query statement with parameter placeholders */
  statement: string
  /** Names of parameters expected by this query */
  parameterNames: string[]
}

/**
 * Direction for graph traversal
 */
export type TraversalDirection = 'outgoing' | 'incoming' | 'both'

/**
 * Query Builder Interface
 *
 * Provides methods for building queries in a specific query language.
 * Implementations include CypherQueryBuilder (for Kuzu, Neo4j),
 * SurrealQLQueryBuilder (for SurrealDB), etc.
 */
export interface QueryBuilder {
  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

  /**
   * Build query for creating a node
   *
   * Expected parameters:
   * - id: string - Unique node identifier
   * - type: string - Node type/label
   * - properties: string - JSON string of node properties
   * - metadata: string - JSON string of node metadata
   */
  buildAddNodeQuery(): QueryTemplate

  /**
   * Build query for getting a node by ID
   *
   * Expected parameters:
   * - nodeId: string - Node identifier
   */
  buildGetNodeQuery(): QueryTemplate

  /**
   * Build query for deleting a node
   *
   * Expected parameters:
   * - nodeId: string - Node identifier
   */
  buildDeleteNodeQuery(): QueryTemplate

  /**
   * Build query for storing/updating an entity (MERGE operation)
   *
   * Expected parameters:
   * - id: string - Entity identifier
   * - type: string - Entity type
   * - data: string - JSON string of entity data
   */
  buildEntityStoreQuery(): QueryTemplate

  /**
   * Build query for deleting an entity (DETACH DELETE)
   *
   * Expected parameters:
   * - id: string - Entity identifier
   */
  buildEntityDeleteQuery(): QueryTemplate

  // ============================================================================
  // EDGE OPERATIONS
  // ============================================================================

  /**
   * Build query for creating an edge between two nodes
   *
   * Expected parameters:
   * - fromId: string - Source node ID
   * - toId: string - Target node ID
   * - edgeType: string - Edge type/label
   * - edgeData: string - JSON string of edge properties
   */
  buildEdgeCreateQuery(): QueryTemplate

  /**
   * Build query for getting outgoing edges from a node
   *
   * Expected parameters:
   * - nodeId: string - Source node ID
   *
   * Optional edge type filtering is handled at runtime by modifying
   * the relationship pattern in the query.
   */
  buildGetEdgesQuery(): QueryTemplate

  /**
   * Build query for deleting an edge by ID
   *
   * Expected parameters:
   * - edgeId: string - Edge identifier
   */
  buildDeleteEdgeQuery(): QueryTemplate

  /**
   * Build query for deleting an edge between two specific nodes
   *
   * Expected parameters:
   * - fromId: string - Source node ID
   * - toId: string - Target node ID
   * - edgeType: string - Edge type
   */
  buildDeleteEdgeBetweenNodesQuery(): QueryTemplate

  // ============================================================================
  // GRAPH TRAVERSAL OPERATIONS
  // ============================================================================

  /**
   * Build query for graph traversal with variable-length paths
   *
   * Expected parameters:
   * - startNodeId: string - Starting node ID
   *
   * The relationship pattern and depth are embedded in the query template.
   * Edge type filtering is handled by modifying the pattern at runtime.
   */
  buildTraversalQuery(
    relationshipPattern: string,
    maxDepth: number,
    resultLimit: number
  ): QueryTemplate

  /**
   * Build query for finding connected nodes within a depth limit
   *
   * Expected parameters:
   * - nodeId: string - Source node ID
   */
  buildFindConnectedQuery(depth: number, resultLimit: number): QueryTemplate

  /**
   * Build query for finding shortest path between two nodes
   *
   * Expected parameters:
   * - fromId: string - Source node ID
   * - toId: string - Target node ID
   */
  buildShortestPathQuery(maxDepth: number, resultLimit: number): QueryTemplate

  /**
   * Build query for getting neighbors of a node
   *
   * Expected parameters:
   * - nodeId: string - Source node ID
   */
  buildGetNeighborsQuery(direction: TraversalDirection): QueryTemplate

  // ============================================================================
  // STATISTICS OPERATIONS
  // ============================================================================

  /**
   * Build query for counting edges
   *
   * No parameters required
   */
  buildCountEdgesQuery(): QueryTemplate

  /**
   * Build query for checking if entity exists
   *
   * Expected parameters:
   * - entityId: string - Entity identifier
   */
  buildEntityExistsQuery(): QueryTemplate

  // ============================================================================
  // QUERY LANGUAGE METADATA
  // ============================================================================

  /**
   * Get the name of the query language (e.g., "Cypher", "SurrealQL")
   */
  getQueryLanguageName(): string

  /**
   * Get the parameter placeholder syntax (e.g., "$param", "?param")
   */
  getParameterPlaceholder(paramName: string): string
}
