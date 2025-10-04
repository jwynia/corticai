# Unit Testing Strategy

## Purpose
This document defines the comprehensive unit testing strategy for the Pliers v3 platform, including framework selection, organizational patterns, coverage requirements, and integration with CI/CD pipelines.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Overview

The Pliers v3 unit testing strategy prioritizes test reliability, maintainability, and developer productivity. It establishes a comprehensive framework for testing all components of the platform, with special consideration for LLM agent-generated tests and modern ESM support.

### Core Principles

1. **Test-Driven Development (TDD)**: Tests should be written before or alongside implementation
2. **Comprehensive Coverage**: Maintain >80% code coverage across all modules
3. **Fast Feedback**: Tests should execute quickly to support rapid development cycles
4. **Reliability**: Tests should be deterministic and stable across environments
5. **Maintainability**: Tests should be easy to read, understand, and modify
6. **Isolation**: Each test should be independent and not affect other tests

## Testing Framework Selection

### Primary Framework: Vitest

**Selected Framework**: Vitest v1.x

**Rationale**:
- Native ESM support for modern JavaScript/TypeScript development
- Vite-powered for extremely fast test execution
- Jest-compatible API for easy migration and familiarity
- Built-in TypeScript support without additional configuration
- Excellent hot module replacement (HMR) for test-driven development
- Native code coverage without additional setup
- Better performance than Jest, especially for large codebases

### Secondary Framework: Testing Library

**Component Testing**: @testing-library/dom, @testing-library/user-event

**Rationale**:
- Encourages testing behavior over implementation details
- Better accessibility testing support
- Simulates real user interactions
- Framework-agnostic approach
- Strong community support and documentation

### Alternative Frameworks (Considered but Not Selected)

- **Jest**: While mature and widely adopted, lacks native ESM support and is slower than Vitest
- **Mocha + Chai**: Requires more configuration and lacks integrated features
- **Playwright Test**: Better suited for E2E testing rather than unit testing

## Test File Organization

### Directory Structure

```
src/
├── components/
│   ├── EventEngine/
│   │   ├── EventEngine.ts
│   │   ├── EventEngine.test.ts
│   │   ├── EventStore/
│   │   │   ├── EventStore.ts
│   │   │   ├── EventStore.test.ts
│   │   │   └── __fixtures__/
│   │   │       ├── events.fixture.ts
│   │   │       └── snapshots.fixture.ts
│   │   └── __mocks__/
│   │       └── EventPublisher.mock.ts
│   ├── FormEngine/
│   │   ├── FormEngine.ts
│   │   ├── FormEngine.test.ts
│   │   └── __tests__/
│   │       ├── integration/
│   │       └── unit/
│   └── shared/
│       ├── __fixtures__/
│       │   ├── users.fixture.ts
│       │   └── forms.fixture.ts
│       └── __mocks__/
│           └── api.mock.ts
tests/
├── __fixtures__/
│   ├── global/
│   │   ├── database.fixture.ts
│   │   └── auth.fixture.ts
│   └── shared/
├── __mocks__/
│   ├── global/
│   │   ├── fetch.mock.ts
│   │   └── websocket.mock.ts
│   └── external/
│       ├── postgres.mock.ts
│       └── redis.mock.ts
├── setup/
│   ├── vitest.setup.ts
│   ├── test-env.setup.ts
│   └── database.setup.ts
└── utils/
    ├── test-helpers.ts
    ├── mock-builders.ts
    └── assertion-helpers.ts
```

### File Naming Conventions

#### Test Files
- **Unit Tests**: `[ComponentName].test.ts`
- **Integration Tests**: `[ComponentName].integration.test.ts`
- **Component Tests**: `[ComponentName].component.test.ts`
- **End-to-End Tests**: `[Feature].e2e.test.ts`

#### Support Files
- **Fixtures**: `[entity].fixture.ts`
- **Mocks**: `[module].mock.ts`
- **Factories**: `[entity].factory.ts`
- **Builders**: `[entity].builder.ts`

#### Test Organization
- **Grouped Tests**: Use `describe` blocks for logical grouping
- **Nested Describes**: Organize by functionality or method
- **Test Descriptions**: Use clear, behavior-focused descriptions

```typescript
describe('EventEngine', () => {
  describe('Event Publishing', () => {
    describe('when publishing single event', () => {
      it('should emit event to all subscribers');
      it('should handle publisher failures gracefully');
      it('should maintain event ordering');
    });

    describe('when publishing batch events', () => {
      it('should process all events atomically');
      it('should rollback on any failure');
    });
  });

  describe('Event Storage', () => {
    // Storage-related tests
  });
});
```

## Coverage Requirements

### Minimum Coverage Targets

- **Overall Code Coverage**: 80% minimum
- **Critical Components**: 90% minimum (EventEngine, FormEngine, SubmissionEngine)
- **Utility Functions**: 95% minimum
- **Error Handling**: 100% coverage of catch blocks and error paths
- **New Code**: 85% minimum for all new features

### Coverage Types

1. **Line Coverage**: Percentage of code lines executed during tests
2. **Branch Coverage**: Percentage of code branches (if/else, switch cases) executed
3. **Function Coverage**: Percentage of functions called during tests
4. **Statement Coverage**: Percentage of statements executed

### Coverage Exclusions

- Configuration files
- Type-only files (interfaces, types)
- Generated code
- Development-only utilities
- External library adapters (thin wrappers)

### Coverage Enforcement

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        'src/components/EventEngine/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.config.ts',
        'src/**/*.mock.ts',
        'src/**/*.fixture.ts'
      ]
    }
  }
});
```

## Test Data Management

### Test Fixtures

Centralized test data management using fixture files:

```typescript
// tests/__fixtures__/events.fixture.ts
export const createEventFixture = (overrides: Partial<BaseEvent> = {}): BaseEvent => ({
  id: 'test-event-001',
  type: 'form.created',
  version: 1,
  timestamp: new Date('2025-01-22T10:00:00Z'),
  aggregateId: 'form-123',
  aggregateType: 'form',
  sequenceNumber: 1,
  metadata: {
    userId: 'user-456',
    sourceSystem: 'pliers-test',
    sourceVersion: '3.0.0'
  },
  payload: {
    formId: 'form-123',
    name: 'Test Form',
    definition: {}
  },
  ...overrides
});

export const eventFixtures = {
  formCreated: createEventFixture(),
  formUpdated: createEventFixture({
    type: 'form.updated',
    sequenceNumber: 2
  }),
  submissionCreated: createEventFixture({
    type: 'submission.created',
    aggregateType: 'submission'
  })
};
```

### Factory Pattern

For dynamic test data creation:

```typescript
// tests/utils/factories/EventFactory.ts
import { Factory } from 'factory.ts';
import { BaseEvent } from '@/types/events';

export const EventFactory = Factory.makeFactory<BaseEvent>({
  id: Factory.each(i => `test-event-${i.toString().padStart(3, '0')}`),
  type: 'test.event',
  version: 1,
  timestamp: Factory.each(() => new Date()),
  aggregateId: Factory.each(i => `aggregate-${i}`),
  aggregateType: 'test',
  sequenceNumber: Factory.each(i => i),
  metadata: {
    sourceSystem: 'test',
    sourceVersion: '1.0.0'
  },
  payload: {}
});

// Usage in tests
const event = EventFactory.build({ type: 'form.created' });
const events = EventFactory.buildList(5, { aggregateId: 'form-123' });
```

### Builder Pattern

For complex object construction:

```typescript
// tests/utils/builders/FormBuilder.ts
export class FormBuilder {
  private form: Partial<Form> = {};

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

  withFields(fields: FormField[]): FormBuilder {
    this.form.fields = fields;
    return this;
  }

  withValidation(): FormBuilder {
    this.form.validation = {
      required: true,
      rules: []
    };
    return this;
  }

  build(): Form {
    return {
      id: 'test-form',
      name: 'Test Form',
      fields: [],
      ...this.form
    } as Form;
  }
}

// Usage
const form = FormBuilder
  .create()
  .withId('complex-form')
  .withName('Complex Test Form')
  .withValidation()
  .build();
```

## Mock Strategy

### Mock Categories

1. **External Dependencies**: APIs, databases, file systems
2. **Internal Modules**: Complex internal dependencies
3. **System Resources**: Time, randomization, environment variables
4. **Network Resources**: HTTP requests, WebSocket connections

### Mock Implementation Approaches

#### Vitest Mocks

```typescript
// Automatic mocking
vi.mock('@/services/DatabaseService');

// Manual mocking with implementation
vi.mock('@/services/EventPublisher', () => ({
  EventPublisher: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue({ unsubscribe: vi.fn() })
  }))
}));

// Partial mocking
vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual('@/utils/logger');
  return {
    ...actual,
    logError: vi.fn()
  };
});
```

#### Mock Service Objects

```typescript
// tests/__mocks__/services/MockEventStore.ts
export class MockEventStore implements EventStore {
  private events: Map<string, BaseEvent[]> = new Map();

  async appendEvents(
    aggregateId: string,
    expectedVersion: number,
    events: BaseEvent[]
  ): Promise<void> {
    const existing = this.events.get(aggregateId) || [];
    this.events.set(aggregateId, [...existing, ...events]);
  }

  async readEvents(
    aggregateId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<BaseEvent[]> {
    const events = this.events.get(aggregateId) || [];
    return events.slice(fromVersion, toVersion);
  }

  // Helper methods for testing
  getStoredEvents(aggregateId: string): BaseEvent[] {
    return this.events.get(aggregateId) || [];
  }

  clear(): void {
    this.events.clear();
  }
}
```

#### Mock Factories

```typescript
// tests/utils/mock-builders.ts
export const createMockEventStore = (overrides: Partial<EventStore> = {}) => ({
  appendEvents: vi.fn().mockResolvedValue(undefined),
  readEvents: vi.fn().mockResolvedValue([]),
  readEventsByType: vi.fn().mockResolvedValue([]),
  queryEvents: vi.fn().mockResolvedValue({ events: [], totalCount: 0 }),
  ...overrides
});

export const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
});
```

## Snapshot Testing

### When to Use Snapshots

- **Configuration Objects**: Complex configuration generation
- **Serialization Output**: JSON/XML serialization results
- **Error Messages**: Consistent error formatting
- **Generated Code**: Template-generated code output
- **UI Component Output**: Component rendering (when using component tests)

### Snapshot Best Practices

```typescript
describe('FormConfigurationGenerator', () => {
  it('should generate correct configuration for basic form', () => {
    const form = FormBuilder.create()
      .withName('Contact Form')
      .withFields([
        { type: 'text', name: 'name', required: true },
        { type: 'email', name: 'email', required: true }
      ])
      .build();

    const config = FormConfigurationGenerator.generate(form);

    // Use inline snapshots for small, important values
    expect(config.validation.rules.length).toMatchInlineSnapshot('2');

    // Use file snapshots for large objects
    expect(config).toMatchSnapshot();
  });

  it('should generate different configuration for complex form', () => {
    const form = FormBuilder.create()
      .withName('Survey Form')
      .withConditionalLogic()
      .withValidation()
      .build();

    const config = FormConfigurationGenerator.generate(form);
    expect(config).toMatchSnapshot();
  });
});
```

### Snapshot Management

- **Update Strategy**: Update snapshots only when intentional changes are made
- **Review Process**: All snapshot updates must be reviewed in code review
- **Organization**: Group related snapshots in logical directories
- **Naming**: Use descriptive snapshot names that explain the test case

## Performance Testing

### Unit-Level Performance Tests

```typescript
describe('EventStore Performance', () => {
  it('should handle batch event insertion efficiently', async () => {
    const eventStore = new EventStore();
    const events = EventFactory.buildList(1000);

    const startTime = performance.now();
    await eventStore.appendEvents('perf-test', 0, events);
    const endTime = performance.now();

    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(1000); // 1 second max
  });

  it('should query events within performance thresholds', async () => {
    const eventStore = new EventStore();
    await seedEventStore(eventStore, 10000); // Helper to seed data

    const startTime = performance.now();
    const results = await eventStore.queryEvents({
      eventTypes: ['form.created', 'form.updated'],
      timestampRange: {
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31')
      }
    });
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(500); // 500ms max
    expect(results.events.length).toBeGreaterThan(0);
  });
});
```

### Memory Usage Testing

```typescript
describe('Memory Usage', () => {
  it('should not leak memory during event processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Process many events
    for (let i = 0; i < 1000; i++) {
      const event = EventFactory.build();
      await eventProcessor.process(event);
    }

    // Force garbage collection (in test environment)
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max
  });
});
```

## LLM Agent Testing Support

### Agent-Generated Test Guidelines

LLM agents writing tests should follow these specific patterns and requirements:

1. **Test Structure Compliance**: All generated tests must follow the established naming conventions and organization patterns
2. **Coverage Requirements**: Generated tests must meet minimum coverage thresholds
3. **Mock Usage**: Proper use of established mock patterns and factories
4. **Assertion Quality**: Clear, specific assertions that test behavior, not implementation
5. **Error Case Coverage**: Include both happy path and error scenarios

### Agent Test Templates

Provide standardized templates for common test scenarios:

```typescript
// Template: Basic Component Test
describe('[ComponentName]', () => {
  let component: [ComponentType];
  let mockDependency: Mock<[DependencyType]>;

  beforeEach(() => {
    mockDependency = createMock[DependencyType]();
    component = new [ComponentType](mockDependency);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('[method/functionality]', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      const input = [testInput];
      mockDependency.[method].mockResolvedValue([expectedValue]);

      // Act
      const result = await component.[method](input);

      // Assert
      expect(result).toEqual([expectedResult]);
      expect(mockDependency.[method]).toHaveBeenCalledWith([expectedArgs]);
    });

    it('should handle [error condition] gracefully', async () => {
      // Arrange
      const input = [invalidInput];
      mockDependency.[method].mockRejectedValue(new Error('[error message]'));

      // Act & Assert
      await expect(component.[method](input))
        .rejects
        .toThrow('[expected error message]');
    });
  });
});
```

### Validation Rules for Agent Tests

```typescript
// Test validation helper for LLM-generated tests
export const validateLLMGeneratedTest = (testContent: string): ValidationResult => {
  const violations: string[] = [];

  // Check for required patterns
  if (!testContent.includes('describe(')) {
    violations.push('Missing describe block');
  }

  if (!testContent.includes('it(') && !testContent.includes('test(')) {
    violations.push('Missing test cases');
  }

  // Check for proper mock usage
  if (testContent.includes('new Mock') && !testContent.includes('createMock')) {
    violations.push('Use createMock helper instead of direct Mock instantiation');
  }

  // Check for assertion patterns
  if (!testContent.includes('expect(')) {
    violations.push('Missing assertions');
  }

  return {
    isValid: violations.length === 0,
    violations
  };
};
```

## Integration with Development Workflow

### Test-Driven Development (TDD) Cycle

1. **Red**: Write a failing test that describes the desired behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Improve the code while keeping tests green
4. **Repeat**: Continue the cycle for each new feature or change

### Continuous Testing

- **Watch Mode**: Use Vitest's watch mode during development
- **File Watching**: Automatically run related tests when files change
- **Quick Feedback**: Immediate test results in terminal or IDE
- **Hot Module Replacement**: Update tests without full reload

```bash
# Development commands
npm run test:watch          # Watch mode for active development
npm run test:coverage       # Run tests with coverage report
npm run test:ui            # Interactive test UI
npm run test:related       # Run tests related to changed files
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "npm run test:related",
      "npm run lint:fix",
      "git add"
    ]
  }
}
```

## Relationships
- **Parent Nodes:** [foundation/testing/index.md] - categorizes - Unit testing as part of overall testing strategy
- **Child Nodes:**
  - [foundation/testing/standards.md] - details - Coding standards and conventions
  - [foundation/testing/patterns.md] - provides - Common testing patterns and examples
  - [foundation/testing/llm-instructions.md] - specifies - LLM agent testing guidelines
  - [foundation/testing/ci-integration.md] - defines - CI/CD pipeline integration
- **Related Nodes:**
  - [foundation/components/event-engine/specification.md] - tested-by - Event engine testing requirements
  - [foundation/components/form-engine/specification.md] - tested-by - Form engine testing requirements
  - [processes/creation.md] - includes - Testing as part of creation process

## Navigation Guidance
- **Access Context**: Reference when implementing new components or writing tests
- **Common Next Steps**: Review specific testing standards or patterns documentation
- **Related Tasks**: Component development, test implementation, CI/CD setup
- **Update Patterns**: Update when testing requirements change or new patterns are established

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-1 Implementation

## Change History
- 2025-01-22: Initial unit testing strategy document creation