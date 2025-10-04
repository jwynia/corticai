# Cascade Management Protocol

## Purpose
Systematic approach to identifying, tracking, and managing the ripple effects of revisions throughout the manuscript.

## Classification
- **Domain:** Process
- **Stability:** Stable
- **Abstraction:** Procedural
- **Confidence:** Established

## Understanding Cascades

### What Are Cascades?
Cascades are the ripple effects that spread from any change in your manuscript. Like dropping a stone in water, even small revisions create waves that affect surrounding elements.

### Cascade Directions

#### Forward Cascades
Changes that affect later parts of the story:
- Altered character knowledge affects future decisions
- Modified plot events change subsequent consequences
- Shifted character relationships impact future interactions
- Early thematic adjustments influence later resonances

#### Backward Cascades
Changes that require updates to earlier parts:
- New revelations need earlier foreshadowing
- Character development requires earlier groundwork
- Plot twists need previous setup
- Thematic clarity demands earlier introduction

#### Lateral Cascades
Changes that affect parallel elements:
- Other characters' reactions to the change
- Subplot interactions with main plot
- World consistency across scenes
- Thematic echoes in parallel storylines

## Cascade Identification Process

### Step 1: Direct Dependencies

Identify what directly connects to your change:

```markdown
## Direct Dependencies for [Change]

### Plot Dependencies
- Events that depend on this element
- Decisions influenced by this information
- Consequences that flow from this action

### Character Dependencies
- Who knows about this?
- Who is affected by this?
- Whose motivations connect to this?

### World Dependencies
- What rules/systems are involved?
- What locations are connected?
- What technologies/magic are affected?

### Thematic Dependencies
- What symbols/motifs connect?
- What meanings are reinforced/undermined?
- What emotional beats are linked?
```

### Step 2: Secondary Effects

For each direct dependency, identify its dependencies:

```markdown
## Secondary Effects

From [Direct Dependency 1]:
- Affects: [Chapter X, Scene Y]
- Which then affects: [Chapter Z]
- Creating need to: [Specific change]

From [Direct Dependency 2]:
- Affects: [Character relationship]
- Which then affects: [Later scene]
- Creating need to: [Adjust dialogue]
```

### Step 3: Cascade Mapping

Create visual or structured map:

```
Original Change: Maya discovers artifact differently
  |
  ├─> Marcus's trust builds differently (Ch 10)
  |     └─> Team dynamics shift (Ch 12)
  |           └─> Crisis response changes (Ch 15)
  |
  ├─> Dr. Chen's suspicions arise earlier (Ch 11)
  |     └─> Investigation accelerates (Ch 13)
  |
  └─> Artifact's properties revealed sooner (Ch 11)
        └─> Research direction changes (Ch 14)
              └─> Discovery timing shifts (Ch 18)
```

## Cascade Classification

### Critical Cascades
Must be addressed for story to function:
- Plot logic dependencies
- Character motivation chains
- Essential world consistency
- Core dramatic structure

**Handling:** Address immediately and thoroughly

### Important Cascades
Significantly affect quality:
- Character relationship nuances
- Thematic reinforcement
- Pacing and tension
- Foreshadowing and setup

**Handling:** Address before considering revision complete

### Enhancement Cascades
Improve coherence and polish:
- Subtle callbacks
- Metaphorical consistency
- Voice refinements
- Atmospheric details

**Handling:** Address as time permits

### Optional Cascades
Nice but not necessary:
- Extra resonances
- Additional layers
- Bonus connections
- Easter eggs

**Handling:** Note for future polish passes

## Cascade Task Management

### Task Creation Format

```markdown
### Cascade Task: [Brief Description]
**Trigger:** [What change created this need]
**Location:** Chapter X, Scene Y
**Type:** Critical/Important/Enhancement/Optional
**Dependencies:** [What must be done first]

**Specific Changes Needed:**
- [ ] Update dialogue to reflect new knowledge
- [ ] Adjust character reaction
- [ ] Modify scene outcome

**Validation:** [How to verify success]
```

### Prioritization Matrix

| Impact ↓ / Effort → | Low Effort | Medium Effort | High Effort |
|---------------------|------------|---------------|-------------|
| **Critical**        | Do First   | Do Second     | Plan Carefully |
| **Important**       | Do Third   | Do Fourth     | Consider Simplifying |
| **Enhancement**     | Quick Wins | If Time       | Usually Skip |
| **Optional**        | If Trivial | Rarely        | Never |

### Tracking System

```markdown
## Cascade Tracking - [Revision Name]

### Statistics
- Total Tasks Identified: 24
- Critical: 5 (3 complete)
- Important: 12 (8 complete)
- Enhancement: 7 (2 complete)

### In Progress
- [Task]: 75% complete, blocked by [dependency]

### Completed Today
- ✓ Updated Maya's dialogue in Ch 12
- ✓ Fixed timeline reference in Ch 15
- ✓ Adjusted foreshadowing in Ch 10

### Blocked
- [ ] Can't update Ch 18 until Ch 16 decision made

### New Discoveries
- Found additional dependency in Ch 22
- Theme connection stronger than expected
```

## Cascade Patterns

### Common Cascade Types

#### Knowledge Cascades
When characters learn something differently:
1. Map who knows what when
2. Track information spread
3. Update decisions based on knowledge
4. Adjust reactions and relationships

#### Motivation Cascades
When character goals change:
1. Identify all goal-directed actions
2. Reassess character decisions
3. Update conflict dynamics
4. Revise resolution satisfaction

#### Timeline Cascades
When event timing shifts:
1. Update all date/time references
2. Check travel and communication logic
3. Verify cause-effect sequences
4. Adjust pacing and tension

#### Relationship Cascades
When character dynamics change:
1. Map all interaction points
2. Update dialogue tone
3. Adjust trust and conflict levels
4. Revise emotional beats

## Cascade Containment

### Strategies to Limit Cascades

#### Isolation Techniques
- Make changes at natural break points
- Use scene boundaries as firewalls
- Contain changes within subplots
- Limit knowledge to specific characters

#### Compatibility Approaches
- Design changes to work with existing elements
- Find interpretations that don't break logic
- Use ambiguity to allow multiple readings
- Build on rather than replace

#### Phased Implementation
- Change only what's essential first
- Test minimal version
- Expand if successful
- Stop when good enough

### When to Accept Cascades

Sometimes cascades improve the story:
- When they solve multiple problems
- When they strengthen connections
- When they deepen meaning
- When they feel inevitable

## Integration with Revision Process

This protocol connects to:
- [Pre-change Analysis](revision-analysis.md) - Predicts cascades
- [Implementation](revision-implementation.md) - Executes cascade tasks
- [Monitoring](revision-monitoring.md) - Tracks cascade completion
- [Records](revision-records.md) - Documents cascade decisions

## Relationships
- **Parent Node:** [revision.md]
- **Related Nodes:**
  - [revision-implementation.md] - executes - Cascade tasks implemented here
  - [revision-problems.md] - prevents - Cascade management prevents problems
  - [revision-monitoring.md] - tracks - Monitors cascade progress

## Metadata
- **Created:** 2025-01-18
- **Last Updated:** 2025-01-18
- **Updated By:** Assistant
- **Version:** 1.0