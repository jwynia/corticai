# Standardize Async/Promise Handling Style

**Status**: Ready
**Priority**: Low
**Effort**: Small (30-45 min)
**Type**: Code Style / Consistency

## Context

From code review on 2025-11-15: Inconsistent promise handling throughout the codebase - some places use `async/await`, others use `.catch()` chains, creating inconsistent patterns.

**Files**: Multiple files across maintenance components

## Current Situation

```typescript
// Pattern A: async/await (preferred)
async function doSomething() {
  try {
    const result = await someOperation()
    return result
  } catch (error) {
    handleError(error)
  }
}

// Pattern B: .catch() chains
function doSomething() {
  return someOperation()
    .then(result => processResult(result))
    .catch(error => handleError(error))
}

// Pattern C: Mixed (worst)
async function doSomething() {
  const result = await someOperation().catch(err => {
    // Mixed style
  })
}
```

## Problem

- Harder to review code when patterns vary
- Inconsistent error handling visibility
- Mixed async patterns are harder to understand
- Makes refactoring more difficult

## Acceptance Criteria

- [ ] Choose one consistent pattern (recommend async/await)
- [ ] Update all promise handling to use chosen pattern
- [ ] Document pattern in style guide
- [ ] Add ESLint rule to enforce pattern
- [ ] Exception: Promise.all/race can use native Promise API

## Recommended Approach

**Standardize on async/await everywhere:**

```typescript
// Good - Consistent async/await
async function doSomething(): Promise<Result> {
  try {
    const data = await fetchData()
    const processed = await processData(data)
    return processed
  } catch (error) {
    logger.error('Operation failed', error)
    throw new OperationError('Failed to do something', error)
  }
}

// Exception: Promise utilities
async function doMultiple(): Promise<Results[]> {
  const results = await Promise.all([
    operation1(),
    operation2(),
    operation3(),
  ])
  return results
}
```

## Implementation Plan

1. **Audit Current Code** (10 min)
   - Find all .catch() and .then() usage
   - Identify mixed patterns
   - List files to update

2. **Update Code** (20 min)
   - Convert .catch() to try/catch
   - Convert .then() chains to await
   - Keep Promise.all/race as-is

3. **Add Linting** (10 min)
   - Add ESLint rule: `prefer-await-to-callbacks`
   - Add ESLint rule: `prefer-await-to-then`
   - Configure exceptions for Promise utilities

4. **Documentation** (5 min)
   - Add to CONTRIBUTING.md
   - Document exceptions
   - Provide examples

## ESLint Configuration

```json
{
  "rules": {
    "prefer-await-to-callbacks": "error",
    "prefer-await-to-then": "warn",
    "no-return-await": "off"
  }
}
```

## Benefits

- **Consistency**: Same pattern everywhere
- **Readability**: async/await is more readable
- **Error Handling**: try/catch is more explicit
- **Debugging**: Better stack traces with async/await
- **Future-proof**: async/await is the modern standard

## Exceptions

Allow Promise API for:
- `Promise.all()` - Concurrent operations
- `Promise.race()` - First-to-complete scenarios
- `Promise.allSettled()` - Collecting all results
- Library code that expects Promise returns

## Dependencies

- None

## Related

- Part of broader code consistency effort
- Could extend to other style guidelines

## Testing

- Verify no behavior changes
- All existing tests should pass
- No new test coverage needed
