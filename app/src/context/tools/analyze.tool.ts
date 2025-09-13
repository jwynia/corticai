import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { queryContextTool } from './query.tool.js';

/**
 * Storage configuration for analysis
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
 * Analyze context patterns tool - Identify patterns in stored context
 */
export const analyzeContextPatternsTool = createTool({
  id: 'analyze-context-patterns',
  name: 'Analyze Context Patterns',
  description: 'Identify patterns and trends in stored context',
  inputSchema: z.object({
    timeRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    storageConfig: storageConfigSchema.optional(),
  }),
  outputSchema: z.object({
    patterns: z.array(z.object({
      type: z.string(),
      description: z.string(),
      frequency: z.number(),
      examples: z.array(z.string()),
    })),
    statistics: z.object({
      totalEntries: z.number(),
      typeDistribution: z.record(z.number()),
      timeDistribution: z.record(z.number()).optional(),
      topTags: z.array(z.object({
        tag: z.string(),
        count: z.number(),
      })).optional(),
    }),
  }),
  execute: async ({ context }) => {
    const { timeRange, storageConfig = { type: 'memory' } } = context;

    // Query all context entries (with optional time filter)
    const queryConditions = [];
    if (timeRange?.start) {
      queryConditions.push({
        field: 'metadata.timestamp',
        operator: '>=' as const,
        value: timeRange.start,
      });
    }
    if (timeRange?.end) {
      queryConditions.push({
        field: 'metadata.timestamp',
        operator: '<=' as const,
        value: timeRange.end,
      });
    }

    const allEntries = await queryContextTool.execute({
      context: {
        query: { conditions: queryConditions },
        storageConfig,
      },
    });

    // Analyze type distribution
    const typeDistribution: Record<string, number> = {};
    const tagFrequency: Record<string, number> = {};
    const patterns: Array<{
      type: string;
      description: string;
      frequency: number;
      examples: string[];
    }> = [];

    for (const entry of allEntries.results) {
      // Count types
      const type = entry.type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;

      // Count tags
      if (entry.metadata?.tags) {
        for (const tag of entry.metadata.tags) {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        }
      }
    }

    // Identify patterns
    // Pattern 1: Decision clusters
    const decisions = allEntries.results.filter(e => e.type === 'decision');
    if (decisions.length > 3) {
      patterns.push({
        type: 'decision_cluster',
        description: 'Multiple decisions made in this context',
        frequency: decisions.length,
        examples: decisions.slice(0, 3).map(d => d.id),
      });
    }

    // Pattern 2: Related code and documentation
    const codeEntries = allEntries.results.filter(e => e.type === 'code');
    const docEntries = allEntries.results.filter(e => e.type === 'documentation');
    if (codeEntries.length > 0 && docEntries.length > 0) {
      patterns.push({
        type: 'code_documentation_pair',
        description: 'Code entries with corresponding documentation',
        frequency: Math.min(codeEntries.length, docEntries.length),
        examples: [...codeEntries.slice(0, 2).map(c => c.id), ...docEntries.slice(0, 1).map(d => d.id)],
      });
    }

    // Pattern 3: TODO items
    const todos = allEntries.results.filter(e => e.type === 'todo');
    if (todos.length > 0) {
      patterns.push({
        type: 'pending_todos',
        description: 'Outstanding TODO items',
        frequency: todos.length,
        examples: todos.slice(0, 3).map(t => t.id),
      });
    }

    // Sort tags by frequency
    const topTags = Object.entries(tagFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      patterns,
      statistics: {
        totalEntries: allEntries.results.length,
        typeDistribution,
        topTags: topTags.length > 0 ? topTags : undefined,
      },
    };
  },
});

/**
 * Analyze context relationships tool - Map relationships between context entries
 */
export const analyzeContextRelationshipsTool = createTool({
  id: 'analyze-context-relationships',
  name: 'Analyze Context Relationships',
  description: 'Map and analyze relationships between context entries',
  inputSchema: z.object({
    rootEntityId: z.string().optional().describe('Start analysis from a specific entity'),
    maxDepth: z.number().min(1).max(5).default(3),
    storageConfig: storageConfigSchema.optional(),
  }),
  outputSchema: z.object({
    graph: z.object({
      nodes: z.array(z.object({
        id: z.string(),
        type: z.string(),
        label: z.string(),
        metadata: z.any().optional(),
      })),
      edges: z.array(z.object({
        source: z.string(),
        target: z.string(),
        type: z.string(),
        weight: z.number().optional(),
      })),
    }),
    clusters: z.array(z.object({
      id: z.string(),
      nodes: z.array(z.string()),
      description: z.string(),
    })),
    metrics: z.object({
      totalNodes: z.number(),
      totalEdges: z.number(),
      avgConnections: z.number(),
      mostConnected: z.array(z.object({
        id: z.string(),
        connections: z.number(),
      })),
    }),
  }),
  execute: async ({ context }) => {
    const { rootEntityId, maxDepth, storageConfig = { type: 'memory' } } = context;

    const nodes: Map<string, any> = new Map();
    const edges: Array<{ source: string; target: string; type: string; weight?: number }> = [];
    const visited = new Set<string>();

    // Helper function to explore relationships
    async function exploreEntity(entityId: string, depth: number) {
      if (depth >= maxDepth || visited.has(entityId)) return;
      visited.add(entityId);

      const entityQuery = await queryContextTool.execute({
        context: {
          query: {
            conditions: [{ field: 'id', operator: '=', value: entityId }],
          },
          storageConfig,
        },
      });

      if (entityQuery.results.length === 0) return;

      const entity = entityQuery.results[0];
      nodes.set(entityId, {
        id: entityId,
        type: entity.type,
        label: entity.metadata?.title || entity.type || entityId,
        metadata: entity.metadata,
      });

      // Explore related entities
      if (entity.metadata?.related) {
        for (const relatedId of entity.metadata.related) {
          edges.push({
            source: entityId,
            target: relatedId,
            type: 'references',
            weight: 1,
          });
          await exploreEntity(relatedId, depth + 1);
        }
      }

      // Find entities that reference this one
      const referencingQuery = await queryContextTool.execute({
        context: {
          query: {
            conditions: [
              { field: 'metadata.related', operator: 'like', value: `%${entityId}%` },
            ],
          },
          storageConfig,
        },
      });

      for (const referencing of referencingQuery.results) {
        if (!visited.has(referencing.id)) {
          edges.push({
            source: referencing.id,
            target: entityId,
            type: 'references',
            weight: 1,
          });
          await exploreEntity(referencing.id, depth + 1);
        }
      }
    }

    // Start exploration
    if (rootEntityId) {
      await exploreEntity(rootEntityId, 0);
    } else {
      // Explore all entities
      const allEntries = await queryContextTool.execute({
        context: {
          query: {},
          storageConfig,
        },
      });

      for (const entry of allEntries.results.slice(0, 100)) {
        // Limit to first 100 for performance
        await exploreEntity(entry.id, 0);
      }
    }

    // Identify clusters (simple connected components)
    const clusters: Array<{ id: string; nodes: string[]; description: string }> = [];
    const clusterMap = new Map<string, Set<string>>();

    for (const edge of edges) {
      let sourceCluster = clusterMap.get(edge.source);
      let targetCluster = clusterMap.get(edge.target);

      if (!sourceCluster && !targetCluster) {
        const newCluster = new Set([edge.source, edge.target]);
        clusterMap.set(edge.source, newCluster);
        clusterMap.set(edge.target, newCluster);
      } else if (sourceCluster && !targetCluster) {
        sourceCluster.add(edge.target);
        clusterMap.set(edge.target, sourceCluster);
      } else if (!sourceCluster && targetCluster) {
        targetCluster.add(edge.source);
        clusterMap.set(edge.source, targetCluster);
      } else if (sourceCluster && targetCluster && sourceCluster !== targetCluster) {
        // Merge clusters
        for (const node of targetCluster) {
          sourceCluster.add(node);
          clusterMap.set(node, sourceCluster);
        }
      }
    }

    // Convert clusters to array
    const processedClusters = new Set<Set<string>>();
    for (const cluster of clusterMap.values()) {
      if (!processedClusters.has(cluster)) {
        processedClusters.add(cluster);
        const nodeArray = Array.from(cluster);
        clusters.push({
          id: `cluster_${clusters.length}`,
          nodes: nodeArray,
          description: `Connected group of ${nodeArray.length} entities`,
        });
      }
    }

    // Calculate metrics
    const connectionCount = new Map<string, number>();
    for (const edge of edges) {
      connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
      connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
    }

    const mostConnected = Array.from(connectionCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, connections]) => ({ id, connections }));

    const avgConnections = nodes.size > 0
      ? Array.from(connectionCount.values()).reduce((a, b) => a + b, 0) / nodes.size
      : 0;

    return {
      graph: {
        nodes: Array.from(nodes.values()),
        edges,
      },
      clusters,
      metrics: {
        totalNodes: nodes.size,
        totalEdges: edges.length,
        avgConnections: Math.round(avgConnections * 100) / 100,
        mostConnected,
      },
    };
  },
});

/**
 * Analyze context quality tool - Assess the quality and completeness of stored context
 */
export const analyzeContextQualityTool = createTool({
  id: 'analyze-context-quality',
  name: 'Analyze Context Quality',
  description: 'Assess the quality and completeness of stored context',
  inputSchema: z.object({
    storageConfig: storageConfigSchema.optional(),
  }),
  outputSchema: z.object({
    qualityScore: z.number().min(0).max(100),
    issues: z.array(z.object({
      type: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      affectedEntries: z.array(z.string()),
    })),
    recommendations: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { storageConfig = { type: 'memory' } } = context;

    const allEntries = await queryContextTool.execute({
      context: {
        query: {},
        storageConfig,
      },
    });

    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      affectedEntries: string[];
    }> = [];
    const recommendations: string[] = [];

    let qualityScore = 100;

    // Check for entries without metadata
    const entriesWithoutMetadata = allEntries.results.filter(e => !e.metadata);
    if (entriesWithoutMetadata.length > 0) {
      issues.push({
        type: 'missing_metadata',
        severity: 'medium',
        description: `${entriesWithoutMetadata.length} entries lack metadata`,
        affectedEntries: entriesWithoutMetadata.slice(0, 5).map(e => e.id),
      });
      qualityScore -= 10;
      recommendations.push('Add metadata to all context entries for better organization');
    }

    // Check for entries without timestamps
    const entriesWithoutTimestamp = allEntries.results.filter(
      e => !e.metadata?.timestamp
    );
    if (entriesWithoutTimestamp.length > 0) {
      issues.push({
        type: 'missing_timestamp',
        severity: 'low',
        description: `${entriesWithoutTimestamp.length} entries lack timestamps`,
        affectedEntries: entriesWithoutTimestamp.slice(0, 5).map(e => e.id),
      });
      qualityScore -= 5;
      recommendations.push('Ensure all entries have timestamps for temporal analysis');
    }

    // Check for orphaned entries (no relationships)
    const orphanedEntries = allEntries.results.filter(
      e => !e.metadata?.related || e.metadata.related.length === 0
    );
    if (orphanedEntries.length > allEntries.results.length * 0.5) {
      issues.push({
        type: 'orphaned_entries',
        severity: 'medium',
        description: `${orphanedEntries.length} entries have no relationships`,
        affectedEntries: orphanedEntries.slice(0, 5).map(e => e.id),
      });
      qualityScore -= 15;
      recommendations.push('Link related context entries to build a knowledge graph');
    }

    // Check for duplicate-looking entries
    const contentMap = new Map<string, string[]>();
    for (const entry of allEntries.results) {
      const contentKey = JSON.stringify(entry.content);
      if (!contentMap.has(contentKey)) {
        contentMap.set(contentKey, []);
      }
      contentMap.get(contentKey)!.push(entry.id);
    }

    const duplicates = Array.from(contentMap.values()).filter(ids => ids.length > 1);
    if (duplicates.length > 0) {
      issues.push({
        type: 'potential_duplicates',
        severity: 'high',
        description: `${duplicates.length} groups of potential duplicate entries`,
        affectedEntries: duplicates.slice(0, 3).flat(),
      });
      qualityScore -= 20;
      recommendations.push('Review and merge duplicate entries');
    }

    // Check for stale entries
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const staleEntries = allEntries.results.filter(e => {
      if (!e.metadata?.timestamp) return false;
      const entryDate = new Date(e.metadata.timestamp);
      return entryDate < threeMonthsAgo;
    });

    if (staleEntries.length > allEntries.results.length * 0.3) {
      issues.push({
        type: 'stale_entries',
        severity: 'low',
        description: `${staleEntries.length} entries are older than 3 months`,
        affectedEntries: staleEntries.slice(0, 5).map(e => e.id),
      });
      qualityScore -= 5;
      recommendations.push('Review and update or archive old entries');
    }

    // Ensure score doesn't go below 0
    qualityScore = Math.max(0, qualityScore);

    // Add general recommendations based on findings
    if (allEntries.results.length < 10) {
      recommendations.push('Add more context entries to build a comprehensive knowledge base');
    }

    if (issues.filter(i => i.severity === 'high').length > 0) {
      recommendations.push('Address high-severity issues first for immediate quality improvement');
    }

    return {
      qualityScore,
      issues,
      recommendations,
    };
  },
});

/**
 * Export all context analysis tools
 */
export const contextAnalysisTools = {
  analyzeContextPatterns: analyzeContextPatternsTool,
  analyzeContextRelationships: analyzeContextRelationshipsTool,
  analyzeContextQuality: analyzeContextQualityTool,
};