# Fix SQL Injection Vulnerabilities in PgVector Graph Operations

## Task ID
IMPROVE-PGVECTOR-001

## Status
📋 PLANNED

## Created
2025-11-03

## Parent Task
[[pgvector-storage-backend]] - Phase 2 code review findings

## Priority
🔴 CRITICAL

## One-liner
Add input validation and sanitization to prevent SQL injection in traverse() and shortestPath() methods

## Context

### Security Issue
String interpolation of user-controlled values directly into SQL queries creates SQL injection vulnerabilities:

**Location 1**: `PgVectorStorageAdapter.ts:419` - `maxDepth` parameter
```typescript
const maxDepth = pattern.maxDepth || PgVectorStorageAdapter.DEFAULT_TRAVERSAL_DEPTH;
// Later interpolated into SQL:
WHERE cn.depth < ${maxDepth}  // UNSAFE - not parameterized
```

**Location 2**: `PgVectorStorageAdapter.ts:427-435` - `directionJoin` string
```typescript
let directionJoin = '';
if (pattern.direction === 'outgoing') {
  directionJoin = 'e.from_node = ps.id AND next_node.id = e.to_node';
} else if (pattern.direction === 'incoming') {
  directionJoin = 'e.to_node = ps.id AND next_node.id = e.from_node';
} else {
  directionJoin = '(e.from_node = ps.id ...) OR (...)';
}
// Later interpolated:
JOIN ${edgesTable} e ON (${directionJoin})  // UNSAFE
```

### Attack Vectors
1. **maxDepth manipulation**: If passed from external input, attacker could inject SQL
2. **direction enum bypass**: If TypeScript type checking is bypassed at runtime, malicious strings could be injected

## Acceptance Criteria

### Input Validation
- [ ] Validate `pattern.direction` against whitelist: `['outgoing', 'incoming', 'both', undefined]`
- [ ] Validate `pattern.maxDepth` is a safe integer within bounds
- [ ] Throw `StorageError` with `INVALID_INPUT` code for invalid inputs
- [ ] Document allowed input ranges in JSDoc comments

### Safe SQL Construction
- [ ] **Option A**: Parameterize maxDepth (use `$N` placeholder)
- [ ] **Option B**: Sanitize maxDepth with `parseInt()` and bound check
- [ ] Use conditional SQL generation for direction (don't interpolate user strings)

### Testing
- [ ] Unit tests for invalid direction values
- [ ] Unit tests for out-of-bounds maxDepth
- [ ] Unit tests for SQL injection attempts (malicious strings)
- [ ] Security test suite for all graph methods

## Implementation Plan

### Step 1: Add Input Validation Helper
```typescript
private validateTraversalPattern(pattern: TraversalPattern): void {
  // Validate direction
  const validDirections = ['outgoing', 'incoming', 'both', undefined];
  if (pattern.direction !== undefined && !validDirections.includes(pattern.direction)) {
    throw new StorageError(
      `Invalid direction: "${pattern.direction}". Must be one of: ${validDirections.join(', ')}`,
      StorageErrorCode.INVALID_INPUT,
      { pattern }
    );
  }

  // Validate and sanitize maxDepth
  if (pattern.maxDepth !== undefined) {
    const depth = parseInt(String(pattern.maxDepth), 10);
    if (isNaN(depth) || depth < 0 || depth > PgVectorStorageAdapter.ABSOLUTE_MAX_DEPTH) {
      throw new StorageError(
        `Invalid maxDepth: "${pattern.maxDepth}". Must be 0-${PgVectorStorageAdapter.ABSOLUTE_MAX_DEPTH}`,
        StorageErrorCode.INVALID_INPUT,
        { pattern }
      );
    }
  }
}
```

### Step 2: Sanitize maxDepth
```typescript
// In traverse() and shortestPath():
const maxDepth = Math.min(
  Math.max(0, parseInt(String(pattern.maxDepth || PgVectorStorageAdapter.DEFAULT_TRAVERSAL_DEPTH), 10)),
  PgVectorStorageAdapter.ABSOLUTE_MAX_DEPTH
);
```

### Step 3: Use Parameterized Direction
Instead of string interpolation, use conditional SQL generation or pass direction as parameter:
```typescript
// Build base query with placeholder
const directionCondition = this.buildDirectionCondition(pattern.direction || 'both');

// In buildDirectionCondition:
private buildDirectionCondition(direction: 'outgoing' | 'incoming' | 'both'): string {
  switch (direction) {
    case 'outgoing': return 'e.from_node = ps.id AND next_node.id = e.to_node';
    case 'incoming': return 'e.to_node = ps.id AND next_node.id = e.from_node';
    case 'both': return '(e.from_node = ps.id AND next_node.id = e.to_node) OR (e.to_node = ps.id AND next_node.id = e.from_node)';
  }
}
```

### Step 4: Add Security Tests
```typescript
it('should reject invalid direction values', async () => {
  const pattern: any = {
    startNode: 'node-1',
    direction: 'UNION SELECT * FROM users--' // SQL injection attempt
  };

  await expect(adapter.traverse(pattern)).rejects.toThrow(StorageError);
});

it('should bound maxDepth to safe values', async () => {
  const pattern: any = {
    startNode: 'node-1',
    maxDepth: 999999999 // Attempt to cause performance issues
  };

  // Should either reject or clamp to ABSOLUTE_MAX_DEPTH
  await expect(adapter.traverse(pattern)).rejects.toThrow();
});
```

## Dependencies
- Requires `StorageErrorCode.INVALID_INPUT` error code (may need to add to enum)

## References
- OWASP SQL Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- Parent task: [[pgvector-storage-backend]]
- Code location: `app/src/storage/adapters/PgVectorStorageAdapter.ts:413-548`

## Estimated Effort
2-3 hours (validation logic + tests)

## Notes
This is a **CRITICAL** security issue but requires careful design to avoid breaking existing functionality. The validation strategy should be discussed before implementation.
