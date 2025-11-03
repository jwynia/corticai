# TECH-006: Add Required Field Validation for SemanticQuery

**Date Created**: 2025-11-01
**Type**: Bug Fix / Technical Debt
**Priority**: Medium
**Complexity**: Trivial
**Effort**: 20 minutes
**Status**: Planned

## Problem

The `buildSQLFromSemanticQuery()` method doesn't validate that required fields exist before using them. Specifically, the `from` field (table name) is required but not validated, which could lead to malformed SQL or unclear errors.

**Current Code**:
```typescript
// NO VALIDATION - assumes 'from' exists
let sql = `SELECT ${selectClause} FROM ${semanticQuery.from}`
```

**Problem Scenarios**:
- `from: undefined` → SQL: "SELECT * FROM undefined"
- `from: null` → SQL: "SELECT * FROM null"
- `from: ""` → SQL: "SELECT * FROM "
- `from: "   "` → SQL: "SELECT * FROM    "

## Acceptance Criteria

### Must Have
- [ ] Validate `semanticQuery.from` exists and is non-empty string
- [ ] Throw `StorageError` with code `INVALID_VALUE` if missing/invalid
- [ ] Add tests for null, undefined, empty string, whitespace-only
- [ ] Error message clearly indicates "from" field is required
- [ ] Zero test regressions

### Should Have
- [ ] Validate `from` is a string type
- [ ] Trim whitespace before validation

## Proposed Implementation

```typescript
buildSQLFromSemanticQuery(semanticQuery: SemanticQuery): SQLBuildResult {
  const params: QueryParam[] = []

  // Validate required 'from' field
  if (!semanticQuery.from ||
      typeof semanticQuery.from !== 'string' ||
      semanticQuery.from.trim() === '') {
    throw new StorageError(
      'SemanticQuery must have a valid "from" table name',
      StorageErrorCode.INVALID_VALUE,
      {
        query: semanticQuery,
        from: semanticQuery.from,
        fromType: typeof semanticQuery.from
      }
    )
  }

  // ... rest of method (now safe)
  let sql = `SELECT ${selectClause} FROM ${semanticQuery.from}`
  // ...
}
```

## Test Plan

### Invalid Values (7 tests):
- `from: undefined` → Error: "must have a valid 'from' table name"
- `from: null` → Error: "must have a valid 'from' table name"
- `from: ""` → Error: "must have a valid 'from' table name"
- `from: "   "` → Error: "must have a valid 'from' table name"
- `from: 123` → Error: "must have a valid 'from' table name"
- `from: {}` → Error: "must have a valid 'from' table name"
- `from: []` → Error: "must have a valid 'from' table name"

### Valid Values (5 tests):
- `from: "users"` → Works
- `from: "my_table"` → Works
- `from: "schema.table"` → Works (if identifier validation allows)
- `from: "  users  "` → Works (after trim, if we add trim)
- Minimal query: `{ from: "users" }` → Valid

## Implementation Steps

1. Add validation at start of buildSQLFromSemanticQuery (5 min)
2. Write tests for invalid values (10 min)
3. Write tests for valid values (3 min)
4. Run test suite (2 min)

Total: ~20 minutes

## Dependencies

- `StorageError` and `StorageErrorCode` (already exists)
- Test framework (Vitest)

## Risks & Mitigations

### Risk: Breaking Existing Code
**Mitigation**: Extremely unlikely - all existing queries must have valid `from` field

### Risk: TypeScript Should Prevent This
**Reality**:
- `from` field is required in SemanticQuery interface (good!)
- But runtime values from JSON or external sources aren't type-checked
- This is defensive programming

## Related Issues

- Original code review finding: Missing Null/Undefined Checks (Medium-High Priority)
- Related to: TECH-003 (broader input validation)

## Success Metrics

- [ ] Clear error for missing `from` field
- [ ] 12+ validation tests added
- [ ] All tests passing (329 + new tests)
- [ ] Better developer experience with clear errors

## Notes

This is a **trivial fix** that provides **high value** by:
- Preventing confusing SQL generation errors
- Providing clear, actionable error messages
- Catching bugs earlier in the development cycle
- Defensive programming against runtime type issues

## References

- Code review report: Code review from 2025-11-01
- SemanticQuery interface: Defines `from` as required field
