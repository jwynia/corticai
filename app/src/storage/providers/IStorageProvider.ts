/**
 * Storage Provider Interface
 *
 * Defines the contract for storage providers that can manage both primary
 * and semantic storage roles in the CorticAI dual-role architecture.
 */

import { Storage, BatchStorage } from '../interfaces/Storage'
import { PrimaryStorage } from '../interfaces/PrimaryStorage'
import { SemanticStorage, SearchOptions as SemanticSearchOptions } from '../interfaces/SemanticStorage'

// Re-export for backwards compatibility
export { PrimaryStorage, SemanticStorage }

/**
 * Search options for semantic storage (simplified version for provider compatibility)
 */
export interface SearchOptions {
  limit?: number
  offset?: number
  fuzzy?: boolean
  fields?: string[]
  filters?: Record<string, any>
}

/**
 * Aggregate operation definition (simplified version for provider compatibility)
 */
export interface AggregateOperation {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'group'
  field?: string
  groupBy?: string[]
  filters?: Record<string, any>
}

/**
 * Storage provider configuration
 */
export interface StorageProviderConfig {
  type: 'local' | 'azure' | 'custom'
  primary?: any    // Configuration for primary storage
  semantic?: any   // Configuration for semantic storage
  debug?: boolean
  fallback?: boolean  // Whether to fall back to simpler storage if provider fails
}

/**
 * Storage provider interface combining both storage roles
 */
export interface IStorageProvider {
  /**
   * Primary storage instance for graph operations and entities
   */
  readonly primary: PrimaryStorage

  /**
   * Semantic storage instance for analytics and search
   */
  readonly semantic: SemanticStorage

  /**
   * Initialize the storage provider and its underlying storage instances
   */
  initialize(): Promise<void>

  /**
   * Close connections and cleanup resources
   */
  close(): Promise<void>

  /**
   * Check if the provider is healthy and ready to serve requests
   */
  healthCheck(): Promise<boolean>

  /**
   * Get provider-specific metrics and status information
   */
  getStatus(): Promise<StorageProviderStatus>
}

/**
 * Provider status information
 */
export interface StorageProviderStatus {
  type: string
  healthy: boolean
  primaryReady: boolean
  semanticReady: boolean
  connections?: number
  latency?: number
  lastError?: string
  uptime?: number
}