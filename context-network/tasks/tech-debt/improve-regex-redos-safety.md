# Improve Regex Patterns for ReDoS Safety

**Created**: 2025-10-10
**Priority**: Medium
**Effort**: Small (~30 minutes)
**Type**: Security / Performance
**Status**: 📋 Pending

---

## Problem

The phone number regex pattern in LogSanitizer has nested quantifiers that could potentially lead to catastrophic backtracking (ReDoS - Regular Expression Denial of Service):

```typescript
// Current implementation (line 105)
const PHONE_REGEX = /(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g;
```

**Vulnerability Analysis**:
- Nested optional quantifiers: `(\+?\d{1,3}[-.]?)?`
- Multiple alternation paths for separators: `[-.]?`
- Potential for exponential backtracking with malformed input

While this is currently in a controlled context (log sanitization), it's a best practice to use more efficient regex patterns to prevent potential DoS vectors.

---

## Impact Assessment

**Current Risk**: Low-Medium
- Limited to log sanitization context
- Input is typically small log messages
- Not directly exposed to user input
- But could be exploited if malicious data logged

**Potential Attack**:
```typescript
// Malicious input that could cause excessive backtracking
const malicious = '+' + '1-2-3-4-5-'.repeat(100) + 'garbage';
sanitizer.sanitizePhone(malicious); // Could take significant time
```

---

## Proposed Solution

### 1. Simplify Phone Regex (Primary Fix)

```typescript
// SAFER - More explicit, less backtracking
const PHONE_REGEX = /(?:\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g;
```

**Changes**:
- Use non-capturing group `(?:...)` instead of capturing group
- Removes one level of optional nesting
- Same matching behavior, better performance

### 2. Add Timeout Protection (Defensive)

Consider adding a regex timeout wrapper for all pattern matching:

```typescript
/**
 * Execute regex with timeout protection against ReDoS
 */
private safeReplace(
  str: string,
  regex: RegExp,
  replacer: (match: string) => string,
  timeoutMs: number = 100
): string {
  const startTime = Date.now();
  let result = str;

  try {
    result = str.replace(regex, (match) => {
      // Check timeout on each match
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Regex timeout');
      }
      return replacer(match);
    });
  } catch (error) {
    // Log warning and return original string
    console.warn('Regex sanitization timeout, skipping pattern');
    return str;
  }

  return result;
}
```

### 3. Consider Explicit String Parsing (Alternative)

For critical security contexts, consider replacing regex with explicit parsing:

```typescript
function sanitizePhoneExplicit(phone: string): string {
  // Extract digits only
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) {
    return '***';
  }

  const lastFour = digits.slice(-4);
  const format = phone.startsWith('+') ? '+***-***-' : '***-***-';

  return format + lastFour;
}
```

---

## Acceptance Criteria

1. ✅ Phone regex updated to non-capturing group
2. ✅ All existing phone sanitization tests pass
3. ✅ Add performance test for malicious input:
   ```typescript
   it('should handle malicious phone input efficiently', () => {
     const malicious = '+' + '1-2-3-4-5-'.repeat(100) + 'garbage';
     const startTime = Date.now();

     sanitizer.sanitizePhone(malicious);

     const duration = Date.now() - startTime;
     expect(duration).toBeLessThan(100); // Should complete in < 100ms
   });
   ```

4. ✅ Review other regex patterns for similar issues:
   - `EMAIL_REGEX` (line 100)
   - `UNIX_PATH_REGEX` (line 110)
   - `WINDOWS_PATH_REGEX` (line 111)

---

## Additional Regex Review

### Email Regex
```typescript
// Current (line 100) - SAFE
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
```
✅ No nested quantifiers, safe

### Path Regex
```typescript
// Current (line 110) - POTENTIALLY UNSAFE
const UNIX_PATH_REGEX = /(\/[^/\s]+)+/g;
```
⚠️ Nested quantifiers: `([^/\s]+)+` - Review needed

```typescript
// Safer alternative
const UNIX_PATH_REGEX = /(?:\/[^/\s]+)+/g;
```

---

## Files to Modify

1. `/app/src/utils/LogSanitizer.ts`
   - Update `PHONE_REGEX` (line 105)
   - Review `UNIX_PATH_REGEX` (line 110)
   - Consider adding timeout protection wrapper

2. `/app/tests/utils/LogSanitizer.test.ts`
   - Add ReDoS resistance test

---

## Implementation Priority

**Phase 1** (Immediate - Low Risk):
- Update phone regex to non-capturing group
- Update path regex to non-capturing group
- Verify existing tests pass

**Phase 2** (Future - If Needed):
- Add timeout protection wrapper
- Consider explicit parsing for critical patterns

---

## Related

- **Original Review**: Code review recommendation #3
- **Related File**: `/app/src/utils/LogSanitizer.ts:105`
- **Security Reference**: [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)

---

## Testing Strategy

**Unit Tests**:
- Verify regex changes don't break existing functionality
- Add malicious input test cases

**Performance Benchmarks**:
```typescript
describe('ReDoS Resistance', () => {
  it('should handle nested repeating patterns efficiently', () => {
    const inputs = [
      '+' + '1-2-3-'.repeat(50),
      '/path/'.repeat(100) + 'file.txt',
      'email@' + 'subdomain.'.repeat(50) + 'com'
    ];

    inputs.forEach(input => {
      const start = Date.now();
      sanitizer.sanitizePatterns(input);
      expect(Date.now() - start).toBeLessThan(50);
    });
  });
});
```

---

## Decision: Apply Now or Defer?

**Recommendation**: DEFER
- Requires careful testing of edge cases
- Need to benchmark performance impact
- Should review all regex patterns together
- Low immediate risk in current context
