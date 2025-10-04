# Technical Implementation

## Purpose
This document defines the technical standards, formatting requirements, and cross-reference systems for content in "The Wisdom of Both" project.

## Classification
- **Domain:** Process/Technical
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Technical Implementation

### Markdown Standards

#### 1. Header Hierarchy
- **Level 1 (#)**: Chapter titles only
- **Level 2 (##)**: Major sections
- **Level 3 (###)**: Subsections
- **Level 4 (####)**: Detailed points and sub-topics

**Header Guidelines:**
- Use descriptive, meaningful header text
- Maintain consistent hierarchy throughout document
- Avoid skipping header levels (e.g., # followed by ###)
- Keep headers concise but informative

#### 2. Formatting Conventions
- **Bold** for key terms and important concepts
- *Italics* for emphasis and foreign terms
- `Code formatting` for structured examples or templates
- > Blockquotes for wisdom quotes and important insights

**Formatting Examples:**
```markdown
**Key Concept**: This is an important term or idea
*Emphasis*: This word needs subtle highlighting
`Template`: This is a structured format or code
> "Wisdom quote": This is an important insight
```

#### 3. List Formatting
- **Numbered lists** for sequential processes or steps
- **Bulleted lists** for collections and categories
- **Nested lists** for hierarchical information
- **Consistent indentation** and spacing

**List Standards:**
```markdown
1. First sequential item
2. Second sequential item
   - Sub-item under second item
   - Another sub-item
3. Third sequential item

- First collection item
- Second collection item
  - Nested item
  - Another nested item
- Third collection item
```

### Cross-Reference System

#### 1. Internal Linking
- Use relative paths for all internal links
- Link to specific sections using anchors
- Maintain bidirectional relationships
- Test all links regularly

**Internal Link Examples:**
```markdown
See [workflow.md](workflow.md) for process details
Reference [templates.md](templates.md#paradox-presentation-pattern) for specific patterns
Review [../foundation/principles.md] for core principles
```

#### 2. Reference Standards
- Consistent citation format
- Clear attribution of sources
- Proper acknowledgment of wisdom traditions
- Transparent about evidence quality

**Citation Format:**
```markdown
## References and Sources
- Author, A. (Year). *Title of Work*. Publisher.
- Traditional Source: [Culture/Tradition] wisdom teaching
- Research Study: Brief description (Author, Year)
```

### File Organization Standards

#### Directory Structure
```
processes/content_creation/
├── index.md           # Overview and navigation
├── workflow.md        # Three-phase process
├── templates.md       # Content structure patterns
├── standards.md       # Writing guidelines
├── technical.md       # This file
├── quality.md         # Quality assurance
├── cms.md            # CMS integration
└── review.md         # Collaboration process
```

#### File Naming Conventions
- Use lowercase, descriptive filenames
- Separate words with underscores or hyphens
- Include version numbers when appropriate
- Maintain consistent naming patterns

**Examples:**
- ✅ `content_creation_workflow.md`
- ✅ `paradox-presentation-template.md`
- ✅ `chapter-01-introduction.md`

### Link Management

#### Link Testing
- Verify all internal links work correctly
- Check external links periodically
- Update links when content is reorganized
- Document link dependencies

#### Cross-Reference Maintenance
- Update references when content moves
- Maintain bidirectional relationships
- Use clear, descriptive link text
- Avoid "click here" or generic link text

**Good Link Examples:**
```markdown
✅ Review the [three-phase workflow](workflow.md) for process guidance
✅ See [quality assurance criteria](quality.md#content-quality-checks)
✅ Consult [writing standards](standards.md) for voice and tone

❌ Click [here](workflow.md) for more information
❌ See [this document](quality.md) for details
```

### Accessibility Standards

#### 1. Header Structure
- Use headers to create logical document outline
- Ensure headers are descriptive and hierarchical
- Don't use headers solely for formatting
- Provide clear document structure for screen readers

#### 2. Link Accessibility
- Use descriptive link text
- Avoid generic phrases like "click here"
- Provide context for links
- Ensure links are keyboard navigable

#### 3. Content Accessibility
- Use clear, simple language when possible
- Provide alt text for any images
- Ensure good color contrast
- Structure content logically

### Version Control Integration

#### Git Standards
- Use meaningful commit messages
- Commit related changes together
- Include technical updates in appropriate commits
- Document major structural changes

**Commit Message Examples:**
```
✅ Add technical standards for markdown formatting
✅ Update cross-reference system documentation
✅ Restructure content creation process files

❌ Update files
❌ Fix stuff
❌ Changes
```

#### File History
- Track major changes in file metadata
- Document restructuring and reorganization
- Maintain change history for accountability
- Note migration from previous structures

### Integration Standards

#### Template Integration
- Ensure technical standards support template usage
- Maintain consistency across all content types
- Coordinate with content structure requirements
- Support both rigid and flexible template application

#### Quality Assurance Integration
- Technical standards feed into quality checklists
- Automated checks where possible
- Manual verification for complex requirements
- Regular standards compliance reviews

### Technical Quality Checklist

#### Format Consistency
- [ ] Markdown syntax is correct and consistent
- [ ] Headers are properly hierarchical
- [ ] Formatting is uniform throughout
- [ ] Lists and tables are properly structured

#### Navigation Integrity
- [ ] All internal links work correctly
- [ ] Cross-references are accurate and helpful
- [ ] Content structure is logical and navigable
- [ ] Related concepts are properly connected

#### Accessibility Standards
- [ ] Headers are descriptive and hierarchical
- [ ] Link text is clear and descriptive
- [ ] Content is readable by screen readers
- [ ] Structure supports assistive technologies

## Relationships
- **Parent Node:** [index.md](index.md) - part-of - Overall content creation process
- **Sibling Nodes:**
  - [templates.md](templates.md) - supports - Technical requirements for templates
  - [quality.md](quality.md) - feeds-into - Technical quality assurance
- **Related Nodes:**
  - [../../technical_workflow.md] - coordinates-with - Overall technical processes

## Navigation Guidance
- **Access Context:** Reference during content creation and technical review
- **Quality Check:** Use technical checklist during content validation
- **Integration:** Coordinate with other technical documentation

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Hierarchical restructure from content_creation.md

## Change History
- 2025-06-29: Created from content_creation.md restructure - extracted technical standards