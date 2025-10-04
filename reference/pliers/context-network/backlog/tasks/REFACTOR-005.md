# REFACTOR-005: Strengthen Event Payload Type Safety

## Metadata
- **Status:** ready
- **Type:** refactor
- **Epic:** code-quality
- **Priority:** low
- **Size:** small
- **Created:** 2025-09-24
- **Updated:** 2025-09-24

## Description
Improve type safety for event data payloads in the Event Engine. Currently using a generic EventData type that allows any structure. Should provide stronger typing with schema validation.

## Acceptance Criteria
- [ ] Define event schema types for known events
- [ ] Add runtime validation using JSON Schema or Zod
- [ ] Create type guards for event types
- [ ] Update tests to use typed events
- [ ] Add schema versioning support
- [ ] Document event type definitions

## Technical Notes
Current loose typing:
```typescript
export type EventData = {
  [key: string]: string | number | boolean | null | EventData | EventData[];
};
```

Proposed strong typing:
```typescript
// Event type registry
interface EventTypeMap {
  'user.created': UserCreatedEvent;
  'order.placed': OrderPlacedEvent;
  'payment.processed': PaymentProcessedEvent;
}

// Type-safe event creation
function createEvent<T extends keyof EventTypeMap>(
  type: T,
  data: EventTypeMap[T]['data']
): Event<EventTypeMap[T]['data']>
```

## Implementation Approach
1. Define event schemas using Zod or JSON Schema
2. Generate TypeScript types from schemas
3. Add runtime validation in append/publish
4. Create migration path for existing events

## Dependencies
- IMPL-004: Event Engine Foundation (completed)
- Consider Zod or ajv for validation

## Benefits
- Compile-time type checking
- Runtime validation
- Better IDE autocomplete
- Self-documenting events
- Easier refactoring

## Estimated Effort
- Schema definition: 2 hours
- Implementation: 3-4 hours
- Migration: 2 hours

## Source
- PR review feedback on IMPL-004
- Type safety best practices