# Revision Records Template

## Purpose
Documentation standards and templates for tracking all revision activities, decisions, and outcomes in the context network.

## Classification
- **Domain:** Process
- **Stability:** Stable
- **Abstraction:** Structural
- **Confidence:** Established

## Record Types

### Major Revision Record
For significant changes affecting multiple chapters or story elements.

```markdown
# Revision: [Brief Description]
**Date Started:** YYYY-MM-DD
**Date Completed:** YYYY-MM-DD (or ONGOING)
**Status:** Planning/In Progress/Complete/Rolled Back

## Change Summary
[One paragraph overview of what changed and why]

## Change Type
- **Primary Level:** [Conceptual/Structural/Manuscript]
- **Scope:** [Local/Section/Story-wide]
- **Complexity:** [Simple/Moderate/Complex]

## Rationale
[Why this change was necessary - problem being solved]

## Pre-Change Analysis
[Link to analysis document or include summary]

### Predicted Consequences
- **Immediate (1-2 chapters):** [Summary]
- **Medium-term (3-5 chapters):** [Summary]
- **Story-wide:** [Summary]

## Implementation Log

### Phase 1: Initial Changes
**Date:** YYYY-MM-DD
- Changed: [Specific alteration]
- Location: Chapter X, Scene Y
- Result: [What happened]
- Issues: [Any problems]

### Phase 2: Cascade Management
**Date:** YYYY-MM-DD
- Total cascade tasks: X
- Completed: Y
- Blocked: Z
- New discoveries: [List]

### Phase 3: Validation
**Date:** YYYY-MM-DD
- Validation method: [How tested]
- Issues found: [List]
- Resolution: [How addressed]

## Cascade Task Summary
- **Critical:** X tasks (Y completed)
- **Important:** X tasks (Y completed)
- **Enhancement:** X tasks (Y completed)
- **Deferred:** [List with reasons]

## Outcome Assessment

### Success Metrics
- [ ] Original problem solved
- [ ] No new problems created
- [ ] Character consistency maintained
- [ ] Plot logic preserved
- [ ] Themes strengthened
- [ ] Pacing improved

### Lessons Learned
- What worked well: [List]
- What was challenging: [List]
- What to do differently: [List]

### Recommendations
[Advice for similar revisions in future]

## Related Documents
- Analysis: [[revision-analysis-YYYY-MM-DD-description]]
- Cascade tracking: [[cascade-tasks-description]]
- Affected chapters: [[chapter-X]], [[chapter-Y]]
- Character updates: [[character-name-updates]]
```

### Minor Revision Record
For smaller, localized changes.

```markdown
# Minor Revision: [Brief Description]
**Date:** YYYY-MM-DD
**Location:** Chapter X, Scene Y
**Type:** [Prose/Dialogue/Description/Continuity]

## Change Made
[Specific alteration]

## Reason
[Why needed]

## Ripple Effects
- [ ] None identified
- [ ] Minor updates to: [List]

## Validation
- [ ] Read coherently
- [ ] Character voice maintained
- [ ] No continuity breaks
```

### Rollback Record
When a revision is abandoned.

```markdown
# Rollback: [Original Revision Name]
**Date Rolled Back:** YYYY-MM-DD
**Rollback Point:** [Where reverted to]

## Trigger
[What caused the rollback]

## Problems Encountered
1. [Specific issue]
2. [Specific issue]

## Attempted Solutions
- Tried: [Approach]
- Result: [What happened]

## Salvaged Elements
[Any useful discoveries or partial changes kept]

## Lessons Learned
[What this teaches about the story/characters/structure]

## Alternative Approach
[New strategy if attempting again]
```

## Organization Structure

### File Naming Convention
```
revisions/
├── major/
│   ├── YYYY-MM-DD-brief-description.md
│   └── YYYY-MM-DD-brief-description/
│       ├── analysis.md
│       ├── cascade-tasks.md
│       └── monitoring-log.md
├── minor/
│   └── YYYY-MM-chapter-X-description.md
└── rollbacks/
    └── YYYY-MM-DD-description-rollback.md
```

### Linking Pattern
- From revision record to affected elements
- From elements back to revision records
- Cross-references between related revisions
- Connection to discovery records

## Status Tracking

### Revision Status Types
- **Planning**: Analysis complete, implementation not started
- **In Progress**: Actively making changes
- **Cascade Phase**: Primary change done, managing ripples
- **Validation**: All changes made, testing coherence
- **Complete**: Validated and integrated
- **Rolled Back**: Abandoned and reverted
- **Partial**: Some elements kept, others reverted

### Progress Indicators
```markdown
## Progress Tracker
- [x] Analysis complete
- [x] Primary changes made
- [x] Critical cascades addressed
- [ ] Important cascades addressed (7/10)
- [ ] Enhancement cascades
- [ ] Final validation
- [ ] Documentation complete
```

## Integration Requirements

### Must Link To
1. Affected manuscript chapters
2. Updated character profiles
3. Modified world elements
4. Related discovery records
5. Planning documents

### Must Update
1. Major revisions log
2. Character development tracking
3. Timeline if dates affected
4. Theme evolution notes
5. Any invalidated plans

### Must Validate Against
1. Established world rules
2. Character profile consistency
3. Timeline logic
4. Thematic framework
5. Overall story goals

## Quick Templates

### Daily Revision Log Entry
```markdown
### Revision Log - YYYY-MM-DD
**Focus:** [What working on]
**Progress:** [What accomplished]
**Discoveries:** [New insights]
**Blockers:** [What's stopping progress]
**Tomorrow:** [Next steps]
```

### Cascade Task Entry
```markdown
### Task: [Description]
**Trigger:** [Source change]
**Chapter:** X
**Priority:** Critical/Important/Enhancement
**Status:** Not Started/In Progress/Complete/Blocked
**Notes:** [Any relevant details]
```

### Monitoring Check Entry
```markdown
### Monitoring Check - YYYY-MM-DD
**Chapters Reviewed:** X-Y
**Issues Found:** None/[List]
**Adjustments Made:** [List]
**Confidence Level:** High/Medium/Low
```

## Best Practices

### Record Immediately
- Document changes as you make them
- Capture reasoning while fresh
- Note surprises right away

### Be Specific
- Exact chapter and scene references
- Precise description of changes
- Clear cause-effect relationships

### Link Liberally
- Connect all related documents
- Cross-reference similar revisions
- Build knowledge network

### Review Periodically
- Check old revisions for patterns
- Learn from past successes/failures
- Identify recurring issues

## Relationships
- **Parent Node:** [revision.md]
- **Related Nodes:**
  - [revision-monitoring.md] - feeds - Monitoring updates records
  - [major-revisions-log](../planning/major-revisions-log.md) - summarizes - Major revisions listed here
  - [discovery records](../discovery/records/) - creates - Revisions generate discoveries

## Metadata
- **Created:** 2025-01-18
- **Last Updated:** 2025-01-18
- **Updated By:** Assistant
- **Version:** 1.0