# Build Process

## Purpose
Defines the manuscript compilation and build processes for "The Wisdom of Both" project, including script infrastructure, template management, and output generation.

## Classification
- **Domain:** Technical Process
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Build Infrastructure

### Directory Structure
```
/
├── scripts/                    # Build and utility scripts
│   ├── compile-manuscript.sh   # Main compilation script
│   └── extract-references.sh   # Reference extraction utility
├── templates/                  # Document templates
│   └── merriweather-pandoc-styles.docx  # Primary Word template
└── build/                      # Build output directory
    ├── .gitignore              # Excludes build artifacts from git
    └── docx/                   # Word document outputs
```

### Script Descriptions

#### compile-manuscript.sh
- **Purpose:** Compiles all manuscript markdown files into a single Word document
- **Process:** 
  1. Collects markdown files in numbered order (000-015 + appendices)
  2. Combines into single markdown with page breaks
  3. Converts to pandoc native format
  4. Applies template to create final docx
- **Usage:** `./scripts/compile-manuscript.sh [output_filename]`
- **Output:** Timestamped docx file in build/docx/

#### extract-references.sh
- **Purpose:** Extracts reference sections from manuscript files
- **Process:**
  1. Scans each manuscript file for reference sections
  2. Extracts content from "## References" or similar headers
  3. Creates separate reference files in manuscript/references/
  4. Updates original files to remove references
- **Usage:** `./scripts/extract-references.sh`
- **Output:** Individual reference files per chapter

## Template Management

### Template Location
- All templates stored in `/templates/` directory
- Primary template: `merriweather-pandoc-styles.docx`
- Templates are version-controlled with the project

### Template Application
- Uses pandoc's `--reference-doc` parameter
- Requires two-step process: markdown → native → docx
- Preserves template styling and formatting

## Build Process Workflow

### Standard Compilation
1. **Preparation Phase**
   - Verify all manuscript files are present
   - Check template availability
   - Create build directory if needed

2. **Compilation Phase**
   - Combine markdown files in order
   - Add page breaks between sections
   - Convert to pandoc native format
   - Apply template to generate docx

3. **Output Phase**
   - Generate timestamped filename (default)
   - Save to build/docx/ directory
   - Report file size and location

### Reference Management
1. **Extraction Decision**
   - References extracted to allow selective citation inclusion
   - Stored in manuscript/references/ for easy access
   - Not included in standard compilation

2. **Re-inclusion Process**
   - Authors can selectively copy citations back to manuscript
   - Allows for curated reference lists
   - Maintains full reference archive

## File Naming Conventions

### Manuscript Files
- Format: `XXX-DescriptiveName.md`
- Examples: `000-Introduction.md`, `001-TheNatureOfWisdom.md`
- Three-digit prefix ensures proper ordering

### Build Outputs
- Default: `The_Wisdom_of_Both_YYYYMMDD_HHMMSS.docx`
- Custom: User-specified filename
- All outputs in build/docx/ directory

### Reference Files
- Format: `XXX-OriginalName-references.md`
- Example: `001-TheNatureOfWisdom-references.md`
- Maintains connection to source chapter

## Dependencies and Requirements

### Software Dependencies
- **pandoc**: Core conversion tool (required)
- **bash**: Shell environment for scripts
- **Standard Unix tools**: grep, sed, head, tail

### File Dependencies
- Manuscript files in expected naming format
- Template file in templates/ directory
- Write permissions for build/ directory

## Quality Considerations

### Error Handling
- Scripts check for pandoc installation
- Verify template existence before processing
- Report missing files clearly
- Use color-coded output for clarity

### Performance
- Two-step conversion ensures template compatibility
- Page breaks between sections for readability
- Efficient file processing order

## Relationships
- **Parent Node:** [index.md] - Part of technical workflow
- **Related Nodes:**
  - [file-management.md] - Uses file organization standards
  - [standards.md] - Follows formatting conventions
  - [../../foundation/structure/directory-structure.md] - Extends directory structure
  - [../../planning/publication-readiness-assessment.md] - Supports publication preparation

## Navigation Guidance
- **Access Context:** Use when compiling manuscript, managing references, or modifying build process
- **Common Next Steps:**
  - Run compilation after manuscript updates
  - Extract references when reorganizing citations
  - Review output for publication readiness
- **Prerequisites:** 
  - Pandoc installation
  - Proper manuscript file naming
  - Template in place
- **Update Patterns:** Update when build process changes, new scripts added, or workflow modified

## Metadata
- **Created:** 2025-07-07
- **Last Updated:** 2025-07-07
- **Updated By:** Manuscript compilation task

## Change History
- 2025-07-07: Initial creation documenting build infrastructure and processes