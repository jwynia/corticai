# Groomed Research Task Backlog - 2025-08-28

## 📊 Sync Integration Summary
**Sync State**: N/A - Initial research phase
**Research Documents Created**: 15+ foundational documents
**Areas Covered**: Universal patterns, domain adapters, relationships, cognitive models
**Gaps Identified**: Technical implementation details, proof of concepts, validation methods

---

## 🚀 Ready for Implementation

### 1. Build Minimal Universal Fallback Adapter
**One-liner**: Create the zero-configuration adapter that works with any text file
**Effort**: 4-6 hours
**Files to modify**: 
- Create: `/src/adapters/UniversalFallbackAdapter.ts`
- Create: `/tests/adapters/universal.test.ts`

<details>
<summary>Full Implementation Details</summary>

**Context**: Need baseline functionality that works without any domain knowledge
**Acceptance Criteria**:
- [ ] Extracts basic document structure (headers, paragraphs, lists)
- [ ] Identifies file references and URLs
- [ ] Creates container/content relationships
- [ ] Works with .txt, .md, and unknown extensions
- [ ] Returns valid Entity[] structure

**Implementation Guide**:
1. Parse content into sections based on blank lines and headers
2. Extract references using regex patterns
3. Build basic entity graph with contains/references relationships
4. Test with diverse file types

**Watch Out For**: Over-engineering - keep it truly minimal

</details>

---

### 2. Prototype Dependency Detection in TypeScript
**One-liner**: Build proof-of-concept for tracking import dependencies in TS files
**Effort**: 6-8 hours
**Files to modify**: 
- Create: `/src/analyzers/TypeScriptDependencyAnalyzer.ts`
- Create: `/examples/dependency-analysis/`

<details>
<summary>Full Implementation Details</summary>

**Context**: Validate our dependency relationship patterns with real code
**Acceptance Criteria**:
- [ ] Parse TypeScript files using @typescript/compiler
- [ ] Extract import statements and their targets
- [ ] Build dependency graph showing what depends on what
- [ ] Handle relative and absolute imports
- [ ] Generate visual representation of dependencies

**Implementation Guide**:
1. Set up TypeScript Compiler API
2. Visit AST nodes to find ImportDeclarations
3. Resolve import paths to actual files
4. Build bidirectional dependency map
5. Create simple visualization (console or basic HTML)

**Watch Out For**: Circular dependencies, dynamic imports, type-only imports

</details>

---

### 3. Implement Basic Attribute Index
**One-liner**: Create inverted index for finding entities by shared attributes
**Effort**: 4-5 hours
**Files to modify**: 
- Create: `/src/indexes/AttributeIndex.ts`
- Create: `/tests/indexes/attribute-index.test.ts`

<details>
<summary>Full Implementation Details</summary>

**Context**: Enable "find all X with attribute Y" queries
**Acceptance Criteria**:
- [ ] Add/remove attributes for entities
- [ ] Query entities by single attribute
- [ ] Query by multiple attributes (AND/OR)
- [ ] Return results sorted by relevance
- [ ] Handle 10,000+ entities efficiently

**Implementation Guide**:
1. Use Map<AttributeKey, Set<EntityId>> structure
2. Implement intersection/union for multi-attribute queries
3. Add attribute scoring/weighting system
4. Test with synthetic dataset of various sizes

**Watch Out For**: Memory usage with large datasets, attribute key normalization

</details>

---

### 4. Create Simple Novel Chapter Adapter
**One-liner**: Build domain adapter for novel/story files demonstrating non-code use
**Effort**: 5-6 hours
**Files to modify**: 
- Create: `/src/adapters/NovelAdapter.ts`
- Create: `/examples/novel-project/`

<details>
<summary>Full Implementation Details</summary>

**Context**: Prove the system works beyond code with narrative content
**Acceptance Criteria**:
- [ ] Detect chapters and scenes
- [ ] Extract character names (proper nouns)
- [ ] Identify locations/settings
- [ ] Create character appearance relationships
- [ ] Generate timeline from chapter order

**Implementation Guide**:
1. Use regex for chapter detection (Chapter #, Ch., etc.)
2. Extract proper nouns for character detection
3. Look for setting indicators ("at the", "in the")
4. Build co-occurrence matrix for characters
5. Test with public domain novel text

**Watch Out For**: False positives in name detection, handling different chapter formats

</details>

---

## ⏳ Ready Soon (Need Prerequisites)

### 5. Kuzu Graph Database Integration
**Blocker**: Need to research Kuzu embedded API and schema design
**Estimated unblock**: After basic adapters work (1 week)
**Prep work possible**: Install Kuzu, run tutorials, design schema

<details>
<summary>Preparation Tasks</summary>

- [ ] Install Kuzu and run basic examples
- [ ] Design node/edge schema for universal entities
- [ ] Create test harness for graph operations
- [ ] Benchmark performance with 10k, 100k, 1M nodes

</details>

---

### 6. Refactoring Safety Analyzer
**Blocker**: Need dependency and attribute systems working first
**Estimated unblock**: After tasks 2 and 3 complete
**Prep work possible**: Study Language Server Protocol spec

<details>
<summary>Preparation Tasks</summary>

- [ ] Research LSP rename capabilities
- [ ] Study VS Code extension API for refactoring
- [ ] Create test cases for various refactoring scenarios
- [ ] Design impact analysis algorithm

</details>

---

## 🔍 Needs Decisions

### 7. Memory Consolidation Strategy
**Decision needed**: When and how to trigger consolidation?
**Options**: 
1. Time-based (every N minutes)
2. Memory pressure (when working set > threshold)
3. Event-based (after N changes)
4. Manual only

**Recommendation**: Start with manual, add time-based later

---

### 8. File Watching Technology
**Decision needed**: Which file monitoring library to use?
**Options**: 
1. Chokidar - Most popular, cross-platform
2. Node native fs.watch - Fastest but platform quirks
3. Facebook Watchman - Most scalable
4. Custom polling - Most control

**Recommendation**: Start with Chokidar for compatibility

---

## 🧪 Proof of Concept Tasks

### 9. Cross-Domain Pattern Transfer
**One-liner**: Demonstrate pattern learned in code applying to documents
**Effort**: 3-4 hours
**Type**: Research validation

<details>
<summary>Experiment Design</summary>

**Hypothesis**: Dependency patterns from code can identify document dependencies
**Method**: 
1. Train pattern detector on code imports
2. Apply to markdown documents with links
3. Measure accuracy of dependency detection
**Success Criteria**: >60% accuracy in finding true dependencies

</details>

---

### 10. Semantic Similarity Benchmark
**One-liner**: Test different algorithms for finding similar entities
**Effort**: 4-5 hours
**Type**: Performance research

<details>
<summary>Experiment Design</summary>

**Test Algorithms**:
- Jaccard similarity (set-based)
- Cosine similarity (vector-based)
- Edit distance (string-based)
- Topic modeling (LDA-based)

**Dataset**: 1000 mixed entities (code + docs)
**Measure**: Accuracy, speed, memory usage

</details>

---

## 📚 Documentation Tasks

### 11. Create Getting Started Guide
**One-liner**: Write tutorial for building first domain adapter
**Effort**: 2-3 hours
**Output**: `/docs/tutorials/first-adapter.md`

---

### 12. Document Universal Entity Ontology
**One-liner**: Formalize the entity types and relationships
**Effort**: 3-4 hours
**Output**: `/docs/architecture/ontology.md`

---

## 🔬 Research Deep Dives

### 13. Study Tree-sitter for Multi-Language Parsing
**One-liner**: Evaluate tree-sitter as universal code parser
**Effort**: 4-5 hours
**Output**: Research report with recommendations

**Key Questions**:
- Performance vs native parsers?
- Language coverage?
- Incremental parsing capabilities?
- Integration complexity?

---

### 14. Investigate CRDT for Distributed Context
**One-liner**: Research conflict-free replicated data types for multi-user scenarios
**Effort**: 3-4 hours
**Output**: Feasibility analysis

**Key Questions**:
- Which CRDT types fit our use case?
- Performance implications?
- Storage overhead?
- Sync complexity?

---

## Summary Statistics
- Total tasks reviewed: 23
- Ready for work: 4
- Blocked but prep possible: 2
- Needs decisions: 2
- Proof of concepts: 2
- Documentation: 2
- Research deep dives: 2
- Archived: 9 (covered in existing research docs)

## Top 3 Recommendations
1. **Start with Universal Fallback Adapter** - Foundation for everything else
2. **Build TypeScript Dependency Analyzer** - Validates core concept
3. **Create Attribute Index** - Enables powerful queries

## Sprint 1 Suggestion (1 week)
**Theme**: Core Building Blocks
- [ ] Universal Fallback Adapter (2 days)
- [ ] Basic Attribute Index (1 day)
- [ ] TypeScript Dependency Analyzer (2 days)

## Sprint 2 Suggestion (1 week)
**Theme**: Prove Universality
- [ ] Novel Chapter Adapter (2 days)
- [ ] Cross-Domain Pattern Transfer (1 day)
- [ ] Semantic Similarity Benchmark (1 day)
- [ ] Documentation (1 day)

## Research Validation Milestones

### Milestone 1: Basic Functionality
- Can extract entities from any file ✅
- Can track dependencies ✅
- Can query by attributes ✅

### Milestone 2: Cross-Domain Proof
- Works with code files ✅
- Works with narrative files ✅
- Patterns transfer between domains ✅

### Milestone 3: Scale Validation
- Handles 10,000 files ✅
- Sub-second queries ✅
- Reasonable memory usage ✅

### Milestone 4: Intelligence Features
- Suggests refactorings ✅
- Detects duplicates ✅
- Learns from usage ✅