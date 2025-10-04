# ERROR-001: Add Comprehensive Error Handling for Database Operations

## Metadata
- **Status:** in-progress
- **Type:** enhancement
- **Epic:** reliability
- **Priority:** high
- **Size:** medium
- **Created:** 2025-09-23

## Branch Info
- **Branch:** task/ERROR-001-database-error-handling
- **Worktree:** .worktrees/ERROR-001/
- **PR:** [not yet created]

## Description
Many database operations in FormEngine lack proper error handling, which could lead to unhandled promise rejections and poor user experience.

**Locations:** Multiple methods in `form-engine.ts`

## Current Issues
- Database connection failures not handled
- Transaction rollback not implemented
- Generic error messages to users
- No retry logic for transient failures
- Missing logging of database errors

## Acceptance Criteria
- [ ] Add comprehensive error handling to all FormEngine methods:
  - `createForm()` - handle duplicate slugs, validation errors
  - `updateForm()` - handle not found, version conflicts
  - `deleteForm()` - handle cascade deletes, FK violations
  - `getForm()` - handle not found, permission errors
  - `listForms()` - handle pagination errors
- [ ] Create custom error hierarchy:
  - `DatabaseError` (base class)
  - `ConnectionError` - database unavailable
  - `TransactionError` - rollback needed
  - `ConstraintError` - unique/FK violations
  - `NotFoundError` - resource doesn't exist
  - `ConflictError` - concurrent update conflict
- [ ] Implement transaction management:
  - Auto-rollback on error
  - Nested transaction support
  - Deadlock detection and retry
- [ ] Add exponential backoff retry (3 attempts max):
  - Connection errors: retry with 100ms, 500ms, 2s delays
  - Deadlocks: immediate retry up to 3 times
- [ ] User-friendly error responses:
  - Map technical errors to user messages
  - Include error codes for client handling
  - Never expose internal details in production
- [ ] Add health check endpoint `/api/health/database`:
  - Check connection pool status
  - Run simple SELECT query
  - Report connection count and latency

## Error Handling Strategy
```typescript
// Custom error types
class FormNotFoundError extends Error {
  constructor(formId: string) {
    super(`Form not found: ${formId}`);
    this.name = 'FormNotFoundError';
  }
}

class DatabaseConnectionError extends Error {
  constructor(cause: Error) {
    super('Database connection failed');
    this.name = 'DatabaseConnectionError';
    this.cause = cause;
  }
}

// Enhanced method example
async createForm(definition: FormDefinition, orgId: string, userId: string): Promise<FormModel> {
  try {
    const db = await this.getDatabaseClient();

    // Validation logic...

    const [created] = await db.transaction(async (tx) => {
      return await tx.insert(forms).values({...}).returning();
    });

    logger.info('Form created successfully', { formId: created.id, userId });
    return this.mapToFormModel(created);

  } catch (error) {
    logger.error('Failed to create form', {
      definition: definition.name,
      userId,
      error: error.message
    });

    if (error.code === 'ECONNREFUSED') {
      throw new DatabaseConnectionError(error);
    }

    if (error.constraint === 'forms_slug_org_unique') {
      throw new ConflictError(`Form with slug "${definition.slug}" already exists`);
    }

    throw new ServiceError('Failed to create form', error);
  }
}
```

## Testing Requirements
- Unit tests with mocked database:
  - Simulate connection failures
  - Trigger constraint violations
  - Force transaction rollbacks
  - Test each error type mapping
- Integration tests with test database:
  - Real connection pool exhaustion
  - Concurrent update conflicts
  - Foreign key violation scenarios
  - Deadlock simulation
- Error message tests:
  - Verify no sensitive data in errors
  - Check user messages are clear
  - Validate error codes are consistent
- Performance tests:
  - Retry doesn't cause cascading failures
  - Error handling adds < 10ms overhead
  - Health check responds in < 100ms

## Dependencies
- Existing FormEngine implementation
- Logger configuration
- Database connection pool

## Implementation Files
- `src/lib/form-engine/form-engine.ts` - main implementation
- `src/lib/form-engine/errors.ts` - error classes (new file)
- `src/lib/form-engine/retry.ts` - retry logic (new file)
- `src/api/health.ts` - health check endpoint (new file)

## Branch Naming
`task/ERROR-001-database-error-handling`

## Effort Estimate
- Implementation: 6-8 hours
- Testing: 4-5 hours
- Documentation: 1 hour