# Pattern: Test-Driven Architecture Extraction

## Pattern Context
When extracting components from monolithic services, using Test-Driven Development ensures behavior preservation and reveals edge cases early.

## Pattern Structure

### 1. Write Tests for New Component FIRST
Before extracting any code, write comprehensive tests for the new component:
- Test all public methods
- Test error conditions
- Test edge cases
- Test integration points

### 2. Create Minimal Implementation
Create just enough implementation to make tests fail meaningfully:
```javascript
class ExtractedComponent {
  constructor(dependencies) {
    // Minimal setup
  }

  mainMethod() {
    throw new Error('Not implemented');
  }
}
```

### 3. Copy-Adapt-Refactor Cycle
1. **Copy**: Move code from monolith to new component
2. **Adapt**: Adjust for new context (dependencies, imports)
3. **Refactor**: Clean up while tests ensure behavior preserved

### 4. Integration Through Delegation
In the monolith, delegate to new component:
```javascript
// In monolithic service
async transaction(queries) {
  return this._extractedComponent.transaction(queries);
}
```

## Benefits Observed

### Early Edge Case Discovery
TDD revealed issues before implementation:
- Mock function behavior differences
- Import pattern variations
- Transpilation effects on type checking

### Confidence in Refactoring
With tests written first:
- Safe to experiment with implementation approaches
- Quick feedback on breaking changes
- Clear success criteria

### Documentation Through Tests
Tests serve as living documentation:
- Expected behavior clearly defined
- Edge cases explicitly handled
- Integration requirements visible

## Example: TransactionManager Extraction

### Test-First Approach
```javascript
describe('TransactionManager', () => {
  it('should execute async transactions', async () => {
    // Define expected behavior
    await transactionManager.transaction(asyncFunc);
    expect(mockDb.executeSql).toHaveBeenCalledWith('BEGIN TRANSACTION');
    expect(mockDb.executeSql).toHaveBeenCalledWith('COMMIT');
  });

  it('should handle rollback on error', async () => {
    // Define error handling expectations
    const failingQuery = async () => { throw new Error('Failed'); };
    await expect(transactionManager.transaction(failingQuery))
      .rejects.toThrow('Failed');
    expect(mockDb.executeSql).toHaveBeenCalledWith('ROLLBACK');
  });
});
```

### Implementation Guided by Tests
Tests revealed need for:
- Timeout cleanup (memory leak prevention)
- Queue processing with setTimeout
- Parameter-based async detection

## Anti-Patterns to Avoid

### 1. Implementation-First Extraction
Writing code before tests leads to:
- Missed edge cases
- Unclear behavior expectations
- Difficult debugging

### 2. Shallow Test Coverage
Only testing happy path misses:
- Error handling gaps
- Resource cleanup issues
- Integration problems

### 3. Test After Implementation
Tests written after code tend to:
- Test implementation details vs behavior
- Miss alternative approaches
- Become tightly coupled to implementation

## When to Use This Pattern

**Ideal for:**
- Extracting from monolithic services
- High-risk refactoring
- Components with complex state management
- Code with multiple execution paths

**Not necessary for:**
- Simple utility extractions
- Pure functions
- Code with existing comprehensive tests

## Related Patterns
- Delegation Pattern
- Facade Pattern
- Dependency Injection
- Mock-First Testing

## References
- TransactionManager extraction: `/workspaces/shareth/context-network/tasks/architecture/database-service-architecture-split-detailed.md`
- Discovery record: `/workspaces/shareth/context-network/discoveries/2025-10-01-async-detection-jest-transpilation.md`