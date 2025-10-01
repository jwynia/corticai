# Optimize Relationship Query Performance

**Created**: 2025-10-01
**Priority**: High
**Effort**: Medium (45-60 minutes)
**Type**: Performance Optimization

## Original Recommendation

From code review of `LocalStorageProvider.ts:87-105`:

Current implementation performs full table scan for every relationship query:

```typescript
async getRelationships(entityId: string): Promise<T[]> {
  const relationships: T[] = []
  try {
    for await (const [key, value] of (this as any).entries()) {
      const entity = value as any
      if (entity.from === entityId || entity.to === entityId) {
        relationships.push(value)
      }
    }
  } catch (error) {
    // ...
  }
  return relationships
}
```

## Problems

1. **O(n) complexity**: Scans all entries for every query
2. **No indexing**: Doesn't leverage Kuzu's graph database capabilities
3. **Performance degradation**: Gets worse as data grows
4. **Inefficient**: Kuzu is designed for exactly this type of query

## Why Deferred

- Requires understanding of Kuzu's native graph query capabilities
- Should benchmark current performance to establish baseline
- Medium complexity - needs proper implementation and testing
- Risk of breaking existing functionality

## Analysis

The irony: We're using a **graph database** (Kuzu) but implementing relationship queries with brute-force iteration instead of graph traversal!

### Current Approach
```
1. Iterate ALL entries in storage
2. Check each one: entity.from === id || entity.to === id
3. Collect matches
```
**Time Complexity**: O(n) where n = total entities

### Proper Graph Approach
```
1. Use Kuzu's MATCH query: MATCH (e:Entity {id: $id})-[r]-(related:Entity)
2. Return relationships
```
**Time Complexity**: O(degree) where degree = number of connected nodes

## Proposed Solution

### Step 1: Use Kuzu's Native Traversal

```typescript
async getRelationships(entityId: string): Promise<T[]> {
  // Use the base class's traverse() method which already exists!
  const traversalOptions = {
    relationshipPattern: '-[r:Relationship]-', // Bidirectional
    maxDepth: 1, // Only immediate relationships
    includeEdgeData: true
  }

  const paths = await (this as any).traverse(entityId, traversalOptions)

  // Extract relationships from paths
  return paths.map(path => path.edges).flat()
}
```

### Step 2: Or Use Direct Kuzu Query

```typescript
async getRelationships(entityId: string): Promise<T[]> {
  const query = this.queryBuilder.buildGetEdgesQuery(entityId)
  const result = await this.queryBuilder.executeSecureQuery(query)

  // Process result into relationship objects
  return this.processRelationshipResults(result)
}
```

## Acceptance Criteria

- [ ] Replace full-scan iteration with Kuzu graph query
- [ ] Benchmark performance improvement (should be significant)
- [ ] Verify all relationship types are returned correctly
- [ ] Handle bidirectional relationships properly
- [ ] Add tests for relationship queries
- [ ] Document the query strategy in code comments
- [ ] Ensure no regression in existing functionality

## Performance Goals

**Current**: O(n) - scans all entities
**Target**: O(degree) - only visits connected nodes

**Example Impact**:
- 10,000 entities, entity has 5 relationships
- Current: 10,000 iterations
- Target: 5 iterations
- **Improvement: 2000x faster**

## Files to Modify

- `src/storage/providers/LocalStorageProvider.ts` (lines 87-106)
- May need to review `KuzuStorageAdapter` to ensure graph methods are available

## Dependencies

- Understanding of Kuzu's graph query capabilities
- Access to KuzuStorageAdapter's graph methods
- Test data for benchmarking

## Testing Strategy

1. **Unit tests**: Verify correct relationships returned
2. **Performance tests**: Benchmark before/after
3. **Edge cases**:
   - Entity with no relationships
   - Entity with many relationships
   - Bidirectional relationships
   - Self-referential relationships

## Related

- [[kuzu-graph-queries]] - Kuzu query patterns
- [[performance-optimization]] - Performance improvements
- [[storage-architecture]] - Storage system design

## Notes

The fix for this is documented in the code (line 85):
> "TODO: Migrate to Kuzu's native graph traversal for better performance"

This is a perfect example of using the right tool for the job - we have a graph database, let's use it like one!
