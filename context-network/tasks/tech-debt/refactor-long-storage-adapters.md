# Tech Debt: Refactor Long Storage Adapter Files

**Created**: 2025-10-07
**Priority**: Medium (Code maintainability)
**Complexity**: Medium
**Effort**: 8-12 hours (across multiple files)
**Category**: Refactoring / Code Quality

## Problem

Several storage adapter files exceed 500 lines, which can impact maintainability:

- `KuzuStorageAdapter.ts`: 1113 lines
- `CosmosDBStorageAdapter.ts`: 804 lines
- `DuckDBStorageAdapter.ts`: 677 lines

While the code is well-organized, these large files could benefit from better modularization.

## Current State

**What's Good**:
- Code is well-documented
- Clear separation of CRUD operations
- Comprehensive error handling
- Good test coverage

**What Could Improve**:
- File length makes navigation harder
- Helper methods mixed with core operations
- Opportunity for shared utilities

## Proposed Solution

### Phase 1: Extract Helper Classes (4-6 hours)

**KuzuStorageAdapter** - Extract to separate files:
```typescript
// src/storage/adapters/kuzu/KuzuConnectionManager.ts
class KuzuConnectionManager {
  async ensureLoaded(): Promise<void>
  async initializeSchema(): Promise<void>
  async close(): Promise<void>
}

// src/storage/adapters/kuzu/KuzuQueryExecutor.ts
class KuzuQueryExecutor {
  async executeQuery<T>(statement: string, params: any): Promise<T>
  async executeBatch(operations: Operation[]): Promise<BatchResult>
}

// Main adapter becomes orchestrator
class KuzuStorageAdapter {
  constructor(
    private connection: KuzuConnectionManager,
    private executor: KuzuQueryExecutor,
    private builder: KuzuSecureQueryBuilder
  ) {}
}
```

**CosmosDBStorageAdapter** - Extract:
```typescript
// src/storage/adapters/cosmosdb/PartitionKeyGenerator.ts
class PartitionKeyGenerator {
  constructor(private readonly partitionCount: number) {}
  generate(key: string): string
  private djb2Hash(key: string): number
}

// src/storage/adapters/cosmosdb/CosmosDocumentMapper.ts
class CosmosDocumentMapper {
  toStorageDocument<T>(key: string, value: T): StorageDocument
  fromStorageDocument<T>(doc: StorageDocument): T
}
```

### Phase 2: Shared Utilities (2-3 hours)

Extract common patterns across all adapters:
```typescript
// src/storage/shared/BatchOperationProcessor.ts
class BatchOperationProcessor {
  async processBatch(operations: Operation[]): Promise<BatchResult>
  private validateOperation(op: Operation): void
  private groupOperations(ops: Operation[]): Map<string, Operation[]>
}

// src/storage/shared/ErrorMapper.ts
class StorageErrorMapper {
  mapToStorageError(error: unknown, operation: string): StorageError
}
```

### Phase 3: Verify and Test (2-3 hours)

- Move existing tests to new structure
- Ensure 100% backward compatibility
- No behavior changes, only structure
- Performance benchmarks unchanged

## Acceptance Criteria

- [ ] Each file under 500 lines
- [ ] All existing tests pass unchanged
- [ ] No behavior changes
- [ ] Clear separation of concerns
- [ ] Shared code extracted to utilities
- [ ] Documentation updated
- [ ] Import paths updated throughout codebase

## Benefits

1. **Improved Maintainability**
   - Easier to navigate and understand
   - Single responsibility per file
   - Better code organization

2. **Better Testability**
   - Isolated components easier to test
   - Can mock individual concerns
   - Clearer test structure

3. **Code Reuse**
   - Shared utilities across adapters
   - Consistent patterns
   - DRY principle

4. **Onboarding**
   - New developers understand faster
   - Smaller files less intimidating
   - Clear structure

## Risks and Mitigation

**Risk**: Breaking existing functionality
**Mitigation**:
- Move code without changing logic
- Run full test suite after each extraction
- Keep git commits small and atomic

**Risk**: Performance regression
**Mitigation**:
- No additional abstraction layers
- Same call patterns
- Benchmark before/after

**Risk**: Import hell with circular dependencies
**Mitigation**:
- Plan dependency graph first
- Use dependency injection
- Clear interface boundaries

## Not in Scope

- Changing adapter behavior
- Adding new features
- Performance optimization
- Changing public APIs

## Related Context

- Code Review: 2025-10-07 (identified issue)
- Similar pattern in `ActivationDetector.ts` (702 lines)
- Could apply same approach to lens system if successful

## Implementation Strategy

**Incremental Approach**:
1. Start with one adapter (CosmosDB - already excellent code)
2. Validate pattern works
3. Apply to other adapters
4. Extract common utilities last

**When to Schedule**:
- Low priority - not urgent
- Good for learning codebase deeply
- Could be split across multiple PRs
- Natural fit during slow periods

## Success Metrics

- File count increases (more files, each smaller)
- Average lines per file decreases
- Test coverage maintained at 100%
- Zero behavior changes
- Developer feedback positive on navigation
