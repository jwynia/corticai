/**
 * Memory Storage Adapter implementation
 * 
 * This adapter provides in-memory storage implementing the Storage interface,
 * designed for fast unit testing and development scenarios.
 * 
 * Part of Stage 2: Current State Adapter (Task 2.3)
 * Provides high-performance testing capabilities
 */

import { StorageConfig } from '../interfaces/Storage'
import { BaseStorageAdapter } from '../base/BaseStorageAdapter'

/**
 * High-performance in-memory storage adapter
 * 
 * Features:
 * - Full Storage and BatchStorage interface compliance
 * - Type-safe generic operations
 * - Comprehensive edge case handling
 * - Optimized for testing and development
 * - Deep cloning for data integrity
 */
export class MemoryStorageAdapter<T = any> extends BaseStorageAdapter<T> {
  private isInitialized: boolean = false

  constructor(config: StorageConfig = {}) {
    super(config)
    
    if (this.config.debug) {
      this.log('Initialized')
    }
  }

  // ============================================================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ============================================================================

  /**
   * Ensure storage is initialized (no-op for memory storage)
   */
  protected async ensureLoaded(): Promise<void> {
    if (!this.isInitialized) {
      this.isInitialized = true
      if (this.config.debug) {
        this.log('Memory storage ready')
      }
    }
  }

  /**
   * Persist changes (no-op for memory storage)
   */
  protected async persist(): Promise<void> {
    // No-op for memory storage - data is already in memory
  }

  // ============================================================================
  // OVERRIDE FOR DEEP CLONING
  // ============================================================================

  /**
   * Override set to deep clone values for data integrity
   */
  async set(key: string, value: T): Promise<void> {
    // Use parent's validation and loading
    await super.set(key, this.deepClone(value))
  }

  /**
   * Override get to deep clone returned values
   */
  async get(key: string): Promise<T | undefined> {
    const value = await super.get(key)
    return value !== undefined ? this.deepClone(value) : undefined
  }

  /**
   * Override setMany to deep clone all values
   */
  async setMany(entries: Map<string, T>): Promise<void> {
    const clonedEntries = new Map<string, T>()
    for (const [key, value] of entries) {
      clonedEntries.set(key, this.deepClone(value))
    }
    await super.setMany(clonedEntries)
  }

  /**
   * Override getMany to deep clone returned values
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    const results = await super.getMany(keys)
    const clonedResults = new Map<string, T>()
    for (const [key, value] of results) {
      clonedResults.set(key, this.deepClone(value))
    }
    return clonedResults
  }

  // ============================================================================
  // DEEP CLONING
  // ============================================================================

  private deepClone(value: T): T {
    if (value === null || value === undefined) {
      return value
    }

    // Handle primitive types
    if (typeof value !== 'object') {
      return value
    }

    // Handle Date objects
    if (value instanceof Date) {
      return new Date(value.getTime()) as unknown as T
    }

    // Handle RegExp objects
    if (value instanceof RegExp) {
      return new RegExp(value.source, value.flags) as unknown as T
    }

    // Handle Arrays
    if (Array.isArray(value)) {
      return value.map(item => this.deepClone(item)) as unknown as T
    }

    // Handle Maps
    if (value instanceof Map) {
      const clonedMap = new Map()
      for (const [k, v] of value) {
        clonedMap.set(k, this.deepClone(v))
      }
      return clonedMap as unknown as T
    }

    // Handle Sets
    if (value instanceof Set) {
      const clonedSet = new Set()
      for (const item of value) {
        clonedSet.add(this.deepClone(item))
      }
      return clonedSet as unknown as T
    }

    // Handle plain objects
    if (value.constructor === Object) {
      const clonedObj: any = {}
      for (const [k, v] of Object.entries(value)) {
        clonedObj[k] = this.deepClone(v as any)
      }
      return clonedObj as T
    }

    // For other object types, use JSON stringify/parse as fallback
    // This won't preserve prototypes but is safe for most use cases
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      // If serialization fails, return the value as-is
      // This might share references but is better than throwing
      return value
    }
  }

  // ============================================================================
  // PUBLIC UTILITIES
  // ============================================================================

  /**
   * Get current memory usage (number of entries)
   */
  getMemoryUsage(): number {
    return this.data.size
  }

  /**
   * Create a snapshot of current data
   */
  snapshot(): Map<string, T> {
    const snapshot = new Map<string, T>()
    for (const [key, value] of this.data) {
      snapshot.set(key, this.deepClone(value))
    }
    return snapshot
  }

  /**
   * Restore from a snapshot
   */
  restore(snapshot: Map<string, T>): void {
    this.data.clear()
    for (const [key, value] of snapshot) {
      this.data.set(key, this.deepClone(value))
    }
    if (this.config.debug) {
      this.log(`Restored ${this.data.size} items from snapshot`)
    }
  }
}