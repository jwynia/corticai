/**
 * MCP Integration for CorticAI Context Management
 *
 * Provides MCP server instances for use with Mastra and
 * other MCP-compatible systems.
 */

export {
  createCorticaiMCPServer,
  corticaiContextServer,
  createProductionServer,
  minimalContextServer,
  type CorticaiMCPServerConfig
} from './server.js';