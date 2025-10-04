# IMPL-005: Replace Mock Database Functions with Real Implementation

## Metadata
- **Status:** ready
- **Type:** implementation
- **Epic:** database-integration
- **Priority:** medium
- **Size:** large
- **Created:** 2025-09-23
- **Updated:** 2025-09-23

## Description
Replace mock database functions in the authentication routes with actual database operations using the existing Drizzle ORM setup. Current mocks are useful for development but will need real implementation before production deployment.

**Current Mock Functions to Replace:**
- `findUserByEmail(email)` - Returns hardcoded test user
- `findUserById(id)` - Returns hardcoded user data
- `getUserPasswordHash(userId)` - Returns static test hash
- `getUserTokenVersion(userId)` - Returns fixed version number
- `incrementUserTokenVersion(userId)` - No-op mock function
- 2FA secret storage - Currently in-memory only

**Files Requiring Updates:**
- `src/routes/auth.ts` - Main authentication routes
- `src/middleware/auth.ts` - Token verification middleware
- `src/utils/auth-helpers.ts` - Helper functions

## Acceptance Criteria
- [ ] Replace `findUserByEmail` with actual database query
- [ ] Replace `findUserById` with actual database query
- [ ] Replace `getUserPasswordHash` with secure database lookup
- [ ] Replace `getUserTokenVersion` with database operation
- [ ] Replace `incrementUserTokenVersion` with atomic database update
- [ ] Replace 2FA secret storage with encrypted database storage
- [ ] Implement proper error handling for database failures
- [ ] Add database connection retry logic
- [ ] Add comprehensive tests with test database
- [ ] Remove all hardcoded test data

## Technical Notes
- Use existing Drizzle ORM setup from IMPL-001
- Implement proper password hash storage and retrieval
- Add database indexes for performance
- Use transactions for token version updates
- Encrypt 2FA secrets before database storage

## Database Schema Requirements
- Users table with authentication fields
- User sessions table for token version tracking
- 2FA secrets table with encryption
- Proper foreign key relationships

## Security Considerations
- Hash passwords with bcrypt before storage
- Encrypt 2FA secrets at rest
- Use prepared statements to prevent SQL injection
- Implement proper access controls

## Testing Strategy
- Unit tests with test database
- Integration tests for all auth flows
- Performance tests for database operations
- Security tests for data protection

## Implementation Notes
- **Suggested Branch:** `feat/auth-database-integration`
- **Estimated Time:** 6-8 hours
- **Prerequisites:** Verify users table exists and has required fields
- **Testing Database:** Use existing test DB setup from IMPL-001

## Dependencies
- IMPL-001: Database setup (✅ completed)
- DOC-003-1: Core database schema (✅ completed)
- SEC-001: JWT secret validation (should complete first for security)

## Notes
- Mock implementations are acceptable during development phase
- Helps verify component connectivity without full database dependency
- Should be replaced before any production deployment
- User will notify when deployment beyond developer laptops is planned