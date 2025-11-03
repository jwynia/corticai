# TECH-005: Add Validation for LIMIT and OFFSET in Semantic Queries

**Date Created**: 2025-11-01
**Type**: Bug Fix / Technical Debt
**Priority**: Medium
**Complexity**: Trivial
**Effort**: 30 minutes
**Status**: Planned

## Problem

The `buildSQLFromSemanticQuery()` method currently accepts LIMIT and OFFSET values without validation. This can lead to:
- SQL errors for negative values
- Unexpected behavior for non-integer values
- Potential performance issues with unreasonably large values

**Current Code**:
```typescript
// NO VALIDATION - accepts any value
if (semanticQuery.limit !== undefined) {
  sql += ` LIMIT ${semanticQuery.limit}`
}
if (semanticQuery.offset !== undefined) {
  sql += ` OFFSET ${semanticQuery.offset}`
}
```

**Problem Scenarios**:
- `limit: -10` → SQL error
- `limit: 1.5` → Unpredictable behavior
- `limit: Infinity` → Database confusion
- `offset: -5` → SQL error

## Acceptance Criteria

### Must Have
- [ ] Validate LIMIT is non-negative integer or throw `StorageError`
- [ ] Validate OFFSET is non-negative integer or throw `StorageError`
- [ ] Add tests for valid values (0, 1, 100, 10000)
- [ ] Add tests for invalid values (negative, float, Infinity, NaN, null)
- [ ] Error messages clearly indicate the problem
- [ ] Zero test regressions

### Should Have
- [ ] Add maximum LIMIT value (e.g., 10000) to prevent abuse
- [ ] Document reasonable LIMIT/OFFSET ranges

### Could Have
- [ ] Warning log for very large LIMIT values
- [ ] Pagination guidance in error messages

## Proposed Implementation

```typescript
/**
 * Validates LIMIT value is a valid non-negative integer
 * @throws StorageError if invalid
 */
private validateLimit(limit: number | undefined): void {
  if (limit === undefined) {
    return  // Optional parameter
  }

  if (!Number.isInteger(limit)) {
    throw new StorageError(
      `LIMIT must be an integer, got: ${limit}`,
      StorageErrorCode.INVALID_VALUE,
      { limit, type: typeof limit }
    )
  }

  if (limit < 0) {
    throw new StorageError(
      `LIMIT must be non-negative, got: ${limit}`,
      StorageErrorCode.INVALID_VALUE,
      { limit }
    )
  }

  // Optional: maximum limit
  const MAX_LIMIT = 10000
  if (limit > MAX_LIMIT) {
    throw new StorageError(
      `LIMIT exceeds maximum value of ${MAX_LIMIT}, got: ${limit}`,
      StorageErrorCode.INVALID_VALUE,
      { limit, maxLimit: MAX_LIMIT }
    )
  }
}

/**
 * Validates OFFSET value is a valid non-negative integer
 * @throws StorageError if invalid
 */
private validateOffset(offset: number | undefined): void {
  if (offset === undefined) {
    return  // Optional parameter
  }

  if (!Number.isInteger(offset)) {
    throw new StorageError(
      `OFFSET must be an integer, got: ${offset}`,
      StorageErrorCode.INVALID_VALUE,
      { offset, type: typeof offset }
    )
  }

  if (offset < 0) {
    throw new StorageError(
      `OFFSET must be non-negative, got: ${offset}`,
      StorageErrorCode.INVALID_VALUE,
      { offset }
    )
  }
}

// Usage in buildSQLFromSemanticQuery():
buildSQLFromSemanticQuery(semanticQuery: SemanticQuery): SQLBuildResult {
  // ... existing code ...

  // Validate LIMIT
  this.validateLimit(semanticQuery.limit)
  if (semanticQuery.limit !== undefined) {
    sql += ` LIMIT ${semanticQuery.limit}`
  }

  // Validate OFFSET
  this.validateOffset(semanticQuery.offset)
  if (semanticQuery.offset !== undefined) {
    sql += ` OFFSET ${semanticQuery.offset}`
  }

  return { sql, params }
}
```

## Test Plan

### Valid Values (5 tests):
- `limit: 0` → Valid (empty result set)
- `limit: 1` → Valid (single row)
- `limit: 100` → Valid (typical pagination)
- `limit: 10000` → Valid (max value if we set one)
- `offset: 0` → Valid (start from beginning)

### Invalid Values (15 tests):
- `limit: -1` → Error: "must be non-negative"
- `limit: -100` → Error: "must be non-negative"
- `limit: 1.5` → Error: "must be an integer"
- `limit: NaN` → Error: "must be an integer"
- `limit: Infinity` → Error: "must be an integer"
- `limit: null` → Treated as undefined (allowed)
- `limit: "10"` → Error: "must be an integer" (type safety)
- `offset: -1` → Error: "must be non-negative"
- `offset: 2.5` → Error: "must be an integer"
- `offset: NaN` → Error: "must be an integer"

### Edge Cases (5 tests):
- Both limit and offset undefined → No validation errors
- `limit: 0, offset: 0` → Valid (edge case)
- Very large valid values → Should work (or hit max limit)
- Sequential validation (both invalid) → First error thrown

## Implementation Steps

1. Add validation methods (10 min)
2. Integrate into buildSQLFromSemanticQuery (5 min)
3. Write comprehensive tests (10 min)
4. Run test suite to verify no regressions (5 min)

Total: ~30 minutes

## Dependencies

- `StorageError` and `StorageErrorCode` (already exists)
- Test framework (Vitest)

## Risks & Mitigations

### Risk 1: Breaking Existing Queries
**Mitigation**: Very unlikely - existing code likely uses valid values already

### Risk 2: TypeScript Should Catch This
**Reality**: TypeScript doesn't prevent runtime bad values (e.g., from JSON parsing)

## Related Issues

- Original code review finding: Missing Input Validation (Medium Priority)
- Related to: TECH-003 (broader input validation)

## Success Metrics

- [ ] All valid LIMIT/OFFSET values work
- [ ] All invalid values throw clear errors
- [ ] 25+ validation tests added
- [ ] All tests passing (329 + new tests)
- [ ] Error messages are developer-friendly

## References

- Code review report: Code review from 2025-11-01
- SQL standards: LIMIT and OFFSET must be non-negative integers
