# Project Directory Structure

## Purpose
This document defines the physical organization of files and directories for "The Wisdom of Both" project, including naming conventions and organizational principles.

## Classification
- **Domain:** Structural
- **Stability:** Semi-stable
- **Abstraction:** Concrete
- **Confidence:** Established

## Directory Hierarchy

```
/
├── .clinerules                 # Project-specific rules and constraints
├── .context-network.md         # Context network discovery file
├── context-network/            # Planning and coordination documents
│   ├── foundation/             # Core project information
│   ├── elements/               # Domain-specific information
│   ├── processes/              # Process documentation
│   ├── decisions/              # Key decisions
│   ├── planning/               # Planning documents
│   ├── connections/            # Cross-cutting concerns
│   ├── meta/                   # Network maintenance
│   └── archive/                # Archived documents
├── manuscript/                 # Final book content
│   ├── 000-Introduction.md     # Book introduction
│   ├── 001-ChapterOne.md      # Chapter 1: The Nature of Wisdom
│   ├── 002-ChapterTwo.md      # Chapter 2: Wisdom Traditions
│   ├── 003-ChapterThree.md    # Chapter 3: Being and Doing
│   ├── 010-WisdomOfBalance.md  # Final chapter
│   ├── [additional chapters]   # Remaining chapters
│   └── references/             # Extracted reference sections
├── scripts/                    # Build and utility scripts
│   ├── compile-manuscript.sh   # Manuscript compilation script
│   └── extract-references.sh   # Reference extraction utility
├── templates/                  # Document templates
│   └── merriweather-pandoc-styles.docx  # Word document template
├── build/                      # Build outputs (git-ignored)
│   └── docx/                   # Compiled Word documents
├── research/                   # Research materials and findings
│   ├── by-chapter/             # Research organized by chapter
│   ├── by-topic/               # Research organized by topic
│   ├── inbox/                  # Temporary research storage
│   ├── meta/                   # Research methodology
│   ├── output/                 # Raw research command output
│   └── synthesis/              # Synthesized findings
├── marketing/                  # Marketing content and strategy
│   ├── blog-posts/             # Blog content development
│   ├── pages/                  # Website pages
│   └── social-media-posts/     # Social media content
├── notes/                      # Research and planning notes
│   ├── Outline.md              # Book outline
│   ├── Blurbs.md               # Marketing copy
│   ├── Comparables.md          # Competitive analysis
│   └── CoursesAndWorkbooks.md  # Future development ideas
└── inbox/                      # Temporary document storage
```

## Directory Purposes

### Context Network (`/context-network/`)
Central coordination hub containing all planning, conceptual, and organizational documentation. This is the authoritative source for project understanding and coordination.

### Manuscript (`/manuscript/`)
Final book content in publication-ready format. Only validated, edited content should exist here.

#### Manuscript Subdirectories
- **references/**: Extracted reference sections from chapters, allowing selective citation management

### Scripts (`/scripts/`)
Build and utility scripts for project automation.

#### Script Files
- **compile-manuscript.sh**: Compiles all manuscript files into a single Word document
- **extract-references.sh**: Extracts reference sections from manuscript files

### Templates (`/templates/`)
Document templates for various output formats.

#### Template Files
- **merriweather-pandoc-styles.docx**: Primary Word document styling template

### Build (`/build/`)
Build output directory for generated documents. Contents are git-ignored.

#### Build Subdirectories
- **docx/**: Compiled Word documents with timestamps

### Research (`/research/`)
All research materials, findings, and synthesis work. Organized both by chapter and by topic for flexible access.

#### Research Subdirectories
- **by-chapter/**: Research specific to individual chapters
- **by-topic/**: Cross-chapter thematic research
- **inbox/**: Temporary storage for new research before categorization
- **meta/**: Research methodology and process documentation
- **output/**: Raw output from research commands and queries
- **synthesis/**: Integrated findings and conclusions

### Marketing (`/marketing/`)
All marketing-related content including blog posts, website pages, and social media materials.

### Notes (`/notes/`)
High-level planning documents and strategic materials that don't fit elsewhere.

### Inbox (`/inbox/`)
Temporary storage for documents awaiting proper categorization or processing.

## File Naming Conventions

### Chapter Files
- **Format:** `XXX-ChapterName.md`
- **Examples:** `001-ChapterOne.md`, `010-WisdomOfBalance.md`
- **Purpose:** Sequential numbering ensures proper ordering
- **Rules:** 
  - Three-digit prefix (zero-padded)
  - CamelCase chapter name
  - No spaces in filenames

### Section Files
- **Format:** `XXX.Y-SectionName.md`
- **Purpose:** Breaking large chapters into manageable sections
- **Example:** `003.1-BeingSection.md`, `003.2-DoingSection.md`
- **Rules:**
  - Maintains hierarchical relationship
  - Decimal notation for subsections

### Research Files
- **Format:** `descriptive-name.md`
- **Purpose:** Clear, searchable names reflecting content
- **Examples:** `paradox-examples.md`, `neuroscience-findings.md`
- **Rules:**
  - Lowercase with hyphens
  - Descriptive of content
  - Organized in appropriate subdirectories

### Context Network Files
- **Format:** `category-name.md` or `item-name.md`
- **Purpose:** Consistent with context network standards
- **Rules:**
  - Include classification metadata
  - Follow node template structure
  - Maintain relationship links

## Organization Principles

### Separation of Concerns
- **Planning vs. Product:** Context network for planning, project directories for deliverables
- **Research vs. Final:** Research directory for exploration, manuscript for finished content
- **Temporary vs. Permanent:** Inbox for temporary storage, proper directories for organized content

### Progressive Refinement
1. **Inbox:** Initial capture and temporary storage
2. **Research:** Exploration and investigation
3. **Context Network:** Planning and coordination
4. **Manuscript:** Final, polished content

### Cross-Referencing
- Use relative paths for internal links
- Maintain bidirectional relationships
- Document connections in context network

## Relationships
- **Parent Node:** [foundation/structure/index.md] - parent - Part of structure documentation
- **Related Nodes:**
  - [content_architecture.md] - complements - Content organization patterns
  - [technical_patterns.md] - supports - Technical implementation
  - [processes/file_management.md] - implements - File handling procedures

## Navigation Guidance
- **Use When:** Setting up new components, locating files, understanding project layout
- **Next Steps:** Review content architecture for content patterns, technical patterns for implementation
- **Update Triggers:** New directory creation, reorganization, naming convention changes

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Extracted from foundation/structure.md

## Change History
- 2025-06-29: Created from foundation/structure.md sections 14-53 and 86-108