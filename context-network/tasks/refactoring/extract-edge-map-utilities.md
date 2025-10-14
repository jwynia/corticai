# Extract Shared Edge Map Building Utilities

**Status**: TODO
**Priority**: Medium
**Category**: Refactoring / DRY Principle
**Estimated Effort**: Small (30-40 minutes)
**Created**: 2025-10-14
**Source**: Code Review of FEAT-001 Pattern Detection

## Problem

Nearly identical code for building edge maps (incoming/outgoing) exists in multiple detectors:
- `HubNodeDetector.ts`: `buildIncomingMap()` and `buildOutgoingMap()`
- `OrphanedNodeDetector.ts`: `buildIncomingEdgeMap()` and `buildOutgoingEdgeMap()`

This violates the DRY (Don't Repeat Yourself) principle and creates maintenance burden if the logic needs to change.

## Code Duplication Locations

### Location 1: HubNodeDetector
- **File**: `src/patterns/detectors/HubNodeDetector.ts`
- **Methods**: Lines 77-94 (`buildIncomingMap`), Lines 99-116 (`buildOutgoingMap`)

### Location 2: OrphanedNodeDetector
- **File**: `src/patterns/detectors/OrphanedNodeDetector.ts`
- **Methods**: Lines 81-99 (`buildIncomingEdgeMap`), Lines 104-122 (`buildOutgoingEdgeMap`)

### Duplicated Logic

```typescript
// Pattern repeated in both detectors
private buildIncomingMap(
  edges: GraphEdge[],
  config?: PatternDetectionConfig
): Map<string, GraphEdge[]> {
  const incomingMap = new Map<string, GraphEdge[]>()

  for (const edge of edges) {
    if (config?.excludedEdgeTypes?.includes(edge.type)) {
      continue
    }

    const incoming = incomingMap.get(edge.to) || []
    incoming.push(edge)
    incomingMap.set(edge.to, incoming)
  }

  return incomingMap
}
```

## Acceptance Criteria

1. Create new utility file: `src/patterns/utils/GraphUtils.ts`
2. Extract `buildIncomingEdgeMap()` and `buildOutgoingEdgeMap()` as static methods
3. Update `HubNodeDetector` to use shared utilities
4. Update `OrphanedNodeDetector` to use shared utilities
5. Remove duplicated private methods from both detectors
6. All 24 tests pass (18 orphaned + 6 hub node tests)
7. No change in behavior or functionality

## Proposed Solution

### New Utility Class

**File**: `src/patterns/utils/GraphUtils.ts`

```typescript
/**
 * Graph Utilities
 *
 * Shared utilities for graph analysis and pattern detection.
 */

import { GraphEdge } from '../../storage/types/GraphTypes'
import { PatternDetectionConfig } from '../types/PatternTypes'

/**
 * Graph utility functions for pattern detection
 */
export class GraphUtils {
  /**
   * Build incoming edge map (node ID -> edges pointing to it)
   *
   * @param edges - All edges in the graph
   * @param config - Optional configuration for filtering
   * @returns Map of node ID to incoming edges
   */
  static buildIncomingEdgeMap(
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Map<string, GraphEdge[]> {
    const incomingMap = new Map<string, GraphEdge[]>()

    for (const edge of edges) {
      // Skip excluded edge types
      if (config?.excludedEdgeTypes?.includes(edge.type)) {
        continue
      }

      const incoming = incomingMap.get(edge.to) || []
      incoming.push(edge)
      incomingMap.set(edge.to, incoming)
    }

    return incomingMap
  }

  /**
   * Build outgoing edge map (node ID -> edges from it)
   *
   * @param edges - All edges in the graph
   * @param config - Optional configuration for filtering
   * @returns Map of node ID to outgoing edges
   */
  static buildOutgoingEdgeMap(
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Map<string, GraphEdge[]> {
    const outgoingMap = new Map<string, GraphEdge[]>()

    for (const edge of edges) {
      // Skip excluded edge types
      if (config?.excludedEdgeTypes?.includes(edge.type)) {
        continue
      }

      const outgoing = outgoingMap.get(edge.from) || []
      outgoing.push(edge)
      outgoingMap.set(edge.from, outgoing)
    }

    return outgoingMap
  }

  /**
   * Build bidirectional edge maps (both incoming and outgoing)
   *
   * More efficient than calling both methods separately when both are needed.
   *
   * @param edges - All edges in the graph
   * @param config - Optional configuration for filtering
   * @returns Object containing both incoming and outgoing maps
   */
  static buildEdgeMaps(
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): {
    incoming: Map<string, GraphEdge[]>
    outgoing: Map<string, GraphEdge[]>
  } {
    const incoming = new Map<string, GraphEdge[]>()
    const outgoing = new Map<string, GraphEdge[]>()

    for (const edge of edges) {
      // Skip excluded edge types
      if (config?.excludedEdgeTypes?.includes(edge.type)) {
        continue
      }

      // Add to incoming map
      const incomingEdges = incoming.get(edge.to) || []
      incomingEdges.push(edge)
      incoming.set(edge.to, incomingEdges)

      // Add to outgoing map
      const outgoingEdges = outgoing.get(edge.from) || []
      outgoingEdges.push(edge)
      outgoing.set(edge.from, outgoingEdges)
    }

    return { incoming, outgoing }
  }
}
```

### Update HubNodeDetector

```typescript
import { GraphUtils } from '../utils/GraphUtils'

export class HubNodeDetector {
  async detect(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Promise<HubNode[]> {
    const patterns: HubNode[] = []
    const threshold = config?.hubNodeThreshold ?? DEFAULT_HUB_THRESHOLD

    // Use shared utility instead of private methods
    const { incoming: incomingMap, outgoing: outgoingMap } =
      GraphUtils.buildEdgeMaps(edges, config)

    // Rest of implementation unchanged...
  }

  // Remove buildIncomingMap() and buildOutgoingMap() methods
}
```

### Update OrphanedNodeDetector

```typescript
import { GraphUtils } from '../utils/GraphUtils'

export class OrphanedNodeDetector {
  async detect(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Promise<OrphanedNode[]> {
    const patterns: OrphanedNode[] = []

    // Use shared utility instead of private methods
    const incomingEdges = GraphUtils.buildIncomingEdgeMap(edges, config)
    const outgoingEdges = GraphUtils.buildOutgoingEdgeMap(edges, config)

    // Rest of implementation unchanged...
  }

  // Remove buildIncomingEdgeMap() and buildOutgoingEdgeMap() methods
}
```

## Benefits

1. **Single Source of Truth**: Edge map logic in one place
2. **Easier Maintenance**: Bug fixes/optimizations apply to all detectors
3. **Better Testing**: Can unit test utilities independently
4. **Reusability**: Future detectors can use the same utilities
5. **Performance**: `buildEdgeMaps()` is more efficient when both maps needed

## Testing Strategy

1. Create unit tests for `GraphUtils` (optional but recommended)
2. Run existing detector tests to verify no regressions:
   - `npm test -- OrphanedNodeDetector.test.ts` (18 tests)
   - `npm test -- HubNodeDetector.test.ts` (6 tests)
3. Run full pattern detection suite
4. Verify TypeScript compilation

## Implementation Steps

1. Create `src/patterns/utils/GraphUtils.ts` with static methods
2. Add unit tests for GraphUtils (optional)
3. Update HubNodeDetector imports and method calls
4. Remove duplicated methods from HubNodeDetector
5. Run HubNodeDetector tests
6. Update OrphanedNodeDetector imports and method calls
7. Remove duplicated methods from OrphanedNodeDetector
8. Run OrphanedNodeDetector tests
9. Run full test suite
10. Update context network with refactoring record

## Related Context

- **HubNodeDetector**: `src/patterns/detectors/HubNodeDetector.ts`
- **OrphanedNodeDetector**: `src/patterns/detectors/OrphanedNodeDetector.ts`
- **Test Suites**: `tests/unit/patterns/*Detector.test.ts`
- **Feature**: FEAT-001 Pattern Detection
- **Code Review**: Pattern detection code review report

## Why Deferred

**Reason**: This is a refactoring task that doesn't change functionality. While beneficial for maintainability, it's not urgent and requires careful testing to ensure no behavioral changes.

**When to Implement**:
- Before adding more pattern detectors (to establish the pattern)
- During next refactoring sprint
- When working on pattern detection enhancements

## Risk Assessment

**Risk Level**: Low
- Pure refactoring, no logic changes
- Comprehensive test coverage exists
- Changes are isolated to pattern detection module
- Easy to rollback if issues arise

**Mitigation**:
- Run tests after each detector update
- Keep changes in separate commits per detector
- Verify no performance regression
