# Discovery Records - Navigation Hub

## Purpose
Central index for all discovery records and location indexes in the Starship Graveyard project. This hub helps track where important information exists in both the manuscript and the context network itself.

## Classification
- **Domain:** Project Navigation
- **Stability:** Evolving
- **Abstraction:** Navigation
- **Confidence:** High

## Discovery Categories

### Location Indexes
Structured guides to where key elements appear in the manuscript and project files.

- [Manuscript Scenes](locations/manuscript-scenes.md) - Where key scenes occur across all 38 chapters
- [Character Introductions](locations/character-introductions.md) - First appearances and character arc tracking
- [Plot Points](locations/plot-points.md) - Major story events, revelations, and turning points
- [Technology Descriptions](locations/technology-descriptions.md) - Archaeological technology explanations (PLANNED)
- [Worldbuilding Elements](locations/worldbuilding-elements.md) - Setting descriptions and world details (PLANNED)

### Finding Records
Atomic notes capturing specific discoveries during development and analysis.

- [Discovery Records Index](records/index.md) - Complete chronological list of discoveries
- [Recent Findings](findings/recent.md) - Latest discoveries summary
- [Discovery Triggers](triggers.md) - When to create discovery records

### Recent Discovery Highlights (2025-07-18 to 2025-07-19)
- [Manuscript Scope Discovery](records/2025-07-18-001.md) - 38 chapters exist vs 3 tracked
- [Genre Drift Analysis](records/2025-07-18-002.md) - Identified consciousness theme drift
- [Revision Strategy Success](records/2025-07-18-003.md) - Prior approach validated
- [Skeptical-Debunking Strategy](records/2025-07-18-004.md) - Character consistency solution
- [Implementation Success](records/2025-07-18-005.md) - Surgical revision approach
- [Complete Genre Achievement](records/2025-07-18-006.md) - Full manuscript consistency
- [Documentation Drift Pattern](records/2025-07-19-001.md) - Planning docs lag manuscript reality

### Cross-References
- [unresolved questions](findings/unresolved-questions.md) - Discoveries that raised new questions (PLANNED)
- [connections](findings/connections.md) - Discoveries showing unexpected relationships (PLANNED)
- [inconsistencies](findings/inconsistencies.md) - Discoveries of conflicts or issues (PLANNED)

## Using Discovery Records

### When to Create a Discovery Record
- Finding important code/text locations
- Understanding how something works
- Discovering connections between elements
- Identifying problems or inconsistencies
- Learning something unexpected

### Discovery Record Format
```markdown
## [What You Were Looking For]
**Found**: `path/to/file:line-range`
**Summary**: One sentence explaining what this does/means
**Significance**: Why this matters for the project
**See also**: [related-concept-name], [another-discovery-name]
```

### Location Index Format
```markdown
# [Component] Key Locations

## [Aspect Name]
- **What**: Brief description
- **Where**: `file:lines`
- **Related**: [element-type/concept-name]
```

## Quick Reference

### Recent Major Discoveries
- Chorus technology revision impacts (see [major revisions log](../planning/major-revisions-log.md))
- Character name changes (Dr. Vasquez → Dr. Zhou)
- Shift from consciousness to archaeological themes

### High-Value Locations
- Chapter planning documents in `/planning`
- Character voice guides in `/characters`
- Worldbuilding details in `/worldbuilding`
- Theme evolution in `/elements/themes`

## Maintenance Notes
- Update location indexes when files move
- Create finding records during active work
- Link discoveries to relevant concepts
- Archive outdated discoveries

## Relationships
- **Parent:** [index](../index.md)
- **Related:** [planning index](../planning/index.md), [elements index](../elements/index.md)
- **Supports:** All development activities

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-07-18
- **Major Update:** Added complete location indexes for 38-chapter manuscript
- **Maintainer:** Context Network Admin