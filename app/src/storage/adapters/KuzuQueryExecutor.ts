/**
 * Kuzu Query Executor
 *
 * Handles raw query execution, transactions, and secure query coordination
 * for the Kuzu graph database adapter.
 *
 * Responsibilities:
 * - Native Cypher query execution
 * - Transaction management
 * - Statement preparation
 * - Secure query building dispatch
 * - Secure query execution with monitoring
 *
 * Extracted from KuzuStorageAdapter.ts as part of REFACTOR-003
 */

import { Connection } from 'kuzu'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import { GraphQueryResult } from '../types/GraphTypes'
import { KuzuSecureQueryBuilder, executeSecureQueryWithMonitoring, QueryExecutionResult } from './KuzuSecureQueryBuilder'

/**
 * Dependencies required by KuzuQueryExecutor
 */
export interface KuzuQueryExecutorDeps {
  connection: Connection
  secureQueryBuilder: KuzuSecureQueryBuilder
  debug?: boolean
}

/**
 * KuzuQueryExecutor - Handles query execution and transactions
 *
 * This class is responsible for:
 * - Executing raw Cypher queries
 * - Managing transactions
 * - Building and executing secure parameterized queries
 * - Statement preparation
 */
export class KuzuQueryExecutor {
  private readonly connection: Connection
  private readonly secureQueryBuilder: KuzuSecureQueryBuilder
  private readonly debug: boolean

  constructor(deps: KuzuQueryExecutorDeps) {
    this.connection = deps.connection
    this.secureQueryBuilder = deps.secureQueryBuilder
    this.debug = deps.debug || false
  }

  /**
   * Execute a native Cypher query (Kuzu-specific)
   *
   * Allows execution of raw Cypher queries for advanced use cases.
   * Note: This reduces portability to other graph databases.
   *
   * @param query - Cypher query string
   * @param params - Optional query parameters
   * @returns Promise resolving to query result
   */
  async executeQuery(query: string, params?: Record<string, any>): Promise<GraphQueryResult> {
    try {
      const startTime = Date.now()

      // Execute query with Kuzu
      const result = await this.connection.query(query)

      const executionTime = Date.now() - startTime

      // Parse result to GraphQueryResult format
      // Note: This is simplified - actual implementation would parse Kuzu results
      return {
        nodes: [],
        edges: [],
        paths: [],
        metadata: {
          executionTime,
          nodesTraversed: 0,
          edgesTraversed: 0
        }
      }
    } catch (error) {
      throw new StorageError(
        `Failed to execute query: ${error}`,
        StorageErrorCode.QUERY_FAILED,
        { query, params }
      )
    }
  }

  /**
   * Execute operations in a transaction
   *
   * Note: Kuzu auto-commits, so this provides logical transaction semantics
   * but not true ACID isolation
   *
   * @param fn - Function containing operations to execute
   * @returns Promise resolving to the function's return value
   */
  async transaction<R>(fn: () => Promise<R>): Promise<R> {
    // Kuzu doesn't have explicit transaction support with rollback in the current API
    // This is a best-effort implementation that executes the function
    // In a real implementation with transaction support, you would:
    // 1. BEGIN TRANSACTION
    // 2. Execute fn()
    // 3. COMMIT on success or ROLLBACK on error

    try {
      const result = await fn()
      return result
    } catch (error) {
      // In true transaction support, would ROLLBACK here
      throw new StorageError(
        `Transaction failed: ${error}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      )
    }
  }

  /**
   * Build secure query using parameterized statements
   * @param queryType - Type of query to build
   * @param args - Arguments for the query
   * @returns Secure query object
   */
  buildSecureQuery(queryType: string, ...args: any[]): any {
    switch (queryType) {
      case 'entityStore':
        return this.secureQueryBuilder.buildEntityStoreQuery(args[0], args[1], args[2], args[3])
      case 'entityDelete':
        return this.secureQueryBuilder.buildEntityDeleteQuery(args[0])
      case 'edgeCreate':
        return this.secureQueryBuilder.buildEdgeCreateQuery(args[0], args[1], args[2], args[3])
      case 'getEdges':
        return this.secureQueryBuilder.buildGetEdgesQuery(args[0])
      case 'traversal':
        return this.secureQueryBuilder.buildTraversalQuery(args[0], args[1], args[2], args[3])
      case 'findConnected':
        return this.secureQueryBuilder.buildFindConnectedQuery(args[0], args[1])
      case 'shortestPath':
        return this.secureQueryBuilder.buildShortestPathQuery(args[0], args[1], args[2])
      default:
        throw new StorageError(`Unknown query type: ${queryType}`, StorageErrorCode.INVALID_VALUE)
    }
  }

  /**
   * Prepare a statement for execution
   * @param statement - SQL/Cypher statement to prepare
   * @returns Prepared statement
   */
  async prepareStatement(statement: string): Promise<any> {
    try {
      const prepared = await this.connection.prepare(statement)
      if (!prepared.isSuccess()) {
        throw new Error(prepared.getErrorMessage())
      }
      return prepared
    } catch (error) {
      throw new StorageError(
        `Failed to prepare statement: ${error}`,
        StorageErrorCode.QUERY_FAILED,
        { statement }
      )
    }
  }

  /**
   * Execute a secure query with monitoring
   * @param secureQuery - Secure query object to execute
   * @returns Query execution result
   */
  async executeSecureQuery(secureQuery: any): Promise<QueryExecutionResult> {
    return executeSecureQueryWithMonitoring(
      this.secureQueryBuilder,
      secureQuery,
      this.debug
    )
  }
}
