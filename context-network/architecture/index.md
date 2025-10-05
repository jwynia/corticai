# Architecture Documentation Index

## Purpose
Central navigation for all architectural documentation, decisions, and analysis.

## Core Architecture Documents

### System Architecture
- **[CorticAI Architecture](./corticai_architecture.md)** - Overall system design and principles
- **[Agent Architecture](./agent_architecture.md)** - Agent system design patterns
- **[Workflow Architecture](./workflow_architecture.md)** - Workflow orchestration design
- **[Component Map](./component_map.md)** - System components and relationships

### Storage Architecture
- **[Storage Layer](./storage-layer.md)** - Storage system design and patterns
- **[Dual-Role Storage Architecture](./dual-role-storage-architecture.md)** - Primary and semantic storage design

### Integration Architecture
- **[OpenRouter Integration](./openrouter_integration_discovery.md)** - LLM provider integration

### Specialized Systems
- **[Continuity Cortex](./continuity-cortex/)** - Memory consolidation architecture
- **[Initial Development](./initial-development/)** - Early architecture decisions

## Architecture Issues & Improvements

### 🚨 Critical Issues
- **[Testability Issues](./testability-issues.md)** - Why integration tests indicate architectural problems
  - Root cause: Business logic embedded in infrastructure
  - Impact: Requires database for testing, slow tests, brittle tests
  - Solution: Hexagonal architecture, dependency injection, layer separation
  - **Status**: Documented, refactoring task created
  - **Priority**: CRITICAL - Blocks proper unit testing

## Architecture Decision Records (ADRs)

> ADRs should be created in `../decisions/` directory with links here

**Planned ADRs**:
- [ ] ADR-001: Hexagonal Architecture for Storage Layer
- [ ] ADR-002: Dependency Injection Strategy
- [ ] ADR-003: Domain/Application/Infrastructure Layer Separation

## Quick Navigation

### By Concern
- **Testing**: See [testability-issues.md](./testability-issues.md) and [../processes/testing-strategy.md](../processes/testing-strategy.md)
- **Storage**: See [storage-layer.md](./storage-layer.md) and [dual-role-storage-architecture.md](./dual-role-storage-architecture.md)
- **Agents**: See [agent_architecture.md](./agent_architecture.md)
- **Integration**: See [openrouter_integration_discovery.md](./openrouter_integration_discovery.md)

### By Development Phase
- **Current Issues**: [testability-issues.md](./testability-issues.md)
- **In Progress**: Refactoring storage layer for testability
- **Completed**: Core architecture, storage layer, agent system

## Related Documentation
- **Process Documentation**: [../processes/index.md](../processes/index.md)
- **Technical Decisions**: [../decisions/index.md](../decisions/index.md)
- **Planning**: [../planning/index.md](../planning/index.md)

## Maintenance

**Last Updated**: 2025-10-05
**Next Review**: When architectural changes occur

### Update Triggers
- New architecture patterns introduced
- Architectural issues identified
- Major refactoring completed
- New ADRs created
