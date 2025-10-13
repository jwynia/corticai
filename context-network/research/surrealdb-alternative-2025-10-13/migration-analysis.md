# Migration Analysis: Kuzu to SurrealDB

## Classification
- **Domain:** Implementation Planning, Migration
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Medium-High (based on technical analysis)

## Overview

This document analyzes the technical requirements, challenges, and strategy for migrating CorticAI from Kuzu to SurrealDB as the Primary Storage solution in the dual-role architecture.

## Migration Complexity Assessment

### Overall Complexity: **MODERATE-HIGH**

| Migration Aspect | Complexity | Effort | Risk |
|------------------|------------|--------|------|
| Data Migration | Low | 1-2 weeks | Low |
| Schema Migration | Low-Medium | 1 week | Low |
| Query Migration | High | 4-6 weeks | Medium |
| API Integration | Medium | 2-3 weeks | Low |
| Testing & Validation | High | 3-4 weeks | Medium |
| **Total Estimated** | **Moderate-High** | **11-16 weeks** | **Medium** |

## Data Migration Strategy

### Phase 1: Export from Kuzu

**Kuzu Export Capabilities:**
```bash
# Export entire database including schema and data
EXPORT DATABASE 'path/to/export/directory'
```

**Outputs:**
- `schema.cypher` - DDL for node and edge tables
- `macro.cypher` - User-defined functions
- `copy.cypher` - COPY FROM statements for data import
- Data files in CSV or Parquet format

**CorticAI-Specific Considerations:**
```typescript
// Current Kuzu schema (from discoveries/locations/kuzu-storage.md)
// Node Table: id (STRING), type (STRING), data (STRING)
// Relationship Table: FROM Entity TO Entity, type (STRING), data (STRING)
```

### Phase 2: Transform for SurrealDB

**Schema Mapping:**

| Kuzu Concept | SurrealDB Equivalent | Transformation |
|--------------|---------------------|----------------|
| Node Table (Entity) | Record Table | Direct mapping |
| Node.id | Record ID | `entity:id` format |
| Node.type | Table name or field | Can use dynamic tables or type field |
| Node.data (JSON) | Record fields | Parse JSON and store as native fields |
| Relationship Table | Edge Table (via RELATE) | Create with `in`/`out` references |
| Relationship.type | Edge table name | Use as relation identifier |
| Relationship.data | Edge properties | Parse JSON to edge fields |

**Data Transformation Script (Conceptual):**
```typescript
// Transform Kuzu nodes to SurrealDB records
async function migrateNodes(kuzuExport: KuzuNode[]) {
  for (const node of kuzuExport) {
    const data = JSON.parse(node.data);

    // Option 1: Dynamic table based on type
    await surrealDB.create(`${node.type}:${node.id}`, data);

    // Option 2: Unified table with type field
    await surrealDB.create('entity', {
      id: node.id,
      type: node.type,
      ...data
    });
  }
}

// Transform Kuzu relationships to SurrealDB edges
async function migrateRelationships(kuzuRels: KuzuRelationship[]) {
  for (const rel of kuzuRels) {
    const data = JSON.parse(rel.data);

    // SurrealDB RELATE syntax
    await surrealDB.query(`
      RELATE ${rel.from} -> ${rel.type} -> ${rel.to}
      SET ${serializeProperties(data)}
    `);
  }
}
```

### Phase 3: Import to SurrealDB

**Import Methods:**

1. **Programmatic Import (Recommended):**
```typescript
import { Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';

async function importData() {
  const db = new Surreal({ engines: surrealdbNodeEngines() });
  await db.connect('surrealkv://corticai_primary');
  await db.use({ namespace: 'corticai', database: 'primary' });

  // Import nodes
  const nodes = await loadKuzuExport('nodes.csv');
  for (const node of nodes) {
    await db.create(node.table, node.data);
  }

  // Import relationships
  const rels = await loadKuzuExport('relationships.csv');
  for (const rel of rels) {
    await db.query(`
      RELATE ${rel.from} -> ${rel.type} -> ${rel.to}
      CONTENT ${JSON.stringify(rel.properties)}
    `);
  }
}
```

2. **Bulk Import (for large datasets):**
```typescript
// Batch operations for performance
async function bulkImport(records: Record[]) {
  const batchSize = 1000;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await Promise.all(batch.map(r => db.create(r.table, r.data)));
  }
}
```

## Schema Migration

### Current Kuzu Schema

```cypher
// Node Table
CREATE NODE TABLE Entity (
  id STRING PRIMARY KEY,
  type STRING,
  data STRING  -- JSON serialized
)

// Relationship Table
CREATE REL TABLE Relationship (
  FROM Entity TO Entity,
  type STRING,
  data STRING  -- JSON serialized
)
```

### Target SurrealDB Schema

**Option A: Schema-less (Flexible)**
```sql
-- No explicit schema definition required
-- Tables created on-demand via RELATE and CREATE

-- Example records:
CREATE person:alice SET name = 'Alice', role = 'developer';
CREATE concept:oop SET title = 'Object-Oriented Programming';
RELATE person:alice -> understands -> concept:oop
  SET confidence = 0.9, learned_at = time::now();
```

**Option B: Schema-full (Enforced)**
```sql
-- Define explicit schema with validation
DEFINE TABLE person SCHEMAFULL;
DEFINE FIELD name ON TABLE person TYPE string;
DEFINE FIELD role ON TABLE person TYPE string;

DEFINE TABLE concept SCHEMAFULL;
DEFINE FIELD title ON TABLE concept TYPE string;

DEFINE TABLE understands SCHEMAFULL TYPE RELATION;
DEFINE FIELD in ON TABLE understands TYPE record<person>;
DEFINE FIELD out ON TABLE understands TYPE record<concept>;
DEFINE FIELD confidence ON TABLE understands TYPE float;
DEFINE FIELD learned_at ON TABLE understands TYPE datetime;
```

**Recommendation for CorticAI:** Start schema-less for flexibility, add schema enforcement incrementally as patterns stabilize.

## Query Migration

### Challenge: Complete Query Language Change

**Kuzu uses Cypher, SurrealDB uses SurrealQL - NO automatic translation possible.**

### Migration Pattern Catalog

#### Pattern 1: Simple Node Retrieval

**Kuzu (Cypher):**
```cypher
MATCH (p:Person)
WHERE p.name = 'Alice'
RETURN p
```

**SurrealDB (SurrealQL):**
```sql
SELECT * FROM person WHERE name = 'Alice';
-- OR using record ID
SELECT * FROM person:alice;
```

#### Pattern 2: Relationship Traversal

**Kuzu (Cypher):**
```cypher
MATCH (p:Person)-[r:WROTE]->(a:Article)
WHERE p.name = 'Alice'
RETURN p.name, a.title, r.date
```

**SurrealDB (SurrealQL):**
```sql
SELECT
  name,
  ->wrote->article.title AS articles,
  ->wrote.date AS dates
FROM person
WHERE name = 'Alice';
```

#### Pattern 3: Bidirectional Traversal

**Kuzu (Cypher):**
```cypher
-- Forward
MATCH (p:Person)-[:WROTE]->(a:Article)
RETURN a.title

-- Reverse
MATCH (p:Person)<-[:WROTE]-(a:Article)
RETURN p.name
```

**SurrealDB (SurrealQL):**
```sql
-- Forward (from person to article)
SELECT ->wrote->article.title FROM person;

-- Reverse (from article to person)
SELECT <-wrote<-person.name FROM article;
```

#### Pattern 4: Multi-Hop Traversal

**Kuzu (Cypher):**
```cypher
MATCH (p:Person)-[:KNOWS*1..3]->(friend:Person)
WHERE p.name = 'Alice'
RETURN friend.name
```

**SurrealDB (SurrealQL):**
```sql
-- SurrealDB uses explicit traversal
SELECT ->knows->person.name AS direct_friends FROM person:alice;

-- For multi-hop, need recursive approach or multiple queries
SELECT
  ->knows->person.name AS level1,
  ->knows->person->knows->person.name AS level2,
  ->knows->person->knows->person->knows->person.name AS level3
FROM person:alice;
```

**Migration Challenge:** Kuzu's variable-length path matching (`*1..3`) doesn't have direct equivalent in SurrealDB. Need to:
- Write multiple queries for known depths
- Use recursive logic in application code
- Or implement custom traversal functions

#### Pattern 5: Pattern Matching

**Kuzu (Cypher):**
```cypher
MATCH (p:Person)-[:WORKS_AT]->(c:Company)<-[:WORKS_AT]-(colleague:Person)
WHERE p.name = 'Alice' AND p <> colleague
RETURN colleague.name, c.name
```

**SurrealDB (SurrealQL):**
```sql
-- Need to break into subqueries or use conditional logic
LET $alice_company = (
  SELECT ->works_at->company.id FROM person:alice
);

SELECT
  <-works_at<-person.name AS colleagues,
  name AS company
FROM $alice_company
WHERE <-works_at<-person.id != person:alice.id;
```

### Query Migration Checklist

For each Kuzu query in the codebase:

1. **Identify query pattern** (see patterns above)
2. **Rewrite in SurrealQL** using pattern mappings
3. **Test equivalence** with sample data
4. **Document migration** in code comments
5. **Update tests** to validate new queries
6. **Performance test** to ensure no regression

### Known Kuzu Queries in CorticAI

Based on `discoveries/locations/kuzu-storage.md`:

| Method | Location | Query Type | Migration Complexity |
|--------|----------|------------|---------------------|
| traverse() | `KuzuStorageAdapter.ts:567-636` | Pattern-based traversal | High |
| findConnected() | `KuzuStorageAdapter.ts:643-694` | BFS traversal | High |
| shortestPath() | `KuzuStorageAdapter.ts:700-747` | Shortest path algorithm | High |
| get() | Storage operations | Direct node fetch | Low |
| set() | Storage operations | Node create/update | Low |
| delete() | Storage operations | Node deletion | Low |

**Estimated Query Migration Effort:**
- Simple CRUD: 1-2 days
- Graph traversal methods: 2-3 weeks
- Complex pattern matching: 2-3 weeks
- Testing and validation: 2 weeks

## API Integration

### Current Kuzu API Pattern

```typescript
// From KuzuStorageAdapter
class KuzuStorageAdapter<T> extends BaseStorageAdapter<T> {
  private database?: Database;
  private connection?: Connection;

  async get(key: string): Promise<T | undefined> {
    const query = `MATCH (n:Entity {id: $id}) RETURN n`;
    const result = await this.connection.query(query);
    // ...
  }

  async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
    // Complex Cypher query
  }
}
```

### Target SurrealDB API Pattern

```typescript
import { Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';

class SurrealDBStorageAdapter<T> extends BaseStorageAdapter<T> {
  private db: Surreal;

  async initialize() {
    this.db = new Surreal({ engines: surrealdbNodeEngines() });
    await this.db.connect(this.config.connectionString);
    await this.db.use({
      namespace: this.config.namespace,
      database: this.config.database
    });
  }

  async get(key: string): Promise<T | undefined> {
    const results = await this.db.select(key);
    return results[0] as T;
  }

  async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
    // SurrealQL traversal query
    const query = this.buildTraversalQuery(pattern);
    const results = await this.db.query(query);
    return this.parseResults(results);
  }
}
```

### Integration Complexity Assessment

| Integration Aspect | Complexity | Notes |
|-------------------|------------|-------|
| Connection Management | Low | SurrealDB SDK well-designed |
| Basic CRUD | Low | Straightforward mapping |
| Graph Operations | High | Query language differences |
| Transaction Handling | Medium | Different transaction semantics |
| Error Handling | Low | Good error types in SDK |
| Type Safety | Medium | Generic types need adjustment |

## Testing Strategy

### Test Migration Phases

1. **Unit Tests**
   - Migrate Kuzu-specific tests to SurrealDB equivalents
   - Ensure adapter contract compliance
   - Validate query equivalence

2. **Integration Tests**
   - Test full graph operations end-to-end
   - Verify data integrity after migration
   - Test performance benchmarks

3. **Parallel Testing** (Recommended)
   - Run both Kuzu and SurrealDB adapters in parallel
   - Compare results for equivalence
   - Identify migration bugs early

```typescript
// Parallel testing pattern
describe('Migration Validation', () => {
  let kuzuAdapter: KuzuStorageAdapter;
  let surrealAdapter: SurrealDBStorageAdapter;

  beforeAll(async () => {
    // Initialize both adapters with same data
    await seedData(kuzuAdapter, testDataSet);
    await seedData(surrealAdapter, testDataSet);
  });

  test('traverse() produces equivalent results', async () => {
    const kuzuResults = await kuzuAdapter.traverse(pattern);
    const surrealResults = await surrealAdapter.traverse(pattern);

    expect(normalizeResults(surrealResults))
      .toEqual(normalizeResults(kuzuResults));
  });
});
```

## Risk Mitigation

### High-Risk Areas

1. **Query Translation Errors**
   - **Risk:** Subtle semantic differences between Cypher and SurrealQL
   - **Mitigation:**
     - Comprehensive parallel testing
     - Manual query review
     - Gradual rollout with rollback plan

2. **Performance Regression**
   - **Risk:** SurrealDB graph operations may be slower than Kuzu
   - **Mitigation:**
     - Performance benchmarking before and after
     - Optimize SurrealQL queries
     - Consider indexing strategies

3. **Data Loss During Migration**
   - **Risk:** Export/import process corrupts data
   - **Mitigation:**
     - Multiple export backups
     - Checksum validation
     - Post-migration integrity checks

4. **Production Downtime**
   - **Risk:** Migration process requires system downtime
   - **Mitigation:**
     - Blue-green deployment
     - Staged migration (read-only, then read-write)
     - Quick rollback procedures

### Rollback Plan

```typescript
// Keep Kuzu adapter available during migration
class DualStorageAdapter<T> {
  constructor(
    private primary: SurrealDBStorageAdapter<T>,
    private fallback: KuzuStorageAdapter<T>
  ) {}

  async get(key: string): Promise<T | undefined> {
    try {
      return await this.primary.get(key);
    } catch (error) {
      console.warn('SurrealDB failed, falling back to Kuzu', error);
      return await this.fallback.get(key);
    }
  }
}
```

## Migration Timeline

### Detailed Phased Approach

**Phase 0: Preparation (Week 1-2)**
- ✅ Complete research and decision-making
- Create detailed migration plan
- Set up SurrealDB development environment
- Export Kuzu data for reference

**Phase 1: Adapter Development (Week 3-5)**
- Implement SurrealDBStorageAdapter skeleton
- Migrate basic CRUD operations
- Unit test basic functionality
- Document query patterns

**Phase 2: Query Migration (Week 6-9)**
- Migrate traverse() method
- Migrate findConnected() method
- Migrate shortestPath() method
- Create query migration guide

**Phase 3: Testing (Week 10-12)**
- Comprehensive unit testing
- Integration testing
- Performance benchmarking
- Parallel validation testing

**Phase 4: Data Migration (Week 13)**
- Export production Kuzu data
- Transform to SurrealDB format
- Import to SurrealDB
- Validate data integrity

**Phase 5: Staged Rollout (Week 14-15)**
- Deploy to development environment
- Deploy to staging with dual-adapter
- Monitor for issues
- Collect performance metrics

**Phase 6: Production Cutover (Week 16)**
- Final production deployment
- Monitor closely for 1 week
- Remove Kuzu fallback
- Update documentation

## Success Criteria

Migration is considered successful when:

1. ✅ All Kuzu queries have SurrealDB equivalents
2. ✅ 100% test coverage on new adapter
3. ✅ No data loss (checksum validation passes)
4. ✅ Performance within 90% of Kuzu benchmarks
5. ✅ Zero critical bugs in production for 2 weeks
6. ✅ Rollback plan tested and validated
7. ✅ Team trained on SurrealDB operations
8. ✅ Documentation complete and up-to-date

## Cost-Benefit Analysis

### Costs
- **Development Time:** 11-16 weeks (1 developer)
- **Risk:** Medium complexity migration
- **Learning Curve:** New query language for team
- **Testing Overhead:** Parallel testing infrastructure

### Benefits
- **Active Support:** SurrealDB is actively developed (vs Kuzu EOL)
- **Multi-Model:** Future flexibility for document/vector/full-text
- **Community:** Growing ecosystem and support
- **Real-Time:** Live queries enable new features
- **Long-Term Viability:** Sustainable database choice

**Verdict:** Benefits outweigh costs, especially given Kuzu's EOL status makes migration mandatory.

## Alternative Migration Paths

### Alternative 1: Migrate to Neo4j
- **Pros:** Mature, Cypher native, enterprise support
- **Cons:** Expensive, requires server, heavyweight for embedded use
- **Verdict:** Overkill for CorticAI's needs

### Alternative 2: Migrate to FalkorDB
- **Pros:** Cypher compatible, active development, Redis-based
- **Cons:** Less mature than Neo4j, different architecture
- **Verdict:** Possible alternative, but less flexible than SurrealDB

### Alternative 3: Fork Kuzu
- **Pros:** Minimal migration effort, keep existing queries
- **Cons:** Maintenance burden, no community support, uncertain future
- **Verdict:** High risk, not recommended

### Alternative 4: Wait for Kuzu Successor
- **Pros:** Potential for smooth migration path
- **Cons:** Unknown timeline, unknown compatibility, risky waiting
- **Verdict:** Too uncertain, proceed with SurrealDB

**Selected Path:** Migrate to SurrealDB (primary recommendation)

## Related Documents
- [[surrealdb-alternative-2025-10-13/overview]] - Research overview
- [[surrealdb-alternative-2025-10-13/comparison-matrix]] - Feature comparison
- [[surrealdb-alternative-2025-10-13/implementation-guide]] - Implementation details
- [[surrealdb-alternative-2025-10-13/query-language-mapping]] - Query translation guide
