# Add Performance Regression Tests for Pattern Detection

**Status**: TODO
**Priority**: Low
**Category**: Testing / Performance
**Estimated Effort**: Medium (45-60 minutes)
**Created**: 2025-10-14
**Source**: Code Review of FEAT-001 Pattern Detection

## Problem

The pattern detection system currently has excellent functional test coverage (43 tests), but lacks performance regression tests. Without these, we can't:
- Verify performance doesn't degrade over time
- Validate that optimizations actually improve performance
- Ensure the system scales to large graphs
- Set performance SLAs for production use

## Acceptance Criteria

1. Create performance test suite: `tests/performance/patterns/PatternDetectionPerformance.test.ts`
2. Test pattern detection on graphs of varying sizes (100, 1K, 10K nodes)
3. Set baseline performance expectations
4. Tests should be skippable in CI (opt-in via environment variable)
5. Include tests for each detector type
6. Document expected performance characteristics

## Proposed Test Suite

### File: `tests/performance/patterns/PatternDetectionPerformance.test.ts`

```typescript
/**
 * Pattern Detection Performance Tests
 *
 * These tests verify that pattern detection scales appropriately
 * and doesn't regress in performance. They are opt-in via:
 * RUN_PERF_TESTS=1 npm test performance
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { PatternDetectionService } from '../../../src/patterns/PatternDetectionService'
import { CircularDependencyDetector } from '../../../src/patterns/detectors/CircularDependencyDetector'
import { OrphanedNodeDetector } from '../../../src/patterns/detectors/OrphanedNodeDetector'
import { HubNodeDetector } from '../../../src/patterns/detectors/HubNodeDetector'
import { GraphNode, GraphEdge } from '../../../src/storage/types/GraphTypes'

// Skip these tests unless explicitly enabled
const describePerf = process.env.RUN_PERF_TESTS === '1' ? describe : describe.skip

/**
 * Generate a graph with specified characteristics
 */
function generateGraph(
  nodeCount: number,
  avgEdgesPerNode: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `Node${i}`,
      type: 'module',
      properties: {}
    })
  }

  // Generate edges
  const targetEdgeCount = nodeCount * avgEdgesPerNode
  for (let i = 0; i < targetEdgeCount; i++) {
    const from = `Node${Math.floor(Math.random() * nodeCount)}`
    const to = `Node${Math.floor(Math.random() * nodeCount)}`

    edges.push({
      from,
      to,
      type: 'depends_on',
      properties: {}
    })
  }

  return { nodes, edges }
}

/**
 * Generate a graph with a specific number of cycles
 */
function generateGraphWithCycles(
  nodeCount: number,
  cycleCount: number,
  cycleLength: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `Node${i}`,
      type: 'module',
      properties: {}
    })
  }

  // Generate cycles
  for (let c = 0; c < cycleCount; c++) {
    const startIdx = c * cycleLength
    for (let i = 0; i < cycleLength; i++) {
      const fromIdx = startIdx + i
      const toIdx = startIdx + ((i + 1) % cycleLength)

      if (fromIdx < nodeCount && toIdx < nodeCount) {
        edges.push({
          from: `Node${fromIdx}`,
          to: `Node${toIdx}`,
          type: 'depends_on',
          properties: {}
        })
      }
    }
  }

  return { nodes, edges }
}

describePerf('Pattern Detection Performance', () => {
  describe('Circular Dependency Detection', () => {
    it('should detect cycles in small graph (<100ms)', async () => {
      const { nodes, edges } = generateGraphWithCycles(100, 5, 4)
      const detector = new CircularDependencyDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(patterns.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(100)
      console.log(`✓ Small graph (100 nodes): ${duration}ms`)
    })

    it('should detect cycles in medium graph (<500ms)', async () => {
      const { nodes, edges } = generateGraphWithCycles(1000, 20, 4)
      const detector = new CircularDependencyDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(patterns.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(500)
      console.log(`✓ Medium graph (1K nodes): ${duration}ms`)
    })

    it('should detect cycles in large graph (<3s)', async () => {
      const { nodes, edges } = generateGraphWithCycles(10000, 50, 5)
      const detector = new CircularDependencyDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(patterns.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(3000)
      console.log(`✓ Large graph (10K nodes): ${duration}ms`)
    })
  })

  describe('Orphaned Node Detection', () => {
    it('should detect orphans in small graph (<50ms)', async () => {
      const { nodes, edges } = generateGraph(100, 3)
      const detector = new OrphanedNodeDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(50)
      console.log(`✓ Small graph (100 nodes): ${duration}ms`)
    })

    it('should detect orphans in medium graph (<200ms)', async () => {
      const { nodes, edges } = generateGraph(1000, 5)
      const detector = new OrphanedNodeDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(200)
      console.log(`✓ Medium graph (1K nodes): ${duration}ms`)
    })

    it('should detect orphans in large graph (<2s)', async () => {
      const { nodes, edges } = generateGraph(10000, 5)
      const detector = new OrphanedNodeDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
      console.log(`✓ Large graph (10K nodes): ${duration}ms`)
    })
  })

  describe('Hub Node Detection', () => {
    it('should detect hubs in small graph (<50ms)', async () => {
      const { nodes, edges } = generateGraph(100, 10)
      const detector = new HubNodeDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(50)
      console.log(`✓ Small graph (100 nodes): ${duration}ms`)
    })

    it('should detect hubs in medium graph (<200ms)', async () => {
      const { nodes, edges } = generateGraph(1000, 10)
      const detector = new HubNodeDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(200)
      console.log(`✓ Medium graph (1K nodes): ${duration}ms`)
    })

    it('should detect hubs in large graph (<2s)', async () => {
      const { nodes, edges } = generateGraph(10000, 10)
      const detector = new HubNodeDetector()

      const start = Date.now()
      const patterns = await detector.detect(nodes, edges)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
      console.log(`✓ Large graph (10K nodes): ${duration}ms`)
    })
  })

  describe('Full Pattern Detection Service', () => {
    it('should analyze small graph completely (<150ms)', async () => {
      const { nodes, edges } = generateGraph(100, 5)
      const service = new PatternDetectionService()

      const start = Date.now()
      const result = await service.detectAllPatterns(nodes, edges)
      const duration = Date.now() - start

      expect(result.patterns.length).toBeGreaterThanOrEqual(0)
      expect(result.analysisTime).toBeGreaterThan(0)
      expect(duration).toBeLessThan(150)
      console.log(`✓ Small graph full analysis: ${duration}ms`)
    })

    it('should analyze medium graph completely (<1s)', async () => {
      const { nodes, edges } = generateGraph(1000, 5)
      const service = new PatternDetectionService()

      const start = Date.now()
      const result = await service.detectAllPatterns(nodes, edges)
      const duration = Date.now() - start

      expect(result.patterns.length).toBeGreaterThanOrEqual(0)
      expect(duration).toBeLessThan(1000)
      console.log(`✓ Medium graph full analysis: ${duration}ms`)
    })

    it('should analyze large graph completely (<5s)', async () => {
      const { nodes, edges } = generateGraph(10000, 5)
      const service = new PatternDetectionService()

      const start = Date.now()
      const result = await service.detectAllPatterns(nodes, edges)
      const duration = Date.now() - start

      expect(result.patterns.length).toBeGreaterThanOrEqual(0)
      expect(duration).toBeLessThan(5000)
      console.log(`✓ Large graph full analysis: ${duration}ms`)
    })
  })

  describe('Scalability', () => {
    it('should scale linearly with graph size', async () => {
      const service = new PatternDetectionService()
      const results: Array<{ nodes: number; time: number }> = []

      const sizes = [100, 500, 1000, 2000]

      for (const size of sizes) {
        const { nodes, edges } = generateGraph(size, 5)
        const start = Date.now()
        await service.detectAllPatterns(nodes, edges)
        const duration = Date.now() - start

        results.push({ nodes: size, time: duration })
        console.log(`  ${size} nodes: ${duration}ms`)
      }

      // Check that doubling graph size doesn't more than triple time
      // (allows for some non-linearity but catches exponential growth)
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1]
        const curr = results[i]
        const sizeRatio = curr.nodes / prev.nodes
        const timeRatio = curr.time / prev.time

        expect(timeRatio).toBeLessThan(sizeRatio * 2)
      }
    })
  })
})
```

### Running Performance Tests

```bash
# Run performance tests
RUN_PERF_TESTS=1 npm test tests/performance/patterns

# Run with specific graph size
RUN_PERF_TESTS=1 npm test -- --grep "large graph"
```

## Expected Performance Baselines

Based on O(V + E) algorithmic complexity:

| Graph Size | Nodes | Edges | Expected Time |
|------------|-------|-------|---------------|
| Small      | 100   | 500   | <100ms        |
| Medium     | 1K    | 5K    | <500ms        |
| Large      | 10K   | 50K   | <3s           |
| Very Large | 100K  | 500K  | <30s          |

**Note**: These are conservative estimates. After optimizations (Map-based lookups), performance should be significantly better.

## Benefits

1. **Catch Regressions**: Detect performance degradation in code reviews
2. **Validate Optimizations**: Prove that optimizations actually work
3. **Set SLAs**: Define acceptable performance for production
4. **Guide Optimization**: Identify which detectors need optimization first
5. **Scale Planning**: Understand limits before hitting them in production

## Implementation Steps

1. Create `tests/performance/` directory structure
2. Implement graph generation utilities
3. Add performance test suite
4. Run tests to establish baselines
5. Document expected performance in README
6. Add to CI as optional job (manual trigger or nightly)
7. Consider adding performance dashboard/tracking

## Related Context

- **Pattern Detection**: `src/patterns/`
- **Functional Tests**: `tests/unit/patterns/`
- **Feature**: FEAT-001 Pattern Detection
- **Performance Improvements**: Related optimization tasks

## Why Deferred

**Reason**: Performance tests are valuable but not critical for initial release. The functional tests verify correctness, which is the primary concern. Performance tests are best added after establishing baseline performance and before making optimizations.

**When to Implement**:
- Before implementing performance optimizations (to measure improvement)
- Before deploying to production (to set SLAs)
- When adding to CI/CD pipeline
- After noticing performance issues in practice

## Risk Assessment

**Risk Level**: Low
- These are additional tests, don't affect existing code
- Opt-in via environment variable
- Can be skipped if too slow

**Considerations**:
- May be slow to run (5-10 minutes for full suite)
- Should not be part of regular unit test runs
- Need to account for machine variability in thresholds
