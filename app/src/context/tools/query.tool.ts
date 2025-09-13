import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { QueryBuilder } from '../../query/QueryBuilder.js';
import { DuckDBQueryExecutor } from '../../query/executors/DuckDBQueryExecutor.js';
import { MemoryQueryExecutor } from '../../query/executors/MemoryQueryExecutor.js';
import { JSONQueryExecutor } from '../../query/executors/JSONQueryExecutor.js';
import { DuckDBStorageAdapter } from '../../storage/adapters/DuckDBStorageAdapter.js';
import { JSONStorageAdapter } from '../../storage/adapters/JSONStorageAdapter.js';
import { MemoryStorageAdapter } from '../../storage/adapters/MemoryStorageAdapter.js';

/**
 * Query condition schema
 */
const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'like', 'in', 'not_in', 'is_null', 'is_not_null']),
  value: z.any().optional(),
});

/**
 * Query configuration schema
 */
const queryConfigSchema = z.object({
  conditions: z.array(conditionSchema).optional(),
  orderBy: z.object({
    field: z.string(),
    direction: z.enum(['ASC', 'DESC']).optional(),
  }).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  select: z.array(z.string()).optional(),
});

/**
 * Storage configuration for query
 */
const storageConfigSchema = z.object({
  type: z.enum(['memory', 'json', 'duckdb']).default('memory'),
  duckdb: z.object({
    database: z.string(),
    tableName: z.string().optional(),
  }).optional(),
  json: z.object({
    filePath: z.string(),
  }).optional(),
});

/**
 * Query context tool - Execute queries against stored context
 */
export const queryContextTool = createTool({
  id: 'query-context',
  name: 'Query Context',
  description: 'Query stored context entries using flexible conditions',
  inputSchema: z.object({
    query: queryConfigSchema,
    storageConfig: storageConfigSchema.optional(),
  }),
  outputSchema: z.object({
    results: z.array(z.any()),
    count: z.number(),
    executionTime: z.number(),
  }),
  execute: async ({ context }) => {
    const { query, storageConfig = { type: 'memory' } } = context;

    const startTime = Date.now();

    // Build the query
    const qb = new QueryBuilder();

    // Add conditions
    if (query.conditions) {
      for (const condition of query.conditions) {
        switch (condition.operator) {
          case '=':
            qb.where(condition.field, '=', condition.value);
            break;
          case '!=':
            qb.where(condition.field, '!=', condition.value);
            break;
          case '>':
            qb.where(condition.field, '>', condition.value);
            break;
          case '<':
            qb.where(condition.field, '<', condition.value);
            break;
          case '>=':
            qb.where(condition.field, '>=', condition.value);
            break;
          case '<=':
            qb.where(condition.field, '<=', condition.value);
            break;
          case 'like':
            qb.whereLike(condition.field, condition.value);
            break;
          case 'in':
            qb.whereIn(condition.field, condition.value);
            break;
          case 'not_in':
            qb.whereNotIn(condition.field, condition.value);
            break;
          case 'is_null':
            qb.whereNull(condition.field);
            break;
          case 'is_not_null':
            qb.whereNotNull(condition.field);
            break;
        }
      }
    }

    // Add ordering
    if (query.orderBy) {
      qb.orderBy(query.orderBy.field, query.orderBy.direction || 'ASC');
    }

    // Add pagination
    if (query.limit) {
      qb.limit(query.limit);
    }
    if (query.offset) {
      qb.offset(query.offset);
    }

    // Add projection
    if (query.select && query.select.length > 0) {
      qb.select(query.select);
    }

    const builtQuery = qb.build();

    // Execute query based on storage type
    let executor;
    let storage;

    switch (storageConfig.type) {
      case 'duckdb':
        if (!storageConfig.duckdb) {
          throw new Error('DuckDB configuration required');
        }
        storage = new DuckDBStorageAdapter({
          type: 'duckdb',
          database: storageConfig.duckdb.database,
          tableName: storageConfig.duckdb.tableName || 'context',
        });
        executor = new DuckDBQueryExecutor(storage as DuckDBStorageAdapter);
        break;
      case 'json':
        if (!storageConfig.json) {
          throw new Error('JSON configuration required');
        }
        storage = new JSONStorageAdapter({
          type: 'json',
          filePath: storageConfig.json.filePath,
        });
        executor = new JSONQueryExecutor(storage as JSONStorageAdapter);
        break;
      case 'memory':
      default:
        storage = new MemoryStorageAdapter();
        executor = new MemoryQueryExecutor(storage as MemoryStorageAdapter);
        break;
    }

    const result = await executor.execute(builtQuery);
    const executionTime = Date.now() - startTime;

    return {
      results: result.data,
      count: result.data.length,
      executionTime,
    };
  },
});

/**
 * Find related context tool - Find context entries related to a specific entity
 */
export const findRelatedContextTool = createTool({
  id: 'find-related-context',
  name: 'Find Related Context',
  description: 'Find context entries related to a specific entity or ID',
  inputSchema: z.object({
    entityId: z.string().describe('ID or identifier of the entity to find related context for'),
    depth: z.number().min(1).max(3).default(1).describe('How many levels of relationships to traverse'),
    storageConfig: storageConfigSchema.optional(),
  }),
  outputSchema: z.object({
    related: z.array(z.object({
      id: z.string(),
      type: z.string(),
      content: z.any(),
      metadata: z.any().optional(),
      relationshipType: z.string().optional(),
      distance: z.number(),
    })),
    count: z.number(),
  }),
  execute: async ({ context }) => {
    const { entityId, depth, storageConfig = { type: 'memory' } } = context;

    // First, get the main entity
    const mainQuery = await queryContextTool.execute({
      context: {
        query: {
          conditions: [{ field: 'id', operator: '=', value: entityId }],
        },
        storageConfig,
      },
    });

    if (mainQuery.results.length === 0) {
      return { related: [], count: 0 };
    }

    const mainEntity = mainQuery.results[0];
    const related = [];
    const visited = new Set([entityId]);

    // BFS to find related entities up to specified depth
    const queue = [{ entity: mainEntity, distance: 0 }];

    while (queue.length > 0) {
      const { entity, distance } = queue.shift()!;

      if (distance >= depth) continue;

      // Check for entities that reference this one
      const referencingQuery = await queryContextTool.execute({
        context: {
          query: {
            conditions: [
              { field: 'metadata.related', operator: 'like', value: `%${entity.id}%` },
            ],
          },
          storageConfig,
        },
      });

      for (const relatedEntity of referencingQuery.results) {
        if (!visited.has(relatedEntity.id)) {
          visited.add(relatedEntity.id);
          related.push({
            ...relatedEntity,
            relationshipType: 'references',
            distance: distance + 1,
          });

          if (distance + 1 < depth) {
            queue.push({ entity: relatedEntity, distance: distance + 1 });
          }
        }
      }

      // Check for entities referenced by this one
      if (entity.metadata?.related) {
        for (const relatedId of entity.metadata.related) {
          if (!visited.has(relatedId)) {
            const referencedQuery = await queryContextTool.execute({
              context: {
                query: {
                  conditions: [{ field: 'id', operator: '=', value: relatedId }],
                },
                storageConfig,
              },
            });

            if (referencedQuery.results.length > 0) {
              const referencedEntity = referencedQuery.results[0];
              visited.add(relatedId);
              related.push({
                ...referencedEntity,
                relationshipType: 'referenced_by',
                distance: distance + 1,
              });

              if (distance + 1 < depth) {
                queue.push({ entity: referencedEntity, distance: distance + 1 });
              }
            }
          }
        }
      }
    }

    return {
      related,
      count: related.length,
    };
  },
});

/**
 * Search context tool - Full-text search across context entries
 */
export const searchContextTool = createTool({
  id: 'search-context',
  name: 'Search Context',
  description: 'Full-text search across context entries',
  inputSchema: z.object({
    searchTerm: z.string().describe('Term to search for'),
    fields: z.array(z.string()).optional().describe('Fields to search in'),
    type: z.string().optional().describe('Filter by context type'),
    storageConfig: storageConfigSchema.optional(),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      id: z.string(),
      type: z.string(),
      content: z.any(),
      metadata: z.any().optional(),
      relevance: z.number().optional(),
    })),
    count: z.number(),
  }),
  execute: async ({ context }) => {
    const { searchTerm, fields = ['content'], type, storageConfig = { type: 'memory' } } = context;

    // Build search query
    const qb = new QueryBuilder();

    // Add type filter if specified
    if (type) {
      qb.where('type', '=', type);
    }

    // Add search conditions for each field
    // Using OR conditions for searching across multiple fields
    if (fields.length > 0) {
      qb.whereOr(conditions => {
        for (const field of fields) {
          conditions.whereLike(field, `%${searchTerm}%`);
        }
      });
    }

    const query = qb.build();

    // Execute search
    let executor;
    let storage;

    switch (storageConfig.type) {
      case 'duckdb':
        if (!storageConfig.duckdb) {
          throw new Error('DuckDB configuration required');
        }
        storage = new DuckDBStorageAdapter({
          type: 'duckdb',
          database: storageConfig.duckdb.database,
          tableName: storageConfig.duckdb.tableName || 'context',
        });
        executor = new DuckDBQueryExecutor(storage as DuckDBStorageAdapter);
        break;
      case 'json':
        if (!storageConfig.json) {
          throw new Error('JSON configuration required');
        }
        storage = new JSONStorageAdapter({
          type: 'json',
          filePath: storageConfig.json.filePath,
        });
        executor = new JSONQueryExecutor(storage as JSONStorageAdapter);
        break;
      case 'memory':
      default:
        storage = new MemoryStorageAdapter();
        executor = new MemoryQueryExecutor(storage as MemoryStorageAdapter);
        break;
    }

    const result = await executor.execute(query);

    // Calculate simple relevance score based on match count
    const resultsWithRelevance = result.data.map(item => {
      let relevance = 0;
      const searchLower = searchTerm.toLowerCase();

      for (const field of fields) {
        const fieldValue = String(item[field] || '').toLowerCase();
        const matches = (fieldValue.match(new RegExp(searchLower, 'g')) || []).length;
        relevance += matches;
      }

      return {
        ...item,
        relevance,
      };
    });

    // Sort by relevance
    resultsWithRelevance.sort((a, b) => b.relevance - a.relevance);

    return {
      results: resultsWithRelevance,
      count: resultsWithRelevance.length,
    };
  },
});

/**
 * Export all context query tools
 */
export const contextQueryTools = {
  queryContext: queryContextTool,
  findRelatedContext: findRelatedContextTool,
  searchContext: searchContextTool,
};