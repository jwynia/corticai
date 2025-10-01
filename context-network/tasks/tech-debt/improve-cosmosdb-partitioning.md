# Improve CosmosDB Partition Key Distribution Algorithm

**Created**: 2025-10-01
**Priority**: Medium
**Effort**: Medium (30-60 minutes)
**Type**: Performance / Scalability

## Original Recommendation

From code review of `CosmosDBStorageAdapter.ts:728`:

Current partition key implementation uses a weak hash function with only 10 partitions:

```typescript
private getPartitionKeyValue(key: string): string {
  const hash = key.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  return `partition_${hash % 10}`  // 10 partitions
}
```

## Problems

1. **Poor hash distribution**: Sum of character codes is not well-distributed
2. **Limited scalability**: Only 10 partitions limits horizontal scaling
3. **Potential hotspots**: Uneven distribution can cause performance bottlenecks
4. **No business logic consideration**: Simple modulo doesn't account for access patterns

## Why Deferred

- Requires performance benchmarking before/after
- Should analyze current partition distribution patterns
- May need data migration strategy
- Medium risk - could affect existing data distribution

## Proposed Solution

```typescript
private getPartitionKeyValue(key: string): string {
  // Use proper hash function for better distribution
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  // Use more partitions for better scalability (100 instead of 10)
  return `partition_${Math.abs(hash) % 100}`
}
```

## Acceptance Criteria

- [ ] Implement improved hash function with better distribution
- [ ] Increase partition count to 100+ for better scalability
- [ ] Benchmark current vs. new distribution on test data
- [ ] Document partition strategy in code comments
- [ ] Verify no breaking changes to existing data access
- [ ] Consider making partition count configurable

## Dependencies

- Access to production-like data for testing
- Performance benchmarking tools
- Understanding of current data access patterns

## Related

- [[tech-debt]] - Technical debt backlog
- [[storage-architecture]] - Storage system architecture
