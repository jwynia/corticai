# Data Models Index

## Purpose
Contains data structures, schemas, and relationship definitions that form the foundation of the Pliers data architecture.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Evolving

## Data Model Categories

### Core Schemas
- **[form_schema.md](form_schema.md)** - Complete form definition schema and validation patterns *(to be created)*
  - FormDefinition schema structure
  - Field definition patterns
  - Relationship modeling
  - Validation rule definitions

- **[submission_schema.md](submission_schema.md)** - Form submission data models and storage patterns *(to be created)*
  - Submission data structure
  - Audit trail schema
  - Version management
  - Relationship data storage

### Event Models
- **[event_schema.md](event_schema.md)** - Event sourcing data models and patterns *(to be created)*
  - Event structure and types
  - Event store schema
  - Aggregate definitions
  - Event replay patterns

- **[plugin_events.md](plugin_events.md)** - Plugin-specific event schemas and interfaces *(to be created)*
  - Plugin event contracts
  - Event filtering patterns
  - Priority and routing schemas
  - Plugin state management

### User and Security Models
- **[user_schema.md](user_schema.md)** - User management and authentication data models *(to be created)*
  - User account structure
  - Role and permission definitions
  - Authentication token schemas
  - Audit and activity logging

- **[security_models.md](security_models.md)** - Security-related data structures and patterns *(to be created)*
  - Access control definitions
  - Permission inheritance
  - Security audit schemas
  - Encryption and key management

### Query and Search Models
- **[query_schema.md](query_schema.md)** - Search query definitions and result structures *(to be created)*
  - Query definition schema
  - Filter and aggregation patterns
  - Result transformation models
  - Caching and optimization schemas

- **[search_indexes.md](search_indexes.md)** - Search indexing and optimization data models *(to be created)*
  - Index definition patterns
  - Full-text search schemas
  - Vector search models
  - Performance optimization structures

### AI and Enhancement Models
- **[ai_schemas.md](ai_schemas.md)** - AI service integration data models *(to be created)*
  - AI request/response schemas
  - Context and prompt management
  - AI-generated content models
  - Learning and adaptation schemas

- **[vector_models.md](vector_models.md)** - Vector search and semantic analysis models *(to be created)*
  - Embedding storage patterns
  - Similarity search schemas
  - Semantic relationship models
  - Vector index optimization

## Schema Design Principles

### Type Safety First
All schemas are defined using TypeScript and Zod for compile-time and runtime type safety.

```typescript
// Example pattern for all schemas
const BaseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().positive(),
  metadata: z.record(z.unknown()).optional()
});
```

### Extensibility
Schemas support extension through metadata fields and plugin-defined additional fields.

### Versioning
All major data structures include versioning support for schema evolution.

### Audit Trail
Core entities include audit information for compliance and debugging.

## Database Mapping Patterns

### PostgreSQL JSONB Strategy
Core entities stored in JSONB columns with generated columns for frequently queried fields.

```sql
-- Pattern for all major entities
CREATE TABLE entity_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL,

  -- Generated columns for performance
  name TEXT GENERATED ALWAYS AS (data->>'name') STORED,
  created_at TIMESTAMPTZ GENERATED ALWAYS AS ((data->>'createdAt')::TIMESTAMPTZ) STORED,

  -- Indexes
  CONSTRAINT entity_name_data_valid CHECK (jsonb_typeof(data) = 'object')
);

CREATE GIN INDEX idx_entity_name_data ON entity_name USING gin (data);
CREATE INDEX idx_entity_name_created_at ON entity_name (created_at);
```

### Relationship Patterns
Relationships stored as references with optional denormalization for performance.

### Event Sourcing Pattern
Events stored in immutable append-only log with projections for current state.

## Validation Patterns

### Runtime Validation
All external inputs validated using Zod schemas at runtime.

### Database Validation
Database constraints ensure data integrity at storage level.

### Business Logic Validation
Complex validation rules implemented in application layer with clear error messages.

## Migration Strategies

### Schema Evolution
Versioned schemas with backward compatibility support.

### Data Migration
Automated migration scripts for schema changes.

### Zero-Downtime Deployment
Blue-green deployment patterns for schema updates.

## Performance Considerations

### Indexing Strategy
Strategic indexing on JSONB fields for common query patterns.

### Denormalization
Selective denormalization for frequently accessed data.

### Caching Patterns
Multi-layer caching for schema definitions and query results.

### Query Optimization
Optimized query patterns for PostgreSQL JSONB operations.

## Security Patterns

### Data Protection
Encryption at rest and in transit for sensitive data.

### Access Control
Row-level security and field-level permissions.

### Audit Trail
Comprehensive audit logging for all data modifications.

### Input Sanitization
Protection against injection attacks and malicious input.

## Relationships
- **Parent Nodes:** [elements/index.md] - categorizes - Data models organized within elements
- **Child Nodes:** [Individual schema documents] - details - Specific data model implementations
- **Related Nodes:**
  - [elements/core-components/form_engine.md] - implements - Components use these data models
  - [elements/architecture/data_storage.md] - stores - Storage architecture implements these models
  - [planning/roadmap/overview.md] - schedules - Data model implementation prioritized in roadmap

## Navigation Guidance
- **Access Context**: Reference when implementing data persistence, validation, or API design
- **Common Next Steps**: Review specific schema documents or implementation planning
- **Related Tasks**: Database design, API development, validation implementation
- **Update Patterns**: Update when new data requirements emerge or schema changes are needed

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial data models index structure created with schema patterns