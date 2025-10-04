# PERF-002: Add Event Store Indexing and Cleanup

## Metadata
- **Status:** ready
- **Type:** performance
- **Epic:** performance-optimization
- **Priority:** high
- **Size:** medium
- **Created:** 2025-09-23
- **Updated:** 2025-09-23

## Description
The Event Store uses linear search O(n) for queries which will degrade performance with large event volumes. Additionally, events accumulate indefinitely causing memory issues. Need to add indexing and retention management.

## Acceptance Criteria
- [ ] Implement multi-level indexing:
  - Primary: Sequence number → Event (Map)
  - Aggregate: AggregateID → Set<SequenceNumber>
  - Type: EventType → Set<SequenceNumber>
  - Timestamp: Hour bucket → Set<SequenceNumber>
  - Composite: AggregateID+Type → Set<SequenceNumber>
- [ ] Optimize query methods:
  - `getEvents(aggregateId)` - O(1) index lookup
  - `getEventsByType(type)` - O(1) index lookup
  - `getEventsInRange(start, end)` - O(log n) using timestamp index
  - `queryEvents(criteria)` - Use best available index
- [ ] Implement retention management:
  - Configurable retention: 7, 30, 90, 365 days
  - Soft delete with tombstones
  - Batch cleanup every hour
  - Archive to cold storage option
- [ ] Add monitoring and metrics:
  - Index size and memory usage
  - Query performance (p50, p95, p99)
  - Hit rate per index
  - Cleanup effectiveness
- [ ] Performance targets:
  - Support 1M events in memory
  - Query latency < 1ms for indexed lookups
  - Cleanup overhead < 5% CPU

## Technical Notes
- Use Map-based indexes for O(1) lookups
- Consider using B-tree for range queries
- Implement lazy deletion with periodic cleanup
- Add metrics for index hit rates
- Consider using WeakMap for memory efficiency

## Dependencies
- IMPL-004: Event Engine Foundation (completed)

## Performance Impact
- **Current**: O(n) searches, unbounded memory growth
- **Target**: O(1) lookups for indexed queries, bounded memory usage

## Testing Strategy
- Performance benchmarks:
  - Insert 1M events, measure throughput
  - Query performance with 100K, 1M, 10M events
  - Memory usage growth curve
  - Index rebuild time after crash
- Correctness tests:
  - Index consistency after concurrent writes
  - No events lost during cleanup
  - Query results match linear scan
  - Tombstone handling
- Stress tests:
  - Sustained 10K events/second for 1 hour
  - Memory stays under 1GB limit
  - Cleanup during high load
  - Index corruption recovery
- Edge cases:
  - Empty event store
  - Single event
  - All events same aggregate
  - All events same type
  - Clock skew handling

## Implementation Notes
```typescript
class IndexedEventStore extends EventStore {
  private aggregateIndex = new Map<string, Set<number>>();
  private typeIndex = new Map<string, Set<number>>();
  private sequenceMap = new Map<number, StoredEvent>();

  protected async persistEvent(event: Event): Promise<StoredEvent> {
    const stored = await super.persistEvent(event);

    // Update indexes
    this.updateIndexes(stored);
    this.sequenceMap.set(stored.sequence, stored);

    // Trigger cleanup if needed
    if (this.sequenceMap.size > this.config.maxEvents) {
      this.cleanup();
    }

    return stored;
  }

  private cleanup(): void {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 86400000);
    // Remove old events and update indexes
  }
}
```

## Implementation Approach
```typescript
interface EventIndexes {
  bySequence: Map<number, StoredEvent>;
  byAggregate: Map<string, Set<number>>;
  byType: Map<string, Set<number>>;
  byHour: Map<number, Set<number>>; // timestamp / 3600000
  byAggregateType: Map<string, Set<number>>; // "aggregateId:eventType"
}

class IndexedEventStore extends EventStore {
  private indexes: EventIndexes;
  private config = {
    maxEvents: 1000000,
    retentionDays: 30,
    cleanupInterval: 3600000, // 1 hour
    archivePath: process.env.EVENT_ARCHIVE_PATH
  };
  private metrics = {
    totalEvents: 0,
    indexHits: new Map<string, number>(),
    queryLatencies: [],
    lastCleanup: Date.now()
  };

  constructor() {
    super();
    this.indexes = this.initializeIndexes();
    this.scheduleCleanup();
  }

  async append(event: Event): Promise<StoredEvent> {
    const stored = await super.append(event);

    // Update all indexes atomically
    this.indexes.bySequence.set(stored.sequence, stored);

    this.addToSetIndex(this.indexes.byAggregate, stored.aggregateId, stored.sequence);
    this.addToSetIndex(this.indexes.byType, stored.type, stored.sequence);

    const hourBucket = Math.floor(stored.timestamp.getTime() / 3600000);
    this.addToSetIndex(this.indexes.byHour, hourBucket.toString(), stored.sequence);

    const compositeKey = `${stored.aggregateId}:${stored.type}`;
    this.addToSetIndex(this.indexes.byAggregateType, compositeKey, stored.sequence);

    this.metrics.totalEvents++;
    return stored;
  }

  async getEventsByAggregate(aggregateId: string): Promise<StoredEvent[]> {
    const start = performance.now();
    const sequences = this.indexes.byAggregate.get(aggregateId) || new Set();
    const events = Array.from(sequences)
      .map(seq => this.indexes.bySequence.get(seq))
      .filter(Boolean) as StoredEvent[];

    this.recordMetrics('byAggregate', performance.now() - start);
    return events.sort((a, b) => a.sequence - b.sequence);
  }

  private async cleanup(): Promise<void> {
    const cutoff = Date.now() - (this.config.retentionDays * 86400000);
    const toDelete = new Set<number>();

    // Find events to delete
    for (const [seq, event] of this.indexes.bySequence) {
      if (event.timestamp.getTime() < cutoff) {
        toDelete.add(seq);
      }
    }

    // Archive before deletion if configured
    if (this.config.archivePath && toDelete.size > 0) {
      await this.archiveEvents(toDelete);
    }

    // Remove from all indexes
    for (const seq of toDelete) {
      const event = this.indexes.bySequence.get(seq);
      if (event) {
        this.indexes.bySequence.delete(seq);
        this.removeFromIndexes(event);
      }
    }

    logger.info('Event cleanup completed', {
      deleted: toDelete.size,
      remaining: this.indexes.bySequence.size
    });
  }
}
```

## Branch Naming
`task/PERF-002-event-store-indexing`

## Effort Estimate
- Implementation: 8-10 hours
- Testing: 4-5 hours
- Performance benchmarking: 2-3 hours
- Documentation: 1 hour