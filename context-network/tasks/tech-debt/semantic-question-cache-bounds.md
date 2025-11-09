# Tech Debt: Implement Bounded LRU Cache for QuestionGenerator

**Created**: 2025-11-09
**Source**: Code review of Semantic Processing Phase 2
**Priority**: HIGH
**Effort**: Medium (30-60 minutes)
**Risk**: Medium

## Problem

The `QuestionGenerator` class uses an unbounded `Map` for caching generated questions, which could lead to unbounded memory growth in long-running processes:

```typescript
// Current implementation - Line 115
private cache: Map<string, QuestionAnswerPair[]> = new Map()
```

**Impact**:
- Memory leaks in long-running servers
- No control over cache memory footprint
- Could cause OOM errors with high document throughput

**Location**: `app/src/semantic/QuestionGenerator.ts:115`

## Recommended Solution

Implement an LRU (Least Recently Used) cache with configurable maximum size:

```typescript
interface CacheEntry {
  questions: QuestionAnswerPair[]
  lastAccessed: number
}

private cache: Map<string, CacheEntry> = new Map()
private readonly maxCacheSize: number

constructor(config?: QuestionGeneratorConfig) {
  // ...
  this.maxCacheSize = config?.maxCacheSize ?? 1000
}

private getCached(key: string): QuestionAnswerPair[] | undefined {
  const cached = this.cache.get(key)
  if (cached) {
    cached.lastAccessed = Date.now()
    return cached.questions
  }
  return undefined
}

private setCached(key: string, questions: QuestionAnswerPair[]): void {
  // Evict oldest entry if cache is full
  if (this.cache.size >= this.maxCacheSize) {
    const oldestKey = [...this.cache.entries()]
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)[0][0]
    this.cache.delete(oldestKey)
  }
  this.cache.set(key, { questions, lastAccessed: Date.now() })
}
```

## Alternative: Use Existing LRU Library

Consider using `lru-cache` npm package for battle-tested implementation:

```bash
npm install lru-cache
```

```typescript
import { LRUCache } from 'lru-cache'

private cache: LRUCache<string, QuestionAnswerPair[]>

constructor(config?: QuestionGeneratorConfig) {
  this.cache = new LRUCache({
    max: config?.maxCacheSize ?? 1000,
    ttl: 1000 * 60 * 60, // 1 hour TTL
  })
}
```

## Acceptance Criteria

- [ ] Cache has configurable maximum size (default: 1000 entries)
- [ ] Oldest/least-recently-used entries are evicted when cache is full
- [ ] `clearCache()` method still works as expected
- [ ] All existing QuestionGenerator tests pass
- [ ] New tests added for:
  - [ ] Cache eviction behavior
  - [ ] LRU ordering
  - [ ] Cache size limits
- [ ] Performance: Eviction adds < 5ms overhead
- [ ] Documentation updated with cache behavior

## Testing Strategy

1. **Unit tests**:
   - Cache respects max size
   - LRU eviction works correctly
   - Cache statistics are accurate

2. **Performance tests**:
   - Benchmark cache operations with/without eviction
   - Measure memory footprint with bounded cache
   - Test with high throughput scenarios

3. **Integration tests**:
   - Verify no regressions in question generation
   - Test cache behavior across multiple entities

## Dependencies

- None - can be implemented independently

## Related Issues

- Review cache hit rates in production to inform default max size
- Consider adding cache statistics/metrics for monitoring
- May want similar bounded cache for RelationshipInference in future

## Implementation Notes

- Prefer using proven LRU library over custom implementation
- Add configuration option to disable caching entirely if needed
- Consider adding cache metrics (hits, misses, evictions) for observability
- Document memory implications in JSDoc

## References

- Code Review: `/review-code` output (2025-11-09)
- File: `app/src/semantic/QuestionGenerator.ts:115`
- Related: Phase 2 implementation completion
