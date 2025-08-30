# Test Infrastructure Key Locations

## Classification
- **Domain**: Development Infrastructure  
- **Stability**: Stable
- **Abstraction**: Location Index
- **Confidence**: Established

## Purpose
Document key locations in the test infrastructure to enable quick navigation and understanding of testing configuration.

## Core Configuration Files

### Test Framework Configuration
- **What**: Vitest configuration and TypeScript integration
- **Where**: `vitest.config.ts`
- **Significance**: Controls test execution, coverage, and TypeScript processing
- **Key aspects**: ESM support, TypeScript transformation, coverage settings

### Linting Configuration for Tests  
- **What**: ESLint patterns and test file handling
- **Where**: `.eslintrc.json:47-55`
- **Significance**: Determines which test files are linted and how
- **Key patterns**: 
  - `__tests__/**` ignored for environment tests
  - `**/*.test.ts` ignored for unit tests
  - TypeScript parser integration

### Package Scripts
- **What**: Test execution and related commands
- **Where**: `package.json` scripts section
- **Key commands**:
  - `npm test` - Run all tests with Vitest
  - `npm run test:coverage` - Generate coverage reports
  - `npm run test:watch` - Run tests in watch mode

## Test File Locations

### Unit Tests
- **Pattern**: `src/*.test.ts`
- **Example**: `src/index.test.ts`
- **Purpose**: Test individual class/function behavior
- **Co-location**: Alongside source files for discoverability

### Integration Tests  
- **Location**: `__tests__/integration.test.ts`
- **Purpose**: Test workflows with mocking
- **Approach**: Mock external dependencies and file system

### Environment Tests
- **Location**: `__tests__/environment-setup.test.ts`
- **Purpose**: Validate development environment configuration
- **Optimization**: Uses beforeAll caching for performance

## Key Implementation Patterns

### Error Handling Test Locations
- **Initialization errors**: `src/index.test.ts:33-37` (double-init prevention)
- **Uninitialized state errors**: Multiple test cases covering all interface methods
- **Configuration validation**: Currently not implemented, would go in `src/index.test.ts`

### Mocking Patterns
- **File system mocking**: `__tests__/integration.test.ts:7-14`
- **Child process mocking**: `__tests__/integration.test.ts:16-23`
- **Mock cleanup**: `beforeEach` hooks with `vi.clearAllMocks()`

### Performance Optimization Locations
- **File caching setup**: `__tests__/environment-setup.test.ts:25-35`
- **Cached data usage**: Throughout environment tests, replacing individual file reads

## Build Integration Points

### TypeScript Compilation
- **Configuration**: `tsconfig.json` affects test compilation
- **Test exclusion**: Tests not included in main build output
- **Type checking**: Tests included in `npm run typecheck`

### ESBuild Integration
- **Build output**: `dist/` directory created by build
- **Test verification**: Environment tests validate build outputs exist
- **External dependencies**: `--external` flags affect what can be tested

## Coverage and Reporting

### Coverage Configuration
- **Tool**: Built into Vitest
- **Output**: `coverage/` directory
- **Exclusions**: Test files themselves excluded from coverage

### Reporting Integration
- **Format**: HTML and text reports
- **CI/CD**: Coverage data can be exported for external reporting
- **Thresholds**: Can be configured in vitest.config.ts

## Related Infrastructure

### Git Hooks
- **Pre-commit**: Can run tests via husky configuration
- **Commit message**: lint-staged can enforce test requirements

### Development Workflow
- **Watch mode**: Tests run automatically on file changes
- **Hot reload**: Vitest supports fast re-execution
- **Debugging**: Source map support for debugging tests

## Discovery Context
- **Created during**: Test review recommendations implementation
- **Key discovery**: ESLint ignore patterns needed updating for new test locations  
- **Performance insight**: File caching more effective than async conversion for test suite
- **Mocking insight**: vi.mock syntax enables comprehensive integration testing without side effects

## See Also
- [[Testing Strategy]] - Overall testing approach and patterns
- [[Build System Configuration]] - How build system affects testing
- [[Development Workflow]] - Testing as part of development cycle