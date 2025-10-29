# ADR: Semantic Operations Placement in Processing Pipeline

**Status**: Proposed
**Date**: 2025-10-28
**Deciders**: Architecture Team
**Related**: [[../architecture/semantic-processing/]], [[adr_004_cosmos_db_dual_role_storage.md]]

---

## Context

CorticAI must determine where semantic operations (embeddings, similarity scoring, relationship inference, lifecycle detection) should occur in the information processing pipeline to avoid "bell curve collapse" while still leveraging semantic understanding.

### Problem Statement

Modern search engines and RAG systems have degraded in precision due to aggressive query-time semantic expansion:
- User searches "deprecated kuzu" (specific intent)
- System expands to ["deprecated", "old", "obsolete", "superseded", "kuzu", "database", "graph"]
- Results include all database docs, losing the "deprecated" specificity
- User's deliberate choice of specific terms is ignored

This "bell curve collapse" happens when semantic operations transform specific queries into generic ones, assuming users under-specify when they're actually being precise.

### Requirements

1. **Preserve user query specificity** - Don't rewrite "deprecated kuzu" into "database"
2. **Enable semantic understanding** - Still leverage embeddings, similarity, relationships
3. **Performance** - Query-time latency must be <100ms
4. **Accuracy** - Lifecycle-aware results (current docs before deprecated)
5. **Maintainability** - Clear architectural boundaries

---

## Decision

Apply semantic operations at specific stages of a 5-stage pipeline:

```
Stage 1: Query Parsing        → Preserve user intent (literal)
Stage 2: Structural Filtering → Fast, deterministic (metadata/schema)
Stage 3: Semantic Enrichment  → Add understanding (relationships, context)
Stage 4: Semantic Ranking     → Order by relevance (within filtered set)
Stage 5: Semantic Presentation → Assemble coherent answer (context, related)
```

### Stage-Specific Rules

**Stage 1: Query Parsing** (Literal Preservation)
- ✅ DO: Intent classification, negation detection, preposition extraction
- ❌ DON'T: Query rewriting, synonym expansion, "helpful" corrections

**Stage 2: Structural Filtering** (Metadata-First)
- ✅ DO: Literal text matching, metadata filtering, schema-based filtering
- ❌ DON'T: Semantic similarity, embedding search (too slow for initial filter)

**Stage 3: Semantic Enrichment** (Add Understanding)
- ✅ DO: Infer implicit relationships, extract semantic context, detect polarity
- ❌ DON'T: Change what was found, only add understanding

**Stage 4: Semantic Ranking** (Order Results)
- ✅ DO: Embedding similarity, intent alignment, polarity alignment, authority scoring
- ❌ DON'T: Filter out results (that's Stage 2's job)

**Stage 5: Semantic Presentation** (Assemble Answer)
- ✅ DO: Extract relevant blocks, assemble context chains, suggest related content
- ❌ DON'T: Change the answer, only organize and contextualize

### Write-Time vs Query-Time

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

---

## Rationale

### Why Literal-First (Stage 1)

**Alternative Considered**: Semantic query expansion at parse time
**Why Rejected**:
- Users who avoid common terms do so intentionally
- Expansion causes bell curve collapse
- Modern search engines (Google) have degraded this way
- Prepositions and negations get lost

**Our Approach**:
- Preserve exact user terms
- Classify intent without changing query
- Apply semantic understanding later in pipeline

### Why Metadata-First Filtering (Stage 2)

**Alternative Considered**: Embedding similarity for initial filtering
**Why Rejected**:
- Embedding search over 10,000+ docs is slow (500ms+)
- No lifecycle awareness (finds deprecated and current equally)
- Can't filter by explicit metadata before semantic ops
- False positives from semantic similarity

**Our Approach**:
- Filter to ~100 candidates using fast metadata indexes
- Then apply expensive semantic operations
- Lifecycle filtering is deterministic, not probabilistic

### Why Write-Time Enrichment

**Alternative Considered**: Do semantic work on every query
**Why Rejected**:
- Embedding computation: 50-100ms per query
- Relationship inference: 100-200ms per query
- 1000 queries = 150-300 seconds of repeated work

**Our Approach**:
- Pay 15-30s once during ingestion
- Save 150-300ms per query
- ROI breakeven after ~100 queries

---

## Consequences

### Positive

1. **Query Precision**: User specificity preserved, no bell curve collapse
2. **Performance**: Query-time <100ms (write-time investment pays off)
3. **Lifecycle Awareness**: Metadata filtering ensures current docs rank first
4. **Semantic Power**: Still leverage embeddings/relationships, just at right stage
5. **Clear Architecture**: Each stage has specific responsibilities

### Negative

1. **Write Latency**: 15-30s ingestion time (acceptable trade-off)
2. **Complexity**: 5-stage pipeline more complex than simple embedding search
3. **Storage**: Pre-computed embeddings and projections require more storage
4. **Migration**: Existing markdown files need enrichment processing

### Neutral

1. **User Education**: Users must understand query semantics are applied differently
2. **Monitoring**: Need health metrics for each pipeline stage
3. **Maintenance**: Write-time enrichment requires re-processing on algorithm updates

---

## Implementation

### Phase 1: Core Pipeline (Weeks 1-2)
- Implement 5-stage pipeline architecture
- Literal query parsing
- Metadata-based filtering
- Basic semantic ranking

### Phase 2: Write-Time Enrichment (Weeks 3-4)
- Semantic block extraction
- Relationship inference
- Lifecycle detection
- Q&A generation

### Phase 3: Integration (Week 5)
- Integrate with existing lens system
- Connect to dual-role storage
- Domain adapter enhancements

### Phase 4: Migration (Weeks 6-8)
- Enrich existing markdown files
- Validate with test queries
- Performance tuning

---

## Validation

### Success Criteria

1. **Precision**: Query "deprecated kuzu" returns deprecation notices, not usage guides (>90%)
2. **Performance**: P95 query latency <100ms
3. **Lifecycle Accuracy**: Current docs rank before deprecated (>95%)
4. **Recall**: Vocabulary mismatch queries still find content (via Q&A)
5. **User Satisfaction**: Fresh agents find current guidance first

### Test Cases

```typescript
// Test 1: Literal preservation
query: "deprecated kuzu"
expected: Finds docs with lifecycle=deprecated about Kuzu
          Does NOT expand to general database docs

// Test 2: Lifecycle filtering
query: "current database approach"
expected: SurrealDB docs (lifecycle=current) rank first
          Kuzu docs (lifecycle=deprecated) filtered or de-ranked

// Test 3: Negation respect
query: "don't use kuzu"
expected: Finds docs warning against Kuzu
          Does NOT return Kuzu usage guides

// Test 4: Q&A bridging
query: "make graph queries faster"
expected: Finds performance optimization docs
          Via Q&A generation (colloquial → technical)

// Test 5: Performance
query: any
expected: P95 latency <100ms
          All stages measured separately
```

---

## Related Decisions

- [[adr_004_cosmos_db_dual_role_storage.md]] - Dual-role storage enables write-time enrichment (graph + analytics)
- [[adr_002_kuzu_graph_database.md]] - Graph storage for relationships (now being superseded)
- [[adr_003_duckdb_analytics.md]] - Analytics DB for materialized views and search indexes

---

## References

**Internal**:
- [[../architecture/semantic-processing/semantic-pipeline-stages.md]] - Full pipeline specification
- [[../architecture/semantic-processing/attention-gravity-problem.md]] - Problem context
- [[../architecture/semantic-processing/write-time-enrichment.md]] - Enrichment patterns
- [[../research/llm-memory-pruning-strategies.md]] - Survey of existing approaches

**External**:
- Modern search engine degradation (Google query rewriting issues)
- RAG system architectures (embedding-only vs hybrid)
- Information retrieval best practices (precision vs recall)

---

## Notes

This ADR represents a significant architectural commitment. The 5-stage pipeline is not easily reversible once implemented. However, the benefits to query precision and performance justify the complexity.

**Key Insight**: Most LLM memory systems optimize for conversational context where recency matters. CorticAI optimizes for knowledge networks where lifecycle matters more than age.

---

*Created: 2025-10-28*
*Status: Proposed (pending team review)*
*Next Review: Before Phase 1 implementation*
