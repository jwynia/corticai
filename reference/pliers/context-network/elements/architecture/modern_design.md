# Modern Architecture Design

## Purpose
Defines the modern technical architecture for Pliers v3, leveraging contemporary technologies and lessons learned from legacy iterations.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Evolving

## Architecture Principles

### Design Philosophy
1. **Single Source of Truth**: PostgreSQL with JSONB eliminates complex data synchronization
2. **Type Safety First**: TypeScript + Zod schemas ensure compile-time and runtime type safety
3. **Event-Driven Core**: All system actions flow through an event stream for observability and plugin processing
4. **AI-Native Design**: LLM integration built into core workflows, not bolted on
5. **Agent-Friendly**: Architecture optimized for LLM agent understanding and implementation

### Technology Foundation

#### Service Architecture
- **Deployment Model**: Microservices in monorepo structure
- **Core API Service**: Hono framework on Node.js with TypeScript
- **AI Service**: Mastra.ai/Hono for AI orchestration (A2A, MCP, AG-UI protocols)
- **Frontend**: React client-only SPA with TypeScript
- **Infrastructure**: Docker Compose for unified deployment

#### Core Stack
- **Database**: PostgreSQL 15+ with JSONB, vector extensions, and full-text search
- **Backend Runtime**: Node.js 18+ with TypeScript
- **API Framework**: Hono for lightweight, high-performance REST APIs
- **Schema Validation**: Zod for runtime type validation and schema generation
- **Event Processing**: Event streaming (EventStore or Apache Kafka)
- **AI Protocols**: A2A (Agent-to-Agent), MCP (Model Context Protocol), AG-UI (Agent-UI)

#### Supporting Technologies
- **Monorepo Management**: Turborepo or Nx for workspace management
- **Containerization**: Docker with multi-stage builds
- **Testing**: Jest + TestContainers for integration testing
- **API Documentation**: OpenAPI/Swagger generation from Hono routes
- **Monitoring**: OpenTelemetry with structured logging
- **Development**: Volta for Node version management, ESLint + Prettier

## Service Architecture Overview

### Service Separation Strategy

The Pliers architecture implements a clean separation of concerns through three distinct services, enabling flexibility and replaceability while maintaining system cohesion.

#### 1. Core API Service (apps/api)
**Responsibilities:**
- Form definition management and validation
- Form submission processing and storage
- Workflow and status management
- Event processing and plugin orchestration
- Database operations with PostgreSQL
- RESTful API endpoints for all core functionality

**Technology:** Hono framework on Node.js
**Communication:** REST API, WebSocket for real-time updates
**Scaling:** Horizontally scalable, stateless design

#### 2. AI Service (apps/ai-service)
**Responsibilities:**
- LLM integration and orchestration
- A2A (Agent-to-Agent) protocol implementation
- MCP (Model Context Protocol) support
- AG-UI (Agent-UI) interaction handling
- Form design assistance and optimization
- Workflow automation intelligence
- Natural language processing for queries

**Technology:** Mastra.ai framework with Hono
**Communication:** REST API, event streams
**Protocol Abstraction:** Allows alternative AI implementations

#### 3. Frontend Application (apps/web)
**Responsibilities:**
- User interface for form creation and management
- Form submission and workflow visualization
- Dashboard and reporting interfaces
- Real-time updates via WebSocket
- Progressive Web App capabilities

**Technology:** React with TypeScript, Tailwind CSS
**Architecture:** Client-only SPA (no SSR)
**Replaceability:** Can be swapped for native mobile or alternative frameworks

### Service Communication Patterns

```typescript
// Service boundaries and contracts
interface ServiceArchitecture {
  coreAPI: {
    baseUrl: string;
    endpoints: {
      forms: '/api/v1/forms';
      submissions: '/api/v1/submissions';
      workflows: '/api/v1/workflows';
      events: '/api/v1/events';
    };
  };

  aiService: {
    baseUrl: string;
    endpoints: {
      assist: '/ai/v1/assist';
      analyze: '/ai/v1/analyze';
      generate: '/ai/v1/generate';
    };
    protocols: ['A2A', 'MCP', 'AG-UI'];
  };

  communication: {
    sync: 'REST';
    async: 'EventStream';
    realtime: 'WebSocket';
  };
}
```

### Monorepo Structure

```
pliers/
├── apps/
│   ├── api/                 # Core API Service
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── ai-service/          # AI Service
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── web/                 # React Frontend
│       ├── src/
│       ├── tests/
│       └── package.json
├── packages/
│   ├── shared/              # Shared types and utilities
│   │   ├── src/
│   │   └── package.json
│   ├── api-client/          # TypeScript API client
│   │   ├── src/
│   │   └── package.json
│   └── ai-client/           # AI service client
│       ├── src/
│       └── package.json
├── infrastructure/
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── ai-service.Dockerfile
│   │   └── web.Dockerfile
│   └── docker-compose.yml
├── context-network/         # Documentation
└── turbo.json              # Turborepo configuration
```

## Core Architecture Components

### 1. Form Definition Engine

#### Schema Management
```typescript
// Zod-based form definition schema
const FormDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.number(),
  fields: z.array(FieldDefinitionSchema),
  relationships: z.array(RelationshipSchema),
  statusDefinitions: z.array(StatusDefinitionSchema),
  metadata: z.record(z.unknown())
});
```

#### Capabilities
- **Dynamic Field Types**: Built-in and custom field type definitions
- **Schema Evolution**: Versioned schemas with migration support
- **Relationship Modeling**: Parent-child, many-to-many, and conditional relationships
- **Validation Rules**: Complex validation logic with custom validators
- **AI Enhancement**: LLM-assisted form design and field suggestions

### 2. Data Storage Architecture

#### PostgreSQL JSONB Strategy
- **Form Submissions Table**: JSONB storage with generated columns for common queries
- **Form Definitions Table**: Versioned schema storage with JSON validation
- **Audit Trail**: Event sourcing pattern for all data changes
- **Indexes**: GIN indexes on JSONB fields, partial indexes for performance

#### Schema Design
```sql
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_definition_id UUID NOT NULL,
  form_version INTEGER NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Generated columns for common queries
  title TEXT GENERATED ALWAYS AS (data->>'title') STORED,
  priority INTEGER GENERATED ALWAYS AS ((data->>'priority')::INTEGER) STORED
);
```

#### Vector Search Integration
- **Embedding Storage**: Vector representations of form content for AI search
- **Similarity Matching**: Find related forms and suggestions
- **Content Discovery**: AI-powered form template recommendations

### 3. Event Processing System

#### Event Stream Architecture
- **Event Types**: FormCreated, FormUpdated, FormDeleted, StatusChanged, RelationshipAdded
- **Event Store**: Immutable event log with replay capabilities
- **Event Handlers**: Plugin system subscribing to specific event patterns
- **Saga Pattern**: Long-running workflow coordination

#### Event Schema
```typescript
const BaseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  aggregateId: z.string().uuid(),
  aggregateType: z.enum(['FormSubmission', 'FormDefinition']),
  version: z.number(),
  timestamp: z.date(),
  metadata: z.record(z.unknown())
});
```

### 4. Plugin System Architecture

#### Plugin Discovery and Management
- **Plugin Registry**: Centralized registration with dependency management
- **Priority System**: Specificity-based ordering with explicit priorities
- **Lifecycle Management**: Install, configure, enable, disable, uninstall
- **Isolation**: Separate execution contexts with defined interfaces

#### Plugin Interface
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  dependencies: string[];
  eventHandlers: EventHandler[];
  priority: {
    specificity: string[]; // ['formType:specific-form'] or ['global']
    order: 'first' | 'last' | number;
  };
}
```

#### AI-Enhanced Plugin Development
- **Plugin Generation**: LLM assistance for common plugin patterns
- **Code Review**: AI analysis of plugin code for best practices
- **Testing**: Automated test generation for plugin validation

### 5. Search and Query Engine

#### Query Definition System
- **Query Forms**: Search queries defined as form submissions
- **Query Types**: Simple filters, complex aggregations, dashboard queries, ETL pipelines
- **Caching**: Intelligent query result caching with invalidation
- **Real-time**: Live query updates via WebSocket subscriptions

#### Advanced Search Capabilities
- **Full-Text Search**: PostgreSQL's built-in full-text search
- **Vector Search**: Semantic similarity search using embeddings
- **Faceted Search**: Dynamic facet generation from form field definitions
- **AI Query Assistant**: Natural language to query translation

### 6. AI Integration Layer

#### Core AI Services
- **Form Design Assistant**: LLM-powered form creation and optimization
- **Data Analysis**: Automated insights and pattern recognition
- **Workflow Automation**: Intelligent routing and decision making
- **Content Generation**: Auto-generated descriptions, labels, and help text

#### AI Architecture
```typescript
interface AIService {
  generateForm(description: string): Promise<FormDefinition>;
  analyzeData(formSubmissions: FormSubmission[]): Promise<Insights>;
  suggestWorkflow(formType: string, context: any): Promise<WorkflowSuggestion>;
  optimizeQuery(query: SearchQuery): Promise<OptimizedQuery>;
}
```

## System Integration Patterns

### API Design
- **GraphQL Schema**: Auto-generated from Zod schemas
- **Type Safety**: End-to-end type safety from database to client
- **Real-time**: GraphQL subscriptions for live updates
- **Batch Operations**: Efficient bulk operations with proper event handling

### Authentication and Authorization
- **JWT Tokens**: Stateless authentication with refresh token rotation
- **Role-Based Access**: Hierarchical permissions tied to form definitions
- **Field-Level Security**: Per-field read/write permissions
- **Audit Trail**: Complete action logging for compliance

### Monitoring and Observability
- **Structured Logging**: JSON logs with correlation IDs
- **Metrics**: Business and technical metrics with custom dashboards
- **Tracing**: Distributed tracing for complex workflows
- **Health Checks**: Comprehensive health monitoring

## Performance Considerations

### Database Optimization
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: EXPLAIN analysis and index tuning
- **Partitioning**: Time-based partitioning for large datasets
- **Read Replicas**: Separate read workloads from writes

### Caching Strategy
- **Application Cache**: In-memory caching for form definitions
- **Query Cache**: Redis-based caching for complex queries
- **CDN**: Static asset delivery optimization
- **Edge Caching**: Geographic distribution for global deployments

### Scalability Design
- **Horizontal Scaling**: Stateless application design
- **Event Processing**: Distributed event processing capabilities
- **Database Sharding**: Strategy for massive scale (future consideration)
- **Microservices Evolution**: Modular design enabling service extraction

## Development Workflow

### Code Organization
- **Domain-Driven Design**: Clear bounded contexts and aggregates
- **Clean Architecture**: Dependency inversion and testability
- **Monorepo**: Unified codebase with workspace management
- **Documentation**: Living documentation generated from code

### Testing Strategy
- **Unit Tests**: High coverage with Jest and test utilities
- **Integration Tests**: TestContainers for database integration
- **E2E Tests**: Playwright for full workflow testing
- **Performance Tests**: Load testing with realistic data volumes

### Deployment Pipeline
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Infrastructure as Code**: Terraform for reproducible deployments
- **Blue-Green Deployment**: Zero-downtime deployment strategy
- **Rollback Strategy**: Quick rollback capabilities with database migrations

## Relationships
- **Parent Nodes:**
  - [foundation/legacy_analysis.md] - evolves_from - Modern design based on legacy lessons
  - [foundation/project_definition.md] - implements - Architecture implements project objectives
- **Child Nodes:**
  - [elements/architecture/data_storage.md] - details - Specific database design patterns
  - [elements/architecture/plugin_system.md] - details - Plugin architecture specifics
  - [elements/architecture/ai_integration.md] - details - AI service integration patterns
- **Related Nodes:**
  - [decisions/technology_choices.md] - justifies - Technology selections and rationale
  - [planning/roadmap.md] - guides - Development phases and priorities

## Navigation Guidance
- **Access Context**: Reference when making implementation decisions or understanding system design
- **Common Next Steps**: Review specific component architectures or technology decision records
- **Related Tasks**: System design, technology selection, component implementation planning
- **Update Patterns**: Update when architectural decisions change or new patterns emerge

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial modern architecture design based on legacy analysis and project requirements