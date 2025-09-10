/**
 * DuckDBQueryExecutor - Native DuckDB query execution with SQL translation
 * 
 * This executor translates Query objects to SQL and executes them directly
 * against a DuckDB database. It provides optimal performance for complex
 * queries by leveraging DuckDB's native SQL capabilities.
 * 
 * Based on the architecture design in:
 * context-network/planning/query-interface/architecture-design.md
 */

import Database from 'duckdb'
import { promisify } from 'util'
import {
  Query,
  QueryResult,
  QueryMetadata,
  QueryPlan,
  QueryPlanStep,
  QueryError,
  QueryErrorCode
} from '../types'

/**
 * Configuration options for DuckDBQueryExecutor
 */
export interface DuckDBQueryExecutorConfig {
  /** DuckDB database instance */
  database: Database.Database
  /** Table name to query */
  tableName: string
  /** Whether to use prepared statements (default: true) */
  usePreparedStatements?: boolean
  /** Query timeout in milliseconds (default: 30000) */
  timeoutMs?: number
  /** Whether to include query execution plan (default: false) */
  includePlan?: boolean
}

/**
 * SQL translation result
 */
export interface SQLTranslation {
  /** The generated SQL query */
  sql: string
  /** Parameter values for prepared statements */
  parameters: any[]
  /** Estimated query complexity */
  complexity: number
}

/**
 * DuckDB query executor
 * Translates queries to SQL and executes them natively in DuckDB
 */
export class DuckDBQueryExecutor<T> {
  private readonly config: DuckDBQueryExecutorConfig
  private readonly db: Database.Database
  private readonly dbAll: (sql: string, ...params: any[]) => Promise<any[]>
  private readonly dbRun: (sql: string, ...params: any[]) => Promise<void>

  /**
   * Create a DuckDBQueryExecutor
   */
  constructor(databaseOrConfig: Database.Database | DuckDBQueryExecutorConfig, tableName?: string) {
    if (tableName !== undefined) {
      // Legacy constructor: (database, tableName)
      this.config = {
        database: databaseOrConfig as Database.Database,
        tableName,
        usePreparedStatements: true,
        timeoutMs: 30000,
        includePlan: false
      }
    } else {
      // New constructor: (config)
      this.config = {
        usePreparedStatements: true,
        timeoutMs: 30000,
        includePlan: false,
        ...(databaseOrConfig as DuckDBQueryExecutorConfig)
      }
    }

    this.db = this.config.database
    this.dbAll = promisify(this.db.all.bind(this.db))
    this.dbRun = promisify(this.db.run.bind(this.db))
  }

  /**
   * Execute a query using DuckDB
   */
  async execute(query: Query<T>): Promise<QueryResult<T>> {
    const startTime = Date.now()
    
    try {
      // Translate query to SQL
      const translation = await this.translateToSQL(query)
      
      // Execute SQL query
      const rawResults = await this.executeSQL(translation)
      
      // Process results
      const results = this.processResults(rawResults, query)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // Build query plan if requested
      let plan: QueryPlan | undefined
      if (this.config.includePlan) {
        plan = await this.buildQueryPlan(translation, executionTime)
      }
      
      const metadata: QueryMetadata = {
        executionTime,
        fromCache: false, // DuckDB results are never cached at this level
        totalCount: this.calculateTotalCount(results, query),
        plan
      }

      return {
        data: results,
        metadata,
        errors: []
      }
    } catch (error) {
      const endTime = Date.now()
      
      const queryError = error instanceof QueryError 
        ? error 
        : new QueryError(
            `DuckDB query execution failed: ${error instanceof Error ? error.message : String(error)}`,
            QueryErrorCode.ADAPTER_ERROR,
            { 
              originalError: error,
              tableName: this.config.tableName
            },
            query
          )
      
      return {
        data: [],
        metadata: {
          executionTime: endTime - startTime,
          fromCache: false,
          totalCount: 0
        },
        errors: [queryError]
      }
    }
  }

  /**
   * Translate a Query to SQL
   */
  async translateToSQL(query: Query<T>): Promise<SQLTranslation> {
    const parameters: any[] = []
    let complexity = 1 // Base complexity
    
    // Build SQL parts
    const selectClause = this.buildSelectClause(query)
    const fromClause = `FROM ${this.config.tableName}`
    const whereClause = this.buildWhereClause(query.conditions, parameters)
    const groupByClause = this.buildGroupByClause(query.grouping)
    const havingClause = this.buildHavingClause(query.having, parameters)
    const orderByClause = this.buildOrderByClause(query.ordering)
    const limitClause = this.buildLimitClause(query.pagination)
    
    // Calculate complexity
    complexity += query.conditions.length
    complexity += query.ordering.length
    if (query.grouping) complexity += query.grouping.fields.length
    if (query.aggregations) complexity += query.aggregations.length
    if (query.having) complexity += 2
    
    // Combine SQL parts
    const sqlParts = [
      selectClause,
      fromClause,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      limitClause
    ].filter(part => part.trim() !== '')
    
    const sql = sqlParts.join('\n')
    
    return {
      sql,
      parameters,
      complexity
    }
  }

  /**
   * Execute SQL query with parameters
   */
  private async executeSQL(translation: SQLTranslation): Promise<any[]> {
    try {
      // Set up timeout if configured
      const timeoutPromise = this.config.timeoutMs ? 
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new QueryError('Query timeout', QueryErrorCode.TIMEOUT)), this.config.timeoutMs)
        ) : null
      
      // Execute query
      const queryPromise = this.config.usePreparedStatements ?
        this.dbAll(translation.sql, ...translation.parameters) :
        this.dbAll(translation.sql)
      
      // Race between query and timeout
      const results = timeoutPromise ?
        await Promise.race([queryPromise, timeoutPromise]) :
        await queryPromise
      
      return results || []
    } catch (error) {
      // Handle specific DuckDB errors
      if (error instanceof Error) {
        if (error.message.includes('no such table')) {
          throw new QueryError(
            `Table '${this.config.tableName}' does not exist`,
            QueryErrorCode.ADAPTER_ERROR,
            { tableName: this.config.tableName, originalError: error }
          )
        }
        
        if (error.message.includes('syntax error')) {
          throw new QueryError(
            `SQL syntax error: ${error.message}`,
            QueryErrorCode.INVALID_SYNTAX,
            { sql: translation.sql, originalError: error }
          )
        }
      }
      
      throw error
    }
  }

  /**
   * Process raw SQL results into typed results
   */
  private processResults(rawResults: any[], query: Query<T>): T[] {
    if (!Array.isArray(rawResults)) {
      return []
    }
    
    // Convert DuckDB results to proper types
    return rawResults.map(row => {
      const processedRow: any = {}
      
      for (const [key, value] of Object.entries(row)) {
        // Convert DuckDB types to JavaScript types
        processedRow[key] = this.convertDuckDBValue(value)
      }
      
      return processedRow as T
    })
  }

  /**
   * Convert DuckDB values to JavaScript values
   */
  private convertDuckDBValue(value: any): any {
    if (value === null || value === undefined) {
      return value
    }
    
    // DuckDB returns dates as strings in ISO format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
    
    return value
  }

  /**
   * Calculate total count for pagination metadata
   */
  private calculateTotalCount(results: T[], query: Query<T>): number {
    // If no pagination, total count equals result count
    if (!query.pagination) {
      return results.length
    }
    
    // If aggregation query, count is the number of groups
    if (query.aggregations && query.aggregations.length > 0) {
      return results.length
    }
    
    // For paginated queries, we'd need to run a separate COUNT query
    // For now, we'll estimate based on results + offset
    return results.length + (query.pagination.offset || 0)
  }

  /**
   * Build query execution plan
   */
  private async buildQueryPlan(translation: SQLTranslation, executionTime: number): Promise<QueryPlan> {
    const steps: QueryPlanStep[] = []
    
    // Analyze SQL to build plan steps
    const sql = translation.sql.toLowerCase()
    
    if (sql.includes('where')) {
      steps.push({
        type: 'filter',
        description: 'Apply WHERE conditions',
        estimatedCost: translation.parameters.length * 10
      })
    }
    
    if (sql.includes('order by')) {
      steps.push({
        type: 'sort',
        description: 'Sort results',
        estimatedCost: 50
      })
    }
    
    if (sql.includes('group by')) {
      steps.push({
        type: 'aggregate',
        description: 'Group and aggregate results',
        estimatedCost: 100
      })
    }
    
    if (sql.includes('limit')) {
      steps.push({
        type: 'paginate',
        description: 'Apply pagination',
        estimatedCost: 1
      })
    }
    
    return {
      strategy: 'sql',
      estimatedCost: translation.complexity * 10,
      steps
    }
  }

  // ============================================================================
  // SQL BUILDING METHODS
  // ============================================================================

  private buildSelectClause(query: Query<T>): string {
    if (query.aggregations && query.aggregations.length > 0) {
      // Aggregation query
      const selectParts: string[] = []
      
      // Add GROUP BY fields
      if (query.grouping && query.grouping.fields.length > 0) {
        selectParts.push(...query.grouping.fields.map(field => String(field)))
      }
      
      // Add aggregations
      for (const agg of query.aggregations) {
        let aggSql = ''
        switch (agg.type) {
          case 'count':
            aggSql = 'COUNT(*)'
            break
          case 'count_distinct':
            aggSql = `COUNT(DISTINCT ${String(agg.field)})`
            break
          case 'sum':
            aggSql = `SUM(${String(agg.field)})`
            break
          case 'avg':
            aggSql = `AVG(${String(agg.field)})`
            break
          case 'min':
            aggSql = `MIN(${String(agg.field)})`
            break
          case 'max':
            aggSql = `MAX(${String(agg.field)})`
            break
          default:
            throw new QueryError(`Unknown aggregation type: ${(agg as any).type}`, QueryErrorCode.INVALID_SYNTAX)
        }
        
        selectParts.push(`${aggSql} AS ${agg.alias}`)
      }
      
      return `SELECT ${selectParts.join(', ')}`
    }
    
    if (query.projection && !query.projection.includeAll) {
      // Projection query
      const fields = query.projection.fields.map(field => String(field))
      return `SELECT ${fields.join(', ')}`
    }
    
    // Select all
    return 'SELECT *'
  }

  private buildWhereClause(conditions: any[], parameters: any[]): string {
    if (conditions.length === 0) {
      return ''
    }
    
    const conditionSql = conditions.map(condition => this.buildConditionSql(condition, parameters)).join(' AND ')
    return `WHERE ${conditionSql}`
  }

  private buildConditionSql(condition: any, parameters: any[]): string {
    const field = String(condition.field)
    
    switch (condition.type) {
      case 'equality':
        parameters.push(condition.value)
        return `${field} ${condition.operator} ?`
        
      case 'comparison':
        parameters.push(condition.value)
        return `${field} ${condition.operator} ?`
        
      case 'pattern':
        return this.buildPatternConditionSql(condition, field, parameters)
        
      case 'set':
        const placeholders = condition.values.map(() => '?').join(', ')
        parameters.push(...condition.values)
        const operator = condition.operator === 'in' ? 'IN' : 'NOT IN'
        return `${field} ${operator} (${placeholders})`
        
      case 'null':
        const nullOp = condition.operator === 'is_null' ? 'IS NULL' : 'IS NOT NULL'
        return `${field} ${nullOp}`
        
      case 'composite':
        const subConditions = condition.conditions.map((subCond: any) => this.buildConditionSql(subCond, parameters))
        switch (condition.operator) {
          case 'and':
            return `(${subConditions.join(' AND ')})`
          case 'or':
            return `(${subConditions.join(' OR ')})`
          case 'not':
            return `NOT (${subConditions[0]})`
          default:
            throw new QueryError(`Unknown composite operator: ${condition.operator}`, QueryErrorCode.INVALID_OPERATOR)
        }
        
      default:
        throw new QueryError(`Unknown condition type: ${condition.type}`, QueryErrorCode.INVALID_SYNTAX)
    }
  }

  private buildPatternConditionSql(condition: any, field: string, parameters: any[]): string {
    const caseSensitive = condition.caseSensitive !== false
    const fieldExpr = caseSensitive ? field : `LOWER(${field})`
    const value = caseSensitive ? condition.value : condition.value.toLowerCase()
    
    switch (condition.operator) {
      case 'contains':
        parameters.push(`%${value}%`)
        return `${fieldExpr} LIKE ?`
        
      case 'startsWith':
        parameters.push(`${value}%`)
        return `${fieldExpr} LIKE ?`
        
      case 'endsWith':
        parameters.push(`%${value}`)
        return `${fieldExpr} LIKE ?`
        
      case 'matches':
        parameters.push(value)
        return `${fieldExpr} ~ ?` // DuckDB regex operator
        
      default:
        throw new QueryError(`Unknown pattern operator: ${condition.operator}`, QueryErrorCode.INVALID_OPERATOR)
    }
  }

  private buildGroupByClause(grouping: any): string {
    if (!grouping || !grouping.fields || grouping.fields.length === 0) {
      return ''
    }
    
    const fields = grouping.fields.map((field: any) => String(field))
    return `GROUP BY ${fields.join(', ')}`
  }

  private buildHavingClause(having: any, parameters: any[]): string {
    if (!having) {
      return ''
    }
    
    parameters.push(having.value)
    return `HAVING ${having.field} ${having.operator} ?`
  }

  private buildOrderByClause(ordering: any[]): string {
    if (ordering.length === 0) {
      return ''
    }
    
    const orderParts = ordering.map(order => {
      const field = String(order.field)
      const direction = order.direction.toUpperCase()
      let orderSql = `${field} ${direction}`
      
      if (order.nulls) {
        orderSql += ` NULLS ${order.nulls.toUpperCase()}`
      }
      
      return orderSql
    })
    
    return `ORDER BY ${orderParts.join(', ')}`
  }

  private buildLimitClause(pagination: any): string {
    if (!pagination) {
      return ''
    }
    
    return `LIMIT ${pagination.limit} OFFSET ${pagination.offset || 0}`
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get configuration
   */
  getConfig(): Readonly<DuckDBQueryExecutorConfig> {
    return { ...this.config }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.dbAll('SELECT 1')
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(): Promise<any[]> {
    try {
      return await this.dbAll(`DESCRIBE ${this.config.tableName}`)
    } catch (error) {
      throw new QueryError(
        `Failed to get schema for table '${this.config.tableName}': ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.ADAPTER_ERROR,
        { originalError: error, tableName: this.config.tableName }
      )
    }
  }

  /**
   * Create a DuckDBQueryExecutor instance for a specific database and table
   */
  static forTable<T>(database: Database.Database, tableName: string, options?: Partial<Omit<DuckDBQueryExecutorConfig, 'database' | 'tableName'>>): DuckDBQueryExecutor<T> {
    return new DuckDBQueryExecutor<T>({
      database,
      tableName,
      ...options
    })
  }

  /**
   * Create a DuckDBQueryExecutor instance with query plan enabled
   */
  static withPlan<T>(database: Database.Database, tableName: string, options?: Partial<Omit<DuckDBQueryExecutorConfig, 'database' | 'tableName' | 'includePlan'>>): DuckDBQueryExecutor<T> {
    return new DuckDBQueryExecutor<T>({
      database,
      tableName,
      includePlan: true,
      ...options
    })
  }
}