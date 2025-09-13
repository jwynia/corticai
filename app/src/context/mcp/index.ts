/**
 * MCP Integration for CorticAI Context Management
 *
 * Provides both MCP server (for serving) and MCP client (for consuming)
 * configurations for the context management system.
 */

export {
  createContextMCPServer,
  contextMCPServer,
  runContextMCPServer,
  type ContextMCPServerConfig
} from './server.js';

export {
  createContextMCPClient,
  contextMCPClient,
  type ContextMCPClientConfig
} from './client.js';