# Task: Fix Jest Conditional Expect Violations

## Priority: Medium

## Original Recommendation
From Code Review (2025-09-25): 74 ESLint errors for `jest/no-conditional-expect` indicate test quality issues that could mask test failures.

## Why Deferred
- **Effort**: Large (multiple hours, 60+ test cases)
- **Risk**: Low but requires careful analysis
- **Dependencies**: Each test needs individual review
- **Requires**: Understanding original test intent

## Current State
- Total violations: 74
- Primary file: `/mobile/src/services/database/__tests__/error-integration.test.js` (57 violations)
- Secondary file: `/mobile/__tests__/database-setup.test.js` (3 violations)
- Pattern: Conditional expects inside if/else blocks

## Problem Description
Tests using pattern like:
```javascript
if (error instanceof SpecificError) {
  expect(error.code).toBe('SPECIFIC_CODE');
  expect(error.context).toHaveProperty('operation');
} else {
  expect(error).toBeInstanceOf(GenericError);
}
```

This violates Jest best practices because:
- Tests might pass without any assertions running
- Makes it unclear what's actually being tested
- Can hide test failures

## Acceptance Criteria
- [ ] All 74 conditional expect violations resolved
- [ ] Tests remain meaningful and catch regressions
- [ ] Test readability improved
- [ ] No reduction in test coverage
- [ ] ESLint passes without jest/no-conditional-expect errors

## Recommended Approach

### Pattern 1: Split into Multiple Tests
```javascript
// BEFORE
it('handles errors', () => {
  if (condition) {
    expect(x).toBe(y);
  } else {
    expect(a).toBe(b);
  }
});

// AFTER
describe('error handling', () => {
  it('handles specific error when condition is true', () => {
    // Arrange to ensure condition
    expect(x).toBe(y);
  });

  it('handles generic error when condition is false', () => {
    // Arrange to ensure !condition
    expect(a).toBe(b);
  });
});
```

### Pattern 2: Use Jest's Conditional Assertions
```javascript
// AFTER
it('handles error correctly', () => {
  if (error instanceof SpecificError) {
    // Use early return with clear assertion
    expect(error).toBeInstanceOf(SpecificError);
    expect(error.code).toBe('SPECIFIC_CODE');
    return;
  }

  // Default assertion
  expect(error).toBeInstanceOf(GenericError);
});
```

### Pattern 3: Use Test.each for Multiple Scenarios
```javascript
// AFTER
test.each([
  ['SpecificError', SpecificError, 'SPECIFIC_CODE'],
  ['GenericError', GenericError, 'GENERIC_CODE'],
])('handles %s correctly', (name, ErrorClass, expectedCode) => {
  const error = getError();
  expect(error).toBeInstanceOf(ErrorClass);
  expect(error.code).toBe(expectedCode);
});
```

## Implementation Steps

1. **Analyze Current Tests**
   - Document what each conditional test is checking
   - Identify patterns across violations
   - Group similar issues

2. **Refactor Systematically**
   - Start with error-integration.test.js
   - Apply consistent patterns
   - Ensure no behavior changes

3. **Validate**
   - Run tests after each refactor
   - Check coverage hasn't decreased
   - Verify ESLint passes

## Files to Modify
1. `/mobile/src/services/database/__tests__/error-integration.test.js` (57 errors)
2. `/mobile/__tests__/database-setup.test.js` (3 errors)
3. Other test files with similar patterns

## Estimated Effort
- Analysis: 2 hours
- Refactoring: 4-6 hours
- Testing: 1 hour
- Total: 7-9 hours

## Risk Assessment
- **Low Risk**: Only modifying test code
- **Main Risk**: Accidentally removing important assertions
- **Mitigation**: Run tests frequently, review coverage

## Success Metrics
- 0 jest/no-conditional-expect violations
- Test coverage maintained or improved
- Test execution time similar or better
- Improved test readability

## Notes
- Consider creating shared test utilities for common patterns
- Document testing patterns for future reference
- Update team testing guidelines