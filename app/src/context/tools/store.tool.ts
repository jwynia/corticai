import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { getSharedStorage, storageConfigSchema } from './sharedStorage.js';

// Helper function to create RuntimeContext
function createRuntimeContext(): RuntimeContext {
  return new RuntimeContext();
}

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
 * Store context tool - Stores context entries with metadata
 */
export const storeContextTool = createTool({
  id: 'store-context',
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

    const storage = getSharedStorage(storageConfig);

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
      const keys: string[] = [];
      if (storage.keys) {
        for await (const key of storage.keys()) {
          keys.push(key);
        }
      }
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

    const storage = getSharedStorage(storageConfig);
    const results = [];
    let storedCount = 0;
    let duplicateCount = 0;

    for (const entry of entries) {
      const result = await storeContextTool.execute({
        context: { entry, storageConfig, deduplicate },
        runtimeContext: createRuntimeContext(),
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

    const storage = getSharedStorage(storageConfig);
    const deleted = await storage.delete(id);

    return { deleted };
  },
});

/**
 * Clear context tool - Remove all context entries
 */
export const clearContextTool = createTool({
  id: 'clear-context',
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

    const storage = getSharedStorage(storageConfig);
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