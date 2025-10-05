# Software Project Context Network Navigation Guide

## 🔥 Critical Documents (Start Here)

**New to the project or encountering issues?**

- 🚨 **[Architecture: Testability Issues](./architecture/testability-issues.md)** - Why integration tests indicate design problems
- 📋 **[Process: Testing Strategy](./processes/testing-strategy.md)** - Unit-test-first philosophy and practices
- 📝 **[Planning: Groomed Backlog](./planning/groomed-backlog.md)** - Prioritized, ready-to-implement tasks
- 🏗️ **[Architecture Index](./architecture/index.md)** - All architectural documentation
- ⚙️ **[Process Index](./processes/index.md)** - All development processes

## Overview

This context network contains all planning documents, architecture decisions, design discussions, and team coordination information for software development projects. It is organized into a hierarchical structure specifically designed to support the unique knowledge management needs of software projects.

## Structure

The software project context network is organized as follows:

```
context-network/
├── discovery.md                # This navigation guide
├── foundation/                 # Core project information
│   ├── index.md                # Foundation section index
│   ├── project_definition.md   # Main project purpose and goals
│   ├── structure.md            # Project structure overview
│   ├── principles.md           # Guiding principles and standards
│   ├── system_overview.md      # High-level system description
│   ├── core_concepts.md        # Domain model and key abstractions
│   └── technology_radar.md     # Technology choices and rationale
├── architecture/               # System architecture documentation
│   ├── index.md                # Architecture section index
│   ├── system_architecture.md  # Overall system structure
│   ├── component_map.md        # Component relationships
│   ├── data_architecture.md    # Data flows and storage
│   ├── integration_patterns.md # How components communicate
│   ├── deployment_architecture.md # Runtime environment
│   └── security_architecture.md # Security boundaries and controls
├── decisions/                  # Architecture Decision Records
│   ├── index.md                # Decision log and index
│   ├── adr_template.md         # Template for new decisions
│   └── adr_NNN_*.md            # Individual decision records
├── processes/                  # Process documentation
│   ├── index.md                # Processes section index
│   ├── development_workflow.md # How code moves from idea to production
│   ├── testing_strategy.md     # Approach to quality assurance
│   ├── release_process.md      # How software reaches users
│   ├── incident_response.md    # Handling production issues
│   └── knowledge_transfer.md   # Onboarding and handoffs
├── evolution/                  # System evolution tracking
│   ├── index.md                # Evolution section index
│   ├── refactoring_plans.md    # Planned system improvements
│   ├── technical_debt_registry.md # Known compromises
│   ├── migration_strategies.md # Moving between architectural states
│   └── deprecation_timeline.md # What's being phased out and when
├── cross_cutting/              # Cross-cutting concerns
│   ├── index.md                # Cross-cutting section index
│   ├── error_handling.md       # System-wide error strategies
│   ├── logging_observability.md # How to understand system behavior
│   ├── performance_patterns.md # Optimization strategies
│   ├── api_design_guide.md     # Interface consistency patterns
│   └── naming_conventions.md   # Shared vocabulary and patterns
├── planning/                   # Planning documents
│   ├── index.md                # Planning section index
│   ├── roadmap.md              # Project roadmap
│   └── milestones.md           # Milestone definitions
├── meta/                       # Information about the network itself
│   ├── index.md                # Meta section index
│   ├── updates/                # Updates tracking (hierarchical)
│   │   ├── index.md            # Updates index
│   │   └── [category folders]  # Update categories
│   ├── maintenance.md          # Network maintenance procedures
│   ├── hierarchical_implementation_guide.md  # Guide for hierarchical structure
│   └── templates/              # Templates for creating content
│       ├── main_index_template.md     # For top-level indexes
│       ├── category_index_template.md # For category indexes
│       ├── subcategory_index_template.md # For subcategory indexes
│       ├── item_template.md    # For individual items
│       ├── adr_template.md     # For architecture decisions
│       └── component_template.md # For component documentation
└── archive/                    # Archived documents from the inbox
```

## Software-Specific Organization

This context network implements a specialized organization pattern for software projects:

1. **Layer-Based Structure**: Information is organized into conceptual layers from foundational concepts to implementation details
2. **Decision Records**: Architecture decisions are captured with context, consequences, and alternatives
3. **Component Documentation**: Software components are documented with purpose, responsibilities, interfaces, and dependencies
4. **Process Documentation**: Development processes are documented with triggers, steps, outcomes, and common issues
5. **Evolution Tracking**: System changes are tracked with refactoring plans and technical debt registry
6. **Cross-Cutting Concerns**: Patterns that apply across the system are documented separately

The structure is implemented through:

1. **Index Files**: Each directory has an index.md file that provides an overview and navigation to content within that section
2. **Standardized Templates**: Templates ensure consistent documentation across different types of information
3. **Explicit Relationships**: Relationships between information nodes are explicitly documented
4. **Progressive Disclosure**: Information is structured from high-level overviews to detailed specifications
5. **Role-Based Navigation**: Different navigation paths are provided for different roles and tasks

For detailed guidance on when and how to implement hierarchical organization, see `meta/hierarchical_implementation_guide.md`.

## Navigation Paths

### For New Developers
1. Start with `foundation/system_overview.md` to understand the system at a high level
2. Review `foundation/core_concepts.md` to understand the domain model
3. Explore `architecture/component_map.md` to see how the system is structured
4. Check `processes/development_workflow.md` to understand how to contribute
5. Review `cross_cutting/naming_conventions.md` for coding standards

### For Understanding Architecture
1. Start with `architecture/system_architecture.md` for the overall architecture
2. Review `architecture/component_map.md` for component relationships
3. Explore specific components of interest
4. Check `decisions/index.md` to understand the rationale behind architectural choices
5. Review `evolution/refactoring_plans.md` to see planned architectural changes

### For Making Technical Decisions
1. Review existing decisions in `decisions/index.md`
2. Check `foundation/principles.md` for guiding principles
3. Explore related components in the architecture documentation
4. Use the ADR template in `decisions/adr_template.md`
5. Document the new decision and update related documentation

### For Debugging Issues
1. Check `cross_cutting/error_handling.md` for error handling patterns
2. Review `cross_cutting/logging_observability.md` for debugging approaches
3. Explore the relevant components in the architecture documentation
4. Check `processes/incident_response.md` for troubleshooting procedures
5. Document any findings in the appropriate sections

## Creating New Content

When creating new content for a software project:

1. Determine the appropriate layer and section based on the type of information:
   - Use the Foundation layer for core concepts and principles
   - Use the Architecture layer for structural design
   - Use the Decision layer for architecture decisions
   - Use the Process layer for workflows and procedures
   - Use the Evolution layer for change tracking
   - Use the Cross-Cutting layer for patterns that apply across the system

2. Use the appropriate template from `meta/templates/`:
   - Use `adr_template.md` for architecture decisions
   - Use `component_template.md` for component documentation
   - Use `item_template.md` for general content
   - Use appropriate index templates for index files

3. Follow these documentation patterns:
   - Architecture Decision Records should include context, decision, consequences, and alternatives
   - Component documentation should include purpose, responsibilities, interface, and dependencies
   - Process documentation should include triggers, steps, outcomes, and common issues
   - Technical debt entries should include impact assessment and remediation plans

4. Update the relevant index files and add appropriate cross-references to related content

## Code-Documentation Synchronization

To keep the context network in sync with code:

1. **Documentation Triggers**: Update documentation when:
   - Adding new components or significant features
   - Making architectural changes
   - Changing interfaces between components
   - Fixing bugs that reveal misunderstandings in the documentation
   - Onboarding new team members who ask questions not answered in documentation

2. **Review Process**: Include documentation updates in code reviews

3. **Regular Maintenance**: Schedule regular "knowledge gardening" sessions:
   - Weekly: Update decision log, file new technical debt
   - Monthly: Review and update component maps
   - Quarterly: Major documentation refactoring

4. **Automation**: Where possible, automate documentation updates:
   - Link documentation to code regions
   - Flag stale documentation based on code changes
   - Generate documentation coverage reports

See `meta/maintenance.md` for detailed maintenance procedures.

## Software-Specific Classification System

Information nodes in this software project context network are classified along these dimensions:

1. **Domain**: [Primary knowledge area]
   - Foundation: Core concepts and principles
   - Architecture: Structural design and components
   - Decision: Architecture decisions and rationale
   - Process: Workflows and procedures
   - Evolution: Change tracking and planning
   - Cross-Cutting: Patterns that apply across the system

2. **Stability**: [Change frequency expectation]
   - Static: Fundamental principles unlikely to change
   - Semi-stable: Established patterns that evolve gradually
   - Dynamic: Frequently changing information

3. **Abstraction**: [Detail level]
   - Conceptual: High-level ideas and principles
   - Structural: Organizational patterns and frameworks
   - Detailed: Specific implementations and examples

4. **Confidence**: [Information reliability]
   - Established: Verified and reliable information
   - Evolving: Partially validated but subject to refinement
   - Speculative: Exploratory ideas requiring validation

5. **Lifecycle Stage**: [Development phase]
   - Planning: Early design and conceptualization
   - Active: Currently implemented and maintained
   - Legacy: Still in use but planned for replacement
   - Deprecated: No longer recommended for use
   - Archived: No longer in use

6. **Audience**: [Primary consumers]
   - Developers: Implementation-focused information
   - Architects: Design-focused information
   - Operators: Operations-focused information
   - Stakeholders: Business-focused information
   - New Team Members: Onboarding-focused information
