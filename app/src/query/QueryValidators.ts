/**
 * Query Validators
 * 
 * Provides validation utilities for query components and parameters.
 * Ensures type safety and correctness of query operations.
 */

import {
  Query,
  Condition,
  OrderBy,
  Pagination,
  GroupBy,
  Aggregation,
  Projection,
  HavingCondition
} from './types'

/**
 * Query Validation Utilities
 * 
 * Features:
 * - Query component validation
 * - Parameter type checking
 * - Logical consistency validation
 * - Performance optimization hints
 */
export class QueryValidators {
  
  /**
   * Validate a complete query for correctness
   */
  static validateQuery<T>(query: Query<T>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate conditions
    if (!Array.isArray(query.conditions)) {
      errors.push('Query conditions must be an array')
    } else {
      query.conditions.forEach((condition, index) => {
        const conditionErrors = QueryValidators.validateCondition(condition)
        conditionErrors.forEach(error => errors.push(`Condition ${index}: ${error}`))
      })
    }

    // Validate ordering
    if (!Array.isArray(query.ordering)) {
      errors.push('Query ordering must be an array')
    } else {
      query.ordering.forEach((orderBy, index) => {
        const orderErrors = QueryValidators.validateOrderBy(orderBy)
        orderErrors.forEach(error => errors.push(`OrderBy ${index}: ${error}`))
      })
    }

    // Validate pagination
    if (query.pagination) {
      const paginationErrors = QueryValidators.validatePagination(query.pagination)
      paginationErrors.forEach(error => errors.push(`Pagination: ${error}`))
    }

    // Validate projection
    if (query.projection) {
      const projectionErrors = QueryValidators.validateProjection(query.projection)
      projectionErrors.forEach(error => errors.push(`Projection: ${error}`))
    }

    // Validate grouping
    if (query.grouping) {
      const groupingErrors = QueryValidators.validateGroupBy(query.grouping)
      groupingErrors.forEach(error => errors.push(`GroupBy: ${error}`))
    }

    // Validate aggregations
    if (query.aggregations) {
      if (!Array.isArray(query.aggregations)) {
        errors.push('Query aggregations must be an array')
      } else {
        query.aggregations.forEach((aggregation, index) => {
          const aggErrors = QueryValidators.validateAggregation(aggregation)
          aggErrors.forEach(error => errors.push(`Aggregation ${index}: ${error}`))
        })
      }
    }

    // Validate having clause
    if (query.having) {
      const havingErrors = QueryValidators.validateHaving(query.having)
      havingErrors.forEach(error => errors.push(`Having: ${error}`))
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate a condition
   */
  static validateCondition<T>(condition: Condition<T>): string[] {
    const errors: string[] = []

    if (!condition || typeof condition !== 'object') {
      errors.push('Condition must be an object')
      return errors
    }

    if (!condition.type) {
      errors.push('Condition must have a type')
      return errors
    }

    switch (condition.type) {
      case 'equality':
      case 'comparison':
        if (!condition.field) {
          errors.push('Condition must have a field')
        }
        if (!condition.operator) {
          errors.push('Condition must have an operator')
        }
        if (condition.value === undefined) {
          errors.push('Condition must have a value')
        }
        break

      case 'pattern':
        if (!condition.field) {
          errors.push('Pattern condition must have a field')
        }
        if (!condition.operator) {
          errors.push('Pattern condition must have an operator')
        }
        if (typeof condition.value !== 'string') {
          errors.push('Pattern condition value must be a string')
        }
        if (typeof condition.caseSensitive !== 'boolean') {
          errors.push('Pattern condition must specify case sensitivity')
        }
        break

      case 'set':
        if (!condition.field) {
          errors.push('Set/Inclusion condition must have a field')
        }
        if (!condition.operator) {
          errors.push('Set/Inclusion condition must have an operator')
        }
        if (!Array.isArray(condition.values)) {
          errors.push('Set/Inclusion condition values must be an array')
        } else if (condition.values.length === 0) {
          errors.push('Set/Inclusion condition values array cannot be empty')
        }
        break

      case 'null':
        if (!condition.field) {
          errors.push('Null condition must have a field')
        }
        if (!condition.operator) {
          errors.push('Null condition must have an operator')
        }
        if (!['is_null', 'is_not_null'].includes(condition.operator)) {
          errors.push('Null condition operator must be "is_null" or "is_not_null"')
        }
        break

      case 'composite':
        if (!condition.operator) {
          errors.push('Composite condition must have an operator')
        }
        if (!Array.isArray(condition.conditions)) {
          errors.push('Composite condition must have a conditions array')
        } else {
          if (condition.operator === 'not' && condition.conditions.length !== 1) {
            errors.push('NOT condition must have exactly one nested condition')
          }
          if ((condition.operator === 'and' || condition.operator === 'or') && condition.conditions.length < 2) {
            errors.push('AND/OR conditions must have at least two nested conditions')
          }
          condition.conditions.forEach((nestedCondition, index) => {
            const nestedErrors = QueryValidators.validateCondition(nestedCondition)
            nestedErrors.forEach(error => errors.push(`Nested condition ${index}: ${error}`))
          })
        }
        break

      default:
        errors.push(`Unknown condition type: ${(condition as any).type}`)
    }

    return errors
  }

  /**
   * Validate an OrderBy specification
   */
  static validateOrderBy<T>(orderBy: OrderBy<T>): string[] {
    const errors: string[] = []

    if (!orderBy || typeof orderBy !== 'object') {
      errors.push('OrderBy must be an object')
      return errors
    }

    if (!orderBy.field) {
      errors.push('OrderBy must have a field')
    }

    if (orderBy.direction && !['asc', 'desc'].includes(orderBy.direction)) {
      errors.push('OrderBy direction must be "asc" or "desc"')
    }

    return errors
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(pagination: Pagination): string[] {
    const errors: string[] = []

    if (!pagination || typeof pagination !== 'object') {
      errors.push('Pagination must be an object')
      return errors
    }

    if (pagination.limit !== undefined) {
      if (!Number.isInteger(pagination.limit) || pagination.limit <= 0) {
        errors.push('Pagination limit must be a positive integer')
      }
      // Note: Very large limits may impact performance but are not invalid
    }

    if (pagination.offset !== undefined) {
      if (!Number.isInteger(pagination.offset) || pagination.offset < 0) {
        errors.push('Pagination offset must be a non-negative integer')
      }
    }

    return errors
  }

  /**
   * Validate a projection specification
   */
  static validateProjection<T>(projection: Projection<T>): string[] {
    const errors: string[] = []

    if (!projection || typeof projection !== 'object') {
      errors.push('Projection must be an object')
      return errors
    }

    if (projection.fields !== undefined) {
      if (!Array.isArray(projection.fields)) {
        errors.push('Projection fields must be an array')
      } else if (projection.fields.length === 0) {
        errors.push('Projection fields array cannot be empty')
      }
    }

    return errors
  }

  /**
   * Validate a GroupBy specification
   */
  static validateGroupBy<T>(groupBy: GroupBy<T>): string[] {
    const errors: string[] = []

    if (!groupBy || typeof groupBy !== 'object') {
      errors.push('GroupBy must be an object')
      return errors
    }

    if (!Array.isArray(groupBy.fields)) {
      errors.push('GroupBy fields must be an array')
    } else if (groupBy.fields.length === 0) {
      errors.push('GroupBy fields array cannot be empty')
    }

    return errors
  }

  /**
   * Validate an aggregation specification
   */
  static validateAggregation<T>(aggregation: Aggregation<T>): string[] {
    const errors: string[] = []

    if (!aggregation || typeof aggregation !== 'object') {
      errors.push('Aggregation must be an object')
      return errors
    }

    if (!aggregation.type) {
      errors.push('Aggregation must have a type')
    } else {
      const validTypes = ['count', 'count_distinct', 'sum', 'avg', 'min', 'max']
      if (!validTypes.includes(aggregation.type)) {
        errors.push(`Invalid aggregation type: ${aggregation.type}`)
      }
    }

    if (!aggregation.alias) {
      errors.push('Aggregation must have an alias')
    }

    if (aggregation.type !== 'count' && !aggregation.field) {
      errors.push('Non-count aggregations must specify a field')
    }

    return errors
  }

  /**
   * Validate a having clause
   */
  static validateHaving(having: HavingCondition): string[] {
    const errors: string[] = []

    if (!having || typeof having !== 'object') {
      errors.push('Having clause must be an object')
      return errors
    }

    if (!having.field) {
      errors.push('Having clause must specify a field')
    }

    if (!having.operator) {
      errors.push('Having clause must have an operator')
    }

    if (having.value === undefined) {
      errors.push('Having clause must have a value')
    }

    return errors
  }

  /**
   * Check if a field name is valid
   */
  static isValidFieldName(fieldName: any): boolean {
    return typeof fieldName === 'string' && fieldName.length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)
  }

  /**
   * Check if a value is safe for querying (prevents injection)
   */
  static isSafeValue(value: any): boolean {
    // Null and undefined are safe
    if (value === null || value === undefined) {
      return true
    }

    // Primitives are generally safe
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return true
    }

    // Arrays of primitives are safe
    if (Array.isArray(value)) {
      return value.every(item => QueryValidators.isSafeValue(item))
    }

    // Objects need to be serializable
    try {
      JSON.stringify(value)
      return true
    } catch {
      return false
    }
  }

  /**
   * Estimate query complexity for performance optimization
   */
  static estimateQueryComplexity<T>(query: Query<T>): number {
    let complexity = 0

    // Conditions add complexity
    complexity += query.conditions.length * 2

    // Composite conditions add more
    query.conditions.forEach(condition => {
      if (condition.type === 'composite') {
        complexity += QueryValidators.estimateConditionComplexity(condition)
      }
    })

    // Sorting adds complexity
    complexity += query.ordering.length

    // Grouping adds significant complexity
    if (query.grouping) {
      complexity += query.grouping.fields.length * 5
    }

    // Aggregations add complexity
    if (query.aggregations) {
      complexity += query.aggregations.length * 3
    }

    return complexity
  }

  /**
   * Estimate complexity of a single condition
   */
  private static estimateConditionComplexity<T>(condition: Condition<T>): number {
    switch (condition.type) {
      case 'equality':
      case 'comparison':
        return 1
      case 'pattern':
        return 3 // Pattern matching is expensive
      case 'set':
        return Math.max(1, Math.log2((condition as any).values?.length || 1))
      case 'null':
        return 1
      case 'composite':
        const compositeCondition = condition as any
        return compositeCondition.conditions?.reduce((total: number, cond: Condition<T>) => 
          total + QueryValidators.estimateConditionComplexity(cond), 0) || 0
      default:
        return 1
    }
  }
}