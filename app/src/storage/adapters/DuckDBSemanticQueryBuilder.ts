/**
 * DuckDB Semantic Query Builder
 *
 * Handles semantic query building and execution for DuckDB storage adapter.
 * Extracted from DuckDBStorageAdapter to improve modularity and maintainability.
 *
 * This module provides:
 * - Conversion from SemanticQuery to SQL
 * - Execution of semantic queries with metadata
 * - Raw SQL execution
 * - Query result formatting with timing and metrics
 *
 * Design Pattern: Dependency Injection
 * - Connection is injected for testability
 * - Debug/logging functions are injected
 * - No direct dependencies on DuckDBStorageAdapter
 */

import { DuckDBConnection } from '@duckdb/node-api'
import {
  SemanticQuery,
  SemanticQueryResult
} from '../interfaces/SemanticStorage'
import { DuckDBSQLGenerator } from './DuckDBSQLGenerator'

/**
 * Dependencies for DuckDBSemanticQueryBuilder
 */
export interface DuckDBSemanticQueryBuilderDeps {
  /** DuckDB connection for query execution */
  connection: DuckDBConnection
  /** Enable debug logging */
  debug?: boolean
  /** Custom logging function */
  log?: (message: string) => void
}

/**
 * Valid types for query parameters
 * Supports primitives, null, and nested arrays for IN clauses
 */
export type QueryParam = string | number | boolean | null | QueryParam[]

/**
 * SQL build result with parameterized query
 */
export interface SQLBuildResult {
  /** Generated SQL string */
  sql: string
  /** Parameters for prepared statement */
  params: QueryParam[]
}

/**
 * DuckDB Semantic Query Builder
 *
 * Converts semantic queries to SQL and executes them with DuckDB.
 */
export class DuckDBSemanticQueryBuilder {
  private readonly LOG_PREFIX = '[DuckDBSemanticQueryBuilder]'

  private connection: DuckDBConnection
  private debug: boolean
  private log: (message: string) => void

  constructor(deps: DuckDBSemanticQueryBuilderDeps) {
    this.connection = deps.connection
    this.debug = deps.debug ?? false
    this.log = deps.log ?? (() => {})
  }

  /**
   * Build error result with consistent structure
   * @private
   */
  private buildErrorResult<R>(
    startTime: number,
    rowsScanned: number,
    error: unknown
  ): SemanticQueryResult<R> {
    return {
      data: [],
      metadata: {
        executionTime: Date.now() - startTime,
        rowsScanned,
        fromCache: false
      },
      errors: [(error as Error).message]
    }
  }

  /**
   * Build SQL query from semantic query definition
   *
   * Converts a SemanticQuery object into a SQL string with parameterized values.
   *
   * @param semanticQuery - Semantic query definition
   * @returns SQL string and parameters for prepared statement
   */
  buildSQLFromSemanticQuery(semanticQuery: SemanticQuery): SQLBuildResult {
    const params: QueryParam[] = []

    // Build SELECT clause
    let selectClause = '*'
    if (semanticQuery.select?.length) {
      selectClause = semanticQuery.select.join(', ')
    }

    // Build aggregations (if present)
    if (semanticQuery.aggregations?.length) {
      const aggSelects = semanticQuery.aggregations.map(agg => {
        const alias = agg.as || `${agg.operator}_${agg.field}`
        return `${agg.operator.toUpperCase()}(${agg.field}) AS ${alias}`
      })

      if (semanticQuery.select?.length) {
        selectClause = `${semanticQuery.select.join(', ')}, ${aggSelects.join(', ')}`
      } else {
        selectClause = aggSelects.join(', ')
      }
    }

    // Build base query
    let sql = `SELECT ${selectClause} FROM ${semanticQuery.from}`

    // Build WHERE clause
    if (semanticQuery.where?.length) {
      const whereClauses = semanticQuery.where.map((filter) => {
        params.push(filter.value)
        return `${filter.field} ${filter.operator} $${params.length}`
      })
      sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    // Build GROUP BY clause
    if (semanticQuery.groupBy?.length) {
      sql += ` GROUP BY ${semanticQuery.groupBy.join(', ')}`
    }

    // Build ORDER BY clause
    if (semanticQuery.orderBy?.length) {
      const orderClauses = semanticQuery.orderBy.map(
        order => `${order.field} ${order.direction.toUpperCase()}`
      )
      sql += ` ORDER BY ${orderClauses.join(', ')}`
    }

    // Build LIMIT clause
    if (semanticQuery.limit !== undefined) {
      sql += ` LIMIT ${semanticQuery.limit}`
    }

    // Build OFFSET clause
    if (semanticQuery.offset !== undefined) {
      sql += ` OFFSET ${semanticQuery.offset}`
    }

    return { sql, params }
  }

  /**
   * Execute a semantic query and return results with metadata
   *
   * @param semanticQuery - Semantic query to execute
   * @returns Query results with execution metadata
   */
  async executeSemanticQuery<R = any>(
    semanticQuery: SemanticQuery
  ): Promise<SemanticQueryResult<R>> {
    const startTime = Date.now()
    let rowsScanned = 0

    try {
      // Build SQL from semantic query
      const { sql, params } = this.buildSQLFromSemanticQuery(semanticQuery)

      // Log query if debug enabled
      if (this.debug) {
        this.log(`${this.LOG_PREFIX} Executing semantic query: ${sql}`)
        if (params.length > 0) {
          this.log(`${this.LOG_PREFIX} Parameters: ${JSON.stringify(params)}`)
        }
      }

      // Execute query
      const data = await DuckDBSQLGenerator.executeQuery<R>(
        this.connection,
        sql,
        params,
        this.debug
      )
      rowsScanned = data.length

      const executionTime = Date.now() - startTime

      return {
        data,
        metadata: {
          executionTime,
          rowsScanned,
          fromCache: false
        }
      }
    } catch (error) {
      return this.buildErrorResult(startTime, rowsScanned, error)
    }
  }

  /**
   * Execute raw SQL query and return results with metadata
   *
   * @param sql - SQL query string
   * @param params - Optional query parameters
   * @returns Query results with execution metadata
   */
  async executeSQL<R = any>(
    sql: string,
    params: QueryParam[] = []
  ): Promise<SemanticQueryResult<R>> {
    const startTime = Date.now()

    try {
      // Log query if debug enabled
      if (this.debug) {
        this.log(`${this.LOG_PREFIX} Executing SQL: ${sql}`)
        if (params.length > 0) {
          this.log(`${this.LOG_PREFIX} Parameters: ${JSON.stringify(params)}`)
        }
      }

      // Execute query
      const data = await DuckDBSQLGenerator.executeQuery<R>(
        this.connection,
        sql,
        params,
        this.debug
      )

      return {
        data,
        metadata: {
          executionTime: Date.now() - startTime,
          rowsScanned: data.length,
          fromCache: false
        }
      }
    } catch (error) {
      return this.buildErrorResult(startTime, 0, error)
    }
  }
}
