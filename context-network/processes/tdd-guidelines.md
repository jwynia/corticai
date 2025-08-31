# Test-Driven Development Guidelines

## Classification
- **Domain**: Processes/Development
- **Stability**: Stable
- **Abstraction**: Prescriptive
- **Confidence**: Established

## Core Principle
**NEVER write implementation code before writing tests.** Tests define the contract and guide the implementation.

## TDD Process (Red-Green-Refactor)

### 1. Red Phase - Write Failing Tests
1. Write comprehensive test suite first
2. Cover happy paths, edge cases, and error conditions
3. Run tests to confirm they fail appropriately
4. Ensure failure messages are meaningful

### 2. Green Phase - Make Tests Pass
1. Write MINIMAL code to make tests pass
2. Focus on one test at a time
3. No premature optimization
4. No features not covered by tests

### 3. Refactor Phase - Improve Code
1. Refactor with confidence (tests protect you)
2. Remove duplication
3. Improve readability
4. Run tests after EVERY change

## Test Structure Template

```typescript
describe('ComponentName', () => {
  // Setup and teardown
  beforeEach(() => { /* Setup test environment */ });
  afterEach(() => { /* Clean up */ });
  
  describe('functionName', () => {
    it('should handle normal input correctly', () => {
      // Arrange
      const input = setupTestData();
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
    
    it('should throw error for invalid input', () => {
      // Test error conditions
    });
    
    it('should handle edge case X', () => {
      // Test boundaries
    });
  });
});
```

## Test Quality Standards

### Coverage Requirements
- **Minimum**: 80% code coverage
- **Target**: 90%+ for critical components
- **Focus**: Quality over quantity

### What to Test
1. **Public API** - All public methods
2. **Edge Cases** - Boundary conditions
3. **Error Paths** - Exception handling
4. **Integration Points** - Component interactions

### What NOT to Test
1. **Implementation Details** - Internal private methods
2. **Framework Code** - Don't test libraries
3. **Trivial Code** - Simple getters/setters
4. **Tautologies** - Tests that always pass

## Common Anti-Patterns to Avoid

### Tautological Tests
```typescript
// BAD - Tests nothing
expect(true).toBe(true);

// BAD - Tests the assignment
const result = 5;
expect(result).toBe(5);
```

### Testing Implementation Details
```typescript
// BAD - Tests that method exists
expect(adapter.extract).toBeDefined();

// GOOD - Tests behavior
const result = adapter.extract(content, metadata);
expect(result).toHaveLength(2);
```

### Mock-Heavy Tests
```typescript
// BAD - Testing the mock, not the code
mockService.getValue.mockReturnValue(42);
expect(component.getData()).toBe(42);
```

## Success Metrics

### From Universal Fallback Adapter Implementation
- **Test Coverage**: 95.71% achieved
- **Test Count**: 29 comprehensive tests
- **Execution Time**: ~10ms
- **Edge Cases**: All covered (Unicode, binary, large files)

This demonstrates that TDD, when properly applied, naturally leads to high-quality, well-tested code.

## Benefits Observed

1. **Design Quality** - Tests drove better API design
2. **Confidence** - Refactoring without fear
3. **Documentation** - Tests serve as usage examples
4. **Regression Prevention** - Immediate feedback on breaking changes
5. **Coverage** - High coverage achieved naturally, not forced

## Tools and Configuration

### Test Framework
- **Vitest** - Fast, TypeScript-first test runner
- **Configuration**: `/app/vitest.config.ts`
- **Coverage Tool**: @vitest/coverage-v8

### Test Commands
```bash
npm test          # Run all tests
npm test:watch    # Watch mode for TDD
npm test:coverage # Generate coverage report
npm test:ui       # Interactive UI
```

## Relationships
- **Validated By**: Universal Fallback Adapter implementation
- **Implements**: Industry best practices
- **Influences**: All future component development
- **ADR**: [adr_001_test_framework_selection.md]

## Metadata
- **Created**: 2025-08-30
- **Based On**: Universal Fallback Adapter TDD experience
- **Confidence**: High - proven successful in practice