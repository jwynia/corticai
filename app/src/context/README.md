# CorticAI Context Management System

A comprehensive context management system built on the Mastra framework, providing intelligent storage, retrieval, and analysis of context for LLM agents and applications.

## Overview

The CorticAI Context Management System wraps the low-level database and indexing capabilities in intelligent Mastra agents that can:

- **Store context** with automatic deduplication, validation, and enrichment
- **Query context** using natural language or structured queries
- **Observe conversations** passively to extract valuable context
- **Analyze patterns** and relationships in stored context
- **Maintain quality** through automated cleanup and optimization

## Architecture

### Three Ways to Use

1. **Direct Library Usage** - Import and use agents/workflows/tools directly in your code
2. **In-Memory Tool Integration** - Use as Mastra tools within your own agents
3. **MCP Server Deployment** - Serve via Model Context Protocol for cross-system access

### Layered Architecture

```
┌─────────────────────────────────────┐
│         MCP Server (Optional)        │
├─────────────────────────────────────┤
│            Workflows                 │
│  (Ingestion, Retrieval, Maintenance) │
├─────────────────────────────────────┤
│              Agents                  │
│  (Manager, Assistant, Observer)      │
├─────────────────────────────────────┤
│              Tools                   │
│  (Store, Query, Analyze)             │
├─────────────────────────────────────┤
│       Storage & Query Layer          │
│  (DuckDB, JSON, Memory)              │
└─────────────────────────────────────┘
```

## Installation

```bash
npm install corticai
```

## Quick Start

### Simple Setup

```typescript
import { setupContextManagement } from 'corticai/context';

// Quick setup with DuckDB storage
const context = setupContextManagement({
  storageType: 'duckdb',
  duckdb: { database: './context.db' }
});

// Store context
await context.store({
  type: 'decision',
  content: 'Use TypeScript for the project',
  rationale: 'Better type safety and IDE support'
});

// Query with natural language
const results = await context.query('What decisions have been made?');
```

### Direct Agent Usage

```typescript
import { ContextManagerAgent, QueryAssistantAgent } from 'corticai/context';

// Create agents
const manager = new ContextManagerAgent({
  storageType: 'duckdb',
  storageConfig: { database: './context.db' }
});

const assistant = new QueryAssistantAgent({
  storageType: 'duckdb',
  storageConfig: { database: './context.db' }
});

// Use agents
await manager.storeWithIntelligence(data, metadata);
const summary = await assistant.getSummary('architecture');
```

### As Mastra Tools

```typescript
import { Mastra } from '@mastra/core';
import { contextTools, contextAgents } from 'corticai/context';

const mastra = new Mastra({
  tools: contextTools,
  agents: {
    contextManager: contextAgents.ContextManager(),
    queryAssistant: contextAgents.QueryAssistant()
  }
});
```

## Dual-Mode Operation

### Active Mode (Inquiry-Based)

External agents explicitly request context operations:

```typescript
// Store context
await contextTools.storeContext.execute({
  context: {
    entry: { type: 'code', content: '...' },
    deduplicate: true
  }
});

// Query context
await contextTools.queryContext.execute({
  context: {
    query: { conditions: [...] }
  }
});
```

### Passive Mode (Observational)

Observes message streams and captures context automatically:

```typescript
import { ContextObserverAgent } from 'corticai/context';

const observer = new ContextObserverAgent({
  filters: {
    keywords: ['decision', 'architecture'],
    patterns: ['TODO|FIXME'],
    confidence: 0.7
  }
});

// Observe messages
await observer.observe({
  role: 'user',
  content: 'Should we use REST or GraphQL?'
});

await observer.observe({
  role: 'assistant',
  content: 'I recommend GraphQL for its flexibility...'
});
```

## Components

### Tools

- **storeContext** - Store context entries with metadata
- **batchStoreContext** - Store multiple entries efficiently
- **queryContext** - Execute structured queries
- **searchContext** - Full-text search across entries
- **findRelatedContext** - Find related entries by relationships
- **analyzeContextPatterns** - Identify patterns and trends
- **analyzeContextRelationships** - Map relationship graphs
- **analyzeContextQuality** - Assess quality and completeness

### Agents

- **ContextManager** - Intelligent storage with deduplication and enrichment
- **QueryAssistant** - Natural language query interface
- **ContextObserver** - Passive observation and extraction

### Workflows (Coming Soon)

- **ContextIngestion** - Multi-step validation and storage
- **ContextRetrieval** - Query optimization and enrichment
- **ContextMaintenance** - Cleanup and optimization

## MCP Integration

The context management system supports full MCP (Model Context Protocol) integration for cross-system interoperability.

### As MCP Server

Deploy context management as an MCP server:

```typescript
import { createContextMCPServer, runContextMCPServer } from 'corticai/context/mcp';

// Stdio server (for local use)
const server = createContextMCPServer({
  storage: { type: 'duckdb', database: './context.db' },
  tools: ['storeContext', 'queryContext'],
  agents: ['ContextManager', 'QueryAssistant']
});
server.startStdio();

// HTTP/SSE server (for network access)
process.env.MCP_TRANSPORT = 'http';
process.env.MCP_PORT = '3100';
runContextMCPServer();
```

### As MCP Client in Mastra

Use context management from a remote or local MCP server:

```typescript
import { Mastra } from '@mastra/core';
import { contextMCPClientHTTP, contextMCPClientLocal } from 'corticai/context/mcp';

const mastra = new Mastra({
  // Use in mcps configuration for SSE/HTTP
  mcps: {
    // Remote HTTP/SSE server
    remoteContext: contextMCPClientHTTP('http://localhost:3100/mcp'),

    // Local package via stdio
    localContext: contextMCPClientLocal('corticai'),
  }
});

// Agents can now use MCP tools
const agent = new Agent({
  name: 'MyAgent',
  mcps: ['remoteContext'], // Use remote context tools
});
```

### Transport Options

- **stdio**: Local process communication (default)
- **HTTP**: RESTful HTTP endpoint at `/mcp`
- **SSE**: Server-Sent Events at `/mcp-sse` for streaming

## Value-Add Scenarios

### Development Assistant
- Auto-capture code discussions and decisions
- Link documentation to implementation
- Track technical debt and TODOs

### Knowledge Management
- Build organizational memory across projects
- Detect expertise patterns
- Surface relevant past solutions

### Multi-Agent Coordination
- Share context between specialized agents
- Maintain conversation continuity
- Enable collaborative problem-solving

### Compliance & Audit
- Track decision lineage
- Maintain change history
- Generate compliance reports

## Storage Options

### Memory Storage
Fast, in-memory storage for development and testing:
```typescript
{ storageType: 'memory' }
```

### JSON Storage
File-based storage for simple persistence:
```typescript
{
  storageType: 'json',
  json: { filePath: './context.json', pretty: true }
}
```

### DuckDB Storage
High-performance analytical database for production:
```typescript
{
  storageType: 'duckdb',
  duckdb: { database: './context.db', tableName: 'context' }
}
```

## Context Types

The system recognizes several context types:

- **decision** - Architectural and design decisions
- **code** - Code implementations and changes
- **discussion** - Conversations and threads
- **documentation** - Documentation and explanations
- **todo** - Tasks and action items
- **pattern** - Patterns and best practices
- **relationship** - Connections between entities

## Examples

See `/examples/context-usage.ts` for comprehensive examples including:

- Quick setup
- Direct agent usage
- Observational mode
- Mastra integration
- Multi-agent collaboration
- Knowledge graph building

## API Reference

### setupContextManagement(config)

Quick setup function that returns a configured context management system.

### ContextManagerAgent

Intelligent storage agent with deduplication and enrichment.

Methods:
- `storeWithIntelligence(data, metadata)` - Store with intelligence
- `performMaintenance()` - Run maintenance tasks
- `getInsights()` - Get system insights

### QueryAssistantAgent

Natural language query interface.

Methods:
- `query(question)` - Process natural language query
- `getSummary(topic)` - Get topic summary
- `explore(startPoint?)` - Interactive exploration

### ContextObserverAgent

Passive observation agent.

Methods:
- `observe(message)` - Observe single message
- `observeConversation(messages)` - Observe conversation
- `updateFilters(filters)` - Update extraction filters
- `getStatistics()` - Get observation statistics

## Contributing

See the main CorticAI contributing guidelines.

## License

ISC