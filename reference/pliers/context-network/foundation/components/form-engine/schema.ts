/**
 * Form Engine TypeScript Interfaces and Zod Schemas
 *
 * This file contains all TypeScript interfaces and Zod schemas for the Form Engine component.
 * It provides runtime validation and type safety for form definitions, submissions, and related data.
 */

import { z } from 'zod';

// ============================================================================
// Base Types and Enums
// ============================================================================

export const FormStatusSchema = z.enum(['draft', 'published', 'deprecated', 'archived']);
export type FormStatus = z.infer<typeof FormStatusSchema>;

export const SubmissionStatusSchema = z.enum(['draft', 'submitted', 'processing', 'approved', 'rejected', 'completed']);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
export type SemVer = z.infer<typeof SemVerSchema>;

// ============================================================================
// Field Type System
// ============================================================================

export const FieldTypeSchema = z.enum([
  // Basic Input Types
  'text', 'textarea', 'email', 'password', 'url', 'tel',

  // Numeric Types
  'number', 'integer', 'decimal', 'currency', 'percentage',

  // Date and Time Types
  'date', 'time', 'datetime', 'datetime-local', 'month', 'week',

  // Selection Types
  'select', 'multiselect', 'radio', 'checkbox', 'checkboxgroup', 'toggle',

  // File and Media Types
  'file', 'files', 'image', 'document',

  // Advanced Types
  'signature', 'location', 'rating', 'slider', 'color', 'json', 'markdown',

  // Layout and Grouping Types
  'section', 'fieldset', 'tabs', 'accordion', 'repeater', 'grid'
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

// ============================================================================
// Validation System
// ============================================================================

export const ValidationOperatorSchema = z.enum([
  'equals', 'not_equals', 'gt', 'gte', 'lt', 'lte',
  'contains', 'not_contains', 'starts_with', 'ends_with',
  'in', 'not_in', 'matches', 'not_matches', 'is_empty', 'is_not_empty'
]);
export type ValidationOperator = z.infer<typeof ValidationOperatorSchema>;

export const ValidationRuleSchema = z.object({
  type: z.string(),
  message: z.string().optional(),
  params: z.record(z.any()).optional(),
  async: z.boolean().optional().default(false)
});
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

export const FieldValidationSchema = z.object({
  required: z.boolean().optional().default(false),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
  custom: z.array(ValidationRuleSchema).optional(),
  dependencies: z.array(z.string()).optional()
});
export type FieldValidation = z.infer<typeof FieldValidationSchema>;

export const ValidationErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
  value: z.any(),
  context: z.record(z.any()).optional()
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationErrorSchema).optional()
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================================================
// Conditional Logic System
// ============================================================================

export const ConditionalOperatorSchema = z.enum([
  'equals', 'not_equals', 'gt', 'gte', 'lt', 'lte',
  'contains', 'not_contains', 'in', 'not_in', 'is_empty', 'is_not_empty',
  'and', 'or', 'not'
]);
export type ConditionalOperator = z.infer<typeof ConditionalOperatorSchema>;

export const ConditionalConditionSchema: z.ZodSchema<any> = z.lazy(() =>
  z.union([
    z.object({
      field: z.string(),
      operator: ConditionalOperatorSchema,
      value: z.any()
    }),
    z.object({
      operator: z.literal('and'),
      conditions: z.array(ConditionalConditionSchema)
    }),
    z.object({
      operator: z.literal('or'),
      conditions: z.array(ConditionalConditionSchema)
    }),
    z.object({
      operator: z.literal('not'),
      condition: ConditionalConditionSchema
    })
  ])
);
export type ConditionalCondition = {
  field?: string;
  operator: ConditionalOperator;
  value?: any;
  conditions?: ConditionalCondition[];
  condition?: ConditionalCondition;
};

export const ConditionalActionSchema = z.enum(['show', 'hide', 'enable', 'disable', 'require', 'optional', 'set_value']);
export type ConditionalAction = z.infer<typeof ConditionalActionSchema>;

export const ConditionalRuleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  condition: ConditionalConditionSchema,
  actions: z.array(z.object({
    action: ConditionalActionSchema,
    target: z.string(), // field ID or section ID
    value: z.any().optional()
  })),
  priority: z.number().optional().default(0)
});
export type ConditionalRule = z.infer<typeof ConditionalRuleSchema>;

// ============================================================================
// UI and Layout System
// ============================================================================

export const LayoutTypeSchema = z.enum(['grid', 'flex', 'stack', 'inline', 'table']);
export type LayoutType = z.infer<typeof LayoutTypeSchema>;

export const ThemeVariantSchema = z.enum(['primary', 'secondary', 'success', 'warning', 'error', 'info']);
export type ThemeVariant = z.infer<typeof ThemeVariantSchema>;

export const SizeVariantSchema = z.enum(['xs', 'sm', 'md', 'lg', 'xl']);
export type SizeVariant = z.infer<typeof SizeVariantSchema>;

export const UIHintsSchema = z.object({
  label: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  description: z.string().optional(),

  // Layout
  width: z.union([z.literal('auto'), z.literal('full'), z.literal('fit'), z.number()]).optional(),
  order: z.number().optional(),
  group: z.string().optional(),

  // Styling
  variant: ThemeVariantSchema.optional(),
  size: SizeVariantSchema.optional(),
  className: z.string().optional(),
  style: z.record(z.string()).optional(),

  // Validation UI
  validation: z.object({
    showErrorsOn: z.enum(['blur', 'change', 'submit']).optional(),
    errorPosition: z.enum(['above', 'below', 'inline']).optional(),
    showSuccessState: z.boolean().optional()
  }).optional(),

  // Field-specific hints
  options: z.array(z.object({
    label: z.string(),
    value: z.any(),
    disabled: z.boolean().optional(),
    description: z.string().optional()
  })).optional(),

  // Advanced UI features
  autocomplete: z.string().optional(),
  readonly: z.boolean().optional(),
  hidden: z.boolean().optional(),
  tabIndex: z.number().optional()
});
export type UIHints = z.infer<typeof UIHintsSchema>;

export const LayoutConfigSchema = z.object({
  type: LayoutTypeSchema,
  columns: z.number().optional(),
  gap: z.string().optional(),
  breakpoints: z.record(z.number()).optional(),
  alignment: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  direction: z.enum(['row', 'column']).optional()
});
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

// ============================================================================
// Field Definition System
// ============================================================================

export const FieldOptionSchema = z.object({
  label: z.string(),
  value: z.any(),
  disabled: z.boolean().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
export type FieldOption = z.infer<typeof FieldOptionSchema>;

export const FieldDefinitionSchema = z.object({
  id: z.string(),
  type: FieldTypeSchema,
  name: z.string(),

  // Core properties
  defaultValue: z.any().optional(),
  required: z.boolean().optional().default(false),
  disabled: z.boolean().optional().default(false),
  readonly: z.boolean().optional().default(false),

  // Validation
  validation: FieldValidationSchema.optional(),

  // UI and rendering
  ui: UIHintsSchema.optional(),

  // Field-specific configuration
  options: z.array(FieldOptionSchema).optional(),
  multiple: z.boolean().optional(),
  accept: z.string().optional(), // for file fields
  maxFiles: z.number().optional(), // for file fields
  maxFileSize: z.number().optional(), // for file fields

  // Advanced features
  computed: z.object({
    formula: z.string(),
    dependencies: z.array(z.string())
  }).optional(),

  // Metadata
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),

  // Nested structure for complex fields
  fields: z.array(z.lazy(() => FieldDefinitionSchema)).optional(), // for fieldset, section, etc.

  // Conditional visibility and behavior
  conditions: z.array(ConditionalRuleSchema).optional()
});
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// ============================================================================
// Form Definition System
// ============================================================================

export const FormMetadataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  organization: z.string().optional(),
  version: SemVerSchema,

  // Form behavior
  allowMultipleSubmissions: z.boolean().optional().default(false),
  requireAuthentication: z.boolean().optional().default(true),
  saveProgress: z.boolean().optional().default(true),
  showProgressBar: z.boolean().optional().default(false),

  // Submission settings
  submitButtonText: z.string().optional().default('Submit'),
  successMessage: z.string().optional(),
  errorMessage: z.string().optional(),
  redirectUrl: z.string().optional(),

  // Workflow integration
  workflowId: z.string().optional(),
  statusField: z.string().optional(),

  // Advanced settings
  encryptSensitiveData: z.boolean().optional().default(false),
  retentionPeriod: z.number().optional(), // days
  notificationRules: z.array(z.object({
    event: z.string(),
    recipients: z.array(z.string()),
    template: z.string().optional()
  })).optional(),

  // Custom metadata
  custom: z.record(z.any()).optional()
});
export type FormMetadata = z.infer<typeof FormMetadataSchema>;

export const FormSchemaSchema = z.object({
  fields: z.array(FieldDefinitionSchema),
  layout: LayoutConfigSchema.optional(),
  validation: z.object({
    rules: z.array(ValidationRuleSchema).optional(),
    async: z.boolean().optional().default(false),
    debounceMs: z.number().optional().default(300)
  }).optional(),
  conditional: z.object({
    rules: z.array(ConditionalRuleSchema).optional(),
    evaluationMode: z.enum(['eager', 'lazy']).optional().default('lazy')
  }).optional()
});
export type FormSchema = z.infer<typeof FormSchemaSchema>;

export const FormInheritanceSchema = z.object({
  extends: z.string().optional(), // parent form ID
  mixins: z.array(z.string()).optional(), // mixin form IDs
  overrides: z.record(z.any()).optional(), // field overrides
  additions: z.array(FieldDefinitionSchema).optional() // additional fields
});
export type FormInheritance = z.infer<typeof FormInheritanceSchema>;

export const FormDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: SemVerSchema,
  status: FormStatusSchema,

  // Core form structure
  metadata: FormMetadataSchema,
  schema: FormSchemaSchema,

  // Inheritance and composition
  inheritance: FormInheritanceSchema.optional(),

  // Timestamps and audit
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),

  // Version control
  parentVersion: SemVerSchema.optional(),
  changelog: z.string().optional(),
  migrationScript: z.string().optional(),

  // Compiled/resolved form (computed field)
  resolved: FormSchemaSchema.optional()
});
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;

// ============================================================================
// Form Submission System
// ============================================================================

export const SubmissionMetadataSchema = z.object({
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  referrer: z.string().optional(),
  sessionId: z.string().optional(),
  timeZone: z.string().optional(),
  locale: z.string().optional(),

  // Submission context
  source: z.enum(['web', 'mobile', 'api', 'import']).optional(),
  channel: z.string().optional(),
  campaign: z.string().optional(),

  // Processing metadata
  processingTime: z.number().optional(), // milliseconds
  validationTime: z.number().optional(), // milliseconds
  fileUploads: z.array(z.object({
    fieldId: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    contentType: z.string(),
    storageUrl: z.string()
  })).optional(),

  // Custom metadata
  custom: z.record(z.any()).optional()
});
export type SubmissionMetadata = z.infer<typeof SubmissionMetadataSchema>;

export const FormSubmissionSchema = z.object({
  id: z.string().uuid(),
  formDefinitionId: z.string().uuid(),
  formVersion: SemVerSchema,
  status: SubmissionStatusSchema,

  // Submission data
  data: z.record(z.any()), // field_id -> value mapping
  files: z.record(z.object({
    name: z.string(),
    size: z.number(),
    type: z.string(),
    url: z.string(),
    metadata: z.record(z.any()).optional()
  })).optional(),

  // Validation
  validationErrors: z.array(ValidationErrorSchema).optional(),
  isValid: z.boolean(),

  // Metadata and context
  metadata: SubmissionMetadataSchema.optional(),

  // Workflow and processing
  workflowState: z.record(z.any()).optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),

  // Timestamps
  submittedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Audit trail
  submittedBy: z.string().uuid().optional(),
  lastModifiedBy: z.string().uuid(),
  revisionHistory: z.array(z.object({
    timestamp: z.string().datetime(),
    userId: z.string().uuid(),
    changes: z.record(z.any()),
    comment: z.string().optional()
  })).optional()
});
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

// ============================================================================
// Query and Search System
// ============================================================================

export const SortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const SortCriteriaSchema = z.object({
  field: z.string(),
  direction: SortDirectionSchema
});
export type SortCriteria = z.infer<typeof SortCriteriaSchema>;

export const FilterCriteriaSchema = z.object({
  field: z.string(),
  operator: ValidationOperatorSchema,
  value: z.any(),
  dataType: z.enum(['string', 'number', 'date', 'boolean', 'array']).optional()
});
export type FilterCriteria = z.infer<typeof FilterCriteriaSchema>;

export const QueryOptionsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(1000).optional().default(50),
  sort: z.array(SortCriteriaSchema).optional(),
  filters: z.array(FilterCriteriaSchema).optional(),
  search: z.string().optional(),
  fields: z.array(z.string()).optional(), // field selection
  include: z.array(z.string()).optional() // related data to include
});
export type QueryOptions = z.infer<typeof QueryOptionsSchema>;

export const FormQuerySchema = QueryOptionsSchema.extend({
  status: z.array(FormStatusSchema).optional(),
  category: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
});
export type FormQuery = z.infer<typeof FormQuerySchema>;

export const SubmissionQuerySchema = QueryOptionsSchema.extend({
  formId: z.string().uuid().optional(),
  status: z.array(SubmissionStatusSchema).optional(),
  submittedBy: z.array(z.string().uuid()).optional(),
  dateRange: z.object({
    field: z.enum(['createdAt', 'updatedAt', 'submittedAt', 'completedAt']),
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  dataFilters: z.array(z.object({
    field: z.string(), // path in submission data (e.g., "contact.email")
    operator: ValidationOperatorSchema,
    value: z.any()
  })).optional()
});
export type SubmissionQuery = z.infer<typeof SubmissionQuerySchema>;

// ============================================================================
// API Response Types
// ============================================================================

export const PaginationInfoSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
});
export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: PaginationInfoSchema,
    metadata: z.record(z.any()).optional()
  });

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationInfo;
  metadata?: Record<string, any>;
};

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional()
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// Event System Integration
// ============================================================================

export const FormEventTypeSchema = z.enum([
  'form.definition.created',
  'form.definition.updated',
  'form.definition.published',
  'form.definition.deprecated',
  'form.definition.deleted',
  'form.submission.created',
  'form.submission.updated',
  'form.submission.submitted',
  'form.submission.approved',
  'form.submission.rejected',
  'form.submission.completed'
]);
export type FormEventType = z.infer<typeof FormEventTypeSchema>;

export const FormEventSchema = z.object({
  id: z.string().uuid(),
  type: FormEventTypeSchema,
  timestamp: z.string().datetime(),
  source: z.string(),

  // Event data
  formId: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),

  // Event payload
  data: z.record(z.any()),
  metadata: z.record(z.any()).optional(),

  // Event context
  correlationId: z.string().optional(),
  causationId: z.string().optional()
});
export type FormEvent = z.infer<typeof FormEventSchema>;

// ============================================================================
// Plugin System Integration
// ============================================================================

export const PluginHookSchema = z.enum([
  'before_form_create',
  'after_form_create',
  'before_form_update',
  'after_form_update',
  'before_form_delete',
  'after_form_delete',
  'before_submission_create',
  'after_submission_create',
  'before_submission_update',
  'after_submission_update',
  'before_validation',
  'after_validation',
  'before_conditional_evaluation',
  'after_conditional_evaluation'
]);
export type PluginHook = z.infer<typeof PluginHookSchema>;

export const PluginContextSchema = z.object({
  hook: PluginHookSchema,
  formDefinition: FormDefinitionSchema.optional(),
  submission: FormSubmissionSchema.optional(),
  user: z.object({
    id: z.string().uuid(),
    role: z.string(),
    permissions: z.array(z.string())
  }).optional(),
  metadata: z.record(z.any()).optional()
});
export type PluginContext = z.infer<typeof PluginContextSchema>;

// ============================================================================
// Configuration and Settings
// ============================================================================

export const FormEngineConfigSchema = z.object({
  database: z.object({
    url: z.string(),
    maxConnections: z.number().default(20),
    connectionTimeout: z.number().default(30000),
    queryTimeout: z.number().default(60000)
  }),

  cache: z.object({
    provider: z.enum(['redis', 'memory']).default('memory'),
    ttl: z.number().default(300), // seconds
    maxSize: z.number().default(1000),
    keyPrefix: z.string().default('form-engine:')
  }),

  validation: z.object({
    maxFormSize: z.number().default(10 * 1024 * 1024), // 10MB
    maxFieldCount: z.number().default(1000),
    maxNestingLevel: z.number().default(10),
    asyncValidationTimeout: z.number().default(5000), // milliseconds
    enableClientSideValidation: z.boolean().default(true)
  }),

  files: z.object({
    maxFileSize: z.number().default(50 * 1024 * 1024), // 50MB
    maxFilesPerSubmission: z.number().default(10),
    allowedMimeTypes: z.array(z.string()).default([]),
    storageProvider: z.enum(['local', 's3', 'gcs']).default('local'),
    virusScanEnabled: z.boolean().default(false)
  }),

  performance: z.object({
    enableQueryCache: z.boolean().default(true),
    maxConcurrentValidations: z.number().default(100),
    compressionLevel: z.number().min(0).max(9).default(6),
    enableStreaming: z.boolean().default(true)
  }),

  security: z.object({
    enableEncryption: z.boolean().default(false),
    encryptionAlgorithm: z.string().default('aes-256-gcm'),
    enableAuditLog: z.boolean().default(true),
    sessionTimeout: z.number().default(3600), // seconds
    rateLimitRequests: z.number().default(1000), // per hour
    allowedOrigins: z.array(z.string()).default(['*'])
  }),

  features: z.object({
    enableConditionalLogic: z.boolean().default(true),
    enableFormInheritance: z.boolean().default(true),
    enableRealTimeValidation: z.boolean().default(true),
    enableAutoSave: z.boolean().default(true),
    enableVersioning: z.boolean().default(true),
    enablePlugins: z.boolean().default(true)
  })
});
export type FormEngineConfig = z.infer<typeof FormEngineConfigSchema>;

// ============================================================================
// Utility Types and Helpers
// ============================================================================

// Type guards
export const isFormDefinition = (obj: unknown): obj is FormDefinition =>
  FormDefinitionSchema.safeParse(obj).success;

export const isFormSubmission = (obj: unknown): obj is FormSubmission =>
  FormSubmissionSchema.safeParse(obj).success;

export const isValidationError = (obj: unknown): obj is ValidationError =>
  ValidationErrorSchema.safeParse(obj).success;

// Schema validation helpers
export const validateFormDefinition = (data: unknown): ValidationResult => {
  const result = FormDefinitionSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      code: err.code,
      message: err.message,
      value: err.input
    }))
  };
};

export const validateFormSubmission = (data: unknown): ValidationResult => {
  const result = FormSubmissionSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      code: err.code,
      message: err.message,
      value: err.input
    }))
  };
};

// Field type utilities
export const getFieldTypeCategory = (fieldType: FieldType): string => {
  const categories: Record<string, FieldType[]> = {
    input: ['text', 'textarea', 'email', 'password', 'url', 'tel'],
    numeric: ['number', 'integer', 'decimal', 'currency', 'percentage'],
    datetime: ['date', 'time', 'datetime', 'datetime-local', 'month', 'week'],
    selection: ['select', 'multiselect', 'radio', 'checkbox', 'checkboxgroup', 'toggle'],
    file: ['file', 'files', 'image', 'document'],
    advanced: ['signature', 'location', 'rating', 'slider', 'color', 'json', 'markdown'],
    layout: ['section', 'fieldset', 'tabs', 'accordion', 'repeater', 'grid']
  };

  for (const [category, types] of Object.entries(categories)) {
    if (types.includes(fieldType)) {
      return category;
    }
  }

  return 'unknown';
};

// Export all schemas for external use
export const FormEngineSchemas = {
  FormDefinition: FormDefinitionSchema,
  FormSubmission: FormSubmissionSchema,
  FieldDefinition: FieldDefinitionSchema,
  ValidationError: ValidationErrorSchema,
  ValidationResult: ValidationResultSchema,
  ConditionalRule: ConditionalRuleSchema,
  UIHints: UIHintsSchema,
  FormMetadata: FormMetadataSchema,
  SubmissionMetadata: SubmissionMetadataSchema,
  QueryOptions: QueryOptionsSchema,
  FormQuery: FormQuerySchema,
  SubmissionQuery: SubmissionQuerySchema,
  FormEvent: FormEventSchema,
  FormEngineConfig: FormEngineConfigSchema
} as const;

// Export type inference helper
export type InferSchemaType<T extends keyof typeof FormEngineSchemas> =
  z.infer<typeof FormEngineSchemas[T]>;