# The Attention Gravity Problem

**Status**: Architectural Concern
**Severity**: High
**Domain**: Context Management, Information Architecture
**Related**: [[semantic-pipeline-stages]], [[projection-based-compression]]

---

## Overview

The "attention gravity problem" occurs when historical documentation creates gravitational wells that pull LLM attention toward superseded approaches, even after explicit pivots or deprecations. The volume and detail of historical documentation overwhelms current guidance through sheer surface area.

::problem{id="attention-gravity" severity="high" domain="context-management"}
**Problem**: Historical decisions and planning create "attention gravity wells" that pull LLMs back to superseded approaches despite explicit deprecation markers.

**Root Cause**:
- Volume bias: 10 detailed docs for deprecated approach vs 2 for current
- Surface area: More links, more detail = more discoverable
- Search neutrality: grep finds "don't use X" when searching for "X"
- Cognitive pattern: Extensive documentation implies current/important

**Impact**: Fresh agents implement deprecated approaches, reference outdated patterns, miss current guidance
::

---

## Real Example: Kuzu → SurrealDB Migration

::example{scenario="kuzu-surrealdb-pivot" component="graph-storage" date="2025-10-13"}
**Scenario**: Database technology pivot mid-implementation

**Timeline**:
- 2025-09-15: Kuzu planning initiated
- 2025-09-20: Tasks 1-3 completed (abstraction layer)
- 2025-10-01: Tasks 4-7 completed
- 2025-10-10: Performance issues discovered (300ms latency)
- 2025-10-13: **Pivot to SurrealDB**
- Status: 7/10 Kuzu tasks complete, 3 abandoned

**Gravity Well Created**:
```
/planning/kuzu-graph-operations/
├── README.md (detailed)
├── problem-definition.md
├── research-findings.md
├── architecture-design.md
├── task-breakdown.md (7 completed tasks documented)
├── risk-assessment.md
└── readiness-checklist.md

/research/surrealdb-alternative-2025-10-13/
├── overview.md
└── comparison-matrix.md
```

**Attention Imbalance**: 7 detailed Kuzu docs vs 2 SurrealDB docs

**Observed Behavior**: Fresh agent searching "graph database implementation" finds Kuzu planning first due to:
- More documents (more grep matches)
- More detail (longer documents)
- More internal links (higher reference count)
- Task completion evidence (looks "validated")

**Result**: Agent may implement deprecated Kuzu approach without realizing pivot occurred
::

---

## Why Traditional Mitigation Doesn't Work

::anti-pattern{name="delete-history" why-fails="information-loss"}
**Approach**: Delete superseded documentation

**Why It Fails**:
- Loses decision rationale ("why did we pivot?")
- Loses lessons learned
- Loses completed work that may still be relevant
- Non-recoverable information loss
::

::anti-pattern{name="deprecation-markers" why-fails="still-discoverable"}
**Approach**: Add "DEPRECATED" warnings to documents

**Why It Fails**:
- grep for "kuzu" still finds deprecated docs
- Volume still creates attention bias
- Warning may be missed in detailed document
- Doesn't change discoverability ranking
::

::anti-pattern{name="query-rewriting" why-fails="bell-curve-collapse"}
**Approach**: Semantic query expansion to find "current" content

**Why It Fails**:
- Rewrites specific terms to generic ones
- "deprecated kuzu" → "database" (loses specificity)
- Synonym collapse: all approaches become equivalent
- User intentionally avoiding common terms gets pulled back
::

---

## Manifestation Patterns

::pattern{name="library-pivot" frequency="common"}
**Pattern**: Team chooses library A, completes 50-70% of implementation, discovers critical issue, pivots to library B

**Gravity Risk**: High
**Why**: Incomplete work generates significant documentation volume (planning, design, partial implementation, troubleshooting)

**Example Keywords**: "switch from", "migrate to", "deprecate", "superseded by"
::

::pattern{name="architecture-refactor" frequency="moderate"}
**Pattern**: Architectural approach deemed insufficient, redesigned mid-project

**Gravity Risk**: Very High
**Why**: Architecture docs are detailed, referenced frequently, appear authoritative

**Example**: Monolith → microservices, REST → GraphQL, synchronous → event-driven
::

::pattern{name="false-start" frequency="common"}
**Pattern**: Initial approach fails quickly, restarted with different strategy

**Gravity Risk**: Low-Medium
**Why**: Less documentation generated before pivot

**Mitigation**: Easier to archive since minimal investment
::

---

## The Search Problem

::problem{id="semantic-search-ambiguity" related="attention-gravity"}
**Problem**: Traditional search cannot distinguish between advocacy and opposition for the same term

**Examples**:
- grep "use Kuzu" matches both "use Kuzu" and "don't use Kuzu"
- grep "X is good" matches "X is not good"
- Search ranking can't detect negation context

**Current Workarounds**:
- Manual curation of search results
- Explicit lifecycle metadata filtering
- Structured supersession chains

**Ideal Solution**: Semantic understanding of polarity (positive/negative mention) without query-time term expansion
::

---

## Psychological Factors

::insight{category="cognitive-bias"}
**Volume = Authority Bias**

Humans and LLMs both interpret documentation volume as signal of importance/correctness. 10 detailed documents feel more authoritative than 2 brief ones, regardless of lifecycle status.

**Implication**: Compression and de-emphasis are necessary, not just deprecation markers
::

::insight{category="cognitive-bias"}
**Completion = Validation Bias**

Completed tasks documented in deprecated planning create false signal of "this worked, this was validated". Even if superseded, completion status implies success.

**Implication**: Completion status needs lifecycle context ("completed but superseded")
::

---

## Solution Requirements

Based on observed patterns, effective solutions must:

1. **Preserve Information** (non-lossy)
   - Full details remain accessible
   - Decision rationale preserved
   - Historical context available

2. **Reduce Attention Surface Area**
   - Compressed summaries more prominent than details
   - Search de-ranks deprecated content
   - Discovery paths favor current approaches

3. **Semantic Awareness Without Expansion**
   - Understand negation/opposition
   - Detect supersession patterns
   - Avoid query-time term expansion

4. **Explicit Lifecycle States**
   - current, stable, evolving, deprecated, historical, archived
   - Metadata-first filtering
   - Time-independent relevance

5. **Progressive Disclosure**
   - Current guidance immediate
   - Historical context requires deliberate navigation
   - "Why changed" accessible but not prominent

---

## Related Concepts

- [[semantic-pipeline-stages]] - Where to apply semantic operations to avoid exacerbating gravity
- [[projection-based-compression]] - How to reduce surface area without information loss
- [[write-time-enrichment]] - Building better access paths at ingestion time
- [[semantic-maintenance]] - Detecting and mitigating gravity wells automatically

---

## References

**Codebase Examples**:
- `/context-network/planning/kuzu-graph-operations/` - Active gravity well
- `/context-network/research/surrealdb-alternative-2025-10-13/` - Replacement approach with less surface area

**External Research**:
- `/context-network/research/llm-memory-pruning-strategies.md` - Memory management patterns (time-based vs semantic-based decay)

**Related ADRs**:
- ADR-XXX: Semantic Operations Placement in Processing Pipeline
- ADR-XXX: Lifecycle Metadata Schema

---

*Document created: 2025-10-28*
*Last updated: 2025-10-28*
*Lifecycle: current*
