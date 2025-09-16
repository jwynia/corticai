# Task: Implement Parameterized Queries for Kuzu Operations

## Priority: HIGH (Security)

## Context
From security review on 2025-09-16: Current implementation builds Cypher queries using string concatenation, creating potential injection vulnerabilities. While `escapeString()` provides some protection, parameterized queries are the industry standard for preventing injection attacks.

## Current Problem
All three graph operations build queries like:
```javascript
const query = `MATCH (start:Entity {id: '${escapedStartNode}'})...`
```

Even with escaping, this pattern is vulnerable to sophisticated injection attacks.

## Acceptance Criteria
- [ ] Research Kuzu's support for parameterized queries in current version
- [ ] If supported, implement parameterized query pattern
- [ ] If not supported, implement query builder with comprehensive validation
- [ ] Add security tests for injection attempts
- [ ] Update all graph operations to use new pattern
- [ ] Document security considerations

## Technical Investigation Needed
1. Check if Kuzu v0.6.1 supports parameterized queries
2. Research Kuzu roadmap for parameterized query support
3. Evaluate alternative graph databases if security is critical

## Implementation Approach

### If Parameterized Queries Supported:
```typescript
const query = `
  MATCH path = (start:Entity {id: $startNode})
        -[r*1..$maxDepth]->
        (end:Entity)
  WHERE r.type IN $edgeTypes
  RETURN path
`
const params = {
  startNode: pattern.startNode,
  maxDepth: pattern.maxDepth,
  edgeTypes: pattern.edgeTypes
}
await connection.query(query, params)
```

### If Not Supported, Build Query Builder:
```typescript
class KuzuQueryBuilder {
  private validateIdentifier(id: string): void {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('Invalid identifier')
    }
  }

  matchNode(label: string, id: string): this {
    this.validateIdentifier(id)
    // Build query safely
  }
}
```

## Security Testing Required
- Test with various injection patterns
- Test with Unicode characters
- Test with nested quotes and escapes
- Performance test validation overhead

## Dependencies
- Kuzu library capabilities
- May require library upgrade or replacement

## Effort Estimate
Large (8-12 hours) - Investigation, implementation, comprehensive testing

## Files to Modify
- `/app/src/storage/adapters/KuzuStorageAdapter.ts`
- Create `/app/src/storage/query/KuzuQueryBuilder.ts` if needed
- Security test suite

## Risk Assessment
- **Current Risk**: Medium-High (injection possible with sophisticated attacks)
- **After Mitigation**: Low (industry-standard protection)