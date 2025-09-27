# Improve Logger Property Encapsulation

## Task Definition
**Type**: Code Quality / Encapsulation
**Priority**: Medium
**Effort**: Small (15-30 minutes)
**Dependencies**: Understanding of logger usage patterns

## Context
The KuzuSecureQueryBuilder class exposes its logger as a public property, which breaks encapsulation principles. However, an external function currently accesses this logger directly, requiring a design decision.

## Original Recommendation
"Consider making logger private or readonly in KuzuSecureQueryBuilder"

## Why Deferred
- Requires design decision about external function access pattern
- Need to evaluate if external function should be moved to class or use different logging approach
- Should consider broader logging architecture consistency
- May impact other similar patterns in codebase

## Acceptance Criteria
- [ ] Analyze current usage pattern in `executeSecureQueryWithMonitoring` function
- [ ] Decide on preferred logging architecture:
  - Option A: Move external function into class as method
  - Option B: Pass logger as parameter to external function
  - Option C: Create module-level logger for external functions
- [ ] Implement chosen solution
- [ ] Make logger property private or readonly
- [ ] Update any other similar patterns for consistency
- [ ] Ensure existing functionality is preserved

## Current Implementation
**File**: `src/storage/adapters/KuzuSecureQueryBuilder.ts`

**Issue**:
```typescript
export class KuzuSecureQueryBuilder {
  public logger: Logger  // Should be private/readonly

export function executeSecureQueryWithMonitoring(
  queryBuilder: KuzuSecureQueryBuilder,
  // ...
) {
  if (debugMode) {
    queryBuilder.logger.info(...)  // External access
  }
}
```

## Design Options

### Option A: Move Function to Class
**Pros**: Better encapsulation, logger stays private
**Cons**: Changes API, may break existing usage

### Option B: Logger Parameter
**Pros**: Explicit dependency, logger stays private
**Cons**: Extra parameter, may be redundant

### Option C: Module-Level Logger
**Pros**: Simple, consistent with other modules
**Cons**: Less context-aware logging

## Recommended Approach
Start with Option C (module-level logger) as it's least disruptive and aligns with patterns used elsewhere in the codebase.

## Implementation Steps
1. Create module-level logger for the external function
2. Remove logger dependency from external function
3. Make class logger private readonly
4. Test to ensure logging still works
5. Check for similar patterns in other files

## Estimated Effort
- Analysis: 10 minutes
- Implementation: 15 minutes
- Testing: 10 minutes
- **Total**: ~35 minutes

## Related Files
May need to check other storage adapters for similar patterns.

## Metadata
- **Created**: 2025-09-26 (Code Review Triage)
- **Source**: Code review finding
- **Category**: Code Quality/Encapsulation