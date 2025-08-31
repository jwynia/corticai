# Task: Improve Nested List Test Coverage

## Priority: MEDIUM - Test Quality

## Context
The current test for nested lists only verifies that list items exist, but doesn't actually validate the nested structure or parent-child relationships.

## Original Recommendation
From test review: "Test only checks that list items exist, doesn't verify nested structure"

## Current Implementation
```typescript
it('should handle nested lists', () => {
  const content = `- Parent item
  - Nested item 1
  - Nested item 2
- Another parent`;
  
  // ... extraction ...
  
  expect(listItems.length).toBeGreaterThan(0);
  // Missing: actual nesting verification
});
```

## Why Deferred
- Requires understanding how nested lists should be represented
- May need to enhance the adapter to track nesting levels
- Need to decide on nesting representation (metadata vs relationships)
- Medium effort to implement properly

## Suggested Implementation

### Option 1: Via Metadata (Indent Level)
```typescript
it('should handle nested lists with proper indentation tracking', () => {
  const content = `- Parent item
  - Nested item 1
  - Nested item 2
- Another parent`;
  
  const entities = adapter.extract(content, metadata);
  const listItems = entities.filter(e => e.type === 'list-item');
  
  expect(listItems).toHaveLength(4);
  
  // Verify indent levels
  expect(listItems[0].metadata?.indentLevel).toBe(0); // Parent
  expect(listItems[1].metadata?.indentLevel).toBe(1); // Nested
  expect(listItems[2].metadata?.indentLevel).toBe(1); // Nested
  expect(listItems[3].metadata?.indentLevel).toBe(0); // Parent
});
```

### Option 2: Via Parent-Child Relationships
```typescript
it('should handle nested lists with parent-child relationships', () => {
  // Test that nested items have 'child-of' relationship to parent item
  const parentItem = listItems[0];
  const nestedItems = listItems.slice(1, 3);
  
  nestedItems.forEach(item => {
    expect(item.relationships?.some(r => 
      r.type === 'child-of' && r.target === parentItem.id
    )).toBe(true);
  });
});
```

## Acceptance Criteria
- [ ] Test verifies actual nesting structure
- [ ] Clear assertions about parent-child relationships
- [ ] Works for multiple nesting levels
- [ ] Test fails if nesting is not properly detected
- [ ] Adapter updated if needed to track nesting

## Effort Estimate
- **Test Development**: 15-20 minutes
- **Adapter Enhancement**: 20-30 minutes (if needed)
- **Total**: 35-50 minutes

## Dependencies
- May require enhancing UniversalFallbackAdapter to track nesting
- Need decision on how to represent nesting (metadata vs relationships)

## Success Metrics
- Test provides meaningful validation of nested structure
- Test catches regressions in nested list parsing
- Clear documentation of nesting representation

## Notes
- Consider if nested lists are actually needed for MVP
- Could be part of broader markdown enhancement
- Watch for edge cases with mixed indentation (tabs vs spaces)