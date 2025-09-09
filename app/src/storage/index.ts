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
import { StorageConfig, JSONStorageConfig, Storage, BatchStorage } from './interfaces/Storage'

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
  JSON: JSONStorageAdapter
} as const

/**
 * Type for available storage adapter types
 */
export type StorageAdapterType = keyof typeof StorageAdapters

/**
 * Create a storage adapter by type
 * 
 * @param type The adapter type to create
 * @param config Optional configuration for the adapter
 * @returns Promise resolving to a new storage adapter instance
 */
export async function createStorageAdapter<T = any>(
  type: StorageAdapterType, 
  config?: StorageConfig
): Promise<Storage<T>> {
  const AdapterClass = StorageAdapters[type]
  return new AdapterClass<T>(config)
}