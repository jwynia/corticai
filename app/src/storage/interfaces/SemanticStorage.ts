/**
 * Semantic Storage Interface
 *
 * Defines the contract for the Semantic Storage role in CorticAI's dual-role
 * storage architecture. Semantic Storage handles analytics, aggregations,
 * full-text search, and typed projections of data.
 *
 * ## Dual-Role Architecture
 *
 * CorticAI separates storage concerns into two roles:
 * - **Primary Storage**: Graph relationships, flexible schema, real-time data
 * - **Semantic Storage**: Analytics, aggregations, typed projections (THIS)
 *
 * Semantic Storage provides:
 * - **Typed Schemas**: Strongly-typed data structures for reliable analytics
 * - **OLAP Optimization**: Columnar storage and vectorized query execution
 * - **Aggregations**: Fast GROUP BY, SUM, AVG, COUNT operations
 * - **Full-Text Search**: Indexed text search across content
 * - **Materialized Views**: Pre-computed query results for performance
 *
 * ## Backend Options
 *
 * Semantic Storage can be implemented by:
 * - **DuckDB**: Embedded OLAP database (recommended for local)
 * - **ClickHouse**: Columnar database for analytics
 * - **Azure Cosmos DB**: Cloud-native with analytics containers
 * - **PostgreSQL**: With columnar extensions for analytics
 *
 * @see PrimaryStorage - Complementary graph/flexible storage role
 * @see dual-role-storage-architecture - Architecture documentation
 */

import { Storage, BatchStorage, StorageConfig } from './Storage'

/**
 * Aggregation operators supported by Semantic Storage
 */
export type AggregationOperator = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct'

/**
 * Sort direction for query results
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Aggregation definition
 */
export interface Aggregation {
  /** Operator to apply */
  operator: AggregationOperator
  /** Field to aggregate on */
  field: string
  /** Alias for result */
  as?: string
}

/**
 * Query filter condition
 */
export interface QueryFilter {
  /** Field to filter on */
  field: string
  /** Comparison operator */
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'NOT IN' | 'LIKE' | 'NOT LIKE'
  /** Value to compare against */
  value: any
}

/**
 * Query sort order
 */
export interface QuerySort {
  /** Field to sort by */
  field: string
  /** Sort direction */
  direction: SortDirection
}

/**
 * Query definition for semantic storage
 */
export interface SemanticQuery {
  /** Table/collection to query */
  from: string
  /** Fields to select (empty = all fields) */
  select?: string[]
  /** Filter conditions (AND logic) */
  where?: QueryFilter[]
  /** Group by fields */
  groupBy?: string[]
  /** Aggregations to perform */
  aggregations?: Aggregation[]
  /** Sort order */
  orderBy?: QuerySort[]
  /** Maximum number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Query result from semantic storage
 */
export interface SemanticQueryResult<T = any> {
  /** Result rows */
  data: T[]
  /** Metadata about query execution */
  metadata: {
    /** Execution time in milliseconds */
    executionTime: number
    /** Number of rows scanned */
    rowsScanned: number
    /** Whether result came from cache */
    fromCache: boolean
    /** Estimated total rows (for pagination) */
    totalRows?: number
  }
  /** Any errors or warnings */
  errors?: string[]
}

/**
 * Materialized view definition
 */
export interface MaterializedView {
  /** Unique name for the view */
  name: string
  /** Query defining the view */
  query: SemanticQuery | string
  /** Refresh strategy */
  refreshStrategy: 'manual' | 'scheduled' | 'on-write'
  /** Refresh interval (for scheduled) */
  refreshInterval?: number
  /** Last refresh timestamp */
  lastRefreshed?: Date
}

/**
 * Full-text search options
 */
export interface SearchOptions {
  /** Fields to search across */
  fields: string[]
  /** Fuzzy matching tolerance (0-1) */
  fuzziness?: number
  /** Boost scores for specific fields */
  boost?: Record<string, number>
  /** Highlight matching terms in results */
  highlight?: boolean
  /** Maximum number of results */
  limit?: number
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult<T = any> {
  /** Matching document */
  document: T
  /** Relevance score (0-1) */
  score: number
  /** Highlighted snippets (if requested) */
  highlights?: Record<string, string[]>
}

/**
 * Semantic Storage Interface
 *
 * Provides analytics, aggregation, and search operations optimized for
 * OLAP workloads and reporting.
 *
 * Design Principles:
 * - **SQL-Based**: Primary query interface is SQL or SQL-like
 * - **Typed Schemas**: Enforces schemas for data reliability
 * - **Columnar Storage**: Optimized for analytical queries
 * - **Aggregation-First**: Fast GROUP BY and aggregation operations
 * - **Read-Optimized**: Optimized for query performance over write speed
 *
 * @template T Default entity type for storage (typically structured data)
 */
export interface SemanticStorage<T = any> extends BatchStorage<T> {
  // Inherits basic Storage operations: get, set, delete, etc.
  // Inherits batch operations: getMany, setMany, deleteMany, batch

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Execute a semantic query with filters, aggregations, and sorting
   *
   * @param query - Query definition with select, where, groupBy, etc.
   * @returns Promise resolving to query results
   *
   * @example
   * ```typescript
   * const result = await storage.query({
   *   from: 'entities',
   *   select: ['type', 'created_at'],
   *   where: [{ field: 'type', operator: '=', value: 'File' }],
   *   groupBy: ['type'],
   *   aggregations: [
   *     { operator: 'count', field: '*', as: 'total' }
   *   ],
   *   orderBy: [{ field: 'total', direction: 'desc' }],
   *   limit: 10
   * });
   * ```
   */
  query<R = T>(query: SemanticQuery): Promise<SemanticQueryResult<R>>

  /**
   * Execute raw SQL query
   *
   * Allows direct SQL execution for complex queries not expressible
   * through the query builder interface.
   *
   * @param sql - SQL query string
   * @param params - Optional query parameters (for parameterized queries)
   * @returns Promise resolving to query results
   *
   * @example
   * ```typescript
   * const result = await storage.executeSQL(
   *   'SELECT type, COUNT(*) as count FROM entities WHERE created_at > ? GROUP BY type',
   *   [Date.now() - 86400000] // Last 24 hours
   * );
   * ```
   */
  executeSQL<R = any>(sql: string, params?: any[]): Promise<SemanticQueryResult<R>>

  // ============================================================================
  // AGGREGATION OPERATIONS
  // ============================================================================

  /**
   * Perform aggregation on a field
   *
   * Convenience method for single-field aggregations without full query syntax.
   *
   * @param table - Table to aggregate
   * @param operator - Aggregation operator
   * @param field - Field to aggregate
   * @param filters - Optional filter conditions
   * @returns Promise resolving to aggregation result
   *
   * @example
   * ```typescript
   * const totalFiles = await storage.aggregate('entities', 'count', '*', [
   *   { field: 'type', operator: '=', value: 'File' }
   * ]);
   * ```
   */
  aggregate(
    table: string,
    operator: AggregationOperator,
    field: string,
    filters?: QueryFilter[]
  ): Promise<number>

  /**
   * Group by field and perform aggregations
   *
   * @param table - Table to query
   * @param groupBy - Fields to group by
   * @param aggregations - Aggregations to perform on each group
   * @param filters - Optional filter conditions
   * @returns Promise resolving to grouped results
   *
   * @example
   * ```typescript
   * const filesByType = await storage.groupBy(
   *   'entities',
   *   ['type'],
   *   [{ operator: 'count', field: '*', as: 'count' }]
   * );
   * // Result: [{ type: 'File', count: 42 }, { type: 'Concept', count: 18 }]
   * ```
   */
  groupBy(
    table: string,
    groupBy: string[],
    aggregations: Aggregation[],
    filters?: QueryFilter[]
  ): Promise<Record<string, any>[]>

  // ============================================================================
  // MATERIALIZED VIEWS
  // ============================================================================

  /**
   * Create a materialized view for frequently-accessed query results
   *
   * Materialized views pre-compute query results for fast retrieval.
   * Ideal for dashboard queries, reports, and complex joins.
   *
   * @param view - View definition with name, query, and refresh strategy
   * @returns Promise resolving when view is created
   *
   * @example
   * ```typescript
   * await storage.createMaterializedView({
   *   name: 'file_stats',
   *   query: {
   *     from: 'entities',
   *     where: [{ field: 'type', operator: '=', value: 'File' }],
   *     groupBy: ['properties.language'],
   *     aggregations: [
   *       { operator: 'count', field: '*', as: 'count' },
   *       { operator: 'avg', field: 'properties.size', as: 'avg_size' }
   *     ]
   *   },
   *   refreshStrategy: 'scheduled',
   *   refreshInterval: 3600000 // 1 hour
   * });
   * ```
   */
  createMaterializedView(view: MaterializedView): Promise<void>

  /**
   * Refresh a materialized view with latest data
   *
   * @param viewName - Name of the view to refresh
   * @returns Promise resolving when refresh is complete
   */
  refreshMaterializedView(viewName: string): Promise<void>

  /**
   * Query a materialized view
   *
   * @param viewName - Name of the view to query
   * @param filters - Optional additional filters
   * @returns Promise resolving to view results
   */
  queryMaterializedView<R = any>(
    viewName: string,
    filters?: QueryFilter[]
  ): Promise<SemanticQueryResult<R>>

  /**
   * Drop a materialized view
   *
   * @param viewName - Name of the view to drop
   * @returns Promise resolving when view is dropped
   */
  dropMaterializedView(viewName: string): Promise<void>

  /**
   * List all materialized views
   *
   * @returns Promise resolving to array of view definitions
   */
  listMaterializedViews(): Promise<MaterializedView[]>

  // ============================================================================
  // FULL-TEXT SEARCH
  // ============================================================================

  /**
   * Perform full-text search across indexed fields
   *
   * @param table - Table to search
   * @param searchText - Text to search for
   * @param options - Search options (fields, fuzziness, etc.)
   * @returns Promise resolving to search results with relevance scores
   *
   * @example
   * ```typescript
   * const results = await storage.search(
   *   'documents',
   *   'dependency injection',
   *   {
   *     fields: ['title', 'content'],
   *     fuzziness: 0.8,
   *     boost: { title: 2.0 },
   *     highlight: true,
   *     limit: 20
   *   }
   * );
   *
   * results.forEach(r => {
   *   console.log(`Score: ${r.score}, Title: ${r.document.title}`);
   *   if (r.highlights) {
   *     console.log('Matches:', r.highlights);
   *   }
   * });
   * ```
   */
  search<R = T>(
    table: string,
    searchText: string,
    options: SearchOptions
  ): Promise<SearchResult<R>[]>

  /**
   * Create full-text search index on fields
   *
   * @param table - Table to index
   * @param fields - Fields to include in full-text index
   * @returns Promise resolving when index is created
   */
  createSearchIndex(table: string, fields: string[]): Promise<void>

  /**
   * Drop full-text search index
   *
   * @param table - Table with index to drop
   * @returns Promise resolving when index is dropped
   */
  dropSearchIndex(table: string): Promise<void>

  // ============================================================================
  // SCHEMA MANAGEMENT
  // ============================================================================

  /**
   * Define a typed schema for a table
   *
   * Enforces data types, constraints, and validation rules.
   *
   * @param table - Table name
   * @param schema - Schema definition
   * @returns Promise resolving when schema is created
   *
   * @example
   * ```typescript
   * await storage.defineSchema('entities', {
   *   id: { type: 'string', primaryKey: true },
   *   type: { type: 'string', required: true },
   *   created_at: { type: 'timestamp', default: 'now()' },
   *   properties: { type: 'json' }
   * });
   * ```
   */
  defineSchema(table: string, schema: Record<string, any>): Promise<void>

  /**
   * Get schema definition for a table
   *
   * @param table - Table name
   * @returns Promise resolving to schema definition
   */
  getSchema(table: string): Promise<Record<string, any> | null>

  // ============================================================================
  // EXPORT & ANALYTICS
  // ============================================================================

  /**
   * Export query results to Parquet format
   *
   * Useful for data science workflows, backup, and data lake integration.
   *
   * @param query - Query or SQL to execute
   * @param outputPath - Path to write Parquet file
   * @returns Promise resolving when export is complete
   *
   * @example
   * ```typescript
   * await storage.exportToParquet(
   *   { from: 'entities', select: ['*'] },
   *   './data/entities.parquet'
   * );
   * ```
   */
  exportToParquet?(query: SemanticQuery | string, outputPath: string): Promise<void>

  /**
   * Import data from Parquet file
   *
   * @param table - Target table
   * @param inputPath - Path to Parquet file
   * @returns Promise resolving to number of rows imported
   */
  importFromParquet?(table: string, inputPath: string): Promise<number>

  /**
   * Get query execution plan (for optimization)
   *
   * @param query - Query to analyze
   * @returns Promise resolving to execution plan
   */
  explainQuery?(query: SemanticQuery | string): Promise<any>
}

/**
 * Semantic Storage Configuration
 */
export interface SemanticStorageConfig extends StorageConfig {
  /** Database path or connection string */
  database: string

  /** Enable query result caching */
  enableCache?: boolean

  /** Cache size in MB */
  cacheSize?: number

  /** Enable Parquet support */
  enableParquet?: boolean

  /** Maximum threads for parallel query execution */
  maxThreads?: number

  /** Memory limit for query execution */
  memoryLimit?: string

  /** Read-only mode (prevent writes) */
  readOnly?: boolean
}

/**
 * Type guard to check if storage implements Semantic Storage
 *
 * @param storage - Storage adapter to check
 * @returns True if adapter implements SemanticStorage interface
 */
export function isSemanticStorage<T = any>(storage: any): storage is SemanticStorage<T> {
  return (
    typeof storage?.query === 'function' &&
    typeof storage?.executeSQL === 'function' &&
    typeof storage?.aggregate === 'function'
  )
}

/**
 * Semantic Storage Factory Type
 */
export type SemanticStorageFactory<T = any> = (
  config: SemanticStorageConfig
) => Promise<SemanticStorage<T>>
