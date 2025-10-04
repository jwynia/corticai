# Learning Path: Documentation Maintenance

## Purpose
Guide for keeping context network documentation synchronized with manuscript reality and preventing documentation drift.

## Classification
- **Domain:** Meta/Process
- **Stability:** Evolving
- **Abstraction:** Practical
- **Confidence:** Established

## The Documentation Drift Problem

### What Is Documentation Drift?
When planning documents, character descriptions, and plot overviews no longer match the actual manuscript. This creates:
- Confusion about current story state
- Redundant revision attempts
- Misdirected future work
- Time wasted on non-problems

### How It Happens
1. **Manuscript revisions** without documentation updates
2. **Assumption** that docs reflect reality
3. **Time lag** between changes and doc updates
4. **Multiple revision rounds** creating version confusion

## Prevention Strategies

### 1. Source of Truth Principle
**The manuscript is reality; documentation is the map**
- Always check manuscript before major decisions
- Treat docs as guides, not gospel
- Question outdated-looking information

### 2. Update Triggers
**When to update documentation:**
- After completing manuscript revisions
- Before starting new planning work
- When confusion arises about story state
- During regular maintenance cycles

### 3. Version Indicators
**Clear state marking:**
```markdown
## Document Status: [Current | Planned | Historical]
## Last Synced with Manuscript: [Date]
## Manuscript Chapters Reflected: [1-39]
```

### 4. Change Propagation
**When updating one document, check:**
- Related character descriptions
- Plot overviews
- Theme documents  
- World-building guides
- Chapter planning files

## Maintenance Workflow

### Quick Sync Check
1. Read document metadata/status
2. Spot-check against manuscript
3. Note discrepancies
4. Update or flag for update

### Full Documentation Audit
1. **Inventory**: List all planning documents
2. **Sample**: Check key sections against manuscript
3. **Identify**: Note all drift instances
4. **Prioritize**: Critical vs nice-to-have updates
5. **Execute**: Update in priority order
6. **Document**: Record audit results

### Update Best Practices
1. **Preserve History**: Note what changed and why
2. **Update Metadata**: Last sync date, chapters covered
3. **Cross-Reference**: Update related documents
4. **Create Discovery**: Record significant drift patterns

## Warning Signs of Drift

### Red Flags
- Descriptions that "feel wrong"
- Conflicts between documents
- References to abandoned plot elements
- Character descriptions mismatching story
- Outdated terminology or names

### Common Drift Areas
1. **Character Arcs**: Early plans vs actual development
2. **Plot Details**: Original concepts vs final implementation  
3. **Themes**: Intended vs emergent themes
4. **World Details**: Early sketches vs established facts

## Tools and Techniques

### Drift Detection
```bash
# Search for terms that might indicate old content
grep -r "consciousness|hybrid|neural" planning/
```

### Version Tracking
```markdown
<!-- In each document -->
## Revision History
- 2025-07-19: Aligned with manuscript chapters 1-38
- 2025-06-15: Reflected planned changes (not implemented)
- 2025-05-01: Original planning version
```

### Quick Reference Card
Create a single document with:
- Current genre/theme
- Character names and roles
- Major plot points
- Key terminology

## Case Study: July 2025 Discovery

### The Situation
- Plot overview contained consciousness themes
- Manuscript was already revised to archaeological thriller
- Created confusion about needed work

### The Solution
1. Systematic review of all plot docs
2. Updates to match manuscript reality
3. Creation of this learning path
4. New discovery record for pattern

### Lessons Learned
- Regular audits prevent major drift
- Metadata about sync status is critical
- Discovery records capture patterns
- Team communication about updates essential

## Action Items for New Projects

1. **Establish Update Protocol**: Define when/how docs update
2. **Create Sync Tracking**: Build in "last synced" metadata
3. **Schedule Audits**: Regular drift checks
4. **Document Reality**: Always note "current vs planned"
5. **Communicate Changes**: Ensure team knows doc status

## Related Resources
- [Discovery: Documentation Drift](../discovery/records/2025-07-19-001.md)
- [Maintenance Guide](../meta/maintenance.md)
- [Retrospective Process](../meta/retrospective-template.md)

## Navigation
- **Parent**: [Learning Paths Index](index.md)
- **Related**: [Meta Processes](../meta/index.md)
- **Supports**: All documentation work

## Metadata
- **Created**: 2025-07-19
- **Last Updated**: 2025-07-19
- **Based On**: Plot revision retrospective insights