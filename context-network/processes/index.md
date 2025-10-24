# Process Documentation Index

## Purpose
Central navigation for all development processes, workflows, and methodologies.

## Development Processes

### Quality Assurance
- **[Testing Strategy](./testing-strategy.md)** - Unit-test-first approach, architecture requirements
  - **Philosophy**: Integration tests are a code smell
  - **Approach**: Unit tests only, refactor for testability
  - **Key Principle**: If it's hard to unit test, the design is wrong
  - **Status**: Active, being enforced
- **[Testing Strategy (Legacy)](./testing_strategy.md)** - Previous testing approach
- **[TDD Guidelines](./tdd-guidelines.md)** - Test-driven development practices

### Code Quality
- **[Code Review Workflow](./code-review-workflow.md)** - PR review process
- **[Code Review Checklist](./code_review_checklist.md)** - Review quality gates

### Development Workflow
- **[Creation](./creation.md)** - Feature creation process
- **[Validation](./validation.md)** - Validation and verification processes
- **[Delivery](./delivery.md)** - Deployment and delivery processes
- **[Document Integration](./document_integration.md)** - Documentation workflow

### Release and Distribution
- **[NPM Publishing](./npm-publishing.md)** - Publishing to GitHub Package Registry
  - **Registry**: GitHub Package Registry (npm.pkg.github.com)
  - **Package**: @corticai/corticai (scoped package)
  - **Automation**: GitHub Actions workflow
  - **Methods**: Automated releases and manual publishing

## Key Process Principles

### Testing Philosophy
> **Core Principle**: If you need integration tests, your architecture is wrong.

**Why Integration Tests Are Harmful**:
- Indicate tight coupling to infrastructure
- Mask architectural problems
- Slow and brittle
- Don't prove correctness

**What to Do Instead**:
1. Extract business logic from infrastructure
2. Use dependency injection
3. Create repository interfaces
4. Keep I/O at edges
5. Unit test pure logic

See: [testing-strategy.md](./testing-strategy.md) and [../architecture/testability-issues.md](../architecture/testability-issues.md)

### Code Review Focus
- Architecture and design patterns
- Testability (can it be unit tested?)
- Single responsibility adherence
- Proper abstraction and coupling

See: [code-review-workflow.md](./code-review-workflow.md)

### TDD Workflow
1. Write failing test
2. Make it pass (minimal code)
3. Refactor for design
4. Repeat

See: [tdd-guidelines.md](./tdd-guidelines.md)

## Process Improvements

### Recent Changes
- **2025-10-05**: Updated testing strategy - integration tests removed from CI/CD
- **2025-10-05**: Documented testability issues and architectural solutions
- **2025-10-01**: Enhanced code review workflow with architectural checks

### Ongoing Improvements
- [ ] Refactor codebase for unit testability (storage layer)
- [ ] Establish hexagonal architecture patterns
- [ ] Create ADRs for architectural decisions

## Quick Navigation

### By Activity
- **Writing Tests**: [testing-strategy.md](./testing-strategy.md)
- **Code Review**: [code-review-workflow.md](./code-review-workflow.md)
- **Creating Features**: [creation.md](./creation.md)
- **Deploying**: [delivery.md](./delivery.md)
- **Publishing Packages**: [npm-publishing.md](./npm-publishing.md)

### By Role
- **Developers**: testing-strategy.md, tdd-guidelines.md, creation.md
- **Reviewers**: code-review-workflow.md, code_review_checklist.md
- **Architects**: ../architecture/testability-issues.md

## Related Documentation
- **Architecture**: [../architecture/index.md](../architecture/index.md)
- **Technical Decisions**: [../decisions/index.md](../decisions/index.md)
- **Planning**: [../planning/index.md](../planning/index.md)
- **Task Tracking**: [../tasks/process-improvement/](../tasks/process-improvement/)

## Maintenance

**Last Updated**: 2025-10-22
**Next Review**: When process changes occur

### Update Triggers
- New processes introduced
- Process improvements identified
- Team feedback on workflows
- Quality issues found
