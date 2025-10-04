# Technical Patterns

## Purpose
This document defines technical implementation standards, workflows, and integration patterns for "The Wisdom of Both" project.

## Classification
- **Domain:** Technical/Structural
- **Stability:** Semi-stable
- **Abstraction:** Concrete
- **Confidence:** Established

## Markdown Implementation Standards

### Header Hierarchy
1. **Level 1 (#):** Chapter titles only
2. **Level 2 (##):** Major sections
3. **Level 3 (###):** Subsections
4. **Level 4 (####):** Detailed points

### List Formatting
- **Bulleted lists:** For collections without sequence
- **Numbered lists:** For sequential steps or ordered items
- **Nested lists:** For hierarchical information (2-space indent)

### Text Formatting
- **Italics (*text*):** For emphasis
- **Bold (**text**):** For key terms and important concepts
- **Code blocks (```):** For structured examples and templates
- **Inline code (`text`):** For file names, commands, technical terms
- **Blockquotes (>):** For wisdom quotes and external sources

### Cross-Reference System
- Use relative links for internal references
- Consistent anchor naming conventions
- Clear navigation paths between related content
- Bidirectional relationship maintenance

Example:
```markdown
See [Related Section](../related-section.md#anchor)
Related concept: [Paradox Pattern](content-architecture.md#paradox-pattern)
```

## Research Integration Architecture

### Research Organization Structure
```
research/
├── by-chapter/              # Chapter-specific research
│   ├── ch1-nature-of-wisdom/
│   ├── ch2-wisdom-traditions/
│   └── [additional chapters]/
├── by-topic/                # Topic-based research
│   ├── contemporary-paradoxes/
│   ├── cross-cultural/
│   ├── neuroscience/
│   └── practical-applications/
├── synthesis/               # Integrated findings
└── meta/                    # Research methodology
```

### Verification Patterns

#### Fact Verification Template
```markdown
### Fact Check
- Original Claim: [statement to verify]
- Research Query: [specific query used]
- Verification: [findings from research]
- Sources: [key references found]
- Integration Notes: [how to use in text]
```

#### Research Integration Process
1. Initial draft writing
2. Claim identification and flagging
3. Research assistant queries
4. Finding integration and synthesis
5. Documentation update and tracking

## Content Management System Integration

### CMS Architecture
- **Site ID:** 3230911e-0756-4610-b3f5-e6d124d8a022
- **Domain:** wisdomofboth.com
- **Content Types:** Pages and Posts (Blog Articles)

### Content Workflow

#### Draft Phase
1. Create content with `status="draft"`
2. Use notes field for Markdown content
3. Set title and URL-friendly slug
4. Maintain version in context network

#### Publishing Phase
1. Convert Markdown to clean HTML
2. Update content field with semantic HTML
3. Maintain accessibility standards
4. Preserve all formatting and structure

### URL Structure
- **Pages:** `/page/[slug]` or custom path override
- **Posts:** `/post/[slug]`
- **Special Paths:** 
  - `/` (home page)
  - `/blog` (posts listing)

### HTML Conversion Standards
- Semantic HTML5 elements
- Proper heading hierarchy
- Alt text for images
- ARIA labels where appropriate
- Clean, readable markup

## Development Workflow

### Research Phase
1. **Source Gathering**
   - Academic sources
   - Contemporary examples
   - Cross-cultural perspectives
   - Practical applications

2. **Verification Process**
   - Fact-checking protocol
   - Source documentation
   - Claim validation
   - Integration notes

3. **Synthesis Approach**
   - Thematic organization
   - Pattern identification
   - Insight development
   - Application framework

### Writing Phase
1. **Outline Creation**
   - Chapter structure planning
   - Section organization
   - Example placement
   - Exercise design

2. **Draft Development**
   - Follow content templates
   - Maintain consistent voice
   - Include practical elements
   - Cross-reference related content

3. **Review Cycles**
   - Content accuracy check
   - Structural coherence
   - Practical applicability
   - Reader engagement

### Integration Phase
1. **Cross-Referencing**
   - Internal links verification
   - Relationship mapping
   - Navigation testing
   - Consistency checking

2. **Example Development**
   - Real-world scenarios
   - Cultural diversity
   - Contemporary relevance
   - Clear application

3. **Exercise Validation**
   - Clarity of instructions
   - Achievable outcomes
   - Progressive difficulty
   - Measurable results

## Version Control Patterns

### Change Documentation
- Clear commit messages
- Logical content grouping
- Regular checkpoint commits
- Meaningful branch names

### Content Preservation
- No deletion without documentation
- Archive replaced content
- Maintain change history
- Track major revisions

## Technical Standards

### File Management
- UTF-8 encoding for all text files
- Unix line endings (LF)
- No trailing whitespace
- Consistent indentation (2 spaces)

### Performance Considerations
- Optimize image sizes
- Minimize external dependencies
- Efficient cross-referencing
- Clean, valid markup

### Accessibility Requirements
- Proper heading structure
- Descriptive link text
- Alt text for images
- Color contrast compliance
- Keyboard navigation support

## Relationships
- **Parent Node:** [foundation/structure/index.md] - parent - Part of structure documentation
- **Related Nodes:**
  - [directory_structure.md] - uses - File organization patterns
  - [content_architecture.md] - implements - Content structure standards
  - [quality_standards.md] - validates - Technical quality criteria
  - [processes/technical_workflow/] - details - Specific technical procedures

## Navigation Guidance
- **Use When:** Implementing technical features, following standards, integrating systems
- **Next Steps:** Review quality standards for validation, technical workflow for procedures
- **Update Triggers:** New technical requirements, system changes, standard updates

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Extracted from foundation/structure.md

## Change History
- 2025-06-29: Created from foundation/structure.md sections 181-367