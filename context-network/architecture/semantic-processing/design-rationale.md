# Design Rationale: Why CorticAI Is Different

**Status**: Architectural Philosophy
**Domain**: System Design, Product Strategy
**Related**: [[attention-gravity-problem]], [[semantic-pipeline-stages]], [[projection-based-compression]]

---

## Overview

CorticAI's architecture differs fundamentally from existing "memory for LLMs" tools. This document explains why these design choices were made and what problems they solve.

---

## The Evolution: Markdown → CorticAI

::timeline{phase="evolution"}
**Phase 1: Markdown Files + Conventions** (Proof of Concept)
- CLAUDE.md instructions: "Check context network first"
- Manual linking, atomic notes, location indexes
- Discovery records, navigation hubs
- **Result**: Worked surprisingly well - proved the concept

**Phase 2: Hit Fundamental Limits**
- **Attention Gravity**: No way to de-emphasize superseded planning
- **Search Precision**: grep finds text but can't rank by lifecycle
- **Ambiguous Compression**: "Summary" could mean anything
- **Static Structure**: Can't generate different views for different needs
- **Manual Maintenance**: Humans mark things deprecated, update links

**Phase 3: CorticAI** (Solving the Limits)
- Lifecycle metadata + relevance scoring + lens filtering
- Metadata-first search, literal-preserving, respects negation
- Semantic blocks + projections (many views, one source)
- Query-based projections, dynamic lens activation
- Domain adapters extract semantics, Continuity Cortex detects issues
::

---

## CorticAI vs Existing "Memory for LLMs" Tools

### Mem0, MemGPT/Letta, LangChain Memory

::comparison{category="focus"}
**Their Focus**: Conversational memory (what did user say?)
**CorticAI Focus**: Knowledge network (what does team know?)

**Their Use Case**: Chat context, user preferences, interaction history
**CorticAI Use Case**: Codebase understanding, project context, architectural decisions
::

::comparison{category="decay-model"}
**Their Approach**: Time-based decay/pruning
- Memories fade over time (Ebbinghaus forgetting curve)
- Recent = more important
- Old = less important

**CorticAI Approach**: Lifecycle-based relevance (semantic, not temporal)
- 2-year-old architectural principle may still be current
- 2-week-old implementation plan may be superseded
- Age is weak signal compared to lifecycle state
::

::comparison{category="retrieval"}
**Their Approach**: Semantic similarity for retrieval
- Embedding-based search
- "Find memories similar to current context"
- Query expansion to catch variations

**CorticAI Approach**: Metadata-first retrieval (precision over helpfulness)
- Structural filtering first (lifecycle, type, domain)
- Then semantic ranking within filtered set
- Literal query preservation (no expansion)
- Explicit supersession chains
::

::comparison{category="optimization"}
**Their Optimization**: Chat context (recent conversation)
**CorticAI Optimization**: Codebase/project context (deep technical knowledge)

**Their Concern**: Token limits in conversational context window
**CorticAI Concern**: Attention gravity, stale references, conflicting guidance
::

---

## Key Architectural Insights

### 1. Semantics At The Right Stage

::insight{id="semantic-stage-placement" importance="critical"}
**Problem**: Modern search engines have degraded due to aggressive query rewriting

**Example Failure**:
```
User: "deprecated kuzu"  [specific, intentional]
     ↓ [semantic expansion]
Query: ["deprecated", "old", "obsolete", "kuzu", "graph", "database"]
     ↓ [bell curve collapse]
Results: All database docs, loses "deprecated" specificity
```

**CorticAI Solution**: Literal-first, semantic enrichment at specific stages
- Stage 1 (Parsing): Preserve user terms exactly
- Stage 2 (Filtering): Metadata-based (fast, deterministic)
- Stage 3 (Enrichment): Add semantic understanding
- Stage 4 (Ranking): Semantic scoring within filtered set
- Stage 5 (Presentation): Semantic assembly of answer

**Why This Matters**: User specificity is signal, not noise. If they avoided common terms, respect that choice.
::

### 2. Write-Time Investment

::insight{id="write-time-economics" importance="high"}
**Problem**: Query-time semantic work is expensive and repetitive

**Traditional RAG**:
- User query → embedding → search all docs → rank → present
- Every query: 100-500ms of semantic processing
- 1000 queries = 100-500 seconds of compute

**CorticAI**:
- Document ingestion: 15-30 seconds of enrichment (once)
- User query → filter by metadata → rank using pre-computed embeddings → present
- Every query: <100ms using pre-computed work
- 1000 queries = 100 seconds of compute

**ROI**: 30s investment × 1 document = 400s+ savings over 1000 queries
::

### 3. Q&A Generation as Access Paths

::insight{id="qa-as-projection" importance="high"}
**Problem**: Vocabulary mismatch between authors and users

**Example**:
- Author writes: "leverage memoization to optimize render performance"
- User searches: "make my React app faster"
- Traditional search: Miss (no word overlap)

**CorticAI Solution**: Generate Q&A at write-time
```markdown
# Original (preserved)
Use React.memo to leverage memoization for optimized render performance.

# Generated Q&A (access paths)
Q: How do I make my React app faster?
A: Use React.memo to optimize render performance... [cite]

Q: When should I use React.memo?
A: To leverage memoization for expensive components... [cite]

Q: What are React performance techniques?
A: Memoization via React.memo optimizes rendering... [cite]
```

**Result**: User's colloquial query matches generated Q&A, finds technical content with proper citation
::

### 4. Projections Over Summaries

::insight{id="projection-model" importance="high"}
**Problem**: "Summary" is ambiguous - could mean anything

**Two "Summaries" of Same Meeting**:

Version A (Decision-Preserving):
- Decision: Use SurrealDB (2025-10-13)
- Rationale: 3x performance improvement
- Quote: "Kuzu couldn't optimize our traversals" - Alice
- Outcome: 7/10 tasks deprecated

Version B (Theme-Blurring):
- Theme: Database migration
- Team discussed options
- Performance was considered
- Decision was made

**Issue**: Version A is reconstructable. Version B just says "something happened."

**CorticAI Solution**: One semantically-tagged source, multiple projections
```markdown
# CONTEXT.md (single source)
::decision{...}
::quote{...}
::outcome{...}

# Projections (derived on-demand)
- Decision view: extracts decisions + rationale
- Timeline view: chronological events
- Outcomes view: current state
- Rationale view: why decisions were made
```

**Benefit**: No duplication, no drift, explicit about what each view preserves
::

### 5. Lifecycle Over Time

::insight{id="lifecycle-states" importance="critical"}
**Problem**: Age is weak signal for document relevance

**Time-Based Decay** (Mem0, MemGPT approach):
```
Document age = 2 years → Relevance = 0.1 (assume obsolete)
Document age = 2 weeks → Relevance = 0.9 (assume current)
```

**Problem**: Architectural principles don't expire. Implementation plans do.

**CorticAI Lifecycle States** (semantic-based):
```
lifecycle: current    → Relevance = 1.0  (regardless of age)
lifecycle: stable     → Relevance = 0.9  (established patterns)
lifecycle: evolving   → Relevance = 0.85 (subject to change)
lifecycle: deprecated → Relevance = 0.3  (superseded)
lifecycle: historical → Relevance = 0.1  (context only)
lifecycle: archived   → Relevance = 0.05 (rarely relevant)
```

**Examples**:
- 2-year-old architectural principle: lifecycle=stable, relevance=0.9
- 2-week-old Kuzu planning: lifecycle=deprecated, relevance=0.3
- Age doesn't determine relevance, lifecycle does
::

---

## What Makes CorticAI Unique

::feature{uniqueness="high" competitive-advantage="yes"}
**1. Attention Gravity Management**

No other tool explicitly addresses the problem of historical documentation overwhelming current guidance.

**Competitors**: Delete old docs or rely on recency scoring
**CorticAI**: Hierarchical compression + lifecycle metadata + projection-based views
::

::feature{uniqueness="high" competitive-advantage="yes"}
**2. Literal-First Search**

No other tool preserves user query specificity as a design principle.

**Competitors**: "Helpful" semantic expansion (bell curve collapse)
**CorticAI**: Literal terms sacred, semantic enrichment at later stages
::

::feature{uniqueness="medium" competitive-advantage="yes"}
**3. Write-Time Q&A Generation**

Some RAG systems generate Q&A, but not as systematic access path strategy.

**Competitors**: Ad-hoc Q&A generation if at all
**CorticAI**: Systematic multi-vocabulary access path generation with lifecycle awareness
::

::feature{uniqueness="medium" competitive-advantage="yes"}
**4. Projection-Based Compression**

Novel approach to the "summary" problem.

**Competitors**: Static summaries (SUMMARY.md files)
**CorticAI**: Semantic blocks + on-demand projections with explicit preservation contracts
::

::feature{uniqueness="low" competitive-advantage="no"}
**5. Knowledge Graph**

Many systems use knowledge graphs.

**CorticAI Difference**: Graph explicitly models supersession, lifecycle, and attention weight - not just semantic similarity
::

---

## Design Constraints That Shaped CorticAI

::constraint{type="technical"}
**Constraint**: LLMs are bad at noticing every broken link, detecting subtle drift

**Implication**: Need continuous automated maintenance, not just human curation
**Solution**: Semantic maintenance service with scheduled checks
::

::constraint{type="user-experience"}
**Constraint**: Query-time latency must be <100ms for good UX

**Implication**: Can't do expensive semantic work on every query
**Solution**: Write-time enrichment, pre-computed embeddings, materialized views
::

::constraint{type="information-theory"}
**Constraint**: Compression must declare what it preserves/discards

**Implication**: Can't use ambiguous "summary" term
**Solution**: Projection types with explicit contracts (decision-view, timeline-view, etc.)
::

::constraint{type="cognitive"}
**Constraint**: Humans interpret document volume as authority signal

**Implication**: Can't just mark deprecated - must reduce attention surface area
**Solution**: Hierarchical compression with progressive disclosure
::

---

## Anti-Patterns We're Avoiding

::anti-pattern{name="conversational-memory-for-knowledge-work" learn-from="Mem0, MemGPT"}
**Their Success**: Excellent for chat context, user preferences
**Why Not For Us**: Knowledge networks aren't conversations
- Decisions don't fade over time
- Architecture doesn't become irrelevant because it's old
- Need explicit supersession, not recency-based decay
::

::anti-pattern{name="embedding-only-search" learn-from="traditional-RAG"}
**Their Assumption**: Semantic similarity solves retrieval
**Why Not For Us**:
- Expensive at scale (search 10,000+ docs per query)
- No lifecycle awareness (finds deprecated and current equally)
- No structured filtering (can't filter by metadata before embeddings)
::

::anti-pattern{name="query-rewriting" learn-from="modern-search-engines"}
**Their Goal**: "Help" users by expanding queries
**Why Not For Us**:
- Users choose specific terms intentionally
- Expansion causes bell curve collapse
- Loses prepositional and negation context
- "deprecated kuzu" becoming "database" is not helpful
::

---

## Validation Strategy

::validation{method="self-hosting"}
**The Ultimate Test**: Use CorticAI to manage CorticAI's own context network

**Test Scenarios**:
1. Fresh agent: "How should I implement graph storage?"
   - Expected: Recommends SurrealDB (current), not Kuzu (deprecated)
   - Validates: Attention gravity mitigation

2. Historical research: "Why did we move away from Kuzu?"
   - Expected: Finds supersession decision + full historical context
   - Validates: Non-lossy compression, progressive disclosure

3. Vocabulary mismatch: "make database queries faster"
   - Expected: Finds performance optimization docs despite different vocabulary
   - Validates: Q&A generation as access paths

4. Lifecycle awareness: Search results for "database"
   - Expected: Current approaches ranked first, deprecated de-emphasized
   - Validates: Lifecycle-based relevance
::

---

## Future Evolution

::roadmap{phase="near-term"}
**Next 3-6 Months**:
- Implement lifecycle metadata system
- Build projection engine for semantic blocks
- Deploy write-time Q&A generation
- Create staleness detection service
::

::roadmap{phase="mid-term"}
**6-12 Months**:
- Self-hosting validation (CorticAI managing its own context)
- Machine learning for lifecycle detection improvement
- Advanced contradiction resolution
- Provenance tracking and versioning
::

::roadmap{phase="long-term"}
**12+ Months**:
- Cross-project knowledge sharing
- Standardize semantic block vocabulary
- Open-source projection framework
- Contribute findings back to memory research community
::

---

## Related Documents

- [[attention-gravity-problem]] - Core problem this architecture solves
- [[semantic-pipeline-stages]] - How semantic operations are staged
- [[projection-based-compression]] - Novel approach to compression
- [[write-time-enrichment]] - Q&A generation and semantic ingestion
- [[semantic-maintenance]] - Continuous health monitoring

---

## References

**External Research**:
- `/context-network/research/llm-memory-pruning-strategies.md` - Survey of existing approaches
- Modern search engine degradation (Google query rewriting issues)
- RAG system architectures (embedding-only vs hybrid)

**Inspirations**:
- Human memory models (but adapted for knowledge work, not conversation)
- Operating system memory management (MemGPT's OS analogy)
- Structured compression (information theory)
- Progressive disclosure (UX pattern)

---

*Document created: 2025-10-28*
*Last updated: 2025-10-28*
*Lifecycle: current*
