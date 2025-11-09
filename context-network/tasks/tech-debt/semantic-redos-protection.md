# Tech Debt: Add ReDoS Protection to RelationshipInference

**Created**: 2025-11-09
**Source**: Code review of Semantic Processing Phase 2
**Priority**: MEDIUM (Security-related)
**Effort**: Small (15-30 minutes)
**Risk**: Medium

## Problem

The `RelationshipInference` class uses complex regex patterns that could be vulnerable to Regular Expression Denial of Service (ReDoS) attacks with crafted input:

```typescript
// Potentially vulnerable patterns
const filePathRegex = /(?:^|\s)((?:\.\/|\.\.\/|[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)(?:\s|$|[,.])/g
const seeRefRegex = /@see\s+([^\s]+(?:\s+[^\n]+)?)/gi
const supersededByRegex = /(?:superseded by|replaced by)\s+(?:\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+))/gi
```

**Impact**:
- Malicious input could cause catastrophic backtracking
- CPU exhaustion on server
- Denial of service if processing user-provided content

**Locations**:
- `app/src/semantic/RelationshipInference.ts:317` - `filePathRegex`
- `app/src/semantic/RelationshipInference.ts:362` - `seeRefRegex`
- `app/src/semantic/RelationshipInference.ts:217,239,259` - supersession patterns

## Current Mitigation

Content is already truncated to `maxContentLength` (default 10000 chars), providing some protection:

```typescript
// Line 168-171
if (content.length > this.config.maxContentLength) {
  processedContent = content.substring(0, this.config.maxContentLength)
  warnings.push(`Content truncated to ${this.config.maxContentLength} characters`)
}
```

## Recommended Solution

Add explicit ReDoS protection to each detection method:

```typescript
private detectMentionRelationships(
  content: string,
  entityId: string
): InferredRelationship[] {
  const relationships: InferredRelationship[] = []

  // ReDoS protection - additional limit for regex operations
  const MAX_REGEX_CONTENT_LENGTH = 50000
  let processedContent = content

  if (content.length > MAX_REGEX_CONTENT_LENGTH) {
    // Option 1: Truncate
    processedContent = content.substring(0, MAX_REGEX_CONTENT_LENGTH)

    // Option 2: Process in chunks (better but more complex)
    // return this.processInChunks(content, entityId, this.detectMentionRelationships)
  }

  // Continue with regex operations on processedContent
  // ...
}
```

## Alternative: Timeout-Based Protection

Use a regex timeout library:

```typescript
import safeRegex from 'safe-regex'
import { execWithTimeout } from 'regex-timeout'

// Validate regex safety at startup
if (!safeRegex(filePathRegex.source)) {
  throw new Error('Unsafe regex pattern detected')
}

// Execute with timeout
const matches = execWithTimeout(regex, content, 100) // 100ms timeout
```

## Acceptance Criteria

- [ ] All regex operations protected with content length limits
- [ ] Warning logged when content is truncated for ReDoS protection
- [ ] Existing relationship detection tests pass
- [ ] New security tests added:
  - [ ] Test with pathological regex input (nested patterns)
  - [ ] Test with very long content (>100KB)
  - [ ] Test processing time remains reasonable (<1s per document)
- [ ] Documentation updated with security considerations

## Testing Strategy

1. **Security tests**:
   ```typescript
   it('should handle pathological regex input without hanging', async () => {
     // Create input designed to cause catastrophic backtracking
     const maliciousContent = 'see '.repeat(10000) + 'docs.md'

     const startTime = Date.now()
     const result = await inference.inferFromContent(maliciousContent, 'test')
     const duration = Date.now() - startTime

     // Should complete in reasonable time
     expect(duration).toBeLessThan(1000)
   })
   ```

2. **Performance tests**:
   - Benchmark regex operations with various content sizes
   - Ensure no regression in normal use cases
   - Test chunk-based processing if implemented

3. **Functional tests**:
   - Verify truncation doesn't miss important relationships
   - Test that legitimate large documents still work

## Implementation Options

### Option 1: Simple Length Limit (Recommended)
- **Pros**: Easy, fast, predictable
- **Cons**: Might miss relationships at end of very long documents
- **Effort**: 15 minutes

### Option 2: Chunk-Based Processing
- **Pros**: Processes entire document, more thorough
- **Cons**: More complex, need to handle overlapping chunks
- **Effort**: 45 minutes

### Option 3: Regex Timeout Library
- **Pros**: Most robust protection
- **Cons**: Additional dependency, slower
- **Effort**: 30 minutes

**Recommendation**: Start with Option 1 (simple length limit), upgrade to Option 2 if needed based on usage patterns.

## Dependencies

- None for Option 1
- `safe-regex` or `regex-timeout` for Option 3

## Related Issues

- Consider profiling regex performance in production
- May need similar protection in QuestionGenerator if rule-based patterns become more complex
- Review other regex patterns in codebase for similar issues

## Implementation Notes

- Document the MAX_REGEX_CONTENT_LENGTH constant and rationale
- Consider making it configurable via RelationshipInferenceConfig
- Log warnings when truncation occurs for monitoring
- Update JSDoc to mention ReDoS protection

## References

- Code Review: `/review-code` output (2025-11-09)
- ReDoS Information: https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
- Safe Regex Library: https://github.com/davisjam/safe-regex
- File: `app/src/semantic/RelationshipInference.ts` (multiple locations)
