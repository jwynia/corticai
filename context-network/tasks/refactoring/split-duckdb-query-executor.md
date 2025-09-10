# Task: Split DuckDBQueryExecutor into Smaller Modules

## Priority
Medium

## Source
Code review recommendation - 2025-09-10

## Problem Statement
DuckDBQueryExecutor.ts is 590 lines, exceeding the recommended 500 line limit. The file contains SQL generation logic that could be extracted into a separate SQLBuilder or translator module.

## Current State
- Single file handling:
  - SQL translation logic
  - Query execution
  - Result processing
  - Error handling
  - Type conversions

## Proposed Solution

### Extract SQL Translation
```
/app/src/query/executors/translators/
├── DuckDBSQLBuilder.ts     (~300 lines)
├── SQLHelpers.ts           (~100 lines)
└── index.ts
```

### Refactored Structure
```typescript
export class DuckDBQueryExecutor<T> {
  private sqlBuilder: DuckDBSQLBuilder
  
  execute(query: Query<T>, adapter: any): QueryResult<T> {
    const sql = this.sqlBuilder.translate(query)
    // Execute and process
  }
}
```

## Acceptance Criteria
- [ ] DuckDBQueryExecutor reduced to < 300 lines
- [ ] SQL building logic in separate module
- [ ] All SQL injection protections maintained
- [ ] Parameterized queries still work
- [ ] All existing functionality preserved
- [ ] Tests updated to cover new structure

## Benefits
- Cleaner separation of concerns
- Reusable SQL building logic
- Easier to test SQL generation
- Potential to support other SQL databases
- Improved maintainability

## Effort Estimate
**Size**: Medium (3-4 hours)
**Complexity**: Low-Medium
**Risk**: Low (SQL generation is well-tested)

## Implementation Notes
1. Extract SQL building methods first
2. Create interface for SQL translation
3. Keep execution logic in main class
4. Ensure proper parameter handling
5. Maintain all security measures

## Dependencies
- Comprehensive test coverage exists
- No changes to external API

## Testing Strategy
1. Verify all existing SQL generation tests pass
2. Add unit tests for SQLBuilder
3. Test parameter binding thoroughly
4. Verify no SQL injection vulnerabilities