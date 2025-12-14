/**
 * Storage abstraction layer exports
 * 
 * This is the main entry point for the storage abstraction layer,
 * providing access to all interfaces and adapters.
 * 
 * Following the progressive disclosure principle from the context network:
 * - Clean public API for consumers
 * - Progressive disclosure of functionality
 * - Type-safe exports with full generic support
 */

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export {
  // Core Storage interfaces
  Storage,
  BatchStorage,
  SaveableStorage,
  
  // Configuration types
  StorageConfig,
  JSONStorageConfig,
  DuckDBStorageConfig,
  StorageFactory,
  
  // Operation types for batch processing
  Operation,
  BatchResult,
  
  // Error handling
  StorageError,
  StorageErrorCode
} from './interfaces/Storage'

// ============================================================================
// ADAPTERS
// ============================================================================

export { MemoryStorageAdapter } from './adapters/MemoryStorageAdapter'
export { JSONStorageAdapter } from './adapters/JSONStorageAdapter'
export { DuckDBStorageAdapter } from './adapters/DuckDBStorageAdapter'

// ============================================================================
// STORAGE PROVIDERS (Dual-Role Architecture)
// ============================================================================

export {
  IStorageProvider,
  StorageProviderConfig,
  StorageProviderStatus,
  SearchOptions,
  AggregateOperation,
  PrimaryStorage,
  SemanticStorage
} from './providers/IStorageProvider'

export { LocalStorageProvider, LocalStorageConfig } from './providers/LocalStorageProvider'
export { AzureStorageProvider, AzureStorageConfig } from './providers/AzureStorageProvider'
export {
  StorageProviderFactory,
  FactoryConfig,
  EnvironmentInfo,
  createStorageProvider,
  detectEnvironment,
  getRecommendedProviderType
} from './providers/StorageProviderFactory'

// ============================================================================
// BASE CLASSES AND HELPERS (for extending)
// ============================================================================

export { BaseStorageAdapter } from './base/BaseStorageAdapter'
export { StorageValidator } from './helpers/StorageValidator'
export { FileIOHandler } from './helpers/FileIOHandler'
export type { FileIOConfig } from './helpers/FileIOHandler'

// ============================================================================
// FACTORY FUNCTIONS AND UTILITIES
// ============================================================================

import { MemoryStorageAdapter } from './adapters/MemoryStorageAdapter'
import { JSONStorageAdapter } from './adapters/JSONStorageAdapter'
import { DuckDBStorageAdapter } from './adapters/DuckDBStorageAdapter'
import { StorageConfig, JSONStorageConfig, DuckDBStorageConfig, Storage, BatchStorage } from './interfaces/Storage'

/**
 * Create a new MemoryStorageAdapter instance
 * Factory function for convenient creation
 * 
 * @param config Optional configuration for the adapter
 * @returns Promise resolving to a new MemoryStorageAdapter instance
 */
export async function createMemoryStorage<T = any>(config?: StorageConfig): Promise<BatchStorage<T>> {
  return new MemoryStorageAdapter<T>(config)
}

/**
 * Storage adapter type registry for dynamic creation
 */
export const StorageAdapters = {
  Memory: MemoryStorageAdapter,
  JSON: JSONStorageAdapter,
  DuckDB: DuckDBStorageAdapter
} as const

/**
 * Type for available storage adapter types
 */
export type StorageAdapterType = keyof typeof StorageAdapters

/**
 * Create a storage adapter by type
 * 
 * @param type The adapter type to create
 * @param config Configuration for the adapter
 * @returns Promise resolving to a new storage adapter instance
 */
export async function createStorageAdapter<T = any>(
  type: StorageAdapterType, 
  config: StorageConfig
): Promise<Storage<T>> {
  const AdapterClass = StorageAdapters[type]
  return new (AdapterClass as any)(config) as Storage<T>
}