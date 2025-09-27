/**
 * Base Storage Adapter
 * 
 * Abstract base class providing common functionality for storage adapters,
 * including iterator implementations and batch operation helpers.
 */

import { 
  Storage, 
  BatchStorage, 
  StorageConfig, 
  Operation, 
  BatchResult, 
  StorageError, 
  StorageErrorCode 
} from '../interfaces/Storage'
import { StorageValidator } from '../helpers/StorageValidator'
import { Logger } from '../../utils/Logger'

// Module-level logger for base adapter functionality
const logger = Logger.createConsoleLogger('BaseStorageAdapter')

/**
 * Abstract base class for storage adapters
 * 
 * Provides:
 * - Common iterator implementations
 * - Batch operation implementations
 * - Debug logging utilities
 * - Validation wrappers
 */
export abstract class BaseStorageAdapter<T = any> implements BatchStorage<T> {
  protected config: StorageConfig
  protected data: Map<string, T>

  constructor(config: StorageConfig = {}) {
    this.config = { debug: false, ...config }
    this.data = new Map()
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ============================================================================

  /**
   * Initialize storage (load data, connect to database, etc.)
   */
  protected abstract ensureLoaded(): Promise<void>

  /**
   * Persist changes if needed (save to file, commit transaction, etc.)
   */
  protected abstract persist(): Promise<void>

  // ============================================================================
  // BASIC STORAGE OPERATIONS
  // ============================================================================

  async get(key: string): Promise<T | undefined> {
    StorageValidator.validateKey(key)
    await this.ensureLoaded()
    
    const value = this.data.get(key)
    
    if (this.config.debug) {
      this.log(`GET ${key} -> ${value !== undefined ? 'found' : 'not found'}`)
    }
    
    return value
  }

  async set(key: string, value: T): Promise<void> {
    StorageValidator.validateKey(key)
    StorageValidator.validateValue(value)
    await this.ensureLoaded()
    
    this.data.set(key, value)
    await this.persist()
    
    if (this.config.debug) {
      this.log(`SET ${key}`)
    }
  }

  async delete(key: string): Promise<boolean> {
    StorageValidator.validateKey(key)
    await this.ensureLoaded()
    
    const existed = this.data.has(key)
    this.data.delete(key)
    
    if (existed) {
      await this.persist()
    }
    
    if (this.config.debug) {
      this.log(`DELETE ${key} -> ${existed ? 'deleted' : 'not found'}`)
    }
    
    return existed
  }

  async has(key: string): Promise<boolean> {
    StorageValidator.validateKey(key)
    await this.ensureLoaded()
    
    const exists = this.data.has(key)
    
    if (this.config.debug) {
      this.log(`HAS ${key} -> ${exists}`)
    }
    
    return exists
  }

  async clear(): Promise<void> {
    await this.ensureLoaded()
    
    const sizeBefore = this.data.size
    this.data.clear()
    
    await this.persist()
    
    if (this.config.debug) {
      this.log(`CLEAR -> removed ${sizeBefore} items`)
    }
  }

  async size(): Promise<number> {
    await this.ensureLoaded()
    
    const size = this.data.size
    
    if (this.config.debug) {
      this.log(`SIZE -> ${size}`)
    }
    
    return size
  }

  // ============================================================================
  // ITERATOR METHODS
  // ============================================================================

  async* keys(): AsyncIterable<string> {
    await this.ensureLoaded()
    
    // Create a snapshot of keys to avoid concurrent modification issues
    const keySnapshot = Array.from(this.data.keys())
    
    if (this.config.debug) {
      this.log(`KEYS iterator -> ${keySnapshot.length} keys`)
    }
    
    for (const key of keySnapshot) {
      yield key
    }
  }

  async* values(): AsyncIterable<T> {
    await this.ensureLoaded()
    
    // Create a snapshot of values to avoid concurrent modification issues
    const valueSnapshot = Array.from(this.data.values())
    
    if (this.config.debug) {
      this.log(`VALUES iterator -> ${valueSnapshot.length} values`)
    }
    
    for (const value of valueSnapshot) {
      yield value
    }
  }

  async* entries(): AsyncIterable<[string, T]> {
    await this.ensureLoaded()
    
    // Create a snapshot of entries to avoid concurrent modification issues
    const entrySnapshot = Array.from(this.data.entries())
    
    if (this.config.debug) {
      this.log(`ENTRIES iterator -> ${entrySnapshot.length} entries`)
    }
    
    for (const [key, value] of entrySnapshot) {
      yield [key, value]
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async getMany(keys: string[]): Promise<Map<string, T>> {
    StorageValidator.validateKeys(keys)
    await this.ensureLoaded()
    
    const results = new Map<string, T>()
    
    for (const key of keys) {
      const value = this.data.get(key)
      if (value !== undefined) {
        results.set(key, value)
      }
    }
    
    if (this.config.debug) {
      this.log(`GET_MANY ${keys.length} keys -> ${results.size} found`)
    }
    
    return results
  }

  async setMany(entries: Map<string, T>): Promise<void> {
    StorageValidator.validateEntries(entries)
    await this.ensureLoaded()
    
    // Apply all changes
    for (const [key, value] of entries) {
      this.data.set(key, value)
    }
    
    await this.persist()
    
    if (this.config.debug) {
      this.log(`SET_MANY ${entries.size} entries`)
    }
  }

  async deleteMany(keys: string[]): Promise<number> {
    StorageValidator.validateKeys(keys)
    await this.ensureLoaded()
    
    let deletedCount = 0
    
    for (const key of keys) {
      if (this.data.has(key)) {
        this.data.delete(key)
        deletedCount++
      }
    }
    
    if (deletedCount > 0) {
      await this.persist()
    }
    
    if (this.config.debug) {
      this.log(`DELETE_MANY ${keys.length} keys -> ${deletedCount} deleted`)
    }
    
    return deletedCount
  }

  async batch(operations: Operation<T>[]): Promise<BatchResult> {
    const errors: Error[] = []
    let processedCount = 0
    
    if (this.config.debug) {
      this.log(`BATCH ${operations.length} operations`)
    }
    
    try {
      await this.ensureLoaded()
      
      // Validate all operations first
      for (const operation of operations) {
        if (operation.type === 'set') {
          StorageValidator.validateKey(operation.key)
          StorageValidator.validateValue(operation.value)
        } else if (operation.type === 'delete') {
          StorageValidator.validateKey(operation.key)
        }
        // 'clear' operations need no validation
      }
      
      // Execute all operations
      for (const operation of operations) {
        try {
          switch (operation.type) {
            case 'set':
              this.data.set(operation.key, operation.value)
              break
              
            case 'delete':
              this.data.delete(operation.key)
              break
              
            case 'clear':
              this.data.clear()
              break
              
            default:
              throw new StorageError(
                `Unknown operation type: ${(operation as any).type}`,
                StorageErrorCode.INVALID_VALUE,
                { operation }
              )
          }
          processedCount++
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)))
        }
      }
      
      // Save if any operations succeeded
      if (processedCount > 0) {
        await this.persist()
      }
      
      const success = errors.length === 0
      
      if (this.config.debug) {
        this.log(`BATCH completed -> ${processedCount}/${operations.length} operations, success: ${success}`)
      }
      
      return {
        success,
        operations: processedCount,
        ...(errors.length > 0 && { errors })
      }
      
    } catch (error) {
      // If validation fails, no operations are performed
      const batchError = error instanceof Error ? error : new Error(String(error))
      
      if (this.config.debug) {
        this.log(`BATCH failed validation -> ${batchError.message}`)
      }
      
      return {
        success: false,
        operations: 0,
        errors: [batchError]
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Log a debug message with adapter prefix
   */
  protected log(message: string): void {
    const adapterName = this.constructor.name.replace('Adapter', '')
    const prefix = `[${adapterName}${this.config.id ? `:${this.config.id}` : ''}]`
    logger.info(`${prefix} ${message}`)
  }

  /**
   * Log a warning message with adapter prefix
   */
  protected logWarn(message: string): void {
    const adapterName = this.constructor.name.replace('Adapter', '')
    const prefix = `[${adapterName}${this.config.id ? `:${this.config.id}` : ''}]`
    logger.warn(`${prefix} ${message}`)
  }

  /**
   * Log an error message with adapter prefix
   */
  protected logError(message: string, error?: Error): void {
    const adapterName = this.constructor.name.replace('Adapter', '')
    const prefix = `[${adapterName}${this.config.id ? `:${this.config.id}` : ''}]`
    logger.error(`${prefix} ${message}`, error)
  }

  // ============================================================================
  // QUERY INTERFACE INTEGRATION
  // ============================================================================

  /**
   * Execute a query against the stored data
   * This is a basic implementation that uses the QueryExecutor for in-memory processing
   * Subclasses can override this to provide native query support (e.g., DuckDB)
   */
  async query(query: any): Promise<any> {
    // Import QueryExecutor dynamically to avoid circular dependencies
    const { QueryExecutor } = await import('../../query/QueryExecutor')
    
    const executor = new QueryExecutor<T>()
    
    if (this.config.debug) {
      this.log(`QUERY starting execution`)
    }
    
    try {
      const result = await executor.execute(query, this)
      
      if (this.config.debug) {
        this.log(`QUERY completed in ${result.metadata.executionTime}ms, ${result.data.length} results`)
      }
      
      return result
    } catch (error) {
      this.logError('QUERY failed', error as Error)
      throw error
    }
  }
}