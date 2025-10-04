# Test-Driven Development Pattern

## Classification
<<<<<<< HEAD
- **Domain**: Development Process
- **Stability**: Proven
- **Abstraction**: Pattern
- **Confidence**: High

## Pattern Description
Test-Driven Development (TDD) is a development approach where tests are written before implementation code. Tests serve as executable specifications that drive the design and validate correctness.

## When to Use

### ALWAYS Use TDD For
1. **Core Business Logic**
   - Financial calculations
   - User permissions
   - Data transformations
   - Business rules

2. **Security-Critical Code**
   - Authentication flows
   - Authorization checks
   - Encryption/decryption
   - Input validation

3. **Complex Algorithms**
   - Search algorithms
   - Sorting/filtering
   - State machines
   - Event processing

4. **Public APIs**
   - REST endpoints
   - GraphQL resolvers
   - Library interfaces
   - Service contracts

### Consider TDD For
- Bug fixes (write test that reproduces bug first)
- Refactoring (ensure behavior preserved)
- New features (design through tests)
- Integration points (contract testing)

### Skip TDD For
- UI styling and layout
- Configuration files
- One-time scripts
- Prototypes/experiments

## The TDD Cycle

### 1. Red Phase - Write Failing Test
```typescript
describe('EventStore', () => {
  it('should store events with sequential IDs', () => {
    const store = new EventStore();
    const event1 = store.append({ type: 'user.created' });
    const event2 = store.append({ type: 'user.updated' });

    expect(event2.sequence).toBe(event1.sequence + 1);
  });
});
```

### 2. Green Phase - Make Test Pass
```typescript
class EventStore {
  private sequence = 0;

  append(event: any) {
    return {
      ...event,
      sequence: ++this.sequence
    };
=======
- **Domain**: Development Practices
- **Stability**: Established
- **Abstraction**: Pattern
- **Confidence**: High (proven successful in IMPL-004)

## Pattern Description

Test-Driven Development (TDD) as practiced in this codebase follows a strict "tests-first" approach where the ENTIRE test suite is written before ANY implementation code.

## Implementation Process

### Phase 1: Test Creation (Red)
1. Write comprehensive test suite covering:
   - Happy path scenarios
   - Edge cases
   - Error conditions
   - Integration scenarios
2. Run tests to verify they fail appropriately
3. DO NOT proceed until all tests exist

### Phase 2: Implementation (Green)
1. Write minimal code to pass each test
2. Focus on one test at a time
3. No premature optimization
4. No features not covered by tests

### Phase 3: Refactoring (Refactor)
1. Improve code structure with tests as safety net
2. Remove duplication
3. Enhance readability
4. Run tests after every change

## Benefits Observed

From IMPL-004 implementation:
- **300+ tests** provided complete specification
- **Zero regressions** during refactoring
- **Clear requirements** from test names
- **Confident code review** with comprehensive coverage
- **Easy improvements** with test safety net

## When to Use

- New feature implementations
- Complex business logic
- Public API development
- Critical system components

## When NOT to Use

- Exploratory prototypes
- One-off scripts
- UI-only changes
- Documentation updates

## Example from IMPL-004

```typescript
// Test written FIRST
describe('EventStore', () => {
  it('should store a single event successfully', async () => {
    const event = createTestEvent();
    const stored = await eventStore.append(event);

    expect(stored).toBeDefined();
    expect(stored.id).toBe(event.id);
    expect(stored.sequence).toBeGreaterThan(0);
  });
});

// Implementation written AFTER to pass test
class EventStore {
  async append(event: Event): Promise<StoredEvent> {
    // Minimal code to make test pass
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
### 3. Refactor Phase - Improve Code
```typescript
class EventStore {
  private sequence = 0;

  append(event: Event): StoredEvent {
    return {
      ...event,
      sequence: ++this.sequence,
      timestamp: new Date()
    };
  }
}
```

## Benefits Demonstrated in IMPL-004

### 1. Design Clarity
Writing 300+ tests first forced clear thinking about:
- API surface and contracts
- Edge cases and error handling
- State management
- Async behavior

### 2. Implementation Speed
With tests as guide:
- Implementation was straightforward
- Less debugging required
- Confidence in correctness
- Refactoring was safe

### 3. Documentation
Tests serve as:
- Living documentation
- Usage examples
- Behavior specification
- Regression prevention

## Test Structure Pattern

### Arrange-Act-Assert
```typescript
it('should handle retry logic for failed handlers', async () => {
  // Arrange
  let attempts = 0;
  const handler = jest.fn().mockImplementation(() => {
    attempts++;
    if (attempts < 3) throw new Error('Temporary failure');
    return 'success';
  });

  // Act
  const result = await publisher.publish(event);

  // Assert
  expect(handler).toHaveBeenCalledTimes(3);
  expect(result).toBe('success');
});
```

### Given-When-Then (BDD Style)
```typescript
describe('Event Publisher', () => {
  describe('given a handler that fails twice', () => {
    describe('when publishing an event', () => {
      it('then should retry and succeed on third attempt', () => {
        // test implementation
      });
    });
  });
});
```

## Coverage Guidelines

### Target Coverage by Component Type
- **Business Logic**: 95-100%
- **Security Code**: 95-100%
- **Public APIs**: 90-95%
- **Utilities**: 80-90%
- **UI Components**: 60-70%
- **Configuration**: 40-50%

### What to Test
1. Happy path scenarios
2. Edge cases and boundaries
3. Error conditions
4. Async behavior
5. State transitions
6. Side effects

### What Not to Test
1. Implementation details
2. Third-party libraries
3. Framework code
4. Trivial getters/setters
5. Console output

## Common TDD Mistakes

### 1. Testing Implementation Not Behavior
❌ Bad:
```typescript
it('should call internal method', () => {
  const spy = jest.spyOn(store, '_validateEvent');
  store.append(event);
  expect(spy).toHaveBeenCalled();
});
```

✅ Good:
```typescript
it('should reject invalid events', () => {
  const invalidEvent = { /* missing required fields */ };
  expect(() => store.append(invalidEvent)).toThrow();
});
```

### 2. Not Testing Edge Cases
❌ Bad: Only testing happy path
✅ Good: Testing nulls, empty arrays, large numbers, concurrent operations

### 3. Overly Coupled Tests
❌ Bad: Tests that break with any refactoring
✅ Good: Tests focused on public API behavior

## Success Metrics from IMPL-004

- **Tests Written First**: 300+
- **Implementation Time**: 4 hours
- **Bugs Found During Implementation**: 2
- **Bugs Found After Implementation**: 0
- **Test Coverage**: ~95%
- **Confidence Level**: High

## Tools and Configuration

### Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      }
    }
  }
});
```

### Pre-commit Hooks
```json
// .husky/pre-commit
{
  "hooks": {
    "pre-commit": "npm test -- --coverage --threshold"
  }
}
```

## Related Resources
- [[../processes/tdd-process-guide.md]]
- [[../../backlog/tasks/PROC-001.md]]
- [[../../retrospectives/2025-09-23-impl-004-event-engine.md]]
- [Test-Driven Development by Example - Kent Beck]
- [Growing Object-Oriented Software - Freeman & Pryce]

## Key Takeaways

1. **TDD is an investment** that pays off immediately through reduced debugging
2. **Tests as specifications** clarify requirements and design
3. **Red-Green-Refactor** cycle ensures both correctness and quality
4. **High coverage** is a byproduct, not the goal
5. **Behavior over implementation** makes tests resilient to change

## Pattern Metadata
- **First Used**: IMPL-004 Event Engine
- **Success Rate**: High
- **Team Adoption**: Recommended for critical code
- **Learning Curve**: Moderate
=======
## Critical Relationships
- **Depends on**: Clear requirements understanding
- **Enables**: Confident refactoring, regression prevention
- **Conflicts with**: Rapid prototyping mindset

## Task Context
- **Discovered during**: IMPL-004 Event Engine implementation
- **Relevance**: Foundational pattern for critical components
>>>>>>> origin/main
