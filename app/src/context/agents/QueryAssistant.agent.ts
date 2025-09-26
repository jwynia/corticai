import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { RuntimeContext } from '@mastra/core/runtime-context';
import {
  queryContextTool,
  findRelatedContextTool,
  searchContextTool,
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
 * QueryAssistant Agent
 *
 * Natural language interface for querying and exploring stored context.
 * Translates user questions into structured queries and provides insights.
 */
export class QueryAssistantAgent extends Agent {
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
      name: 'QueryAssistant',
      instructions: `
        You are an intelligent query assistant that helps users find and explore
        stored context using natural language questions.

        Your capabilities:
        1. Translate natural language questions into structured queries
        2. Search across all context entries
        3. Find relationships between entities
        4. Provide summaries and insights
        5. Suggest follow-up queries

        When processing queries:
        - Understand the user's intent
        - Choose the most appropriate search strategy
        - Use multiple query approaches if needed
        - Combine results for comprehensive answers
        - Explain findings clearly

        Query strategies:
        - Direct field queries for specific attributes
        - Full-text search for content discovery
        - Relationship traversal for connected information
        - Pattern analysis for trends and insights

        Always:
        - Provide context for your findings
        - Suggest related information the user might find useful
        - Offer to refine or expand searches
        - Summarize large result sets effectively
      `,
      model: openRouter.chat('anthropic/claude-3.5-haiku'),
      tools: {
        queryContext: queryContextTool,
        findRelatedContext: findRelatedContextTool,
        searchContext: searchContextTool,
        analyzeRelationships: analyzeContextRelationshipsTool,
      },
      memory: config?.memoryStore ? new Memory({
        storage: config.memoryStore,
      }) : undefined,
    });

    // Store the storage configuration for use in methods
    (this as any).storageConfig = storageConfig;
  }

  /**
   * Process a natural language query
   */
  async query(question: string): Promise<{
    answer: string;
    results: any[];
    suggestions?: string[];
    visualizations?: any;
  }> {
    const storageConfig = (this as any).storageConfig;

    // Parse the question to understand intent
    const intent = this.parseIntent(question);

    let results: any[] = [];
    let answer = '';
    const suggestions: string[] = [];

    switch (intent.type) {
      case 'search':
        // Full-text search
        const searchResults = await searchContextTool.execute({
          context: {
            searchTerm: intent.searchTerm!,
            fields: intent.fields,
            type: intent.contextType,
            storageConfig,
          },
          runtimeContext: createRuntimeContext(),
        });
        results = searchResults.results;
        answer = this.formatSearchAnswer(searchResults, intent.searchTerm!);

        if (results.length > 0) {
          suggestions.push(
            `View relationships for "${results[0].id}"`,
            `Search for similar ${results[0].type} entries`,
          );
        }
        break;

      case 'relationship':
        // Find relationships
        const relationshipResults = await findRelatedContextTool.execute({
          context: {
            entityId: intent.entityId!,
            depth: intent.depth || 2,
            storageConfig,
          },
          runtimeContext: createRuntimeContext(),
        });
        results = relationshipResults.related;
        answer = this.formatRelationshipAnswer(relationshipResults, intent.entityId!);

        if (results.length > 0) {
          suggestions.push(
            'Visualize the relationship graph',
            'Explore deeper connections (depth 3)',
          );
        }
        break;

      case 'filter':
        // Structured query with filters
        const queryResults = await queryContextTool.execute({
          context: {
            query: {
              conditions: intent.conditions || [],
              orderBy: intent.orderBy,
              limit: intent.limit,
            },
            storageConfig,
          },
          runtimeContext: createRuntimeContext(),
        });
        results = queryResults.results;
        answer = this.formatFilterAnswer(queryResults, intent);

        if (results.length >= (intent.limit || 10)) {
          suggestions.push('Load more results', 'Refine your filters');
        }
        break;

      case 'analysis':
        // Analyze relationships and patterns
        const analysisResults = await analyzeContextRelationshipsTool.execute({
          context: {
            rootEntityId: intent.entityId,
            maxDepth: intent.depth || 3,
            storageConfig,
          },
          runtimeContext: createRuntimeContext(),
        });

        answer = this.formatAnalysisAnswer(analysisResults);

        // Return graph visualization data
        return {
          answer,
          results: analysisResults.graph.nodes,
          visualizations: {
            type: 'graph',
            data: analysisResults.graph,
            clusters: analysisResults.clusters,
          },
          suggestions: [
            'Explore specific clusters',
            'Analyze patterns in the graph',
            'Find most connected nodes',
          ],
        };

      default:
        // Fallback to general search
        const generalSearch = await searchContextTool.execute({
          context: {
            searchTerm: question,
            storageConfig,
          },
          runtimeContext: createRuntimeContext(),
        });
        results = generalSearch.results;
        answer = `Found ${generalSearch.count} results related to your query.`;

        suggestions.push(
          'Try a more specific search',
          'Use filters to narrow results',
        );
    }

    return {
      answer,
      results,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Get a summary of context around a specific topic
   */
  async getSummary(topic: string): Promise<{
    summary: string;
    keyPoints: string[];
    relatedTopics: string[];
  }> {
    const storageConfig = (this as any).storageConfig;

    // Search for the topic
    const searchResults = await searchContextTool.execute({
      context: {
        searchTerm: topic,
        storageConfig,
      },
      runtimeContext: createRuntimeContext(),
    });

    if (searchResults.results.length === 0) {
      return {
        summary: `No context found related to "${topic}".`,
        keyPoints: [],
        relatedTopics: [],
      };
    }

    // Extract key points
    const keyPoints: string[] = [];
    const relatedTopics = new Set<string>();

    for (const result of searchResults.results.slice(0, 10)) {
      // Extract key information based on type
      switch (result.type) {
        case 'decision':
          keyPoints.push(`Decision: ${this.extractSummary(result.content)}`);
          break;
        case 'code':
          keyPoints.push(`Code: ${this.extractCodeSummary(result.content)}`);
          break;
        case 'documentation':
          keyPoints.push(`Doc: ${this.extractSummary(result.content)}`);
          break;
        case 'todo':
          keyPoints.push(`TODO: ${this.extractSummary(result.content)}`);
          break;
      }

      // Collect related topics from tags
      if (result.metadata?.tags) {
        for (const tag of result.metadata.tags) {
          if (tag !== topic) {
            relatedTopics.add(tag);
          }
        }
      }
    }

    const summary = `
      Found ${searchResults.count} entries related to "${topic}".
      The context includes ${this.countByType(searchResults.results)}.
      ${keyPoints.length > 0 ? `Key findings: ${keyPoints.slice(0, 3).join('; ')}` : ''}
    `.trim().replace(/\s+/g, ' ');

    return {
      summary,
      keyPoints: keyPoints.slice(0, 5),
      relatedTopics: Array.from(relatedTopics).slice(0, 5),
    };
  }

  /**
   * Explore context interactively
   */
  async explore(startPoint?: string): Promise<{
    currentContext: any;
    navigation: {
      related: any[];
      breadcrumbs: string[];
      suggestions: string[];
    };
  }> {
    const storageConfig = (this as any).storageConfig;
    let entityId = startPoint;

    if (!entityId) {
      // Start with recent entries
      const recentQuery = await queryContextTool.execute({
        context: {
          query: {
            orderBy: { field: 'metadata.timestamp', direction: 'DESC' },
            limit: 1,
          },
          storageConfig,
        },
        runtimeContext: createRuntimeContext(),
      });

      if (recentQuery.results.length === 0) {
        return {
          currentContext: null,
          navigation: {
            related: [],
            breadcrumbs: [],
            suggestions: ['Add some context to explore'],
          },
        };
      }

      entityId = recentQuery.results[0].id;
    }

    // Get the current context
    const currentQuery = await queryContextTool.execute({
      context: {
        query: {
          conditions: [{ field: 'id', operator: '=', value: entityId }],
        },
        storageConfig,
      },
      runtimeContext: createRuntimeContext(),
    });

    if (currentQuery.results.length === 0) {
      return {
        currentContext: null,
        navigation: {
          related: [],
          breadcrumbs: [],
          suggestions: ['Context not found'],
        },
      };
    }

    const currentContext = currentQuery.results[0];

    // Find related context
    const relatedResults = await findRelatedContextTool.execute({
      context: {
        entityId: entityId!,
        depth: 1,
        storageConfig,
      },
      runtimeContext: createRuntimeContext(),
    });

    // Generate navigation suggestions
    const suggestions = [
      `Search for similar ${currentContext.type} entries`,
      'View relationship graph',
      'Find entries from the same time period',
    ];

    if (currentContext.metadata?.tags && currentContext.metadata.tags.length > 0) {
      suggestions.push(`Explore tag: ${currentContext.metadata.tags[0]}`);
    }

    return {
      currentContext,
      navigation: {
        related: relatedResults.related.slice(0, 5),
        breadcrumbs: [entityId!], // In a real implementation, maintain history
        suggestions,
      },
    };
  }

  // Helper methods

  private parseIntent(question: string): any {
    const lower = question.toLowerCase();

    // Relationship queries
    if (lower.includes('related to') || lower.includes('connected to') || lower.includes('relationships')) {
      const entityMatch = question.match(/(?:related to|connected to|relationships? (?:of|for)) ["']?([^"']+)["']?/i);
      return {
        type: 'relationship',
        entityId: entityMatch ? entityMatch[1] : undefined,
        depth: lower.includes('deep') ? 3 : 2,
      };
    }

    // Analysis queries
    if (lower.includes('analyze') || lower.includes('graph') || lower.includes('network')) {
      return {
        type: 'analysis',
        depth: 3,
      };
    }

    // Filter queries
    if (lower.includes('all') || lower.includes('list') || lower.includes('show')) {
      const conditions = [];

      // Check for type filters
      const types = ['decision', 'code', 'documentation', 'todo'];
      for (const type of types) {
        if (lower.includes(type)) {
          conditions.push({ field: 'type', operator: '=', value: type });
          break;
        }
      }

      // Check for time filters
      if (lower.includes('recent') || lower.includes('latest')) {
        return {
          type: 'filter',
          conditions,
          orderBy: { field: 'metadata.timestamp', direction: 'DESC' },
          limit: 10,
        };
      }

      return {
        type: 'filter',
        conditions,
        limit: 20,
      };
    }

    // Default to search
    return {
      type: 'search',
      searchTerm: question,
      fields: ['content', 'metadata.tags'],
    };
  }

  private formatSearchAnswer(results: any, searchTerm: string): string {
    if (results.count === 0) {
      return `No results found for "${searchTerm}".`;
    }

    const types = this.countByType(results.results);
    return `Found ${results.count} results for "${searchTerm}": ${types}. The most relevant results are shown above.`;
  }

  private formatRelationshipAnswer(results: any, entityId: string): string {
    if (results.count === 0) {
      return `No related context found for "${entityId}".`;
    }

    const byDistance = new Map<number, number>();
    for (const item of results.related) {
      byDistance.set(item.distance, (byDistance.get(item.distance) || 0) + 1);
    }

    const distanceStr = Array.from(byDistance.entries())
      .map(([dist, count]) => `${count} at distance ${dist}`)
      .join(', ');

    return `Found ${results.count} related items for "${entityId}": ${distanceStr}.`;
  }

  private formatFilterAnswer(results: any, intent: any): string {
    if (results.count === 0) {
      return 'No results match your filters.';
    }

    const types = this.countByType(results.results);
    return `Found ${results.count} matching entries: ${types}.`;
  }

  private formatAnalysisAnswer(results: any): string {
    return `
      Analyzed ${results.metrics.totalNodes} nodes with ${results.metrics.totalEdges} connections.
      Found ${results.clusters.length} clusters with an average of ${results.metrics.avgConnections} connections per node.
      The most connected nodes are: ${results.metrics.mostConnected.slice(0, 3).map((n: any) => n.id).join(', ')}.
    `.trim().replace(/\s+/g, ' ');
  }

  private countByType(results: any[]): string {
    const typeCounts = new Map<string, number>();
    for (const result of results) {
      const type = result.type || 'unknown';
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    return Array.from(typeCounts.entries())
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
  }

  private extractSummary(content: any): string {
    if (typeof content === 'string') {
      return content.slice(0, 100) + (content.length > 100 ? '...' : '');
    }
    return JSON.stringify(content).slice(0, 100) + '...';
  }

  private extractCodeSummary(content: any): string {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    const match = str.match(/(?:function|class|const|let|var)\s+(\w+)/);
    return match ? `${match[1]} implementation` : 'code implementation';
  }
}

/**
 * Factory function to create a QueryAssistant agent
 */
export function createQueryAssistant(config?: {
  storageType?: 'memory' | 'json' | 'duckdb';
  storageConfig?: any;
  memoryStore?: LibSQLStore;
}): QueryAssistantAgent {
  return new QueryAssistantAgent(config);
}