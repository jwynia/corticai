# Optimize DFS Memory Allocation in Cycle Detection

**Status**: TODO
**Priority**: Low-Medium
**Category**: Performance / Memory Optimization
**Estimated Effort**: Small (20-30 minutes)
**Created**: 2025-10-14
**Source**: Code Review of FEAT-001 Pattern Detection

## Problem

The `detectCyclesDFS` method in `CircularDependencyDetector` creates a new array copy for every recursive call:

```typescript
const nestedCycles = this.detectCyclesDFS(
  neighbor,
  adjList,
  visited,
  recStack,
  [...path]  // Creates new array - O(path_length) memory allocation
)
```

For deep graphs with long paths, this creates many intermediate arrays, increasing memory pressure and garbage collection overhead.

## Current Implementation

**Location**: `src/patterns/detectors/CircularDependencyDetector.ts:157-163`

```typescript
for (const neighbor of neighbors) {
  if (!visited.has(neighbor)) {
    // Unvisited neighbor - continue DFS
    const nestedCycles = this.detectCyclesDFS(
      neighbor,
      adjList,
      visited,
      recStack,
      [...path]  // Array spread creates copy
    )
    cycles.push(...nestedCycles)
  }
}
```

## Performance Impact

**Current Behavior**:
- For a path of depth 10: Creates 10 intermediate array copies
- Each copy operation: O(path_length)
- Total memory allocations: O(depth × average_path_length)

**Impact**: Not critical for typical graphs (<100 depth), but becomes measurable for deep graphs or high-frequency analysis.

## Acceptance Criteria

1. Modify `detectCyclesDFS` to use shared path array with push/pop
2. Maintain correct cycle detection behavior
3. All 19 circular dependency tests pass
4. No regressions in other tests
5. Memory allocations reduced (verifiable via profiling if needed)

## Proposed Solution

### Optimized Implementation

```typescript
private detectCyclesDFS(
  nodeId: string,
  adjList: Map<string, string[]>,
  visited: Set<string>,
  recStack: Set<string>,
  path: string[]  // Shared mutable array
): string[][] {
  const cycles: string[][] = []

  // Mark current node as visited and add to recursion stack
  visited.add(nodeId)
  recStack.add(nodeId)
  path.push(nodeId)  // Mutate shared path

  // Get neighbors
  const neighbors = adjList.get(nodeId) || []

  // Visit all neighbors
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      // Unvisited neighbor - continue DFS with shared path
      const nestedCycles = this.detectCyclesDFS(
        neighbor,
        adjList,
        visited,
        recStack,
        path  // Pass shared array
      )
      cycles.push(...nestedCycles)
    } else if (recStack.has(neighbor)) {
      // Neighbor is in recursion stack - cycle detected!
      const cycle = this.extractCycle(path, neighbor)
      cycles.push(cycle)
    }
  }

  // Remove from recursion stack AND path before backtracking
  recStack.delete(nodeId)
  path.pop()  // Remove current node from shared path

  return cycles
}
```

### Key Changes

1. **Remove array spread**: Change `[...path]` to `path`
2. **Add path.pop()**: Remove current node when backtracking
3. **Maintain invariant**: Path always reflects current DFS stack

## Trade-offs

### Pros
- Reduces memory allocations significantly
- Improves GC pressure on deep graphs
- Slightly faster for deep recursion
- More memory-efficient

### Cons
- Slightly more complex logic (push/pop management)
- Requires careful testing to ensure correctness
- Mutation of shared state (less functional style)

**Decision**: The performance benefit is worth the slight complexity increase, especially for production systems analyzing large graphs.

## Testing Strategy

1. **Correctness**: Run all 19 circular dependency tests
   ```bash
   npm test -- CircularDependencyDetector.test.ts
   ```

2. **Edge Cases to Verify**:
   - Deep graphs (10+ levels)
   - Multiple branches from same node
   - Cycles at different depths
   - Disconnected components

3. **Optional Performance Test**:
   ```typescript
   it('should handle deep graphs efficiently', () => {
     // Create chain of 100 nodes
     const nodes = Array.from({ length: 100 }, (_, i) => ({
       id: `Node${i}`,
       type: 'module',
       properties: {}
     }))

     const edges = Array.from({ length: 99 }, (_, i) => ({
       from: `Node${i}`,
       to: `Node${i+1}`,
       type: 'depends_on',
       properties: {}
     }))

     // Add cycle back to start
     edges.push({
       from: 'Node99',
       to: 'Node0',
       type: 'depends_on',
       properties: {}
     })

     const patterns = await detector.detect(nodes, edges)
     expect(patterns).toHaveLength(1)
   })
   ```

## Implementation Steps

1. Modify `detectCyclesDFS` to remove array spread
2. Add `path.pop()` before method return
3. Run circular dependency tests
4. Verify all tests pass
5. Run full test suite
6. Optional: Add performance benchmark test
7. Update documentation if needed

## Related Context

- **Implementation**: `src/patterns/detectors/CircularDependencyDetector.ts`
- **Test Suite**: `tests/unit/patterns/CircularDependencyDetector.test.ts`
- **Feature**: FEAT-001 Pattern Detection
- **Algorithm**: DFS-based cycle detection

## Why Deferred

**Reason**: This is a performance optimization that doesn't affect correctness. The current implementation works fine for typical use cases. The change is small but requires careful testing to ensure path management is correct.

**When to Implement**:
- When profiling shows memory allocation as bottleneck
- Before analyzing very deep graphs (>50 depth)
- During performance optimization sprint
- When adding performance regression tests

## Risk Assessment

**Risk Level**: Low-Medium
- Algorithm logic unchanged
- Only affects memory management
- Comprehensive test coverage exists
- Easy to verify correctness

**Mitigation**:
- Thorough testing with edge cases
- Add assertions to verify path invariants
- Consider keeping old implementation as comment for reference
- Profile memory usage before/after if concerned

## Performance Estimation

**Before**:
- Memory allocations: O(depth × avg_path_length × cycles_found)
- Example: depth=20, path_length=15, cycles=5 → ~1,500 array operations

**After**:
- Memory allocations: O(depth) for shared path
- Same example: ~20 operations

**Improvement**: ~75x reduction in array allocations for this example.

**Note**: Actual impact depends on graph characteristics. Most noticeable for deep, bushy graphs.
