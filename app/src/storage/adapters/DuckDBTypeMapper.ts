/**
 * DuckDB Type Mapper
 * 
 * Handles type conversion between JavaScript types and DuckDB types.
 * Provides parameter binding utilities and BigInt processing for
 * JSON compatibility.
 */

import { DuckDBPreparedStatement } from '@duckdb/node-api'

/**
 * Type Mapper for DuckDB Storage Operations
 * 
 * Features:
 * - JavaScript to DuckDB type conversion
 * - Parameter binding for prepared statements
 * - BigInt to Number/String conversion
 * - JSON compatibility processing
 */
export class DuckDBTypeMapper {
  
  /**
   * Bind parameters to a prepared statement based on their JavaScript types
   * @param prepared The prepared statement to bind parameters to
   * @param params Array of parameters to bind
   */
  static bindParameters(prepared: DuckDBPreparedStatement, params: any[]): void {
    for (let i = 0; i < params.length; i++) {
      const param = params[i]
      const paramNum = i + 1
      
      if (param === null || param === undefined) {
        prepared.bindNull(paramNum)
      } else if (typeof param === 'string') {
        prepared.bindVarchar(paramNum, param)
      } else if (typeof param === 'number') {
        if (Number.isInteger(param)) {
          prepared.bindInteger(paramNum, param)
        } else {
          prepared.bindDouble(paramNum, param)
        }
      } else if (typeof param === 'boolean') {
        prepared.bindBoolean(paramNum, param)
      } else {
        // For complex objects, convert to string
        prepared.bindVarchar(paramNum, JSON.stringify(param))
      }
    }
  }
  
  /**
   * Convert SQL placeholder format from ? to $1, $2, etc. for DuckDB
   * @param sql SQL string with ? placeholders
   * @returns SQL string with numbered placeholders
   */
  static convertPlaceholders(sql: string): string {
    let paramIndex = 1
    return sql.replace(/\?/g, () => `$${paramIndex++}`)
  }
  
  /**
   * Process result rows to convert BigInt values to JSON-compatible types
   * @param rows Array of row objects from DuckDB query
   * @returns Processed rows with BigInt values converted
   */
  static processBigIntValues(rows: any[]): any[] {
    return rows.map(row => {
      if (row && typeof row === 'object') {
        const processed: any = {}
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'bigint') {
            // Convert BigInt to number only if it's within safe integer range
            if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
              processed[key] = Number(value)
            } else {
              processed[key] = value.toString()
            }
          } else {
            processed[key] = value
          }
        }
        return processed
      }
      return row
    })
  }
  
  /**
   * Convert a JavaScript value to its DuckDB-compatible representation
   * @param value The JavaScript value to convert
   * @returns The converted value suitable for DuckDB storage
   */
  static toStorageValue(value: any): any {
    if (value === null || value === undefined) {
      return null
    }
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value
    }
    
    // For objects, arrays, etc., serialize to JSON
    return JSON.stringify(value)
  }
  
  /**
   * Convert a DuckDB value to its JavaScript representation
   * @param value The value from DuckDB
   * @returns The converted JavaScript value
   */
  static fromStorageValue(value: any): any {
    if (value === null || value === undefined) {
      return undefined
    }
    
    // If it's a string that looks like JSON, try to parse it
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        // If parsing fails, return as-is
        return value
      }
    }
    
    // Handle BigInt conversion
    if (typeof value === 'bigint') {
      if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
        return Number(value)
      } else {
        return value.toString()
      }
    }
    
    return value
  }
  
  /**
   * Get the DuckDB type name for a JavaScript value
   * @param value The JavaScript value to analyze
   * @returns The appropriate DuckDB type name
   */
  static getDuckDBType(value: any): string {
    if (value === null || value === undefined) {
      return 'VARCHAR' // Default to VARCHAR for flexibility
    }
    
    if (typeof value === 'string') {
      return 'VARCHAR'
    }
    
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return 'BIGINT'
      } else {
        return 'DOUBLE'
      }
    }
    
    if (typeof value === 'boolean') {
      return 'BOOLEAN'
    }
    
    // For objects, arrays, etc., use JSON type if available, otherwise VARCHAR
    return 'JSON'
  }
  
  /**
   * Validate that a value can be stored in DuckDB
   * @param value The value to validate
   * @returns true if the value can be stored, false otherwise
   */
  static isValidStorageValue(value: any): boolean {
    try {
      // Test if the value can be converted to storage format
      const storageValue = DuckDBTypeMapper.toStorageValue(value)
      
      // Basic checks for problematic values
      if (typeof storageValue === 'string' && storageValue.length > 1048576) {
        // String too long (1MB limit)
        return false
      }
      
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Sanitize a value for safe storage in DuckDB
   * @param value The value to sanitize
   * @returns The sanitized value
   */
  static sanitizeValue(value: any): any {
    if (!DuckDBTypeMapper.isValidStorageValue(value)) {
      // Return a safe default or truncated version
      if (typeof value === 'string' && value.length > 1048576) {
        return value.substring(0, 1048576)
      }
      
      // For other problematic values, return null
      return null
    }
    
    return value
  }
}