/**
 * CorticAI MCP Integration Examples
 *
 * Demonstrates how to use CorticAI context management via MCP
 * (Model Context Protocol) for interoperability.
 */

import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  // MCP Server components
  createContextMCPServer,
  createContextMCPServerHTTP,
  runContextMCPServer,

  // MCP Client components
  createContextMCPClient,
  contextMCPClientHTTP,
  contextMCPClientLocal,
} from '../src/context/mcp/index.js';

/**
 * Example 1: Run as MCP Server (stdio)
 * This is what gets executed when someone runs: npx corticai-context-mcp
 */
export function runAsStdioServer() {
  console.log('Starting CorticAI Context MCP Server (stdio)...');

  runContextMCPServer({
    name: 'corticai-context',
    version: '1.0.0',
    storage: {
      type: 'duckdb',
      duckdb: {
        database: process.env.CONTEXT_DB || './context.db',
        tableName: 'context',
      },
    },
    tools: [
      'storeContext',
      'queryContext',
      'searchContext',
      'findRelatedContext',
      'analyzeContextPatterns',
    ],
    agents: ['ContextManager', 'QueryAssistant'],
  });
}

/**
 * Example 2: Run as HTTP/SSE Server
 * For network-accessible MCP server
 */
export async function runAsHttpServer() {
  console.log('Starting CorticAI Context MCP Server (HTTP/SSE)...');

  const { server, start } = createContextMCPServerHTTP(3100, {
    storage: {
      type: 'duckdb',
      duckdb: {
        database: './context.db',
      },
    },
  });

  // Start the HTTP server
  const httpServer = start();

  // Server is now available at:
  // HTTP: http://localhost:3100/mcp
  // SSE: http://localhost:3100/mcp-sse

  return httpServer;
}

/**
 * Example 3: Use as MCP Client with Mastra (stdio)
 * Consuming a locally installed CorticAI package
 */
export async function useAsMCPClientStdio() {
  console.log('=== Using CorticAI as MCP Client (stdio) ===\n');

  // Create Mastra with MCP client for local package
  const mastra = new Mastra({
    mcps: {
      // This will run: npx corticai mcp-server
      contextLocal: contextMCPClientLocal('corticai'),
    },
  });

  // Now you can use the context tools through Mastra
  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const agent = new Agent({
    name: 'MyAgent',
    instructions: 'You help manage context',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    mcps: ['contextLocal'], // Reference the MCP client
  });

  // The agent now has access to all context tools via MCP
  console.log('Agent configured with context MCP tools');
}

/**
 * Example 4: Use as MCP Client with Mastra (HTTP)
 * Consuming a remote CorticAI MCP server
 */
export async function useAsMCPClientHTTP() {
  console.log('=== Using CorticAI as MCP Client (HTTP) ===\n');

  // Create Mastra with HTTP MCP client
  const mastra = new Mastra({
    mcps: {
      // Connect to remote context server
      contextRemote: contextMCPClientHTTP('http://localhost:3100/mcp'),
    },
  });

  // Create an agent that uses the remote context
  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const agent = new Agent({
    name: 'RemoteContextAgent',
    instructions: `
      You manage context stored on a remote server.
      Use the context tools to store and retrieve information.
    `,
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    mcps: ['contextRemote'],
  });

  // Example: Use the agent to store context
  const result = await agent.generate(`
    Store this decision in context:
    "We decided to use MCP for cross-system context sharing
    because it provides standard protocol for tool interoperability."
  `);

  console.log('Stored via remote MCP:', result);
}

/**
 * Example 5: Hybrid Setup
 * Use both local tools AND remote MCP for redundancy
 */
export async function hybridSetup() {
  console.log('=== Hybrid Context Management Setup ===\n');

  const { Mastra } = await import('@mastra/core/mastra');
  const { contextTools, contextAgents } = await import('../src/context/index.js');

  const mastra = new Mastra({
    // Local tools (in-memory)
    tools: {
      ...contextTools,
    },

    // Local agents
    agents: {
      localManager: contextAgents.ContextManager({
        storageType: 'memory',
      }),
    },

    // Remote MCP servers
    mcps: {
      // Primary remote storage
      primaryContext: contextMCPClientHTTP('http://primary.example.com:3100/mcp'),

      // Backup remote storage
      backupContext: contextMCPClientHTTP('http://backup.example.com:3100/mcp'),
    },
  });

  console.log('Hybrid setup complete with local and remote context management');
}

/**
 * Example 6: Multi-Server MCP Setup
 * Connect to multiple MCP servers for different contexts
 */
export async function multiServerSetup() {
  console.log('=== Multi-Server MCP Setup ===\n');

  const mastra = new Mastra({
    mcps: {
      // Development context
      devContext: createContextMCPClient({
        transport: 'http',
        url: 'http://dev.example.com:3100/mcp',
      }),

      // Production context
      prodContext: createContextMCPClient({
        transport: 'http',
        url: 'http://prod.example.com:3100/mcp',
      }),

      // Local context for testing
      localContext: createContextMCPClient({
        transport: 'stdio',
        command: 'npx',
        args: ['corticai', 'mcp-server'],
        env: {
          CONTEXT_DB: './test-context.db',
        },
      }),
    },
  });

  // Create specialized agents for each context
  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const devAgent = new Agent({
    name: 'DevContextAgent',
    instructions: 'Manage development context',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    mcps: ['devContext'],
  });

  const prodAgent = new Agent({
    name: 'ProdContextAgent',
    instructions: 'Manage production context',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    mcps: ['prodContext'],
  });

  console.log('Multi-server setup complete');
  return { mastra, devAgent, prodAgent };
}

/**
 * Example 7: SSE Streaming Setup
 * Use Server-Sent Events for real-time context updates
 */
export async function sseStreamingSetup() {
  console.log('=== SSE Streaming Setup ===\n');

  // Start SSE server
  process.env.MCP_TRANSPORT = 'sse';
  process.env.MCP_PORT = '3200';

  const httpServer = runContextMCPServer({
    storage: {
      type: 'memory', // Fast for streaming
    },
    enableObserver: true, // Enable observational mode
  });

  // Create client that connects via SSE
  const mastra = new Mastra({
    mcps: {
      streamingContext: createContextMCPClient({
        transport: 'sse',
        url: 'http://localhost:3200/mcp-sse',
      }),
    },
  });

  console.log('SSE streaming context server running on port 3200');
  return { httpServer, mastra };
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'stdio-server':
      runAsStdioServer();
      break;

    case 'http-server':
      await runAsHttpServer();
      break;

    case 'stdio-client':
      await useAsMCPClientStdio();
      break;

    case 'http-client':
      await useAsMCPClientHTTP();
      break;

    case 'hybrid':
      await hybridSetup();
      break;

    case 'multi-server':
      await multiServerSetup();
      break;

    case 'sse':
      await sseStreamingSetup();
      break;

    default:
      console.log(`
CorticAI MCP Integration Examples

Usage: tsx mcp-integration.ts [command]

Commands:
  stdio-server    Run as stdio MCP server
  http-server     Run as HTTP/SSE MCP server
  stdio-client    Use as stdio MCP client
  http-client     Use as HTTP MCP client
  hybrid          Hybrid local/remote setup
  multi-server    Multi-server setup
  sse             SSE streaming setup

Environment Variables:
  OPENROUTER_API_KEY    API key for OpenRouter
  CONTEXT_DB            Database path (default: ./context.db)
  MCP_TRANSPORT         Transport type: stdio, http, sse (default: stdio)
  MCP_PORT              Port for HTTP/SSE server (default: 3000)
      `);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;