# Context Management System

## Overview

The Context Management System is the intelligence layer of CorticAI, providing sophisticated storage, retrieval, and analysis of contextual information. Built on the Mastra framework, it offers multiple agents that work together to maintain your project's memory.

## Architecture

```
┌────────────────────────────────┐
│     Context Management API      │
├────────────────────────────────┤
│          Agents Layer           │
│  ┌──────────┬─────────┬──────┐ │
│  │ Manager  │ Query   │Observer│
│  │  Agent   │Assistant│ Agent │ │
│  └──────────┴─────────┴──────┘ │
├────────────────────────────────┤
│          Tools Layer            │
│  (Store, Query, Analyze Tools)  │
├────────────────────────────────┤
│        Storage Backend          │
└────────────────────────────────┘
```

## Quick Setup

The easiest way to get started:

```typescript
import { setupContextManagement } from 'corticai';

const context = setupContextManagement({
  storageType: 'duckdb',
  duckdb: {
    database: './context.db',
    tableName: 'context_entries'
  }
});
```

## Context Agents

### ContextManagerAgent

The ContextManagerAgent provides intelligent storage with automatic deduplication, validation, and enrichment.

#### Key Features
- Duplicate detection with 80% similarity threshold
- Automatic context type inference
- Relationship discovery between entries
- Quality assessment and maintenance

#### Usage
```typescript
import { ContextManagerAgent } from 'corticai';

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

// Store with intelligence
const result = await manager.storeWithIntelligence({
  type: 'decision',
  content: 'Use microservices architecture for scalability',
  metadata: {
    project: 'backend-refactor',
    decidedBy: 'architecture-team',
    date: '2024-01-15'
  }
});

console.log(result);
// {
//   stored: true,
//   id: 'ctx_abc123',
//   duplicate: false,
//   similar: ['ctx_def456'],
//   relationships: ['relates-to:ctx_xyz789']
// }
```

#### Maintenance Operations
```typescript
// Perform maintenance
const maintenanceResult = await manager.performMaintenance();
console.log(maintenanceResult);
// {
//   duplicatesRemoved: 3,
//   relationshipsAdded: 7,
//   qualityIssues: ['Missing metadata: 2 entries'],
//   recommendations: ['Consider adding tags to improve searchability']
// }

// Get insights
const insights = await manager.getInsights();
console.log(insights);
// {
//   totalEntries: 150,
//   typeDistribution: { decision: 20, code: 80, discussion: 50 },
//   averageConfidence: 0.87,
//   topTags: ['architecture', 'refactoring', 'performance'],
//   growthRate: '15 entries/day'
// }
```

### QueryAssistantAgent

The QueryAssistantAgent provides natural language querying and exploration capabilities.

#### Query Strategies
1. **Search**: Full-text search across content
2. **Filter**: Structured filtering by type/metadata
3. **Relationship**: Traverse entity connections
4. **Analysis**: Pattern and trend analysis

#### Usage
```typescript
import { QueryAssistantAgent } from 'corticai';

const assistant = new QueryAssistantAgent({
  storage: {
    storageType: 'duckdb',
    duckdb: { database: './context.db' }
  }
});

// Natural language query
const results = await assistant.query('What decisions were made about authentication?');
console.log(results);
// {
//   strategy: 'search',
//   results: [...],
//   summary: 'Found 5 decisions related to authentication...'
// }

// Get topic summary
const summary = await assistant.getSummary('authentication');
console.log(summary);
// {
//   topic: 'authentication',
//   entryCount: 12,
//   summary: 'Authentication implementation uses OAuth2...',
//   keyPoints: [...],
//   relatedTopics: ['security', 'user-management']
// }

// Interactive exploration
const exploration = await assistant.explore('authentication');
console.log(exploration);
// {
//   current: { id: 'ctx_123', type: 'decision', ... },
//   related: [...],
//   navigation: {
//     next: ['security-decisions', 'oauth-implementation'],
//     previous: ['system-architecture']
//   }
// }
```

### ContextObserverAgent

The ContextObserverAgent passively observes conversations and automatically extracts valuable context.

#### Extraction Patterns
- **Decisions**: Question → Answer patterns
- **Code**: Code blocks and implementations
- **TODOs**: Action items and tasks
- **Discussions**: Topic threads and debates

#### Usage
```typescript
import { ContextObserverAgent } from 'corticai';

const observer = new ContextObserverAgent({
  storage: {
    storageType: 'duckdb',
    duckdb: { database: './context.db' }
  },
  filters: {
    keywords: ['bug', 'fix', 'todo', 'decision'],
    patterns: ['TODO:', 'FIXME:', 'DECISION:'],
    confidence: 0.7,
    minLength: 50
  }
});

// Observe single message
await observer.observe({
  role: 'user',
  content: 'We need to fix the authentication bug in the login flow'
});

// Observe conversation
const conversation = [
  { role: 'user', content: 'Should we use Redis for caching?' },
  { role: 'assistant', content: 'Yes, Redis would provide better performance...' }
];

const result = await observer.observeConversation(conversation);
console.log(result);
// {
//   extracted: 2,
//   entries: [
//     { type: 'todo', content: 'Fix authentication bug...' },
//     { type: 'decision', content: 'Use Redis for caching...' }
//   ]
// }

// Update filters dynamically
observer.updateFilters({
  keywords: ['performance', 'optimization'],
  confidence: 0.8
});
```

## Context Types

### Supported Types
```typescript
type ContextType =
  | 'decision'      // Architectural and design decisions
  | 'code'          // Code implementations
  | 'discussion'    // Conversations and threads
  | 'documentation' // Docs and explanations
  | 'todo'          // Tasks and action items
  | 'pattern'       // Reusable patterns
  | 'relationship'; // Entity connections
```

### Type-Specific Metadata

#### Decision Context
```typescript
{
  type: 'decision',
  content: 'Use event-driven architecture',
  metadata: {
    rationale: 'Better scalability and decoupling',
    alternatives: ['REST APIs', 'GraphQL'],
    decidedBy: 'architecture-team',
    impact: 'high',
    reversible: false
  }
}
```

#### Code Context
```typescript
{
  type: 'code',
  content: 'export function authenticate()...',
  metadata: {
    language: 'typescript',
    file: 'src/auth/authenticate.ts',
    functions: ['authenticate', 'validateToken'],
    dependencies: ['jsonwebtoken', 'bcrypt']
  }
}
```

#### TODO Context
```typescript
{
  type: 'todo',
  content: 'Implement rate limiting',
  metadata: {
    priority: 'high',
    assignee: 'backend-team',
    deadline: '2024-02-01',
    dependencies: ['authentication', 'api-gateway']
  }
}
```

## Context Tools

The system provides Mastra-compatible tools for integration:

### Storage Tools
```typescript
import { contextTools } from 'corticai';

// Store context
await contextTools.storeContext.execute({
  data: { type: 'decision', content: '...' },
  metadata: { project: 'my-app' }
});

// Batch store
await contextTools.batchStoreContext.execute({
  entries: [
    { data: {...}, metadata: {...} },
    { data: {...}, metadata: {...} }
  ]
});

// Delete context
await contextTools.deleteContext.execute({
  id: 'ctx_123'
});
```

### Query Tools
```typescript
// Query context
const results = await contextTools.queryContext.execute({
  query: { conditions: [...], limit: 10 }
});

// Search context
const searchResults = await contextTools.searchContext.execute({
  query: 'authentication',
  type: 'decision'
});

// Find related
const related = await contextTools.findRelatedContext.execute({
  id: 'ctx_123',
  limit: 5
});
```

### Analysis Tools
```typescript
// Analyze patterns
const patterns = await contextTools.analyzeContextPatterns.execute({
  timeRange: { start: '2024-01-01', end: '2024-02-01' }
});

// Analyze quality
const quality = await contextTools.analyzeContextQuality.execute({});

// Analyze relationships
const relationships = await contextTools.analyzeContextRelationships.execute({
  depth: 2
});
```

## Integration Patterns

### With Mastra Workflows
```typescript
import { Mastra } from '@mastra/core';
import { contextTools, contextAgents } from 'corticai';

const mastra = new Mastra({
  tools: contextTools,
  agents: {
    contextManager: contextAgents.ContextManager(),
    queryAssistant: contextAgents.QueryAssistant()
  },
  workflows: {
    documentCode: async (ctx) => {
      // Extract code context
      const code = await ctx.tools.storeContext({
        data: {
          type: 'code',
          content: ctx.input.code
        }
      });

      // Find related documentation
      const docs = await ctx.agents.queryAssistant.query(
        `Find documentation for ${ctx.input.function}`
      );

      return { stored: code, related: docs };
    }
  }
});
```

### With MCP Server
```typescript
import { createMCPServer } from 'corticai/mcp';

// Create MCP server
const server = createMCPServer({
  storage: {
    storageType: 'duckdb',
    duckdb: { database: './context.db' }
  }
});

// Start server
server.start();

// Now accessible from Cursor, Claude Desktop, etc.
```

### Observer Integration
```typescript
// Integrate with chat applications
async function handleChatMessage(message: ChatMessage) {
  // Process message normally
  await processMessage(message);

  // Observe for context extraction
  await observer.observe({
    role: message.role,
    content: message.content,
    metadata: {
      channel: message.channel,
      user: message.userId
    }
  });
}

// Integrate with code review
async function handleCodeReview(review: CodeReview) {
  await observer.observeConversation(
    review.comments.map(c => ({
      role: c.author,
      content: c.text,
      metadata: {
        file: c.file,
        line: c.line
      }
    }))
  );
}
```

## Configuration

### Storage Configuration
```typescript
interface ContextConfig {
  storage: {
    storageType: 'memory' | 'json' | 'duckdb';
    memory?: {};
    json?: {
      filePath: string;
      pretty?: boolean;
    };
    duckdb?: {
      database: string;
      tableName?: string;
    };
  };
}
```

### Agent Configuration
```typescript
interface AgentConfig {
  deduplication?: {
    enabled: boolean;
    threshold: number; // 0-1 similarity threshold
  };
  maintenance?: {
    autoRun: boolean;
    interval: number; // milliseconds
  };
  observer?: {
    filters: ObserverFilters;
    batchSize: number;
  };
}
```

## Best Practices

### Context Quality
1. **Include Rich Metadata**: More metadata enables better queries
2. **Use Consistent Types**: Stick to predefined context types
3. **Add Relationships**: Link related context entries
4. **Regular Maintenance**: Run maintenance periodically

### Query Optimization
1. **Use Specific Queries**: More specific = faster results
2. **Leverage Indexes**: Attributes are indexed for speed
3. **Paginate Results**: Use limit/offset for large datasets
4. **Cache Frequently**: Cache common query results

### Observer Tuning
1. **Adjust Confidence**: Higher = fewer false positives
2. **Update Keywords**: Customize for your domain
3. **Filter Noise**: Set minimum content length
4. **Batch Processing**: Process conversations in batches

## Troubleshooting

### Common Issues

#### Duplicate Entries
```typescript
// Increase deduplication threshold
const manager = new ContextManagerAgent({
  deduplication: {
    enabled: true,
    threshold: 0.95 // More strict
  }
});
```

#### Slow Queries
```typescript
// Use more specific queries
const results = await assistant.query(
  'authentication decisions in January 2024' // More specific
);

// Or use structured queries
const query = QueryBuilder.create()
  .whereEqual('type', 'decision')
  .whereContains('content', 'authentication')
  .whereGreaterThan('timestamp', '2024-01-01')
  .build();
```

#### Missing Context
```typescript
// Lower observer confidence
observer.updateFilters({
  confidence: 0.5, // Capture more
  minLength: 20    // Shorter content
});
```

## Performance Metrics

### Storage Performance
- Store single entry: <50ms
- Batch store 100 entries: <500ms
- Deduplication check: <10ms

### Query Performance
- Simple query: <10ms
- Natural language query: <100ms
- Complex aggregation: <500ms

### Observer Performance
- Single message: <20ms
- Conversation (10 messages): <100ms
- Extraction accuracy: >85%