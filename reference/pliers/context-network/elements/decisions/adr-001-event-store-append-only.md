# ADR-001: Event Store as Append-Only Log

## Status
Implemented

## Context
The Event Engine needs a reliable way to store events that maintains history, supports replay, and ensures data integrity.

## Decision
Implement the Event Store using an append-only log pattern where events are only added, never modified or deleted.

## Rationale
- **Immutability**: Events represent facts that happened; they shouldn't change
- **Audit Trail**: Complete history is preserved
- **Replay Capability**: Can reconstruct state from any point
- **Simplicity**: No complex update logic needed
- **Concurrency**: Append operations don't conflict

## Consequences

### Positive
- Strong consistency guarantees
- Natural audit log
- Time-travel debugging possible
- Simple disaster recovery
- Cache-friendly read patterns

### Negative
- Storage grows indefinitely without compaction
- Query performance degrades with volume
- Requires indexing strategy for large datasets
- Memory usage increases over time

## Implementation Details
```typescript
class EventStore {
  private events: StoredEvent[] = [];
  private sequence = 0;

  async append(event: Event): Promise<StoredEvent> {
    const storedEvent = {
      ...event,
      sequence: ++this.sequence,
      timestamp: new Date()
    };
    this.events.push(storedEvent);
    return storedEvent;
  }
}
```

## Mitigation Strategies
- Implement event compaction for old events
- Add indexing for common query patterns
- Use streaming for large result sets
- Consider archival for historical events

## Related
- [[../architecture/event-sourcing-pattern.md]]
- [[../../backlog/tasks/IMPL-004.md]]
- [[../../backlog/tasks/PERF-002.md]]