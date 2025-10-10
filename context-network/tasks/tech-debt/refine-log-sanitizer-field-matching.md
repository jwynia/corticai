# Refine LogSanitizer Field Matching to Prevent False Positives

**Created**: 2025-10-10
**Priority**: Medium
**Effort**: Small (~30 minutes)
**Type**: Code Quality / Bug Fix
**Status**: 📋 Pending

---

## Problem

The `redactSecretsOnly()` method in LogSanitizer uses overly broad substring matching that causes false positives:

```typescript
// Current implementation (line 358)
if (lowerKey.includes('password') || lowerKey.includes('token') ||
    lowerKey.includes('secret') || lowerKey.includes('key')) {
  result[key] = '[REDACTED]';
}
```

**False Positives**:
- `keyboard` → redacted (contains "key")
- `monkey` → redacted (contains "key")
- `donkey` → redacted (contains "key")
- `secretariat` → redacted (contains "secret")
- `tokenize` → redacted (contains "token")

This causes legitimate data to be unnecessarily redacted, reducing debugging utility.

---

## Root Cause

The `includes()` method matches substrings anywhere in the field name without word boundaries, leading to over-matching.

---

## Proposed Solution

Use regex patterns with word boundaries for more precise matching:

```typescript
// Improved implementation
const sensitivePatterns = [
  /password/i,        // Matches 'password', 'userPassword', 'Password'
  /passwd/i,          // Matches 'passwd', 'user_passwd'
  /token/i,           // Matches 'token', 'authToken', 'refreshToken'
  /secret/i,          // Matches 'secret', 'apiSecret'
  /\bkey$/i,          // Matches 'key', 'apiKey' but NOT 'keyboard'
  /_key$/i,           // Matches 'api_key', 'session_key'
  /^key$/i            // Matches exactly 'key'
];

if (sensitivePatterns.some(pattern => pattern.test(lowerKey))) {
  result[key] = '[REDACTED]';
}
```

---

## Acceptance Criteria

1. ✅ Legitimate fields no longer redacted:
   - `keyboard`, `monkey`, `donkey` → NOT redacted
   - `secretariat`, `tokenize` → NOT redacted

2. ✅ Sensitive fields still properly redacted:
   - `password`, `apiKey`, `token`, `secret` → REDACTED
   - `user_password`, `api_key`, `auth_token` → REDACTED

3. ✅ All existing tests pass

4. ✅ Add new test cases for false positive scenarios:
   ```typescript
   it('should not redact non-sensitive fields containing sensitive substrings', () => {
     const result = sanitizer.redactSecretsOnly({
       keyboard: 'QWERTY',
       monkey: 'gorilla',
       secretariat: 'racehorse',
       tokenize: 'split'
     });

     expect(result.keyboard).toBe('QWERTY');
     expect(result.monkey).toBe('gorilla');
     expect(result.secretariat).toBe('racehorse');
     expect(result.tokenize).toBe('split');
   });
   ```

---

## Impact

**Positive**:
- Reduces false positives in sanitization
- Improves debugging experience
- More accurate data handling

**Risks**:
- Low - Changes are localized to `redactSecretsOnly()` method
- Well-covered by existing tests
- Easy to verify behavior changes

---

## Files to Modify

1. `/app/src/utils/LogSanitizer.ts`
   - Update `redactSecretsOnly()` method (line 341-367)

2. `/app/tests/utils/LogSanitizer.test.ts`
   - Add test case for false positives

---

## Related

- **Original Review**: Code review recommendation #2
- **Related File**: `/app/src/utils/LogSanitizer.ts:358`
- **Parent Task**: Logging Strategy implementation

---

## Implementation Notes

**TDD Approach**:
1. Write failing test for false positive cases
2. Update regex patterns in `redactSecretsOnly()`
3. Verify tests pass
4. Ensure no regressions in existing tests

**Alternative Approach** (if needed):
Could use the same `isSensitiveField()` logic that's already implemented in the main sanitization path, which has more sophisticated matching.
