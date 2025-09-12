# Testing Strategy

## Classification
- **Domain**: Development Process
- **Stability**: Evolving
- **Abstraction**: Process
- **Confidence**: Established

## Purpose
Document testing patterns, standards, and decisions for CorticAI development to ensure consistent test quality and coverage across all components.

## Core Testing Principles

### 1. Comprehensive Coverage
- **Unit Tests**: Test all public interface methods and error conditions
- **Integration Tests**: Test component interactions with mocking to avoid side effects  
- **Environment Tests**: Validate development environment setup and configuration

### 2. Test Organization Patterns
- **Unit tests**: Place alongside source code (`src/*.test.ts`) for better discoverability
- **Integration tests**: Place in `__tests__/integration.test.ts` for broader workflow testing
- **Environment tests**: Place in `__tests__/environment-setup.test.ts` for setup validation

### 3. Performance Considerations
- **Cache frequently accessed data** using beforeAll hooks
- **Mock external dependencies** to avoid slow operations
- **Optimize file I/O** by reading files once and reusing data

## Testing Framework Configuration

### Vitest Setup
- **Configuration**: `vitest.config.ts` handles TypeScript and ESM integration
- **Coverage**: Use `--coverage` flag for coverage reports
- **Watch mode**: Default for development workflow

### ESLint Integration
- **Test file patterns**: `**/*.test.ts` ignored in main linting
- **Integration**: Environment tests in `__tests__/**` also ignored
- **Configuration location**: `.eslintrc.json`

## Test Categories and Standards

### Unit Tests
**Purpose**: Test individual class/function behavior
**Standards**:
- Test all public methods
- Test error conditions and edge cases
- Test configuration management and state
- Verify initialization and cleanup
- Mock external dependencies

**Example Pattern**:
```typescript
describe('ClassName', () => {
  let instance: ClassName;
  
  beforeEach(() => {
    instance = new ClassName();
  });
  
  describe('method', () => {
    it('should handle normal case', () => { ... });
    it('should handle error case', () => { ... });
  });
});
```

### Integration Tests  
**Purpose**: Test component interactions and workflows
**Standards**:
- Mock external commands and file system
- Test realistic workflow scenarios
- Verify proper error handling
- Simulate success and failure paths

**Example Pattern**:
```typescript
vi.mock('fs', async () => ({
  ...await vi.importActual('fs'),
  existsSync: vi.fn()
}));

describe('Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should simulate workflow without execution', () => {
    // Setup mocks, execute, verify calls
  });
});
```

### Environment Tests
**Purpose**: Validate development environment configuration
**Standards**:
- Cache file reads using beforeAll
- Test configuration file structure and content
- Verify tool chain setup
- Validate build outputs

## Current Test Metrics
- **Total Tests**: 350+ tests across 17 test files
- **Unit Test Coverage**: Comprehensive coverage for core components
- **Integration Tests**: End-to-end workflow validation
- **Environment Tests**: Configuration and setup validation
- **Negative Test Coverage**: 200+ comprehensive error scenarios added

### Coverage by Component
- **AttributeIndex**: 120+ tests including comprehensive input validation and edge cases
- **Storage Adapters**: 80+ tests with disk failure and resource management scenarios
- **TypeScript Analyzer**: 70+ tests covering malformed syntax and file system errors  
- **Query System**: 50+ tests for query building and execution
- **Universal Adapter**: 30+ tests for entity processing

## Quality Gates
- All tests must pass before commits
- Coverage reports should be generated for releases
- Integration tests should not execute real external commands
- Unit tests should achieve comprehensive method coverage
- **Negative test coverage**: Each public method must have 3+ error scenario tests
- **Resource failure testing**: All components must handle disk/memory errors gracefully
- **Input validation**: All public APIs must reject invalid inputs with helpful messages
- **Concurrent access**: Components must handle concurrent operations safely

## Negative Testing Patterns

### Input Validation Pattern
```typescript
describe.each([
  [null, 'null'],
  [undefined, 'undefined'],
  ['', 'empty string'],
  [123, 'number'],
  [true, 'boolean'],
  [[], 'array'],
  [{}, 'object'],
  [Symbol('test'), 'symbol']
])('should reject %s as %s', (input, description) => {
  it(`rejects ${description} input`, () => {
    expect(() => functionUnderTest(input)).toThrow()
  })
})
```

### Resource Failure Pattern
```typescript
it('should handle disk full scenarios', async () => {
  const originalWriteFile = fs.writeFileSync;
  fs.writeFileSync = () => {
    throw new Error('ENOSPC: no space left on device');
  };
  
  try {
    await expect(storage.save()).rejects.toThrow(/ENOSPC/);
  } finally {
    fs.writeFileSync = originalWriteFile;
  }
});
```

### Memory Pressure Pattern
```typescript
it('should handle memory pressure scenarios', () => {
  const LARGE_COUNT = 50000;
  const startMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < LARGE_COUNT; i++) {
    component.addData(`item${i}`, generateLargeData(i));
  }
  
  const memoryIncrease = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;
  expect(memoryIncrease).toBeLessThan(200); // Should use less than 200MB
});
```

### Concurrent Access Pattern
```typescript
it('should handle concurrent operations safely', async () => {
  const operations = Array.from({ length: 100 }, (_, i) => 
    storage.set(`concurrent-${i}`, `value-${i}`)
  );
  
  const results = await Promise.allSettled(operations);
  const failures = results.filter(r => r.status === 'rejected');
  
  expect(failures.length).toBe(0);
});
```

## Error Message Quality Standards
- All validation errors must include the invalid value type
- Resource errors must suggest recovery actions when possible
- Complex operation errors should provide context about what was being attempted
- Error messages must be consistent across similar operations

## Related Nodes
- [[Build System Configuration]] - How build affects testing
- [[Code Review Process]] - Testing requirements in reviews  
- [[Development Workflow]] - Testing as part of development cycle
- [[Error Handling Strategy]] - Comprehensive error handling patterns

## Discovery Context
- **Created during**: Test review recommendations implementation (2025-01-29)
- **Enhanced during**: Comprehensive negative test case addition (2025-01-31)
- **Key insight**: Negative testing is critical for production robustness
- **Pattern established**: Mock-based integration testing for CLI workflows
- **Pattern enhanced**: Systematic input validation and resource failure testing