# Storage Adapters - Key Locations

**Domain**: Storage System
**Last Updated**: 2025-10-01
**Confidence**: High

## Overview

This index maps important implementation details, patterns, and potential issues within the storage adapter system. Use this to quickly locate specific functionality when debugging or enhancing storage capabilities.

## Error Handling Patterns

### CosmosDB Adapter Error Handling
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:411-420`
- **What**: Batch delete operations with error handling
- **Pattern**: Catches errors during clear() operation, now logs non-404 errors
- **Note**: Fixed in 2025-10-01 to only ignore 404s, log other errors

```typescript
// Pattern: Selective error ignoring with logging
.catch((error: any) => {
  if (error.code !== 404) {
    if (this.config.debug) {
      logger.debug(`Failed to delete item ${item.id} during clear: ${error.message}`)
    }
  }
})
```

### LocalStorageProvider Error Handling
- **Location**: `app/src/storage/providers/LocalStorageProvider.ts:98-103`
- **What**: Iteration error handling in relationship queries
- **Pattern**: Catches and logs errors instead of silent swallowing
- **Related**: Performance issue - should use graph queries instead

## Partition Key Strategy

### CosmosDB Partition Key Generation
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:728-736`
- **What**: Hash function for distributing keys across partitions
- **Current Implementation**: Simple sum of character codes, modulo 10
- **Known Issue**: Poor distribution, only 10 partitions
- **Improvement Tracked**: `tasks/tech-debt/improve-cosmosdb-partitioning.md`

```typescript
// Current weak hash - targets for replacement
private getPartitionKeyValue(key: string): string {
  const hash = key.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  return `partition_${hash % 10}`  // Only 10 partitions
}
```

### Partition Key Configuration
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:56`
- **What**: Default partition key path setting
- **Value**: `/entityType`
- **Used in**: Container creation (line 232)

## Query Construction and Limits

### Kuzu Query Builder - Traversal Queries
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:90-135`
- **What**: Graph traversal query construction with variable-length paths
- **Hardcoded Limits**: 100 results for paths (line 126, 128)
- **Known Issue**: No configuration option for result limits
- **Improvement Tracked**: `tasks/tech-debt/configurable-query-limits.md`

### Kuzu Query Builder - Find Connected
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:141-151`
- **What**: Query for finding connected nodes
- **Hardcoded Limits**: 1000 results (line 146)
- **Depth Validation**: Uses validateDepthParameter() for safety

### Query Parameter Validation
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:193-203`
- **What**: Depth parameter validation for variable-length paths
- **Safety Limits**: MAX_DEPTH_LIMIT = 50
- **Good Pattern**: Validates before query construction

## Performance-Critical Sections

### Relationship Query Implementation (OPTIMIZED 2025-10-01)
- **Location**: `app/src/storage/providers/LocalStorageProvider.ts:90-95`
- **What**: Get relationships for an entity using graph traversal
- **Performance**: O(degree) complexity - only visits connected nodes
- **Implementation**: Uses KuzuStorageAdapter's getEdges() method
- **Improvement**: Up to 2000x faster than previous O(n) iteration
- **Completed**: 2025-10-01
- **Discovery**: [[2025-10-01-002-relationship-query-optimization]]

```typescript
// Optimized: O(degree) graph query
async getRelationships(entityId: string): Promise<T[]> {
  const edges = await (this as any).getEdges(entityId)
  return edges as T[]
}
```

### Bidirectional Relationship Query Pattern
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:80-93`
- **What**: UNION query pattern for bidirectional relationships
- **Why**: Simple bidirectional match loses direction information
- **Pattern**: Combines outgoing and incoming queries with UNION ALL
- **Security**: Maintains parameterization for both queries
- **Discovery**: [[2025-10-01-002-relationship-query-optimization]]

```typescript
// Pattern: UNION for bidirectional with direction preservation
buildGetEdgesQuery(nodeId: string): SecureQuery {
  return {
    statement: `
      MATCH (a:Entity {id: $nodeId})-[r:Relationship]->(b:Entity)
      RETURN a.id, b.id, r.type, r.data
      UNION ALL
      MATCH (a:Entity)-[r:Relationship]->(b:Entity {id: $nodeId})
      RETURN a.id, b.id, r.type, r.data
    `.trim(),
    parameters: { nodeId: nodeId }
  }
}
```

### CosmosDB Batch Clear Operation
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:405-422`
- **What**: Clear all items from container
- **Performance Pattern**: Batches deletes in groups of 100
- **RU Optimization**: Parallel deletes within batches
- **Good Pattern**: Prevents overwhelming CosmosDB with delete requests

## Type Safety Concerns

### Type Assertion Usage
- **Location**: `app/src/storage/providers/LocalStorageProvider.ts:271`
- **What**: EnhancedKuzuAdapter instantiation
- **Issue**: Uses `as any` to bypass type checking
- **Why**: Constructor signature mismatch
- **Indicates**: Possible inheritance hierarchy issue
- **Tracked**: `tasks/refactoring/fix-type-assertions-local-storage.md`

```typescript
// Code smell: Type assertion bypass
this.primaryAdapter = new (EnhancedKuzuAdapter as any)({
  type: 'kuzu',
  database: this.config.primary.database,
  readOnly: this.config.primary.readOnly || false,
  debug: this.config.debug || false
})
```

### Type Casting in Relationship Queries
- **Location**: `app/src/storage/providers/LocalStorageProvider.ts:93-94`
- **What**: Casting to any for entity access
- **Pattern**: Common when dealing with generic storage
- **Note**: Acceptable here as runtime shape is verified

## Configuration and Initialization

### CosmosDB Configuration Validation
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:78-103`
- **What**: Validates required configuration before initialization
- **Checks**: Database name, container name, connection info
- **Good Pattern**: Fail fast with clear error messages

### CosmosDB Client Initialization
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:146-190`
- **What**: Creates CosmosDB client with various auth methods
- **Supports**: Connection string, endpoint+key, managed identity
- **Note**: Managed identity requires @azure/identity package

### Container Creation and Indexing
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:223-272`
- **What**: Ensures container exists with proper indexing
- **Index Strategy**:
  - Include: `/key`, `/entityType`, `/_ts`
  - Exclude: `/value/*` (to save RUs)
- **Good Pattern**: Excludes large content from indexing

## Security Patterns

### Parameterized Query Construction
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:36-84`
- **What**: All query builders return SecureQuery with parameters
- **Security**: Prevents SQL injection via parameterization
- **Good Pattern**: Never concatenates user input into queries

### Parameter Sanitization
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:222-241`
- **What**: Validates and sanitizes query parameters
- **Checks**: Type validation, string length limits
- **Limit**: MAX_STRING_PARAMETER_LENGTH = 1,000,000 bytes

## Resource Management

### Recursive Directory Reading
- **Location**: `app/src/examples/SelfHostingExample.ts:119`
- **What**: Reads task directory recursively
- **Issue**: No depth limit
- **Risk**: Potential memory exhaustion with deep nesting
- **Tracked**: `tasks/refactoring/add-recursive-depth-limit.md`

### Connection Cleanup
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:741-751`
- **What**: Closes CosmosDB connections and cleanup
- **Pattern**: Sets references to null, marks as not loaded
- **Note**: CosmosDB client doesn't require explicit cleanup

## Patterns to Follow

### Good: Explicit Error Codes
- **Pattern**: Use StorageErrorCode enum for categorization
- **Example**: `StorageErrorCode.CONNECTION_FAILED`, `QUERY_FAILED`, etc.
- **Benefit**: Makes error handling consistent and testable

### Good: Debug Logging with Conditionals
- **Pattern**: Check `config.debug` before logging
- **Example**: `if (this.config.debug) { logger.debug(...) }`
- **Benefit**: No performance impact when debug disabled

### Good: Validation Before Processing
- **Pattern**: Validate inputs early, throw with context
- **Example**: validateDepthParameter() before query construction
- **Benefit**: Clear error messages, fail fast

## Patterns to Avoid

### Anti-Pattern: Silent Error Swallowing
- **Bad**: `catch(error) { /* ignore */ }`
- **Better**: `catch(error) { if (error.code !== EXPECTED) { log } }`
- **Found**: CosmosDBStorageAdapter (fixed), LocalStorageProvider (documented)

### Anti-Pattern: Type Assertions
- **Bad**: `new (SomeClass as any)({...})`
- **Better**: Fix type definitions to match usage
- **Found**: LocalStorageProvider.ts:271 (tracked for fix)

### Anti-Pattern: Magic Numbers
- **Bad**: `LIMIT 100`, `hash % 10`
- **Better**: Named constants or configurable values
- **Found**: Query limits, partition count (tracked for fix)

## Related Documents

- [[storage-architecture]] - Overall storage system design
- [[kuzu-graph-queries]] - Kuzu query patterns and usage
- [[cosmosdb-configuration]] - CosmosDB setup and tuning
- [[error-handling-guidelines]] - Error handling standards (to be created)
- [[2025-10-01-001-code-review-findings]] - Discovery from review

## Quick Reference

**Finding Error Handling**: Search for `.catch(` or `try {`
**Finding Query Limits**: Search for `LIMIT ` in Kuzu files
**Finding Type Assertions**: Search for `as any`
**Finding Configuration**: Look for constructor validation methods
**Finding Performance Issues**: Look for `for await` over storage entries

---
**Maintained by**: Code review process
**Update trigger**: When modifying storage adapters
**Confidence**: High - based on systematic code review
