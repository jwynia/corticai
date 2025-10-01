# Add Depth Limit to Recursive Directory Reads

**Created**: 2025-10-01
**Priority**: Low
**Effort**: Small (15-20 minutes)
**Type**: Safety / Performance

## Original Recommendation

From code review of `SelfHostingExample.ts:119`:

Recursive directory read has no depth constraint:

```typescript
const files = await fs.readdir(tasksDir, { recursive: true })
```

## Problems

1. **Performance risk**: Deeply nested directories could cause slowdown
2. **Memory risk**: Could exhaust memory with extremely deep hierarchies
3. **DoS potential**: Malformed directory structures (circular symlinks, etc.)
4. **No control**: Can't limit scope of analysis

## Why Deferred

- Low probability issue (task directories unlikely to be deeply nested)
- Requires decision on appropriate depth limit
- Should implement controlled recursive function
- Low risk but needs testing with edge cases

## Proposed Solutions

### Option 1: Add max depth parameter
```typescript
async function readDirRecursive(
  dir: string,
  maxDepth: number = 5
): Promise<string[]> {
  // Custom implementation with depth tracking
}
```

### Option 2: Use existing library
```typescript
import glob from 'glob'
// Or use fast-glob, globby, etc.
```

### Option 3: Filter after read
```typescript
const files = await fs.readdir(tasksDir, { recursive: true })
const filtered = files.filter(f => {
  const depth = f.split(path.sep).length
  return depth <= MAX_DEPTH
})
```

## Acceptance Criteria

- [ ] Implement depth limit (recommend 10 levels max)
- [ ] Add configuration option for depth limit
- [ ] Handle circular symlinks gracefully
- [ ] Log warning if depth limit reached
- [ ] Test with deeply nested directory structure
- [ ] Document the depth limit in code comments

## Files to Modify

- `src/examples/SelfHostingExample.ts` (line 119)
- Possibly extract to utility function if used elsewhere

## Test Cases

- Normal case: 3-level directory structure
- Edge case: Exactly at depth limit
- Edge case: Exceeds depth limit
- Edge case: Circular symlinks (if applicable)

## Dependencies

None - isolated change

## Related

- [[file-system-operations]] - File system handling patterns
- [[safety-limits]] - Resource limit policies
