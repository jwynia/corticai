# Storage Interface Design

## Design Principles

1. **Progressive Disclosure**: Start simple, add complexity only when needed
2. **Type Safety**: Leverage TypeScript's type system fully
3. **Async-First**: All operations are asynchronous by default
4. **Composable**: Interfaces build on each other
5. **Backend-Agnostic**: No assumptions about underlying storage

## Core Interfaces Hierarchy

```
Storage (Basic KV operations)
    ↓
QueryableStorage (Add query capabilities)
    ↓
TransactionalStorage (Add transaction support)
    ↓
DistributedStorage (Add distribution capabilities)
```

## Level 1: Basic Storage Interface

### Core Storage Interface
```typescript
/**
 * Basic storage interface for key-value operations
 * This is the minimum interface all storage adapters must implement
 */
interface Storage<T = any> {
  /**
   * Retrieve a value by key
   * @returns undefined if key doesn't exist
   */
  get(key: string): Promise<T | undefined>
  
  /**
   * Store a value with a key
   * Overwrites if key exists
   */
  set(key: string, value: T): Promise<void>
  
  /**
   * Delete a key-value pair
   * @returns true if key existed and was deleted
   */
  delete(key: string): Promise<boolean>
  
  /**
   * Check if a key exists
   */
  has(key: string): Promise<boolean>
  
  /**
   * Remove all key-value pairs
   */
  clear(): Promise<void>
  
  /**
   * Get the number of stored items
   */
  size(): Promise<number>
  
  /**
   * Iterate over all keys
   */
  keys(): AsyncIterator<string>
  
  /**
   * Iterate over all values
   */
  values(): AsyncIterator<T>
  
  /**
   * Iterate over all entries
   */
  entries(): AsyncIterator<[string, T]>
}
```

### Batch Operations Interface
```typescript
/**
 * Batch operations for improved performance
 */
interface BatchStorage<T> extends Storage<T> {
  /**
   * Retrieve multiple values at once
   */
  getMany(keys: string[]): Promise<Map<string, T>>
  
  /**
   * Store multiple key-value pairs
   */
  setMany(entries: Map<string, T>): Promise<void>
  
  /**
   * Delete multiple keys
   * @returns number of keys actually deleted
   */
  deleteMany(keys: string[]): Promise<number>
  
  /**
   * Perform multiple operations atomically
   */
  batch(operations: Operation<T>[]): Promise<BatchResult>
}

type Operation<T> = 
  | { type: 'set', key: string, value: T }
  | { type: 'delete', key: string }
  | { type: 'clear' }

interface BatchResult {
  success: boolean
  operations: number
  errors?: Error[]
}
```

## Level 2: Queryable Storage

### Query Interface
```typescript
/**
 * Storage with query capabilities
 */
interface QueryableStorage<T> extends BatchStorage<T> {
  /**
   * Query storage with pattern matching
   */
  query(pattern: QueryPattern): AsyncIterator<QueryResult<T>>
  
  /**
   * Count matching items without retrieving them
   */
  count(pattern: QueryPattern): Promise<number>
  
  /**
   * Find first matching item
   */
  findOne(pattern: QueryPattern): Promise<T | undefined>
  
  /**
   * Find all matching items
   */
  findMany(pattern: QueryPattern): Promise<T[]>
  
  /**
   * Aggregate operations
   */
  aggregate(pipeline: AggregateStage[]): Promise<any>
}

interface QueryPattern {
  /**
   * Filter conditions
   */
  where?: WhereClause
  
  /**
   * Sorting
   */
  orderBy?: OrderClause[]
  
  /**
   * Pagination
   */
  limit?: number
  offset?: number
  
  /**
   * Projection - which fields to include
   */
  select?: string[]
}

type WhereClause = 
  | BasicCondition
  | LogicalCondition
  | NestedCondition

interface BasicCondition {
  field: string
  operator: ComparisonOperator
  value: any
}

type ComparisonOperator = 
  | 'eq'    // equals
  | 'ne'    // not equals
  | 'gt'    // greater than
  | 'gte'   // greater than or equal
  | 'lt'    // less than
  | 'lte'   // less than or equal
  | 'in'    // in array
  | 'nin'   // not in array
  | 'regex' // regex match
  | 'exists' // field exists

interface LogicalCondition {
  operator: 'and' | 'or' | 'not'
  conditions: WhereClause[]
}

interface NestedCondition {
  field: string
  nested: WhereClause
}

interface OrderClause {
  field: string
  direction: 'asc' | 'desc'
}

interface QueryResult<T> {
  key: string
  value: T
  score?: number  // Relevance score for full-text search
  metadata?: Record<string, any>
}
```

### Index Management
```typescript
/**
 * Storage with index support for query optimization
 */
interface IndexedStorage<T> extends QueryableStorage<T> {
  /**
   * Create an index on a field
   */
  createIndex(name: string, fields: IndexField[]): Promise<void>
  
  /**
   * Drop an index
   */
  dropIndex(name: string): Promise<void>
  
  /**
   * List all indexes
   */
  listIndexes(): Promise<Index[]>
  
  /**
   * Get query execution plan
   */
  explain(pattern: QueryPattern): Promise<ExecutionPlan>
}

interface IndexField {
  name: string
  type?: 'btree' | 'hash' | 'fulltext' | 'spatial'
  direction?: 'asc' | 'desc'
}

interface Index {
  name: string
  fields: IndexField[]
  unique?: boolean
  sparse?: boolean
  stats?: IndexStats
}

interface IndexStats {
  size: number
  entries: number
  hits: number
  misses: number
}
```

## Level 3: Transactional Storage

### Transaction Interface
```typescript
/**
 * Storage with ACID transaction support
 */
interface TransactionalStorage<T> extends IndexedStorage<T> {
  /**
   * Execute operations in a transaction
   */
  transaction<R>(
    executor: (tx: Transaction<T>) => Promise<R>,
    options?: TransactionOptions
  ): Promise<R>
  
  /**
   * Begin explicit transaction
   */
  beginTransaction(options?: TransactionOptions): Promise<Transaction<T>>
}

interface Transaction<T> extends Storage<T> {
  /**
   * Unique transaction ID
   */
  readonly id: string
  
  /**
   * Transaction state
   */
  readonly state: 'active' | 'committed' | 'aborted'
  
  /**
   * Commit all changes
   */
  commit(): Promise<void>
  
  /**
   * Rollback all changes
   */
  rollback(): Promise<void>
  
  /**
   * Create a savepoint
   */
  savepoint(name: string): Promise<void>
  
  /**
   * Rollback to savepoint
   */
  rollbackTo(savepoint: string): Promise<void>
}

interface TransactionOptions {
  /**
   * Isolation level
   */
  isolation?: IsolationLevel
  
  /**
   * Transaction timeout in ms
   */
  timeout?: number
  
  /**
   * Read-only transaction
   */
  readOnly?: boolean
  
  /**
   * Retry on conflict
   */
  retries?: number
}

enum IsolationLevel {
  ReadUncommitted = 'READ_UNCOMMITTED',
  ReadCommitted = 'READ_COMMITTED',
  RepeatableRead = 'REPEATABLE_READ',
  Serializable = 'SERIALIZABLE'
}
```

## Level 4: Observable Storage

### Event System
```typescript
/**
 * Storage with event emission
 */
interface ObservableStorage<T> extends TransactionalStorage<T> {
  /**
   * Subscribe to storage events
   */
  on<E extends keyof StorageEvents<T>>(
    event: E,
    handler: StorageEvents<T>[E]
  ): void
  
  /**
   * Unsubscribe from events
   */
  off<E extends keyof StorageEvents<T>>(
    event: E,
    handler: StorageEvents<T>[E]
  ): void
  
  /**
   * Watch for changes to specific keys
   */
  watch(
    pattern: string | RegExp,
    handler: WatchHandler<T>
  ): WatchSubscription
}

interface StorageEvents<T> {
  'before:get': (key: string) => void | Promise<void>
  'after:get': (key: string, value: T | undefined) => void
  'before:set': (key: string, value: T) => void | Promise<void>
  'after:set': (key: string, value: T) => void
  'before:delete': (key: string) => void | Promise<void>
  'after:delete': (key: string, existed: boolean) => void
  'change': (changes: Change<T>[]) => void
  'error': (error: StorageError) => void
}

interface Change<T> {
  type: 'set' | 'delete'
  key: string
  oldValue?: T
  newValue?: T
  timestamp: number
}

type WatchHandler<T> = (change: Change<T>) => void

interface WatchSubscription {
  unsubscribe(): void
}
```

## Level 5: Distributed Storage

### Distribution Interface
```typescript
/**
 * Storage with distribution capabilities
 */
interface DistributedStorage<T> extends ObservableStorage<T> {
  /**
   * Get node information
   */
  getNodes(): Promise<Node[]>
  
  /**
   * Get replication status
   */
  getReplicationStatus(): Promise<ReplicationStatus>
  
  /**
   * Force sync with other nodes
   */
  sync(): Promise<SyncResult>
  
  /**
   * Get consistency level for operation
   */
  withConsistency(level: ConsistencyLevel): DistributedStorage<T>
}

interface Node {
  id: string
  address: string
  role: 'primary' | 'replica'
  status: 'healthy' | 'degraded' | 'offline'
  lastSeen: Date
}

interface ReplicationStatus {
  factor: number
  synced: number
  lagging: number
  offline: number
}

enum ConsistencyLevel {
  One = 'ONE',           // At least one node
  Quorum = 'QUORUM',     // Majority of nodes
  All = 'ALL',           // All nodes
  Local = 'LOCAL',       // Local node only
  Each = 'EACH'          // At least one in each DC
}
```

## Storage Configuration

### Configuration Types
```typescript
/**
 * Base configuration for all storage types
 */
interface StorageConfig {
  /**
   * Storage identifier
   */
  id?: string
  
  /**
   * Enable debug logging
   */
  debug?: boolean
  
  /**
   * Performance hints
   */
  hints?: PerformanceHints
  
  /**
   * Serialization options
   */
  serialization?: SerializationConfig
}

interface PerformanceHints {
  /**
   * Expected number of items
   */
  expectedSize?: number
  
  /**
   * Access pattern
   */
  accessPattern?: 'random' | 'sequential' | 'write-heavy' | 'read-heavy'
  
  /**
   * Cache configuration
   */
  cache?: CacheConfig
}

interface SerializationConfig {
  /**
   * Serialization format
   */
  format?: 'json' | 'msgpack' | 'protobuf'
  
  /**
   * Compression
   */
  compression?: 'none' | 'gzip' | 'lz4' | 'snappy'
  
  /**
   * Custom serializer
   */
  serializer?: Serializer<any>
}

interface Serializer<T> {
  serialize(value: T): Buffer | string
  deserialize(data: Buffer | string): T
}
```

### Adapter-Specific Configurations
```typescript
/**
 * JSON file storage configuration
 */
interface JSONStorageConfig extends StorageConfig {
  type: 'json'
  filePath: string
  encoding?: BufferEncoding
  pretty?: boolean
  atomic?: boolean  // Write to temp file then rename
}

/**
 * SQLite storage configuration
 */
interface SQLiteStorageConfig extends StorageConfig {
  type: 'sqlite'
  database: string  // File path or :memory:
  tableName?: string
  wal?: boolean     // Write-ahead logging
  foreign_keys?: boolean
}

/**
 * Graph database configuration
 */
interface GraphStorageConfig extends StorageConfig {
  type: 'graph'
  url: string
  database?: string
  username?: string
  password?: string
  tls?: TLSConfig
}
```

## Error Handling

### Error Types
```typescript
/**
 * Base storage error
 */
class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public details?: any
  ) {
    super(message)
  }
}

enum StorageErrorCode {
  // Connection errors
  ConnectionFailed = 'CONNECTION_FAILED',
  ConnectionLost = 'CONNECTION_LOST',
  
  // Operation errors
  KeyNotFound = 'KEY_NOT_FOUND',
  DuplicateKey = 'DUPLICATE_KEY',
  
  // Transaction errors
  TransactionAborted = 'TRANSACTION_ABORTED',
  DeadlockDetected = 'DEADLOCK_DETECTED',
  
  // Consistency errors
  ConsistencyViolation = 'CONSISTENCY_VIOLATION',
  VersionConflict = 'VERSION_CONFLICT',
  
  // Resource errors
  StorageFull = 'STORAGE_FULL',
  QuotaExceeded = 'QUOTA_EXCEEDED',
  
  // Validation errors
  InvalidKey = 'INVALID_KEY',
  InvalidValue = 'INVALID_VALUE',
  SerializationFailed = 'SERIALIZATION_FAILED'
}
```

## Usage Examples

### Basic Usage
```typescript
// Simple key-value storage
const storage: Storage<User> = new JSONStorageAdapter({
  filePath: './data/users.json'
})

await storage.set('user:123', { id: '123', name: 'Alice' })
const user = await storage.get('user:123')
```

### Query Usage
```typescript
// Queryable storage
const storage: QueryableStorage<Document> = new SQLiteStorageAdapter({
  database: './data/documents.db'
})

// Find documents by author
const docs = storage.query({
  where: {
    field: 'author',
    operator: 'eq',
    value: 'Alice'
  },
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 10
})

for await (const doc of docs) {
  console.log(doc.value.title)
}
```

### Transaction Usage
```typescript
// Transactional storage
const storage: TransactionalStorage<Account> = new SQLiteStorageAdapter({
  database: './data/accounts.db'
})

// Transfer funds atomically
await storage.transaction(async (tx) => {
  const from = await tx.get('account:123')
  const to = await tx.get('account:456')
  
  from.balance -= 100
  to.balance += 100
  
  await tx.set('account:123', from)
  await tx.set('account:456', to)
})
```

## Design Rationale

### Why Progressive Interfaces?
- Not all storage backends support all features
- Allows gradual adoption of complexity
- Type system ensures feature availability
- Clear capability boundaries

### Why Async Iterators?
- Memory efficient for large result sets
- Natural streaming interface
- Cancellation support
- Back-pressure handling

### Why Generic Types?
- Type safety for stored values
- Better IDE support
- Compile-time validation
- Easier refactoring

### Why Event System?
- Debugging and monitoring
- Cache invalidation
- Audit logging
- Reactive updates