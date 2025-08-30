# Architecture Overview - Initial Development Phase

## System Architecture

The CorticAI context network system implements a three-tier memory architecture inspired by cognitive science, combined with modern graph database technology and advanced parsing capabilities.

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Input Layer                              │
├─────────────────────────────────────────────────────────────┤
│  File System  │  TypeScript Files  │  File Watcher          │
└───────┬───────────────────┬────────────────┬────────────────┘
        │                   │                │
        v                   v                v
┌─────────────────────────────────────────────────────────────┐
│                    Parsing Layer                             │
├─────────────────────────────────────────────────────────────┤
│     tree-sitter    │    AST Builder    │   Symbol Table     │
└───────────┬────────────────┬───────────────┬────────────────┘
            │                │               │
            v                v               v
┌─────────────────────────────────────────────────────────────┐
│                   Processing Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Dependency Analyzer │ Pattern Extractor │ Graph Builder     │
└───────────┬─────────────────┬──────────────┬────────────────┘
            │                 │              │
            v                 v              v
┌─────────────────────────────────────────────────────────────┐
│                    Memory System                             │
├─────────────────────────────────────────────────────────────┤
│   Hot Cache      │    Warm Storage    │    Cold Archive     │
│   (In-Memory)    │    (PostgreSQL)    │    (KuzuDB Graph)   │
└───────────┬─────────────────┬──────────────┬────────────────┘
            │                 │              │
            v                 v              v
┌─────────────────────────────────────────────────────────────┐
│                    Query Layer                               │
├─────────────────────────────────────────────────────────────┤
│  Query Planner   │   Query Executor   │   Result Cache      │
└───────────┬─────────────────┬──────────────┬────────────────┘
            │                 │              │
            v                 v              v
┌─────────────────────────────────────────────────────────────┐
│                   Interface Layer                            │
├─────────────────────────────────────────────────────────────┤
│      CLI         │   Programmatic API  │    JSON Output     │
└─────────────────────────────────────────────────────────────┘
```

## Component Interactions

### Data Flow

1. **Input → Parsing**
   - Files are discovered via file system scanning
   - Each file is parsed using tree-sitter
   - AST is generated with full fidelity

2. **Parsing → Processing**
   - AST nodes are analyzed for symbols
   - Dependencies are extracted
   - Relationships are identified

3. **Processing → Memory**
   - Hot data goes to cache
   - Recent data to warm storage
   - Consolidated data to cold archive

4. **Memory → Query**
   - Queries check hot cache first
   - Fall through to warm storage
   - Finally check cold archive

5. **Query → Interface**
   - Results formatted for output
   - Cached for repeated queries
   - Returned to user

### Control Flow

```
User Request
    │
    ├─> Index Project
    │     ├─> Scan Files
    │     ├─> Parse Each File
    │     ├─> Extract Information
    │     └─> Store in Graph
    │
    └─> Query Information
          ├─> Parse Query
          ├─> Check Cache
          ├─> Execute Query
          └─> Return Results
```

## Key Design Decisions

### 1. Three-Tier Memory Architecture

**Decision**: Implement hot/warm/cold tiers from day one

**Rationale**:
- Mirrors cognitive memory consolidation
- Optimizes for access patterns
- Manages memory efficiently
- Supports offline learning

**Trade-offs**:
- (+) Scalable architecture
- (+) Optimal performance
- (-) Initial complexity
- (-) More moving parts

### 2. Graph Database (KuzuDB)

**Decision**: Use KuzuDB for primary storage

**Rationale**:
- 18-64x faster ingestion than Neo4j
- Embedded operation mode
- Lower resource requirements
- Good OLAP performance

**Trade-offs**:
- (+) Excellent performance
- (+) Low overhead
- (-) Less mature ecosystem
- (-) Limited tooling

### 3. tree-sitter for Parsing

**Decision**: Use tree-sitter instead of TypeScript Compiler API

**Rationale**:
- Incremental parsing support
- Error recovery
- Consistent AST format
- Multi-language potential

**Trade-offs**:
- (+) Fast parsing
- (+) Error resilient
- (-) Less semantic information
- (-) Requires native modules

## System Boundaries

### Internal Components
- Parser subsystem
- Graph storage
- Memory management
- Query engine
- CLI interface

### External Systems
- File system
- Node.js runtime
- Database engines
- User applications

### Integration Points
- File system API
- Database connections
- CLI arguments
- Programmatic API
- JSON output

## Data Architecture

### Entity Model

```
Graph Nodes:
- File (path, hash, timestamp)
- Module (name, exports)
- Class (name, extends, implements)
- Function (name, parameters, returns)
- Variable (name, type)
- Import (source, specifiers)

Graph Edges:
- CONTAINS (File -> Module/Class/Function)
- IMPORTS (Module -> Module)
- CALLS (Function -> Function)
- REFERENCES (Any -> Any)
- EXTENDS (Class -> Class)
- IMPLEMENTS (Class -> Interface)
```

### Storage Tiers

| Tier | Technology | Data Type | Retention | Access Time |
|------|------------|-----------|-----------|-------------|
| Hot | In-Memory Map | Active queries | Minutes | <1ms |
| Warm | PostgreSQL | Recent changes | Hours | <10ms |
| Cold | KuzuDB | Full graph | Permanent | <100ms |

## Security Architecture

### Principles
- No code execution
- Path validation
- Input sanitization
- Least privilege

### Boundaries
- File system access restricted
- No network access required
- Database access controlled
- User input validated

## Performance Architecture

### Optimization Strategies
- Incremental parsing
- Query result caching
- Index-based lookups
- Batch operations

### Performance Targets
- Parse: >1000 lines/second
- Index: >100 files/second
- Query: <100ms P95
- Memory: <2GB for 10K files

## Scalability Architecture

### Horizontal Scaling
- Parallel file processing
- Distributed graph partitioning (future)
- Read replicas (future)

### Vertical Scaling
- Memory tier sizing
- Cache configuration
- Database tuning
- Index optimization

## Extensibility Points

### Plugin Architecture (Future)
- Custom parsers
- Additional languages
- Query extensions
- Output formatters

### Current Extension Points
- Node type definitions
- Edge type definitions
- Query handlers
- Cache strategies

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Parser**: tree-sitter
- **Graph DB**: KuzuDB
- **Cache**: In-memory Map
- **Build**: tsx/esbuild

### Development Tools
- **Testing**: Vitest
- **Linting**: ESLint
- **Formatting**: Prettier
- **Bundling**: esbuild

## Deployment Architecture

### Development Mode
- Local file system
- Embedded database
- In-memory cache
- CLI interface

### Production Mode (Future)
- Docker container
- Server database
- Redis cache
- REST API

## Monitoring Architecture

### Metrics
- Parse performance
- Query latency
- Memory usage
- Cache hit rates

### Logging
- Structured logging
- Log levels
- Performance tracing
- Error tracking

## Architecture Principles

1. **Modularity**: Clear component boundaries
2. **Performance**: Optimize hot paths
3. **Reliability**: Graceful error handling
4. **Simplicity**: Start simple, evolve
5. **Extensibility**: Plan for growth

## Architecture Constraints

1. **Must work offline**: No cloud dependencies
2. **Single machine**: No distributed requirements yet
3. **TypeScript focus**: Other languages deferred
4. **CLI first**: GUI is future work

## Future Architecture Evolution

### Phase 2 Additions
- Language Server Protocol
- Multi-language support
- Distributed processing
- Cloud deployment

### Phase 3 Enhancements
- Machine learning integration
- Cross-domain alignment
- Real-time collaboration
- Advanced visualizations

## Conclusion

This architecture provides a solid foundation that:
- Delivers immediate value
- Supports future growth
- Maintains simplicity
- Ensures performance
- Enables extensibility

The modular design allows for iterative development while maintaining architectural integrity throughout the evolution of the system.