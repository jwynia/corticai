# Task: Add Query Performance Monitoring

## Priority: LOW

## Context
From code review on 2025-09-16: Graph operations should have performance monitoring to detect slow queries and optimization opportunities.

## Current State
- No performance metrics collected
- No slow query detection
- No baseline performance data

## Acceptance Criteria
- [ ] Add timing to all graph operations
- [ ] Log slow queries (configurable threshold)
- [ ] Collect query statistics (count, avg time, max time)
- [ ] Add performance benchmarks
- [ ] Create performance dashboard or reports
- [ ] Add alerts for performance degradation

## Proposed Implementation

```typescript
interface QueryMetrics {
  operation: string
  query: string
  startTime: number
  endTime: number
  resultCount: number
  cacheHit: boolean
}

private async executeWithMetrics<T>(
  operation: string,
  query: string,
  executor: () => Promise<T>
): Promise<T> {
  const metrics: QueryMetrics = {
    operation,
    query: this.sanitizeQuery(query),
    startTime: Date.now(),
    cacheHit: false,
    resultCount: 0,
    endTime: 0
  }

  try {
    const result = await executor()
    metrics.endTime = Date.now()
    metrics.resultCount = Array.isArray(result) ? result.length : 1

    this.reportMetrics(metrics)
    return result
  } catch (error) {
    metrics.endTime = Date.now()
    metrics.error = error
    this.reportMetrics(metrics)
    throw error
  }
}

private reportMetrics(metrics: QueryMetrics) {
  const duration = metrics.endTime - metrics.startTime

  if (duration > this.config.slowQueryThreshold) {
    this.logWarn(`Slow query detected: ${metrics.operation} took ${duration}ms`)
  }

  // Send to metrics system
  this.metricsCollector.record(metrics)
}
```

## Performance Targets
- Simple queries: < 10ms
- Path traversal (depth 3): < 50ms
- Complex queries: < 100ms
- Large result sets: < 500ms

## Dependencies
- Metrics collection system
- Performance baseline establishment
- Dashboard or reporting tool

## Effort Estimate
Medium (4-6 hours) plus ongoing monitoring setup

## Files to Modify
- `/app/src/storage/adapters/KuzuStorageAdapter.ts`
- Create `/app/src/monitoring/QueryMetrics.ts`
- Test files for performance assertions

## Future Enhancements
- Query result caching
- Query optimization hints
- Automatic index suggestions
- Query plan analysis