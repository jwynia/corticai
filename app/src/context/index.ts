/**
 * CorticAI Context Management Module
 *
 * Comprehensive context management system built on Mastra framework.
 * Provides tools, agents, and workflows for intelligent context storage,
 * retrieval, and analysis.
 *
 * @example Direct Library Usage
 * ```typescript
 * import { ContextManager, contextTools } from 'corticai/context';
 *
 * const manager = new ContextManager({
 *   storageType: 'duckdb',
 *   storageConfig: { duckdb: { database: './context.db' } }
 * });
 *
 * await manager.storeWithIntelligence({
 *   type: 'decision',
 *   content: 'Use DuckDB for storage',
 *   rationale: 'Better performance for analytical queries'
 * });
 * ```
 *
 * @example As Mastra Tools
 * ```typescript
 * import { Mastra } from '@mastra/core';
 * import { contextTools, contextAgents } from 'corticai/context';
 *
 * const mastra = new Mastra({
 *   tools: contextTools,
 *   agents: {
 *     contextManager: contextAgents.ContextManager(),
 *     queryAssistant: contextAgents.QueryAssistant(),
 *   }
 * });
 * ```
 *
 * @example Observational Mode
 * ```typescript
 * import { ContextObserver } from 'corticai/context';
 *
 * const observer = new ContextObserver({
 *   filters: {
 *     keywords: ['architecture', 'decision'],
 *     confidence: 0.7
 *   }
 * });
 *
 * // Observe messages
 * await observer.observe({
 *   role: 'user',
 *   content: 'Should we use REST or GraphQL?'
 * });
 * ```
 */

// Export all tools
export * from './tools/index.js';

// Export all agents
export * from './agents/index.js';

// Export MCP integration (optional)
export * from './mcp/index.js';

// Re-export for convenience
import { contextTools, contextToolCategories } from './tools/index.js';
import { contextAgents, createContextAgents } from './agents/index.js';

export {
  contextTools,
  contextToolCategories,
  contextAgents,
  createContextAgents,
};

/**
 * Quick setup function for common use case
 */
export function setupContextManagement(config?: {
  storageType?: 'memory' | 'json' | 'duckdb';
  duckdb?: { database: string; tableName?: string };
  json?: { filePath: string; pretty?: boolean };
}) {
  const storageConfig = config?.storageType === 'duckdb'
    ? { type: 'duckdb' as const, ...config.duckdb }
    : config?.storageType === 'json'
    ? { type: 'json' as const, ...config.json }
    : { type: 'memory' as const };

  const agents = createContextAgents({
    storageType: config?.storageType,
    storageConfig,
  });

  return {
    tools: contextTools,
    agents,
    // Convenience methods
    async store(data: any, metadata?: any) {
      return agents.manager.storeWithIntelligence(data, metadata);
    },
    async query(question: string) {
      return agents.assistant.query(question);
    },
    async observe(message: any) {
      return agents.observer.observe(message);
    },
    async getInsights() {
      return agents.manager.getInsights();
    },
    async performMaintenance() {
      return agents.manager.performMaintenance();
    },
  };
}

/**
 * Default export for easy setup
 */
export default setupContextManagement;