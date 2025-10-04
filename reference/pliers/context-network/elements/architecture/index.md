# Architecture Index

## Purpose
Contains technical architecture documents and design specifications for the Pliers system.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Evolving

## Architecture Documents

### Core Design
- **[modern_design.md](modern_design.md)** - Overall system architecture and design principles
  - Technology stack and foundation
  - Component interaction patterns
  - AI integration strategy
  - Performance and scalability considerations

### Detailed Components
- **[data_storage.md](data_storage.md)** - Database architecture and storage patterns *(to be created)*
  - PostgreSQL JSONB design
  - Schema evolution strategies
  - Vector search integration
  - Performance optimization

- **[plugin_system.md](plugin_system.md)** - Plugin architecture and management *(to be created)*
  - Plugin discovery and lifecycle
  - Priority and specificity system
  - Isolation and security patterns
  - AI-enhanced plugin development

- **[ai_integration.md](ai_integration.md)** - AI service integration patterns *(to be created)*
  - LLM service architecture
  - Form design assistance
  - Workflow automation
  - Data analysis capabilities

- **[event_system.md](event_system.md)** - Event processing and streaming design *(to be created)*
  - Event sourcing patterns
  - Stream processing architecture
  - Plugin event handling
  - Audit and replay capabilities

### Cross-Cutting Concerns
- **API Design** - GraphQL schema and type generation
- **Security Architecture** - Authentication, authorization, and data protection
- **Monitoring Architecture** - Observability, logging, and performance monitoring
- **Deployment Architecture** - Containerization, orchestration, and CI/CD

## Architecture Principles Summary

1. **Single Source of Truth**: PostgreSQL with JSONB eliminates data synchronization complexity
2. **Type Safety First**: End-to-end type safety with TypeScript and Zod
3. **Event-Driven Core**: All system actions flow through event streams
4. **AI-Native Design**: LLM integration built into core workflows
5. **Agent-Friendly**: Optimized for LLM agent development and maintenance

## Key Architectural Decisions

### Technology Choices
- **Database**: PostgreSQL 15+ with JSONB, vector search, full-text search
- **Backend**: Node.js with TypeScript for strong typing and ecosystem
- **Validation**: Zod for runtime type validation and schema generation
- **Events**: Event streaming for plugin processing and audit trails
- **API**: GraphQL with auto-generated schemas from Zod definitions

### Design Patterns
- **Domain-Driven Design**: Clear bounded contexts and aggregates
- **Event Sourcing**: Immutable event log with replay capabilities
- **CQRS**: Separate read and write models for optimization
- **Plugin Architecture**: Extensible event-driven plugin system
- **Clean Architecture**: Dependency inversion and testability

## Relationships
- **Parent Nodes:** [elements/index.md] - categorizes - Architecture documents organized within elements
- **Child Nodes:** [Individual architecture documents] - details - Specific architectural components
- **Related Nodes:**
  - [foundation/legacy_analysis.md] - informs - Architecture informed by legacy lessons
  - [decisions/technology_choices.md] - documents - Technology selection rationale
  - [planning/roadmap/overview.md] - implements - Architecture supports development roadmap

## Navigation Guidance
- **Access Context**: Entry point for understanding technical architecture and design decisions
- **Common Next Steps**: Review specific component architectures or implementation planning documents
- **Related Tasks**: System design, technology evaluation, component specification
- **Update Patterns**: Update when architectural decisions change or new patterns are established

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial architecture index with modern design document