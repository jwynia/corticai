# PgVector Adapter Modularization

## Task ID
REFACTOR-PGVECTOR-001

## Status
📋 Planned - Not Started

## Created
2025-11-04

## Priority
**MEDIUM** - Code maintainability improvement

## One-liner
Refactor PgVectorStorageAdapter (1,699 lines) into smaller, focused modules following Single Responsibility Principle

## Context

### Current State
PgVectorStorageAdapter has grown to 1,699 lines, exceeding the recommended 500-line limit by 3x. The file implements:
- Basic storage operations (get, set, delete, etc.)
- Graph operations (nodes, edges, traversal)
- Semantic operations (query, SQL execution, aggregation)
- Full-text search (FTS with GIN indexes)
- Materialized views (create, refresh, query, drop)
- Schema management (define, retrieve schemas)
- Vector operations (similarity search - Phase 4)

### Problem
- **Difficult to navigate**: Hard to find specific functionality
- **Violates Single Responsibility**: Too many concerns in one file
- **Harder to test**: Large surface area
- **Merge conflicts**: Multiple developers touching same file

### Business Value
- Improved developer productivity
- Easier code reviews
- Better testability
- Reduced merge conflicts

## Acceptance Criteria

### Proposed Module Structure

```
app/src/storage/adapters/pgvector/
├── PgVectorStorageAdapter.ts         # Main orchestrator (~200 lines)
├── PgVectorGraphOperations.ts        # Graph methods (~300 lines)
├── PgVectorSemanticOperations.ts     # Semantic methods (~200 lines)
├── PgVectorSearchOperations.ts       # FTS methods (~150 lines)
├── PgVectorViewOperations.ts         # Materialized view methods (~200 lines)
├── PgVectorSchemaOperations.ts       # Schema management (~150 lines)
└── PgVectorVectorOperations.ts       # Vector similarity search (Phase 4)
```

### Required Changes

**1. Create PgVectorGraphOperations**
- [ ] Extract graph node operations: `addNode`, `getNode`, `updateNode`, `deleteNode`, `queryNodes`
- [ ] Extract graph edge operations: `addEdge`, `getEdge`, `deleteEdge`, `getEdges`, `updateEdge`
- [ ] Extract graph traversal: `traverse`, `shortestPath`, `findConnected`
- [ ] Extract graph statistics: `getGraphStats`
- [ ] Accept `IPostgreSQLClient` in constructor
- [ ] Maintain existing method signatures
- [ ] Preserve error handling patterns

**2. Create PgVectorSemanticOperations**
- [ ] Extract semantic query operations: `query`, `executeSQL`
- [ ] Extract aggregation operations: `aggregate`, `groupBy`
- [ ] Accept `IPostgreSQLClient` in constructor
- [ ] Maintain existing method signatures
- [ ] Preserve error handling patterns

**3. Create PgVectorSearchOperations**
- [ ] Extract search methods: `search`, `createSearchIndex`, `dropSearchIndex`
- [ ] Include helper: `getSearchIndexName()`
- [ ] Include constants: `DEFAULT_SEARCH_LIMIT`, `FTS_INDEX_SUFFIX`
- [ ] Accept `IPostgreSQLClient` in constructor
- [ ] Maintain existing method signatures

**4. Create PgVectorViewOperations**
- [ ] Extract materialized view methods: `createMaterializedView`, `refreshMaterializedView`, `queryMaterializedView`, `dropMaterializedView`, `listMaterializedViews`
- [ ] Include helper: `buildSQLFromQuery()` (after SQL injection fix)
- [ ] Accept `IPostgreSQLClient` in constructor
- [ ] Maintain existing method signatures

**5. Create PgVectorSchemaOperations**
- [ ] Extract schema methods: `defineSchema`, `getSchema`
- [ ] Accept `IPostgreSQLClient` in constructor
- [ ] Maintain existing method signatures

**6. Refactor Main Adapter**
- [ ] Keep: Basic storage operations (get, set, delete, has, clear, size)
- [ ] Keep: Iterator methods (keys, values, entries)
- [ ] Keep: Connection management (initialize, close, ensureLoaded)
- [ ] Delegate: All specialized operations to respective modules
- [ ] Maintain: Same public API (no breaking changes)

**7. Update Tests**
- [ ] Tests should continue to test through main adapter
- [ ] Add unit tests for each extracted module (optional)
- [ ] Ensure all 110 tests still pass
- [ ] No test behavior changes

**8. Update Imports**
- [ ] Update any external files importing PgVectorStorageAdapter
- [ ] Verify TypeScript compilation passes

## Implementation Plan

### Phase 1: Create Search Operations Module (2 hours)
Start with smallest, most isolated module:
1. Create `PgVectorSearchOperations.ts`
2. Move search methods and helpers
3. Update main adapter to delegate to search operations
4. Run tests, verify no regressions
5. Commit: "refactor: extract search operations from PgVectorStorageAdapter"

### Phase 2: Create View Operations Module (2 hours)
1. Create `PgVectorViewOperations.ts`
2. Move materialized view methods
3. Move `buildSQLFromQuery()` helper
4. Update main adapter to delegate
5. Run tests, verify no regressions
6. Commit: "refactor: extract view operations from PgVectorStorageAdapter"

### Phase 3: Create Schema Operations Module (1 hour)
1. Create `PgVectorSchemaOperations.ts`
2. Move schema methods
3. Update main adapter to delegate
4. Run tests, verify no regressions
5. Commit: "refactor: extract schema operations from PgVectorStorageAdapter"

### Phase 4: Create Semantic Operations Module (2 hours)
1. Create `PgVectorSemanticOperations.ts`
2. Move query and aggregation methods
3. Update main adapter to delegate
4. Run tests, verify no regressions
5. Commit: "refactor: extract semantic operations from PgVectorStorageAdapter"

### Phase 5: Create Graph Operations Module (3 hours)
Largest module, move carefully:
1. Create `PgVectorGraphOperations.ts`
2. Move graph node methods
3. Move graph edge methods
4. Move graph traversal methods
5. Update main adapter to delegate
6. Run tests, verify no regressions
7. Commit: "refactor: extract graph operations from PgVectorStorageAdapter"

### Phase 6: Update Documentation (1 hour)
1. Update context network with new structure
2. Update inline comments
3. Add module documentation
4. Create architecture diagram showing module relationships

## Example: Delegating Pattern

### Before (in main adapter):
```typescript
async search<R = any>(table: string, searchText: string, options?: SearchOptions): Promise<SearchResult<R>[]> {
  await this.ensureLoaded();
  // ... 30+ lines of implementation
}
```

### After (in main adapter):
```typescript
private searchOps: PgVectorSearchOperations;

constructor(config: PgVectorStorageConfig, pgClient?: IPostgreSQLClient) {
  super(config);
  // ... initialization
  this.searchOps = new PgVectorSearchOperations(this.pg, this.config);
}

async search<R = any>(table: string, searchText: string, options?: SearchOptions): Promise<SearchResult<R>[]> {
  await this.ensureLoaded();
  return this.searchOps.search<R>(table, searchText, options);
}
```

### In PgVectorSearchOperations.ts:
```typescript
export class PgVectorSearchOperations {
  constructor(
    private pg: IPostgreSQLClient,
    private config: Required<PgVectorStorageConfig>
  ) {}

  async search<R = any>(table: string, searchText: string, options?: SearchOptions): Promise<SearchResult<R>[]> {
    // ... implementation (moved from main adapter)
  }

  // ... other search methods
}
```

## Estimated Effort
**Total: 11-13 hours** (spread over 2-3 days)

## Dependencies
- Should be done AFTER SQL injection fixes (SECURITY-PGVECTOR-001)
- Can be done in parallel with Phase 4 (Vector Operations)

## Risks & Mitigations

### Risk: Breaking Existing Functionality
**Mitigation**:
- Move one module at a time
- Run full test suite after each module
- Commit after each successful module extraction

### Risk: Circular Dependencies
**Mitigation**:
- Use dependency injection
- Pass `IPostgreSQLClient` to all modules
- Keep modules independent of each other

### Risk: Performance Impact
**Mitigation**:
- Delegation adds minimal overhead (one extra function call)
- Modern JavaScript optimizes this away
- No change to actual database operations

## Success Criteria
- [ ] Main adapter file < 300 lines
- [ ] Each extracted module < 400 lines
- [ ] All 110 existing tests pass unchanged
- [ ] TypeScript compilation passes (0 errors)
- [ ] No performance regression
- [ ] Code coverage maintained or improved
- [ ] Context network updated with new structure

## Follow-up Tasks
- Consider similar refactoring for KuzuStorageAdapter (if needed)
- Consider similar refactoring for DuckDBStorageAdapter (if needed)
- Document modularization pattern in architecture docs

## References
- Code review: Issue #9 (Large File Size)
- SOLID Principles: Single Responsibility Principle
- Original file: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts` (1,699 lines)
