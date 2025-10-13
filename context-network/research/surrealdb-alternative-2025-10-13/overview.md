# Research: SurrealDB as Alternative to Kuzu/DuckDB

## Purpose
This research evaluates SurrealDB as a potential replacement for Kuzu (which is being discontinued) and/or DuckDB in the CorticAI storage architecture, given the announcement on October 10, 2025 that Kuzu development is being frozen.

## Classification
- **Domain:** Architecture, Storage, Research
- **Stability:** Dynamic - research represents current understanding as of 2025-10-13
- **Abstraction:** Structural - synthesized findings
- **Confidence:** Established - based on official announcements and documentation

## Research Scope
- **Core Topic:** Evaluating SurrealDB as graph database alternative given Kuzu's discontinuation
- **Research Depth:** Comprehensive
- **Time Period Covered:** October 2025 (Kuzu announcement) and current state of alternatives
- **Technical Focus:** Embedded graph databases with TypeScript support

## Key Questions Addressed

### 1. What is the status of Kuzu?
**Finding:** Kuzu development was frozen on October 10-12, 2025. The project is now archived with no active support, bug fixes, or new features. The maintainers announced they are "working on something new" but have not specified what.

**Confidence:** High - Based on official GitHub announcement and community discussions

**Implications:**
- CorticAI needs a migration path away from Kuzu
- The archived codebase remains accessible but unsupported
- Community has begun migrating to alternatives (FalkorDB, Neo4j)
- No official successor has been announced

### 2. What are SurrealDB's capabilities as a graph database?
**Finding:** SurrealDB is a multi-model database with native graph capabilities, offering embedded deployment, ACID transactions, and TypeScript support.

**Confidence:** High - Based on official documentation and technical specifications

**Key Capabilities:**
- **Multi-Model:** Document, relational, graph, time-series, vector, full-text search
- **Embedded Mode:** Can run in-process like Kuzu (via `@surrealdb/node`)
- **Graph Native:** Uses `RELATE` statement for subject→predicate→object relationships
- **Storage Options:** In-memory (`mem://`), persistent local (SurrealKV), or server-based
- **Query Language:** SurrealQL (SQL-like with graph extensions), NOT Cypher-compatible
- **Real-Time:** Built-in live queries and WebSocket sync
- **Security:** Row-level access control and granular permissions

### 3. How does SurrealDB compare to Kuzu and DuckDB?
**Finding:** SurrealDB offers different trade-offs - more flexible for multi-model use cases but less optimized for pure analytics compared to DuckDB, and uses different query syntax than Kuzu's Cypher.

**Confidence:** High - Based on benchmarks and technical comparisons

**See:** [[surrealdb-alternative-2025-10-13/comparison-matrix]]

### 4. What migration path exists from Kuzu?
**Finding:** Migration from Kuzu to SurrealDB would require significant query rewriting due to incompatible query languages (Cypher vs SurrealQL), but data migration is straightforward.

**Confidence:** High - Based on technical analysis

**Migration Complexity:**
- **Data Migration:** Straightforward (export to CSV/Parquet, reimport)
- **Schema Migration:** Moderate (node/edge concepts translate well)
- **Query Migration:** High complexity (complete query rewrite required - Cypher → SurrealQL)
- **API Migration:** Moderate (TypeScript SDK well-documented)

### 5. Should CorticAI use SurrealDB as a replacement?
**Finding:** SurrealDB can serve as a Kuzu replacement for the Primary Storage role, but the dual-role architecture should be maintained with DuckDB for analytics.

**Confidence:** Medium - Based on architectural analysis and requirements

**Recommendation:** Use SurrealDB for Primary Storage (graph) + DuckDB for Semantic Storage (analytics)

**See:** [[surrealdb-alternative-2025-10-13/implementation-guide]]

## Executive Summary

**Context:** On October 10-12, 2025, the Kuzu database team announced they are freezing development and no longer actively supporting KuzuDB. They indicated they're working on "something new" but provided no timeline or details. This creates an immediate concern for CorticAI, which uses Kuzu as its Primary Storage (graph database) in the dual-role storage architecture.

**Key Findings:**

1. **Kuzu is End-of-Life:** The project is archived, with no bug fixes, updates, or support. While the code remains accessible, relying on it long-term is not viable.

2. **SurrealDB is a Viable Alternative:** SurrealDB offers:
   - Native graph database capabilities with bidirectional relationships
   - Embedded deployment mode (in-process like Kuzu)
   - Excellent TypeScript/Node.js SDK
   - Multi-model flexibility (graph + document + relational)
   - Active development and community support
   - ACID transactions and real-time capabilities

3. **Migration is Non-Trivial:** The primary challenge is query language incompatibility:
   - Kuzu uses Cypher (industry standard for graph queries)
   - SurrealDB uses SurrealQL (SQL-like with graph extensions via `RELATE`)
   - All existing Kuzu queries would need complete rewrites
   - Graph modeling concepts translate well (nodes/edges → records/relations)

4. **Architecture Recommendation:** Maintain the dual-role architecture:
   - **Primary Storage:** Migrate from Kuzu to SurrealDB (graph operations, flexible schema)
   - **Semantic Storage:** Keep DuckDB (analytics, aggregations, columnar queries)
   - This preserves the separation of concerns and optimizes each role

5. **Performance Trade-offs:**
   - SurrealDB excels at graph operations and multi-model flexibility
   - DuckDB remains superior for analytical/OLAP workloads
   - SurrealDB's analytics performance is adequate but not competitive with DuckDB
   - Embedded mode performance is suitable for CorticAI's use case

## Methodology
- **Research Tool:** Research MCP Server with medium-depth reports
- **Queries Executed:** 5 comprehensive research queries
- **Sources Evaluated:** 50+ sources including official documentation, benchmarks, community discussions
- **Time Period:** Research conducted on 2025-10-13
- **Supplementary:** Direct documentation capture from SurrealDB official docs

## Navigation
- **Detailed Comparison:** [[surrealdb-alternative-2025-10-13/comparison-matrix]]
- **Migration Analysis:** [[surrealdb-alternative-2025-10-13/migration-analysis]]
- **Implementation Guide:** [[surrealdb-alternative-2025-10-13/implementation-guide]]
- **Query Language Mapping:** [[surrealdb-alternative-2025-10-13/query-language-mapping]]
- **Technical Evaluation:** [[surrealdb-alternative-2025-10-13/technical-evaluation]]
- **Decision Framework:** [[surrealdb-alternative-2025-10-13/decision-framework]]

## Related Context Network Nodes
- [[decisions/adr_002_kuzu_graph_database]] - Original Kuzu decision (now obsolete)
- [[architecture/dual-role-storage-architecture]] - Storage architecture that guides this decision
- [[architecture/storage-layer]] - Current storage implementation
- [[discoveries/duckdb-implementation]] - DuckDB adapter (should be preserved)
- [[discoveries/locations/kuzu-storage]] - Kuzu implementation to be migrated

## Timeline and Next Steps

**Immediate (Week 1-2):**
1. Review this research with team
2. Make go/no-go decision on SurrealDB
3. If approved, create detailed migration plan

**Short-term (Month 1):**
1. Create SurrealDB storage adapter prototype
2. Develop query migration patterns
3. Build parallel testing infrastructure

**Medium-term (Months 2-3):**
1. Migrate all Kuzu queries to SurrealDB
2. Comprehensive testing of graph operations
3. Performance benchmarking

**Long-term:**
1. Remove Kuzu dependency
2. Update all documentation
3. Monitor SurrealDB ecosystem evolution

## Open Questions
See [[surrealdb-alternative-2025-10-13/open-questions]] for detailed gaps and uncertainties.

## Metadata
- **Research Date:** 2025-10-13
- **Researcher:** Claude Code (AI Assistant)
- **Triggered By:** User inquiry about Kuzu discontinuation
- **Research Duration:** ~2 hours
- **Context Network Location:** `/context-network/research/surrealdb-alternative-2025-10-13/`
