# Implementation Guide: Edge Filtering Optimization

## Classification
- **Domain:** Practical/Applied
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** High - based on documented Kuzu capabilities and CorticAI codebase analysis

## Quick Start Paths

### For CorticAI Project (Immediate Implementation)

**Current State:**
- File: `app/src/storage/adapters/KuzuStorageAdapter.ts` lines 531-544
- Method: `traverse()` with post-processing edge type filtering
- Performance: Filtering after query execution

**Goal:** Move edge type filtering to query level

**Steps:**
1. **Verify Kuzu version** in `package.json` - confirm 0.11.x or later
2. **Run existing tests** to establish baseline
3. **Implement Option A** (Standard Cypher multi-type syntax) - simplest approach
4. **Run tests again** - verify no regressions
5. **Create performance benchmark** - measure improvement
6. **Remove post-processing code** - clean up after verification

**Estimated Time:** 2-3 hours total

### For Beginners (Learning Path)

1. **Start with:** Understanding variable-length path syntax `-[*1..3]->`
2. **Key concepts to understand:**
   - Graph traversal semantics
   - Relationship type filtering
   - Query execution order (MATCH → WHERE → RETURN)
3. **First practical step:** Test simple type filter `-[:KNOWS*1..2]->`  in Kuzu
4. **Common mistakes to avoid:**
   - Forgetting to include `:RelationType` (Kuzu requires it)
   - Using unsupported OR predicates in WHERE filters
   - Not testing with realistic graph sizes

### For Practitioners (Advanced)

1. **Assessment checklist:**
   - [ ] Current filtering approach (query-level vs post-processing)
   - [ ] Edge type cardinality (how many different types?)
   - [ ] Graph size and path length distributions
   - [ ] Current query performance metrics

2. **Improvement opportunities:**
   - Migrate post-processing filters to query level
   - Use Kuzu WHERE predicates for complex conditions
   - Implement performance monitoring
   - Create benchmark suite

3. **Advanced techniques:**
   - Combine type filters with property predicates
   - Use ACYCLIC/TRAIL semantics for path uniqueness
   - Leverage Kuzu's disk-based scanning optimizations
   - Implement query result caching

4. **Measurement approaches:**
   - Execution time (ms)
   - Memory usage (MB)
   - Result set size (number of paths)
   - Network transfer size (KB)

## Implementation Patterns

### Pattern 1: Standard Multi-Type Filter

**Context:** Filtering variable-length paths by multiple discrete relationship types

**Solution:**
```typescript
// Build relationship pattern with type filter
const typeFilter = pattern.edgeTypes && pattern.edgeTypes.length > 0
  ? `:${pattern.edgeTypes.join('|')}`
  : ':Relationship'  // Default type in CorticAI

// Construct the pattern with type filter
let relationshipPattern = ''
if (pattern.direction === 'outgoing') {
  relationshipPattern = `-[r${typeFilter}*1..${maxDepth}]->`
} else if (pattern.direction === 'incoming') {
  relationshipPattern = `<-[r${typeFilter}*1..${maxDepth}]-`
} else {
  relationshipPattern = `-[r${typeFilter}*1..${maxDepth}]-`
}

// Use in query - no post-processing needed
const secureQuery = this.buildSecureQuery('traversal', pattern.startNode, relationshipPattern, maxDepth)
```

**Consequences:**
- ✅ Simple and readable
- ✅ Standard Cypher syntax
- ✅ Query-level filtering (2-10x faster)
- ❌ Cannot filter by relationship properties
- ❌ Fixed set of types (not dynamic)

**Examples:**
```cypher
// Single type
MATCH path = (a:Entity {id: $startId})-[r:KNOWS*1..3]->(b:Entity)

// Multiple types
MATCH path = (a:Entity {id: $startId})-[r:KNOWS|FOLLOWS*1..3]->(b:Entity)

// All relationship types (empty filter)
MATCH path = (a:Entity {id: $startId})-[r:Relationship*1..3]->(b:Entity)
```

### Pattern 2: Kuzu WHERE Filter (Advanced)

**Context:** Filtering by relationship properties or complex conditions

**Solution:**
```typescript
// For Kuzu-specific advanced filtering
const relationshipPattern = `-[r:Relationship*1..${maxDepth} (r, n | WHERE ${whereClause})]->`

// Example WHERE clauses:
// - Temporal: "r.timestamp > 1640000000"
// - Property-based: "r.weight > 0.5"
// - Node-based: "n.active = true"
// - Combined: "r.timestamp > 1640000000 AND n.active = true"
```

**Consequences:**
- ✅ Very flexible
- ✅ Filters during traversal
- ✅ Can use relationship and node properties
- ❌ Kuzu-specific syntax
- ❌ Limited to AND predicates
- ❌ More complex to test

**Examples:**
```cypher
// Filter by relationship property
MATCH path = (a:Entity {id: $startId})
  -[r:Relationship*1..3 (r, n | WHERE r.weight > 0.5)]->(b:Entity)

// Filter by node property
MATCH path = (a:Entity {id: $startId})
  -[r:Relationship*1..3 (r, n | WHERE n.active = true)]->(b:Entity)

// Combined filter
MATCH path = (a:Entity {id: $startId})
  -[r:Relationship*1..3 (r, n | WHERE r.weight > 0.5 AND n.type = 'Important')]->(b:Entity)
```

### Pattern 3: Hybrid Approach

**Context:** Transitioning from post-processing to query-level filtering

**Solution:**
```typescript
// Phase 1: Add query-level filtering while keeping post-processing
const typeFilter = pattern.edgeTypes?.length > 0
  ? `:${pattern.edgeTypes.join('|')}`
  : ':Relationship'

relationshipPattern = `-[r${typeFilter}*1..${maxDepth}]->`

// Phase 2: Post-processing for validation (temporary)
if (pattern.edgeTypes && pattern.edgeTypes.length > 0) {
  const allEdgesMatch = graphPath.edges.every(edge =>
    pattern.edgeTypes!.includes(edge.type)
  )
  // Add assertion/warning if mismatch (should not happen)
  if (!allEdgesMatch) {
    this.logWarn('Query-level filter mismatch detected')
  }
}

// Phase 3: Remove post-processing after validation period
```

**Consequences:**
- ✅ Safe migration path
- ✅ Validates query-level filtering works correctly
- ✅ Can catch edge cases during transition
- ❌ Temporary performance overhead
- ❌ More complex code temporarily

## Decision Framework

```
IF edgeTypes is empty THEN
  Use default relationship type pattern `-[r:Relationship*..]->`

ELSE IF edgeTypes is single type THEN
  Use simple type filter `-[r:${type}*..]->`

ELSE IF edgeTypes is multiple types AND no property filtering needed THEN
  Use multi-type filter `-[r:${type1}|${type2}*..]->`

ELSE IF need relationship property filtering THEN
  IF Kuzu version >= 0.7.0 AND simple AND predicates THEN
    Use Kuzu WHERE syntax `-[r:Relationship*.. (r, n | WHERE condition)]->`
  ELSE
    Use hybrid approach (query-level types + post-processing properties)
  END IF

ELSE
  // Complex OR predicates or unsupported filters
  Use hybrid approach with post-processing
END IF
```

## CorticAI Specific Implementation Guide

### Files to Modify

#### 1. `KuzuSecureQueryBuilder.ts` (lines ~117-166)
**Current code:**
```typescript
// Currently builds pattern without edge type filter
let normalizedPattern = relationshipPattern
if (normalizedPattern.includes('[') && !normalizedPattern.includes(':')) {
  normalizedPattern = normalizedPattern.replace(/\[([a-z]*)\*/, '[$1:Relationship*')
}
```

**Enhanced code:**
```typescript
/**
 * Build a secure query for graph traversal with edge type filtering
 */
buildTraversalQuery(
  startNodeId: string,
  relationshipPattern: string,
  maxDepth: number,
  edgeTypes?: string[],
  options?: QueryOptions
): SecureQuery {
  this.validateDepthParameter(maxDepth)
  const resultLimit = this.getResultLimit(options, DEFAULT_TRAVERSAL_LIMIT)

  // Build edge type filter if specified
  let typeFilter = ':Relationship'  // Default
  if (edgeTypes && edgeTypes.length > 0) {
    typeFilter = `:${edgeTypes.join('|')}`
  }

  // Normalize relationship pattern to include type filter
  let normalizedPattern = relationshipPattern
  if (normalizedPattern.includes('[') && !normalizedPattern.includes(':')) {
    // Insert type filter: -[r*1..2]-> becomes -[r:TYPE1|TYPE2*1..2]->
    normalizedPattern = normalizedPattern.replace(
      /\[([a-z]*)\*/,
      `[$1${typeFilter}*`
    )
  }

  // Build query
  let statement = `MATCH path = (source:Entity {id: $startNodeId})${normalizedPattern}(target:Entity)`
  const parameters: QueryParameters = {
    startNodeId: startNodeId
  }

  // Add path length and limit
  if (statement.includes('*')) {
    statement += ` RETURN path, length(r) as pathLength LIMIT ${resultLimit}`
  } else {
    statement += ` RETURN path, 1 as pathLength LIMIT ${resultLimit}`
  }

  return {
    statement,
    parameters
  }
}
```

#### 2. `KuzuStorageAdapter.ts` (lines ~531-544)
**Current code:**
```typescript
// Apply edge type filtering if specified
if (pattern.edgeTypes && pattern.edgeTypes.length > 0) {
  // Check if all edges in the path match the allowed types
  const allEdgesMatch = graphPath.edges.every(edge =>
    pattern.edgeTypes!.includes(edge.type)
  )
  if (allEdgesMatch) {
    paths.push(graphPath)
  }
} else {
  paths.push(graphPath)
}
```

**Enhanced code:**
```typescript
// Query-level filtering handles edge types, so add all paths
paths.push(graphPath)

// Optional: Add assertion in debug mode to verify filtering
if (this.config.debug && pattern.edgeTypes && pattern.edgeTypes.length > 0) {
  const allEdgesMatch = graphPath.edges.every(edge =>
    pattern.edgeTypes!.includes(edge.type)
  )
  if (!allEdgesMatch) {
    this.logWarn(`Query-level filter mismatch: expected types ${pattern.edgeTypes.join(', ')}`)
  }
}
```

#### 3. Update TODO Comments
**Remove or update:**
- `KuzuSecureQueryBuilder.ts:148` - NOTE about edge type filtering
- `KuzuSecureQueryBuilder.ts:248` - TODO about native edge type filtering

### Testing Strategy

#### Unit Tests
```typescript
// Test file: KuzuSecureQueryBuilder.test.ts

describe('buildTraversalQuery with edge type filtering', () => {
  it('should include edge type filter for single type', () => {
    const query = builder.buildTraversalQuery('node1', '-[r*1..3]->', 3, ['KNOWS'])
    expect(query.statement).toContain('-[r:KNOWS*1..3]->')
  })

  it('should include edge type filter for multiple types', () => {
    const query = builder.buildTraversalQuery('node1', '-[r*1..3]->', 3, ['KNOWS', 'FOLLOWS'])
    expect(query.statement).toContain('-[r:KNOWS|FOLLOWS*1..3]->')
  })

  it('should use default Relationship type when no types specified', () => {
    const query = builder.buildTraversalQuery('node1', '-[r*1..3]->', 3)
    expect(query.statement).toContain('-[r:Relationship*1..3]->')
  })

  it('should handle empty edge types array', () => {
    const query = builder.buildTraversalQuery('node1', '-[r*1..3]->', 3, [])
    expect(query.statement).toContain('-[r:Relationship*1..3]->')
  })
})
```

#### Integration Tests
```typescript
// Test file: KuzuStorageAdapter.edges.integration.test.ts

describe('traverse with edge type filtering', () => {
  beforeEach(async () => {
    // Create test graph with multiple edge types
    await adapter.addNode({ id: 'a', type: 'Person', properties: {} })
    await adapter.addNode({ id: 'b', type: 'Person', properties: {} })
    await adapter.addNode({ id: 'c', type: 'Person', properties: {} })

    await adapter.addEdge({ from: 'a', to: 'b', type: 'KNOWS', properties: {} })
    await adapter.addEdge({ from: 'b', to: 'c', type: 'FOLLOWS', properties: {} })
  })

  it('should only return paths with specified edge types', async () => {
    const paths = await adapter.traverse({
      startNode: 'a',
      maxDepth: 2,
      edgeTypes: ['KNOWS']
    })

    // Should find a->b (KNOWS) but not a->b->c (includes FOLLOWS)
    expect(paths.length).toBe(1)
    expect(paths[0].edges.every(e => e.type === 'KNOWS')).toBe(true)
  })

  it('should return paths with multiple allowed edge types', async () => {
    const paths = await adapter.traverse({
      startNode: 'a',
      maxDepth: 2,
      edgeTypes: ['KNOWS', 'FOLLOWS']
    })

    // Should find both a->b (KNOWS) and a->b->c (KNOWS + FOLLOWS)
    expect(paths.length).toBe(2)
    expect(paths.every(p =>
      p.edges.every(e => ['KNOWS', 'FOLLOWS'].includes(e.type))
    )).toBe(true)
  })
})
```

#### Performance Benchmarks
```typescript
// Test file: KuzuStorageAdapter.performance.test.ts

describe('edge filtering performance', () => {
  beforeEach(async () => {
    // Create large test graph: 1000 nodes, 10000 edges, 5 types
    await createLargeTestGraph(adapter, {
      nodeCount: 1000,
      edgeCount: 10000,
      edgeTypes: ['TYPE_A', 'TYPE_B', 'TYPE_C', 'TYPE_D', 'TYPE_E']
    })
  })

  it('should filter at query level faster than post-processing', async () => {
    const startTime = Date.now()

    const paths = await adapter.traverse({
      startNode: 'node_0',
      maxDepth: 5,
      edgeTypes: ['TYPE_A']  // Query-level filtering
    })

    const queryLevelTime = Date.now() - startTime

    // Log results for comparison
    console.log(`Query-level filtering: ${queryLevelTime}ms, ${paths.length} paths found`)

    // Expect reasonable performance (adjust threshold based on hardware)
    expect(queryLevelTime).toBeLessThan(500)  // Should complete in < 500ms
  })
})
```

### Migration Checklist

- [ ] Verify Kuzu version supports multi-type filtering (0.11.x confirmed)
- [ ] Update `buildTraversalQuery()` to include edge type filter
- [ ] Remove post-processing filter from `traverse()` method
- [ ] Update or remove TODO comments
- [ ] Add unit tests for query building with edge type filters
- [ ] Add integration tests for filtered traversal
- [ ] Create performance benchmark comparing before/after
- [ ] Run full test suite to verify no regressions
- [ ] Document Kuzu-specific syntax in code comments
- [ ] Update technical documentation

### Success Metrics

**Performance:**
- [ ] 2-10x faster traversal queries with edge type filters
- [ ] Memory usage reduced (fewer results to post-process)
- [ ] Query execution time < 500ms for typical graphs (1K nodes, 10K edges)

**Code Quality:**
- [ ] Removed TODO/NOTE comments about missing functionality
- [ ] Added clear comments explaining query construction
- [ ] Zero test regressions
- [ ] TypeScript compilation with 0 errors

**Functionality:**
- [ ] All edge type filtering test cases pass
- [ ] Empty edge type array handled correctly
- [ ] Single and multiple type filters work correctly
- [ ] Edge case testing complete (no edges, all edges, mixed types)

## Resource Requirements

### Knowledge Prerequisites
- Understanding of graph traversal concepts
- Basic Cypher query language knowledge
- Familiarity with CorticAI storage adapter pattern
- Understanding of secure query builders

### Technical Requirements
- Kuzu database 0.11.x or later
- Node.js/TypeScript development environment
- Test framework (Vitest) for validation
- Graph visualization tool (optional, for debugging)

### Time Investment
- **Research:** ~1 hour (already complete)
- **Implementation:** 1-2 hours
- **Testing:** 1 hour
- **Documentation:** 30 minutes
- **Total:** ~3-4 hours

### Skill Development
- Graph database query optimization techniques
- Kuzu-specific Cypher extensions
- Performance benchmarking methodologies
- Test-driven development for database operations

## Metadata
- **Created:** 2025-10-12
- **Target Audience:** CorticAI developers, graph database practitioners
- **Implementation Priority:** HIGH - Performance optimization
- **Estimated Impact:** 2-10x query performance improvement
