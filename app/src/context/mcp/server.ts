/**
 * MCP Server for CorticAI Context Management
 *
 * Creates an MCP server that exposes context management capabilities
 * via the Model Context Protocol for use with Mastra and other MCP-compatible systems.
 *
 * @example Using with Mastra
 * ```typescript
 * import { Mastra } from '@mastra/core';
 * import { corticaiContextServer } from 'corticai/context/mcp';
 *
 * const mastra = new Mastra({
 *   mcps: {
 *     context: corticaiContextServer
 *   }
 * });
 * ```
 *
 * @example Custom configuration
 * ```typescript
 * import { createCorticaiMCPServer } from 'corticai/context/mcp';
 *
 * const customServer = createCorticaiMCPServer({
 *   tools: ['storeContext', 'queryContext'],
 *   includeAgents: true
 * });
 * ```
 */

import { MCPServer } from '@mastra/mcp';
import { contextTools } from '../tools/index.js';
import { createContextManager, createQueryAssistant, createContextObserver } from '../agents/index.js';

/**
 * Configuration options for creating a CorticAI MCP Server
 */
export interface CorticaiMCPServerConfig {
  /** Which tools to include (defaults to all) */
  tools?: string[];
  /** Whether to include agents as tools */
  includeAgents?: boolean;
  /** Storage configuration for agents */
  storage?: {
    type: 'memory' | 'json' | 'duckdb';
    duckdb?: { database: string; tableName?: string };
    json?: { filePath: string; pretty?: boolean };
  };
  /** Whether to include observer agent */
  includeObserver?: boolean;
}

/**
 * Create a configured CorticAI MCP Server
 */
export function createCorticaiMCPServer(config: CorticaiMCPServerConfig = {}): MCPServer {
  const {
    tools = Object.keys(contextTools), // Default to all tools
    includeAgents = true,
    storage = { type: 'memory' },
    includeObserver = false,
  } = config;

  // Filter tools based on configuration
  const selectedTools: Record<string, any> = {};
  for (const toolName of tools) {
    if (toolName in contextTools) {
      selectedTools[toolName] = (contextTools as any)[toolName];
    }
  }

  // Create agents if requested
  const agents: Record<string, any> = {};

  if (includeAgents) {
    // Storage config for agents
    const storageConfig = storage.type === 'duckdb'
      ? { storageType: 'duckdb' as const, storageConfig: storage.duckdb }
      : storage.type === 'json'
      ? { storageType: 'json' as const, storageConfig: storage.json }
      : { storageType: 'memory' as const };

    agents.contextManager = createContextManager(storageConfig);
    agents.queryAssistant = createQueryAssistant(storageConfig);

    if (includeObserver) {
      agents.contextObserver = createContextObserver(storageConfig);
    }
  }

  // Create the MCP server
  const server = new MCPServer({
    name: 'corticai-context',
    version: '1.0.0',
    description: 'Intelligent context management for LLM applications',
    tools: selectedTools,
    ...(Object.keys(agents).length > 0 && { agents }),
  });

  return server;
}

/**
 * Default CorticAI Context MCP Server
 * Includes all tools and agents with memory storage
 */
export const corticaiContextServer = createCorticaiMCPServer({
  includeAgents: true,
  storage: { type: 'memory' },
});

/**
 * Production-ready CorticAI Context MCP Server with DuckDB
 */
export function createProductionServer(databasePath = './context.db'): MCPServer {
  return createCorticaiMCPServer({
    includeAgents: true,
    storage: {
      type: 'duckdb',
      duckdb: {
        database: databasePath,
        tableName: 'context',
      },
    },
  });
}

/**
 * Minimal CorticAI Context MCP Server (tools only)
 */
export const minimalContextServer = createCorticaiMCPServer({
  tools: ['storeContext', 'queryContext', 'searchContext'],
  includeAgents: false,
});