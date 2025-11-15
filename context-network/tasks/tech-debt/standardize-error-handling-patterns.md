# Standardize Error Handling Patterns in Maintenance Components

**Status**: Ready
**Priority**: Medium
**Effort**: Medium (2-3 hours)
**Type**: Refactoring / Consistency

## Context

From code review on 2025-11-15: Inconsistent error handling patterns across maintenance components. Some methods throw errors, others return errors in result objects, creating confusion for consumers.

**Files**:
- `src/semantic/maintenance/QualityMetrics.ts:334-346`
- `src/semantic/maintenance/EmbeddingRefresher.ts:285-296`
- `src/semantic/maintenance/LifecycleAnalyzer.ts` (various)

## Current Situation

Mixed strategies across codebase:

```typescript
// Pattern A: Return errors in result object
catch (error) {
  errors.push(error instanceof Error ? error.message : String(error))
  if (config.continueOnError) {
    return { orphans, totalEntities: 0, orphanRatio: 0, errors }
  }
  throw error  // ❌ Inconsistent - sometimes throws, sometimes doesn't
}

// Pattern B: Always throw
catch (error) {
  throw new ServiceError('Operation failed', error)
}
```

## Problem

- Consumers don't know which error handling pattern to expect
- Makes it harder to compose operations
- Inconsistent error recovery strategies
- Documentation burden increases

## Acceptance Criteria

- [ ] Choose one consistent error handling strategy
- [ ] Document the chosen strategy in ARCHITECTURE.md
- [ ] Update all maintenance components to follow strategy
- [ ] Add interface/type definitions for error results if needed
- [ ] Update tests to verify consistent behavior
- [ ] Add JSDoc comments explaining error handling approach

## Recommended Approach

**Option A: Result Objects (Recommended for Batch Operations)**
- Good for operations that process multiple items
- Allows partial success
- Better for maintenance jobs that shouldn't fail completely

```typescript
interface OperationResult<T> {
  success: boolean
  data?: T
  errors?: Error[]
  partialSuccess?: boolean
}
```

**Option B: Throw Exceptions (Recommended for Atomic Operations)**
- Good for operations that must succeed or fail atomically
- Simpler error handling for callers
- Better for critical path operations

## Implementation Plan

1. **Week 1: Analysis**
   - Audit all error handling patterns
   - Categorize operations (batch vs atomic)
   - Define error handling strategy per operation type

2. **Week 2: Implementation**
   - Create base error types/result types
   - Refactor one component at a time
   - Update tests for each component

3. **Week 3: Documentation**
   - Update architecture docs
   - Add error handling guide
   - Document examples

## Dependencies

- Should align with broader error handling strategy
- May need team discussion on approach

## Related Tasks

- `improve-error-handling-embedder-resume.md`
- Future: Implement logger abstraction

## Notes

Consider creating an Error Handling ADR (Architectural Decision Record) to document the decision and rationale for future reference.
