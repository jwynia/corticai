# Task: Improve Entity ID Generation

## Priority: LOW - Potential Issue

## Context
Current ID generation uses `Date.now()` combined with a counter. While functional, this could theoretically cause collisions if entities are created in rapid succession (within the same millisecond).

## Original Recommendation
From code review: "ID generation uses Date.now() which could collide in rapid succession. Use crypto.randomUUID() or nanoid for better uniqueness."

## Why Deferred
- Current implementation works for expected use cases
- No reported collisions in testing
- Low risk in practice (counter provides additional uniqueness)
- Would require updating all tests that check for ID format

## Current Implementation
```typescript
private generateId(): string {
  return `entity_${Date.now()}_${++this.entityCounter}`;
}
```

## Suggested Improvements

### Option 1: crypto.randomUUID() (Node.js built-in)
```typescript
private generateId(): string {
  return `entity_${crypto.randomUUID()}`;
}
```
**Pros**: Built-in, cryptographically secure
**Cons**: Longer IDs, not sequential

### Option 2: nanoid (external library)
```typescript
import { nanoid } from 'nanoid';

private generateId(): string {
  return `entity_${nanoid(10)}`;
}
```
**Pros**: Shorter IDs, configurable length, very fast
**Cons**: External dependency

### Option 3: Enhanced current approach
```typescript
private generateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `entity_${timestamp}_${++this.entityCounter}_${random}`;
}
```
**Pros**: No dependencies, maintains current structure
**Cons**: Still not cryptographically secure

## Acceptance Criteria
- [ ] Zero collision probability in practice
- [ ] IDs remain reasonably short for readability
- [ ] All tests updated to handle new ID format
- [ ] Performance not degraded
- [ ] No breaking changes to API

## Effort Estimate
- **Development**: 15-20 minutes
- **Test updates**: 20-30 minutes
- **Total**: 35-50 minutes

## Dependencies
- May require adding nanoid dependency if that option chosen
- Need to update test expectations

## Success Metrics
- ID generation benchmark shows <1μs per ID
- No collisions in 1 million generated IDs
- Tests still pass with new format

## Notes
- Consider if sequential IDs have any benefits for debugging
- UUID v7 (time-sortable) might be ideal when widely available
- Current implementation hasn't caused issues, so this is preventive