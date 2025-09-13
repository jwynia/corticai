/**
 * MCP Server for CorticAI Context Management
 *
 * Optional component that exposes context management capabilities
 * via the Model Context Protocol (MCP) for interoperability with
 * other MCP-compatible systems.
 *
 * @example Standalone MCP Server
 * ```typescript
 * import { createContextMCPServer } from 'corticai/context/mcp';
 *
 * const server = createContextMCPServer({
 *   storage: { type: 'duckdb', database: './context.db' }
 * });
 *
 * // Run as stdio server
 * server.startStdio();
 * ```
 *
 * @example Integration with Mastra MCP
 * ```typescript
 * import { Mastra } from '@mastra/core';
 * import { contextMCPServer } from 'corticai/context/mcp';
 *
 * const mastra = new Mastra({
 *   mcpServers: { contextServer: contextMCPServer }
 * });
 * ```
 */

import { MCPServer } from '@mastra/mcp';
import { contextTools } from '../tools/index.js';
import { contextAgents } from '../agents/index.js';
import type { Server } from 'http';

/**
 * Configuration for the Context MCP Server
 */
export interface ContextMCPServerConfig {
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Storage configuration */
  storage?: {
    type: 'memory' | 'json' | 'duckdb';
    duckdb?: { database: string; tableName?: string };
    json?: { filePath: string; pretty?: boolean };
  };
  /** Which tools to expose */
  tools?: string[];
  /** Which agents to expose */
  agents?: string[];
  /** Enable observational mode */
  enableObserver?: boolean;
}

/**
 * Create a Context MCP Server
 */
export function createContextMCPServer(config: ContextMCPServerConfig = {}): MCPServer {
  const {
    name = 'corticai-context',
    version = '1.0.0',
    storage = { type: 'memory' },
    tools = [
      'storeContext',
      'queryContext',
      'searchContext',
      'findRelatedContext',
      'analyzeContextPatterns',
      'analyzeContextQuality',
    ],
    agents = ['ContextManager', 'QueryAssistant'],
    enableObserver = false,
  } = config;

  // Prepare storage configuration
  const storageConfig = storage.type === 'duckdb'
    ? { type: 'duckdb' as const, ...storage.duckdb }
    : storage.type === 'json'
    ? { type: 'json' as const, ...storage.json }
    : { type: 'memory' as const };

  // Filter tools based on configuration
  const selectedTools = Object.fromEntries(
    Object.entries(contextTools).filter(([key]) => tools.includes(key))
  );

  // Create agents based on configuration
  const selectedAgents: Record<string, any> = {};

  if (agents.includes('ContextManager')) {
    selectedAgents.contextManager = contextAgents.ContextManager({
      storageType: storage.type,
      storageConfig,
    });
  }

  if (agents.includes('QueryAssistant')) {
    selectedAgents.queryAssistant = contextAgents.QueryAssistant({
      storageType: storage.type,
      storageConfig,
    });
  }

  if (enableObserver || agents.includes('ContextObserver')) {
    selectedAgents.contextObserver = contextAgents.ContextObserver({
      storageType: storage.type,
      storageConfig,
    });
  }

  // Create the MCP server
  const server = new MCPServer({
    name,
    version,
    tools: selectedTools,
    // Note: Agents in MCP are exposed as tools that can generate responses
    // We'll wrap them as tool-like interfaces
    agents: selectedAgents,
  });

  // Add custom handlers if needed
  server.on('ready', () => {
    console.log(`Context MCP Server '${name}' v${version} is ready`);
    console.log(`- Storage: ${storage.type}`);
    console.log(`- Tools: ${tools.join(', ')}`);
    console.log(`- Agents: ${agents.join(', ')}`);
  });

  return server;
}

/**
 * Default Context MCP Server instance
 */
export const contextMCPServer = createContextMCPServer();

/**
 * Run the MCP server as a standalone process
 */
export function runContextMCPServer(config?: ContextMCPServerConfig): Server | void {
  const server = createContextMCPServer(config);

  // Start based on environment or config
  const transport = process.env.MCP_TRANSPORT || 'stdio';

  if (transport === 'http' || transport === 'sse') {
    const port = parseInt(process.env.MCP_PORT || '3000', 10);
    const httpServer = server.startHttp(port);
    console.log(`Context MCP Server running on ${transport.toUpperCase()} port ${port}`);
    console.log(`Endpoint: http://localhost:${port}/mcp${transport === 'sse' ? '-sse' : ''}`);
    return httpServer;
  } else {
    // Default to stdio
    server.startStdio().catch((error) => {
      console.error('Error running Context MCP server:', error);
      process.exit(1);
    });
  }
}

/**
 * Create an HTTP/SSE MCP server for use with Mastra
 * This returns a configured server ready for HTTP/SSE transport
 */
export function createContextMCPServerHTTP(
  port = 3000,
  config?: ContextMCPServerConfig
): { server: MCPServer; start: () => Server } {
  const mcpServer = createContextMCPServer(config);

  return {
    server: mcpServer,
    start: () => {
      const httpServer = mcpServer.startHttp(port);
      console.log(`Context MCP Server running on port ${port}`);
      return httpServer;
    }
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runContextMCPServer();
}