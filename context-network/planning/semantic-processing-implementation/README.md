# Semantic Processing Implementation Roadmap

**Status**: Planning Complete, Ready for Implementation
**Created**: 2025-11-04
**Task**: TASK-004
**Architecture Docs**: [semantic-processing/](../../architecture/semantic-processing/)

---

## Overview

This document provides a phased implementation roadmap for CorticAI's semantic processing architecture, which addresses the **attention gravity problem** and enables intelligent context management for knowledge networks.

### What We're Building

CorticAI's semantic processing system transforms how context is managed for LLMs by:

1. **Solving Attention Gravity**: Historical documentation won't overwhelm current guidance
2. **Literal-First Search**: User query specificity is preserved, not "helpfully" expanded
3. **Write-Time Enrichment**: Q&A generation and relationship inference happen once at ingestion
4. **Projection-Based Compression**: One semantically-tagged source supports multiple derived views
5. **Lifecycle-Aware Relevance**: Age doesn't equal irrelevance; semantic state determines importance

**Key Insight**: Most "memory for LLMs" tools optimize for conversational context. CorticAI optimizes for knowledge networks where historical documentation can overwhelm current guidance.

---

## Current State Assessment

### What Exists (Foundation)

✅ **Dual-Role Storage Architecture** (`/app/src/storage/`)
- `SemanticStorage` interface fully defined (512 lines)
- `PgVectorStorageAdapter` implements dual-role (Primary + Semantic) with 91 passing tests
- `DuckDBStorageAdapter` provides OLAP analytics capabilities
- Materialized views, full-text search, aggregations already specified

✅ **Lens System** (`/app/src/context/lenses/`)
- Core `ContextLens` interface with query transformation
- `LensRegistry` for lens management
- Activation detection based on developer context
- Query and result transformation pipeline

✅ **Continuity Cortex** (`/app/src/context/cortex/`)
- File operation interception
- Similarity analysis framework
- Background monitoring capabilities

✅ **Semantic Analyzer** (`/app/src/context/analyzers/`)
- Keyword extraction
- Pattern matching
- Code semantics analysis (basic)

### What's Missing (Gaps)

❌ **Lifecycle Metadata System**
- No `current`, `stable`, `deprecated`, `historical` states
- No lifecycle detection logic
- No lifecycle-aware search filtering

❌ **Semantic Block Extraction**
- No `::decision`, `::outcome`, `::quote` block parsing
- No semantic block storage in graph
- No projection engine

❌ **Q&A Generation Pipeline**
- No automated question generation from documents
- No vocabulary bridging for search
- No Q&A storage or indexing

❌ **Attention Gravity Mitigation**
- No relevance scoring based on lifecycle
- No hierarchical compression
- No attention surface area reduction

❌ **5-Stage Semantic Pipeline**
- Stage 1 (Query Parsing): Basic parsing exists, needs negation/intent detection
- Stage 2 (Structural Filter): Exists in adapters, needs lifecycle filtering
- Stage 3 (Semantic Enrich): Missing entirely
- Stage 4 (Semantic Rank): Missing entirely
- Stage 5 (Semantic Present): Missing entirely

---

## Implementation Phases

### Phase 1: Foundation (4-6 hours)
**Priority**: Critical
**Goal**: Establish lifecycle metadata and basic semantic blocks

**Deliverables**:
1. **Lifecycle Metadata Schema**
   - Add `lifecycle` field to entity metadata
   - Define lifecycle states: `current | stable | evolving | deprecated | historical | archived`
   - Migration script for existing documents

2. **Basic Lifecycle Detection**
   - Pattern-based detection (keywords: "deprecated", "current", "superseded")
   - Confidence scoring
   - Manual review flagging

3. **Semantic Block Parser**
   - Parse `::decision{}`, `::outcome{}`, `::quote{}` syntax
   - Extract block metadata and content
   - Store blocks as typed nodes in graph

4. **Lifecycle-Aware Lens**
   - Filter queries by lifecycle state
   - Boost/de-rank based on relevance scores
   - Integration with existing lens system

**Integration Points**:
- `SemanticStorage.defineSchema()` - Add lifecycle field
- `ContextLens.transformQuery()` - Add lifecycle filters
- Storage adapters - Store/query lifecycle metadata

**Success Criteria**:
- [ ] Documents can be tagged with lifecycle states
- [ ] Queries can filter by lifecycle
- [ ] Semantic blocks are parsed and stored
- [ ] Tests: 30+ comprehensive tests

---

### Phase 2: Write-Time Enrichment (6-8 hours)
**Priority**: High
**Goal**: Implement Q&A generation and relationship inference

**Deliverables**:
1. **Q&A Generation Pipeline**
   - LLM-based question generation (3-5 questions per document)
   - Multiple vocabulary variations (technical + colloquial)
   - Citation tracking to source blocks
   - Confidence scoring

2. **Relationship Inference**
   - Supersession detection ("switched from X to Y")
   - Temporal relationships (same time period + topic)
   - Causal relationships ("because of X, we Y")
   - Topic clustering (embedding-based)

3. **Semantic Ingestion Pipeline**
   - Orchestrate: block extraction → Q&A generation → relationship inference
   - Performance target: 15-30s per document
   - Batch processing for initial imports
   - Progress tracking

4. **Storage Integration**
   - Store Q&A documents in semantic storage with full-text index
   - Store relationships as edges in graph storage
   - Materialized view for "current Q&A" (fast access)

**Integration Points**:
- `ContinuityCortex.onDocumentWrite()` - Trigger enrichment
- `PgVectorStorageAdapter` - Store Q&A and relationships
- `SemanticStorage.createSearchIndex()` - Index Q&A questions

**Success Criteria**:
- [ ] Documents generate 3-5 Q&A pairs automatically
- [ ] Supersession relationships are inferred correctly
- [ ] Q&A searchable via full-text search
- [ ] Tests: 40+ comprehensive tests
- [ ] Performance: <30s per document enrichment

---

### Phase 3: Semantic Pipeline Stages (8-10 hours)
**Priority**: High
**Goal**: Implement the 5-stage semantic processing pipeline

**Deliverables**:
1. **Stage 1: Query Parsing**
   - Intent classification (what/why/how/when)
   - Negation detection ("don't", "avoid", "not")
   - Preposition extraction (FROM X TO Y)
   - Preserve literal terms (no expansion)

2. **Stage 2: Structural Filtering**
   - Literal text matching (grep-style)
   - Lifecycle metadata filtering
   - Schema-based filtering
   - Reduce to ~100 candidates before semantic ops

3. **Stage 3: Semantic Enrichment**
   - Add polarity detection (positive/negative mentions)
   - Build supersession chains
   - Extract temporal context
   - Compute relevance factors

4. **Stage 4: Semantic Ranking**
   - Embedding similarity scoring
   - Intent alignment scoring
   - Polarity alignment
   - Authority scoring (lifecycle + evidence)
   - Combined relevance score (weighted)

5. **Stage 5: Semantic Presentation**
   - Extract relevant blocks
   - Assemble context chains
   - Add navigation hints
   - Generate "you might also want to know" suggestions

**Integration Points**:
- New `ContextPipeline` class orchestrating all stages
- `ContextLens` system applies filters at Stage 2
- Storage adapters provide pre-computed embeddings

**Success Criteria**:
- [ ] Queries preserve user specificity (no term expansion)
- [ ] Structural filtering reduces candidate set before semantic ops
- [ ] Results ranked by multiple semantic signals
- [ ] Answers include context, citations, and related content
- [ ] Tests: 50+ comprehensive tests
- [ ] Performance: <100ms per query

---

### Phase 4: Projection Engine (6-8 hours)
**Priority**: Medium
**Goal**: Enable multiple derived views from semantic source

**Deliverables**:
1. **Projection Query Engine**
   - Decision projection (decisions + rationale + evidence)
   - Timeline projection (chronological events)
   - Outcomes projection (current state + completed work)
   - Rationale projection (why decisions were made)

2. **Compression Contracts**
   - Explicit declaration of what each projection preserves/discards
   - Metadata for reconstructability
   - Versioning for projection definitions

3. **Hierarchical Compression**
   - Status summary (10 lines) - Most prominent
   - Semantic source (CONTEXT.md) - Full detail with blocks
   - Generated projections - Specific angles
   - Archive - Historical detail

4. **Lens Integration**
   - `DecisionLens` - Activate decision projection
   - `TimelineLens` - Activate timeline projection
   - `CurrentStateLens` - Filter to current/stable only

**Integration Points**:
- `SemanticStorage.createMaterializedView()` - Cache projections
- `ContextLens` system - Automatic projection selection
- Storage adapters - Query semantic blocks by type

**Success Criteria**:
- [ ] One CONTEXT.md source supports 4+ projections
- [ ] Projections declare preservation contracts
- [ ] Lenses automatically apply appropriate projections
- [ ] Tests: 30+ comprehensive tests
- [ ] Performance: <50ms projection generation

---

### Phase 5: Semantic Maintenance (6-8 hours)
**Priority**: Medium
**Goal**: Automated health monitoring and decay prevention

**Deliverables**:
1. **Staleness Detection**
   - Code reference rot detection (daily)
   - Semantic drift detection (weekly)
   - Orphan detection (weekly)

2. **Contradiction Detection**
   - Detect conflicting claims on write
   - Suggest resolution based on authority/recency
   - Auto-fix or flag for manual review

3. **Relationship Health**
   - Track relationship traversal frequency
   - Adjust weights based on usage
   - Decay unused relationships

4. **Maintenance Scheduler**
   - Daily: Code reference checks, contradictions
   - Weekly: Semantic drift, orphans, gaps
   - Monthly: Comprehensive review, optimization

5. **Health Dashboard**
   - Metrics: Link health, semantic coherence, contradiction rate
   - Overall health score (target >0.85)
   - Actionable recommendations

**Integration Points**:
- `ContinuityCortex` - Trigger maintenance on file operations
- Background scheduler for periodic checks
- Storage adapters - Update metadata based on health checks

**Success Criteria**:
- [ ] Broken links detected daily
- [ ] Contradictions flagged automatically
- [ ] Semantic drift detected before it's severe
- [ ] Health score computed and tracked
- [ ] Tests: 35+ comprehensive tests

---

## Technical Architecture Map

### Storage Layer Integration

```
┌─────────────────────────────────────────────────────────────┐
│ PgVectorStorageAdapter (Dual-Role Backend)                  │
├─────────────────────────────────────────────────────────────┤
│ Primary Storage Role:                                       │
│ - Semantic blocks as typed nodes                            │
│ - Relationships: SUPERSEDES, MOTIVATES, CITES               │
│ - Lifecycle metadata on all entities                        │
│ - Graph traversal for context chains                        │
├─────────────────────────────────────────────────────────────┤
│ Semantic Storage Role:                                      │
│ - Q&A documents with full-text index                        │
│ - Materialized views for projections                        │
│ - Aggregations for health metrics                           │
│ - Vector search with pgvector extension (Phase 4 - Future)  │
└─────────────────────────────────────────────────────────────┘
```

### Query Pipeline Architecture

```
User Query
    ↓
┌──────────────────────────┐
│ Stage 1: Query Parsing   │ ← Preserve user intent
│ - Intent classification  │
│ - Negation detection     │
│ - NO term expansion      │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Stage 2: Structural      │ ← Fast, deterministic
│ - Literal text match     │
│ - Lifecycle filter       │
│ - Reduce to ~100 docs    │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Stage 3: Semantic        │ ← Add understanding
│ - Polarity detection     │
│ - Supersession chains    │
│ - Relevance factors      │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Stage 4: Semantic Rank   │ ← Order by relevance
│ - Embedding similarity   │
│ - Intent alignment       │
│ - Authority scoring      │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Stage 5: Semantic        │ ← Assemble answer
│   Presentation           │
│ - Context chains         │
│ - Citations              │
│ - Related content        │
└──────────────────────────┘
    ↓
Contextualized Answer
```

### Ingestion Pipeline Architecture

```
Document Write
    ↓
┌──────────────────────────────────────────────┐
│ Semantic Ingestion Pipeline (15-30s)         │
├──────────────────────────────────────────────┤
│ 1. Extract semantic blocks (2-5s)            │
│    ::decision, ::outcome, ::quote, ::theme   │
│                                               │
│ 2. Extract metadata (1-2s)                   │
│    topics, technologies, participants         │
│                                               │
│ 3. Detect lifecycle (0.5s)                   │
│    Pattern matching + date heuristics        │
│                                               │
│ 4. Generate Q&A (5-10s)                      │
│    3-5 questions per document                │
│    Multiple vocabulary variations            │
│                                               │
│ 5. Infer relationships (2-3s)                │
│    Supersession, temporal, causal            │
│                                               │
│ 6. Detect contradictions (2-3s)              │
│    Compare claims with existing knowledge    │
│                                               │
│ 7. Compute embeddings (1-2s)                 │
│    Document + block embeddings               │
└──────────────────────────────────────────────┘
    ↓
Enriched Document stored in dual-role storage
```

---

## Implementation Dependencies

### Phase 1 → Phase 2
- Phase 2 requires lifecycle metadata from Phase 1
- Semantic blocks needed for Q&A generation context

### Phase 2 → Phase 3
- Phase 3 uses Q&A documents in Stage 2 filtering
- Relationship inference supports Stage 3 enrichment

### Phase 3 → Phase 4
- Phase 4 projections query semantic blocks from Phase 1-2
- Pipeline provides data for projection materialization

### Phase 4 → Phase 5
- Phase 5 maintenance validates projection consistency
- Health checks ensure semantic coherence

**Critical Path**: Phase 1 → Phase 2 → Phase 3
**Parallel Opportunities**: Phase 4 and Phase 5 can start after Phase 2

---

## Validation Strategy

### Self-Hosting Test Cases

1. **Fresh Agent Query**: "How should I implement graph storage?"
   - **Expected**: Recommends current approach, not deprecated
   - **Validates**: Attention gravity mitigation, lifecycle filtering

2. **Historical Research**: "Why did we move away from Kuzu?"
   - **Expected**: Finds supersession decision + full context
   - **Validates**: Non-lossy compression, progressive disclosure

3. **Vocabulary Mismatch**: "make database queries faster"
   - **Expected**: Finds performance optimization docs
   - **Validates**: Q&A generation as access paths

4. **Lifecycle Awareness**: Search results for "database"
   - **Expected**: Current approaches ranked first
   - **Validates**: Lifecycle-based relevance scoring

### Testing Requirements

**Per Phase**:
- Unit tests for all new components
- Integration tests for storage interactions
- Performance tests for query/ingestion times
- Edge case tests for error handling

**Overall**:
- Maintain >80% code coverage
- All tests must pass (0 regressions)
- Performance benchmarks documented

---

## Risk Assessment

### High Risks

1. **Performance Impact**
   - **Risk**: Write-time enrichment too slow (>30s)
   - **Mitigation**: Batch processing, async queue, caching

2. **Q&A Quality**
   - **Risk**: Generated questions don't match user queries
   - **Mitigation**: Manual review sample, confidence scoring, iterative refinement

3. **Lifecycle Detection Accuracy**
   - **Risk**: Automatic detection has false positives/negatives
   - **Mitigation**: Confidence thresholds, manual review flags, human-in-the-loop

### Medium Risks

4. **Storage Complexity**
   - **Risk**: Dual-role storage difficult to maintain
   - **Mitigation**: Comprehensive tests, clear separation of concerns

5. **Projection Consistency**
   - **Risk**: Projections drift from source
   - **Mitigation**: Automated validation, refresh on source change

### Low Risks

6. **Lens System Integration**
   - **Risk**: Lens conflicts or performance issues
   - **Mitigation**: Priority-based resolution, profiling

---

## Success Criteria (Overall)

### Functional Requirements
- [ ] Lifecycle metadata applied to all documents
- [ ] Q&A generated automatically on ingestion
- [ ] 5-stage semantic pipeline operational
- [ ] Projections generated from semantic sources
- [ ] Maintenance tasks run on schedule

### Performance Requirements
- [ ] Query latency: <100ms (95th percentile)
- [ ] Ingestion time: <30s per document
- [ ] Projection generation: <50ms
- [ ] Health checks: <5s daily, <30s weekly

### Quality Requirements
- [ ] Test coverage: >80%
- [ ] All tests passing: 0 regressions
- [ ] Code quality: Linting passes, no warnings
- [ ] Documentation: All components documented

### Self-Hosting Validation
- [ ] CorticAI manages its own context successfully
- [ ] Fresh agents find current guidance
- [ ] Historical context accessible when needed
- [ ] Search quality measurably improved

---

## Next Steps

1. **Review and Approval** (1 hour)
   - Technical lead review of roadmap
   - Stakeholder approval of phases
   - Resource allocation

2. **Phase 1 Kickoff** (immediate after approval)
   - Create implementation branch: `feature/semantic-phase-1-foundation`
   - Set up test framework for lifecycle metadata
   - Begin TDD implementation

3. **Tracking and Reporting**
   - Weekly progress updates in `/context-network/tasks/`
   - Completion records in `/context-network/tasks/completed/`
   - Update backlog as phases complete

---

## Related Documentation

- **Architecture**: [semantic-processing/](../../architecture/semantic-processing/)
  - [attention-gravity-problem.md](../../architecture/semantic-processing/attention-gravity-problem.md)
  - [semantic-pipeline-stages.md](../../architecture/semantic-processing/semantic-pipeline-stages.md)
  - [write-time-enrichment.md](../../architecture/semantic-processing/write-time-enrichment.md)
  - [projection-based-compression.md](../../architecture/semantic-processing/projection-based-compression.md)
  - [semantic-maintenance.md](../../architecture/semantic-processing/semantic-maintenance.md)
  - [design-rationale.md](../../architecture/semantic-processing/design-rationale.md)

- **Current Implementation**:
  - Storage: `/app/src/storage/`
  - Lenses: `/app/src/context/lenses/`
  - Cortex: `/app/src/context/cortex/`

- **Related ADRs**:
  - [adr-semantic-operations-placement.md](../../decisions/adr-semantic-operations-placement.md)

---

**Document Status**: ✅ Planning Complete, Ready for Implementation
**Created**: 2025-11-04
**Last Updated**: 2025-11-04
**Lifecycle**: current
