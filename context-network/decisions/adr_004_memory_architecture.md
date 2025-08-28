# ADR-004: Three-Tier Memory Architecture

## Status
Accepted

## Context
CorticAI needs to handle different types of information with varying access patterns, importance, and lifecycle. Recent changes need quick access, established patterns need optimization, and historical data needs preservation without cluttering active memory.

## Decision
We will implement a three-tier memory architecture inspired by human memory systems: Working Memory (hot), Semantic Memory (warm), and Episodic Archive (cold).

## Rationale

### Why Memory-Inspired Architecture
- Proven model from cognitive science
- Natural separation of concerns
- Optimizes for different access patterns
- Enables consolidation and learning

### Three-Tier Design

**Working Memory (Hot)**
- Recent changes and active patterns
- High detail, quick access
- Limited capacity
- Cleared after consolidation

**Semantic Memory (Warm)**
- Established patterns and relationships
- Optimized representations
- Indexed for search
- Updated through consolidation

**Episodic Archive (Cold)**
- Complete historical record
- Append-only storage
- Compressed for space
- Accessed for conflict resolution

### Alternatives Considered

**Single storage layer**
- Pros: Simple
- Cons: Can't optimize for different access patterns

**Two-tier (hot/cold)**
- Pros: Simpler than three-tier
- Cons: Misses opportunity for semantic optimization

**Many tiers**
- Pros: More granular optimization
- Cons: Too complex, diminishing returns

## Consequences

### Positive
- Optimal performance for each access pattern
- Natural consolidation process
- Enables learning and pattern detection
- Manages storage growth effectively

### Negative
- More complex than single storage
- Need consolidation process
- Data exists in multiple forms

### Neutral
- Similar to CPU cache hierarchies
- Familiar pattern from other systems
- Requires periodic maintenance

## Implementation Notes
- Working memory in Kuzu for quick updates
- Semantic memory uses both Kuzu and DuckDB
- Episodic archive uses compressed Parquet files
- Consolidation runs during quiet periods
- Provenance tracking across all tiers

## Relationships
- **Parent:** [architecture/corticai_architecture.md]
- **Related:** 
  - [adr_002_kuzu_graph_database.md] - uses - For working and semantic memory
  - [adr_003_duckdb_analytics.md] - uses - For semantic memory views
  - [planning/implementation_phases.md] - enables - Phase 3 intelligence features

## Metadata
- **Created:** 2025-08-28
- **Decided:** 2025-08-28
- **Updated:** 2025-08-28