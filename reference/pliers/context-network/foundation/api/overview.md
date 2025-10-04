# API and Interface Specifications Overview

## Executive Summary

This document provides a comprehensive overview of all API specifications for the Pliers v3 system. It serves as a central reference for REST APIs, GraphQL schemas, WebSocket interfaces, and inter-service communication protocols.

## API Architecture

### API Gateway Pattern

```typescript
interface APIGateway {
  // Single entry point for all client requests
  endpoint: 'https://api.pliers.io';

  // Request routing
  routes: {
    '/api/v1/forms': 'form-engine-service',
    '/api/v1/submissions': 'submission-engine-service',
    '/api/v1/events': 'event-engine-service',
    '/api/v1/plugins': 'plugin-engine-service',
    '/api/v1/search': 'search-engine-service',
    '/api/v1/ai': 'ai-engine-service',
    '/graphql': 'graphql-service',
    '/ws': 'websocket-service'
  };

  // Cross-cutting concerns
  middleware: [
    'authentication',
    'authorization',
    'rate-limiting',
    'request-validation',
    'response-caching',
    'logging',
    'monitoring'
  ];
}
```

### API Versioning Strategy

```typescript
enum VersioningStrategy {
  URL_PATH = '/api/v{version}',      // Current approach
  HEADER = 'X-API-Version: {version}',
  QUERY_PARAM = '?version={version}',
  CONTENT_TYPE = 'application/vnd.pliers.v{version}+json'
}

interface VersionSupport {
  current: 'v1';
  supported: ['v1'];
  deprecated: [];
  sunset: {
    // Version sunset dates
    'v0': '2025-01-01'
  };
}
```

## REST API Specifications

### Common REST Patterns

```typescript
interface RESTEndpoint {
  // Standard CRUD operations
  'GET /resources': 'List resources',
  'GET /resources/:id': 'Get single resource',
  'POST /resources': 'Create resource',
  'PUT /resources/:id': 'Update resource (full)',
  'PATCH /resources/:id': 'Update resource (partial)',
  'DELETE /resources/:id': 'Delete resource',

  // Bulk operations
  'POST /resources/bulk': 'Bulk create',
  'PATCH /resources/bulk': 'Bulk update',
  'DELETE /resources/bulk': 'Bulk delete',

  // Actions
  'POST /resources/:id/actions/:action': 'Resource action'
}
```

### Standard Request/Response Format

```typescript
// Request envelope
interface APIRequest<T = any> {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': string,
    'X-Tenant-ID': string,
    'X-API-Version': string
  };
  body?: T;
  query?: Record<string, string>;
}

// Response envelope
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

### Pagination Standards

```typescript
interface PaginationParams {
  // Offset-based pagination
  offset?: number;
  limit?: number;

  // Page-based pagination
  page?: number;
  pageSize?: number;

  // Cursor-based pagination (preferred for large datasets)
  cursor?: string;
  direction?: 'next' | 'previous';

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Example usage
// GET /api/v1/submissions?cursor=eyJpZCI6MTIzfQ&limit=50&sortBy=created_at&sortOrder=desc
```

## GraphQL API

### Schema Overview

```graphql
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

type Query {
  # Form queries
  form(id: ID!): Form
  forms(filter: FormFilter, pagination: PaginationInput): FormConnection!

  # Submission queries
  submission(id: ID!): Submission
  submissions(filter: SubmissionFilter, pagination: PaginationInput): SubmissionConnection!

  # Search queries
  search(query: String!, options: SearchOptions): SearchResults!

  # Analytics queries
  analytics(metrics: [MetricType!]!, timeRange: TimeRange!): AnalyticsData!
}

type Mutation {
  # Form mutations
  createForm(input: CreateFormInput!): FormPayload!
  updateForm(id: ID!, input: UpdateFormInput!): FormPayload!
  deleteForm(id: ID!): DeletePayload!

  # Submission mutations
  submitForm(formId: ID!, data: JSON!): SubmissionPayload!
  updateSubmission(id: ID!, data: JSON!): SubmissionPayload!

  # Workflow mutations
  transitionWorkflow(submissionId: ID!, action: String!): WorkflowPayload!
}

type Subscription {
  # Real-time updates
  formUpdated(formId: ID!): Form!
  submissionCreated(formId: ID!): Submission!
  eventOccurred(filter: EventFilter): Event!
}
```

### GraphQL Conventions

```typescript
interface GraphQLConventions {
  // Naming
  queries: 'camelCase',
  mutations: 'verbNoun',
  types: 'PascalCase',
  fields: 'camelCase',
  enums: 'SCREAMING_SNAKE_CASE',

  // Patterns
  connections: 'Relay Cursor Connections',
  errors: 'Union types for errors',
  batching: 'DataLoader pattern',
  caching: 'Apollo Cache directives',

  // Security
  depthLimit: 10,
  complexityLimit: 1000,
  rateLimiting: 'Per-query complexity'
}
```

## WebSocket API

### Connection Management

```typescript
interface WebSocketConnection {
  // Connection URL
  url: 'wss://api.pliers.io/ws';

  // Authentication
  onConnect: {
    protocol: 'authorization',
    payload: {
      token: string,
      tenantId: string
    }
  };

  // Heartbeat
  ping: {
    interval: 30000, // 30 seconds
    timeout: 5000    // 5 seconds
  };

  // Reconnection
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    backoff: 'exponential'
  };
}
```

### Message Protocol

```typescript
interface WebSocketMessage {
  id: string;           // Unique message ID
  type: MessageType;    // Message type
  channel?: string;     // Optional channel/room
  payload: any;         // Message payload
  timestamp: string;    // ISO 8601 timestamp
}

enum MessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',

  // Subscriptions
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',

  // Data
  EVENT = 'event',
  MESSAGE = 'message',
  NOTIFICATION = 'notification',

  // Errors
  ERROR = 'error'
}
```

### Subscription Channels

```typescript
interface SubscriptionChannels {
  // Form channels
  'forms:${formId}': 'Form-specific updates',
  'forms:${formId}:submissions': 'New submissions for form',

  // Event channels
  'events:${category}': 'Events by category',
  'events:${aggregateId}': 'Events for specific aggregate',

  // User channels
  'users:${userId}': 'User-specific notifications',
  'users:${userId}:tasks': 'Task assignments',

  // Tenant channels
  'tenants:${tenantId}': 'Tenant-wide broadcasts',
  'tenants:${tenantId}:alerts': 'System alerts',

  // System channels
  'system:health': 'System health updates',
  'system:maintenance': 'Maintenance notifications'
}
```

## Authentication & Authorization

### JWT Token Structure

```typescript
interface JWTPayload {
  // Standard claims
  iss: string;          // Issuer
  sub: string;          // Subject (user ID)
  aud: string[];        // Audience
  exp: number;          // Expiration
  nbf: number;          // Not before
  iat: number;          // Issued at
  jti: string;          // JWT ID

  // Custom claims
  tenantId: string;     // Tenant identifier
  roles: string[];      // User roles
  permissions: string[]; // Direct permissions
  sessionId: string;    // Session tracking

  // Security claims
  mfa: boolean;         // MFA completed
  ipAddress: string;    // Origin IP
  userAgent: string;    // Client user agent
}
```

### API Key Management

```typescript
interface APIKey {
  id: string;
  name: string;
  key: string;          // Hashed
  prefix: string;       // Visible prefix (e.g., "pk_live_", "pk_test_")
  keyType: 'user' | 'service_account';

  // Permissions
  scopes: string[];     // API scopes
  rateLimit: number;    // Requests per hour
  permissions?: string[]; // Direct permissions for service accounts

  // Associations
  userId?: string;      // For user API keys
  serviceAccountId?: string; // For service account keys

  // Restrictions
  ipWhitelist?: string[];
  origins?: string[];

  // Metadata
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  revoked: boolean;
}
```

### Authentication Methods

The API supports multiple authentication methods to accommodate different use cases:

#### 1. JWT Bearer Token (Authenticated Users)
```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```
Used for authenticated web users and user API access.

#### 2. API Key (Service Accounts)
```http
X-API-Key: pk_live_1234567890abcdef...
```
Used for service-to-service communication and automated integrations.

#### 3. Session Cookie (Web Applications)
```http
Cookie: pliers_session=abc123def456...
```
Used for browser-based authentication with CSRF protection.

#### 4. Anonymous Access (Public Forms)
No authentication required for designated public endpoints:
- `/api/v1/forms/public/:slug`
- `/api/v1/submissions/anonymous`

Public forms may require CAPTCHA verification and are subject to stricter rate limits.

## Rate Limiting

### Rate Limit Configuration

```typescript
interface RateLimitConfig {
  // Global limits
  global: {
    requests: 10000,
    window: '1h'
  },

  // Per-tenant limits
  tenant: {
    requests: 5000,
    window: '1h'
  },

  // Per-user limits
  user: {
    requests: 1000,
    window: '1h'
  },

  // Anonymous user limits (stricter)
  anonymous: {
    requests: 100,
    window: '1h',
    burstSize: 10,
    cooldown: '5m'
  },

  // Service account limits
  serviceAccount: {
    requests: 5000,
    window: '1h',
    customizable: true  // Can be configured per account
  },

  // Per-endpoint limits
  endpoints: {
    '/api/v1/forms': {
      GET: { requests: 100, window: '1m' },
      POST: { requests: 10, window: '1m' }
    },
    '/api/v1/submissions': {
      POST: { requests: 50, window: '1m' }
    },
    '/api/v1/ai/*': {
      POST: { requests: 10, window: '1m' }
    },
    // Public endpoints (stricter limits)
    '/api/v1/forms/public/*': {
      GET: { requests: 20, window: '1m' }
    },
    '/api/v1/submissions/anonymous': {
      POST: { requests: 5, window: '10m' }
    }
  }
}
```

### Rate Limit Headers

```typescript
interface RateLimitHeaders {
  'X-RateLimit-Limit': number;      // Request limit
  'X-RateLimit-Remaining': number;  // Remaining requests
  'X-RateLimit-Reset': number;      // Unix timestamp for reset
  'Retry-After'?: number;           // Seconds until retry (if limited)
}
```

## API Documentation Standards

### OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Pliers API
  version: 1.0.0
  description: Comprehensive API for form management platform
  contact:
    email: api@pliers.io
  license:
    name: MIT

servers:
  - url: https://api.pliers.io
    description: Production
  - url: https://staging.api.pliers.io
    description: Staging

security:
  - bearerAuth: []
  - apiKey: []

paths:
  /api/v1/forms:
    get:
      summary: List forms
      operationId: listForms
      tags: [Forms]
      parameters:
        - $ref: '#/components/parameters/pagination'
        - $ref: '#/components/parameters/filter'
      responses:
        200:
          description: Forms retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FormList'
```

### API Documentation Requirements

```typescript
interface DocumentationRequirements {
  // For each endpoint
  endpoint: {
    summary: string;
    description: string;
    operationId: string;
    tags: string[];
    security?: string[];
  };

  // For each parameter
  parameter: {
    name: string;
    description: string;
    required: boolean;
    schema: object;
    example: any;
  };

  // For each response
  response: {
    statusCode: number;
    description: string;
    schema: object;
    examples: object;
  };

  // General requirements
  general: {
    authentication: 'Document all auth methods',
    errors: 'List all possible error codes',
    examples: 'Provide request/response examples',
    changelog: 'Maintain version history',
    sdks: 'Generate client SDKs'
  };
}
```

## Inter-Service Communication

### Service Mesh Configuration

```typescript
interface ServiceMesh {
  // Service discovery
  discovery: {
    method: 'DNS' | 'Consul' | 'Kubernetes',
    healthCheck: '/health',
    interval: 30
  };

  // Load balancing
  loadBalancing: {
    strategy: 'round-robin' | 'least-connections' | 'weighted',
    retries: 3,
    timeout: 30000
  };

  // Circuit breaking
  circuitBreaker: {
    threshold: 5,
    timeout: 60000,
    halfOpenRequests: 3
  };

  // Tracing
  tracing: {
    enabled: true,
    sampler: 0.1,
    propagation: 'w3c'
  };
}
```

### gRPC Services

```protobuf
syntax = "proto3";

package pliers.v1;

service FormService {
  rpc GetForm(GetFormRequest) returns (Form);
  rpc ListForms(ListFormsRequest) returns (FormList);
  rpc CreateForm(CreateFormRequest) returns (Form);
  rpc UpdateForm(UpdateFormRequest) returns (Form);
  rpc DeleteForm(DeleteFormRequest) returns (Empty);

  // Streaming
  rpc WatchForms(WatchFormsRequest) returns (stream FormEvent);
}

message Form {
  string id = 1;
  string name = 2;
  google.protobuf.Struct schema = 3;
  google.protobuf.Timestamp created_at = 4;
  google.protobuf.Timestamp updated_at = 5;
}
```

## API Testing Strategy

### Contract Testing

```typescript
interface ContractTest {
  // Provider contract
  provider: {
    name: 'form-service',
    version: '1.0.0',
    endpoints: [
      {
        method: 'GET',
        path: '/forms/:id',
        response: {
          status: 200,
          body: FormSchema
        }
      }
    ]
  };

  // Consumer contract
  consumer: {
    name: 'web-app',
    version: '1.0.0',
    expectations: [
      {
        request: {
          method: 'GET',
          path: '/forms/123'
        },
        response: {
          status: 200,
          body: {
            id: '123',
            name: 'Test Form'
          }
        }
      }
    ]
  };
}
```

### Integration Testing

```typescript
describe('API Integration Tests', () => {
  describe('Forms API', () => {
    it('should create and retrieve a form', async () => {
      // Create form
      const createResponse = await api.post('/forms', {
        name: 'Test Form',
        schema: { /* ... */ }
      });
      expect(createResponse.status).toBe(201);

      // Retrieve form
      const getResponse = await api.get(`/forms/${createResponse.data.id}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.name).toBe('Test Form');
    });
  });
});
```

## Component API References

The following component-specific API documentations provide detailed specifications:

1. **[Form Engine API](../components/form-engine/api.md)** - Form definition and rendering APIs
2. **[Submission Engine API](../components/submission-engine/api.md)** - Submission handling and storage APIs
3. **[Event Engine API](../components/event-engine/api.md)** - Event sourcing and streaming APIs
4. **[Plugin Engine API](../components/plugin-engine/api.md)** - Plugin management and execution APIs
5. **[Workflow Engine API](../components/workflow-engine/api.md)** - Workflow orchestration APIs
6. **[Search Engine API](../components/search-engine/api.md)** - Search and indexing APIs
7. **[AI Engine API](../components/ai-engine/api.md)** - AI integration and processing APIs

## API Governance

### API Lifecycle

```typescript
enum APILifecycle {
  DRAFT = 'draft',           // Under development
  BETA = 'beta',             // Testing phase
  STABLE = 'stable',         // Production ready
  DEPRECATED = 'deprecated', // Marked for removal
  SUNSET = 'sunset'          // No longer available
}
```

### Breaking Change Policy

```yaml
breaking_changes:
  notification: 6 months in advance
  migration_guide: Required
  backwards_compatibility: 1 version minimum
  sunset_period: 12 months

  examples:
    - Removing endpoints
    - Changing response structure
    - Modifying authentication
    - Altering rate limits
```

## Security Considerations

### API Security Checklist

- [ ] Authentication required on all endpoints
- [ ] Authorization checks for resource access
- [ ] Input validation on all parameters
- [ ] SQL injection prevention
- [ ] XSS prevention in responses
- [ ] CSRF protection for state-changing operations
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] API keys properly managed
- [ ] Sensitive data encrypted
- [ ] Audit logging enabled
- [ ] DDoS protection configured
- [ ] Regular security audits

---
*Version: 1.0.0*
*Last Updated: 2025-09-23*
*Next Review: Monthly*