# AI Service Architecture

## Purpose
Defines the architecture of the separate AI service using Mastra.ai framework with Hono, implementing A2A, MCP, and AG-UI protocols for AI orchestration.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Evolving

## Overview

The AI Service is a standalone microservice that handles all AI and LLM-related functionality for Pliers. It's built using the Mastra.ai framework on top of Hono, providing a clean separation between core business logic and AI capabilities. This architecture enables protocol abstraction, allowing alternative AI implementations to replace or augment the default service.

## Mastra.ai Framework Integration

### Why Mastra.ai

Mastra.ai provides a comprehensive framework for building AI applications with:
- **Multi-Provider Support** - Unified interface for OpenAI, Anthropic, Google, and more
- **Protocol Standards** - Built-in support for A2A, MCP, and AG-UI protocols
- **Agent Orchestration** - Tools for managing multi-agent workflows
- **Context Management** - Sophisticated context building and caching
- **Observability** - Built-in monitoring and debugging for AI operations
- **Cost Management** - Usage tracking and optimization features

### Framework Architecture

```typescript
// Mastra.ai service structure
import { Mastra } from '@mastra/core';
import { Hono } from 'hono';

interface AIServiceArchitecture {
  // Core Mastra instance
  mastra: {
    providers: ['openai', 'anthropic', 'local'];
    protocols: ['A2A', 'MCP', 'AG-UI'];
    agents: Map<string, Agent>;
    workflows: Map<string, Workflow>;
  };

  // Hono API wrapper
  api: {
    routes: {
      assist: '/ai/v1/assist';      // AI assistance endpoints
      analyze: '/ai/v1/analyze';    // Data analysis endpoints
      generate: '/ai/v1/generate';  // Content generation endpoints
      agents: '/ai/v1/agents';      // Agent management
      protocols: '/ai/v1/protocols'; // Protocol-specific endpoints
    };
  };

  // Service capabilities
  capabilities: {
    formDesign: boolean;
    workflowAutomation: boolean;
    dataAnalysis: boolean;
    pluginGeneration: boolean;
    semanticSearch: boolean;
  };
}
```

## Protocol Implementations

### A2A (Agent-to-Agent) Protocol

The A2A protocol enables communication between AI agents, both within Pliers and with external systems.

```typescript
interface A2AProtocol {
  // Agent registration
  registerAgent(agent: AgentDefinition): Promise<AgentId>;

  // Message passing
  sendMessage(from: AgentId, to: AgentId, message: AgentMessage): Promise<Response>;

  // Capability discovery
  discoverCapabilities(agentId: AgentId): Promise<Capability[]>;

  // Coordination
  coordinateTask(task: Task, agents: AgentId[]): Promise<TaskResult>;
}

// A2A message structure
interface AgentMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  protocol: 'A2A';
  sender: AgentId;
  receiver: AgentId;
  content: {
    intent: string;
    parameters: Record<string, unknown>;
    context: AgentContext;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
    priority: 'low' | 'normal' | 'high';
  };
}
```

### MCP (Model Context Protocol)

MCP provides standardized context management for LLM interactions.

```typescript
interface MCPProtocol {
  // Context building
  buildContext(request: ContextRequest): Promise<ModelContext>;

  // Context caching
  cacheContext(contextId: string, context: ModelContext): Promise<void>;

  // Context retrieval
  retrieveContext(contextId: string): Promise<ModelContext | null>;

  // Context updates
  updateContext(contextId: string, updates: Partial<ModelContext>): Promise<void>;
}

// MCP context structure
interface ModelContext {
  id: string;
  protocol: 'MCP';
  scope: {
    forms: FormDefinition[];
    submissions: FormSubmission[];
    workflows: WorkflowState[];
    user: UserContext;
    system: SystemContext;
  };
  history: ConversationHistory;
  constraints: {
    maxTokens: number;
    temperature: number;
    model: string;
  };
  metadata: {
    created: Date;
    expires: Date;
    usage: TokenUsage;
  };
}
```

### AG-UI (Agent-UI) Protocol

AG-UI defines how AI agents interact with user interfaces.

```typescript
interface AGUIProtocol {
  // UI component generation
  generateComponent(spec: ComponentSpec): Promise<UIComponent>;

  // User interaction handling
  handleInteraction(interaction: UserInteraction): Promise<AgentResponse>;

  // UI state management
  updateUIState(state: UIState): Promise<void>;

  // Feedback processing
  processFeedback(feedback: UserFeedback): Promise<void>;
}

// AG-UI interaction structure
interface UserInteraction {
  id: string;
  protocol: 'AG-UI';
  type: 'input' | 'selection' | 'action' | 'query';
  source: {
    componentId: string;
    userId: string;
    sessionId: string;
  };
  data: {
    input?: string;
    selection?: unknown;
    action?: string;
    parameters?: Record<string, unknown>;
  };
  context: UIContext;
  timestamp: Date;
}
```

## Core AI Services

### Form Design Assistant

```typescript
interface FormDesignAssistant {
  // Generate form from description
  generateForm(description: string, context: FormContext): Promise<FormDefinition>;

  // Optimize existing form
  optimizeForm(form: FormDefinition): Promise<FormOptimization>;

  // Suggest fields based on context
  suggestFields(partialForm: Partial<FormDefinition>): Promise<FieldSuggestion[]>;

  // Validate form usability
  validateUsability(form: FormDefinition): Promise<UsabilityReport>;

  // Generate help text and labels
  generateContent(form: FormDefinition): Promise<FormContent>;
}
```

### Workflow Automation Engine

```typescript
interface WorkflowAutomation {
  // Analyze workflow for automation opportunities
  analyzeWorkflow(workflow: WorkflowDefinition): Promise<AutomationOpportunities>;

  // Generate automation rules
  generateRules(workflow: WorkflowDefinition): Promise<AutomationRule[]>;

  // Predict next status
  predictNextStatus(submission: FormSubmission): Promise<StatusPrediction>;

  // Handle exceptions
  handleException(exception: WorkflowException): Promise<ExceptionResolution>;

  // Optimize workflow paths
  optimizePaths(workflow: WorkflowDefinition): Promise<OptimizedWorkflow>;
}
```

### Data Analysis Service

```typescript
interface DataAnalysisService {
  // Analyze submission patterns
  analyzePatterns(submissions: FormSubmission[]): Promise<PatternAnalysis>;

  // Detect anomalies
  detectAnomalies(data: AnalysisData): Promise<Anomaly[]>;

  // Generate insights
  generateInsights(query: AnalysisQuery): Promise<Insight[]>;

  // Predict trends
  predictTrends(historicalData: TimeSeriesData): Promise<TrendPrediction>;

  // Generate reports
  generateReport(spec: ReportSpec): Promise<Report>;
}
```

## Service Communication

### API Endpoints

```typescript
// Hono route definitions for AI service
const aiService = new Hono();

// Form assistance endpoints
aiService.post('/ai/v1/assist/form/generate', async (c) => {
  const { description, context } = await c.req.json();
  const form = await formAssistant.generateForm(description, context);
  return c.json(form);
});

aiService.post('/ai/v1/assist/form/optimize', async (c) => {
  const form = await c.req.json();
  const optimization = await formAssistant.optimizeForm(form);
  return c.json(optimization);
});

// Analysis endpoints
aiService.post('/ai/v1/analyze/patterns', async (c) => {
  const { submissions } = await c.req.json();
  const patterns = await analysisService.analyzePatterns(submissions);
  return c.json(patterns);
});

// Protocol-specific endpoints
aiService.post('/ai/v1/protocols/a2a/message', async (c) => {
  const message = await c.req.json();
  const response = await a2aHandler.processMessage(message);
  return c.json(response);
});

aiService.post('/ai/v1/protocols/mcp/context', async (c) => {
  const request = await c.req.json();
  const context = await mcpHandler.buildContext(request);
  return c.json(context);
});

aiService.post('/ai/v1/protocols/ag-ui/interaction', async (c) => {
  const interaction = await c.req.json();
  const response = await aguiHandler.handleInteraction(interaction);
  return c.json(response);
});
```

### Event Integration

The AI service subscribes to events from the Core API service for proactive assistance.

```typescript
interface AIEventHandlers {
  // Form events
  'form.created': (event: FormCreatedEvent) => Promise<void>;
  'form.updated': (event: FormUpdatedEvent) => Promise<void>;

  // Submission events
  'submission.created': (event: SubmissionCreatedEvent) => Promise<void>;
  'submission.stuck': (event: SubmissionStuckEvent) => Promise<void>;

  // Workflow events
  'workflow.exception': (event: WorkflowExceptionEvent) => Promise<void>;
  'workflow.completed': (event: WorkflowCompletedEvent) => Promise<void>;
}
```

## Deployment and Scaling

### Container Configuration

```dockerfile
# ai-service.Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY dist ./dist

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start service
CMD ["node", "dist/index.js"]
```

### Scaling Strategy

```yaml
# docker-compose.yml excerpt
services:
  ai-service:
    build:
      context: ./apps/ai-service
      dockerfile: ../../infrastructure/docker/ai-service.Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## Security and Privacy

### API Security

```typescript
interface AISecurityConfig {
  // Authentication
  authentication: {
    type: 'JWT' | 'API_KEY';
    validation: (token: string) => Promise<boolean>;
  };

  // Rate limiting
  rateLimiting: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    costPerMinute: number;
  };

  // Input validation
  validation: {
    maxInputLength: number;
    sanitization: boolean;
    piiDetection: boolean;
  };

  // Output filtering
  filtering: {
    removePII: boolean;
    contentModeration: boolean;
    confidentialityCheck: boolean;
  };
}
```

### Data Privacy

```typescript
interface PrivacyControls {
  // Data anonymization
  anonymizeBeforeProcessing: boolean;

  // Context isolation
  isolateUserContexts: boolean;

  // Retention policies
  contextRetention: Duration;
  conversationRetention: Duration;

  // Audit logging
  logAllRequests: boolean;
  logSensitiveOperations: boolean;
}
```

## Monitoring and Observability

### Metrics Collection

```typescript
interface AIMetrics {
  // Performance metrics
  performance: {
    latency: Histogram;
    throughput: Counter;
    errorRate: Gauge;
  };

  // Usage metrics
  usage: {
    tokensConsumed: Counter;
    apiCalls: Counter;
    costTracking: Counter;
  };

  // Quality metrics
  quality: {
    accuracyScore: Gauge;
    userSatisfaction: Gauge;
    taskCompletionRate: Gauge;
  };

  // Protocol metrics
  protocols: {
    a2aMessages: Counter;
    mcpContextBuilds: Counter;
    aguiInteractions: Counter;
  };
}
```

## Alternative Implementations

The protocol abstraction allows for alternative AI service implementations:

### Direct OpenAI Integration
Organizations can implement a simpler service directly against OpenAI APIs.

### Self-Hosted Models
Deploy with local models using Ollama or similar frameworks.

### Custom Implementations
Build specialized AI services for specific domains or requirements.

## Relationships
- **Parent Nodes:** [elements/architecture/modern_design.md] - implements - Part of service architecture
- **Child Nodes:**
  - [elements/ai-integration/index.md] - details - AI service capabilities
  - [elements/ai-integration/protocols.md] - implements - Protocol specifications
- **Related Nodes:**
  - [decisions/mastra_ai_framework.md] - justifies - Framework selection rationale
  - [elements/architecture/service_boundaries.md] - defines - Service communication patterns

## Navigation Guidance
- **Access Context**: Reference when implementing AI service or understanding AI architecture
- **Common Next Steps**: Review protocol specifications or specific AI service implementations
- **Related Tasks**: AI service development, protocol implementation, integration patterns
- **Update Patterns**: Update when protocols evolve or new AI capabilities are added

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial AI service architecture with Mastra.ai framework and protocol definitions