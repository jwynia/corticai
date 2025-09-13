import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { DuckDBStorageAdapter } from '../../storage/adapters/DuckDBStorageAdapter.js';
import { JSONStorageAdapter } from '../../storage/adapters/JSONStorageAdapter.js';
import { MemoryStorageAdapter } from '../../storage/adapters/MemoryStorageAdapter.js';
import { StorageConfig, Storage } from '../../storage/interfaces/Storage.js';

/**
 * Context entry schema for validation
 */
const contextEntrySchema = z.object({
  id: z.string().optional(),
  type: z.enum(['decision', 'code', 'discussion', 'documentation', 'todo', 'pattern', 'relationship']),
  content: z.any(),
  metadata: z.object({
    project: z.string().optional(),
    timestamp: z.string().optional(),
    author: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).optional(),
    source: z.string().optional(),
    related: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Storage configuration schema
 */
const storageConfigSchema = z.object({
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

// Global storage instance (can be configured)
let storageInstance: Storage | null = null;

/**
 * Initialize storage based on configuration
 */
async function initializeStorage(config: z.infer<typeof storageConfigSchema>): Promise<Storage> {
  if (storageInstance) {
    return storageInstance;
  }

  switch (config.type) {
    case 'duckdb':
      if (!config.duckdb) {
        throw new Error('DuckDB configuration required');
      }
      storageInstance = new DuckDBStorageAdapter({
        type: 'duckdb',
        database: config.duckdb.database,
        tableName: config.duckdb.tableName || 'context',
      });
      break;
    case 'json':
      if (!config.json) {
        throw new Error('JSON configuration required');
      }
      storageInstance = new JSONStorageAdapter({
        type: 'json',
        filePath: config.json.filePath,
        pretty: config.json.pretty,
      });
      break;
    case 'memory':
    default:
      storageInstance = new MemoryStorageAdapter();
      break;
  }

  return storageInstance;
}

/**
 * Store context tool - Stores context entries with metadata
 */
export const storeContextTool = createTool({
  id: 'store-context',
  name: 'Store Context',
  description: 'Store context entries with metadata and automatic deduplication',
  inputSchema: z.object({
    entry: contextEntrySchema,
    storageConfig: storageConfigSchema.optional(),
    deduplicate: z.boolean().default(true).describe('Check for duplicates before storing'),
  }),
  outputSchema: z.object({
    id: z.string(),
    stored: z.boolean(),
    duplicate: z.boolean().optional(),
    duplicateId: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { entry, storageConfig = { type: 'memory' }, deduplicate } = context;

    const storage = await initializeStorage(storageConfig);

    // Generate ID if not provided
    const id = entry.id || `${entry.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add timestamp if not provided
    const enrichedEntry = {
      ...entry,
      id,
      metadata: {
        ...entry.metadata,
        timestamp: entry.metadata?.timestamp || new Date().toISOString(),
      },
    };

    // Check for duplicates if requested
    if (deduplicate) {
      // Simple duplicate check based on content similarity
      // In a real implementation, this would be more sophisticated
      const keys = storage.keys ? await Array.fromAsync(storage.keys()) : [];
      for (const key of keys) {
        const existing = await storage.get(key);
        if (existing &&
            existing.type === entry.type &&
            JSON.stringify(existing.content) === JSON.stringify(entry.content)) {
          return {
            id: key,
            stored: false,
            duplicate: true,
            duplicateId: key,
          };
        }
      }
    }

    // Store the entry
    await storage.set(id, enrichedEntry);

    return {
      id,
      stored: true,
      duplicate: false,
    };
  },
});

/**
 * Batch store tool - Store multiple context entries efficiently
 */
export const batchStoreContextTool = createTool({
  id: 'batch-store-context',
  name: 'Batch Store Context',
  description: 'Store multiple context entries efficiently',
  inputSchema: z.object({
    entries: z.array(contextEntrySchema),
    storageConfig: storageConfigSchema.optional(),
    deduplicate: z.boolean().default(true),
  }),
  outputSchema: z.object({
    stored: z.number(),
    duplicates: z.number(),
    results: z.array(z.object({
      id: z.string(),
      stored: z.boolean(),
      duplicate: z.boolean().optional(),
    })),
  }),
  execute: async ({ context }) => {
    const { entries, storageConfig = { type: 'memory' }, deduplicate } = context;

    const storage = await initializeStorage(storageConfig);
    const results = [];
    let storedCount = 0;
    let duplicateCount = 0;

    for (const entry of entries) {
      const result = await storeContextTool.execute({
        context: { entry, storageConfig, deduplicate },
      });

      results.push(result);
      if (result.stored) storedCount++;
      if (result.duplicate) duplicateCount++;
    }

    return {
      stored: storedCount,
      duplicates: duplicateCount,
      results,
    };
  },
});

/**
 * Delete context tool - Remove context entries
 */
export const deleteContextTool = createTool({
  id: 'delete-context',
  name: 'Delete Context',
  description: 'Delete context entries by ID',
  inputSchema: z.object({
    id: z.string(),
    storageConfig: storageConfigSchema.optional(),
  }),
  outputSchema: z.object({
    deleted: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { id, storageConfig = { type: 'memory' } } = context;

    const storage = await initializeStorage(storageConfig);
    const deleted = await storage.delete(id);

    return { deleted };
  },
});

/**
 * Clear context tool - Remove all context entries
 */
export const clearContextTool = createTool({
  id: 'clear-context',
  name: 'Clear Context',
  description: 'Remove all context entries',
  inputSchema: z.object({
    storageConfig: storageConfigSchema.optional(),
    confirm: z.boolean().describe('Confirmation required to clear all context'),
  }),
  outputSchema: z.object({
    cleared: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { storageConfig = { type: 'memory' }, confirm } = context;

    if (!confirm) {
      return {
        cleared: false,
        message: 'Confirmation required to clear all context',
      };
    }

    const storage = await initializeStorage(storageConfig);
    await storage.clear();

    return {
      cleared: true,
      message: 'All context entries have been cleared',
    };
  },
});

/**
 * Export all context storage tools
 */
export const contextStoreTools = {
  storeContext: storeContextTool,
  batchStoreContext: batchStoreContextTool,
  deleteContext: deleteContextTool,
  clearContext: clearContextTool,
};