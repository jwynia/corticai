# Task: Improve ProjectionEngine Type Safety

**Status**: 📋 Planned
**Priority**: Medium
**Effort**: Small (30 minutes)
**Created**: 2025-11-15
**Source**: Code review recommendation

## Context

The `ProjectionEngine.applyDepthProjection()` method currently uses `as any` type assertions to bypass TypeScript's type checking when setting optional properties to `undefined`. While this works, it reduces type safety and could hide issues if the `RankedResult` interface changes.

**Current Implementation** (`ProjectionEngine.ts:210, 220`):
```typescript
projected.scoreBreakdown = undefined as any
```

## Problem

- **Type Safety**: `as any` bypasses TypeScript's type system
- **Maintainability**: Changes to `RankedResult` interface might not be caught
- **Code Quality**: Signals incomplete type modeling

## Recommended Solution

Use `Partial<RankedResult>` during projection, then cast back to full type:

```typescript
private applyDepthProjection(result: RankedResult, depth: ContextDepth): RankedResult {
  // Use Partial to allow undefined properties naturally
  const projected: Partial<RankedResult> = { ...result }

  switch (depth) {
    case ContextDepth.SIGNATURE:
      projected.properties = { name: result.properties.name }
      projected.lifecycle = undefined        // Type-safe now!
      projected.supersessionChain = undefined
      projected.temporalContext = undefined
      projected.embeddingSimilarity = undefined
      projected.scoreBreakdown = undefined   // No 'as any' needed
      break

    // ... other cases
  }

  // Cast back to full RankedResult at the end
  // (Safe because we started with a complete RankedResult)
  return projected as RankedResult
}
```

## Alternative Approach (More Robust)

Create proper projection result types:

```typescript
// Define what each depth level actually returns
type SignatureProjection = Pick<RankedResult, 'id' | 'type'> & {
  properties: Pick<RankedResult['properties'], 'name'>
}

type StructureProjection = SignatureProjection & {
  lifecycle?: LifecycleMetadata
  supersessionChain?: string[]
}

// Then use union types or function overloads
function applyDepthProjection(result: RankedResult, depth: ContextDepth.SIGNATURE): SignatureProjection
function applyDepthProjection(result: RankedResult, depth: ContextDepth.STRUCTURE): StructureProjection
// ... etc
```

This approach provides **complete type safety** but requires more upfront design.

## Acceptance Criteria

- [ ] Remove all `as any` type assertions from `applyDepthProjection()`
- [ ] TypeScript compilation passes with 0 errors
- [ ] All 43 ProjectionEngine tests still pass
- [ ] No behavioral changes (pure refactoring)
- [ ] Type safety verified with intentional breaking changes

## Impact

- **Risk**: Low (pure type refactoring with full test coverage)
- **Benefit**: Better type safety, easier future maintenance
- **Breaking Changes**: None (internal implementation only)

## Dependencies

- None - can be done independently

## Related

- Original implementation: `app/src/semantic/ProjectionEngine.ts`
- Code review: 2025-11-15 review (Medium priority issue #1)

## Notes

This is a quality improvement that doesn't affect functionality but improves long-term maintainability. Can be done anytime, but good to address before Phase 4 integration expands this code further.
