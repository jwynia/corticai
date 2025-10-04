# TEST-005: Refactor Complex Mock Chains in Form Engine Tests

## Metadata
- **Status:** ready
- **Type:** refactoring
- **Epic:** phase-2-infrastructure
- **Priority:** medium
- **Size:** medium
- **Created:** 2025-09-27

## Description
Form engine tests (`src/services/form-engine/__tests__/form-engine.test.ts`) contain overly complex mock setups that mirror implementation details too closely, making tests brittle and hard to understand. The mock chains for database operations are particularly problematic.

## Problem Statement
- Complex mock chains like `mockDb.select().from().where().mockResolvedValue()`
- Tests break when implementation changes even if behavior remains correct
- Mock setup mirrors internal implementation rather than testing interfaces
- Difficult to understand test intentions due to complex mocking

## Current Problematic Pattern
```javascript
// BAD - Complex mock chain mirroring implementation
mockDb.select.mockReturnThis();
mockDb.from.mockReturnThis();
mockDb.where.mockResolvedValue([mockForm]);
```

## Acceptance Criteria
- [ ] Create helper functions for common test scenarios
- [ ] Replace complex mock chains with behavior-focused mocks
- [ ] Use realistic test data factories
- [ ] Focus on testing public interfaces, not implementation details
- [ ] Improve test readability and maintainability

## Replacement Strategy
```javascript
// GOOD - Helper functions with clear intent
function createMockFormWithFields(fieldCount: number) {
  return {
    id: 'test-form',
    fields: Array.from({length: fieldCount}, (_, i) => createMockField(i))
  };
}

function mockFormRepository(forms: Form[]) {
  mockDb.findForm.mockImplementation((id) =>
    forms.find(f => f.id === id) || null
  );
}
```

## Files Requiring Changes
- `src/services/form-engine/__tests__/form-engine.test.ts` - Refactor mock patterns
- `tests/setup/form-test-helpers.ts` - New helper functions

## Technical Approach
1. **Create test helper functions** for common scenarios
2. **Abstract database operations** into behavior-focused mocks
3. **Use test data factories** for consistent, realistic data
4. **Focus on public interfaces** rather than implementation details
5. **Group related mock setups** into reusable functions

## Benefits
- Tests are less brittle to implementation changes
- Clearer test intentions and improved readability
- Easier to maintain and extend test scenarios
- Better separation between test setup and test logic

## Risk Level
Medium - Requires careful refactoring of existing tests

## Estimated Effort
- Analysis of current test patterns: 2 hours
- Helper function creation: 3-4 hours
- Test refactoring: 4-6 hours
- Validation and cleanup: 2 hours

## Dependencies
- Understanding of form engine public interface
- Unit test infrastructure (INFRA-002)

## Success Metrics
- Reduced mock setup complexity
- Improved test readability scores
- Tests remain stable during minor implementation changes
- Clear separation between test data setup and assertions