# Service API Contracts and Boundaries

## Purpose
Defines the API contracts, service boundaries, and communication patterns between the Core API, AI Service, and Web Frontend services.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Overview

This document establishes the formal contracts between services in the Pliers architecture. Each service has clearly defined responsibilities, API endpoints, and data contracts to ensure loose coupling and independent evolution.

## Service Boundaries

### Core API Service Boundaries

**Responsibilities:**
- All CRUD operations for forms, submissions, and workflows
- Data persistence and retrieval
- Business logic and validation
- Event processing and plugin orchestration
- Authentication and authorization

**Not Responsible For:**
- AI/LLM operations (delegates to AI Service)
- UI rendering (handled by Web Frontend)
- Complex analytics (may delegate to AI Service)

### AI Service Boundaries

**Responsibilities:**
- All AI/LLM operations
- Protocol implementations (A2A, MCP, AG-UI)
- Context building and management
- AI-powered analysis and generation
- Model selection and optimization

**Not Responsible For:**
- Data persistence (uses Core API)
- Business rule enforcement (Core API responsibility)
- User authentication (relies on Core API)

### Web Frontend Boundaries

**Responsibilities:**
- User interface and interaction
- Client-side state management
- User input validation (client-side)
- Real-time UI updates
- File uploads and downloads

**Not Responsible For:**
- Business logic (delegates to Core API)
- Data persistence (via Core API)
- AI operations (via AI Service)

## Core API Service Contract

### Base Configuration

```typescript
interface CoreAPIConfig {
  baseUrl: string; // Default: http://localhost:3000
  version: 'v1';
  contentType: 'application/json';
  authentication: 'Bearer' | 'ApiKey';
}
```

### Form Management Endpoints

```typescript
// GET /api/v1/forms
interface GetFormsRequest {
  query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    tags?: string[];
  };
}

interface GetFormsResponse {
  data: FormDefinition[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// GET /api/v1/forms/:id
interface GetFormRequest {
  params: {
    id: string;
  };
  query?: {
    version?: number;
  };
}

interface GetFormResponse {
  data: FormDefinition;
}

// POST /api/v1/forms
interface CreateFormRequest {
  body: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>;
}

interface CreateFormResponse {
  data: FormDefinition;
}

// PUT /api/v1/forms/:id
interface UpdateFormRequest {
  params: {
    id: string;
  };
  body: Partial<FormDefinition>;
}

interface UpdateFormResponse {
  data: FormDefinition;
}

// DELETE /api/v1/forms/:id
interface DeleteFormRequest {
  params: {
    id: string;
  };
}

interface DeleteFormResponse {
  success: boolean;
}
```

### Submission Management Endpoints

```typescript
// GET /api/v1/submissions
interface GetSubmissionsRequest {
  query?: {
    formId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  };
}

interface GetSubmissionsResponse {
  data: FormSubmission[];
  pagination: PaginationInfo;
}

// GET /api/v1/submissions/:id
interface GetSubmissionRequest {
  params: {
    id: string;
  };
  query?: {
    includeHistory?: boolean;
  };
}

interface GetSubmissionResponse {
  data: FormSubmission;
  history?: SubmissionHistory[];
}

// POST /api/v1/submissions
interface CreateSubmissionRequest {
  body: {
    formId: string;
    formVersion: number;
    data: Record<string, unknown>;
    status?: string;
  };
}

interface CreateSubmissionResponse {
  data: FormSubmission;
  validationErrors?: ValidationError[];
}

// PATCH /api/v1/submissions/:id
interface UpdateSubmissionRequest {
  params: {
    id: string;
  };
  body: {
    data?: Record<string, unknown>;
    status?: string;
  };
}

interface UpdateSubmissionResponse {
  data: FormSubmission;
  validationErrors?: ValidationError[];
}
```

### Workflow Management Endpoints

```typescript
// POST /api/v1/workflows/transition
interface WorkflowTransitionRequest {
  body: {
    submissionId: string;
    toStatus: string;
    reason?: string;
  };
}

interface WorkflowTransitionResponse {
  success: boolean;
  submission: FormSubmission;
  transition: {
    from: string;
    to: string;
    timestamp: string;
    user: string;
  };
}

// GET /api/v1/workflows/:submissionId/history
interface GetWorkflowHistoryRequest {
  params: {
    submissionId: string;
  };
}

interface GetWorkflowHistoryResponse {
  data: WorkflowTransition[];
}
```

### Event Stream Endpoint

```typescript
// WebSocket: /api/v1/events
interface EventStreamConnection {
  // Client -> Server
  subscribe: {
    events: string[]; // Event types to subscribe to
    filters?: {
      formId?: string;
      userId?: string;
    };
  };

  // Server -> Client
  event: {
    type: string;
    payload: unknown;
    timestamp: string;
    correlationId: string;
  };
}
```

### Search and Query Endpoints

```typescript
// POST /api/v1/search
interface SearchRequest {
  body: {
    query: string;
    types?: ('forms' | 'submissions' | 'users')[];
    filters?: Record<string, unknown>;
    limit?: number;
  };
}

interface SearchResponse {
  results: {
    forms?: FormDefinition[];
    submissions?: FormSubmission[];
    users?: User[];
  };
  totalResults: number;
  searchTime: number;
}
```

## AI Service Contract

### Base Configuration

```typescript
interface AIServiceConfig {
  baseUrl: string; // Default: http://localhost:3001
  version: 'v1';
  protocols: ['A2A', 'MCP', 'AG-UI'];
  models: {
    default: string;
    available: string[];
  };
}
```

### Form Assistance Endpoints

```typescript
// POST /ai/v1/assist/form/generate
interface GenerateFormRequest {
  body: {
    description: string;
    context?: {
      domain?: string;
      examples?: FormDefinition[];
      requirements?: string[];
    };
    options?: {
      complexity?: 'simple' | 'moderate' | 'complex';
      includeValidation?: boolean;
      includeWorkflow?: boolean;
    };
  };
}

interface GenerateFormResponse {
  form: FormDefinition;
  confidence: number;
  suggestions: string[];
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

// POST /ai/v1/assist/form/optimize
interface OptimizeFormRequest {
  body: {
    form: FormDefinition;
    goals?: ('usability' | 'performance' | 'completeness')[];
  };
}

interface OptimizeFormResponse {
  optimizedForm: FormDefinition;
  changes: FormChange[];
  improvements: {
    category: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }[];
}

// POST /ai/v1/assist/form/suggest-fields
interface SuggestFieldsRequest {
  body: {
    partialForm: Partial<FormDefinition>;
    context: string;
  };
}

interface SuggestFieldsResponse {
  suggestions: FieldSuggestion[];
}
```

### Analysis Endpoints

```typescript
// POST /ai/v1/analyze/patterns
interface AnalyzePatternsRequest {
  body: {
    submissions: FormSubmission[];
    analysisType: 'trends' | 'anomalies' | 'correlations';
  };
}

interface AnalyzePatternsResponse {
  patterns: Pattern[];
  insights: Insight[];
  visualizations?: ChartData[];
}

// POST /ai/v1/analyze/workflow
interface AnalyzeWorkflowRequest {
  body: {
    workflowId: string;
    historicalData: WorkflowTransition[];
  };
}

interface AnalyzeWorkflowResponse {
  bottlenecks: Bottleneck[];
  optimizations: WorkflowOptimization[];
  predictions: WorkflowPrediction[];
}
```

### Protocol-Specific Endpoints

```typescript
// POST /ai/v1/protocols/a2a/message
interface A2AMessageRequest {
  body: {
    message: AgentMessage;
    targetAgent?: string;
  };
}

interface A2AMessageResponse {
  response: AgentMessage;
  conversation?: ConversationContext;
}

// POST /ai/v1/protocols/mcp/context
interface MCPContextRequest {
  body: {
    scope: {
      forms?: string[];
      submissions?: string[];
      timeRange?: DateRange;
    };
    purpose: string;
  };
}

interface MCPContextResponse {
  context: ModelContext;
  cacheKey: string;
  expiresAt: string;
}

// POST /ai/v1/protocols/ag-ui/interact
interface AGUIInteractionRequest {
  body: {
    interaction: UserInteraction;
    sessionId: string;
  };
}

interface AGUIInteractionResponse {
  response: AgentResponse;
  uiUpdates?: UIUpdate[];
}
```

## Inter-Service Communication

### Service Discovery

```typescript
interface ServiceRegistry {
  services: {
    'core-api': {
      url: string;
      healthCheck: string;
      version: string;
    };
    'ai-service': {
      url: string;
      healthCheck: string;
      version: string;
      capabilities: string[];
    };
    'web': {
      url: string;
      version: string;
    };
  };
}
```

### Authentication Flow

```typescript
// 1. Web Frontend authenticates with Core API
interface AuthenticationFlow {
  // Step 1: Login
  login: {
    endpoint: '/api/v1/auth/login';
    request: {
      username: string;
      password: string;
    };
    response: {
      accessToken: string;
      refreshToken: string;
      user: User;
    };
  };

  // Step 2: Use token for Core API requests
  apiRequest: {
    headers: {
      'Authorization': `Bearer ${accessToken}`;
    };
  };

  // Step 3: Core API validates token for AI Service
  serviceToService: {
    headers: {
      'X-Service-Token': string; // Internal service token
      'X-User-Context': string; // User context for AI
    };
  };
}
```

### Event Propagation

```typescript
interface EventPropagation {
  // Core API emits event
  emit: {
    event: 'form.created';
    payload: FormDefinition;
  };

  // AI Service subscribes and processes
  aiSubscription: {
    subscribe: ['form.created', 'submission.created'];
    handler: (event: Event) => Promise<void>;
  };

  // Web Frontend receives via WebSocket
  webSubscription: {
    subscribe: ['*']; // Subscribe to all events
    filter: (event: Event) => boolean; // Client-side filtering
  };
}
```

## Error Handling Contract

### Standard Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    path: string;
    correlationId: string;
  };
}

// Error codes
enum ErrorCode {
  // 4xx Client Errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 5xx Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Custom Application Errors
  FORM_INVALID = 'FORM_INVALID',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  AI_PROCESSING_ERROR = 'AI_PROCESSING_ERROR',
}
```

## Data Type Contracts

### Shared Type Definitions

```typescript
// All services use these shared types from @pliers/shared

interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  fields: FieldDefinition[];
  relationships: RelationshipDefinition[];
  statusDefinitions: StatusDefinition[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
}

interface FormSubmission {
  id: string;
  formId: string;
  formVersion: number;
  data: Record<string, unknown>;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}
```

## Versioning Strategy

### API Versioning

```typescript
interface VersioningStrategy {
  // URL versioning for major versions
  urlPattern: '/api/v{major}/...';

  // Header versioning for minor versions
  headers: {
    'API-Version': '1.2.3';
  };

  // Deprecation notices
  deprecationHeader: {
    'Sunset': 'Sat, 31 Dec 2025 23:59:59 GMT';
    'Deprecation': 'true';
    'Link': '<https://api.pliers.io/docs/migrations>; rel="deprecation"';
  };
}
```

## Rate Limiting Contract

```typescript
interface RateLimiting {
  // Rate limit headers
  headers: {
    'X-RateLimit-Limit': number;
    'X-RateLimit-Remaining': number;
    'X-RateLimit-Reset': number; // Unix timestamp
  };

  // Different limits per service
  limits: {
    'core-api': {
      anonymous: 100; // requests per hour
      authenticated: 1000;
      premium: 10000;
    };
    'ai-service': {
      anonymous: 10;
      authenticated: 100;
      premium: 1000;
    };
  };
}
```

## Testing Contracts

### Contract Testing

```typescript
interface ContractTest {
  // Provider test (Core API)
  provider: {
    name: 'Core API';
    endpoints: EndpointDefinition[];
    mockData: MockDataSet;
  };

  // Consumer test (Web Frontend)
  consumer: {
    name: 'Web Frontend';
    expectations: ExpectedResponse[];
    scenarios: TestScenario[];
  };

  // Contract validation
  validation: {
    schemaValidation: boolean;
    responseTimeValidation: boolean;
    errorHandlingValidation: boolean;
  };
}
```

## Monitoring and Observability

### Health Check Contract

```typescript
// GET /health
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: ServiceHealth;
    cache?: ServiceHealth;
    aiProvider?: ServiceHealth;
  };
}

interface ServiceHealth {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}
```

## Relationships
- **Parent Nodes:** [elements/architecture/modern_design.md] - defines - Service architecture
- **Child Nodes:** None
- **Related Nodes:**
  - [elements/architecture/monorepo_structure.md] - implements - Service structure
  - [elements/architecture/ai_service_architecture.md] - contracts - AI service APIs
  - [packages/api-client] - implements - Client implementation of contracts

## Navigation Guidance
- **Access Context**: Reference when implementing service endpoints or client integrations
- **Common Next Steps**: Implement API clients or service endpoints based on contracts
- **Related Tasks**: API development, client development, integration testing
- **Update Patterns**: Update when API changes are needed or new endpoints are added

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial service contracts and boundaries documentation