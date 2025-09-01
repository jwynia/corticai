# Task: Mock File System Operations in AttributeIndex Tests

## Priority: Medium

## Context
The AttributeIndex tests currently use real file system operations for persistence testing, which can cause issues in CI/CD environments and doesn't provide true unit test isolation.

## Original Recommendation
"Real File System Operations Without Mocking - This could cause issues in CI/CD environments or concurrent test runs"

## Why Deferred
- Requires significant test refactoring
- Need to decide on mocking strategy (library vs manual mocks)
- Must ensure test quality isn't reduced
- May require adding new test dependencies

## Acceptance Criteria
- [ ] File system operations are properly mocked
- [ ] Tests remain deterministic and isolated
- [ ] No dependency on actual file system state
- [ ] Tests can run concurrently without conflicts
- [ ] Coverage remains at or above current level (89.94%)

## Technical Approach

### Option 1: Use temp directory (Recommended)
```javascript
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';

beforeEach(() => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'test-'));
  testDataPath = path.join(tempDir, 'test-index.json');
});
```

### Option 2: Mock fs module
```javascript
import { vi } from 'vitest';

vi.mock('fs', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  // ... other mocked methods
}));
```

### Option 3: Use memory-fs or similar library
- Provides in-memory file system
- More realistic than mocks
- Good for complex file operations

## Effort Estimate
- **Development**: 2-3 hours
- **Testing**: 1 hour
- **Total**: Medium (3-4 hours)

## Dependencies
- May need to add testing utilities or libraries
- Should coordinate with any other test improvements

## Success Metrics
- Tests run faster (no actual I/O)
- Zero file system artifacts after test runs
- Tests pass in read-only environments
- Can run tests in parallel

## Related Items
- Performance test improvements
- Overall test strategy review

## Notes
- Consider creating a test utilities module for common mocking patterns
- This pattern should be applied to other tests using file system
- Good opportunity to document testing best practices