/**
 * Core Query Interface Types
 * 
 * This file defines all the foundational types for the Query Interface Layer.
 * These types provide type-safe query construction and execution across all 
 * storage adapters in the system.
 * 
 * Based on the architecture design in:
 * context-network/planning/query-interface/architecture-design.md
 */

// ============================================================================
// CORE QUERY INTERFACES
// ============================================================================

/**
 * Core Query interface - represents a complete query specification
 * Generic type T represents the entity type being queried
 */
export interface Query<T = any> {
  /** The conditions to filter data */
  conditions: Condition<T>[]
  /** The ordering specification for results */
  ordering: OrderBy<T>[]
  /** Optional projection (field selection) */
  projection?: Projection<T>
  /** Optional pagination settings */
  pagination?: Pagination
  /** Optional grouping specification */
  grouping?: GroupBy<T>
  /** Optional aggregation operations */
  aggregations?: Aggregation<T>[]
  /** Optional having clause for filtering grouped results */
  having?: HavingCondition
  /** Optional depth for progressive loading */
  depth?: import('../types/context').ContextDepth
  /** Performance hints based on depth and other factors */
  performanceHints?: QueryPerformanceHints
}

/**
 * Result of query execution
 * Contains the data and metadata about the execution
 */
export interface QueryResult<T = any> {
  /** The actual result data */
  data: T[]
  /** Metadata about the query execution */
  metadata: QueryMetadata
  /** Any errors that occurred during execution */
  errors?: QueryError[]
}

/**
 * Metadata about query execution
 */
export interface QueryMetadata {
  /** Execution time in milliseconds */
  executionTime: number
  /** Whether the result came from cache */
  fromCache: boolean
  /** Total count before pagination (if available) */
  totalCount?: number
  /** Query execution plan (for debugging) */
  plan?: QueryPlan
}

/**
 * Performance hints for queries, especially depth-aware queries
 */
export interface QueryPerformanceHints {
  /** Whether this query is expected to reduce memory usage */
  expectedMemoryReduction: boolean
  /** Estimated memory factor compared to full entity loading */
  estimatedMemoryFactor: number
  /** Fields that will be optimized/projected for this query */
  optimizedFields: string[]
  /** Recommended cache strategy for this query type */
  cacheStrategy?: 'aggressive' | 'moderate' | 'minimal'
  /** Expected query execution speed relative to full query */
  expectedSpeedFactor?: number
}

/**
 * Query execution plan for optimization and debugging
 */
export interface QueryPlan {
  /** The type of execution strategy used */
  strategy: 'memory' | 'sql' | 'native'
  /** Estimated cost of the query */
  estimatedCost: number
  /** Steps in the execution plan */
  steps: QueryPlanStep[]
}

/**
 * Individual step in query execution plan
 */
export interface QueryPlanStep {
  /** Step type */
  type: 'filter' | 'sort' | 'paginate' | 'aggregate' | 'index_lookup'
  /** Description of the operation */
  description: string
  /** Estimated cost for this step */
  estimatedCost: number
}

// ============================================================================
// CONDITION TYPES
// ============================================================================

/**
 * Union type for all possible condition types
 */
export type Condition<T> = 
  | EqualityCondition<T>
  | ComparisonCondition<T>
  | PatternCondition<T>
  | SetCondition<T>
  | NullCondition<T>
  | CompositeCondition<T>

/**
 * Equality and inequality conditions
 */
export interface EqualityCondition<T> {
  type: 'equality'
  field: keyof T
  operator: '=' | '!='
  value: T[keyof T]
}

/**
 * Comparison conditions for ordered data types
 */
export interface ComparisonCondition<T> {
  type: 'comparison'
  field: keyof T
  operator: '>' | '>=' | '<' | '<='
  value: T[keyof T]
}

/**
 * Pattern matching conditions for strings
 */
export interface PatternCondition<T> {
  type: 'pattern'
  field: StringKeys<T>
  operator: 'contains' | 'startsWith' | 'endsWith' | 'matches'
  value: string
  caseSensitive?: boolean
}

/**
 * Set membership conditions
 */
export interface SetCondition<T> {
  type: 'set'
  field: keyof T
  operator: 'in' | 'not_in'
  values: Array<T[keyof T]>
}

/**
 * Null/undefined value conditions
 */
export interface NullCondition<T> {
  type: 'null'
  field: keyof T
  operator: 'is_null' | 'is_not_null'
}

/**
 * Composite conditions (AND, OR, NOT)
 */
export interface CompositeCondition<T> {
  type: 'composite'
  operator: 'and' | 'or' | 'not'
  conditions: Condition<T>[]
}

// ============================================================================
// ORDERING AND PAGINATION
// ============================================================================

/**
 * Ordering specification
 */
export interface OrderBy<T> {
  /** Field to order by */
  field: keyof T
  /** Sort direction */
  direction: 'asc' | 'desc'
  /** How to handle null values */
  nulls?: 'first' | 'last'
}

/**
 * Pagination specification
 */
export interface Pagination {
  /** Maximum number of results to return */
  limit: number
  /** Number of results to skip */
  offset: number
}

// ============================================================================
// PROJECTION AND GROUPING
// ============================================================================

/**
 * Field projection (SELECT clause equivalent)
 */
export interface Projection<T> {
  /** Fields to include in results */
  fields: Array<keyof T>
  /** Whether to include all fields by default */
  includeAll?: boolean
}

/**
 * Grouping specification
 */
export interface GroupBy<T> {
  /** Fields to group by */
  fields: Array<keyof T>
}

/**
 * Having condition for filtering grouped results
 * Similar to WHERE but operates on aggregated values
 */
export interface HavingCondition {
  /** Field name (can be an aggregation alias) */
  field: string
  /** Comparison operator */
  operator: '=' | '!=' | '>' | '>=' | '<' | '<='
  /** Value to compare against */
  value: any
}

/**
 * Aggregation operation
 */
export interface Aggregation<T> {
  /** Type of aggregation */
  type: 'count' | 'count_distinct' | 'sum' | 'avg' | 'min' | 'max'
  /** Field to aggregate (not needed for count) */
  field?: keyof T
  /** Alias for the result */
  alias: string
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Query error codes
 */
export enum QueryErrorCode {
  // Syntax errors
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  INVALID_FIELD = 'INVALID_FIELD',
  INVALID_OPERATOR = 'INVALID_OPERATOR',
  INVALID_VALUE = 'INVALID_VALUE',
  
  // Semantic errors
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  INCOMPATIBLE_OPERATION = 'INCOMPATIBLE_OPERATION',
  
  // Runtime errors
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  ADAPTER_ERROR = 'ADAPTER_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Resource errors
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  RESULT_TOO_LARGE = 'RESULT_TOO_LARGE'
}

/**
 * Query execution error
 */
export class QueryError extends Error {
  constructor(
    message: string,
    public code: QueryErrorCode,
    public details?: any,
    public query?: Query<any>
  ) {
    super(message)
    this.name = 'QueryError'
    
    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryError)
    }
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract string keys from a type
 * Used to constrain pattern matching to string fields
 */
export type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never
}[keyof T]

/**
 * Extract numeric keys from a type
 * Used to constrain numeric operations to number fields
 */
export type NumericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

/**
 * Extract comparable keys from a type
 * Used to constrain comparison operations to comparable fields
 */
export type ComparableKeys<T> = {
  [K in keyof T]: T[K] extends string | number | Date ? K : never
}[keyof T]

/**
 * Condition builder helper type
 * Used by QueryBuilder to ensure type safety
 */
export type ConditionBuilder<T> = {
  [K in keyof T]: {
    /** The field being conditioned on */
    field: K
    /** Available operators for this field type */
    operators: OperatorsForType<T[K]>
    /** Valid values for this field */
    valueType: T[K]
  }
}

/**
 * Available operators for a given type
 */
export type OperatorsForType<TValue> = 
  TValue extends string 
    ? ('=' | '!=' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'in' | 'not_in')
    : TValue extends number
      ? ('=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'not_in') 
      : TValue extends boolean
        ? ('=' | '!=')
        : TValue extends Date
          ? ('=' | '!=' | '>' | '>=' | '<' | '<=')
          : ('=' | '!=' | 'in' | 'not_in')

// ============================================================================
// ADAPTER CAPABILITIES
// ============================================================================

/**
 * Describes what query capabilities an adapter supports
 */
export interface AdapterCapabilities {
  /** Filtering capabilities */
  filtering: FilterCapabilities
  /** Sorting support */
  sorting: boolean
  /** Aggregation capabilities */
  aggregation: AggregationCapabilities
  /** Indexing capabilities */
  indexing: IndexCapabilities
  /** Streaming result support */
  streaming: boolean
  /** Transaction support */
  transactions: boolean
}

/**
 * Filtering capabilities
 */
export interface FilterCapabilities {
  /** Basic equality/inequality */
  equality: boolean
  /** Comparison operations */
  comparison: boolean
  /** Pattern matching */
  pattern: boolean
  /** Set membership */
  set: boolean
  /** Null checks */
  null: boolean
  /** Composite conditions */
  composite: boolean
}

/**
 * Aggregation capabilities
 */
export interface AggregationCapabilities {
  /** Count operations */
  count: boolean
  /** Sum operations */
  sum: boolean
  /** Average operations */
  avg: boolean
  /** Min/max operations */
  minMax: boolean
  /** Group by support */
  groupBy: boolean
  /** Having clause support */
  having: boolean
}

/**
 * Indexing capabilities
 */
export interface IndexCapabilities {
  /** Can create indexes */
  create: boolean
  /** Can use existing indexes */
  use: boolean
  /** Supported index types */
  types: Array<'btree' | 'hash' | 'fulltext'>
}

// ============================================================================
// TYPE GUARDS AND VALIDATORS
// ============================================================================

/**
 * Type guard for equality conditions
 */
export function isEqualityCondition<T>(condition: Condition<T>): condition is EqualityCondition<T> {
  return condition.type === 'equality'
}

/**
 * Type guard for comparison conditions
 */
export function isComparisonCondition<T>(condition: Condition<T>): condition is ComparisonCondition<T> {
  return condition.type === 'comparison'
}

/**
 * Type guard for pattern conditions
 */
export function isPatternCondition<T>(condition: Condition<T>): condition is PatternCondition<T> {
  return condition.type === 'pattern'
}

/**
 * Type guard for set conditions
 */
export function isSetCondition<T>(condition: Condition<T>): condition is SetCondition<T> {
  return condition.type === 'set'
}

/**
 * Type guard for null conditions
 */
export function isNullCondition<T>(condition: Condition<T>): condition is NullCondition<T> {
  return condition.type === 'null'
}

/**
 * Type guard for composite conditions
 */
export function isCompositeCondition<T>(condition: Condition<T>): condition is CompositeCondition<T> {
  return condition.type === 'composite'
}

/**
 * Validates that a query object is well-formed
 */
export function validateQuery<T>(query: Query<T>): void {
  if (!Array.isArray(query.conditions)) {
    throw new QueryError('Query conditions must be an array', QueryErrorCode.INVALID_SYNTAX)
  }
  
  if (!Array.isArray(query.ordering)) {
    throw new QueryError('Query ordering must be an array', QueryErrorCode.INVALID_SYNTAX)
  }
  
  if (query.pagination) {
    if (typeof query.pagination.limit !== 'number' || query.pagination.limit < 0) {
      throw new QueryError('Pagination limit must be a non-negative number', QueryErrorCode.INVALID_VALUE)
    }
    
    if (typeof query.pagination.offset !== 'number' || query.pagination.offset < 0) {
      throw new QueryError('Pagination offset must be a non-negative number', QueryErrorCode.INVALID_VALUE)
    }
  }
  
  // Validate each condition
  for (const condition of query.conditions) {
    validateCondition(condition)
  }
}

/**
 * Validates that a condition is well-formed
 */
export function validateCondition<T>(condition: Condition<T>): void {
  if (!condition.type) {
    throw new QueryError('Condition must have a type', QueryErrorCode.INVALID_SYNTAX)
  }
  
  // Type-specific validation would go here
  // This is a basic structure - full validation would be more comprehensive
}