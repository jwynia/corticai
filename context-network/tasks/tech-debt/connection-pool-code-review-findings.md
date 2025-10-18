# Connection Pool - Technical Debt & Future Improvements

This document tracks deferred recommendations from the code review of the connection pool implementation.

## High Priority Tasks

### 1. Fix Connection-to-Pooled Mapping Race Condition

**Original Issue**: The `release()` methods in `DuckDBConnectionPool` and `KuzuConnectionPool` rely on accessing internal `_database` property via type casting, which is fragile and error-prone.

**Files Affected**:
- `app/src/storage/pool/DuckDBConnectionPool.ts:100-110`
- `app/src/storage/pool/KuzuConnectionPool.ts:101-112`

**Why Deferred**: High risk - requires architectural changes to the pool interface and affects multiple database implementations.

**Effort Estimate**: Medium (2-4 hours)

**Proposed Solution**:
Implement proper connection tracking using `WeakMap`:

```typescript
export class DuckDBConnectionPool implements ConnectionPool<DuckDBConnection> {
  private pool: GenericConnectionPool<DuckDBPooledConnection>
  private connectionMap = new WeakMap<DuckDBConnection, DuckDBPooledConnection>()

  private async createConnection(): Promise<DuckDBPooledConnection> {
    // ... creation logic ...
    const pooled = { connection, database: this.sharedDatabase }
    this.connectionMap.set(connection, pooled)
    return pooled
  }

  async release(connection: DuckDBConnection): Promise<void> {
    const pooled = this.connectionMap.get(connection)
    if (!pooled) {
      throw new Error('Attempted to release unknown connection')
    }
    await this.pool.release(pooled)
  }
}
```

**Acceptance Criteria**:
- [ ] No type casting or access to internal properties
- [ ] Proper error handling for unknown connections
- [ ] All existing tests pass
- [ ] Memory leaks prevented (WeakMap allows GC)

---

### 2. Resolve Generic Pool Interface Mismatch

**Original Issue**: `GenericConnectionPool` expects to release the exact same object type it gave out, but database-specific pools wrap connections differently, creating a type mismatch.

**Files Affected**:
- `app/src/storage/pool/GenericConnectionPool.ts:203`
- `app/src/storage/pool/DuckDBConnectionPool.ts`
- `app/src/storage/pool/KuzuConnectionPool.ts`

**Why Deferred**: High risk - requires redesigning the core pool interface which affects all implementations. Needs architectural review.

**Effort Estimate**: Large (4-8 hours)

**Proposed Solution**:
Redesign using a resource wrapper pattern:

```typescript
export interface PooledResource<T> {
  get(): T
  release(): Promise<void>
}

export interface ConnectionPool<T> {
  acquire(): Promise<PooledResource<T>>
  // Release is now handled by the PooledResource
  close(drainTimeout?: number): Promise<void>
  getStats(): PoolStats
  isClosed(): boolean
}

// Usage:
const pooledConn = await pool.acquire()
const conn = pooledConn.get()
// ... use connection ...
await pooledConn.release()
```

**Acceptance Criteria**:
- [ ] Clean interface with no type mismatches
- [ ] Prevents accidental double-release
- [ ] All database adapters updated
- [ ] Documentation updated
- [ ] Migration guide for existing code
- [ ] All tests pass

**Dependencies**: Should be done after task #1 (connection mapping fix)

---

## Medium Priority Tasks

### 3. Simplify Mutex Implementation

**Original Issue**: The mutex using chained promises is complex and hard to maintain.

**Files Affected**:
- `app/src/storage/pool/GenericConnectionPool.ts:165-198`

**Why Deferred**: Medium risk - while it works, refactoring concurrency control requires careful testing. Should use established patterns.

**Effort Estimate**: Medium (2-3 hours)

**Proposed Solution**:
Use a dedicated async-mutex library:

```typescript
import { Mutex } from 'async-mutex'

export class GenericConnectionPool<T> {
  private readonly creationMutex = new Mutex()

  private async createConnectionWithLock(): Promise<T> {
    const release = await this.creationMutex.acquire()
    try {
      if (this.connections.length >= this.config.maxConnections) {
        return this.waitForConnection()
      }
      return await this.createConnection()
    } finally {
      release()
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Add `async-mutex` dependency
- [ ] Replace custom mutex with library
- [ ] Verify no race conditions under load
- [ ] Concurrent acquisition tests pass
- [ ] Performance benchmarks show no regression

---

### 4. Add Connection Error Tracking

**Original Issue**: No tracking of error counts or consecutive failures per connection.

**Files Affected**:
- `app/src/storage/pool/GenericConnectionPool.ts:25-30`

**Why Deferred**: Low risk, but adds complexity. Needs design decisions about circuit-breaking thresholds.

**Effort Estimate**: Medium (2-3 hours)

**Proposed Solution**:

```typescript
interface PooledConnection<T> {
  connection: T
  createdAt: number
  lastUsed: number
  inUse: boolean
  errorCount: number
  lastError?: Error
  consecutiveErrors: number
}

// In validation logic:
private async isConnectionHealthy(pooledConn: PooledConnection<T>): Promise<boolean> {
  try {
    const isHealthy = await this.validator(pooledConn.connection)
    if (isHealthy) {
      pooledConn.consecutiveErrors = 0
      return true
    } else {
      pooledConn.consecutiveErrors++
      return false
    }
  } catch (error) {
    pooledConn.errorCount++
    pooledConn.consecutiveErrors++
    pooledConn.lastError = error as Error

    // Circuit breaker: destroy after 3 consecutive errors
    if (pooledConn.consecutiveErrors >= 3) {
      await this.destroyConnection(pooledConn)
    }
    return false
  }
}
```

**Acceptance Criteria**:
- [ ] Track error metrics per connection
- [ ] Implement circuit-breaking threshold (configurable)
- [ ] Include error stats in pool statistics
- [ ] Add tests for error tracking behavior
- [ ] Document circuit-breaking behavior

---

### 5. Implement Typed Error Hierarchy

**Original Issue**: Generic `Error` objects are thrown instead of specific error types.

**Files Affected**:
- `app/src/storage/pool/GenericConnectionPool.ts` (multiple locations)
- `app/src/storage/pool/DuckDBConnectionPool.ts`
- `app/src/storage/pool/KuzuConnectionPool.ts`

**Why Deferred**: Medium risk - changing error types could break existing error handling. Needs coordination with consumers.

**Effort Estimate**: Large (4-6 hours including all implementations)

**Proposed Solution**:

```typescript
// Create error types
export enum ConnectionPoolErrorCode {
  ACQUISITION_TIMEOUT = 'ACQUISITION_TIMEOUT',
  POOL_CLOSED = 'POOL_CLOSED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNKNOWN_CONNECTION = 'UNKNOWN_CONNECTION'
}

export class ConnectionPoolError extends Error {
  constructor(
    message: string,
    public readonly code: ConnectionPoolErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ConnectionPoolError'
  }
}

// Usage:
throw new ConnectionPoolError(
  'Connection acquisition timeout',
  ConnectionPoolErrorCode.ACQUISITION_TIMEOUT,
  { acquireTimeout: this.config.acquireTimeout, waitingRequests: this.waitingQueue.length }
)
```

**Acceptance Criteria**:
- [ ] Define all error types and codes
- [ ] Replace all generic Error throws
- [ ] Update error handling in consumers
- [ ] Add error type tests
- [ ] Document error codes and handling

---

## Low Priority Tasks

### 6. Improve Debug Logging Structure

**Original Issue**: Debug logging uses inconsistent string formatting.

**Files Affected**:
- Multiple files with `if (this.config.debug)` blocks

**Why Deferred**: Low impact - nice to have but doesn't affect functionality.

**Effort Estimate**: Small (1-2 hours)

**Proposed Solution**:

```typescript
this.logger.debug('Running health check', {
  component: 'ConnectionPool',
  idleConnections: this.connections.filter(c => !c.inUse).length,
  activeConnections: this.connections.filter(c => c.inUse).length,
  totalConnections: this.connections.length
})
```

**Acceptance Criteria**:
- [ ] Consistent structured logging format
- [ ] All debug messages include relevant context
- [ ] Logger interface supports structured data
- [ ] Documentation on debug output format

---

## Implementation Notes

### Priority Order (Recommended):
1. **Fix Connection Mapping** (Task #1) - Foundational fix needed first
2. **Resolve Interface Mismatch** (Task #2) - Builds on #1, major architectural improvement
3. **Simplify Mutex** (Task #3) - Improves maintainability
4. **Add Error Tracking** (Task #4) - Enhances reliability
5. **Typed Errors** (Task #5) - Improves error handling
6. **Structured Logging** (Task #6) - Polish

### Testing Requirements:
All changes must include:
- Unit tests for new behavior
- Integration tests with real database connections
- Performance benchmarks (no regression > 5%)
- Concurrent load testing

### Performance Considerations:
- WeakMap has negligible overhead
- Mutex library should be benchmarked vs. current implementation
- Error tracking adds minimal overhead per operation
- Structured logging may impact debug mode performance (acceptable)

### Breaking Changes:
- Task #2 (Interface Redesign) will require migration of existing code
- Task #5 (Typed Errors) may require updating error handlers
- Both should be done in a major version bump

---

## Related Documentation
- Code Review: See code review output from 2025-10-17
- Test Coverage: `app/tests/unit/storage/GenericConnectionPool.test.ts`
- Implementation: `app/src/storage/pool/`

---

*Last Updated: 2025-10-17*
*Review Status: Pending*
