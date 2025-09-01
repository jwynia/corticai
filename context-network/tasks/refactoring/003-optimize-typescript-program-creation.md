# Task: Optimize TypeScript Program Creation

## Priority: HIGH - Performance Impact

## Problem
The TypeScript Dependency Analyzer creates a new TypeScript program for each file when checking diagnostics, which is extremely inefficient for large codebases.

**Current Issue Location**: `/app/src/analyzers/TypeScriptDependencyAnalyzer.ts:222-224`
```typescript
const diagnostics = ts.getPreEmitDiagnostics(
  ts.createProgram([filePath], this.compilerOptions)
);
```

## Why Deferred
- **Risk Level**: Medium-High - Changes core compilation logic
- **Effort**: Medium (30-60 minutes)
- **Dependencies**: Requires understanding of TypeScript Compiler API lifecycle
- **Testing**: Needs performance benchmarking before/after

## Proposed Solution

### Option 1: Program Caching
```typescript
private programCache: Map<string, ts.Program> = new Map();

private getOrCreateProgram(files: string[]): ts.Program {
  const key = files.sort().join('|');
  if (!this.programCache.has(key)) {
    this.programCache.set(key, ts.createProgram(files, this.compilerOptions));
  }
  return this.programCache.get(key)!;
}
```

### Option 2: Batch Processing
```typescript
async analyzeDirectory(dirPath: string): Promise<ProjectAnalysis> {
  const allFiles = await this.findTypeScriptFiles(dirPath);
  // Create single program for all files
  const program = ts.createProgram(allFiles, this.compilerOptions);
  // Use program for all analyses
}
```

## Acceptance Criteria
- [ ] Only one program created per directory analysis
- [ ] Performance improvement of at least 50% for 20+ file projects
- [ ] All existing tests still pass
- [ ] Memory usage remains reasonable
- [ ] Add performance benchmark test

## Performance Impact
- Current: O(n) program creations for n files
- Target: O(1) program creation for directory
- Expected speedup: 5-10x for medium projects

## Testing Strategy
1. Create performance benchmark with 50, 100, 200 files
2. Measure before optimization
3. Apply optimization
4. Verify performance improvement
5. Check memory usage doesn't explode

## Related Issues
- Performance test currently times out with 20 files
- Users will experience slow analysis on real projects

## Effort Estimate
- Research: 15 minutes
- Implementation: 30 minutes
- Testing: 15 minutes
- Total: ~1 hour

## Notes
- Consider using ts.createIncrementalProgram for even better performance
- May need to handle file watching for real-time updates later
- Could integrate with language service for IDE-like performance