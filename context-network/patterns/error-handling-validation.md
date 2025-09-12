# Pattern: Comprehensive Input Validation

## Context
Discovered during implementation of negative test cases (2025-11-09). Instead of just adding tests, we implemented proper error handling across all components.

## Pattern Description

### Validation at Public API Boundaries
Every public method should validate inputs before processing:

```typescript
// Pattern: Early validation with clear error messages
public async set(key: string, value: T): Promise<void> {
  // Validate immediately
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string');
  }
  
  // Validate value if needed
  if (!this.isSerializable(value)) {
    throw new Error('Value must be serializable');
  }
  
  // Proceed with operation
  return this.doSet(key, value);
}
```

## Validation Strategies by Component

### 1. AttributeIndex
- **Entity IDs**: Must be non-empty strings
- **Attribute Names**: Must be non-empty strings
- **Query Operators**: Must be from allowed set ('equals', 'exists', etc.)
- **Combinators**: Must be 'AND' or 'OR'

### 2. Storage Adapters
- **Keys**: Must be non-empty strings (consistent across all adapters)
- **Values**: Handle non-serializable gracefully:
  ```typescript
  // Convert functions to descriptive objects
  if (typeof value === 'function') {
    return { type: 'function', name: value.name || 'anonymous' };
  }
  ```
- **Circular References**: Detect and convert to safe representation

### 3. TypeScript Analyzer
- **File Paths**: Validate existence and accessibility
- **Arrays**: Ensure valid arrays before processing
- **Graph Objects**: Validate structure before operations

## Error Message Principles

### 1. Be Specific
```typescript
// Bad
throw new Error('Invalid input');

// Good
throw new Error('Entity ID must be a non-empty string, received: ' + typeof entityId);
```

### 2. Be Consistent
All storage adapters use identical message for key validation:
```typescript
'Key must be a non-empty string'
```

### 3. Suggest Recovery
```typescript
throw new Error(
  `Table name "${name}" is invalid. ` +
  `Table names must start with a letter or underscore ` +
  `and contain only alphanumeric characters and underscores.`
);
```

## Testing Pattern

### Parameterized Testing for Validation
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
    expect(() => functionUnderTest(input)).toThrow();
  });
});
```

## Benefits Realized

1. **Fail Fast**: Invalid inputs caught immediately
2. **Clear Errors**: Users know exactly what went wrong
3. **Type Safety**: Runtime validation matches TypeScript types
4. **Consistency**: Same validation across similar operations
5. **Testability**: Easy to test all validation paths

## When to Apply

- All public API methods
- Any method that accepts external input
- Before expensive operations
- At module boundaries
- When converting between types

## Anti-Patterns to Avoid

### 1. Silent Failures
```typescript
// Bad: Silently returns undefined
if (!key) return undefined;

// Good: Clear error
if (!key) throw new Error('Key must be provided');
```

### 2. Over-Validation
```typescript
// Bad: Validating internal methods
private internalHelper(data: InternalType) {
  // Don't validate if TypeScript ensures type
}
```

### 3. Inconsistent Messages
```typescript
// Bad: Different messages for same error
adapter1: 'Key is required'
adapter2: 'Must provide key'
adapter3: 'No key specified'

// Good: Consistent
all: 'Key must be a non-empty string'
```

## Implementation Checklist

- [ ] Identify all public methods
- [ ] Add validation at method entry
- [ ] Use consistent error messages
- [ ] Create parameterized tests
- [ ] Document expected inputs
- [ ] Handle edge cases gracefully

## Related Patterns
- Fail Fast Principle
- Guard Clauses
- Defensive Programming
- Contract Programming

## Confidence
**Established** - This pattern has been successfully applied across all major components with measurable improvements in robustness.