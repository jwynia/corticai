# Content Management System Integration

## Purpose
This document defines the integration workflow between content creation processes and the Content Management System (CMS) for "The Wisdom of Both" project.

## Classification
- **Domain:** Process/Technical Integration
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Content Management System Integration

### CMS Workflow

#### 1. Draft Phase
**Initial Content Creation:**
- Create content with status="draft"
- Use notes field for Markdown content development
- Set descriptive title and URL-friendly slug
- Include excerpt for content listings

**Draft Phase Checklist:**
- [ ] Content status set to "draft"
- [ ] Markdown content developed in notes field
- [ ] Title is descriptive and engaging
- [ ] Slug is URL-friendly and meaningful
- [ ] Excerpt summarizes content effectively
- [ ] Initial content follows established templates

#### 2. Review Phase
**Content Validation:**
- Review Markdown content in notes field
- Check formatting and structure
- Verify links and cross-references
- Ensure content meets quality standards

**Review Phase Checklist:**
- [ ] Markdown syntax is correct and consistent
- [ ] Content structure follows templates
- [ ] All links are functional and appropriate
- [ ] Quality standards are met
- [ ] Cross-references are accurate
- [ ] Content is ready for HTML conversion

#### 3. Publishing Phase
**Content Finalization:**
- Convert Markdown to clean, semantic HTML
- Update content field with final HTML
- Maintain accessibility standards
- Test preview before publishing

**Publishing Phase Checklist:**
- [ ] Markdown successfully converted to HTML
- [ ] HTML is clean and semantic
- [ ] Accessibility standards maintained
- [ ] Preview tested and approved
- [ ] Content field updated with final HTML
- [ ] Status updated to "published"

### HTML Conversion Standards

#### 1. Semantic Structure
**HTML Standards:**
- Use appropriate HTML elements (article, section, etc.)
- Maintain proper heading hierarchy
- Include meaningful alt text and descriptions
- Follow accessibility best practices

**Semantic HTML Example:**
```html
<article>
  <header>
    <h1>Chapter Title</h1>
  </header>
  
  <section>
    <h2>Major Section</h2>
    <p>Content paragraph...</p>
    
    <section>
      <h3>Subsection</h3>
      <p>More content...</p>
    </section>
  </section>
</article>
```

#### 2. Clean Markup
**Markup Standards:**
- Avoid inline styles and formatting
- Use semantic elements over presentational ones
- Maintain clean, minimal markup
- Ensure cross-browser compatibility

**Clean Markup Guidelines:**
- ✅ Use `<strong>` instead of `<b>`
- ✅ Use `<em>` instead of `<i>`
- ✅ Use semantic elements like `<blockquote>`, `<cite>`
- ❌ Avoid `<font>`, `<center>`, inline styles

### Content Preservation Guidelines

#### No Content Loss Policy

##### 1. Complete Content Integration
**Integration Standards:**
- Never use placeholders like "[Previous content remains the same]"
- Always include full content when updating files
- Verify all existing content is preserved
- Document any content reorganization

**Content Integration Process:**
1. Read and understand all existing content
2. Plan integration of new material
3. Merge content completely and explicitly
4. Verify no content has been lost
5. Test all links and cross-references

##### 2. Merge Process Standards
**Merge Requirements:**
- Read and verify all existing content before merging
- Make specific, targeted additions or changes
- Maintain all original content structure and detail
- Test integration thoroughly

**Merge Verification:**
- [ ] All original content is present
- [ ] New content is properly integrated
- [ ] Structure and hierarchy are maintained
- [ ] Links and references are updated
- [ ] No placeholder text remains

##### 3. Change Documentation
**Documentation Requirements:**
- Track all content modifications explicitly
- Document structural reorganization clearly
- Maintain clear content lineage
- Verify preservation after updates

**Change Documentation Format:**
```markdown
## Change History
- YYYY-MM-DD: [Description of changes made]
- YYYY-MM-DD: [Specific content additions or modifications]
- YYYY-MM-DD: [Structural reorganization details]
```

### CMS Field Management

#### Content Fields
**Primary Content Field:**
- Contains final HTML for publication
- Generated from Markdown in notes field
- Maintains semantic structure and accessibility
- Updated only after thorough review

**Notes Field:**
- Contains working Markdown content
- Used for content development and editing
- Maintains version history and drafts
- Source of truth for content creation

**Metadata Fields:**
- Title: Descriptive and engaging
- Slug: URL-friendly identifier
- Excerpt: Brief content summary
- Status: Draft, review, published
- Tags/Categories: Content organization

#### Workflow Status Management
**Status Progression:**
1. **Draft**: Initial content creation and development
2. **Review**: Content validation and quality assurance
3. **Published**: Final content ready for public access

**Status Change Criteria:**
- Draft → Review: Content is complete and meets initial standards
- Review → Published: Content passes all quality checks
- Published → Review: Content needs updates or corrections

### Integration with Content Creation Process

#### Phase Coordination
**Workflow Integration:**
- CMS Draft Phase aligns with Content Creation Phase 2
- CMS Review Phase aligns with Content Creation Phase 3
- CMS Publishing Phase follows successful quality assurance

**Process Handoffs:**
- Content Creation → CMS Draft: Completed initial content
- CMS Review → Quality Assurance: Content ready for validation
- Quality Assurance → CMS Publishing: Approved content

#### Quality Gate Integration
**CMS Quality Requirements:**
- Content must pass all quality checks before publishing
- Technical standards must be met for HTML conversion
- Accessibility requirements must be verified
- Cross-references must be tested and functional

### Technical Implementation

#### Markdown to HTML Conversion
**Conversion Process:**
1. Parse Markdown from notes field
2. Convert to semantic HTML
3. Apply accessibility enhancements
4. Validate HTML structure
5. Update content field

**Conversion Quality Checks:**
- [ ] All Markdown elements converted correctly
- [ ] HTML is valid and well-formed
- [ ] Accessibility attributes are present
- [ ] Cross-references are maintained
- [ ] No formatting is lost in conversion

#### Link Management
**Internal Link Handling:**
- Convert relative Markdown links to appropriate CMS links
- Maintain cross-reference integrity
- Update links when content is reorganized
- Test all links after conversion

**External Link Handling:**
- Preserve external links exactly
- Add appropriate attributes (target, rel)
- Verify external links are functional
- Document external dependencies

### CMS Maintenance

#### Regular Maintenance Tasks
**Content Maintenance:**
- Verify all links remain functional
- Update cross-references when content moves
- Review and update outdated information
- Maintain consistent formatting and structure

**Technical Maintenance:**
- Monitor HTML conversion quality
- Update conversion processes as needed
- Maintain accessibility compliance
- Test cross-browser compatibility

#### Backup and Recovery
**Content Protection:**
- Regular backups of all content fields
- Version history maintenance
- Recovery procedures for content loss
- Redundant storage of critical content

## Relationships
- **Parent Node:** [index.md](index.md) - part-of - Overall content creation process
- **Sibling Nodes:**
  - [technical.md](technical.md) - coordinates-with - Technical standards implementation
  - [quality.md](quality.md) - feeds-from - Quality assurance requirements
- **Related Nodes:**
  - [../technical_workflow.md] - integrates-with - Overall technical processes

## Navigation Guidance
- **Access Context:** Use when preparing content for CMS or managing published content
- **Integration Point:** Bridge between content creation and publication
- **Technical Reference:** HTML conversion and CMS field management

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Hierarchical restructure from content_creation.md

## Change History
- 2025-06-29: Created from content_creation.md restructure - extracted CMS integration processes