# QUALITY-002: Extract Magic Numbers to Named Constants in Auth Provider

## Metadata
- **Status:** ready
- **Type:** code-quality
- **Epic:** web-auth
- **Priority:** low
- **Size:** small
- **Estimated Effort:** 1 hour
- **Created:** 2025-10-01
- **Created From:** PR #26 code review feedback
- **Related Tasks:** WEB-007-1

## Description
Extract magic numbers used in the authentication provider to well-named constants for improved code readability and maintainability. Currently, timeout values and other numeric literals are hard-coded without explanation.

## Problem Statement
From PR #26 code review:
> **Magic Numbers** - Consider extracting timeout constants like `100` into named constants for better readability.

Current implementation in `auth-provider.tsx`:
```typescript
// Line 148 and 206
await new Promise(resolve => setTimeout(resolve, 100));
```

The number `100` appears twice with no context about what it represents or why that specific value was chosen.

## Acceptance Criteria
- [ ] Extract all magic numbers to named constants
- [ ] Place constants at top of file or in separate constants file
- [ ] Use descriptive names that explain purpose and unit
- [ ] Add JSDoc comments for constants if needed
- [ ] Ensure tests still pass

## Magic Numbers to Address

### 1. Mock API Delay (100ms)
**Location:** Lines 148, 206
**Current:**
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```

**Proposed:**
```typescript
/**
 * Simulated API call delay for mock authentication.
 * Set to 100ms to simulate network latency in development.
 * TODO: Remove when real API integration is implemented.
 */
const MOCK_API_DELAY_MS = 100;

await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY_MS));
```

### 2. Potential Future Constants
Consider extracting if found:
- Session timeout durations
- Retry delays
- Maximum auth attempts
- Token expiration times

## Implementation Approach

### Option A: Top-of-File Constants (Recommended)
```typescript
// Constants
const MOCK_API_DELAY_MS = 100; // Mock network latency
const AUTH_STORAGE_KEY = 'auth_state'; // Already exists

// Component implementation below...
```

### Option B: Separate Constants File
Create `apps/web/src/providers/auth-constants.ts`:
```typescript
export const AUTH_CONSTANTS = {
  MOCK_API_DELAY_MS: 100,
  STORAGE_KEY: 'auth_state',
  // Future constants...
} as const;
```

### Option C: Config Object
```typescript
const AUTH_CONFIG = {
  mockApiDelay: 100,
  storageKey: 'auth_state',
} as const;
```

## Recommended Solution
**Option A** for now (top-of-file constants) because:
- Only 1-2 constants currently
- Keeps related code together
- Easy to migrate to separate file later if needed
- Minimal complexity

## Implementation Steps
1. Identify all magic numbers in auth-provider.tsx
2. Create named constants at top of file
3. Add JSDoc comments explaining purpose and units
4. Replace magic numbers with constant references
5. Run tests to verify no regressions
6. Update any relevant comments

## Files to Modify
- `apps/web/src/providers/auth-provider.tsx` - Add constants, replace literals

## Testing Strategy
- Run existing test suite (should pass unchanged)
- Verify mock delays still work as expected
- Check that timeout values haven't changed
- Ensure no functional changes

## Code Quality Benefits
- **Readability**: Clear intent of numeric values
- **Maintainability**: Change value in one place
- **Documentation**: Constants serve as inline documentation
- **Type Safety**: Can add proper types and units
- **Searchability**: Easy to find where values are used

## Dependencies
- WEB-007-1: Auth provider implementation

## Success Metrics
- Zero unexplained numeric literals in auth-provider.tsx
- All constants have descriptive names
- Tests pass without modification
- Code reviewer feedback addressed

## Notes
- This is a pure refactoring task with no behavior changes
- Good practice to establish for future auth code
- Consider creating a pattern for other providers to follow
- Document in code review that these are mock values to be replaced
