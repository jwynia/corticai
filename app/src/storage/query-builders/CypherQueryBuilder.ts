/**
 * Cypher Query Builder
 *
 * Implements query building for Cypher query language, used by graph databases
 * like Kuzu, Neo4j, FalkorDB, and others supporting OpenCypher.
 *
 * This module contains all Cypher-specific syntax and patterns, making it easy
 * to swap query languages by implementing a different QueryBuilder.
 *
 * References:
 * - OpenCypher: https://opencypher.org/
 * - Kuzu Documentation: https://docs.kuzudb.com/
 */

import { QueryBuilder, QueryTemplate, TraversalDirection } from './QueryBuilder'

/**
 * Cypher Query Builder Implementation
 *
 * Generates Cypher queries for graph operations. All queries use parameterized
 * syntax ($param) to enable safe query execution.
 */
export class CypherQueryBuilder implements QueryBuilder {
  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

  buildAddNodeQuery(): QueryTemplate {
    return {
      statement: 'CREATE (n:Entity {id: $id, type: $type, data: $properties, metadata: $metadata})',
      parameterNames: ['id', 'type', 'properties', 'metadata']
    }
  }

  buildGetNodeQuery(): QueryTemplate {
    return {
      statement:
        'MATCH (n:Entity {id: $nodeId}) RETURN n.id as id, n.type as type, n.data as properties, n.metadata as metadata',
      parameterNames: ['nodeId']
    }
  }

  buildDeleteNodeQuery(): QueryTemplate {
    return {
      statement: 'MATCH (n:Entity {id: $nodeId}) DETACH DELETE n',
      parameterNames: ['nodeId']
    }
  }

  buildEntityStoreQuery(): QueryTemplate {
    return {
      statement: 'MERGE (e:Entity {id: $id}) SET e.type = $type, e.data = $data',
      parameterNames: ['id', 'type', 'data']
    }
  }

  buildEntityDeleteQuery(): QueryTemplate {
    return {
      statement: 'MATCH (e:Entity {id: $id}) DETACH DELETE e',
      parameterNames: ['id']
    }
  }

  // ============================================================================
  // EDGE OPERATIONS
  // ============================================================================

  buildEdgeCreateQuery(): QueryTemplate {
    return {
      statement:
        'MATCH (a:Entity), (b:Entity) WHERE a.id = $fromId AND b.id = $toId ' +
        'CREATE (a)-[:Relationship {type: $edgeType, data: $edgeData}]->(b)',
      parameterNames: ['fromId', 'toId', 'edgeType', 'edgeData']
    }
  }

  buildGetEdgesQuery(): QueryTemplate {
    return {
      statement: `
        MATCH (a:Entity {id: $nodeId})-[r:Relationship]->(b:Entity)
        RETURN a.id, b.id, r.type, r.data
      `.trim(),
      parameterNames: ['nodeId']
    }
  }

  buildDeleteEdgeQuery(): QueryTemplate {
    return {
      statement: 'MATCH ()-[r:Relationship {id: $edgeId}]-() DELETE r',
      parameterNames: ['edgeId']
    }
  }

  buildDeleteEdgeBetweenNodesQuery(): QueryTemplate {
    return {
      statement: `
        MATCH (a:Entity {id: $fromId})-[r:Relationship {type: $edgeType}]->(b:Entity {id: $toId})
        DELETE r
      `.trim(),
      parameterNames: ['fromId', 'toId', 'edgeType']
    }
  }

  // ============================================================================
  // GRAPH TRAVERSAL OPERATIONS
  // ============================================================================

  buildTraversalQuery(relationshipPattern: string, maxDepth: number, resultLimit: number): QueryTemplate {
    // Build the traversal query with the given relationship pattern
    // Edge type filtering is handled by modifying the relationshipPattern at runtime
    let statement = `MATCH path = (source:Entity {id: $startNodeId})${relationshipPattern}(target:Entity)`

    // Determine how to calculate path length based on pattern
    if (relationshipPattern.includes('*')) {
      // Variable-length path - use length(r)
      statement += ` RETURN path, length(r) as pathLength LIMIT ${resultLimit}`
    } else {
      // Single-hop relationship - path length is always 1
      statement += ` RETURN path, 1 as pathLength LIMIT ${resultLimit}`
    }

    return {
      statement,
      parameterNames: ['startNodeId']
    }
  }

  buildFindConnectedQuery(depth: number, resultLimit: number): QueryTemplate {
    return {
      statement: `MATCH (source:Entity {id: $nodeId})-[*1..${depth}]-(connected:Entity) WHERE connected.id <> $nodeId RETURN DISTINCT connected.id as id, connected.type as type, connected.data as data LIMIT ${resultLimit}`,
      parameterNames: ['nodeId']
    }
  }

  buildShortestPathQuery(maxDepth: number, resultLimit: number): QueryTemplate {
    return {
      statement: `MATCH path = (sourceNode:Entity {id: $fromId})-[r* SHORTEST 1..${maxDepth}]-(targetNode:Entity {id: $toId}) RETURN path, length(r) as pathLength LIMIT ${resultLimit}`,
      parameterNames: ['fromId', 'toId']
    }
  }

  buildGetNeighborsQuery(direction: TraversalDirection): QueryTemplate {
    let relationshipPattern: string

    switch (direction) {
      case 'outgoing':
        relationshipPattern = '-[r:Relationship]->'
        break
      case 'incoming':
        relationshipPattern = '<-[r:Relationship]-'
        break
      case 'both':
        relationshipPattern = '-[r:Relationship]-'
        break
    }

    return {
      statement: `MATCH (n:Entity {id: $nodeId})${relationshipPattern}(neighbor:Entity) RETURN neighbor.id as neighborId`,
      parameterNames: ['nodeId']
    }
  }

  // ============================================================================
  // STATISTICS OPERATIONS
  // ============================================================================

  buildCountEdgesQuery(): QueryTemplate {
    return {
      statement: 'MATCH ()-[r:Relationship]->() RETURN count(r) AS count',
      parameterNames: []
    }
  }

  buildEntityExistsQuery(): QueryTemplate {
    return {
      statement: 'MATCH (e:Entity {id: $entityId}) RETURN e.id LIMIT 1',
      parameterNames: ['entityId']
    }
  }

  // ============================================================================
  // QUERY LANGUAGE METADATA
  // ============================================================================

  getQueryLanguageName(): string {
    return 'Cypher'
  }

  getParameterPlaceholder(paramName: string): string {
    return `$${paramName}`
  }

  // ============================================================================
  // HELPER METHODS FOR CYPHER-SPECIFIC PATTERNS
  // ============================================================================

  /**
   * Build edge type filter string for Cypher
   *
   * Converts an array of edge types into Cypher's multi-type syntax:
   * - Empty array or undefined: ':Relationship' (all types)
   * - ['imports', 'depends_on']: ':imports|depends_on'
   *
   * @param edgeTypes - Optional array of edge types to filter
   * @returns Cypher type filter string
   */
  buildEdgeTypeFilter(edgeTypes?: string[]): string {
    if (!edgeTypes || edgeTypes.length === 0) {
      return ':Relationship'
    }
    return `:${edgeTypes.join('|')}`
  }

  /**
   * Inject edge type filter into relationship pattern
   *
   * Takes a relationship pattern like '-[r*1..2]->' and injects the type filter
   * to create '-[r:TYPE1|TYPE2*1..2]->'.
   *
   * @param pattern - Base relationship pattern
   * @param typeFilter - Type filter string (e.g., ':imports|depends_on')
   * @returns Modified pattern with type filter
   */
  injectTypeFilterIntoPattern(pattern: string, typeFilter: string): string {
    if (!pattern.includes('[')) {
      return pattern
    }

    // For patterns like -[r*1..2]-, inject type after variable name
    if (pattern.includes('*') && !pattern.includes(':')) {
      return pattern.replace(/\[([a-z]*)\*/, `[$1${typeFilter}*`)
    }

    return pattern
  }
}
