# Database Comparison Matrix: SurrealDB vs Kuzu vs DuckDB

## Classification
- **Domain:** Technical Analysis, Storage
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Established (based on official documentation and benchmarks)

## Feature Comparison Table

| Feature | Kuzu (EOL) | SurrealDB | DuckDB |
|---------|------------|-----------|---------|
| **Status** | ❌ Frozen/Archived (2025-10-12) | ✅ Active Development | ✅ Active Development |
| **Database Type** | Graph (Property Graph) | Multi-model (Graph + Document + Relational + Vector) | Analytical/OLAP (Columnar) |
| **Primary Use Case** | Graph traversal & relationships | Flexible multi-model applications | Analytics & aggregations |
| **Embedded Mode** | ✅ Yes (in-process) | ✅ Yes (via `@surrealdb/node`) | ✅ Yes (in-process) |
| **Query Language** | Cypher (openCypher compatible) | SurrealQL (SQL-like + graph extensions) | SQL + Property Graph extension |
| **TypeScript Support** | ✅ Native bindings | ✅ Full SDK (`surrealdb` + `@surrealdb/node`) | ✅ Node.js bindings |
| **ACID Compliance** | ✅ Full ACID | ✅ Full ACID (multi-row, multi-table) | ✅ Full ACID |
| **Graph Operations** | ✅ Native, optimized | ✅ Native via `RELATE` statement | ⚠️ Extension-based (PGQ) |
| **Analytics Performance** | ⚠️ Moderate | ⚠️ Adequate (not OLAP-optimized) | ✅ Excellent (columnar, vectorized) |
| **Storage Backend** | File-based columnar | In-memory, RocksDB, SurrealKV | In-memory, file, Parquet |
| **Schema Flexibility** | ⚠️ Strict typing required | ✅ Schema-less or schema-full (flexible) | ⚠️ Schema required |
| **Full-Text Search** | ⚠️ Limited | ✅ Native | ⚠️ Extension-based |
| **Vector Search** | ❌ No | ✅ Native | ✅ Extension |
| **Real-Time Queries** | ❌ No | ✅ Live queries, WebSockets | ❌ No |
| **Relationship Model** | Typed edges with properties | `in → id → out` bidirectional | Foreign keys or graph extension |
| **Max Deployment Scale** | Single-node embedded | Single-node to distributed clusters | Single-node to MotherDuck (cloud) |
| **Community Size** | Declining (EOL) | Growing (newer project) | Large (data science community) |
| **License** | MIT | Business Source License 1.1 → Apache 2.0 after 3 years | MIT |

## Detailed Capability Analysis

### Graph Operations

#### Kuzu (Reference - EOL)
- **Strengths:**
  - Cypher query language (industry standard)
  - Optimized columnar storage for graphs
  - Efficient pattern matching
  - Native graph algorithms (shortest path, etc.)

- **Weaknesses:**
  - ❌ **Project discontinued** - no future support
  - Strict schema requirements
  - Limited full-text search
  - No multi-model capabilities

- **Example Query:**
  ```cypher
  MATCH (p:Person)-[:WROTE]->(a:Article)
  WHERE p.name = 'Alice'
  RETURN a.title
  ```

#### SurrealDB
- **Strengths:**
  - Native graph operations via `RELATE`
  - Bidirectional relationships by default
  - Edges are tables (can store rich properties)
  - Flexible graph traversal syntax
  - No schema required (but can be enforced)

- **Weaknesses:**
  - Non-standard query language (migration cost)
  - Fewer specialized graph algorithms
  - Smaller ecosystem vs Neo4j/Cypher
  - Analytics performance not as optimized as DuckDB

- **Example Query:**
  ```sql
  SELECT name, ->wrote->article.title AS articles
  FROM person
  WHERE name = 'Alice'
  ```

- **Graph Model:**
  - Subject → Predicate → Object (semantic triples)
  - `in` field: source node
  - `out` field: target node
  - Edge tables store metadata
  - Bidirectional by default (can traverse `->` or `<-`)

#### DuckDB
- **Strengths:**
  - Excellent for analytics on graph data
  - SQL standard compliance
  - Property Graph Query (PGQ) extension
  - Superior performance for aggregations

- **Weaknesses:**
  - Graph capabilities are secondary (extension-based)
  - Not optimized for graph traversal
  - Less intuitive for relationship modeling
  - Pattern matching less mature than dedicated graph DBs

- **Example Query:**
  ```sql
  SELECT p.name, a.title
  FROM person p
  JOIN wrote w ON p.id = w.person_id
  JOIN article a ON w.article_id = a.id
  WHERE p.name = 'Alice'
  ```

### Analytics & Aggregations

#### Kuzu (Reference - EOL)
- **Performance:** Moderate - columnar storage helps but not OLAP-focused
- **Use Cases:** Graph analytics, pattern analysis
- **Benchmarks:** Not extensively published

#### SurrealDB
- **Performance:** Adequate but not competitive with specialized OLAP databases
- **Benchmarks (from SurrealDB, Oct 2023):**
  - Scan operations: Similar or slower than SQLite
  - CRUD operations: Faster than SQLite
  - Analytics: Not OLAP-optimized
  - Example: `count_all(100)` 99th percentile: ~5,357ms (RocksDB backend)

- **Use Cases:**
  - Multi-model queries combining graph + document + analytics
  - Real-time analytics with live queries
  - Moderate-scale aggregations

#### DuckDB
- **Performance:** Excellent - purpose-built for analytics
- **Benchmarks:**
  - 3-25× faster than prior versions (as of 2024)
  - Can analyze datasets 10× larger on same hardware
  - Vectorized execution for complex aggregations
  - Native Parquet/CSV/JSON support

- **Use Cases:**
  - Large-scale aggregations (100M+ rows)
  - OLAP queries
  - Data science pipelines
  - BI/reporting workloads

### Embedded Deployment

| Aspect | Kuzu | SurrealDB | DuckDB |
|--------|------|-----------|---------|
| **In-Process** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Installation** | `npm install kuzu` | `npm install surrealdb @surrealdb/node` | `npm install duckdb` |
| **Memory Mode** | ❌ File-based only | ✅ `mem://` protocol | ✅ `:memory:` |
| **Persistent Mode** | ✅ `.kuzu` directory | ✅ `surrealkv://` protocol | ✅ `.duckdb` file |
| **Storage Size** | Moderate (columnar) | Moderate (depends on backend) | Small (highly compressed) |
| **Cold Start** | Fast | Fast | Very fast |
| **No Server Required** | ✅ | ✅ | ✅ |

### TypeScript Integration

#### Kuzu (Reference - EOL)
```typescript
import kuzu from 'kuzu';

const db = new kuzu.Database('./graphdb');
const conn = new kuzu.Connection(db);
const result = await conn.query('MATCH (p:Person) RETURN p');
```

#### SurrealDB
```typescript
import { Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';

const db = new Surreal({ engines: surrealdbNodeEngines() });
await db.connect('mem://');
await db.use({ namespace: 'test', database: 'test' });
const people = await db.select('person');
```

#### DuckDB
```typescript
import { Database } from 'duckdb';

const db = new Database(':memory:');
const conn = await db.connect();
const result = await conn.all('SELECT * FROM person');
```

## Multi-Model Capabilities

### SurrealDB Only
SurrealDB uniquely offers:
- **Document Model:** JSON documents like MongoDB
- **Relational Model:** SQL tables and joins
- **Graph Model:** Nodes and edges with traversal
- **Key-Value:** Simple KV operations
- **Time-Series:** Temporal data handling
- **Vector Search:** Embeddings for AI/ML
- **Full-Text Search:** Built-in text indexing

**Advantage:** Single database for diverse data types, reducing architectural complexity

**Trade-off:** Not as optimized as specialized databases for each model

### Kuzu & DuckDB
Single-model databases optimized for their specific use case

## Performance Comparison Summary

| Workload Type | Kuzu (EOL) | SurrealDB | DuckDB | Winner |
|---------------|------------|-----------|---------|--------|
| Graph Traversal | Excellent | Very Good | Moderate | **Kuzu** (but EOL) → **SurrealDB** |
| Pattern Matching | Excellent | Very Good | Moderate | **Kuzu** (but EOL) → **SurrealDB** |
| Relationship Queries | Excellent | Very Good | Good | **Kuzu** (but EOL) → **SurrealDB** |
| Aggregations (10M+ rows) | Good | Adequate | Excellent | **DuckDB** |
| Analytics/OLAP | Moderate | Adequate | Excellent | **DuckDB** |
| Full-Text Search | Limited | Very Good | Moderate | **SurrealDB** |
| Real-Time Queries | No | Excellent | No | **SurrealDB** |
| Multi-Model Flexibility | No | Excellent | No | **SurrealDB** |
| CRUD Operations | Good | Very Good | Very Good | Tie |
| Data Science Integration | Limited | Limited | Excellent | **DuckDB** |

## Query Language Comparison

### Cypher (Kuzu) - EOL
```cypher
// Create
CREATE (p:Person {name: 'Alice', age: 30})

// Relate
MATCH (p:Person), (a:Article)
WHERE p.name = 'Alice' AND a.id = 123
CREATE (p)-[:WROTE {date: '2025-01-01'}]->(a)

// Query
MATCH (p:Person)-[r:WROTE]->(a:Article)
WHERE p.name = 'Alice'
RETURN p.name, a.title, r.date
ORDER BY r.date DESC
```

**Pros:** Industry standard, widely known, powerful pattern matching
**Cons:** Project discontinued, no future support

### SurrealQL (SurrealDB)
```sql
-- Create
CREATE person:alice SET name = 'Alice', age = 30;

-- Relate
RELATE person:alice -> wrote -> article:123
SET date = '2025-01-01';

-- Query
SELECT name, ->wrote->article.title AS articles
FROM person:alice
ORDER BY ->wrote.date DESC;
```

**Pros:** Concise, SQL-like, multi-model support, active development
**Cons:** Non-standard, smaller ecosystem, learning curve for Cypher users

### SQL + Extensions (DuckDB)
```sql
-- Create
CREATE TABLE person (id INTEGER, name VARCHAR, age INTEGER);
INSERT INTO person VALUES (1, 'Alice', 30);

-- Relate (traditional)
CREATE TABLE wrote (person_id INT, article_id INT, date DATE);
INSERT INTO wrote VALUES (1, 123, '2025-01-01');

-- Query (traditional JOIN)
SELECT p.name, a.title, w.date
FROM person p
JOIN wrote w ON p.id = w.person_id
JOIN article a ON w.article_id = a.id
WHERE p.name = 'Alice'
ORDER BY w.date DESC;
```

**Pros:** Standard SQL, excellent tooling, best analytics performance
**Cons:** Verbose for graph operations, less intuitive relationship modeling

## Licensing Considerations

| Database | License | Implications |
|----------|---------|--------------|
| **Kuzu** | MIT | ✅ Permissive (but project is EOL) |
| **SurrealDB** | BSL 1.1 → Apache 2.0 (after 3 years) | ⚠️ Cannot use for competing DBaaS; converts to Apache 2.0 |
| **DuckDB** | MIT | ✅ Fully permissive |

**Note:** SurrealDB's Business Source License prohibits using it to create a competing database-as-a-service offering, but is otherwise permissive for internal use, embedded applications, and commercial products.

## Ecosystem & Community

| Aspect | Kuzu (EOL) | SurrealDB | DuckDB |
|--------|------------|-----------|---------|
| **GitHub Stars** | ~2.2k (frozen) | ~31k+ | ~29k+ |
| **Contributors** | Frozen | Growing | Very active |
| **Documentation** | Good (archived) | Excellent | Excellent |
| **Tutorials** | Limited | Growing | Extensive |
| **Community Support** | Archived | Discord, GitHub | Multiple forums |
| **Company Backing** | Frozen | SurrealDB Inc. | DuckDB Labs |
| **Release Cadence** | Stopped | Frequent | Very frequent |

## Recommendation Matrix

### Use SurrealDB When:
- ✅ You need graph operations with flexible schema
- ✅ Multi-model data (graph + documents + relational)
- ✅ Real-time queries and live data sync
- ✅ Embedded deployment required
- ✅ TypeScript/JavaScript primary language
- ✅ Moderate scale (not petabytes)

### Use DuckDB When:
- ✅ Analytics and aggregations are primary workload
- ✅ Working with large datasets (100M+ rows)
- ✅ SQL standard compliance important
- ✅ Data science integration needed
- ✅ BI/reporting requirements
- ✅ Columnar compression beneficial

### Avoid Both When:
- Need production Neo4j Cypher compatibility → Use Neo4j or FalkorDB
- Need distributed graph at massive scale → Use Neo4j Enterprise or Amazon Neptune
- Need proven stability for critical systems → Wait for more mature options

## CorticAI-Specific Recommendation

**Primary Storage (Graph) Role:**
- **Current:** Kuzu (EOL - must migrate)
- **Recommended:** SurrealDB
- **Rationale:**
  - Native graph operations
  - Embedded deployment
  - Flexible schema for context networks
  - Active development and support
  - Multi-model benefits for future expansion

**Semantic Storage (Analytics) Role:**
- **Current:** DuckDB
- **Recommended:** Keep DuckDB
- **Rationale:**
  - Superior analytics performance
  - Proven implementation
  - No need to change
  - Complementary to SurrealDB

**Combined Architecture:**
SurrealDB (graph/flexible) + DuckDB (analytics/typed) = Optimal dual-role storage

## Related Documents
- [[surrealdb-alternative-2025-10-13/overview]] - Research overview
- [[surrealdb-alternative-2025-10-13/migration-analysis]] - Migration strategy
- [[architecture/dual-role-storage-architecture]] - CorticAI storage design
