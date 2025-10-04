# LLM Agent Testing Instructions

## Purpose
This document provides specific instructions, templates, and guidelines for LLM agents when writing tests for the Pliers v3 platform, ensuring consistent quality and adherence to project standards.

## Classification
- **Domain:** Supporting Element
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Overview

LLM agents play a crucial role in test generation and maintenance. These instructions ensure that AI-generated tests meet the same quality standards as human-written tests while leveraging AI capabilities for comprehensive test coverage and consistency.

## Core Instructions for LLM Agents

### 1. Pre-Test Analysis Requirements

Before writing any tests, you MUST:

1. **Analyze the component interface** - Understand all public methods, properties, and dependencies
2. **Identify the component's purpose** - What business value does it provide?
3. **Map error conditions** - What can go wrong and how should it be handled?
4. **Understand the data flow** - What inputs, outputs, and side effects exist?
5. **Review existing tests** - What patterns are already established in the codebase?

```typescript
// Example: Before testing EventEngine, analyze:
interface EventEngine {
  publishEvent(event: BaseEvent): Promise<void>;          // ✓ Main functionality
  publishBatch(events: BaseEvent[]): Promise<void>;       // ✓ Batch operations
  subscribe(filter: EventFilter): Promise<Subscription>;  // ✓ Subscription management
  replay(aggregateId: string): Promise<BaseEvent[]>;      // ✓ Replay functionality
}

// Error conditions to test:
// - Invalid event validation
// - Network failures
// - Storage failures
// - Subscription management errors
// - Replay edge cases
```

### 2. Test Structure Requirements

Every test file you generate MUST follow this exact structure:

```typescript
// File: [ComponentName].test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { [ComponentName] } from './[ComponentName]';
import { MockFactory } from '@/tests/utils/MockFactory';
import { [ComponentName]Factory } from '@/tests/factories/[ComponentName]Factory';

describe('[ComponentName]', () => {
  let component: [ComponentName];
  let mockDependency1: MockType<[DependencyType]>;
  let mockDependency2: MockType<[DependencyType]>;

  beforeEach(() => {
    // Reset all mocks and create fresh instances
    vi.clearAllMocks();

    mockDependency1 = MockFactory.create[DependencyType]();
    mockDependency2 = MockFactory.create[DependencyType]();

    component = new [ComponentName]({
      dependency1: mockDependency1,
      dependency2: mockDependency2
    });
  });

  afterEach(() => {
    // Clean up any resources
    vi.clearAllMocks();
  });

  // Feature grouping
  describe('[primary functionality]', () => {
    describe('when [normal conditions]', () => {
      it('should [expected behavior]', async () => {
        // Test implementation
      });
    });

    describe('when [error conditions]', () => {
      it('should [error handling behavior]', async () => {
        // Error test implementation
      });
    });
  });
});
```

### 3. Test Case Generation Rules

#### Happy Path Tests (60% of tests)
For each public method, generate tests for:

```typescript
// Rule: Test the primary success scenario
it('should [action] when [normal conditions]', async () => {
  // Arrange
  const input = [FactoryName].build([appropriateOverrides]);
  mockDependency.method.mockResolvedValue([expectedValue]);

  // Act
  const result = await component.method(input);

  // Assert
  expect(result).toEqual([expectedResult]);
  expect(mockDependency.method).toHaveBeenCalledWith([expectedArgs]);
});

// Rule: Test edge cases within normal operation
it('should handle empty input correctly', async () => {
  const result = await component.method([]);
  expect(result).toEqual([expectedEmptyResult]);
});

it('should handle maximum input size', async () => {
  const largeInput = [FactoryName].buildList(1000);
  const result = await component.method(largeInput);
  expect(result).toBeDefined();
});
```

#### Error Handling Tests (30% of tests)
For each method, generate tests for error conditions:

```typescript
// Rule: Test validation errors
it('should throw ValidationError when input is invalid', async () => {
  const invalidInput = [createInvalidInput];

  await expect(component.method(invalidInput))
    .rejects
    .toThrow(ValidationError);
});

// Rule: Test dependency failures
it('should handle [DependencyName] failure gracefully', async () => {
  mockDependency.method.mockRejectedValue(new Error('[specific error]'));

  await expect(component.method(validInput))
    .rejects
    .toThrow('[ExpectedErrorType]');

  // Verify proper error context
  try {
    await component.method(validInput);
  } catch (error) {
    expect(error.context).toMatchObject({
      operation: '[methodName]',
      input: validInput
    });
  }
});

// Rule: Test retry mechanisms
it('should retry transient failures up to configured limit', async () => {
  mockDependency.method
    .mockRejectedValueOnce(new TransientError('Temporary failure'))
    .mockRejectedValueOnce(new TransientError('Still failing'))
    .mockResolvedValueOnce([successValue]);

  const result = await component.method(input);

  expect(result).toEqual([successValue]);
  expect(mockDependency.method).toHaveBeenCalledTimes(3);
});
```

#### Integration Tests (10% of tests)
Test component interactions:

```typescript
// Rule: Test component collaboration
describe('integration with [RelatedComponent]', () => {
  it('should [collaborative behavior] when [scenario]', async () => {
    // Use real dependencies or integration-level mocks
    const realDependency = new [RealDependencyClass](testConfig);
    const component = new [ComponentName]({ dependency: realDependency });

    const result = await component.complexOperation(input);

    expect(result).toEqual([expectedCollaborativeResult]);
  });
});
```

### 4. Mock Generation Rules

#### Create Comprehensive Mocks
```typescript
// Rule: Always use MockFactory patterns
const mockEventStore = MockFactory.createEventStore({
  // Override specific behaviors for this test
  appendEvents: vi.fn().mockResolvedValue(undefined),
  readEvents: vi.fn().mockResolvedValue([
    EventFactory.build({ type: 'form.created' })
  ])
});

// Rule: Provide realistic mock data
const mockUser = UserFactory.build({
  role: 'admin',
  permissions: ['read', 'write', 'admin']
});

// Rule: Mock external dependencies completely
vi.mock('@/external/EmailService', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    validateEmail: vi.fn().mockReturnValue(true)
  }))
}));
```

#### Mock Verification Patterns
```typescript
// Rule: Verify mock interactions specifically
expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
expect(mockEventPublisher.publish).toHaveBeenCalledWith(
  expect.objectContaining({
    type: 'form.created',
    aggregateId: expect.any(String),
    payload: expect.objectContaining({
      formId: 'test-form-123'
    })
  })
);

// Rule: Verify call order when important
expect(mockEventStore.appendEvents).toHaveBeenCalledBefore(
  mockEventPublisher.publish as any
);
```

### 5. Assertion Guidelines

#### Use Specific Assertions
```typescript
// ✅ Good: Specific and meaningful
expect(user.email).toBe('test@example.com');
expect(errors).toHaveLength(2);
expect(result.status).toBe('success');
expect(callback).toHaveBeenCalledWith(expectedArgs);

// ❌ Avoid: Generic or weak assertions
expect(user.email).toBeTruthy();
expect(errors.length > 0).toBe(true);
expect(result).toBeDefined();
```

#### Test Object Structures
```typescript
// Rule: Use object matchers for complex structures
expect(result).toMatchObject({
  id: expect.any(String),
  name: 'Test Form',
  fields: expect.arrayContaining([
    expect.objectContaining({
      type: 'text',
      required: true
    })
  ]),
  metadata: {
    createdAt: expect.any(Date),
    version: 1
  }
});
```

#### Error Testing Patterns
```typescript
// Rule: Test both error occurrence and error details
await expect(component.method(invalidInput))
  .rejects
  .toThrow(ValidationError);

// AND also test error properties
try {
  await component.method(invalidInput);
  fail('Expected ValidationError');
} catch (error) {
  expect(error).toBeInstanceOf(ValidationError);
  expect(error.code).toBe('INVALID_INPUT');
  expect(error.details.field).toBe('email');
}
```

### 6. Performance Test Generation

#### Include Performance Tests for Critical Paths
```typescript
// Rule: Add performance tests for main operations
describe('performance', () => {
  it('should process events within performance threshold', async () => {
    const events = EventFactory.buildList(1000);

    const startTime = performance.now();
    await component.processBatch(events);
    const endTime = performance.now();

    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(1000); // 1 second threshold
  });

  it('should not leak memory during batch processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 10; i++) {
      const events = EventFactory.buildList(100);
      await component.processBatch(events);
    }

    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max
  });
});
```

### 7. Test Data Management

#### Use Factories and Builders
```typescript
// Rule: Always use factories for test data
const user = UserFactory.build({ role: 'admin' });
const form = FormBuilder
  .create()
  .withTextField('name', true)
  .withTextField('email', true)
  .withValidation([
    { field: 'email', type: 'email' }
  ])
  .build();

// Rule: Create meaningful test data variations
const testScenarios = [
  {
    name: 'admin user with full permissions',
    user: UserFactory.build({ role: 'admin', permissions: ['read', 'write', 'admin'] }),
    expectedCanAccess: true
  },
  {
    name: 'regular user with limited permissions',
    user: UserFactory.build({ role: 'user', permissions: ['read'] }),
    expectedCanAccess: false
  },
  {
    name: 'user with no permissions',
    user: UserFactory.build({ role: 'user', permissions: [] }),
    expectedCanAccess: false
  }
];

testScenarios.forEach(({ name, user, expectedCanAccess }) => {
  it(`should ${expectedCanAccess ? 'allow' : 'deny'} access for ${name}`, () => {
    const result = accessControl.canAccess(user, 'admin-panel');
    expect(result).toBe(expectedCanAccess);
  });
});
```

### 8. Documentation Requirements

#### Document Complex Test Scenarios
```typescript
/**
 * Tests the event ordering guarantee within aggregate streams.
 *
 * Business Context: The event store must maintain strict ordering
 * within each aggregate to ensure consistent state reconstruction.
 *
 * Test Scenario: Multiple events are published to the same aggregate
 * in rapid succession to verify sequence number integrity.
 */
describe('Event Ordering Guarantees', () => {
  it('should maintain sequential order within aggregate streams', async () => {
    // Implementation...
  });
});
```

#### Add Inline Comments for Complex Logic
```typescript
it('should handle complex validation scenarios', async () => {
  // Arrange: Create a form with conditional validation rules
  // where field B is required only if field A has a specific value
  const form = FormBuilder
    .create()
    .withConditionalField('hasOtherInfo', 'boolean')
    .withConditionalField('otherInfo', 'text', {
      requiredWhen: { field: 'hasOtherInfo', value: true }
    })
    .build();

  // Act: Validate with both conditions
  const validationResult1 = await validator.validate(form, {
    hasOtherInfo: true,
    otherInfo: 'Some details'
  });

  const validationResult2 = await validator.validate(form, {
    hasOtherInfo: false
    // otherInfo is not required when hasOtherInfo is false
  });

  // Assert: Both scenarios should be valid
  expect(validationResult1.isValid).toBe(true);
  expect(validationResult2.isValid).toBe(true);
});
```

### 9. Snapshot Testing Guidelines

#### When to Use Snapshots
```typescript
// Rule: Use snapshots for configuration generation
it('should generate correct form configuration', () => {
  const form = FormBuilder
    .create()
    .withComplexConfiguration()
    .build();

  const config = ConfigurationGenerator.generate(form);

  // Normalize dynamic values before snapshot
  const normalizedConfig = {
    ...config,
    generatedAt: '[TIMESTAMP]',
    id: config.id.replace(/\d+/g, '[NUMBER]')
  };

  expect(normalizedConfig).toMatchSnapshot();
});

// Rule: Use inline snapshots for small, important values
it('should generate correct field count', () => {
  const config = ConfigurationGenerator.generate(simpleForm);
  expect(config.fields.length).toMatchInlineSnapshot('3');
});
```

### 10. Error Prevention Rules

#### Always Test Edge Cases
```typescript
// Rule: Test boundary conditions
describe('boundary conditions', () => {
  it('should handle empty arrays', async () => {
    const result = await component.processItems([]);
    expect(result).toEqual({ processed: 0, errors: [] });
  });

  it('should handle single item arrays', async () => {
    const item = ItemFactory.build();
    const result = await component.processItems([item]);
    expect(result.processed).toBe(1);
  });

  it('should handle maximum array size', async () => {
    const items = ItemFactory.buildList(1000);
    const result = await component.processItems(items);
    expect(result.processed).toBe(1000);
  });
});
```

#### Test Type Safety
```typescript
// Rule: Verify TypeScript types in tests
it('should maintain type safety in return values', () => {
  const result = component.getConfiguration();

  // These checks ensure TypeScript types are correct
  expect(typeof result.enabled).toBe('boolean');
  expect(typeof result.timeout).toBe('number');
  expect(Array.isArray(result.plugins)).toBe(true);

  if (result.plugins.length > 0) {
    expect(typeof result.plugins[0].id).toBe('string');
  }
});
```

### 11. Integration with CI/CD

#### Make Tests CI-Friendly
```typescript
// Rule: Avoid hardcoded timeouts that might fail in CI
const TIMEOUT_THRESHOLD = process.env.CI ? 5000 : 1000; // Longer in CI

it('should complete operation within reasonable time', async () => {
  const startTime = performance.now();
  await component.longRunningOperation();
  const duration = performance.now() - startTime;

  expect(duration).toBeLessThan(TIMEOUT_THRESHOLD);
});

// Rule: Handle test isolation in parallel execution
describe('parallel-safe tests', () => {
  it('should not interfere with other tests', async () => {
    const uniqueId = `test-${Date.now()}-${Math.random()}`;
    const result = await component.processWithId(uniqueId);
    expect(result.id).toBe(uniqueId);
  });
});
```

## Test Generation Templates

### Basic Component Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { {{COMPONENT_NAME}} } from './{{COMPONENT_NAME}}';
import { MockFactory } from '@/tests/utils/MockFactory';

describe('{{COMPONENT_NAME}}', () => {
  let {{COMPONENT_INSTANCE}}: {{COMPONENT_NAME}};
  {{#each DEPENDENCIES}}
  let mock{{this.name}}: MockType<{{this.type}}>;
  {{/each}}

  beforeEach(() => {
    vi.clearAllMocks();

    {{#each DEPENDENCIES}}
    mock{{this.name}} = MockFactory.create{{this.type}}();
    {{/each}}

    {{COMPONENT_INSTANCE}} = new {{COMPONENT_NAME}}({
      {{#each DEPENDENCIES}}
      {{this.property}}: mock{{this.name}},
      {{/each}}
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  {{#each METHODS}}
  describe('{{this.name}}', () => {
    describe('when {{this.normalCondition}}', () => {
      it('should {{this.expectedBehavior}}', async () => {
        // Arrange
        const input = {{this.inputFactory}};
        {{#each this.mockSetup}}
        {{this.mock}}.{{this.method}}.mockResolvedValue({{this.returnValue}});
        {{/each}}

        // Act
        const result = await {{COMPONENT_INSTANCE}}.{{this.name}}(input);

        // Assert
        expect(result).{{this.assertion}};
        {{#each this.verifications}}
        expect({{this.mock}}.{{this.method}}).toHaveBeenCalledWith({{this.expectedArgs}});
        {{/each}}
      });
    });

    describe('when {{this.errorCondition}}', () => {
      it('should {{this.errorBehavior}}', async () => {
        // Arrange
        const input = {{this.invalidInputFactory}};
        {{#each this.errorMockSetup}}
        {{this.mock}}.{{this.method}}.mockRejectedValue(new {{this.errorType}}('{{this.errorMessage}}'));
        {{/each}}

        // Act & Assert
        await expect({{COMPONENT_INSTANCE}}.{{this.name}}(input))
          .rejects
          .toThrow({{this.expectedErrorType}});
      });
    });
  });
  {{/each}}
});
```

### Event Engine Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEngine } from './EventEngine';
import { MockFactory } from '@/tests/utils/MockFactory';
import { EventFactory } from '@/tests/factories/EventFactory';

describe('EventEngine', () => {
  let eventEngine: EventEngine;
  let mockEventStore: MockType<EventStore>;
  let mockEventPublisher: MockType<EventPublisher>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventStore = MockFactory.createEventStore();
    mockEventPublisher = MockFactory.createEventPublisher();

    eventEngine = new EventEngine({
      eventStore: mockEventStore,
      eventPublisher: mockEventPublisher
    });
  });

  describe('publishEvent', () => {
    describe('when event is valid', () => {
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
      });
    });

    describe('when event validation fails', () => {
      it('should throw ValidationError with details', async () => {
        // Arrange
        const invalidEvent = EventFactory.build({ type: null });

        // Act & Assert
        await expect(eventEngine.publishEvent(invalidEvent))
          .rejects
          .toThrow(ValidationError);
      });
    });
  });
});
```

## Quality Assurance Checklist

Before submitting any generated tests, verify:

### ✅ Structure and Organization
- [ ] File follows naming convention: `[ComponentName].test.ts`
- [ ] Imports are properly organized and use correct paths
- [ ] Test structure follows describe/it hierarchy
- [ ] Tests are grouped by functionality

### ✅ Test Coverage
- [ ] Happy path scenarios are tested (60%)
- [ ] Error conditions are tested (30%)
- [ ] Edge cases are covered (10%)
- [ ] All public methods have tests
- [ ] All error paths have tests

### ✅ Mocking and Data
- [ ] Uses MockFactory patterns consistently
- [ ] Mock data is realistic and appropriate
- [ ] Test data uses Factory patterns
- [ ] Mocks are properly configured and verified

### ✅ Assertions
- [ ] Assertions are specific and meaningful
- [ ] Object matchers are used appropriately
- [ ] Error testing includes both occurrence and details
- [ ] Mock verifications are specific

### ✅ Performance and CI
- [ ] Performance tests for critical operations
- [ ] Tests are parallel-execution safe
- [ ] No hardcoded timeouts that might fail in CI
- [ ] Proper cleanup in afterEach blocks

### ✅ Documentation
- [ ] Complex scenarios are documented
- [ ] Business context is provided where needed
- [ ] Inline comments explain non-obvious logic

## Common Mistakes to Avoid

### ❌ Testing Implementation Details
```typescript
// Bad: Testing internal method calls
expect(component.privateMethod).toHaveBeenCalled();

// Good: Testing behavior and outcomes
expect(result.status).toBe('success');
expect(result.data).toMatchObject(expectedData);
```

### ❌ Weak Error Testing
```typescript
// Bad: Generic error testing
await expect(component.method(badInput)).rejects.toThrow();

// Good: Specific error testing
await expect(component.method(badInput))
  .rejects
  .toThrow(ValidationError);

try {
  await component.method(badInput);
} catch (error) {
  expect(error.code).toBe('INVALID_INPUT');
  expect(error.field).toBe('email');
}
```

### ❌ Poor Test Data
```typescript
// Bad: Hardcoded, unrealistic data
const user = { id: 1, name: 'test', email: 'test' };

// Good: Factory-generated, realistic data
const user = UserFactory.build({
  email: 'user@example.com',
  role: 'admin'
});
```

### ❌ Missing Cleanup
```typescript
// Bad: No cleanup, potential test pollution
describe('Component', () => {
  it('should work', () => {
    // Test but no cleanup
  });
});

// Good: Proper cleanup
describe('Component', () => {
  afterEach(() => {
    vi.clearAllMocks();
    // Other cleanup as needed
  });
});
```

## Relationships
- **Parent Nodes:** [foundation/testing/unit-testing-strategy.md] - guides - LLM agent test generation
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/standards.md] - follows - Quality standards in generated tests
  - [foundation/testing/patterns.md] - implements - Common patterns in generated tests
  - [foundation/testing/ci-integration.md] - ensures - CI compatibility in generated tests

## Navigation Guidance
- **Access Context**: Reference when LLM agents need to generate tests or when reviewing AI-generated test code
- **Common Next Steps**: Apply templates to specific components or review generated tests against standards
- **Related Tasks**: Test generation, automated testing, code review of AI-generated tests
- **Update Patterns**: Update when new patterns are established or quality requirements change

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-1 Implementation

## Change History
- 2025-01-22: Initial LLM agent testing instructions document creation