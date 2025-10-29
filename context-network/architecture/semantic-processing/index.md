# Semantic Processing Architecture

**Domain**: Information Retrieval, Knowledge Management, Attention Management
**Status**: Architectural Documentation
**Created**: 2025-10-28
**Parent**: [[../index.md|Architecture Index]]

---

## Overview

This directory documents CorticAI's semantic processing architecture - how context is ingested, enriched, queried, and maintained to prevent attention gravity while preserving information.

**Core Insight**: Most "memory for LLMs" tools optimize for conversational context (chat history, user preferences). CorticAI optimizes for knowledge networks (codebase understanding, architectural decisions, project context) where age doesn't equal irrelevance and historical documentation can overwhelm current guidance.

---

## Quick Navigation

### Start Here

**New to CorticAI's approach?** Read in this order:
1. [[attention-gravity-problem]] - Understand the core problem
2. [[design-rationale]] - Why CorticAI is different from existing tools
3. [[semantic-pipeline-stages]] - How semantic operations are staged

**Implementing features?** Go directly to:
- [[write-time-enrichment]] - Document ingestion and Q&A generation
- [[projection-based-compression]] - Building projection views
- [[semantic-maintenance]] - Continuous health monitoring

---

## Core Documents

### The Problem

**[[attention-gravity-problem]]**
*Why historical documentation overwhelms current guidance*

- **Read When**: Understanding why CorticAI needs attention management
- **Key Concepts**: Volume bias, search neutrality, gravity wells
- **Real Example**: Kuzu → SurrealDB migration (7/10 tasks completed before pivot)
- **Related**: Modern search engine degradation, vocabulary mismatch

### The Architecture

**[[semantic-pipeline-stages]]**
*Where semantic operations should (and shouldn't) apply*

- **Read When**: Designing search/retrieval features
- **Key Concepts**: 5-stage pipeline, literal-first search, write-time vs query-time
- **Anti-Patterns**: Query expansion, embedding-only search, semantic-only relationships
- **Related**: Bell curve collapse, precision loss

**[[projection-based-compression]]**
*How to compress without ambiguity*

- **Read When**: Dealing with "summary" or documentation compression
- **Key Concepts**: Semantic blocks, projection queries, compression contracts
- **Problem Solved**: "Summary" ambiguity - what does it preserve/discard?
- **Related**: Multiple access paths, progressive disclosure

**[[write-time-enrichment]]**
*Semantic operations during document ingestion*

- **Read When**: Implementing document ingestion pipeline
- **Key Concepts**: Q&A generation, relationship inference, lifecycle detection, metadata extraction
- **Performance**: 15-30s per document, amortized over 1000+ queries
- **Related**: Vocabulary bridging, automatic knowledge graph building

**[[semantic-maintenance]]**
*Continuous health monitoring and decay prevention*

- **Read When**: Implementing maintenance services
- **Key Concepts**: Staleness detection, contradiction resolution, relationship health, gap detection
- **Schedules**: Daily (link rot), weekly (semantic drift), monthly (comprehensive review)
- **Related**: Knowledge graph decay, auto-fix vs manual review

### The Philosophy

**[[design-rationale]]**
*Why these architectural choices were made*

- **Read When**: Understanding CorticAI's positioning vs competitors
- **Key Insights**: Lifecycle over time, write-time investment, Q&A as access paths
- **Comparisons**: vs Mem0, MemGPT/Letta, LangChain, traditional RAG
- **Validation**: Self-hosting strategy

---

## Key Concepts

### Attention Gravity
Historical documentation creates gravitational wells that pull LLM attention toward superseded approaches despite deprecation markers. Volume and detail create authority bias.

**Solution**: Lifecycle metadata + hierarchical compression + lifecycle-aware search

### Semantic Pipeline Stages
Semantic operations at the right stage: literal parsing → structural filtering → semantic enrichment → semantic ranking → semantic presentation. Preserves user specificity while leveraging semantic understanding.

**Anti-Pattern**: Query-time term expansion (bell curve collapse)

### Projection-Based Compression
One semantically-tagged source (CONTEXT.md) supports multiple derived views (decision-view, timeline-view, outcomes-view). Each projection has explicit contract declaring what it preserves.

**Anti-Pattern**: Multiple static "summary" files that drift

### Write-Time Enrichment
Pay semantic cost once during ingestion: Q&A generation, relationship inference, lifecycle detection, semantic block extraction. Makes queries fast (<100ms).

**Trade-off**: 30s write time, 1000+ queries benefit

### Lifecycle States
`current | stable | evolving | deprecated | historical | archived` - semantic relevance, not temporal decay. 2-year-old principle can be current, 2-week-old plan can be deprecated.

**Anti-Pattern**: Time-based decay (age ≠ irrelevance for knowledge work)

---

## Implementation Status

| Component | Status | Priority | Notes |
|-----------|--------|----------|-------|
| Lifecycle Metadata Schema | Planned | High | Foundation for attention management |
| Projection Engine | Planned | High | Core feature for compression |
| Q&A Generation | Planned | High | Vocabulary bridging |
| Literal-First Search | Planned | High | Query precision |
| Staleness Detection | Planned | Medium | Maintenance automation |
| Contradiction Detection | Planned | Medium | Knowledge coherence |
| Semantic Maintenance Service | Planned | Medium | Continuous health |

---

## Integration Points

### Existing CorticAI Components

**Lens System** (`/app/src/context/lenses/`)
- Add lifecycle-aware lenses (CurrentWorkLens, HistoricalResearchLens)
- Projection-based lens activation
- Stage 2 filtering in semantic pipeline

**Dual-Role Storage** (`/app/src/storage/`)
- Graph DB: Semantic blocks as nodes, relationships as edges
- Analytics DB: Materialized projection views, Q&A search index
- Both: Lifecycle metadata, attention weights

**Domain Adapters** (`/app/src/context/adapters/`)
- Semantic block extraction during ingestion
- Relationship inference
- Lifecycle detection
- Write-time enrichment orchestration

**Continuity Cortex** (planned)
- Supersession detection on write
- Contradiction flagging
- Staleness monitoring
- Background maintenance scheduling

---

## Related Documentation

### Architecture
- [[../dual-role-storage.md]] - Primary (graph) + semantic (analytics) storage
- [[../lens-system.md]] - Context filtering and perspective switching
- [[../continuity-cortex.md]] - File operation monitoring and maintenance

### Research
- [[../../research/llm-memory-pruning-strategies.md]] - Survey of existing memory management approaches
- External: Modern search engine degradation examples
- External: RAG system architectures and trade-offs

### Planning
- [[../../planning/semantic-processing-implementation/]] - Implementation roadmap
- [[../../decisions/]] - Architecture Decision Records (ADRs)

---

## For Different Audiences

### Fresh Agents / New Contributors
Start with:
1. [[attention-gravity-problem]] - Understand the problem
2. [[design-rationale]] - See how CorticAI is different
3. [[semantic-pipeline-stages]] - Learn the processing model

### Feature Implementers
Go to:
- [[write-time-enrichment]] for ingestion pipeline
- [[projection-based-compression]] for view generation
- [[semantic-maintenance]] for health monitoring

### Architects / Technical Leadership
Review:
- [[design-rationale]] for positioning vs competitors
- [[semantic-pipeline-stages]] for processing architecture
- Integration points (above) for system-wide impact

### Researchers / Academics
Explore:
- [[attention-gravity-problem]] for novel problem definition
- [[projection-based-compression]] for compression model
- [[design-rationale]] for comparison with existing work

---

## Questions This Documentation Answers

- **Why doesn't CorticAI use time-based decay like other memory systems?**
  See: [[design-rationale#lifecycle-over-time]]

- **How do I prevent deprecated docs from confusing LLMs?**
  See: [[attention-gravity-problem#solution-requirements]]

- **Where should semantic operations happen in the pipeline?**
  See: [[semantic-pipeline-stages]]

- **How do I compress information without losing critical details?**
  See: [[projection-based-compression]]

- **What's the difference between CorticAI and Mem0/MemGPT?**
  See: [[design-rationale#corticai-vs-existing-tools]]

- **How does Q&A generation solve vocabulary mismatch?**
  See: [[write-time-enrichment#qa-generation]]

- **How do I detect when documentation becomes stale?**
  See: [[semantic-maintenance#staleness-detection]]

---

## Contributing

When adding to this architecture:

1. **Use semantic blocks** - Tag decisions, examples, patterns, anti-patterns
2. **Link extensively** - Every concept should link to related concepts
3. **Declare lifecycle** - Mark new docs as `lifecycle: current`
4. **Update this index** - Add your document to the appropriate section
5. **Cross-reference** - Update related docs with links to your additions

### Document Template

```markdown
# [Document Title]

**Status**: [Architectural Specification | Pattern | Problem Definition]
**Domain**: [domain tags]
**Related**: [[other]], [[documents]]

::principle{id="principle-id" importance="critical|high|medium|low"}
Core principle statement
::

::example{scenario="name"}
Concrete example
::

::anti-pattern{name="pattern-name" why-fails="reason"}
What not to do
::
```

---

## Changelog

- **2025-10-28**: Initial architecture documentation created
  - Core problem definition (attention gravity)
  - Processing pipeline specification
  - Compression model (projections)
  - Enrichment patterns (Q&A generation)
  - Maintenance strategies
  - Design rationale vs competitors

---

*For questions or clarifications about this architecture, see related ADRs in `/context-network/decisions/` or reach out to the architecture team.*
