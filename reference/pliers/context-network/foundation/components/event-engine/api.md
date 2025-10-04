# Event Engine API Specification

## Purpose
Defines the REST API endpoints and WebSocket specifications for the Event Engine component, providing comprehensive interface documentation for event management, subscription, and real-time streaming.

## Classification
- **Domain:** API Specification
- **Stability:** Semi-stable
- **Abstraction:** Interface
- **Confidence:** High

## Overview

The Event Engine provides both REST APIs for event management operations and WebSocket connections for real-time event streaming. The API is designed to be RESTful, well-documented, and type-safe with comprehensive error handling and validation.

### API Design Principles

1. **RESTful Design**: Standard HTTP methods and status codes
2. **Type Safety**: All requests/responses validated with Zod schemas
3. **Consistent Responses**: Standardized response format across all endpoints
4. **Comprehensive Error Handling**: Detailed error information with actionable messages
5. **Rate Limiting**: Protection against abuse with configurable limits
6. **Authentication**: JWT-based authentication with role-based access control
7. **Versioning**: API versioning for backward compatibility

## Base Configuration

### Base URL
```
Production: https://api.pliers.app/v1/events
Staging: https://staging-api.pliers.app/v1/events
Development: http://localhost:3000/v1/events
```

### Authentication
All API endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Content Type
All API requests and responses use JSON:
```
Content-Type: application/json
```

### Standard Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
    processingTime: number;
  };
}
```

## REST API Endpoints

### Event Management

#### Publish Event
Publishes a single event to the event store.

```http
POST /events
```

**Request Body:**
```typescript
{
  event: BaseEvent;
}
```

**Example Request:**
```json
{
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "submission.created",
    "version": 1,
    "timestamp": "2025-01-22T10:30:00Z",
    "aggregateId": "submission-123",
    "aggregateType": "submission",
    "sequenceNumber": 1,
    "metadata": {
      "userId": "user-456",
      "sourceSystem": "frontend",
      "sourceVersion": "1.2.0",
      "sessionId": "session-789"
    },
    "payload": {
      "submissionId": "submission-123",
      "formId": "form-456",
      "data": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "status": "submitted",
      "submittedBy": "user-456"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "sequenceNumber": 1,
    "timestamp": "2025-01-22T10:30:00Z",
    "published": true
  },
  "metadata": {
    "requestId": "req-123",
    "timestamp": "2025-01-22T10:30:00.123Z",
    "version": "1.0.0",
    "processingTime": 45
  }
}
```

**Status Codes:**
- `201 Created`: Event published successfully
- `400 Bad Request`: Invalid event data
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: Insufficient permissions to publish event type
- `409 Conflict`: Sequence number conflict
- `422 Unprocessable Entity`: Event validation failed
- `500 Internal Server Error`: Server error

#### Publish Event Batch
Publishes multiple events atomically.

```http
POST /events/batch
```

**Request Body:**
```typescript
{
  batch: EventBatch;
}
```

**Example Request:**
```json
{
  "batch": {
    "batchId": "batch-789",
    "events": [
      {
        "id": "event-1",
        "type": "form.created",
        "version": 1,
        "timestamp": "2025-01-22T10:30:00Z",
        "aggregateId": "form-123",
        "aggregateType": "form",
        "sequenceNumber": 1,
        "metadata": {
          "userId": "user-456",
          "sourceSystem": "api",
          "sourceVersion": "2.0.0"
        },
        "payload": {
          "formId": "form-123",
          "name": "Registration Form",
          "definition": {}
        }
      },
      {
        "id": "event-2",
        "type": "submission.created",
        "version": 1,
        "timestamp": "2025-01-22T10:30:01Z",
        "aggregateId": "submission-456",
        "aggregateType": "submission",
        "sequenceNumber": 1,
        "causationId": "event-1",
        "metadata": {
          "userId": "user-789",
          "sourceSystem": "api",
          "sourceVersion": "2.0.0"
        },
        "payload": {
          "submissionId": "submission-456",
          "formId": "form-123",
          "data": {}
        }
      }
    ],
    "timestamp": "2025-01-22T10:30:00Z",
    "aggregateId": "batch-operation",
    "expectedVersion": 0
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-789",
    "eventsPublished": 2,
    "sequenceNumbers": [1, 1],
    "timestamp": "2025-01-22T10:30:01Z"
  },
  "metadata": {
    "requestId": "req-124",
    "timestamp": "2025-01-22T10:30:01.234Z",
    "version": "1.0.0",
    "processingTime": 67
  }
}
```

#### Get Events by Aggregate
Retrieves events for a specific aggregate.

```http
GET /events/aggregates/{aggregateId}
```

**Path Parameters:**
- `aggregateId` (string, required): The aggregate identifier

**Query Parameters:**
- `fromSequence` (integer, optional): Starting sequence number
- `toSequence` (integer, optional): Ending sequence number
- `limit` (integer, optional, default: 100): Maximum number of events
- `includeSnapshots` (boolean, optional, default: false): Include snapshot data

**Example Request:**
```http
GET /events/aggregates/submission-123?fromSequence=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "aggregateId": "submission-123",
    "aggregateType": "submission",
    "events": [
      {
        "id": "event-1",
        "type": "submission.created",
        "version": 1,
        "timestamp": "2025-01-22T10:30:00Z",
        "aggregateId": "submission-123",
        "aggregateType": "submission",
        "sequenceNumber": 1,
        "payload": {}
      }
    ],
    "metadata": {
      "totalEvents": 1,
      "fromSequence": 1,
      "toSequence": 1,
      "hasMore": false
    }
  },
  "metadata": {
    "requestId": "req-125",
    "timestamp": "2025-01-22T10:30:02.345Z",
    "version": "1.0.0",
    "processingTime": 23
  }
}
```

#### Query Events
Advanced event querying with filtering.

```http
POST /events/query
```

**Request Body:**
```typescript
{
  query: EventQuery;
}
```

**Example Request:**
```json
{
  "query": {
    "eventTypes": ["submission.created", "submission.status.changed"],
    "aggregateTypes": ["submission"],
    "timestampRange": {
      "from": "2025-01-22T00:00:00Z",
      "to": "2025-01-22T23:59:59Z"
    },
    "payloadFilters": [
      {
        "path": "$.formId",
        "operator": "equals",
        "value": "form-123"
      }
    ],
    "limit": 100,
    "sortBy": "timestamp",
    "sortOrder": "desc"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [],
    "totalCount": 25,
    "hasMore": false,
    "queryId": "query-456",
    "executionTime": 45
  },
  "metadata": {
    "requestId": "req-126",
    "timestamp": "2025-01-22T10:30:03.456Z",
    "version": "1.0.0",
    "processingTime": 78
  }
}
```

### Event Subscriptions

#### Create Subscription
Creates a new event subscription.

```http
POST /subscriptions
```

**Request Body:**
```typescript
{
  filter: EventFilter;
  options?: StreamOptions;
  description?: string;
}
```

**Example Request:**
```json
{
  "filter": {
    "eventTypes": ["submission.created"],
    "aggregateTypes": ["submission"]
  },
  "options": {
    "includeHistory": false,
    "bufferSize": 100,
    "heartbeatInterval": 30000
  },
  "description": "Monitor new submissions"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub-789",
    "filter": {
      "eventTypes": ["submission.created"],
      "aggregateTypes": ["submission"]
    },
    "status": "active",
    "createdAt": "2025-01-22T10:30:04Z",
    "wsUrl": "wss://api.pliers.app/v1/events/stream/sub-789"
  },
  "metadata": {
    "requestId": "req-127",
    "timestamp": "2025-01-22T10:30:04.567Z",
    "version": "1.0.0",
    "processingTime": 34
  }
}
```

#### List Subscriptions
Lists all subscriptions for the authenticated user.

```http
GET /subscriptions
```

**Query Parameters:**
- `status` (string, optional): Filter by subscription status
- `limit` (integer, optional, default: 50): Maximum subscriptions to return
- `offset` (integer, optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub-789",
        "filter": {},
        "status": "active",
        "createdAt": "2025-01-22T10:30:04Z",
        "eventsDelivered": 0,
        "lastEventAt": null,
        "description": "Monitor new submissions"
      }
    ],
    "totalCount": 1,
    "hasMore": false
  },
  "metadata": {
    "requestId": "req-128",
    "timestamp": "2025-01-22T10:30:05.678Z",
    "version": "1.0.0",
    "processingTime": 12
  }
}
```

#### Update Subscription
Updates an existing subscription.

```http
PUT /subscriptions/{subscriptionId}
```

**Request Body:**
```typescript
{
  filter?: EventFilter;
  options?: StreamOptions;
  description?: string;
  status?: 'active' | 'paused';
}
```

#### Delete Subscription
Deletes a subscription.

```http
DELETE /subscriptions/{subscriptionId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub-789",
    "deletedAt": "2025-01-22T10:30:06Z"
  },
  "metadata": {
    "requestId": "req-129",
    "timestamp": "2025-01-22T10:30:06.789Z",
    "version": "1.0.0",
    "processingTime": 15
  }
}
```

### Event Replay

#### Replay Events by Aggregate
Replays events for debugging and analysis.

```http
POST /events/replay/aggregate/{aggregateId}
```

**Request Body:**
```typescript
{
  fromSequence?: number;
  toSequence?: number;
  includeSnapshots?: boolean;
}
```

**Example Request:**
```json
{
  "fromSequence": 1,
  "toSequence": 10,
  "includeSnapshots": true
}
```

#### Replay Events by Time Range
Replays events within a time range.

```http
POST /events/replay/timerange
```

**Request Body:**
```typescript
{
  from: string; // ISO timestamp
  to: string;   // ISO timestamp
  filter?: EventFilter;
  includeProjection?: boolean;
}
```

#### Create Projection
Creates a projection from replayed events.

```http
POST /events/projections
```

**Request Body:**
```typescript
{
  aggregateId?: string;
  timeRange?: TimeWindow;
  filter?: EventFilter;
  projectorType: string;
  projectorConfig?: Record<string, unknown>;
}
```

### Plugin Management

#### List Registered Plugins
Lists all registered plugins.

```http
GET /plugins
```

**Query Parameters:**
- `status` (string, optional): Filter by plugin status
- `eventType` (string, optional): Filter by supported event type

**Response:**
```json
{
  "success": true,
  "data": {
    "plugins": [
      {
        "id": "email-notification-plugin",
        "name": "Email Notification Plugin",
        "version": "1.0.0",
        "status": "active",
        "eventTypes": ["submission.created", "submission.status.changed"],
        "priority": 50,
        "registeredAt": "2025-01-22T09:00:00Z",
        "lastHealthCheck": "2025-01-22T10:29:00Z"
      }
    ],
    "totalCount": 1
  },
  "metadata": {
    "requestId": "req-130",
    "timestamp": "2025-01-22T10:30:07.890Z",
    "version": "1.0.0",
    "processingTime": 18
  }
}
```

#### Register Plugin
Registers a new plugin.

```http
POST /plugins
```

**Request Body:**
```typescript
{
  plugin: PluginRegistration;
  eventTypes: string[];
  options?: PluginOptions;
}
```

#### Update Plugin
Updates plugin configuration.

```http
PUT /plugins/{pluginId}
```

#### Enable/Disable Plugin
Controls plugin activation.

```http
POST /plugins/{pluginId}/enable
POST /plugins/{pluginId}/disable
```

#### Get Plugin Execution History
Retrieves plugin execution history.

```http
GET /plugins/{pluginId}/executions
```

**Query Parameters:**
- `from` (string, optional): Start timestamp
- `to` (string, optional): End timestamp
- `status` (string, optional): Filter by execution status
- `limit` (integer, optional, default: 100)

### Dead Letter Queue

#### List Dead Letter Events
Lists events in the dead letter queue.

```http
GET /deadletter
```

**Query Parameters:**
- `status` (string, optional): Filter by DLQ status
- `errorType` (string, optional): Filter by error type
- `limit` (integer, optional, default: 50)
- `offset` (integer, optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "deadLetterEvents": [
      {
        "id": "dlq-123",
        "originalEvent": {},
        "failedAt": "2025-01-22T10:15:00Z",
        "error": {
          "type": "network_error",
          "message": "Connection timeout",
          "code": "TIMEOUT"
        },
        "attempts": 2,
        "maxAttempts": 5,
        "nextRetryAt": "2025-01-22T10:35:00Z",
        "status": "pending_retry"
      }
    ],
    "totalCount": 1,
    "hasMore": false
  },
  "metadata": {
    "requestId": "req-131",
    "timestamp": "2025-01-22T10:30:08.901Z",
    "version": "1.0.0",
    "processingTime": 25
  }
}
```

#### Retry Dead Letter Event
Retries a specific dead letter event.

```http
POST /deadletter/{eventId}/retry
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "dlq-123",
    "retryAttempt": 3,
    "success": true,
    "timestamp": "2025-01-22T10:30:09Z"
  },
  "metadata": {
    "requestId": "req-132",
    "timestamp": "2025-01-22T10:30:09.012Z",
    "version": "1.0.0",
    "processingTime": 156
  }
}
```

#### Batch Retry Dead Letter Events
Retries multiple dead letter events.

```http
POST /deadletter/retry
```

**Request Body:**
```typescript
{
  eventIds: string[];
}
```

#### Mark Permanent Failure
Marks a dead letter event as permanently failed.

```http
POST /deadletter/{eventId}/permanent-failure
```

**Request Body:**
```typescript
{
  reason: string;
}
```

### Event Routing

#### List Routing Rules
Lists all routing rules.

```http
GET /routing/rules
```

#### Create Routing Rule
Creates a new routing rule.

```http
POST /routing/rules
```

**Request Body:**
```typescript
{
  rule: RoutingRule;
}
```

#### Update Routing Rule
Updates an existing routing rule.

```http
PUT /routing/rules/{ruleId}
```

#### Delete Routing Rule
Deletes a routing rule.

```http
DELETE /routing/rules/{ruleId}
```

#### Test Routing Rule
Tests a routing rule against sample events.

```http
POST /routing/rules/{ruleId}/test
```

**Request Body:**
```typescript
{
  testEvent: BaseEvent;
}
```

### Monitoring and Metrics

#### Get Health Status
Retrieves system health information.

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-22T10:30:10Z",
    "version": "1.0.0",
    "uptime": 86400000,
    "components": {
      "eventStore": {
        "status": "healthy",
        "message": "Event store is accessible",
        "lastCheck": "2025-01-22T10:30:10Z",
        "responseTime": 23
      },
      "cache": {
        "status": "healthy",
        "message": "Cache is accessible",
        "lastCheck": "2025-01-22T10:30:10Z"
      }
    },
    "metrics": {
      "eventsProcessedLast1m": 145,
      "activeSubscriptions": 12,
      "errorRate": 0.2,
      "memoryUsage": 45.6,
      "diskUsage": 32.1
    }
  },
  "metadata": {
    "requestId": "req-133",
    "timestamp": "2025-01-22T10:30:10.123Z",
    "version": "1.0.0",
    "processingTime": 8
  }
}
```

#### Get Volume Metrics
Retrieves event volume metrics.

```http
GET /metrics/volume
```

**Query Parameters:**
- `from` (string, required): Start timestamp
- `to` (string, required): End timestamp
- `granularity` (string, optional, default: "hour"): Metric granularity (minute, hour, day)

#### Get Performance Metrics
Retrieves performance metrics.

```http
GET /metrics/performance
```

#### Get Error Metrics
Retrieves error metrics.

```http
GET /metrics/errors
```

#### Get Storage Metrics
Retrieves storage metrics.

```http
GET /metrics/storage
```

### Event Compaction

#### List Compaction Jobs
Lists compaction jobs.

```http
GET /compaction/jobs
```

#### Create Compaction Job
Creates a new compaction job.

```http
POST /compaction/jobs
```

**Request Body:**
```typescript
{
  aggregateId?: string;
  aggregateType?: string;
  timeRange?: TimeWindow;
  strategy: CompactionStrategy;
  dryRun?: boolean;
}
```

#### Get Compaction Job Status
Retrieves compaction job status.

```http
GET /compaction/jobs/{jobId}
```

#### Schedule Automatic Compaction
Schedules automatic compaction.

```http
POST /compaction/schedules
```

**Request Body:**
```typescript
{
  schedule: CompactionSchedule;
}
```

## WebSocket API

### Connection

#### Establish Connection
Connect to the WebSocket endpoint for real-time event streaming.

```
wss://api.pliers.app/v1/events/stream
```

**Connection Parameters:**
- `token` (query parameter): JWT authentication token
- `clientId` (query parameter, optional): Client identifier for reconnection

**Example Connection:**
```javascript
const ws = new WebSocket('wss://api.pliers.app/v1/events/stream?token=YOUR_JWT_TOKEN&clientId=client-123');
```

#### Authentication
Include JWT token in the connection URL or send as first message:

```json
{
  "type": "authenticate",
  "token": "YOUR_JWT_TOKEN"
}
```

### Message Types

#### Client Messages

##### Subscribe to Events
```json
{
  "type": "subscribe",
  "subscriptionId": "sub-123",
  "filter": {
    "eventTypes": ["submission.created", "submission.status.changed"],
    "aggregateTypes": ["submission"]
  },
  "options": {
    "includeHistory": false,
    "bufferSize": 100,
    "heartbeatInterval": 30000
  }
}
```

##### Unsubscribe from Events
```json
{
  "type": "unsubscribe",
  "subscriptionId": "sub-123"
}
```

##### Ping (Heartbeat)
```json
{
  "type": "ping",
  "timestamp": "2025-01-22T10:30:00Z"
}
```

#### Server Messages

##### Subscription Confirmed
```json
{
  "type": "subscription_confirmed",
  "streamId": "stream-456",
  "data": {
    "subscriptionId": "sub-123",
    "filter": {
      "eventTypes": ["submission.created"]
    },
    "historyIncluded": false
  },
  "timestamp": "2025-01-22T10:30:00Z"
}
```

##### Event Delivery
```json
{
  "type": "event",
  "streamId": "stream-456",
  "data": {
    "id": "event-789",
    "type": "submission.created",
    "version": 1,
    "timestamp": "2025-01-22T10:30:00Z",
    "aggregateId": "submission-123",
    "aggregateType": "submission",
    "sequenceNumber": 1,
    "metadata": {
      "userId": "user-456",
      "sourceSystem": "frontend"
    },
    "payload": {
      "submissionId": "submission-123",
      "formId": "form-456",
      "data": {}
    }
  },
  "timestamp": "2025-01-22T10:30:00Z",
  "sequenceNumber": 1
}
```

##### Heartbeat Response
```json
{
  "type": "heartbeat",
  "streamId": "stream-456",
  "timestamp": "2025-01-22T10:30:00Z",
  "serverTime": "2025-01-22T10:30:00.123Z"
}
```

##### Error Message
```json
{
  "type": "error",
  "streamId": "stream-456",
  "data": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid event filter",
    "details": {
      "field": "eventTypes",
      "reason": "must be non-empty array"
    }
  },
  "timestamp": "2025-01-22T10:30:00Z"
}
```

##### Subscription Closed
```json
{
  "type": "subscription_closed",
  "streamId": "stream-456",
  "data": {
    "reason": "client_disconnected",
    "code": 1000
  },
  "timestamp": "2025-01-22T10:30:00Z"
}
```

### Connection Management

#### Reconnection Strategy
Clients should implement exponential backoff for reconnection:

```javascript
class EventStreamClient {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;

  private async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private onOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0; // Reset on successful connection
  }

  private onClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);

    if (event.code !== 1000) { // Not a normal closure
      this.reconnect();
    }
  }
}
```

#### Buffer Management
The client should handle message buffering during disconnections:

```javascript
class BufferedEventClient {
  private messageBuffer: any[] = [];
  private maxBufferSize = 1000;

  private bufferMessage(message: any) {
    this.messageBuffer.push(message);

    if (this.messageBuffer.length > this.maxBufferSize) {
      this.messageBuffer.shift(); // Remove oldest message
    }
  }

  private flushBuffer() {
    while (this.messageBuffer.length > 0) {
      const message = this.messageBuffer.shift();
      this.processMessage(message);
    }
  }
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description | When Used |
|-------------|-------------|-----------|
| 200 OK | Request successful | GET requests |
| 201 Created | Resource created | POST requests creating new resources |
| 204 No Content | Request successful, no content | DELETE requests |
| 400 Bad Request | Invalid request format | Malformed JSON, missing required fields |
| 401 Unauthorized | Authentication required | Missing or invalid JWT token |
| 403 Forbidden | Insufficient permissions | User lacks required permissions |
| 404 Not Found | Resource not found | Aggregate, event, or subscription not found |
| 409 Conflict | Resource conflict | Sequence number conflicts |
| 422 Unprocessable Entity | Validation failed | Event schema validation errors |
| 429 Too Many Requests | Rate limit exceeded | Too many requests from client |
| 500 Internal Server Error | Server error | Unexpected server errors |
| 502 Bad Gateway | Upstream service error | Database or cache service errors |
| 503 Service Unavailable | Service temporarily unavailable | System maintenance or overload |

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "value": "invalid_value",
      "constraint": "validation_rule",
      "suggestion": "Try using a valid UUID format"
    }
  },
  "metadata": {
    "requestId": "req-134",
    "timestamp": "2025-01-22T10:30:11Z",
    "version": "1.0.0",
    "processingTime": 12
  }
}
```

### Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `VALIDATION_ERROR` | Request validation failed | Check request format and required fields |
| `AUTHENTICATION_ERROR` | Authentication failed | Provide valid JWT token |
| `AUTHORIZATION_ERROR` | Insufficient permissions | Contact admin for required permissions |
| `SEQUENCE_CONFLICT` | Event sequence conflict | Retry with correct sequence number |
| `AGGREGATE_NOT_FOUND` | Aggregate does not exist | Verify aggregate ID exists |
| `EVENT_NOT_FOUND` | Event does not exist | Verify event ID exists |
| `SUBSCRIPTION_NOT_FOUND` | Subscription does not exist | Verify subscription ID exists |
| `PLUGIN_NOT_FOUND` | Plugin does not exist | Verify plugin ID exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement exponential backoff |
| `INTERNAL_ERROR` | Unexpected server error | Retry request, contact support if persists |
| `SERVICE_UNAVAILABLE` | Service temporarily down | Wait and retry later |

### WebSocket Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 1000 | Normal closure | No action needed |
| 1001 | Going away | Reconnect |
| 1002 | Protocol error | Check message format |
| 1003 | Unsupported data | Check message type |
| 1006 | Abnormal closure | Reconnect with backoff |
| 1011 | Internal error | Reconnect with backoff |
| 4000 | Authentication failed | Refresh JWT token |
| 4001 | Authorization failed | Check permissions |
| 4002 | Invalid subscription | Verify subscription parameters |
| 4003 | Rate limit exceeded | Reduce message frequency |

## Rate Limiting

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /events` | 1000 requests | per minute |
| `POST /events/batch` | 100 requests | per minute |
| `POST /events/query` | 100 requests | per minute |
| `POST /subscriptions` | 50 requests | per hour |
| `GET /metrics/*` | 200 requests | per minute |
| WebSocket connections | 10 connections | per user |
| WebSocket messages | 1000 messages | per minute per connection |

### Rate Limit Headers

API responses include rate limiting information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642857600
X-RateLimit-Window: 60
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 1000,
      "window": 60,
      "retryAfter": 45
    }
  },
  "metadata": {
    "requestId": "req-135",
    "timestamp": "2025-01-22T10:30:12Z",
    "version": "1.0.0",
    "processingTime": 5
  }
}
```

## Pagination

### Cursor-based Pagination

For large result sets, use cursor-based pagination:

```http
GET /events/aggregates/submission-123?limit=50&cursor=eyJzZXF1ZW5jZSI6MTAwfQ
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [],
    "hasMore": true,
    "nextCursor": "eyJzZXF1ZW5jZSI6MTUwfQ",
    "totalCount": 250
  }
}
```

### Offset-based Pagination

For simpler use cases:

```http
GET /subscriptions?limit=20&offset=40
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
https://api.pliers.app/v1/events/docs/openapi.json
```

Interactive API documentation:

```
https://api.pliers.app/v1/events/docs
```

## Client SDKs

### JavaScript/TypeScript SDK

```typescript
import { EventEngineClient } from '@pliers/event-engine-client';

const client = new EventEngineClient({
  baseUrl: 'https://api.pliers.app/v1/events',
  apiKey: 'your-api-key'
});

// Publish event
await client.publishEvent(event);

// Subscribe to events
const subscription = await client.subscribe(filter, handler);

// Stream events
const stream = client.createStream(filter);
stream.onEvent(event => console.log(event));
```

### Python SDK

```python
from pliers_event_engine import EventEngineClient

client = EventEngineClient(
    base_url='https://api.pliers.app/v1/events',
    api_key='your-api-key'
)

# Publish event
await client.publish_event(event)

# Query events
events = await client.query_events(query)
```

### curl Examples

#### Publish Event
```bash
curl -X POST https://api.pliers.app/v1/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "submission.created",
      "version": 1,
      "timestamp": "2025-01-22T10:30:00Z",
      "aggregateId": "submission-123",
      "aggregateType": "submission",
      "sequenceNumber": 1,
      "metadata": {
        "userId": "user-456",
        "sourceSystem": "api"
      },
      "payload": {
        "submissionId": "submission-123",
        "formId": "form-456",
        "data": {}
      }
    }
  }'
```

#### Query Events
```bash
curl -X POST https://api.pliers.app/v1/events/query \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "eventTypes": ["submission.created"],
      "limit": 10
    }
  }'
```

#### Get Health Status
```bash
curl -X GET https://api.pliers.app/v1/events/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing

### API Testing with Postman

A comprehensive Postman collection is available:

```
https://api.pliers.app/v1/events/docs/postman.json
```

### Integration Testing

Example test scenarios:

```typescript
describe('Event Engine API Integration', () => {
  test('should publish and query events', async () => {
    // Publish event
    const publishResponse = await fetch('/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ event: testEvent })
    });

    expect(publishResponse.status).toBe(201);

    // Query events
    const queryResponse = await fetch('/events/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: {
          aggregateIds: [testEvent.aggregateId]
        }
      })
    });

    const queryData = await queryResponse.json();
    expect(queryData.success).toBe(true);
    expect(queryData.data.events).toHaveLength(1);
  });
});
```

## Performance Considerations

### Request Optimization

1. **Batch Operations**: Use batch endpoints for multiple events
2. **Pagination**: Use appropriate page sizes (50-100 items)
3. **Filtering**: Be specific with event filters to reduce data transfer
4. **Compression**: Enable gzip compression for large payloads
5. **Caching**: Leverage ETags and cache headers where appropriate

### WebSocket Optimization

1. **Connection Pooling**: Reuse WebSocket connections
2. **Subscription Management**: Combine related filters into single subscriptions
3. **Buffer Management**: Implement client-side buffering for high-volume streams
4. **Heartbeat Tuning**: Adjust heartbeat intervals based on network conditions

### Monitoring

1. **Request Latency**: Monitor API response times
2. **Error Rates**: Track error rates by endpoint and status code
3. **WebSocket Health**: Monitor connection stability and message delivery
4. **Rate Limiting**: Monitor rate limit usage patterns

## Relationships
- **Parent Nodes:** [foundation/components/event-engine/specification.md] - implements - API interfaces for specification
- **Related Nodes:**
  - [foundation/components/event-engine/schema.ts] - validates - Request/response schemas
  - [foundation/components/event-engine/examples.md] - demonstrates - API usage patterns

## Navigation Guidance
- **Access Context**: Reference when implementing API clients or understanding API contracts
- **Common Next Steps**: Review schema definitions or implementation examples
- **Related Tasks**: API client development, integration implementation, testing
- **Update Patterns**: Update when API changes or new endpoints are added

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-4 Implementation

## Change History
- 2025-01-22: Initial API specification with comprehensive REST and WebSocket documentation