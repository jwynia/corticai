# Form Engine Specification

## Purpose
Defines the form definition and validation engine that serves as the foundation for all data collection and workflow management in Pliers.

## Classification
- **Domain:** Core Concept
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Evolving

## Overview

The Form Engine is the foundational component that enables dynamic form creation, validation, and management. It provides the schema system that drives all other platform capabilities including data storage, workflow management, and search functionality.

### Core Responsibilities
1. **Form Definition Management** - Create, store, and version form schemas
2. **Field Type System** - Built-in and extensible field types with validation
3. **Relationship Modeling** - Define connections between forms and submissions
4. **Schema Validation** - Runtime validation of form definitions and submissions
5. **Migration Support** - Handle schema evolution and data migration

## Technical Architecture

### Form Definition Schema

```typescript
// Core form definition structure using Zod
const FormDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  version: z.number().int().positive(),

  // Core form structure
  fields: z.array(FieldDefinitionSchema),
  relationships: z.array(RelationshipDefinitionSchema),
  statusDefinitions: z.array(StatusDefinitionSchema),

  // Form behavior configuration
  settings: z.object({
    allowDuplicates: z.boolean().default(true),
    requireAllFields: z.boolean().default(false),
    enableVersioning: z.boolean().default(true),
    autoGenerateIds: z.boolean().default(true)
  }),

  // Validation rules
  validationRules: z.array(ValidationRuleSchema).optional(),

  // Metadata and configuration
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),

  // Audit information
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  isActive: z.boolean().default(true)
});
```

### Field Definition System

```typescript
// Base field definition schema
const BaseFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  readOnly: z.boolean().default(false),
  defaultValue: z.unknown().optional(),

  // Validation configuration
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    custom: z.array(z.string()).optional() // Custom validator IDs
  }).optional(),

  // UI configuration
  ui: z.object({
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    order: z.number().optional(),
    group: z.string().optional(),
    conditionalDisplay: z.object({
      field: z.string(),
      condition: z.enum(['equals', 'notEquals', 'contains', 'notEmpty']),
      value: z.unknown()
    }).optional()
  }).optional()
});

// Field type definitions
const FieldDefinitionSchema = z.discriminatedUnion('type', [
  // Text fields
  BaseFieldSchema.extend({
    type: z.literal('text'),
    config: z.object({
      multiline: z.boolean().default(false),
      maxLength: z.number().optional(),
      format: z.enum(['plain', 'email', 'url', 'phone']).optional()
    }).optional()
  }),

  // Number fields
  BaseFieldSchema.extend({
    type: z.literal('number'),
    config: z.object({
      decimal: z.boolean().default(false),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional()
    }).optional()
  }),

  // Date/time fields
  BaseFieldSchema.extend({
    type: z.literal('date'),
    config: z.object({
      includeTime: z.boolean().default(false),
      format: z.string().optional(),
      timezone: z.string().optional()
    }).optional()
  }),

  // Selection fields
  BaseFieldSchema.extend({
    type: z.literal('select'),
    config: z.object({
      multiple: z.boolean().default(false),
      options: z.array(z.object({
        value: z.string(),
        label: z.string(),
        description: z.string().optional()
      })),
      allowCustom: z.boolean().default(false)
    })
  }),

  // File upload fields
  BaseFieldSchema.extend({
    type: z.literal('file'),
    config: z.object({
      multiple: z.boolean().default(false),
      acceptedTypes: z.array(z.string()).optional(),
      maxSize: z.number().optional(), // bytes
      maxFiles: z.number().optional()
    }).optional()
  }),

  // Relationship fields
  BaseFieldSchema.extend({
    type: z.literal('relationship'),
    config: z.object({
      targetForm: z.string(), // Form ID
      multiple: z.boolean().default(false),
      relationshipType: z.enum(['parent', 'child', 'reference', 'many-to-many']),
      cascadeDelete: z.boolean().default(false)
    })
  }),

  // Calculated fields
  BaseFieldSchema.extend({
    type: z.literal('calculated'),
    config: z.object({
      formula: z.string(), // Expression to calculate value
      dependencies: z.array(z.string()), // Field IDs this calculation depends on
      updateTrigger: z.enum(['onChange', 'onSave', 'manual'])
    })
  })
]);
```

### Relationship System

```typescript
const RelationshipDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),

  // Relationship configuration
  type: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
  sourceForm: z.string(), // Current form ID
  targetForm: z.string(), // Related form ID

  // Field mapping
  sourceField: z.string().optional(), // Field ID in source form
  targetField: z.string().optional(), // Field ID in target form

  // Relationship behavior
  cascadeDelete: z.boolean().default(false),
  enforceIntegrity: z.boolean().default(true),
  allowOrphans: z.boolean().default(false),

  // Validation rules
  required: z.boolean().default(false),
  maxRelations: z.number().optional(),

  metadata: z.record(z.unknown()).optional()
});
```

### Status Definition System

```typescript
const StatusDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // Status properties
  isInitial: z.boolean().default(false),
  isFinal: z.boolean().default(false),
  category: z.enum(['active', 'pending', 'completed', 'cancelled', 'error']),

  // Allowed transitions
  allowedTransitions: z.array(z.object({
    toStatus: z.string(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan']),
      value: z.unknown()
    })).optional(),
    requiredRoles: z.array(z.string()).optional()
  })),

  // Actions on status change
  onEnter: z.array(z.object({
    type: z.enum(['notification', 'webhook', 'calculation', 'plugin']),
    config: z.record(z.unknown())
  })).optional(),

  onExit: z.array(z.object({
    type: z.enum(['validation', 'notification', 'plugin']),
    config: z.record(z.unknown())
  })).optional(),

  // UI configuration
  ui: z.object({
    color: z.string().optional(),
    icon: z.string().optional(),
    badge: z.string().optional()
  }).optional()
});
```

## Core Operations

### Form Definition Management

```typescript
interface FormEngineOperations {
  // Form lifecycle
  createForm(definition: FormDefinition): Promise<FormDefinition>;
  updateForm(id: string, updates: Partial<FormDefinition>): Promise<FormDefinition>;
  deleteForm(id: string): Promise<void>;

  // Form retrieval
  getForm(id: string, version?: number): Promise<FormDefinition>;
  listForms(filters?: FormFilters): Promise<FormDefinition[]>;
  searchForms(query: string): Promise<FormDefinition[]>;

  // Version management
  createVersion(id: string, changes: FormVersionChanges): Promise<FormDefinition>;
  listVersions(id: string): Promise<FormVersion[]>;
  compareVersions(id: string, v1: number, v2: number): Promise<FormDiff>;

  // Schema validation
  validateDefinition(definition: FormDefinition): Promise<ValidationResult>;
  validateSubmission(formId: string, data: unknown): Promise<ValidationResult>;

  // Migration support
  generateMigration(fromVersion: FormDefinition, toVersion: FormDefinition): Promise<Migration>;
  executeMigration(migration: Migration): Promise<MigrationResult>;
}
```

### Field Type System

```typescript
interface FieldTypeRegistry {
  // Built-in types
  registerBuiltInTypes(): void;

  // Custom types
  registerCustomType(definition: CustomFieldTypeDefinition): void;
  getFieldType(type: string): FieldTypeDefinition;
  listFieldTypes(): FieldTypeDefinition[];

  // Validation
  validateFieldValue(type: string, value: unknown, config?: unknown): ValidationResult;
  formatFieldValue(type: string, value: unknown, config?: unknown): string;

  // UI generation
  generateFieldComponent(field: FieldDefinition): UIComponent;
}

// Custom field type definition
interface CustomFieldTypeDefinition {
  type: string;
  name: string;
  description: string;
  configSchema: ZodSchema;
  validationSchema: ZodSchema;
  defaultConfig: unknown;
  uiComponent: string; // Component name for UI generation

  // Custom validation logic
  validate(value: unknown, config: unknown): ValidationResult;
  format(value: unknown, config: unknown): string;
  parse(input: string, config: unknown): unknown;
}
```

## Storage Implementation

### PostgreSQL Schema

```sql
-- Form definitions table
CREATE TABLE form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  definition JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,

  CONSTRAINT form_definitions_definition_valid
    CHECK (jsonb_typeof(definition) = 'object'),

  UNIQUE(name, version)
);

-- Indexes for performance
CREATE INDEX idx_form_definitions_active ON form_definitions (is_active) WHERE is_active = true;
CREATE INDEX idx_form_definitions_name ON form_definitions (name);
CREATE INDEX idx_form_definitions_created_at ON form_definitions (created_at);
CREATE GIN INDEX idx_form_definitions_definition ON form_definitions USING gin (definition);

-- Form definition validation constraint
ALTER TABLE form_definitions
ADD CONSTRAINT form_definition_schema_valid
CHECK (
  definition ? 'id' AND
  definition ? 'name' AND
  definition ? 'fields' AND
  jsonb_typeof(definition->'fields') = 'array'
);

-- Field type registry table
CREATE TABLE field_types (
  type VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  config_schema JSONB NOT NULL,
  validation_schema JSONB NOT NULL,
  default_config JSONB,
  ui_component VARCHAR(100),
  is_built_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Caching Strategy

```typescript
interface FormEngineCache {
  // Form definition caching
  cacheFormDefinition(form: FormDefinition): Promise<void>;
  getCachedForm(id: string, version?: number): Promise<FormDefinition | null>;
  invalidateForm(id: string): Promise<void>;

  // Field type caching
  cacheFieldTypes(): Promise<void>;
  getCachedFieldType(type: string): FieldTypeDefinition | null;

  // Validation result caching
  cacheValidationResult(key: string, result: ValidationResult): Promise<void>;
  getCachedValidation(key: string): Promise<ValidationResult | null>;
}
```

## Event Integration

### Form Events

```typescript
// Events emitted by the form engine
const FormEvents = {
  FormCreated: 'form.created',
  FormUpdated: 'form.updated',
  FormDeleted: 'form.deleted',
  FormVersionCreated: 'form.version.created',
  FieldTypeRegistered: 'fieldType.registered',
  ValidationFailed: 'validation.failed'
} as const;

// Event payloads
interface FormCreatedEvent {
  formId: string;
  definition: FormDefinition;
  createdBy: string;
  timestamp: Date;
}

interface FormUpdatedEvent {
  formId: string;
  previousVersion: number;
  newVersion: number;
  changes: FormDiff;
  updatedBy: string;
  timestamp: Date;
}
```

## AI Integration Points

### AI-Enhanced Form Design

```typescript
interface AIFormAssistant {
  // Form generation from natural language
  generateFormFromDescription(description: string): Promise<FormDefinition>;

  // Field suggestions
  suggestFields(context: FormDesignContext): Promise<FieldSuggestion[]>;
  suggestValidation(field: FieldDefinition): Promise<ValidationSuggestion[]>;

  // Form optimization
  optimizeForm(form: FormDefinition): Promise<FormOptimization>;
  analyzeFormUsability(form: FormDefinition): Promise<UsabilityAnalysis>;

  // Relationship suggestions
  suggestRelationships(form: FormDefinition, existingForms: FormDefinition[]): Promise<RelationshipSuggestion[]>;
}
```

## Testing Strategy

### Unit Testing

```typescript
// Test structure for form engine
describe('FormEngine', () => {
  describe('Form Definition Management', () => {
    it('should create valid form definitions');
    it('should validate form schemas');
    it('should handle version management');
    it('should manage form lifecycle');
  });

  describe('Field Type System', () => {
    it('should register built-in field types');
    it('should support custom field types');
    it('should validate field values');
    it('should format field output');
  });

  describe('Relationship Management', () => {
    it('should define form relationships');
    it('should validate relationship integrity');
    it('should handle cascade operations');
  });
});
```

### Integration Testing

```typescript
// Integration test scenarios
describe('Form Engine Integration', () => {
  it('should integrate with event system');
  it('should integrate with submission engine');
  it('should integrate with search engine');
  it('should integrate with AI services');
  it('should handle database operations');
  it('should support caching operations');
});
```

## Performance Considerations

### Optimization Strategies
1. **Schema Caching** - Cache frequently accessed form definitions
2. **Validation Optimization** - Pre-compile validation schemas
3. **Database Indexing** - Strategic JSONB indexing for form queries
4. **Lazy Loading** - Load form components on demand
5. **Batch Operations** - Bulk validation and processing

### Scalability Patterns
1. **Horizontal Scaling** - Stateless design enables scaling
2. **Read Replicas** - Separate read workloads for form definitions
3. **Partitioning** - Time-based partitioning for large form catalogs
4. **CDN Caching** - Static form definition caching

## Security Considerations

### Access Control
- Role-based permissions for form creation and modification
- Field-level read/write permissions
- Version access control and audit trails

### Data Protection
- Input sanitization for all form fields
- SQL injection prevention in dynamic queries
- XSS protection in form rendering
- File upload security and scanning

## Migration and Deployment

### Schema Migration Strategy
```typescript
interface MigrationStrategy {
  // Backward compatibility
  maintainBackwardCompatibility(versions: number): Promise<void>;

  // Data migration
  migrateFormSubmissions(fromVersion: number, toVersion: number): Promise<void>;

  // Zero-downtime deployment
  deployNewVersion(definition: FormDefinition): Promise<void>;
}
```

## Extensibility Through Forms

### Form-Driven Feature Development

The Form Engine serves as the foundation for extending Pliers functionality. Rather than building custom solutions, new features should first be considered as form types to leverage the existing infrastructure.

#### Benefits of Form-Based Features

1. **Automatic Infrastructure**: Every form type automatically receives:
   - CRUD operations and REST API endpoints
   - Validation and type safety
   - UI generation and rendering
   - Search and filtering capabilities
   - Audit trails and versioning
   - Event handling and plugin integration

2. **Consistency**: All features follow the same patterns for:
   - Data access and modification
   - User interface presentation
   - Permission and security models
   - Integration points

3. **Rapid Development**: New features can be prototyped and deployed quickly by:
   - Defining a form schema
   - Leveraging existing field types
   - Using standard workflows
   - Applying existing plugins

#### Successful Form-Based Features

##### System Configuration
```typescript
// Site settings implemented as a form
const SiteSettingsForm = {
  name: "site_settings",
  fields: [
    { type: "text", name: "site_name", required: true },
    { type: "file", name: "logo", config: { acceptedTypes: ["image/*"] } },
    { type: "color", name: "primary_color" },
    { type: "json", name: "feature_flags", config: { schema: featureFlagSchema } }
  ]
};
```

##### User Profiles
```typescript
// Person profiles beyond authentication
const PersonProfileForm = {
  name: "person_profile",
  fields: [
    { type: "text", name: "full_name", required: true },
    { type: "file", name: "avatar" },
    { type: "relationship", name: "department", config: { targetForm: "departments" } },
    { type: "json", name: "preferences", config: { schema: preferenceSchema } }
  ]
};
```

##### Content Management
```typescript
// CMS pages as forms
const ContentPageForm = {
  name: "content_page",
  fields: [
    { type: "text", name: "title", required: true },
    { type: "text", name: "slug", validation: { pattern: "^[a-z0-9-]+$" } },
    { type: "richtext", name: "content" },
    { type: "relationship", name: "parent_page", config: { targetForm: "content_page" } }
  ],
  statusDefinitions: [
    { id: "draft", name: "Draft" },
    { id: "published", name: "Published" },
    { id: "archived", name: "Archived" }
  ]
};
```

##### Dashboard Widgets
```typescript
// Widget configuration as forms
const WidgetConfigForm = {
  name: "widget_config",
  fields: [
    { type: "select", name: "widget_type", config: { options: widgetTypes } },
    { type: "number", name: "grid_x", validation: { min: 0, max: 12 } },
    { type: "number", name: "grid_y", validation: { min: 0 } },
    { type: "number", name: "width", validation: { min: 1, max: 12 } },
    { type: "number", name: "height", validation: { min: 1 } },
    { type: "json", name: "display_settings" }
  ]
};

// Widget data query as a form
const WidgetQueryForm = {
  name: "widget_query",
  fields: [
    { type: "relationship", name: "widget_config", config: { targetForm: "widget_config" } },
    { type: "select", name: "source_form", config: { options: availableForms } },
    { type: "json", name: "filters", config: { schema: filterSchema } },
    { type: "text", name: "aggregation", config: { options: ["count", "sum", "avg"] } }
  ]
};
```

#### Guidelines for Form-Based Features

1. **Evaluation Criteria**: Before building custom solutions, ask:
   - Can this feature be modeled as structured data?
   - Does it need CRUD operations?
   - Would it benefit from validation and audit trails?
   - Could users configure it through forms?

2. **Design Approach**:
   - Start with the simplest form definition
   - Use existing field types when possible
   - Leverage relationships for complex data models
   - Add custom validators only when necessary

3. **Extension Points**:
   - Custom field types for specialized UI
   - Plugins for business logic and integrations
   - Calculated fields for derived values
   - Status workflows for lifecycle management

4. **Best Practices**:
   - Document the purpose of each form type
   - Keep form definitions focused and cohesive
   - Use meaningful field names and descriptions
   - Plan for future extensibility

## Relationships
- **Parent Nodes:** [elements/core-components/index.md] - categorizes - Form engine as core component
- **Child Nodes:**
  - [elements/data-models/form_schema.md] - implements - Detailed schema implementations
  - [elements/data-models/field_types.md] - defines - Field type system details
- **Related Nodes:**
  - [elements/core-components/submission_engine.md] - uses - Submissions use form definitions
  - [elements/core-components/event_engine.md] - triggers - Form operations trigger events
  - [elements/core-components/ai_form_assistant.md] - enhances - AI enhances form design

## Navigation Guidance
- **Access Context**: Reference when implementing form-related functionality or understanding form system architecture
- **Common Next Steps**: Review submission engine, event integration, or AI enhancement specifications
- **Related Tasks**: Form system implementation, validation development, schema design
- **Update Patterns**: Update when form requirements change or new field types are needed

## Metadata
- **Created:** 2025-09-20
- **Last Updated:** 2025-09-20
- **Updated By:** Claude/Architecture Planning

## Change History
- 2025-09-20: Initial form engine specification with comprehensive schema and architecture design