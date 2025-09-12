/**
 * Query Helper Functions
 * 
 * Provides utility functions for query manipulation, optimization,
 * and common query operations. These are static utility methods
 * that don't belong to the main QueryBuilder class.
 */

import {
  Query,
  Condition,
  OrderBy,
  Pagination,
  GroupBy,
  Aggregation,
  Projection,
  HavingCondition,
  CompositeCondition
} from './types'

/**
 * Query Helper Utilities
 * 
 * Features:
 * - Query transformation and cloning
 * - Query optimization utilities
 * - Query comparison and merging
 * - String and debugging utilities
 */
export class QueryHelpers {
  
  /**
   * Create a deep clone of a query
   */
  static cloneQuery<T>(query: Query<T>): Query<T> {
    return {
      conditions: query.conditions.map(cond => QueryHelpers.cloneCondition(cond)),
      ordering: [...query.ordering],
      projection: query.projection ? { ...query.projection, fields: [...(query.projection.fields || [])] } : undefined,
      pagination: query.pagination ? { ...query.pagination } : undefined,
      grouping: query.grouping ? { ...query.grouping, fields: [...query.grouping.fields] } : undefined,
      aggregations: query.aggregations ? query.aggregations.map(agg => ({ ...agg })) : undefined,
      having: query.having ? { ...query.having } : undefined
    }
  }

  /**
   * Create a deep clone of a condition
   */
  static cloneCondition<T>(condition: Condition<T>): Condition<T> {
    switch (condition.type) {
      case 'equality':
      case 'comparison':
        return { ...condition }
      case 'pattern':
        return { ...condition }
      case 'inclusion':
        return { ...condition, values: [...condition.values] }
      case 'composite':
        return {
          ...condition,
          conditions: condition.conditions.map(cond => QueryHelpers.cloneCondition(cond))
        }
      default:
        return { ...condition }
    }
  }

  /**
   * Check if a query has any conditions
   */
  static hasConditions<T>(query: Query<T>): boolean {
    return query.conditions && query.conditions.length > 0
  }

  /**
   * Check if a query has ordering
   */
  static hasOrdering<T>(query: Query<T>): boolean {
    return query.ordering && query.ordering.length > 0
  }

  /**
   * Check if a query has pagination
   */
  static hasPagination<T>(query: Query<T>): boolean {
    return !!query.pagination
  }

  /**
   * Check if a query has aggregations
   */
  static hasAggregations<T>(query: Query<T>): boolean {
    return query.aggregations && query.aggregations.length > 0
  }

  /**
   * Check if a query has grouping
   */
  static hasGrouping<T>(query: Query<T>): boolean {
    return !!query.grouping
  }

  /**
   * Check if a query has projection
   */
  static hasProjection<T>(query: Query<T>): boolean {
    return !!query.projection
  }

  /**
   * Get all fields referenced in a query (for optimization)
   */
  static getReferencedFields<T>(query: Query<T>): Set<keyof T> {
    const fields = new Set<keyof T>()

    // Fields from conditions
    query.conditions.forEach(condition => {
      QueryHelpers.addConditionFields(condition, fields)
    })

    // Fields from ordering
    query.ordering.forEach(order => {
      fields.add(order.field)
    })

    // Fields from projection
    if (query.projection?.fields) {
      query.projection.fields.forEach(field => fields.add(field))
    }

    // Fields from grouping
    if (query.grouping) {
      query.grouping.fields.forEach(field => fields.add(field))
    }

    // Fields from aggregations
    if (query.aggregations) {
      query.aggregations.forEach(agg => {
        if (agg.field) {
          fields.add(agg.field)
        }
      })
    }

    return fields
  }

  /**
   * Add fields from a condition to the set
   */
  private static addConditionFields<T>(condition: Condition<T>, fields: Set<keyof T>): void {
    switch (condition.type) {
      case 'equality':
      case 'comparison':
      case 'pattern':
      case 'inclusion':
        fields.add(condition.field)
        break
      case 'composite':
        condition.conditions.forEach(cond => QueryHelpers.addConditionFields(cond, fields))
        break
    }
  }

  /**
   * Merge two queries (conditions are combined with AND)
   */
  static mergeQueries<T>(query1: Query<T>, query2: Query<T>): Query<T> {
    const merged: Query<T> = {
      conditions: [...query1.conditions, ...query2.conditions],
      ordering: [...query1.ordering, ...query2.ordering],
      projection: query2.projection || query1.projection,
      pagination: query2.pagination || query1.pagination,
      grouping: query2.grouping || query1.grouping,
      aggregations: [
        ...(query1.aggregations || []),
        ...(query2.aggregations || [])
      ],
      having: query2.having || query1.having
    }

    return merged
  }

  /**
   * Create an empty query
   */
  static emptyQuery<T>(): Query<T> {
    return {
      conditions: [],
      ordering: []
    }
  }

  /**
   * Check if two queries are equivalent
   */
  static areQueriesEqual<T>(query1: Query<T>, query2: Query<T>): boolean {
    // Compare conditions
    if (query1.conditions.length !== query2.conditions.length) {
      return false
    }
    for (let i = 0; i < query1.conditions.length; i++) {
      if (!QueryHelpers.areConditionsEqual(query1.conditions[i], query2.conditions[i])) {
        return false
      }
    }

    // Compare ordering
    if (query1.ordering.length !== query2.ordering.length) {
      return false
    }
    for (let i = 0; i < query1.ordering.length; i++) {
      if (!QueryHelpers.areOrderBysEqual(query1.ordering[i], query2.ordering[i])) {
        return false
      }
    }

    // Compare other properties
    return (
      QueryHelpers.arePaginationsEqual(query1.pagination, query2.pagination) &&
      QueryHelpers.areProjectionsEqual(query1.projection, query2.projection) &&
      QueryHelpers.areGroupingsEqual(query1.grouping, query2.grouping) &&
      QueryHelpers.areAggregationsEqual(query1.aggregations, query2.aggregations) &&
      QueryHelpers.areHavingsEqual(query1.having, query2.having)
    )
  }

  /**
   * Check if two conditions are equal
   */
  private static areConditionsEqual<T>(cond1: Condition<T>, cond2: Condition<T>): boolean {
    if (cond1.type !== cond2.type) {
      return false
    }

    switch (cond1.type) {
      case 'equality':
      case 'comparison':
        return (
          cond1.field === cond2.field &&
          cond1.operator === cond2.operator &&
          cond1.value === (cond2 as typeof cond1).value
        )
      case 'pattern':
        const pattern2 = cond2 as typeof cond1
        return (
          cond1.field === pattern2.field &&
          cond1.operator === pattern2.operator &&
          cond1.value === pattern2.value &&
          cond1.caseSensitive === pattern2.caseSensitive
        )
      case 'inclusion':
        const inclusion2 = cond2 as typeof cond1
        return (
          cond1.field === inclusion2.field &&
          cond1.operator === inclusion2.operator &&
          cond1.values.length === inclusion2.values.length &&
          cond1.values.every((val, idx) => val === inclusion2.values[idx])
        )
      case 'composite':
        const composite2 = cond2 as CompositeCondition<T>
        return (
          cond1.operator === composite2.operator &&
          cond1.conditions.length === composite2.conditions.length &&
          cond1.conditions.every((c, idx) => QueryHelpers.areConditionsEqual(c, composite2.conditions[idx]))
        )
      default:
        return false
    }
  }

  /**
   * Check if two OrderBy specifications are equal
   */
  private static areOrderBysEqual<T>(order1: OrderBy<T>, order2: OrderBy<T>): boolean {
    return (
      order1.field === order2.field &&
      (order1.direction || 'asc') === (order2.direction || 'asc')
    )
  }

  /**
   * Check if two pagination specifications are equal
   */
  private static arePaginationsEqual(pag1?: Pagination, pag2?: Pagination): boolean {
    if (!pag1 && !pag2) return true
    if (!pag1 || !pag2) return false
    return pag1.limit === pag2.limit && pag1.offset === pag2.offset
  }

  /**
   * Check if two projection specifications are equal
   */
  private static areProjectionsEqual<T>(proj1?: Projection<T>, proj2?: Projection<T>): boolean {
    if (!proj1 && !proj2) return true
    if (!proj1 || !proj2) return false
    if (!proj1.fields && !proj2.fields) return true
    if (!proj1.fields || !proj2.fields) return false
    return (
      proj1.fields.length === proj2.fields.length &&
      proj1.fields.every((field, idx) => field === proj2.fields![idx])
    )
  }

  /**
   * Check if two grouping specifications are equal
   */
  private static areGroupingsEqual<T>(group1?: GroupBy<T>, group2?: GroupBy<T>): boolean {
    if (!group1 && !group2) return true
    if (!group1 || !group2) return false
    return (
      group1.fields.length === group2.fields.length &&
      group1.fields.every((field, idx) => field === group2.fields[idx])
    )
  }

  /**
   * Check if two aggregation arrays are equal
   */
  private static areAggregationsEqual<T>(agg1?: Aggregation<T>[], agg2?: Aggregation<T>[]): boolean {
    if (!agg1 && !agg2) return true
    if (!agg1 || !agg2) return false
    return (
      agg1.length === agg2.length &&
      agg1.every((a, idx) => (
        a.function === agg2[idx].function &&
        a.field === agg2[idx].field &&
        a.alias === agg2[idx].alias
      ))
    )
  }

  /**
   * Check if two having clauses are equal
   */
  private static areHavingsEqual(having1?: HavingCondition, having2?: HavingCondition): boolean {
    if (!having1 && !having2) return true
    if (!having1 || !having2) return false
    return (
      having1.aggregation === having2.aggregation &&
      having1.operator === having2.operator &&
      having1.value === having2.value
    )
  }

  /**
   * Convert a query to a readable string (for debugging)
   */
  static queryToString<T>(query: Query<T>): string {
    const parts: string[] = []

    // Conditions
    if (query.conditions.length > 0) {
      parts.push(`WHERE ${query.conditions.map(cond => QueryHelpers.conditionToString(cond)).join(' AND ')}`)
    }

    // Ordering
    if (query.ordering.length > 0) {
      parts.push(`ORDER BY ${query.ordering.map(order => 
        `${String(order.field)} ${order.direction || 'ASC'}`
      ).join(', ')}`)
    }

    // Grouping
    if (query.grouping) {
      parts.push(`GROUP BY ${query.grouping.fields.map(f => String(f)).join(', ')}`)
    }

    // Having
    if (query.having) {
      parts.push(`HAVING ${query.having.aggregation} ${query.having.operator} ${query.having.value}`)
    }

    // Pagination
    if (query.pagination) {
      if (query.pagination.limit !== undefined) {
        parts.push(`LIMIT ${query.pagination.limit}`)
      }
      if (query.pagination.offset !== undefined) {
        parts.push(`OFFSET ${query.pagination.offset}`)
      }
    }

    return parts.join(' ')
  }

  /**
   * Convert a condition to a readable string
   */
  private static conditionToString<T>(condition: Condition<T>): string {
    switch (condition.type) {
      case 'equality':
        return `${String(condition.field)} ${condition.operator} ${JSON.stringify(condition.value)}`
      case 'comparison':
        return `${String(condition.field)} ${condition.operator} ${JSON.stringify(condition.value)}`
      case 'pattern':
        const caseSuffix = condition.caseSensitive ? '' : ' (case insensitive)'
        return `${String(condition.field)} ${condition.operator} "${condition.value}"${caseSuffix}`
      case 'inclusion':
        return `${String(condition.field)} ${condition.operator} [${condition.values.map(v => JSON.stringify(v)).join(', ')}]`
      case 'composite':
        if (condition.operator === 'not') {
          return `NOT (${QueryHelpers.conditionToString(condition.conditions[0])})`
        }
        return `(${condition.conditions.map(cond => QueryHelpers.conditionToString(cond)).join(` ${condition.operator.toUpperCase()} `)})`
      default:
        return '[Unknown Condition]'
    }
  }

  /**
   * Optimize a query by reordering conditions and operations
   */
  static optimizeQuery<T>(query: Query<T>): Query<T> {
    const optimized = QueryHelpers.cloneQuery(query)

    // Optimize conditions by moving simpler ones first
    optimized.conditions.sort((a, b) => {
      const complexityA = QueryHelpers.getConditionComplexity(a)
      const complexityB = QueryHelpers.getConditionComplexity(b)
      return complexityA - complexityB
    })

    return optimized
  }

  /**
   * Get the complexity score of a condition
   */
  private static getConditionComplexity<T>(condition: Condition<T>): number {
    switch (condition.type) {
      case 'equality':
        return 1
      case 'comparison':
        return 2
      case 'pattern':
        return 4 // Pattern matching is expensive
      case 'inclusion':
        return 2 + Math.log2(condition.values.length) // Scales with array size
      case 'composite':
        const baseComplexity = condition.conditions.reduce((total, cond) => 
          total + QueryHelpers.getConditionComplexity(cond), 0
        )
        // NOT adds overhead, AND/OR scale with children
        return condition.operator === 'not' ? baseComplexity * 1.5 : baseComplexity
      default:
        return 1
    }
  }

  /**
   * Extract fields that have equality conditions (useful for indexing)
   */
  static getEqualityFields<T>(query: Query<T>): Map<keyof T, any> {
    const equalityFields = new Map<keyof T, any>()
    
    const processCondition = (condition: Condition<T>) => {
      if (condition.type === 'equality' && condition.operator === '=') {
        equalityFields.set(condition.field, condition.value)
      } else if (condition.type === 'composite') {
        condition.conditions.forEach(processCondition)
      }
    }

    query.conditions.forEach(processCondition)
    return equalityFields
  }

  /**
   * Check if a query would benefit from an index
   */
  static suggestIndexes<T>(query: Query<T>): (keyof T)[] {
    const suggestions = new Set<keyof T>()

    // Fields in equality conditions are good index candidates
    const equalityFields = QueryHelpers.getEqualityFields(query)
    equalityFields.forEach((_, field) => suggestions.add(field))

    // Fields in ordering are good index candidates
    query.ordering.forEach(order => suggestions.add(order.field))

    // Fields in grouping might benefit from indexes
    if (query.grouping) {
      query.grouping.fields.forEach(field => suggestions.add(field))
    }

    return Array.from(suggestions)
  }
}