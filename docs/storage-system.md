# Storage System Documentation

## Overview

CorticAI's storage system provides a flexible, pluggable architecture for data persistence. The system supports multiple storage backends through a unified interface, allowing you to choose the best storage solution for your use case.

## Storage Interface

All storage adapters implement the core `Storage` interface:

```typescript
interface Storage<T = any> {
  // Basic CRUD operations
  get(key: string): Promise<T | undefined>
  set(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
  has(key: string): Promise<boolean>
  clear(): Promise<void>
  size(): Promise<number>

  // Iteration support
  keys(): AsyncIterator<string>
  values(): AsyncIterator<T>
  entries(): AsyncIterator<[string, T]>

  // Query support (optional)
  query?(query: Query<T>): Promise<QueryResult<T>>

  // Persistence (optional)
  save?(key?: string): Promise<void>
  load?(key?: string): Promise<void>
}
```

## Storage Adapters

### MemoryStorageAdapter

High-performance in-memory storage ideal for development and testing.

#### Features
- O(1) operation complexity
- Deep cloning for data integrity
- Snapshot/restore capabilities
- Instance isolation

#### Usage
```typescript
import { MemoryStorageAdapter } from 'corticai';

const storage = new MemoryStorageAdapter<User>({
  debug: true // Enable debug logging
});

// Store data
await storage.set('user:1', {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com'
});

// Retrieve data
const user = await storage.get('user:1');

// Create snapshot
const snapshot = storage.snapshot();

// Restore from snapshot
storage.restore(snapshot);
```

#### Best For
- Development and testing
- Temporary caching
- Small datasets (<1000 items)
- Scenarios requiring fastest possible access

### JSONStorageAdapter

File-based storage with JSON serialization, providing simple persistence with human-readable files.

#### Features
- Atomic writes (temp file → rename)
- Auto-save and manual save modes
- Pretty printing support
- Directory auto-creation
- Corruption recovery

#### Usage
```typescript
import { JSONStorageAdapter } from 'corticai';

const storage = new JSONStorageAdapter({
  filePath: './data/context.json',
  pretty: true,        // Human-readable formatting
  atomic: true,        // Atomic write operations
  autoSave: true,      // Save on every change
  encoding: 'utf8'
});

// Data is automatically saved to file
await storage.set('context:1', {
  type: 'decision',
  content: 'Use TypeScript'
});

// Manual save (if autoSave is false)
await storage.save();

// Load from file
await storage.load();
```

#### Configuration Options
```typescript
interface JSONStorageConfig {
  filePath: string;          // Path to JSON file
  encoding?: BufferEncoding; // File encoding (default: 'utf8')
  pretty?: boolean;          // Pretty print JSON (default: false)
  atomic?: boolean;          // Use atomic writes (default: true)
  autoSave?: boolean;        // Auto-save on changes (default: false)
}
```

#### Best For
- Small to medium datasets (<10,000 items)
- Configuration storage
- Development environments
- Human-readable data storage
- Simple backup/restore scenarios

### DuckDBStorageAdapter

High-performance columnar storage using DuckDB, optimized for analytical queries.

#### Features
- Native SQL query support
- Transaction support
- Parquet import/export
- Connection pooling
- Optimized for analytics

#### Usage
```typescript
import { DuckDBStorageAdapter } from 'corticai';

const storage = new DuckDBStorageAdapter({
  database: './data/context.db',
  tableName: 'context_entries',
  threads: 4,
  enableParquet: true,
  poolSize: 5
});

// Store data - automatically persisted to database
await storage.set('entry:1', {
  id: 'entry:1',
  type: 'code',
  content: 'function example() {}',
  timestamp: new Date()
});

// Execute SQL queries directly
const results = await storage.query({
  conditions: [{
    field: 'type',
    operator: '=',
    value: 'code'
  }],
  ordering: [{
    field: 'timestamp',
    direction: 'desc'
  }],
  pagination: {
    limit: 10,
    offset: 0
  }
});

// Export to Parquet
await storage.exportToParquet('./backup.parquet');

// Import from Parquet
await storage.importFromParquet('./backup.parquet');
```

#### Configuration Options
```typescript
interface DuckDBStorageConfig {
  database: string;        // Path to database file
  tableName?: string;      // Table name (default: 'storage')
  threads?: number;        // Worker threads (default: 4)
  enableParquet?: boolean; // Enable Parquet support
  poolSize?: number;       // Connection pool size
  readonly?: boolean;      // Read-only mode
}
```

#### Best For
- Large datasets (>10,000 items)
- Production environments
- Complex analytical queries
- Time-series data
- Long-term persistence

## Batch Operations

All storage adapters support efficient batch operations through the `BatchStorage` interface:

```typescript
// Batch get
const results = await storage.getMany(['key1', 'key2', 'key3']);

// Batch set
await storage.setMany(new Map([
  ['key1', value1],
  ['key2', value2],
  ['key3', value3]
]));

// Batch delete
const deletedCount = await storage.deleteMany(['key1', 'key2']);

// Batch operations with mixed types
await storage.batch([
  { type: 'set', key: 'key1', value: 'value1' },
  { type: 'set', key: 'key2', value: 'value2' },
  { type: 'delete', key: 'key3' }
]);
```

## Query Integration

Storage adapters integrate with the query system for advanced filtering:

```typescript
import { QueryBuilder } from 'corticai';

// Build a query
const query = QueryBuilder.create<ContextEntry>()
  .whereEqual('type', 'decision')
  .whereGreaterThan('confidence', 0.8)
  .orderByDesc('timestamp')
  .limit(10)
  .build();

// Execute query on storage
const results = await storage.query(query);
```

## Error Handling

The storage system provides comprehensive error handling:

```typescript
import { StorageError, StorageErrorCode } from 'corticai';

try {
  await storage.set('key', value);
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.code) {
      case StorageErrorCode.CONNECTION_FAILED:
        console.error('Database connection failed');
        break;
      case StorageErrorCode.INVALID_KEY:
        console.error('Invalid key format');
        break;
      case StorageErrorCode.SERIALIZATION_ERROR:
        console.error('Failed to serialize data');
        break;
      default:
        console.error('Storage error:', error.message);
    }
  }
}
```

## Performance Considerations

### Memory Adapter
- **Read/Write**: O(1) complexity
- **Memory Usage**: Full dataset in memory
- **Persistence**: None (volatile)
- **Concurrency**: Thread-safe with cloning

### JSON Adapter
- **Read**: O(1) after initial load
- **Write**: O(n) for save operations
- **Memory Usage**: Full dataset in memory
- **Persistence**: File-based
- **Concurrency**: File locking for atomic writes

### DuckDB Adapter
- **Read**: Depends on query complexity and indexes
- **Write**: O(1) for individual operations
- **Memory Usage**: Configurable cache size
- **Persistence**: Database file
- **Concurrency**: MVCC with transactions

## Migration Between Adapters

Easily migrate data between storage adapters:

```typescript
// Source storage
const jsonStorage = new JSONStorageAdapter({
  filePath: './data.json'
});
await jsonStorage.load();

// Destination storage
const duckdbStorage = new DuckDBStorageAdapter({
  database: './data.db'
});

// Migrate all data
for await (const [key, value] of jsonStorage.entries()) {
  await duckdbStorage.set(key, value);
}
```

## Custom Storage Adapters

Create custom storage adapters by extending `BaseStorageAdapter`:

```typescript
import { BaseStorageAdapter } from 'corticai';

class CustomStorageAdapter<T> extends BaseStorageAdapter<T> {
  protected data = new Map<string, T>();

  async get(key: string): Promise<T | undefined> {
    this.validateKey(key);
    return this.data.get(key);
  }

  async set(key: string, value: T): Promise<void> {
    this.validateKey(key);
    this.validateValue(value);
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    this.validateKey(key);
    return this.data.delete(key);
  }

  // Implement other required methods...
}
```

## Best Practices

### Choosing a Storage Adapter

1. **Development**: Use MemoryStorageAdapter for fast iteration
2. **Testing**: Use MemoryStorageAdapter with snapshots
3. **Small Projects**: Use JSONStorageAdapter for simplicity
4. **Production**: Use DuckDBStorageAdapter for performance
5. **Analytics**: Use DuckDBStorageAdapter with SQL queries

### Key Design
- Use namespaced keys: `type:id` (e.g., `user:123`)
- Keep keys short but descriptive
- Avoid special characters in keys
- Use consistent key patterns

### Data Validation
- Validate data before storage
- Use TypeScript generics for type safety
- Handle serialization edge cases
- Implement proper error handling

### Performance Optimization
- Use batch operations for bulk updates
- Enable connection pooling for DuckDB
- Configure appropriate cache sizes
- Monitor memory usage
- Use appropriate indexes for queries

## Monitoring and Debugging

### Debug Logging
```typescript
const storage = new MemoryStorageAdapter({
  debug: true // Enable detailed logging
});
```

### Storage Metrics
```typescript
// Get storage size
const size = await storage.size();

// Monitor operation timing
const start = Date.now();
await storage.set('key', value);
const duration = Date.now() - start;
console.log(`Set operation took ${duration}ms`);
```

### Health Checks
```typescript
async function checkStorageHealth(storage: Storage) {
  try {
    // Test basic operations
    await storage.set('health:check', { timestamp: Date.now() });
    const value = await storage.get('health:check');
    await storage.delete('health:check');

    return { healthy: true, latency: Date.now() - value.timestamp };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```