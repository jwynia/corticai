# Projection-Based Compression

**Status**: Architectural Pattern
**Domain**: Information Architecture, Knowledge Management
**Related**: [[attention-gravity-problem]], [[write-time-enrichment]], [[semantic-pipeline-stages]]

---

## Overview

"Summary" is an ambiguous container term that could mean radically different compressions. Projection-based compression uses semantically-tagged source content that can be queried and projected in multiple ways, each preserving specific aspects of the original information.

::problem{id="summary-ambiguity" severity="medium"}
**Problem**: "Summary" doesn't declare what it preserves or discards

**Example Ambiguity**:
Two different "summaries" of the same meeting:

**Version A (Decision-Preserving)**:
- Decision: Use SurrealDB (date: 2025-10-13)
- Rationale: "Performance benchmarks showed 3x improvement"
- Quote: "Kuzu's query planner couldn't optimize our traversals" - Alice
- Outcome: Migration completed, 7/10 Kuzu tasks deprecated

**Version B (Theme-Blurring)**:
- Theme: Database migration
- Discussion involved multiple team members
- Performance was a consideration
- Decision was made to change databases

**Issue**: Version A is reconstructable. Version B just says "something happened". Both would be labeled "SUMMARY.md", but have radically different utility.
::

---

## The Projection Model

::principle{id="projection-over-summary" importance="critical"}
**Principle**: Maintain one semantically-tagged source that supports multiple projections, rather than creating multiple static "summary" files

**Architecture**:
```
Source Document (CONTEXT.md)
  ↓ [semantic tags: decision, outcome, quote, theme, timeline]
  ↓
Projections (derived on-demand):
├── Decision View     → Extracts ::decision blocks, rationale, evidence
├── Timeline View     → Extracts all dated events, chronological order
├── Outcomes View     → Extracts ::outcome blocks, current state
├── Rationale View    → Extracts why decisions were made
└── Theme View        → Extracts ::theme blocks, patterns identified
```

**Key Insight**: Projections are queries, not duplicates
::

---

## Semantic Block Types

::specification{component="semantic-blocks" version="1.0"}
**Core Block Types**:

### decision
Captures what was decided, why, and by whom
```markdown
::decision{id="switch-to-surrealdb" date="2025-10-13" status="final" replaces="kuzu-approach"}
**Decision**: Use SurrealDB instead of Kuzu

**Rationale**: Performance benchmarks showed 3x improvement on graph traversals

**Evidence**:
- [Benchmark results](archive/benchmarks/surrealdb-vs-kuzu.md)
- [Technical analysis](archive/research/query-performance.md)
::
```

### outcome
Captures what actually happened, current state
```markdown
::outcome{task-id="task-3" status="completed" date="2025-09-25" reusable="yes"}
**Built**: Database abstraction layer

Provides interface-based access to graph operations. Still useful with SurrealDB.
See: `src/storage/graph-adapter.ts`
::
```

### quote
Captures exact statements with attribution
```markdown
::quote{speaker="@alice" date="2025-10-10" context="performance-investigation" significance="high"}
"Kuzu's query planner couldn't optimize our graph traversals - we're seeing 300ms latency on simple paths"
::
```

### theme
Captures patterns or recurring topics
```markdown
::theme{category="performance" severity="high" applies-to="database-selection"}
Graph traversal performance is critical for user experience. Sub-100ms response time required.
::
```

### timeline
Captures significant events
```markdown
::timeline{date="2025-10-13" event-type="pivot" significance="high"}
**Pivot from Kuzu to SurrealDB**

Completed 7/10 tasks before discovering performance limitations. Migration strategy created.
::
```

### evidence
Captures supporting data, measurements, benchmarks
```markdown
::evidence{type="benchmark" date="2025-10-12" supports="switch-to-surrealdb"}
**SurrealDB vs Kuzu Performance**

Graph traversal (1000 nodes):
- Kuzu: 300ms average
- SurrealDB: 95ms average
- Improvement: 3.16x

[Full benchmark data](./benchmarks/comparison-2025-10-12.csv)
::
```
::

---

## Projection Queries

::implementation{component="projection-engine"}
**Component**: Transforms semantically-tagged source into specific views

### Decision Projection
Extracts decisions with their rationale and evidence

```typescript
function projectDecisions(context: SemanticContext): DecisionView {
  return context
    .filterBlocks('decision')
    .sortBy('date', 'desc')
    .withContext([
      'rationale',   // Why was this decided
      'evidence',    // What supports this
      'quote'        // Who said what
    ])
    .format('decision-view')
}
```

**Output Example**:
```markdown
# Decisions

## Switch to SurrealDB (2025-10-13) [CURRENT]
**Replaces**: Kuzu implementation plan

**Rationale**: Performance benchmarks showed 3x improvement. Kuzu's query planner
couldn't optimize our graph traversal patterns.

**Evidence**:
- Benchmark showing 300ms → 95ms improvement
- Technical analysis of query planner differences

**Context**:
> "Kuzu's query planner couldn't optimize our graph traversals" - Alice, 2025-10-10

**Related**: [Migration Plan](../surrealdb-migration/), [Benchmark Data](./benchmarks/)
```

### Timeline Projection
Extracts chronological sequence of events

```typescript
function projectTimeline(context: SemanticContext): TimelineView {
  return context
    .filterBlocks('*')              // All block types
    .where('date', 'exists')        // That have dates
    .sortBy('date', 'asc')          // Chronological order
    .format('timeline-view')
}
```

**Output Example**:
```markdown
# Timeline

## 2025-09-15: Kuzu Planning Initiated
Started design work for graph storage using Kuzu database.

## 2025-09-25: Abstraction Layer Complete
Built database abstraction layer (task-3). Interface remains useful for SurrealDB.

## 2025-10-10: Performance Issues Identified
> "We're seeing 300ms latency on simple paths" - Alice

## 2025-10-13: **PIVOT** - Switch to SurrealDB
Decision made to migrate due to performance issues. 7/10 tasks completed for Kuzu.
```

### Outcomes Projection
Extracts what currently exists

```typescript
function projectOutcomes(context: SemanticContext): OutcomesView {
  return context
    .filterBlocks('outcome')
    .groupBy('status')  // completed, abandoned, in-progress
    .withContext(['decision'])  // Why this outcome
    .format('outcomes-view')
}
```

**Output Example**:
```markdown
# Outcomes

## Completed & Reusable
- **Database abstraction layer** (task-3) - Interface-based access, works with SurrealDB
- **Query builder** (task-5) - Generic query construction

## Completed & Deprecated
- **Kuzu connection pool** (task-4) - Specific to Kuzu, no longer needed

## Abandoned
- **Kuzu-specific optimizations** (tasks 8-10) - Superseded by SurrealDB switch
- **Kuzu schema migrations** (task-6) - Not applicable to SurrealDB
```

### Rationale Projection
Extracts why decisions were made

```typescript
function projectRationale(context: SemanticContext): RationaleView {
  return context
    .filterBlocks('decision')
    .select('rationale', 'evidence')
    .withContext(['theme', 'quote'])  // Supporting context
    .format('rationale-view')
}
```

**Output Example**:
```markdown
# Decision Rationale

## Why SurrealDB over Kuzu?

**Performance Requirements**:
Theme: Graph traversal performance is critical for user experience

**Measurements**:
Evidence: Kuzu showed 300ms latency, SurrealDB achieved 95ms (3x improvement)

**Technical Analysis**:
Quote: "Kuzu's query planner couldn't optimize our graph traversals" - Alice

**Conclusion**: Performance requirements not achievable with Kuzu's architecture
```
::

---

## Hierarchical Compression

::pattern{name="layered-disclosure" benefit="reduces-attention-gravity"}
**Pattern**: Information organized in layers of increasing detail

```
Directory: /planning/kuzu-graph-operations/

├── _CURRENT-STATUS.md        [10 lines]  ← MOST PROMINENT
│   "⚠️ DEPRECATED: See SurrealDB migration"
│
├── CONTEXT.md                [150 lines] ← SEMANTIC SOURCE
│   Semantic blocks: decisions, outcomes, timeline, quotes
│
├── README.md                 [50 lines]  ← NAVIGATION
│   Links to status + projections + archive
│
├── projections/              [generated on-demand]
│   ├── decisions.md
│   ├── timeline.md
│   ├── outcomes.md
│   └── rationale.md
│
└── archive/                  [full detail]
    ├── problem-definition.md
    ├── research-findings.md
    ├── architecture-design.md
    └── ...
```

**Progressive Disclosure**:
1. Status (10 lines) → Know immediately if relevant
2. Context (150 lines) → Structured understanding
3. Projections (50 lines each) → Specific angles
4. Archive (unlimited) → Full historical detail

**Attention Management**: Each layer requires deliberate navigation. Fresh agents see status first, must actively choose to dive deeper.
::

---

## Compression Contracts

::principle{id="compression-contracts" importance="high"}
**Principle**: Each compression type declares what it preserves and what it discards

**Format**:
```markdown
---
compression-type: decision-extraction
preserves: [decisions, rationale, evidence, outcomes]
discards: [discussion-process, alternatives-considered, meeting-dynamics]
reconstructable: yes  # Can remake decisions from this info
source: CONTEXT.md
---
```

**Benefits**:
- Reader knows what they're getting
- Multiple compressions can coexist
- Can generate new projections without changing source
- Explicit about information loss
::

---

## Anti-Patterns

::anti-pattern{name="static-summaries" why-fails="duplication-and-drift"}
**Bad Practice**: Create multiple static summary files

```
❌ DON'T CREATE THESE:
├── SUMMARY.md
├── DECISIONS.md
├── TIMELINE.md
├── OUTCOMES.md
└── THEMES.md
```

**Why It Fails**:
- Each file duplicates information
- Changes to one require updating all others
- Files drift over time (some updated, others stale)
- Ambiguous which is "source of truth"
- No guarantee summaries stay consistent

**Correct Approach**: One CONTEXT.md with semantic tags, generate projections on-demand
::

::anti-pattern{name="ambiguous-summary" why-fails="unknown-utility"}
**Bad Practice**: Create generic "SUMMARY.md" without declaring what it contains

```markdown
❌ SUMMARY.md (ambiguous)

The team discussed database options and decided to change approaches.
Performance was important. We're now using a different database.
```

**Why It Fails**:
- Can't tell if this has decision details or just themes
- No way to know if rationale is preserved
- Can't reconstruct decision from this
- Might miss critical details

**Correct Approach**: Semantic blocks make content type explicit
::

---

## Lens Integration

::implementation{component="projection-lens"}
Lenses can automatically apply appropriate projections

```typescript
class DecisionLens extends ContextLens {
  transformQuery(query: Query): Query {
    return query
      .projectBlocks(['decision'])           // Decision blocks only
      .withContext(['rationale', 'evidence']) // Include supporting info
      .orderBy('significance', 'desc')
  }
}

class TimelineLens extends ContextLens {
  transformQuery(query: Query): Query {
    return query
      .projectBlocks(['*'])         // All block types
      .where('date', 'exists')      // With dates
      .orderBy('date', 'asc')       // Chronological
      .format('timeline-view')
  }
}

class CurrentStateLens extends ContextLens {
  transformQuery(query: Query): Query {
    return query
      .projectBlocks(['decision', 'outcome'])
      .where('status', ['final', 'completed'])
      .where('lifecycle', ['current', 'stable'])
  }
}
```

**Usage**:
```typescript
// User asks: "What database should I use?"
// DecisionLens activates, projects decision blocks from CONTEXT.md

// User asks: "How did we get here?"
// TimelineLens activates, projects timeline view

// User asks: "What currently exists?"
// CurrentStateLens activates, projects current outcomes
```
::

---

## Implementation in CorticAI

::implementation{component="semantic-adapter"}
**Domain Adapter Enhancement**

```typescript
class SemanticContextAdapter extends UniversalFallbackAdapter {
  extract(content: string): Entity[] {
    const semanticBlocks = this.parseSemanticBlocks(content)

    return semanticBlocks.map(block => ({
      type: block.tagName,  // 'decision', 'outcome', etc.
      content: block.content,
      metadata: {
        ...block.attributes,
        blockType: block.tagName,
        projectable: true
      },
      relationships: this.inferRelationships(block)
    }))
  }
}
```

**Projection Engine**

```typescript
class ProjectionEngine {
  project(source: Document, projectionType: string): Projection {
    const blocks = this.extractSemanticBlocks(source)
    const filtered = this.filterByType(blocks, projectionType)
    const enriched = this.addContext(filtered, source)
    const formatted = this.format(enriched, projectionType)

    return {
      type: projectionType,
      content: formatted,
      source: source.id,
      generatedAt: Date.now(),
      contract: this.getCompressionContract(projectionType)
    }
  }

  getCompressionContract(type: string): CompressionContract {
    const contracts = {
      'decision': {
        preserves: ['decisions', 'rationale', 'evidence'],
        discards: ['discussion-process', 'alternatives'],
        reconstructable: true
      },
      'timeline': {
        preserves: ['chronology', 'key-events', 'dates'],
        discards: ['detailed-rationale', 'full-content'],
        reconstructable: false
      },
      // ...
    }
    return contracts[type]
  }
}
```
::

---

## Storage Architecture

::implementation{component="dual-role-storage"}
**Primary Storage (Graph DB)**:
- Store CONTEXT.md with semantic blocks as typed nodes
- Each semantic block = node with attributes
- Relationships: REPLACES, MOTIVATES, SUPPORTS, etc.

**Semantic Storage (Analytics DB)**:
```sql
-- Materialized projection views
CREATE VIEW decision_projections AS
  SELECT
    block.id,
    block.content as decision,
    rationale.content as rationale,
    array_agg(evidence.content) as supporting_evidence
  FROM semantic_blocks block
  LEFT JOIN semantic_blocks rationale
    ON rationale.parent = block.id AND rationale.type = 'rationale'
  LEFT JOIN semantic_blocks evidence
    ON evidence.relates_to = block.id AND evidence.type = 'evidence'
  WHERE block.type = 'decision'
  GROUP BY block.id;
```

**Benefits**:
- Projections pre-computed for fast access
- Graph traversal for relationship exploration
- Full-text search on individual block types
::

---

## Migration from Markdown Files

::strategy{phase="migration" priority="medium"}
**From**: Plain markdown files with unstructured content
**To**: Semantically-tagged CONTEXT.md files

**Approach**:

1. **Automated Extraction** (80% accuracy):
   ```typescript
   async function migrateToSemanticBlocks(markdownFile: string): Promise<string> {
     // Use LLM to identify semantic structure
     const analysis = await llm.analyze({
       content: markdownFile,
       task: "Extract decisions, outcomes, quotes, themes, timeline events"
     })

     // Generate semantic block syntax
     return generateContextMd(analysis)
   }
   ```

2. **Manual Review** (20% edge cases):
   - Review extracted blocks
   - Verify relationships
   - Add missing metadata

3. **Preserve Original** (non-destructive):
   - Move original to `archive/original.md`
   - Link from new CONTEXT.md

**Priority**:
- High: Planning directories (attention gravity risk)
- Medium: Architecture docs (referenced frequently)
- Low: Historical research (already archived)
::

---

## Validation

::testing{component="projection-system"}
**Test Cases**:

1. **Consistency**: All projections from same source must be consistent
2. **Completeness**: Projecting all types should cover all semantic blocks
3. **Contract Adherence**: Each projection preserves exactly what contract declares
4. **Performance**: Projection generation <50ms for typical document
5. **Reconstruction**: Decision projection enables reconstructing decision without full doc

**Metrics**:
- Projection generation time
- Cache hit rate (pre-computed projections)
- User satisfaction (are projections useful?)
- Attention gravity reduction (fresh agents find current guidance)
::

---

## Related Documents

- [[attention-gravity-problem]] - Why compression matters for attention management
- [[semantic-pipeline-stages]] - How projections integrate into query pipeline
- [[write-time-enrichment]] - Generating semantic blocks during ingestion
- [[semantic-maintenance]] - Detecting inconsistencies between source and projections

---

*Document created: 2025-10-28*
*Last updated: 2025-10-28*
*Lifecycle: current*
