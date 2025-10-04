# Discovery: Async Function Detection in Jest Environment

## Discovery Context
- **Date**: 2025-10-01
- **Task**: DatabaseService Architecture Split - Phase 1
- **Component**: TransactionManager async/callback detection

## Problem Encountered
Attempting to detect async functions vs callback functions in Jest test environment failed with multiple approaches:

1. **Constructor name checking**: `func.constructor.name === 'AsyncFunction'`
   - Failed because Jest transpilation changes constructor names
2. **Constructor comparison**: `func.constructor === (async function(){}).constructor`
   - Failed because both async and regular functions matched in Jest
3. **Mock function wrapping**: `jest.fn(asyncFunc)`
   - Changed the function's constructor properties entirely

## Solution Discovered
**Parameter counting proved most reliable:**
```javascript
_isAsyncFunction(func) {
  // SQLite callbacks ALWAYS have 1 parameter (tx)
  // Our async functions ALWAYS have 0 parameters
  if (func.length === 1) {
    return false; // Callback style
  }
  if (func.length === 0) {
    return true; // Async style
  }
  // Functions with 2+ parameters are unsupported
  throw new ValidationError(`Invalid parameter count: ${func.length}`);
}
```

## Why This Works
1. **Function.length property is preserved** through transpilation
2. **Clear API contract**: SQLite callbacks require transaction parameter
3. **Deterministic**: No ambiguity in detection logic
4. **Test environment stable**: Works consistently in Jest

## Implications
- **API Design Constraint**: Transaction functions must follow 0 or 1 parameter rule
- **Documentation Need**: This constraint must be clearly documented
- **Future Consideration**: If supporting 2+ parameter functions needed, alternative detection required

## Related Patterns
- Test environment transpilation effects
- API design constraints for dual-mode support
- Parameter counting as type detection

## Code References
- Implementation: `/workspaces/shareth/mobile/src/services/database/TransactionManager.js:63-75`
- Tests: `/workspaces/shareth/mobile/__tests__/transaction-manager.test.js:275-281`

## Keywords
async-detection, jest-transpilation, function-parameters, transaction-management, type-checking