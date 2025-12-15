/**
 * Shared Storage Module
 *
 * Provides a singleton storage instance shared across all context tools.
 * This ensures that store, query, and analyze tools all operate on the same data.
 */

import { z } from 'zod';
import { DuckDBStorageAdapter } from '../../storage/adapters/DuckDBStorageAdapter.js';
import { JSONStorageAdapter } from '../../storage/adapters/JSONStorageAdapter.js';
import { MemoryStorageAdapter } from '../../storage/adapters/MemoryStorageAdapter.js';
import { Storage } from '../../storage/interfaces/Storage.js';

/**
 * Storage configuration schema
 */
export const storageConfigSchema = z.object({
  type: z.enum(['memory', 'json', 'duckdb']).default('memory'),
  duckdb: z.object({
    database: z.string(),
    tableName: z.string().optional(),
  }).optional(),
  json: z.object({
    filePath: z.string(),
    pretty: z.boolean().optional(),
  }).optional(),
});

export type StorageConfigType = z.infer<typeof storageConfigSchema>;

/**
 * Storage instance cache keyed by config hash
 * This allows different configs to have their own singleton while
 * ensuring the same config always returns the same instance.
 */
const storageInstances = new Map<string, Storage>();

/**
 * Generate a unique key for a storage configuration
 */
function getStorageKey(config: StorageConfigType): string {
  switch (config.type) {
    case 'duckdb':
      return `duckdb:${config.duckdb?.database || 'default'}:${config.duckdb?.tableName || 'context'}`;
    case 'json':
      return `json:${config.json?.filePath || 'default'}`;
    case 'memory':
    default:
      return 'memory:default';
  }
}

/**
 * Get or create a storage instance for the given configuration.
 * Returns the same instance for identical configurations.
 */
export function getSharedStorage(config: StorageConfigType = { type: 'memory' }): Storage {
  const key = getStorageKey(config);

  let instance = storageInstances.get(key);
  if (instance) {
    return instance;
  }

  switch (config.type) {
    case 'duckdb':
      if (!config.duckdb) {
        throw new Error('DuckDB configuration required');
      }
      instance = new DuckDBStorageAdapter({
        type: 'duckdb',
        database: config.duckdb.database,
        tableName: config.duckdb.tableName || 'context',
      });
      break;
    case 'json':
      if (!config.json) {
        throw new Error('JSON configuration required');
      }
      instance = new JSONStorageAdapter({
        type: 'json',
        filePath: config.json.filePath,
        pretty: config.json.pretty,
      });
      break;
    case 'memory':
    default:
      instance = new MemoryStorageAdapter();
      break;
  }

  storageInstances.set(key, instance);
  return instance;
}

/**
 * Clear all cached storage instances.
 * Useful for testing or when needing to reset state.
 */
export function clearStorageInstances(): void {
  storageInstances.clear();
}

/**
 * Get all data from a storage instance as an array.
 * This is used by query tools to retrieve all stored entries.
 */
export async function getAllStorageData(storage: Storage): Promise<any[]> {
  const allData: any[] = [];

  if (storage.keys) {
    for await (const key of storage.keys()) {
      const value = await storage.get(key);
      if (value) {
        allData.push(value);
      }
    }
  }

  return allData;
}
