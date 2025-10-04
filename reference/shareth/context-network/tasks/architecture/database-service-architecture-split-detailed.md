# DatabaseService Architecture Split - Detailed Planning

**Priority**: Medium (already planned, this adds detail)
**Effort**: Large (3-4 hours as estimated)
**Type**: Architecture / Refactoring
**Created**: 2025-09-27

## Context

**Original Code Review Finding**: DatabaseService has grown to 977 lines, confirming the need for the already-planned architecture split task.

**Current Status**: Phase 1 (TransactionManager) completed 2025-10-01. Phases 2-5 pending.

## Updated Implementation Guidance

Based on the code review, the split should prioritize:

### 1. **TransactionManager.js** (High Priority)
Extract all transaction-related logic to address:
- The complex `_executeTransaction` method (95 lines)
- Transaction timeout memory leak
- Transaction queuing system
- State management

**Proposed Interface**:
```javascript
class TransactionManager {
  constructor(databaseService) {
    this.db = databaseService;
    this._transactionInProgress = false;
    this._transactionQueue = [];
    this._transactionTimeout = null;
  }

  async transaction(queries) { /* Main transaction logic */ }
  async _executeTransaction(queries, isAsync) { /* Execution logic */ }
  async _executeAsyncTransaction(queries) { /* Async handling */ }
  async _executeCallbackTransaction(queries) { /* Callback handling */ }
  async _executeWithTimeout(queries) { /* Timeout logic */ }
  _processTransactionQueue() { /* Queue processing */ }
  async _handleTransactionError(error) { /* Error handling */ }
}
```

### 2. **ConnectionManager.js** (Medium Priority)
Handle database connections and lifecycle:
```javascript
class ConnectionManager {
  constructor(config) { /* Connection config */ }
  async open() { /* Connection opening */ }
  async close() { /* Connection closing */ }
  isOpen() { /* Connection status */ }
  async executeSql(sql, params) { /* Raw SQL execution */ }
}
```

### 3. **QueryBuilder.js** (Lower Priority)
SQL query construction and validation:
```javascript
class QueryBuilder {
  static buildSelect(table, columns, where) { /* SELECT queries */ }
  static buildInsert(table, data) { /* INSERT queries */ }
  static buildUpdate(table, data, where) { /* UPDATE queries */ }
  static buildDelete(table, where) { /* DELETE queries */ }
  static validateTableName(name) { /* Security validation */ }
}
```

### 4. **SchemaManager.js** (Lower Priority)
Database schema and migration handling:
```javascript
class SchemaManager {
  constructor(connectionManager) { /* Schema management */ }
  async runMigration(migration) { /* Migration execution */ }
  async rollbackMigration(version) { /* Migration rollback */ }
  async getTableInfo(tableName) { /* Table introspection */ }
}
```

### 5. **DatabaseService.js** (Orchestration Layer)
Simplified facade maintaining backward compatibility:
```javascript
class DatabaseService {
  constructor(config) {
    this.connectionManager = new ConnectionManager(config);
    this.transactionManager = new TransactionManager(this);
    this.schemaManager = new SchemaManager(this.connectionManager);
    // ... other managers
  }

  // Delegate to appropriate managers
  async transaction(queries) {
    return this.transactionManager.transaction(queries);
  }

  async executeSql(sql, params) {
    return this.connectionManager.executeSql(sql, params);
  }

  // ... other delegated methods
}
```

## Code Review Integration Benefits

This architecture split directly addresses:

1. **File Size Issue**: 977 lines → ~150-200 lines per module
2. **Function Complexity**: Complex methods split into focused classes
3. **Memory Leak Risk**: Isolated timeout handling in TransactionManager
4. **Testing Challenges**: Each manager can be tested independently
5. **Maintainability**: Single responsibility per module

## Recommended Implementation Order

1. **Phase 1**: Extract TransactionManager (addresses most complex issues)
2. **Phase 2**: Extract ConnectionManager (handles core database ops)
3. **Phase 3**: Extract SchemaManager (migration and schema logic)
4. **Phase 4**: Extract QueryBuilder (SQL construction helpers)
5. **Phase 5**: Refactor DatabaseService as facade

## Testing Strategy for Each Phase

- **Unit Tests**: Each manager tested independently
- **Integration Tests**: Verify managers work together
- **Regression Tests**: All existing tests continue to pass
- **Performance Tests**: No degradation in transaction speed

## Success Criteria Updates

Based on code review findings:

- [x] TransactionManager resolves timeout memory leak ✅
- [x] TransactionManager module is 236 lines ✅
- [x] Complex methods broken down (< 20 lines each) ✅
- [x] All 23 transaction tests continue to pass ✅
- [x] No performance regression ✅
- [x] Improved testability and maintainability ✅
- [x] Clear separation of concerns ✅
- [ ] Each remaining module < 200 lines (DatabaseService now 824 lines)
- [ ] Complete remaining phases 2-5

## Dependencies and Related Tasks

- **Must complete first**: Current transaction edge case work
- **Can combine with**:
  - `fix-transaction-timeout-memory-leak.md`
  - `refactor-execute-transaction-method.md`
- **Follows**: Enhanced error handling system

## Risk Mitigation

1. **Incremental Migration**: One manager at a time
2. **Facade Pattern**: Maintain 100% backward compatibility
3. **Test-Driven**: Comprehensive testing at each phase
4. **Rollback Plan**: Keep original implementation until fully verified

## Timeline Estimate

- **Phase 1 (TransactionManager)**: 2 hours
- **Phase 2 (ConnectionManager)**: 1 hour
- **Phase 3 (SchemaManager)**: 1 hour
- **Phase 4 (QueryBuilder)**: 30 minutes
- **Phase 5 (DatabaseService refactor)**: 30 minutes
- **Total**: 4-5 hours (matches original estimate)

This detailed plan incorporates all code review findings and provides a clear path forward for addressing the identified maintainability issues.

## Phase 1 Completion Report (2025-10-01)

### Accomplished
- **TransactionManager extracted**: 236 lines, focused single responsibility
- **Memory leak fixed**: Proper timeout cleanup with explicit ID tracking
- **Test-Driven Development**: 20 comprehensive tests written before implementation
- **Backward compatibility maintained**: All 76 existing tests pass
- **DatabaseService reduced**: From 977 to 824 lines (153 lines extracted)

### Technical Decisions Made
1. **Async Detection Strategy**: Used parameter counting (0 = async, 1 = callback) due to Jest transpilation issues
2. **Error Wrapping**: All errors wrapped in TransactionError with context preservation
3. **Queue Processing**: Used setTimeout(0) to prevent stack overflow in recursive queue processing
4. **Composition Pattern**: TransactionManager composed into DatabaseService via delegation

### Challenges Overcome
1. **Jest Mock Functions**: Mock functions altered constructor properties, breaking initial async detection
2. **Logger Import Patterns**: Different import styles between test and production required adaptation
3. **Timeout Memory Leaks**: Required explicit timeout ID tracking for proper cleanup

### Lessons Learned
1. Test environment transpilation can significantly affect runtime type checking
2. Parameter counting is more reliable than constructor checking in transpiled environments
3. TDD approach caught edge cases early that would have been missed in implementation-first approach

### Next Phase Recommendations
- **Phase 2 (ConnectionManager)**: Should handle database lifecycle and connection pooling
- **Consider**: Creating getRawDatabase() method to improve encapsulation
- **Document**: Async detection constraint (0 or 1 parameters only) in API documentation

## Phase 1 Post-Implementation Fix (2025-10-01)

### Issue Discovered
After TransactionManager extraction was marked complete, the test suite had 3 failing tests due to incomplete cleanup:

1. **ESLint Violations (5 errors)**:
   - Unused variable `firstCalled` in transaction-manager.test.js
   - Use of deprecated `fail()` jasmine global (should use `expect().rejects.toThrow()`)
   - Conditional expects in error handling tests
   - Unused imports in DatabaseService.js (logger, TransactionError)

### Root Cause
The TransactionManager extraction was functionally complete but left behind:
- Test code that wasn't updated to modern Jest patterns
- Unused imports after refactoring
- Variables that were no longer needed after test simplification

### Resolution
1. Removed unused variable `firstCalled` from test
2. Replaced `fail()` with `expect().rejects.toThrow()` pattern
3. Removed unused imports from DatabaseService
4. All 264 tests now passing
5. ESLint compliance restored (0 errors, 0 warnings)

### Lessons Learned
1. **Definition of Done**: A task isn't complete until ALL tests pass and linting is clean
2. **Test Modernization**: When refactoring, also update test patterns to current best practices
3. **Import Cleanup**: Always verify and remove unused imports after extraction
4. **CI/CD Verification**: Should verify CI/CD pipeline is green before marking task complete