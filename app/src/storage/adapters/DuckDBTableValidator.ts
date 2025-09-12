/**
 * DuckDB Table Validator
 * 
 * Provides table name validation utilities for DuckDB storage adapters.
 * Prevents SQL injection attacks and ensures table name compatibility
 * with DuckDB naming conventions and reserved keywords.
 */

import { StorageError, StorageErrorCode } from '../interfaces/Storage'

/**
 * Table Name Validator for DuckDB Storage
 * 
 * Features:
 * - SQL injection prevention
 * - Reserved keyword checking
 * - Character validation
 * - Length validation
 * - Case-insensitive keyword matching
 */
export class DuckDBTableValidator {
  // Constants for validation
  private static readonly MAX_TABLE_NAME_LENGTH = 128
  private static readonly VALID_TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  
  // SQL reserved keywords (case-insensitive)
  private static readonly RESERVED_KEYWORDS = new Set([
    // DML Keywords
    'select', 'from', 'where', 'insert', 'update', 'delete', 'values',
    'set', 'into', 'join', 'inner', 'left', 'right', 'outer', 'on',
    'union', 'intersect', 'except', 'order', 'by', 'group', 'having',
    'limit', 'offset', 'distinct', 'all', 'as', 'in', 'exists',
    'between', 'like', 'is', 'and', 'or', 'not', 'null',
    
    // DDL Keywords
    'create', 'drop', 'alter', 'table', 'index', 'view', 'trigger',
    'procedure', 'function', 'database', 'schema', 'column',
    'constraint', 'primary', 'foreign', 'key', 'references', 'unique',
    'check', 'default',
    
    // Data Types
    'int', 'integer', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric',
    'float', 'double', 'real', 'varchar', 'char', 'text', 'blob',
    'boolean', 'bool', 'date', 'time', 'timestamp', 'datetime',
    
    // Aggregate Functions
    'count', 'sum', 'avg', 'min', 'max', 'first', 'last',
    
    // Control Flow
    'case', 'when', 'then', 'else', 'end', 'if', 'while', 'loop',
    'for', 'repeat', 'until',
    
    // Transaction Keywords
    'begin', 'commit', 'rollback', 'transaction', 'savepoint',
    
    // Logical Values
    'true', 'false',
    
    // Common DuckDB-specific keywords
    'copy', 'pragma', 'explain', 'analyze', 'describe', 'show',
    'attach', 'detach', 'use', 'call', 'prepare', 'execute',
    'deallocate', 'declare', 'fetch', 'open', 'close', 'cursor'
  ])

  /**
   * Validate table name to prevent SQL injection and ensure compatibility
   * @param tableName The table name to validate
   * @throws StorageError if table name is invalid
   */
  static validateTableName(tableName: string | undefined): void {
    // Check for null, undefined, or empty string
    if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
      throw new StorageError(
        'Invalid table name: Table name cannot be empty, null, or undefined',
        StorageErrorCode.INVALID_VALUE,
        { tableName }
      )
    }

    const trimmedName = tableName.trim()

    // Check maximum length (reasonable limit for identifiers)
    if (trimmedName.length > DuckDBTableValidator.MAX_TABLE_NAME_LENGTH) {
      throw new StorageError(
        `Invalid table name: Table name exceeds maximum length of ${DuckDBTableValidator.MAX_TABLE_NAME_LENGTH} characters`,
        StorageErrorCode.INVALID_VALUE,
        { tableName, length: trimmedName.length }
      )
    }

    // Check for valid characters: only alphanumeric and underscore allowed
    if (!DuckDBTableValidator.VALID_TABLE_NAME_PATTERN.test(trimmedName)) {
      throw new StorageError(
        'Invalid table name: Table name must contain only alphanumeric characters and underscores, and cannot start with a number',
        StorageErrorCode.INVALID_VALUE,
        { tableName }
      )
    }

    // Check against SQL reserved keywords (case-insensitive)
    if (DuckDBTableValidator.RESERVED_KEYWORDS.has(trimmedName.toLowerCase())) {
      throw new StorageError(
        `Invalid table name: '${tableName}' is a reserved SQL keyword`,
        StorageErrorCode.INVALID_VALUE,
        { tableName, reason: 'reserved_keyword' }
      )
    }
  }
  
  /**
   * Check if a table name is valid without throwing an error
   * @param tableName The table name to check
   * @returns true if valid, false otherwise
   */
  static isValidTableName(tableName: string | undefined): boolean {
    try {
      DuckDBTableValidator.validateTableName(tableName)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Get validation error details for a table name
   * @param tableName The table name to validate
   * @returns null if valid, or error details if invalid
   */
  static getValidationError(tableName: string | undefined): { message: string; reason: string } | null {
    try {
      DuckDBTableValidator.validateTableName(tableName)
      return null
    } catch (error) {
      if (error instanceof StorageError) {
        return {
          message: error.message,
          reason: (error.details as any)?.reason || 'validation_failed'
        }
      }
      return {
        message: 'Unknown validation error',
        reason: 'unknown_error'
      }
    }
  }
  
  /**
   * Sanitize a table name by replacing invalid characters with underscores
   * Note: This is a best-effort approach and may not always produce a valid name
   * @param tableName The table name to sanitize
   * @returns A sanitized table name (may still need validation)
   */
  static sanitizeTableName(tableName: string): string {
    if (!tableName || typeof tableName !== 'string') {
      return 'default_table'
    }
    
    let sanitized = tableName.trim()
    
    // Replace invalid characters with underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '_')
    
    // Ensure it doesn't start with a number
    if (/^[0-9]/.test(sanitized)) {
      sanitized = `table_${sanitized}`
    }
    
    // Ensure it's not empty after sanitization
    if (!sanitized) {
      return 'default_table'
    }
    
    // Truncate to max length
    if (sanitized.length > DuckDBTableValidator.MAX_TABLE_NAME_LENGTH) {
      sanitized = sanitized.substring(0, DuckDBTableValidator.MAX_TABLE_NAME_LENGTH)
    }
    
    // If it's a reserved keyword, add suffix
    if (DuckDBTableValidator.RESERVED_KEYWORDS.has(sanitized.toLowerCase())) {
      sanitized = `${sanitized}_table`
      // Check length again after suffix
      if (sanitized.length > DuckDBTableValidator.MAX_TABLE_NAME_LENGTH) {
        const maxBase = DuckDBTableValidator.MAX_TABLE_NAME_LENGTH - 6 // "_table".length
        sanitized = `${sanitized.substring(0, maxBase)}_table`
      }
    }
    
    return sanitized
  }
}