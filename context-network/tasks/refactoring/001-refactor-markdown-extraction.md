# Task: Refactor extractMarkdownEntities Method

## Priority: MEDIUM - Maintainability

## Context
The `extractMarkdownEntities` method in UniversalFallbackAdapter is 144 lines long with high cyclomatic complexity. This makes it difficult to understand, test, and maintain.

## Original Recommendation
From code review: "Method is 144 lines long, exceeds 50 line recommended limit. High cyclomatic complexity with nested conditions."

## Why Deferred
- Requires significant refactoring (30-60 minutes)
- Tests are passing and coverage is excellent (95.71%)
- Functional changes could introduce bugs
- Needs careful design to maintain performance

## Acceptance Criteria
- [ ] Method broken down into smaller, focused methods (<50 lines each)
- [ ] Each sub-method has single responsibility
- [ ] All existing tests still pass
- [ ] No performance degradation
- [ ] Maintain or improve test coverage

## Suggested Refactoring Approach

```typescript
private extractMarkdownEntities(
  content: string,
  entities: Entity[],
  documentId: string
): void {
  const processor = new MarkdownLineProcessor(content, entities, documentId);
  
  for (const line of processor) {
    if (processor.isHeader(line)) {
      processor.processHeader(line);
    } else if (processor.isListItem(line)) {
      processor.processListItem(line);
    } else {
      processor.accumulateText(line);
    }
  }
  
  processor.finalize();
}
```

## Sub-methods to Extract
1. `processMarkdownHeader()` - Handle header extraction
2. `processMarkdownList()` - Handle list and list item extraction  
3. `processMarkdownParagraph()` - Handle paragraph accumulation
4. `updateLineNumbers()` - Centralize line number tracking

## Effort Estimate
- **Development**: 30-45 minutes
- **Testing**: 15 minutes
- **Total**: 45-60 minutes

## Dependencies
- None - isolated refactoring

## Success Metrics
- Cyclomatic complexity reduced by 50%+
- Each method under 50 lines
- Test coverage maintained at 95%+
- Performance unchanged or improved

## Notes
- Consider using a state machine pattern for markdown parsing
- Could benefit from the Strategy pattern for different element types
- Watch for edge cases with nested lists and mixed content