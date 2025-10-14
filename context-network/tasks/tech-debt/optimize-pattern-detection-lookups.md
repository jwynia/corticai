# Optimize Pattern Detection Node/Edge Lookups

**Status**: TODO
**Priority**: Medium
**Category**: Performance / Technical Debt
**Estimated Effort**: Small (30-45 minutes)
**Created**: 2025-10-14
**Source**: Code Review of FEAT-001 Pattern Detection

## Problem

The `CircularDependencyDetector` performs O(N) lookups inside loops when building the adjacency list, resulting in O(E×N) complexity where E=edges and N=nodes. For large graphs (>1K nodes), this creates a performance bottleneck.

## Current Performance Issue

**Location 1**: `src/patterns/detectors/CircularDependencyDetector.ts:107-108`

```typescript
// BAD - O(E×N) complexity
for (const edge of edges) {
  const fromNode = nodes.find(n => n.id === edge.from)  // O(N) lookup
  const toNode = nodes.find(n => n.id === edge.to)      // O(N) lookup
  // Check if nodes should be excluded...
}
```

**Impact**: For a graph with 1,000 nodes and 5,000 edges, this performs ~10M operations instead of ~6K.

**Location 2**: `src/patterns/detectors/CircularDependencyDetector.ts:122`

```typescript
// BAD - O(cycle_length × E)
for (let i = 0; i < cycle.length - 1; i++) {
  const edge = allEdges.find(e => e.from === from && e.to === to)  // O(E)
}
```

## Acceptance Criteria

1. Replace `nodes.find()` in `buildAdjacencyList()` with O(1) Map lookup
2. Replace `allEdges.find()` in `extractCycleEdges()` with O(1) Map lookup
3. Achieve O(N + E) complexity for both methods
4. All 19 circular dependency tests still pass
5. No regressions in other pattern detector tests

## Proposed Solution

### Fix 1: Node Lookup Optimization

```typescript
private buildAdjacencyList(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config?: PatternDetectionConfig
): Map<string, string[]> {
  const adjList = new Map<string, string[]>()

  // Create node lookup map - O(N)
  const nodeMap = new Map<string, GraphNode>()
  for (const node of nodes) {
    if (!config?.excludedNodeTypes?.includes(node.type)) {
      adjList.set(node.id, [])
      nodeMap.set(node.id, node)  // Add to lookup map
    }
  }

  // Process edges - O(E) with O(1) lookups
  for (const edge of edges) {
    if (config?.excludedEdgeTypes?.includes(edge.type)) {
      continue
    }

    const fromNode = nodeMap.get(edge.from)  // O(1) lookup
    const toNode = nodeMap.get(edge.to)      // O(1) lookup

    if (!fromNode || !toNode ||
        config?.excludedNodeTypes?.includes(fromNode.type) ||
        config?.excludedNodeTypes?.includes(toNode.type)) {
      continue
    }

    const neighbors = adjList.get(edge.from) || []
    neighbors.push(edge.to)
    adjList.set(edge.from, neighbors)
  }

  return adjList
}
```

### Fix 2: Edge Lookup Optimization

```typescript
private extractCycleEdges(
  cycle: string[],
  allEdges: GraphEdge[]
): Array<{ from: string; to: string; type: string }> {
  const cycleEdges: Array<{ from: string; to: string; type: string }> = []

  // Build edge lookup map - O(E)
  const edgeMap = new Map<string, GraphEdge>()
  for (const edge of allEdges) {
    const key = `${edge.from}->${edge.to}`
    edgeMap.set(key, edge)
  }

  // Extract cycle edges - O(cycle_length) with O(1) lookups
  for (let i = 0; i < cycle.length - 1; i++) {
    const from = cycle[i]
    const to = cycle[i + 1]
    const key = `${from}->${to}`
    const edge = edgeMap.get(key)

    if (edge) {
      cycleEdges.push({
        from: edge.from,
        to: edge.to,
        type: edge.type
      })
    }
  }

  return cycleEdges
}
```

## Performance Improvement

**Before**: O(E×N) + O(cycle_length × E)
**After**: O(N + E) + O(E + cycle_length)

**Example Impact**:
- Graph: 1,000 nodes, 5,000 edges
- Before: ~10,000,000 operations
- After: ~6,000 operations
- **Improvement**: 1,600x faster

## Testing Strategy

1. Run existing circular dependency tests: `npm test -- CircularDependencyDetector.test.ts`
2. Verify all 19 tests pass
3. Run full pattern detection test suite
4. Optional: Add performance benchmark test for large graphs (1K+ nodes)

## Related Context

- **Original Implementation**: `src/patterns/detectors/CircularDependencyDetector.ts`
- **Test Suite**: `tests/unit/patterns/CircularDependencyDetector.test.ts`
- **Code Review Report**: Context network completion record
- **Feature**: FEAT-001 Pattern Detection

## Why Deferred

**Reason**: Requires careful implementation to maintain correctness. Changes are isolated but need validation with existing tests. The current implementation works correctly for small-to-medium graphs (<1K nodes).

**When to Implement**: Before deploying pattern detection to large codebases or production systems with >1K node graphs.

## Risk Assessment

**Risk Level**: Low-Medium
- Changes are isolated to two private methods
- Comprehensive test coverage exists
- Algorithm logic unchanged, only lookup mechanism

**Mitigation**:
- Run full test suite after each change
- Test with various graph sizes
- Verify correctness before performance
