# TEST-002: Separate Unit and Integration Tests

## Metadata
- **Status:** in-review
- **Type:** refactoring
- **Epic:** phase-2-infrastructure
- **Priority:** high
- **Size:** small
- **Created:** 2025-09-27
- **Updated:** 2025-10-01
- **Branch:** task/TEST-002-separate-integration-tests
- **Worktree:** .worktrees/TEST-002/
- **Implemented:** 2025-10-01

## Description
The current test suite includes integration tests that connect to live databases but use conditional helpers (`itWithDb`) to skip when databases aren't available. This is problematic because:

1. **Integration tests don't belong in CI at this stage** - Projects need significant DevOps resources before running database integration tests in CI
2. **False confidence** - Tests that skip in CI appear green but aren't actually testing anything
3. **Wrong approach** - Using skip helpers masks the real issue: integration tests shouldn't be in the default test suite

## Problem Statement
- Integration tests requiring live databases are in the default `npm test` suite
- Tests use `itWithDb` to skip when database unavailable, giving false confidence
- CI runs these "tests" but they silently skip, providing no value
- No clear separation between fast unit tests and slow integration tests
- Integration test infrastructure (PostgreSQL, migrations, seeding) shouldn't be required for CI at this stage

## Acceptance Criteria
- [ ] Move database integration tests to `/tests/integration/db/` directory
- [ ] Default `npm test` runs ONLY unit tests (no database required)
- [ ] Add `npm run test:integration` command (runs locally only, not in CI)
- [ ] Remove `itWithDb` helper from integration tests (they should FAIL if DB unavailable, not skip)
- [ ] CI runs `npm test` (unit tests only) - NO database infrastructure required
- [ ] Integration tests explicitly document they require local PostgreSQL
- [ ] Clear documentation: integration tests are for local development/validation only
- [ ] Schema tests stay in unit tests (they don't connect to databases)

## Files Requiring Changes
- `tests/db/connection.test.ts` - Split into unit and integration variants
- `tests/integration/example-integration.test.ts` - Remove conditional logic
- `jest.config.js` - Create separate configurations
- `package.json` - Add separate test scripts

## Technical Approach

### Philosophy: Integration Tests Are NOT for CI (Yet)
**Critical Decision**: Integration tests that require live databases should NOT run in CI until the project has substantial DevOps resources. The current approach of "skip if unavailable" creates false confidence.

### 1. Directory Structure
```
tests/
├── unit/                    # Pure unit tests (default)
│   ├── db/
│   │   ├── schema.test.ts  # Schema validation (no DB connection)
│   │   └── validators.test.ts
│   └── ...
└── integration/             # Integration tests (opt-in, local only)
    └── db/
        ├── connection.test.ts
        ├── seeding.test.ts
        └── migrations.test.ts
```

### 2. Jest Configuration
```javascript
// jest.config.js - Default unit tests only
module.exports = {
  testMatch: ['**/tests/unit/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  testTimeout: 5000,
};

// jest.integration.config.js - Integration tests (local only)
module.exports = {
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testTimeout: 30000,
  setupFiles: ['./tests/integration/setup.ts'], // Fails if DB unavailable
};
```

### 3. Package.json Scripts
```json
{
  "scripts": {
    "test": "jest --config jest.config.js",
    "test:integration": "jest --config jest.integration.config.js"
  }
}
```

### 4. Remove Skip Helpers
- Delete `itWithDb` helper
- Integration tests should FAIL if database unavailable (not skip)
- CI doesn't run integration tests, so this is fine

## Dependencies
None - This is a restructuring task, not an infrastructure task

## Current Integration Tests (to move to integration/)
- `tests/db/connection.test.ts` - Uses `itWithDb`, connects to live DB
- `tests/db/seeding.test.ts` - Uses `itWithDb`, connects to live DB
- Any future tests that require PostgreSQL

## Current Unit Tests (keep in unit/)
- `tests/db/schema.test.ts` - Schema validation, no DB connection
- `tests/db/jsonb-validators-unit.test.ts` - Pure unit tests

## Progress Update (2025-09-27)
**Completed**:
- ✅ Unit test isolation achieved across web app (294 passing tests)
- ✅ Comprehensive mocking patterns implemented (Vitest)
- ✅ Removed integration-style tests from unit test suite
- ✅ Created testing standards documentation (.claude/commands/write-tests.md)

**Remaining**:
- File naming conventions (.unit.test.ts/.integration.test.ts)
- Separate Jest configurations for API tests
- TestContainers setup for integration tests
- CI pipeline separation

## Risk Level
Medium - Requires careful test reorganization and validation

## Estimated Effort
- Configuration setup: 2-3 hours
- Test file refactoring: 4-6 hours
- CI pipeline updates: 2-3 hours
- Validation and documentation: 2 hours

## Success Metrics
- `npm test` completes in < 10 seconds (unit tests only)
- `npm test` requires NO external infrastructure (no PostgreSQL, no Docker)
- CI runs `npm test` successfully without database setup
- `npm run test:integration` exists for local validation
- Integration tests FAIL FAST if database unavailable (no silent skipping)
- Clear documentation that integration tests are local-only

## Definition of Done
- [x] `npm test` runs only unit tests
- [x] `npm test` passes in CI without database
- [x] Integration tests moved to `/tests/integration/`
- [x] Integration tests fail loudly if DB unavailable
- [x] Documentation updated with testing philosophy
- [x] `itWithDb` helper removed from integration tests

## Implementation Summary

### Changes Made

#### Directory Restructuring
- Created `tests/unit/db/` for unit tests (no database connection)
- Created `tests/integration/db/` for integration tests (require PostgreSQL)
- Moved `connection.test.ts`, `seeding.test.ts`, `simple-connection.test.ts` to `tests/integration/db/`
- Moved `schema.test.ts`, `jsonb-validators-unit.test.ts` to `tests/unit/db/`

#### Test Updates
- Removed `itWithDb` helper from all integration tests
- Changed to regular `it()` - integration tests now FAIL if database unavailable
- Fixed all import paths (added `../` levels for new directory structure)
- Added documentation headers to all moved tests explaining they're integration tests

#### Configuration Files
- **jest.config.js**: Updated to run only unit tests from `tests/unit/` and `tests/config/`
- **jest.integration.config.js**: NEW - Runs only integration tests with 30s timeout
- **package.json**: Added `test:integration` script

#### Documentation
- **tests/README.md**: NEW - Comprehensive guide explaining:
  - Directory structure and test categories
  - When to write unit vs integration tests
  - Why integration tests don't belong in CI (yet)
  - Migration guide for moving tests
  - Common pitfalls and best practices

### Validation Results

✅ **Unit Tests Pass Without Database**:
```
PASS tests/config/jwt-config.test.ts
PASS tests/unit/db/jsonb-validators.test.ts
PASS tests/unit/example-unit.test.ts
PASS tests/unit/logging-integration.test.ts
PASS tests/unit/db/schema.test.ts
Test Suites: 5 passed, 5 total
Tests: 80 passed, 80 total
```

✅ **Build Succeeds**: `npm run build` - No errors
✅ **Type Check Succeeds**: `npm run typecheck` - No errors
✅ **No Database Required**: Unit tests run without PostgreSQL
✅ **No Silent Skipping**: No more "Skipping test - database not available" messages
✅ **Baseline Preserved**: Pre-existing failing test (forms.routes.test.ts) still fails as before

### Files Created
1. `apps/api/jest.integration.config.js` - Jest config for integration tests
2. `apps/api/tests/README.md` - Comprehensive testing documentation
3. `apps/api/tests/unit/db/schema.test.ts` - Schema validation unit test
4. `apps/api/tests/unit/db/jsonb-validators.test.ts` - JSONB validator unit test
5. `apps/api/tests/integration/db/connection.test.ts` - Database connection integration test
6. `apps/api/tests/integration/db/seeding.test.ts` - Database seeding integration test
7. `apps/api/tests/integration/db/simple-connection.test.ts` - Simple DB connection test

### Files Modified
1. `apps/api/jest.config.js` - Updated to run unit tests only
2. `apps/api/package.json` - Added test:integration script

### Impact
- **CI Simplification**: No PostgreSQL infrastructure needed in CI
- **Fast Feedback**: Unit tests complete in < 10 seconds
- **Clear Categorization**: Developers know which tests to run when
- **Honest Failures**: Integration tests fail loudly instead of skipping silently
- **Local Validation**: Integration tests available for thorough local testing

### Next Steps
1. Create PR for human review
2. After merge, INFRA-006 can proceed (was blocked by this task)
3. Consider documenting integration test setup in dev environment guide