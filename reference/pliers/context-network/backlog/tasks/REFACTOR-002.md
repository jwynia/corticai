# REFACTOR-002: Split Authentication Middleware into Focused Functions

## Metadata
- **Status:** ready
- **Type:** refactor
- **Epic:** code-quality
- **Priority:** medium
- **Size:** small
- **Created:** 2025-09-23
- **Updated:** 2025-09-23

## Description
The authentication middleware function is 53 lines and handles multiple concerns (authentication, authorization, error handling). Split it into smaller, focused functions following single responsibility principle.

## Acceptance Criteria
- [ ] Extract `authenticateUser` function for user identification
- [ ] Extract `authorizeUser` function for role checking
- [ ] Extract `handleAuthError` function for error processing
- [ ] Maintain existing API and behavior
- [ ] Add unit tests for each extracted function
- [ ] Update integration tests to verify no regression
- [ ] Document the new function responsibilities

## Technical Notes
- Keep the main `auth` middleware as a coordinator
- Each function should have a single, clear responsibility
- Maintain the same error handling and logging behavior
- Consider extracting JWT and API key logic into separate functions

## Refactoring Plan
```typescript
export function auth(options = {}) {
  return async (c: AuthContext, next: Next) => {
    try {
      await authenticateUser(c);
      await authorizeUser(c, options);
      await next();
    } catch (error) {
      handleAuthError(error, c);
    }
  };
}
```

## Testing Strategy
- Unit tests for each extracted function
- Integration tests to verify no behavioral changes
- Performance tests to ensure no regression
- Test coverage should be >95% for auth module

## Branch Naming
- **Suggested Branch:** `refactor/split-auth-middleware`
- **Estimated Time:** 3-4 hours
- **Entry Point:** `src/middleware/auth.ts`

## Dependencies
- SEC-002 (Fix JWT Token Verification) - Currently ready, should be done first

## Original Issue
Code review identified god function:
- 53 lines handling multiple concerns
- Authentication, authorization, and error handling mixed
- Difficult to test and maintain individual pieces