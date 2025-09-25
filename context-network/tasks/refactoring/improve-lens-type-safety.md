# Task: Improve Type Safety - Remove 'any' Type Casting

## Context
During code review, identified use of `any` type casting in LensRegistry for modifying lens priorities during automatic conflict resolution.

## Current Issue
```typescript
// CONCERNING - Direct type casting in LensRegistry.ts:477
(lens as any).priority = lens.priority + index
```

This bypasses TypeScript's type safety and could lead to runtime errors if the lens implementation doesn't support priority modification.

## Acceptance Criteria

### Primary Solution
- [ ] Create proper interface extension for mutable lenses:
```typescript
interface MutableLens extends ContextLens {
  priority: number // Explicitly mutable
}
```

### Alternative Solution
- [ ] Add optional `adjustPriority` method to ContextLens interface
- [ ] Update BaseLens to implement the method
- [ ] Modify conflict resolution to use the method instead of direct property access

### Validation Requirements
- [ ] All existing tests pass
- [ ] Type checking passes without warnings
- [ ] No breaking changes to existing lens implementations
- [ ] Documentation updated for new approach

## Considerations

### API Design Impact
- This change affects the core ContextLens interface
- Need to consider backward compatibility
- Should this be an optional capability or required?

### Implementation Options
1. **Interface Extension**: Create MutableLens interface
2. **Method Addition**: Add adjustPriority() method to interface
3. **Builder Pattern**: Use lens configuration builder for mutations
4. **Immutable Approach**: Create new lens instances instead of mutation

### Dependencies
- Requires review of all lens implementations
- May impact lens registry conflict resolution logic
- Should align with overall system immutability patterns

## Priority: High
**Rationale**: Type safety is crucial for long-term maintainability and preventing runtime errors.

## Estimated Effort: Medium (30-60 minutes)
- Interface design: 15 minutes
- Implementation: 30 minutes
- Testing and validation: 15 minutes

## Created: 2024-12-19
**Source**: Code review recommendations
**Assigned**: TBD