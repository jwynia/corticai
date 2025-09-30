/**
 * Storage Provider Interface
 *
 * Defines the contract for storage providers that can manage both primary
 * and semantic storage roles in the CorticAI dual-role architecture.
 */

import { Storage, BatchStorage } from '../interfaces/Storage'

/**
 * Primary storage role interface for flexible, universal operations
 * Used for graph data, entities, relationships - optimized for flexibility
 */
export interface PrimaryStorage<T = any> extends BatchStorage<T> {
  /**
   * Graph-specific operations for traversal and relationships
   */
  traverse?(sourceId: string, relationshipType?: string, maxDepth?: number): Promise<T[]>
  findConnected?(entityId: string, connectionType?: string): Promise<T[]>

  /**
   * Entity and relationship management
   */
  addEntity?(entity: T): Promise<void>
  addRelationship?(from: string, to: string, type: string, properties?: any): Promise<void>
  getEntity?(id: string): Promise<T | undefined>
  getRelationships?(entityId: string): Promise<T[]>
}

/**
 * Semantic storage role interface for typed, optimized operations
 * Used for analytics, search, materialized views - optimized for performance
 */
export interface SemanticStorage<T = any> extends BatchStorage<T> {
  /**
   * Search and query operations
   */
  search?(query: string, options?: SearchOptions): Promise<T[]>
  aggregate?(operation: AggregateOperation): Promise<any>

  /**
   * Materialized view management
   */
  createView?(name: string, query: string): Promise<void>
  refreshView?(name: string): Promise<void>
  getView?(name: string): Promise<T[]>

  /**
   * Index management
   */
  createIndex?(fields: string[]): Promise<void>
  dropIndex?(fields: string[]): Promise<void>
}

/**
 * Search options for semantic storage
 */
export interface SearchOptions {
  limit?: number
  offset?: number
  fuzzy?: boolean
  fields?: string[]
  filters?: Record<string, any>
}

/**
 * Aggregate operation definition
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