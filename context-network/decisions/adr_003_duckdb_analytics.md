# ADR-003: DuckDB for Analytics and Materialized Views

## Status
Accepted

## Context
While Kuzu handles graph relationships well, we need fast analytical queries, full-text search, aggregations, and materialized views for common access patterns. We need a complementary database optimized for different query types.

## Decision
We will use DuckDB as our analytics database alongside Kuzu, implementing a dual-database architecture.

## Rationale

### Why Dual Database Architecture
- Different query patterns need different optimizations
- Graph traversals vs. aggregations/analytics
- Flexibility to use the right tool for each job
- Can materialize common patterns for speed

### Why DuckDB Specifically
- **Embedded analytical database**: No server required
- **Columnar storage**: Optimized for analytics
- **Fast aggregations**: Orders of magnitude faster than row stores
- **SQL interface**: Familiar query language
- **Parquet support**: Efficient storage and exchange format
- **TypeScript bindings**: Good integration
- **Active development**: Modern, innovative features
- **Small footprint**: Can run alongside Kuzu

### Alternatives Considered

**Single database (Kuzu only)**
- Pros: Simpler architecture
- Cons: Not optimized for analytics, aggregations

**PostgreSQL**
- Pros: Mature, full-featured
- Cons: Requires server, overkill for embedded use

**SQLite**
- Pros: Ubiquitous, simple
- Cons: Row-based storage not optimal for analytics

**ClickHouse**
- Pros: Excellent analytics performance
- Cons: Requires server, complex setup

## Consequences

### Positive
- Blazing fast analytical queries
- Efficient full-text search
- Can create materialized views for common patterns
- Works well with data science tools

### Negative
- Two databases to maintain
- Need to sync data between databases
- More complex architecture

### Neutral
- Need to decide which queries go where
- Must design sync strategy
- Opportunity to optimize for specific access patterns

## Implementation Notes
- Start with simple sync during consolidation
- Materialize common query patterns
- Use for aggregations and search
- Consider using Parquet for archival storage

## Relationships
- **Parent:** [planning/implementation_phases.md]
- **Related:** 
  - [adr_002_kuzu_graph_database.md] - complements - Graph storage
  - [architecture/corticai_architecture.md] - implements - Storage layer

## Metadata
- **Created:** 2025-08-28
- **Decided:** 2025-08-28
- **Updated:** 2025-08-28