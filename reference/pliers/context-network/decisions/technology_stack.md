# Decision: Core Technology Stack Selection

## Status
Accepted

## Date
2025-09-20

## Context

Pliers v3 represents a complete rebuild of the forms and workflow management platform, moving away from the legacy EAV SQL Server + MongoDB hybrid architecture. The technology stack selection is critical as it will determine:

1. **Development Efficiency** - How quickly LLM agents can implement features
2. **Performance Characteristics** - System scalability and response times
3. **Maintenance Overhead** - Long-term maintenance and evolution costs
4. **Integration Capabilities** - Ability to integrate with modern tools and services
5. **AI Enhancement Potential** - Support for LLM and vector search capabilities

The previous iterations used:
- SQL Server with EAV model (performance issues, type safety problems)
- MongoDB for search (synchronization complexity, consistency issues)
- .NET backend (limited LLM agent familiarity, ecosystem constraints)

## Decision

**Selected Technology Stack:**
- **Database:** PostgreSQL 15+ with JSONB, vector extensions, and full-text search
- **Backend Runtime:** Node.js 18+ with TypeScript 5+
- **Schema Validation:** Zod for runtime type validation and schema generation
- **Event Processing:** EventStore or Apache Kafka for event sourcing
- **API Layer:** GraphQL with type generation from Zod schemas
- **Containerization:** Docker with multi-stage builds
- **Testing:** Jest + TestContainers for comprehensive testing

## Rationale

### Factors Considered
- **Type Safety** - Critical for LLM agent development and maintenance
- **Performance** - Must handle complex queries and large datasets efficiently
- **Ecosystem Maturity** - Strong tooling and community support required
- **LLM Agent Familiarity** - Technologies that LLM agents work well with
- **Modern Features** - Support for vector search, JSONB, real-time capabilities
- **Development Velocity** - Fast iteration and feature development
- **Operational Simplicity** - Reduced complexity compared to legacy hybrid approach

### Alternatives Considered

#### 1. **Continue with .NET + SQL Server + MongoDB**
- **Pros:**
  - Existing knowledge from legacy system
  - Proven scalability for enterprise workloads
  - Strong tooling and ecosystem
- **Cons:**
  - LLM agents less familiar with .NET ecosystem
  - Continued complexity of hybrid data storage
  - EAV model performance limitations
  - Licensing costs for SQL Server
- **Why rejected:** Perpetuates existing architectural problems and reduces LLM agent effectiveness

#### 2. **Python + Django + PostgreSQL**
- **Pros:**
  - Excellent AI/ML ecosystem integration
  - Strong PostgreSQL support
  - Good LLM agent familiarity
- **Cons:**
  - Performance limitations for high-throughput scenarios
  - Less mature for real-time features
  - Weaker type safety compared to TypeScript
- **Why rejected:** Type safety concerns and performance limitations

#### 3. **Go + PostgreSQL**
- **Pros:**
  - Excellent performance characteristics
  - Strong concurrency support
  - Good PostgreSQL ecosystem
- **Cons:**
  - Limited LLM agent familiarity
  - Smaller ecosystem for form/workflow features
  - More verbose for rapid development
- **Why rejected:** LLM agent productivity concerns and ecosystem limitations

#### 4. **Rust + PostgreSQL**
- **Pros:**
  - Maximum performance and memory safety
  - Growing ecosystem
  - Excellent type safety
- **Cons:**
  - Very limited LLM agent experience
  - Steep learning curve
  - Smaller ecosystem for business applications
- **Why rejected:** LLM agent capability limitations and development velocity concerns

### Decision Criteria

#### **Type Safety and Development Experience** (Weight: 30%)
- **TypeScript + Zod:** Excellent compile-time and runtime type safety
- **GraphQL:** Auto-generated types throughout the stack
- **Evaluation:** TypeScript provides the best balance of type safety and LLM agent familiarity

#### **Database Capabilities** (Weight: 25%)
- **PostgreSQL JSONB:** Flexible schema with strong query performance
- **Vector Extensions:** Native support for AI/semantic search
- **Full-text Search:** Eliminates need for separate search infrastructure
- **Evaluation:** PostgreSQL provides all required capabilities in a single system

#### **LLM Agent Productivity** (Weight: 20%)
- **JavaScript/TypeScript:** High LLM agent familiarity and effectiveness
- **Node.js Ecosystem:** Extensive libraries and examples for LLM training data
- **Documentation Quality:** Excellent documentation and community resources
- **Evaluation:** Node.js/TypeScript ecosystem maximizes agent productivity

#### **Performance and Scalability** (Weight: 15%)
- **PostgreSQL:** Proven performance for complex queries and large datasets
- **Node.js:** Good performance for I/O intensive applications
- **Event Sourcing:** Supports horizontal scaling patterns
- **Evaluation:** Sufficient performance with better architecture than legacy system

#### **Ecosystem and Integration** (Weight: 10%)
- **NPM Ecosystem:** Largest package ecosystem for rapid development
- **API Integration:** Excellent support for external service integration
- **Tooling:** Mature development, testing, and deployment tools
- **Evaluation:** Best-in-class ecosystem support for business applications

## Consequences

### Positive
- **Unified Data Storage:** Single PostgreSQL instance replaces SQL Server + MongoDB complexity
- **End-to-End Type Safety:** TypeScript + Zod + GraphQL provides compile-time to runtime type safety
- **LLM Agent Effectiveness:** Technology choices maximize agent productivity and code quality
- **Modern Capabilities:** Native support for vector search, real-time features, and AI integration
- **Reduced Operational Complexity:** Fewer moving parts and technologies to manage
- **Performance Improvement:** JSONB queries significantly faster than EAV model
- **Cost Reduction:** Open source stack reduces licensing costs

### Negative
- **Node.js Performance Ceiling:** May require optimization for CPU-intensive operations
  - *Mitigation:* Use worker threads or external services for heavy computation
- **PostgreSQL Single Point of Failure:** Database becomes critical component
  - *Mitigation:* Implement high availability with read replicas and failover
- **JavaScript Ecosystem Volatility:** Rapid changes in tools and libraries
  - *Mitigation:* Choose mature, stable libraries and maintain conservative update schedule

### Risks
- **PostgreSQL Vector Extension Maturity:** Relatively new technology for production use
  - *Mitigation:* Fallback to dedicated vector database if needed, extensive testing
- **LLM Agent Learning Curve:** Agents may need time to adapt to specific patterns
  - *Mitigation:* Comprehensive documentation and example patterns in context network
- **Event Sourcing Complexity:** More complex than simple CRUD operations
  - *Mitigation:* Start with simple event patterns, evolve complexity gradually

## Implementation

### Required Changes
- **Development Environment Setup:** Node.js, TypeScript, PostgreSQL development stack
- **Database Schema Design:** PostgreSQL schema with JSONB columns and indexes
- **API Framework Setup:** GraphQL server with type generation pipeline
- **Event Processing Infrastructure:** EventStore or Kafka setup and configuration
- **Testing Infrastructure:** Jest + TestContainers setup for comprehensive testing
- **Deployment Pipeline:** Docker containerization and CI/CD pipeline

### Dependencies
- **PostgreSQL 15+** with vector extensions (pgvector)
- **Node.js 18+** LTS version for stability
- **TypeScript 5+** for latest language features
- **Docker** for containerization and testing
- **Cloud Infrastructure** supporting PostgreSQL and container orchestration

### Timeline
- **Phase 1 (Week 1-2):** Development environment and basic infrastructure setup
- **Phase 2 (Week 3-4):** Core database schema and API framework implementation
- **Phase 3 (Week 5-6):** Event processing and plugin infrastructure
- **Phase 4 (Week 7-8):** Testing infrastructure and CI/CD pipeline completion

## Review and Validation

### Success Criteria
- **Agent Productivity:** LLM agents can effectively implement features without extensive trial-and-error
- **Performance Benchmarks:** Query performance exceeds legacy EAV system by 10x minimum
- **Type Safety Validation:** Zero runtime type errors in production
- **Development Velocity:** Feature implementation 3x faster than legacy system development
- **Operational Simplicity:** Single database system with 50% reduction in operational overhead

### Review Schedule
- **3-Month Review:** Assess agent productivity and development velocity
- **6-Month Review:** Evaluate performance benchmarks and operational complexity
- **12-Month Review:** Comprehensive assessment of technology choices and long-term viability

### Validation Metrics
- **Code Quality:** Static analysis scores, test coverage, bug density
- **Performance:** Query response times, throughput, resource utilization
- **Developer Experience:** Agent task completion rates, error rates, development velocity
- **Operational Metrics:** Uptime, deployment frequency, incident resolution time

## Related Decisions
- **[data_architecture.md]** - Depends on PostgreSQL JSONB decisions
- **[ai_integration_tech.md]** - Builds on vector extension capabilities
- **[plugin_architecture.md]** - Leverages event sourcing infrastructure
- **[agent_development_approach.md]** - Optimized for TypeScript/Node.js agent capabilities

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning
- **Reviewers:** Product Owner, Technical Lead

## Change History
- 2025-09-20: Initial technology stack decision with comprehensive analysis and rationale