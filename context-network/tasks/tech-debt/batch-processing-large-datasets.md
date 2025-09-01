# Task: Add Batch Processing for Large Entity Arrays

## Priority: Low

## Context
The `indexEntities()` method processes all entities synchronously, which could cause blocking with very large arrays. Adding batch processing would improve performance and prevent event loop blocking.

## Original Recommendation
"Potential memory issue with large datasets - indexEntities() processes all entities synchronously"

## Why Deferred
- Current implementation handles 10,000+ entities adequately
- Not a pressing performance issue
- Requires API design decisions (async vs sync)
- Low risk in current usage patterns

## Acceptance Criteria
- [ ] Batch processing option available for large entity arrays
- [ ] Non-blocking async processing for better responsiveness
- [ ] Backward compatibility maintained
- [ ] Clear documentation on when to use batch vs regular
- [ ] Performance improvement measurable for large datasets

## Technical Approach

### Proposed Implementation
```typescript
/**
 * Index entities in batches to prevent blocking
 * @param entities - Array of entities to index
 * @param batchSize - Number of entities per batch (default: 1000)
 */
async indexEntitiesBatch(entities: Entity[], batchSize = 1000): Promise<void> {
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    this.indexEntities(batch);
    
    // Allow event loop to process other tasks
    if (i + batchSize < entities.length) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}

// Alternative: Generator-based approach
*indexEntitiesGenerator(entities: Entity[]): Generator<number> {
  for (let i = 0; i < entities.length; i++) {
    this.indexEntity(entities[i]);
    if (i % 100 === 0) {
      yield i; // Report progress
    }
  }
}
```

## Effort Estimate
- **Development**: 2-3 hours
- **Testing**: 1-2 hours
- **Total**: Small (3-5 hours)

## Dependencies
- Should maintain compatibility with existing synchronous API
- Consider impact on persistence and serialization

## Success Metrics
- No event loop blocking for arrays > 10,000 entities
- Memory usage remains stable during large indexing operations
- Progress reporting available for long operations
- No performance degradation for small arrays

## Performance Targets
- Process 100,000 entities without blocking UI
- Memory usage growth < O(n)
- Indexing rate > 10,000 entities/second

## Related Items
- Memory efficiency improvements
- Progress reporting for long operations
- Worker thread consideration for CPU-intensive operations

## Notes
- Consider exposing progress events for UI feedback
- Could be combined with streaming API for file processing
- Useful for initial bulk loading scenarios
- May want to add cancellation support