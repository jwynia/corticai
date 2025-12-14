# CorticAI Mastra Integration Guide

This guide explains how to set up CorticAI as a tool provider in your Hono/Mastra application.

## Quick Start

The simplest way to integrate CorticAI is using the factory function:

```typescript
import { createCorticaiMastra } from '@jwynia/corticai/mastra';

const mastra = createCorticaiMastra({
  contextStorageType: 'json',
  storageConfig: {
    filePath: './context-data.json',
    pretty: true,  // Optional: format JSON for readability
  },
});
```

## What You Get

The `createCorticaiMastra()` factory provides a complete Mastra instance with:

### Pre-configured Agents

| Agent | Purpose |
|-------|---------|
| `contextManager` | Intelligent storage with deduplication, validation, and enrichment |
| `queryAssistant` | Natural language queries and result presentation |
| `contextObserver` | Passive observation and automatic context extraction |

### Available Tools (9 total)

**Storage Tools:**
- `storeContext` - Store entries with metadata and deduplication
- `batchStoreContext` - Batch storage operations
- `deleteContext` - Remove entries by ID
- `clearContext` - Remove all entries (with confirmation)

**Query Tools:**
- `queryContext` - Execute structured queries with conditions
- `findRelatedContext` - Find related entries via BFS traversal
- `searchContext` - Full-text search across entries

**Analysis Tools:**
- `analyzeContextPatterns` - Pattern and trend detection
- `analyzeContextRelationships` - Relationship mapping as graphs
- `analyzeContextQuality` - Quality and completeness assessment

## Storage Options

### JSON File Storage

```typescript
const mastra = createCorticaiMastra({
  contextStorageType: 'json',
  storageConfig: {
    filePath: './context.json',
    pretty: true,
  },
});
```

### In-Memory Storage (Development)

```typescript
const mastra = createCorticaiMastra({
  contextStorageType: 'memory',
});
```

### DuckDB Storage (Production)

```typescript
const mastra = createCorticaiMastra({
  contextStorageType: 'duckdb',
  storageConfig: {
    database: './context.db',
    tableName: 'context_entries',
  },
});
```

## Manual Configuration

For more control, configure Mastra manually:

```typescript
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { contextAgents, contextTools } from '@jwynia/corticai/mastra';

const mastra = new Mastra({
  agents: {
    contextManager: contextAgents.ContextManager({
      storageType: 'json',
      storageConfig: {
        filePath: './context.json',
        pretty: true,
      },
    }),
    queryAssistant: contextAgents.QueryAssistant({
      storageType: 'json',
      storageConfig: {
        filePath: './context.json',
      },
    }),
    contextObserver: contextAgents.ContextObserver({
      storageType: 'json',
      storageConfig: {
        filePath: './context.json',
      },
    }),
    // Add your own agents here...
  },
  tools: {
    ...contextTools,
    // Add your own tools here...
  },
  storage: new LibSQLStore({ url: ':memory:' }),
  logger: new PinoLogger({ name: 'MyApp', level: 'info' }),
});
```

## Using Individual Tools in Custom Agents

```typescript
import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { contextTools } from '@jwynia/corticai/context/tools';

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

const myAgent = new Agent({
  name: 'MyAgent',
  instructions: 'You help manage project context and answer questions.',
  model: openRouter.chat('anthropic/claude-3.5-haiku'),
  tools: {
    storeContext: contextTools.storeContext,
    queryContext: contextTools.queryContext,
    analyzeContext: contextTools.analyzeContextPatterns,
  },
});
```

## Using the Quick Setup API

For simpler use cases, use the convenience wrapper:

```typescript
import { setupContextManagement } from '@jwynia/corticai';

const context = setupContextManagement({
  storageType: 'json',
  json: {
    filePath: './context.json',
    pretty: true,
  },
});

// Store context
await context.store({
  type: 'decision',
  content: 'Use TypeScript for type safety',
}, {
  project: 'my-app',
  tags: ['architecture'],
});

// Query using natural language
const results = await context.query('What decisions were made about TypeScript?');

// Get insights
const insights = await context.getInsights();
```

## Package Exports Reference

The package provides multiple entry points:

| Import Path | Contents |
|-------------|----------|
| `@jwynia/corticai` | Main exports (setupContextManagement, etc.) |
| `@jwynia/corticai/context` | Context module |
| `@jwynia/corticai/context/tools` | Individual tools |
| `@jwynia/corticai/context/agents` | Agent classes and factories |
| `@jwynia/corticai/context/mcp` | MCP server for IDE integration |
| `@jwynia/corticai/mastra` | Mastra integration (agents, tools, factory) |
| `@jwynia/corticai/storage` | Storage adapters |
| `@jwynia/corticai/query` | Query builder and executors |

## Key Source Files

| File | Purpose |
|------|---------|
| `src/mastra/index.ts` | Mastra factory function |
| `src/context/tools/index.ts` | All tools exported |
| `src/context/agents/index.ts` | Agent factory functions |
| `examples/context-usage.ts` | Complete usage examples |

## Next Steps

- See `examples/context-usage.ts` for complete working examples
- Check `src/context/tools/*.tool.ts` for tool input/output schemas
- Review agent source files for customization options
