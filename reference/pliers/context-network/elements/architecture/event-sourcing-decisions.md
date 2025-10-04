# Event Sourcing Architecture Decisions

## Classification
- **Domain**: Architecture
- **Stability**: Evolving
- **Abstraction**: Design Decisions
- **Confidence**: Medium (initial implementation, will evolve)

## Core Design Decisions

### 1. In-Memory First, Database Ready

**Decision**: Start with in-memory event storage with clear abstraction for database
**Rationale**:
- Faster initial development and testing
- Clear separation of concerns
- Easy migration path to PostgreSQL

**Trade-offs**:
- ✅ Simplified testing
- ✅ No database setup required initially
- ❌ Not production-ready without persistence
- ❌ Memory limitations for large datasets

### 2. Batching Strategy

**Decision**: Batch events with configurable size and flush interval
**Rationale**:
- Reduces I/O operations
- Improves throughput
- Configurable for different workloads

**Implementation**:
- Default batch size: 100 events
- Default flush interval: 1000ms
- Automatic flush on batch full

### 3. Plugin Hook Architecture

**Decision**: Hook-based plugin system vs. inheritance or composition
**Rationale**:
- Clear extension points
- Non-invasive modifications
- Plugin isolation

**Hook Points Defined**:
- `before:event.store` - Pre-storage validation/enrichment
- `after:event.store` - Post-storage actions
- `before:event.publish` - Pre-publish filtering
- `after:event.publish` - Post-publish notifications

### 4. Event Versioning Strategy

**Decision**: Explicit version field per aggregate
**Rationale**:
- Optimistic concurrency control
- Clear event ordering
- Prevents version conflicts

**Conflict Resolution**:
- Reject events with version <= current
- Client must retry with correct version
- No automatic merging

### 5. Dead Letter Queue Design

**Decision**: In-process DLQ with configurable size limit
**Rationale**:
- Prevent event loss on handler failures
- Allow manual reprocessing
- Prevent memory exhaustion

**Configuration**:
- Max retries: 3 (configurable)
- Retry delay: Exponential backoff
- Max queue size: 1000 events (configurable)

## Security Considerations

### Deferred to Separate Tasks
1. **WebSocket Authentication** (SEC-004)
   - Complex integration with auth system
   - Requires token validation infrastructure

2. **Plugin Sandboxing** (SEC-005)
   - Needs research on VM/isolation approaches
   - Performance implications unknown

### Implemented Security
- Event data size validation (100KB limit)
- Metadata size validation (10KB limit)
- Port range validation for WebSocket

## Performance Characteristics

### Current Implementation
- O(n) searches without indexes
- In-memory storage only
- No cleanup/retention

### Future Optimizations (PERF-002)
- Index by aggregate ID and type
- Implement retention policies
- Add event compaction

## Migration Path to Production

1. **Phase 1**: Current in-memory implementation
2. **Phase 2**: Add PostgreSQL persistence layer
3. **Phase 3**: Add Redis caching layer
4. **Phase 4**: Implement event projections
5. **Phase 5**: Add event replay capabilities

## Critical Relationships
- **Depends on**: Database infrastructure (future)
- **Enables**: Audit trails, event replay, CQRS patterns
- **Conflicts with**: Traditional CRUD patterns

## Task Context
- **Decided during**: IMPL-004 Event Engine implementation
- **Relevance**: Foundation for event-driven architecture