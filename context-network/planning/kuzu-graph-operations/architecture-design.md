# Architecture Design: Kuzu Graph Operations

## High-Level Design

### Component Architecture
```
KuzuStorageAdapter
├── Query Builder Layer
│   ├── TraversalQueryBuilder
│   ├── ConnectedNodesQueryBuilder
│   └── ShortestPathQueryBuilder
├── Query Execution Layer
│   ├── Query Executor
│   ├── Result Parser
│   └── Error Handler
└── Result Transformation Layer
    ├── PathConverter
    ├── NodeConverter
    └── EdgeConverter
```

## Detailed Component Design

### 1. Query Builder Layer

#### TraversalQueryBuilder
```typescript
class TraversalQueryBuilder {
  build(pattern: TraversalPattern): string {
    // Constructs Cypher query from pattern
    // Handles direction, depth, filters, edge types
  }
}
```

**Responsibilities**:
- Convert TraversalPattern to Cypher query
- Handle edge type filtering
- Apply node property filters
- Set depth limits and result limits

#### ConnectedNodesQueryBuilder
```typescript
class ConnectedNodesQueryBuilder {
  build(nodeId: string, depth: number, options?: FilterOptions): string {
    // Constructs query for finding connected nodes
  }
}
```

**Responsibilities**:
- Build BFS/DFS queries for connected nodes
- Apply depth restrictions
- Handle bidirectional traversal
- Deduplicate results

#### ShortestPathQueryBuilder
```typescript
class ShortestPathQueryBuilder {
  build(fromId: string, toId: string, options?: PathOptions): string {
    // Constructs shortest path query
  }
}
```

**Responsibilities**:
- Build SHORTEST path queries
- Handle weighted paths (future)
- Set maximum path length
- Choose path algorithm variant

### 2. Query Execution Layer

#### Query Executor
```typescript
class QueryExecutor {
  async execute<T>(query: string): Promise<T[]> {
    // Executes query and handles errors
  }
}
```

**Responsibilities**:
- Execute Cypher queries
- Handle connection failures
- Implement query timeouts
- Log query performance

#### Result Parser
```typescript
class ResultParser {
  parsePath(row: any): GraphPath
  parseNode(row: any): GraphNode
  parseEdge(row: any): GraphEdge
}
```

**Responsibilities**:
- Parse Kuzu result objects
- Extract node and edge data
- Parse JSON properties
- Handle null/undefined values

### 3. Result Transformation Layer

#### PathConverter
```typescript
class PathConverter {
  convert(kuzuPath: any): GraphPath {
    // Converts Kuzu path to GraphPath interface
  }
}
```

**Responsibilities**:
- Extract nodes from path._NODES
- Extract edges from path._RELS
- Calculate path length
- Maintain node order

## Query Patterns

### 1. Traversal Query Pattern
```cypher
MATCH path = (start:Entity {id: $startId})
      -[r:$edgeTypes*$minDepth..$maxDepth]-
      $direction(end:Entity)
WHERE $filters
RETURN path, length(r) as pathLength
LIMIT $limit
```

### 2. Connected Nodes Query Pattern
```cypher
MATCH (start:Entity {id: $nodeId})
      -[*1..$depth]-
      (connected:Entity)
WHERE connected.id <> $nodeId
RETURN DISTINCT connected
LIMIT $limit
```

### 3. Shortest Path Query Pattern
```cypher
MATCH path = (from:Entity {id: $fromId})
             -[r* SHORTEST 1..$maxDepth]-
             (to:Entity {id: $toId})
RETURN path, length(r) as pathLength
LIMIT 1
```

## Error Handling Strategy

### Error Types
1. **Connection Errors**: Database not available
2. **Query Errors**: Invalid Cypher syntax
3. **Timeout Errors**: Query exceeds time limit
4. **Resource Errors**: Out of memory
5. **Data Errors**: Invalid node/edge data

### Error Response Pattern
```typescript
try {
  const result = await this.executeQuery(query)
  return this.transformResult(result)
} catch (error) {
  if (error.code === 'CONNECTION_FAILED') {
    throw new StorageError('Database connection lost', StorageErrorCode.CONNECTION_FAILED)
  }
  if (error.code === 'QUERY_TIMEOUT') {
    throw new StorageError('Query timeout', StorageErrorCode.TIMEOUT)
  }
  throw new StorageError(`Query failed: ${error.message}`, StorageErrorCode.QUERY_FAILED)
}
```

## Performance Optimization

### Query Optimization
1. **Use indexes**: Leverage Entity.id PRIMARY KEY
2. **Limit results**: Default limits to prevent runaway queries
3. **Choose path semantics**: Use ACYCLIC for DAGs, TRAIL for unique edges
4. **Batch operations**: Group multiple queries when possible

### Caching Strategy
```typescript
class QueryCache {
  private cache: Map<string, CachedResult>

  get(query: string): CachedResult | null
  set(query: string, result: any, ttl: number): void
  invalidate(pattern?: string): void
}
```

### Performance Monitoring
```typescript
interface QueryMetrics {
  query: string
  executionTime: number
  resultCount: number
  cacheHit: boolean
  timestamp: Date
}
```

## Migration Strategy

### Phase 1: Replace Mock Implementations
1. Keep existing method signatures
2. Replace mock returns with real queries
3. Maintain backward compatibility

### Phase 2: Add Enhanced Features
1. Add query builders for cleaner code
2. Implement result caching
3. Add performance monitoring

### Phase 3: Optimize for Production
1. Add connection pooling
2. Implement query batching
3. Add advanced error recovery

## Testing Strategy

### Unit Tests
- Test each query builder independently
- Mock connection for isolated testing
- Verify query string generation

### Integration Tests
- Test with real Kuzu database
- Create test graphs with known structure
- Verify correct path results

### Performance Tests
- Measure query execution time
- Test with graphs of varying sizes
- Monitor memory usage

### Edge Case Tests
- Disconnected nodes
- Cyclic graphs
- Empty results
- Large result sets

## Security Considerations

### Query Injection Prevention
```typescript
private escapeString(value: string): string {
  // Escape single quotes and special characters
  return value.replace(/'/g, "\\'").replace(/\\/g, "\\\\")
}
```

### Resource Limits
- Maximum query depth: 10
- Maximum result size: 10,000
- Query timeout: 30 seconds
- Connection timeout: 5 seconds

## Future Enhancements

### Near-term (Phase 2)
- Weighted shortest path support
- Multiple shortest paths
- Path filtering with predicates
- Query result streaming

### Long-term (Phase 3)
- Custom graph algorithms
- Parallel query execution
- Distributed graph support
- Real-time graph updates