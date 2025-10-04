# Project Principles

## Purpose
This document outlines the core principles and standards that guide decision-making and development across the project.

## Classification
- **Domain:** Core Concept
- **Stability:** Static
- **Abstraction:** Conceptual
- **Confidence:** Established

## Content

### Core Values

1. **Form-Driven Extensibility**
   New features should first be considered as form types rather than custom implementations. This leverages the existing form infrastructure to provide validation, storage, editing, and UI generation automatically.

2. **Single Source of Truth**
   All data flows through the form engine and event system, ensuring consistency and observability across the platform.

3. **Progressive Enhancement**
   Start with simple form-based solutions and enhance with custom logic only when necessary, maintaining backward compatibility.

### Design Principles

1. **Form-as-Feature Pattern**
   When adding new capabilities, implement them as form types to inherit the full feature set of the form engine automatically. This approach has proven successful for person profiles, theme settings, site/tenant configurations, CMS pages, and dashboard widgets.

   *Example:* Instead of building a custom user profile system with dedicated tables and UI, create a "Person Profile" form type that automatically provides editing interfaces, validation rules, and storage.

2. **Data-Driven Configuration**
   System behavior and appearance should be configurable through form submissions rather than hard-coded logic. This includes dashboard widgets (appearance defined by form submission), data queries (query definitions as forms), and workflow rules.

   *Example:* Dashboard widgets use one form submission to define their appearance/layout and another to define their data query, making the entire dashboard system data-driven.

3. **Leverage Before Building**
   Always evaluate whether existing form infrastructure can meet a requirement before creating custom solutions. The form engine provides field types, validation, relationships, status management, and event handling that can address most use cases.

   *Example:* When users needed content pages, instead of building a separate CMS, the system used form submissions to store page content and a form collection for navigation.

### Standards and Guidelines

[List and describe the standards and guidelines that the project adheres to]

#### Quality Standards

- [Standard 1]
- [Standard 2]
- [Standard 3]

#### Structural Standards

- [Standard 1]
- [Standard 2]
- [Standard 3]

#### Safety and Security Standards

- [Standard 1]
- [Standard 2]
- [Standard 3]

#### Performance and Efficiency Standards

- [Standard 1]
- [Standard 2]
- [Standard 3]

### Process Principles

[List and describe the principles that guide development and operational processes]

1. **[Process Principle 1]**
   [Description of Process Principle 1]

2. **[Process Principle 2]**
   [Description of Process Principle 2]

3. **[Process Principle 3]**
   [Description of Process Principle 3]

### Decision-Making Framework

[Describe the framework used for making decisions in the project]

#### Decision Criteria

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

#### Trade-off Considerations

- [Trade-off 1]
- [Trade-off 2]
- [Trade-off 3]

### Principle Application

[Describe how these principles should be applied in practice]

#### When Principles Conflict

[Guidance on how to resolve situations where principles may conflict with each other]

#### Exceptions to Principles

[Circumstances under which exceptions to these principles may be considered]

## Relationships
- **Parent Nodes:** [foundation/project_definition.md]
- **Child Nodes:** None
- **Related Nodes:** 
  - [foundation/structure.md] - implements - Project structure implements these principles
  - [processes/creation.md] - guided-by - Creation processes follow these principles
  - [decisions/*] - evaluated-against - Decisions are evaluated against these principles

## Navigation Guidance
- **Access Context:** Use this document when making significant decisions or evaluating options
- **Common Next Steps:** After reviewing principles, typically explore structure.md or specific decision records
- **Related Tasks:** Decision-making, design reviews, code reviews, process definition
- **Update Patterns:** This document should be updated rarely, only when fundamental principles change

## Metadata
- **Created:** [Date]
- **Last Updated:** [Date]
- **Updated By:** [Role/Agent]

## Change History
- [Date]: Initial creation of principles template
