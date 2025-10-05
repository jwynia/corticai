# Testing Guide for CorticAI

## Philosophy: Unit Tests Only (Integration Tests Are a Code Smell)

**Core Principle**: If you need integration tests to test business logic, your architecture is wrong.

### Why Integration Tests Indicate Bad Design

Integration tests are often a symptom of:
- ❌ Business logic embedded in infrastructure (storage adapters, I/O)
- ❌ Tight coupling to database implementations
- ❌ Violation of single responsibility principle
- ❌ No dependency inversion (concrete dependencies instead of abstractions)

**The Solution**: Refactor code to be inherently unit testable, not write integration tests to work around bad architecture.

> See `ARCHITECTURE-ISSUES.md` for detailed analysis of architectural problems and solutions.

### The Problem We Solved

Previously, all tests were integration tests disguised as unit tests:
- ❌ Creating real database files on disk
- ❌ Performing actual I/O operations
- ❌ 30-second timeouts per test
- ❌ Build timing out at 2+ minutes
- ❌ Test worker crashes due to unclosed resources

### The Solution

We now have three distinct test types:

| Test Type | Purpose | Speed | Isolation | Real I/O |
|-----------|---------|-------|-----------|----------|
| **Unit** | Test business logic | < 5s total | Complete | ❌ No |
| **Integration** | Test component integration | < 30s per test | Partial | ✅ Yes |
| **E2E** | Test full system | Minutes | None | ✅ Yes |

## Test Organization

```
tests/
├── unit/                    # Fast, mocked unit tests
│   ├── mocks/              # Mock implementations
│   │   └── MockKuzuStorageAdapter.ts
│   └── storage/
│       └── *.unit.test.ts
│
├── integration/            # Real database tests
│   └── storage/
│       └── *.integration.test.ts
│
└── e2e/                   # End-to-end system tests
```

## Running Tests

### Quick Commands

```bash
# Run ALL tests (unit + integration)
npm test

# Run ONLY unit tests (fast, < 5 seconds)
npm run test:unit

# Run ONLY integration tests (slower, real DBs)
npm run test:integration

# Watch mode for unit tests
npm run test:watch:unit

# Coverage for unit tests
npm run test:coverage:unit
```

### Configuration Files

- **`vitest.config.unit.ts`** - Unit test config (5s timeout, mocks, parallel)
- **`vitest.config.integration.ts`** - Integration test config (30s timeout, sequential)
- **`vitest.config.ts`** - Default config (legacy, being migrated)

## Writing Unit Tests

### Rule #1: Use Mocks, Not Real Dependencies

❌ **BAD - Integration Test Disguised as Unit Test**
```typescript
import { KuzuStorageAdapter } from './KuzuStorageAdapter';

describe('MyComponent', () => {
  let adapter: KuzuStorageAdapter;

  beforeEach(() => {
    // Creates real database file!
    adapter = new KuzuStorageAdapter({
      database: `/tmp/test-${Date.now()}`
    });
  });

  it('should store data', async () => {
    await adapter.set('key', data); // Real I/O!
  });
});
```

✅ **GOOD - True Unit Test with Mocks**
```typescript
import { createMockKuzuAdapter } from '../../mocks/MockKuzuStorageAdapter';

describe('MyComponent', () => {
  let adapter: ReturnType<typeof createMockKuzuAdapter>;

  beforeEach(() => {
    // In-memory mock, no I/O!
    adapter = createMockKuzuAdapter();
  });

  it('should store data', async () => {
    await adapter.set('key', data); // Instant, in-memory
    expect(await adapter.get('key')).toEqual(data);
  });
});
```

### Rule #2: Test Behavior, Not Implementation

❌ **BAD - Testing Implementation Details**
```typescript
it('should call internal method', () => {
  const spy = vi.spyOn(adapter as any, '_internalMethod');
  adapter.doSomething();
  expect(spy).toHaveBeenCalled();
});
```

✅ **GOOD - Testing Public Behavior**
```typescript
it('should produce correct output', async () => {
  const result = await adapter.doSomething();
  expect(result).toMatchObject({ status: 'success' });
});
```

### Rule #3: Unit Tests Must Be Fast

- **Target**: All unit tests complete in < 5 seconds
- **Timeout**: 5000ms per test
- **If slower**: It's probably an integration test

### Available Mocks

#### MockKuzuStorageAdapter
```typescript
import {
  createMockKuzuAdapter,
  createTestGraph
} from '../../unit/mocks/MockKuzuStorageAdapter';

// Simple mock
const adapter = createMockKuzuAdapter();

// Mock with test data
const { adapter, nodes, edges } = createTestGraph();

// Custom mock data
adapter.setMockData({
  nodes: [['id1', { id: 'id1', type: 'Person', properties: {} }]],
  edges: [{ id: 'e1', type: 'KNOWS', source: 'id1', target: 'id2' }]
});
```

## Writing Integration Tests

### When to Write Integration Tests

Use integration tests when you need to verify:
- Real database operations work correctly
- File I/O behaves as expected
- Complex queries execute properly
- Resource cleanup happens correctly

### Integration Test Pattern

✅ **Integration Test Best Practices**
```typescript
import { KuzuStorageAdapter } from '../../../src/storage/adapters/KuzuStorageAdapter';
import * as fs from 'fs';
import * as path from 'path';

describe('KuzuStorageAdapter Integration', () => {
  let adapter: KuzuStorageAdapter;
  let testDbPath: string;

  beforeEach(() => {
    // Unique path per test
    testDbPath = path.join('/tmp', `test-${Date.now()}-${Math.random()}`);
    adapter = new KuzuStorageAdapter({
      database: testDbPath,
      // ...
    });
  });

  afterEach(async () => {
    // CRITICAL: Proper cleanup order

    // 1. Clear data
    await adapter.clear();

    // 2. Close connections (proper public API)
    if (adapter.close) {
      await adapter.close();
    }

    // 3. Wait for connections to fully close
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Cleanup filesystem
    if (fs.existsSync(testDbPath)) {
      await fs.promises.rm(testDbPath, { recursive: true, force: true });
    }
  });

  it('should persist data across instances', async () => {
    // Test with real database
    await adapter.set('key', { id: '1', type: 'Test' });

    // Create new instance with same database
    const adapter2 = new KuzuStorageAdapter({
      database: testDbPath
    });

    const retrieved = await adapter2.get('key');
    expect(retrieved).toBeDefined();

    // Cleanup second adapter
    await adapter2.close?.();
  });
});
```

### Integration Test Checklist

- [ ] Uses real database/filesystem
- [ ] Has proper resource cleanup in afterEach
- [ ] Closes all connections before filesystem cleanup
- [ ] Uses unique paths/databases per test
- [ ] Timeout is sufficient (30s default)
- [ ] Filename ends with `.integration.test.ts`
- [ ] Located in `tests/integration/` directory

## Common Patterns

### Testing Graph Operations

**Unit Test (Mocked)**
```typescript
import { createTestGraph } from '../mocks/MockKuzuStorageAdapter';

it('should traverse graph', async () => {
  const { adapter } = createTestGraph();

  const results = await adapter.traverseGraph({
    startNode: 'node1',
    maxDepth: 2,
    edgeTypes: ['KNOWS']
  });

  expect(results).toHaveLength(expect.any(Number));
});
```

**Integration Test (Real Database)**
```typescript
it('should traverse graph with Kuzu', async () => {
  await adapter.addNode({ id: 'n1', type: 'Person', properties: {} });
  await adapter.addNode({ id: 'n2', type: 'Person', properties: {} });
  await adapter.addEdge({
    id: 'e1',
    type: 'KNOWS',
    source: 'n1',
    target: 'n2',
    properties: {}
  });

  const results = await adapter.traverseGraph({
    startNode: 'n1',
    maxDepth: 1
  });

  expect(results.some(r => r.id === 'n2')).toBe(true);
});
```

### Testing Error Handling

**Unit Test**
```typescript
it('should throw error for invalid input', async () => {
  const adapter = createMockKuzuAdapter();

  await expect(
    adapter.set('', { id: '', type: 'Invalid' })
  ).rejects.toThrow('Invalid entity');
});
```

**Integration Test**
```typescript
it('should handle database corruption gracefully', async () => {
  // Corrupt the database file
  await fs.promises.writeFile(
    path.join(testDbPath, 'corrupt.db'),
    'invalid data'
  );

  await expect(adapter.size()).rejects.toThrow();
});
```

## Migration Guide

### Moving Existing Tests

If you have existing tests that use real databases:

1. **Identify the test type**:
   - Does it use real I/O? → Integration test
   - Pure logic? → Should be unit test

2. **For integration tests**:
   ```bash
   # Move to integration directory
   mv src/component.test.ts tests/integration/component.integration.test.ts

   # Update imports (add ../../../src/ prefix)
   ```

3. **For logic that should be unit tests**:
   - Create new unit test file
   - Use mocks instead of real dependencies
   - Test same behavior with mocked I/O

4. **Fix import paths**:
   ```typescript
   // Old (colocated)
   import { Component } from './Component';

   // New (from tests/integration/)
   import { Component } from '../../../src/path/Component';

   // New (from tests/unit/)
   import { Component } from '../../../src/path/Component';
   import { createMockAdapter } from '../mocks/MockAdapter';
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 2  # Unit tests are fast
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 5  # Integration tests slower
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:integration
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npm run test:unit  # Only run fast unit tests
```

## Troubleshooting

### "Test timeout" errors

**Symptom**: Tests timeout at 5000ms

**Cause**: Probably an integration test in the unit test suite

**Fix**: Move to `tests/integration/` or use mocks

### "Channel closed" errors

**Symptom**: Worker threads crash with channel errors

**Cause**: Resources not properly cleaned up

**Fix**: Ensure `afterEach` closes all connections before cleanup

### Tests are slow

**Symptom**: Unit tests take > 5 seconds

**Cause**: Using real I/O instead of mocks

**Fix**: Replace real dependencies with mocks from `tests/unit/mocks/`

### Import errors after moving tests

**Symptom**: `Cannot find module './Component'`

**Cause**: Relative imports broken after moving files

**Fix**: Update imports to use correct relative path with `../../../src/`

## Best Practices

### DO ✅

- Write unit tests for all business logic
- Use mocks for external dependencies
- Keep unit tests under 5 seconds total
- Clean up resources in integration tests
- Use descriptive test names
- Test edge cases and error conditions

### DON'T ❌

- Mix unit and integration tests in same file
- Use real databases in unit tests
- Suppress cleanup errors in integration tests
- Use `(adapter as any)` to access private methods
- Create files in non-temp directories during tests
- Leave connections open after tests

## What to Do Instead of Integration Tests

### 1. **Refactor for Testability**
Extract business logic from infrastructure:
```typescript
// ❌ Untestable without database
class Adapter {
  async analyze() {
    const data = await this.db.query(...);
    // 100 lines of business logic
  }
}

// ✅ Testable without any I/O
class Analyzer {
  analyze(data: Data) {
    // 100 lines of pure business logic
    // Easily unit tested
  }
}
```

### 2. **Use Dependency Injection**
```typescript
// ✅ Inject storage, don't create it
class Service {
  constructor(private storage: IStorage) {}
}

// Unit test with mock
const service = new Service(new MockStorage());
```

### 3. **Keep I/O at the Edges**
- **Domain layer**: Pure business logic (no I/O)
- **Application layer**: Orchestration (minimal I/O)
- **Infrastructure layer**: All I/O (thin, minimal logic)

### 4. **If You Think You Need Integration Tests**

**STOP.** Instead:

1. **Identify what you're really testing**
   - Business logic? → Extract it, unit test it
   - Database queries work? → That's testing Kuzu/DuckDB, not your code
   - Data format? → Unit test serialization/deserialization

2. **Refactor the code**
   - Separate concerns
   - Add interfaces/abstractions
   - Use dependency injection

3. **Write unit tests for the logic**
   - Mock all I/O
   - Test behavior, not implementation
   - Fast, deterministic, reliable

### Manual Verification Instead

For truly verifying database interactions (rare):
- **Manual testing** in development
- **Contract tests** (run manually, not in CI)
- **Canary deployments** in production
- **Feature flags** to test in production safely

**NOT** in your automated test suite that runs on every commit.

## NPM Scripts

```bash
# ✅ Default: Only unit tests
npm test

# ❌ Integration tests (architectural smell)
npm run verify:integration
```

Integration tests are deliberately **not** in the standard test command.

## Questions?

- "My test needs a database" → Extract the business logic that doesn't
- "This is too hard to unit test" → The design is wrong, refactor it
- "But how do I know it works?" → Unit tests prove logic works, then verify manually once

---

**Remember**: Integration tests are a crutch. Good architecture makes them unnecessary.
