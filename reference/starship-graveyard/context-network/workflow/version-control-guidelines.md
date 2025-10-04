# Version Control Guidelines - File Revision Process

## Purpose
Establish clear guidelines for handling file revisions when using version control, preventing duplicate files and maintaining clean history.

## Classification
- **Domain:** Workflow
- **Stability:** Reference
- **Abstraction:** Process
- **Confidence:** High

## Core Principle: Direct Editing with Version Control

### ALWAYS Do This:
- Edit files directly in their original location (e.g., `manuscript/chapter007.md`)
- Use version control (git) to track changes and maintain history
- Create commits for significant revisions with descriptive messages
- Use branches for experimental changes if needed

### NEVER Do This:
- Create duplicate files with suffixes like `-revised`, `-v2`, `-new`, etc.
- Maintain multiple versions of the same content in separate files
- Keep old versions as separate files when using version control

## File Revision Workflow

### For Manuscript Files:
1. **Edit Directly**: Always modify `manuscript/chapter007.md`, never create `manuscript/chapter007-revised.md`
2. **Commit Changes**: Use git to create snapshots of revisions
3. **Use Descriptive Messages**: "Revise Chapter 7 to incorporate art crime angle and remove comedy elements"
4. **Track Progress**: Document major changes in context network planning files

### For Planning Documents:
- Planning files (like evaluation documents) can remain as separate files since they document process, not final content
- Context network files should reference the main manuscript files, not revision duplicates

## Current Cleanup Needed

### Existing Revision Files to Consolidate:
- `manuscript/chapter007-revised.md` → Apply changes to `manuscript/chapter007.md`
- Any other `-revised` or `-v2` files should be consolidated

### Process:
1. Compare revised version with original
2. Apply improvements to the original file
3. Commit changes with descriptive message
4. Delete the revision file
5. Update any context network references

## Git Workflow for Revisions

### Standard Process:
```bash
# 1. Make changes to original file
git add manuscript/chapter007.md

# 2. Commit with descriptive message
git commit -m "Revise Chapter 7: Replace consciousness themes with art crime/money laundering focus

- Transform processing facility into forgery factory
- Show sophisticated criminal enterprise mechanics
- Add Kess Trizik evidence collection subplot
- Incorporate realistic criminal psychology
- Remove comedic elements, maintain serious sci-fi mystery tone"

# 3. Continue working
```

### For Major Revisions:
```bash
# Create branch for experimental changes
git checkout -b chapter7-art-crime-revision

# Make changes
git add .
git commit -m "Draft: Art crime revision"

# When satisfied, merge back
git checkout main
git merge chapter7-art-crime-revision
git branch -d chapter7-art-crime-revision
```

## Context Network References

### Update References From:
- `manuscript/chapter007-revised.md`

### Update References To:
- `manuscript/chapter007.md`

### Planning Files Can Reference:
- Specific git commits for version tracking
- Context network evaluation documents
- Planning documents that explain the revision process

## Benefits of This Approach

### Clean Repository:
- Single source of truth for each file
- No confusion about which version is current
- Clean file structure without duplicates

### Proper Version History:
- Git log shows evolution of content
- Easy to compare versions with `git diff`
- Can revert to any previous state if needed

### Better Collaboration:
- Clear workflow for contributors
- No confusion about which file to edit
- Standard process everyone can follow

## Emergency Exception

The ONLY time to create revision files is:
- When original file is corrupted or missing
- When experimenting with major structural changes and unsure about keeping them
- When specifically requested by project lead for comparison purposes

In these cases:
- Use clear naming: `chapter007-experiment-YYYYMMDD.md`
- Include purpose in filename and file header
- Plan to consolidate back to original file
- Document the exception in context network

## Implementation

### Immediate Actions:
1. Apply improvements from `chapter007-revised.md` to `chapter007.md`
2. Commit the consolidated changes
3. Delete the revision file
4. Update context network references
5. Create this guideline document

### Ongoing Process:
- Always edit original files directly
- Use git for version control
- Document major revisions in context network
- Keep file structure clean and simple

## Connections
- **Related**: [[git-workflogit workflow], manuscript organization, context network structure
- **Informs**: File editing process, version control, project organization
- **See Also**: [[CLAUDE.mCLAUDE.md] workflow requirements

## Metadata
- **Created**: 2025-06-30
- **Purpose**: Establish clean version control workflow preventing duplicate files
- **Usage**: Reference for all file revision activities