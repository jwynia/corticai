# Testing Standards and Conventions

## Purpose
This document defines the coding standards, conventions, and quality requirements for test code in the Pliers v3 platform, ensuring consistency, maintainability, and clarity across all test suites.

## Classification
- **Domain:** Supporting Element
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Overview

Test code quality is as important as production code quality. These standards ensure that tests are readable, maintainable, and provide reliable feedback to developers. All test code must adhere to these standards to maintain consistency across the codebase.

## General Testing Standards

### Code Quality Requirements

1. **Readability**: Tests must be self-documenting and easy to understand
2. **Maintainability**: Tests should be easy to modify when requirements change
3. **Reliability**: Tests must be deterministic and produce consistent results
4. **Performance**: Tests should execute quickly to support rapid development
5. **Isolation**: Each test must be independent and not affect other tests

### Test Code Organization

#### File Structure Standards

```typescript
// ✅ Good: Clear separation of concerns
describe('EventEngine', () => {
  // Setup section
  let eventEngine: EventEngine;
  let mockEventStore: MockEventStore;
  let mockPublisher: MockEventPublisher;

  beforeEach(() => {
    // Test setup
  });

  afterEach(() => {
    // Test cleanup
  });

  // Feature grouping
  describe('Event Publishing', () => {
    // Publishing tests
  });

  describe('Event Storage', () => {
    // Storage tests
  });
});

// ❌ Bad: Mixed concerns, no clear structure
describe('EventEngine', () => {
  it('should publish events and store them and notify subscribers', () => {
    // Test doing too many things
  });
});
```

#### Test Naming Conventions

##### Describe Blocks
- **Component/Class**: Use the exact component or class name
- **Method/Function**: Use the method name or describe the functionality
- **Context**: Use "when [condition]" or "with [context]" for conditional scenarios

```typescript
describe('EventEngine', () => {
  describe('publishEvent', () => {
    describe('when event is valid', () => {
      // Happy path tests
    });

    describe('when event validation fails', () => {
      // Error handling tests
    });

    describe('with retry enabled', () => {
      // Configuration-specific tests
    });
  });
});
```

##### Test Cases
Use clear, behavior-focused descriptions that complete the sentence "It should..."

```typescript
// ✅ Good: Clear, behavior-focused
it('should emit event to all active subscribers');
it('should retry failed publications up to 3 times');
it('should throw ValidationError when event schema is invalid');
it('should maintain event ordering within aggregate streams');

// ❌ Bad: Implementation-focused or unclear
it('should call publishToSubscribers');
it('should work correctly');
it('should test retry logic');
it('should validate');
```

### Test Structure Standards

#### AAA Pattern (Arrange, Act, Assert)

All tests must follow the Arrange-Act-Assert pattern with clear separation:

```typescript
it('should calculate total price including tax', () => {
  // Arrange
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 }
  ];
  const taxRate = 0.08;
  const calculator = new PriceCalculator(taxRate);

  // Act
  const total = calculator.calculateTotal(items);

  // Assert
  expect(total).toBe(270); // (200 + 50) * 1.08
});
```

#### Given-When-Then (Alternative for Complex Scenarios)

For complex business logic tests, use Given-When-Then structure:

```typescript
it('should process refund when order is within refund window', () => {
  // Given: An order placed within the refund window
  const orderDate = new Date('2025-01-20');
  const currentDate = new Date('2025-01-22'); // 2 days later
  const order = OrderBuilder.create()
    .withDate(orderDate)
    .withStatus('completed')
    .build();

  const refundProcessor = new RefundProcessor({
    refundWindowDays: 7,
    currentDate
  });

  // When: A refund is requested
  const result = refundProcessor.processRefund(order.id, 'customer_request');

  // Then: The refund should be approved
  expect(result.status).toBe('approved');
  expect(result.amount).toBe(order.total);
  expect(result.processedAt).toEqual(currentDate);
});
```

### Assertion Standards

#### Specific Assertions

Use the most specific assertion possible:

```typescript
// ✅ Good: Specific assertions
expect(user.email).toBe('test@example.com');
expect(items).toHaveLength(3);
expect(errors).toContain('Email is required');
expect(result).toBeInstanceOf(ValidationResult);
expect(callback).toHaveBeenCalledWith(expectedArgs);
expect(promise).rejects.toThrow(ValidationError);

// ❌ Bad: Generic or weak assertions
expect(user.email).toBeTruthy();
expect(items.length > 0).toBe(true);
expect(errors.length).toBe(1); // When content matters more than count
expect(result).toBeDefined();
```

#### Error Testing Standards

```typescript
// ✅ Good: Specific error testing
await expect(eventEngine.publishEvent(invalidEvent))
  .rejects
  .toThrow(new ValidationError('Event type is required'));

// ✅ Good: Error properties testing
try {
  await eventEngine.publishEvent(invalidEvent);
  fail('Expected ValidationError to be thrown');
} catch (error) {
  expect(error).toBeInstanceOf(ValidationError);
  expect(error.code).toBe('INVALID_EVENT_TYPE');
  expect(error.details).toMatchObject({
    field: 'type',
    value: null
  });
}

// ❌ Bad: Generic error testing
await expect(eventEngine.publishEvent(invalidEvent))
  .rejects
  .toThrow();
```

#### Async Testing Standards

```typescript
// ✅ Good: Proper async testing
it('should save user data to database', async () => {
  const userData = { name: 'John', email: 'john@example.com' };

  const savedUser = await userService.createUser(userData);

  expect(savedUser.id).toBeDefined();
  expect(savedUser.name).toBe(userData.name);
  expect(savedUser.email).toBe(userData.email);
});

// ✅ Good: Testing async errors
it('should reject duplicate email addresses', async () => {
  const userData = { name: 'John', email: 'existing@example.com' };

  await expect(userService.createUser(userData))
    .rejects
    .toThrow('Email address already exists');
});

// ❌ Bad: Missing async/await
it('should save user data to database', () => {
  const savedUser = userService.createUser(userData); // Returns Promise
  expect(savedUser.name).toBe('John'); // Will fail
});
```

## TypeScript Testing Standards

### Type Safety in Tests

```typescript
// ✅ Good: Strongly typed test data
interface TestUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'test-user-001',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  ...overrides
});

// ✅ Good: Type assertions when necessary
const result = await api.getUser('123') as User;
expect(result.id).toBe('123');

// ❌ Bad: Any types in tests
const testData: any = { /* ... */ };
const result: any = await service.process(testData);
```

### Generic Testing Patterns

```typescript
// ✅ Good: Generic test utilities
function createMockRepository<T>(): Repository<T> {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn()
  } as Repository<T>;
}

// Usage
const mockUserRepository = createMockRepository<User>();
const mockOrderRepository = createMockRepository<Order>();
```

### Interface Testing

```typescript
// ✅ Good: Testing interface compliance
describe('EventStore implementations', () => {
  const implementations: Array<{
    name: string;
    factory: () => EventStore;
  }> = [
    { name: 'PostgreSQLEventStore', factory: () => new PostgreSQLEventStore() },
    { name: 'InMemoryEventStore', factory: () => new InMemoryEventStore() }
  ];

  implementations.forEach(({ name, factory }) => {
    describe(name, () => {
      let eventStore: EventStore;

      beforeEach(() => {
        eventStore = factory();
      });

      it('should implement EventStore interface correctly', async () => {
        const event = EventFactory.build();

        await eventStore.appendEvents('test-aggregate', 0, [event]);
        const events = await eventStore.readEvents('test-aggregate');

        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject(event);
      });
    });
  });
});
```

## Mock and Stub Standards

### Mock Creation Standards

```typescript
// ✅ Good: Descriptive mock creation
const createMockEventPublisher = (overrides: Partial<EventPublisher> = {}) => ({
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  unsubscribeAll: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

// ✅ Good: Mock configuration
const mockEventStore = createMockEventStore({
  readEvents: vi.fn().mockResolvedValue([
    EventFactory.build({ type: 'form.created' }),
    EventFactory.build({ type: 'form.updated' })
  ])
});

// ❌ Bad: Unclear mock setup
const mockService = {
  doSomething: vi.fn().mockReturnValue(true)
};
```

### Mock Verification Standards

```typescript
// ✅ Good: Specific call verification
expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
expect(mockEventPublisher.publish).toHaveBeenCalledWith(
  expect.objectContaining({
    type: 'form.created',
    aggregateId: 'form-123'
  })
);

// ✅ Good: Call order verification
expect(mockEventStore.appendEvents).toHaveBeenCalledBefore(
  mockEventPublisher.publish as any
);

// ❌ Bad: Weak verification
expect(mockEventPublisher.publish).toHaveBeenCalled();
```

### Spy Standards

```typescript
// ✅ Good: Method spying
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Test that triggers console.error
await expect(service.processInvalidData(badData))
  .rejects
  .toThrow();

expect(consoleSpy).toHaveBeenCalledWith(
  expect.stringContaining('Invalid data format')
);

consoleSpy.mockRestore();
```

## Test Data Standards

### Fixture Standards

```typescript
// ✅ Good: Comprehensive fixture with clear defaults
export const userFixtures = {
  admin: {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@pliers.dev',
    role: 'admin',
    permissions: ['read', 'write', 'admin'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },

  standardUser: {
    id: 'user-001',
    name: 'Standard User',
    email: 'user@example.com',
    role: 'user',
    permissions: ['read'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  }
};

// ✅ Good: Fixture factory for variations
export const createUserFixture = (overrides: Partial<User> = {}): User => ({
  ...userFixtures.standardUser,
  ...overrides
});
```

### Factory Standards

```typescript
// ✅ Good: Flexible factory with sensible defaults
import { Factory } from 'factory.ts';

export const UserFactory = Factory.makeFactory<User>({
  id: Factory.each(i => `user-${i.toString().padStart(3, '0')}`),
  name: Factory.each(i => `User ${i}`),
  email: Factory.each(i => `user${i}@example.com`),
  role: 'user',
  permissions: ['read'],
  createdAt: Factory.each(() => new Date()),
  updatedAt: Factory.each(() => new Date())
});

// Usage examples
const user = UserFactory.build(); // Single user with defaults
const admin = UserFactory.build({ role: 'admin', permissions: ['read', 'write', 'admin'] });
const users = UserFactory.buildList(5); // Array of 5 users
const usersWithSameDomain = UserFactory.buildList(3, {
  email: Factory.each(i => `user${i}@company.com`)
});
```

### Builder Pattern Standards

```typescript
// ✅ Good: Fluent builder interface
export class FormBuilder {
  private form: Partial<Form>;

  constructor() {
    this.form = {
      id: 'test-form',
      name: 'Test Form',
      fields: [],
      validation: { required: false, rules: [] },
      settings: { multiPage: false, saveProgress: false }
    };
  }

  static create(): FormBuilder {
    return new FormBuilder();
  }

  withId(id: string): FormBuilder {
    this.form.id = id;
    return this;
  }

  withName(name: string): FormBuilder {
    this.form.name = name;
    return this;
  }

  withTextField(name: string, required = false): FormBuilder {
    this.form.fields = [...(this.form.fields || []), {
      type: 'text',
      name,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      required,
      validation: required ? { required: true } : undefined
    }];
    return this;
  }

  withValidation(validationRules: ValidationRule[]): FormBuilder {
    this.form.validation = {
      required: true,
      rules: validationRules
    };
    return this;
  }

  withMultiPageSettings(): FormBuilder {
    this.form.settings = {
      ...this.form.settings,
      multiPage: true,
      saveProgress: true
    };
    return this;
  }

  build(): Form {
    return this.form as Form;
  }
}

// Usage
const complexForm = FormBuilder
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
```

## Performance Testing Standards

### Benchmark Testing

```typescript
// ✅ Good: Performance testing with clear thresholds
describe('EventEngine Performance', () => {
  it('should process 1000 events within 1 second', async () => {
    const events = EventFactory.buildList(1000);
    const eventEngine = new EventEngine();

    const startTime = performance.now();

    for (const event of events) {
      await eventEngine.publishEvent(event);
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(executionTime).toBeLessThan(1000); // 1 second
  });

  it('should maintain memory usage under threshold during batch processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const batchSize = 10000;

    for (let batch = 0; batch < 10; batch++) {
      const events = EventFactory.buildList(batchSize);
      await eventEngine.processBatch(events);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
```

### Load Testing Standards

```typescript
// ✅ Good: Concurrent operation testing
describe('EventStore Concurrency', () => {
  it('should handle concurrent writes without data corruption', async () => {
    const eventStore = new EventStore();
    const aggregateId = 'concurrent-test';
    const concurrentOperations = 50;

    // Create concurrent write operations
    const writePromises = Array.from({ length: concurrentOperations }, (_, i) =>
      eventStore.appendEvents(aggregateId, i, [
        EventFactory.build({ sequenceNumber: i + 1 })
      ])
    );

    // Execute all operations concurrently
    await Promise.all(writePromises);

    // Verify data integrity
    const events = await eventStore.readEvents(aggregateId);
    expect(events).toHaveLength(concurrentOperations);

    // Verify ordering
    for (let i = 0; i < events.length; i++) {
      expect(events[i].sequenceNumber).toBe(i + 1);
    }
  });
});
```

## Error Testing Standards

### Error Boundary Testing

```typescript
// ✅ Good: Comprehensive error testing
describe('Error Handling', () => {
  describe('ValidationError scenarios', () => {
    it('should throw ValidationError with detailed message for invalid event', () => {
      const invalidEvent = { type: null, payload: {} };

      expect(() => EventValidator.validate(invalidEvent))
        .toThrow(ValidationError);

      try {
        EventValidator.validate(invalidEvent);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Event validation failed');
        expect(error.details).toEqual({
          field: 'type',
          value: null,
          constraint: 'Event type is required'
        });
        expect(error.code).toBe('INVALID_EVENT_TYPE');
      }
    });
  });

  describe('Network error scenarios', () => {
    it('should retry on transient network failures', async () => {
      const mockPublisher = createMockEventPublisher({
        publish: vi.fn()
          .mockRejectedValueOnce(new NetworkError('Connection timeout'))
          .mockRejectedValueOnce(new NetworkError('Service unavailable'))
          .mockResolvedValueOnce(undefined)
      });

      const eventEngine = new EventEngine(mockPublisher);
      const event = EventFactory.build();

      await eventEngine.publishEvent(event);

      expect(mockPublisher.publish).toHaveBeenCalledTimes(3);
    });
  });
});
```

### Edge Case Testing

```typescript
// ✅ Good: Edge case coverage
describe('Edge Cases', () => {
  it('should handle empty event payload', async () => {
    const event = EventFactory.build({ payload: {} });

    const result = await eventProcessor.process(event);

    expect(result.success).toBe(true);
    expect(result.warnings).toContain('Empty payload detected');
  });

  it('should handle very large event payloads', async () => {
    const largePayload = {
      data: 'x'.repeat(1024 * 1024) // 1MB string
    };
    const event = EventFactory.build({ payload: largePayload });

    const result = await eventProcessor.process(event);

    expect(result.success).toBe(true);
    expect(result.metadata.payloadSize).toBe(1024 * 1024);
  });

  it('should handle special characters in event data', async () => {
    const specialCharPayload = {
      message: '🚀 Test with émojis and spéciål cháracters! @#$%^&*()',
      unicode: '\u{1F600}\u{1F601}\u{1F602}'
    };
    const event = EventFactory.build({ payload: specialCharPayload });

    const result = await eventProcessor.process(event);

    expect(result.success).toBe(true);
    expect(result.processedPayload.message).toBe(specialCharPayload.message);
  });
});
```

## Documentation Standards

### Test Documentation

```typescript
// ✅ Good: Well-documented test with context
/**
 * Tests the event ordering guarantee within aggregate streams.
 *
 * Business Context: The event store must maintain strict ordering
 * within each aggregate to ensure consistent state reconstruction.
 * Events out of order could lead to incorrect aggregate states.
 *
 * Test Scenario: Multiple events are published to the same aggregate
 * in rapid succession. The test verifies that sequence numbers are
 * correctly assigned and maintained.
 */
describe('Event Ordering Guarantees', () => {
  it('should maintain sequential order within aggregate streams', async () => {
    // This test ensures that even under high load, events for a single
    // aggregate are processed in the correct order, preventing data
    // corruption in event sourcing scenarios.

    const aggregateId = 'test-aggregate-001';
    const eventCount = 100;

    // Rapidly publish events to the same aggregate
    const publishPromises = Array.from({ length: eventCount }, (_, i) =>
      eventEngine.publishEvent(EventFactory.build({
        aggregateId,
        sequenceNumber: i + 1,
        type: 'test.sequence'
      }))
    );

    await Promise.all(publishPromises);

    // Verify strict ordering is maintained
    const storedEvents = await eventStore.readEvents(aggregateId);
    expect(storedEvents).toHaveLength(eventCount);

    storedEvents.forEach((event, index) => {
      expect(event.sequenceNumber).toBe(index + 1);
    });
  });
});
```

### Complex Test Setup Documentation

```typescript
/**
 * Test Setup: Multi-tenant Event Processing
 *
 * This test suite simulates a multi-tenant environment where:
 * - Multiple tenants are publishing events simultaneously
 * - Each tenant has isolated event streams
 * - Cross-tenant data leakage must be prevented
 * - Performance should remain consistent across tenants
 */
describe('Multi-tenant Event Processing', () => {
  let tenantConfigs: TenantConfig[];
  let eventEngines: Map<string, EventEngine>;

  beforeAll(async () => {
    // Create isolated database schemas for each tenant
    tenantConfigs = await setupMultipleTenantSchemas(['tenant-a', 'tenant-b', 'tenant-c']);

    // Initialize separate event engines for each tenant
    eventEngines = new Map();
    for (const config of tenantConfigs) {
      const engine = new EventEngine({
        connectionString: config.databaseUrl,
        schemaName: config.schemaName
      });
      eventEngines.set(config.tenantId, engine);
    }
  });

  afterAll(async () => {
    // Cleanup tenant schemas
    await cleanupTenantSchemas(tenantConfigs);
  });

  // Tests follow...
});
```

## Relationships
- **Parent Nodes:** [foundation/testing/unit-testing-strategy.md] - implements - Testing standards as part of overall strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/patterns.md] - guides - Implementation of standards through patterns
  - [foundation/testing/llm-instructions.md] - applies - Standards to LLM-generated tests
  - [foundation/principles.md] - follows - Project principles in testing approach

## Navigation Guidance
- **Access Context**: Reference when writing tests or reviewing test code
- **Common Next Steps**: Review testing patterns or LLM instructions for implementation guidance
- **Related Tasks**: Test implementation, code review, quality assurance
- **Update Patterns**: Update when coding standards evolve or new patterns are established

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-1 Implementation

## Change History
- 2025-01-22: Initial testing standards and conventions document creation