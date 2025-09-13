#!/usr/bin/env node
/**
 * Standalone stdio MCP server for CorticAI Context Management
 *
 * This file can be run directly to start an MCP server that communicates
 * via stdio, making it compatible with tools like Cursor, Windsurf, and
 * Claude Desktop.
 *
 * Usage:
 *   node dist/context/mcp/stdio.js
 *   npx corticai-context-mcp
 *   tsx src/context/mcp/stdio.ts
 *
 * Environment Variables:
 *   CONTEXT_DB - Path to DuckDB database (default: ./context.db)
 *   CONTEXT_STORAGE - Storage type: memory, json, duckdb (default: memory)
 *   CONTEXT_JSON_PATH - Path to JSON file if using json storage
 */

import { createCorticaiMCPServer } from './server.js';

// Parse environment variables
const storageType = (process.env.CONTEXT_STORAGE || 'memory') as 'memory' | 'json' | 'duckdb';
const databasePath = process.env.CONTEXT_DB || './context.db';
const jsonPath = process.env.CONTEXT_JSON_PATH || './context.json';

// Configure storage based on environment
let storage: any = { type: 'memory' };

if (storageType === 'duckdb') {
  storage = {
    type: 'duckdb',
    duckdb: {
      database: databasePath,
      tableName: 'context',
    },
  };
} else if (storageType === 'json') {
  storage = {
    type: 'json',
    json: {
      filePath: jsonPath,
      pretty: true,
    },
  };
}

// Create the MCP server
const server = createCorticaiMCPServer({
  includeAgents: true,
  includeObserver: true,
  storage,
});

// Start the stdio server
server.startStdio().catch((error) => {
  console.error('Error running CorticAI Context MCP server:', error);
  process.exit(1);
});

// Log startup information to stderr (stdio uses stdout for protocol)
console.error(`CorticAI Context MCP Server started
  Storage: ${storageType}
  ${storageType === 'duckdb' ? `Database: ${databasePath}` : ''}
  ${storageType === 'json' ? `JSON File: ${jsonPath}` : ''}
  Agents: Enabled
  Observer: Enabled
`);