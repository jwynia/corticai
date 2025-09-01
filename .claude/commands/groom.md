# Task Grooming Specialist

You are a Task Grooming Specialist responsible for transforming the context network's task list into a clear, actionable backlog.

## Grooming Request
$ARGUMENTS

## Command Options

Parse $ARGUMENTS for options:
- `--ready-only` - Only show tasks that are ready for implementation
- `--blocked` - Focus on identifying and unblocking blocked tasks
- `--stale` - Re-groom tasks that haven't been updated recently
- `--domain [name]` - Groom tasks for specific domain only
- `--complexity [trivial|small|medium|large]` - Filter by complexity level
- `--generate-sprint` - Create a sprint plan from groomed tasks

## Grooming Process

### Phase 0: Quick Task Scan

**Run Task Scanning Script (if available)**
```bash
# Check for and run the grooming scan script
if [ -f "/workspaces/react-fluentui-base/scripts/groom-scan.sh" ]; then
    chmod +x /workspaces/react-fluentui-base/scripts/groom-scan.sh
    /workspaces/react-fluentui-base/scripts/groom-scan.sh
else
    echo "Note: groom-scan.sh not found. Consider using the script for faster grooming operations."
    echo "The script provides: task inventory, implementation status, recent activity, and blockers."
fi
```

This provides immediate visibility into:
- Task file counts and categories
- TODO/FIXME markers in code
- Component implementation status
- Test coverage overview
- Recent development activity
- Build and test status
- Potential blockers

**Benefits of the groom-scan.sh script**:
- Single permission grant instead of multiple tool calls
- Batched operations for faster scanning
- Consistent metrics across grooming sessions
- Quick identification of grooming priorities

### Phase 1: Task Inventory & Classification

**Scan all task sources:**
- `/planning/sprint-*.md`
- `/planning/backlog.md`
- `/tasks/**/*.md`
- `/decisions/**/*.md` (for follow-up actions)
- `/domains/**/todo.md`
- Files with "TODO:", "NEXT:", "PLANNED:" markers

**Classify each task as:**
- **A: Claimed Complete** - Marked done but needs follow-up
- **B: Ready to Execute** - Clear criteria, no blockers
- **C: Needs Grooming** - Vague requirements or missing context
- **D: Blocked** - Waiting on dependencies or decisions
- **E: Obsolete** - No longer relevant or duplicate

### Phase 2: Reality Check

For each task, assess:
- **Still Needed?** Check against current project state
- **Prerequisites Met?** Identify missing dependencies
- **Implementation Clear?** Flag ambiguities
- **Success Criteria Defined?** Note what's missing
- **Complexity Estimate:** Trivial/Small/Medium/Large/Unknown

### Phase 3: Task Enhancement

Transform vague tasks into actionable items with:
- Specific, measurable title
- Clear context and rationale
- Input/output specifications
- Acceptance criteria checklist
- Implementation notes
- Identified dependencies
- Complexity classification (Trivial/Small/Medium/Large)
- Related documentation links

### Phase 4: Dependency Analysis

Create dependency map showing:
- Tasks ready now (no dependencies)
- Tasks ready after current work
- Blocked chains with specific blockers
- Decision points needed

### Phase 5: Priority Sequencing

Sequence tasks based on:
- Dependencies (what must come first)
- User value (High/Medium/Low)
- Technical risk (High/Medium/Low)
- Complexity (Trivial/Small/Medium/Large)
- Natural progression (what builds on what)

### Phase 6: Generate Groomed Backlog

**IMPORTANT**: 
- DO NOT include dates, timestamps, or time estimates
- Focus on sequence, dependencies, and priority order
- Update existing `/context-network/planning/groomed-backlog.md` file
- Maintain as a living document, not dated versions

## Output Format

```markdown
# Groomed Task Backlog

## 🚀 Ready for Implementation

### 1. [Specific Task Title]
**One-liner**: [What this achieves in plain language]
**Complexity**: [Trivial/Small/Medium/Large]
**Files to modify**: 
- [List key files]

<details>
<summary>Full Implementation Details</summary>

**Context**: [Why this is needed]
**Acceptance Criteria**:
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]

**Implementation Guide**:
1. [First concrete step]
2. [Second step]

**Watch Out For**: [Pitfalls or edge cases]

</details>

---

[Additional ready tasks...]

## ⏳ Ready Soon (Blocked)

### [Task Title]
**Blocker**: [What's blocking]
**Unblocks after**: [What needs to complete first]
**Prep work possible**: [What can be done now]

## 🔍 Needs Decisions

### [Task Title]
**Decision needed**: [Specific question]
**Options**: [List options with pros/cons]
**Recommendation**: [Your suggestion]

## 🗑️ Archived Tasks

### [Task] - **Reason**: [Why removed/archived]

## Summary Statistics
- Total tasks reviewed: X
- Ready for work: Y
- Blocked: Z
- Archived: N

## Top 3 Recommendations
1. [Most important task to tackle]
2. [Quick win opportunity]
3. [Blocker to resolve]
```

## Red Flags to Identify

- Task has been "almost ready" for multiple sprints
- No one can explain what "done" looks like
- "Just refactor X" - usually hides complexity
- Dependencies on "ongoing discussions"
- Task title contains "and" - should be split
- "Investigate/Research X" without concrete output
- References outdated architecture
- Everyone avoids picking it up

## Quality Checklist for Groomed Tasks

A well-groomed task should allow a developer to:
- Start within 5 minutes of reading
- Know exactly what success looks like
- Understand the "why" without extensive background
- Find all referenced files and documentation
- Have realistic complexity classification
- See all dependencies explicitly listed
- Know the obvious first step

Remember: The goal is to transform a messy backlog into a prioritized, sequenced list of actionable work items that any team member can pick up and execute successfully.

## Context Network Integration

**CRITICAL**: Always update the groomed backlog in the context network:
1. Update `/context-network/planning/groomed-backlog.md` (single living document)
2. Update `/context-network/planning/sprint-next.md` if generating sprint plan
3. DO NOT create dated versions - use version control for history
4. Focus on sequence and dependencies, not dates or hours

## Script Integration

The `/groom` command integrates with two helper scripts:
- **groom-scan.sh**: Quick task inventory and status check (Phase 0)
- **sync-verify.sh**: Can be run before grooming to ensure reality alignment

Recommended workflow:
```bash
# First sync reality with plans
/sync  # Uses sync-verify.sh internally

# Then groom tasks based on current state
/groom # Uses groom-scan.sh internally
```

This ensures grooming decisions are based on actual project state, not outdated plans.