# AI Engine API Specification

## Purpose
This document provides comprehensive REST API specifications for the AI Engine component, including all endpoints for AI operations, LLM provider management, conversation handling, agent coordination, and monitoring capabilities.

## Classification
- **Domain:** API Specification
- **Stability:** Stable
- **Abstraction:** Interface
- **Confidence:** Established

## API Overview

The AI Engine API provides RESTful endpoints for managing AI operations, LLM providers, conversations, AI agents, and monitoring. The API follows OpenAPI 3.0 standards with comprehensive error handling, authentication, rate limiting, and cost tracking.

### Base Configuration

```yaml
openapi: 3.0.3
info:
  title: AI Engine API
  description: Comprehensive AI operations and management API
  version: 1.0.0
  contact:
    name: AI API Support
    email: ai-support@pliers.dev
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://ai.pliers.dev/v1
    description: Production AI server
  - url: https://staging-ai.pliers.dev/v1
    description: Staging AI server
  - url: http://localhost:3001/api/v1
    description: Development AI server

security:
  - BearerAuth: []
  - ApiKeyAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

## Authentication and Authorization

### Authentication Methods

1. **JWT Bearer Token** (Recommended for web applications)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. **API Key** (For server-to-server communication)
```http
X-API-Key: ai_key_1234567890abcdef
```

### Authorization Levels

| Role | Permissions |
|------|-------------|
| **ai-admin** | Full access to all AI operations, providers, and monitoring |
| **ai-operator** | Manage AI operations, view analytics, configure providers |
| **ai-user** | Use AI services, view own conversations and usage |
| **ai-agent** | Execute agent operations, access assigned tools |
| **ai-viewer** | Read-only access to AI analytics and public models |

### Scope-Based Access

```typescript
interface AIAuthScope {
  providers: 'read' | 'write' | 'admin';
  conversations: 'read' | 'write' | 'admin';
  agents: 'read' | 'write' | 'admin';
  analytics: 'read' | 'admin';
  models: 'read' | 'write' | 'admin';
  costs: 'read' | 'admin';
}
```

## AI Provider Management Endpoints

### 1. List AI Providers

Retrieve available AI providers and their capabilities.

```http
GET /providers
```

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `active` | boolean | Filter by active status | `true` |
| `type` | string | Filter by provider type (openai, anthropic, etc.) | - |
| `capabilities` | string | Filter by capabilities (streaming, function-calling, etc.) | - |
| `include_models` | boolean | Include model definitions | `false` |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "openai-001",
      "name": "OpenAI GPT",
      "type": "openai",
      "active": true,
      "capabilities": {
        "functionCalling": true,
        "streaming": true,
        "multimodal": false,
        "embeddings": true,
        "maxTokens": 128000,
        "supportedLanguages": ["en", "es", "fr", "de"]
      },
      "models": [
        {
          "id": "gpt-4",
          "name": "GPT-4",
          "type": "chat",
          "maxTokens": 128000,
          "inputCost": 0.03,
          "outputCost": 0.06
        }
      ],
      "healthCheck": {
        "status": "healthy",
        "lastCheck": "2025-01-22T10:30:00Z",
        "responseTime": 245
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### 2. Register AI Provider

Add a new AI provider configuration.

```http
POST /providers
```

#### Request Body

```json
{
  "name": "Custom OpenAI",
  "type": "openai",
  "description": "Custom OpenAI configuration for enterprise",
  "credentials": {
    "apiKey": "sk-...",
    "endpoint": "https://api.openai.com/v1",
    "organization": "org-...",
    "timeout": 30000
  },
  "capabilities": {
    "functionCalling": true,
    "streaming": true,
    "multimodal": false,
    "embeddings": true,
    "maxTokens": 128000,
    "supportedLanguages": ["en"]
  },
  "priority": 5
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "provider-123",
    "name": "Custom OpenAI",
    "type": "openai",
    "active": true,
    "createdAt": "2025-01-22T10:30:00Z"
  }
}
```

### 3. Update AI Provider

Update an existing AI provider configuration.

```http
PUT /providers/{providerId}
```

### 4. Health Check AI Provider

Test provider connectivity and performance.

```http
POST /providers/{providerId}/health-check
```

#### Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "responseTime": 234,
    "timestamp": "2025-01-22T10:30:00Z",
    "details": {
      "authentication": "success",
      "modelAccess": "success",
      "rateLimits": {
        "remaining": 4980,
        "resetAt": "2025-01-22T11:00:00Z"
      }
    }
  }
}
```

## Conversation Management Endpoints

### 5. Create Conversation

Start a new AI conversation session.

```http
POST /conversations
```

#### Request Body

```json
{
  "title": "Form Generation Session",
  "context": {
    "userId": "user_123",
    "workspace": {
      "id": "workspace_456",
      "name": "Marketing Team"
    },
    "constraints": {
      "maxTokens": 4000,
      "timeout": 30000,
      "costLimit": 5.00
    }
  },
  "provider": "openai",
  "model": "gpt-4"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "conv_789",
    "title": "Form Generation Session",
    "status": "active",
    "startTime": "2025-01-22T10:30:00Z",
    "context": {
      "userId": "user_123",
      "sessionId": "session_456"
    },
    "metadata": {
      "provider": "openai",
      "model": "gpt-4",
      "totalTokens": 0,
      "totalCost": 0.0
    }
  }
}
```

### 6. Send Message

Send a message in an existing conversation.

```http
POST /conversations/{conversationId}/messages
```

#### Request Body

```json
{
  "content": "Create a customer feedback form with rating scales",
  "role": "user",
  "options": {
    "stream": false,
    "temperature": 0.7,
    "maxTokens": 2000,
    "tools": [
      {
        "name": "create_form",
        "description": "Create a new form definition"
      }
    ]
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "msg_456",
    "role": "assistant",
    "content": "I'll create a customer feedback form with rating scales for you.",
    "timestamp": "2025-01-22T10:30:00Z",
    "functionCall": {
      "name": "create_form",
      "arguments": "{\"type\":\"feedback\",\"fields\":[...]}"
    },
    "usage": {
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350
    },
    "cost": 0.021
  }
}
```

### 7. Stream Messages

Create a streaming conversation for real-time responses.

```http
POST /conversations/{conversationId}/stream
```

#### Server-Sent Events Response

```
data: {"type":"start","conversationId":"conv_789"}

data: {"type":"delta","content":"I'll","role":"assistant"}

data: {"type":"delta","content":" create","role":"assistant"}

data: {"type":"function_call","name":"create_form","arguments":"{\\"type\\":\\"feedback\\"}"}

data: {"type":"end","usage":{"totalTokens":350},"cost":0.021}
```

### 8. List Conversations

Retrieve user's conversation history.

```http
GET /conversations
```

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `userId` | string | Filter by user ID | Current user |
| `status` | string | Filter by status (active, completed, etc.) | - |
| `from` | string | Start date (ISO 8601) | - |
| `to` | string | End date (ISO 8601) | - |
| `limit` | number | Number of results (1-100) | `20` |
| `offset` | number | Pagination offset | `0` |

## AI Operations Endpoints

### 9. Chat Completion

Direct chat completion without conversation context.

```http
POST /chat/completions
```

#### Request Body

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a form design expert."
    },
    {
      "role": "user",
      "content": "Create a contact form"
    }
  ],
  "model": "gpt-4",
  "provider": "openai",
  "temperature": 0.7,
  "maxTokens": 1000,
  "stream": false
}
```

### 10. Function Calling

Execute AI function calls with validation.

```http
POST /functions/execute
```

#### Request Body

```json
{
  "name": "analyze_form_performance",
  "arguments": {
    "formId": "form_123",
    "timeframe": "30d",
    "metrics": ["completion_rate", "drop_off_points"]
  },
  "context": {
    "userId": "user_456",
    "permissions": ["forms:read", "analytics:read"]
  },
  "options": {
    "timeout": 30000,
    "priority": "medium"
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "exec_789",
    "result": {
      "completionRate": 0.73,
      "dropOffPoints": [
        {
          "field": "phone_number",
          "dropOffRate": 0.15
        }
      ],
      "recommendations": [
        "Make phone number optional",
        "Add explanation for phone number requirement"
      ]
    },
    "metadata": {
      "executionTime": 1250,
      "tokensUsed": 450,
      "cost": 0.027
    }
  }
}
```

### 11. Generate Embeddings

Generate vector embeddings for text content.

```http
POST /embeddings
```

#### Request Body

```json
{
  "input": [
    "Create a customer feedback form",
    "Build a user registration form",
    "Design a survey form"
  ],
  "model": "text-embedding-ada-002",
  "provider": "openai"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "embeddings": [
      {
        "index": 0,
        "embedding": [0.1, 0.2, 0.3, ...],
        "tokens": 8
      }
    ],
    "usage": {
      "totalTokens": 24
    },
    "cost": 0.00002
  }
}
```

## Form AI Services Endpoints

### 12. Generate Form from Description

Create a form using AI from natural language description.

```http
POST /forms/generate
```

#### Request Body

```json
{
  "description": "Create a job application form with personal information, work experience, education, and file upload for resume",
  "requirements": {
    "style": "professional",
    "sections": ["personal", "experience", "education", "documents"],
    "maxFields": 20,
    "mobileOptimized": true,
    "accessibilityCompliant": true
  },
  "context": {
    "industry": "technology",
    "company": "Tech Startup Inc",
    "targetAudience": "software_developers"
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "formDefinition": {
      "id": "ai_gen_form_123",
      "name": "job_application_ai_generated",
      "metadata": {
        "title": "Software Developer Application",
        "description": "Apply for software developer positions"
      },
      "schema": {
        "fields": [
          {
            "id": "first_name",
            "type": "text",
            "required": true,
            "ui": {
              "label": "First Name",
              "placeholder": "Enter your first name"
            }
          }
        ]
      }
    },
    "confidence": 0.92,
    "suggestions": [
      "Consider adding a portfolio URL field",
      "Add GitHub profile field for developers"
    ],
    "metadata": {
      "generationTime": 3450,
      "tokensUsed": 1200,
      "cost": 0.072
    }
  }
}
```

### 13. Optimize Existing Form

Improve an existing form using AI analysis.

```http
POST /forms/{formId}/optimize
```

#### Request Body

```json
{
  "optimizationGoals": [
    "increase_completion_rate",
    "improve_accessibility",
    "reduce_form_length"
  ],
  "currentMetrics": {
    "completionRate": 0.65,
    "averageTime": 180,
    "mobileUsers": 0.7
  },
  "constraints": {
    "maxFields": 15,
    "requiredFields": ["email", "name"],
    "preserveLayout": false
  }
}
```

### 14. Validate Form with AI

Use AI to validate form structure and suggest improvements.

```http
POST /forms/{formId}/validate
```

### 15. Suggest Form Fields

Get AI suggestions for additional form fields.

```http
POST /forms/{formId}/suggest-fields
```

## Agent Coordination Endpoints (A2A Protocol)

### 16. List AI Agents

Retrieve available AI agents and their capabilities.

```http
GET /agents
```

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "form_designer_001",
      "name": "Form Designer Agent",
      "type": "form-designer",
      "version": "1.0.0",
      "capabilities": [
        "form_generation",
        "field_optimization",
        "layout_design"
      ],
      "active": true,
      "lastHeartbeat": "2025-01-22T10:29:00Z"
    }
  ]
}
```

### 17. Send Agent Message

Send message using A2A protocol.

```http
POST /agents/messages
```

#### Request Body

```json
{
  "from": {
    "id": "orchestrator",
    "type": "workflow-automation",
    "version": "1.0.0"
  },
  "to": {
    "id": "form_designer_001",
    "type": "form-designer",
    "version": "1.0.0"
  },
  "type": "request",
  "payload": {
    "action": "create_form_structure",
    "parameters": {
      "description": "Employee onboarding form",
      "sections": ["personal", "employment", "benefits"]
    },
    "metadata": {
      "priority": "medium",
      "timeout": 30000
    }
  }
}
```

### 18. Agent Health Check

Check agent availability and status.

```http
GET /agents/{agentId}/health
```

## Cost Management and Analytics Endpoints

### 19. Get Cost Analytics

Retrieve AI usage costs and analytics.

```http
GET /analytics/costs
```

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `timeframe` | string | Time period (hour, day, week, month) | `day` |
| `from` | string | Start date (ISO 8601) | - |
| `to` | string | End date (ISO 8601) | - |
| `provider` | string | Filter by provider | - |
| `model` | string | Filter by model | - |
| `userId` | string | Filter by user | - |

#### Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCost": 145.67,
      "totalTokens": 2450000,
      "totalRequests": 8920,
      "averageCostPerRequest": 0.016
    },
    "breakdown": {
      "byProvider": {
        "openai": {
          "cost": 89.23,
          "tokens": 1480000,
          "requests": 5230
        },
        "anthropic": {
          "cost": 56.44,
          "tokens": 970000,
          "requests": 3690
        }
      },
      "byModel": {
        "gpt-4": {
          "cost": 78.12,
          "tokens": 650000,
          "requests": 2340
        }
      },
      "byUser": {
        "user_123": {
          "cost": 23.45,
          "requests": 456
        }
      }
    },
    "trends": {
      "dailyCosts": [
        {
          "date": "2025-01-22",
          "cost": 12.34,
          "requests": 234
        }
      ]
    }
  }
}
```

### 20. Get Usage Metrics

Retrieve detailed usage and performance metrics.

```http
GET /analytics/usage
```

### 21. Cost Estimation

Estimate costs for planned AI operations.

```http
POST /analytics/estimate-cost
```

#### Request Body

```json
{
  "operations": [
    {
      "type": "form_generation",
      "complexity": "medium",
      "estimatedTokens": 1500,
      "model": "gpt-4",
      "provider": "openai"
    }
  ],
  "timeframe": "month",
  "volume": 1000
}
```

## Monitoring and Health Endpoints

### 22. System Health

Check overall AI Engine system health.

```http
GET /health
```

#### Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-22T10:30:00Z",
    "components": {
      "providers": {
        "status": "healthy",
        "activeProviders": 3,
        "healthyProviders": 3
      },
      "conversations": {
        "status": "healthy",
        "activeSessions": 45,
        "averageResponseTime": 1250
      },
      "agents": {
        "status": "healthy",
        "activeAgents": 6,
        "healthyAgents": 6
      },
      "database": {
        "status": "healthy",
        "connectionPool": "optimal"
      }
    },
    "performance": {
      "requestsPerSecond": 12.5,
      "averageResponseTime": 1180,
      "errorRate": 0.002
    }
  }
}
```

### 23. Performance Metrics

Get detailed performance and quality metrics.

```http
GET /metrics
```

### 24. Alert Management

Manage performance and cost alerts.

```http
GET /alerts
POST /alerts
PUT /alerts/{alertId}
DELETE /alerts/{alertId}
```

## WebSocket API

### Real-time AI Streaming

Connect to WebSocket for real-time AI interactions.

```javascript
// WebSocket connection
const ws = new WebSocket('wss://ai.pliers.dev/v1/stream');

// Send streaming request
ws.send(JSON.stringify({
  type: 'chat',
  conversationId: 'conv_123',
  message: {
    role: 'user',
    content: 'Create a feedback form'
  },
  options: {
    stream: true,
    model: 'gpt-4'
  }
}));

// Receive streaming responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case 'start':
      console.log('Stream started');
      break;
    case 'delta':
      console.log('Content delta:', data.content);
      break;
    case 'function_call':
      console.log('Function call:', data.name, data.arguments);
      break;
    case 'end':
      console.log('Stream ended, usage:', data.usage);
      break;
    case 'error':
      console.error('Stream error:', data.error);
      break;
  }
};
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "The requested AI provider is currently unavailable",
    "details": {
      "provider": "openai",
      "lastError": "Rate limit exceeded",
      "retryAfter": "2025-01-22T10:35:00Z"
    },
    "requestId": "req_123456",
    "timestamp": "2025-01-22T10:30:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PROVIDER_UNAVAILABLE` | 503 | AI provider is not available |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit has been exceeded |
| `INSUFFICIENT_CREDITS` | 402 | Insufficient credits for operation |
| `INVALID_MODEL` | 400 | Requested model is not available |
| `CONTEXT_TOO_LARGE` | 413 | Request exceeds context window |
| `SAFETY_VIOLATION` | 422 | Content violates safety policies |
| `TIMEOUT` | 408 | Request timed out |
| `CONVERSATION_NOT_FOUND` | 404 | Conversation does not exist |
| `AGENT_UNAVAILABLE` | 503 | Requested agent is not available |

### Rate Limiting

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642867200
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "window": "1h",
      "retryAfter": 60
    }
  }
}
```

## OpenAPI Schema

### Complete OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: AI Engine API
  version: 1.0.0
  description: Comprehensive AI operations and management API

paths:
  /providers:
    get:
      summary: List AI providers
      operationId: listProviders
      parameters:
        - name: active
          in: query
          schema:
            type: boolean
            default: true
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProvidersResponse'

components:
  schemas:
    Provider:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        type:
          type: string
          enum: [openai, anthropic, google, azure-openai, local, custom]
        active:
          type: boolean
        capabilities:
          $ref: '#/components/schemas/ProviderCapabilities'

    ProviderCapabilities:
      type: object
      properties:
        functionCalling:
          type: boolean
        streaming:
          type: boolean
        multimodal:
          type: boolean
        embeddings:
          type: boolean
        maxTokens:
          type: integer
        supportedLanguages:
          type: array
          items:
            type: string

    ProvidersResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: array
          items:
            $ref: '#/components/schemas/Provider'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
```

## Integration Examples

### Form Engine Integration

```typescript
// Generate form using AI Engine API
const generateForm = async (description: string) => {
  const response = await fetch('/api/v1/forms/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description,
      requirements: {
        style: 'professional',
        mobileOptimized: true
      }
    })
  });

  const result = await response.json();
  return result.data.formDefinition;
};
```

### Workflow Engine Integration

```typescript
// Setup AI workflow automation
const setupWorkflowAutomation = async (workflowId: string, rules: any[]) => {
  const agentMessage = {
    from: { id: 'workflow_orchestrator', type: 'workflow-automation' },
    to: { id: 'ai_automation_agent', type: 'workflow-automation' },
    type: 'request',
    payload: {
      action: 'setup_automation',
      parameters: { workflowId, rules }
    }
  };

  const response = await fetch('/api/v1/agents/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(agentMessage)
  });

  return response.json();
};
```

## Testing and Development

### API Testing Examples

```bash
# Test provider health
curl -X POST "https://ai.pliers.dev/v1/providers/openai-001/health-check" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Generate form
curl -X POST "https://ai.pliers.dev/v1/forms/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Customer feedback form with ratings",
    "requirements": {
      "style": "modern",
      "maxFields": 10
    }
  }'

# Stream conversation
curl -X POST "https://ai.pliers.dev/v1/conversations/conv_123/stream" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "content": "Create a survey form",
    "role": "user",
    "options": { "stream": true }
  }'
```

### Development Tools

- **OpenAPI Generator**: Generate client SDKs
- **Postman Collection**: Ready-to-use API collection
- **WebSocket Tester**: Real-time streaming test tool
- **Cost Calculator**: Estimate API costs

## Relationships
- **Parent Nodes:** [components/ai-engine/specification.md]
- **Child Nodes:** None
- **Related Nodes:**
  - [components/form-engine/api.md] - Form Engine API integration
  - [components/workflow-engine/api.md] - Workflow Engine API integration
  - [components/ai-engine/examples.md] - Usage examples and patterns

## Navigation Guidance
- **Access Context:** Use this document for API implementation and integration
- **Common Next Steps:** Review examples.md for usage patterns, check specification.md for architecture
- **Related Tasks:** API implementation, client SDK development, integration testing
- **Update Patterns:** Update when adding new endpoints or changing API contracts

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-7 Implementation
- **Task:** DOC-002-7

## Change History
- 2025-01-22: Initial creation of AI Engine API specification (DOC-002-7)