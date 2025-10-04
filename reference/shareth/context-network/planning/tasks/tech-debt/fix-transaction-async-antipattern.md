# Task: Fix Async Anti-Pattern in Transaction Method

## Source
Code Review - Medium Priority Issue

## Problem Description
The `transaction()` method in `DatabaseService.js` uses an anti-pattern where an async function is placed inside a Promise constructor:

```javascript
// PROBLEMATIC - async function in Promise constructor
return new Promise(async (resolve, reject) => {
  // async code here
});
```

This creates potential issues with error handling and makes the code harder to reason about.

## Current Code Location
- **File**: `mobile/src/services/database/DatabaseService.js`
- **Lines**: 221-236
- **Method**: `transaction(queries)`

## Acceptance Criteria
- [ ] Remove async anti-pattern from transaction method
- [ ] Maintain backward compatibility with existing transaction usage
- [ ] Ensure proper error handling for both BEGIN/COMMIT and ROLLBACK scenarios
- [ ] All existing tests continue to pass
- [ ] Add specific tests for transaction error scenarios
- [ ] Update method to handle both callback-style and async transactions properly

## Proposed Solution
Replace the async Promise constructor with proper async/await pattern:

```javascript
async function handleAsyncTransaction() {
  try {
    await this.executeSql('BEGIN TRANSACTION');
    await queries();
    await this.executeSql('COMMIT');
  } catch (error) {
    await this.executeSql('ROLLBACK').catch(() => {});
    throw error;
  }
}
return handleAsyncTransaction();
```

## Dependencies
- Requires understanding of current transaction usage patterns
- Must test with both callback and async transaction patterns
- Database connection state management

## Risk Level
**Medium** - Changes core transaction logic but with clear improvement path

## Effort Estimate
**Medium** (30-60 minutes)
- Understand current transaction usage patterns: 15 min
- Implement fix: 20 min
- Test thoroughly: 25 min

## Priority
High - Fixes technical debt and improves error handling reliability

## Related Issues
None currently identified

## Notes
This fix will improve error handling reliability and make the transaction code more maintainable.