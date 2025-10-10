# Document Unix Path Sanitization Behavior

**Created**: 2025-10-10
**Priority**: Low
**Effort**: Trivial (~10 minutes)
**Type**: Documentation
**Status**: 📋 Pending

---

## Problem

The Unix path sanitization has an undocumented threshold that only sanitizes paths with more than 3 segments:

```typescript
// LogSanitizer.ts:483-489
result = result.replace(UNIX_PATH_REGEX, (match) => {
  // Only sanitize if it looks like a full path (has multiple segments)
  if (match.split('/').length > 3) {
    return this.sanitizePath(match);
  }
  return match;
});
```

**Current Behavior**:
- `/usr/bin/foo` (3 segments) → **NOT sanitized**
- `/usr/local/bin/foo` (4 segments) → **Sanitized to** `/***/**/foo`
- `/api/users` (2 segments) → **NOT sanitized**

**Issue**: This threshold is arbitrary and not documented. Users may be surprised that short paths are not sanitized.

---

## Why This Matters

**False Sense of Security**:
- Developers may assume ALL paths are sanitized
- Short paths like `/home/db.kuzu` (2 segments) won't be sanitized
- Could expose directory structures in some cases

**Use Case Conflict**:
- **API Paths**: `/api/users/123` should probably NOT be sanitized (legitimate URLs)
- **File Paths**: `/etc/config` SHOULD be sanitized (system paths)
- **Database Paths**: `/tmp/db.kuzu` SHOULD be sanitized (sensitive locations)

The current heuristic (3+ segments) doesn't perfectly distinguish these cases.

---

## Proposed Solutions

### Option 1: Document Current Behavior (Minimal)

Add clear documentation to the method:

```typescript
/**
 * Detect and sanitize common patterns in string content
 *
 * Note on path sanitization:
 * - Unix paths with 3 or fewer segments are NOT sanitized
 *   Examples: /api/users, /usr/bin
 * - Unix paths with 4+ segments ARE sanitized
 *   Examples: /usr/local/bin/app → /***/ **/app
 *
 * Rationale: Short paths are often API routes or well-known system paths
 * that don't expose sensitive information. Longer paths are more likely
 * to contain user-specific or sensitive directory structures.
 */
private sanitizePatterns(str: string): string {
  // ...
}
```

### Option 2: Make Threshold Configurable

```typescript
export interface SanitizerConfig {
  // ... existing options ...

  /**
   * Minimum number of path segments before Unix paths are sanitized
   * @default 4
   * @example
   *   pathSegmentThreshold: 3 -> /a/b/c will be sanitized
   *   pathSegmentThreshold: 4 -> /a/b/c/d will be sanitized
   */
  pathSegmentThreshold?: number;
}
```

### Option 3: Distinguish Path Types (More Complex)

```typescript
/**
 * Determine if a Unix path should be sanitized
 * - Skip common API prefixes: /api, /v1, /graphql
 * - Skip well-known system paths: /usr, /bin, /etc
 * - Sanitize user paths: /home, /Users, /tmp
 * - Sanitize database paths: containing .db, .sqlite, etc.
 */
private shouldSanitizeUnixPath(path: string): boolean {
  const skipPrefixes = ['/api/', '/v1/', '/v2/', '/graphql/'];
  const sanitizePrefixes = ['/home/', '/Users/', '/tmp/', '/var/'];
  const sanitizeExtensions = ['.db', '.sqlite', '.kuzu', '.log'];

  // Check for skip prefixes (API routes)
  if (skipPrefixes.some(prefix => path.startsWith(prefix))) {
    return false;
  }

  // Check for explicit sanitize patterns
  if (sanitizePrefixes.some(prefix => path.startsWith(prefix)) ||
      sanitizeExtensions.some(ext => path.includes(ext))) {
    return true;
  }

  // Default: use segment threshold
  return path.split('/').length > 3;
}
```

---

## Recommendation

**Immediate Action**: Option 1 (Document current behavior)
- Lowest effort, immediate clarity
- Explains the rationale
- Doesn't introduce new configuration

**Future Enhancement**: Option 2 (Make configurable)
- If users request more control
- Easy to add without breaking changes

**Complex Solution**: Option 3 (Path type detection)
- Only if there are real-world complaints about current behavior
- Requires extensive testing of edge cases

---

## Acceptance Criteria

1. ✅ Add JSDoc comment documenting the 3-segment threshold
2. ✅ Explain rationale in comment
3. ✅ Update main class documentation with path sanitization behavior
4. ✅ Consider adding usage example showing what gets sanitized vs. not

---

## Files to Modify

1. `/app/src/utils/LogSanitizer.ts`
   - Add documentation to `sanitizePatterns()` method (line 469)
   - Update class-level JSDoc (line 1-22)

---

## Related

- **Original Review**: Code review recommendation #4
- **Related File**: `/app/src/utils/LogSanitizer.ts:483-489`
- **Related Issue**: Path redaction behavior

---

## Example Documentation

```typescript
/**
 * Log Sanitization Utility
 *
 * Path Sanitization Behavior:
 * - Unix paths: Only paths with 4+ segments are sanitized
 *   • /api/users → NOT sanitized (2 segments)
 *   • /usr/bin/app → NOT sanitized (3 segments)
 *   • /home/user/data/file.db → SANITIZED to /***/ **/file.db (4 segments)
 * - Windows paths: All paths are sanitized
 *   • C:\Users\John\data.db → SANITIZED to C:\\***\\**\\data.db
 *
 * Rationale: Short Unix paths are often API routes or well-known system
 * paths that don't expose sensitive information. Longer paths typically
 * contain user-specific directories that should be redacted.
 */
```

---

## Priority Justification

**Low Priority** because:
- Current behavior is reasonable
- No known user complaints
- Doesn't introduce security issues
- Can be addressed with simple documentation
