/**
 * AggregationUtils - Shared utilities for query aggregation operations
 * 
 * This module provides type-safe, reusable aggregation functions that can be
 * used across different query executors to reduce code duplication and ensure
 * consistent behavior.
 * 
 * Extracted from MemoryQueryExecutor to support the DuckDB refactoring and
 * provide a single source of truth for aggregation logic.
 */

import { Aggregation, QueryError, QueryErrorCode } from '../types'

/**
 * Custom error class for aggregation-related errors
 */
export class AggregationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AggregationError'
  }
}

/**
 * Aggregation utilities class providing static methods for common aggregation operations
 */
export class AggregationUtils {
  
  /**
   * Calculate count aggregation - counts all records in the dataset
   */
  static calculateCount<T>(data: T[]): number {
    return data.length
  }

  /**
   * Calculate count distinct aggregation - counts unique non-null values in a field
   */
  static calculateCountDistinct<T>(data: T[], field: keyof T): number {
    if (data.length === 0) {
      return 0
    }

    const uniqueValues = new Set()
    for (const item of data) {
      const value = item[field]
      if (value !== null && value !== undefined) {
        uniqueValues.add(value)
      }
    }
    return uniqueValues.size
  }

  /**
   * Calculate sum aggregation - sums numeric values in a field
   * Throws AggregationError if the field contains non-numeric values
   */
  static calculateSum<T>(data: T[], field: keyof T): number {
    if (data.length === 0) {
      return 0
    }

    // Validate that field contains numeric values
    this.validateAggregationField(data, 'sum', field)

    return data.reduce((sum, item) => {
      const value = item[field] as any
      if (typeof value === 'number' && !isNaN(value)) {
        return sum + value
      }
      return sum
    }, 0)
  }

  /**
   * Calculate average aggregation - calculates average of numeric values in a field
   * Returns null for empty datasets or when all values are null/undefined
   * Throws AggregationError if the field contains non-numeric values
   */
  static calculateAvg<T>(data: T[], field: keyof T): number | null {
    if (data.length === 0) {
      return null
    }

    // Validate that field contains numeric values
    this.validateAggregationField(data, 'avg', field)

    const numericValues = data
      .map(item => item[field] as any)
      .filter(value => typeof value === 'number' && !isNaN(value))

    if (numericValues.length === 0) {
      return null
    }

    return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
  }

  /**
   * Calculate minimum value aggregation - finds the smallest value in a field
   * Returns null for empty datasets or when all values are null/undefined
   * Works with any comparable type (numbers, strings, dates, etc.)
   */
  static calculateMin<T>(data: T[], field: keyof T): any {
    if (data.length === 0) {
      return null
    }

    const validValues = data
      .map(item => item[field])
      .filter(value => value !== null && value !== undefined)

    if (validValues.length === 0) {
      return null
    }

    return validValues.reduce((min, value) => value < min ? value : min)
  }

  /**
   * Calculate maximum value aggregation - finds the largest value in a field
   * Returns null for empty datasets or when all values are null/undefined
   * Works with any comparable type (numbers, strings, dates, etc.)
   */
  static calculateMax<T>(data: T[], field: keyof T): any {
    if (data.length === 0) {
      return null
    }

    const validValues = data
      .map(item => item[field])
      .filter(value => value !== null && value !== undefined)

    if (validValues.length === 0) {
      return null
    }

    return validValues.reduce((max, value) => value > max ? value : max)
  }

  /**
   * Calculate any aggregation based on the aggregation type
   * This is the main entry point that delegates to specific calculation methods
   */
  static calculateAggregation<T>(data: T[], aggregation: Aggregation<T>): any {
    switch (aggregation.type) {
      case 'count':
        return this.calculateCount(data)

      case 'count_distinct':
        if (!aggregation.field) {
          throw new QueryError('count_distinct requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        return this.calculateCountDistinct(data, aggregation.field)

      case 'sum':
        if (!aggregation.field) {
          throw new QueryError('sum requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        return this.calculateSum(data, aggregation.field)

      case 'avg':
        if (!aggregation.field) {
          throw new QueryError('avg requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        return this.calculateAvg(data, aggregation.field)

      case 'min':
        if (!aggregation.field) {
          throw new QueryError('min requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        return this.calculateMin(data, aggregation.field)

      case 'max':
        if (!aggregation.field) {
          throw new QueryError('max requires a field', QueryErrorCode.INVALID_SYNTAX)
        }
        return this.calculateMax(data, aggregation.field)

      default:
        throw new QueryError(`Unknown aggregation type: ${(aggregation as any).type}`, QueryErrorCode.INVALID_SYNTAX)
    }
  }

  /**
   * Validate that a field is appropriate for a given aggregation type
   * Throws AggregationError if validation fails
   */
  static validateAggregationField<T>(
    data: T[], 
    aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count_distinct', 
    field: keyof T
  ): void {
    // Only sum and avg require numeric fields
    if (aggregationType === 'sum' || aggregationType === 'avg') {
      if (!this.isNumericField(data, field)) {
        throw new QueryError(
          `Cannot apply ${aggregationType} to non-numeric field: ${String(field)}`,
          QueryErrorCode.TYPE_MISMATCH
        )
      }
    }
    // min, max, and count_distinct can work with any field type
  }

  /**
   * Check if a field contains numeric values
   * Returns true if the field contains only numbers (including NaN, ignoring null/undefined)
   * Returns true for empty datasets (default assumption)
   */
  static isNumericField<T>(data: T[], field: keyof T): boolean {
    if (data.length === 0) {
      return true // Default to true for empty datasets
    }

    // Get non-null values from the field
    const nonNullValues = data
      .map(item => item[field])
      .filter(value => value !== null && value !== undefined)

    if (nonNullValues.length === 0) {
      return true // All values are null, assume numeric
    }

    // Check if all non-null values are numbers (including NaN)
    return nonNullValues.every(value => typeof value === 'number')
  }

  /**
   * Apply multiple aggregations to a dataset
   * Returns an object with aggregation aliases as keys and results as values
   */
  static applyAggregations<T>(data: T[], aggregations: Aggregation<T>[]): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const aggregation of aggregations) {
      result[aggregation.alias] = this.calculateAggregation(data, aggregation)
    }
    
    return result
  }

  /**
   * Apply aggregations to grouped data
   * Returns an array of objects where each object contains group fields plus aggregation results
   */
  static applyAggregationsToGroups<T>(
    groups: Map<string, T[]>, 
    groupFields: Array<keyof T>,
    aggregations: Aggregation<T>[]
  ): any[] {
    const results: any[] = []
    
    for (const [groupKey, groupData] of groups.entries()) {
      const result: any = {}
      
      // Add group key fields to result
      const groupKeyObj = this.parseGroupKey(groupKey, groupFields)
      Object.assign(result, groupKeyObj)
      
      // Calculate aggregations for this group
      for (const aggregation of aggregations) {
        result[aggregation.alias] = this.calculateAggregation(groupData, aggregation)
      }
      
      results.push(result)
    }
    
    return results
  }

  /**
   * Create a unique string key for grouping by multiple fields
   */
  static createGroupKey<T>(item: T, fields: Array<keyof T>): string {
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
   * Parse a group key back into an object with field values
   */
  static parseGroupKey<T>(groupKey: string, fields: Array<keyof T>): any {
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
   * Group data by specified fields
   */
  static groupData<T>(data: T[], fields: Array<keyof T>): Map<string, T[]> {
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
}