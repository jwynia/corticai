# STYLE-001: Standardize Error Messages Across Validation Engine

## Metadata
- **Status:** ready
- **Type:** style
- **Epic:** code-quality
- **Priority:** low
- **Size:** small
- **Created:** 2025-09-23

## Description
Error messages in validation engine are inconsistent - some include the invalid value, others don't. This affects user experience and debugging.

## Examples of Inconsistency
- `Minimum value is ${field.validation.min}` (includes context)
- `Invalid email format` (no context)
- `Invalid selection: ${invalidValues.join(', ')}` (includes values)
- `Must be a number` (no context)

## Acceptance Criteria
- [ ] Create error message standard documentation
- [ ] Audit all validation error messages in codebase
- [ ] Update error messages to follow standards
- [ ] Add helper functions for consistent error formatting
- [ ] Test error message formats
- [ ] Update validation tests to check error message format
- [ ] Document internationalization considerations

## Proposed Error Message Standards
```typescript
interface StandardErrorMessage {
  // Standard format: "{Field} {validation rule} {context}"
  // Examples:
  // "Email must be a valid email address"
  // "Age must be at least 18"
  // "Password must contain at least 8 characters"

  format: string;
  includeFieldLabel: boolean;
  includeContext: boolean;
  sanitizeUserInput: boolean;
}
```

## Implementation Guidelines
- **Field Labels**: Always include when available
- **Expected Values**: Include ranges, formats, or valid options
- **User Input**: Sanitize and truncate if needed
- **Security**: Never expose internal system details
- **Length**: Keep under 100 characters
- **Tone**: Helpful, not accusatory

## Testing Strategy
- Test error message consistency
- Verify no sensitive data exposure
- Test with various input lengths
- Validate internationalization hooks

## Estimated Effort
- Standards documentation: 1 hour
- Code audit and updates: 2-3 hours
- Testing updates: 1 hour