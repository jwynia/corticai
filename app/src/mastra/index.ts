/**
 * CorticAI Mastra Integration
 *
 * This module provides CorticAI agents and tools for use within Mastra workflows.
 * It acts as a thin wrapper that re-exports context management agents and tools
 * from the core CorticAI package for easy integration with Mastra.
 *
 * @example Using context agents in a Mastra workflow
 * ```typescript
 * import { Mastra } from '@mastra/core';
 * import { contextAgents, contextTools } from 'corticai/mastra';
 *
 * const mastra = new Mastra({
 *   agents: {
 *     contextManager: contextAgents.ContextManager({ storageType: 'duckdb' })
 *   },
 *   tools: contextTools
 * });
 * ```
 *
 * @example Using in Mastra workflows
 * ```typescript
 * workflows: {
 *   processDocumentation: async (context) => {
 *     const stored = await context.agents.contextManager.storeWithIntelligence({
 *       type: 'documentation',
 *       content: context.input.content
 *     });
 *     return stored;
 *   }
 * }
 * ```
 */

// Re-export core agents for Mastra consumption
export {
  ContextManagerAgent,
  createContextManager,
  QueryAssistantAgent,
  createQueryAssistant,
  ContextObserverAgent,
  createContextObserver,
  contextAgents,
  createContextAgents,
  type ObservedMessage,
  type ObserverFilters
} from '../context/agents/index.js';

// Re-export core tools for Mastra consumption
export {
  contextTools,
  contextToolCategories,
  contextStoreTools,
  contextQueryTools,
  contextAnalysisTools
} from '../context/tools/index.js';

// Export the Mastra instance factory for applications that need a pre-configured instance
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { contextAgents, contextTools } from '../context/index.js';
import { weatherWorkflow } from './workflows/weather-workflow.js';
import { weatherAgent } from './agents/weather-agent.js';

/**
 * Factory function to create a pre-configured Mastra instance with CorticAI agents and tools
 *
 * @param options Configuration options for the Mastra instance
 * @returns Configured Mastra instance with CorticAI agents and tools
 *
 * @example
 * ```typescript
 * const mastra = createCorticaiMastra({
 *   contextStorageType: 'duckdb',
 *   databasePath: './context.db'
 * });
 * ```
 */
export function createCorticaiMastra(options?: {
  contextStorageType?: 'memory' | 'json' | 'duckdb';
  databasePath?: string;
  storageConfig?: any;
}): Mastra {
  const { contextStorageType = 'memory', storageConfig = {} } = options || {};

  return new Mastra({
    workflows: { weatherWorkflow },
    agents: {
      weatherAgent,
      // Include CorticAI context agents
      contextManager: contextAgents.ContextManager({ storageType: contextStorageType, storageConfig }),
      queryAssistant: contextAgents.QueryAssistant({ storageType: contextStorageType, storageConfig }),
      contextObserver: contextAgents.ContextObserver({ storageType: contextStorageType, storageConfig }),
    },
    storage: new LibSQLStore({
      // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
      url: ":memory:",
    }),
    logger: new PinoLogger({
      name: 'Mastra',
      level: 'info',
    }),
  });
}

/**
 * Pre-configured Mastra instance for quick prototyping
 *
 * Includes CorticAI context agents and tools alongside example weather agent
 *
 * @deprecated Use createCorticaiMastra() instead for explicit configuration
 */
export const mastra: Mastra = createCorticaiMastra();
