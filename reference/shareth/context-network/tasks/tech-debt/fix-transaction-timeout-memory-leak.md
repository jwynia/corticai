# Fix Transaction Timeout Memory Leak

**Priority**: High
**Effort**: Small (30-60 minutes)
**Type**: Technical Debt / Bug Fix
**Created**: 2025-09-27

## Context

**Original Code Review Finding**: Potential memory leak in transaction timeout handling where timeout handlers are not cleared when the main transaction promise resolves first.

**Location**: `mobile/src/services/database/DatabaseService.js:409-419`

## Problem Description

The current implementation creates timeout promises that may leave `setTimeout` handlers in memory if the main transaction completes before the timeout:

```javascript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new TransactionError('Transaction timeout exceeded', {
      context: {
        operation: 'async_transaction',
        phase: 'timeout',
        timeoutMs: this._transactionTimeout,
      },
    }));
  }, this._transactionTimeout);
});

await Promise.race([queries(), timeoutPromise]);
// If queries() resolves first, the timeout handler is never cleared
```

## Why Deferred

- **Effort**: Requires careful handling of Promise.race cleanup
- **Risk**: Medium - changes core transaction logic
- **Testing**: Needs comprehensive timeout testing to ensure no regression

## Acceptance Criteria

- [ ] Timeout handlers are properly cleared when main promise resolves first
- [ ] All existing timeout tests continue to pass
- [ ] New test added to verify memory cleanup
- [ ] No performance regression in transaction handling
- [ ] Timeout promises still work correctly when they need to fire

## Implementation Approach

**Recommended Solution**:
```javascript
async _executeAsyncTransaction(queries) {
  await this.executeSql('BEGIN TRANSACTION');

  if (this._transactionTimeout && this._transactionTimeout > 0) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new TransactionError('Transaction timeout exceeded', {
          context: {
            operation: 'async_transaction',
            phase: 'timeout',
            timeoutMs: this._transactionTimeout,
          },
        }));
      }, this._transactionTimeout);
    });

    try {
      await Promise.race([queries(), timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    await queries();
  }

  await this.executeSql('COMMIT');
}
```

## Testing Requirements

1. **Timeout Cleanup Test**: Verify timeouts are cleared in successful transactions
2. **Memory Leak Test**: Run many short transactions and verify no handler accumulation
3. **Timeout Functionality Test**: Ensure timeouts still fire when needed
4. **Edge Case Test**: Test timeout during rollback scenarios

## Dependencies

- Requires extraction of async transaction logic (see related task)
- Should be done after or during DatabaseService architecture split

## Related Items

- `database-service-architecture-split.md` - This cleanup fits naturally into the refactor
- Current transaction tests provide regression protection

## Notes

This is a good example of why the 977-line DatabaseService needs splitting - easier to test and verify timeout logic in isolation.