# Cross-Cutting Concerns Index

## Purpose
This section documents patterns, strategies, and guidelines that apply across the entire CorticAI system, rather than being specific to individual components or layers.

## Classification
- **Domain:** Cross-Cutting
- **Stability:** Semi-Stable
- **Abstraction:** Structural
- **Confidence:** Established

## Content

Cross-cutting concerns are design aspects that affect multiple parts of the system and benefit from consistent treatment across the codebase. This index helps locate guidance on system-wide patterns.

## Topics

### Package and Distribution
- [Package Export Patterns](./package_export_patterns.md) - How CorticAI exports its APIs and how wrappers import from core
- [Wrapper Architecture Guide](./wrapper_architecture_guide.md) - Design patterns for creating wrapper integrations (MCP server, Mastra, REST, etc.)

### Architecture
- Integration patterns and dependencies
- API design guidelines
- Performance patterns

### Development
- Error handling strategies
- Logging and observability
- Testing approaches

## Relationships
- **Parent Nodes:** [architecture/index.md]
- **Child Nodes:**
  - [Package Export Patterns](./package_export_patterns.md) - NPM package export structure
  - [Wrapper Architecture Guide](./wrapper_architecture_guide.md) - Wrapper integration patterns
- **Related Nodes:**
  - [architecture/system_architecture.md] - references - System-wide architectural decisions
  - [decisions/adr_006_npm_centric_distribution.md] - implements - Distribution architecture decision
  - [decisions/decision_index.md] - implements - Architecture decisions affecting cross-cutting concerns

## Navigation Guidance
- **Access Context:** Use when seeking consistent patterns that apply across the system
- **Common Next Steps:** Review specific concern documents for detailed implementation guidance
- **Related Tasks:** Architecture reviews, refactoring, documentation consistency
- **Update Patterns:** Add new cross-cutting concerns as they emerge during development

## Metadata
- **Created:** 2025-10-20
- **Last Updated:** 2025-10-20
- **Updated By:** Claude
