# Task: Prototype TypeScript Dependency Analyzer

## Priority: HIGH - Domain Validation

## Context
The TypeScript Dependency Analyzer validates our dependency relationship theory with real code. It's critical for proving the system works with programming artifacts and demonstrates cross-domain pattern application.

## Original Recommendation
From groomed backlog: "Extract and visualize import dependencies from TypeScript files"

## Why Deferred (Not Immediate)
- Requires TypeScript Compiler API setup
- Complex AST parsing logic
- Needs careful design for circular dependency handling
- Visualization component adds complexity

## Acceptance Criteria
- [ ] Parse TypeScript files using compiler API
- [ ] Extract import dependencies (ES6 imports, require statements)
- [ ] Build bidirectional dependency graph
- [ ] Handle both relative and package imports
- [ ] Detect circular dependencies
- [ ] Generate visualization (console output initially, D3.js later)
- [ ] Document findings in research folder
- [ ] Comprehensive test coverage

## Technical Specifications

### Analyzer Interface
```typescript
interface DependencyAnalyzer {
  // Analysis
  analyzeFile(filePath: string): FileAnalysis;
  analyzeDirectory(dirPath: string): ProjectAnalysis;
  
  // Graph operations
  buildDependencyGraph(files: FileAnalysis[]): DependencyGraph;
  detectCycles(graph: DependencyGraph): Cycle[];
  
  // Visualization
  exportToJSON(graph: DependencyGraph): string;
  exportToDOT(graph: DependencyGraph): string;
  generateReport(analysis: ProjectAnalysis): Report;
}

interface FileAnalysis {
  path: string;
  imports: Import[];
  exports: Export[];
  dependencies: string[];
  dependents: string[];
}

interface DependencyGraph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge[]>;
  cycles: Cycle[];
}
```

### Implementation Approach
1. **TypeScript Compiler API**
   - Use ts.createProgram() for AST access
   - Walk AST to find import/export statements
   - Resolve module paths

2. **Graph Construction**
   - Directed graph with files as nodes
   - Imports as edges
   - Bidirectional traversal support

3. **Cycle Detection**
   - Tarjan's algorithm for strongly connected components
   - Johnson's algorithm for all elementary circuits

4. **Visualization**
   - Start with console output (ASCII art)
   - Export to DOT format for Graphviz
   - Later: D3.js interactive visualization

## Research Foundation
- [/context-network/research/relationships/dependency_relationship_patterns.md]
- AST-based analysis is academically validated approach
- Software dependency analysis is well-established field

## Effort Estimate
- **Development**: 6-8 hours
- **Testing**: 3 hours
- **Visualization**: 2-3 hours
- **Documentation**: 1 hour
- **Total**: 12-15 hours

## Dependencies
- [ ] Universal Fallback Adapter (for entity extraction patterns)
- [ ] TypeScript Compiler API knowledge
- [ ] Graph algorithms library (or implement from scratch)

## Success Metrics
- Correctly identifies all imports in test project
- Detects 100% of circular dependencies
- Performance: < 1 second for 100 file project
- Generates actionable dependency report
- Test coverage > 80%

## Files to Create
- `/app/src/analyzers/TypeScriptDependencyAnalyzer.ts`
- `/app/tests/analyzers/typescript-deps.test.ts`
- `/app/src/analyzers/graph/DependencyGraph.ts`
- `/app/src/analyzers/visualizers/ConsoleVisualizer.ts`
- `/context-network/research/findings/dependency-validation.md`

## Test Strategy
1. **Unit Tests**
   - AST parsing accuracy
   - Import resolution
   - Graph construction
   - Cycle detection

2. **Integration Tests**
   - Analyze actual TypeScript projects
   - Compare with known dependency structures
   - Validate against manual analysis

3. **Test Projects**
   - Simple: 5-10 files, no cycles
   - Medium: 20-30 files, some cycles
   - Complex: The corticai project itself

## Future Enhancements
- Support for other languages (JavaScript, Python)
- Call graph analysis (not just imports)
- Dependency impact analysis
- Refactoring suggestions
- Integration with IDE/LSP

## Notes
- This validates core theory about dependency relationships
- Results will inform universal pattern refinements
- Consider using existing tools (madge, dependency-cruiser) for validation
- Academic research strongly supports AST-based approach