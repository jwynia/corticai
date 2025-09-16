# Task Breakdown: Kuzu Graph Operations

## Task Overview
Fix and complete three graph operations in KuzuStorageAdapter that currently return mock data.

## Task 1: Implement traverse() Method

### Scope
**Includes**:
- Replace mock implementation with real Cypher query
- Build query from TraversalPattern parameters
- Parse and transform Kuzu results to GraphPath[]
- Handle all pattern options (direction, depth, filters, edge types)

**Excludes**:
- Query caching
- Performance optimization
- Advanced path semantics (TRAIL, ACYCLIC)

### Dependencies
- **Prerequisites**: None (can start immediately)
- **Blockers**: None

### Success Criteria
- [ ] Executes real Cypher queries against Kuzu
- [ ] Respects all TraversalPattern parameters
- [ ] Returns actual paths from the graph
- [ ] Handles empty results gracefully
- [ ] All existing tests pass
- [ ] TODO comment removed

### Implementation Steps
1. Create basic Cypher query template
2. Add parameter handling for:
   - startNode (required)
   - direction (outgoing/incoming/both)
   - maxDepth (default 5)
   - relationshipTypes (optional filter)
   - filters (node property filters)
3. Execute query with connection.query()
4. Parse results using getAll()
5. Transform Kuzu paths to GraphPath objects
6. Add error handling

### Estimated Effort
- **Size**: M (2-3 hours)
- **Complexity**: Medium
- **Risk**: Low

### Code Location
- File: `/app/src/storage/adapters/KuzuStorageAdapter.ts`
- Lines: 570-593

### Example Implementation
```typescript
async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
  const query = `
    MATCH path = (start:Entity {id: '${this.escapeString(pattern.startNode)}'})
          -[r*1..${pattern.maxDepth || 5}]-
          (end:Entity)
    RETURN path, length(r) as pathLength
    LIMIT ${pattern.limit || 100}
  `

  const result = await this.connection.query(query)
  const rows = await result.getAll()

  return rows.map(row => this.convertToGraphPath(row.path, row.pathLength))
}
```

---

## Task 2: Implement findConnected() Method

### Scope
**Includes**:
- Replace mock implementation with connected nodes query
- Find all nodes within N hops from starting node
- Remove duplicate nodes
- Parse and transform results to GraphNode[]

**Excludes**:
- Path information (just nodes)
- Edge filtering
- Weighted distances

### Dependencies
- **Prerequisites**: None (can start immediately)
- **Blockers**: None

### Success Criteria
- [ ] Finds actual connected nodes in graph
- [ ] Respects depth parameter
- [ ] Returns distinct nodes only
- [ ] Handles isolated nodes (returns empty array)
- [ ] All existing tests pass
- [ ] TODO comment removed

### Implementation Steps
1. Create connected nodes Cypher query
2. Add depth parameter handling
3. Execute query and get results
4. Filter out starting node
5. Convert results to GraphNode objects
6. Handle empty results for isolated nodes

### Estimated Effort
- **Size**: S (1-2 hours)
- **Complexity**: Low
- **Risk**: Low

### Code Location
- File: `/app/src/storage/adapters/KuzuStorageAdapter.ts`
- Lines: 598-626

### Example Implementation
```typescript
async findConnected(nodeId: string, depth: number): Promise<GraphNode[]> {
  const query = `
    MATCH (start:Entity {id: '${this.escapeString(nodeId)}'})
          -[*1..${depth}]-
          (connected:Entity)
    WHERE connected.id <> '${this.escapeString(nodeId)}'
    RETURN DISTINCT connected.id, connected.type, connected.data
    LIMIT 1000
  `

  const result = await this.connection.query(query)
  const rows = await result.getAll()

  return rows.map(row => ({
    id: row['connected.id'],
    type: row['connected.type'],
    properties: JSON.parse(row['connected.data'] || '{}')
  }))
}
```

---

## Task 3: Implement shortestPath() Method

### Scope
**Includes**:
- Replace mock implementation with shortest path query
- Use Kuzu's SHORTEST algorithm
- Return full path with nodes and edges
- Handle disconnected nodes (return null)

**Excludes**:
- Weighted paths
- Multiple shortest paths
- Path cost calculation

### Dependencies
- **Prerequisites**: None (can start immediately)
- **Blockers**: None

### Success Criteria
- [ ] Finds actual shortest path in graph
- [ ] Returns null for disconnected nodes
- [ ] Includes both nodes and edges in path
- [ ] Calculates correct path length
- [ ] All existing tests pass
- [ ] TODO comment removed

### Implementation Steps
1. Create shortest path Cypher query
2. Add source and target node parameters
3. Execute query and check for results
4. Return null if no path found
5. Convert path to GraphPath object
6. Extract nodes and edges from path

### Estimated Effort
- **Size**: S (1-2 hours)
- **Complexity**: Low
- **Risk**: Low

### Code Location
- File: `/app/src/storage/adapters/KuzuStorageAdapter.ts`
- Lines: 631-672

### Example Implementation
```typescript
async shortestPath(fromId: string, toId: string): Promise<GraphPath | null> {
  const query = `
    MATCH path = (from:Entity {id: '${this.escapeString(fromId)}'})
                 -[r* SHORTEST 1..10]-
                 (to:Entity {id: '${this.escapeString(toId)}'})
    RETURN path, length(r) as pathLength
    LIMIT 1
  `

  const result = await this.connection.query(query)
  const rows = await result.getAll()

  if (rows.length === 0) return null

  return this.convertToGraphPath(rows[0].path, rows[0].pathLength)
}
```

---

## Task 4: Add Helper Methods

### Scope
**Includes**:
- Create convertToGraphPath() helper method
- Create escapeString() for query injection prevention
- Add query logging in debug mode

**Excludes**:
- Complex query builders
- Result caching
- Performance monitoring

### Dependencies
- **Prerequisites**: None
- **Blockers**: None

### Success Criteria
- [ ] Consistent path conversion across all methods
- [ ] Safe string escaping for queries
- [ ] Debug logging when enabled

### Estimated Effort
- **Size**: S (1 hour)
- **Complexity**: Low
- **Risk**: None

### Implementation
```typescript
private convertToGraphPath(kuzuPath: any, length: number): GraphPath {
  const nodes = (kuzuPath._NODES || []).map(node => ({
    id: node.id,
    type: node.type,
    properties: JSON.parse(node.data || '{}')
  }))

  const edges = (kuzuPath._RELS || []).map(rel => ({
    from: rel._src,
    to: rel._dst,
    type: rel.type,
    properties: JSON.parse(rel.data || '{}')
  }))

  return { nodes, edges, length }
}

private escapeString(value: string): string {
  return value.replace(/'/g, "\\'").replace(/\\/g, "\\\\")
}
```

---

## Task 5: Update and Expand Tests

### Scope
**Includes**:
- Verify existing tests still pass
- Add tests for edge cases
- Add performance benchmarks
- Test error conditions

**Excludes**:
- Integration tests with other components
- Load testing
- Stress testing

### Dependencies
- **Prerequisites**: Tasks 1-4 complete
- **Blockers**: None

### Success Criteria
- [ ] All 759 existing tests pass
- [ ] New tests for disconnected nodes
- [ ] New tests for cyclic graphs
- [ ] New tests for empty results
- [ ] Performance baseline established

### Estimated Effort
- **Size**: M (2-3 hours)
- **Complexity**: Medium
- **Risk**: Low

### Test Cases
1. Disconnected graph components
2. Self-loops and cycles
3. Very deep traversals
4. Large result sets
5. Invalid node IDs
6. Empty graphs

---

## Task 6: Documentation and Cleanup

### Scope
**Includes**:
- Remove all TODO comments
- Add JSDoc documentation
- Create usage examples
- Update README if needed

**Excludes**:
- API documentation generation
- Video tutorials
- Blog posts

### Dependencies
- **Prerequisites**: Tasks 1-5 complete
- **Blockers**: None

### Success Criteria
- [ ] No TODO comments remain
- [ ] All methods have complete JSDoc
- [ ] Examples added to codebase
- [ ] Graph operations documented

### Estimated Effort
- **Size**: S (1 hour)
- **Complexity**: Low
- **Risk**: None

---

## Implementation Order

### Recommended Sequence
1. **Task 4**: Add helper methods (1 hour) - Foundation for other tasks
2. **Task 1**: Implement traverse() (2-3 hours) - Most complex
3. **Task 2**: Implement findConnected() (1-2 hours) - Simpler query
4. **Task 3**: Implement shortestPath() (1-2 hours) - Simplest
5. **Task 5**: Update tests (2-3 hours) - Validate everything
6. **Task 6**: Documentation (1 hour) - Final cleanup

### Total Estimated Time
- **Minimum**: 8 hours
- **Expected**: 10-12 hours
- **Maximum**: 15 hours (with complications)

### Parallelization Opportunities
- Tasks 1, 2, 3 can be done in parallel after Task 4
- Documentation can be updated incrementally

---

## Definition of Done

### All Tasks Complete When:
- [ ] All three methods use real Kuzu queries
- [ ] All TODO comments removed
- [ ] All 759 existing tests pass
- [ ] New edge case tests added and passing
- [ ] Performance benchmarks established
- [ ] JSDoc documentation complete
- [ ] Code review passed
- [ ] No mock data in production code