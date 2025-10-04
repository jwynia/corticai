# REFACTOR-004: Add Structured Logging and Monitoring

## Metadata
- **Status:** ready
- **Type:** refactor
- **Epic:** observability
- **Priority:** medium
- **Size:** medium
- **Created:** 2025-09-23
- **Updated:** 2025-09-23

## Description
The Event Engine uses console.log for logging and lacks structured logging, metrics collection, and health checks. This makes production debugging and monitoring difficult.

## Acceptance Criteria
- [ ] Replace console.log with structured logger (winston/pino)
- [ ] Add correlation IDs to all log entries
- [ ] Implement metrics collection (Prometheus format)
- [ ] Add health check endpoints
- [ ] Add performance timing to critical paths
- [ ] Create logging configuration
- [ ] Add log levels and filtering
- [ ] Document logging standards

## Technical Notes
- Consider using pino for performance
- Use OpenTelemetry for distributed tracing
- Add metrics for event processing time, queue sizes, error rates
- Implement /health and /metrics endpoints
- Use structured JSON logging

## Dependencies
- IMPL-004: Event Engine Foundation (completed)
- Logging library selection

## Testing Strategy
- Test log output format
- Test metric collection
- Test health check responses
- Test performance impact of logging
- Test log filtering by level

## Implementation Notes
```typescript
import pino from 'pino';

class EventEngineWithLogging extends EventEngine {
  private logger: pino.Logger;
  private metrics: MetricsCollector;

  constructor(config: EventEngineConfig) {
    super(config);
    this.logger = pino({
      level: config.logLevel || 'info',
      formatters: {
        bindings: (bindings) => ({
          ...bindings,
          service: 'event-engine',
          version: '1.0.0'
        })
      }
    });
    this.metrics = new MetricsCollector();
  }

  async append(event: Event): Promise<StoredEvent> {
    const timer = this.metrics.startTimer('event.append.duration');

    this.logger.info({
      eventId: event.id,
      eventType: event.type,
      aggregateId: event.aggregateId,
      correlationId: event.metadata.correlationId
    }, 'Appending event');

    try {
      const result = await super.append(event);
      this.metrics.increment('event.append.success');
      return result;
    } catch (error) {
      this.metrics.increment('event.append.error');
      this.logger.error({ error, eventId: event.id }, 'Failed to append event');
      throw error;
    } finally {
      timer.end();
    }
  }
}
```

## Estimated Effort
- Implementation: 4-6 hours
- Testing: 2-3 hours
- Documentation: 1 hour