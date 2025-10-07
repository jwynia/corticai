# Tech Debt: Refactor ActivationDetector File

**Created**: 2025-10-07
**Priority**: Low (Code maintainability)
**Complexity**: Small-Medium
**Effort**: 4-6 hours
**Category**: Refactoring / Code Quality

## Problem

`ActivationDetector.ts` is 702 lines, making it harder to navigate and maintain.

## Current State

File contains multiple responsibilities:
- Context analysis
- Pattern matching
- Scoring algorithms
- File classification
- Project structure detection

## Proposed Solution

Extract into focused modules:

```typescript
// src/context/lenses/activation/ContextAnalyzer.ts
export class ContextAnalyzer {
  analyzeFiles(files: string[]): FileAnalysis
  detectPatterns(files: string[]): PatternMatch[]
}

// src/context/lenses/activation/ScoringEngine.ts
export class ScoringEngine {
  calculateActivationScore(context: ActivationContext): number
  weighFactors(factors: ActivationFactor[]): number
}

// src/context/lenses/activation/FileClassifier.ts
export class FileClassifier {
  classifyFile(filename: string): FileType
  detectFramework(files: string[]): Framework[]
}

// Main detector becomes orchestrator
export class ActivationDetector {
  constructor(
    private analyzer: ContextAnalyzer,
    private scorer: ScoringEngine,
    private classifier: FileClassifier
  ) {}

  shouldActivate(lens: ContextLens, context: ActivationContext): boolean
}
```

## Acceptance Criteria

- [ ] Each file under 300 lines
- [ ] All existing tests pass
- [ ] No behavior changes
- [ ] Clear module boundaries
- [ ] Documentation updated

## Benefits

- Easier to understand each component
- Better testability of individual algorithms
- Clearer responsibilities

## Effort Estimate

- Planning: 1 hour
- Implementation: 3-4 hours
- Testing/validation: 1-2 hours

## When to Schedule

- After storage adapter refactoring
- Can wait for natural need to modify activation logic
- Good starter task for understanding lens system

## Related

- Storage adapter refactoring (same pattern)
- Could inform similar refactoring across codebase
