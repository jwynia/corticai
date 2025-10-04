# Context Network Linking Standards

## Purpose
This document defines the comprehensive linking standards for the context network to ensure consistent, intuitive navigation and maintain professional documentation practices.

## Classification
- **Domain:** Meta
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Link Format Standards

### 1. Internal Document Links
All links within the context network should use standard markdown link format:
```markdown
[Link Text](relative/path/to/file.md)
```

**Key Rules:**
- Always use relative paths from the current file
- Include the `.md` extension
- Use forward slashes for path separators
- No leading slash for relative paths

**Examples:**
- Same directory: `[Process Overview](overview.md)`
- Parent directory: `[Back to Index](../index.md)`
- Child directory: `[Templates](templates/index.md)`
- Cross-section: `[Project Principles](../../foundation/principles.md)`

### 2. Section Links
For linking to specific sections within documents:
```markdown
[Link Text](path/to/file.md#section-header)
```

**Rules:**
- Use lowercase, hyphenated section anchors
- Remove special characters from anchors
- Match the exact header text (converted to anchor format)

**Example:**
`[Content Standards](processes/content-creation/standards.md#writing-standards)`

### 3. Navigation Links
Every document should include a consistent navigation section:

```markdown
## Navigation

- **Up:** [Parent Category](../index.md)
- **Home:** [Context Network](../../index.md)
- **Related:** [Related Topic](../related-topic.md)
```

**Navigation Types:**
- **Up:** Link to immediate parent index
- **Home:** Link to context network root (only if 2+ levels deep)
- **Related:** Links to conceptually related documents
- **Previous/Next:** For sequential content (e.g., chapters, dated entries)

### 4. Relationship Links
For documenting semantic relationships between nodes:

```markdown
## Relationships

### Parent Nodes
- [Foundation Principles](../foundation/principles.md) - *guides* - Core principles that inform this process

### Child Nodes
- [Technical Standards](technical/standards.md) - *implements* - Specific technical implementations

### Related Nodes
- [Quality Assurance](../processes/quality.md) - *supports* - Quality validation procedures
```

**Relationship Format:**
`[Link Text](path) - *relationship-type* - Brief description`

**Common Relationship Types:**
- *guides* - provides overarching guidance
- *implements* - concrete implementation of concept
- *supports* - provides supporting functionality
- *depends-on* - has dependency relationship
- *produces* - creates or generates
- *integrates-with* - works together with
- *extends* - builds upon or extends

### 5. Quick Reference Links
For action-oriented navigation in index files:

```markdown
## Quick Reference

- **Starting a new chapter?** → [Workflow Guide](workflow.md)
- **Need templates?** → [Chapter Templates](templates/chapter.md)
- **Ready for review?** → [Review Process](review.md)
```

**Format:** `**Question/Task?** → [Action](link.md)`

### 6. External References
For linking outside the context network:

```markdown
[External Resource](https://example.com) (external)
```

Always mark external links with "(external)" suffix.

## Link Description Standards

### When to Include Descriptions

**Always include descriptions for:**
- Relationship links
- Quick reference links
- Links in "Related Content" sections
- First occurrence of cross-section links

**Descriptions optional for:**
- Navigation links (Up/Home/Related)
- Links within flowing text
- Repeated references to same document

### Description Guidelines
- Keep descriptions under 10 words
- Focus on the "why" of the link
- Use consistent verb tenses
- Avoid redundant information

## Bidirectional Linking

### When to Implement
Bidirectional links should be created for:
- Parent-child relationships
- Strong dependencies
- Workflow sequences
- Conceptual relationships

### Implementation Process
1. When creating a link from A to B, check if B should link back to A
2. Add reciprocal link with appropriate relationship type
3. Ensure relationship types are complementary (e.g., parent/child, guides/guided-by)

## File Organization for Linking

### Index Files
Every directory should have an `index.md` that:
- Provides overview of the section
- Links to all immediate children
- Links up to parent index
- Includes quick reference section for common tasks

### Link Maintenance
- Verify links when moving/renaming files
- Update bidirectional links together
- Check for broken links regularly
- Maintain consistent paths after restructuring

## Common Patterns

### Hub and Spoke
Central index with links to related documents:
```markdown
## Contents
- [Concept A](concept-a.md) - Core concept definition
- [Concept B](concept-b.md) - Related concept
- [Concept C](concept-c.md) - Advanced topic
```

### Sequential Navigation
For ordered content:
```markdown
## Navigation
- **Previous:** [Chapter 3](chapter-3.md)
- **Up:** [Book Outline](../outline.md)
- **Next:** [Chapter 5](chapter-5.md)
```

### Cross-Reference Box
For highlighting important connections:
```markdown
> **See Also:**
> - [Related Process](../processes/related.md) - Alternative approach
> - [Foundation Concept](../foundation/concept.md) - Underlying principle
> - [Example Implementation](../examples/implementation.md) - Practical application
```

## Navigation

- **Up:** [Meta Index](index.md)
- **Related:** [Maintenance Guide](maintenance.md)

## Metadata
- **Created:** 2025-06-30
- **Last Updated:** 2025-06-30
- **Updated By:** Claude

## Change History
- 2025-06-30: Initial creation of linking standards document