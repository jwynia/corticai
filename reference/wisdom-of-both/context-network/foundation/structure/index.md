# Project Structure Documentation

## Purpose
This hierarchical structure contains the organizational patterns, content architecture, and technical implementation details for "The Wisdom of Both" project.

## Classification
- **Domain:** Structural
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Overview
The project structure documentation has been organized into focused, interconnected documents to improve navigation and maintainability. Each document addresses a specific aspect of the project's structural organization.

## Structure Components

### [Directory Structure](directory-structure.md)
**Purpose:** Defines the physical organization of project files and directories  
**Content:** Directory hierarchy, file locations, naming conventions  
**Use When:** Setting up new components, locating existing files, understanding project layout

### [Content Architecture](content-architecture.md)
**Purpose:** Outlines the book's content organization and presentation patterns  
**Content:** Book structure, chapter organization, paradox patterns, case study formats  
**Use When:** Writing new chapters, organizing content, maintaining consistency

### [Technical Patterns](technical-patterns.md)
**Purpose:** Documents technical implementation standards and workflows  
**Content:** Markdown conventions, CMS integration, research organization, development workflow  
**Use When:** Implementing technical features, integrating with systems, following standards

### [Quality Standards](quality-standards.md)
**Purpose:** Establishes content and technical quality criteria  
**Content:** Content criteria, technical standards, verification patterns, maintenance guidelines  
**Use When:** Reviewing content, ensuring quality, validating implementation

## Navigation Guide

### Common Workflows

1. **Starting New Content**
   - Review [Content Architecture](content-architecture.md) for templates
   - Check [Directory Structure](directory-structure.md) for file placement
   - Follow [Quality Standards](quality-standards.md) for criteria

2. **Technical Implementation**
   - Consult [Technical Patterns](technical-patterns.md) for standards
   - Reference [Directory Structure](directory-structure.md) for organization
   - Apply [Quality Standards](quality-standards.md) for validation

3. **Project Organization**
   - Use [Directory Structure](directory-structure.md) as primary reference
   - Cross-reference with [Content Architecture](content-architecture.md)
   - Maintain standards from [Technical Patterns](technical-patterns.md)

## Relationships
- **Parent Nodes:** 
  - [foundation/index.md] - parent - Part of foundation documentation
  - [foundation/project_definition.md] - implements - Structural implementation of project goals
- **Child Nodes:** 
  - [directory_structure.md] - component - Project directory organization
  - [content_architecture.md] - component - Content patterns and structure
  - [technical_patterns.md] - component - Technical implementation patterns
  - [quality_standards.md] - component - Quality criteria and standards
- **Related Nodes:** 
  - [processes/content_creation.md] - details - Specific content workflows
  - [processes/technical_workflow/] - supports - Technical procedures

## Update Patterns
- Update individual component documents when their specific domain changes
- Maintain this index when adding new structural documentation
- Cross-check relationships when modifying structure

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Structure reorganization
- **Source:** Extracted from foundation/structure.md

## Change History
- 2025-06-29: Created as navigation hub for structure documentation
- 2025-06-29: Organized content from monolithic structure.md into focused documents