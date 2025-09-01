# Task: Refactor Large TypeScript Analyzer File

## Priority: MEDIUM - Maintainability

## Problem
The TypeScriptDependencyAnalyzer.ts file is 630+ lines, exceeding the 500-line recommendation for maintainability.

**File**: `/app/src/analyzers/TypeScriptDependencyAnalyzer.ts`
**Current Size**: 638 lines
**Target Size**: < 500 lines per file

## Why Deferred
- **Risk Level**: Medium - Requires careful module extraction
- **Effort**: Large (60+ minutes)
- **Dependencies**: All tests must continue passing
- **Impact**: Pure refactoring, no functional changes

## Proposed Structure

```
/app/src/analyzers/
├── TypeScriptDependencyAnalyzer.ts (main class, ~200 lines)
├── ast/
│   ├── ASTVisitor.ts (AST traversal logic, ~150 lines)
│   └── ImportExportExtractor.ts (extraction logic, ~100 lines)
├── graph/
│   ├── DependencyGraph.ts (graph building, ~80 lines)
│   └── CycleDetector.ts (Tarjan's algorithm, ~100 lines)
├── exporters/
│   ├── JSONExporter.ts (JSON export, ~50 lines)
│   └── DOTExporter.ts (Graphviz export, ~70 lines)
└── types.ts (existing, unchanged)
```

## Refactoring Plan

### Phase 1: Extract AST Visitor
Move the large `visit` function and related import/export extraction:
- `extractImportInfo` method
- `visit` nested function (currently 150+ lines)
- Import/export detection logic

### Phase 2: Extract Graph Operations
Move graph-related methods:
- `buildDependencyGraph`
- `detectCycles` (Tarjan's implementation)
- Cycle detection helpers

### Phase 3: Extract Exporters
Move visualization methods:
- `exportToJSON`
- `exportToDOT`
- Report generation helpers

### Phase 4: Clean Up Main Class
Main class retains:
- Constructor and options
- Public API methods
- High-level orchestration
- File system operations

## Acceptance Criteria
- [ ] No file exceeds 500 lines
- [ ] All existing tests pass without modification
- [ ] Public API remains unchanged
- [ ] Each module has single responsibility
- [ ] Proper exports/imports between modules
- [ ] Documentation updated

## Benefits
1. **Easier Testing**: Can unit test each module independently
2. **Better Maintainability**: Clear separation of concerns
3. **Reusability**: Graph algorithms can be reused
4. **Parallel Development**: Multiple developers can work on different modules

## Testing Strategy
1. Ensure 100% test coverage before refactoring
2. Extract modules one at a time
3. Run tests after each extraction
4. No changes to test files should be needed

## Effort Estimate
- Planning: 15 minutes
- Phase 1 (AST): 20 minutes
- Phase 2 (Graph): 15 minutes
- Phase 3 (Exporters): 10 minutes
- Phase 4 (Cleanup): 10 minutes
- Testing: 10 minutes
- Total: ~1.5 hours

## Risks
- Import cycles between new modules
- Breaking internal APIs
- Losing cohesion

## Notes
- Consider using barrel exports (index.ts) for clean imports
- Keep interfaces in types.ts for shared contracts
- This refactoring enables future enhancements more easily