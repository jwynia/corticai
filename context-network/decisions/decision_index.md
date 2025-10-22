# Architecture Decision Records

## Purpose
This document provides an index of all Architecture Decision Records (ADRs) for the project, organized by status, domain, and chronology.

## Classification
- **Domain:** Decision
- **Stability:** Dynamic
- **Abstraction:** Structural
- **Confidence:** Established

## Content

### What is an Architecture Decision Record?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. Each ADR describes:

- The architectural decision that was made
- The context and problem statement that motivated the decision
- The decision's consequences and trade-offs
- Alternatives that were considered
- The current status of the decision

ADRs are immutable once accepted - they are not updated to reflect new decisions, but may be marked as "Superseded" by newer ADRs.

### How to Use This Index

This index organizes ADRs in multiple ways to help you find relevant decisions:

1. **By Status**: Find current, proposed, or superseded decisions
2. **By Domain**: Find decisions related to specific areas of the system
3. **By Chronology**: See the evolution of decisions over time
4. **By Component**: Find decisions affecting specific components

### Decision Status Definitions

- **Proposed**: A decision that has been suggested but not yet accepted
- **Accepted**: A decision that has been accepted and is currently in effect
- **Deprecated**: A decision that is no longer recommended but may still be in effect
- **Superseded**: A decision that has been replaced by a newer decision

### ADRs by Status

#### Proposed
- *None yet*

#### Accepted
- [ADR-001: Workflow Data Passing Strategy](./adr_001_workflow_data_passing_strategy.md) - Defines how data flows between workflow steps
- [ADR-002: Kuzu for Graph Storage](./adr_002_kuzu_graph_database.md) - Use Kuzu embedded graph database for relationship storage
- [ADR-003: DuckDB for Analytics](./adr_003_duckdb_analytics.md) - Use DuckDB for analytics and materialized views
- [ADR-004: Three-Tier Memory Architecture](./adr_004_memory_architecture.md) - Implement working/semantic/episodic memory tiers
- [ADR-005: Progressive Loading System](./adr-005-progressive-loading-system.md) - Implement 5-level depth-based progressive entity loading
- [ADR-006: NPM-Centric Distribution Architecture](./adr_006_npm_centric_distribution.md) - NPM package as core with thin wrapper integrations

#### Deprecated
- *None yet*

#### Superseded
- *None yet*

### ADRs by Domain

#### Foundation
- [ADR-004: Three-Tier Memory Architecture](./adr_004_memory_architecture.md)

#### Architecture
- [ADR-001: Workflow Data Passing Strategy](./adr_001_workflow_data_passing_strategy.md)
- [ADR-004: Three-Tier Memory Architecture](./adr_004_memory_architecture.md)
- [ADR-005: Progressive Loading System](./adr-005-progressive-loading-system.md)
- [ADR-006: NPM-Centric Distribution Architecture](./adr_006_npm_centric_distribution.md)

#### Technology
- [ADR-002: Kuzu for Graph Storage](./adr_002_kuzu_graph_database.md)
- [ADR-003: DuckDB for Analytics](./adr_003_duckdb_analytics.md)

#### Process
- *None yet*

#### Security
- *None yet*

#### Performance
- [ADR-003: DuckDB for Analytics](./adr_003_duckdb_analytics.md) - Analytics performance optimization
- [ADR-004: Three-Tier Memory Architecture](./adr_004_memory_architecture.md) - Memory management and performance
- [ADR-005: Progressive Loading System](./adr-005-progressive-loading-system.md) - Memory-efficient entity loading

### ADRs by Chronology

#### 2025
- June: [ADR-001: Workflow Data Passing Strategy](./adr_001_workflow_data_passing_strategy.md)
- August 28: [ADR-002: Kuzu for Graph Storage](./adr_002_kuzu_graph_database.md)
- August 28: [ADR-003: DuckDB for Analytics](./adr_003_duckdb_analytics.md)
- August 28: [ADR-004: Three-Tier Memory Architecture](./adr_004_memory_architecture.md)
- September 24: [ADR-005: Progressive Loading System](./adr-005-progressive-loading-system.md)
- October 20: [ADR-006: NPM-Centric Distribution Architecture](./adr_006_npm_centric_distribution.md)

### ADRs by Component

#### Storage Layer
- [ADR-002: Kuzu for Graph Storage](./adr_002_kuzu_graph_database.md)
- [ADR-003: DuckDB for Analytics](./adr_003_duckdb_analytics.md)
- [ADR-004: Three-Tier Memory Architecture](./adr_004_memory_architecture.md)

#### Query Interface Layer
- [ADR-005: Progressive Loading System](./adr-005-progressive-loading-system.md)

#### Workflow Engine
- [ADR-001: Workflow Data Passing Strategy](./adr_001_workflow_data_passing_strategy.md)

#### Distribution & Integration
- [ADR-006: NPM-Centric Distribution Architecture](./adr_006_npm_centric_distribution.md)

### Creating New ADRs

To create a new ADR:

1. Copy the template from `meta/templates/adr_template.md`
2. Name the file `adr_NNN_title_with_underscores.md` where NNN is the next available number
3. Fill in all sections of the template
4. Add the ADR to this index in all relevant sections
5. Submit the ADR for review

### Changing Decision Status

When a decision's status changes:

1. Update the ADR's status field
2. Move the ADR in this index to the appropriate status section
3. If superseded, add a reference to the superseding ADR
4. If superseding, add a reference to the superseded ADR

## Relationships
- **Parent Nodes:** None
- **Child Nodes:** 
  - [All individual ADRs] - contains - Individual decision records
- **Related Nodes:** 
  - [architecture/system_architecture.md] - justifies - Architectural decisions shape the system architecture
  - [evolution/refactoring_plans.md] - motivates - Decisions may drive refactoring plans
  - [meta/templates/adr_template.md] - uses - Template for creating new ADRs

## Navigation Guidance
- **Access Context:** Use this document when needing to understand key decisions that have shaped the system
- **Common Next Steps:** After reviewing this index, typically explore specific ADRs of interest
- **Related Tasks:** Architecture review, onboarding new team members, planning system changes
- **Update Patterns:** This document should be updated whenever a new ADR is added or an existing ADR's status changes

## Metadata
- **Created:** [Date]
- **Last Updated:** [Date]
- **Updated By:** [Role/Agent]

## Change History
- [Date]: Initial creation of decision index
