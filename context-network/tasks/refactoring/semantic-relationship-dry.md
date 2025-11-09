# Refactoring: Extract Duplicate Relationship Detection Logic

**Created**: 2025-11-09
**Source**: Code review of Semantic Processing Phase 2
**Priority**: MEDIUM
**Effort**: Small (20-30 minutes)
**Risk**: Medium (Refactoring with test validation required)

## Problem

The `detectSupersessionRelationships` method contains three similar regex patterns with nearly identical processing logic, violating DRY principle:

```typescript
// Pattern 1: "superseded by X"
const supersededByRegex = /(?:superseded by|replaced by)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi
while ((match = supersededByRegex.exec(content)) !== null) {
  const target = match[2] || match[3]
  // ... 10 lines of identical processing logic
}

// Pattern 2: "see X instead"
const seeInsteadRegex = /(?:see|use|refer to)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))\s+instead/gi
while ((match = seeInsteadRegex.exec(content)) !== null) {
  const target = match[2] || match[3]
  // ... same 10 lines of processing logic
}

// Pattern 3: "moved to X"
const movedToRegex = /(?:moved to|relocated to|now at)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi
while ((match = movedToRegex.exec(content)) !== null) {
  const target = match[2] || match[3]
  // ... same 10 lines of processing logic again
}
```

**Impact**:
- Code duplication (~30 lines duplicated 3 times)
- Harder to maintain (changes need to be made in 3 places)
- Increased risk of bugs from inconsistent updates
- Harder to add new relationship patterns

**Location**: `app/src/semantic/RelationshipInference.ts:210-278`

## Recommended Solution

Extract to a reusable helper method:

```typescript
/**
 * Extract relationships from content using a regex pattern
 *
 * @param content Document content to search
 * @param entityId Source entity ID
 * @param regex Pattern to match (should have capture groups for link text and path)
 * @param relationshipType Type of relationship being detected
 * @param confidence Confidence score for this pattern type
 * @returns Array of detected relationships
 */
private extractRelationshipsFromPattern(
  content: string,
  entityId: string,
  regex: RegExp,
  relationshipType: RelationshipType,
  confidence: number
): InferredRelationship[] {
  const relationships: InferredRelationship[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    // Extract target from either markdown link (match[2]) or plain path (match[3])
    const target = match[2] || match[3]
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    if (target) {
      relationships.push({
        type: relationshipType,
        fromEntityId: entityId,
        toEntityIdOrPattern: target,
        confidence,
        evidence: match[0],
        sourceLocation: { start: matchStart, end: matchEnd },
        resolved: false,
      })
    }
  }

  return relationships
}

/**
 * Detect supersession relationships - REFACTORED VERSION
 */
private detectSupersessionRelationships(
  content: string,
  entityId: string
): InferredRelationship[] {
  const relationships: InferredRelationship[] = []

  // Define patterns with their confidence scores
  const patterns: Array<{ regex: RegExp; confidence: number }> = [
    {
      regex: /(?:superseded by|replaced by)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi,
      confidence: 0.9, // Very high confidence
    },
    {
      regex: /(?:see|use|refer to)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))\s+instead/gi,
      confidence: 0.85, // High confidence
    },
    {
      regex: /(?:moved to|relocated to|now at)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi,
      confidence: 0.85, // High confidence
    },
  ]

  // Extract relationships using each pattern
  for (const { regex, confidence } of patterns) {
    const detected = this.extractRelationshipsFromPattern(
      content,
      entityId,
      regex,
      'supersedes',
      confidence
    )
    relationships.push(...detected)
  }

  return relationships
}
```

## Benefits

1. **Reduced Duplication**: ~90 lines → ~50 lines (44% reduction)
2. **Easier Maintenance**: Single source of truth for relationship extraction logic
3. **More Extensible**: Easy to add new patterns by adding to array
4. **Better Testability**: Can test helper method independently
5. **Consistent Behavior**: Impossible to have divergent logic between patterns

## Acceptance Criteria

- [ ] Extract `extractRelationshipsFromPattern` helper method
- [ ] Refactor `detectSupersessionRelationships` to use helper
- [ ] Consider refactoring `detectMentionRelationships` and `detectReferenceRelationships` similarly
- [ ] All existing tests pass (36 RelationshipInference tests)
- [ ] No behavioral changes (test outputs identical)
- [ ] Code coverage maintained or improved
- [ ] JSDoc added to helper method

## Testing Strategy

1. **Regression tests**:
   - Run all existing RelationshipInference tests
   - Verify identical output before/after refactoring
   - Test edge cases (empty content, no matches, multiple matches)

2. **Unit tests for helper**:
   ```typescript
   describe('extractRelationshipsFromPattern', () => {
     it('should extract relationships from regex matches', () => {
       const regex = /test\s+([a-z]+)/gi
       const result = inference['extractRelationshipsFromPattern'](
         'test abc and test def',
         'entity-1',
         regex,
         'mentions',
         0.8
       )

       expect(result).toHaveLength(2)
       expect(result[0].toEntityIdOrPattern).toBe('abc')
       expect(result[1].toEntityIdOrPattern).toBe('def')
     })
   })
   ```

3. **Integration tests**:
   - Verify supersession detection still works end-to-end
   - Test with real-world content examples

## Implementation Steps

1. Create `extractRelationshipsFromPattern` helper method
2. Write unit tests for the helper
3. Refactor `detectSupersessionRelationships` to use helper
4. Run all tests - verify no regressions
5. Consider applying same pattern to other detection methods
6. Update documentation

## Extension Opportunities

After initial refactoring, consider:

1. **Configurable Patterns**: Move regex patterns to configuration
   ```typescript
   interface RelationshipPattern {
     regex: RegExp
     type: RelationshipType
     confidence: number
   }

   interface RelationshipInferenceConfig {
     customPatterns?: RelationshipPattern[]
     // ...
   }
   ```

2. **Pattern Registry**: Central registry of all relationship patterns
3. **Pattern Testing Tool**: Utility to test regex patterns against sample content

## Dependencies

- None - pure refactoring

## Related Issues

- Similar pattern duplication exists in `detectReferenceRelationships` (3 patterns)
- Consider whether `detectMentionRelationships` could use same approach
- May want to extract common regex components (markdown link pattern appears multiple times)

## Implementation Notes

- Preserve exact behavior - this is pure refactoring
- Use TypeScript private method access in tests if needed: `inference['extractRelationshipsFromPattern']`
- Consider making helper method protected if subclasses might need it
- Add JSDoc examples showing how to use the helper

## References

- Code Review: `/review-code` output (2025-11-09)
- DRY Principle: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
- File: `app/src/semantic/RelationshipInference.ts:210-278`
- Related: Could apply same refactoring to other detection methods
