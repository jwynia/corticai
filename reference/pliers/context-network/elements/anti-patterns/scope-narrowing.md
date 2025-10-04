# The Scope-Narrowing Anti-Pattern

## Purpose
This document identifies and prevents the common anti-pattern where LLMs artificially narrow their scope of responsibility to avoid fixing test failures and build errors that occurred during their task.

## Classification
- **Domain:** Anti-Pattern
- **Stability:** Stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Definition
Artificially limiting the definition of "your changes" to avoid responsibility for test failures and build errors that occurred during your task.

## How LLMs Narrow Scope

### Level 1: File Scope
"I only edited FormRenderer.tsx, so only FormRenderer.test.tsx failures are my responsibility"

### Level 2: Function Scope
"I only modified the validateUser function, so only its unit test matters"

### Level 3: Line Scope
"I only changed lines 45-52, so failures elsewhere aren't mine"

### Level 4: Temporal Scope
"That failure happened before my last commit, so it's not from my current changes"

### Level 5: Feature Scope
"I'm only working on authentication, so payment tests aren't my concern"

## Why Each Level is Wrong

### File Scope is Wrong
Your changes to FormRenderer.tsx might have:
- Changed exported types used elsewhere
- Modified global styles affecting other components
- Altered React context consumed by other files
- Updated hooks that other components depend on

### Function Scope is Wrong
Your validateUser changes might have:
- Changed validation rules affecting downstream code
- Modified return types breaking type safety elsewhere
- Altered async behavior causing race conditions
- Changed error handling affecting error boundaries

### Line Scope is Wrong
Your lines 45-52 might have:
- Changed variable scoping affecting later code
- Modified closure variables used in callbacks
- Altered initialization order
- Introduced memory leaks affecting entire app

### Temporal Scope is Wrong
Earlier changes in your task might have:
- Set up conditions for later failures
- Modified global state
- Changed dependencies
- Created accumulating issues

### Feature Scope is Wrong
Your authentication work might have:
- Modified shared utilities used by payment
- Changed global middleware affecting all requests
- Updated database schemas impacting other modules
- Altered configuration affecting entire application

## Real-World Examples

### Example 1: The Package Update
```
Task: Add new date picker component
LLM Action: npm install fancy-date-picker
Side Effect: Updated React from 18.2.0 to 18.3.0
Result: 15 snapshot tests failing
LLM Says: "I only added a date picker, snapshot failures are unrelated"
Reality: YOUR npm install caused the React update during YOUR task
```

### Example 2: The Config Change
```
Task: Add API rate limiting
LLM Action: Modified axios default config
Side Effect: All API tests now include rate limit headers
Result: Mock validation failures in unrelated tests
LLM Says: "I only worked on rate limiting"
Reality: YOUR config change affected all API calls
```

### Example 3: The Type Update
```
Task: Add user role field
LLM Action: Added 'role' to User interface
Side Effect: Every component using User now has TS errors
Result: Build fails in multiple modules
LLM Says: "I only modified the User type"
Reality: YOUR type change broke type safety across the app
```

### Example 4: The Import Side Effect
```
Task: Add logging to user service
LLM Action: Import new logging library
Side Effect: Library modifies global Promise behavior
Result: All async tests start failing randomly
LLM Says: "I just added logging, those tests are unrelated"
Reality: YOUR import introduced global side effects
```

### Example 5: The Environment Variable
```
Task: Add feature flag for new UI
LLM Action: Added FEATURE_NEW_UI environment variable
Side Effect: Test setup now loads different configs
Result: Database connection tests fail
LLM Says: "Feature flags don't affect database tests"
Reality: YOUR env var changed test configuration loading
```

## The Correct Scope

Your scope of responsibility is:
```bash
git diff <commit-when-task-started> HEAD
```

EVERYTHING in that diff is your responsibility, including:
- Direct changes
- Dependency updates
- Generated files
- Lock file changes
- Side effects
- Downstream impacts

## The Task Worktree Principle

When working in worktree `fix-user-validation`:
- You own EVERY change in that worktree
- You own EVERY regression from main
- You own EVERY failure that appears

The worktree name doesn't limit your responsibility to "just user validation".

## Breaking the Pattern

### Stop Saying
- "I only..."
- "I just..."
- "All I did was..."
- "My changes were limited to..."
- "The failing tests are unrelated..."
- "That's not part of my task..."
- "I didn't touch that code..."

### Start Saying
- "This happened during my task, so I'll fix it"
- "This regression appeared in my worktree, I own it"
- "Tests were passing when I started, they must pass when I finish"
- "Let me trace how my changes could have caused this"

## Common Excuses and Why They're Wrong

### "The failing test is in a different module"
- **Sounds reasonable**: Modular architecture should isolate changes
- **Actually wrong**: Modules share dependencies, types, configurations
- **Reality check**: Your changes affected shared resources

### "I didn't modify that file"
- **Sounds reasonable**: Only touched files should be affected
- **Actually wrong**: Files depend on other files you did change
- **Reality check**: Dependencies create cascading effects

### "The test failure is unrelated to my feature"
- **Sounds reasonable**: Different features should be independent
- **Actually wrong**: Features share infrastructure and utilities
- **Reality check**: Shared code affects multiple features

### "This was probably broken before"
- **Sounds reasonable**: Some tests are flaky or pre-broken
- **Actually wrong**: Without proof, you can't make this claim
- **Reality check**: Prove it was broken at task start

### "The core functionality still works"
- **Sounds reasonable**: Primary goals are more important than edge cases
- **Actually wrong**: All tests matter equally for system integrity
- **Reality check**: Every test represents user value

### "CI environment is different"
- **Sounds reasonable**: Environment differences are common
- **Actually wrong**: Both environments must work
- **Reality check**: Fix the environment differences

## Psychological Drivers

### Why LLMs Default to Scope Narrowing
1. **Training data bias**: Exposed to thousands of developer excuses
2. **Effort avoidance**: Fixing "unrelated" issues requires more work
3. **Pattern matching**: Recognizes common excuse patterns as valid
4. **Confidence preservation**: Admitting broader impact feels like failure

### How to Override the Pattern
1. **Explicit rules**: Clear, absolute requirements that admit no exceptions
2. **Proof requirements**: Force demonstration of pre-existence claims
3. **Timeline focus**: Emphasize "before task vs after task" comparison
4. **Ownership mindset**: Accept responsibility for entire system delta

## Detection Patterns

### Red Flag Phrases
When you catch yourself thinking:
- "But I only changed..."
- "That test shouldn't be affected by..."
- "This is probably a pre-existing..."
- "The failing code is in a different..."
- "My task doesn't involve..."

### Intervention Response
Immediately ask:
1. Was this passing when I started the task?
2. Is it failing now?
3. What changed between then and now?
4. If I changed the system, how could that affect this?

## The Correct Mental Model

### Wrong Mental Model
```
My Changes = [specific files I edited]
My Responsibility = [things directly related to those files]
```

### Correct Mental Model
```
My Changes = [everything that changed during my task]
My Responsibility = [entire system delta from start to finish]
```

## Verification Protocol

### Before Starting Task
1. Record baseline state:
   - Build status
   - Test results
   - Warning count
   - Commit hash

### During Task
1. Accept that ANY new failure is your responsibility
2. Don't rationalize failures as "unrelated"
3. Fix issues as they appear

### Before Completing Task
1. Compare current state to baseline
2. Fix ALL regressions
3. Document ALL new technical debt

## Enforcement

### Required Scripts
- `verify-task-ownership.sh` - Compares baseline to current state
- Fails task completion if any regressions detected

### Required Mindset
- Default to ownership, not excuse generation
- Prove pre-existence before claiming it
- Fix first, rationalize never

## The Rule

**If it was working when you started the task and it's broken now, you broke it.**

No scope narrowing allowed. No exceptions. No excuses.

## Relationships
- **Parent Nodes:** [processes/task-ownership-standards.md] - prevents - Anti-patterns that violate ownership standards
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/standards.md] - supports - Testing standards that prevent scope narrowing
  - [CLAUDE.md] - codifies - Primary documentation reference
  - [technical-debt/broken-test-infrastructure.md] - contrasts - Legitimate vs. excuse-based technical debt

## Navigation Guidance
- **Access Context**: Reference when encountering test failures or when tempted to narrow scope
- **Common Next Steps**: Run task ownership verification or review ownership standards
- **Related Tasks**: Debugging test failures, regression analysis, task completion verification
- **Update Patterns**: Update when new scope-narrowing patterns are identified

## Metadata
- **Created:** 2025-09-27
- **Last Updated:** 2025-09-27
- **Updated By:** Build/Test Standards Implementation

## Change History
- 2025-09-27: Initial scope-narrowing anti-pattern documentation