/**
 * QueryBuilder - Fluent API for constructing type-safe queries
 * 
 * This class provides a fluent interface for building queries programmatically
 * with full type safety and immutability guarantees.
 * 
 * Based on the architecture design in:
 * context-network/planning/query-interface/architecture-design.md
 */

import {
  Query,
  Condition,
  EqualityCondition,
  ComparisonCondition,
  PatternCondition,
  SetCondition,
  NullCondition,
  OrderBy,
  Pagination,
  Projection,
  GroupBy,
  Aggregation,
  HavingCondition,
  QueryError,
  QueryErrorCode,
  validateQuery,
  StringKeys,
  NumericKeys,
  OperatorsForType
} from './types'

/**
 * Fluent QueryBuilder class for type-safe query construction
 */
export class QueryBuilder<T> {
  private readonly _conditions: Condition<T>[]
  private readonly _ordering: OrderBy<T>[]
  private readonly _projection?: Projection<T>
  private readonly _pagination?: Pagination
  private readonly _grouping?: GroupBy<T>
  private readonly _aggregations: Aggregation<T>[]
  private readonly _having?: HavingCondition

  /**
   * Creates a new QueryBuilder instance
   * Private constructor to ensure immutability
   */
  private constructor(
    conditions: Condition<T>[] = [],
    ordering: OrderBy<T>[] = [],
    projection?: Projection<T>,
    pagination?: Pagination,
    grouping?: GroupBy<T>,
    aggregations: Aggregation<T>[] = [],
    having?: HavingCondition
  ) {
    this._conditions = [...conditions]
    this._ordering = [...ordering]
    this._projection = projection ? { ...projection } : undefined
    this._pagination = pagination ? { ...pagination } : undefined
    this._grouping = grouping ? { ...grouping } : undefined
    this._aggregations = [...aggregations]
    this._having = having ? { ...having } : undefined
  }

  /**
   * Static factory method to create a new QueryBuilder
   */
  static create<T>(): QueryBuilder<T> {
    return new QueryBuilder<T>()
  }

  // ============================================================================
  // WHERE CONDITIONS
  // ============================================================================

  /**
   * Add an equality condition (= or !=)
   */
  where<K extends keyof T>(
    field: K,
    operator: '=' | '!=',
    value: T[K]
  ): QueryBuilder<T> {
    const condition: EqualityCondition<T> = {
      type: 'equality',
      field,
      operator,
      value
    }
    return this._addCondition(condition)
  }

  /**
   * Add a comparison condition (>, >=, <, <=)
   */
  whereComparison<K extends keyof T>(
    field: K,
    operator: '>' | '>=' | '<' | '<=',
    value: T[K]
  ): QueryBuilder<T> {
    const condition: ComparisonCondition<T> = {
      type: 'comparison',
      field,
      operator,
      value
    }
    return this._addCondition(condition)
  }

  /**
   * Add a pattern matching condition (for string fields only)
   */
  wherePattern(
    field: StringKeys<T>,
    operator: 'contains' | 'startsWith' | 'endsWith' | 'matches',
    value: string,
    caseSensitive: boolean = true
  ): QueryBuilder<T> {
    const condition: PatternCondition<T> = {
      type: 'pattern',
      field,
      operator,
      value,
      caseSensitive
    }
    return this._addCondition(condition)
  }

  /**
   * Add a set membership condition (IN or NOT IN)
   */
  whereIn<K extends keyof T>(
    field: K,
    values: Array<T[K]>,
    negate: boolean = false
  ): QueryBuilder<T> {
    if (!Array.isArray(values) || values.length === 0) {
      throw new QueryError('IN condition requires a non-empty array of values', QueryErrorCode.INVALID_VALUE)
    }

    const condition: SetCondition<T> = {
      type: 'set',
      field,
      operator: negate ? 'not_in' : 'in',
      values
    }
    return this._addCondition(condition)
  }

  /**
   * Add a null check condition
   */
  whereNull<K extends keyof T>(
    field: K,
    isNull: boolean = true
  ): QueryBuilder<T> {
    const condition: NullCondition<T> = {
      type: 'null',
      field,
      operator: isNull ? 'is_null' : 'is_not_null'
    }
    return this._addCondition(condition)
  }

  // ============================================================================
  // CONVENIENCE WHERE METHODS
  // ============================================================================

  /**
   * Convenience method for equality condition
   */
  whereEqual<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.where(field, '=', value)
  }

  /**
   * Convenience method for inequality condition
   */
  whereNotEqual<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.where(field, '!=', value)
  }

  /**
   * Convenience method for greater than condition
   */
  whereGreaterThan<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.whereComparison(field, '>', value)
  }

  /**
   * Convenience method for greater than or equal condition
   */
  whereGreaterThanOrEqual<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.whereComparison(field, '>=', value)
  }

  /**
   * Convenience method for less than condition
   */
  whereLessThan<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.whereComparison(field, '<', value)
  }

  /**
   * Convenience method for less than or equal condition
   */
  whereLessThanOrEqual<K extends keyof T>(field: K, value: T[K]): QueryBuilder<T> {
    return this.whereComparison(field, '<=', value)
  }

  /**
   * Convenience method for contains condition
   */
  whereContains(field: StringKeys<T>, value: string, caseSensitive: boolean = true): QueryBuilder<T> {
    return this.wherePattern(field, 'contains', value, caseSensitive)
  }

  /**
   * Convenience method for starts with condition
   */
  whereStartsWith(field: StringKeys<T>, value: string, caseSensitive: boolean = true): QueryBuilder<T> {
    return this.wherePattern(field, 'startsWith', value, caseSensitive)
  }

  /**
   * Convenience method for ends with condition
   */
  whereEndsWith(field: StringKeys<T>, value: string, caseSensitive: boolean = true): QueryBuilder<T> {
    return this.wherePattern(field, 'endsWith', value, caseSensitive)
  }

  // ============================================================================
  // ORDERING
  // ============================================================================

  /**
   * Add an ordering specification
   */
  orderBy<K extends keyof T>(
    field: K,
    direction: 'asc' | 'desc' = 'asc',
    nulls?: 'first' | 'last'
  ): QueryBuilder<T> {
    const ordering: OrderBy<T> = {
      field,
      direction,
      nulls
    }
    
    const newOrdering = [...this._ordering, ordering]
    
    return new QueryBuilder<T>(
      this._conditions,
      newOrdering,
      this._projection,
      this._pagination,
      this._grouping,
      this._aggregations,
      this._having
    )
  }

  /**
   * Convenience method for ascending order
   */
  orderByAsc<K extends keyof T>(field: K): QueryBuilder<T> {
    return this.orderBy(field, 'asc')
  }

  /**
   * Convenience method for descending order
   */
  orderByDesc<K extends keyof T>(field: K): QueryBuilder<T> {
    return this.orderBy(field, 'desc')
  }

  // ============================================================================
  // PAGINATION
  // ============================================================================

  /**
   * Set the limit for results
   */
  limit(count: number): QueryBuilder<T> {
    if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
      throw new QueryError('Limit must be a non-negative integer', QueryErrorCode.INVALID_VALUE)
    }

    const newPagination: Pagination = {
      limit: count,
      offset: this._pagination?.offset ?? 0
    }

    return new QueryBuilder<T>(
      this._conditions,
      this._ordering,
      this._projection,
      newPagination,
      this._grouping,
      this._aggregations,
      this._having
    )
  }

  /**
   * Set the offset for results
   */
  offset(count: number): QueryBuilder<T> {
    if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
      throw new QueryError('Offset must be a non-negative integer', QueryErrorCode.INVALID_VALUE)
    }

    const newPagination: Pagination = {
      limit: this._pagination?.limit ?? Number.MAX_SAFE_INTEGER,
      offset: count
    }

    return new QueryBuilder<T>(
      this._conditions,
      this._ordering,
      this._projection,
      newPagination,
      this._grouping,
      this._aggregations,
      this._having
    )
  }

  /**
   * Set both limit and offset
   */
  paginate(limit: number, offset: number = 0): QueryBuilder<T> {
    return this.limit(limit).offset(offset)
  }

  // ============================================================================
  // PROJECTION (SELECT)
  // ============================================================================

  /**
   * Select specific fields to include in results
   */
  select(...fields: Array<keyof T>): QueryBuilder<T> {
    if (fields.length === 0) {
      throw new QueryError('Select must specify at least one field', QueryErrorCode.INVALID_VALUE)
    }

    const projection: Projection<T> = {
      fields: [...fields],
      includeAll: false
    }

    return new QueryBuilder<T>(
      this._conditions,
      this._ordering,
      projection,
      this._pagination,
      this._grouping,
      this._aggregations,
      this._having
    )
  }

  // ============================================================================
  // GROUPING
  // ============================================================================

  /**
   * Group results by specified fields
   */
  groupBy(...fields: Array<keyof T>): QueryBuilder<T> {
    if (fields.length === 0) {
      throw new QueryError('GroupBy must specify at least one field', QueryErrorCode.INVALID_VALUE)
    }

    const grouping: GroupBy<T> = {
      fields: [...fields]
    }

    return new QueryBuilder<T>(
      this._conditions,
      this._ordering,
      this._projection,
      this._pagination,
      grouping,
      this._aggregations,
      this._having
    )
  }

  // ============================================================================
  // AGGREGATIONS
  // ============================================================================

  /**
   * Add count aggregation
   */
  count(alias: string): QueryBuilder<T> {
    const aggregation: Aggregation<T> = {
      type: 'count',
      alias
    }
    return this._addAggregation(aggregation)
  }

  /**
   * Add count distinct aggregation
   */
  countDistinct<K extends keyof T>(field: K, alias: string): QueryBuilder<T> {
    const aggregation: Aggregation<T> = {
      type: 'count_distinct',
      field,
      alias
    }
    return this._addAggregation(aggregation)
  }

  /**
   * Add sum aggregation (for numeric fields only)
   */
  sum<K extends NumericKeys<T>>(field: K, alias: string): QueryBuilder<T> {
    const aggregation: Aggregation<T> = {
      type: 'sum',
      field,
      alias
    }
    return this._addAggregation(aggregation)
  }

  /**
   * Add average aggregation (for numeric fields only)
   */
  avg<K extends NumericKeys<T>>(field: K, alias: string): QueryBuilder<T> {
    const aggregation: Aggregation<T> = {
      type: 'avg',
      field,
      alias
    }
    return this._addAggregation(aggregation)
  }

  /**
   * Add minimum aggregation
   */
  min<K extends keyof T>(field: K, alias: string): QueryBuilder<T> {
    const aggregation: Aggregation<T> = {
      type: 'min',
      field,
      alias
    }
    return this._addAggregation(aggregation)
  }

  /**
   * Add maximum aggregation
   */
  max<K extends keyof T>(field: K, alias: string): QueryBuilder<T> {
    const aggregation: Aggregation<T> = {
      type: 'max',
      field,
      alias
    }
    return this._addAggregation(aggregation)
  }

  // ============================================================================
  // HAVING CLAUSE
  // ============================================================================

  /**
   * Add having condition for filtering grouped results
   */
  having(
    field: string,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=',
    value: any
  ): QueryBuilder<T> {
    const havingCondition: HavingCondition = {
      field,
      operator,
      value
    }

    return new QueryBuilder<T>(
      this._conditions,
      this._ordering,
      this._projection,
      this._pagination,
      this._grouping,
      this._aggregations,
      havingCondition
    )
  }

  // ============================================================================
  // QUERY BUILDING
  // ============================================================================

  /**
   * Build and return the final Query object
   */
  build(): Query<T> {
    const query: Query<T> = {
      conditions: [...this._conditions],
      ordering: [...this._ordering],
      projection: this._projection ? { ...this._projection } : undefined,
      pagination: this._pagination ? { ...this._pagination } : undefined,
      grouping: this._grouping ? { ...this._grouping } : undefined,
      aggregations: this._aggregations.length > 0 ? [...this._aggregations] : undefined,
      having: this._having ? { ...this._having } : undefined
    }

    // Validate the built query
    try {
      validateQuery(query)
    } catch (error) {
      if (error instanceof QueryError) {
        throw error
      }
      throw new QueryError(
        'Query validation failed',
        QueryErrorCode.INVALID_SYNTAX,
        { originalError: error }
      )
    }

    return query
  }

  /**
   * Get a copy of current conditions (for debugging/inspection)
   */
  getConditions(): readonly Condition<T>[] {
    return [...this._conditions]
  }

  /**
   * Get a copy of current ordering (for debugging/inspection)
   */
  getOrdering(): readonly OrderBy<T>[] {
    return [...this._ordering]
  }

  /**
   * Get current pagination settings (for debugging/inspection)
   */
  getPagination(): Pagination | undefined {
    return this._pagination ? { ...this._pagination } : undefined
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Add a condition to the query (immutably)
   */
  private _addCondition(condition: Condition<T>): QueryBuilder<T> {
    const newConditions = [...this._conditions, condition]
    
    return new QueryBuilder<T>(
      newConditions,
      this._ordering,
      this._projection,
      this._pagination,
      this._grouping,
      this._aggregations,
      this._having
    )
  }

  /**
   * Add an aggregation to the query (immutably)
   */
  private _addAggregation(aggregation: Aggregation<T>): QueryBuilder<T> {
    const newAggregations = [...this._aggregations, aggregation]
    
    return new QueryBuilder<T>(
      this._conditions,
      this._ordering,
      this._projection,
      this._pagination,
      this._grouping,
      newAggregations,
      this._having
    )
  }

  // ============================================================================
  // STATIC HELPERS
  // ============================================================================

  /**
   * Create a QueryBuilder from an existing Query object
   */
  static fromQuery<T>(query: Query<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(
      query.conditions || [],
      query.ordering || [],
      query.projection,
      query.pagination,
      query.grouping,
      query.aggregations || [],
      query.having
    )
  }

  /**
   * Check if two QueryBuilder instances would produce equivalent queries
   */
  static areEquivalent<T>(a: QueryBuilder<T>, b: QueryBuilder<T>): boolean {
    const queryA = a.build()
    const queryB = b.build()
    
    return JSON.stringify(queryA) === JSON.stringify(queryB)
  }
}