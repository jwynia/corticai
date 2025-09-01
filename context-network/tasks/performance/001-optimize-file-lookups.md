# Task: Optimize File Lookups with Map

## Priority: LOW - Minor Performance

## Problem
The dependency graph building uses O(n) array search to find files, which could be O(1) with a Map.

**Location**: `/app/src/analyzers/TypeScriptDependencyAnalyzer.ts:429`
```typescript
const dependentFile = files.find(f => f.path === dep);
```

## Why Deferred
- **Risk Level**: Low
- **Effort**: Trivial (5 minutes)
- **Impact**: Minor - Only noticeable with 100+ files
- **Current Performance**: Acceptable for current use cases

## Solution
```typescript
// Build lookup map once
const fileMap = new Map(files.map(f => [f.path, f]));

// Use O(1) lookup
const dependentFile = fileMap.get(dep);
```

## Acceptance Criteria
- [ ] Replace array.find with Map.get
- [ ] Verify same behavior
- [ ] No performance regression
- [ ] Tests still pass

## Performance Impact
- Current: O(n²) for n files with dependencies
- Target: O(n) for n files
- Noticeable only with 100+ files

## Effort Estimate
- Implementation: 5 minutes
- Testing: 5 minutes
- Total: 10 minutes

## Notes
- Low priority since current projects are small
- Consider bundling with other performance improvements
- Could be done during the file splitting refactor