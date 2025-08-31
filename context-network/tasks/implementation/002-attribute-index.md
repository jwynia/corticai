# Task: Create Basic Attribute Index

## Priority: HIGH - Core Query System

## Context
The Attribute Index enables "find all X with Y" queries, which are fundamental to the system's ability to discover relationships and patterns across domains. It provides an inverted index for efficient entity querying.

## Original Recommendation
From groomed backlog: "Build inverted index for finding entities with shared attributes"

## Why Deferred (Not Immediate)
- Depends on Universal Fallback Adapter for entity structure
- Needs proper design for scalability
- Requires performance benchmarking for 10,000+ entities

## Acceptance Criteria
- [ ] Add/remove attributes for entities
- [ ] Query by single or multiple attributes
- [ ] AND/OR boolean query support
- [ ] Handle 10,000+ entities efficiently
- [ ] Persist index to disk (JSON initially, graph DB later)
- [ ] Comprehensive test coverage
- [ ] Thread-safe operations

## Technical Specifications

### Index Interface
```typescript
interface AttributeIndex {
  // Core operations
  addAttribute(entityId: string, attribute: string, value: any): void;
  removeAttribute(entityId: string, attribute: string): void;
  
  // Query operations
  findByAttribute(attribute: string, value?: any): Set<string>;
  findByAttributes(queries: AttributeQuery[]): Set<string>;
  
  // Persistence
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}

interface AttributeQuery {
  attribute: string;
  value?: any;
  operator?: 'equals' | 'contains' | 'startsWith' | 'exists';
}
```

### Implementation Approach
1. **Data Structure**: Map<attribute, Map<value, Set<entityId>>>
2. **Query Engine**: Boolean algebra for AND/OR operations
3. **Persistence**: JSON serialization initially, migration path to graph DB
4. **Performance**: Lazy loading, caching, index optimization

## Research Foundation
- [/context-network/research/relationships/shared_attribute_systems.md]
- Knowledge graph theory validates inverted index approach

## Effort Estimate
- **Development**: 4-5 hours
- **Testing**: 2 hours
- **Performance optimization**: 1-2 hours
- **Total**: 7-9 hours

## Dependencies
- [ ] Universal Fallback Adapter (for Entity interface)
- [ ] Entity type definitions

## Success Metrics
- Query performance < 10ms for 10,000 entities
- Memory usage < 100MB for 10,000 entities
- Test coverage > 85%
- Zero data loss on persistence/load cycles

## Files to Create
- `/app/src/indexes/AttributeIndex.ts`
- `/app/tests/indexes/attribute-index.test.ts`
- `/app/src/indexes/types.ts`

## Future Enhancements
- Graph database backend (Neo4j/Kuzu)
- Distributed index for scale
- Full-text search capabilities
- Fuzzy matching support

## Notes
- Academic research strongly supports this approach
- Consider using existing libraries (e.g., lunr.js) for text indexing
- Plan for migration to graph database from the start