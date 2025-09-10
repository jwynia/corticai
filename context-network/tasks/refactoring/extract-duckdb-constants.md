# Task: Define Constants for Magic Numbers in DuckDB Adapter

## Context
The DuckDBStorageAdapter uses magic numbers directly in the code without named constants.

## Original Recommendation
From code review on 2025-09-09:
- Magic numbers should be replaced with named constants
- Improves code readability and maintainability

## Requirements

### Acceptance Criteria
- [ ] Create constants for all magic numbers
- [ ] Replace magic numbers with constant references
- [ ] Add JSDoc comments explaining each constant
- [ ] Group related constants together

### Magic Numbers to Replace
```typescript
// Current
threads: 1,
poolSize: 1,

// Should be
private static readonly DEFAULT_THREADS = 1
private static readonly DEFAULT_POOL_SIZE = 1
```

### Additional Constants to Consider
```typescript
private static readonly DEFAULT_TABLE_NAME = 'storage'
private static readonly MAX_TRANSACTION_DEPTH = 10  // Add limit
private static readonly CONNECTION_CACHE_TTL = 3600000  // 1 hour
```

## Effort Estimate
- **Size**: Trivial (15 minutes)
- **Complexity**: Low
- **Risk**: Low

## Benefits
- Self-documenting code
- Easier to modify defaults
- Centralized configuration
- Better for testing

## Priority
**Low** - Code quality improvement