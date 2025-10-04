# TDD Process Guide for Pliers

## Classification
- **Domain**: Development Processes
- **Stability**: Established
- **Abstraction**: Process
- **Confidence**: High

## When to Use TDD

### ALWAYS Use TDD For:
- **Core business logic** - Payment processing, calculations, rules
- **Public APIs** - Endpoints, services, libraries
- **Security-critical code** - Authentication, authorization, encryption
- **Complex algorithms** - Sorting, searching, data transformations
- **Event handling** - Event sourcing, message processing

### Consider TDD For:
- **Integration points** - External service connections
- **Data validation** - Input sanitization, format checking
- **State machines** - Workflow engines, status transitions

### Skip TDD For:
- **UI-only changes** - Styling, layout adjustments
- **Configuration files** - Environment settings
- **Documentation** - README updates, comments
- **Prototypes** - Exploratory code, POCs

## The Pliers TDD Process

### Step 1: Write Complete Test Suite First
```typescript
// Example from IMPL-004
describe('ComponentName', () => {
  // Setup
  beforeEach(() => { /* Initialize */ });

  // Happy path tests
  it('should handle normal cases', () => { /* ... */ });

  // Edge cases
  it('should handle boundary conditions', () => { /* ... */ });

  // Error cases
  it('should handle errors gracefully', () => { /* ... */ });

  // Integration tests
  it('should integrate with dependencies', () => { /* ... */ });
});
```

### Step 2: Verify Tests Fail (Red Phase)
```bash
npm test
# All tests should fail appropriately
# If a test passes before implementation, it's not testing correctly
```

### Step 3: Implement Minimal Code (Green Phase)
- Write ONLY enough code to pass the next failing test
- No premature optimization
- No features not covered by tests
- Focus on one test at a time

### Step 4: Refactor With Confidence (Refactor Phase)
- Tests protect against regressions
- Improve structure, remove duplication
- Optimize performance if needed
- Run tests after EVERY change

## Success Metrics

### Good TDD Indicators:
- ✅ Test coverage > 80%
- ✅ Tests written before code
- ✅ Each test has clear purpose
- ✅ Tests fail when code is broken
- ✅ Tests are fast (< 5 seconds for unit tests)

### Warning Signs:
- ⚠️ Tests written after implementation
- ⚠️ Tests that never fail
- ⚠️ Tests with multiple assertions for different behaviors
- ⚠️ Slow test suites (> 30 seconds)
- ⚠️ Skipped or commented tests

## Proven Benefits (from IMPL-004)

1. **Specification Clarity**: Tests define exact requirements
2. **Regression Prevention**: Changes can't break existing features
3. **Refactoring Safety**: Restructure code without fear
4. **Documentation**: Tests show how to use the code
5. **Time Savings**: Less debugging, fewer production issues

## Tools and Commands

```bash
# Run tests in watch mode during development
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test path/to/test.ts

# Run tests matching pattern
npm test -- --grep "EventStore"
```

## Related Resources
- [[test-driven-development]] - Pattern documentation
- [[event-engine-implementation]] - Example of successful TDD
- [[testing-standards]] - Overall testing guidelines

## Task Context
- **Created from**: IMPL-004 retrospective
- **Relevance**: Foundation for quality code development