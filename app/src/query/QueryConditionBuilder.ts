/**
 * Query Condition Builder
 * 
 * Handles building and validation of query conditions for QueryBuilder.
 * Supports equality, comparison, pattern, inclusion, and composite conditions.
 */

import {
  Condition,
  EqualityCondition,
  ComparisonCondition,
  PatternCondition,
  InclusionCondition,
  CompositeCondition,
  StringKeys
} from './types'

/**
 * Condition Builder for Query Operations
 * 
 * Features:
 * - Basic condition creation (equality, comparison, pattern, inclusion)
 * - Composite condition building (AND, OR, NOT)
 * - Condition validation and type checking
 * - Immutable condition building patterns
 */
export class QueryConditionBuilder<T> {
  
  /**
   * Create an equality condition (= or !=)
   */
  static createEqualityCondition<T, K extends keyof T>(
    field: K,
    operator: '=' | '!=',
    value: T[K]
  ): EqualityCondition<T> {
    return {
      type: 'equality',
      field,
      operator,
      value
    }
  }

  /**
   * Create a comparison condition (>, >=, <, <=)
   */
  static createComparisonCondition<T, K extends keyof T>(
    field: K,
    operator: '>' | '>=' | '<' | '<=',
    value: T[K]
  ): ComparisonCondition<T> {
    return {
      type: 'comparison',
      field,
      operator,
      value
    }
  }

  /**
   * Create a pattern matching condition (for string fields only)
   */
  static createPatternCondition<T>(
    field: StringKeys<T>,
    operator: 'contains' | 'startsWith' | 'endsWith' | 'matches',
    value: string,
    caseSensitive: boolean = true
  ): PatternCondition<T> {
    return {
      type: 'pattern',
      field,
      operator,
      value,
      caseSensitive
    }
  }

  /**
   * Create an inclusion condition (in or not in)
   */
  static createInclusionCondition<T, K extends keyof T>(
    field: K,
    operator: 'in' | 'not in',
    values: T[K][]
  ): InclusionCondition<T> {
    return {
      type: 'inclusion',
      field,
      operator,
      values
    }
  }

  /**
   * Create a composite AND condition
   */
  static createAndCondition<T>(conditions: Condition<T>[]): CompositeCondition<T> {
    return {
      type: 'composite',
      operator: 'and',
      conditions
    }
  }

  /**
   * Create a composite OR condition
   */
  static createOrCondition<T>(conditions: Condition<T>[]): CompositeCondition<T> {
    return {
      type: 'composite',
      operator: 'or',
      conditions
    }
  }

  /**
   * Create a composite NOT condition
   */
  static createNotCondition<T>(condition: Condition<T>): CompositeCondition<T> {
    return {
      type: 'composite',
      operator: 'not',
      conditions: [condition]
    }
  }

  /**
   * Validate a condition for correctness
   */
  static validateCondition<T>(condition: Condition<T>): boolean {
    if (!condition || typeof condition !== 'object') {
      return false
    }

    switch (condition.type) {
      case 'equality':
        return QueryConditionBuilder.validateEqualityCondition(condition)
      case 'comparison':
        return QueryConditionBuilder.validateComparisonCondition(condition)
      case 'pattern':
        return QueryConditionBuilder.validatePatternCondition(condition)
      case 'inclusion':
        return QueryConditionBuilder.validateInclusionCondition(condition)
      case 'composite':
        return QueryConditionBuilder.validateCompositeCondition(condition)
      default:
        return false
    }
  }

  /**
   * Validate an equality condition
   */
  private static validateEqualityCondition<T>(condition: EqualityCondition<T>): boolean {
    return (
      typeof condition.field === 'string' &&
      (condition.operator === '=' || condition.operator === '!=') &&
      condition.value !== undefined
    )
  }

  /**
   * Validate a comparison condition
   */
  private static validateComparisonCondition<T>(condition: ComparisonCondition<T>): boolean {
    return (
      typeof condition.field === 'string' &&
      ['>', '>=', '<', '<='].includes(condition.operator) &&
      condition.value !== undefined
    )
  }

  /**
   * Validate a pattern condition
   */
  private static validatePatternCondition<T>(condition: PatternCondition<T>): boolean {
    return (
      typeof condition.field === 'string' &&
      ['contains', 'startsWith', 'endsWith', 'matches'].includes(condition.operator) &&
      typeof condition.value === 'string' &&
      typeof condition.caseSensitive === 'boolean'
    )
  }

  /**
   * Validate an inclusion condition
   */
  private static validateInclusionCondition<T>(condition: InclusionCondition<T>): boolean {
    return (
      typeof condition.field === 'string' &&
      (condition.operator === 'in' || condition.operator === 'not in') &&
      Array.isArray(condition.values) &&
      condition.values.length > 0
    )
  }

  /**
   * Validate a composite condition
   */
  private static validateCompositeCondition<T>(condition: CompositeCondition<T>): boolean {
    if (!['and', 'or', 'not'].includes(condition.operator)) {
      return false
    }

    if (!Array.isArray(condition.conditions)) {
      return false
    }

    if (condition.operator === 'not' && condition.conditions.length !== 1) {
      return false
    }

    if ((condition.operator === 'and' || condition.operator === 'or') && condition.conditions.length < 2) {
      return false
    }

    // Recursively validate nested conditions
    return condition.conditions.every(cond => QueryConditionBuilder.validateCondition(cond))
  }

  /**
   * Get the complexity score of a condition (for optimization purposes)
   */
  static getConditionComplexity<T>(condition: Condition<T>): number {
    switch (condition.type) {
      case 'equality':
      case 'comparison':
        return 1
      case 'pattern':
        // Pattern matching is more expensive
        return 3
      case 'inclusion':
        // Cost scales with number of values
        return Math.max(1, Math.log2(condition.values.length))
      case 'composite':
        // Composite conditions add the complexity of all their children
        const baseComplexity = condition.conditions.reduce((total, cond) => 
          total + QueryConditionBuilder.getConditionComplexity(cond), 0
        )
        // AND is slightly more expensive than OR, NOT adds overhead
        const multiplier = condition.operator === 'and' ? 1.2 : 
                          condition.operator === 'not' ? 1.5 : 1.0
        return baseComplexity * multiplier
      default:
        return 1
    }
  }

  /**
   * Optimize a condition by reordering and simplifying
   */
  static optimizeCondition<T>(condition: Condition<T>): Condition<T> {
    if (condition.type !== 'composite') {
      return condition
    }

    const optimizedConditions = condition.conditions
      .map(cond => QueryConditionBuilder.optimizeCondition(cond))
      .sort((a, b) => QueryConditionBuilder.getConditionComplexity(a) - QueryConditionBuilder.getConditionComplexity(b))

    return {
      ...condition,
      conditions: optimizedConditions
    }
  }

  /**
   * Check if two conditions are equivalent
   */
  static areConditionsEqual<T>(a: Condition<T>, b: Condition<T>): boolean {
    if (a.type !== b.type) {
      return false
    }

    switch (a.type) {
      case 'equality':
      case 'comparison':
        return (
          a.field === b.field &&
          a.operator === b.operator &&
          a.value === (b as typeof a).value
        )
      case 'pattern':
        return (
          a.field === b.field &&
          a.operator === b.operator &&
          a.value === (b as PatternCondition<T>).value &&
          a.caseSensitive === (b as PatternCondition<T>).caseSensitive
        )
      case 'inclusion':
        const bInclusion = b as InclusionCondition<T>
        return (
          a.field === bInclusion.field &&
          a.operator === bInclusion.operator &&
          a.values.length === bInclusion.values.length &&
          a.values.every((val, idx) => val === bInclusion.values[idx])
        )
      case 'composite':
        const bComposite = b as CompositeCondition<T>
        return (
          a.operator === bComposite.operator &&
          a.conditions.length === bComposite.conditions.length &&
          a.conditions.every((cond, idx) => 
            QueryConditionBuilder.areConditionsEqual(cond, bComposite.conditions[idx])
          )
        )
      default:
        return false
    }
  }

  /**
   * Convert a condition to a readable string (for debugging)
   */
  static conditionToString<T>(condition: Condition<T>): string {
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
          return `NOT (${QueryConditionBuilder.conditionToString(condition.conditions[0])})`
        }
        const conditionsStr = condition.conditions
          .map(cond => QueryConditionBuilder.conditionToString(cond))
          .join(` ${condition.operator.toUpperCase()} `)
        return `(${conditionsStr})`
      default:
        return '[Unknown Condition]'
    }
  }
}