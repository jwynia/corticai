# Improve Error Handling in EmbeddingRefresher.resume()

**Status**: Ready
**Priority**: High
**Effort**: Small (15-30 min)
**Type**: Bug Fix / Error Handling

## Context

From code review on 2025-11-15: The `resume()` method in EmbeddingRefresher swallows errors silently with only console.error logging. This could lead to silent failures in production where refresh operations fail without the caller being notified.

**File**: `src/semantic/maintenance/EmbeddingRefresher.ts:414-424`

## Current Implementation

```typescript
resume(): void {
  this.isPaused = false
  if (this.currentStatus.status === RefreshStatus.PAUSED) {
    this.currentStatus.status = RefreshStatus.IN_PROGRESS
    this.startProgressiveRefresh({}).catch(err => {
      console.error('Progressive refresh error:', err)  // ❌ Error lost
      this.currentStatus.status = RefreshStatus.FAILED
    })
  }
}
```

## Problem

- Errors are logged but not propagated
- No way for caller to know refresh failed
- Could lead to silent failures in production
- Caller can't react appropriately to failures

## Acceptance Criteria

- [ ] Errors from resume() are properly propagated or emitted
- [ ] Add error property to CurrentStatus interface if needed
- [ ] Consider event emitter pattern for async error notification
- [ ] Caller can detect and handle resume failures
- [ ] Existing tests updated to verify error handling
- [ ] Add test case for resume() error propagation

## Recommended Solution

```typescript
resume(): void {
  this.isPaused = false
  if (this.currentStatus.status === RefreshStatus.PAUSED) {
    this.currentStatus.status = RefreshStatus.IN_PROGRESS

    this.startProgressiveRefresh({}).catch(err => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.currentStatus.status = RefreshStatus.FAILED
      this.currentStatus.error = errorMessage

      // Option A: Throw synchronously (caller must use try/catch or await)
      throw new Error(`Failed to resume refresh: ${errorMessage}`)

      // Option B: Event emitter (better for async)
      // this.emit('error', new Error(`Failed to resume refresh: ${errorMessage}`))
    })
  }
}
```

## Dependencies

- None - isolated to EmbeddingRefresher

## Notes

- Consider broader error handling strategy for all maintenance components
- May want to standardize on event emitter pattern for async operations
- Review other async methods (startProgressiveRefresh, etc.) for similar issues

## Related

- See code review report from 2025-11-15
- Related to error handling patterns issue
