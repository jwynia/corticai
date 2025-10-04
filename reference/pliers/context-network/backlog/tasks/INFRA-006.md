# INFRA-006 - Fix Database Migration and Environment Setup Issues

## Status
**Current State:** Blocked (Needs TEST-002 First)
**Priority:** Medium (Blocked by TEST-002)
**Effort:** 4-6 hours (Actual: ~4 hours)
**Epic:** Infrastructure & Database
**Blocker:** TEST-002 must complete first - integration tests need to be separated from CI suite

## Problem Statement
Database migration scripts and test database setup are causing integration test failures in CI. The current implementation has missing migration files, incorrect directory structures, and environment configuration issues preventing the `npm run db:migrate` command from working properly.

## Root Cause Analysis
Based on investigation of the current setup:

1. **Missing migrations directory**: The migration script looks for `./src/db/migrations` but the directory doesn't exist
2. **No Drizzle configuration**: Missing `drizzle.config.ts` file for proper migration setup
3. **Environment variable issues**: Missing or incorrect environment variable configuration
4. **Incomplete migration implementation**: Rollback functionality is not implemented
5. **Test database setup problems**: CI environment database connection and setup issues
6. **Seeding script gaps**: `npm run db:seed:test` may not be properly implemented

## Acceptance Criteria
1. **Functional Requirements**
   - [ ] `npm run db:migrate` command executes successfully
   - [ ] Database schema matches the defined Drizzle schemas
   - [ ] Migration directory structure created and populated
   - [ ] Drizzle configuration file properly set up
   - [ ] Environment variable configuration working
   - [ ] Test database setup works in CI environment
   - [ ] Database seeding for tests implemented
   - [ ] Integration tests can connect to database

2. **Quality Gates**
   - [ ] All migration tests pass
   - [ ] Database connection tests pass
   - [ ] Schema validation tests pass
   - [ ] Migration rollback capability implemented
   - [ ] Environment variable validation

3. **Success Metrics**
   - [ ] CI database setup completes without errors
   - [ ] Integration tests pass database connection phase
   - [ ] All database-related commands work locally and in CI
   - [ ] Zero database setup failures in future PRs

## Technical Approach

### Database Setup Strategy
1. **Create missing migrations directory structure**
   - `/workspaces/pliers/apps/api/src/db/migrations/`
   - Initial migration files based on existing schemas

2. **Drizzle configuration setup**
   - Create `drizzle.config.ts` with proper paths
   - Configure migration output directory
   - Set up database connection parameters

3. **Environment configuration**
   - Create `.env.example` with required variables
   - Update database client to handle test environment
   - Configure CI environment variables

4. **Migration implementation**
   - Generate initial migration from current schemas
   - Fix migration runner to use correct paths
   - Implement proper rollback functionality

### Key Components
- Drizzle Kit configuration for migrations
- Environment variable management
- Database connection pooling for tests
- Migration file generation from schemas
- Test database seeding scripts

## Test Strategy

### Test-Driven Development
1. **Pre-implementation tests:**
   - Test that `npm run db:migrate` succeeds
   - Test that database schema matches expected structure
   - Test that migrations are idempotent
   - Test that test database can be seeded

2. **Validation tests:**
   - Verify all tables are created correctly
   - Verify foreign key constraints work
   - Verify JSONB indexes are created
   - Verify migration history tracking

## Technical Dependencies
- Existing Drizzle schemas in `/src/db/schema/`
- PostgreSQL Docker setup in `docker-compose.dev.yml`
- Package.json migration scripts
- Existing database client configuration
- Integration test setup

## Files to Create/Modify

### New Files:
- `/workspaces/pliers/apps/api/drizzle.config.ts`
- `/workspaces/pliers/apps/api/src/db/migrations/0000_initial.sql` (generated)
- `/workspaces/pliers/apps/api/src/db/seed.ts`
- `/workspaces/pliers/.env.example`

### Modified Files:
- `/workspaces/pliers/apps/api/src/db/migrate.ts` (fix paths and logic)
- `/workspaces/pliers/apps/api/src/db/rollback.ts` (implement functionality)
- `/workspaces/pliers/apps/api/src/db/client.ts` (environment handling)
- `/workspaces/pliers/apps/api/package.json` (verify/fix scripts)

## Implementation Steps
1. **Setup phase:**
   - Create worktree at `.worktrees/INFRA-006/`
   - Write failing tests for migration functionality
   - Document current state and issues

2. **Drizzle configuration phase:**
   - Create `drizzle.config.ts` with proper configuration
   - Generate initial migration from existing schemas
   - Test migration generation process

3. **Migration system fix:**
   - Update migration runner to use correct paths
   - Fix environment variable handling
   - Implement rollback functionality
   - Create seeding scripts

4. **Environment setup:**
   - Create proper environment variable configuration
   - Update database client for test environments
   - Configure CI environment variables

5. **Testing and validation:**
   - Test complete migration workflow
   - Verify integration test database connection
   - Test CI environment database setup
   - Ensure all commands work locally and in CI

6. **Integration phase:**
   - Create comprehensive PR
   - Test full CI pipeline
   - Document setup process

## Risk Mitigation
- **Risk:** Schema drift between migrations and current schemas
  - **Mitigation:** Generate migrations directly from current schema definitions

- **Risk:** CI environment variable configuration
  - **Mitigation:** Create comprehensive environment variable documentation

- **Risk:** Migration conflicts with existing data
  - **Mitigation:** Test migrations on fresh databases first

- **Risk:** Test database isolation issues
  - **Mitigation:** Implement proper database cleanup in test setup

## Definition of Done
- [ ] `npm run db:migrate` executes without errors locally and in CI
- [ ] `npm run db:seed:test` populates test database correctly
- [ ] All integration tests pass database connection phase
- [ ] Migration system properly tracks applied migrations
- [ ] Rollback functionality implemented and tested
- [ ] Environment variable configuration documented
- [ ] CI database setup workflow tested and working
- [ ] PR merged and worktree cleaned up

## Implementation Summary

### Files Created
1. **`src/db/migrations/0000_initial_schema.sql`** - Complete initial migration with all tables
2. **`src/db/migrations/meta.json`** - Drizzle migration metadata
3. **`src/db/seed.ts`** - Database seeding script with test data
4. **`src/db/rollback.ts`** - Rollback functionality (manual implementation)
5. **`scripts/verify-database.ts`** - Comprehensive database verification script
6. **`tests/db/seeding.test.ts`** - Test suite for database seeding functionality

### Files Modified
1. **`drizzle.config.ts`** - Already existed but verified configuration
2. **`src/db/migrate.ts`** - Fixed migration path handling with absolute paths
3. **`package.json`** - Added database utility scripts (`db:seed:test`, `db:reset`, `verify:database`)
4. **`tests/db/migrations.test.ts`** - Updated rollback tests for realistic expectations
5. **`.env.example`** - Already existed with proper database configuration

### Key Features Implemented
- ✅ Complete database schema migration from existing Drizzle schemas
- ✅ Migration directory structure with proper Drizzle metadata
- ✅ Database seeding with development and test data
- ✅ Rollback functionality (manual due to Drizzle limitations)
- ✅ Comprehensive test suite for all database operations
- ✅ CI-ready database verification script
- ✅ Environment-aware seeding (dev/test/production)
- ✅ JSONB functionality testing for form data
- ✅ Foreign key constraint verification
- ✅ Index creation and verification

### Database Commands Now Working
- `npm run db:migrate` - Runs migrations successfully
- `npm run db:seed` - Seeds database with development data
- `npm run db:seed:test` - Seeds database with test data
- `npm run db:reset` - Resets database completely
- `npm run verify:database` - Comprehensive database verification

### Migration Structure
```
src/db/migrations/
├── 0000_initial_schema.sql  # Complete schema with all tables
├── meta.json               # Drizzle migration tracking
└── [future migrations]     # Ready for additional migrations
```

### Test Coverage
- Database connection testing
- Migration execution and idempotency
- Table creation and schema validation
- JSONB functionality testing
- Foreign key constraint enforcement
- Index creation verification
- Seeding functionality with relationship integrity
- Database clearing and reset functionality

## Context and References
- **Related Tasks:** INFRA-001, INFRA-002, INFRA-003 (infrastructure setup)
- **PR Reference:** #14 (failed CI due to database issues)
- **Process:** Following TDD approach from Wave 1 standards
- **Database:** PostgreSQL 15+ with pgvector extension
- **ORM:** Drizzle ORM with Drizzle Kit for migrations

## Expected Issues to Resolve
Based on analysis of the current state:
1. Missing `/src/db/migrations` directory causing migration failures
2. No `drizzle.config.ts` configuration file
3. Environment variable handling issues in CI
4. Incomplete rollback implementation
5. Test database seeding script gaps
6. Database connection issues in integration tests

## Verification Instructions
To test the implementation:

1. **Start PostgreSQL**: `npm run db:up` (from project root)
2. **Run migrations**: `npm run db:migrate`
3. **Verify database**: `npm run verify:database`
4. **Seed test data**: `npm run db:seed:test`
5. **Run tests**: `npm test`

## Metadata
- **Created:** 2025-09-26
- **Implemented:** 2025-09-26
- **Task Type:** Infrastructure Fix - Database
- **Complexity:** Medium-High
- **Team Impact:** All developers (database operations)
- **Urgency:** High (blocks PR #14 and future integration tests)
- **Ready for:** PR Creation and Human Review