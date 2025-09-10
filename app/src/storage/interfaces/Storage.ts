/**
 * Core Storage interface definitions
 * 
 * This file defines the base Storage interface and related types
 * as part of Stage 1: Storage Interface Definition (Task 1.1)
 * 
 * The interface design is based on the comprehensive planning in:
 * context-network/planning/storage-abstraction/interface-design.md
 */

// ============================================================================
// CORE STORAGE INTERFACE
// ============================================================================

/**
 * Core Storage interface - all storage adapters must implement this
 * Provides basic key-value operations with async-first design
 */
export interface Storage<T = any> {
  /**
   * Retrieve a value by key
   * @param key The key to retrieve
   * @returns Promise resolving to the value, or undefined if key doesn't exist
   */
  get(key: string): Promise<T | undefined>
  
  /**
   * Store a value with a key
   * Overwrites if key exists
   * @param key The key to store under
   * @param value The value to store
   */
  set(key: string, value: T): Promise<void>
  
  /**
   * Delete a key-value pair
   * @param key The key to delete
   * @returns Promise resolving to true if key existed and was deleted, false otherwise
   */
  delete(key: string): Promise<boolean>
  
  /**
   * Check if a key exists
   * @param key The key to check
   * @returns Promise resolving to true if key exists, false otherwise
   */
  has(key: string): Promise<boolean>
  
  /**
   * Remove all key-value pairs
   */
  clear(): Promise<void>
  
  /**
   * Get the number of stored items
   * @returns Promise resolving to the count of items
   */
  size(): Promise<number>
  
  /**
   * Iterate over all keys
   * @returns AsyncIterator for all keys
   */
  keys(): AsyncIterator<string>
  
  /**
   * Iterate over all values
   * @returns AsyncIterator for all values
   */
  values(): AsyncIterator<T>
  
  /**
   * Iterate over all entries
   * @returns AsyncIterator for all [key, value] pairs
   */
  entries(): AsyncIterator<[string, T]>
}

// ============================================================================
// BATCH OPERATIONS INTERFACE
// ============================================================================

/**
 * Operation types for batch processing
 */
export type Operation<T> = 
  | { type: 'set', key: string, value: T }
  | { type: 'delete', key: string }
  | { type: 'clear' }

/**
 * Result of batch operation execution
 */
export interface BatchResult {
  /** Whether the batch operation succeeded */
  success: boolean
  /** Number of operations processed */
  operations: number
  /** Any errors that occurred during processing */
  errors?: Error[]
}

/**
 * Extended Storage interface with batch operations for improved performance
 */
export interface BatchStorage<T> extends Storage<T> {
  /**
   * Retrieve multiple values at once
   * @param keys Array of keys to retrieve
   * @returns Promise resolving to a Map of key-value pairs (only existing keys)
   */
  getMany(keys: string[]): Promise<Map<string, T>>
  
  /**
   * Store multiple key-value pairs
   * @param entries Map of key-value pairs to store
   */
  setMany(entries: Map<string, T>): Promise<void>
  
  /**
   * Delete multiple keys
   * @param keys Array of keys to delete
   * @returns Promise resolving to number of keys actually deleted
   */
  deleteMany(keys: string[]): Promise<number>
  
  /**
   * Perform multiple operations atomically
   * @param operations Array of operations to perform
   * @returns Promise resolving to batch result
   */
  batch(operations: Operation<T>[]): Promise<BatchResult>
}

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

/**
 * Base configuration for storage adapters
 */
export interface StorageConfig {
  /** Storage identifier for debugging and logging */
  id?: string
  /** Enable debug logging */
  debug?: boolean
}

/**
 * JSON file storage configuration
 */
export interface JSONStorageConfig extends StorageConfig {
  type: 'json'
  filePath: string
  encoding?: BufferEncoding
  pretty?: boolean
  atomic?: boolean  // Write to temp file then rename
  autoSave?: boolean // Auto-save on every operation (default: true)
}

/**
 * DuckDB storage configuration
 */
export interface DuckDBStorageConfig extends StorageConfig {
  type: 'duckdb'
  database: string        // File path or ':memory:'
  tableName?: string      // Default: 'storage'
  threads?: number        // Parallelism level
  enableParquet?: boolean // Parquet support
  poolSize?: number       // Connection pool size
  autoCreate?: boolean    // Auto-create database
  options?: {             // DuckDB-specific options
    access_mode?: 'read_write' | 'read_only'
    max_memory?: string
    threads?: string
  }
}

/**
 * Optional save capability for storage adapters that support manual persistence
 */
export interface SaveableStorage {
  /**
   * Manually save current state to persistent storage
   * Only relevant for adapters that support manual save mode
   */
  save(): Promise<void>
}

/**
 * Factory function type for creating storage adapters
 */
export type StorageFactory<T = any> = (config?: StorageConfig) => Promise<Storage<T>>

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Storage-specific error codes
 */
export enum StorageErrorCode {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_LOST = 'CONNECTION_LOST',
  
  // Operation errors
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  WRITE_FAILED = 'WRITE_FAILED',
  
  // Resource errors
  STORAGE_FULL = 'STORAGE_FULL',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Validation errors
  INVALID_KEY = 'INVALID_KEY',
  INVALID_VALUE = 'INVALID_VALUE',
  SERIALIZATION_FAILED = 'SERIALIZATION_FAILED',
  
  // I/O errors
  IO_ERROR = 'IO_ERROR'
}

/**
 * Base storage error class
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'StorageError'
    
    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError)
    }
  }
}