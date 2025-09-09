# Task: Implement File System Mocking for Tests

## Priority
Medium

## Source
Test quality review - 2025-09-09

## Problem Statement
Several test files perform actual file system operations without proper mocking:
- `tests/analyzers/typescript-deps.test.ts` creates actual files on disk
- `tests/indexes/attribute-index.test.ts` writes to actual JSON files
- Tests could be flaky due to file system state
- Test execution is slower than necessary
- Cleanup in `afterEach` could fail and affect subsequent tests

## Current Impact
- Test execution time: ~32 seconds (could be < 10 seconds with mocking)
- Potential test flakiness when running in parallel
- Risk of leaving test artifacts on disk if cleanup fails

## Proposed Solution

### Option 1: Use memfs for in-memory file system
```typescript
import { vol } from 'memfs'
jest.mock('fs', () => require('memfs'))

beforeEach(() => {
  vol.reset()
})
```

### Option 2: Use vitest's built-in mocking
```typescript
import { vi } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn()
}))
```

### Option 3: Create test utilities with MemoryStorageAdapter
For AttributeIndex tests, use the existing MemoryStorageAdapter instead of file operations.

## Implementation Steps
1. Audit all tests for file system operations
2. Choose mocking strategy based on test needs
3. Implement mocking layer
4. Update tests to use mocked file system
5. Verify tests still catch real issues
6. Measure performance improvement

## Acceptance Criteria
- [ ] No test creates actual files on disk
- [ ] All file system operations are mocked or use in-memory alternatives
- [ ] Test execution time reduced by at least 30%
- [ ] Tests remain effective at catching bugs
- [ ] No test artifacts left on disk after test runs

## Estimated Effort
Medium (30-60 minutes per test file)

## Dependencies
- Understanding of current test structure
- Choice of mocking library
- Ensuring tests still validate actual behavior

## Benefits
- Faster test execution
- More reliable tests
- True unit test isolation
- Easier to run tests in CI/CD environments
- No cleanup required