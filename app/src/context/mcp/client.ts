/**
 * MCP Client for CorticAI Context Management
 *
 * Allows Mastra applications to consume CorticAI context management
 * capabilities via MCP protocol over SSE/HTTP or stdio.
 *
 * @example Using with Mastra mcps
 * ```typescript
 * import { Mastra } from '@mastra/core';
 * import { contextMCPClient } from 'corticai/context/mcp';
 *
 * const mastra = new Mastra({
 *   mcps: {
 *     context: contextMCPClient
 *   }
 * });
 * ```
 *
 * @example Custom configuration
 * ```typescript
 * import { createContextMCPClient } from 'corticai/context/mcp';
 *
 * const contextClient = createContextMCPClient({
 *   transport: 'http',
 *   url: 'http://localhost:3000/mcp'
 * });
 * ```
 */

import { MCPClient } from '@mastra/mcp';

/**
 * Configuration for Context MCP Client
 */
export interface ContextMCPClientConfig {
  /** Client ID */
  id?: string;
  /** Transport type */
  transport?: 'stdio' | 'http' | 'sse';
  /** For stdio transport */
  command?: string;
  /** Arguments for stdio command */
  args?: string[];
  /** For HTTP/SSE transport */
  url?: string | URL;
  /** Environment variables for stdio */
  env?: Record<string, string>;
}

/**
 * Create a Context MCP Client
 */
export function createContextMCPClient(config: ContextMCPClientConfig = {}): MCPClient {
  const {
    id = 'corticai-context-client',
    transport = 'stdio',
    command = 'npx',
    args = ['corticai-context-mcp'],
    url,
    env,
  } = config;

  // Configure based on transport type
  if (transport === 'stdio') {
    return new MCPClient({
      id,
      servers: {
        context: {
          command,
          args,
          env: {
            ...process.env,
            ...env,
          },
        },
      },
    });
  } else if (transport === 'http' || transport === 'sse') {
    if (!url) {
      throw new Error(`URL required for ${transport} transport`);
    }

    return new MCPClient({
      id,
      servers: {
        context: {
          url: typeof url === 'string' ? new URL(url) : url,
        },
      },
    });
  } else {
    throw new Error(`Unknown transport type: ${transport}`);
  }
}

/**
 * Default Context MCP Client for stdio
 */
export const contextMCPClient = createContextMCPClient();

/**
 * Create Context MCP Client for HTTP/SSE
 * This is a convenience function for Mastra mcps configuration
 */
export function contextMCPClientHTTP(url: string): MCPClient {
  return createContextMCPClient({
    transport: 'http',
    url,
  });
}

/**
 * Create Context MCP Client for local package
 * This is a convenience function for using an installed package
 */
export function contextMCPClientLocal(packageName = 'corticai'): MCPClient {
  return createContextMCPClient({
    command: 'npx',
    args: [`${packageName}`, 'mcp-server'],
  });
}