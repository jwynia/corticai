# Revision Implementation Workflow

## Purpose
Step-by-step process for implementing revisions after analysis, ensuring controlled changes with proper monitoring and documentation.

## Classification
- **Domain:** Process
- **Stability:** Stable
- **Abstraction:** Procedural
- **Confidence:** Established

## Prerequisites

Before starting implementation:
- [ ] Completed [pre-change analysis](revision-analysis.md)
- [ ] Identified all affected files and sections
- [ ] Created revision record in context network
- [ ] Backed up current version (if major change)

## Implementation Phases

### Phase 1: Setup and Preparation

#### 1.1 Create Implementation Workspace
```markdown
## Revision: [Name]
Started: [Date/Time]
Status: IN PROGRESS

### Working Documents
- [ ] Chapter X - primary change location
- [ ] Chapter Y - immediate ripple effects
- [ ] [Other affected files]

### Reference Documents
- Character profiles: [links]
- World rules: [links]
- Timeline: [link]
```

#### 1.2 Document Current State
Before making any changes:
1. Copy relevant passages to revision record
2. Note current character states
3. Record existing plot connections
4. Capture current thematic elements

#### 1.3 Set Checkpoints
Define specific points to pause and evaluate:
- After primary change implementation
- After each chapter's updates
- Before moving to next ripple layer
- At natural story breaks

### Phase 2: Controlled Implementation

#### 2.1 Make Minimal Viable Change
Start with the smallest version that tests your hypothesis:

**For Conceptual Changes:**
1. Modify core element (motivation, theme, arc)
2. Update immediate character responses
3. Stop and evaluate coherence
4. Document observations

**For Structural Changes:**
1. Move/modify single scene or beat
2. Update direct connections only
3. Test flow and pacing
4. Note any surprises

**For Manuscript Changes:**
1. Revise target passage
2. Check voice consistency
3. Verify style matches
4. Record improvements

#### 2.2 Monitor Immediately

After each change, check:
- [ ] Does it read naturally?
- [ ] Are characters still themselves?
- [ ] Does plot logic hold?
- [ ] Are new problems emerging?

#### 2.3 Document Observations

Record in real-time:
```markdown
### Implementation Notes - [Date/Time]
- Changed: [specific alteration]
- Immediate effect: [what happened]
- Unexpected: [any surprises]
- Concerns: [potential issues spotted]
```

#### 2.4 Evaluate Against Projections

Compare actual effects to predictions:
- Which predictions proved accurate?
- What unexpected effects emerged?
- Are success indicators appearing?
- Any warning signs triggered?

### Phase 3: Ripple Management

#### 3.1 Identify Required Updates

Create cascade task list:
```markdown
### Cascade Tasks
#### Critical (blocks story logic)
- [ ] Update Maya's knowledge in Ch. 12
- [ ] Fix timeline reference in Ch. 15
- [ ] Adjust Marcus's reaction in Ch. 16

#### Important (affects quality)
- [ ] Strengthen foreshadowing in Ch. 10
- [ ] Enhance theme callback in Ch. 18
- [ ] Refine dialogue for new dynamic

#### Nice-to-have (polish)
- [ ] Subtle reference in Ch. 11
- [ ] Enhanced metaphor in Ch. 20
```

#### 3.2 Prioritize by Dependency

Order tasks by:
1. **Logic dependencies** - What must change for story to work
2. **Character dependencies** - What affects character consistency
3. **Thematic dependencies** - What maintains meaning
4. **Quality improvements** - What enhances but isn't critical

#### 3.3 Execute Systematically

For each cascade task:
1. Make the change
2. Verify local coherence
3. Check against monitoring criteria
4. Update task status
5. Note any new cascades

#### 3.4 Track Completion

Maintain running status:
```markdown
### Cascade Status - [Date]
Completed: 5/12 tasks
New tasks discovered: 2
Current focus: Character consistency layer
Next milestone: Complete critical tasks
```

### Phase 4: Validation and Finalization

#### 4.1 Comprehensive Review

After all changes:
1. Read affected chapters in sequence
2. Check character voice consistency
3. Verify plot logic throughout
4. Confirm thematic coherence

#### 4.2 Run Validation Checklist

Use standard [validation process](validation.md) plus:
- [ ] All cascade tasks completed
- [ ] No monitoring warnings active
- [ ] Success indicators present
- [ ] Revision goals achieved

#### 4.3 Final Documentation

Update revision record with:
- Final change summary
- Actual vs. predicted effects
- Lessons learned
- Recommendations for similar revisions

#### 4.4 Update Network

Ensure context network reflects:
- New character states
- Updated plot points
- Revised thematic elements
- Fresh discoveries

## Rollback Procedures

If rollback triggered:

### Immediate Rollback
1. Stop all work immediately
2. Document failure point and reason
3. Revert to backup version
4. Record lessons learned

### Partial Rollback
1. Identify salvageable elements
2. Revert problematic changes only
3. Stabilize at functional state
4. Reassess approach

## Tools and Techniques

### Version Control
- Tag versions before major changes
- Commit at each checkpoint
- Branch for experimental revisions

### Diff Tracking
- Use diff tools to see all changes
- Review for unintended alterations
- Verify nothing lost accidentally

### Reading Strategies
- Read aloud for voice consistency
- Speed read for pacing
- Close read for logic
- Beta read for clarity

## Common Pitfalls

### Over-Revising
- Making too many changes at once
- Losing original voice
- Creating new problems while fixing old

### Under-Documenting
- Not recording why changes made
- Missing cascade effects
- Losing track of what changed

### Ignoring Warnings
- Pushing through when problems emerge
- Not respecting rollback triggers
- Assuming issues will resolve themselves

## Relationships
- **Parent Node:** [revision.md]
- **Related Nodes:**
  - [revision-analysis.md] - prerequisite - Must complete analysis first
  - [revision-cascades.md] - manages - Handles ripple effects
  - [revision-monitoring.md] - tracks - Ongoing assessment
  - [revision-records.md] - documents - All changes recorded

## Metadata
- **Created:** 2025-01-18
- **Last Updated:** 2025-01-18
- **Updated By:** Assistant
- **Version:** 1.0