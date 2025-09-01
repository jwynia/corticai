# ADR-003: Attribute Index Architecture - Map-Based Inverted Index

## Status
Accepted

## Context
The context network needs an efficient way to query entities by their attributes, supporting queries like "find all entities with type='function'" or complex boolean queries. The solution needs to handle 10,000+ entities with sub-10ms query times.

## Decision
We will use a Map-based inverted index structure with dual indexing:
1. Primary index: `Map<attribute, Map<value, Set<entityId>>>`
2. Reverse index: `Map<entityId, Set<attribute:value>>`

## Rationale

### Alternatives Considered

1. **Array-based Linear Search**
   - Pros: Simple implementation
   - Cons: O(n) query complexity, poor performance at scale
   - Rejected: Doesn't meet performance requirements

2. **Single Map with Composite Keys**
   - Pros: Simpler structure
   - Cons: Inefficient for "all values" queries, complex key management
   - Rejected: Less flexible for query patterns

3. **External Search Library (lunr.js, elasticlunr)**
   - Pros: Full-text search, proven solution
   - Cons: Overhead for simple attribute matching, additional dependency
   - Rejected: Over-engineered for current needs

4. **Graph Database (Neo4j, Kuzu)**
   - Pros: Natural fit for relationships, powerful queries
   - Cons: External dependency, setup complexity, overhead for simple cases
   - Deferred: Good future migration path, not needed initially

### Why Map-Based Inverted Index

1. **Performance**: O(1) lookups for exact matches
2. **Memory Efficient**: Only stores unique values once
3. **Query Flexibility**: Supports various operators easily
4. **No Dependencies**: Pure JavaScript/TypeScript solution
5. **Migration Path**: Can evolve to graph database when needed

## Consequences

### Positive
- Fast query performance achieved (<10ms for 10,000 entities)
- Clean, understandable implementation
- Easy to test and maintain
- Supports all required query patterns
- No external dependencies

### Negative
- File size grew to 511 lines (needs modularization)
- Memory usage grows with unique attribute values
- Complex value comparison (objects/arrays) requires normalization
- Not optimized for range queries or sorting

### Neutral
- JSON persistence is simple but not optimal for large datasets
- Synchronous API may need async version for huge datasets

## Implementation Details

### Key Design Choices

1. **Dual Indexing**: Reverse index enables efficient entity removal
2. **Set for Entity IDs**: Prevents duplicates automatically
3. **Value Normalization**: Consistent comparison for objects/arrays
4. **Arguments.length Check**: Differentiates undefined vs omitted parameters

### Performance Characteristics
- **Space Complexity**: O(n×m) where n=entities, m=avg attributes
- **Add Operation**: O(1)
- **Query Operation**: O(1) for exact match, O(k) for k results
- **Remove Operation**: O(a) where a=attributes per entity

## Lessons Learned

1. **TDD Drove Good Design**: Test-first approach led to clean API
2. **Edge Cases Matter**: null/undefined handling required careful thought
3. **Normalization Complexity**: Object comparison harder than expected
4. **Performance Met**: Requirements easily achieved with this approach

## Related Decisions
- [ADR-001: Context Network Structure](./adr-001-context-network-structure.md)
- [ADR-002: Universal Fallback Adapter](./adr-002-universal-fallback-adapter.md)

## References
- [Inverted Index - Wikipedia](https://en.wikipedia.org/wiki/Inverted_index)
- [Implementation Complete](../implementation/attribute-index-completion.md)
- [Original Research](../research/relationships/shared_attribute_systems.md)