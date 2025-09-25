# Task: Break Down Large Methods for Better Maintainability

## Context
During code review, identified several methods that exceed reasonable length limits and could benefit from decomposition for better maintainability and testing.

## Affected Methods

### 1. `LensRegistry.detectConflicts()` - 72 lines
**Current Issues:**
- Handles both priority and transformation conflict detection
- Complex logic for avoiding duplicate conflicts
- Difficult to test individual conflict types

**Proposed Breakdown:**
```typescript
detectConflicts(): LensConflict[] {
  const conflicts: LensConflict[] = []

  conflicts.push(...this.detectPriorityConflicts())
  conflicts.push(...this.detectTransformationConflicts(conflicts))

  return conflicts
}

private detectPriorityConflicts(): LensConflict[]
private detectTransformationConflicts(existingConflicts: LensConflict[]): LensConflict[]
private createConflictKey(lensIds: string[], type: string): string
```

### 2. `ActivationDetector.detectFilePatterns()` - 112 lines
**Current Issues:**
- Handles multiple file pattern types in single method
- Complex nested logic for pattern classification
- Difficult to extend with new file pattern types

**Proposed Breakdown:**
```typescript
detectFilePatterns(files: string[]): FilePatterns {
  // Main orchestration method
  const patterns = this.initializeFilePatterns()
  const typeGroups = new Set<string>()

  for (const file of files) {
    this.classifyFile(file, patterns, typeGroups)
  }

  this.finalizePatterns(patterns, typeGroups)
  return patterns
}

private classifyFile(file: string, patterns: FilePatterns, typeGroups: Set<string>): void
private classifyTestFile(fileName: string, patterns: FilePatterns): void
private classifyDocumentationFile(fileName: string, patterns: FilePatterns): void
private classifyConfigFile(fileName: string, patterns: FilePatterns): void
// ... etc for other file types
```

## Acceptance Criteria

### Functional Requirements
- [ ] All existing functionality preserved
- [ ] All tests continue to pass
- [ ] No performance regression
- [ ] Maintains existing API compatibility

### Code Quality Requirements
- [ ] Each method has single responsibility
- [ ] Methods are < 30 lines each
- [ ] Clear, descriptive method names
- [ ] Proper error handling maintained
- [ ] Comprehensive unit tests for new methods

### Testing Strategy
- [ ] Extract existing test cases into smaller, focused tests
- [ ] Add tests for individual helper methods
- [ ] Maintain integration test coverage
- [ ] Test error conditions for each method

## Implementation Plan

### Phase 1: LensRegistry.detectConflicts()
1. Create private helper methods for each conflict type
2. Extract conflict key generation logic
3. Update existing tests to cover helper methods
4. Refactor main method to use helpers

### Phase 2: ActivationDetector.detectFilePatterns()
1. Create file classification helper methods
2. Extract pattern finalization logic
3. Add focused unit tests for each file type
4. Refactor main method for orchestration only

### Phase 3: Validation
1. Run full test suite
2. Performance benchmarking
3. Code review for readability improvements

## Benefits
- **Testability**: Easier to test individual components
- **Maintainability**: Changes to specific logic are isolated
- **Readability**: Main methods show high-level flow
- **Extensibility**: New file types or conflict types easier to add

## Risks
- **Over-engineering**: Breaking down could create too many small methods
- **Performance**: Method call overhead (minimal in practice)
- **Complexity**: More methods to understand overall flow

## Priority: Medium
**Rationale**: Improves long-term maintainability but doesn't affect current functionality.

## Estimated Effort: Medium (45-90 minutes)
- Analysis and design: 15 minutes
- Implementation: 60 minutes
- Testing and validation: 15 minutes

## Created: 2024-12-19
**Source**: Code review recommendations
**Assigned**: TBD

## Dependencies
- Should be coordinated with any other refactoring efforts
- Consider doing after type safety improvements are complete