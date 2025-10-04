# Agent Development Workflow

## Purpose
Defines the comprehensive workflow and templates for LLM agent-driven development of the Pliers platform.

## Classification
- **Domain:** Process
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Evolving

## Overview

This document establishes the standardized approach for LLM agents to implement features, fix bugs, and maintain the Pliers codebase. The workflow emphasizes thorough context understanding, incremental development, and comprehensive documentation.

## Agent Development Principles

### Context-First Development
1. **Always start with context review** - Agents must read relevant context network documents before beginning work
2. **Understand before implementing** - No coding without thorough understanding of requirements and architecture
3. **Document discoveries** - Record any insights or clarifications in the context network
4. **Validate understanding** - Confirm approach before implementation when uncertain

### Incremental and Testable
1. **Small, focused changes** - Implement features in small, testable increments
2. **Test-driven development** - Write tests before or alongside implementation
3. **Continuous integration** - Ensure all changes pass existing tests
4. **Documentation updates** - Update documentation alongside code changes

### Quality and Maintainability
1. **Follow established patterns** - Use existing architectural patterns and conventions
2. **Code review standards** - All code must meet defined quality standards
3. **Performance awareness** - Consider performance implications of all changes
4. **Security consciousness** - Apply security best practices throughout development

## Agent Task Types

### Feature Implementation Tasks
Complete implementation of new functionality following specification.

#### Task Template: Feature Implementation
```markdown
# Feature Implementation: [Feature Name]

## Context Requirements
**MUST READ BEFORE STARTING:**
- [Relevant architecture docs]
- [Related component specifications]
- [Dependency documentation]
- [Testing guidelines]

## Objective
[Clear, specific description of what needs to be implemented]

## Acceptance Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

## Technical Specifications
### Architecture Integration
- **Component Type:** [Core/Plugin/Integration]
- **Dependencies:** [List of required components]
- **Integration Points:** [How this integrates with existing system]

### Implementation Details
- **Primary Files:** [List of files to create/modify]
- **Database Changes:** [Any schema changes required]
- **API Changes:** [Any API modifications]
- **Configuration Changes:** [Any config updates needed]

### Testing Requirements
- **Unit Tests:** [Specific tests to implement]
- **Integration Tests:** [Integration scenarios to cover]
- **Performance Tests:** [Performance criteria to meet]

## Implementation Approach
1. [Step 1: Detailed implementation step]
2. [Step 2: Detailed implementation step]
3. [Step 3: Detailed implementation step]

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] Code follows established patterns
- [ ] Documentation updated
- [ ] Performance requirements met
- [ ] Security review completed
- [ ] Integration tests passing
```

### Bug Fix Tasks
Resolution of identified issues with root cause analysis.

#### Task Template: Bug Fix
```markdown
# Bug Fix: [Bug Title]

## Context Requirements
**MUST READ BEFORE STARTING:**
- [Bug report and reproduction steps]
- [Related component documentation]
- [System architecture overview]
- [Testing guidelines]

## Problem Description
### Symptoms
[Detailed description of the bug symptoms]

### Expected Behavior
[What should happen instead]

### Impact Assessment
- **Severity:** [Critical/High/Medium/Low]
- **Affected Users:** [Who is impacted]
- **Workaround Available:** [Yes/No - describe if yes]

## Root Cause Analysis Requirements
- [ ] Reproduce the issue consistently
- [ ] Identify root cause in code
- [ ] Determine why existing tests didn't catch this
- [ ] Assess broader impact of the issue

## Fix Specifications
### Technical Approach
[Detailed description of the fix approach]

### Files to Modify
- [File 1: What changes and why]
- [File 2: What changes and why]

### Testing Strategy
- [ ] Add test to prevent regression
- [ ] Verify fix resolves original issue
- [ ] Ensure no new issues introduced
- [ ] Test edge cases

## Implementation Steps
1. [Step 1: Reproduce and analyze]
2. [Step 2: Implement fix]
3. [Step 3: Test thoroughly]

## Definition of Done
- [ ] Root cause identified and documented
- [ ] Fix implemented and tested
- [ ] Regression test added
- [ ] No new issues introduced
- [ ] Documentation updated if needed
```

### Refactoring Tasks
Code improvement and architectural enhancement tasks.

#### Task Template: Refactoring
```markdown
# Refactoring: [Component/Area Name]

## Context Requirements
**MUST READ BEFORE STARTING:**
- [Current implementation documentation]
- [Architecture guidelines]
- [Performance requirements]
- [Testing standards]

## Refactoring Objectives
### Current Issues
[Description of current problems or limitations]

### Desired Outcomes
- [Outcome 1: Specific improvement]
- [Outcome 2: Specific improvement]
- [Outcome 3: Specific improvement]

## Scope and Constraints
### In Scope
- [What will be refactored]

### Out of Scope
- [What will NOT be changed]

### Constraints
- [Backward compatibility requirements]
- [Performance requirements]
- [Timeline constraints]

## Technical Approach
### Architecture Changes
[Description of architectural improvements]

### Implementation Strategy
[How to implement changes safely]

### Migration Plan
[How to migrate existing code/data]

## Risk Assessment
### Potential Risks
- [Risk 1: Description and mitigation]
- [Risk 2: Description and mitigation]

### Testing Strategy
- [ ] Comprehensive test coverage
- [ ] Performance benchmarking
- [ ] Backward compatibility testing

## Implementation Steps
1. [Step 1: Preparation and analysis]
2. [Step 2: Incremental changes]
3. [Step 3: Validation and cleanup]

## Definition of Done
- [ ] All objectives achieved
- [ ] No functionality regression
- [ ] Performance improved or maintained
- [ ] Test coverage maintained/improved
- [ ] Documentation updated
```

## Agent Workflow Process

### Phase 1: Context and Understanding (Required)

```markdown
## Context Review Checklist
- [ ] Read task specification completely
- [ ] Review all referenced context network documents
- [ ] Understand component architecture and dependencies
- [ ] Review existing code in affected areas
- [ ] Identify integration points and potential impacts
- [ ] Clarify any ambiguous requirements

## Understanding Validation
- [ ] Can explain the task in your own words
- [ ] Understand how this fits into overall architecture
- [ ] Know what success looks like
- [ ] Identified potential risks or complications
- [ ] Have clear implementation approach

## Documentation Requirements
- [ ] Record any discoveries or insights
- [ ] Update context network if gaps found
- [ ] Note any architectural decisions made
```

### Phase 2: Planning and Design

```markdown
## Implementation Planning
- [ ] Break down task into incremental steps
- [ ] Identify all files that need modification
- [ ] Plan testing approach
- [ ] Consider performance implications
- [ ] Design error handling approach

## Design Review
- [ ] Implementation follows established patterns
- [ ] Design supports future extensibility
- [ ] Security considerations addressed
- [ ] Performance impact assessed
```

### Phase 3: Implementation

```markdown
## Development Standards
- [ ] Follow TypeScript strict mode guidelines
- [ ] Use Zod for all schema validation
- [ ] Implement comprehensive error handling
- [ ] Add appropriate logging and monitoring
- [ ] Follow existing code style and patterns

## Incremental Development
- [ ] Implement in small, testable increments
- [ ] Run tests after each increment
- [ ] Commit working changes frequently
- [ ] Document progress in task updates
```

### Phase 4: Testing and Validation

```markdown
## Testing Requirements
- [ ] Unit tests for all new functionality
- [ ] Integration tests for component interactions
- [ ] Performance tests where applicable
- [ ] Manual testing of user scenarios
- [ ] Regression testing of affected areas

## Quality Validation
- [ ] Code follows established patterns
- [ ] All tests passing
- [ ] No linting errors or warnings
- [ ] Performance requirements met
- [ ] Security review completed
```

### Phase 5: Documentation and Completion

```markdown
## Documentation Updates
- [ ] Update relevant API documentation
- [ ] Update component specifications if needed
- [ ] Record architectural decisions made
- [ ] Update context network with discoveries

## Task Completion
- [ ] All acceptance criteria met
- [ ] Definition of done satisfied
- [ ] Code review completed
- [ ] Changes deployed/merged successfully
- [ ] Task outcome documented
```

## Quality Standards for Agents

### Code Quality Requirements

```typescript
// Example quality standards
interface CodeQualityStandards {
  // Type Safety
  strictTypeScript: boolean; // Must be true
  zodValidation: boolean; // Required for all external inputs

  // Error Handling
  comprehensiveErrorHandling: boolean;
  structuredLogging: boolean;

  // Testing
  unitTestCoverage: number; // Minimum 80%
  integrationTests: boolean; // Required for new features

  // Performance
  performanceBaseline: boolean; // Must not regress performance

  // Security
  inputValidation: boolean; // Required for all inputs
  authorizationChecks: boolean; // Required for protected operations
}
```

### Documentation Standards

```markdown
## Documentation Requirements for Agents

### Code Comments
- [ ] Complex logic explained with comments
- [ ] API methods have JSDoc documentation
- [ ] TODO comments include context and assignee

### API Documentation
- [ ] All endpoints documented
- [ ] Request/response schemas defined
- [ ] Error conditions documented
- [ ] Usage examples provided

### Context Network Updates
- [ ] Record architectural decisions
- [ ] Document discovered patterns
- [ ] Update component relationships
- [ ] Note integration challenges
```

## Error Handling and Recovery

### Common Error Scenarios

```markdown
## When Agents Encounter Issues

### Ambiguous Requirements
**Action:** Stop implementation, document ambiguity, request clarification
**Template:** "I found ambiguity in [specific area]. The requirement states [X], but this could mean [Y] or [Z]. Please clarify the intended behavior."

### Missing Dependencies
**Action:** Identify missing components, check if they should be implemented first
**Template:** "This task requires [dependency] which doesn't exist yet. Should I implement [dependency] first, or is there an alternative approach?"

### Architectural Conflicts
**Action:** Document the conflict, propose solutions, seek guidance
**Template:** "The proposed implementation conflicts with [architectural principle/pattern] because [reason]. Proposed solutions: [option 1], [option 2]. Which approach should I take?"

### Test Failures
**Action:** Analyze failures, fix issues, update tests if specifications changed
**Template:** "Tests failing due to [reason]. Analysis shows [cause]. Fixing by [approach]."
```

### Escalation Procedures

```markdown
## When to Escalate

### Immediate Escalation (Stop Work)
- Security vulnerabilities discovered
- Data loss risk identified
- Critical system impact potential
- Cannot understand requirements after thorough review

### Standard Escalation (Continue with Alternative)
- Performance concerns exceed specified limits
- Implementation approach uncertainty
- Test strategy questions
- Documentation gaps found

### Progress Updates Required
- Every 2 hours for complex tasks
- When encountering unexpected complexity
- When discovering architectural implications
- Upon completion of major milestones
```

## Collaboration Patterns

### Multi-Agent Coordination

```markdown
## When Multiple Agents Work Together

### Task Dependencies
- [ ] Clearly defined interfaces between agent tasks
- [ ] Shared components identified and coordinated
- [ ] Integration points documented
- [ ] Conflict resolution procedures established

### Communication Protocols
- [ ] Regular progress updates in shared channels
- [ ] Conflict resolution procedures defined
- [ ] Code merge strategies established
- [ ] Testing coordination planned
```

## Relationships
- **Parent Nodes:** [processes/index.md] - categorizes - Agent workflow as development process
- **Child Nodes:**
  - [processes/task_templates.md] - implements - Specific task templates
  - [processes/quality_standards.md] - defines - Agent quality requirements
- **Related Nodes:**
  - [foundation/project_definition.md] - supports - Workflow enables project objectives
  - [planning/roadmap/overview.md] - executes - Workflow executes roadmap tasks

## Navigation Guidance
- **Access Context**: Reference when assigning tasks to agents or reviewing agent work
- **Common Next Steps**: Review specific task templates or quality standards
- **Related Tasks**: Agent task creation, development coordination, quality assurance
- **Update Patterns**: Update when workflow improvements identified or new patterns emerge

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial agent development workflow with comprehensive task templates and quality standards