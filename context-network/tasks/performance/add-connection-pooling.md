# Task: Add Connection Pooling to KuzuStorageAdapter

## Context
The current KuzuStorageAdapter implementation uses a single connection to the Kuzu database. For production use with multiple concurrent operations, connection pooling would improve performance and reliability.

## Current State
- Single connection created in `initializeDatabase()`
- No connection reuse or pooling
- Potential bottleneck for concurrent operations

## Requirements

### Acceptance Criteria
- [ ] Implement connection pool with configurable size (min/max connections)
- [ ] Handle connection lifecycle (creation, validation, disposal)
- [ ] Implement connection checkout/checkin pattern
- [ ] Add connection health checks
- [ ] Provide pool statistics (active, idle, waiting)
- [ ] Graceful handling of pool exhaustion
- [ ] Proper cleanup on shutdown

### Implementation Approach

```typescript
interface ConnectionPoolConfig {
  minConnections: number  // Default: 2
  maxConnections: number  // Default: 10
  acquireTimeout: number  // Default: 30000ms
  idleTimeout: number     // Default: 300000ms
  validateOnBorrow: boolean // Default: true
}

class KuzuConnectionPool {
  private available: Connection[]
  private inUse: Set<Connection>

  async acquire(): Promise<Connection>
  async release(conn: Connection): Promise<void>
  async drain(): Promise<void>
}
```

### Benefits
- Improved concurrent operation performance
- Better resource utilization
- Reduced connection overhead
- Enhanced reliability

## Dependencies
- Need to verify Kuzu supports multiple connections
- May require connection validation strategy

## Effort Estimate
**Medium** (4-6 hours)
- Design pool implementation
- Handle edge cases (timeouts, failures)
- Test concurrent scenarios
- Update configuration

## Priority
**Low** - Single connection works for current usage patterns. Becomes important when scaling.

## Performance Targets
- Connection acquisition < 10ms when pool has available connections
- Support 100+ concurrent operations
- Zero connection leaks

## Testing Requirements
- Unit tests for pool operations
- Concurrent operation tests
- Connection leak detection
- Pool exhaustion scenarios

## Notes
Consider using an existing connection pool library if one is compatible with Kuzu connections.