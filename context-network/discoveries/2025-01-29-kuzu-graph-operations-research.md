# Kuzu v0.6.1 Graph Operations Research

## Overview
Comprehensive research into Kuzu graph database v0.6.1 capabilities for implementing graph operations in the KuzuStorageAdapter. This research addresses the TODO comments in the existing implementation for `traverse()`, `findConnected()`, and `shortestPath()` methods.

## Key Findings

### Node.js API Capabilities
- **Connection Management**: `Database` and `Connection` classes for db operations
- **Async/Sync APIs**: Both async (default/recommended) and sync APIs available
- **Query Result Handling**: `QueryResult` object with `getAll()` method for retrieving all rows
- **Multi-query Support**: Execute multiple Cypher queries separated by semicolons

### Cypher Query Language Support
- **openCypher Standard**: Kuzu implements openCypher with extensions
- **Variable Length Paths**: Full support for `*min..max` syntax (Kleene star)
- **Shortest Path Algorithms**: Multiple shortest path variants supported
- **Path Semantics**: WALK (default), TRAIL, and ACYCLIC traversal modes
- **Weighted Paths**: Support for weighted shortest path algorithms

## Graph Traversal Capabilities

### 1. Variable Length Relationships
**Syntax**: `-[:Label*min..max]->`
- `*1..5` - 1 to 5 hops
- `*..10` - 1 to 10 hops (min defaults to 1)
- `*3` - exactly 3 hops

**Example**:
```cypher
MATCH (a:Entity)-[r:Relationship*1..5]->(b:Entity)
WHERE a.id = 'startId'
RETURN b, length(r) as pathLength
```

### 2. Shortest Path Algorithms
**Single Shortest Path**: `-[:Label* SHORTEST min..max]->`
```cypher
MATCH (a:Entity)-[r* SHORTEST 1..10]->(b:Entity)
WHERE a.id = 'fromId' AND b.id = 'toId'
RETURN r, length(r) as pathLength
```

**All Shortest Paths**: `-[:Label* ALL SHORTEST min..max]->`
```cypher
MATCH path = (a:Entity)-[* ALL SHORTEST 1..10]-(b:Entity)
WHERE a.id = 'fromId' AND b.id = 'toId'
RETURN path
```

**Weighted Shortest Path**: `-[:Label* WSHORTEST(property) min..max]->`
```cypher
MATCH path = (a:Entity)-[r:Relationship* WSHORTEST(weight) 1..10]->(b:Entity)
WHERE a.id = 'fromId' AND b.id = 'toId'
RETURN path, cost(r) as totalCost
```

### 3. Connected Nodes Within N Hops
```cypher
MATCH (start:Entity)-[*1..N]-(connected:Entity)
WHERE start.id = 'nodeId'
RETURN DISTINCT connected
```

### 4. Path Filtering and Constraints
**Filter intermediate nodes/relationships**:
```cypher
MATCH (a:Entity)-[:Relationship*1..5 (r, n | WHERE r.weight > 0.5 AND n.active = true)]->(b:Entity)
RETURN b
```

**Path semantics**:
- `*1..5` - WALK (default, allows revisiting nodes/relationships)
- `* TRAIL 1..5` - All relationships distinct
- `* ACYCLIC 1..5` - All nodes distinct

## Query Result Handling

### Basic Pattern
```javascript
const result = await connection.query(cypherQuery);
const rows = await result.getAll();
for (const row of rows) {
    console.log(row); // JavaScript object with query aliases as keys
}
```

### Result Structure
- Results are JavaScript objects with column names as keys
- Node objects include `_ID`, `_LABEL`, and all properties
- Relationship objects include source/target IDs and properties
- Path objects are RECURSIVE_REL type with nodes and relationships arrays

## Error Handling Patterns

### Connection Errors
```javascript
try {
    const db = new Database(path);
    const conn = new Connection(db);
} catch (error) {
    // Handle database connection errors
    console.error('Database connection failed:', error);
}
```

### Query Errors
```javascript
try {
    const result = await conn.query(cypherQuery);
    const rows = await result.getAll();
} catch (error) {
    // Handle query execution errors
    console.error('Query failed:', error);
}
```

## Performance Considerations

### Optimization Features
- **Vectorized Query Processing**: Built-in optimization for large graphs
- **Columnar Storage**: Efficient disk-based storage
- **Join Optimization**: Novel join algorithms for graph queries
- **Multi-core Parallelism**: Automatic query parallelization

### Best Practices
1. **Use LIMIT clauses** for large result sets
2. **Create indexes** on frequently queried properties (Entity.id)
3. **Use shortest path variants** when full paths not needed
4. **Consider path semantics** (ACYCLIC vs TRAIL vs WALK) based on use case
5. **Project only needed properties** in recursive relationships
6. **Use appropriate depth limits** to prevent runaway queries

### Index Creation
```cypher
-- Kuzu automatically creates indexes on PRIMARY KEY columns
-- Entity.id is already indexed as PRIMARY KEY in current schema
```

## Current Schema Compatibility
The existing KuzuStorageAdapter schema is compatible:
```cypher
CREATE NODE TABLE Entity(
    id STRING,
    type STRING,
    data STRING,
    PRIMARY KEY (id)
)

CREATE REL TABLE Relationship(
    FROM Entity TO Entity,
    type STRING,
    data STRING
)
```

## Implementation Recommendations

### 1. traverse() Method
- Use variable length relationships with filters
- Support different traversal patterns via TraversalPattern
- Return GraphPath objects with nodes and edges

### 2. findConnected() Method
- Use simple variable length relationships
- Return distinct connected nodes
- Support depth limiting

### 3. shortestPath() Method
- Use SHORTEST path variant for single path
- Use ALL SHORTEST for multiple shortest paths
- Consider weighted paths if edge weights exist

## Next Steps
1. Implement actual Cypher queries in KuzuStorageAdapter
2. Add proper error handling for graph operation failures
3. Add performance monitoring for deep traversals
4. Consider adding connection pooling for concurrent operations

## Related Files
- `/app/src/storage/adapters/KuzuStorageAdapter.ts` - Implementation target
- `/context-network/tasks/tech-debt/implement-real-graph-operations.md` - Task definition