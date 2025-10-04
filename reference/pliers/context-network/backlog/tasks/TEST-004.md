# TEST-004: Improve Database Connection Testing

## Metadata
- **Status:** ready
- **Type:** refactoring
- **Epic:** phase-2-infrastructure
- **Priority:** medium
- **Size:** small
- **Created:** 2025-09-27

## Description
Database connection tests (`tests/db/connection.test.ts:141-154`) rely on external network calls to "nonexistent" hosts to test failure scenarios. This makes tests flaky, slow, and dependent on network conditions rather than testing actual application behavior.

## Problem Statement
- Tests depend on network timeouts to simulate failures
- External dependencies make tests unreliable
- Slow test execution due to network timeouts
- Tests may pass/fail based on network conditions rather than code logic

## Current Problematic Pattern
```javascript
// BAD - Depends on external network failure
it('should implement retry logic for connection failures', async () => {
  process.env.DATABASE_URL = 'postgresql://wrong:wrong@nonexistent:5432/wrong';
  // ... relies on network timeout
});
```

## Acceptance Criteria
- [ ] Replace network-dependent failure tests with proper mocks
- [ ] Mock connection failures at the appropriate abstraction level
- [ ] Ensure tests are fast and deterministic
- [ ] Maintain test coverage for error handling scenarios
- [ ] Document proper patterns for testing connection failures

## Replacement Strategy
```javascript
// GOOD - Mock connection failures
it('should implement retry logic for connection failures', async () => {
  const mockClient = createMockDatabase();
  mockClient.connect.mockRejectedValue(new Error('Connection failed'));

  await expect(getDatabaseClient()).rejects.toThrow('Connection failed');
  expect(mockClient.connect).toHaveBeenCalledTimes(3); // Verify retry logic
});
```

## Files Requiring Changes
- `tests/db/connection.test.ts` - Replace network-dependent tests with mocks

## Technical Approach
1. Mock the PostgreSQL client at the appropriate level
2. Simulate connection failures through rejected promises
3. Test retry logic by counting mock call attempts
4. Verify error handling without network dependencies

## Risk Level
Low - Improves test reliability without changing functionality

## Estimated Effort
- Test refactoring: 1-2 hours
- Validation: 30 minutes

## Dependencies
- Unit test helpers from INFRA-002

## Success Metrics
- All database connection tests complete in < 1 second
- Tests are deterministic across environments
- Error handling scenarios are properly covered
- No external network dependencies in unit tests