# Task: Extract Reusable Mutex Manager from DuckDB Adapter

## Priority: Medium

## Context
The DuckDBStorageAdapter contains complex mutex synchronization logic that could be extracted into a reusable utility class. This would improve code organization and provide a reusable pattern for other components that need synchronization.

## Current Implementation
```typescript
// Currently inline in DuckDBStorageAdapter:
private static tableCreationMutexes = new Map<string, Promise<void>>()
private ensureLoadedMutex = Promise.resolve()

private async withTableCreationMutex<T>(operation: () => Promise<T>): Promise<T> {
  // 20+ lines of mutex handling logic
}
```

## Proposed Solution

### Create MutexManager Utility
```typescript
// /app/src/utils/MutexManager.ts
export class MutexManager<K = string> {
  private mutexes = new Map<K, Promise<void>>()
  
  async withLock<T>(key: K, operation: () => Promise<T>): Promise<T> {
    // Reusable mutex logic
  }
  
  async acquireLock(key: K): Promise<() => void> {
    // Returns unlock function
  }
}
```

### Usage in DuckDBStorageAdapter
```typescript
private static mutexManager = new MutexManager<string>()

private async createTableIfNeeded(): Promise<void> {
  const mutexKey = this.getTableMutexKey()
  return this.mutexManager.withLock(mutexKey, async () => {
    // Table creation logic
  })
}
```

## Acceptance Criteria
- [ ] Create generic, reusable MutexManager class
- [ ] Support both keyed and single mutexes
- [ ] Include proper TypeScript generics
- [ ] Add comprehensive tests for mutex behavior
- [ ] Refactor DuckDBStorageAdapter to use new utility
- [ ] Document usage patterns and examples
- [ ] No regression in concurrency handling

## Benefits
- Reusable synchronization primitive
- Cleaner DuckDBStorageAdapter code
- Testable mutex logic in isolation
- Pattern for other components needing locks
- Better separation of concerns

## Effort Estimate
- **Time**: 2-3 hours
- **Complexity**: Medium
- **Risk**: Medium (concurrency is tricky)

## Testing Requirements
- Unit tests for MutexManager
- Concurrency tests with multiple operations
- Deadlock prevention tests
- Performance tests for lock contention
- Integration tests with DuckDBStorageAdapter

## Implementation Steps
1. Create MutexManager class with tests
2. Test edge cases (deadlocks, cleanup, errors)
3. Refactor DuckDBStorageAdapter to use it
4. Verify all existing tests pass
5. Add examples to documentation

## Related
- Part of the larger DuckDBStorageAdapter refactoring
- Addresses code review feedback about complexity
- Improves overall code organization