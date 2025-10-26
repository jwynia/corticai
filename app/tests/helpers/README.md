# Test Helpers

## Performance Tests

Use the `itPerformance` helper for any performance-related tests:

```typescript
import { itPerformance } from '../helpers/performance';

describe('MyModule', () => {
  describe('performance', () => {
    itPerformance('should complete operation quickly', () => {
      const start = Date.now();
      performExpensiveOperation();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});
```

### Why?

Performance tests are **non-deterministic** in CI environments:
- Same code doesn't always produce same timing results
- Results depend on CI environment load and variance
- Tests become flaky and block valid changes

The `itPerformance` helper automatically:
- ✅ Runs tests locally (for development feedback)
- ✅ Skips tests in CI (prevents flaky test failures)

### Migration

Existing performance tests using `it.skipIf(process.env.CI === 'true')` should be migrated to use `itPerformance` when convenient.

### When to Use

Use `itPerformance` for tests that:
- Assert on execution time (using `toBeLessThan` with milliseconds)
- Are labeled as "performance", "efficiency", "speed", etc.
- Measure throughput, latency, or similar metrics
- Are sensitive to system load
