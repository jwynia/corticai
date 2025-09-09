# Task: Add Comprehensive Negative Test Cases

## Priority
Medium

## Source
Test quality review - 2025-09-09

## Problem Statement
Most test files focus primarily on happy path scenarios. Missing comprehensive tests for:
- Invalid input handling
- Error conditions
- Boundary values
- Null/undefined edge cases beyond basic coverage
- Resource failures
- Malformed data

## Current Gaps

### AttributeIndex Tests Missing:
- Invalid entity IDs (null, empty string, non-string)
- Invalid attribute names
- Circular reference handling
- Memory limit scenarios
- Concurrent modification handling

### Storage Adapter Tests Missing:
- Disk full scenarios
- Permission denied errors
- Network failures (for future adapters)
- Corrupted storage recovery
- Race conditions

### TypeScript Analyzer Tests Missing:
- Malformed TypeScript beyond basic syntax errors
- Circular dependencies
- Missing files in import paths
- Large file handling
- Binary file rejection

## Proposed Test Additions

### Example for AttributeIndex:
```typescript
describe('Error Handling', () => {
  it('should throw when adding attribute with invalid entity ID', () => {
    expect(() => index.addAttribute(null, 'type', 'value')).toThrow()
    expect(() => index.addAttribute('', 'type', 'value')).toThrow()
    expect(() => index.addAttribute(123, 'type', 'value')).toThrow()
  })

  it('should handle circular references in attribute values', () => {
    const circular = { prop: null }
    circular.prop = circular
    
    expect(() => index.addAttribute('entity', 'attr', circular))
      .toThrow(/circular|serialize/)
  })

  it('should recover from corrupted storage', async () => {
    // Simulate corrupted storage
    const corruptedStorage = new JSONStorageAdapter({ 
      filePath: 'corrupted.json' 
    })
    
    // Write invalid JSON
    await fs.writeFile('corrupted.json', '{invalid json}')
    
    // Should handle gracefully
    const index = new AttributeIndex(corruptedStorage)
    await expect(index.load('test')).resolves.not.toThrow()
  })
})
```

## Implementation Strategy

1. **Identify Critical Paths**: Focus on user-facing APIs first
2. **Use Property-Based Testing**: For complex input validation
3. **Error Injection**: Create utilities to simulate failures
4. **Coverage Analysis**: Use coverage reports to find untested error paths

## Acceptance Criteria
- [ ] Each public method has at least 3 negative test cases
- [ ] All error types have test coverage
- [ ] Resource failure scenarios are tested
- [ ] Invalid input combinations are tested
- [ ] Error messages are validated
- [ ] Recovery paths are tested

## Estimated Effort
Large (2-3 hours total, can be done incrementally)

## Benefits
- Increased robustness
- Better error messages
- Prevent regressions in error handling
- Improved user experience
- Higher confidence in edge case handling

## Files to Update
- `tests/indexes/attribute-index.test.ts`
- `tests/storage/adapters/*.test.ts`
- `tests/analyzers/typescript-deps.test.ts`
- `tests/adapters/universal.test.ts`

## Testing Patterns to Use

### Input Validation Pattern
```typescript
describe.each([
  [null, 'null'],
  [undefined, 'undefined'],
  ['', 'empty string'],
  [123, 'number'],
  [{}, 'object'],
  [[], 'array']
])('should reject %s as %s', (input, description) => {
  it(`rejects ${description} input`, () => {
    expect(() => functionUnderTest(input)).toThrow()
  })
})
```

### Resource Failure Pattern
```typescript
it('should handle resource exhaustion gracefully', async () => {
  const storage = new MockStorage({ 
    failAfter: 100,
    errorType: 'RESOURCE_EXHAUSTED' 
  })
  
  // Should degrade gracefully
  for (let i = 0; i < 200; i++) {
    const result = await storage.set(`key${i}`, `value${i}`)
    if (i >= 100) {
      expect(result).toMatchObject({ 
        success: false, 
        error: expect.stringContaining('exhausted') 
      })
    }
  }
})
```