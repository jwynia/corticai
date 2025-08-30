# Code Review Checklist

## Classification
- **Domain**: Development Process
- **Stability**: Evolving  
- **Abstraction**: Process
- **Confidence**: Established

## Purpose
Standardize code review criteria based on issues discovered during development to ensure consistent quality and prevent common problems.

## Pre-Review Requirements

### Test Coverage Verification
- [ ] **Unit tests exist** for all new public methods and classes
- [ ] **Error conditions tested** including initialization failures and invalid states  
- [ ] **Configuration handling tested** including immutability and validation
- [ ] **State management tested** for lifecycle operations (init/shutdown)
- [ ] **All tests pass** and don't execute real external commands

### Code Quality Basics
- [ ] **No unused imports** or variables
- [ ] **Proper error handling** with meaningful error messages
- [ ] **ESLint passes** without warnings or errors
- [ ] **TypeScript compilation succeeds** with strict mode
- [ ] **Build succeeds** and produces expected artifacts

## Functional Review Areas

### Interface Design
- [ ] **Public interfaces well-defined** with proper TypeScript types
- [ ] **Error states clearly documented** and consistently handled
- [ ] **Configuration patterns consistent** across components
- [ ] **Async patterns properly implemented** with appropriate error handling

### Architecture Compliance  
- [ ] **Follows established patterns** from existing codebase
- [ ] **Dependencies properly managed** and externalized where appropriate
- [ ] **Separation of concerns maintained** between different responsibilities
- [ ] **Integration points well-defined** and testable

### Performance Considerations
- [ ] **No obvious performance bottlenecks** like unnecessary file I/O
- [ ] **Resource cleanup implemented** for stateful components
- [ ] **Caching strategies applied** where appropriate
- [ ] **External command execution avoided** in test code

## Testing Quality Review

### Unit Test Quality
- [ ] **Tests are focused** and test one thing at a time  
- [ ] **Test names clearly describe** what is being tested
- [ ] **Error scenarios covered** including edge cases
- [ ] **Mock usage appropriate** and not over-mocking
- [ ] **Test data realistic** and representative

### Integration Test Quality  
- [ ] **External dependencies mocked** to avoid side effects
- [ ] **Realistic scenarios tested** that reflect actual usage
- [ ] **Both success and failure paths** covered
- [ ] **Mock cleanup proper** between tests

### Environment Test Optimization
- [ ] **File reads minimized** using caching or beforeAll hooks
- [ ] **External command execution** justified and necessary
- [ ] **Performance acceptable** for development workflow

## Documentation Review

### Code Documentation
- [ ] **Complex logic commented** with reasoning
- [ ] **Public APIs documented** with TypeScript docs
- [ ] **Error conditions explained** in comments where not obvious
- [ ] **TODO comments include** context and timeline

### Test Documentation
- [ ] **Test organization clear** with descriptive describe blocks
- [ ] **Test purpose obvious** from test names and structure
- [ ] **Mock setup documented** where complex

## Configuration Review

### Build Configuration
- [ ] **TypeScript configuration appropriate** for the component
- [ ] **ESLint rules consistently applied** and ignore patterns justified
- [ ] **Build outputs correct** and include necessary files
- [ ] **External dependencies properly declared**

### Test Configuration  
- [ ] **Test files properly excluded** from production builds
- [ ] **Coverage configuration appropriate** for the component
- [ ] **Mock setup consistent** with project patterns

## Anti-Patterns to Flag

### Common Issues Found
- [ ] **Unused imports or variables** (caught by linting but worth double-checking)
- [ ] **Missing error handling** for JSON parsing or file operations
- [ ] **Sync operations in tests** without performance justification
- [ ] **Real external commands** in test execution
- [ ] **Test files not properly ignored** by ESLint configuration

### Architecture Red Flags
- [ ] **Business logic mixed with** infrastructure code
- [ ] **Hard-coded file paths** or configuration values
- [ ] **Missing abstraction layers** for external dependencies
- [ ] **State management inconsistencies** across components

## Review Process

### For Reviewers
1. **Run the code locally** including tests and build
2. **Check coverage reports** to identify gaps
3. **Verify error handling** by reading test cases
4. **Consider maintenance burden** of new patterns introduced

### For Authors  
1. **Self-review against checklist** before requesting review
2. **Include test run results** in pull request description
3. **Document any deviations** from established patterns
4. **Highlight areas needing** specific reviewer attention

## Quality Gates

### Must Pass Before Merge
- All tests pass locally and in CI
- ESLint and TypeScript checks pass
- Build produces expected artifacts
- Coverage meets project standards (target: >90% for new code)

### Recommended Before Merge
- Performance tests run if applicable
- Integration tests validate realistic scenarios  
- Error handling tested in isolation
- Documentation updated for public interfaces

## Improvement Feedback

### Common Improvement Areas
- **Test naming**: More descriptive test names improve maintainability
- **Error messages**: Specific error messages aid debugging  
- **Configuration validation**: Validate inputs at boundaries
- **Resource cleanup**: Ensure proper cleanup in async operations

### Positive Patterns to Reinforce
- **Co-located unit tests** improve discoverability
- **Mock-based integration tests** enable reliable testing
- **beforeAll optimization** improves test performance
- **Comprehensive error testing** prevents production issues

## Discovery Context
- **Created during**: Test review recommendations implementation
- **Based on issues found**: Missing unit tests, unused imports, sync file operations
- **Key insight**: Test coverage gaps are critical and easily missed
- **Process improvement**: Standardize review criteria to prevent repetition

## Related Processes
- [[Testing Strategy]] - Standards for different types of tests
- [[Development Workflow]] - How code review fits into development cycle  
- [[Quality Assurance]] - Broader quality standards and practices

## Maintenance Notes
- Update checklist based on new issues discovered in reviews
- Adjust quality gates based on team feedback and project evolution
- Consider automating checkable items through CI/CD pipeline