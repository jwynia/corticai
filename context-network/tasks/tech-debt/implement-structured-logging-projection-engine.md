# Task: Implement Structured Logging in ProjectionEngine

**Status**: 📋 Planned
**Priority**: Medium
**Effort**: Small-Medium (1-2 hours)
**Created**: 2025-11-16
**Source**: Code Review - TASK-005 Implementation

## Context

ProjectionEngine currently uses `console.warn()` for error logging in production code. This limits observability and debugging capabilities in production environments.

**Current Implementation** (`app/src/semantic/ProjectionEngine.ts`):
```typescript
// Line 339
console.warn(`Failed to fetch blocks for ${result.id}, falling back to mock:`, error)

// Line 464-466
console.warn(
  `Failed to generate suggestions for ${result.id}, falling back to empty:`,
  error
)
```

## Problem

Using `console.warn` has several limitations:
- Console logs may not be captured in production monitoring systems
- No structured logging for automated analysis
- Lacks context about operation (depth level, timing, etc.)
- Potential PII exposure (entity IDs in logs)
- Difficult to filter/aggregate errors across services
- No integration with metrics/alerting systems

## Recommended Solution

### Option 1: Use Existing Logger Infrastructure (Preferred)

The codebase already has logger integration in other components (MaintenanceScheduler, EmbeddingRefresher). Use the same pattern:

```typescript
export class ProjectionEngine {
  private cache: Map<CacheKey, CacheEntry>
  private preferences: Map<string, ContextDepth>
  private readonly cacheSize: number
  private readonly defaultDepth: ContextDepth
  private readonly blockProvider?: BlockProvider
  private readonly suggestionProvider?: SuggestionProvider
  private readonly logger?: Logger  // Add logger

  constructor(
    config?: ProjectionEngineConfig,
    blockProvider?: BlockProvider,
    suggestionProvider?: SuggestionProvider,
    logger?: Logger  // Optional logger parameter
  ) {
    this.cache = new Map()
    this.preferences = new Map()
    this.cacheSize = config?.cacheSize ?? 100
    this.defaultDepth = config?.defaultDepth ?? ContextDepth.STRUCTURE
    this.blockProvider = blockProvider
    this.suggestionProvider = suggestionProvider
    this.logger = logger
  }

  private async getBlocksForDepth(
    result: RankedResult,
    depth: ContextDepth
  ): Promise<SemanticBlock[]> {
    if (depth < ContextDepth.SEMANTIC) {
      return []
    }

    if (this.blockProvider) {
      try {
        return await this.blockProvider.fetchBlocksForEntity(result.id, depth)
      } catch (error) {
        this.logger?.warn('Block fetch failed, using fallback', {
          operation: 'getBlocksForDepth',
          depth,
          errorType: error.constructor.name,
          errorMessage: error.message,
          // Note: entityId intentionally omitted to avoid PII in logs
        })
        return this.generateMockBlocks(result)
      }
    }

    return this.generateMockBlocks(result)
  }
}
```

**Benefits**:
- Consistent with existing codebase patterns
- Structured logs for automated analysis
- Easy integration with monitoring tools
- Optional logger (backward compatible)
- No PII exposure

### Option 2: Create Logger Abstraction

If no logger exists, create a simple abstraction:

```typescript
interface Logger {
  debug(message: string, context?: Record<string, any>): void
  info(message: string, context?: Record<string, any>): void
  warn(message: string, context?: Record<string, any>): void
  error(message: string, context?: Record<string, any>): void
}

class ConsoleLogger implements Logger {
  warn(message: string, context?: Record<string, any>): void {
    console.warn(message, context)
  }
  // ... other methods
}
```

## Implementation Steps

1. **Locate Logger Infrastructure**
   - Check `app/src/utils/Logger.ts` or similar
   - Review how MaintenanceScheduler uses logger
   - Understand logger initialization pattern

2. **Update ProjectionEngine Constructor**
   - Add optional `logger?: Logger` parameter
   - Store as private readonly property
   - Maintain backward compatibility (logger optional)

3. **Replace console.warn Calls**
   - Update `getBlocksForDepth()` error handling (line 339)
   - Update `getSuggestionsForDepth()` error handling (line 464-466)
   - Use structured context objects
   - Remove entity IDs from logs (PII concern)

4. **Update Tests**
   - Mock logger in integration tests
   - Verify log messages are generated
   - Test that logger is optional
   - Ensure no PII in log output

5. **Update Call Sites**
   - ContextPipeline initialization
   - Any other ProjectionEngine instantiations
   - Pass logger instance if available

## Acceptance Criteria

- [ ] Logger is optional parameter (backward compatible)
- [ ] All `console.warn` calls replaced with structured logging
- [ ] No PII (entity IDs, user data) in logs
- [ ] Structured context includes: operation, depth, error type/message
- [ ] Logger integration consistent with MaintenanceScheduler pattern
- [ ] All existing tests pass
- [ ] New tests verify logger integration
- [ ] TypeScript compilation passes

## PII Considerations

**DO NOT LOG**:
- Entity IDs (could be user identifiers)
- Result content
- Query text (could contain sensitive search terms)

**SAFE TO LOG**:
- Depth levels (enum values)
- Error types and messages (sanitized)
- Operation names
- Timing metrics
- Cache statistics

## Dependencies

**Code Dependencies**:
- Logger interface/implementation (check `utils/` or `logging/`)
- MaintenanceScheduler pattern (for reference)

**Task Dependencies**:
- None (can be done independently)

## Related

- **Original Code Review**: TASK-005 Implementation Review (2025-11-16)
- **Similar Implementation**: MaintenanceScheduler.ts, EmbeddingRefresher.ts
- **Files to Modify**: `app/src/semantic/ProjectionEngine.ts`
- **Files to Update**: `app/src/semantic/ContextPipeline.ts` (instantiation)

## Notes

- Keep logger **optional** to maintain backward compatibility
- Follow existing logger patterns in the codebase
- This is a **quality improvement**, not a bug fix
- Can be done in isolation without affecting functionality
- Consider adding debug-level logs for performance metrics
