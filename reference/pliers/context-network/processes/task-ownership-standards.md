# Task Ownership Standards

## Purpose
This document establishes absolute standards for task ownership and responsibility to prevent the common anti-pattern of agents declaring tasks complete while regressions exist.

## Classification
- **Domain:** Process
- **Stability:** Stable
- **Abstraction:** Structural
- **Confidence:** Established

## The Fundamental Principle
**When you accept a task, you own ALL system state changes from that moment until task completion.**

## Defining "Your Changes"

### Wrong Definition (Too Narrow)
LLMs consistently narrow "their changes" to:
- The last file edited
- The specific function modified
- Direct code changes they remember
- Changes that "seem related" to the task

### Correct Definition (Complete Ownership)
"Your changes" = ENTIRE DELTA from task start to current state

This includes:
- Every file modification
- Every package.json update
- Every npm install side effect
- Every configuration change
- Every test that started failing
- Every warning that appeared
- Every build error that emerged

## The Task Timeline

```
TASK START (Baseline)
├── Build: ✅ PASSING
├── Tests: ✅ ALL PASSING
├── Warnings: 3 documented
│
├── [You work on the task]
├── [You update packages]
├── [You modify code]
├── [You run commands]
├── [Side effects occur]
│
CURRENT STATE
├── Build: ??? (MUST BE ✅)
├── Tests: ??? (MUST BE ✅)
└── Warnings: ??? (MUST BE ≤3 or documented)
```

If current state is worse than baseline, task is NOT complete.

## Common Scope-Narrowing Patterns

### Pattern 1: "I just changed X"
- LLM: "I just modified the FormRenderer component"
- Reality: Also ran npm install, updating 47 dependencies
- Result: Tests failing due to React version change
- Responsibility: YOU own this - it happened during your task

### Pattern 2: "Working on feature Y"
- LLM: "I'm only implementing user authentication"
- Reality: Changed global axios config for auth headers
- Result: API tests failing due to header conflicts
- Responsibility: YOU own this - your task caused it

### Pattern 3: "Only touched module Z"
- LLM: "I only worked in the api module"
- Reality: Updated TypeScript types used by web module
- Result: Web module compilation failing
- Responsibility: YOU own this - your changes triggered it

## The Worktree Rule

If you're in worktree `task-xyz-feature`:
- Everything that changed in that worktree is YOUR responsibility
- Every regression from main branch is YOUR problem
- Every new failure is YOUR task's fault

It doesn't matter:
- Which specific files you remember editing
- What the ticket description says
- What seems "related" or "unrelated"
- What order changes happened in

## Proving Pre-Existence

The ONLY way to claim a failure isn't your responsibility:

```bash
# 1. Stash all your changes
git stash --all

# 2. Checkout the exact commit where you started
git checkout <commit-when-task-started>

# 3. Clean install
rm -rf node_modules package-lock.json
npm install

# 4. Run the failing test
npm test -- <specific-failing-test>

# 5. If it fails here, it pre-existed
# 6. If it passes here, YOU broke it
```

Without this proof, you own the failure.

## Task Completion Verification

Before marking task complete:

1. **Document baseline** (should be done at task start):
   - Commit hash where task started
   - Build/test status at that point
   - Existing warning count

2. **Compare current to baseline**:
   - No new build failures
   - No new test failures
   - No new undocumented warnings

3. **If regression exists**:
   - Find root cause
   - Fix it
   - Re-verify

## The Psychology of Excuses

### Why LLMs Generate Excuses
Training data contains thousands of examples where developers:
- Rationalize why failures aren't their problem
- Scope their responsibility narrowly
- Provide reasonable-sounding justifications
- Get away with not fixing things

### Breaking the Pattern
The rule must be so simple and absolute that no rationalization can override it:
- **Tests passed at task start → Tests must pass at task end**
- **No exceptions, no excuses, no rationalization**

## Enforcement

This is not a guideline or best practice. This is a requirement.
Tasks with regressions are incomplete tasks.
Incomplete tasks are not delivered.

## Common Anti-Patterns to Reject

### "The failing test is in a different module"
- **Why it sounds reasonable**: Modular architecture should isolate changes
- **Why it's wrong**: Your changes affected the system state in a way that broke it
- **Response**: Fix it

### "I didn't touch that code"
- **Why it sounds reasonable**: You can list exactly what files you edited
- **Why it's wrong**: Your task changed something that code depends on
- **Response**: Fix it

### "This was probably failing before"
- **Why it sounds reasonable**: Some tests are flaky
- **Why it's wrong**: Without proof of pre-existence, you own it
- **Response**: Prove it was failing at task start, or fix it

### "This doesn't affect the feature I'm implementing"
- **Why it sounds reasonable**: Features should be independent
- **Why it's wrong**: The codebase is an integrated system
- **Response**: Fix it

### "CI is different from local environment"
- **Why it sounds reasonable**: Environment differences exist
- **Why it's wrong**: Both environments must work
- **Response**: Fix both

## Technical Debt Documentation Requirements

When a warning CANNOT be fixed without worse consequences:

```javascript
// TECHNICAL DEBT: [Exact warning message]
// Task: [TASK-ID] (when this was introduced/discovered)
// Cannot fix because: [Specific technical reason with evidence]
// Attempted fix causes: [Specific worse problem with proof]
// Baseline check: [Status at task start - was this warning present?]
// Tracking issue: #[issue-number]
// Date acknowledged: [YYYY-MM-DD]
// @ts-ignore - Acknowledged technical debt
```

All elements are required. Missing any element = undocumented warning = incomplete task.

## Real-World Examples

### Example 1: Package Update Side Effect
```
Task: Add date picker component
Action: npm install react-datepicker
Side Effect: React updated from 18.2.0 to 18.3.0
Result: 12 snapshot tests failing due to React changes
Excuse: "I only added a date picker, snapshots are unrelated"
Reality: YOUR npm install during YOUR task caused the React update
Resolution: Update snapshots or lock React version
```

### Example 2: Global Configuration Change
```
Task: Add API authentication
Action: Modified axios default headers
Side Effect: All API mocks now expect auth headers
Result: 25 API tests failing due to missing headers in mocks
Excuse: "I only worked on auth, not those other APIs"
Reality: YOUR global config change affected all API calls
Resolution: Update mocks or make auth headers conditional
```

### Example 3: Type Definition Update
```
Task: Add user preferences field
Action: Added optional 'preferences' field to User interface
Side Effect: Components using User now have TypeScript errors
Result: Build fails in 8 components that destructure User
Excuse: "I only modified the User type, not those components"
Reality: YOUR type change broke existing code contracts
Resolution: Update all affected components or make field required
```

## The Verification Protocol

### Required Scripts
All tasks must run verification scripts before completion:
- `.claude/commands/verify-task-ownership.sh` - Baseline comparison
- `npm run build` - Must succeed
- `npm run test` - Must pass

### Required Documentation
- Baseline state at task start
- Current state at task completion
- Any technical debt with complete documentation

### Required Mindset
- You own everything from task start to task end
- Regressions are your fault regardless of perceived relation
- Fix first, rationalize never

## Relationships
- **Parent Nodes:** [processes/delivery.md] - implements - Task ownership as part of delivery process
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/standards.md] - enforces - Testing standards support ownership verification
  - [elements/anti-patterns/scope-narrowing.md] - prevents - Anti-patterns that violate ownership
  - [CLAUDE.md] - codifies - Primary documentation of ownership requirements

## Navigation Guidance
- **Access Context**: Reference when starting any task or when test failures occur
- **Common Next Steps**: Review anti-patterns documentation or run verification scripts
- **Related Tasks**: Task planning, regression debugging, completion verification
- **Update Patterns**: Update when new ownership scenarios are discovered

## Metadata
- **Created:** 2025-09-27
- **Last Updated:** 2025-09-27
- **Updated By:** Build/Test Standards Implementation

## Change History
- 2025-09-27: Initial task ownership standards document creation