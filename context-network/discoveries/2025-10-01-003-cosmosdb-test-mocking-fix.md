# Discovery Record: CosmosDB Test Mocking Fix

**Date**: 2025-10-01
**Context**: Fixing 26 failing CosmosDB tests due to incomplete Azure SDK mocking
**Significance**: Restored test suite health, enabling vacation-friendly development without Azure access

## Summary

Fixed vitest mock configuration for @azure/cosmos SDK by adding missing PartitionKeyKind enum. This resolved 26 failing tests and restored full test suite health (36/36 passing) without requiring Azure connection.

## Key Findings

### 1. Azure SDK Mocking Strategy: Runtime vs. Type-Only Imports

**Location**: `app/tests/storage/adapters/CosmosDBStorageAdapter.test.ts:35-42`

**Problem**: Only runtime values need to be mocked in vitest, not TypeScript types/interfaces.

**Discovery**: The CosmosDB adapter imports both runtime values and type-only imports from @azure/cosmos:

```typescript
import {
  CosmosClient,        // Runtime: Class (needs mock)
  PartitionKeyKind,    // Runtime: Enum (needs mock)
  Container,           // Type-only: Interface (no mock needed)
  Database,            // Type-only: Interface (no mock needed)
  ItemResponse,        // Type-only: Interface (no mock needed)
  FeedResponse,        // Type-only: Interface (no mock needed)
  SqlQuerySpec,        // Type-only: Type alias (no mock needed)
  PatchOperation       // Type-only: Type alias (no mock needed)
} from '@azure/cosmos'
```

**Solution Pattern**:
```typescript
vi.mock('@azure/cosmos', () => ({
  // Mock runtime values only
  CosmosClient: vi.fn().mockImplementation(() => mockClient),
  PartitionKeyKind: {
    Hash: 'Hash',
    Range: 'Range',
    MultiHash: 'MultiHash'
  }
  // Type-only imports are handled by TypeScript compiler, not vitest
}))
```

**Insight**: When mocking third-party SDKs, distinguish between:
- **Runtime values** (classes, enums, functions) → Must be in mock
- **Type-only imports** (interfaces, types) → Compile-time only, don't need mock

**Related**: [[vitest-mocking-patterns]], [[azure-sdk-testing]]

### 2. Error Message Diagnosis from Vitest

**Location**: Error output from test run

**Error Pattern**:
```
[vitest] No "PartitionKeyKind" export is defined on the "@azure/cosmos" mock.
Did you forget to return it from "vi.mock"?
```

**Discovery**: Vitest provides excellent diagnostics for missing mock exports. The error:
1. Identifies the exact missing export (`PartitionKeyKind`)
2. Points to the module being mocked (`@azure/cosmos`)
3. Suggests the solution (`return it from vi.mock`)

**Usage Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:233`
```typescript
partitionKey: {
  paths: [this.config.partitionKey!],
  kind: PartitionKeyKind.Hash  // Runtime access to enum
}
```

**Insight**: Vitest's error messages are designed to guide you to the solution. Trust the diagnostic and follow its suggestion.

**Related**: [[vitest-error-messages]], [[test-debugging]]

### 3. PartitionKeyKind Enum Values

**Location**: @azure/cosmos SDK (external)

**Discovery**: Azure CosmosDB supports three partition key kinds:
- `Hash` - Most common, used for hash-based partitioning
- `Range` - For range-based partitioning (sequential data)
- `MultiHash` - For multi-level hierarchical partitioning

**Our Usage**: CorticAI uses `Hash` partitioning (line 233) for consistent distribution.

**Mock Implementation**:
```typescript
PartitionKeyKind: {
  Hash: 'Hash',
  Range: 'Range',
  MultiHash: 'MultiHash'
}
```

**Insight**: When mocking enums, provide all possible values even if you only use one. This prevents future failures if code changes to use different enum values.

**Related**: [[cosmosdb-partitioning]], [[partition-strategies]]

## Implementation Summary

### Files Modified

1. **`app/tests/storage/adapters/CosmosDBStorageAdapter.test.ts`**
   - Line 35-42: Added PartitionKeyKind enum to @azure/cosmos mock
   - Line 1-15: Added comprehensive JSDoc explaining mocking strategy
   - Line 22: Added inline comment clarifying mock purpose

### Test Results

**Before**: 10/36 tests passing (26 failures)
**After**: 36/36 tests passing (0 failures)

**Execution Time**: ~60ms for full CosmosDB test suite

**Coverage**: No change (existing tests, just fixed mocking)

## Lessons Learned

### Technical Lessons

1. **Mock only runtime values**: TypeScript types/interfaces don't exist at runtime and don't need mocking
2. **Trust vitest diagnostics**: Error messages are specific and actionable
3. **Provide complete enum mocks**: Include all enum values, not just the ones currently used
4. **Document mocking strategy**: Future developers need to know the pattern

### Process Lessons

1. **Test failures are symptoms, not problems**: The 26 failures pointed to a single root cause (missing enum)
2. **Fix at the source**: Adding the missing mock fixed all 26 tests at once
3. **Vacation-friendly fixes**: No Azure connection needed for development/testing
4. **Documentation prevents recurrence**: Clear comments explain why mocks are structured this way

## Follow-up Opportunities

### Immediate
- ✅ All CosmosDB tests passing
- ✅ Documentation complete
- ✅ Backlog updated

### Future Considerations
- Consider creating a reusable Azure SDK mock helper for other adapters
- Document this pattern in testing guidelines for contributors
- Add pre-commit hook to verify test suite health

## Related Discoveries

- [[2025-10-01-001-code-review-findings]] - Original identification of test suite issues
- [[2025-10-01-002-relationship-query-optimization]] - Previous test-driven optimization

## Impact

**Immediate Impact**:
- Test suite health restored: 0 failures
- Open source quality improved: All tests pass without external dependencies
- Vacation-friendly development: No Azure required for testing

**Future Impact**:
- Unblocks Azure validation work when access available
- Provides template for mocking other Azure services
- Demonstrates proper SDK mocking strategy for contributors

---

**Created by**: CosmosDB test mocking fix implementation
**Task**: `/context-network/planning/groomed-backlog.md` - Task #0 (completed)
**Tests**: `app/tests/storage/adapters/CosmosDBStorageAdapter.test.ts`
**Confidence**: High - all tests passing, pattern documented
