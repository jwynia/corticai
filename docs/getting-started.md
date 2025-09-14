# Getting Started with CorticAI

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- TypeScript 5.x

### Install from npm
```bash
npm install corticai
```

### Install from source
```bash
git clone https://github.com/jwynia/corticai.git
cd corticai/app
npm install
npm run build
```

## Quick Start

### Basic Setup

The simplest way to get started is using the quick setup function:

```typescript
import { setupContextManagement } from 'corticai';

// Create a context management system with DuckDB storage
const context = setupContextManagement({
  storageType: 'duckdb',
  duckdb: {
    database: './my-context.db'
  }
});

// Store some context
await context.store({
  type: 'decision',
  content: 'We decided to use TypeScript for type safety',
  metadata: {
    project: 'my-app',
    author: 'team',
    tags: ['architecture', 'typescript']
  }
});

// Query using natural language
const results = await context.query('What decisions have been made about TypeScript?');
console.log(results);
```

### Storage Options

CorticAI supports three storage backends:

#### Memory Storage (Development)
```typescript
const context = setupContextManagement({
  storageType: 'memory'
});
```

#### JSON Storage (Simple Persistence)
```typescript
const context = setupContextManagement({
  storageType: 'json',
  json: {
    filePath: './context-store.json',
    pretty: true,
    autoSave: true
  }
});
```

#### DuckDB Storage (Production)
```typescript
const context = setupContextManagement({
  storageType: 'duckdb',
  duckdb: {
    database: './context.db',
    tableName: 'context_entries'
  }
});
```

## Core Concepts

### Context Types

CorticAI recognizes several context types:

- **decision**: Architectural and design decisions
- **code**: Code implementations and snippets
- **discussion**: Conversations and threads
- **documentation**: Explanations and guides
- **todo**: Tasks and action items
- **pattern**: Reusable patterns and practices
- **relationship**: Entity connections

### Storing Context

```typescript
// Store a code implementation
await context.store({
  type: 'code',
  content: `
    export function calculateTotal(items: Item[]): number {
      return items.reduce((sum, item) => sum + item.price, 0);
    }
  `,
  metadata: {
    language: 'typescript',
    file: 'src/utils/calculations.ts',
    tags: ['utility', 'calculation']
  }
});

// Store a decision
await context.store({
  type: 'decision',
  content: 'Use DuckDB for analytics queries due to superior performance',
  metadata: {
    rationale: 'Benchmarks showed 10x improvement over alternatives',
    decidedBy: 'tech-team',
    date: '2024-01-15'
  }
});
```

### Querying Context

#### Natural Language Queries
```typescript
// Ask questions in natural language
const results = await context.query('What utility functions do we have?');
const decisions = await context.query('Why did we choose DuckDB?');
const todos = await context.query('What tasks are pending?');
```

#### Structured Queries
```typescript
import { QueryBuilder } from 'corticai';

// Build structured queries for precise filtering
const query = QueryBuilder.create()
  .whereEqual('type', 'code')
  .whereContains('content', 'calculate')
  .orderByDesc('timestamp')
  .limit(10)
  .build();

const results = await context.storage.query(query);
```

### Observing Conversations

CorticAI can passively observe conversations and extract context:

```typescript
// Set up observation
await context.observe({
  role: 'user',
  content: 'We should add error handling to the payment system'
});

await context.observe({
  role: 'assistant',
  content: 'I\'ll add try-catch blocks and proper error logging'
});

// The observer automatically extracts TODOs, decisions, and code
```

## Advanced Usage

### Direct Agent Usage

For more control, use the agents directly:

```typescript
import { ContextManagerAgent, QueryAssistantAgent } from 'corticai';

// Create agents with custom configuration
const manager = new ContextManagerAgent({
  storage: {
    storageType: 'duckdb',
    duckdb: { database: './context.db' }
  },
  deduplication: {
    enabled: true,
    threshold: 0.85
  }
});

const assistant = new QueryAssistantAgent({
  storage: {
    storageType: 'duckdb',
    duckdb: { database: './context.db' }
  }
});

// Use intelligent storage features
const result = await manager.storeWithIntelligence({
  type: 'pattern',
  content: 'Use dependency injection for testability'
});

// Get summaries and insights
const summary = await assistant.getSummary('design-patterns');
const insights = await manager.getInsights();
```

### Attribute Indexing

Create fast lookups using the AttributeIndex:

```typescript
import { AttributeIndex } from 'corticai';

const index = new AttributeIndex();

// Index entities
index.addAttribute('file1', 'language', 'typescript');
index.addAttribute('file1', 'type', 'component');
index.addAttribute('file2', 'language', 'javascript');
index.addAttribute('file2', 'type', 'utility');

// Query by attributes
const tsFiles = index.findByAttribute('language', 'typescript');
const components = index.findByAttributes([
  { attribute: 'type', value: 'component' },
  { attribute: 'language', value: 'typescript' }
], 'AND');
```

### Mastra Integration

Use CorticAI within Mastra workflows:

```typescript
import { Mastra } from '@mastra/core';
import { contextTools, contextAgents } from 'corticai';

const mastra = new Mastra({
  tools: {
    ...contextTools
  },
  agents: {
    contextManager: contextAgents.ContextManager(),
    queryAssistant: contextAgents.QueryAssistant()
  },
  workflows: {
    processDocumentation: async (context) => {
      // Store documentation
      await context.tools.storeContext({
        type: 'documentation',
        content: context.input.content
      });

      // Query related content
      const related = await context.agents.queryAssistant.query(
        `Find documentation related to ${context.input.topic}`
      );

      return { stored: true, related };
    }
  }
});
```

## Next Steps

- Explore the [API Reference](./api-reference.md) for detailed documentation
- Learn about [Storage Systems](./storage-system.md) for persistence options
- Understand [Query Patterns](./query-system.md) for advanced queries
- Set up [MCP Server](./mcp-server.md) for external integrations
- Review [Testing Guide](./testing.md) for quality assurance

## Example Applications

Check out these example use cases in the `/examples` directory:

- `context-usage.ts` - Complete context management examples
- `attribute-index-integration.ts` - Index integration patterns
- `mcp-usage.ts` - MCP server setup and usage

## Support

- [GitHub Issues](https://github.com/jwynia/corticai/issues)
- [Documentation](https://jwynia.github.io/corticai/)
- [Discord Community](#) (Coming soon)