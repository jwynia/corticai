/**
 * CorticAI MCP Usage Examples
 *
 * Demonstrates the correct way to use CorticAI context management
 * with Mastra's MCP integration.
 */

import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  corticaiContextServer,
  createCorticaiMCPServer,
  createProductionServer,
  minimalContextServer,
} from '../src/context/mcp/index.js';
import { setupContextManagement } from '../src/context/index.js';

/**
 * Example 1: Basic MCP Server Usage with Mastra
 */
export async function basicMCPUsage() {
  console.log('=== Example 1: Basic MCP Server Usage ===\n');

  // Use the default context server in Mastra
  const mastra = new Mastra({
    // MCP servers are added to the mcps property
    mcps: {
      context: corticaiContextServer, // Default server with memory storage
    },
  });

  // The context tools are now available to agents through MCP
  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const agent = new Agent({
    name: 'ContextAgent',
    instructions: 'You help manage and query context information.',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    // Reference the MCP server to give the agent access to its tools
    mcps: ['context'],
  });

  // The agent can now use all context tools
  const result = await agent.generate('Store this decision: We will use TypeScript for the project.');
  console.log('Agent result:', result);
}

/**
 * Example 2: Production MCP Server with DuckDB
 */
export async function productionMCPUsage() {
  console.log('=== Example 2: Production MCP Server ===\n');

  // Create a production server with DuckDB storage
  const productionServer = createProductionServer('./production-context.db');

  const mastra = new Mastra({
    mcps: {
      prodContext: productionServer,
    },
  });

  console.log('Production MCP server configured with DuckDB storage');
}

/**
 * Example 3: Custom MCP Server Configuration
 */
export async function customMCPServer() {
  console.log('=== Example 3: Custom MCP Server ===\n');

  // Create a custom server with specific tools and storage
  const customServer = createCorticaiMCPServer({
    tools: ['storeContext', 'queryContext', 'searchContext'], // Only specific tools
    includeAgents: true, // Include agents as tools
    includeObserver: true, // Include observer agent
    storage: {
      type: 'json',
      json: {
        filePath: './custom-context.json',
        pretty: true,
      },
    },
  });

  const mastra = new Mastra({
    mcps: {
      custom: customServer,
    },
  });

  console.log('Custom MCP server configured with JSON storage');
}

/**
 * Example 4: Multiple MCP Servers
 */
export async function multipleMCPServers() {
  console.log('=== Example 4: Multiple MCP Servers ===\n');

  const mastra = new Mastra({
    mcps: {
      // Different servers for different purposes
      minimal: minimalContextServer, // Minimal tools only
      full: corticaiContextServer, // Full featured with agents
      production: createProductionServer('./prod.db'), // Production with DuckDB
    },
  });

  // Create agents that use different servers
  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const minimalAgent = new Agent({
    name: 'MinimalAgent',
    instructions: 'Basic context operations only',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    mcps: ['minimal'], // Uses minimal server
  });

  const fullAgent = new Agent({
    name: 'FullAgent',
    instructions: 'Full context management capabilities',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    mcps: ['full'], // Uses full server
  });

  console.log('Multiple MCP servers configured');
}

/**
 * Example 5: Hybrid - Direct Usage + MCP
 */
export async function hybridUsage() {
  console.log('=== Example 5: Hybrid Usage ===\n');

  // Direct context management for local operations
  const localContext = setupContextManagement({
    storageType: 'memory',
  });

  // MCP server for agent access
  const mcpServer = createCorticaiMCPServer({
    storage: { type: 'memory' }, // Same storage type for consistency
  });

  const mastra = new Mastra({
    mcps: {
      context: mcpServer,
    },
  });

  // Direct usage
  await localContext.store({
    type: 'decision',
    content: 'Use direct access for performance-critical operations',
  });

  // Agent usage via MCP
  const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const agent = new Agent({
    name: 'HybridAgent',
    instructions: 'Query context via MCP',
    model: openRouter.chat('anthropic/claude-3.5-haiku'),
    mcps: ['context'],
  });

  const agentResult = await agent.generate('What decisions have been made?');
  console.log('Agent found via MCP:', agentResult);
}

/**
 * Example 6: Running Standalone stdio Server
 *
 * This shows how to configure the standalone server for external tools
 * like Cursor, Windsurf, or Claude Desktop
 */
export function standaloneServerInfo() {
  console.log('=== Example 6: Standalone stdio Server ===\n');

  console.log(`
To run the CorticAI Context MCP server as a standalone stdio server:

1. Build the project:
   npm run build

2. Run the server:
   node dist/context/mcp/stdio.js

Or with environment variables:
   CONTEXT_STORAGE=duckdb CONTEXT_DB=./my-context.db node dist/context/mcp/stdio.js

3. Configure in your MCP client (e.g., Cursor):
   {
     "mcpServers": {
       "corticai-context": {
         "command": "node",
         "args": ["/path/to/corticai/dist/context/mcp/stdio.js"],
         "env": {
           "CONTEXT_STORAGE": "duckdb",
           "CONTEXT_DB": "./context.db"
         }
       }
     }
   }
  `);
}

/**
 * Main execution
 */
async function main() {
  const example = process.argv[2] || 'basic';

  switch (example) {
    case 'basic':
      await basicMCPUsage();
      break;
    case 'production':
      await productionMCPUsage();
      break;
    case 'custom':
      await customMCPServer();
      break;
    case 'multiple':
      await multipleMCPServers();
      break;
    case 'hybrid':
      await hybridUsage();
      break;
    case 'standalone':
      standaloneServerInfo();
      break;
    default:
      console.log(`
CorticAI MCP Usage Examples

Usage: tsx mcp-usage.ts [example]

Examples:
  basic       - Basic MCP server usage with Mastra
  production  - Production server with DuckDB
  custom      - Custom server configuration
  multiple    - Multiple MCP servers
  hybrid      - Hybrid direct + MCP usage
  standalone  - Standalone stdio server info

Environment:
  OPENROUTER_API_KEY - Required for agent examples
      `);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;