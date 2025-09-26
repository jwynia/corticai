import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { RuntimeContext } from '@mastra/core/runtime-context';
import {
  storeContextTool,
  batchStoreContextTool,
  deleteContextTool,
  clearContextTool,
  queryContextTool,
  findRelatedContextTool,
  analyzeContextPatternsTool,
  analyzeContextQualityTool,
  analyzeContextRelationshipsTool,
} from '../tools/index.js';

// Configure OpenRouter
const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

// Helper function to create RuntimeContext
function createRuntimeContext(): RuntimeContext {
  return new RuntimeContext();
}

/**
 * ContextManager Agent
 *
 * Intelligent agent for managing context storage with deduplication,
 * validation, enrichment, and relationship management.
 */
export class ContextManagerAgent extends Agent {
  constructor(config?: {
    storageType?: 'memory' | 'json' | 'duckdb';
    storageConfig?: any;
    memoryStore?: LibSQLStore;
  }) {
    const storageConfig = {
      type: config?.storageType || 'memory',
      ...(config?.storageConfig || {}),
    };

    super({
      name: 'ContextManager',
      instructions: `
        You are an intelligent context management system responsible for storing,
        organizing, and maintaining context information.

        Your responsibilities:
        1. Store context entries with appropriate metadata and relationships
        2. Detect and prevent duplicate entries
        3. Enrich context with additional metadata when possible
        4. Maintain relationships between related context entries
        5. Ensure data quality and consistency
        6. Provide insights about stored context

        When storing context:
        - Always check for duplicates first
        - Add appropriate metadata (timestamps, tags, relationships)
        - Validate the context type and structure
        - Link related entries when possible
        - Maintain a high-quality knowledge base

        When managing context:
        - Periodically analyze quality and suggest improvements
        - Identify patterns and relationships
        - Clean up stale or redundant entries
        - Optimize storage and retrieval

        Be proactive in:
        - Suggesting better organization
        - Identifying missing relationships
        - Recommending cleanup actions
        - Providing insights about the context base
      `,
      model: openRouter.chat('anthropic/claude-3.5-haiku'),
      tools: {
        storeContext: storeContextTool,
        batchStoreContext: batchStoreContextTool,
        deleteContext: deleteContextTool,
        clearContext: clearContextTool,
        queryContext: queryContextTool,
        findRelatedContext: findRelatedContextTool,
        analyzePatterns: analyzeContextPatternsTool,
        analyzeQuality: analyzeContextQualityTool,
      },
      memory: config?.memoryStore ? new Memory({
        storage: config.memoryStore,
      }) : undefined,
    });

    // Store the storage configuration for use in methods
    (this as any).storageConfig = storageConfig;
  }

  /**
   * Store context with intelligent processing
   */
  async storeWithIntelligence(data: any, metadata?: any): Promise<{
    success: boolean;
    id?: string;
    message: string;
    suggestions?: string[];
  }> {
    const storageConfig = (this as any).storageConfig;

    // Prepare the context entry
    const entry = {
      type: this.inferContextType(data),
      content: data,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    };

    // Check for existing similar entries
    if (!queryContextTool.execute) {
      throw new Error('queryContextTool.execute is not available');
    }

    const similarQuery = await queryContextTool.execute({
      context: {
        query: {
          conditions: [
            { field: 'type', operator: '=', value: entry.type },
          ],
        },
        storageConfig,
      },
      runtimeContext: createRuntimeContext(),
    });

    // Look for potential duplicates
    const potentialDuplicates = similarQuery.results.filter((existing: any) => {
      const similarity = this.calculateSimilarity(existing.content, data);
      return similarity > 0.8; // 80% similarity threshold
    });

    if (potentialDuplicates.length > 0) {
      return {
        success: false,
        message: `Found ${potentialDuplicates.length} similar entries. Consider updating existing entry instead.`,
        suggestions: [
          `Update entry ${potentialDuplicates[0].id} instead of creating new`,
          'Link as related context to existing entry',
        ],
      };
    }

    // Extract relationships
    const relatedIds = await this.findRelatedEntries(data, storageConfig);
    if (relatedIds.length > 0) {
      entry.metadata.related = relatedIds;
    }

    // Store the entry
    if (!storeContextTool.execute) {
      throw new Error('storeContextTool.execute is not available');
    }

    const result = await storeContextTool.execute({
      context: {
        entry,
        storageConfig,
        deduplicate: true,
      },
      runtimeContext: createRuntimeContext(),
    });

    if (result.stored) {
      // Analyze quality after storage
      if (!analyzeContextQualityTool.execute) {
        throw new Error('analyzeContextQualityTool.execute is not available');
      }

      const qualityAnalysis = await analyzeContextQualityTool.execute({
        context: { storageConfig },
        runtimeContext: createRuntimeContext(),
      });

      const suggestions = [];
      if (qualityAnalysis.qualityScore < 80) {
        suggestions.push(...qualityAnalysis.recommendations.slice(0, 2));
      }

      return {
        success: true,
        id: result.id,
        message: `Context stored successfully with ID: ${result.id}`,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } else if (result.duplicate) {
      return {
        success: false,
        message: `Duplicate entry detected. Existing ID: ${result.duplicateId}`,
      };
    } else {
      return {
        success: false,
        message: 'Failed to store context entry',
      };
    }
  }

  /**
   * Perform maintenance on the context store
   */
  async performMaintenance(): Promise<{
    actions: string[];
    improvements: number;
  }> {
    const storageConfig = (this as any).storageConfig;
    const actions: string[] = [];
    let improvements = 0;

    // Analyze quality
    if (!analyzeContextQualityTool.execute) {
      throw new Error('analyzeContextQualityTool.execute is not available');
    }

    const qualityAnalysis = await analyzeContextQualityTool.execute({
      context: { storageConfig },
      runtimeContext: createRuntimeContext(),
    });

    // Address high-severity issues
    for (const issue of qualityAnalysis.issues) {
      if (issue.severity === 'high') {
        if (issue.type === 'potential_duplicates') {
          // Handle duplicates
          actions.push(`Identified ${issue.affectedEntries.length} potential duplicates for review`);
          improvements += issue.affectedEntries.length;
        }
      }
    }

    // Analyze patterns
    const patternAnalysis = await analyzeContextPatternsTool.execute({
      context: { storageConfig },
      runtimeContext: createRuntimeContext(),
    });

    // Identify orphaned entries and suggest relationships
    for (const pattern of patternAnalysis.patterns) {
      if (pattern.type === 'pending_todos') {
        actions.push(`Found ${pattern.frequency} pending TODO items that may need attention`);
      }
    }

    // Clean up old entries (example - would need implementation)
    const oldEntries = await queryContextTool.execute({
      context: {
        query: {
          conditions: [
            {
              field: 'metadata.timestamp',
              operator: '<',
              value: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months old
            },
          ],
        },
        storageConfig,
      },
      runtimeContext: createRuntimeContext(),
    });

    if (oldEntries.results.length > 0) {
      actions.push(`Identified ${oldEntries.results.length} entries older than 6 months for archival`);
      improvements += oldEntries.results.length;
    }

    return {
      actions,
      improvements,
    };
  }

  /**
   * Get insights about the context store
   */
  async getInsights(): Promise<{
    summary: string;
    patterns: any[];
    recommendations: string[];
    metrics: any;
  }> {
    const storageConfig = (this as any).storageConfig;

    // Get patterns
    if (!analyzeContextPatternsTool.execute) {
      throw new Error('analyzeContextPatternsTool.execute is not available');
    }

    const patternAnalysis = await analyzeContextPatternsTool.execute({
      context: { storageConfig },
      runtimeContext: createRuntimeContext(),
    });

    // Get quality
    if (!analyzeContextQualityTool.execute) {
      throw new Error('analyzeContextQualityTool.execute is not available');
    }

    const qualityAnalysis = await analyzeContextQualityTool.execute({
      context: { storageConfig },
      runtimeContext: createRuntimeContext(),
    });

    // Get relationships
    if (!analyzeContextRelationshipsTool.execute) {
      throw new Error('analyzeContextRelationshipsTool.execute is not available');
    }

    const relationshipAnalysis = await analyzeContextRelationshipsTool.execute({
      context: { storageConfig, maxDepth: 3 },
      runtimeContext: createRuntimeContext(),
    });

    const summary = `
      Context store contains ${patternAnalysis.statistics.totalEntries} entries
      with a quality score of ${qualityAnalysis.qualityScore}/100.
      Found ${patternAnalysis.patterns.length} patterns and
      ${relationshipAnalysis.clusters.length} connected clusters.
    `.trim().replace(/\s+/g, ' ');

    return {
      summary,
      patterns: patternAnalysis.patterns,
      recommendations: qualityAnalysis.recommendations,
      metrics: {
        totalEntries: patternAnalysis.statistics.totalEntries,
        qualityScore: qualityAnalysis.qualityScore,
        typeDistribution: patternAnalysis.statistics.typeDistribution,
        clusters: relationshipAnalysis.clusters.length,
        avgConnections: relationshipAnalysis.metrics.avgConnections,
      },
    };
  }

  // Helper methods

  private inferContextType(data: any): "pattern" | "code" | "decision" | "discussion" | "documentation" | "todo" | "relationship" {
    if (typeof data === 'string') {
      if (data.includes('TODO') || data.includes('FIXME')) return 'todo';
      if (data.includes('function') || data.includes('class')) return 'code';
      if (data.includes('decided') || data.includes('decision')) return 'decision';
      if (data.includes('relationship') || data.includes('relation')) return 'relationship';
      if (data.includes('pattern')) return 'pattern';
      if (data.includes('discuss')) return 'discussion';
      return 'documentation';
    }

    if (data.type && ['pattern', 'code', 'decision', 'discussion', 'documentation', 'todo', 'relationship'].includes(data.type)) {
      return data.type;
    }

    if (data.code || data.implementation) return 'code';
    if (data.decision || data.rationale) return 'decision';
    if (data.task || data.todo) return 'todo';

    return 'documentation';
  }

  private calculateSimilarity(content1: any, content2: any): number {
    // Simple similarity calculation - in production, use proper algorithms
    const str1 = JSON.stringify(content1).toLowerCase();
    const str2 = JSON.stringify(content2).toLowerCase();

    if (str1 === str2) return 1;

    // Calculate Jaccard similarity on words
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);

    return intersection.size / union.size;
  }

  private async findRelatedEntries(data: any, storageConfig: any): Promise<string[]> {
    const related: string[] = [];

    // Extract potential references (IDs, names, etc.)
    const dataStr = JSON.stringify(data);
    const potentialRefs = dataStr.match(/[a-zA-Z0-9_-]{8,}/g) || [];

    for (const ref of potentialRefs.slice(0, 5)) {
      // Check first 5 potential references
      const query = await queryContextTool.execute({
        context: {
          query: {
            conditions: [
              { field: 'id', operator: '=', value: ref },
            ],
          },
          storageConfig,
        },
        runtimeContext: createRuntimeContext(),
      });

      if (query.results.length > 0) {
        related.push(ref);
      }
    }

    return related;
  }
}

/**
 * Factory function to create a ContextManager agent
 */
export function createContextManager(config?: {
  storageType?: 'memory' | 'json' | 'duckdb';
  storageConfig?: any;
  memoryStore?: LibSQLStore;
}): ContextManagerAgent {
  return new ContextManagerAgent(config);
}