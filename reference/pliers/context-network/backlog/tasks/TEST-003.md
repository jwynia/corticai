# TEST-003: Replace Timing-Based Security Tests

## Metadata
- **Status:** ready
- **Type:** bug
- **Epic:** phase-2-infrastructure
- **Priority:** high
- **Size:** small
- **Created:** 2025-09-27

## Description
The authentication service tests contain a timing-based security test (`tests/auth/auth.service.test.ts:426-451`) that uses `process.hrtime()` to validate constant-time comparison. This creates flaky tests that are unreliable in CI environments and don't actually validate the security property being tested.

## Problem Statement
- Timing tests are system-dependent and unreliable
- Tests can fail due to system load, not actual security issues
- Does not actually verify that constant-time comparison is being used
- Creates false negatives in CI environments

## Acceptance Criteria
- [ ] Remove timing-based test for constant-time comparison
- [ ] Replace with proper verification that bcrypt.compare is used
- [ ] Ensure bcrypt usage is validated (bcrypt has built-in constant-time comparison)
- [ ] Add test that verifies no information leakage through error messages
- [ ] Document why timing tests are inappropriate for this validation

## Current Problematic Test
```javascript
// BAD - System-dependent timing test
it('should use constant-time comparison for sensitive operations', async () => {
  const start1 = process.hrtime();
  await authService.authenticate(/* nonexistent user */);
  const end1 = process.hrtime(start1);
  // ... timing comparison logic
});
```

## Replacement Strategy
```javascript
// GOOD - Verify security properties directly
it('should use constant-time comparison for sensitive operations', async () => {
  const bcryptSpy = jest.spyOn(bcrypt, 'compare');

  await authService.authenticate({
    email: 'test@example.com',
    password: 'wrong',
    organizationId: 'org'
  });

  // Verify bcrypt is used (which has constant-time comparison built-in)
  expect(bcryptSpy).toHaveBeenCalledWith('wrong', expect.any(String));
});
```

## Files Requiring Changes
- `tests/auth/auth.service.test.ts` - Replace timing test

## Risk Level
Low - Simple test replacement that improves reliability

## Estimated Effort
- Test replacement: 30 minutes
- Validation: 15 minutes

## Dependencies
None - can be implemented immediately

## Success Metrics
- All security tests are deterministic
- Tests pass consistently across different environments
- Security properties are properly validated through behavioral testing