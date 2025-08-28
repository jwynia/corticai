# ADR-002: Kuzu for Graph Storage

## Status
Accepted

## Context
CorticAI needs to store and query complex relationships between files, concepts, decisions, and external resources. The relationships are as important as the entities themselves, forming a knowledge graph that can be traversed in multiple ways.

## Decision
We will use Kuzu as our primary graph database for storing relationships and entities.

## Rationale

### Why Graph Database
- Natural fit for relationship-heavy data
- Efficient traversal of connections
- Pattern matching capabilities
- Multiple path queries
- No fixed schema requirements initially

### Why Kuzu Specifically
- **Embedded database**: No separate server process needed
- **High performance**: Columnar storage with vectorized query processing
- **ACID compliant**: Ensures data consistency
- **Cypher-compatible**: Industry-standard graph query language
- **TypeScript bindings**: Native integration with our stack
- **Active development**: Modern, well-maintained project
- **Small footprint**: Suitable for local development

### Alternatives Considered

**Neo4j**
- Pros: Industry leader, mature ecosystem
- Cons: Requires server, heavyweight for embedded use, licensing concerns

**SQLite with recursive CTEs**
- Pros: Ubiquitous, simple
- Cons: Not optimized for graph operations, complex queries become unwieldy

**In-memory graph**
- Pros: Fast, simple
- Cons: No persistence, limited scalability

## Consequences

### Positive
- Fast graph traversals and pattern matching
- No external dependencies or servers
- Can start simple and evolve schema
- Good TypeScript developer experience

### Negative
- Less mature than Neo4j
- Smaller community and ecosystem
- Need to handle backups and migrations ourselves

### Neutral
- Need to design graph schema carefully
- Must implement domain adapters to map files to graph

## Implementation Notes
- Use flexible JSON properties initially
- Materialize common patterns as typed properties later
- Implement incremental updates for performance
- Design for eventual sharding if needed

## Relationships
- **Parent:** [planning/implementation_phases.md]
- **Related:** 
  - [adr_003_duckdb_analytics.md] - complements - Analytics layer
  - [architecture/corticai_architecture.md] - implements - Storage layer

## Metadata
- **Created:** 2025-08-28
- **Decided:** 2025-08-28
- **Updated:** 2025-08-28