# CorticAI Core Implementation

This directory contains the core CorticAI implementation - a comprehensive context management system for intelligent development.

## Directory Structure

```
app/
├── src/                    # Source code
│   ├── adapters/          # Domain adapters for entity extraction
│   ├── analyzers/         # Code analysis tools
│   ├── context/           # Context management system
│   ├── indexes/           # Attribute-based indexing
│   ├── mastra/            # Mastra framework integration
│   ├── query/             # Query system and executors
│   ├── storage/           # Storage adapters and interfaces
│   └── types/             # TypeScript type definitions
├── tests/                 # Test suites (759+ tests)
├── benchmarks/            # Performance benchmarking
├── examples/              # Usage examples
└── docs/                  # Generated API documentation
```

## Installation

### From GitHub Package Registry

To use `@jwynia/corticai` as a dependency:

1. **Configure npm for GitHub Package Registry:**
   ```bash
   npm login --registry https://npm.pkg.github.com --scope @jwynia
   # Enter your GitHub username and Personal Access Token (PAT) with read:packages scope
   ```

   Or add to your project's `.npmrc`:
   ```
   @corticai:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN
   ```

2. **Install the package:**
   ```bash
   npm install @jwynia/corticai
   ```

3. **Import and use:**
   ```typescript
   import { contextTools, contextAgents } from '@jwynia/corticai';
   import { QueryBuilder } from '@jwynia/corticai/query';
   import { StorageAdapter } from '@jwynia/corticai/storage';
   ```

### For Development

To work on CorticAI itself:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Generate documentation
npm run docs
```

See [../context-network/processes/npm-publishing.md](../context-network/processes/npm-publishing.md) for detailed publishing instructions.

## Core Components

### Storage System
- **MemoryStorageAdapter**: In-memory storage for development
- **JSONStorageAdapter**: File-based persistence with atomic writes
- **DuckDBStorageAdapter**: High-performance analytical database

### Query System
- **QueryBuilder**: Fluent API for building type-safe queries
- **QueryExecutor**: Routes queries to appropriate storage adapters
- **AggregationUtils**: Utilities for data aggregation

### Index System
- **AttributeIndex**: Inverted index for O(1) attribute lookups
- **Boolean queries**: Support for AND/OR operations

### Context Management
- **ContextManagerAgent**: Intelligent storage with deduplication
- **QueryAssistantAgent**: Natural language query interface
- **ContextObserverAgent**: Passive observation and extraction

### Domain Adapters
- **UniversalFallbackAdapter**: Extracts entities from any text file
- **Entity types**: Document, section, paragraph, list, reference

## Quick Start

```typescript
import { setupContextManagement } from './src/context';
import { QueryBuilder } from './src/query';

// Initialize context management
const context = setupContextManagement({
  storageType: 'duckdb',
  duckdb: { database: './context.db' }
});

// Store context
await context.store({
  type: 'decision',
  content: 'Use TypeScript for type safety',
  metadata: { project: 'corticai' }
});

// Query with natural language
const results = await context.query('What decisions were made?');

// Or use structured queries
const query = QueryBuilder.create()
  .whereEqual('type', 'decision')
  .orderByDesc('timestamp')
  .build();
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/storage/adapters/MemoryStorageAdapter.test.ts
```

### Benchmarking

```bash
# Run benchmarks
npm run benchmark

# Run specific benchmark suite
npm run benchmark -- --suite storage
```

### Building

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev

# Type checking
npm run typecheck
```

## Architecture

CorticAI follows a layered architecture:

1. **Storage Layer**: Provides abstraction over different storage backends
2. **Query Layer**: Enables complex queries with type safety
3. **Index Layer**: Fast attribute-based lookups
4. **Intelligence Layer**: Context management and analysis
5. **Integration Layer**: Mastra tools and MCP server

## API Documentation

Full API documentation is available in the `docs/` directory after running:

```bash
npm run docs
```

Or view online at: https://jwynia.github.io/corticai/

## Examples

See the `examples/` directory for:
- `context-usage.ts` - Context management examples
- `attribute-index-integration.ts` - Index usage patterns
- `mcp-usage.ts` - MCP server integration

## Testing

The project has comprehensive test coverage:
- **759+ tests** covering all components
- **100% pass rate**
- **Unit tests** for individual components
- **Integration tests** for system behavior
- **Performance tests** for benchmarking

## Performance

CorticAI is optimized for performance:
- Query 10,000+ entries in <100ms
- O(1) attribute lookups with inverted index
- Efficient batch operations
- Native SQL performance with DuckDB
- Memory-efficient data structures

## Contributing

See the main project [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

ISC - See [LICENSE](../LICENSE) for details.