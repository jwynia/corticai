/**
 * Storage Validator
 * 
 * Provides validation utilities for storage keys and values,
 * ensuring data integrity and type safety across all storage adapters.
 */

import { StorageError, StorageErrorCode } from '../interfaces/Storage'

/**
 * Validation helper for storage operations
 */
export class StorageValidator {
  /**
   * Validate that a key is a non-empty string
   * @throws StorageError if key is invalid
   */
  static validateKey(key: any): asserts key is string {
    if (key === null || key === undefined || typeof key !== 'string' || key === '') {
      throw new StorageError(
        'Key must be a non-empty string',
        StorageErrorCode.INVALID_KEY,
        { key, type: typeof key }
      )
    }
  }

  /**
   * Validate that a value can be serialized to JSON
   * @throws StorageError if value cannot be serialized
   */
  static validateValue(value: any): void {
    // Check for unsupported types first (faster than serialization check)
    if (typeof value === 'function') {
      throw new StorageError(
        'Cannot store function values',
        StorageErrorCode.INVALID_VALUE,
        { type: typeof value }
      )
    }

    if (typeof value === 'symbol') {
      throw new StorageError(
        'Cannot store symbol values',
        StorageErrorCode.INVALID_VALUE,
        { type: typeof value }
      )
    }

    // Check for circular references via serialization attempt
    try {
      JSON.stringify(value)
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        throw new StorageError(
          'Cannot store values with circular references',
          StorageErrorCode.SERIALIZATION_FAILED,
          { originalError: error }
        )
      }
      
      // Other serialization errors
      throw new StorageError(
        `Value serialization failed: ${(error as Error).message}`,
        StorageErrorCode.SERIALIZATION_FAILED,
        { originalError: error }
      )
    }
  }

  /**
   * Validate an array of keys
   * @throws StorageError if any key is invalid
   */
  static validateKeys(keys: any[]): asserts keys is string[] {
    if (!Array.isArray(keys)) {
      throw new StorageError(
        'Keys must be an array',
        StorageErrorCode.INVALID_KEY,
        { keys, type: typeof keys }
      )
    }

    keys.forEach((key, index) => {
      try {
        StorageValidator.validateKey(key)
      } catch (error) {
        if (error instanceof StorageError) {
          throw new StorageError(
            `Invalid key at index ${index}: ${error.message}`,
            error.code,
            { ...error.details, index }
          )
        }
        throw error
      }
    })
  }

  /**
   * Validate a Map of key-value pairs
   * @throws StorageError if any key or value is invalid
   */
  static validateEntries<T>(entries: Map<any, any>): asserts entries is Map<string, T> {
    if (!(entries instanceof Map)) {
      throw new StorageError(
        'Entries must be a Map',
        StorageErrorCode.INVALID_VALUE,
        { entries, type: typeof entries }
      )
    }

    for (const [key, value] of entries) {
      try {
        StorageValidator.validateKey(key)
        StorageValidator.validateValue(value)
      } catch (error) {
        if (error instanceof StorageError) {
          throw new StorageError(
            `Invalid entry [${key}]: ${error.message}`,
            error.code,
            { ...error.details, key }
          )
        }
        throw error
      }
    }
  }

  /**
   * Check if a value is serializable without throwing
   * @returns true if value can be serialized, false otherwise
   */
  static isSerializable(value: any): boolean {
    if (typeof value === 'function' || typeof value === 'symbol') {
      return false
    }

    try {
      JSON.stringify(value)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if a key is valid without throwing
   * @returns true if key is valid, false otherwise
   */
  static isValidKey(key: any): key is string {
    return typeof key === 'string' && key !== ''
  }

  /**
   * Sanitize a key for use in storage
   * @returns sanitized key or null if key cannot be sanitized
   */
  static sanitizeKey(key: any): string | null {
    if (StorageValidator.isValidKey(key)) {
      return key
    }

    // Try to convert to string
    if (key !== null && key !== undefined) {
      const stringKey = String(key)
      if (stringKey !== '' && stringKey !== '[object Object]') {
        return stringKey
      }
    }

    return null
  }
}