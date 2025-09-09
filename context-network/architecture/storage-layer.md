# Storage Layer Architecture

## Overview

The storage layer provides a flexible, extensible abstraction for data persistence across the application. It follows a strategy pattern with pluggable storage backends while maintaining a consistent interface.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (AttributeIndex, Components, Services)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Interface Layer                   │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │Storage<T>│  │BatchStorage<T> │  │SaveableStorage   │    │
│  └──────────┘  └───────────────┘  └──────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ implements
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Abstract Base Layer                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │            BaseStorageAdapter<T>                    │    │
│  │  - Common iterator implementations                  │    │
│  │  - Batch operation logic                           │    │
│  │  - Validation coordination                         │    │
│  │  - Debug logging utilities                         │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────┬──────────────────────┘
                       │ extends       │ extends
                       ▼               ▼
┌──────────────────────────┐  ┌───────────────────────────────┐
│   MemoryStorageAdapter   │  │    JSONStorageAdapter         │
│  - In-memory Map storage │  │  - File-based persistence    │
│  - Deep cloning          │  │  - Atomic writes             │
│  - Snapshot/restore      │  │  - Auto-save mode            │
└──────────────────────────┘  └──────────────┬────────────────┘
                                              │ uses
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Helper Layer                             │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │  FileIOHandler   │        │  StorageValidator    │      │
│  │  - Atomic writes │        │  - Key validation    │      │
│  │  - Directory ops │        │  - Value validation  │      │
│  │  - Error recovery│        │  - Type checking     │      │
│  └──────────────────┘        └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Storage Interface (`/src/storage/interfaces/Storage.ts`)

The foundational interface that all storage adapters must implement:

```typescript
interface Storage<T = any> {
  // Basic CRUD operations
  get(key: string): Promise<T | undefined>
  set(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
  has(key: string): Promise<boolean>
  clear(): Promise<void>
  
  // Metadata
  size(): Promise<number>
  
  // Iteration
  keys(): AsyncIterator<string>
  values(): AsyncIterator<T>
  entries(): AsyncIterator<[string, T]>
}
```

### 2. BatchStorage Interface

Extends Storage with efficient bulk operations:

```typescript
interface BatchStorage<T> extends Storage<T> {
  getMany(keys: string[]): Promise<Map<string, T>>
  setMany(entries: Map<string, T>): Promise<void>
  deleteMany(keys: string[]): Promise<number>
  batch(operations: Operation<T>[]): Promise<BatchResult>
}
```

### 3. BaseStorageAdapter (`/src/storage/base/BaseStorageAdapter.ts`)

Abstract base class providing:
- Common implementation for all iterators
- Batch operation logic
- Validation coordination
- Debug logging utilities
- Template method pattern for `ensureLoaded()` and `persist()`

### 4. Storage Adapters

#### MemoryStorageAdapter
- **Use Case**: Testing, temporary data, caching
- **Features**:
  - Fast in-memory operations
  - Deep cloning for data integrity
  - Snapshot/restore capabilities
  - Instance isolation

#### JSONStorageAdapter
- **Use Case**: File-based persistence, configuration storage
- **Features**:
  - Atomic writes (write to temp, then rename)
  - Auto-save and manual save modes
  - Pretty printing option
  - Corruption recovery
  - Directory auto-creation

### 5. Helper Utilities

#### FileIOHandler
- Encapsulates all file system operations
- Provides atomic write guarantees
- Handles temp file cleanup
- Directory creation
- Error recovery

#### StorageValidator
- Centralized validation logic
- Key validation (null, undefined, type checks)
- Value validation (circular references, serialization)
- Batch validation helpers
- Type guards and sanitizers

## Design Patterns

### 1. Strategy Pattern
- Storage interface defines the contract
- Multiple adapters provide different strategies
- Client code (AttributeIndex) works with interface

### 2. Template Method Pattern
- BaseStorageAdapter defines algorithm structure
- Concrete adapters implement `ensureLoaded()` and `persist()`
- Common operations reused across all adapters

### 3. Composition Pattern
- JSONStorageAdapter composes FileIOHandler
- Separation of storage logic from I/O operations
- Enables testing and reusability

### 4. Factory Pattern
- Storage adapter creation through factories
- Type-safe generic instantiation
- Configuration injection

## Usage Examples

### Basic Usage
```typescript
// Create a storage adapter
const storage = new MemoryStorageAdapter<User>()

// Store data
await storage.set('user:1', { id: 1, name: 'Alice' })

// Retrieve data
const user = await storage.get('user:1')

// Check existence
if (await storage.has('user:1')) {
  // Delete data
  await storage.delete('user:1')
}
```

### With AttributeIndex
```typescript
// Create index with storage adapter
const storage = new JSONStorageAdapter({
  filePath: './data/index.json',
  pretty: true,
  autoSave: true
})

const index = new AttributeIndex(storage)

// Index operations automatically persist
index.addAttribute('doc1', 'type', 'article')
// Data automatically saved to file
```

### Batch Operations
```typescript
const storage = new MemoryStorageAdapter<Product>()

// Batch set
const products = new Map([
  ['prod:1', { id: 1, name: 'Widget' }],
  ['prod:2', { id: 2, name: 'Gadget' }]
])
await storage.setMany(products)

// Batch get
const keys = ['prod:1', 'prod:2']
const retrieved = await storage.getMany(keys)

// Batch delete
const deletedCount = await storage.deleteMany(keys)
```

## Error Handling

### StorageError Types
```typescript
enum StorageErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  INVALID_VALUE = 'INVALID_VALUE',
  SERIALIZATION_FAILED = 'SERIALIZATION_FAILED',
  IO_ERROR = 'IO_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED'
}
```

### Error Handling Example
```typescript
try {
  await storage.set(null, value) // Invalid key
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.code) {
      case StorageErrorCode.INVALID_KEY:
        // Handle invalid key
        break
      case StorageErrorCode.SERIALIZATION_FAILED:
        // Handle serialization failure
        break
    }
  }
}
```

## Testing Strategy

### Interface Contract Tests
All storage adapters must pass the same contract tests:
- Basic CRUD operations
- Iterator behavior
- Batch operations
- Error conditions
- Type safety
- Edge cases

### Test Organization
```
tests/storage/
  ├── storage.interface.test.ts    # Contract tests
  ├── adapters/
  │   ├── memory.adapter.test.ts   # Memory-specific tests
  │   └── json.adapter.test.ts     # JSON-specific tests
  └── helpers/
      ├── validator.test.ts         # Validator tests
      └── file-io.test.ts          # FileIO tests
```

## Performance Characteristics

### MemoryStorageAdapter
- **Get/Set**: O(1) average case
- **Delete**: O(1)
- **Iteration**: O(n)
- **Memory**: Stores all data in memory

### JSONStorageAdapter
- **Get/Set**: O(1) in memory + I/O on save
- **Delete**: O(1) in memory + I/O on save
- **Load**: O(n) where n = total entries
- **Save**: O(n) JSON serialization + I/O

## Future Enhancements

### Planned Adapters
1. **DuckDBStorageAdapter**
   - Columnar analytics storage
   - Parquet file support
   - Fast aggregations

2. **RedisStorageAdapter**
   - Distributed caching
   - TTL support
   - Pub/sub capabilities

3. **IndexedDBStorageAdapter**
   - Browser-based persistence
   - Offline support
   - Large data handling

### Planned Features
1. **Query Interface**
   - Pattern matching
   - Range queries
   - Aggregations

2. **Caching Layer**
   - LRU cache decorator
   - Write-through/write-back strategies
   - Cache invalidation

3. **Transactions**
   - ACID compliance for compatible adapters
   - Rollback support
   - Isolation levels

## Migration Guide

### From Direct File I/O to Storage Adapter

Before:
```typescript
const index = new AttributeIndex()
await index.save('./data.json')  // Direct file I/O
```

After:
```typescript
const storage = new JSONStorageAdapter({
  filePath: './data.json'
})
const index = new AttributeIndex(storage)
await index.save('index-key')  // Uses storage adapter
```

### Backward Compatibility
The AttributeIndex maintains 100% backward compatibility:
- If no storage adapter provided, falls back to direct file I/O
- Existing code continues to work unchanged
- Migration can be gradual

## Best Practices

1. **Choose the Right Adapter**
   - Use MemoryStorageAdapter for tests
   - Use JSONStorageAdapter for small datasets
   - Use future DuckDB/Redis for large datasets

2. **Handle Errors Appropriately**
   - Always catch StorageError
   - Check error codes for specific handling
   - Provide fallback behavior

3. **Use Batch Operations**
   - More efficient than individual operations
   - Reduces I/O overhead
   - Better transaction semantics

4. **Configure Appropriately**
   - Enable debug mode during development
   - Use atomic writes for critical data
   - Choose auto-save vs manual save based on use case

## Conclusion

The storage layer provides a robust, extensible foundation for data persistence. Its layered architecture ensures:
- **Flexibility**: Easy to add new storage backends
- **Maintainability**: Clear separation of concerns
- **Testability**: All components independently testable
- **Performance**: Optimized for common use cases
- **Reliability**: Error handling and recovery built-in