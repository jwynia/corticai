# Query System Documentation

## Overview

CorticAI's query system provides a powerful, type-safe interface for querying data across all storage adapters. Built with a fluent API pattern, it enables complex queries while maintaining full TypeScript type safety.

## Architecture

The query system consists of three main components:

1. **QueryBuilder** - Fluent API for constructing queries
2. **QueryExecutor** - Routes queries to appropriate executors
3. **Specialized Executors** - Adapter-specific query implementations

## QueryBuilder API

### Basic Usage

```typescript
import { QueryBuilder } from 'corticai';

// Simple query
const query = QueryBuilder.create<User>()
  .whereEqual('active', true)
  .orderByDesc('createdAt')
  .limit(10)
  .build();

const results = await storage.query(query);
```

### Filtering Operations

#### Equality Conditions
```typescript
// Equals
query.whereEqual('status', 'active')
query.where('status', '=', 'active')

// Not equals
query.whereNotEqual('status', 'deleted')
query.where('status', '!=', 'deleted')
```

#### Comparison Conditions
```typescript
// Greater than
query.whereGreaterThan('age', 18)
query.where('age', '>', 18)

// Greater than or equal
query.whereGreaterThanOrEqual('score', 80)
query.where('score', '>=', 80)

// Less than
query.whereLessThan('price', 100)
query.where('price', '<', 100)

// Less than or equal
query.whereLessThanOrEqual('quantity', 10)
query.where('quantity', '<=', 10)
```

#### Pattern Matching
```typescript
// Contains (substring search)
query.whereContains('email', '@company.com')
query.wherePattern('email', 'contains', '@company.com')

// Starts with
query.whereStartsWith('name', 'John')
query.wherePattern('name', 'startsWith', 'John')

// Ends with
query.whereEndsWith('filename', '.ts')
query.wherePattern('filename', 'endsWith', '.ts')

// Regular expression
query.whereMatches('phone', /^\d{3}-\d{3}-\d{4}$/)
query.wherePattern('phone', 'regex', '^\\d{3}-\\d{3}-\\d{4}$')
```

#### Set Operations
```typescript
// IN operator
query.whereIn('department', ['engineering', 'product', 'design'])

// NOT IN operator
query.whereNotIn('status', ['deleted', 'archived'])
```

#### Null Checks
```typescript
// IS NULL
query.whereNull('deletedAt')
query.whereNull('deletedAt', true)

// IS NOT NULL
query.whereNotNull('email')
query.whereNull('email', false)
```

### Sorting

```typescript
// Single field sorting
query.orderBy('createdAt', 'desc')
query.orderByDesc('createdAt')
query.orderByAsc('name')

// Multiple field sorting
query
  .orderBy('priority', 'desc')
  .orderBy('createdAt', 'asc')
```

### Pagination

```typescript
// Limit results
query.limit(20)

// Offset for pagination
query.offset(40)

// Combined for page 3 with 20 items per page
query.limit(20).offset(40)
```

### Projection (Field Selection)

```typescript
// Select specific fields
query.select(['id', 'name', 'email'])

// Exclude specific fields
query.exclude(['password', 'secretKey'])
```

### Aggregations

```typescript
// Count
query.count('total_count')

// Sum
query.sum('amount', 'total_amount')

// Average
query.avg('rating', 'average_rating')

// Min/Max
query.min('price', 'min_price')
query.max('score', 'max_score')

// Group by
query.groupBy('category', 'status')

// Having clause (filter aggregations)
query.having('total_amount', '>', 1000)
```

## Complex Queries

### Multiple Conditions (AND Logic)

By default, multiple conditions are combined with AND:

```typescript
const query = QueryBuilder.create<Product>()
  .whereEqual('category', 'electronics')
  .whereGreaterThan('price', 100)
  .whereLessThan('price', 1000)
  .whereEqual('inStock', true)
  .build();
// Finds electronics between $100-$1000 that are in stock
```

### Aggregation with Grouping

```typescript
const salesReport = QueryBuilder.create<Sale>()
  .groupBy('region', 'product')
  .sum('amount', 'total_sales')
  .count('transaction_count')
  .avg('amount', 'avg_sale')
  .having('total_sales', '>', 10000)
  .orderByDesc('total_sales')
  .limit(20)
  .build();
```

### Complex Filtering with Pagination

```typescript
const searchResults = QueryBuilder.create<Document>()
  .whereContains('content', searchTerm)
  .whereIn('type', ['article', 'tutorial', 'guide'])
  .whereGreaterThan('rating', 4.0)
  .whereNotNull('publishedAt')
  .orderByDesc('relevance')
  .orderByDesc('publishedAt')
  .limit(10)
  .offset(page * 10)
  .build();
```

## Type Safety

The QueryBuilder provides complete type safety through TypeScript generics:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
  createdAt: Date;
}

const query = QueryBuilder.create<User>()
  // ✅ Valid: 'name' is a string field
  .whereContains('name', 'John')

  // ✅ Valid: 'age' is a numeric field
  .whereGreaterThan('age', 18)

  // ❌ Compile error: 'age' is not a string field
  // .whereContains('age', '18')

  // ❌ Compile error: 'unknownField' doesn't exist
  // .whereEqual('unknownField', 'value')

  .build();
```

## Query Execution

### Direct Execution

```typescript
// Execute on storage adapter
const results = await storage.query(query);

// Results structure
interface QueryResult<T> {
  data: T[];              // Query results
  metadata: {
    totalCount?: number;  // Total matching records
    executionTime: number; // Query execution time (ms)
    query: Query<T>;      // Original query
  };
  errors?: QueryError[];  // Any errors encountered
}
```

### Using QueryExecutor

```typescript
import { QueryExecutor } from 'corticai';

const executor = new QueryExecutor<User>();
const results = await executor.execute(query, storage);

// Executor automatically detects storage type and optimizes
```

## Storage-Specific Features

### DuckDB Native SQL

When using DuckDBStorageAdapter, queries are translated to optimized SQL:

```typescript
// This QueryBuilder query...
QueryBuilder.create<User>()
  .whereEqual('active', true)
  .whereGreaterThan('age', 18)
  .orderByDesc('createdAt')
  .limit(10)

// ...becomes this SQL:
// SELECT * FROM users
// WHERE active = true AND age > 18
// ORDER BY createdAt DESC
// LIMIT 10
```

### Memory Adapter Optimization

MemoryQueryExecutor uses optimized JavaScript operations:
- Efficient filtering with early termination
- Stable sorting algorithms
- Streaming for large datasets

### JSON Adapter Caching

JSONQueryExecutor implements smart caching:
- 60-second cache TTL
- Automatic cache invalidation on file changes
- Memory-speed queries after initial load

## Advanced Patterns

### Query Reuse

```typescript
// Create base query
const baseQuery = QueryBuilder.create<Order>()
  .whereEqual('status', 'completed')
  .whereGreaterThan('total', 0);

// Extend for different uses
const recentOrders = baseQuery
  .whereGreaterThan('createdAt', lastWeek)
  .orderByDesc('createdAt')
  .build();

const highValueOrders = baseQuery
  .whereGreaterThan('total', 1000)
  .orderByDesc('total')
  .build();
```

### Dynamic Query Building

```typescript
function buildSearchQuery(filters: SearchFilters) {
  let query = QueryBuilder.create<Product>();

  if (filters.category) {
    query = query.whereEqual('category', filters.category);
  }

  if (filters.minPrice) {
    query = query.whereGreaterThan('price', filters.minPrice);
  }

  if (filters.maxPrice) {
    query = query.whereLessThan('price', filters.maxPrice);
  }

  if (filters.searchTerm) {
    query = query.whereContains('name', filters.searchTerm);
  }

  return query
    .orderBy(filters.sortBy || 'relevance', filters.sortOrder || 'desc')
    .limit(filters.pageSize || 20)
    .offset((filters.page || 0) * (filters.pageSize || 20))
    .build();
}
```

### Aggregation Pipelines

```typescript
// Multi-stage aggregation
async function getAnalytics(storage: Storage<Event>) {
  // Stage 1: Filter to date range
  const filtered = await storage.query(
    QueryBuilder.create<Event>()
      .whereGreaterThan('timestamp', startDate)
      .whereLessThan('timestamp', endDate)
      .build()
  );

  // Stage 2: Group and aggregate
  const aggregated = await storage.query(
    QueryBuilder.create<Event>()
      .groupBy('eventType', 'userId')
      .count('event_count')
      .build()
  );

  // Stage 3: Top users
  const topUsers = await storage.query(
    QueryBuilder.create<Event>()
      .groupBy('userId')
      .count('total_events')
      .having('total_events', '>', 100)
      .orderByDesc('total_events')
      .limit(10)
      .build()
  );

  return { filtered, aggregated, topUsers };
}
```

## Performance Tips

### Index Usage
- DuckDB automatically creates indexes for better performance
- Consider query patterns when designing data structures

### Query Optimization
- Filter early to reduce dataset size
- Use specific operators (equals vs contains)
- Limit results when possible
- Consider pagination for large datasets

### Caching Strategies
```typescript
// Cache frequently used queries
const cache = new Map<string, QueryResult<T>>();

async function cachedQuery<T>(
  query: Query<T>,
  storage: Storage<T>
): Promise<QueryResult<T>> {
  const key = JSON.stringify(query);

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const result = await storage.query(query);
  cache.set(key, result);

  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);

  return result;
}
```

## Error Handling

```typescript
import { QueryError, QueryErrorCode } from 'corticai';

try {
  const results = await storage.query(query);

  if (results.errors && results.errors.length > 0) {
    // Handle non-fatal errors
    results.errors.forEach(error => {
      console.warn(`Query warning: ${error.message}`);
    });
  }

  // Process results
  processResults(results.data);
} catch (error) {
  if (error instanceof QueryError) {
    switch (error.code) {
      case QueryErrorCode.INVALID_QUERY:
        console.error('Invalid query structure');
        break;
      case QueryErrorCode.UNSUPPORTED_OPERATION:
        console.error('Operation not supported by storage adapter');
        break;
      case QueryErrorCode.EXECUTION_FAILED:
        console.error('Query execution failed:', error.message);
        break;
    }
  }
  throw error;
}
```

## Testing Queries

```typescript
import { MemoryStorageAdapter } from 'corticai';

describe('Query Tests', () => {
  let storage: Storage<User>;

  beforeEach(() => {
    storage = new MemoryStorageAdapter<User>();
    // Add test data
  });

  it('should filter active users', async () => {
    const query = QueryBuilder.create<User>()
      .whereEqual('active', true)
      .build();

    const results = await storage.query(query);

    expect(results.data).toHaveLength(5);
    expect(results.data.every(u => u.active)).toBe(true);
  });
});
```