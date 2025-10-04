# Technical Context: The Wisdom of Both

## Development Environment

### Writing Platform
- Markdown-based content creation
- VSCode as primary editor
- Files stored in Dropbox for sync and backup

### File Structure
```
/
├── .clinerules                 # Project-specific rules
├── manuscript/                 # Book content
├── notes/                      # Research materials
└── memory-bank/               # Project documentation
```

## Technical Constraints

### Writing Restrictions
```
[WRITING]
disable_languages = all
enable_markdown = true
```

### Required Workflows
```
[WORKFLOW]
required_actions = 
    chapter_outlining
    content_expansion
    cross_reference_management
    style_consistency_checks
```

### Validation Rules
```
[VALIDATION]
prohibited_patterns =
    /```
    /def\s\w+/
    /class\s\w+/
```

## Markdown Implementation

### Supported Features
1. Headers (# to ######)
2. Lists (ordered and unordered)
3. Emphasis (*italic* and **bold**)
4. Blockquotes (>)
5. Links (relative paths preferred)
6. Tables (when needed for structured data)

### Formatting Guidelines
- Use ATX-style headers (#)
- Maintain consistent indentation
- Use line breaks for readability
- Follow standard Markdown syntax

## Content Management

### Version Control
- Regular backups via Dropbox
- Systematic file naming
- Change tracking in progress.md

### Cross-referencing
- Relative links between documents
- Consistent header IDs
- Clear navigation structure

## Research Assistant Integration

### Configuration
- MCP Server: perplexity-research-assistant
- Primary function: Fact verification and research expansion
- Integration point: Writing and review workflow

### Query Patterns
1. Fact Verification
   - Format: Clear, specific questions about claims
   - Include context and time period
   - Request primary sources when available
   - Specify field/domain relevance

2. Research Expansion
   - Format: Open-ended exploration queries
   - Topic-focused investigation
   - Cross-disciplinary connections
   - Contemporary applications

### Documentation Standards
1. Research Notes
   - Store in notes/ directory
   - Include query and response
   - Tag with relevant chapters
   - Link to manuscript sections

2. Verification Status
   - Confirmed: Multiple reliable sources
   - Partially Verified: Limited sources
   - Needs Investigation: Conflicting data
   - Unverified: Insufficient data

### Integration Workflow
1. Writing Phase
   - Flag claims needing verification
   - Generate research queries
   - Document findings
   - Update manuscript

2. Review Phase
   - Systematic fact checking
   - Source validation
   - Contradiction resolution
   - Update documentation

## Tools and Dependencies

### Required Tools
1. Text Editor
   - VSCode with Markdown support
   - Markdown preview capability
   - Spell-checking extensions

2. File Management
   - Dropbox for synchronization
   - Local backup system
   - File organization tools

3. Research Tools
   - Note-taking capabilities
   - Reference management
   - Citation tracking

## Quality Assurance

### Validation Checks
1. Content Validation
   - Markdown syntax verification
   - Link checking
   - Format consistency

2. Style Checks
   - Consistent formatting
   - Header hierarchy
   - List formatting

3. Cross-reference Validation
   - Internal link verification
   - Header reference checking
   - Navigation integrity

## Technical Workflow

### Content Creation
1. Research Phase
   - Note taking in Markdown
   - Source documentation
   - Reference organization

2. Writing Phase
   - Chapter drafting
   - Section development
   - Content review

3. Integration Phase
   - Cross-reference creation
   - Navigation setup
   - Format verification

### Maintenance Procedures
1. Regular Tasks
   - Backup verification
   - Link checking
   - Format validation

2. Periodic Reviews
   - Structure assessment
   - Navigation testing
   - Content integrity checks

## Technical Standards

### File Organization
1. Naming Conventions
   - Lowercase with hyphens
   - Clear descriptive names
   - Consistent numbering

2. Directory Structure
   - Logical hierarchy
   - Clear separation of concerns
   - Consistent organization

3. Content Management
   - Regular backups
   - Version tracking
   - Change documentation

### Documentation Requirements
1. Content Files
   - Clear headers
   - Consistent structure
   - Proper formatting

2. Supporting Files
   - Well-organized notes
   - Structured research
   - Organized references

## Content Management System

### MCP CMS Integration
- Site ID: 3230911e-0756-4610-b3f5-e6d124d8a022
- Domain: wisdomofboth.com
- Server: aidant-cms
- Resource Templates:
  - cms://sites/{id} - Get site details
  - cms://sites/{id}/pages - List site pages
  - cms://sites/{id}/pages/{pageId} - Get specific page
  - cms://sites/{id}/posts - List site posts
  - cms://sites/{id}/posts/{postId} - Get specific post
- Tools:
   createContent - create a new page or post
      {
         "type": "post",
         "data": {
            "id": "d8f7aa3e-ce6c-4759-9b1c-e5c9f3c7f123",
            "status": "draft",
            "title": "Test Post via MCP Server",
            "slug": "test-post",
            "notes": "# Outline\n## Introduction\n## Body\n## Conclusion",
            "content": "<p>This is a test post created using the aidant-cms MCP server. It demonstrates the ability to create new content through the MCP protocol.</p>",
            "excerpt": "A test post created via the MCP server to verify content creation functionality.",
            "site": "ac464229-33c0-43c0-a6c7-bfef4fdcd201"
      }
   updateContent - update an existing page or post

### Content Types and Structure
1. Pages
   - Static website content
   - Fields:
     - title: Page title
     - path: Optional URL path override (e.g., "/" for home, "/blog" for posts listing)
     - slug: URL-friendly identifier (used if no path override)
     - content: HTML content
     - status: "draft" or "published"
     - in_menu: Boolean for navigation menu inclusion
     - menu_sort_order: String for menu ordering
   - URL Structure:
     - With path override: domain.com/[path]
     - Without path override: domain.com/page/[slug]
     - Path can also point to external URLs for menu links

2. Posts (Blog Articles)
   - Standardized URL pattern: /post/[slug]
   - Fields:
     - title: Post title
     - slug: URL-friendly identifier
     - notes: Markdown draft content
     - content: Final HTML content
     - excerpt: Summary for listings
     - status: "draft" or "published"

### Blog Post Workflow
1. Draft Phase
   - Create post with status="draft"
   - Use notes field for Markdown content
   - Set title and slug
   - Optional excerpt for listings

2. Publishing Phase
   - Convert Markdown to clean HTML
   - Update content field with HTML
   - Use basic HTML elements without style attributes

### Content Management Best Practices
1. Post Creation
   - Start in draft status
   - Use notes field for Markdown drafting
   - Keep HTML content clean and semantic
   - Include meaningful excerpts

2. URL Management
   - Use descriptive slugs
   - Maintain consistent URL structure
   - Verify unique slugs within site

3. Content States
   - Draft: Work in progress in notes field
   - Published: Final HTML in content field
   - Always preview before publishing

4. HTML Guidelines
   - Use semantic elements (<article>, <section>, etc.)
   - Avoid inline styles
   - Keep markup clean and minimal
   - Follow accessibility best practices

5. Development Workflow
   - Draft content in Markdown
   - Review and edit in notes field
   - Convert to clean HTML
   - Test preview
   - Publish when ready

## Future Considerations

### Potential Enhancements
1. Additional Tools
   - Enhanced preview capabilities
   - Automated validation
   - Advanced cross-referencing

2. Process Improvements
   - Streamlined workflows
   - Automated checks
   - Enhanced collaboration

3. Format Extensions
   - Additional Markdown features
   - Enhanced visualization
   - Improved navigation
