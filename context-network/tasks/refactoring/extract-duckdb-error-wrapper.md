# Task: Extract Error Handling Utility for DuckDB Adapter

## Context
The DuckDBStorageAdapter has repetitive error handling patterns throughout the code, violating DRY principle.

## Original Recommendation
From code review on 2025-09-09:
- Duplicate error handling pattern appears multiple times
- Should create a reusable error wrapper utility

## Requirements

### Acceptance Criteria
- [ ] Create error wrapper utility method
- [ ] Replace all duplicate error handling blocks
- [ ] Maintain consistent error messages
- [ ] Preserve error context and stack traces
- [ ] Update tests if needed

### Current Pattern (Repeated ~10 times)
```typescript
} catch (error) {
  throw new StorageError(
    `Message: ${(error as Error).message}`,
    StorageErrorCode.CONNECTION_FAILED,
    { originalError: error }
  )
}
```

### Proposed Solution
```typescript
private wrapError(
  message: string, 
  error: unknown, 
  code = StorageErrorCode.CONNECTION_FAILED,
  additionalContext?: Record<string, any>
): never {
  throw new StorageError(
    `${message}: ${(error as Error).message}`,
    code,
    { ...additionalContext, originalError: error }
  )
}
```

## Effort Estimate
- **Size**: Small (30 minutes)
- **Complexity**: Low
- **Risk**: Low (simple refactoring)

## Benefits
- Reduces code duplication
- Consistent error formatting
- Easier to modify error handling behavior
- Cleaner code

## Priority
**Low** - Code quality improvement, not affecting functionality