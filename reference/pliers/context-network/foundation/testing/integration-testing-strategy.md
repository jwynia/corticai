# Integration Testing Strategy

## Purpose
This document defines the comprehensive integration testing strategy for the Pliers v3 platform, covering API endpoint testing, database integration, external service interactions, and multi-component collaboration testing using Supertest and related frameworks.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Overview

Integration testing validates the interaction between multiple components, services, and external dependencies in the Pliers v3 platform. It ensures that components work correctly together and that the system behaves as expected when real dependencies are involved.

### Core Principles

1. **Real Dependencies**: Test with actual database, cache, and external services when possible
2. **Controlled Environment**: Use isolated test environments to ensure consistency
3. **Data Isolation**: Each test should have clean, isolated data
4. **Comprehensive Coverage**: Test all integration points and data flows
5. **Performance Awareness**: Monitor performance characteristics during integration tests
6. **Failure Simulation**: Test error conditions and recovery mechanisms

## Integration Testing Framework

### Primary Framework: Supertest

**Selected Framework**: Supertest v6.x with Vitest

**Rationale**:
- Seamless integration with HTTP servers (Express, Fastify, Hono)
- Built-in assertion library for HTTP responses
- Support for testing WebSocket connections with additional tools
- Easy mocking and stubbing of external dependencies
- Excellent TypeScript support
- Compatible with Vitest for consistent testing experience

### Supporting Tools

- **Test Database**: PostgreSQL with database-per-test isolation
- **Cache Testing**: Redis with test-specific databases
- **WebSocket Testing**: ws library for WebSocket integration tests
- **API Client Testing**: Custom clients built on fetch API
- **External Service Mocking**: MSW (Mock Service Worker) for external API mocking

## Test Environment Setup

### Database Configuration

```typescript
// tests/setup/integration-database.setup.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export class IntegrationTestDatabase {
  private static instances = new Map<string, IntegrationTestDatabase>();
  private pool: Pool;
  private databaseName: string;

  constructor(private testId: string) {
    this.databaseName = `pliers_test_${testId}_${uuidv4().replace(/-/g, '')}`;
  }

  static async create(testId: string): Promise<IntegrationTestDatabase> {
    if (!IntegrationTestDatabase.instances.has(testId)) {
      const instance = new IntegrationTestDatabase(testId);
      await instance.initialize();
      IntegrationTestDatabase.instances.set(testId, instance);
    }
    return IntegrationTestDatabase.instances.get(testId)!;
  }

  private async initialize(): Promise<void> {
    // Connect to admin database to create test database
    const adminPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres'
    });

    try {
      await adminPool.query(`CREATE DATABASE "${this.databaseName}"`);

      // Create connection pool for test database
      this.pool = new Pool({
        connectionString: `${process.env.DATABASE_URL?.replace('/postgres', '')}/${this.databaseName}`
      });

      // Run migrations
      await this.runMigrations();

    } finally {
      await adminPool.end();
    }
  }

  private async runMigrations(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const migrationDir = path.resolve('./migrations');
      const files = await fs.readdir(migrationDir);

      for (const file of files.sort()) {
        if (file.endsWith('.sql')) {
          const migration = await fs.readFile(path.join(migrationDir, file), 'utf8');
          await this.pool.query(migration);
        }
      }
    } catch (error) {
      console.warn('Migration directory not found or empty:', error);
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanup(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }

    // Drop test database
    const adminPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres'
    });

    try {
      await adminPool.query(`DROP DATABASE IF EXISTS "${this.databaseName}"`);
    } finally {
      await adminPool.end();
    }
  }

  get connectionString(): string {
    return `${process.env.DATABASE_URL?.replace('/postgres', '')}/${this.databaseName}`;
  }
}
```

### Cache Configuration

```typescript
// tests/setup/integration-cache.setup.ts
import Redis from 'ioredis';

export class IntegrationTestCache {
  private static instances = new Map<string, IntegrationTestCache>();
  private redis: Redis;
  private databaseIndex: number;

  constructor(private testId: string) {
    // Use a unique database index for each test
    this.databaseIndex = Math.floor(Math.random() * 10) + 5; // Use databases 5-14 for tests
  }

  static async create(testId: string): Promise<IntegrationTestCache> {
    if (!IntegrationTestCache.instances.has(testId)) {
      const instance = new IntegrationTestCache(testId);
      await instance.initialize();
      IntegrationTestCache.instances.set(testId, instance);
    }
    return IntegrationTestCache.instances.get(testId)!;
  }

  private async initialize(): Promise<void> {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: this.databaseIndex,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1
    });

    // Clear the database
    await this.redis.flushdb();
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async cleanup(): Promise<void> {
    if (this.redis) {
      await this.redis.flushdb();
      await this.redis.disconnect();
    }
  }

  get client(): Redis {
    return this.redis;
  }
}
```

### Application Server Setup

```typescript
// tests/setup/integration-server.setup.ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { EventEngine } from '@/components/EventEngine';
import { FormEngine } from '@/components/FormEngine';
import { SubmissionEngine } from '@/components/SubmissionEngine';
import { IntegrationTestDatabase } from './integration-database.setup';
import { IntegrationTestCache } from './integration-cache.setup';

export class IntegrationTestServer {
  private app: Hono;
  private server: any;
  private port: number;
  private database: IntegrationTestDatabase;
  private cache: IntegrationTestCache;

  constructor(private testId: string) {
    this.port = parseInt(process.env.TEST_PORT || '0'); // 0 for random port
  }

  async initialize(): Promise<void> {
    // Setup test infrastructure
    this.database = await IntegrationTestDatabase.create(this.testId);
    this.cache = await IntegrationTestCache.create(this.testId);

    // Initialize application components
    const eventEngine = new EventEngine({
      connectionString: this.database.connectionString,
      cacheClient: this.cache.client
    });

    const formEngine = new FormEngine({
      eventEngine,
      connectionString: this.database.connectionString
    });

    const submissionEngine = new SubmissionEngine({
      eventEngine,
      formEngine,
      connectionString: this.database.connectionString
    });

    // Setup Hono application
    this.app = new Hono();

    // Mount API routes
    this.app.route('/v1/events', await this.createEventRoutes(eventEngine));
    this.app.route('/v1/forms', await this.createFormRoutes(formEngine));
    this.app.route('/v1/submissions', await this.createSubmissionRoutes(submissionEngine));

    // Health check endpoint
    this.app.get('/health', (c) => {
      return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        testId: this.testId
      });
    });

    // Start server
    this.server = serve({
      fetch: this.app.fetch,
      port: this.port
    });

    // Get actual port if random port was used
    if (this.port === 0) {
      this.port = this.server.address()?.port || 3000;
    }
  }

  private async createEventRoutes(eventEngine: EventEngine): Promise<Hono> {
    const router = new Hono();

    router.post('/events', async (c) => {
      try {
        const { event } = await c.req.json();
        const result = await eventEngine.publishEvent(event);
        return c.json({ success: true, data: result }, 201);
      } catch (error) {
        return c.json({
          success: false,
          error: { message: error.message }
        }, 400);
      }
    });

    router.get('/events/aggregates/:aggregateId', async (c) => {
      try {
        const aggregateId = c.req.param('aggregateId');
        const events = await eventEngine.getEventsByAggregate(aggregateId);
        return c.json({ success: true, data: { events } });
      } catch (error) {
        return c.json({
          success: false,
          error: { message: error.message }
        }, 400);
      }
    });

    router.post('/events/query', async (c) => {
      try {
        const { query } = await c.req.json();
        const result = await eventEngine.queryEvents(query);
        return c.json({ success: true, data: result });
      } catch (error) {
        return c.json({
          success: false,
          error: { message: error.message }
        }, 400);
      }
    });

    return router;
  }

  private async createFormRoutes(formEngine: FormEngine): Promise<Hono> {
    const router = new Hono();

    router.post('/forms', async (c) => {
      try {
        const formData = await c.req.json();
        const form = await formEngine.createForm(formData);
        return c.json({ success: true, data: form }, 201);
      } catch (error) {
        return c.json({
          success: false,
          error: { message: error.message }
        }, 400);
      }
    });

    router.get('/forms/:formId', async (c) => {
      try {
        const formId = c.req.param('formId');
        const form = await formEngine.getForm(formId);
        return c.json({ success: true, data: form });
      } catch (error) {
        return c.json({
          success: false,
          error: { message: error.message }
        }, 404);
      }
    });

    return router;
  }

  private async createSubmissionRoutes(submissionEngine: SubmissionEngine): Promise<Hono> {
    const router = new Hono();

    router.post('/submissions', async (c) => {
      try {
        const submissionData = await c.req.json();
        const submission = await submissionEngine.createSubmission(submissionData);
        return c.json({ success: true, data: submission }, 201);
      } catch (error) {
        return c.json({
          success: false,
          error: { message: error.message }
        }, 400);
      }
    });

    return router;
  }

  async cleanup(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }

    if (this.database) {
      await this.database.cleanup();
    }

    if (this.cache) {
      await this.cache.cleanup();
    }
  }

  get baseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  get honoApp(): Hono {
    return this.app;
  }
}
```

## Integration Test Patterns

### API Integration Testing

```typescript
// tests/integration/api/event-engine.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { EventFactory } from '@tests/utils/factories/EventFactory';

describe('Event Engine API Integration', () => {
  let server: IntegrationTestServer;
  let baseUrl: string;

  beforeAll(async () => {
    server = new IntegrationTestServer('event-engine-api');
    await server.initialize();
    baseUrl = server.baseUrl;
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('POST /v1/events/events', () => {
    it('should publish event and store in database', async () => {
      const event = EventFactory.build({
        type: 'form.created',
        aggregateId: 'form-123',
        payload: {
          formId: 'form-123',
          name: 'Contact Form',
          definition: {
            fields: [
              { name: 'email', type: 'email', required: true }
            ]
          }
        }
      });

      const response = await request(server.honoApp)
        .post('/v1/events/events')
        .send({ event })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          eventId: event.id,
          published: true
        }
      });

      // Verify event is stored in database
      const queryResponse = await request(server.honoApp)
        .get(`/v1/events/events/aggregates/${event.aggregateId}`)
        .expect(200);

      expect(queryResponse.body.success).toBe(true);
      expect(queryResponse.body.data.events).toHaveLength(1);
      expect(queryResponse.body.data.events[0]).toMatchObject({
        id: event.id,
        type: 'form.created',
        aggregateId: 'form-123'
      });
    });

    it('should reject invalid event data', async () => {
      const invalidEvent = {
        type: 'invalid.type',
        // Missing required fields
      };

      const response = await request(server.honoApp)
        .post('/v1/events/events')
        .send({ event: invalidEvent })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('validation')
        }
      });
    });

    it('should handle sequence conflicts', async () => {
      const aggregateId = 'conflict-test';

      const event1 = EventFactory.build({
        aggregateId,
        sequenceNumber: 1
      });

      const event2 = EventFactory.build({
        aggregateId,
        sequenceNumber: 1 // Intentional conflict
      });

      // First event should succeed
      await request(server.honoApp)
        .post('/v1/events/events')
        .send({ event: event1 })
        .expect(201);

      // Second event should fail due to sequence conflict
      const response = await request(server.honoApp)
        .post('/v1/events/events')
        .send({ event: event2 })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('sequence')
        }
      });
    });
  });

  describe('POST /v1/events/events/query', () => {
    beforeEach(async () => {
      // Seed test data
      const events = [
        EventFactory.build({ type: 'form.created', aggregateId: 'form-1' }),
        EventFactory.build({ type: 'form.updated', aggregateId: 'form-1' }),
        EventFactory.build({ type: 'submission.created', aggregateId: 'sub-1' })
      ];

      for (const event of events) {
        await request(server.honoApp)
          .post('/v1/events/events')
          .send({ event })
          .expect(201);
      }
    });

    it('should query events by type', async () => {
      const query = {
        eventTypes: ['form.created', 'form.updated'],
        limit: 10
      };

      const response = await request(server.honoApp)
        .post('/v1/events/events/query')
        .send({ query })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every(e =>
        ['form.created', 'form.updated'].includes(e.type)
      )).toBe(true);
    });

    it('should query events by aggregate', async () => {
      const query = {
        aggregateIds: ['form-1'],
        limit: 10
      };

      const response = await request(server.honoApp)
        .post('/v1/events/events/query')
        .send({ query })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every(e =>
        e.aggregateId === 'form-1'
      )).toBe(true);
    });

    it('should respect query limits', async () => {
      const query = {
        limit: 1
      };

      const response = await request(server.honoApp)
        .post('/v1/events/events/query')
        .send({ query })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(1);
    });
  });
});
```

### Cross-Component Integration Testing

```typescript
// tests/integration/workflows/form-submission.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { FormBuilder } from '@tests/utils/builders/FormBuilder';

describe('Form Submission Workflow Integration', () => {
  let server: IntegrationTestServer;

  beforeAll(async () => {
    server = new IntegrationTestServer('form-submission-workflow');
    await server.initialize();
  });

  afterAll(async () => {
    await server.cleanup();
  });

  it('should handle complete form creation and submission workflow', async () => {
    // Step 1: Create a form
    const formData = FormBuilder
      .create()
      .withName('Registration Form')
      .withTextField('name', true)
      .withTextField('email', true)
      .withValidation([
        { field: 'email', type: 'email' },
        { field: 'name', type: 'minLength', value: 2 }
      ])
      .build();

    const createFormResponse = await request(server.honoApp)
      .post('/v1/forms/forms')
      .send(formData)
      .expect(201);

    expect(createFormResponse.body.success).toBe(true);
    const formId = createFormResponse.body.data.id;

    // Step 2: Verify form creation event was published
    const formEventsResponse = await request(server.honoApp)
      .get(`/v1/events/events/aggregates/${formId}`)
      .expect(200);

    expect(formEventsResponse.body.data.events).toHaveLength(1);
    expect(formEventsResponse.body.data.events[0].type).toBe('form.created');

    // Step 3: Submit data to the form
    const submissionData = {
      formId,
      data: {
        name: 'John Doe',
        email: 'john@example.com'
      },
      submittedBy: 'user-123'
    };

    const submitResponse = await request(server.honoApp)
      .post('/v1/submissions/submissions')
      .send(submissionData)
      .expect(201);

    expect(submitResponse.body.success).toBe(true);
    const submissionId = submitResponse.body.data.id;

    // Step 4: Verify submission event was published
    const submissionEventsResponse = await request(server.honoApp)
      .get(`/v1/events/events/aggregates/${submissionId}`)
      .expect(200);

    expect(submissionEventsResponse.body.data.events).toHaveLength(1);
    expect(submissionEventsResponse.body.data.events[0].type).toBe('submission.created');

    // Step 5: Verify cross-references
    const allEventsResponse = await request(server.honoApp)
      .post('/v1/events/events/query')
      .send({
        query: {
          eventTypes: ['form.created', 'submission.created'],
          limit: 10
        }
      })
      .expect(200);

    expect(allEventsResponse.body.data.events).toHaveLength(2);

    const formEvent = allEventsResponse.body.data.events.find(e => e.type === 'form.created');
    const submissionEvent = allEventsResponse.body.data.events.find(e => e.type === 'submission.created');

    expect(submissionEvent.payload.formId).toBe(formEvent.aggregateId);
  });

  it('should handle form validation during submission', async () => {
    // Create form with validation
    const formData = FormBuilder
      .create()
      .withName('Validated Form')
      .withTextField('email', true)
      .withValidation([{ field: 'email', type: 'email' }])
      .build();

    const createFormResponse = await request(server.honoApp)
      .post('/v1/forms/forms')
      .send(formData)
      .expect(201);

    const formId = createFormResponse.body.data.id;

    // Submit invalid data
    const invalidSubmissionData = {
      formId,
      data: {
        email: 'invalid-email' // Invalid email format
      },
      submittedBy: 'user-123'
    };

    const submitResponse = await request(server.honoApp)
      .post('/v1/submissions/submissions')
      .send(invalidSubmissionData)
      .expect(400);

    expect(submitResponse.body.success).toBe(false);
    expect(submitResponse.body.error.message).toMatch(/validation/i);
  });
});
```

### Database Transaction Testing

```typescript
// tests/integration/database/transactions.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntegrationTestDatabase } from '@tests/setup/integration-database.setup';
import { EventEngine } from '@/components/EventEngine';
import { EventFactory } from '@tests/utils/factories/EventFactory';

describe('Database Transaction Integration', () => {
  let database: IntegrationTestDatabase;
  let eventEngine: EventEngine;

  beforeAll(async () => {
    database = await IntegrationTestDatabase.create('database-transactions');
    eventEngine = new EventEngine({
      connectionString: database.connectionString
    });
  });

  afterAll(async () => {
    await database.cleanup();
  });

  it('should rollback transaction on error', async () => {
    const aggregateId = 'transaction-test';

    // Create a valid event
    const validEvent = EventFactory.build({
      aggregateId,
      sequenceNumber: 1,
      type: 'test.valid'
    });

    // Create an invalid event that will cause a constraint violation
    const invalidEvent = EventFactory.build({
      aggregateId,
      sequenceNumber: 1, // Same sequence number - should cause conflict
      type: 'test.invalid'
    });

    // Publish valid event first
    await eventEngine.publishEvent(validEvent);

    // Verify event exists
    const eventsBeforeError = await eventEngine.getEventsByAggregate(aggregateId);
    expect(eventsBeforeError).toHaveLength(1);

    // Attempt to publish invalid event (should fail and rollback)
    await expect(eventEngine.publishEvent(invalidEvent))
      .rejects
      .toThrow();

    // Verify only the first event exists (transaction was rolled back)
    const eventsAfterError = await eventEngine.getEventsByAggregate(aggregateId);
    expect(eventsAfterError).toHaveLength(1);
    expect(eventsAfterError[0].id).toBe(validEvent.id);
  });

  it('should handle concurrent transactions correctly', async () => {
    const aggregateId = 'concurrent-test';

    const events = Array.from({ length: 10 }, (_, i) =>
      EventFactory.build({
        aggregateId,
        sequenceNumber: i + 1,
        type: 'test.concurrent'
      })
    );

    // Publish events concurrently
    const publishPromises = events.map(event =>
      eventEngine.publishEvent(event)
    );

    // Some may fail due to sequence conflicts, but that's expected
    const results = await Promise.allSettled(publishPromises);

    // At least one should succeed
    const successfulResults = results.filter(r => r.status === 'fulfilled');
    expect(successfulResults.length).toBeGreaterThan(0);

    // Verify stored events maintain sequence integrity
    const storedEvents = await eventEngine.getEventsByAggregate(aggregateId);
    expect(storedEvents.length).toBe(successfulResults.length);

    // Events should be in sequence order
    storedEvents.forEach((event, index) => {
      expect(event.sequenceNumber).toBe(index + 1);
    });
  });

  it('should handle large batch operations within transaction limits', async () => {
    const batchSize = 1000;
    const aggregateId = 'batch-test';

    const events = Array.from({ length: batchSize }, (_, i) =>
      EventFactory.build({
        aggregateId,
        sequenceNumber: i + 1,
        type: 'test.batch'
      })
    );

    // Publish events in batch
    await database.transaction(async (client) => {
      for (const event of events) {
        await client.query(
          'INSERT INTO events (id, type, aggregate_id, sequence_number, payload) VALUES ($1, $2, $3, $4, $5)',
          [event.id, event.type, event.aggregateId, event.sequenceNumber, JSON.stringify(event.payload)]
        );
      }
    });

    // Verify all events were stored
    const storedEvents = await eventEngine.getEventsByAggregate(aggregateId);
    expect(storedEvents).toHaveLength(batchSize);
  });
});
```

### External Service Integration Testing

```typescript
// tests/integration/external/email-service.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { EmailService } from '@/services/EmailService';

describe('Email Service Integration', () => {
  const mockServer = setupServer(
    // Mock email service endpoint
    rest.post('https://api.sendgrid.com/v3/mail/send', (req, res, ctx) => {
      return res(
        ctx.status(202),
        ctx.json({
          message_id: 'test-message-id-123'
        })
      );
    }),

    // Mock template service
    rest.get('https://api.sendgrid.com/v3/templates/:templateId', (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          id: req.params.templateId,
          name: 'Test Template',
          subject: 'Test Subject'
        })
      );
    })
  );

  let emailService: EmailService;

  beforeAll(() => {
    mockServer.listen();
    emailService = new EmailService({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.sendgrid.com/v3'
    });
  });

  afterAll(() => {
    mockServer.close();
  });

  beforeEach(() => {
    mockServer.resetHandlers();
  });

  it('should send email successfully', async () => {
    const emailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email',
      templateId: 'template-123'
    };

    const result = await emailService.sendEmail(emailData);

    expect(result).toMatchObject({
      messageId: 'test-message-id-123',
      success: true
    });
  });

  it('should handle email service failures', async () => {
    // Override handler to simulate failure
    mockServer.use(
      rest.post('https://api.sendgrid.com/v3/mail/send', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            errors: [{ message: 'Internal server error' }]
          })
        );
      })
    );

    const emailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email'
    };

    await expect(emailService.sendEmail(emailData))
      .rejects
      .toThrow('Email service error');
  });

  it('should retry on transient failures', async () => {
    let callCount = 0;

    mockServer.use(
      rest.post('https://api.sendgrid.com/v3/mail/send', (req, res, ctx) => {
        callCount++;

        if (callCount <= 2) {
          // Fail first two attempts
          return res(
            ctx.status(429), // Rate limit
            ctx.json({
              errors: [{ message: 'Rate limit exceeded' }]
            })
          );
        }

        // Succeed on third attempt
        return res(
          ctx.status(202),
          ctx.json({
            message_id: 'retry-success-123'
          })
        );
      })
    );

    const emailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email'
    };

    const result = await emailService.sendEmail(emailData);

    expect(callCount).toBe(3);
    expect(result.messageId).toBe('retry-success-123');
  });
});
```

### WebSocket Integration Testing

```typescript
// tests/integration/websocket/event-streaming.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { EventFactory } from '@tests/utils/factories/EventFactory';

describe('WebSocket Event Streaming Integration', () => {
  let server: IntegrationTestServer;
  let wsUrl: string;

  beforeAll(async () => {
    server = new IntegrationTestServer('websocket-streaming');
    await server.initialize();
    wsUrl = server.baseUrl.replace('http', 'ws') + '/v1/events/stream';
  });

  afterAll(async () => {
    await server.cleanup();
  });

  it('should stream events to connected clients', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const receivedEvents: any[] = [];

      ws.on('open', () => {
        // Subscribe to events
        ws.send(JSON.stringify({
          type: 'subscribe',
          filter: {
            eventTypes: ['test.streaming']
          }
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'subscription_confirmed') {
          // Publish test event via HTTP API
          fetch(`${server.baseUrl}/v1/events/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: EventFactory.build({
                type: 'test.streaming',
                payload: { message: 'WebSocket test' }
              })
            })
          });
        } else if (message.type === 'event') {
          receivedEvents.push(message.data);

          expect(message.data.type).toBe('test.streaming');
          expect(message.data.payload.message).toBe('WebSocket test');

          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('WebSocket test timeout'));
      }, 5000);
    });
  });

  it('should handle multiple simultaneous subscriptions', async () => {
    const numClients = 5;
    const clients: WebSocket[] = [];
    const receivedCounts: number[] = new Array(numClients).fill(0);

    try {
      // Create multiple WebSocket connections
      for (let i = 0; i < numClients; i++) {
        const ws = new WebSocket(wsUrl);
        clients.push(ws);

        await new Promise<void>((resolve) => {
          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'subscribe',
              filter: {
                eventTypes: ['test.multi']
              }
            }));
            resolve();
          });
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'event') {
            receivedCounts[i]++;
          }
        });
      }

      // Publish multiple events
      const numEvents = 3;
      for (let i = 0; i < numEvents; i++) {
        await fetch(`${server.baseUrl}/v1/events/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: EventFactory.build({
              type: 'test.multi',
              payload: { eventNumber: i }
            })
          })
        });
      }

      // Wait for events to be delivered
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Each client should have received all events
      receivedCounts.forEach(count => {
        expect(count).toBe(numEvents);
      });

    } finally {
      // Clean up connections
      clients.forEach(ws => ws.close());
    }
  });
});
```

## Performance Integration Testing

### Response Time Testing

```typescript
// tests/integration/performance/api-performance.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { EventFactory } from '@tests/utils/factories/EventFactory';

describe('API Performance Integration', () => {
  let server: IntegrationTestServer;

  beforeAll(async () => {
    server = new IntegrationTestServer('api-performance');
    await server.initialize();
  });

  afterAll(async () => {
    await server.cleanup();
  });

  it('should handle single event publication within performance threshold', async () => {
    const event = EventFactory.build();
    const startTime = Date.now();

    const response = await request(server.honoApp)
      .post('/v1/events/events')
      .send({ event })
      .expect(201);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.body.success).toBe(true);
    expect(responseTime).toBeLessThan(100); // 100ms threshold
  });

  it('should handle concurrent requests efficiently', async () => {
    const numRequests = 50;
    const events = Array.from({ length: numRequests }, () => EventFactory.build());

    const startTime = Date.now();

    const promises = events.map(event =>
      request(server.honoApp)
        .post('/v1/events/events')
        .send({ event })
        .expect(201)
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.body.success).toBe(true);
    });

    // Average response time should be reasonable
    const avgResponseTime = totalTime / numRequests;
    expect(avgResponseTime).toBeLessThan(50); // 50ms average
  });

  it('should handle large query results efficiently', async () => {
    // Seed large number of events
    const numEvents = 1000;
    const aggregateId = 'large-query-test';

    for (let i = 0; i < numEvents; i++) {
      const event = EventFactory.build({
        aggregateId,
        sequenceNumber: i + 1
      });

      await request(server.honoApp)
        .post('/v1/events/events')
        .send({ event });
    }

    // Query all events
    const startTime = Date.now();

    const response = await request(server.honoApp)
      .get(`/v1/events/events/aggregates/${aggregateId}`)
      .expect(200);

    const endTime = Date.now();
    const queryTime = endTime - startTime;

    expect(response.body.data.events).toHaveLength(numEvents);
    expect(queryTime).toBeLessThan(500); // 500ms threshold for large query
  });
});
```

### Memory Usage Testing

```typescript
// tests/integration/performance/memory-usage.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { EventFactory } from '@tests/utils/factories/EventFactory';

describe('Memory Usage Integration', () => {
  let server: IntegrationTestServer;

  beforeAll(async () => {
    server = new IntegrationTestServer('memory-usage');
    await server.initialize();
  });

  afterAll(async () => {
    await server.cleanup();
  });

  it('should not leak memory during continuous operation', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const numIterations = 1000;

    for (let i = 0; i < numIterations; i++) {
      const event = EventFactory.build({
        sequenceNumber: i + 1,
        payload: { iteration: i }
      });

      await fetch(`${server.baseUrl}/v1/events/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event })
      });

      // Force garbage collection every 100 iterations
      if (i % 100 === 0 && global.gc) {
        global.gc();
      }
    }

    // Final garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## Configuration and Setup

### Vitest Integration Configuration

```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.integration.test.ts'],
    exclude: ['tests/unit/**', 'tests/e2e/**'],

    // Integration tests need more time
    testTimeout: 30000,
    hookTimeout: 20000,

    // Run sequentially to avoid conflicts
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1
      }
    },

    // Setup files
    setupFiles: [
      './tests/setup/integration.setup.ts'
    ],

    // Environment variables
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/postgres',
      REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
      TEST_PORT: '0' // Use random port
    },

    // Retry configuration for flaky tests
    retry: 2,

    // Coverage for integration tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage/integration',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.mock.ts',
        'tests/**'
      ]
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:integration:watch": "vitest --config vitest.integration.config.ts",
    "test:integration:ui": "vitest --ui --config vitest.integration.config.ts",
    "test:integration:coverage": "vitest run --coverage --config vitest.integration.config.ts"
  }
}
```

## Best Practices and Guidelines

### Test Organization

1. **Group by Feature**: Organize tests by the main feature or component being tested
2. **Clear Naming**: Use descriptive test names that explain the scenario
3. **Setup and Teardown**: Properly initialize and clean up test environments
4. **Test Isolation**: Each test should be independent and not affect others
5. **Data Management**: Use factories and builders for consistent test data

### Performance Considerations

1. **Database Per Test**: Use separate databases to avoid conflicts
2. **Connection Pooling**: Reuse database connections where possible
3. **Parallel Execution**: Run independent tests in parallel when safe
4. **Resource Cleanup**: Always clean up resources to prevent memory leaks
5. **Monitoring**: Track test execution times and memory usage

### Error Handling

1. **Specific Assertions**: Test for specific error types and messages
2. **Recovery Testing**: Test system recovery from various failure scenarios
3. **Boundary Conditions**: Test edge cases and limits
4. **Network Failures**: Simulate and test network-related failures
5. **Graceful Degradation**: Verify system continues operating when dependencies fail

### Maintenance

1. **Regular Updates**: Keep test infrastructure updated with application changes
2. **Performance Monitoring**: Monitor test execution time and optimize slow tests
3. **Documentation**: Document complex test scenarios and setups
4. **Code Review**: Include integration tests in code review process
5. **CI Integration**: Ensure tests run reliably in CI/CD pipeline

## Relationships
- **Parent Nodes:** [foundation/testing/index.md] - categorizes - Integration testing as part of overall testing strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/unit-testing-strategy.md] - complements - Unit testing with integration coverage
  - [foundation/testing/standards.md] - follows - Testing standards and conventions
  - [foundation/testing/patterns.md] - implements - Testing patterns for integration scenarios
  - [foundation/components/event-engine/api.md] - tests - Event Engine API endpoints
  - [foundation/components/form-engine/api.md] - tests - Form Engine API endpoints

## Navigation Guidance
- **Access Context**: Reference when implementing integration tests or setting up test infrastructure
- **Common Next Steps**: Review E2E testing strategy or specific component API documentation
- **Related Tasks**: API testing, database integration testing, system integration verification
- **Update Patterns**: Update when new components are added or API contracts change

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-2 Implementation

## Change History
- 2025-01-22: Initial integration testing strategy document creation with comprehensive Supertest patterns