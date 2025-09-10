/**
 * JSONQueryExecutor - JSON file-based query execution
 * 
 * This executor loads data from JSON files and processes queries using
 * the MemoryQueryExecutor. It provides file I/O handling, optional caching,
 * and error management for JSON-based data sources.
 * 
 * Based on the architecture design in:
 * context-network/planning/query-interface/architecture-design.md
 */

import { promises as fs } from 'fs'
import {
  Query,
  QueryResult,
  QueryMetadata,
  QueryError,
  QueryErrorCode
} from '../types'
import { MemoryQueryExecutor } from './MemoryQueryExecutor'

/**
 * Configuration options for JSONQueryExecutor
 */
export interface JSONQueryExecutorConfig {
  /** Path to the JSON file */
  filePath: string
  /** File encoding (default: 'utf8') */
  encoding?: BufferEncoding
  /** Whether to cache loaded data in memory (default: false) */
  cacheData?: boolean
}

/**
 * Cache entry for loaded JSON data
 */
interface CacheEntry<T> {
  data: T[]
  modifiedTime: number
  loadTime: number
}

/**
 * JSON file query executor
 * Loads data from JSON files and delegates query execution to MemoryQueryExecutor
 */
export class JSONQueryExecutor<T> {
  private readonly config: JSONQueryExecutorConfig
  private readonly memoryExecutor: MemoryQueryExecutor<T>
  private cache: Map<string, CacheEntry<T>> = new Map()
  
  // Constants for retry logic and caching
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY_MS = 100
  private readonly CACHE_STALENESS_MS = 60000 // 1 minute
  private lastLoadWasFromCache: boolean = false

  /**
   * Create a JSONQueryExecutor
   * @param pathOrConfig - File path string or configuration object
   */
  constructor(pathOrConfig: string | JSONQueryExecutorConfig) {
    if (typeof pathOrConfig === 'string') {
      this.config = {
        filePath: pathOrConfig,
        encoding: 'utf8',
        cacheData: false
      }
    } else {
      this.config = {
        encoding: 'utf8',
        cacheData: false,
        ...pathOrConfig
      }
    }

    this.memoryExecutor = new MemoryQueryExecutor<T>()
  }

  /**
   * Execute a query against JSON file data
   */
  async execute(query: Query<T>): Promise<QueryResult<T>> {
    const startTime = Date.now()
    
    try {
      // Load data from JSON file (with optional caching)
      const data = await this.loadData()
      
      // Delegate query execution to MemoryQueryExecutor
      const result = this.memoryExecutor.execute(query, data)
      
      // Update metadata to reflect JSON loading
      const endTime = Date.now()
      const metadata: QueryMetadata = {
        ...result.metadata,
        executionTime: endTime - startTime,
        fromCache: this.lastLoadWasFromCache
      }

      return {
        data: result.data,
        metadata,
        errors: result.errors
      }
    } catch (error) {
      const endTime = Date.now()
      
      const queryError = error instanceof QueryError 
        ? error 
        : new QueryError(
            `JSON query execution failed: ${error instanceof Error ? error.message : String(error)}`,
            QueryErrorCode.ADAPTER_ERROR,
            { 
              originalError: error,
              filePath: this.config.filePath 
            },
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

  /**
   * Load data from JSON file with optional caching
   */
  private async loadData(): Promise<T[]> {
    const filePath = this.config.filePath
    
    try {
      // Check if file exists
      const fileStats = await fs.stat(filePath)
      const modifiedTime = fileStats.mtimeMs
      
      // Check cache if caching is enabled
      if (this.config.cacheData && this.cache.has(filePath)) {
        const cacheEntry = this.cache.get(filePath)!
        
        // Return cached data if file hasn't been modified
        // Cache is valid if the cached modified time is the same or newer than current file
        if (cacheEntry.modifiedTime >= modifiedTime) {
          this.lastLoadWasFromCache = true
          return cacheEntry.data
        }
        
        // File was modified, remove stale cache entry
        this.cache.delete(filePath)
      }
      
      // Will load from file
      this.lastLoadWasFromCache = false
      
      // Load data from file with retry logic for transient errors
      const fileContent = await this.readFileWithRetry(filePath)
      
      let jsonData: any
      try {
        jsonData = JSON.parse(fileContent)
      } catch (parseError) {
        throw new QueryError(
          `Failed to parse JSON file: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          QueryErrorCode.ADAPTER_ERROR,
          { 
            originalError: parseError,
            filePath,
            fileContent: fileContent.substring(0, 200) + (fileContent.length > 200 ? '...' : '')
          }
        )
      }
      
      // Validate that JSON data is an array
      if (!Array.isArray(jsonData)) {
        throw new QueryError(
          'JSON data must be an array of objects',
          QueryErrorCode.ADAPTER_ERROR,
          { 
            filePath,
            dataType: typeof jsonData,
            isArray: Array.isArray(jsonData)
          }
        )
      }
      
      const data = jsonData as T[]
      
      // Cache data if caching is enabled
      if (this.config.cacheData) {
        this.cache.set(filePath, {
          data,
          modifiedTime,
          loadTime: Date.now()
        })
      }
      
      return data
      
    } catch (error) {
      // Handle file system errors
      if (error instanceof QueryError) {
        throw error
      }
      
      // Check if file doesn't exist
      if ((error as any)?.code === 'ENOENT') {
        throw new QueryError(
          `JSON file not found: ${filePath}`,
          QueryErrorCode.ADAPTER_ERROR,
          { 
            originalError: error,
            filePath,
            errorCode: 'ENOENT'
          }
        )
      }
      
      // Check for permission errors
      if ((error as any)?.code === 'EACCES') {
        throw new QueryError(
          `Permission denied accessing JSON file: ${filePath}`,
          QueryErrorCode.ADAPTER_ERROR,
          { 
            originalError: error,
            filePath,
            errorCode: 'EACCES'
          }
        )
      }
      
      // Generic file system error
      throw new QueryError(
        `Failed to load JSON data from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.ADAPTER_ERROR,
        { 
          originalError: error,
          filePath
        }
      )
    }
  }


  /**
   * Clear the data cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; totalMemory: number } {
    let totalMemory = 0
    
    for (const entry of this.cache.values()) {
      // Rough memory calculation (this is a simplification)
      totalMemory += JSON.stringify(entry.data).length * 2 // Approximate UTF-16 memory usage
    }
    
    return {
      entries: this.cache.size,
      totalMemory
    }
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<JSONQueryExecutorConfig> {
    return { ...this.config }
  }

  /**
   * Create a JSONQueryExecutor instance for a specific file
   */
  static forFile<T>(filePath: string, options?: Partial<Omit<JSONQueryExecutorConfig, 'filePath'>>): JSONQueryExecutor<T> {
    return new JSONQueryExecutor<T>({
      filePath,
      ...options
    })
  }

  /**
   * Create a JSONQueryExecutor instance with caching enabled
   */
  static withCache<T>(filePath: string, options?: Partial<Omit<JSONQueryExecutorConfig, 'filePath' | 'cacheData'>>): JSONQueryExecutor<T> {
    return new JSONQueryExecutor<T>({
      filePath,
      cacheData: true,
      ...options
    })
  }

  /**
   * Validate a JSON file before creating an executor
   */
  static async validateFile(filePath: string): Promise<{ valid: boolean; error?: string; recordCount?: number }> {
    try {
      const fileContent = await fs.readFile(filePath, { encoding: 'utf8' })
      const jsonData = JSON.parse(fileContent)
      
      if (!Array.isArray(jsonData)) {
        return {
          valid: false,
          error: 'JSON data must be an array of objects'
        }
      }
      
      return {
        valid: true,
        recordCount: jsonData.length
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  /**
   * Read file with retry logic for transient file system errors
   */
  private async readFileWithRetry(filePath: string): Promise<string> {
    let lastError: Error | undefined
    
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await fs.readFile(filePath, { encoding: this.config.encoding })
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry for non-transient errors
        if (lastError.message.includes('ENOENT') || 
            lastError.message.includes('EISDIR') ||
            lastError.message.includes('EACCES')) {
          throw lastError
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * attempt))
        }
      }
    }
    
    throw lastError || new Error('File read failed after retries')
  }
}