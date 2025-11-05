# PgVector SQL Injection Prevention

## Task ID
SECURITY-PGVECTOR-001

## Status
🔴 URGENT - Not Started

## Created
2025-11-04

## Priority
**CRITICAL** - Security vulnerability

## One-liner
Fix SQL injection vulnerabilities in PgVectorStorageAdapter SemanticStorage query methods

## Context

### Security Issue
Code review identified critical SQL injection vulnerabilities in Phase 3 SemanticStorage implementation:
1. `buildSQLFromQuery()` - Direct string interpolation of filter values
2. `createSearchIndex()` - Unvalidated field names in SQL
3. Materialized view operations - Unvalidated view names

### Affected Code
- **File**: `/workspaces/corticai/app/src/storage/adapters/PgVectorStorageAdapter.ts`
- **Lines**: 1330-1333 (buildSQLFromQuery), 1152-1153 (createSearchIndex), 1194-1258 (materialized views)

### Attack Vectors

**1. Filter Value Injection**:
```typescript
// Current vulnerable code (line 1330-1333)
const whereConditions = query.where.map(filter =>
  `${filter.field} ${filter.operator} '${filter.value}'`  // ❌ No parameterization
).join(' AND ');

// Attack example:
{
  field: "id",
  operator: "=",
  value: "1' OR '1'='1"
}
// Results in: WHERE id = '1' OR '1'='1'
```

**2. Field Name Injection**:
```typescript
// Current vulnerable code (line 1152)
const tsvectorExpression = fields.map(field =>
  `to_tsvector('english', COALESCE(${field}::text, ''))`  // ❌ No validation
).join(' || ');

// Attack example:
createSearchIndex('users', ['name); DROP TABLE users; --'])
```

**3. View Name Injection**:
```typescript
// Current vulnerable code (line 1194)
const qualifiedViewName = `${this.config.schema}.${view.name}`;  // ❌ No validation
```

## Acceptance Criteria

### Required Changes

**1. Implement Parameterized Queries in `buildSQLFromQuery()`**
- [ ] Change return type to `{ sql: string; params: any[] }`
- [ ] Use PostgreSQL parameters (`$1`, `$2`, etc.) for all filter values
- [ ] Validate field names against whitelist pattern: `/^[a-zA-Z_][a-zA-Z0-9_]*$/`
- [ ] Validate operators against explicit whitelist: `['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE', 'NOT LIKE']`
- [ ] Update all callers to handle `{ sql, params }` return value

**2. Add Identifier Validation**
- [ ] Create `validateIdentifier(name: string, type: string): void` method
- [ ] Pattern: `/^[a-zA-Z_][a-zA-Z0-9_]*$/`
- [ ] Throw `StorageError` with `INVALID_INPUT` code for invalid names
- [ ] Apply to: table names, field names, view names, index names

**3. Update Affected Methods**
- [ ] `createSearchIndex()` - Validate all field names before SQL construction
- [ ] `createMaterializedView()` - Validate view name
- [ ] `refreshMaterializedView()` - Validate view name
- [ ] `queryMaterializedView()` - Validate view name
- [ ] `dropMaterializedView()` - Validate view name
- [ ] `listMaterializedViews()` - Already safe (no user input in query)

**4. Update Tests**
- [ ] Add SQL injection attack tests for `buildSQLFromQuery()`
- [ ] Test invalid field names in `createSearchIndex()`
- [ ] Test invalid view names in materialized view operations
- [ ] Verify existing tests still pass

**5. Security Testing**
- [ ] Test with malicious input: `'; DROP TABLE users; --`
- [ ] Test with OR injection: `' OR '1'='1`
- [ ] Test with field name injection: `name); DROP TABLE users; --`
- [ ] Test with view name injection: `test_view; DROP TABLE users; --`
- [ ] Verify parameterized queries are used in all cases

## Implementation Plan

### Phase 1: Identifier Validation (30 minutes)
```typescript
/**
 * Validate SQL identifier (table, column, view, index names)
 * @throws StorageError if name contains invalid characters
 */
private validateIdentifier(name: string, type: string): void {
  const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!VALID_IDENTIFIER.test(name)) {
    throw new StorageError(
      `Invalid ${type} name: "${name}". Must be alphanumeric with underscores, starting with letter or underscore.`,
      StorageErrorCode.INVALID_INPUT,
      { name, type }
    );
  }
}
```

### Phase 2: Fix buildSQLFromQuery (1-2 hours)
```typescript
private buildSQLFromQuery(query: SemanticQuery): { sql: string; params: any[] } {
  const tableName = this.qualifiedTableName(query.from);
  const params: any[] = [];
  let paramIndex = 1;

  const selectClause = query.select && query.select.length > 0
    ? query.select.join(', ')
    : '*';

  let sql = `SELECT ${selectClause} FROM ${tableName}`;

  // Parameterized WHERE clause
  if (query.where && query.where.length > 0) {
    const VALID_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE', 'NOT LIKE'];

    const whereConditions = query.where.map(filter => {
      // Validate field name
      this.validateIdentifier(filter.field, 'field');

      // Validate operator
      if (!VALID_OPERATORS.includes(filter.operator)) {
        throw new StorageError(
          `Invalid operator: "${filter.operator}"`,
          StorageErrorCode.INVALID_INPUT,
          { operator: filter.operator }
        );
      }

      // Use parameterized value
      params.push(filter.value);
      return `${filter.field} ${filter.operator} $${paramIndex++}`;
    }).join(' AND ');

    sql += ` WHERE ${whereConditions}`;
  }

  // GROUP BY, ORDER BY, LIMIT, OFFSET with validation
  if (query.groupBy && query.groupBy.length > 0) {
    query.groupBy.forEach(field => this.validateIdentifier(field, 'groupBy field'));
    sql += ` GROUP BY ${query.groupBy.join(', ')}`;
  }

  if (query.orderBy && query.orderBy.length > 0) {
    query.orderBy.forEach(sort => this.validateIdentifier(sort.field, 'orderBy field'));
    const orderClauses = query.orderBy.map(sort =>
      `${sort.field} ${sort.direction || 'ASC'}`
    ).join(', ');
    sql += ` ORDER BY ${orderClauses}`;
  }

  if (query.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(query.limit);
  }

  if (query.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(query.offset);
  }

  return { sql, params };
}
```

### Phase 3: Update Callers (30 minutes)
- Update `createMaterializedView()` to handle `{ sql, params }`
- Update `queryMaterializedView()` if it uses `buildSQLFromQuery()`

### Phase 4: Add Validation to All Methods (1 hour)
- `createSearchIndex()`: Validate all field names
- All materialized view methods: Validate view names

### Phase 5: Security Tests (1 hour)
- Write comprehensive SQL injection attack tests
- Verify all attack vectors are blocked

## Estimated Effort
**Total: 4-5 hours**

## Dependencies
- None (can be done immediately)
- Should be completed before Phase 4 (Vector Operations)

## References
- Code review: Security issues #1-3
- OWASP SQL Injection: https://owasp.org/www-community/attacks/SQL_Injection
- PostgreSQL parameterized queries: https://node-postgres.com/features/queries

## Risks & Mitigations

### Risk: Breaking Existing Functionality
**Mitigation**: Comprehensive test coverage exists (110 tests), run all tests after each change

### Risk: Performance Impact
**Mitigation**: Parameterized queries are actually MORE efficient than string concatenation

### Risk: Identifier Validation Too Strict
**Mitigation**: Pattern allows standard PostgreSQL identifiers (alphanumeric + underscore)

## Success Criteria
- [ ] Zero SQL injection vulnerabilities
- [ ] All 110 existing tests pass
- [ ] New security tests demonstrate attack prevention
- [ ] TypeScript compilation passes (0 errors)
- [ ] Code review passes
- [ ] No performance regression

## Follow-up Tasks
- Consider adding query logging for security audit trail
- Consider rate limiting for query operations
- Document security best practices in architecture docs
