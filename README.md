# CorticAI

**Living memory for intelligent development**

CorticAI is a production-ready context engine that gives your projects persistent, intelligent memory. Like a digital cortex, it maintains context across sessions, prevents knowledge loss, and enables AI agents and developers to understand code and documents from multiple perspectives. Built with TypeScript and the Mastra.ai framework, CorticAI transforms isolated files into a living knowledge graph that learns and evolves with your project.

## The Problem

Every project suffers from context fragmentation:
- AI agents recreate the same files repeatedly, having no memory of previous work
- Deleted branches take valuable learning with them  
- Knowledge exists in silos across code, docs, issues, and human memory
- File systems force single-hierarchy organization when you need multiple views
- Context degrades over time as documentation goes stale and patterns are forgotten

## The Solution

CorticAI acts as a persistent cortex layer for your projects, providing:

**Intelligent Memory** - Maintains context across all sessions with automatic deduplication and validation, preventing amnesia loops where agents recreate existing work

**Multi-Perspective Access** - Natural language queries and structured search enable viewing the same content through different lenses with relevant context emphasized

**Organic Evolution** - Learns patterns from usage, discovers relationships automatically, and provides maintenance recommendations

**Universal Connections** - Creates rich relationships between all project elements through inverted indexing and entity extraction

**High Performance** - Sub-100ms query times on datasets with 10,000+ entries, with support for complex boolean queries and aggregations

**Flexible Storage** - Choose from memory, JSON, or DuckDB storage backends based on your needs

## How It Works

CorticAI implements a layered architecture with specialized components:

1. **Storage Layer** - Pluggable adapters for memory, JSON, or DuckDB persistence
2. **Query System** - Type-safe query builder with SQL generation for complex queries
3. **Index System** - Inverted index for O(1) attribute-based lookups
4. **Intelligence Layer** - Context management agents with deduplication and enrichment
5. **Integration Layer** - Mastra tools and MCP server for external access

The system automatically extracts entities from content, detects relationships, and maintains indexes for fast retrieval while providing natural language query capabilities.

## Key Features

✅ **Intelligent Storage** - Automatic deduplication with 80% similarity threshold, type inference, and relationship discovery

✅ **Natural Language Queries** - Ask questions in plain English and get structured results from your context store

✅ **High Performance** - Query 10,000+ entries in under 100ms with optimized indexing and caching

✅ **Type-Safe APIs** - Full TypeScript support with compile-time validation and comprehensive error handling

✅ **Passive Observation** - Automatically extract context from conversations, code, and documentation

✅ **Flexible Integration** - Use as a library, Mastra tool, or MCP server with Cursor and Claude Desktop

## Technology Stack

- **TypeScript 5.x** - Full type safety and modern JavaScript features
- **Mastra.ai 0.16.3** - Powerful AI agent framework for intelligent operations
- **DuckDB** - High-performance columnar database for analytics and persistence
- **Vitest** - Fast unit testing with 759+ tests and 100% pass rate
- **TypeDoc** - Comprehensive API documentation generation

## Use Cases

- **AI-Assisted Development** - Give AI agents memory across sessions
- **Large Codebases** - Navigate complex projects through conceptual relationships
- **Team Knowledge Management** - Preserve institutional knowledge as team members change
- **Multi-Domain Projects** - Connect code, documentation, contracts, and communications
- **Learning & Analysis** - Discover patterns and insights across project history

## Philosophy

CorticAI is built on the principle that **context is not metadata - it's memory**. Just as the human cortex maintains rich, interconnected memories that inform understanding, CorticAI will create a living knowledge graph that makes your project's implicit knowledge explicit and accessible.

## Status

**🚀 Production Ready**

CorticAI is fully implemented with:
- ✅ 759/759 tests passing (100% pass rate)
- ✅ Core storage, query, and index systems complete
- ✅ Context management agents with intelligent features
- ✅ Mastra integration and MCP server support
- ✅ Comprehensive documentation and examples
- ✅ Performance benchmarking suite

## Quick Start

```typescript
import { setupContextManagement } from 'corticai';

// Initialize with DuckDB storage
const context = setupContextManagement({
  storageType: 'duckdb',
  duckdb: { database: './context.db' }
});

// Store context with automatic deduplication
await context.store({
  type: 'decision',
  content: 'Use TypeScript for type safety',
  metadata: { project: 'my-app', tags: ['architecture'] }
});

// Query using natural language
const results = await context.query('What decisions were made about TypeScript?');
console.log(results);
```

## Documentation

Comprehensive documentation is available in the `/docs` directory:
- [Getting Started](./docs/getting-started.md) - Installation and quick start guide
- [Architecture](./docs/architecture.md) - System design and components
- [Storage System](./docs/storage-system.md) - Storage adapters and persistence
- [API Reference](https://jwynia.github.io/corticai/) - Complete API documentation

## License

MIT

---

*Named after the cortex - the part of the brain responsible for memory, awareness, and thought - CorticAI brings these same capabilities to your development workflow.*
