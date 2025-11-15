# Task: Implement ProjectionEngine Storage Integration

**Status**: 📋 Planned (Phase 4 Integration)
**Priority**: High
**Effort**: Medium (2-4 hours)
**Created**: 2025-11-15
**Blocked By**: None (ready when Phase 4 starts)

## Context

The `ProjectionEngine` currently uses mock/placeholder logic for fetching semantic blocks and generating suggestions. This was intentional for Phase 4 development (projection logic), but needs to be replaced with actual storage integration before production use.

**Current State**:
- `getBlocksForDepth()` - Generates mock semantic blocks (lines 258-293)
- `getSuggestionsForDepth()` - Returns empty array (lines 355-366)
- Both methods have TODO comments indicating integration needed

## Problem

The projection engine can't provide real semantic content without storage integration:
- **Semantic blocks** are currently mocked from result properties
- **Related suggestions** are not generated at all
- **Context chains** use placeholder entity names

This limits the value of progressive loading - users get projections of mock data rather than real semantic content.

## Recommended Solution

### Option 1: Dependency Injection (Preferred)

Add `BlockProvider` and `SuggestionProvider` interfaces:

```typescript
interface BlockProvider {
  fetchBlocksForEntity(entityId: string, depth: ContextDepth): Promise<SemanticBlock[]>
}

interface SuggestionProvider {
  generateSuggestions(
    result: RankedResult,
    depth: ContextDepth,
    context: { allResults?: RankedResult[] }
  ): Promise<Suggestion[]>
}

export class ProjectionEngine {
  constructor(
    config?: ProjectionEngineConfig,
    private blockProvider?: BlockProvider,
    private suggestionProvider?: SuggestionProvider
  ) { ... }

  private async getBlocksForDepth(
    result: RankedResult,
    depth: ContextDepth
  ): Promise<SemanticBlock[]> {
    if (depth < ContextDepth.SEMANTIC) return []

    if (!this.blockProvider) {
      // Fall back to mock for testing
      return this.generateMockBlocks(result)
    }

    return await this.blockProvider.fetchBlocksForEntity(result.id, depth)
  }
}
```

**Benefits**:
- Clean separation of concerns
- Easy to test with mock providers
- Flexible - can swap implementations
- Gradual migration (mock fallback)

### Option 2: Direct Storage Integration

Pass storage adapter directly:

```typescript
import type { SemanticStorage } from '../storage/interfaces'

export class ProjectionEngine {
  constructor(
    config?: ProjectionEngineConfig,
    private storage?: SemanticStorage
  ) { ... }

  private async getBlocksForDepth(...): Promise<SemanticBlock[]> {
    if (!this.storage) return []
    return await this.storage.getSemanticBlocks(result.id)
  }
}
```

**Benefits**:
- Simpler (fewer interfaces)
- Direct access to all storage methods

**Drawbacks**:
- Tighter coupling
- Harder to test in isolation

## Implementation Steps

1. **Define Interfaces** (if using Option 1)
   - Create `BlockProvider` interface
   - Create `SuggestionProvider` interface
   - Add to `ProjectionEngine.ts` or separate file

2. **Update Constructor**
   - Add optional provider parameters
   - Maintain backward compatibility (providers optional)

3. **Update `getBlocksForDepth()`**
   - Check if provider exists
   - Fetch from storage if available
   - Fall back to mock if not (for testing)
   - Make method async (returns `Promise<SemanticBlock[]>`)

4. **Implement `getSuggestionsForDepth()`**
   - Use `SuggestionProvider` to generate
   - Consider reusing logic from `SemanticPresenter.generateSuggestions()`
   - Return meaningful suggestions based on:
     - Entity relationships
     - Lifecycle states
     - Similarity scores

5. **Update `project()` Method**
   - Make async (now calls async block/suggestion fetchers)
   - Handle promise resolution
   - Update return type to `Promise<ProjectedResult[]>`

6. **Update Tests**
   - Mock providers in tests
   - Test with real storage (integration tests)
   - Verify async behavior
   - Test fallback to mocks

7. **Update Exports**
   - Export new interfaces
   - Update semantic/index.ts

## Acceptance Criteria

- [ ] Real semantic blocks fetched from storage
- [ ] Meaningful suggestions generated
- [ ] Context chains use real entity data
- [ ] All 43 ProjectionEngine tests still pass
- [ ] New integration tests verify storage usage
- [ ] Async behavior properly tested
- [ ] Mock fallback still works for unit tests
- [ ] TypeScript compilation passes
- [ ] No performance regression (caching still works)

## Test Plan

**Unit Tests** (with mocks):
```typescript
describe('ProjectionEngine with Storage', () => {
  it('should fetch blocks from BlockProvider', async () => {
    const mockProvider = {
      fetchBlocksForEntity: vi.fn().mockResolvedValue([
        { id: 'block-1', type: 'decision', content: 'Real block' }
      ])
    }

    const engine = new ProjectionEngine({}, mockProvider)
    const result = await engine.project([mockResult], { depth: ContextDepth.SEMANTIC })

    expect(mockProvider.fetchBlocksForEntity).toHaveBeenCalled()
    expect(result[0].relevantBlocks[0].content).toBe('Real block')
  })
})
```

**Integration Tests**:
```typescript
it('should fetch real semantic blocks from PgVector storage', async () => {
  const storage = new PgVectorStorageAdapter(config)
  const blockProvider = {
    fetchBlocksForEntity: (id) => storage.getSemanticBlocks(id)
  }

  const engine = new ProjectionEngine({}, blockProvider)
  // ... test with real data
})
```

## Dependencies

**Code Dependencies**:
- `SemanticStorage` interface (already exists)
- `PgVectorStorageAdapter` (already exists)
- `SemanticPresenter.generateSuggestions()` (reference for suggestion logic)

**Task Dependencies**:
- None (can start immediately)
- Recommended: Do after type safety improvements (tech-debt task)

## Breaking Changes

**Potential Breaking Change**: `project()` becomes async

```typescript
// Before
const projected = engine.project(results, config)

// After
const projected = await engine.project(results, config)
```

**Migration Strategy**:
1. Keep sync version as `projectSync()` for backward compatibility
2. Deprecate `projectSync()` with warning
3. Update all callers to use async version
4. Remove deprecated method in next major version

**OR** (simpler):
- Phase 4 is new, no external callers yet
- Just make it async from the start
- Update the 43 tests to handle promises

## Performance Considerations

- **Caching**: Current LRU cache should work with async
- **Batch Fetching**: Consider fetching blocks for multiple results at once
- **Lazy Loading**: Only fetch blocks when depth requires them (already doing this)

## Related

- **Original Code**: `app/src/semantic/ProjectionEngine.ts` (lines 258-366)
- **Code Review**: 2025-11-15 (Medium priority issue #2)
- **Phase 4 Roadmap**: `/planning/semantic-processing-implementation/README.md`
- **Storage Interface**: `app/src/storage/interfaces/SemanticStorage.ts`

## Notes

This is marked as "Phase 4 Integration" because:
1. The projection logic itself is complete and well-tested
2. Mock data is sufficient for testing projection behavior
3. Real storage integration is the natural next step

**Recommended Timing**: Start this task when beginning Phase 4 integration work, or when first production use case requires real semantic content.

The current implementation is **not broken** - it just uses mocks instead of real data. This is intentional and documented.
