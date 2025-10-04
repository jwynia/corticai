# Common Testing Patterns and Examples

## Purpose
This document provides practical testing patterns, templates, and real-world examples for common testing scenarios in the Pliers v3 platform, serving as a reference for developers and LLM agents.

## Classification
- **Domain:** Supporting Element
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Evolving

## Overview

Testing patterns provide reusable solutions to common testing challenges. This document catalogs proven patterns with complete examples that can be adapted for specific use cases. Each pattern includes context, implementation, and usage guidelines.

## Core Testing Patterns

### 1. Component Testing Pattern

**Use Case**: Testing individual components with their dependencies mocked.

```typescript
// Pattern: Component with Dependency Injection
describe('EventEngine', () => {
  let eventEngine: EventEngine;
  let mockEventStore: MockType<EventStore>;
  let mockEventPublisher: MockType<EventPublisher>;
  let mockLogger: MockType<Logger>;

  beforeEach(() => {
    mockEventStore = createMockEventStore();
    mockEventPublisher = createMockEventPublisher();
    mockLogger = createMockLogger();

    eventEngine = new EventEngine({
      eventStore: mockEventStore,
      eventPublisher: mockEventPublisher,
      logger: mockLogger
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('publishEvent', () => {
    it('should store event and notify subscribers', async () => {
      // Arrange
      const event = EventFactory.build({ type: 'form.created' });
      mockEventStore.appendEvents.mockResolvedValue(undefined);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      // Act
      await eventEngine.publishEvent(event);

      // Assert
      expect(mockEventStore.appendEvents).toHaveBeenCalledWith(
        event.aggregateId,
        expect.any(Number),
        [event]
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(event);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Event published',
        { eventId: event.id, type: event.type }
      );
    });
  });
});
```

### 2. Integration Testing Pattern

**Use Case**: Testing multiple components working together with real dependencies.

```typescript
// Pattern: Integration Test with Test Database
describe('EventEngine Integration', () => {
  let testDb: TestDatabase;
  let eventEngine: EventEngine;
  let realEventStore: PostgreSQLEventStore;

  beforeAll(async () => {
    testDb = await TestDatabase.create();
    realEventStore = new PostgreSQLEventStore(testDb.connectionString);
    eventEngine = new EventEngine({
      eventStore: realEventStore,
      eventPublisher: new InMemoryEventPublisher(),
      logger: new TestLogger()
    });
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  beforeEach(async () => {
    await testDb.truncateAllTables();
  });

  it('should persist events and allow querying across transaction boundaries', async () => {
    // Arrange
    const events = [
      EventFactory.build({ type: 'form.created', aggregateId: 'form-1' }),
      EventFactory.build({ type: 'form.updated', aggregateId: 'form-1' }),
      EventFactory.build({ type: 'submission.created', aggregateId: 'sub-1' })
    ];

    // Act
    for (const event of events) {
      await eventEngine.publishEvent(event);
    }

    // Assert
    const formEvents = await realEventStore.queryEvents({
      aggregateIds: ['form-1']
    });
    expect(formEvents.events).toHaveLength(2);
    expect(formEvents.events[0].type).toBe('form.created');
    expect(formEvents.events[1].type).toBe('form.updated');

    const allEvents = await realEventStore.queryEvents({});
    expect(allEvents.events).toHaveLength(3);
  });
});
```

### 3. Error Handling Pattern

**Use Case**: Testing various error conditions and recovery mechanisms.

```typescript
// Pattern: Comprehensive Error Testing
describe('EventEngine Error Handling', () => {
  let eventEngine: EventEngine;
  let mockEventStore: MockType<EventStore>;

  beforeEach(() => {
    mockEventStore = createMockEventStore();
    eventEngine = new EventEngine({ eventStore: mockEventStore });
  });

  describe('when event store fails', () => {
    it('should throw DatabaseError with original error context', async () => {
      // Arrange
      const event = EventFactory.build();
      const originalError = new Error('Connection timeout');
      mockEventStore.appendEvents.mockRejectedValue(originalError);

      // Act & Assert
      await expect(eventEngine.publishEvent(event))
        .rejects
        .toThrow(DatabaseError);

      try {
        await eventEngine.publishEvent(event);
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.message).toBe('Failed to store event');
        expect(error.originalError).toBe(originalError);
        expect(error.context).toMatchObject({
          eventId: event.id,
          aggregateId: event.aggregateId
        });
      }
    });

    it('should retry transient failures up to configured limit', async () => {
      // Arrange
      const event = EventFactory.build();
      mockEventStore.appendEvents
        .mockRejectedValueOnce(new TransientError('Temporary failure'))
        .mockRejectedValueOnce(new TransientError('Still failing'))
        .mockResolvedValueOnce(undefined);

      // Act
      await eventEngine.publishEvent(event);

      // Assert
      expect(mockEventStore.appendEvents).toHaveBeenCalledTimes(3);
    });

    it('should not retry permanent failures', async () => {
      // Arrange
      const event = EventFactory.build();
      const permanentError = new ValidationError('Invalid event schema');
      mockEventStore.appendEvents.mockRejectedValue(permanentError);

      // Act & Assert
      await expect(eventEngine.publishEvent(event))
        .rejects
        .toThrow(ValidationError);

      expect(mockEventStore.appendEvents).toHaveBeenCalledTimes(1);
    });
  });
});
```

### 4. Async Testing Pattern

**Use Case**: Testing asynchronous operations with proper timeout and concurrency handling.

```typescript
// Pattern: Async Operations with Timeout
describe('Async Event Processing', () => {
  it('should process events within timeout limit', async () => {
    const eventProcessor = new EventProcessor();
    const slowEvent = EventFactory.build({ type: 'slow.processing' });

    // Use fake timers to control time
    vi.useFakeTimers();

    const processingPromise = eventProcessor.process(slowEvent);

    // Advance time to trigger timeout
    vi.advanceTimersByTime(5000); // 5 seconds

    await expect(processingPromise)
      .rejects
      .toThrow(TimeoutError);

    vi.useRealTimers();
  });

  it('should handle concurrent event processing', async () => {
    const eventProcessor = new EventProcessor();
    const events = EventFactory.buildList(10);

    // Process all events concurrently
    const processingPromises = events.map(event =>
      eventProcessor.process(event)
    );

    const results = await Promise.allSettled(processingPromises);

    // All should succeed
    results.forEach(result => {
      expect(result.status).toBe('fulfilled');
    });

    // Verify processing order independence
    const processedEvents = await eventProcessor.getProcessedEvents();
    expect(processedEvents).toHaveLength(10);
  });
});
```

### 5. State Testing Pattern

**Use Case**: Testing stateful components and state transitions.

```typescript
// Pattern: State Machine Testing
describe('FormState', () => {
  let formState: FormState;

  beforeEach(() => {
    formState = new FormState('draft');
  });

  describe('state transitions', () => {
    it('should transition from draft to published when validated', () => {
      // Arrange
      const form = FormBuilder.create()
        .withValidation([{ field: 'name', type: 'required' }])
        .build();

      // Act
      formState.setForm(form);
      formState.validate();
      formState.publish();

      // Assert
      expect(formState.currentState).toBe('published');
      expect(formState.isPublished()).toBe(true);
    });

    it('should not transition to published without validation', () => {
      // Arrange
      const form = FormBuilder.create().build();
      formState.setForm(form);

      // Act & Assert
      expect(() => formState.publish())
        .toThrow(InvalidStateTransitionError);

      expect(formState.currentState).toBe('draft');
    });

    it('should track state history', () => {
      // Arrange & Act
      formState.validate();
      formState.publish();
      formState.archive();

      // Assert
      const history = formState.getStateHistory();
      expect(history).toEqual([
        { state: 'draft', timestamp: expect.any(Date) },
        { state: 'validated', timestamp: expect.any(Date) },
        { state: 'published', timestamp: expect.any(Date) },
        { state: 'archived', timestamp: expect.any(Date) }
      ]);
    });
  });
});
```

### 6. Data-Driven Testing Pattern

**Use Case**: Testing multiple scenarios with different data sets.

```typescript
// Pattern: Parameterized Tests
describe('ValidationEngine', () => {
  const validationTestCases = [
    {
      name: 'valid email addresses',
      field: 'email',
      validator: 'email',
      validInputs: [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'user123@subdomain.example.org'
      ],
      invalidInputs: [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@example.com'
      ]
    },
    {
      name: 'phone number validation',
      field: 'phone',
      validator: 'phone',
      validInputs: [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '15551234567'
      ],
      invalidInputs: [
        '123',
        'abc-def-ghij',
        '+1-555-123-456',
        '555-123-45678'
      ]
    }
  ];

  validationTestCases.forEach(({ name, field, validator, validInputs, invalidInputs }) => {
    describe(name, () => {
      const validationEngine = new ValidationEngine();

      validInputs.forEach(input => {
        it(`should accept "${input}" as valid`, () => {
          const result = validationEngine.validate(field, input, validator);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      invalidInputs.forEach(input => {
        it(`should reject "${input}" as invalid`, () => {
          const result = validationEngine.validate(field, input, validator);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(
            expect.stringContaining(`Invalid ${field}`)
          );
        });
      });
    });
  });
});
```

### 7. Mock Factory Pattern

**Use Case**: Creating consistent, reusable mocks across test suites.

```typescript
// Pattern: Comprehensive Mock Factory
export class MockFactory {
  static createEventStore(overrides: Partial<EventStore> = {}): MockType<EventStore> {
    const defaultBehaviors = {
      appendEvents: vi.fn().mockResolvedValue(undefined),
      readEvents: vi.fn().mockResolvedValue([]),
      readEventsByType: vi.fn().mockResolvedValue([]),
      queryEvents: vi.fn().mockResolvedValue({
        events: [],
        totalCount: 0,
        hasMore: false
      }),
      getAggregateMetadata: vi.fn().mockResolvedValue({
        aggregateId: 'test-aggregate',
        aggregateType: 'test',
        version: 1,
        firstEventTimestamp: new Date(),
        lastEventTimestamp: new Date(),
        eventCount: 0
      }),
      createSnapshot: vi.fn().mockResolvedValue(undefined),
      getLatestSnapshot: vi.fn().mockResolvedValue(null)
    };

    return {
      ...defaultBehaviors,
      ...overrides
    };
  }

  static createEventPublisher(overrides: Partial<EventPublisher> = {}): MockType<EventPublisher> {
    return {
      publish: vi.fn().mockResolvedValue(undefined),
      publishBatch: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockReturnValue({
        unsubscribe: vi.fn().mockResolvedValue(undefined)
      }),
      unsubscribeAll: vi.fn().mockResolvedValue(undefined),
      ...overrides
    };
  }

  static createFormEngine(overrides: Partial<FormEngine> = {}): MockType<FormEngine> {
    return {
      createForm: vi.fn().mockResolvedValue(FormFactory.build()),
      updateForm: vi.fn().mockResolvedValue(FormFactory.build()),
      deleteForm: vi.fn().mockResolvedValue(undefined),
      getForm: vi.fn().mockResolvedValue(FormFactory.build()),
      validateForm: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
      ...overrides
    };
  }

  // Scenario-specific mock configurations
  static createFailingEventStore(): MockType<EventStore> {
    return this.createEventStore({
      appendEvents: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      readEvents: vi.fn().mockRejectedValue(new Error('Query timeout'))
    });
  }

  static createEventStoreWithData(events: BaseEvent[]): MockType<EventStore> {
    return this.createEventStore({
      readEvents: vi.fn().mockResolvedValue(events),
      queryEvents: vi.fn().mockResolvedValue({
        events,
        totalCount: events.length,
        hasMore: false
      })
    });
  }
}

// Usage in tests
describe('EventEngine with Mock Factory', () => {
  it('should handle database failures gracefully', async () => {
    const failingEventStore = MockFactory.createFailingEventStore();
    const eventEngine = new EventEngine({
      eventStore: failingEventStore,
      eventPublisher: MockFactory.createEventPublisher()
    });

    const event = EventFactory.build();

    await expect(eventEngine.publishEvent(event))
      .rejects
      .toThrow('Database connection failed');
  });
});
```

### 8. Test Builder Pattern

**Use Case**: Building complex test scenarios with fluent interface.

```typescript
// Pattern: Test Scenario Builder
export class EventEngineTestBuilder {
  private eventStore: MockType<EventStore>;
  private eventPublisher: MockType<EventPublisher>;
  private logger: MockType<Logger>;
  private config: Partial<EventEngineConfig>;

  constructor() {
    this.eventStore = MockFactory.createEventStore();
    this.eventPublisher = MockFactory.createEventPublisher();
    this.logger = MockFactory.createLogger();
    this.config = {};
  }

  static create(): EventEngineTestBuilder {
    return new EventEngineTestBuilder();
  }

  withEventStoreFailure(error: Error): EventEngineTestBuilder {
    this.eventStore.appendEvents.mockRejectedValue(error);
    return this;
  }

  withEventStoreDelay(delayMs: number): EventEngineTestBuilder {
    this.eventStore.appendEvents.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, delayMs))
    );
    return this;
  }

  withPublisherFailure(error: Error): EventEngineTestBuilder {
    this.eventPublisher.publish.mockRejectedValue(error);
    return this;
  }

  withExistingEvents(events: BaseEvent[]): EventEngineTestBuilder {
    this.eventStore.readEvents.mockResolvedValue(events);
    return this;
  }

  withRetryConfig(maxRetries: number, backoffMs: number): EventEngineTestBuilder {
    this.config.retry = {
      maxAttempts: maxRetries,
      backoffStrategy: 'fixed',
      baseDelay: backoffMs,
      maxDelay: backoffMs * 10,
      jitter: false
    };
    return this;
  }

  withLoggingEnabled(): EventEngineTestBuilder {
    this.config.logging = { enabled: true, level: 'debug' };
    return this;
  }

  build(): {
    eventEngine: EventEngine;
    mocks: {
      eventStore: MockType<EventStore>;
      eventPublisher: MockType<EventPublisher>;
      logger: MockType<Logger>;
    };
  } {
    const eventEngine = new EventEngine({
      eventStore: this.eventStore,
      eventPublisher: this.eventPublisher,
      logger: this.logger,
      config: this.config
    });

    return {
      eventEngine,
      mocks: {
        eventStore: this.eventStore,
        eventPublisher: this.eventPublisher,
        logger: this.logger
      }
    };
  }
}

// Usage
describe('EventEngine Retry Logic', () => {
  it('should retry failed operations with exponential backoff', async () => {
    const { eventEngine, mocks } = EventEngineTestBuilder
      .create()
      .withEventStoreFailure(new TransientError('Temporary failure'))
      .withRetryConfig(3, 100)
      .withLoggingEnabled()
      .build();

    // Configure partial success on third try
    mocks.eventStore.appendEvents
      .mockRejectedValueOnce(new TransientError('Failure 1'))
      .mockRejectedValueOnce(new TransientError('Failure 2'))
      .mockResolvedValueOnce(undefined);

    const event = EventFactory.build();

    await eventEngine.publishEvent(event);

    expect(mocks.eventStore.appendEvents).toHaveBeenCalledTimes(3);
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      'Event store operation failed, retrying',
      expect.objectContaining({ attempt: 1 })
    );
  });
});
```

### 9. Snapshot Testing Pattern

**Use Case**: Testing complex object serialization and configuration generation.

```typescript
// Pattern: Snapshot Testing with Dynamic Values
describe('FormConfigurationGenerator', () => {
  beforeEach(() => {
    // Mock dynamic values for consistent snapshots
    vi.spyOn(Date, 'now').mockReturnValue(1642896000000); // 2022-01-22T20:00:00.000Z
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate complete configuration for contact form', () => {
    const form = FormBuilder
      .create()
      .withId('contact-form')
      .withName('Contact Form')
      .withTextField('name', true)
      .withTextField('email', true)
      .withTextField('message')
      .withValidation([
        { field: 'email', type: 'email' },
        { field: 'name', type: 'minLength', value: 2 }
      ])
      .build();

    const config = FormConfigurationGenerator.generate(form);

    // Snapshot the entire configuration
    expect(config).toMatchSnapshot();

    // Also test specific important values inline
    expect(config.formId).toMatchInlineSnapshot('"contact-form"');
    expect(config.validation.rules).toHaveLength(2);
    expect(config.fields).toHaveLength(3);
  });

  it('should generate different configuration for survey form', () => {
    const form = FormBuilder
      .create()
      .withId('survey-form')
      .withName('Customer Survey')
      .withMultipleChoiceField('rating', ['1', '2', '3', '4', '5'])
      .withTextAreaField('feedback')
      .withConditionalLogic()
      .build();

    const config = FormConfigurationGenerator.generate(form);

    expect(config).toMatchSnapshot();
  });

  describe('snapshot with data normalization', () => {
    it('should normalize timestamps in generated config', () => {
      const form = FormBuilder.create().build();
      const config = FormConfigurationGenerator.generate(form);

      // Normalize dynamic values for snapshot consistency
      const normalizedConfig = {
        ...config,
        generatedAt: '[TIMESTAMP]',
        version: '[VERSION]',
        fields: config.fields.map(field => ({
          ...field,
          id: field.id.replace(/[0-9]+$/, '[ID]') // Replace numeric IDs
        }))
      };

      expect(normalizedConfig).toMatchSnapshot();
    });
  });
});
```

### 10. Performance Testing Pattern

**Use Case**: Testing performance characteristics and resource usage.

```typescript
// Pattern: Performance and Resource Testing
describe('EventEngine Performance', () => {
  const PERFORMANCE_THRESHOLDS = {
    singleEventPublish: 50, // ms
    batchEventPublish: 500, // ms
    eventQuery: 200, // ms
    memoryIncrease: 10 * 1024 * 1024 // 10MB
  };

  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
  });

  describe('publish performance', () => {
    it('should publish single event within performance threshold', async () => {
      const eventEngine = new EventEngine();
      const event = EventFactory.build();

      const measurement = await performanceMonitor.measure(async () => {
        await eventEngine.publishEvent(event);
      });

      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleEventPublish);
      expect(measurement.memoryDelta).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryIncrease);
    });

    it('should handle batch processing efficiently', async () => {
      const eventEngine = new EventEngine();
      const events = EventFactory.buildList(1000);

      const measurement = await performanceMonitor.measure(async () => {
        await eventEngine.publishBatch(events);
      });

      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batchEventPublish);

      // Calculate throughput
      const eventsPerSecond = events.length / (measurement.duration / 1000);
      expect(eventsPerSecond).toBeGreaterThan(100); // Minimum 100 events/second
    });
  });

  describe('memory usage', () => {
    it('should not leak memory during continuous processing', async () => {
      const eventEngine = new EventEngine();
      const initialMemory = process.memoryUsage().heapUsed;

      // Process events in batches
      for (let batch = 0; batch < 10; batch++) {
        const events = EventFactory.buildList(100);
        await eventEngine.publishBatch(events);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryIncrease);
    });
  });

  describe('concurrent access', () => {
    it('should maintain performance under concurrent load', async () => {
      const eventEngine = new EventEngine();
      const concurrentOperations = 50;

      const startTime = performance.now();

      // Create concurrent publish operations
      const publishPromises = Array.from(
        { length: concurrentOperations },
        () => eventEngine.publishEvent(EventFactory.build())
      );

      await Promise.all(publishPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All operations should complete within reasonable time
      expect(totalTime).toBeLessThan(concurrentOperations * 10); // 10ms per operation max

      // No operations should have failed
      const results = await Promise.allSettled(publishPromises);
      const failures = results.filter(result => result.status === 'rejected');
      expect(failures).toHaveLength(0);
    });
  });
});

// Performance Monitor Utility
class PerformanceMonitor {
  async measure<T>(operation: () => Promise<T>): Promise<{
    result: T;
    duration: number;
    memoryDelta: number;
  }> {
    const initialMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const result = await operation();

    const endTime = performance.now();
    const finalMemory = process.memoryUsage().heapUsed;

    return {
      result,
      duration: endTime - startTime,
      memoryDelta: finalMemory - initialMemory
    };
  }
}
```

## Event Engine Specific Patterns

### Event Sourcing Test Pattern

```typescript
// Pattern: Event Sourcing Validation
describe('Event Sourcing', () => {
  it('should reconstruct aggregate state from event stream', async () => {
    const events = [
      EventFactory.build({
        type: 'form.created',
        sequenceNumber: 1,
        payload: { name: 'Contact Form', fields: [] }
      }),
      EventFactory.build({
        type: 'form.field.added',
        sequenceNumber: 2,
        payload: { fieldId: 'name', type: 'text', required: true }
      }),
      EventFactory.build({
        type: 'form.field.added',
        sequenceNumber: 3,
        payload: { fieldId: 'email', type: 'email', required: true }
      }),
      EventFactory.build({
        type: 'form.published',
        sequenceNumber: 4,
        payload: { publishedAt: new Date(), version: 1 }
      })
    ];

    const eventStore = MockFactory.createEventStoreWithData(events);
    const aggregateRepository = new AggregateRepository(eventStore);

    const form = await aggregateRepository.getById('form-123', FormAggregate);

    expect(form.name).toBe('Contact Form');
    expect(form.fields).toHaveLength(2);
    expect(form.isPublished).toBe(true);
    expect(form.version).toBe(4); // Should match last sequence number
  });
});
```

### Plugin Testing Pattern

```typescript
// Pattern: Plugin System Testing
describe('Plugin Processing', () => {
  let pluginEngine: PluginEngine;
  let testPlugin: TestPlugin;

  beforeEach(() => {
    testPlugin = new TestPlugin();
    pluginEngine = new PluginEngine();
  });

  it('should execute plugins in priority order', async () => {
    const executionOrder: string[] = [];

    const highPriorityPlugin = new TestPlugin({
      id: 'high-priority',
      priority: 100,
      process: vi.fn().mockImplementation(async () => {
        executionOrder.push('high');
        return { success: true };
      })
    });

    const lowPriorityPlugin = new TestPlugin({
      id: 'low-priority',
      priority: 10,
      process: vi.fn().mockImplementation(async () => {
        executionOrder.push('low');
        return { success: true };
      })
    });

    await pluginEngine.registerPlugin(lowPriorityPlugin, ['form.created']);
    await pluginEngine.registerPlugin(highPriorityPlugin, ['form.created']);

    const event = EventFactory.build({ type: 'form.created' });
    await pluginEngine.processEvent(event);

    expect(executionOrder).toEqual(['high', 'low']);
  });

  it('should handle plugin failures without affecting other plugins', async () => {
    const workingPlugin = new TestPlugin({
      id: 'working-plugin',
      process: vi.fn().mockResolvedValue({ success: true })
    });

    const failingPlugin = new TestPlugin({
      id: 'failing-plugin',
      process: vi.fn().mockRejectedValue(new Error('Plugin error'))
    });

    await pluginEngine.registerPlugin(workingPlugin, ['form.created']);
    await pluginEngine.registerPlugin(failingPlugin, ['form.created']);

    const event = EventFactory.build({ type: 'form.created' });
    const results = await pluginEngine.processEvent(event);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe('Plugin error');
  });
});

class TestPlugin implements EventPlugin {
  constructor(private options: Partial<EventPlugin> = {}) {}

  get id() { return this.options.id || 'test-plugin'; }
  get name() { return this.options.name || 'Test Plugin'; }
  get version() { return this.options.version || '1.0.0'; }
  get priority() { return this.options.priority || 50; }

  async process(event: BaseEvent, context: PluginContext): Promise<PluginResult> {
    if (this.options.process) {
      return this.options.process(event, context);
    }

    return {
      pluginId: this.id,
      success: true,
      metadata: { processedAt: new Date() }
    };
  }
}
```

### WebSocket Testing Pattern

```typescript
// Pattern: WebSocket Event Streaming
describe('WebSocket Event Streaming', () => {
  let webSocketServer: MockWebSocketServer;
  let eventStreaming: EventStreaming;

  beforeEach(() => {
    webSocketServer = new MockWebSocketServer();
    eventStreaming = new EventStreaming({
      webSocketServer,
      eventStore: MockFactory.createEventStore()
    });
  });

  afterEach(() => {
    webSocketServer.close();
  });

  it('should stream events to connected clients', async () => {
    const client1 = webSocketServer.createMockClient();
    const client2 = webSocketServer.createMockClient();

    // Subscribe clients to different event types
    await eventStreaming.createStream({
      eventTypes: ['form.created']
    }, { clientId: client1.id });

    await eventStreaming.createStream({
      eventTypes: ['form.created', 'form.updated']
    }, { clientId: client2.id });

    // Broadcast events
    const formCreatedEvent = EventFactory.build({ type: 'form.created' });
    const formUpdatedEvent = EventFactory.build({ type: 'form.updated' });

    await eventStreaming.broadcastEvent(formCreatedEvent);
    await eventStreaming.broadcastEvent(formUpdatedEvent);

    // Verify client1 received only form.created
    expect(client1.receivedMessages).toHaveLength(1);
    expect(client1.receivedMessages[0].data.type).toBe('form.created');

    // Verify client2 received both events
    expect(client2.receivedMessages).toHaveLength(2);
    expect(client2.receivedMessages[0].data.type).toBe('form.created');
    expect(client2.receivedMessages[1].data.type).toBe('form.updated');
  });

  it('should handle client disconnections gracefully', async () => {
    const client = webSocketServer.createMockClient();

    const stream = await eventStreaming.createStream({
      eventTypes: ['form.created']
    }, { clientId: client.id });

    // Simulate client disconnection
    client.disconnect();

    // Attempt to broadcast event
    const event = EventFactory.build({ type: 'form.created' });
    await expect(eventStreaming.broadcastEvent(event))
      .resolves
      .not.toThrow();

    // Verify stream is automatically cleaned up
    const activeStreams = await eventStreaming.getActiveStreams();
    expect(activeStreams).toHaveLength(0);
  });
});

class MockWebSocketServer {
  private clients: MockWebSocketClient[] = [];

  createMockClient(): MockWebSocketClient {
    const client = new MockWebSocketClient();
    this.clients.push(client);
    return client;
  }

  broadcast(message: any): void {
    this.clients
      .filter(client => client.isConnected)
      .forEach(client => client.receive(message));
  }

  close(): void {
    this.clients.forEach(client => client.disconnect());
    this.clients = [];
  }
}

class MockWebSocketClient {
  public receivedMessages: any[] = [];
  public isConnected = true;
  public id = `client-${Math.random().toString(36).substr(2, 9)}`;

  receive(message: any): void {
    if (this.isConnected) {
      this.receivedMessages.push(message);
    }
  }

  disconnect(): void {
    this.isConnected = false;
  }
}
```

## Test Utilities and Helpers

### Database Test Utilities

```typescript
// Pattern: Database Test Management
export class TestDatabase {
  private static instance: TestDatabase;
  private pool: Pool;

  constructor(private connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  static async create(): Promise<TestDatabase> {
    if (!TestDatabase.instance) {
      const dbName = `test_db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const connectionString = `postgresql://localhost:5432/${dbName}`;

      // Create database
      const adminPool = new Pool({ connectionString: 'postgresql://localhost:5432/postgres' });
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      await adminPool.end();

      TestDatabase.instance = new TestDatabase(connectionString);
      await TestDatabase.instance.runMigrations();
    }

    return TestDatabase.instance;
  }

  async runMigrations(): Promise<void> {
    // Run database migrations
    const migrationFiles = await fs.readdir('./migrations');
    for (const file of migrationFiles.sort()) {
      const migration = await fs.readFile(`./migrations/${file}`, 'utf8');
      await this.pool.query(migration);
    }
  }

  async truncateAllTables(): Promise<void> {
    const tables = await this.pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    for (const { tablename } of tables.rows) {
      await this.pool.query(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
  }

  async destroy(): Promise<void> {
    await this.pool.end();

    // Drop database
    const dbName = this.connectionString.split('/').pop();
    const adminPool = new Pool({ connectionString: 'postgresql://localhost:5432/postgres' });
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await adminPool.end();

    TestDatabase.instance = null;
  }

  get connectionString(): string {
    return this.connectionString;
  }
}
```

### Time and Random Testing Utilities

```typescript
// Pattern: Deterministic Time and Random Values
export class TestTimeController {
  private originalDateNow: typeof Date.now;
  private originalMathRandom: typeof Math.random;
  private currentTime: number;
  private randomSequence: number[];
  private randomIndex: number;

  constructor(
    initialTime: Date = new Date('2025-01-22T10:00:00Z'),
    randomSeed: number[] = [0.1, 0.2, 0.3, 0.4, 0.5]
  ) {
    this.currentTime = initialTime.getTime();
    this.randomSequence = randomSeed;
    this.randomIndex = 0;
  }

  start(): void {
    this.originalDateNow = Date.now;
    this.originalMathRandom = Math.random;

    Date.now = () => this.currentTime;
    Math.random = () => {
      const value = this.randomSequence[this.randomIndex % this.randomSequence.length];
      this.randomIndex++;
      return value;
    };
  }

  stop(): void {
    Date.now = this.originalDateNow;
    Math.random = this.originalMathRandom;
  }

  advanceTime(milliseconds: number): void {
    this.currentTime += milliseconds;
  }

  setTime(time: Date): void {
    this.currentTime = time.getTime();
  }

  resetRandom(): void {
    this.randomIndex = 0;
  }
}

// Usage in tests
describe('Time-dependent functionality', () => {
  let timeController: TestTimeController;

  beforeEach(() => {
    timeController = new TestTimeController();
    timeController.start();
  });

  afterEach(() => {
    timeController.stop();
  });

  it('should generate time-based IDs consistently', () => {
    const id1 = generateTimeBasedId();
    timeController.advanceTime(1000);
    const id2 = generateTimeBasedId();

    expect(id1).toMatchInlineSnapshot('"1642856400000-1"');
    expect(id2).toMatchInlineSnapshot('"1642856401000-2"');
  });
});
```

## Relationships
- **Parent Nodes:** [foundation/testing/unit-testing-strategy.md] - implements - Patterns based on overall strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/standards.md] - follows - Standards while implementing patterns
  - [foundation/testing/llm-instructions.md] - provides - Templates for LLM agents
  - [foundation/components/event-engine/specification.md] - demonstrates - Testing patterns for event engine

## Navigation Guidance
- **Access Context**: Reference when implementing tests or needing examples for specific scenarios
- **Common Next Steps**: Review LLM instructions for automated test generation or standards for specific requirements
- **Related Tasks**: Test implementation, code review, pattern application
- **Update Patterns**: Update when new patterns are discovered or existing patterns are improved

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-1 Implementation

## Change History
- 2025-01-22: Initial testing patterns and examples document creation