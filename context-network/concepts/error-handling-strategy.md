# Error Handling Strategy

**Status**: Evolving
**Domain**: Code Quality Standards
**Last Updated**: 2025-10-01
**Confidence**: Medium (identified pattern, establishing standard)

## Overview

Guidelines for consistent error handling across the CorticAI codebase, derived from code review findings and best practices.

## Current State

**Observation from 2025-10-01 Code Review**:
Error handling is inconsistent across the codebase:
- CosmosDBStorageAdapter: Throws `StorageError` with error codes
- LocalStorageProvider: Throws generic `Error`
- SelfHostingExample: Uses `console.warn` for errors
- Multiple instances of silent error swallowing

**Need**: Establish clear patterns for when to throw, when to log, and when to return.

## Error Handling Patterns

### Pattern 1: Throw with Context (Storage Adapters)

**When to Use**:
- Critical operations that must succeed
- Errors that caller needs to handle
- Conditions that prevent further execution

**Implementation**:
```typescript
throw new StorageError(
  `Failed to get item: ${error.message}`,
  StorageErrorCode.QUERY_FAILED,
  { key, originalError: error }
)
```

**Benefits**:
- Preserves original error for debugging
- Categorizes error type with code
- Provides context about what was being attempted
- Caller can catch and handle appropriately

### Pattern 2: Log and Continue (Background Operations)

**When to Use**:
- Non-critical operations
- Batch operations where some failures are acceptable
- Background cleanup/maintenance tasks

**Implementation**:
```typescript
try {
  await someBatchOperation()
} catch (error) {
  if (this.config.debug) {
    logger.debug(`Batch operation failed: ${error.message}`, { context })
  }
  // Continue with other operations
}
```

**Benefits**:
- Doesn't halt batch processing
- Provides visibility when debugging enabled
- Allows partial success

### Pattern 3: Conditional Error Handling (Expected Failures)

**When to Use**:
- Operations where certain errors are expected and normal
- Need to differentiate between expected and unexpected errors

**Implementation**:
```typescript
try {
  const result = await operation()
} catch (error: any) {
  // Handle expected errors gracefully
  if (error.code === 404) {
    return undefined // Not found is expected
  }

  // Log unexpected errors
  if (this.config.debug) {
    logger.debug(`Unexpected error: ${error.message}`)
  }

  // Re-throw critical errors
  throw new OperationError(`Unexpected failure: ${error.message}`, error)
}
```

**Benefits**:
- Differentiates expected from unexpected failures
- Provides debugging information
- Maintains clear error propagation

### Pattern 4: Return Error Result (Validation)

**When to Use**:
- Validation functions
- Operations where error is a valid outcome
- Functions that need to return multiple failure modes

**Implementation**:
```typescript
interface ValidationResult {
  success: boolean
  errors?: ValidationError[]
}

function validate(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.required) {
    errors.push({ field: 'required', message: 'Required field missing' })
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  }
}
```

**Benefits**:
- Errors are data, not exceptions
- Multiple errors can be collected
- No exception overhead
- Caller explicitly handles all cases

## Anti-Patterns to Avoid

### ❌ Silent Error Swallowing

**Bad**:
```typescript
try {
  await operation()
} catch (error) {
  // Silently ignore all errors
}
```

**Why Bad**:
- Hides bugs and issues
- Makes debugging impossible
- No visibility into failures

**Fix**:
```typescript
try {
  await operation()
} catch (error) {
  // At minimum, log it
  logger.debug(`Operation failed: ${error.message}`)

  // Better: handle expected errors, throw unexpected
  if (isExpectedError(error)) {
    return defaultValue
  }
  throw error
}
```

### ❌ Catching Without Specificity

**Bad**:
```typescript
.catch(() => {
  // Ignore 404 errors (but catches ALL errors)
})
```

**Why Bad**:
- Comments don't match behavior
- Hides permission errors, network failures, etc.

**Fix**:
```typescript
.catch((error: any) => {
  if (error.code !== 404) {
    logger.warn(`Unexpected error: ${error.message}`)
  }
  // Only 404s are truly ignored
})
```

### ❌ Generic Error Messages

**Bad**:
```typescript
throw new Error('Operation failed')
```

**Why Bad**:
- No context about what failed
- No information about why it failed
- Can't distinguish between different failures

**Fix**:
```typescript
throw new OperationError(
  `Failed to process entity ${entityId}: ${error.message}`,
  {
    entityId,
    operation: 'process',
    originalError: error
  }
)
```

### ❌ Inconsistent Error Types

**Bad**:
```typescript
// File 1
throw new Error('Connection failed')

// File 2
throw new StorageError('Connection failed', StorageErrorCode.CONNECTION_FAILED)

// File 3
console.error('Connection failed')
return null
```

**Why Bad**:
- Callers can't handle errors consistently
- Can't catch specific error types
- Mix of exceptions and error returns

**Fix**: Use consistent error types within a module/subsystem

## Error Categories

### Critical Errors (Always Throw)
- Connection failures
- Authentication failures
- Invalid configuration
- Data corruption
- Resource exhaustion

### Expected Errors (Return or Handle Gracefully)
- Item not found (404)
- Validation failures
- Duplicate entries
- Rate limiting

### Transient Errors (Retry or Log)
- Network timeouts
- Temporary unavailability
- Lock conflicts

## Logging Conventions

### Debug Level
**When**: Detailed operation information, expected errors
**Example**: `logger.debug('Item not found in cache', { key })`

### Info Level
**When**: Significant operations, state changes
**Example**: `logger.info('Storage initialized', { adapter: 'kuzu' })`

### Warn Level
**When**: Unexpected but recoverable conditions
**Example**: `logger.warn('Retry limit reached', { operation, attempts })`

### Error Level
**When**: Failures that require attention
**Example**: `logger.error('Database connection failed', { error, config })`

## Error Context

**Always Include**:
- What operation was being attempted
- Relevant identifiers (key, ID, path)
- Original error if wrapping
- Any context that helps debugging

**Example**:
```typescript
throw new StorageError(
  `Failed to delete entity: ${error.message}`,
  StorageErrorCode.DELETE_FAILED,
  {
    entityId,
    entityType,
    partitionKey,
    originalError: error,
    timestamp: new Date().toISOString()
  }
)
```

## Error Codes

**Pattern**: Use enums for error categorization

```typescript
export enum StorageErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  WRITE_FAILED = 'WRITE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  INVALID_VALUE = 'INVALID_VALUE',
  NOT_FOUND = 'NOT_FOUND'
}
```

**Benefits**:
- Type-safe error checking
- Easy to handle specific errors
- Self-documenting

## Testing Error Handling

### Test Expected Errors
```typescript
test('should return undefined for non-existent key', async () => {
  const result = await storage.get('nonexistent')
  expect(result).toBeUndefined()
})
```

### Test Error Propagation
```typescript
test('should throw StorageError on connection failure', async () => {
  mockConnection.fail()
  await expect(storage.get('key')).rejects.toThrow(StorageError)
})
```

### Test Error Context
```typescript
test('should include context in error', async () => {
  try {
    await storage.get('key')
  } catch (error) {
    expect(error.context).toMatchObject({ key: 'key' })
  }
})
```

## Implementation Examples

### Storage Adapters
- **Pattern**: Throw StorageError with error codes
- **Example**: CosmosDBStorageAdapter error handling
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts`

### Query Builders
- **Pattern**: Validate early, throw with context
- **Example**: KuzuSecureQueryBuilder parameter validation
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts`

### Background Tasks
- **Pattern**: Log and continue for batch operations
- **Example**: CosmosDBStorageAdapter.clear() batch deletes
- **Location**: `app/src/storage/adapters/CosmosDBStorageAdapter.ts:411`

## Migration Path

**Current State**: Inconsistent error handling across codebase

**Goal State**: Consistent patterns based on operation type

**Steps**:
1. ✅ Document current patterns and anti-patterns (this document)
2. 📋 Create linting rules to catch error swallowing
3. 📋 Update existing code during reviews/refactoring
4. 📋 Add error handling tests for new code
5. 📋 Establish error handling as part of code review checklist

## Decision Tree

```
Error occurred in:
├─ Critical operation (auth, connection, config)?
│  └─ THROW with detailed context
│
├─ Batch/background operation?
│  ├─ Error is expected (404, duplicate)?
│  │  └─ IGNORE or LOG at debug level
│  └─ Error is unexpected?
│     └─ LOG at warn/error level, CONTINUE
│
├─ Validation?
│  └─ RETURN ValidationResult
│
└─ Regular operation?
   ├─ Error is expected (404)?
   │  └─ RETURN undefined or default
   └─ Error is unexpected?
      └─ THROW with context
```

## Related Patterns

- [[logging-strategy]] - When and how to log
- [[storage-error-handling]] - Storage-specific patterns
- [[validation-patterns]] - Input validation approaches

## Open Questions

1. Should we create a base `CorticError` class for all custom errors?
2. What's the right balance between debug logging and performance?
3. Should error context include stack traces in production?
4. How to handle errors in async iterators?

## References

- Discovery: [[2025-10-01-001-code-review-findings]]
- Locations: [[storage-adapters]]
- Process: [[code-review-workflow]]

---
**Next Steps**:
1. Get team consensus on patterns
2. Create linting rules
3. Update code review checklist
4. Gradually migrate existing code
