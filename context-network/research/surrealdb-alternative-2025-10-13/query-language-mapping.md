# Query Language Mapping: Cypher to SurrealQL

## Classification
- **Domain:** Query Languages, Migration
- **Stability:** Stable
- **Abstraction:** Detailed
- **Confidence:** High (based on documentation)

## Overview

This document provides comprehensive mappings between Kuzu's Cypher queries and SurrealDB's SurrealQL, enabling systematic query migration.

## Quick Reference Card

| Operation | Cypher (Kuzu) | SurrealQL (SurrealDB) |
|-----------|---------------|----------------------|
| **Create node** | `CREATE (p:Person {name:'Alice'})` | `CREATE person:alice SET name = 'Alice'` |
| **Create relationship** | `CREATE (p)-[:KNOWS]->(q)` | `RELATE person:alice -> knows -> person:bob` |
| **Select all** | `MATCH (p:Person) RETURN p` | `SELECT * FROM person` |
| **Filter** | `WHERE p.name = 'Alice'` | `WHERE name = 'Alice'` |
| **Traverse outgoing** | `MATCH (p)-[:KNOWS]->(q)` | `SELECT ->knows->person FROM person` |
| **Traverse incoming** | `MATCH (p)<-[:KNOWS]-(q)` | `SELECT <-knows<-person FROM person` |
| **Multi-hop** | `MATCH (p)-[:KNOWS*1..3]->(q)` | Multiple `->knows->` chains |
| **Count** | `RETURN count(*)` | `SELECT count() FROM ... GROUP ALL` |
| **Order** | `ORDER BY p.name` | `ORDER BY name` |
| **Limit** | `LIMIT 10` | `LIMIT 10` |

## Detailed Mapping Patterns

### 1. Node Operations

#### Create Node

**Cypher:**
```cypher
CREATE (p:Person {name: 'Alice', age: 30})
RETURN p
```

**SurrealQL:**
```sql
CREATE person:alice SET name = 'Alice', age = 30;
-- OR
CREATE person SET name = 'Alice', age = 30;
-- OR with inline data
INSERT INTO person [
  {id: 'alice', name: 'Alice', age: 30}
];
```

**Key Differences:**
- SurrealQL requires explicit record ID or auto-generates
- Can use `CREATE` or `INSERT INTO` syntax
- No need for RETURN clause (returns created record by default)

#### Read Node

**Cypher:**
```cypher
MATCH (p:Person)
WHERE p.name = 'Alice'
RETURN p.name, p.age
```

**SurrealQL:**
```sql
SELECT name, age FROM person WHERE name = 'Alice';
-- OR by ID
SELECT name, age FROM person:alice;
```

**Key Differences:**
- MATCH → SELECT FROM
- Label → table name
- Very similar WHERE syntax

#### Update Node

**Cypher:**
```cypher
MATCH (p:Person {name: 'Alice'})
SET p.age = 31
RETURN p
```

**SurrealQL:**
```sql
UPDATE person:alice SET age = 31;
-- OR
UPDATE person SET age = 31 WHERE name = 'Alice';
```

**Key Differences:**
- No MATCH needed in SurrealQL
- Direct UPDATE statement

#### Delete Node

**Cypher:**
```cypher
MATCH (p:Person {name: 'Alice'})
DELETE p
```

**SurrealQL:**
```sql
DELETE person:alice;
-- OR
DELETE person WHERE name = 'Alice';
```

**Key Differences:**
- No MATCH clause
- Direct DELETE statement

### 2. Relationship Operations

#### Create Relationship

**Cypher:**
```cypher
MATCH (p:Person {name: 'Alice'}), (q:Person {name: 'Bob'})
CREATE (p)-[:KNOWS {since: '2020'}]->(q)
```

**SurrealQL:**
```sql
RELATE person:alice -> knows -> person:bob
SET since = '2020';
-- OR with CONTENT
RELATE person:alice -> knows -> person:bob
CONTENT {
  since: '2020',
  strength: 'strong'
};
```

**Key Differences:**
- No need to MATCH nodes first (can RELATE directly)
- Uses `->` arrow syntax
- Relationship becomes a table/record
- Can add properties with SET or CONTENT

#### Query Relationships

**Cypher:**
```cypher
MATCH (p:Person)-[r:KNOWS]->(q:Person)
WHERE p.name = 'Alice'
RETURN q.name, r.since
```

**SurrealQL:**
```sql
SELECT
  ->knows->person.name AS friend_names,
  ->knows.since AS friendship_dates
FROM person:alice;
```

**Key Differences:**
- Traversal uses arrow notation in SELECT
- No need for explicit relationship variable
- More concise syntax

#### Bidirectional Relationships

**Cypher:**
```cypher
-- Outgoing
MATCH (p:Person)-[:KNOWS]->(q:Person)
RETURN q.name

-- Incoming
MATCH (p:Person)<-[:KNOWS]-(q:Person)
RETURN q.name
```

**SurrealQL:**
```sql
-- Outgoing
SELECT ->knows->person.name FROM person:alice;

-- Incoming
SELECT <-knows<-person.name FROM person:alice;
```

**Key Differences:**
- SurrealQL relationships are bidirectional by default
- Use `->` for outgoing, `<-` for incoming
- Simpler, more intuitive syntax

### 3. Pattern Matching

#### Simple Pattern

**Cypher:**
```cypher
MATCH (p:Person)-[:WROTE]->(a:Article)
WHERE p.name = 'Alice'
RETURN a.title
```

**SurrealQL:**
```sql
SELECT ->wrote->article.title AS articles
FROM person
WHERE name = 'Alice';
```

#### Complex Pattern (Triangle)

**Cypher:**
```cypher
MATCH (p:Person)-[:WORKS_AT]->(c:Company)<-[:WORKS_AT]-(colleague:Person)
WHERE p.name = 'Alice' AND p <> colleague
RETURN colleague.name, c.name
```

**SurrealQL:**
```sql
-- Method 1: Subquery
LET $alice_company = (
  SELECT ->works_at->company.id FROM person:alice
);

SELECT
  <-works_at<-person.name AS colleagues,
  name AS company_name
FROM $alice_company
WHERE <-works_at<-person.id != 'person:alice';

-- Method 2: Explicit traversal
SELECT
  ->works_at->company<-works_at<-person.name AS colleagues,
  ->works_at->company.name AS company_name
FROM person:alice
WHERE ->works_at->company<-works_at<-person.id != 'person:alice';
```

**Key Differences:**
- SurrealQL requires more explicit traversal paths
- Can use subqueries (LET) for complex patterns
- Variable-length pattern matching less elegant

### 4. Variable-Length Paths

#### Cypher: 1-3 Hops

**Cypher:**
```cypher
MATCH (p:Person)-[:KNOWS*1..3]->(friend:Person)
WHERE p.name = 'Alice'
RETURN DISTINCT friend.name
```

**SurrealQL:**
```sql
-- Option 1: Explicit levels
SELECT
  ->knows->person.name AS level1,
  ->knows->person->knows->person.name AS level2,
  ->knows->person->knows->person->knows->person.name AS level3
FROM person:alice;

-- Option 2: UNION for distinct results
SELECT name FROM (
  SELECT ->knows->person.* FROM person:alice
  UNION
  SELECT ->knows->person->knows->person.* FROM person:alice
  UNION
  SELECT ->knows->person->knows->person->knows->person.* FROM person:alice
);
```

**Key Differences:**
- ⚠️ **Major Limitation:** SurrealQL lacks native variable-length path syntax
- Must explicitly write traversals for each depth
- More verbose for multi-hop queries
- Consider implementing BFS/DFS in application code for dynamic depth

#### Cypher: Shortest Path

**Cypher:**
```cypher
MATCH path = shortestPath((p:Person)-[:KNOWS*]-(q:Person))
WHERE p.name = 'Alice' AND q.name = 'Bob'
RETURN length(path), nodes(path)
```

**SurrealQL:**
```sql
-- No built-in shortest path algorithm
-- Must implement manually with recursive approach or BFS
-- Example conceptual approach (not native syntax):

-- Would need to implement in application code:
async function shortestPath(from, to, relType) {
  let queue = [{node: from, path: [from], depth: 0}];
  let visited = new Set();

  while (queue.length > 0) {
    const {node, path, depth} = queue.shift();

    if (node === to) {
      return {path, length: depth};
    }

    if (visited.has(node)) continue;
    visited.add(node);

    // Query neighbors
    const neighbors = await db.query(`
      SELECT ->$(relType)->*.id FROM ${node}
    `);

    for (const neighbor of neighbors) {
      queue.push({
        node: neighbor,
        path: [...path, neighbor],
        depth: depth + 1
      });
    }
  }

  return null; // No path found
}
```

**Key Differences:**
- ⚠️ **Major Limitation:** No built-in graph algorithms
- Shortest path must be implemented in application code
- This is a significant capability gap compared to Kuzu

### 5. Aggregations

#### Count

**Cypher:**
```cypher
MATCH (p:Person)
RETURN count(*) AS total_people
```

**SurrealQL:**
```sql
SELECT count() AS total_people FROM person GROUP ALL;
```

**Key Differences:**
- SurrealQL requires `GROUP ALL` for total count
- `count()` vs `count(*)`

#### Group By

**Cypher:**
```cypher
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN c.name, count(p) AS employee_count
ORDER BY employee_count DESC
```

**SurrealQL:**
```sql
SELECT
  ->works_at->company.name AS company,
  count() AS employee_count
FROM person
GROUP BY ->works_at->company.name
ORDER BY employee_count DESC;
```

#### Distinct Values

**Cypher:**
```cypher
MATCH (p:Person)
RETURN DISTINCT p.department
```

**SurrealQL:**
```sql
SELECT array::distinct(department) FROM person GROUP ALL;
-- OR
SELECT DISTINCT department FROM person;
```

### 6. Conditional Logic

#### Case Statements

**Cypher:**
```cypher
MATCH (p:Person)
RETURN p.name,
  CASE
    WHEN p.age < 18 THEN 'minor'
    WHEN p.age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_group
```

**SurrealQL:**
```sql
SELECT
  name,
  CASE
    WHEN age < 18 THEN 'minor'
    WHEN age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_group
FROM person;
```

**Key Differences:**
- ✅ Very similar syntax!

### 7. Sorting and Limiting

#### Order and Limit

**Cypher:**
```cypher
MATCH (p:Person)
RETURN p
ORDER BY p.name ASC, p.age DESC
LIMIT 10
SKIP 5
```

**SurrealQL:**
```sql
SELECT *
FROM person
ORDER BY name ASC, age DESC
LIMIT 10
START 5;
```

**Key Differences:**
- SKIP → START
- Otherwise identical

### 8. Functions

#### String Functions

**Cypher:**
```cypher
MATCH (p:Person)
WHERE toLower(p.name) CONTAINS 'alice'
RETURN toUpper(p.name)
```

**SurrealQL:**
```sql
SELECT string::uppercase(name)
FROM person
WHERE string::lowercase(name) CONTAINS 'alice';
```

**Key Differences:**
- SurrealQL uses namespaced functions: `string::`, `array::`, `math::`, etc.
- Different function names (toLower → string::lowercase)

#### Date/Time Functions

**Cypher:**
```cypher
MATCH (p:Person)
WHERE p.created_at > datetime('2025-01-01')
RETURN p.name, date(p.created_at)
```

**SurrealQL:**
```sql
SELECT name, time::format(created_at, '%Y-%m-%d') AS date
FROM person
WHERE created_at > '2025-01-01T00:00:00Z';
```

**Key Differences:**
- SurrealQL uses `time::` namespace
- Different date parsing

### 9. Subqueries

#### Cypher Subqueries

**Cypher:**
```cypher
MATCH (p:Person)
WHERE p.age > 25
WITH p
MATCH (p)-[:WROTE]->(a:Article)
RETURN p.name, collect(a.title) AS articles
```

**SurrealQL:**
```sql
-- Option 1: Nested query
SELECT
  name,
  (SELECT ->wrote->article.title FROM $parent.id) AS articles
FROM person
WHERE age > 25;

-- Option 2: LET clause
LET $qualified_people = (SELECT * FROM person WHERE age > 25);
SELECT
  name,
  ->wrote->article.title AS articles
FROM $qualified_people;
```

### 10. Union and Set Operations

#### Union

**Cypher:**
```cypher
MATCH (p:Person)
RETURN p.name
UNION
MATCH (c:Company)
RETURN c.name
```

**SurrealQL:**
```sql
SELECT name FROM person
UNION
SELECT name FROM company;
```

**Key Differences:**
- ✅ Identical syntax!

## Advanced Pattern Mappings

### Pattern: Recommend Items

**Use Case:** Collaborative filtering (items liked by people with similar preferences)

**Cypher:**
```cypher
MATCH (me:Person {name: 'Alice'})-[:LIKES]->(item:Item)<-[:LIKES]-(other:Person)
MATCH (other)-[:LIKES]->(recommendation:Item)
WHERE NOT (me)-[:LIKES]->(recommendation)
RETURN recommendation.name, count(*) AS score
ORDER BY score DESC
LIMIT 10
```

**SurrealQL:**
```sql
-- Step 1: Find people with similar tastes
LET $similar_people = (
  SELECT
    <-likes<-person.id AS people
  FROM (
    SELECT ->likes->item.id FROM person:alice
  )
  WHERE people != 'person:alice'
);

-- Step 2: Find what they like that Alice doesn't
SELECT
  name,
  count() AS score
FROM (
  SELECT ->likes->item.* FROM $similar_people
)
WHERE id NOT IN (
  SELECT ->likes->item.id FROM person:alice
)
GROUP BY id
ORDER BY score DESC
LIMIT 10;
```

**Complexity:** High - Requires multiple subqueries

### Pattern: Find Common Connections

**Use Case:** Mutual friends, common interests

**Cypher:**
```cypher
MATCH (me:Person {name: 'Alice'})-[:KNOWS]->(friend:Person)
MATCH (you:Person {name: 'Bob'})-[:KNOWS]->(friend)
RETURN friend.name AS mutual_friend
```

**SurrealQL:**
```sql
SELECT
  ->knows->person.name AS mutual_friends
FROM person:alice
WHERE ->knows->person.id IN (
  SELECT ->knows->person.id FROM person:bob
);
```

### Pattern: Hierarchical Traversal (Org Chart)

**Use Case:** Manager chains, category trees

**Cypher:**
```cypher
MATCH path = (employee:Person)-[:REPORTS_TO*]->(ceo:Person)
WHERE employee.name = 'Alice' AND ceo.title = 'CEO'
RETURN nodes(path)
```

**SurrealQL:**
```sql
-- No native variable-length path support
-- Must implement recursively in application code

async function getManagerChain(employeeId) {
  let chain = [employeeId];
  let current = employeeId;

  while (true) {
    const result = await db.query(`
      SELECT ->reports_to->person.id AS manager,
             ->reports_to->person.title AS title
      FROM ${current}
    `);

    if (!result[0]?.manager) break;

    current = result[0].manager;
    chain.push(current);

    if (result[0].title === 'CEO') break;
  }

  return chain;
}
```

**Complexity:** High - Requires application-level logic

## Migration Strategy Summary

### Direct Migrations (Low Complexity)
- ✅ Basic CRUD operations
- ✅ Simple filtering (WHERE)
- ✅ Sorting and limiting
- ✅ Aggregations (with GROUP BY adjustments)
- ✅ UNION operations

### Moderate Complexity Migrations
- ⚠️ Single-hop relationship traversals
- ⚠️ Subqueries and CTEs
- ⚠️ Pattern matching (2-3 hops)

### High Complexity Migrations
- ❌ Variable-length paths (`*1..3`)
- ❌ Shortest path algorithms
- ❌ Complex graph algorithms
- ❌ Deep recursive queries

### Workarounds for Gaps

1. **Variable-Length Paths:**
   - Implement BFS/DFS in TypeScript
   - Pre-compute common path queries
   - Use materialized views in DuckDB for analytics

2. **Shortest Path:**
   - Application-level pathfinding algorithms
   - Consider Neo4j GDS library if needed at scale
   - Cache frequently computed paths

3. **Complex Graph Algorithms:**
   - Move to application layer
   - Use DuckDB for batch processing
   - Consider specialized graph tools for complex analysis

## Query Translation Checklist

When migrating a Cypher query:

- [ ] Identify query pattern (see patterns above)
- [ ] Map MATCH to SELECT FROM
- [ ] Convert relationship patterns to arrow notation (`->`, `<-`)
- [ ] Adjust function names (e.g., `toLower` → `string::lowercase`)
- [ ] Handle variable-length paths (may need application logic)
- [ ] Update aggregations (add `GROUP ALL` if needed)
- [ ] Test with sample data
- [ ] Validate performance
- [ ] Document any workarounds

## Tools and Utilities

### Query Migration Helper (Conceptual)

```typescript
// Helper to generate SurrealQL from common patterns
class QueryMigrationHelper {
  // Convert simple traversal
  static simpleTraversal(
    fromTable: string,
    fromId: string,
    relationship: string,
    toTable: string
  ): string {
    return `
      SELECT ->${relationship}->${toTable}.*
      FROM ${fromTable}:${fromId}
    `;
  }

  // Generate multi-hop traversal
  static multiHop(
    fromTable: string,
    fromId: string,
    relationship: string,
    toTable: string,
    maxDepth: number
  ): string {
    const hops = Array(maxDepth)
      .fill(`->${relationship}->${toTable}`)
      .join('');

    return `
      SELECT ${hops}.* AS level${maxDepth}
      FROM ${fromTable}:${fromId}
    `;
  }
}

// Usage
const query = QueryMigrationHelper.simpleTraversal(
  'person',
  'alice',
  'knows',
  'person'
);
```

## Related Documents
- [[surrealdb-alternative-2025-10-13/overview]] - Research overview
- [[surrealdb-alternative-2025-10-13/migration-analysis]] - Migration strategy
- [[surrealdb-alternative-2025-10-13/implementation-guide]] - Implementation details
