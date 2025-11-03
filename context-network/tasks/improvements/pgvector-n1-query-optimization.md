# Optimize N+1 Query Pattern in PgVector Graph Operations

## Task ID
IMPROVE-PGVECTOR-002

## Status
📋 PLANNED

## Created
2025-11-03

## Parent Task
[[pgvector-storage-backend]] - Phase 2 code review findings

## Priority
🟡 HIGH (Performance)

## One-liner
Batch-fetch all unique nodes upfront instead of fetching separately for each path in traverse() and shortestPath()

## Context

### Performance Issue
Current implementation fetches nodes separately for each path returned by the recursive CTE, creating an N+1 query problem:

**Location**: `PgVectorStorageAdapter.ts:492-512` (traverse method)
```typescript
// ❌ CURRENT: Inside loop over result.rows
for (const row of result.rows) {
  const nodeIds = row.path_nodes as string[];

  // Fetch full node data - THIS RUNS FOR EVERY PATH
  const nodesResult = await this.pg.query(`
    SELECT id, type, properties
    FROM ${nodesTable}
    WHERE id = ANY($1::text[])
  `, [nodeIds]);

  // Build node lookup
  const nodeMap = new Map<string, GraphNode>();
  for (const nodeRow of nodesResult.rows) {
    nodeMap.set(nodeRow.id, {
      id: nodeRow.id,
      type: nodeRow.type,
      properties: nodeRow.properties || {}
    });
  }
  // ... rest of path construction
}
```

### Impact
- **Query count**: 1 initial CTE query + N node fetch queries (where N = number of paths)
- **Example**: Finding 100 paths = 101 queries instead of 2 queries
- **Latency**: Each query adds round-trip time to database
- **Database load**: Unnecessary repeated queries for same nodes

### Similar Issue in shortestPath()
Same pattern at `PgVectorStorageAdapter.ts:618-631`

## Acceptance Criteria

### Performance Goals
- [ ] Reduce queries to: 1 CTE query + 1 batch node fetch + 1 batch edge fetch
- [ ] Handle up to 1000 paths efficiently (< 500ms for batch fetch)
- [ ] Maintain memory efficiency (don't load unnecessary node data)

### Implementation Requirements
- [ ] Collect all unique node IDs from all paths before fetching
- [ ] Single batch query to fetch all nodes
- [ ] Build global nodeMap once, reuse for all paths
- [ ] Add performance benchmark tests comparing before/after
- [ ] Document the optimization pattern for future reference

## Implementation Plan

### Step 1: Extract Node Fetching Helper
```typescript
/**
 * Batch-fetch multiple nodes by their IDs
 * @param nodeIds - Array of node IDs to fetch
 * @returns Map of node ID -> GraphNode
 */
private async fetchNodesMap(nodeIds: string[]): Promise<Map<string, GraphNode>> {
  if (nodeIds.length === 0) {
    return new Map();
  }

  const nodesTable = this.qualifiedTableName(this.config.nodesTable);
  const uniqueIds = [...new Set(nodeIds)]; // Deduplicate

  const result = await this.pg.query(`
    SELECT id, type, properties
    FROM ${nodesTable}
    WHERE id = ANY($1::text[])
  `, [uniqueIds]);

  const nodeMap = new Map<string, GraphNode>();
  for (const row of result.rows) {
    nodeMap.set(row.id, {
      id: row.id,
      type: row.type,
      properties: row.properties || {}
    });
  }

  return nodeMap;
}
```

### Step 2: Refactor traverse() to Batch Fetch
```typescript
async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
  await this.ensureLoaded();

  try {
    // ... CTE query stays the same ...
    const result = await this.pg.query(/* recursive CTE */);

    // ✅ NEW: Collect all unique node IDs upfront
    const allNodeIds = new Set<string>();
    for (const row of result.rows) {
      const nodeIds = row.path_nodes as string[];
      nodeIds.forEach(id => allNodeIds.add(id));
    }

    // ✅ NEW: Single batch fetch for all nodes
    const nodeMap = await this.fetchNodesMap([...allNodeIds]);

    // Build paths using pre-fetched nodeMap
    const paths: GraphPath[] = [];
    for (const row of result.rows) {
      const nodeIds = row.path_nodes as string[];
      const edgesData = row.path_edges_data as any[];

      // Build nodes array from pre-fetched map
      const nodes: GraphNode[] = nodeIds
        .map(id => nodeMap.get(id))
        .filter((node): node is GraphNode => node !== undefined);

      // ... rest of path construction ...
    }

    return paths;
  } catch (error) {
    // ... error handling ...
  }
}
```

### Step 3: Apply Same Pattern to shortestPath()
Same optimization for `shortestPath()` method at line 557

### Step 4: Apply Same Pattern to Edge Fetching
Currently edges are fetched in a loop too:
```typescript
// CURRENT: Inside loop
for (let i = 0; i < nodeIds.length - 1; i++) {
  const edgeResult = await this.pg.query(/* fetch edge */);
  edges.push(/* ... */);
}

// OPTIMIZED: Single batch query
const edgePairs = nodeIds.slice(0, -1).map((fromId, i) => [fromId, nodeIds[i + 1]]);
const edgesMap = await this.fetchEdgesMap(edgePairs);
```

### Step 5: Add Performance Benchmarks
```typescript
describe('Performance: traverse() N+1 optimization', () => {
  it('should fetch nodes in single batch query', async () => {
    // Setup: Create graph with 100 paths
    // ... setup code ...

    // Track query count
    let queryCount = 0;
    mockPg.queryMock.mockImplementation(async (sql, params) => {
      queryCount++;
      // ... return mock data ...
    });

    await adapter.traverse(pattern);

    // Should be: 1 CTE + 1 batch fetch = 2 queries (not 101)
    expect(queryCount).toBeLessThanOrEqual(3); // Allow some margin
  });

  it('should handle 1000 paths efficiently', async () => {
    const startTime = Date.now();
    await adapter.traverse(pattern);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500); // Less than 500ms
  });
});
```

## Performance Impact Estimate

### Before Optimization
- 100 paths = 101 queries
- Average query latency: 5ms
- Total time: 505ms

### After Optimization
- 100 paths = 2 queries
- Average query latency: 5ms
- Total time: 10ms

**Expected improvement**: ~50x faster for 100 paths, scaling better with more paths

## Dependencies
- None (self-contained refactoring)

## References
- N+1 Query Problem: https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem
- Parent task: [[pgvector-storage-backend]]
- Code locations:
  - `traverse()`: `app/src/storage/adapters/PgVectorStorageAdapter.ts:413-548`
  - `shortestPath()`: `app/src/storage/adapters/PgVectorStorageAdapter.ts:550-648`

## Estimated Effort
4-6 hours (refactoring + edge optimization + tests + benchmarks)

## Notes
This is a HIGH priority performance issue but not blocking for initial implementation. Should be addressed before production use with large graphs.
