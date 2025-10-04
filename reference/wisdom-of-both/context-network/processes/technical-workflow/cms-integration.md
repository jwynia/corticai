# CMS Integration

## Purpose
Defines the content management system architecture, publishing workflow, and HTML conversion standards for "The Wisdom of Both" project.

## Classification
- **Domain:** Publishing Integration
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## CMS Architecture

### Platform Configuration
- **Platform**: Aidant CMS for web publishing
- **Site ID**: 3230911e-0756-4610-b3f5-e6d124d8a022
- **Domain**: wisdomofboth.com (primary publication domain)
- **Integration**: MCP server for automated content management and publishing

### System Integration
1. **Connection Setup**
   - MCP server configuration for automated workflows
   - API authentication and security
   - Content synchronization protocols
   - Error handling and recovery procedures

2. **Data Flow**
   - Markdown source to CMS pipeline
   - Content validation and processing
   - Publishing automation and scheduling
   - Backup and recovery integration

## Content Types and Workflow

### Pages (Static Content)
1. **Field Structure**
   - **title**: Page title for SEO and navigation
   - **path**: Custom URL path override capability
   - **slug**: URL-friendly identifier
   - **content**: Final published HTML content
   - **status**: Publication status (draft/published)
   - **in_menu**: Navigation menu inclusion flag
   - **menu_sort_order**: Menu ordering priority

2. **URL Structure**
   - Standard format: `/page/[slug]`
   - Custom path overrides available
   - Special paths: "/" (home), "/blog" (posts listing)

3. **Usage Context**
   - Static website content and navigation
   - Permanent reference pages
   - Landing pages and core content
   - Navigation and structural elements

### Posts (Blog Articles)
1. **Field Structure**
   - **title**: Article title for SEO and display
   - **slug**: URL-friendly article identifier
   - **notes**: Draft content in Markdown format
   - **content**: Published content in HTML format
   - **excerpt**: Summary for content discovery and SEO
   - **status**: Publication status (draft/published)

2. **URL Structure**
   - Standard format: `/post/[slug]`
   - SEO-optimized URLs
   - Consistent URL patterns

3. **Usage Context**
   - Blog articles and dynamic content
   - Time-sensitive content
   - Regular publication content
   - Content discovery and search optimization

## CMS Workflow Process

### Draft Phase
1. **Content Creation**
   - Create new content entries with `status="draft"`
   - Develop content in `notes` field using Markdown formatting
   - Set descriptive, SEO-friendly titles
   - Create meaningful URL slugs

2. **Initial Development**
   - Use established Markdown standards
   - Include compelling excerpts for content discovery
   - Plan content structure and organization
   - Consider SEO and accessibility requirements

### Review and Editing Phase
1. **Content Review**
   - Review Markdown content for accuracy and coherence
   - Validate formatting, structure, and flow
   - Check adherence to project quality standards
   - Verify style guide compliance

2. **Technical Validation**
   - Validate internal and external links
   - Check formatting and structure integrity
   - Verify cross-references and navigation
   - Test content across different devices

3. **Iterative Improvement**
   - Iterate on content based on review feedback
   - Address technical and content issues
   - Refine structure and organization
   - Optimize for accessibility and SEO

### Publishing Phase
1. **Content Conversion**
   - Convert reviewed Markdown to clean, semantic HTML
   - Update `content` field with production-ready HTML
   - Ensure accessibility compliance
   - Maintain semantic markup standards

2. **Final Validation**
   - Test content preview across devices
   - Verify all links and references
   - Check accessibility compliance
   - Validate SEO optimization

3. **Publication**
   - Set `status="published"` when ready
   - Monitor publication success
   - Verify live content display
   - Test user experience and functionality

## HTML Conversion Standards

### Semantic Structure
1. **HTML5 Semantic Elements**
   - Use appropriate semantic elements (`<article>`, `<section>`, `<header>`, etc.)
   - Maintain proper heading hierarchy (h1, h2, h3, etc.)
   - Include meaningful structure and organization
   - Support screen readers and accessibility tools

2. **Document Structure**
   - Logical content flow and organization
   - Proper nesting of elements
   - Consistent structural patterns
   - Clear content hierarchy

### Clean Markup Requirements
1. **Markup Standards**
   - Avoid inline styles and presentational attributes
   - Use semantic elements over presentational ones
   - Maintain minimal, clean markup
   - Ensure cross-browser compatibility

2. **Code Quality**
   - Valid HTML5 markup
   - Consistent indentation and formatting
   - Meaningful class and ID names
   - Optimized for performance

### Accessibility Standards
1. **Accessibility Compliance**
   - Include proper heading structure
   - Provide meaningful alt text for images
   - Use descriptive link text
   - Ensure keyboard navigation support

2. **WCAG Compliance**
   - Meet WCAG 2.1 AA standards
   - Test with accessibility tools
   - Verify screen reader compatibility
   - Ensure color contrast compliance

## Publishing Automation

### Automated Workflows
1. **Content Processing**
   - Automated Markdown to HTML conversion
   - Link validation and correction
   - Image optimization and processing
   - SEO optimization automation

2. **Quality Assurance**
   - Automated accessibility checking
   - Link validation and testing
   - Format consistency verification
   - Content integrity validation

### Manual Oversight
1. **Human Review**
   - Final content review and approval
   - Quality assurance verification
   - Brand and style compliance checking
   - User experience validation

2. **Publication Control**
   - Manual publication approval
   - Scheduling and timing control
   - Content coordination and planning
   - Error monitoring and correction

## Integration Testing

### Workflow Testing
1. **End-to-End Testing**
   - Test complete workflow from draft to publication
   - Verify content conversion accuracy
   - Check formatting and styling preservation
   - Validate link and reference integrity

2. **Cross-Platform Testing**
   - Test across different browsers and devices
   - Verify mobile responsiveness
   - Check accessibility across platforms
   - Validate performance and loading

### Error Handling
1. **Error Detection**
   - Monitor for conversion errors
   - Track publication failures
   - Identify formatting issues
   - Detect broken links and references

2. **Recovery Procedures**
   - Automatic retry mechanisms
   - Manual error correction procedures
   - Rollback and recovery options
   - Error reporting and logging

## Relationships
- **Parent Node:** [index.md] - technical workflow overview
- **Related Nodes:**
  - [standards.md] - implements formatting standards for CMS conversion
  - [quality_assurance.md] - validates CMS content and workflows
  - [file_management.md] - organizes content for CMS integration

## Navigation Guidance
- **Access Context:** Use when publishing content, setting up CMS workflows, or troubleshooting publication issues
- **Common Next Steps:**
  - [quality_assurance.md] for validation procedures
  - [standards.md] for HTML conversion guidelines
- **Prerequisites:** [environment.md] for required tools and setup
- **Update Patterns:** Update when CMS features change, workflow improvements are made, or publishing requirements evolve

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Technical workflow restructuring