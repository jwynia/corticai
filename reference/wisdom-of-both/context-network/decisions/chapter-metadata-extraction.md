# Decision: Chapter Metadata Extraction

## Purpose
Documents the decision to extract Overview sections from manuscript chapters into the context network to keep the published manuscript focused on book content only.

## Classification
- **Domain:** Content Management
- **Stability:** Stable
- **Abstraction:** Concrete
- **Confidence:** Established

## Decision Context

### Background
Manuscript files contained Overview sections with structural metadata:
- Chapter summaries
- Key concepts
- Learning objectives
- Connection points to other chapters

While useful for planning and understanding chapter structure, this metadata is not appropriate for the published book content.

### Requirements
1. Keep manuscript files focused on actual book content
2. Preserve metadata for reference and planning
3. Maintain easy access to chapter structure information
4. Enable clean compilation without manual editing

## Decision

### Chosen Approach
Extract Overview sections from manuscript files and store them in the context network at `context-network/elements/content/chapter-metadata/`.

### Implementation Details
1. **Storage Location**: `context-network/elements/content/chapter-metadata/`
2. **Naming Convention**: `XXX-ChapterName-metadata.md`
3. **Extraction Process**: Automated via `extract-overviews.sh` script
4. **Compilation**: Overview sections automatically excluded from manuscript compilation

## Rationale

### Benefits
1. **Clean Manuscript**: Published content contains only material intended for readers
2. **Preserved Planning Information**: Metadata remains accessible for authors and editors
3. **Automated Process**: No manual editing required before compilation
4. **Clear Separation**: Content vs. metadata distinction is explicit
5. **Context Network Integration**: Metadata properly located with other planning documents

### Trade-offs
1. **Multiple Files**: Chapter content and metadata now in separate locations
2. **Initial Extraction**: One-time process to separate existing content
3. **Maintenance**: Updates to chapter structure require updating metadata files

## Alternatives Considered

### Alternative 1: HTML Comments
- **Description**: Wrap Overview sections in HTML comments
- **Rejected Because**: Still clutters source files, requires special handling in pandoc

### Alternative 2: Conditional Compilation
- **Description**: Use pandoc filters to exclude Overview sections
- **Rejected Because**: More complex implementation, harder to preview final output

### Alternative 3: Manual Removal
- **Description**: Manually remove Overview sections before publication
- **Rejected Because**: Error-prone, time-consuming, not repeatable

## Implementation Notes

### Overview Section Pattern
Detected sections starting with `## Overview` containing:
- Chapter Summary
- Key Concepts
- Learning Objectives
- Connection Points

### Affected Chapters
Overview sections extracted from 11 chapters:
- 002-WisdomTraditionsAroundTheWorld
- 004-HeartAndMind
- 005-IndividualAndCollective
- 006-ActionAndNonAction
- 007-KnowledgeAndMystery
- 008-ChangeAndStability
- 009-SimplicityAndComplexity
- 010-AmbitionAndContentment
- 011-ConnectionAndDetachment
- 012-JusticeAndCompassion
- 013-NavigatingLifesContradictions

## Relationships
- **Related Nodes:**
  - [reference-management-strategy.md] - Similar approach to content separation
  - [../processes/technical-workflow/build-process.md] - Part of overall build process
  - [../elements/content/chapter-metadata/index.md] - Location of extracted metadata

## Navigation Guidance
- **Access Context:** Reference when understanding manuscript structure decisions
- **Implementation**: See extract-overviews.sh script
- **Metadata Location**: Browse chapter-metadata directory for extracted content

## Metadata
- **Created:** 2025-07-08
- **Last Updated:** 2025-07-08
- **Updated By:** Overview extraction task
- **Decision Date:** 2025-07-08
- **Decision Maker:** Author via observation

## Change History
- 2025-07-08: Initial decision documentation and implementation