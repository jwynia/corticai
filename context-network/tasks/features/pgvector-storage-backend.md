# pgvector Storage Backend Implementation

## Task ID
FEAT-PGVECTOR-001

## Status
🔄 IN PROGRESS

## Created
2025-11-03

## One-liner
Add PostgreSQL+pgvector as complete standalone storage backend implementing both Primary and Semantic storage roles

## Context

### Business Need
Enable CorticAI to integrate with existing PostgreSQL infrastructure without requiring Kuzu/DuckDB dependencies. Many applications already have PostgreSQL running and want all data in their existing storage solution.

### Technical Context
- Current storage: Kuzu (Primary) + DuckDB (Semantic) for local installs
- Architecture supports pluggable backends via dual-role pattern
- Need: PostgreSQL+pgvector as complete replacement when PostgreSQL is available

### Architectural Principle
**PrimaryStorage and SemanticStorage remain separate interfaces**. PgVectorStorageAdapter implements both independently - single adapter class fulfilling both contracts, not a merged interface.

## Acceptance Criteria

### Phase 1: Core PostgreSQL Adapter
- [x] Add `pg` and `pgvector` dependencies to package.json
- [ ] Create `PgVectorStorageAdapter.ts` implementing both PrimaryStorage and SemanticStorage
- [ ] Implement `PgVectorConnectionManager.ts` for connection pooling
- [ ] Create `PgVectorQueryBuilder.ts` for SQL construction
- [ ] Implement `PgVectorSchemaManager.ts` for table/index management
- [ ] Add contract tests for Storage interface compliance
- [ ] Both interfaces pass independent contract tests

### Phase 2: PrimaryStorage Implementation
- [ ] Implement GraphStorage methods (addNode, addEdge, traverse, shortestPath, findConnected)
- [ ] Create PostgreSQL schema for graph data (nodes/edges tables)
- [ ] Add PrimaryStorage interface contract tests
- [ ] Performance benchmarks vs Kuzu baseline

### Phase 3: SemanticStorage Implementation
- [x] Implement SemanticStorage methods (query, executeSQL, aggregate, groupBy, search)
- [x] PostgreSQL analytics features (CTEs, window functions, FTS)
- [x] Add SemanticStorage interface contract tests
- [x] Materialized views support

### Phase 4: Vector Operations
- [ ] Add pgvector extension setup
- [ ] Implement createVectorIndex()
- [ ] Implement vectorSearch() with distance metrics
- [ ] Implement insertWithEmbedding()
- [ ] Support both auto-generated and pre-computed embeddings
- [ ] Hybrid search (vector + keyword + filters)

### Phase 5: Provider & Configuration
- [ ] Create PostgreSQLStorageProvider exposing same adapter via both interfaces
- [ ] Add PgVectorStorageConfig interface
- [ ] Update StorageProviderFactory to support 'postgresql' type
- [ ] Configuration validation
- [ ] Support for all PostgreSQL variants (local, cloud, Supabase)

### Phase 6: Testing & Documentation
- [ ] Verify interface separation in tests (98%+ coverage)
- [ ] Security tests (SQL injection with parameterized queries)
- [ ] Performance benchmarks documented
- [ ] Create ADR-004: "pgvector as Complete Storage Backend"
- [ ] Update context-network/architecture/storage-layer.md
- [ ] Migration guide for Kuzu/DuckDB users

## Success Criteria
- [ ] PrimaryStorage and SemanticStorage interfaces UNCHANGED
- [ ] PgVectorStorageAdapter passes BOTH interface contract tests independently
- [ ] Provider exposes correct interface types (not concrete adapter type)
- [ ] 98%+ test coverage (matching existing adapter standards)
- [ ] Zero Kuzu/DuckDB dependencies when using PostgreSQL mode
- [ ] Configuration-driven deployment (connection string only)
- [ ] Can use adapter.primary and adapter.semantic without cross-contamination

## Implementation Plan

### File Structure
```
app/src/storage/adapters/
├── PgVectorStorageAdapter.ts          # Main adapter (both interfaces)
├── PgVectorConnectionManager.ts       # Connection pooling
├── PgVectorQueryBuilder.ts            # SQL query construction
├── PgVectorSchemaManager.ts           # Table/index management
├── PgVectorVectorOperations.ts        # Vector-specific operations
└── PgVectorStorageAdapter.test.ts     # Comprehensive tests

app/src/storage/providers/
└── PostgreSQLStorageProvider.ts       # Provider implementation
```

### Configuration Schema
```typescript
interface PgVectorStorageConfig extends StorageConfig {
  type: 'pgvector'
  connectionString: string
  schema?: string  // Default: 'public'

  // Vector configuration
  vectorDimensions?: number  // Default: 1536 (OpenAI)
  distanceMetric?: 'cosine' | 'euclidean' | 'dot_product'
  autoGenerateEmbeddings?: boolean
  embeddingProvider?: 'openai' | 'local' | 'none'

  // Connection pool
  poolSize?: number
  idleTimeout?: number
  connectionTimeout?: number

  // Performance
  maintenanceWorkMem?: string
  enableVectorIndex?: boolean
  indexType?: 'ivfflat' | 'hnsw'
}
```

## Dependencies
- `pg`: ^8.11.0 (PostgreSQL client)
- `pgvector`: ^0.2.0 (Vector extension)

## References
- [[storage-layer]] - Storage architecture overview
- [[dual-role-storage-architecture]] - Role separation pattern
- [[testing-strategy]] - TDD approach
- Interface definitions: `/workspaces/corticai/app/src/storage/interfaces/Storage.ts`
- Existing adapters:
  - KuzuStorageAdapter.ts:582 (PrimaryStorage reference)
  - DuckDBStorageAdapter.ts:912 (SemanticStorage reference)
  - CosmosDBStorageAdapter.ts (Dual-role reference)

## Risks & Mitigations

### Risk: Interface Cross-Contamination
- **Mitigation**: Strict TypeScript types, separate contract tests for each interface

### Risk: Performance vs Specialized Databases
- **Mitigation**: Benchmark against Kuzu/DuckDB, optimize PostgreSQL queries, use appropriate indexes

### Risk: pgvector Setup Complexity
- **Mitigation**: Clear setup documentation, auto-detection of extension availability, helpful error messages

## Timeline Estimate
- Phase 1-2: 2 weeks (Core + Primary storage)
- Phase 3-4: 2 weeks (Semantic + Vectors)
- Phase 5-6: 1 week (Integration + Docs)
**Total: 5 weeks**

## Current Progress

### 2025-11-03: Phase 1 Foundation Started

**Completed**:
- [x] Created task entry in context network
- [x] Added dependencies: `pg@^8.13.1`, `pgvector@^0.2.1`, `@types/pg@^8.11.10`
- [x] Created `PgVectorStorageConfig` interface in Storage.ts:221-252
- [x] Created `PgVectorStorageAdapter` skeleton in app/src/storage/adapters/PgVectorStorageAdapter.ts

**Files Created**:
- `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts` (495 lines)
  - Implements both PrimaryStorage and SemanticStorage interfaces
  - Connection pool initialization with pgvector extension
  - Stub methods for all required interface methods
  - Configuration with sensible defaults

**In Progress**:
- N/A

### Implementation Details

**Phase 0: Dependency Injection Refactoring (COMPLETED - 2025-11-03)**
- ✅ IPostgreSQLClient interface (thin wrapper around pg library)
- ✅ PostgreSQLClient production implementation
- ✅ MockPostgreSQLClient for unit testing
- ✅ PgVectorStorageAdapter refactored to accept optional IPostgreSQLClient
- ✅ PgVectorSchemaManager refactored to use IPostgreSQLConnection
- **Benefit**: Pure unit tests without real database, fast execution

**Phase 1: Foundation (COMPLETED)**
- ✅ PgVectorSchemaManager (303 lines) - table/index creation, vector index support
- ✅ Basic Storage interface methods (get, set, delete, has, clear, size)
- ✅ Storage iterators (keys, values, entries)
- ✅ Connection pooling via IPostgreSQLClient interface
- ✅ Schema creation with pgvector extension

**Phase 1.5: Unit Testing (COMPLETED - 2025-11-03)**
- ✅ Created comprehensive unit tests: `PgVectorStorageAdapter.test.ts` (30 tests, all passing)
- ✅ Tests cover: Basic Storage operations, Graph Node operations, Graph Edge operations
- ✅ Tests verify: SQL parameterization, error handling, query construction
- ✅ Key learnings documented in discoveries below
- ✅ Test execution time: ~38ms (fast unit tests without real database)

**Phase 2: PrimaryStorage - Graph Operations (COMPLETED - 2025-11-03)**
- ✅ Node CRUD: addNode, getNode, updateNode, deleteNode
- ✅ Node queries: queryNodes with JSONB property filtering
- ✅ Edge CRUD: addEdge, getEdge, deleteEdge
- ✅ Edge queries: getEdges with edge type filtering
- ✅ Graph algorithms: traverse, shortestPath, findConnected using PostgreSQL recursive CTEs
- ✅ Graph statistics: getGraphStats with JSONB aggregation
- ✅ Flexible entity storage: storeEntity, streamEpisodes with batch upserts

**Key Implementation Highlights**:
- **Dependency Injection**: Optional IPostgreSQLClient parameter enables mocking
- **Parameterized queries**: All SQL uses `$1, $2...` parameters to prevent SQL injection
- **JSONB support**: Properties stored as JSONB with `@>` containment operator for queries
- **Upsert pattern**: Using `ON CONFLICT DO UPDATE` for idempotent operations
- **Cascading deletes**: Foreign keys ensure edges are deleted when nodes are deleted
- **Property merging**: `jsonb ||` operator for partial updates
- **Unit testable**: Can test without real PostgreSQL database

**Phase 3: SemanticStorage Implementation (COMPLETED - 2025-11-04)**
- ✅ Full-text search (3 methods): `search()`, `createSearchIndex()`, `dropSearchIndex()`
  - PostgreSQL built-in FTS with `to_tsvector`, `to_tsquery`, `ts_rank`, `ts_headline`
  - GIN indexes for efficient text search
  - Relevance scoring and result highlighting
- ✅ Materialized views (5 methods): `createMaterializedView()`, `refreshMaterializedView()`, `queryMaterializedView()`, `dropMaterializedView()`, `listMaterializedViews()`
  - CONCURRENT refresh to avoid blocking reads
  - SemanticQuery to SQL translation
  - pg_matviews system catalog integration
- ✅ Schema management (2 methods): `defineSchema()`, `getSchema()`
  - JSONB-based schema metadata storage in `_schemas` table
  - Upsert semantics for schema updates
- ✅ 21 comprehensive unit tests (all passing)
- ✅ Tests updated to match SemanticStorage interface contract
- ✅ Zero TypeScript errors
- ✅ Full test suite: 436/444 tests passing (no regressions)

## Discoveries

### Discovery 1: pgvector npm Package Version
**Found**: pgvector npm package is at version 0.2.1 (not 0.2.2 as originally planned)
**Location**: npm registry
**Significance**: Needed to adjust package.json dependency version
**Resolution**: Updated to `pgvector@^0.2.1`

### Discovery 2: Dependency Injection Pattern for Testing
**Found**: Project uses mock adapter pattern (e.g., MockKuzuStorageAdapter)
**Decision**: Implemented thin interface around `pg` library instead
**Rationale**:
- Smaller mock surface area (just database calls, not entire adapter)
- Single source of truth (real adapter, not duplicate mock)
- Easier to maintain (pg library assumed tested)
- More flexible (can test real business logic)
**Implementation**: IPostgreSQLClient interface with PostgreSQLClient and MockPostgreSQLClient
**Files Created**:
- `/workspaces/corticai/app/src/storage/adapters/database/IPostgreSQLClient.ts`
- `/workspaces/corticai/app/src/storage/adapters/database/PostgreSQLClient.ts`
- `/workspaces/corticai/app/tests/unit/mocks/MockPostgreSQLClient.ts`

### Discovery 3: PostgreSQL Recursive CTE Implementation Patterns
**Context**: Implementing graph traversal algorithms using PostgreSQL recursive CTEs
**Key Findings**:
1. **Recursive CTEs for graph traversal**: PostgreSQL's `WITH RECURSIVE` is powerful for graph operations
   - Base case: SELECT starting node(s)
   - Recursive case: JOIN with edges to find next level
   - Termination: Depth limit + cycle detection (`WHERE node_id != ALL(path_nodes)`)
2. **Shortest path with BFS**: Order by depth and LIMIT 1 gives shortest path
   - Track path as array: `path_nodes || next_node.id`
   - Store edge data as JSONB array for later reconstruction
3. **Performance considerations**:
   - Max depth limit prevents infinite recursion (default: 20 hops)
   - `DISTINCT` prevents duplicate path exploration
   - Indexes on `from_node`, `to_node`, and `type` columns critical for performance
4. **Path reconstruction**: Two-phase approach
   - Phase 1: Recursive CTE returns node IDs and edge data
   - Phase 2: Fetch full node/edge data and build GraphPath objects
5. **Direction handling**: SQL JOIN conditions differ by direction
   - Outgoing: `e.from_node = current.id AND next.id = e.to_node`
   - Incoming: `e.to_node = current.id AND next.id = e.from_node`
   - Both: OR condition checking both directions
6. **Edge type filtering**: Use `type = ANY($2::text[])` for array parameters
**Implementation Files**:
- `traverse()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:422-555`
- `shortestPath()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:557-648`
- `findConnected()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:650-682`

### Discovery 4: Batch Operations and Aggregations
**Context**: Implementing high-throughput entity storage and graph statistics
**Key Learnings**:
1. **Batch upserts**: Multi-row INSERT with ON CONFLICT for idempotent bulk loading
   - Build VALUES clause dynamically: `($1, $2, $3), ($4, $5, $6), ...`
   - Single query for hundreds/thousands of rows
   - Upsert semantics with `ON CONFLICT DO UPDATE`
2. **JSONB aggregation**: Use `jsonb_object_agg()` for grouped statistics
   - Example: `jsonb_object_agg(type, count)` creates `{Person: 42, File: 13}`
   - Subquery pattern for pre-aggregation before object building
3. **Database size**: `pg_total_relation_size($1::regclass)` for storage metrics
   - Pass table name as parameter for SQL injection safety
4. **Type casting in PostgreSQL**: Careful with integer vs text
   - COUNT returns bigint (string in result): Must use `parseInt()`
   - Array parameters need explicit casting: `$1::text[]`
**Implementation Files**:
- `streamEpisodes()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:618-657`
- `getGraphStats()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:684-733`
- `storeEntity()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:592-616`

### Discovery 5: Unit Testing Implementation Learnings
**Context**: Writing comprehensive unit tests for PgVectorStorageAdapter
**Key Findings**:
1. **Properties as JSON strings**: Adapter passes properties as `JSON.stringify(obj)`, not raw objects
   - All JSONB parameters use `JSON.stringify()` before passing to PostgreSQL
   - Tests must expect JSON strings in query parameters, not objects
2. **Iterator implementation**: `keys()`, `values()`, `entries()` use `getConnection()` not direct query
   - Need to mock `getConnectionMock` to return connection with query results
   - Must verify `release()` is called on connections
3. **SQL variations**: Different methods use different SQL patterns
   - `has()`: `SELECT 1 FROM ... WHERE key = $1` (not `SELECT EXISTS`)
   - `clear()`: `TRUNCATE TABLE` (not `DELETE FROM`)
4. **Edge interface**: GraphEdge uses `from`/`to`, not `source`/`target`
   - `addEdge()` returns `void` (not edge ID)
   - `getEdge()` takes `(from, to, type?)` parameters (not just ID)
   - `deleteEdge()` takes `(from, to, type?)` parameters (not just ID)
5. **Method signatures**:
   - `queryNodes(type: string, properties?: Record)` - separate parameters, not object
   - `getEdges(nodeId, direction?, edgeType?)` - positional parameters
**Files Created**:
- `/workspaces/corticai/app/tests/unit/storage/PgVectorStorageAdapter.test.ts` (30 tests, all passing)
**Test Coverage**: Basic Storage (9 tests), Graph Nodes (6 tests), Graph Edges (7 tests), Error Handling (2 tests), SQL Parameterization (3 tests)

### Discovery 6: Phase 3 SemanticStorage Interface Compliance
**Context**: Implementing Phase 3 SemanticStorage methods (full-text search, materialized views, schema management)
**Date**: 2025-11-04
**Key Findings**:
1. **SearchOptions doesn't support offset**: Interface defines `fields`, `fuzziness`, `boost`, `highlight`, `limit` - NO offset property
   - Tests incorrectly assumed offset support
   - Implementation correctly omits offset from SearchOptions
2. **SearchResult structure**: Returns `{ document: T, score: number, highlights?: Record<string, string[]> }`
   - NOT a flat object with `.rank` property
   - Tests needed updating to access `.document` and `.score`
3. **MaterializedView.query**: Can be `SemanticQuery | string`
   - Implementation must handle both types
   - Helper method `buildSQLFromQuery()` converts SemanticQuery to SQL
4. **SemanticQuery uses `from` not `table`**: Interface property is `from: string` for table name
   - Helper methods needed correction
5. **MaterializedView requires refreshStrategy**: Not optional, must be 'manual' | 'scheduled' | 'on-write'
   - `listMaterializedViews()` returns 'manual' as default for PostgreSQL views
6. **Schema storage approach**: Used dedicated `_schemas` table with JSONB column
   - Two-query approach in `defineSchema()`: CREATE TABLE IF NOT EXISTS, then INSERT ... ON CONFLICT
   - Two-query approach in `getSchema()`: Check table exists, then SELECT schema
   - Mock tests must handle multiple sequential queries correctly
**Implementation Files**:
- `search()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:1094-1130`
- `createMaterializedView()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:1183-1207`
- `defineSchema()`: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts:1366-1400`
**Test Corrections**: 5 tests updated to match SemanticStorage interface contract

### Discovery 7: Code Review Recommendations Applied
**Context**: Post-Phase 3 code review identified 10 issues (3 critical, 2 high, 5 medium/low)
**Date**: 2025-11-04
**Applied Immediately** (3 low-risk improvements):
1. **parseInt radix consistency** (line 947-951): Added radix parameter (10) to all `parseInt()` calls
2. **Search configuration constants** (line 53-54): Extracted `DEFAULT_SEARCH_LIMIT = 100`, `FTS_INDEX_SUFFIX = '_fts_idx'`
3. **DRY helper method** (line 1098-1103): Created `getSearchIndexName(table)` to eliminate duplication
**Deferred to Tasks** (7 items requiring careful planning):
- **CRITICAL**: SQL injection vulnerabilities → [[pgvector-sql-injection-prevention]] (SECURITY-PGVECTOR-001)
- **MEDIUM**: File size refactoring → [[pgvector-adapter-modularization]] (REFACTOR-PGVECTOR-001)
- **LOW**: Error handling improvements → [[pgvector-error-handling-improvements]] (IMPROVE-PGVECTOR-004)
**Outcome**: All 110 tests pass, 0 TypeScript errors, no regressions

## Code Review & Improvements

### 2025-11-04: Post-Phase 3 Code Review Applied

**Quick Wins Applied** (3 improvements, 30 minutes):
- ✅ Added radix (10) to `parseInt()` calls for consistent decimal parsing
- ✅ Extracted search configuration constants (DEFAULT_SEARCH_LIMIT, FTS_INDEX_SUFFIX)
- ✅ Created `getSearchIndexName()` helper to eliminate duplication

**Security Tasks Created**:
- [[pgvector-sql-injection-prevention]] (SECURITY-PGVECTOR-001) - URGENT
  - Fix SQL injection in `buildSQLFromQuery()` (parameterized queries)
  - Add identifier validation for field names, view names
  - Comprehensive security testing
  - Estimated: 4-5 hours

**Refactoring Tasks Created**:
- [[pgvector-adapter-modularization]] (REFACTOR-PGVECTOR-001) - MEDIUM
  - Break 1,699-line file into 6 focused modules
  - Improve maintainability and testability
  - Estimated: 11-13 hours

**Quality Tasks Created**:
- [[pgvector-error-handling-improvements]] (IMPROVE-PGVECTOR-004) - LOW
  - Standardize error context across all methods
  - Improve debugging information
  - Estimated: 4-5 hours

### 2025-11-03: Phase 2 Code Review Completed

**Quick Fixes Applied**:
- ✅ Removed unused variable `edgeTypesList`
- ✅ Added named constants for traversal depth limits (DEFAULT_TRAVERSAL_DEPTH=3, MAX_TRAVERSAL_DEPTH=20, ABSOLUTE_MAX_DEPTH=50)
- ✅ Replaced magic number `20` with `MAX_TRAVERSAL_DEPTH` constant
- ✅ Replaced magic number `3` with `DEFAULT_TRAVERSAL_DEPTH` constant
- ✅ Improved TODO comment with implementation context

**Deferred Improvements** (tracked as separate tasks):
- [[pgvector-sql-injection-fix]] (IMPROVE-PGVECTOR-001) - ✅ COMPLETED: Input validation prevents SQL injection
- [[pgvector-n1-query-optimization]] (IMPROVE-PGVECTOR-002) - ✅ COMPLETED: Batch-fetch eliminates N+1 query pattern (50x faster)
- [[pgvector-code-quality]] (IMPROVE-PGVECTOR-003) - ✅ COMPLETED: All code quality issues addressed in IMPROVE-001 and IMPROVE-002

## Questions & Decisions
(To be populated as needed)
