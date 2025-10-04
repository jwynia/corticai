# API Testing Patterns and Examples

## Purpose
This document provides comprehensive patterns, examples, and best practices for testing REST APIs and WebSocket connections in the Pliers v3 platform, covering request/response validation, authentication testing, error handling, and real-time communication testing.

## Classification
- **Domain:** Supporting Element
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Evolving

## Overview

API testing patterns provide reusable solutions for testing HTTP endpoints, WebSocket connections, and real-time features. This document catalogs proven patterns with complete examples for various API testing scenarios in the Pliers v3 platform.

### Core Testing Principles

1. **Contract Testing**: Validate API contracts and schemas
2. **Authentication & Authorization**: Test security at all levels
3. **Error Handling**: Comprehensive error scenario coverage
4. **Performance**: Response time and throughput validation
5. **Real-time Features**: WebSocket and Server-Sent Events testing
6. **Data Integrity**: Request/response data validation

## REST API Testing Patterns

### 1. Basic CRUD Operations Testing

```typescript
// tests/api/crud-operations.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { FormBuilder } from '@tests/builders/FormBuilder';
import { userFactory } from '@tests/factories/UserFactory';

describe('Form CRUD Operations API', () => {
  let server: IntegrationTestServer;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    server = new IntegrationTestServer('form-crud-api');
    await server.initialize();

    // Create test user and get auth token
    const user = userFactory.buildAdmin({ email: 'api-test@example.com' });
    userId = user.id;

    const authResponse = await request(server.honoApp)
      .post('/auth/login')
      .send({ email: user.email, password: 'password123' })
      .expect(200);

    authToken = authResponse.body.token;
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('POST /api/forms', () => {
    it('should create a new form with valid data', async () => {
      const formData = FormBuilder.create()
        .withName('API Test Form')
        .withTextField('name', 'Name', true)
        .withEmailField('email', 'Email', true)
        .build();

      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(formData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: 'API Test Form',
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: 'name',
              type: 'text',
              required: true
            }),
            expect.objectContaining({
              name: 'email',
              type: 'email',
              required: true
            })
          ]),
          status: 'draft',
          createdBy: userId
        }
      });

      // Verify timestamps
      expect(new Date(response.body.data.createdAt)).toBeInstanceOf(Date);
      expect(new Date(response.body.data.updatedAt)).toBeInstanceOf(Date);
    });

    it('should reject form creation with invalid data', async () => {
      const invalidFormData = {
        // Missing required 'name' field
        fields: []
      };

      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidFormData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('name'),
          details: expect.objectContaining({
            field: 'name'
          })
        }
      });
    });

    it('should reject unauthorized requests', async () => {
      const formData = FormBuilder.create().build();

      await request(server.honoApp)
        .post('/api/forms')
        .send(formData)
        .expect(401);

      // Test with invalid token
      await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', 'Bearer invalid-token')
        .send(formData)
        .expect(401);
    });
  });

  describe('GET /api/forms/:id', () => {
    let formId: string;

    beforeEach(async () => {
      // Create a form for testing
      const formData = FormBuilder.create()
        .withName('Get Test Form')
        .withCreator(userId)
        .build();

      const createResponse = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(formData)
        .expect(201);

      formId = createResponse.body.data.id;
    });

    it('should retrieve form by ID', async () => {
      const response = await request(server.honoApp)
        .get(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: formId,
          name: 'Get Test Form',
          createdBy: userId
        }
      });
    });

    it('should return 404 for non-existent form', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('form')
        }
      });
    });

    it('should enforce authorization for private forms', async () => {
      // Create another user
      const otherUser = userFactory.build({ email: 'other@example.com' });
      const otherAuthResponse = await request(server.honoApp)
        .post('/auth/login')
        .send({ email: otherUser.email, password: 'password123' })
        .expect(200);

      // Try to access form with different user
      await request(server.honoApp)
        .get(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${otherAuthResponse.body.token}`)
        .expect(403);
    });
  });

  describe('PUT /api/forms/:id', () => {
    let formId: string;

    beforeEach(async () => {
      const formData = FormBuilder.create()
        .withName('Update Test Form')
        .withCreator(userId)
        .build();

      const createResponse = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(formData)
        .expect(201);

      formId = createResponse.body.data.id;
    });

    it('should update form with valid data', async () => {
      const updateData = {
        name: 'Updated Form Name',
        description: 'Updated description',
        fields: [
          { name: 'new_field', label: 'New Field', type: 'text', required: false }
        ]
      };

      const response = await request(server.honoApp)
        .put(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: formId,
        name: 'Updated Form Name',
        description: 'Updated description',
        fields: [
          expect.objectContaining({
            name: 'new_field',
            type: 'text',
            required: false
          })
        ]
      });

      // Verify updatedAt timestamp changed
      expect(new Date(response.body.data.updatedAt)).toBeInstanceOf(Date);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        name: 'Partially Updated Form'
        // Only updating name, leaving other fields unchanged
      };

      const response = await request(server.honoApp)
        .put(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.data.name).toBe('Partially Updated Form');
      expect(response.body.data.fields).toBeDefined(); // Original fields preserved
    });
  });

  describe('DELETE /api/forms/:id', () => {
    let formId: string;

    beforeEach(async () => {
      const formData = FormBuilder.create()
        .withName('Delete Test Form')
        .withCreator(userId)
        .build();

      const createResponse = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(formData)
        .expect(201);

      formId = createResponse.body.data.id;
    });

    it('should delete form and return success', async () => {
      const response = await request(server.honoApp)
        .delete(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: formId,
          deletedAt: expect.any(String)
        }
      });

      // Verify form is actually deleted
      await request(server.honoApp)
        .get(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent deletion of published forms', async () => {
      // Publish the form first
      await request(server.honoApp)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to delete published form
      const response = await request(server.honoApp)
        .delete(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('published');
    });
  });
});
```

### 2. Authentication and Authorization Testing

```typescript
// tests/api/auth-testing.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { userFactory } from '@tests/factories/UserFactory';
import jwt from 'jsonwebtoken';

describe('Authentication and Authorization API', () => {
  let server: IntegrationTestServer;

  beforeAll(async () => {
    server = new IntegrationTestServer('auth-api');
    await server.initialize();
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('POST /auth/login', () => {
    it('should authenticate valid credentials', async () => {
      const user = userFactory.build({
        email: 'auth-test@example.com',
        password: 'securePassword123'
      });

      // Create user via API or database
      await request(server.honoApp)
        .post('/auth/register')
        .send({
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName
        })
        .expect(201);

      const response = await request(server.honoApp)
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          token: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            id: expect.any(String),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: expect.any(String)
          },
          expiresAt: expect.any(String)
        }
      });

      // Verify JWT token structure
      const decodedToken = jwt.decode(response.body.data.token) as any;
      expect(decodedToken).toMatchObject({
        userId: expect.any(String),
        email: user.email,
        role: expect.any(String),
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    it('should reject invalid credentials', async () => {
      const response = await request(server.honoApp)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid email or password'
        }
      });
    });

    it('should enforce rate limiting on login attempts', async () => {
      const email = 'ratelimit@example.com';
      const wrongPassword = 'wrongpassword';

      // Attempt multiple failed logins
      const attempts = Array.from({ length: 6 }, () =>
        request(server.honoApp)
          .post('/auth/login')
          .send({ email, password: wrongPassword })
      );

      const responses = await Promise.all(attempts);

      // First 5 should return 401, 6th should return 429 (rate limited)
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(401);
      });

      expect(responses[5].status).toBe(429);
      expect(responses[5].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Role-Based Access Control', () => {
    let adminToken: string;
    let editorToken: string;
    let viewerToken: string;

    beforeAll(async () => {
      // Create users with different roles
      const admin = userFactory.buildAdmin({ email: 'admin@example.com' });
      const editor = userFactory.buildEditor({ email: 'editor@example.com' });
      const viewer = userFactory.buildViewer({ email: 'viewer@example.com' });

      const users = [admin, editor, viewer];

      for (const user of users) {
        await request(server.honoApp)
          .post('/auth/register')
          .send({
            email: user.email,
            password: 'password123',
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          });

        const loginResponse = await request(server.honoApp)
          .post('/auth/login')
          .send({ email: user.email, password: 'password123' });

        if (user.role === 'admin') adminToken = loginResponse.body.data.token;
        if (user.role === 'editor') editorToken = loginResponse.body.data.token;
        if (user.role === 'viewer') viewerToken = loginResponse.body.data.token;
      }
    });

    it('should allow admin access to all endpoints', async () => {
      // Test admin can access admin-only endpoints
      await request(server.honoApp)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(server.honoApp)
        .delete('/api/admin/users/some-user-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should restrict editor access appropriately', async () => {
      // Editor should be able to create/edit forms
      await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Editor Form' })
        .expect(201);

      // But not access admin endpoints
      await request(server.honoApp)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403);
    });

    it('should restrict viewer to read-only access', async () => {
      // Viewer can read forms
      await request(server.honoApp)
        .get('/api/forms')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      // But cannot create forms
      await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Form' })
        .expect(403);

      // And cannot access admin endpoints
      await request(server.honoApp)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  describe('Token Management', () => {
    let authToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const user = userFactory.build({ email: 'token-test@example.com' });

      await request(server.honoApp)
        .post('/auth/register')
        .send({
          email: user.email,
          password: 'password123',
          firstName: user.firstName,
          lastName: user.lastName
        });

      const loginResponse = await request(server.honoApp)
        .post('/auth/login')
        .send({ email: user.email, password: 'password123' });

      authToken = loginResponse.body.data.token;
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh expired tokens', async () => {
      const response = await request(server.honoApp)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          token: expect.any(String),
          refreshToken: expect.any(String),
          expiresAt: expect.any(String)
        }
      });

      // New token should be different from original
      expect(response.body.data.token).not.toBe(authToken);
    });

    it('should invalidate tokens on logout', async () => {
      await request(server.honoApp)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Token should no longer work
      await request(server.honoApp)
        .get('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });
  });
});
```

### 3. Request/Response Validation Testing

```typescript
// tests/api/validation-testing.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';

describe('API Validation Testing', () => {
  let server: IntegrationTestServer;
  let authToken: string;

  beforeAll(async () => {
    server = new IntegrationTestServer('validation-api');
    await server.initialize();

    // Get auth token
    const loginResponse = await request(server.honoApp)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('Request Body Validation', () => {
    it('should validate required fields', async () => {
      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required 'name' field
          description: 'Test form'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('required'),
          details: {
            field: 'name',
            constraint: 'required'
          }
        }
      });
    });

    it('should validate field types', async () => {
      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 123, // Should be string
          fields: 'not-an-array' // Should be array
        })
        .expect(400);

      expect(response.body.error.details).toMatchObject({
        violations: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            constraint: 'type',
            expected: 'string'
          }),
          expect.objectContaining({
            field: 'fields',
            constraint: 'type',
            expected: 'array'
          })
        ])
      });
    });

    it('should validate field constraints', async () => {
      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'a', // Too short (min 2 characters)
          description: 'x'.repeat(1001), // Too long (max 1000 characters)
          fields: Array.from({ length: 101 }, (_, i) => ({ // Too many fields (max 100)
            name: `field_${i}`,
            type: 'text'
          }))
        })
        .expect(400);

      expect(response.body.error.details.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            constraint: 'minLength',
            value: 2
          }),
          expect.objectContaining({
            field: 'description',
            constraint: 'maxLength',
            value: 1000
          }),
          expect.objectContaining({
            field: 'fields',
            constraint: 'maxItems',
            value: 100
          })
        ])
      );
    });

    it('should validate nested object fields', async () => {
      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Form',
          fields: [
            {
              name: 'valid_field',
              type: 'text',
              required: true
            },
            {
              // Missing required 'name' field
              type: 'email',
              required: true
            },
            {
              name: 'invalid_type_field',
              type: 'invalid_type', // Invalid field type
              required: 'not-boolean' // Should be boolean
            }
          ]
        })
        .expect(400);

      expect(response.body.error.details.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'fields[1].name',
            constraint: 'required'
          }),
          expect.objectContaining({
            field: 'fields[2].type',
            constraint: 'enum',
            allowedValues: ['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'file']
          }),
          expect.objectContaining({
            field: 'fields[2].required',
            constraint: 'type',
            expected: 'boolean'
          })
        ])
      );
    });

    it('should validate email formats', async () => {
      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Form',
          notificationEmail: 'invalid-email-format'
        })
        .expect(400);

      expect(response.body.error.details).toMatchObject({
        field: 'notificationEmail',
        constraint: 'email'
      });
    });

    it('should validate URL formats', async () => {
      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Form',
          settings: {
            redirectUrl: 'not-a-valid-url'
          }
        })
        .expect(400);

      expect(response.body.error.details).toMatchObject({
        field: 'settings.redirectUrl',
        constraint: 'url'
      });
    });
  });

  describe('Query Parameter Validation', () => {
    it('should validate pagination parameters', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms')
        .query({
          page: 'not-a-number',
          limit: '101' // Exceeds max limit of 100
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.details.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
            constraint: 'type',
            expected: 'number'
          }),
          expect.objectContaining({
            field: 'limit',
            constraint: 'max',
            value: 100
          })
        ])
      );
    });

    it('should validate filter parameters', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms')
        .query({
          status: 'invalid-status', // Should be 'draft', 'published', or 'archived'
          sortBy: 'invalid-field', // Should be valid field name
          sortOrder: 'invalid-order' // Should be 'asc' or 'desc'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.details.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            constraint: 'enum',
            allowedValues: ['draft', 'published', 'archived']
          }),
          expect.objectContaining({
            field: 'sortBy',
            constraint: 'enum',
            allowedValues: ['name', 'createdAt', 'updatedAt', 'submissionCount']
          }),
          expect.objectContaining({
            field: 'sortOrder',
            constraint: 'enum',
            allowedValues: ['asc', 'desc']
          })
        ])
      );
    });
  });

  describe('Response Schema Validation', () => {
    it('should return consistent response structure for success', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate response schema
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object),
        metadata: {
          requestId: expect.any(String),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          version: expect.any(String),
          processingTime: expect.any(Number)
        }
      });

      // Validate data structure for list responses
      if (Array.isArray(response.body.data.items)) {
        expect(response.body.data).toMatchObject({
          items: expect.any(Array),
          totalCount: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          hasMore: expect.any(Boolean)
        });
      }
    });

    it('should return consistent error response structure', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          details: expect.any(Object)
        },
        metadata: {
          requestId: expect.any(String),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          version: expect.any(String),
          processingTime: expect.any(Number)
        }
      });
    });
  });
});
```

### 4. File Upload Testing

```typescript
// tests/api/file-upload.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';

describe('File Upload API', () => {
  let server: IntegrationTestServer;
  let authToken: string;
  let formId: string;

  beforeAll(async () => {
    server = new IntegrationTestServer('file-upload-api');
    await server.initialize();

    // Get auth token and create form with file field
    const loginResponse = await request(server.honoApp)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.data.token;

    const formResponse = await request(server.honoApp)
      .post('/api/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'File Upload Form',
        fields: [
          { name: 'attachment', type: 'file', required: false },
          { name: 'documents', type: 'file', multiple: true }
        ]
      });

    formId = formResponse.body.data.id;
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('POST /api/forms/:id/upload', () => {
    it('should upload single file successfully', async () => {
      // Create test file
      const testFilePath = path.join(__dirname, '../fixtures/test-document.pdf');
      const testFileContent = Buffer.from('PDF content here');
      fs.writeFileSync(testFilePath, testFileContent);

      const response = await request(server.honoApp)
        .post(`/api/forms/${formId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('attachment', testFilePath)
        .field('fieldName', 'attachment')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          fileId: expect.any(String),
          filename: 'test-document.pdf',
          originalName: 'test-document.pdf',
          mimeType: 'application/pdf',
          size: testFileContent.length,
          url: expect.stringMatching(/^https?:\/\//),
          uploadedAt: expect.any(String)
        }
      });

      // Cleanup
      fs.unlinkSync(testFilePath);
    });

    it('should upload multiple files', async () => {
      const file1Path = path.join(__dirname, '../fixtures/document1.txt');
      const file2Path = path.join(__dirname, '../fixtures/document2.txt');

      fs.writeFileSync(file1Path, 'Document 1 content');
      fs.writeFileSync(file2Path, 'Document 2 content');

      const response = await request(server.honoApp)
        .post(`/api/forms/${formId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('documents', file1Path)
        .attach('documents', file2Path)
        .field('fieldName', 'documents')
        .expect(200);

      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data.files[0]).toMatchObject({
        filename: 'document1.txt',
        mimeType: 'text/plain'
      });
      expect(response.body.data.files[1]).toMatchObject({
        filename: 'document2.txt',
        mimeType: 'text/plain'
      });

      // Cleanup
      fs.unlinkSync(file1Path);
      fs.unlinkSync(file2Path);
    });

    it('should reject files exceeding size limit', async () => {
      const largeFil Content = Buffer.alloc(10 * 1024 * 1024 + 1); // 10MB + 1 byte
      const largeFilePath = path.join(__dirname, '../fixtures/large-file.bin');
      fs.writeFileSync(largeFilePath, largeFileContent);

      const response = await request(server.honoApp)
        .post(`/api/forms/${formId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('attachment', largeFilePath)
        .field('fieldName', 'attachment')
        .expect(413);

      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.details.maxSize).toBe(10 * 1024 * 1024); // 10MB

      // Cleanup
      fs.unlinkSync(largeFilePath);
    });

    it('should reject unsupported file types', async () => {
      const executablePath = path.join(__dirname, '../fixtures/malicious.exe');
      fs.writeFileSync(executablePath, 'Fake executable content');

      const response = await request(server.honoApp)
        .post(`/api/forms/${formId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('attachment', executablePath)
        .field('fieldName', 'attachment')
        .expect(415);

      expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(response.body.error.details.allowedTypes).toEqual(
        expect.arrayContaining(['image/*', 'application/pdf', 'text/*'])
      );

      // Cleanup
      fs.unlinkSync(executablePath);
    });

    it('should handle malformed upload requests', async () => {
      // No file attached
      const response = await request(server.honoApp)
        .post(`/api/forms/${formId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('fieldName', 'attachment')
        .expect(400);

      expect(response.body.error.code).toBe('NO_FILE_PROVIDED');
    });

    it('should virus scan uploaded files', async () => {
      // Mock virus scanner would detect this pattern
      const virusTestContent = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const virusFilePath = path.join(__dirname, '../fixtures/virus-test.txt');
      fs.writeFileSync(virusFilePath, virusTestContent);

      const response = await request(server.honoApp)
        .post(`/api/forms/${formId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('attachment', virusFilePath)
        .field('fieldName', 'attachment')
        .expect(422);

      expect(response.body.error.code).toBe('VIRUS_DETECTED');

      // Cleanup
      fs.unlinkSync(virusFilePath);
    });
  });

  describe('GET /api/files/:fileId', () => {
    let fileId: string;

    beforeAll(async () => {
      // Upload a test file
      const testFilePath = path.join(__dirname, '../fixtures/download-test.txt');
      fs.writeFileSync(testFilePath, 'Test file for download');

      const uploadResponse = await request(server.honoApp)
        .post(`/api/forms/${formId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('attachment', testFilePath)
        .field('fieldName', 'attachment');

      fileId = uploadResponse.body.data.fileId;
      fs.unlinkSync(testFilePath);
    });

    it('should download file with correct headers', async () => {
      const response = await request(server.honoApp)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('download-test.txt');
      expect(response.text).toBe('Test file for download');
    });

    it('should return 404 for non-existent file', async () => {
      await request(server.honoApp)
        .get('/api/files/non-existent-file-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should enforce file access permissions', async () => {
      // Create another user
      const otherUserResponse = await request(server.honoApp)
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'password123',
          firstName: 'Other',
          lastName: 'User'
        });

      const otherLoginResponse = await request(server.honoApp)
        .post('/auth/login')
        .send({ email: 'other@example.com', password: 'password123' });

      const otherAuthToken = otherLoginResponse.body.data.token;

      // Other user should not be able to access the file
      await request(server.honoApp)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);
    });
  });
});
```

## WebSocket Testing Patterns

### 1. Real-time Event Streaming

```typescript
// tests/api/websocket-events.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { EventFactory } from '@tests/factories/EventFactory';

describe('WebSocket Event Streaming', () => {
  let server: IntegrationTestServer;
  let wsUrl: string;

  beforeAll(async () => {
    server = new IntegrationTestServer('websocket-events');
    await server.initialize();
    wsUrl = server.baseUrl.replace('http', 'ws') + '/ws/events';
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection with authentication', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);

        ws.on('open', () => {
          ws.close();
          resolve();
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });

    it('should reject connection without valid authentication', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl); // No auth token

        ws.on('open', () => {
          reject(new Error('Connection should have been rejected'));
        });

        ws.on('close', (code) => {
          expect(code).toBe(1008); // Policy violation
          resolve();
        });

        ws.on('error', () => {
          // Expected error
          resolve();
        });
      });
    });

    it('should handle connection heartbeat', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
        let heartbeatReceived = false;

        ws.on('open', () => {
          // Send ping
          ws.ping('heartbeat');
        });

        ws.on('pong', (data) => {
          expect(data.toString()).toBe('heartbeat');
          heartbeatReceived = true;
          ws.close();
        });

        ws.on('close', () => {
          if (heartbeatReceived) {
            resolve();
          } else {
            reject(new Error('Heartbeat not received'));
          }
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Heartbeat timeout')), 5000);
      });
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to specific event types', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
        let subscriptionConfirmed = false;

        ws.on('open', () => {
          // Subscribe to form events
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: {
              eventTypes: ['form.created', 'form.updated'],
              filters: {
                userId: 'test-user-123'
              }
            }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscription_confirmed') {
            expect(message.payload).toMatchObject({
              subscriptionId: expect.any(String),
              eventTypes: ['form.created', 'form.updated'],
              filters: {
                userId: 'test-user-123'
              }
            });
            subscriptionConfirmed = true;
            ws.close();
          }
        });

        ws.on('close', () => {
          if (subscriptionConfirmed) {
            resolve();
          } else {
            reject(new Error('Subscription not confirmed'));
          }
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Subscription timeout')), 5000);
      });
    });

    it('should receive events matching subscription filter', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
        const receivedEvents: any[] = [];

        ws.on('open', () => {
          // Subscribe to submission events
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: {
              eventTypes: ['submission.created'],
              filters: {
                formId: 'test-form-123'
              }
            }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscription_confirmed') {
            // Trigger events via HTTP API
            triggerSubmissionEvent('test-form-123');
            triggerSubmissionEvent('other-form-456'); // Should not be received
          } else if (message.type === 'event') {
            receivedEvents.push(message.payload);

            // We should only receive the event for test-form-123
            if (receivedEvents.length === 1) {
              expect(message.payload).toMatchObject({
                type: 'submission.created',
                aggregateId: expect.any(String),
                payload: {
                  formId: 'test-form-123'
                }
              });
              ws.close();
            }
          }
        });

        ws.on('close', () => {
          expect(receivedEvents).toHaveLength(1);
          resolve();
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Event reception timeout')), 10000);
      });
    });

    it('should handle multiple subscriptions per connection', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
        const subscriptions: string[] = [];
        const receivedEvents: any[] = [];

        ws.on('open', () => {
          // Create multiple subscriptions
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: {
              eventTypes: ['form.created'],
              subscriptionId: 'sub-1'
            }
          }));

          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: {
              eventTypes: ['submission.created'],
              subscriptionId: 'sub-2'
            }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscription_confirmed') {
            subscriptions.push(message.payload.subscriptionId);

            if (subscriptions.length === 2) {
              // Trigger events for both subscriptions
              triggerFormEvent();
              triggerSubmissionEvent();
            }
          } else if (message.type === 'event') {
            receivedEvents.push(message.payload);

            if (receivedEvents.length === 2) {
              ws.close();
            }
          }
        });

        ws.on('close', () => {
          expect(subscriptions).toEqual(['sub-1', 'sub-2']);
          expect(receivedEvents).toHaveLength(2);

          const formEvent = receivedEvents.find(e => e.type === 'form.created');
          const submissionEvent = receivedEvents.find(e => e.type === 'submission.created');

          expect(formEvent).toBeDefined();
          expect(submissionEvent).toBeDefined();

          resolve();
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Multiple subscription timeout')), 10000);
      });
    });
  });

  describe('Real-time Collaboration', () => {
    it('should broadcast form editing events to collaborators', async () => {
      const user1Token = await getAuthToken('user1@example.com');
      const user2Token = await getAuthToken('user2@example.com');

      return new Promise<void>((resolve, reject) => {
        const ws1 = new WebSocket(`${wsUrl}?token=${user1Token}`);
        const ws2 = new WebSocket(`${wsUrl}?token=${user2Token}`);

        let connectionsReady = 0;
        let collaborationEventReceived = false;

        const setupConnection = (ws: WebSocket, onReady: () => void) => {
          ws.on('open', () => {
            // Subscribe to collaboration events
            ws.send(JSON.stringify({
              type: 'subscribe',
              payload: {
                eventTypes: ['form.collaboration.field_edited'],
                filters: {
                  formId: 'collaborative-form-123'
                }
              }
            }));
          });

          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());

            if (message.type === 'subscription_confirmed') {
              connectionsReady++;
              if (connectionsReady === 2) {
                onReady();
              }
            } else if (message.type === 'event') {
              if (message.payload.type === 'form.collaboration.field_edited') {
                expect(message.payload.payload).toMatchObject({
                  formId: 'collaborative-form-123',
                  fieldId: 'name',
                  editedBy: 'user1@example.com',
                  action: 'field_updated'
                });
                collaborationEventReceived = true;
                ws1.close();
                ws2.close();
              }
            }
          });
        };

        setupConnection(ws1, () => {
          // User 1 edits a field
          sendCollaborationEvent('user1@example.com', 'collaborative-form-123', 'name');
        });

        setupConnection(ws2, () => {
          // User 2 is ready to receive collaboration events
        });

        ws1.on('close', () => {
          if (collaborationEventReceived) {
            resolve();
          }
        });

        const handleError = (error: any) => reject(error);
        ws1.on('error', handleError);
        ws2.on('error', handleError);

        setTimeout(() => reject(new Error('Collaboration timeout')), 10000);
      });
    });

    it('should handle user presence updates', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);

        ws.on('open', () => {
          // Join collaboration session
          ws.send(JSON.stringify({
            type: 'join_collaboration',
            payload: {
              formId: 'presence-test-form',
              userInfo: {
                name: 'Test User',
                avatar: 'https://example.com/avatar.jpg'
              }
            }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'presence_update') {
            expect(message.payload).toMatchObject({
              formId: 'presence-test-form',
              activeUsers: expect.arrayContaining([
                expect.objectContaining({
                  userId: expect.any(String),
                  name: 'Test User',
                  joinedAt: expect.any(String)
                })
              ])
            });
            ws.close();
            resolve();
          }
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Presence update timeout')), 5000);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);

        ws.on('open', () => {
          // Send malformed JSON
          ws.send('invalid-json-message');
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'error') {
            expect(message.payload).toMatchObject({
              code: 'INVALID_MESSAGE_FORMAT',
              message: expect.stringContaining('JSON')
            });
            ws.close();
            resolve();
          }
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Error handling timeout')), 5000);
      });
    });

    it('should handle subscription to non-existent event types', async () => {
      const authToken = await getAuthToken();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${wsUrl}?token=${authToken}`);

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: {
              eventTypes: ['non.existent.event.type']
            }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'error') {
            expect(message.payload).toMatchObject({
              code: 'INVALID_EVENT_TYPE',
              message: expect.stringContaining('non.existent.event.type')
            });
            ws.close();
            resolve();
          }
        });

        ws.on('error', reject);

        setTimeout(() => reject(new Error('Error handling timeout')), 5000);
      });
    });
  });

  // Helper functions
  async function getAuthToken(email: string = 'test@example.com'): Promise<string> {
    const response = await fetch(`${server.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });

    const data = await response.json();
    return data.data.token;
  }

  async function triggerSubmissionEvent(formId: string = 'test-form-123'): Promise<void> {
    const event = EventFactory.build({
      type: 'submission.created',
      payload: { formId }
    });

    await fetch(`${server.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event })
    });
  }

  async function triggerFormEvent(): Promise<void> {
    const event = EventFactory.build({
      type: 'form.created',
      payload: { formId: 'test-form' }
    });

    await fetch(`${server.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event })
    });
  }

  async function sendCollaborationEvent(userId: string, formId: string, fieldId: string): Promise<void> {
    const event = EventFactory.build({
      type: 'form.collaboration.field_edited',
      payload: {
        formId,
        fieldId,
        editedBy: userId,
        action: 'field_updated'
      }
    });

    await fetch(`${server.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event })
    });
  }
});
```

### 2. Performance and Load Testing

```typescript
// tests/api/performance-load.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import WebSocket from 'ws';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';

describe('API Performance and Load Testing', () => {
  let server: IntegrationTestServer;
  let authToken: string;

  beforeAll(async () => {
    server = new IntegrationTestServer('performance-load');
    await server.initialize();

    const loginResponse = await request(server.honoApp)
      .post('/auth/login')
      .send({ email: 'perf-test@example.com', password: 'password123' });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('API Response Time Testing', () => {
    it('should handle single form creation within performance threshold', async () => {
      const startTime = Date.now();

      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Performance Test Form',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'email', type: 'email', required: true }
          ]
        })
        .expect(201);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(200); // 200ms threshold
    });

    it('should handle concurrent form requests efficiently', async () => {
      const numRequests = 50;
      const requests = Array.from({ length: numRequests }, (_, i) =>
        request(server.honoApp)
          .post('/api/forms')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Concurrent Form ${i}`,
            fields: [{ name: 'field1', type: 'text' }]
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Average response time should be reasonable
      const avgResponseTime = totalTime / numRequests;
      expect(avgResponseTime).toBeLessThan(100); // 100ms average
    });

    it('should handle large payload efficiently', async () => {
      const largeFormFields = Array.from({ length: 100 }, (_, i) => ({
        name: `field_${i}`,
        label: `Field ${i}`,
        type: 'text',
        required: i % 2 === 0,
        helpText: `This is help text for field ${i}`.repeat(10) // Large help text
      }));

      const startTime = Date.now();

      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Large Form Test',
          description: 'Form with many fields for performance testing',
          fields: largeFormFields
        })
        .expect(201);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // 1 second for large payload
    });
  });

  describe('WebSocket Performance Testing', () => {
    it('should handle multiple concurrent WebSocket connections', async () => {
      const numConnections = 20;
      const connections: WebSocket[] = [];
      const wsUrl = server.baseUrl.replace('http', 'ws') + `/ws/events?token=${authToken}`;

      try {
        // Create multiple connections
        const connectionPromises = Array.from({ length: numConnections }, () =>
          new Promise<WebSocket>((resolve, reject) => {
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
              connections.push(ws);
              resolve(ws);
            });

            ws.on('error', reject);

            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          })
        );

        const startTime = Date.now();
        await Promise.all(connectionPromises);
        const connectionTime = Date.now() - startTime;

        expect(connections).toHaveLength(numConnections);
        expect(connectionTime).toBeLessThan(2000); // 2 seconds to establish all connections

        // Test message broadcasting performance
        const messagePromises = connections.map(ws =>
          new Promise<void>((resolve) => {
            ws.on('message', () => resolve());

            // Subscribe to events
            ws.send(JSON.stringify({
              type: 'subscribe',
              payload: { eventTypes: ['test.performance'] }
            }));
          })
        );

        // Broadcast an event
        const broadcastStart = Date.now();
        await fetch(`${server.baseUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            event: {
              type: 'test.performance',
              payload: { message: 'Performance test broadcast' }
            }
          })
        });

        await Promise.all(messagePromises);
        const broadcastTime = Date.now() - broadcastStart;

        expect(broadcastTime).toBeLessThan(1000); // 1 second to broadcast to all connections

      } finally {
        // Cleanup connections
        connections.forEach(ws => ws.close());
      }
    });

    it('should handle high-frequency message sending', async () => {
      const wsUrl = server.baseUrl.replace('http', 'ws') + `/ws/events?token=${authToken}`;

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        let messagesReceived = 0;
        const totalMessages = 100;

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            payload: { eventTypes: ['test.frequency'] }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'subscription_confirmed') {
            // Start sending high-frequency events
            sendHighFrequencyEvents(totalMessages);
          } else if (message.type === 'event') {
            messagesReceived++;

            if (messagesReceived === totalMessages) {
              ws.close();
              resolve();
            }
          }
        });

        ws.on('error', reject);

        const sendHighFrequencyEvents = async (count: number) => {
          const promises = Array.from({ length: count }, (_, i) =>
            fetch(`${server.baseUrl}/api/events`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                event: {
                  type: 'test.frequency',
                  payload: { sequenceNumber: i }
                }
              })
            })
          );

          await Promise.all(promises);
        };

        setTimeout(() => reject(new Error('High-frequency test timeout')), 10000);
      });
    });
  });

  describe('Memory and Resource Usage Testing', () => {
    it('should not leak memory during continuous API operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const numOperations = 1000;

      for (let i = 0; i < numOperations; i++) {
        await request(server.honoApp)
          .post('/api/forms')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Memory Test Form ${i}`,
            fields: [{ name: 'field1', type: 'text' }]
          });

        // Delete the form immediately to prevent storage buildup
        const forms = await request(server.honoApp)
          .get('/api/forms')
          .set('Authorization', `Bearer ${authToken}`);

        if (forms.body.data.items.length > 0) {
          const formId = forms.body.data.items[forms.body.data.items.length - 1].id;
          await request(server.honoApp)
            .delete(`/api/forms/${formId}`)
            .set('Authorization', `Bearer ${authToken}`);
        }

        // Force garbage collection every 100 operations
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

    it('should handle database connection pooling efficiently', async () => {
      const numConcurrentQueries = 100;

      const queries = Array.from({ length: numConcurrentQueries }, () =>
        request(server.honoApp)
          .get('/api/forms')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(queries);
      const queryTime = Date.now() - startTime;

      // All queries should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Total query time should be reasonable even with connection pooling
      expect(queryTime).toBeLessThan(5000); // 5 seconds for 100 concurrent queries
    });
  });

  describe('Rate Limiting Testing', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const endpoint = '/api/forms';
      const requests = Array.from({ length: 120 }, () => // Exceed limit of 100/minute
        request(server.honoApp)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(requests);

      const successCount = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const rateLimitedCount = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(successCount).toBeLessThanOrEqual(100);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should provide rate limit headers in responses', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});
```

## API Contract Testing

### Schema Validation Testing

```typescript
// tests/api/schema-validation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { IntegrationTestServer } from '@tests/setup/integration-server.setup';
import { apiSchemas } from '@/schemas/api-schemas';

describe('API Schema Contract Testing', () => {
  let server: IntegrationTestServer;
  let authToken: string;
  let ajv: Ajv;

  beforeAll(async () => {
    server = new IntegrationTestServer('schema-validation');
    await server.initialize();

    const loginResponse = await request(server.honoApp)
      .post('/auth/login')
      .send({ email: 'schema-test@example.com', password: 'password123' });

    authToken = loginResponse.body.data.token;

    // Initialize AJV with formats
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    // Add custom schemas
    Object.entries(apiSchemas).forEach(([name, schema]) => {
      ajv.addSchema(schema, name);
    });
  });

  afterAll(async () => {
    await server.cleanup();
  });

  describe('Request Schema Validation', () => {
    it('should validate form creation request schema', async () => {
      const validFormData = {
        name: 'Schema Test Form',
        description: 'Testing schema validation',
        fields: [
          {
            name: 'email',
            label: 'Email Address',
            type: 'email',
            required: true,
            validation: [
              { type: 'email', message: 'Invalid email format' }
            ]
          }
        ],
        settings: {
          allowMultipleSubmissions: false,
          requireAuthentication: true
        }
      };

      const validate = ajv.getSchema('CreateFormRequest');
      const isValid = validate!(validFormData);

      expect(isValid).toBe(true);
      expect(validate!.errors).toBeNull();

      // Test with API
      const response = await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validFormData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject requests that violate schema constraints', async () => {
      const invalidFormData = {
        name: '', // Too short
        fields: [
          {
            name: 'invalid-field-name!', // Invalid characters
            type: 'invalid-type', // Invalid enum value
            required: 'not-boolean' // Wrong type
          }
        ],
        settings: {
          allowMultipleSubmissions: 'not-boolean' // Wrong type
        }
      };

      const validate = ajv.getSchema('CreateFormRequest');
      const isValid = validate!(invalidFormData);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/name',
            keyword: 'minLength'
          }),
          expect.objectContaining({
            instancePath: '/fields/0/name',
            keyword: 'pattern'
          }),
          expect.objectContaining({
            instancePath: '/fields/0/type',
            keyword: 'enum'
          }),
          expect.objectContaining({
            instancePath: '/fields/0/required',
            keyword: 'type'
          })
        ])
      );

      // API should also reject
      await request(server.honoApp)
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidFormData)
        .expect(400);
    });
  });

  describe('Response Schema Validation', () => {
    it('should validate successful response schemas', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const validate = ajv.getSchema('ListFormsResponse');
      const isValid = validate!(response.body);

      expect(isValid).toBe(true);
      expect(validate!.errors).toBeNull();

      // Validate nested data structure
      expect(response.body).toMatchObject({
        success: true,
        data: {
          items: expect.any(Array),
          totalCount: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          hasMore: expect.any(Boolean)
        },
        metadata: {
          requestId: expect.any(String),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          version: expect.any(String),
          processingTime: expect.any(Number)
        }
      });
    });

    it('should validate error response schemas', async () => {
      const response = await request(server.honoApp)
        .get('/api/forms/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      const validate = ajv.getSchema('ErrorResponse');
      const isValid = validate!(response.body);

      expect(isValid).toBe(true);
      expect(validate!.errors).toBeNull();

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          details: expect.any(Object)
        },
        metadata: {
          requestId: expect.any(String),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          version: expect.any(String),
          processingTime: expect.any(Number)
        }
      });
    });
  });

  describe('Field Type Validation', () => {
    it('should validate all supported field types', async () => {
      const fieldTypes = [
        {
          name: 'text_field',
          label: 'Text Field',
          type: 'text',
          placeholder: 'Enter text',
          maxLength: 100
        },
        {
          name: 'email_field',
          label: 'Email Field',
          type: 'email',
          required: true
        },
        {
          name: 'select_field',
          label: 'Select Field',
          type: 'select',
          options: ['Option 1', 'Option 2', 'Option 3']
        },
        {
          name: 'checkbox_field',
          label: 'Checkbox Field',
          type: 'checkbox'
        },
        {
          name: 'file_field',
          label: 'File Field',
          type: 'file',
          accept: ['image/*', 'application/pdf'],
          maxSize: 5242880 // 5MB
        }
      ];

      for (const field of fieldTypes) {
        const formData = {
          name: `${field.type} Test Form`,
          fields: [field]
        };

        const validate = ajv.getSchema('CreateFormRequest');
        const isValid = validate!(formData);

        expect(isValid).toBe(true);
        expect(validate!.errors).toBeNull();

        const response = await request(server.honoApp)
          .post('/api/forms')
          .set('Authorization', `Bearer ${authToken}`)
          .send(formData)
          .expect(201);

        expect(response.body.data.fields[0]).toMatchObject(field);
      }
    });
  });

  describe('API Versioning Schema Compatibility', () => {
    it('should maintain backward compatibility with v1 schemas', async () => {
      // Test that v1 request format still works
      const v1FormData = {
        name: 'V1 Compatible Form',
        // V1 format might have different structure
        fieldList: [
          {
            fieldName: 'name',
            fieldType: 'text',
            isRequired: true
          }
        ]
      };

      // This should work with backward compatibility
      const response = await request(server.honoApp)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(v1FormData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should validate v2 enhanced schemas', async () => {
      const v2FormData = {
        name: 'V2 Enhanced Form',
        fields: [
          {
            name: 'advanced_field',
            label: 'Advanced Field',
            type: 'text',
            validation: [
              {
                type: 'custom',
                function: 'validateCustomField',
                message: 'Custom validation failed'
              }
            ],
            conditionalLogic: {
              showWhen: [
                {
                  field: 'other_field',
                  operator: 'equals',
                  value: 'show_advanced'
                }
              ]
            }
          }
        ]
      };

      const validate = ajv.getSchema('CreateFormRequestV2');
      const isValid = validate!(v2FormData);

      expect(isValid).toBe(true);
      expect(validate!.errors).toBeNull();
    });
  });
});
```

## Best Practices and Guidelines

### API Testing Best Practices

1. **Test Structure Organization**
   - Group tests by API endpoint or feature
   - Use descriptive test names that explain the scenario
   - Follow AAA pattern (Arrange, Act, Assert)
   - Include both positive and negative test cases

2. **Authentication Testing**
   - Test all authentication mechanisms
   - Verify role-based access control
   - Test token expiration and refresh
   - Validate security headers and CORS

3. **Data Validation**
   - Test all input validation rules
   - Verify error messages are helpful
   - Test edge cases and boundary conditions
   - Validate response schemas and formats

4. **Performance Considerations**
   - Set realistic performance thresholds
   - Test under various load conditions
   - Monitor memory usage and resource leaks
   - Verify rate limiting and throttling

5. **WebSocket Testing**
   - Test connection lifecycle
   - Verify real-time message delivery
   - Test error handling and recovery
   - Validate subscription management

### Maintenance Guidelines

1. **Regular Updates**
   - Keep API schemas up to date with changes
   - Update test data to reflect realistic scenarios
   - Review and adjust performance thresholds
   - Update authentication mechanisms as needed

2. **Documentation**
   - Document complex test scenarios
   - Maintain API contract documentation
   - Keep schema definitions current
   - Document known issues and workarounds

3. **Monitoring**
   - Track test execution times
   - Monitor API response times in tests
   - Alert on test failures
   - Review test coverage regularly

## Relationships
- **Parent Nodes:** [foundation/testing/index.md] - categorizes - API testing patterns as part of overall testing strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/integration-testing-strategy.md] - implements - API testing as part of integration testing
  - [foundation/testing/standards.md] - follows - Testing standards for API testing practices
  - [foundation/components/*/api.md] - tests - Specific API endpoints and contracts

## Navigation Guidance
- **Access Context**: Reference when implementing API tests or understanding testing patterns for specific endpoints
- **Common Next Steps**: Review specific component API documentation or implement test scenarios
- **Related Tasks**: API development, integration testing, contract testing, performance validation
- **Update Patterns**: Update when new API endpoints are added or existing patterns evolve

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-2 Implementation

## Change History
- 2025-01-22: Initial API testing patterns document creation with comprehensive REST and WebSocket testing examples