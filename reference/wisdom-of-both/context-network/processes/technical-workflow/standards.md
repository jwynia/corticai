# Technical Standards

## Purpose
Defines Markdown implementation standards, formatting guidelines, and cross-reference system specifications for "The Wisdom of Both" project.

## Classification
- **Domain:** Technical Standards
- **Stability:** Stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Markdown Implementation Standards

### Supported Features and Usage

#### Headers (# to ######)
- **Level 1 (#)**: Chapter titles and major document sections
- **Level 2 (##)**: Primary sections within chapters
- **Level 3 (###)**: Subsections and topic divisions
- **Level 4 (####)**: Detailed points and specific concepts
- **Levels 5-6**: Reserved for very specific hierarchical content

#### Text Formatting
1. **Bold** (`**text**`)
   - Key terms and important concepts
   - Emphasis for critical information
   - Highlighting of definitions

2. **Italics** (`*text*`)
   - Emphasis and foreign terms
   - Book titles and proper nouns
   - Subtle emphasis and clarification

3. **Code** (`` `text` ``)
   - Structured examples and technical terms
   - Specific concepts requiring precision
   - File names and technical references

4. **Strikethrough** (`~~text~~`)
   - Deprecated or corrected content
   - Content marked for removal
   - Historical information for context

#### Lists and Structure
1. **Bulleted Lists** (`-` or `*`)
   - Collections and categories
   - Non-sequential information
   - Feature lists and options

2. **Numbered Lists** (`1.`)
   - Sequential processes and steps
   - Prioritized information
   - Hierarchical procedures

3. **Nested Lists**
   - Hierarchical information with proper indentation
   - Sub-categories and detailed breakdowns
   - Multi-level organization

4. **Definition Lists** (when supported)
   - Glossary-style content
   - Term and definition pairs
   - Structured reference material

#### Links and References
1. **Internal Links**
   - Format: `[text](relative/path.md)`
   - Use for cross-references within project
   - Maintain relative paths for portability

2. **External Links**
   - Format: `[text](https://example.com)`
   - Use for external resources and references
   - Include meaningful, descriptive link text

3. **Anchor Links**
   - Format: `[text](#section-name)`
   - Use for same-document navigation
   - Create meaningful anchor names

4. **Reference-style Links**
   - Use for cleaner text when many links present
   - Maintain at bottom of document
   - Use descriptive reference names

#### Quotes and Code Blocks
1. **Blockquotes** (`>`)
   - Wisdom quotes and philosophical insights
   - Highlighted excerpts and important passages
   - Referenced material and citations

2. **Code Blocks** (` ``` `)
   - Structured examples and templates
   - Formatting demonstrations
   - Multi-line technical content

3. **Inline Code** (`` `text` ``)
   - Technical terms and specific concepts
   - Emphasis of precise language
   - File names and commands

#### Tables
1. **Usage Guidelines**
   - Use for structured data presentation
   - Include headers for accessibility
   - Keep simple and readable
   - Maintain consistent formatting

2. **Formatting Standards**
   - Align columns for readability
   - Use consistent spacing
   - Include meaningful headers
   - Keep content concise

## Formatting Guidelines

### Consistency Standards
1. **Header Style**
   - Use ATX-style headers (#) exclusively throughout the project
   - Maintain consistent spacing around headers
   - Use descriptive, meaningful header text
   - Follow logical hierarchy principles

2. **Indentation and Spacing**
   - Maintain consistent indentation (2 spaces for nested lists)
   - Use line breaks strategically for readability and flow
   - Consistent spacing around elements
   - Proper paragraph separation

3. **Syntax Compliance**
   - Follow standard CommonMark syntax for maximum compatibility
   - Avoid platform-specific extensions
   - Test across different Markdown processors
   - Maintain broad compatibility

### Accessibility Considerations
1. **Semantic Structure**
   - Use descriptive header text
   - Maintain logical document structure
   - Provide meaningful context
   - Enable screen reader navigation

2. **Link Accessibility**
   - Provide meaningful link text
   - Avoid "click here" or generic text
   - Include context for link purpose
   - Test link descriptions out of context

3. **Image Accessibility** (when used)
   - Include alt text for images
   - Provide descriptive captions
   - Consider visual impairments
   - Test with screen readers

### Cross-Platform Compatibility
1. **Platform Independence**
   - Avoid platform-specific formatting
   - Use standard Markdown features only
   - Test rendering across different viewers
   - Ensure consistent appearance

2. **Compatibility Testing**
   - Test across multiple Markdown processors
   - Verify rendering in different environments
   - Check mobile and desktop display
   - Validate export format compatibility

## Cross-Reference System

### Internal Linking Standards
1. **Relative Path Usage**
   - Use relative paths for all internal references
   - Maintain portability across different environments
   - Enable easy file reorganization
   - Support offline access and local development

2. **Path Structure**
   - Use forward slashes consistently
   - Avoid absolute paths
   - Include file extensions
   - Test path resolution

### Anchor Naming Conventions
1. **Naming Standards**
   - Use lowercase with hyphens for anchors
   - Create descriptive, meaningful anchor names
   - Maintain consistency across documents
   - Avoid special characters and spaces

2. **Anchor Examples**
   - `#development-environment` (good)
   - `#Dev_Env` (avoid)
   - `#section-1-2-3` (avoid)
   - `#markdown-implementation` (good)

### Link Maintenance
1. **Validation Procedures**
   - Regular validation of internal links
   - Update links when files are moved or renamed
   - Document link dependencies
   - Test navigation paths regularly

2. **Maintenance Workflow**
   - Check links during content updates
   - Validate cross-references during reviews
   - Update broken links promptly
   - Document link changes

### Bidirectional Relationships
1. **Relationship Documentation**
   - Document parent-child relationships
   - Maintain related node connections
   - Track cross-references and dependencies
   - Enable reverse navigation

2. **Navigation Support**
   - Provide clear navigation paths
   - Include "back" references where appropriate
   - Support multiple entry points
   - Enable non-linear reading patterns

## Content Structure Standards

### Document Organization
1. **Standard Document Structure**
   - Purpose and classification at top
   - Main content in logical sections
   - Relationships and navigation at bottom
   - Metadata and change history

2. **Section Organization**
   - Use consistent section ordering
   - Group related information together
   - Maintain logical flow
   - Enable easy scanning and navigation

### Content Guidelines
1. **Writing Style**
   - Clear, concise language
   - Consistent terminology
   - Active voice when appropriate
   - Accessible to target audience

2. **Technical Precision**
   - Accurate technical terminology
   - Consistent use of terms
   - Clear definitions when needed
   - Precise instructions and procedures

## Relationships
- **Parent Node:** [index.md] - technical workflow overview
- **Related Nodes:**
  - [environment.md] - enforced through environmental tools
  - [file_management.md] - supports naming and organization standards
  - [quality_assurance.md] - validates adherence to these standards

## Navigation Guidance
- **Access Context:** Use when creating content, formatting documents, or establishing formatting consistency
- **Common Next Steps:**
  - [quality_assurance.md] for validation procedures
  - [cms_integration.md] for publishing standards
- **Prerequisites:** [environment.md] for tool configuration
- **Update Patterns:** Update when formatting standards change or new conventions are adopted

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Technical workflow restructuring