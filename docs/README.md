# CorticAI Documentation

Welcome to the CorticAI documentation. CorticAI is a comprehensive context engine that provides persistent, intelligent memory for development projects through a sophisticated multi-layer architecture.

## What is CorticAI?

CorticAI is a TypeScript-based context management system built on the Mastra.ai framework. It acts as a "digital cortex" for your projects, maintaining context across sessions, preventing knowledge loss, and enabling AI agents and developers to understand code and documents from multiple perspectives.

## Documentation Structure

### Core Documentation
- [Architecture Overview](./architecture.md) - System design and component relationships
- [Getting Started](./getting-started.md) - Installation and quick start guide
- [API Reference](./api-reference.md) - Complete API documentation

### Component Guides
- [Storage System](./storage-system.md) - Storage adapters and persistence
- [Query System](./query-system.md) - Query builder and execution
- [Context Management](./context-management.md) - Context storage and retrieval
- [Adapters](./adapters.md) - Domain and storage adapter patterns
- [Indexes](./indexes.md) - Attribute-based indexing system

### Integration Guides
- [Mastra Integration](./mastra-integration.md) - Using CorticAI with Mastra agents
- [MCP Server](./mcp-server.md) - Model Context Protocol integration

### Development
- [Testing Guide](./testing.md) - Running and writing tests
- [Benchmarking](./benchmarking.md) - Performance measurement
- [Contributing](./contributing.md) - Development guidelines

## Quick Links

- **Source Code**: [GitHub Repository](https://github.com/jwynia/corticai)
- **API Docs**: [TypeDoc Reference](https://jwynia.github.io/corticai/)
- **Issues**: [Issue Tracker](https://github.com/jwynia/corticai/issues)

## Key Features

- **Intelligent Memory**: Automatic deduplication, validation, and enrichment of context
- **Multi-Storage Support**: Memory, JSON, and DuckDB storage adapters
- **Natural Language Queries**: Query stored context using natural language
- **Type-Safe Query Builder**: Fluent API with full TypeScript support
- **High Performance**: Optimized for large datasets with sub-100ms query times
- **Extensible Architecture**: Plugin-based design for custom adapters

## Project Status

CorticAI is production-ready with:
- ✅ 759/759 tests passing (100% pass rate)
- ✅ Core components implemented and tested
- ✅ Mastra framework 0.16.3 integration
- ✅ Comprehensive API documentation
- ✅ Performance benchmarking suite

## License

MIT License - See [LICENSE](../LICENSE) for details.