# Architecture Design: DuckDB Storage Adapter

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│         (AttributeIndex)                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Storage Interface               │
│            Storage<T>                   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│        BaseStorageAdapter               │
│    (Common functionality)               │
└────────────────┬────────────────────────┘
                 │ extends
┌────────────────▼────────────────────────┐
│      DuckDBStorageAdapter               │
│   ┌──────────────────────────┐          │
│   │   Connection Manager     │          │
│   ├──────────────────────────┤          │
│   │   Schema Manager         │          │
│   ├──────────────────────────┤          │
│   │   Query Builder          │          │
│   ├──────────────────────────┤          │
│   │   Type Converter         │          │
│   ├──────────────────────────┤          │
│   │   Transaction Handler    │          │
│   └──────────────────────────┘          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│            DuckDB Instance              │
│         (@duckdb/node-api)              │
└─────────────────────────────────────────┘
```

## Component Design

### 1. DuckDBStorageAdapter Class

**Responsibilities:**
- Implements Storage<T> and BatchStorage<T> interfaces
- Extends BaseStorageAdapter for common functionality
- Coordinates between sub-components
- Manages adapter lifecycle

**Key Methods:**
```typescript
class DuckDBStorageAdapter<T> extends BaseStorageAdapter<T> {
  // Lifecycle
  protected async ensureLoaded(): Promise<void>
  protected async persist(): Promise<void>
  
  // DuckDB-specific
  public async query<R>(sql: string, params?: any[]): Promise<R[]>
  public async exportParquet(filePath: string): Promise<void>
  public async importParquet(filePath: string): Promise<void>
  
  // Transaction support
  public async transaction<R>(fn: () => Promise<R>): Promise<R>
}
```

### 2. Connection Manager

**Responsibilities:**
- Manage DuckDB instance lifecycle
- Handle connection pooling
- Ensure proper cleanup
- Cache instances for file databases

**Design Decisions:**
- Use instance caching to prevent multiple connections to same file
- Implement connection pool with configurable size
- Auto-reconnect on connection loss
- Graceful shutdown handling

**Interface:**
```typescript
class ConnectionManager {
  async connect(config: DuckDBStorageConfig): Promise<DuckDBConnection>
  async disconnect(): Promise<void>
  async getConnection(): Promise<DuckDBConnection>
  async releaseConnection(conn: DuckDBConnection): Promise<void>
}
```

### 3. Schema Manager

**Responsibilities:**
- Create and manage storage table schema
- Handle schema migrations
- Optimize table structure for key-value pattern
- Create indexes for performance

**Schema Design:**
```sql
CREATE TABLE IF NOT EXISTS storage (
  key VARCHAR PRIMARY KEY,
  value JSON NOT NULL,
  type VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_type ON storage(type);
CREATE INDEX IF NOT EXISTS idx_updated ON storage(updated_at);
```

**Design Decisions:**
- Use JSON column for flexible value storage
- Include metadata columns for analytics
- Create indexes on commonly queried fields
- Support future schema versioning

### 4. Query Builder

**Responsibilities:**
- Build SQL queries from Storage operations
- Prevent SQL injection via parameterization
- Optimize queries for DuckDB
- Handle batch operations efficiently

**Query Patterns:**
```typescript
class QueryBuilder {
  // Key-value operations
  buildGet(key: string): [string, any[]]
  buildSet(key: string, value: any): [string, any[]]
  buildDelete(key: string): [string, any[]]
  
  // Batch operations
  buildBatchInsert(entries: Map<string, T>): [string, any[]]
  buildBatchDelete(keys: string[]): [string, any[]]
  
  // Analytics queries
  buildAggregation(field: string, operation: string): [string, any[]]
}
```

### 5. Type Converter

**Responsibilities:**
- Convert JavaScript types to DuckDB types
- Handle serialization/deserialization
- Preserve type fidelity
- Optimize for columnar storage

**Type Mapping Strategy:**
```typescript
JavaScript → DuckDB → JavaScript
string     → VARCHAR → string
number     → DOUBLE  → number
boolean    → BOOLEAN → boolean
Date       → TIMESTAMP → Date
object     → JSON    → object
array      → JSON    → array
null       → NULL    → null
undefined  → NULL    → undefined
```

**Complex Type Handling:**
- Serialize objects/arrays to JSON
- Use DuckDB's native JSON support for queries
- Preserve special types via metadata
- Handle BigInt appropriately

### 6. Transaction Handler

**Responsibilities:**
- Manage transaction lifecycle
- Implement retry logic
- Handle rollback on errors
- Support nested transactions

**Transaction Flow:**
```typescript
class TransactionHandler {
  async begin(): Promise<void>
  async commit(): Promise<void>
  async rollback(): Promise<void>
  async execute<R>(fn: () => Promise<R>): Promise<R>
}
```

## Data Flow

### Write Operation Flow
```
1. Application calls set(key, value)
2. BaseStorageAdapter validates inputs
3. DuckDBStorageAdapter receives call
4. TypeConverter serializes value
5. QueryBuilder creates INSERT/UPDATE query
6. ConnectionManager gets connection
7. Query executed on DuckDB
8. Result returned to application
```

### Read Operation Flow
```
1. Application calls get(key)
2. BaseStorageAdapter validates key
3. DuckDBStorageAdapter receives call
4. QueryBuilder creates SELECT query
5. ConnectionManager gets connection
6. Query executed on DuckDB
7. TypeConverter deserializes result
8. Value returned to application
```

### Batch Operation Flow
```
1. Application calls setMany(entries)
2. TransactionHandler begins transaction
3. QueryBuilder creates batch INSERT
4. DuckDB Appender API used for efficiency
5. Transaction commits on success
6. Rollback on any error
```

## Integration Points

### With BaseStorageAdapter
- Override `ensureLoaded()` to initialize database
- Override `persist()` for manual save mode
- Inherit iterator implementations
- Use validation utilities

### With Storage Interface
- Implement all required methods
- Maintain interface contract
- Support generic type parameter
- Handle errors consistently

### With AttributeIndex
- Provide efficient query patterns
- Support large-scale operations
- Enable analytical queries
- Maintain backward compatibility

## Design Patterns

### 1. Adapter Pattern
- DuckDBStorageAdapter adapts DuckDB API to Storage interface
- Maintains abstraction boundary
- Enables polymorphic usage

### 2. Strategy Pattern
- QueryBuilder implements query strategies
- TypeConverter implements conversion strategies
- Allows algorithm variation

### 3. Template Method
- BaseStorageAdapter provides template
- DuckDBStorageAdapter fills in specifics
- Ensures consistent behavior

### 4. Connection Pool Pattern
- ConnectionManager pools connections
- Improves performance
- Manages resources efficiently

### 5. Unit of Work Pattern
- TransactionHandler groups operations
- Ensures consistency
- Enables rollback

## Performance Optimizations

### 1. Columnar Storage Benefits
- Compression reduces I/O
- Column pruning for queries
- Vectorized execution
- Cache efficiency

### 2. Query Optimizations
- Prepared statements for repeated queries
- Batch operations via Appender API
- Index usage for lookups
- Query result caching

### 3. Connection Management
- Connection pooling reduces overhead
- Instance caching prevents duplicates
- Lazy initialization
- Resource cleanup

### 4. Type Optimization
- Native type usage where possible
- Avoid unnecessary conversions
- Bulk serialization
- Streaming for large data

## Error Handling Strategy

### 1. Error Categories
- **Connection Errors**: Database unavailable
- **Query Errors**: SQL syntax or constraints
- **Type Errors**: Serialization failures
- **Transaction Errors**: Rollback scenarios
- **Resource Errors**: Memory or disk issues

### 2. Error Recovery
- Automatic reconnection for connection loss
- Transaction rollback on errors
- Graceful degradation where possible
- Clear error messages for debugging

### 3. Error Propagation
- Map DuckDB errors to StorageError
- Preserve error context
- Include helpful diagnostics
- Follow project error patterns

## Security Considerations

### 1. SQL Injection Prevention
- Always use parameterized queries
- Validate input types
- Escape special characters
- Use prepared statements

### 2. Access Control
- Respect file system permissions
- Validate configuration paths
- Limit query complexity
- Monitor resource usage

### 3. Data Protection
- No sensitive data in logs
- Secure connection strings
- Clean temporary files
- Handle PII appropriately

## Migration Strategy

### From JSON Adapter
1. Export existing data to JSON
2. Create DuckDB database
3. Import JSON data
4. Update configuration
5. Verify data integrity

### Schema Evolution
1. Version schema in metadata table
2. Migration scripts for changes
3. Backward compatibility
4. Rollback capability

## Configuration Schema

```typescript
interface DuckDBStorageConfig extends StorageConfig {
  type: 'duckdb'
  database: string        // File path or ':memory:'
  tableName?: string      // Default: 'storage'
  threads?: number        // Parallelism level
  enableParquet?: boolean // Parquet support
  poolSize?: number       // Connection pool size
  autoCreate?: boolean    // Auto-create database
  options?: {             // DuckDB-specific options
    access_mode?: 'read_write' | 'read_only'
    max_memory?: string
    threads?: string
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Test each component in isolation
- Mock DuckDB connection
- Verify query building
- Test type conversions

### 2. Integration Tests
- Test with real DuckDB
- Verify Storage interface compliance
- Test transactions
- Benchmark performance

### 3. Compatibility Tests
- Test with AttributeIndex
- Verify migration from JSON
- Cross-platform testing
- Load testing

## Future Enhancements

### Phase 1 (MVP)
- Basic Storage interface implementation
- File and memory database support
- Simple query capability

### Phase 2 (Enhanced)
- Parquet import/export
- Advanced analytics queries
- Connection pooling
- Performance optimizations

### Phase 3 (Advanced)
- Materialized views
- Full-text search
- Time-series optimizations
- Query result caching

## Decision Log

### ADR-001: Use JSON Column for Values
**Decision**: Store values as JSON rather than separate columns
**Rationale**: Maintains flexibility for arbitrary types
**Trade-off**: Some query performance vs. simplicity

### ADR-002: Single Table Design
**Decision**: Use single 'storage' table rather than multiple
**Rationale**: Simpler schema, easier management
**Trade-off**: Less optimization opportunity vs. maintainability

### ADR-003: Connection Pooling
**Decision**: Implement connection pooling from start
**Rationale**: Better performance under load
**Trade-off**: Added complexity vs. scalability