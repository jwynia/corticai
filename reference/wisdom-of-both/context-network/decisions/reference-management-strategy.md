# Decision: Reference Management Strategy

## Purpose
Documents the decision to extract references from manuscript chapters into separate files for selective citation management.

## Classification
- **Domain:** Content Management
- **Stability:** Stable
- **Abstraction:** Concrete
- **Confidence:** Established

## Decision Context

### Background
The manuscript contained extensive reference sections at the end of each chapter. The author wanted to compile the manuscript without these references but maintain them for selective inclusion.

### Requirements
1. Clean manuscript compilation without full reference sections
2. Preserved access to all references for selective use
3. Ability to add specific citations back to the manuscript
4. Maintain connection between references and source chapters

## Decision

### Chosen Approach
Extract all reference sections from manuscript files into separate reference files stored in `manuscript/references/`.

### Implementation Details
1. **Storage Location**: `manuscript/references/` subdirectory
2. **Naming Convention**: `XXX-ChapterName-references.md`
3. **Extraction Process**: Automated via `extract-references.sh` script
4. **Compilation Exclusion**: Reference directory not included in standard compilation

## Rationale

### Benefits
1. **Clean Compilation**: Manuscript compiles without extensive reference sections
2. **Preservation**: All references preserved and accessible
3. **Flexibility**: Authors can selectively add citations back as needed
4. **Organization**: Clear connection between references and chapters
5. **Reversibility**: Original content preserved in reference files

### Trade-offs
1. **Manual Re-inclusion**: Citations must be manually copied back when needed
2. **Maintenance**: Two sets of files to maintain (manuscript and references)
3. **Workflow Change**: Authors must adapt to new citation workflow

## Alternatives Considered

### Alternative 1: Comment Out References
- **Description**: Use HTML comments to hide references in source files
- **Rejected Because**: Would clutter source files and complicate editing

### Alternative 2: Separate Top-Level Directory
- **Description**: Store references in `/references/` at project root
- **Rejected Because**: Breaks connection with manuscript, harder to navigate

### Alternative 3: Build-Time Filtering
- **Description**: Filter references during compilation
- **Rejected Because**: More complex implementation, harder to preview results

## Implementation Notes

### Script Behavior
- Identifies reference sections by headers (## References, ## Source Notes, etc.)
- Extracts from header to end of file
- Creates metadata header in reference file
- Updates original file to remove extracted content

### Reference Patterns Detected
- `## References`
- `## References and Sources`
- `## References and Further Reading`
- `## Source Notes`
- `## Source Verification Notes`

## Relationships
- **Related Nodes:**
  - [../processes/technical-workflow/build-process.md] - Implements this decision
  - [../foundation/structure/directory-structure.md] - Documents resulting structure
  - [../planning/publication-readiness-assessment.md] - Affects publication workflow

## Navigation Guidance
- **Access Context:** Reference this when understanding reference management approach
- **Implementation Details:** See build-process.md for technical implementation
- **Update Triggers:** Revisit if reference management needs change

## Metadata
- **Created:** 2025-07-07
- **Last Updated:** 2025-07-07
- **Updated By:** Reference extraction task
- **Decision Date:** 2025-07-07
- **Decision Maker:** Author via task request

## Change History
- 2025-07-07: Initial decision documentation