# REFACTOR-003: Extract Field Type Validators from Large Switch Statement

## Metadata
- **Status:** ready
- **Type:** refactor
- **Epic:** code-quality
- **Priority:** medium
- **Size:** medium
- **Created:** 2025-09-23

## Description
The `validateField` method contains a 90+ line switch statement that violates single responsibility principle and is difficult to maintain and extend.

**Location:** `apps/api/src/services/form-engine/validation-engine.ts:35-127`

## Current Issues
- Single method handles all field type validations
- Adding new field types requires modifying existing method
- Difficult to test individual field type logic
- High cyclomatic complexity

## Acceptance Criteria
- [ ] Extract validators for all current field types:
  - text, email, number, date, select, radio
  - checkbox, file, textarea, url, tel, password
  - Custom field types
- [ ] Create validator registry with:
  - Type-safe registration
  - Runtime validator discovery
  - Default validator fallback
  - Validator composition support
- [ ] Ensure zero functional changes:
  - All existing tests must pass
  - Error messages remain identical
  - Validation order preserved
- [ ] Add comprehensive test coverage:
  - Unit test each validator (aim for 100%)
  - Integration tests for registry
  - Performance regression tests
- [ ] Documentation:
  - How to add new validators
  - Validator interface contract
  - Common validation patterns

## Implementation Plan

### Step 1: Create Validator Interface
```typescript
// validation/types.ts
interface ValidationContext {
  field: FormField;
  value: unknown;
  formData?: Record<string, unknown>; // For cross-field validation
  locale?: string;
}

interface FieldValidator<T = unknown> {
  type: FieldType;
  validate(context: ValidationContext): ValidationError[];
  // Optional methods for advanced use
  sanitize?(value: unknown): T;
  coerce?(value: unknown): T;
}
```

### Step 2: Implement Individual Validators
```typescript
// validation/validators/email-validator.ts
export class EmailValidator implements FieldValidator<string> {
  type = FieldType.EMAIL;

  validate({ field, value }: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required check
    if (field.required && !value) {
      errors.push({
        field: field.name,
        message: `${field.label} is required`,
        code: 'REQUIRED'
      });
      return errors; // Skip further validation
    }

    // Type check
    if (value && typeof value !== 'string') {
      errors.push({
        field: field.name,
        message: `${field.label} must be a string`,
        code: 'INVALID_TYPE'
      });
      return errors;
    }

    // Format validation
    if (value && !this.isValidEmail(value)) {
      errors.push({
        field: field.name,
        message: field.errorMessage || 'Please enter a valid email address',
        code: 'INVALID_FORMAT'
      });
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  sanitize(value: unknown): string {
    return String(value || '').toLowerCase().trim();
  }
}
```

### Step 3: Create Validator Registry
```typescript
// validation/validator-registry.ts
export class ValidatorRegistry {
  private validators = new Map<FieldType, FieldValidator>();
  private defaultValidator: FieldValidator;

  constructor() {
    this.defaultValidator = new DefaultValidator();
    this.registerBuiltInValidators();
  }

  register(validator: FieldValidator): void {
    if (this.validators.has(validator.type)) {
      console.warn(`Overwriting validator for type: ${validator.type}`);
    }
    this.validators.set(validator.type, validator);
  }

  get(type: FieldType): FieldValidator {
    return this.validators.get(type) || this.defaultValidator;
  }

  private registerBuiltInValidators(): void {
    // Register all built-in validators
    this.register(new EmailValidator());
    this.register(new NumberValidator());
    this.register(new DateValidator());
    this.register(new SelectValidator());
    this.register(new FileValidator());
    // ... etc
  }
}
```

### Step 4: Refactor ValidationEngine
```typescript
// Before
private validateField(field: FormField, value: any): string[] {
  switch(field.type) {
    case 'email': // 20 lines of email validation
    case 'number': // 15 lines of number validation
    // ... 90+ lines total
  }
}

// After
class ValidationEngine {
  private registry = new ValidatorRegistry();

  private validateField(field: FormField, value: any, formData?: any): ValidationError[] {
    const validator = this.registry.get(field.type);
    return validator.validate({
      field,
      value,
      formData,
      locale: this.locale
    });
  }

  // Public API for custom validators
  registerValidator(validator: FieldValidator): void {
    this.registry.register(validator);
  }
}
```

## Benefits
- Easier to add new field types
- Better testability
- Lower cyclomatic complexity
- Follows open/closed principle
- Plugin-style architecture

## Testing Strategy

### Unit Tests (one file per validator)
```typescript
// email-validator.test.ts
describe('EmailValidator', () => {
  it('validates required fields');
  it('accepts valid email formats');
  it('rejects invalid email formats');
  it('handles empty values correctly');
  it('sanitizes email to lowercase');
  it('uses custom error messages');
});
```

### Integration Tests
```typescript
// validation-engine.test.ts
describe('ValidationEngine Refactoring', () => {
  it('maintains backward compatibility');
  it('validates complex forms correctly');
  it('handles custom validators');
  it('falls back to default validator');
});
```

### Performance Tests
```typescript
// validation-performance.test.ts
describe('Validation Performance', () => {
  it('validates 1000 fields in < 100ms');
  it('registry lookup is O(1)');
  it('no memory leaks with repeated validation');
});
```

## Migration Checklist
- [ ] Create validator interface and base class
- [ ] Implement all field type validators
- [ ] Create and test validator registry
- [ ] Refactor validateField to use registry
- [ ] Ensure all existing tests pass
- [ ] Add new unit tests for validators
- [ ] Performance benchmarking
- [ ] Update documentation

## Branch Naming
`task/REFACTOR-003-extract-field-validators`

## Effort Estimate
- Implementation: 6-8 hours
- Testing: 3-4 hours
- Documentation: 1 hour

## Risk Assessment
- **Risk**: Breaking existing validation logic
- **Mitigation**: Comprehensive test coverage before refactoring
- **Risk**: Performance degradation
- **Mitigation**: Benchmark before/after, optimize if needed