# Refactor Supersession Chain Detection Method

**Status**: Ready
**Priority**: Medium
**Effort**: Small (30-45 min)
**Type**: Refactoring / Code Quality

## Context

From code review on 2025-11-15: The `detectSupersessionChain` method in LifecycleAnalyzer has deep nesting (4+ levels) and is 77 lines long, making it hard to follow and test individual logic paths.

**File**: `src/semantic/maintenance/LifecycleAnalyzer.ts:161-238`

## Current Issues

- 77 lines in a single method
- 4+ levels of nesting
- Multiple early returns mixed with complex logic
- Hard to unit test individual steps
- Difficult to understand flow at a glance

## Acceptance Criteria

- [ ] Break method into smaller, focused methods
- [ ] Each method < 25 lines
- [ ] Maximum nesting depth of 2 levels
- [ ] Each sub-method is independently testable
- [ ] Maintain all existing test coverage
- [ ] Add unit tests for new helper methods
- [ ] Performance remains unchanged

## Recommended Decomposition

```typescript
async detectSupersessionChain(entityId: string): Promise<SupersessionChain> {
  const entity = await this.storage.getEntityById(entityId)
  if (!entity) {
    return this.invalidChain(`Entity ${entityId} not found`)
  }

  const head = await this.findChainHead(entity)
  if ('errors' in head) return head

  const chain = await this.buildChainFromHead(head)
  if ('errors' in chain) return chain

  return this.validateChainOrder(chain.entities)
}

private async findChainHead(entity: Entity): Promise<Entity | SupersessionChain> {
  // Walk backwards to find head of chain
  // Returns either the head entity or an error chain
}

private async buildChainFromHead(head: Entity): Promise<SupersessionChain> {
  // Walk forward from head to build complete chain
  // Detects circular references and orphaned references
}

private validateChainOrder(entities: Entity[]): SupersessionChain {
  // Validates chronological order
  // Returns valid chain or chain with errors
}

private invalidChain(error: string): SupersessionChain {
  return { entities: [], isValid: false, errors: [error] }
}
```

## Benefits

- **Testability**: Each step can be tested in isolation
- **Readability**: Clear separation of concerns
- **Maintainability**: Easy to modify individual steps
- **Debugging**: Easier to identify which step fails
- **Reusability**: Helper methods could be used elsewhere

## Implementation Steps

1. Extract `invalidChain` helper (trivial)
2. Extract `validateChainOrder` (already isolated logic)
3. Extract `buildChainFromHead` (requires careful error handling)
4. Extract `findChainHead` (requires careful state management)
5. Refactor main method to orchestrate
6. Add unit tests for each new method
7. Verify existing integration tests still pass

## Testing Strategy

- Keep existing integration test for full chain detection
- Add unit tests for:
  - `findChainHead` with various scenarios
  - `buildChainFromHead` with circular refs, orphans
  - `validateChainOrder` with valid/invalid orders
  - `invalidChain` helper (trivial)

## Dependencies

- None - internal refactoring only

## Related

- General pattern to apply to other complex methods
- Consider extracting pattern to coding guidelines
