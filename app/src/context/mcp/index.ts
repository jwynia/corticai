/**
 * MCP Integration for CorticAI Context Management
 *
 * Provides MCP server instances for use with Mastra and
 * other MCP-compatible systems.
 *
 * Note: The default server exports (corticaiContextServer, minimalContextServer)
 * are now lazy-initialized via Proxy to avoid side effects on import.
 * For explicit control, use the factory functions instead:
 * - createCorticaiMCPServer() - create a custom server
 * - getCorticaiContextServer() - get the default lazy server
 * - getMinimalContextServer() - get the minimal lazy server
 */

export {
  createCorticaiMCPServer,
  corticaiContextServer,
  getCorticaiContextServer,
  createProductionServer,
  minimalContextServer,
  getMinimalContextServer,
  type CorticaiMCPServerConfig
} from './server.js';