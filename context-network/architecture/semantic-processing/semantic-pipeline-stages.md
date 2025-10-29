# Semantic Processing Pipeline Stages

**Status**: Architectural Specification
**Domain**: Information Retrieval, Semantic Processing
**Related**: [[attention-gravity-problem]], [[write-time-enrichment]], [[design-rationale]]

---

## Overview

Semantic operations (embeddings, similarity, inference, relationship detection) are powerful but must be applied at the correct stages of information processing. Applying them at the wrong stage leads to precision loss, bell-curve collapse, and attention gravity problems.

::principle{id="semantic-stage-placement" importance="critical"}
**Principle**: Semantic understanding for **enrichment and connection**, not for **rewriting and collapsing**

**Corollary**: User intent must be preserved through literal parsing. Semantic operations enhance filtered results, they don't transform queries.
::

---

## The Five-Stage Pipeline

```
[1. Query Parsing]     ← Preserve user intent (literal)
       ↓
[2. Structural Filter] ← Fast, deterministic (metadata/schema)
       ↓
[3. Semantic Enrich]   ← Add understanding (relationships, context)
       ↓
[4. Semantic Rank]     ← Order by relevance (within filtered set)
       ↓
[5. Semantic Present]  ← Assemble coherent answer (context, related)
```

---

## Stage 1: Query Parsing

::stage{name="query-parsing" semantic-role="preserve-intent"}
**Purpose**: Understand user intent without transforming it

**Semantic Operations**:
- ✅ **Intent classification** - Detect question type (what/why/how/status)
- ✅ **Negation detection** - Identify "not", "don't", "avoid" in context
- ✅ **Preposition extraction** - Capture directionality (FROM X TO Y)
- ❌ **NO query rewriting** - Keep user's exact terms
- ❌ **NO synonym expansion** - User chose specific words intentionally
- ❌ **NO "helpful" corrections** - If user avoids common terms, respect that

**Output**:
```typescript
{
  literalTerms: ["deprecated", "kuzu"],      // Exact user terms
  negations: [],                             // No negation detected
  prepositions: [],                          // No directional query
  impliedIntent: "find-deprecated-info",     // Classified but not applied yet
  queryType: "what-status"                   // Question classification
}
```

**Why This Matters**: Modern search engines fail by "correcting" specific queries to generic ones. User specificity is signal, not noise.
::

---

## Stage 2: Structural Filtering

::stage{name="structural-filtering" semantic-role="schema-based"}
**Purpose**: Fast, deterministic filtering using explicit metadata

**Operations**:
- ✅ **Literal text matching** - grep-style exact match
- ✅ **Metadata filtering** - lifecycle, type, status, date
- ✅ **Schema-based filtering** - document type, domain, component
- ✅ **Relationship traversal** - graph queries on explicit relationships
- ❌ **NO semantic similarity** - Too slow for initial filter
- ❌ **NO embedding search** - Not yet, comes later

**Example**:
```typescript
const candidates = storage
  .literalMatch(["deprecated", "kuzu"])           // Fast text search
  .where({ lifecycle: ['deprecated', 'historical'] })  // Metadata filter
  .where({ domain: 'graph-storage' })             // Schema filter
  .limit(100)                                     // Reasonable candidate set
```

**Why This Matters**: Structural filtering is fast (indexes) and deterministic (no ML uncertainty). Get to ~100 candidates before expensive semantic operations.
::

---

## Stage 3: Semantic Enrichment

::stage{name="semantic-enrichment" semantic-role="add-understanding"}
**Purpose**: Add semantic understanding to filtered candidates without changing query

**Operations**:
- ✅ **Infer implicit relationships** - "This mentions X, which supersedes Y"
- ✅ **Extract semantic context** - What else happened around this date?
- ✅ **Detect polarity** - Is this advocating or opposing the subject?
- ✅ **Build supersession chains** - Walk REPLACES relationships
- ✅ **Identify related concepts** - What other topics are connected?
- ✅ **Compute relevance factors** - How well does this match intent?

**Example**:
```typescript
const enriched = candidates.map(doc => ({
  doc,
  semanticContext: {
    polarityToSubject: analyzePol

arity(doc, "kuzu"),  // negative
    supersessionChain: graph.traverse(doc, 'SUPERSEDED_BY'),
    temporalContext: graph.neighbors(doc, dateRange(±7days)),
    relatedDecisions: findRelatedDecisions(doc),
    topicClusters: identifyTopics(doc)
  },
  relevanceFactors: {
    matchesIntent: scoreIntentMatch(doc, query.impliedIntent),
    hasEvidence: hasLinkedEvidence(doc),
    authorityScore: computeAuthority(doc.lifecycle, doc.type)
  }
}))
```

**Why This Matters**: Expensive semantic work done once per candidate (not per query). Adds understanding without changing what was found.
::

---

## Stage 4: Semantic Ranking

::stage{name="semantic-ranking" semantic-role="order-results"}
**Purpose**: Order filtered, enriched results by relevance using semantic understanding

**Operations**:
- ✅ **Embedding similarity** - How semantically similar to query?
- ✅ **Intent alignment** - Does this answer the question type?
- ✅ **Polarity alignment** - User seeking negative mentions? Boost negative polarity docs
- ✅ **Authority scoring** - Lifecycle + evidence + confidence
- ✅ **Recency weighting** - Within same lifecycle, prefer recent
- ✅ **Graph centrality** - How connected is this in knowledge graph?

**Scoring Function**:
```typescript
function computeRelevanceScore(enriched: EnrichedDoc, query: ParsedQuery): number {
  const scores = {
    // Semantic similarity (expensive, computed once)
    embeddingSimilarity: cosineSimilarity(enriched.doc.embedding, query.embedding) * 0.3,

    // Intent alignment (from enrichment stage)
    intentMatch: enriched.relevanceFactors.matchesIntent * 0.25,

    // Polarity alignment (if query has polarity)
    polarityMatch: alignPolarity(enriched.semanticContext.polarityToSubject, query) * 0.15,

    // Authority (lifecycle + evidence)
    authority: enriched.relevanceFactors.authorityScore * 0.2,

    // Graph centrality (how connected)
    centrality: computeCentrality(enriched.doc, graph) * 0.1
  }

  return Object.values(scores).reduce((a, b) => a + b, 0)
}
```

**Why This Matters**: Semantic ranking is applied to a small, filtered set (~100 docs), making it fast. Multiple semantic signals combine for relevance.
::

---

## Stage 5: Semantic Presentation

::stage{name="semantic-presentation" semantic-role="assemble-answer"}
**Purpose**: Use semantic understanding to build coherent, contextualized answer

**Operations**:
- ✅ **Extract relevant blocks** - Pull decision/rationale/evidence blocks
- ✅ **Assemble context chain** - "X superseded Y because..."
- ✅ **Find related content** - "See also: related decisions"
- ✅ **Generate summary** - Condense multiple sources coherently
- ✅ **Add navigation hints** - "For historical context, see..."
- ✅ **Suggest next questions** - "You might also want to know..."

**Example Output**:
```markdown
## What database should I use for graph storage?

**Answer**: Use SurrealDB (current approach as of 2025-10-13)

**Context**: This replaces the previous Kuzu implementation plan, which was
superseded due to performance issues (300ms latency on graph traversals).

**Evidence**:
- [SurrealDB Migration Plan](/planning/surrealdb-migration/) (lifecycle: current)
- [Performance Benchmarks](/research/surrealdb-benchmarks/) showing 3x improvement
- [Team Decision](/meetings/2025-10-13-team-sync/) from 2025-10-13

**Historical Context**:
Original Kuzu planning completed 7/10 tasks before pivot. The abstraction layer
built during Kuzu work remains useful. See [Kuzu Planning Archive](/planning/kuzu-graph-operations/archive/)
for historical rationale.

**Related**:
- [Graph Storage Architecture](/architecture/graph-storage/)
- [Query Performance Requirements](/concepts/performance-requirements/)

**You might also want to know**:
- How to migrate existing Kuzu code to SurrealDB?
- What performance improvements can I expect?
- What tasks from Kuzu planning are still relevant?
```

**Why This Matters**: Semantic assembly provides complete, navigable answer with proper citations and lifecycle context. User gets both answer and understanding.
::

---

## Anti-Patterns: Where Semantics Fail

::anti-pattern{name="query-time-expansion" stage="parsing" why-fails="precision-loss"}
**Bad Practice**: Expand user query terms with synonyms

```typescript
// ❌ DON'T DO THIS
userQuery: "deprecated kuzu"
expandedQuery: ["deprecated", "obsolete", "old", "superseded", "kuzu", "graph-db"]
// Result: Finds all graph database docs, loses "deprecated" specificity
```

**Why It Fails**:
- User chose "deprecated" specifically, not "old"
- Synonym expansion creates bell-curve collapse
- Loses prepositional and negation context
- Returns too many irrelevant results

**Correct Approach**: Keep literal terms, use semantic understanding at ranking stage
::

::anti-pattern{name="embedding-only-search" stage="filtering" why-fails="slow-and-imprecise"}
**Bad Practice**: Use embedding similarity for initial filtering

```typescript
// ❌ DON'T DO THIS
const results = await embeddingSearch(query, allDocuments)  // 10,000+ docs
// Computes similarity for every document, very slow
```

**Why It Fails**:
- Embedding search over all docs is expensive
- No structural filtering (finds semantically similar but wrong lifecycle)
- Can't filter by explicit metadata
- False positives from semantic similarity

**Correct Approach**: Structural filter first (reduce to ~100 docs), then use embeddings for ranking
::

::anti-pattern{name="semantic-only-relationships" stage="enrichment" why-fails="missing-explicit-links"}
**Bad Practice**: Rely only on inferred semantic relationships, ignore explicit links

```typescript
// ❌ DON'T DO THIS
const related = await findSemanticallyRelated(doc)  // Embedding similarity
// Ignores explicit SUPERSEDES, REPLACES relationships in metadata
```

**Why It Fails**:
- Explicit relationships are more reliable
- Semantic similarity can be coincidental
- Loses human-curated connections
- Doesn't respect lifecycle supersession

**Correct Approach**: Explicit relationships first, semantic similarity as supplement
::

---

## Write-Time vs Query-Time Semantics

::principle{id="write-time-semantic-work" importance="critical"}
**Principle**: Do expensive semantic work once at write-time, not repeatedly at query-time

**Write-Time Operations** (expensive, run once):
- Extract semantic structure from unstructured text
- Compute embeddings for all content
- Infer implicit relationships
- Detect lifecycle signals
- Build knowledge graph
- Generate Q&A projections
- Pre-compute topic clusters

**Query-Time Operations** (cheap, run often):
- Traverse pre-built graph
- Filter by pre-computed metadata
- Rank using pre-computed embeddings
- Assemble from extracted structure

**Performance Impact**:
- Write-Time: 10-30 seconds per document (acceptable, happens once)
- Query-Time: <100ms per query (required for good UX)
::

---

## Implementation in CorticAI

::implementation{component="context-pipeline"}
**Component**: `ContextPipeline` class

**Responsibilities**:
1. Parse queries without expansion (Stage 1)
2. Apply structural filters using metadata (Stage 2)
3. Enrich with pre-computed semantics (Stage 3)
4. Rank using semantic scoring (Stage 4)
5. Present with context assembly (Stage 5)

**Key Methods**:
```typescript
class ContextPipeline {
  parseQuery(raw: string): ParsedQuery           // Stage 1
  applyStructuralFilters(query): Document[]      // Stage 2
  enrichWithSemantics(docs): EnrichedDocument[]  // Stage 3
  rankResults(enriched, query): RankedResult[]   // Stage 4
  presentResults(ranked, query): SearchResponse  // Stage 5
}
```

**Integration Points**:
- Lens System: Applies filters at Stage 2
- Domain Adapters: Provide semantic structure at ingestion (write-time)
- Continuity Cortex: Monitors for staleness (maintenance)
- Dual-Role Storage: Graph for relationships, analytics for search
::

---

## Validation Criteria

A correctly implemented pipeline should:

1. ✅ **Preserve user specificity** - "deprecated kuzu" doesn't become "database"
2. ✅ **Respect negation** - "don't use X" doesn't return "use X" docs
3. ✅ **Filter before semantic ops** - <100 candidates before expensive work
4. ✅ **Use explicit metadata** - Lifecycle filtering is deterministic
5. ✅ **Infer relationships correctly** - Supersession chains are accurate
6. ✅ **Rank by multiple signals** - Not just embedding similarity
7. ✅ **Provide context** - Answer includes why/when/related

**Test Cases**:
- Query: "deprecated kuzu" → Should find deprecation notices, not usage guides
- Query: "current database approach" → Should find SurrealDB, filter Kuzu
- Query: "why did we switch from kuzu" → Should find decision + rationale
- Query: "graph storage performance" → Should include benchmarks + lifecycle context

---

## Related Documents

- [[attention-gravity-problem]] - Why pipeline stages matter for attention management
- [[write-time-enrichment]] - Semantic operations during ingestion
- [[semantic-maintenance]] - Continuous semantic health monitoring
- [[design-rationale]] - Why not follow traditional semantic search patterns

---

## References

**Codebase**:
- `/app/src/context/lenses/` - Lens system (Stage 2 filtering)
- `/app/src/storage/` - Dual-role storage architecture
- `/app/src/context/adapters/` - Domain adapters (write-time semantics)

**Research**:
- Modern search engine degradation (query rewriting failures)
- RAG systems (embedding-only vs hybrid approaches)
- Knowledge graph traversal (explicit vs inferred relationships)

---

*Document created: 2025-10-28*
*Last updated: 2025-10-28*
*Lifecycle: current*
