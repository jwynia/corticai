# Code Review Workflow Process

**Status**: Established
**Last Updated**: 2025-10-01
**Confidence**: High (validated through execution)

## Overview

This document captures the proven workflow for conducting systematic code reviews and intelligently applying recommendations through triage.

## Process Phases

### Phase 1: Review Execution

**Goal**: Identify code quality, security, and performance issues

**Steps**:
1. Determine review scope (uncommitted, staged, branch, all)
2. Scan for code files matching patterns (exclude tests initially)
3. Read and analyze each file for:
   - Security vulnerabilities (hardcoded secrets, injection risks)
   - Performance issues (inefficient algorithms, unnecessary operations)
   - Code quality (duplication, complexity, maintainability)
   - Error handling (unhandled cases, silent failures)
   - Code standards (naming, types, patterns)

**Quality Criteria**:
- Provide file path and line numbers
- Include code snippets showing issues
- Suggest specific improvements with examples
- Assign severity (Critical/High/Medium/Low)

**Output**: Structured review report with categorized findings

### Phase 2: Recommendation Triage

**Goal**: Split recommendations into immediate actions vs. deferred tasks

**Triage Decision Matrix**:

```
APPLY NOW if ALL of:
├─ Effort: Trivial (< 5 min) or Small (< 30 min)
├─ Risk: Low (documentation, logging, isolated cleanup)
├─ Dependencies: Independent or Local only
├─ Clear fix is obvious
└─ Won't break existing functionality

DEFER TO TASK if ANY of:
├─ Effort: Medium (30-60 min) or Large (> 60 min)
├─ Risk: Medium (logic changes) or High (architecture, APIs)
├─ Dependencies: System-wide or requires team discussion
├─ Requires design decisions
├─ Needs performance benchmarking
├─ Could introduce breaking changes
└─ Touches critical business logic
```

**Assessment Dimensions**:

1. **Effort Required**:
   - Trivial: < 5 minutes, single line changes
   - Small: 5-30 minutes, single file
   - Medium: 30-60 minutes, 2-3 files
   - Large: > 60 minutes, multiple files/systems

2. **Risk Level**:
   - Low: Style, documentation, isolated cleanup
   - Medium: Logic changes, refactoring with tests
   - High: Architecture, external APIs, data handling

3. **Dependencies**:
   - Independent: Can be done in isolation
   - Local: Requires understanding of immediate context
   - System: Requires broader architectural knowledge
   - Team: Needs discussion or approval

### Phase 3: Apply Immediate Fixes

**Scope**: Only Low risk + Small effort items

**Approach**:

1. **Documentation/Style Changes**:
   - Apply directly
   - Verify formatting/linting passes
   - Example: Fix TODO comments, add missing comments

2. **Safe Error Handling**:
   - Add logging to existing catch blocks
   - Improve error messages
   - Add conditional error checking
   - Example: Log non-404 errors instead of silently ignoring all

3. **Simple Refactoring** (if tests exist):
   - Make incremental changes
   - Run tests after each change
   - Keep changes isolated
   - Example: Extract constants, improve variable names

**Validation**:
- Type checking must pass
- Build must succeed
- Run relevant test suite
- No regressions detected

### Phase 4: Create Deferred Tasks

**Goal**: Ensure deferred recommendations are actionable and tracked

**Task Document Structure**:

```markdown
# [Clear, Actionable Title]

**Created**: [Date]
**Priority**: [High/Medium/Low]
**Effort**: [Estimate with rationale]
**Type**: [Bug/Refactoring/Performance/Security/Tech Debt]

## Original Recommendation
[Quote from code review with file:line reference]

## Problems
1. [Specific issue]
2. [Impact of issue]
3. [Why it matters]

## Why Deferred
- [Specific reasons this wasn't applied immediately]
- [What makes this medium/high risk or effort]
- [What needs to be figured out first]

## Proposed Solution
[Concrete approach with code examples if possible]

## Acceptance Criteria
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]

## Files to Modify
- `path/to/file.ts` (lines X-Y)

## Dependencies
[What needs to be understood or in place]

## Related
- [[concept-node]]
- [[related-task]]

## Test Strategy
[How to verify the fix works]
```

**Task Categorization**:
- `/tasks/bugs/` - Functional bugs
- `/tasks/refactoring/` - Code structure improvements
- `/tasks/tech-debt/` - Performance, scalability, maintainability
- `/tasks/features/` - New capabilities

### Phase 5: Documentation and Validation

**Create Discovery Record**:
- Document patterns found
- Note anti-patterns to avoid
- Record location insights
- Capture meta-learnings

**Update Context Network**:
- Link to related architecture decisions
- Update location indexes
- Note confidence level changes

**Validation Checklist**:
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Test suite runs (note any pre-existing failures)
- [ ] No regressions introduced
- [ ] All deferred tasks have acceptance criteria
- [ ] Discovery record created
- [ ] Changes documented

## Quality Gates

### For Immediate Application

**Must Have**:
- Clear, isolated change
- Low risk to existing functionality
- Obvious correctness
- No breaking changes

**Must Avoid**:
- Changes that require understanding broader context
- Performance optimizations without benchmarks
- API modifications
- Type system refactoring
- Anything that "might" break something

### For Deferred Tasks

**Must Have**:
- Clear acceptance criteria
- Estimated effort and risk
- Why it was deferred (rationale)
- Specific files and line numbers
- Proposed solution or approach

**Must Avoid**:
- Vague descriptions ("improve performance")
- Missing rationale for deferral
- No acceptance criteria
- Generic recommendations

## Proven Patterns from 2025-10-01 Review

### Immediate Fixes Applied

1. **Error Logging Enhancement** (`CosmosDBStorageAdapter.ts:411`)
   - Changed: Catch block now checks error code before ignoring
   - Risk: Low - only adds logging
   - Effort: Trivial - 5 lines of code

2. **Documentation Improvement** (`KuzuSecureQueryBuilder.ts:117`)
   - Changed: TODO → NOTE with backlog reference
   - Risk: None - documentation only
   - Effort: Trivial - 2 lines

3. **Error Handling Documentation** (`LocalStorageProvider.ts:84`)
   - Changed: Added performance note and error logging
   - Risk: Low - improved debugging
   - Effort: Small - 10 lines with comments

### Deferred Tasks Created

1. **High Priority**: Optimize relationship queries
   - Effort: Medium (45-60 min)
   - Risk: Medium (performance work)
   - Potential impact: 2000x improvement
   - Why deferred: Needs benchmarking, Kuzu API understanding

2. **Medium Priority**: Improve partition key distribution
   - Effort: Medium (30-60 min)
   - Risk: Medium (may need data migration)
   - Why deferred: Requires performance analysis, testing

3. **Medium Priority**: Make query limits configurable
   - Effort: Small (15-30 min)
   - Risk: Low-Medium (API change)
   - Why deferred: Needs API design decision, consistent implementation

## Metrics and Success Criteria

### Review Quality
- Issues found per 1000 lines of code
- Severity distribution (Critical/High/Medium/Low)
- False positive rate (recommendations that don't apply)

### Triage Effectiveness
- % Applied immediately (target: 20-40%)
- % Properly deferred (target: 60-80%)
- Task completion rate for deferred items

### Time Investment
- Review time per file
- Immediate fix time per recommendation
- Task creation time per deferred item
- Total time vs. value delivered

### From 2025-10-01 Review
- **Files reviewed**: 4 (1,700+ LOC)
- **Issues identified**: 9
- **Applied immediately**: 3 (33%)
- **Properly deferred**: 6 (67%)
- **Time investment**: ~2 hours total
- **Value**: Prevented bugs + 6 tracked improvements

## Common Pitfalls to Avoid

### During Review
❌ Reviewing code you haven't read carefully
❌ Suggesting changes without understanding context
❌ Focusing only on style issues
❌ Missing security implications
❌ Not providing concrete examples

### During Triage
❌ Applying "quick fixes" without understanding impact
❌ Deferring everything to avoid risk
❌ Creating vague tasks that won't be actionable
❌ Not documenting why something was deferred
❌ Ignoring effort/risk assessment

### During Application
❌ Making multiple unrelated changes in one commit
❌ Skipping validation steps
❌ Not running tests
❌ Changing behavior instead of just improving code
❌ Introducing new dependencies

## Tools and Techniques

### Static Analysis
- TypeScript compiler for type issues
- ESLint for code style and common errors
- Custom security pattern matching

### Manual Review Focus Areas
- Error handling strategies
- Performance characteristics vs. data structure
- Type safety escape hatches (as any)
- Configuration in code vs. external
- Security vulnerabilities

### Validation Tools
- `npm run type-check` - TypeScript validation
- `npm run build` - Build verification
- `npm test` - Test suite
- `npm run lint` - Style checking

## Related Processes

- [[task-management]] - How to track and prioritize tasks
- [[architecture-decisions]] - When review finds design issues
- [[performance-optimization]] - Benchmarking and optimization process
- [[security-review]] - Dedicated security analysis

## Continuous Improvement

After each review:
1. Note what patterns were easy/hard to spot
2. Record false positives to refine future reviews
3. Update this process with learnings
4. Track completion rate of deferred tasks
5. Measure impact of applied fixes

## Template Usage

See `/tasks/tech-debt/` and `/tasks/refactoring/` for examples of well-structured task documents created from this process.

---
**Process Owner**: Development team
**Review Frequency**: After significant code review sessions
**Success Metric**: High-quality, actionable recommendations with appropriate triage
