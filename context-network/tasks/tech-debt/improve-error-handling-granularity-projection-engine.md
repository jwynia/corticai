# Task: Improve Error Handling Granularity in ProjectionEngine

**Status**: 📋 Planned
**Priority**: Medium
**Effort**: Medium (2-4 hours)
**Created**: 2025-11-16
**Source**: Code Review - TASK-005 Implementation

## Context

ProjectionEngine currently catches all errors uniformly without discriminating between error types. This makes it difficult to:
- Distinguish between transient failures (network timeouts) and permanent failures (invalid data)
- Implement appropriate retry logic
- Generate meaningful metrics for monitoring
- Debug production issues

**Current Implementation** (`app/src/semantic/ProjectionEngine.ts`):
```typescript
// Lines 334-342
if (this.blockProvider) {
  try {
    return await this.blockProvider.fetchBlocksForEntity(result.id, depth)
  } catch (error) {
    // ALL errors treated the same - no discrimination
    console.warn(`Failed to fetch blocks for ${result.id}, falling back to mock:`, error)
    return this.generateMockBlocks(result)
  }
}
```

## Problem

Generic error handling has several issues:

1. **Lost Context**: Can't tell if failure is due to network, validation, or system error
2. **No Retry Logic**: Transient failures (timeouts) should be retried, but aren't
3. **Poor Observability**: Can't track error patterns or failure rates by type
4. **Missed Optimization**: Cache could be used on network errors but not validation errors
5. **Debugging Difficulty**: Production issues lack error classification

## Recommended Solution

### Define Error Taxonomy

Create a clear error classification:

```typescript
// app/src/storage/errors.ts
export class StorageError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'StorageError'
  }
}

export class NetworkError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, cause)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, cause)
    this.name = 'ValidationError'
  }
}

export class TimeoutError extends NetworkError {
  constructor(message: string, public readonly timeoutMs: number, cause?: Error) {
    super(message, cause)
    this.name = 'TimeoutError'
  }
}

export class NotFoundError extends StorageError {
  constructor(message: string, public readonly entityId: string, cause?: Error) {
    super(message, cause)
    this.name = 'NotFoundError'
  }
}
```

### Implement Discriminated Error Handling

```typescript
private async getBlocksForDepth(
  result: RankedResult,
  depth: ContextDepth
): Promise<SemanticBlock[]> {
  if (depth < ContextDepth.SEMANTIC) {
    return []
  }

  if (!this.blockProvider) {
    return this.generateMockBlocks(result)
  }

  try {
    return await this.blockProvider.fetchBlocksForEntity(result.id, depth)
  } catch (error) {
    return this.handleBlockFetchError(error, result, depth)
  }
}

private async handleBlockFetchError(
  error: unknown,
  result: RankedResult,
  depth: ContextDepth,
  retryCount = 0
): Promise<SemanticBlock[]> {
  const MAX_RETRIES = 2

  // Transient network errors - retry with backoff
  if (error instanceof TimeoutError || error instanceof NetworkError) {
    if (retryCount < MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 100 // 100ms, 200ms, 400ms
      await new Promise(resolve => setTimeout(resolve, backoffMs))

      try {
        return await this.blockProvider!.fetchBlocksForEntity(result.id, depth)
      } catch (retryError) {
        return this.handleBlockFetchError(retryError, result, depth, retryCount + 1)
      }
    }

    // Max retries exceeded
    this.logger?.warn('Block fetch failed after retries', {
      operation: 'getBlocksForDepth',
      errorType: 'NetworkError',
      retries: retryCount,
      depth
    })
    this.metrics?.increment('projection.block_fetch.network_error')
  }

  // Validation errors - log and fall back (don't retry)
  else if (error instanceof ValidationError) {
    this.logger?.error('Block validation failed', {
      operation: 'getBlocksForDepth',
      errorType: 'ValidationError',
      errorMessage: error.message,
      depth
    })
    this.metrics?.increment('projection.block_fetch.validation_error')
  }

  // Not found - expected scenario, log at debug level
  else if (error instanceof NotFoundError) {
    this.logger?.debug('No blocks found for entity', {
      operation: 'getBlocksForDepth',
      depth
    })
    this.metrics?.increment('projection.block_fetch.not_found')
  }

  // Unknown error - log and track
  else {
    this.logger?.error('Unexpected error fetching blocks', {
      operation: 'getBlocksForDepth',
      errorType: error?.constructor?.name || 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      depth
    })
    this.metrics?.increment('projection.block_fetch.unknown_error')
  }

  // Always fall back to mock blocks
  return this.generateMockBlocks(result)
}
```

### Add Metrics Integration

```typescript
interface ProjectionMetrics {
  increment(metric: string, value?: number): void
  timing(metric: string, durationMs: number): void
}

export class ProjectionEngine {
  private readonly metrics?: ProjectionMetrics

  constructor(
    config?: ProjectionEngineConfig,
    blockProvider?: BlockProvider,
    suggestionProvider?: SuggestionProvider,
    logger?: Logger,
    metrics?: ProjectionMetrics  // Add metrics
  ) {
    // ...
    this.metrics = metrics
  }
}
```

## Implementation Steps

1. **Define Error Types**
   - Create `app/src/storage/errors.ts`
   - Define error hierarchy (NetworkError, ValidationError, etc.)
   - Update storage providers to throw typed errors

2. **Add Retry Logic**
   - Implement `handleBlockFetchError()` helper
   - Add exponential backoff for transient errors
   - Configure max retries (default: 2)

3. **Update Error Handling**
   - Replace generic catch blocks with discriminated handling
   - Add specific handling for each error type
   - Implement same pattern for `getSuggestionsForDepth()`

4. **Add Metrics Integration**
   - Define ProjectionMetrics interface
   - Add optional metrics parameter to constructor
   - Emit metrics for each error type
   - Track retry counts and success rates

5. **Update Tests**
   - Test retry logic with network errors
   - Test immediate fallback for validation errors
   - Test metrics emission
   - Test max retry limits

## Acceptance Criteria

- [ ] Error types defined and exported
- [ ] Retry logic implemented for transient errors
- [ ] Different errors handled appropriately (retry vs. fallback)
- [ ] Metrics emitted for each error type
- [ ] Tests verify retry behavior
- [ ] Tests verify error discrimination
- [ ] All existing tests still pass
- [ ] Documentation updated

## Error Handling Matrix

| Error Type | Action | Retry? | Log Level | Metric |
|------------|--------|--------|-----------|--------|
| TimeoutError | Retry with backoff | Yes (max 2) | warn | `network_error` |
| NetworkError | Retry with backoff | Yes (max 2) | warn | `network_error` |
| ValidationError | Immediate fallback | No | error | `validation_error` |
| NotFoundError | Immediate fallback | No | debug | `not_found` |
| Unknown | Immediate fallback | No | error | `unknown_error` |

## Performance Considerations

- **Backoff Strategy**: Exponential (100ms, 200ms, 400ms)
- **Max Retries**: 2 (total 3 attempts)
- **Total Max Delay**: ~700ms for worst case
- **Impact**: Minimal for transient failures, better UX than immediate failure

## Dependencies

**Code Dependencies**:
- Error type definitions (new file)
- Metrics interface (may need to define)
- Logger (see related task)

**Task Dependencies**:
- Should be done **after** structured logging task
- Can be done independently of other features

**Related Tasks**:
- Structured Logging in ProjectionEngine (prerequisite for good observability)

## Related

- **Original Code Review**: TASK-005 Implementation Review (2025-11-16)
- **Files to Create**: `app/src/storage/errors.ts`
- **Files to Modify**:
  - `app/src/semantic/ProjectionEngine.ts`
  - Storage provider implementations (to throw typed errors)
- **Tests to Add**: `ProjectionEngine.error-handling.test.ts`

## Notes

- This is an **enhancement**, not a bug fix - current behavior is safe
- Focus on **observability** - better understanding of failure modes
- Consider adding **circuit breaker** pattern in future iteration
- Retry logic should be **configurable** (max retries, backoff strategy)
- Must maintain **backward compatibility** - metrics/logger optional
