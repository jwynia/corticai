# Task: Add Table Name Validation in DuckDB Adapter

## Context
While table names come from configuration, they are still interpolated directly into SQL queries without validation, presenting a potential security risk.

## Original Recommendation
From code review on 2025-09-09:
- Table names should be validated to match safe patterns
- Prevent potential SQL injection through configuration

## Requirements

### Acceptance Criteria
- [ ] Add table name validation in constructor
- [ ] Only allow alphanumeric characters and underscores
- [ ] Throw clear error for invalid table names
- [ ] Add tests for validation
- [ ] Document allowed table name patterns

### Implementation
```typescript
private validateTableName(name: string): void {
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  if (!validPattern.test(name)) {
    throw new StorageError(
      `Invalid table name: "${name}". Table names must start with a letter or underscore and contain only alphanumeric characters and underscores.`,
      StorageErrorCode.INVALID_VALUE,
      { tableName: name }
    )
  }
  
  // Also check reserved keywords
  const reserved = ['SELECT', 'FROM', 'WHERE', 'TABLE', 'INDEX', 'VIEW']
  if (reserved.includes(name.toUpperCase())) {
    throw new StorageError(
      `Table name "${name}" is a reserved SQL keyword`,
      StorageErrorCode.INVALID_VALUE,
      { tableName: name }
    )
  }
}
```

## Effort Estimate
- **Size**: Small (30 minutes)
- **Complexity**: Low
- **Risk**: Low

## Benefits
- Prevents SQL injection through configuration
- Clear error messages for invalid names
- Defense in depth security

## Priority
**Medium** - Security enhancement, though risk is low since config is typically controlled