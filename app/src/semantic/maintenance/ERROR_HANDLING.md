# Error Handling Patterns - Maintenance Components

**Last Updated**: 2025-11-15
**Status**: Standardized

## Overview

This document describes the standardized error handling patterns used across all semantic maintenance components (MaintenanceScheduler, EmbeddingRefresher, LifecycleAnalyzer, QualityMetrics).

## Core Principles

1. **Explicit Error Extraction**: Always extract error messages consistently
2. **Typed Errors**: Prefer Error instances over strings
3. **Contextual Information**: Provide enough context to debug
4. **Graceful Degradation**: Support partial success where appropriate
5. **Observable Failures**: Errors must be discoverable by callers

## Standard Error Extraction

All error handling follows this pattern:

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  // Handle error appropriately
}
```

**Why this pattern?**
- Handles Error objects, strings, and unknown types
- Provides consistent error messages
- Type-safe and defensive

## Error Handling Strategies

### Strategy 1: Return Errors in Result Objects

**Use When**:
- Batch operations that should continue on error
- Operations processing multiple items
- When partial success is acceptable

**Pattern**:
```typescript
async function processBatch(config: Config): Promise<Result> {
  const errors: string[] = []
  let processed = 0

  try {
    // Main operation
    processed = await doWork()

    return {
      status: 'completed',
      processed,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    errors.push(errorMessage)

    if (config.continueOnError) {
      return {
        status: 'failed',
        processed,
        errors,
      }
    }

    throw error
  }
}
```

**Examples in Codebase**:
- `QualityMetrics.detectOrphanedContent()` - Returns `{ orphans, errors }`
- `EmbeddingRefresher.refreshBatch()` - Returns `{ status, refreshed, errors }`
- `LifecycleAnalyzer.identifyStaleContent()` - Returns `{ staleEntities, errors }`

### Strategy 2: Throw Exceptions

**Use When**:
- Atomic operations that must succeed or fail completely
- Configuration/initialization errors
- Precondition violations

**Pattern**:
```typescript
async function atomicOperation(id: string): Promise<Result> {
  if (!isValid(id)) {
    throw new Error(`Invalid ID: ${id}`)
  }

  try {
    return await performOperation(id)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Operation failed: ${errorMessage}`)
  }
}
```

**Examples in Codebase**:
- `MaintenanceScheduler.schedule()` - Throws on invalid job
- `EmbeddingRefresher.refreshBatch()` - Throws on invalid batch size
- `LifecycleAnalyzer.identifyStaleContent()` - Throws on invalid config

### Strategy 3: Job Execution Pattern

**Use When**:
- Implementing MaintenanceJob.execute() functions
- Background operations
- Scheduled tasks

**Pattern**:
```typescript
execute: async (ctx: JobContext) => {
  try {
    ctx.log('Starting operation')

    if (ctx.isCancelled()) {
      return { success: false, reason: 'cancelled' }
    }

    // Perform work
    const result = await doWork()

    ctx.updateProgress(1.0)
    return {
      success: true,
      ...result,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    ctx.log(`Operation failed: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
```

**Examples in Codebase**:
- `QualityMetrics.createQualityCheckJob()`
- `EmbeddingRefresher.createRefreshJob()`
- `LifecycleAnalyzer.createAnalysisJob()`

### Strategy 4: Observable Async Errors

**Use When**:
- Asynchronous operations started synchronously
- Fire-and-forget operations
- Background tasks

**Pattern**:
```typescript
class Service {
  private status: Status = { state: 'idle', error: undefined }

  resume(): void {
    this.status.state = 'running'
    this.status.error = undefined

    this.doAsyncWork().catch(err => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.status.state = 'failed'
      this.status.error = errorMessage
      console.error('Async operation failed:', errorMessage, err)
    })
  }

  getStatus(): Status {
    return { ...this.status }
  }
}
```

**Examples in Codebase**:
- `EmbeddingRefresher.resume()` - Stores error in CurrentStatus

## Error Message Guidelines

### Good Error Messages

✅ **Specific and actionable**:
```typescript
throw new Error('Invalid batch size: must be > 0, got ${size}')
```

✅ **Include context**:
```typescript
throw new Error(`Failed to refresh entity ${entityId}: ${errorMessage}`)
```

✅ **Indicate next steps**:
```typescript
throw new Error('Quality weights must sum to 1.0 (within 0.01), got ${sum.toFixed(3)}')
```

### Poor Error Messages

❌ **Vague**:
```typescript
throw new Error('Invalid input')
```

❌ **No context**:
```typescript
throw new Error(errorMessage)  // What failed?
```

❌ **Technical jargon only**:
```typescript
throw new Error('ECONNREFUSED')  // What does this mean for the user?
```

## Testing Error Scenarios

Every error path should have a corresponding test:

```typescript
describe('Error Handling', () => {
  it('should reject invalid configuration', async () => {
    await expect(
      service.configure({ invalid: true })
    ).rejects.toThrow('Invalid configuration')
  })

  it('should capture and report async errors', async () => {
    service.startAsync()
    await waitForError()

    const status = service.getStatus()
    expect(status.error).toBeDefined()
    expect(status.state).toBe('failed')
  })

  it('should continue on error when configured', async () => {
    const result = await service.process({
      continueOnError: true
    })

    expect(result.errors).toBeDefined()
    expect(result.processed).toBeGreaterThan(0)
  })
})
```

## Configuration Options

Most operations support a `continueOnError` option:

```typescript
interface OperationConfig {
  /** Continue processing on error instead of throwing */
  continueOnError?: boolean
}
```

**Default behavior**:
- `continueOnError: false` (default) - Throw on first error
- `continueOnError: true` - Collect errors and return in result

## Logging

All error handlers should log errors appropriately:

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error('Operation failed:', errorMessage, error)
  // Return or throw as appropriate
}
```

**Best Practices**:
- Log the full error object for stack traces
- Include operation context in log message
- Use consistent log prefixes (e.g., `[ComponentName]`)

## Migration Checklist

When adding new error handling:

- [ ] Use standard error extraction pattern
- [ ] Choose appropriate strategy (return vs throw)
- [ ] Provide clear, actionable error messages
- [ ] Add test cases for error scenarios
- [ ] Log errors appropriately
- [ ] Document error conditions in JSDoc
- [ ] Support `continueOnError` where appropriate

## See Also

- [MaintenanceScheduler](./MaintenanceScheduler.ts) - Example job execution errors
- [QualityMetrics](./QualityMetrics.ts) - Example batch operation errors
- [EmbeddingRefresher](./EmbeddingRefresher.ts) - Example async error handling

## Future Improvements

Potential enhancements to consider:

1. **Custom Error Classes**: Create typed error classes for different failure modes
2. **Error Codes**: Add machine-readable error codes for better handling
3. **Retry Policies**: Standardize retry logic across components
4. **Error Metrics**: Track error rates and types for observability
5. **Event Emitters**: Consider event-based error notification for async operations
