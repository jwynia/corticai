# TECH-003: Add Input Validation to DuckDB Semantic Query Builder

**Date Created**: 2025-11-01
**Type**: Security / Technical Debt
**Priority**: High
**Complexity**: Medium
**Effort**: 3-4 hours
**Status**: Planned

## Problem

The `DuckDBSemanticQueryBuilder` currently performs SQL building by directly interpolating user-provided values (table names, field names, operators) into SQL strings without validation. While **parameter values** are properly parameterized using `$N` placeholders (preventing value-based SQL injection), **SQL identifiers** are not validated.

**Current Vulnerability** (from code review):
```typescript
// UNSAFE: Direct interpolation of identifiers
let sql = `SELECT ${selectClause} FROM ${semanticQuery.from}`
return `${filter.field} ${filter.operator} $${params.length}`
```

**Attack Scenarios**:
1. Malicious table name: `from: "users; DROP TABLE users; --"`
2. Malicious field name: `field: "id) OR 1=1; --"`
3. Malicious operator: `operator: "= 1 OR 1="`

## Acceptance Criteria

### Must Have
- [ ] Validate all SQL identifiers (table names, field names) against safe pattern
- [ ] Validate operators against whitelist of allowed operators
- [ ] Throw clear `StorageError` with code `INVALID_VALUE` for invalid inputs
- [ ] Add comprehensive tests for validation (50+ test cases)
- [ ] Document validation rules in code comments
- [ ] Zero test regressions (all 329 tests still passing)

### Should Have
- [ ] Check identifiers against SQL reserved keywords
- [ ] Support qualified identifiers (e.g., `schema.table`, `table.field`)
- [ ] Provide helpful error messages that guide users
- [ ] Add validation performance benchmarks

### Could Have
- [ ] Configuration option to enable/disable strict validation
- [ ] Validation bypass for trusted internal queries
- [ ] Logging of validation failures for security monitoring

## Proposed Design

### 1. Identifier Validation

```typescript
/**
 * Validates SQL identifier is safe for interpolation
 *
 * Rules:
 * - Must start with letter or underscore
 * - Can contain letters, numbers, underscores, dots (for qualified names)
 * - Cannot be a SQL reserved keyword
 * - Maximum length: 128 characters
 *
 * @throws StorageError with INVALID_VALUE if validation fails
 */
private validateIdentifier(identifier: string, context: string): void {
  // Pattern: alphanumeric, underscore, dots only
  const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/

  if (!identifier || typeof identifier !== 'string') {
    throw new StorageError(
      `${context} is required and must be a string`,
      StorageErrorCode.INVALID_VALUE,
      { identifier, context }
    )
  }

  if (identifier.length > 128) {
    throw new StorageError(
      `${context} exceeds maximum length of 128 characters`,
      StorageErrorCode.INVALID_VALUE,
      { identifier, context, length: identifier.length }
    )
  }

  if (!VALID_IDENTIFIER.test(identifier)) {
    throw new StorageError(
      `Invalid ${context}: "${identifier}". Only alphanumeric characters, underscores, and dots are allowed.`,
      StorageErrorCode.INVALID_VALUE,
      { identifier, context }
    )
  }

  // Check against reserved keywords
  const RESERVED_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'DROP', 'INSERT', 'UPDATE', 'DELETE',
    'TABLE', 'CREATE', 'ALTER', 'GRANT', 'REVOKE', 'UNION', 'JOIN'
  ]

  if (RESERVED_KEYWORDS.includes(identifier.toUpperCase())) {
    throw new StorageError(
      `Reserved SQL keyword cannot be used as ${context}: "${identifier}"`,
      StorageErrorCode.INVALID_VALUE,
      { identifier, context }
    )
  }
}
```

### 2. Operator Validation

```typescript
/**
 * Validates query operator is in whitelist
 *
 * @throws StorageError with INVALID_VALUE if operator not allowed
 */
private validateOperator(operator: string): void {
  const VALID_OPERATORS = [
    '=', '!=', '>', '<', '>=', '<=',
    'IN', 'NOT IN', 'LIKE', 'NOT LIKE',
    'IS NULL', 'IS NOT NULL'
  ]

  if (!VALID_OPERATORS.includes(operator)) {
    throw new StorageError(
      `Invalid query operator: "${operator}"`,
      StorageErrorCode.INVALID_VALUE,
      {
        operator,
        validOperators: VALID_OPERATORS
      }
    )
  }
}
```

### 3. Integration into buildSQLFromSemanticQuery

```typescript
buildSQLFromSemanticQuery(semanticQuery: SemanticQuery): SQLBuildResult {
  // Validate required fields
  this.validateIdentifier(semanticQuery.from, 'table name')

  // Validate SELECT fields
  semanticQuery.select?.forEach(field =>
    this.validateIdentifier(field, 'select field')
  )

  // Validate WHERE clause
  semanticQuery.where?.forEach(filter => {
    this.validateIdentifier(filter.field, 'filter field')
    this.validateOperator(filter.operator)
  })

  // Validate GROUP BY fields
  semanticQuery.groupBy?.forEach(field =>
    this.validateIdentifier(field, 'group by field')
  )

  // Validate ORDER BY fields
  semanticQuery.orderBy?.forEach(order =>
    this.validateIdentifier(order.field, 'order by field')
  )

  // Validate aggregations
  semanticQuery.aggregations?.forEach(agg => {
    this.validateIdentifier(agg.field, 'aggregation field')
    // Note: operator validation already exists for aggregations
  })

  // ... rest of SQL building (now safe)
}
```

## Test Plan

### Test Categories

**1. Valid Identifier Tests** (20 tests):
- Simple names: `users`, `user_name`, `_id`
- Qualified names: `schema.table`, `users.id`
- Mixed case: `UserTable`, `camelCase`
- Numbers in names: `user123`, `table_2`

**2. Invalid Identifier Tests** (25 tests):
- SQL injection attempts: `users; DROP TABLE users; --`
- Special characters: `users!`, `table@name`, `field#1`
- Empty/null: `""`, `null`, `undefined`
- Reserved keywords: `SELECT`, `DROP`, `TABLE`
- Too long: 129+ character names
- Invalid start: `123table`, `-users`

**3. Operator Validation Tests** (15 tests):
- All valid operators: `=`, `!=`, `>`, etc.
- Invalid operators: `LIKE%`, `=OR`, `!=;DROP`
- Case variations: `LIKE` vs `like` (should normalize)

**4. Integration Tests** (10 tests):
- Full queries with all validated fields
- Error propagation in complex queries
- Performance with validation enabled

**5. Edge Cases** (10 tests):
- Unicode characters in identifiers
- Very long but valid identifiers (127 chars)
- Nested qualified names
- Whitespace handling

## Dependencies

- `StorageError` and `StorageErrorCode` (already exists)
- `SemanticQuery` interface (no changes needed)
- Test framework (Vitest) for comprehensive test coverage

## Migration Strategy

### Phase 1: Add Validation (Non-Breaking)
1. Implement validation methods
2. Add comprehensive tests
3. **Initially throw errors only in debug mode** (configurable)
4. Log validation failures in production

### Phase 2: Enable by Default
1. Monitor logs for any legitimate queries failing validation
2. Adjust validation rules if needed
3. Enable throwing by default
4. Update documentation

### Phase 3: Strict Mode (Optional)
1. Add even stricter validation (e.g., max identifier length: 64)
2. Make configurable via `DuckDBSemanticQueryBuilderDeps`

## Risks & Mitigations

### Risk 1: Breaking Existing Queries
**Mitigation**:
- Add feature flag: `enableStrictValidation` (default: false initially)
- Comprehensive testing before enabling by default
- Clear migration guide

### Risk 2: Performance Impact
**Mitigation**:
- Validation is simple regex + set lookup (very fast)
- Benchmark to ensure < 1ms overhead
- Cache validation results if needed

### Risk 3: False Positives
**Mitigation**:
- Start with permissive rules
- Allow escape hatch for trusted queries
- Gather feedback before strict enforcement

## Related Issues

- Original code review finding: SQL Injection Vulnerability (Critical)
- Related to: TECH-004 (Error Message Sanitization)
- Depends on: None
- Blocks: Security audit signoff

## Success Metrics

- [ ] Zero SQL injection vulnerabilities in DuckDBSemanticQueryBuilder
- [ ] All existing tests passing (329/329)
- [ ] 80+ new validation tests added
- [ ] < 1ms validation overhead per query
- [ ] Clear error messages for developers
- [ ] Documentation updated with validation rules

## References

- Code review report: `/context-network/tasks/completed/2025-11-01-refactor-004-phase-2-semantic-query-extraction.md`
- SQL injection prevention: OWASP Top 10 (A03:2021)
- DuckDB identifier rules: https://duckdb.org/docs/sql/dialect/keywords_and_identifiers
