/**
 * QueryExecutor - Main query execution router
 * 
 * This class routes queries to appropriate adapter-specific executors
 * based on the storage adapter type. It provides a unified interface
 * for query execution across all storage adapters.
 * 
 * Based on the architecture design in:
 * context-network/planning/query-interface/architecture-design.md
 */

import {
  Query,
  QueryResult,
  QueryError,
  QueryErrorCode
} from './types'
import { MemoryQueryExecutor } from './executors/MemoryQueryExecutor'
import { Storage } from '../storage/interfaces/Storage'

/**
 * Supported storage adapter types
 */
export type AdapterType = 'memory' | 'json' | 'duckdb' | 'unknown'

/**
 * Interface for storage adapters that support native querying
 */
export interface QueryableStorage<T> extends Storage<T> {
  query(query: Query<T>): Promise<QueryResult<T>>
}

/**
 * Main query executor that routes queries to appropriate executors
 */
export class QueryExecutor<T> {
  private memoryExecutor: MemoryQueryExecutor<T>

  constructor() {
    this.memoryExecutor = new MemoryQueryExecutor<T>()
  }

  /**
   * Execute a query using the appropriate executor for the storage adapter
   */
  async execute(query: Query<T>, adapter: Storage<T>): Promise<QueryResult<T>> {
    try {
      const adapterType = this.detectAdapterType(adapter)
      
      switch (adapterType) {
        case 'duckdb':
          return await this.executeDuckDBQuery(query, adapter)
        
        case 'json':
          return await this.executeJSONQuery(query, adapter)
        
        case 'memory':
        case 'unknown':
        default:
          return await this.executeMemoryQuery(query, adapter)
      }
    } catch (error) {
      // Wrap any unexpected errors in QueryError
      if (error instanceof QueryError) {
        throw error
      }
      
      throw new QueryError(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.EXECUTION_FAILED,
        { 
          originalError: error,
          adapterType: this.detectAdapterType(adapter)
        },
        query
      )
    }
  }

  /**
   * Detect the type of storage adapter
   */
  detectAdapterType(adapter: Storage<T>): AdapterType {
    // Check for DuckDB adapter - look for database property and native query method
    if (this.isDuckDBAdapter(adapter)) {
      return 'duckdb'
    }
    
    // Check for JSON adapter - look for filePath and save method
    if (this.isJSONAdapter(adapter)) {
      return 'json'
    }
    
    // Check for Memory adapter - this is the default/fallback
    if (this.isMemoryAdapter(adapter)) {
      return 'memory'
    }
    
    // Unknown adapter type - treat as memory (fallback)
    return 'unknown'
  }

  // ============================================================================
  // ADAPTER TYPE DETECTION
  // ============================================================================

  /**
   * Check if adapter is a DuckDB adapter
   */
  private isDuckDBAdapter(adapter: Storage<T>): adapter is QueryableStorage<T> {
    return (
      typeof (adapter as any).database === 'string' &&
      typeof (adapter as any).query === 'function'
    )
  }

  /**
   * Check if adapter is a JSON adapter
   */
  private isJSONAdapter(adapter: Storage<T>): boolean {
    return (
      (typeof (adapter as any).filePath === 'string' || 
       (typeof (adapter as any).jsonConfig === 'object' && (adapter as any).jsonConfig?.filePath)) &&
      typeof (adapter as any).save === 'function'
    )
  }

  /**
   * Check if adapter is a Memory adapter
   */
  private isMemoryAdapter(adapter: Storage<T>): boolean {
    // Memory adapter is the simplest - it just implements the Storage interface
    // without additional properties
    return (
      !this.isDuckDBAdapter(adapter) &&
      !this.isJSONAdapter(adapter)
    )
  }

  // ============================================================================
  // EXECUTOR METHODS
  // ============================================================================

  /**
   * Execute query using DuckDB native query capabilities
   */
  private async executeDuckDBQuery(query: Query<T>, adapter: Storage<T>): Promise<QueryResult<T>> {
    const queryableAdapter = adapter as QueryableStorage<T>
    
    try {
      // Use the adapter's native query method
      return await queryableAdapter.query(query)
    } catch (error) {
      throw new QueryError(
        `DuckDB query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.ADAPTER_ERROR,
        { 
          originalError: error,
          adapterType: 'duckdb'
        },
        query
      )
    }
  }

  /**
   * Execute query using JSON adapter (loads data and uses memory executor)
   */
  private async executeJSONQuery(query: Query<T>, adapter: Storage<T>): Promise<QueryResult<T>> {
    try {
      // Load all data from JSON adapter
      const data = await this.loadAllData(adapter)
      
      // Use memory executor to process the query
      return this.memoryExecutor.execute(query, data)
    } catch (error) {
      throw new QueryError(
        `JSON query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.ADAPTER_ERROR,
        { 
          originalError: error,
          adapterType: 'json'
        },
        query
      )
    }
  }

  /**
   * Execute query using memory executor
   */
  private async executeMemoryQuery(query: Query<T>, adapter: Storage<T>): Promise<QueryResult<T>> {
    try {
      // Load all data from adapter
      const data = await this.loadAllData(adapter)
      
      // Use memory executor to process the query
      return this.memoryExecutor.execute(query, data)
    } catch (error) {
      throw new QueryError(
        `Memory query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.ADAPTER_ERROR,
        { 
          originalError: error,
          adapterType: 'memory'
        },
        query
      )
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Load all data from a storage adapter
   */
  private async loadAllData(adapter: Storage<T>): Promise<T[]> {
    const data: T[] = []
    
    try {
      // Iterate through all values in the adapter
      for await (const value of adapter.values()) {
        data.push(value)
      }
      
      return data
    } catch (error) {
      throw new QueryError(
        `Failed to load data from adapter: ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.ADAPTER_ERROR,
        { originalError: error }
      )
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get query execution capabilities for an adapter
   */
  getAdapterCapabilities(adapter: Storage<T>) {
    const adapterType = this.detectAdapterType(adapter)
    
    return {
      type: adapterType,
      nativeQuery: adapterType === 'duckdb',
      indexing: adapterType === 'duckdb',
      aggregation: true, // All adapters support aggregation through memory executor
      streaming: false, // Not implemented in Phase 1
      caching: false // Not implemented in Phase 1
    }
  }

  /**
   * Validate that a query can be executed with the given adapter
   */
  validateQueryForAdapter(query: Query<T>, adapter: Storage<T>): void {
    // Basic validation - more sophisticated validation could be added
    const capabilities = this.getAdapterCapabilities(adapter)
    
    // Check if the query requires features not supported by the adapter
    // For Phase 1, all adapters support all features through memory execution
    // This is a placeholder for future capability checking
    
    if (!capabilities) {
      throw new QueryError(
        'Adapter does not support query execution',
        QueryErrorCode.INCOMPATIBLE_OPERATION,
        { adapterType: this.detectAdapterType(adapter) }
      )
    }
  }

  /**
   * Create a QueryExecutor instance for a specific storage adapter
   */
  static forAdapter<T>(adapter: Storage<T>): QueryExecutor<T> {
    const executor = new QueryExecutor<T>()
    
    // Pre-validate that the adapter supports queries
    executor.validateQueryForAdapter(
      { conditions: [], ordering: [] }, // Empty query for validation
      adapter
    )
    
    return executor
  }

  /**
   * Execute multiple queries concurrently against the same adapter
   */
  async executeAll(queries: Query<T>[], adapter: Storage<T>): Promise<QueryResult<T>[]> {
    const promises = queries.map(query => this.execute(query, adapter))
    
    try {
      return await Promise.all(promises)
    } catch (error) {
      // If any query fails, wrap the error with context about batch execution
      throw new QueryError(
        `Batch query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        QueryErrorCode.EXECUTION_FAILED,
        { 
          originalError: error,
          batchSize: queries.length
        }
      )
    }
  }
}