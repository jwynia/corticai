# Unified Project Backlog - CorticAI

## Purpose
This is the single source of truth for all project work, integrating research, validation, and implementation tasks. Tasks are ordered by dependencies and value, not by type.

## Classification
- **Domain:** Planning
- **Stability:** Dynamic
- **Abstraction:** Tactical
- **Confidence:** Evolving

## Current Sprint Focus
**Sprint Goal**: Validate core concepts through minimal implementations
**Theme**: Prove the universal context engine works across domains

---

## 🎯 Next Up Queue (Pick from Here)

### 1. Build Universal Fallback Adapter
**Type**: Research Implementation
**Why First**: Foundation everything else builds on - proves we can extract entities from any file
**Effort**: 4-6 hours
**Outcome**: Working adapter that handles any text file without configuration

<details>
<summary>Implementation Details</summary>

**Acceptance Criteria**:
- [ ] Extracts document structure (headers, paragraphs, lists)
- [ ] Identifies file references and URLs
- [ ] Creates container/content relationships
- [ ] Works with .txt, .md, unknown extensions
- [ ] Returns valid Entity[] structure

**Files**:
- Create: `/src/adapters/UniversalFallbackAdapter.ts`
- Create: `/tests/adapters/universal.test.ts`

</details>

---

### 2. Prototype TypeScript Dependency Detection
**Type**: Research Validation
**Why Next**: Validates our dependency relationship theory with real code
**Effort**: 6-8 hours
**Outcome**: Proof that we can track "this needs that" relationships

<details>
<summary>Implementation Details</summary>

**Acceptance Criteria**:
- [ ] Parse TypeScript files using compiler API
- [ ] Extract import dependencies
- [ ] Build bidirectional dependency graph
- [ ] Generate simple visualization
- [ ] Document findings in research folder

**Files**:
- Create: `/src/analyzers/TypeScriptDependencyAnalyzer.ts`
- Create: `/research/findings/dependency-validation.md`

</details>

---

### 3. Create Basic Attribute Index
**Type**: Core Implementation
**Why Next**: Enables the "find all X with Y" queries that are fundamental to the system
**Effort**: 4-5 hours
**Outcome**: Working inverted index for shared attributes

<details>
<summary>Implementation Details</summary>

**Acceptance Criteria**:
- [ ] Add/remove attributes for entities
- [ ] Query by single or multiple attributes
- [ ] AND/OR query support
- [ ] Handle 10,000+ entities efficiently

**Files**:
- Create: `/src/indexes/AttributeIndex.ts`
- Create: `/tests/indexes/attribute-index.test.ts`

</details>

---

### 4. Build Simple Novel Adapter
**Type**: Research Validation
**Why Important**: Proves the system truly works beyond code
**Effort**: 5-6 hours
**Outcome**: Functioning adapter for narrative content

<details>
<summary>Implementation Details</summary>

**Acceptance Criteria**:
- [ ] Detect chapters and scenes
- [ ] Extract character names
- [ ] Identify locations
- [ ] Create character co-occurrence relationships
- [ ] Generate timeline

**Files**:
- Create: `/src/adapters/NovelAdapter.ts`
- Create: `/examples/novel-project/`

</details>

---

### 5. Integrate Kuzu Graph Database
**Type**: Core Implementation
**Why**: Need persistent storage for relationships
**Blocked By**: Tasks 1-3 (need entities and relationships to store)
**Effort**: 8-10 hours
**Outcome**: Working graph storage layer

---

### 6. Cross-Domain Pattern Transfer Experiment
**Type**: Research Validation
**Why**: Validates that patterns learned in one domain apply to others
**Blocked By**: Tasks 2 and 4 (need both code and novel adapters)
**Effort**: 3-4 hours
**Outcome**: Evidence that universal patterns exist

---

## 📊 Backlog by Phase

### Phase 0: Research & Validation (Current)
- [x] Research universal patterns
- [x] Research dependency relationships
- [x] Research shared attributes
- [x] Research refactoring patterns
- [ ] **Build Universal Fallback Adapter** ← Start Here
- [ ] **Prototype TypeScript Dependencies**
- [ ] **Create Attribute Index**
- [ ] **Build Novel Adapter**
- [ ] **Cross-Domain Pattern Transfer**
- [ ] **Semantic Similarity Benchmark**

### Phase 1: Core Engine Foundation
- [ ] Integrate Kuzu graph database
- [ ] Integrate DuckDB analytics
- [ ] Implement file monitoring
- [ ] Build basic CRUD API
- [ ] Create simple query interface

### Phase 2: Domain Support
- [ ] Formalize domain adapter interface
- [ ] Enhance code domain adapter
- [ ] Enhance document domain adapter
- [ ] Implement universal pattern detection
- [ ] Build cross-domain relationships

### Phase 3: Intelligence Layer
- [ ] Implement Continuity Cortex (deduplication)
- [ ] Build lens system
- [ ] Create progressive loading
- [ ] Implement consolidation process
- [ ] Build maintenance agents

## 🚫 Not Yet (Explicitly Deprioritized)

These are important but not needed for initial validation:
- Performance optimization
- Multi-user support
- External system integration (GitHub, Jira)
- Advanced ML features
- UI/visualization

## 📈 Progress Tracking

### Validation Milestones
- [ ] **Milestone 1**: Can extract entities from any file
- [ ] **Milestone 2**: Can track dependencies between entities
- [ ] **Milestone 3**: Can query by shared attributes
- [ ] **Milestone 4**: Works with both code and non-code
- [ ] **Milestone 5**: Patterns transfer between domains

### Success Metrics
- Research questions answered: 15/23
- Proof of concepts completed: 0/6
- Core components built: 0/5
- Domains supported: 0/4

## 🎯 Decision Points

### Immediate Decisions Needed
1. **File watching library**: Chokidar vs alternatives (needed before Phase 1)
2. **Memory consolidation trigger**: Time vs pressure vs manual (needed for Phase 3)

### Upcoming Decisions
1. Graph database schema design (before Kuzu integration)
2. Query language syntax (before API design)
3. Plugin/adapter distribution method (before Phase 2)

## 📝 Task Selection Criteria

When choosing what to work on next:

1. **Is it blocking other work?** → Do it first
2. **Does it validate a core assumption?** → High priority
3. **Can it be done independently?** → Good for parallel work
4. **Does it provide user value?** → Priority over internals
5. **Is it research or implementation?** → Balance both

## 🔄 Backlog Maintenance

**Weekly Review Questions**:
- Are research findings changing our approach?
- Which assumptions have been validated/invalidated?
- Are we balancing research with building?
- What's the next biggest risk to address?

**Update Triggers**:
- Research task completes → Update approach if needed
- Validation fails → Pivot and add new research tasks
- External feedback → Reprioritize based on user needs

---

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Planning Phase
- **Review Cycle:** Weekly

## Navigation
- **Parent**: [planning/roadmap.md]
- **Related**: 
  - [research/index.md] - Research findings that inform tasks
  - [planning/implementation_phases.md] - Phase definitions
  - [decisions/decision_index.md] - Decisions that affect priorities