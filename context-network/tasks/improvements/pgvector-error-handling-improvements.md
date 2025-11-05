# PgVector Error Handling Improvements

## Task ID
IMPROVE-PGVECTOR-004

## Status
📋 Planned - Not Started

## Created
2025-11-04

## Priority
**LOW** - Code quality improvement

## One-liner
Improve error handling consistency and context in PgVectorStorageAdapter

## Context

### Current State
Code review identified minor inconsistencies in error handling:
1. **Search score parsing**: Uses `parseFloat(rank) || 0` which silently converts errors to 0
2. **Error context inconsistency**: Some errors include full context, others are minimal

### Problem
- Silent failures can mask database issues
- Inconsistent error context makes debugging harder
- Missing information in production logs

### Business Value
- Faster debugging in production
- Better error visibility
- More maintainable error handling

## Acceptance Criteria

### Required Changes

**1. Improve Search Score Parsing (Issue #4)**

**Current Code** (line 1119):
```typescript
score: parseFloat(rank) || 0,  // ❌ Silently converts NaN to 0
```

**Proposed Fix**:
```typescript
const scoreValue = parseFloat(rank);
if (!isFinite(scoreValue) || isNaN(scoreValue)) {
  throw new StorageError(
    'Invalid relevance score from database',
    StorageErrorCode.QUERY_FAILED,
    { rank, searchText, table, rowId: row.id }
  );
}
return {
  document: document as R,
  score: scoreValue,
  highlights: options?.highlight ? { content: [headline] } : undefined
};
```

**Trade-offs**:
- **Pro**: Catches database corruption/bugs early
- **Pro**: Prevents silently wrong relevance scores
- **Con**: Changes error behavior (throws instead of returning 0)
- **Con**: Could break if database ever returns NULL rank (unlikely)

**Decision**: DEFER for now, needs discussion
- Current behavior (`|| 0`) is defensive programming
- PostgreSQL `ts_rank()` should never return NULL/NaN
- Changing to throw would change error contract
- Better addressed in Phase 4 with comprehensive error strategy

**2. Standardize Error Context (Issue #10)**

**Current Inconsistency**:
```typescript
// Good (line 1127)
{ error, table, searchText }

// Could be better (line 1205)
{ error, view }  // Missing view.name for easier debugging
```

**Proposed Standard**:
```typescript
// Always include:
// 1. Original error
// 2. Operation context (what was being attempted)
// 3. Key identifiers (IDs, names)
// 4. User input (if relevant)

// Example:
throw new StorageError(
  `Failed to create materialized view "${view.name}": ${(error as Error).message}`,
  StorageErrorCode.QUERY_FAILED,
  {
    error,
    viewName: view.name,
    queryType: typeof view.query === 'string' ? 'raw_sql' : 'semantic_query',
    refreshStrategy: view.refreshStrategy,
    operation: 'createMaterializedView'
  }
);
```

**Changes Needed**:
- [ ] Review all `catch` blocks in PgVectorStorageAdapter
- [ ] Add missing context fields to error objects
- [ ] Ensure consistent property naming (camelCase)
- [ ] Include operation name in context for log filtering

**3. Add Error Context Helper**

Create helper for consistent error context:
```typescript
private enhanceErrorContext(
  error: unknown,
  operation: string,
  context: Record<string, any>
): Record<string, any> {
  return {
    error,
    operation,
    timestamp: new Date().toISOString(),
    adapter: 'PgVectorStorageAdapter',
    ...context
  };
}

// Usage:
throw new StorageError(
  `Failed to create materialized view "${view.name}": ${(error as Error).message}`,
  StorageErrorCode.QUERY_FAILED,
  this.enhanceErrorContext(error, 'createMaterializedView', {
    viewName: view.name,
    queryType: typeof view.query === 'string' ? 'raw_sql' : 'semantic_query',
    refreshStrategy: view.refreshStrategy
  })
);
```

## Implementation Plan

### Phase 1: Audit Current Error Handling (1 hour)
1. List all `catch` blocks in PgVectorStorageAdapter
2. Document current error context for each
3. Identify inconsistencies
4. Create standardization guide

### Phase 2: Create Error Context Helper (30 minutes)
1. Implement `enhanceErrorContext()` method
2. Add unit tests for helper
3. Document usage pattern

### Phase 3: Update Error Contexts (2 hours)
1. Update materialized view error contexts
2. Update search operation error contexts
3. Update schema operation error contexts
4. Update graph operation error contexts
5. Update semantic operation error contexts

### Phase 4: Testing & Validation (1 hour)
1. Verify all tests still pass
2. Manually trigger errors to verify context
3. Check log output format
4. Update error handling documentation

## Estimated Effort
**Total: 4-5 hours**

## Dependencies
- None (can be done anytime)
- Best done AFTER modularization (REFACTOR-PGVECTOR-001)

## Risks & Mitigations

### Risk: Changing Error Behavior
**Mitigation**: Only enhance context, don't change when/what errors are thrown

### Risk: Performance Impact
**Mitigation**: Error paths are cold paths, minimal performance impact

### Risk: Too Much Context
**Mitigation**: Only include relevant debugging information, avoid PII

## Success Criteria
- [ ] All error contexts include: error, operation, timestamp, adapter
- [ ] All error messages include actionable information
- [ ] No PII or sensitive data in error contexts
- [ ] All 110 tests pass unchanged
- [ ] TypeScript compilation passes
- [ ] Error context helper is well-tested
- [ ] Documentation updated

## Example: Before/After

### Before:
```typescript
catch (error) {
  throw new StorageError(
    `Failed to create materialized view "${view.name}": ${(error as Error).message}`,
    StorageErrorCode.QUERY_FAILED,
    { error, view }
  );
}
```

### After:
```typescript
catch (error) {
  throw new StorageError(
    `Failed to create materialized view "${view.name}": ${(error as Error).message}`,
    StorageErrorCode.QUERY_FAILED,
    this.enhanceErrorContext(error, 'createMaterializedView', {
      viewName: view.name,
      queryType: typeof view.query === 'string' ? 'raw_sql' : 'semantic_query',
      refreshStrategy: view.refreshStrategy,
      hasFilters: (view.query as SemanticQuery).where?.length > 0
    })
  );
}
```

## Follow-up Tasks
- Consider structured logging library (e.g., pino, winston)
- Consider error tracking service integration (e.g., Sentry)
- Document error handling best practices

## References
- Code review: Issues #4, #10
- Error handling patterns in other adapters
- StorageError interface: `/workspaces/corticai/app/src/storage/interfaces/Storage.ts`
