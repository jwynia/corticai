# TECH-004: Sanitize Error Messages in Storage Adapters

**Date Created**: 2025-11-01
**Type**: Security / Technical Debt
**Priority**: Medium
**Complexity**: Small
**Effort**: 1-2 hours
**Status**: Planned

## Problem

Storage adapters currently expose raw database error messages to callers, which can leak sensitive information about:
- Internal database structure (table names, column names)
- File paths and system architecture
- SQL query structure
- Implementation details

**Current Code** (from code review):
```typescript
// UNSAFE: Exposes raw error details
catch (error) {
  return {
    data: [],
    metadata: { /* ... */ },
    errors: [(error as Error).message]  // ← Leaks internal details
  }
}
```

**Example Leaked Information**:
- `Table "internal_users_v2" does not exist` → Reveals internal naming
- `Column "hashed_password" not found` → Reveals schema details
- `Syntax error at line 42` → Reveals query structure

## Acceptance Criteria

### Must Have
- [ ] Sanitize error messages before exposing to callers
- [ ] Remove sensitive patterns (table names, column names, line numbers)
- [ ] Log full error details internally for debugging
- [ ] Maintain error usefulness for developers
- [ ] Add tests for error message sanitization (20+ cases)
- [ ] Zero test regressions

### Should Have
- [ ] Categorize errors by type (connection, syntax, permission, etc.)
- [ ] Provide actionable error messages without internals
- [ ] Support debug mode that exposes full errors (development only)

### Could Have
- [ ] Error message templates for common cases
- [ ] Structured error codes for programmatic handling
- [ ] Error tracking/monitoring integration

## Proposed Design

### 1. Error Message Sanitizer

```typescript
/**
 * Sanitizes database error messages to prevent information leakage
 *
 * Removes:
 * - Table and column names
 * - File paths
 * - Line numbers
 * - SQL snippets
 *
 * Preserves:
 * - Error category (syntax, connection, permission)
 * - Actionable guidance
 */
private sanitizeErrorMessage(error: Error, context?: string): string {
  const message = error.message

  // Log full error internally for debugging
  if (this.debug) {
    this.log(`${this.LOG_PREFIX} Full error in ${context || 'query'}: ${message}`)
  }

  // Remove table names
  let sanitized = message.replace(
    /table\s+"[^"]+"/gi,
    'table "<redacted>"'
  )

  // Remove column names
  sanitized = sanitized.replace(
    /column\s+"[^"]+"/gi,
    'column "<redacted>"'
  )

  // Remove file paths
  sanitized = sanitized.replace(
    /\/[\w\/-]+\.(db|duckdb|parquet)/gi,
    '<redacted_path>'
  )

  // Remove line numbers
  sanitized = sanitized.replace(
    /at line \d+/gi,
    'in query'
  )

  // Remove SQL snippets
  sanitized = sanitized.replace(
    /'[^']{20,}'/g,
    '<sql_query>'
  )

  // Categorize common errors with helpful messages
  if (message.includes('does not exist')) {
    return 'Resource not found. Please verify the query targets valid entities.'
  }

  if (message.includes('permission denied') || message.includes('access denied')) {
    return 'Permission denied. Check database access rights.'
  }

  if (message.includes('syntax error')) {
    return 'Query syntax error. Please verify the query structure.'
  }

  if (message.includes('connection')) {
    return 'Database connection error. Please retry or check database availability.'
  }

  // Return sanitized message for other cases
  return sanitized || 'An error occurred during query execution.'
}
```

### 2. Error Context Tracking

```typescript
/**
 * Build error result with sanitized message and context
 */
private buildErrorResult<R>(
  startTime: number,
  rowsScanned: number,
  error: unknown,
  context?: string
): SemanticQueryResult<R> {
  const sanitizedError = this.sanitizeErrorMessage(
    error as Error,
    context
  )

  return {
    data: [],
    metadata: {
      executionTime: Date.now() - startTime,
      rowsScanned,
      fromCache: false
    },
    errors: [sanitizedError]
  }
}
```

### 3. Usage in Methods

```typescript
async executeSemanticQuery<R = any>(
  semanticQuery: SemanticQuery
): Promise<SemanticQueryResult<R>> {
  const startTime = Date.now()
  let rowsScanned = 0

  try {
    // ... query execution
  } catch (error) {
    return this.buildErrorResult(
      startTime,
      rowsScanned,
      error,
      'semantic query execution'  // ← Context for debugging
    )
  }
}
```

## Test Plan

### Test Categories

**1. Sensitive Pattern Removal** (15 tests):
- Table names: `table "users"` → `table "<redacted>"`
- Column names: `column "password"` → `column "<redacted>"`
- File paths: `/var/db/data.duckdb` → `<redacted_path>`
- Line numbers: `at line 42` → `in query`
- SQL snippets: Long SQL → `<sql_query>`

**2. Error Categorization** (8 tests):
- "does not exist" → "Resource not found..."
- "permission denied" → "Permission denied..."
- "syntax error" → "Query syntax error..."
- "connection" → "Database connection error..."

**3. Debug Mode** (5 tests):
- Full errors logged when debug=true
- Sanitized errors returned even in debug mode
- Log output includes full context

**4. Edge Cases** (7 tests):
- Empty error message
- Error without .message property
- Very long error messages (> 1000 chars)
- Unicode characters in errors
- Nested error objects

## Implementation Strategy

### Phase 1: Add Sanitization (Non-Breaking)
1. Implement `sanitizeErrorMessage()` method
2. Update `buildErrorResult()` to use sanitization
3. Add comprehensive tests
4. Verify in debug mode logs still show full errors

### Phase 2: Apply Across Adapters
1. Update `DuckDBSemanticQueryBuilder`
2. Update `DuckDBParquetOperations`
3. Consider applying to other storage adapters

### Phase 3: Monitor & Tune
1. Review logs for patterns we missed
2. Adjust sanitization rules
3. Add more category-specific messages

## Risks & Mitigations

### Risk 1: Over-Sanitization (Unhelpful Errors)
**Mitigation**:
- Preserve error categories
- Provide actionable guidance
- Debug mode shows full details for development

### Risk 2: Missing Sensitive Patterns
**Mitigation**:
- Comprehensive test coverage
- Regular security reviews
- Allowlist approach for what to include vs blacklist

### Risk 3: Performance Overhead
**Mitigation**:
- Regex operations are fast (microseconds)
- Only applied on error path (not hot path)
- Benchmark to confirm < 1ms impact

## Dependencies

- Existing error handling in `buildErrorResult()`
- Debug logging infrastructure
- Test framework

## Related Issues

- Original code review finding: Error Information Leakage (High Priority)
- Related to: TECH-003 (Input Validation)
- Blocks: Security audit signoff

## Success Metrics

- [ ] No sensitive information in error messages
- [ ] Errors still useful for developers
- [ ] All tests passing (329/329)
- [ ] 35+ new error sanitization tests
- [ ] Debug logs contain full error details
- [ ] < 1ms sanitization overhead

## References

- Code review report: Code review from 2025-11-01
- OWASP: Information Exposure Through Error Messages
- Related task: TECH-003 (Input Validation)
