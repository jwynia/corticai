# System Patterns: The Wisdom of Both

## Content Architecture

### Directory Structure
```
/
├── manuscript/           # Final book content
│   ├── part1/           # Foundations
│   ├── part2/           # Paradoxes
│   └── part3/           # Application
├── marketing/           # Marketing content
│   ├── social-media/    # Social media content
│   └── blog-strategy.md # Content strategy guidelines
├── notes/               # Research and planning
└── memory-bank/         # Project documentation
```

### File Naming Conventions
- Chapter files: `XX-chapter-name.md`
- Section files: `XX.Y-section-name.md`
- Research notes: `descriptive-name.md`
- Memory bank: `category-name.md`

## Content Patterns

### CMS Content Structure
```markdown
# Page Pattern
## Fields
- Title: Clear, descriptive title
- Path: Optional URL override
  - Special paths: "/" (home), "/blog" (posts)
  - External URLs for menu links
- Slug: URL-friendly identifier
  - Used when no path override
  - Results in /page/[slug]
- Content: Clean HTML content
- Menu settings: in_menu, menu_sort_order

# Blog Post Pattern
## Draft Phase (notes field)
- Title: Clear, engaging title
- Content: Markdown format
- Key sections:
  - Introduction
  - Main points
  - Examples
  - Conclusion
- Optional: excerpt for listings

## Published Phase (content field)
- Clean HTML structure
- Semantic elements
- No style attributes
- Proper heading hierarchy
- Accessible markup
- URL pattern: /post/[slug]
```

### Chapter Structure
```markdown
# Chapter Title

## Overview
- Chapter summary
- Key concepts
- Learning objectives

## Main Sections
### Section Title
- Core content
- Examples
- Case studies

## Practical Applications
- Exercises
- Reflection prompts
- Action items

## Key Takeaways
- Summary points
- Connection to other chapters
```

### Writing Patterns

#### Paradox Presentation
```markdown
## [Paradox Name]

### Context
- Historical background
- Cultural perspectives
- Modern relevance

### Opposing Truths
1. First perspective
   - Key points
   - Supporting evidence
   - Applications

2. Second perspective
   - Key points
   - Supporting evidence
   - Applications

### Integration
- Synthesis approach
- Practical balance
- Application framework
```

#### Case Study Format
```markdown
### Case Study: [Title]

#### Background
- Context
- Key players
- Initial situation

#### Paradox Encountered
- Opposing forces
- Challenges faced
- Stakes involved

#### Resolution
- Approach taken
- Balance achieved
- Lessons learned
```

## Technical Decisions

### Markdown Usage
1. Headers
   - Level 1 (#): Chapter titles
   - Level 2 (##): Major sections
   - Level 3 (###): Subsections
   - Level 4 (####): Detailed points

2. Lists
   - Bulleted lists for collections
   - Numbered lists for sequences
   - Nested lists for hierarchical info

3. Formatting
   - *Italics* for emphasis
   - **Bold** for key terms
   - `Code blocks` for structured examples
   - > Blockquotes for wisdom quotes

### Cross-References
- Use relative links for internal references
- Consistent anchor naming
- Clear navigation paths

## Design Patterns

### Conceptual Frameworks
1. Paradox Pattern
   - Identification
   - Analysis
   - Integration
   - Application

2. Wisdom Integration
   - Traditional insights
   - Modern context
   - Practical synthesis

3. Learning Progression
   - Understanding
   - Recognition
   - Integration
   - Application

### Pedagogical Patterns
1. Concept Introduction
   - Context setting
   - Core principle
   - Examples
   - Practice

2. Skill Development
   - Explanation
   - Demonstration
   - Exercise
   - Reflection

3. Integration Activities
   - Personal reflection
   - Practical application
   - Group discussion
   - Case analysis

## Quality Standards

### Content Criteria
1. Clarity
   - Clear explanations
   - Concrete examples
   - Accessible language

2. Depth
   - Thorough analysis
   - Multiple perspectives
   - Substantive evidence

3. Applicability
   - Practical exercises
   - Real-world examples
   - Action steps

### Review Process
1. Content Review
   - Accuracy check
   - Coherence review
   - Flow assessment

2. Technical Review
   - Format consistency
   - Link validation
   - Structure integrity

3. User Experience
   - Readability
   - Navigation
   - Accessibility

## Research Verification Patterns

### Research Integration Process
1. Fact Verification
   ```markdown
   ### Fact Check
   - Original Claim: [statement to verify]
   - Research Query: [specific query used]
   - Verification: [findings from research]
   - Sources: [key references found]
   - Integration Notes: [how to use in text]
   ```

2. Deep Dive Research
   ```markdown
   ### Research Deep Dive
   - Topic: [area of investigation]
   - Key Questions: [specific queries]
   - Findings Summary: [consolidated insights]
   - New Directions: [potential areas to explore]
   - Integration Points: [relevant sections]
   ```

3. Verification Workflow
   - Initial draft writing
   - Claim identification
   - Research assistant queries
   - Finding integration
   - Documentation update

4. Research Documentation
   - Store findings in notes/
   - Link to source material
   - Track verification status
   - Document contradictions
   - Update related sections

## Content Preservation Guidelines

### Content Management Rules
1. No Content Removal
   - Never use placeholders like "[Previous content remains the same]"
   - Always preserve existing content when merging or updating
   - If referencing other sections, include them fully

2. Content Integration Process
   - Read and verify all existing content first
   - Make specific, targeted additions or changes
   - Maintain all original content structure
   - Never assume content without verification

3. Merging Guidelines
   - Compare both versions completely before merging
   - Preserve all detailed content from both versions
   - Add new content without removing existing material
   - Maintain consistent formatting and structure

4. Documentation Requirements
   - Track all content changes explicitly
   - Verify content preservation after updates
   - Document any structural reorganization
   - Maintain clear content lineage

## Implementation Guidelines

### Development Workflow
1. Research Phase
   - Source gathering
   - Note-taking
   - Synthesis

2. Writing Phase
   - Outline creation
   - Draft development
   - Review cycles

3. Integration Phase
   - Cross-referencing
   - Example development
   - Exercise creation

### Maintenance Patterns
1. Version Control
   - Clear commit messages
   - Logical changes
   - Regular backups

2. Documentation
   - Change tracking
   - Decision recording
   - Pattern evolution

3. Quality Assurance
   - Regular reviews
   - Consistency checks
   - Update processes
