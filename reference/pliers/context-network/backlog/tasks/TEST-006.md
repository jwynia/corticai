# TEST-006: Improve Health Check Test Coverage

## Metadata
- **Status:** ready
- **Type:** improvement
- **Epic:** phase-2-infrastructure
- **Priority:** medium
- **Size:** small
- **Created:** 2025-09-27

## Description
Health check tests (`tests/routes/health.test.ts`) contain some anti-patterns that test implementation details rather than behavior, and miss opportunities to test more realistic error scenarios.

## Problem Statement
- Tests check that database health check is NOT called (implementation detail)
- Missing tests for realistic error conditions
- Over-focus on internal implementation rather than external behavior
- Artificial error scenarios that don't reflect real failure modes

## Current Issues
1. **Testing Implementation Details**:
   ```javascript
   // BAD - Tests internal implementation
   expect(mockCheckDatabaseHealth).not.toHaveBeenCalled();
   ```

2. **Missing Realistic Error Scenarios**:
   - No tests for actual database timeout conditions
   - No tests for partial service degradation
   - No tests for service recovery scenarios

## Acceptance Criteria
- [ ] Replace implementation detail tests with behavior tests
- [ ] Add realistic error scenario testing
- [ ] Test service degradation and recovery patterns
- [ ] Focus on response format and timing rather than internal calls
- [ ] Add tests for realistic failure modes

## Improved Test Patterns
```javascript
// GOOD - Test behavior, not implementation
it('should respond quickly for load balancer checks', async () => {
  const response = await client.health.$get();

  expect(response.status).toBe(200);
  expect(response.body.status).toBe('healthy');
  expect(responseTime).toBeLessThan(LOAD_BALANCER_TIMEOUT_MS);
});

// GOOD - Test realistic error scenarios
it('should handle database timeout gracefully', async () => {
  mockCheckDatabaseHealth.mockRejectedValue(new Error('connection timeout'));

  const response = await client.health.admin.$get();

  expect(response.status).toBe(503);
  expect(response.body.status).toBe('degraded');
});
```

## Files Requiring Changes
- `tests/routes/health.test.ts` - Improve test patterns

## New Test Scenarios to Add
- Database connection pool exhaustion
- Slow database response times
- Service recovery after downtime
- Partial service degradation
- Memory pressure scenarios

## Risk Level
Low - Test improvements without functionality changes

## Estimated Effort
- Test analysis and planning: 1 hour
- New test implementation: 2-3 hours
- Cleanup and documentation: 1 hour

## Dependencies
None - can be implemented immediately

## Success Metrics
- Tests focus on external behavior rather than implementation
- Realistic error scenarios are covered
- Test suite provides confidence in monitoring and alerting