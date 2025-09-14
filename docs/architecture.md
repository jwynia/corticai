# CorticAI Architecture

## Overview

CorticAI follows a layered architecture design that separates concerns and provides flexibility through abstraction. The system is built on the Mastra.ai framework and leverages TypeScript for type safety throughout.

## System Architecture

```
┌─────────────────────────────────────────────┐
│              Application Layer               │
│         (Agents, Tools, Workflows)           │
├─────────────────────────────────────────────┤
│            Intelligence Layer                │
│    (Context Management, Query Assistant,     │
│         Observer, Analysis Tools)            │
├─────────────────────────────────────────────┤
│             Query Interface                  │
│    (QueryBuilder, QueryExecutor, Types)      │
├─────────────────────────────────────────────┤
│           Storage Abstraction                │
│   (Storage Interface, Batch Operations)      │
├─────────────────────────────────────────────┤
│           Storage Adapters                   │
│   (Memory, JSON, DuckDB Implementations)     │
├─────────────────────────────────────────────┤
│            Domain Adapters                   │
│    (Universal Fallback, Custom Adapters)     │
├─────────────────────────────────────────────┤
│              Index Layer                     │
│      (AttributeIndex, Inverted Index)        │
└─────────────────────────────────────────────┘
```

## Core Components

### 1. Storage Layer

The storage layer provides a unified interface for data persistence with multiple backend implementations:

- **Storage Interface**: Abstract interface defining core operations (get, set, delete, query)
- **MemoryStorageAdapter**: In-memory storage for development and testing
- **JSONStorageAdapter**: File-based persistence with atomic writes
- **DuckDBStorageAdapter**: High-performance analytical database for production

#### Key Features:
- Async-first design with Promise-based APIs
- Batch operations for performance optimization
- Type-safe generics support
- Comprehensive error handling

### 2. Query System

The query system provides a fluent, type-safe API for querying data across all storage adapters:

- **QueryBuilder**: Fluent API for constructing queries
- **QueryExecutor**: Routes queries to appropriate executor
- **Specialized Executors**: Memory, JSON, and DuckDB-specific implementations

#### Query Capabilities:
- Complex filtering with multiple operators
- Sorting and pagination
- Aggregations (COUNT, SUM, AVG, MIN, MAX)
- Group by and having clauses
- Type-safe field references

### 3. Index System

The index system provides fast attribute-based lookups through inverted indexing:

- **AttributeIndex**: Main index implementation
- **Inverted Index Structure**: O(1) attribute lookups
- **Boolean Query Support**: AND/OR operations on multiple attributes

#### Performance:
- Sub-10ms queries on 10,000+ entities
- Efficient memory usage with cleanup
- Batch indexing support

### 4. Domain Adapters

Domain adapters extract structured entities from different content types:

- **UniversalFallbackAdapter**: Foundation adapter for any text file
- **Entity Extraction**: Document, section, paragraph, reference extraction
- **Relationship Building**: Automatic relationship detection

#### Entity Types:
- Document (root container)
- Section (headers, logical divisions)
- Paragraph (text blocks)
- List/List-item (structured content)
- Reference (URLs, file paths, links)

### 5. Context Management

The context management system provides intelligent storage and retrieval:

- **ContextManagerAgent**: Intelligent storage with deduplication
- **QueryAssistantAgent**: Natural language query interface
- **ContextObserverAgent**: Passive observation and extraction

#### Intelligence Features:
- Automatic duplicate detection (80% similarity threshold)
- Context type inference
- Relationship discovery
- Quality assessment and maintenance

## Design Patterns

### Strategy Pattern
Multiple storage and domain adapters implementing common interfaces allow runtime selection of implementations.

### Template Method Pattern
BaseStorageAdapter defines the algorithm structure while allowing subclasses to override specific steps.

### Builder Pattern
QueryBuilder provides a fluent API for constructing complex queries step by step.

### Factory Pattern
Storage adapter creation through configuration-driven factories.

### Observer Pattern
Context observation for automatic extraction from message streams.

## Data Flow

### Write Path
1. Application submits data through agent or tool
2. Context manager validates and enriches data
3. Duplicate detection and relationship discovery
4. Storage adapter persists data
5. Indexes updated for fast retrieval

### Read Path
1. Natural language or structured query received
2. Query parsed and optimized
3. Appropriate executor selected
4. Query executed against storage
5. Results formatted and returned

## Technology Stack

### Core Technologies
- **TypeScript 5.x**: Type safety and modern JavaScript features
- **Node.js 18+**: Runtime environment
- **Mastra.ai 0.16.3**: AI agent framework

### Storage Backends
- **DuckDB**: Columnar analytical database
- **JSON**: File-based storage with atomic writes
- **Memory**: In-process storage for development

### Testing & Quality
- **Vitest**: Test runner with 759+ tests
- **TypeDoc**: API documentation generation
- **AST-grep**: Code analysis and refactoring

## Performance Characteristics

### Query Performance
- Simple lookups: <10ms for 1K records
- Complex queries: <100ms for 10K records
- Aggregations: O(n) with optimizations

### Storage Performance
- Memory: O(1) operations
- JSON: O(1) memory + I/O on persist
- DuckDB: Native SQL performance

### Index Performance
- Attribute lookups: O(1) average case
- Boolean queries: Optimized set operations
- Batch indexing: <1s for 10K entities

## Scalability

### Horizontal Scaling
- Stateless agents allow multiple instances
- Storage adapters support concurrent access
- Query system handles parallel execution

### Vertical Scaling
- DuckDB handles millions of records
- Streaming support for large datasets
- Memory-efficient index structures

## Security Considerations

### Input Validation
- Comprehensive parameter validation
- SQL injection prevention in DuckDB adapter
- Path traversal protection in file operations

### Error Handling
- No sensitive information in error messages
- Graceful degradation on failures
- Audit logging capabilities

## Future Architecture Enhancements

### Planned Improvements
- Kuzu graph database integration
- Real-time subscriptions
- Distributed storage support
- Query optimization engine
- Plugin architecture for custom adapters

### Research Areas
- Machine learning for pattern detection
- Automatic index optimization
- Predictive caching
- Cross-domain relationship discovery