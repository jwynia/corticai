/**
 * MemoryQueryExecutor - In-memory query execution
 * 
 * This executor processes queries entirely in memory using JavaScript
 * array operations. It's used as the fallback executor for all storage
 * adapters and provides the baseline query functionality.
 * 
 * Based on the architecture design in:
 * context-network/planning/query-interface/architecture-design.md
 */

import {
  Query,
  QueryResult,
  QueryMetadata,
  Condition,
  EqualityCondition,
  ComparisonCondition,
  PatternCondition,
  SetCondition,
  NullCondition,
  CompositeCondition,
  OrderBy,
  GroupBy,
  Aggregation,
  HavingCondition,
  QueryError,
  QueryErrorCode,
  isEqualityCondition,
  isComparisonCondition,
  isPatternCondition,
  isSetCondition,
  isNullCondition,
  isCompositeCondition
} from '../types'

/**
 * In-memory query executor
 * Processes queries using JavaScript array operations
 */
export class MemoryQueryExecutor<T> {
  /**
   * Execute a query against in-memory data
   */
  execute(query: Query<T>, data: T[]): QueryResult<T> {
    const startTime = Date.now()
    
    try {
      // Step 1: Apply filtering conditions
      let filteredData = this.applyFiltering(data, query.conditions)
      
      let resultData: any[]
      let totalCount: number
      
      // Check if we have aggregations or grouping
      if (query.aggregations && query.aggregations.length > 0) {
        // Aggregation query path
        if (query.grouping && query.grouping.fields.length > 0) {
          // Group by + aggregations
          resultData = this.applyGroupByAndAggregations(filteredData, query.grouping, query.aggregations)
        } else {
          // Simple aggregations (no grouping)
          resultData = this.applyAggregations(filteredData, query.aggregations)
        }
        
        // Apply having clause if present
        if (query.having) {
          resultData = this.applyHaving(resultData, query.having)
        }
        
        totalCount = resultData.length
        
        // Apply sorting to aggregated results
        if (query.ordering.length > 0) {
          resultData = this.applySortingToResults(resultData, query.ordering)
        }
        
        // Apply pagination to aggregated results
        if (query.pagination) {
          resultData = this.applyPaginationToResults(resultData, query.pagination)
        }
        
      } else {
        // Regular query path (no aggregations)
        // Step 2: Apply sorting
        if (query.ordering.length > 0) {
          filteredData = this.applySorting(filteredData, query.ordering)
        }
        
        // Step 3: Calculate total count before pagination
        totalCount = filteredData.length
        
        // Step 4: Apply pagination
        if (query.pagination) {
          filteredData = this.applyPagination(filteredData, query.pagination)
        }
        
        // Step 5: Apply projection (field selection)
        resultData = filteredData
        if (query.projection && !query.projection.includeAll) {
          resultData = this.applyProjection(filteredData, query.projection.fields)
        }
      }
      
      const endTime = Date.now()
      
      const metadata: QueryMetadata = {
        executionTime: endTime - startTime,
        fromCache: false,
        totalCount
      }
      
      return {
        data: resultData,
        metadata,
        errors: []
      }
    } catch (error) {
      const endTime = Date.now()
      
      const queryError = error instanceof QueryError 
        ? error 
        : new QueryError(
            `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
            QueryErrorCode.EXECUTION_FAILED,
            { originalError: error },
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

  // ============================================================================
  // FILTERING
  // ============================================================================

  /**
   * Apply all filtering conditions to the data
   */
  private applyFiltering(data: T[], conditions: Condition<T>[]): T[] {
    if (conditions.length === 0) {
      return data
    }
    
    return data.filter(item => this.evaluateConditions(item, conditions))
  }

  /**
   * Evaluate all conditions for a single item (AND logic)
   */
  private evaluateConditions(item: T, conditions: Condition<T>[]): boolean {
    return conditions.every(condition => this.evaluateCondition(item, condition))
  }

  /**
   * Evaluate a single condition for an item
   */
  private evaluateCondition(item: T, condition: Condition<T>): boolean {
    if (isEqualityCondition(condition)) {
      return this.evaluateEqualityCondition(item, condition)
    }
    
    if (isComparisonCondition(condition)) {
      return this.evaluateComparisonCondition(item, condition)
    }
    
    if (isPatternCondition(condition)) {
      return this.evaluatePatternCondition(item, condition)
    }
    
    if (isSetCondition(condition)) {
      return this.evaluateSetCondition(item, condition)
    }
    
    if (isNullCondition(condition)) {
      return this.evaluateNullCondition(item, condition)
    }
    
    if (isCompositeCondition(condition)) {
      return this.evaluateCompositeCondition(item, condition)
    }
    
    throw new QueryError(
      `Unknown condition type: ${(condition as any).type}`,
      QueryErrorCode.INVALID_SYNTAX,
      { condition }
    )
  }

  /**
   * Evaluate equality condition (= or !=)
   */
  private evaluateEqualityCondition(item: T, condition: EqualityCondition<T>): boolean {
    const fieldValue = item[condition.field]
    
    if (condition.operator === '=') {
      return this.areEqual(fieldValue, condition.value)
    } else {
      return !this.areEqual(fieldValue, condition.value)
    }
  }

  /**
   * Evaluate comparison condition (>, >=, <, <=)
   */
  private evaluateComparisonCondition(item: T, condition: ComparisonCondition<T>): boolean {
    const fieldValue = item[condition.field]
    const compareValue = condition.value
    
    // Handle null/undefined values
    if (fieldValue == null || compareValue == null) {
      return false // null values fail all comparisons
    }
    
    switch (condition.operator) {
      case '>':
        return fieldValue > compareValue
      case '>=':
        return fieldValue >= compareValue
      case '<':
        return fieldValue < compareValue
      case '<=':
        return fieldValue <= compareValue
      default:
        throw new QueryError(
          `Invalid comparison operator: ${condition.operator}`,
          QueryErrorCode.INVALID_OPERATOR
        )
    }
  }

  /**
   * Evaluate pattern condition (contains, startsWith, endsWith, matches)
   */
  private evaluatePatternCondition(item: T, condition: PatternCondition<T>): boolean {
    const fieldValue = item[condition.field]
    
    // Convert to string, handle null/undefined
    const strValue = fieldValue == null ? '' : String(fieldValue)
    let pattern = condition.value
    
    // Apply case sensitivity
    const compareStr = condition.caseSensitive !== false ? strValue : strValue.toLowerCase()
    const comparePattern = condition.caseSensitive !== false ? pattern : pattern.toLowerCase()
    
    switch (condition.operator) {
      case 'contains':
        return compareStr.includes(comparePattern)
      case 'startsWith':
        return compareStr.startsWith(comparePattern)
      case 'endsWith':
        return compareStr.endsWith(comparePattern)
      case 'matches':
        try {
          const regex = new RegExp(comparePattern)
          return regex.test(compareStr)
        } catch (error) {
          throw new QueryError(
            `Invalid regex pattern: ${pattern}`,
            QueryErrorCode.INVALID_VALUE,
            { pattern, error }
          )
        }
      default:
        throw new QueryError(
          `Invalid pattern operator: ${condition.operator}`,
          QueryErrorCode.INVALID_OPERATOR
        )
    }
  }

  /**
   * Evaluate set condition (in, not_in)
   */
  private evaluateSetCondition(item: T, condition: SetCondition<T>): boolean {
    const fieldValue = item[condition.field]
    const isInSet = condition.values.some(value => this.areEqual(fieldValue, value))
    
    return condition.operator === 'in' ? isInSet : !isInSet
  }

  /**
   * Evaluate null condition (is_null, is_not_null)
   */
  private evaluateNullCondition(item: T, condition: NullCondition<T>): boolean {
    const fieldValue = item[condition.field]
    const isNull = fieldValue == null
    
    return condition.operator === 'is_null' ? isNull : !isNull
  }

  /**
   * Evaluate composite condition (and, or, not)
   */
  private evaluateCompositeCondition(item: T, condition: CompositeCondition<T>): boolean {
    const { operator, conditions } = condition
    
    switch (operator) {
      case 'and':
        return conditions.every(cond => this.evaluateCondition(item, cond))
      case 'or':
        return conditions.some(cond => this.evaluateCondition(item, cond))
      case 'not':
        // NOT should have exactly one condition
        if (conditions.length !== 1) {
          throw new QueryError(
            'NOT condition must have exactly one sub-condition',
            QueryErrorCode.INVALID_SYNTAX
          )
        }
        return !this.evaluateCondition(item, conditions[0])
      default:
        throw new QueryError(
          `Invalid composite operator: ${operator}`,
          QueryErrorCode.INVALID_OPERATOR
        )
    }
  }

  // ============================================================================
  // SORTING
  // ============================================================================

  /**
   * Apply sorting to the data
   */
  private applySorting(data: T[], ordering: OrderBy<T>[]): T[] {
    if (ordering.length === 0) {
      return data
    }
    
    // Create a copy to avoid mutating the original array
    const sortedData = [...data]
    
    // Sort using a stable sort with multiple criteria
    return sortedData.sort((a, b) => this.compareItems(a, b, ordering))
  }

  /**
   * Compare two items based on multiple ordering criteria
   */
  private compareItems(a: T, b: T, ordering: OrderBy<T>[]): number {
    for (const order of ordering) {
      const result = this.compareFields(a, b, order)
      if (result !== 0) {
        return result
      }
    }
    return 0 // Items are equal for all criteria
  }

  /**
   * Compare two items based on a single ordering criterion
   */
  private compareFields(a: T, b: T, order: OrderBy<T>): number {
    const aValue = a[order.field]
    const bValue = b[order.field]
    
    // Handle null values according to nulls setting
    if (aValue == null && bValue == null) {
      return 0
    }
    
    if (aValue == null) {
      return order.nulls === 'first' ? -1 : 1
    }
    
    if (bValue == null) {
      return order.nulls === 'first' ? 1 : -1
    }
    
    // Compare non-null values
    let result = 0
    if (aValue < bValue) {
      result = -1
    } else if (aValue > bValue) {
      result = 1
    }
    
    // Apply direction
    return order.direction === 'desc' ? -result : result
  }

  // ============================================================================
  // PAGINATION
  // ============================================================================

  /**
   * Apply pagination to the data
   */
  private applyPagination(data: T[], pagination: { limit: number; offset: number }): T[] {
    const { offset, limit } = pagination
    
    // Validate pagination parameters
    if (offset < 0 || limit < 0) {
      throw new QueryError(
        'Pagination offset and limit must be non-negative',
        QueryErrorCode.INVALID_VALUE
      )
    }
    
    return data.slice(offset, offset + limit)
  }

  // ============================================================================
  // PROJECTION
  // ============================================================================

  /**
   * Apply field projection to the data
   */
  private applyProjection(data: T[], fields: Array<keyof T>): Partial<T>[] {
    return data.map(item => {
      const projected: Partial<T> = {}
      for (const field of fields) {
        projected[field] = item[field]
      }
      return projected
    }) as T[] // Cast back to T[] since we know projection contains all required fields
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if two values are equal (handles special cases like NaN, Date, etc.)
   */
  private areEqual(a: any, b: any): boolean {
    // Handle identical values (including NaN === NaN)
    if (Object.is(a, b)) {
      return true
    }
    
    // Handle null/undefined equality
    if (a == null || b == null) {
      return a == b
    }
    
    // Handle Date objects
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }
    
    // Handle arrays (shallow comparison)
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => this.areEqual(item, b[index]))
    }
    
    // Handle objects (shallow comparison)
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      
      if (keysA.length !== keysB.length) return false
      
      return keysA.every(key => this.areEqual(a[key], b[key]))
    }
    
    // Default comparison
    return a === b
  }

  // ============================================================================
  // AGGREGATION METHODS
  // ============================================================================

  /**
   * Apply aggregations to data (no grouping)
   */
  private applyAggregations(data: T[], aggregations: Aggregation<T>[]): any[] {
    const result: any = {}
    
    for (const agg of aggregations) {
      result[agg.alias] = this.calculateAggregation(data, agg)
    }
    
    return [result] // Return as single-item array
  }

  /**
   * Apply group by and aggregations
   */
  private applyGroupByAndAggregations(
    data: T[], 
    groupBy: GroupBy<T>, 
    aggregations: Aggregation<T>[]
  ): any[] {
    // Group data by the specified fields
    const groups = this.groupData(data, groupBy.fields)
    
    // Apply aggregations to each group
    const results: any[] = []
    
    for (const [groupKey, groupData] of groups.entries()) {
      const result: any = {}
      
      // Add group key fields to result
      const groupKeyObj = this.parseGroupKey(groupKey, groupBy.fields)
      Object.assign(result, groupKeyObj)
      
      // Calculate aggregations for this group
      for (const agg of aggregations) {
        result[agg.alias] = this.calculateAggregation(groupData, agg)
      }
      
      results.push(result)
    }
    
    return results
  }

  /**
   * Group data by specified fields
   */
  private groupData(data: T[], fields: Array<keyof T>): Map<string, T[]> {
    const groups = new Map<string, T[]>()
    
    for (const item of data) {
      const groupKey = this.createGroupKey(item, fields)
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      
      groups.get(groupKey)!.push(item)
    }
    
    return groups
  }

  /**
   * Create a unique key for grouping
   */
  private createGroupKey(item: T, fields: Array<keyof T>): string {
    const keyParts = fields.map(field => {
      const value = item[field]
      if (value === null || value === undefined) {
        return 'NULL'
      }
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
    })
    
    return keyParts.join('|')
  }

  /**
   * Parse group key back into field values
   */
  private parseGroupKey(groupKey: string, fields: Array<keyof T>): any {
    const parts = groupKey.split('|')
    const result: any = {}
    
    fields.forEach((field, index) => {
      const part = parts[index]
      if (part === 'NULL') {
        result[field] = null
      } else if (part.startsWith('{') || part.startsWith('[')) {
        try {
          result[field] = JSON.parse(part)
        } catch {
          result[field] = part
        }
      } else {
        // Try to parse as number or boolean, otherwise keep as string
        const num = Number(part)
        if (!isNaN(num) && part !== '') {
          result[field] = num
        } else if (part === 'true') {
          result[field] = true
        } else if (part === 'false') {
          result[field] = false
        } else {
          result[field] = part
        }
      }
    })
    
    return result
  }

  /**
   * Calculate a single aggregation for a dataset
   */
  private calculateAggregation(data: T[], aggregation: Aggregation<T>): any {
    if (data.length === 0) {
      switch (aggregation.type) {
        case 'count':
        case 'count_distinct':
          return 0
        case 'sum':
          return 0
        case 'avg':
        case 'min':
        case 'max':
          return null
        default:
          return null
      }
    }

    switch (aggregation.type) {
      case 'count':
        return data.length

      case 'count_distinct':
        if (!aggregation.field) {
          throw new QueryError('count_distinct requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        const uniqueValues = new Set()
        for (const item of data) {
          const value = item[aggregation.field]
          if (value !== null && value !== undefined) {
            uniqueValues.add(value)
          }
        }
        return uniqueValues.size

      case 'sum':
        if (!aggregation.field) {
          throw new QueryError('sum requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        // Check if field contains any non-numeric values (excluding null/undefined)
        const nonNullValues = data
          .map(item => item[aggregation.field!])
          .filter(value => value !== null && value !== undefined)
        
        if (nonNullValues.length > 0) {
          const hasOnlyNonNumericValues = nonNullValues.every(value => 
            typeof value !== 'number' || isNaN(value)
          )
          if (hasOnlyNonNumericValues) {
            throw new QueryError(
              `Cannot apply sum to non-numeric field: ${String(aggregation.field)}`,
              QueryErrorCode.TYPE_MISMATCH
            )
          }
        }
        return data.reduce((sum, item) => {
          const value = item[aggregation.field!] as any
          if (typeof value === 'number' && !isNaN(value)) {
            return sum + value
          }
          return sum
        }, 0)

      case 'avg':
        if (!aggregation.field) {
          throw new QueryError('avg requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        // Check if field contains any non-numeric values (excluding null/undefined)
        const avgNonNullValues = data
          .map(item => item[aggregation.field!])
          .filter(value => value !== null && value !== undefined)
        
        if (avgNonNullValues.length > 0) {
          const hasOnlyNonNumericValues = avgNonNullValues.every(value => 
            typeof value !== 'number' || isNaN(value)
          )
          if (hasOnlyNonNumericValues) {
            throw new QueryError(
              `Cannot apply avg to non-numeric field: ${String(aggregation.field)}`,
              QueryErrorCode.TYPE_MISMATCH
            )
          }
        }
        const numericValues = data
          .map(item => item[aggregation.field!] as any)
          .filter(value => typeof value === 'number' && !isNaN(value))
        
        if (numericValues.length === 0) {
          return null
        }
        
        return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length

      case 'min':
        if (!aggregation.field) {
          throw new QueryError('min requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        const validMinValues = data
          .map(item => item[aggregation.field!])
          .filter(value => value !== null && value !== undefined)
        
        if (validMinValues.length === 0) {
          return null
        }
        
        return validMinValues.reduce((min, value) => value < min ? value : min)

      case 'max':
        if (!aggregation.field) {
          throw new QueryError('max requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        const validMaxValues = data
          .map(item => item[aggregation.field!])
          .filter(value => value !== null && value !== undefined)
        
        if (validMaxValues.length === 0) {
          return null
        }
        
        return validMaxValues.reduce((max, value) => value > max ? value : max)

      default:
        throw new QueryError(
          `Unknown aggregation type: ${(aggregation as any).type}`,
          QueryErrorCode.INVALID_SYNTAX
        )
    }
  }

  /**
   * Apply having clause to filter grouped results
   */
  private applyHaving(data: any[], having: HavingCondition): any[] {
    return data.filter(row => this.evaluateHavingCondition(row, having))
  }

  /**
   * Evaluate having condition for a grouped result row
   */
  private evaluateHavingCondition(row: any, having: HavingCondition): boolean {
    const fieldValue = row[having.field]
    const compareValue = having.value

    // Handle null values
    if (fieldValue == null || compareValue == null) {
      return having.operator === '=' ? fieldValue == compareValue : fieldValue != compareValue
    }

    switch (having.operator) {
      case '=':
        return this.areEqual(fieldValue, compareValue)
      case '!=':
        return !this.areEqual(fieldValue, compareValue)
      case '>':
        return fieldValue > compareValue
      case '>=':
        return fieldValue >= compareValue
      case '<':
        return fieldValue < compareValue
      case '<=':
        return fieldValue <= compareValue
      default:
        throw new QueryError(
          `Invalid having operator: ${having.operator}`,
          QueryErrorCode.INVALID_OPERATOR
        )
    }
  }

  /**
   * Apply sorting to aggregated results (similar to regular sorting but works on any objects)
   */
  private applySortingToResults(data: any[], ordering: OrderBy<T>[]): any[] {
    if (ordering.length === 0) {
      return data
    }
    
    const sortedData = [...data]
    
    return sortedData.sort((a, b) => this.compareResultItems(a, b, ordering))
  }

  /**
   * Compare two result items based on ordering criteria
   */
  private compareResultItems(a: any, b: any, ordering: OrderBy<T>[]): number {
    for (const order of ordering) {
      const result = this.compareResultFields(a, b, order)
      if (result !== 0) {
        return result
      }
    }
    return 0
  }

  /**
   * Compare two result items based on a single ordering criterion
   */
  private compareResultFields(a: any, b: any, order: OrderBy<T>): number {
    const aValue = a[order.field]
    const bValue = b[order.field]
    
    // Handle null values according to nulls setting
    if (aValue == null && bValue == null) {
      return 0
    }
    
    if (aValue == null) {
      return order.nulls === 'first' ? -1 : 1
    }
    
    if (bValue == null) {
      return order.nulls === 'first' ? 1 : -1
    }
    
    // Compare non-null values
    let result = 0
    if (aValue < bValue) {
      result = -1
    } else if (aValue > bValue) {
      result = 1
    }
    
    // Apply direction
    return order.direction === 'desc' ? -result : result
  }

  /**
   * Apply pagination to aggregated results
   */
  private applyPaginationToResults(data: any[], pagination: { limit: number; offset: number }): any[] {
    const { offset, limit } = pagination
    
    if (offset < 0 || limit < 0) {
      throw new QueryError(
        'Pagination offset and limit must be non-negative',
        QueryErrorCode.INVALID_VALUE
      )
    }
    
    return data.slice(offset, offset + limit)
  }
}