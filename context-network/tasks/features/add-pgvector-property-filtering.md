# Task: Add JSONB Containment Property Filtering to PgVector Pattern Matching

**Status**: 📋 Planned
**Priority**: Medium
**Effort**: Small (1-2 hours)
**Created**: 2025-11-15
**Discovered**: Code TODO scan

## Context

`PgVectorStorageAdapter.patternMatch()` currently filters nodes by type but doesn't support property filtering. There's a TODO comment indicating that JSONB containment operators are needed for efficient property matching.

**Location**: `app/src/storage/adapters/PgVectorStorageAdapter.ts` (in `patternMatch` method)

**Current Code**:
```typescript
if (pattern.nodeFilter.types && pattern.nodeFilter.types.length > 0) {
  includesPath = nodes.some(n => pattern.nodeFilter!.types!.includes(n.type));
}
// TODO: Property filtering on nodes - requires JSONB containment operator (@>) for efficient matching
```

## Problem

Pattern matching queries can filter by node type but not by node properties. This limits query expressiveness:

```typescript
// Currently works
const results = await storage.patternMatch({
  nodeFilter: { types: ['function', 'class'] }
})

// Doesn't work yet
const results = await storage.patternMatch({
  nodeFilter: {
    types: ['function'],
    properties: { visibility: 'public', async: true }  // ❌ Not implemented
  }
})
```

Users must:
- Fetch all nodes of a type
- Filter in application code (inefficient)
- Miss database-level optimizations

## Recommended Solution

Use PostgreSQL's JSONB containment operator (`@>`) for efficient property filtering:

```typescript
// In patternMatch() method

if (pattern.nodeFilter?.properties) {
  // Build property filter SQL
  const propertyFilter = `properties @> $${paramIndex}::jsonb`
  whereClauses.push(propertyFilter)
  params.push(JSON.stringify(pattern.nodeFilter.properties))
  paramIndex++
}
```

**Example Query Generated**:
```sql
SELECT * FROM nodes
WHERE type = ANY($1::text[])
  AND properties @> $2::jsonb;
-- params: [['function', 'class'], '{"visibility":"public","async":true}']
```

The `@>` operator checks if the left JSONB value contains the right JSONB value, using GIN indexes for efficiency.

## Implementation Steps

1. **Update PatternFilter Interface** (if needed)
   - Verify `nodeFilter.properties` is in type definition
   - Add if missing: `properties?: Record<string, any>`

2. **Add Property Filtering Logic**
   - In `patternMatch()` method, after type filtering
   - Build JSONB containment WHERE clause
   - Add parameters safely (parameterized query)

3. **Handle Edge Cases**
   - Empty properties object (skip filter)
   - Null/undefined properties (skip filter)
   - Nested property filtering (JSONB supports this)

4. **Add GIN Index** (optional but recommended)
   - Create GIN index on properties column if not exists
   - Speeds up `@>` operator significantly
   ```sql
   CREATE INDEX IF NOT EXISTS idx_nodes_properties
   ON nodes USING GIN (properties);
   ```

5. **Update Tests**
   - Test property filtering with single property
   - Test with multiple properties
   - Test with nested properties
   - Test combined type + property filters
   - Test empty/null properties (should not crash)

6. **Remove TODO Comment**

## Acceptance Criteria

- [ ] Can filter nodes by properties in `patternMatch()`
- [ ] Uses JSONB containment operator (`@>`)
- [ ] Parameterized queries (SQL injection safe)
- [ ] Works with nested properties
- [ ] Handles empty/null properties gracefully
- [ ] Tests verify all property filter scenarios
- [ ] No performance regression
- [ ] TODO comment removed
- [ ] GIN index created (if beneficial)

## Files to Modify

- `app/src/storage/adapters/PgVectorStorageAdapter.ts` - Add property filtering
- `app/src/storage/interfaces/PatternFilter.ts` - Verify interface (may already exist)
- `app/tests/unit/storage/PgVectorStorageAdapter.test.ts` - Add tests

## Test Plan

```typescript
describe('PgVectorStorageAdapter.patternMatch - Property Filtering', () => {
  it('should filter by single property', async () => {
    const pattern = {
      nodeFilter: {
        types: ['function'],
        properties: { visibility: 'public' }
      }
    }
    const results = await adapter.patternMatch(pattern)

    results.forEach(r => {
      expect(r.properties.visibility).toBe('public')
    })
  })

  it('should filter by multiple properties', async () => {
    const pattern = {
      nodeFilter: {
        properties: { visibility: 'public', async: true }
      }
    }
    const results = await adapter.patternMatch(pattern)

    results.forEach(r => {
      expect(r.properties.visibility).toBe('public')
      expect(r.properties.async).toBe(true)
    })
  })

  it('should filter by nested properties', async () => {
    const pattern = {
      nodeFilter: {
        properties: { metadata: { author: 'alice' } }
      }
    }
    const results = await adapter.patternMatch(pattern)

    results.forEach(r => {
      expect(r.properties.metadata.author).toBe('alice')
    })
  })

  it('should combine type and property filters', async () => {
    const pattern = {
      nodeFilter: {
        types: ['function'],
        properties: { visibility: 'public' }
      }
    }
    const results = await adapter.patternMatch(pattern)

    results.forEach(r => {
      expect(r.type).toBe('function')
      expect(r.properties.visibility).toBe('public')
    })
  })

  it('should handle empty properties filter', async () => {
    const pattern = {
      nodeFilter: { properties: {} }
    }
    // Should not crash, returns all nodes
    const results = await adapter.patternMatch(pattern)
    expect(results).toBeDefined()
  })
})
```

## Performance Considerations

**With GIN Index**:
- JSONB containment queries are very fast (O(log n))
- Index size is reasonable (typically 2-3x data size)
- Recommended for production

**Without GIN Index**:
- Still works but sequential scan required
- Acceptable for small datasets (<10k nodes)
- Not recommended for large datasets

**Recommendation**: Create GIN index in schema initialization.

## PostgreSQL Version Requirements

- PostgreSQL 9.4+ (JSONB introduced)
- pgvector extension compatible (already using it)
- No additional extensions needed

## Alternative Approaches Considered

### 1. **Client-Side Filtering** (current workaround)
```typescript
const allNodes = await storage.patternMatch({ nodeFilter: { types: ['function'] } })
const filtered = allNodes.filter(n => n.properties.visibility === 'public')
```
**Drawbacks**:
- Fetches all data then filters
- Can't use database indexes
- Network overhead

### 2. **Custom SQL in Each Caller**
```typescript
await storage.executeSQL(
  'SELECT * FROM nodes WHERE type = $1 AND properties @> $2',
  ['function', '{"visibility":"public"}']
)
```
**Drawbacks**:
- Bypasses pattern matching abstraction
- Duplicates SQL generation logic
- Less type-safe

## Priority Justification

**Medium Priority** because:
- Affects query performance on large datasets
- Common use case (filter by properties)
- Straightforward implementation
- Currently has workaround (client-side filter)

**Not High Priority** because:
- Not blocking any features
- Workaround exists
- Small datasets work fine without it

**Increase Priority If**:
- Users report slow queries
- Dataset size grows significantly (>10k nodes)
- Complex property filtering becomes common

## Related

- **Original TODO**: `app/src/storage/adapters/PgVectorStorageAdapter.ts` (in `patternMatch`)
- **PostgreSQL JSONB Docs**: https://www.postgresql.org/docs/current/datatype-json.html
- **JSONB Operators**: https://www.postgresql.org/docs/current/functions-json.html
- **Pattern Matching**: Existing implementation in same file
- **Related Task**: Complete PrimaryStorage methods (already done)
