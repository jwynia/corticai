# Task: Add PerformanceMonitor clear() and clearOperation() Methods

**Status**: 📋 Planned
**Priority**: Low
**Effort**: Trivial (30 minutes)
**Created**: 2025-11-15
**Discovered**: Code TODO scan

## Context

`KuzuStorageAdapter.clearPerformanceMetrics()` has a TODO comment indicating that `PerformanceMonitor` doesn't have `clear()` or `clearOperation()` methods yet. The adapter method currently does nothing when called.

**Location**: `app/src/storage/adapters/KuzuStorageAdapter.ts:498-503`

**Current Code**:
```typescript
clearPerformanceMetrics(operation?: string): void {
  // TODO: Implement clear() or clearOperation() methods on PerformanceMonitor
  if (operation) {
    // Clear specific operation metrics - not implemented in PerformanceMonitor yet
    // For now, do nothing
  }
}
```

## Problem

Users cannot clear performance metrics, which could be useful for:
- Resetting metrics between test runs
- Clearing old data after analysis
- Managing memory usage in long-running processes

## Recommended Solution

Add two methods to `PerformanceMonitor`:

```typescript
// In PerformanceMonitor class

/**
 * Clear all performance metrics
 */
clear(): void {
  this.metrics.clear()
}

/**
 * Clear metrics for a specific operation
 */
clearOperation(operation: string): void {
  this.metrics.delete(operation)
}
```

Then update `KuzuStorageAdapter.clearPerformanceMetrics()`:

```typescript
clearPerformanceMetrics(operation?: string): void {
  const monitor = this.getPerformanceMonitor()
  if (!monitor) return

  if (operation) {
    monitor.clearOperation(operation)
  } else {
    monitor.clear()
  }
}
```

## Implementation Steps

1. **Locate PerformanceMonitor class**
   - Find the PerformanceMonitor implementation
   - Check if it uses a Map or similar structure for metrics

2. **Add clear() method**
   - Clear all metrics
   - Reset any counters or state

3. **Add clearOperation() method**
   - Clear metrics for specific operation only
   - Validate operation exists first

4. **Update KuzuStorageAdapter**
   - Replace TODO with actual implementation
   - Call the new PerformanceMonitor methods

5. **Add tests**
   - Test clearing all metrics
   - Test clearing specific operation
   - Test clearing non-existent operation (should not throw)

6. **Update other adapters if needed**
   - Check if other adapters have similar TODO comments
   - Apply same pattern

## Acceptance Criteria

- [ ] `PerformanceMonitor.clear()` removes all metrics
- [ ] `PerformanceMonitor.clearOperation(name)` removes metrics for specific operation
- [ ] `KuzuStorageAdapter.clearPerformanceMetrics()` works correctly
- [ ] Tests verify both methods work
- [ ] No existing tests break
- [ ] TODO comment removed from KuzuStorageAdapter

## Files to Modify

- `app/src/utils/PerformanceMonitor.ts` (or wherever PerformanceMonitor is defined)
- `app/src/storage/adapters/KuzuStorageAdapter.ts`
- `app/tests/unit/utils/PerformanceMonitor.test.ts` (add tests)
- `app/tests/unit/storage/KuzuStorageAdapter.test.ts` (add tests)

## Test Plan

```typescript
describe('PerformanceMonitor', () => {
  it('should clear all metrics', () => {
    const monitor = new PerformanceMonitor()
    monitor.recordOperation('op1', 100)
    monitor.recordOperation('op2', 200)

    monitor.clear()

    expect(monitor.getMetrics()).toEqual(new Map())
  })

  it('should clear specific operation metrics', () => {
    const monitor = new PerformanceMonitor()
    monitor.recordOperation('op1', 100)
    monitor.recordOperation('op2', 200)

    monitor.clearOperation('op1')

    expect(monitor.getMetrics().has('op1')).toBe(false)
    expect(monitor.getMetrics().has('op2')).toBe(true)
  })

  it('should handle clearing non-existent operation', () => {
    const monitor = new PerformanceMonitor()
    expect(() => monitor.clearOperation('nonexistent')).not.toThrow()
  })
})
```

## Priority Justification

**Low Priority** because:
- Not blocking any features
- Workaround exists (restart process, or don't clear)
- Performance monitoring is development/debugging feature
- No user-facing impact

**When to prioritize higher**:
- Production deployment with long-running processes
- Memory usage becomes a concern
- User requests metric reset capability

## Related

- **Original TODO**: `app/src/storage/adapters/KuzuStorageAdapter.ts:498`
- **PerformanceMonitor**: Location TBD (need to find it)
- **Pattern**: Similar to DuckDB adapter if it has same pattern
