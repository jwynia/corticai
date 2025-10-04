/**
 * Submission Engine TypeScript Interfaces and Zod Schemas
 *
 * This file contains all TypeScript interfaces and Zod schemas for the Submission Engine component.
 * It provides runtime validation and type safety for submission data, validation, file attachments,
 * and all related submission operations.
 */

import { z } from 'zod';

// ============================================================================
// Base Types and Enums
// ============================================================================

export const SubmissionStatusSchema = z.enum([
  'draft',
  'partial',
  'validating',
  'submitted',
  'processing',
  'approved',
  'rejected',
  'completed',
  'cancelled'
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const SubmissionChangeTypeSchema = z.enum([
  'create',
  'update',
  'submit',
  'approve',
  'reject',
  'cancel',
  'restore',
  'merge'
]);
export type SubmissionChangeType = z.infer<typeof SubmissionChangeTypeSchema>;

export const CommentTypeSchema = z.enum(['note', 'review', 'approval', 'rejection', 'system']);
export type CommentType = z.infer<typeof CommentTypeSchema>;

export const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
export type SemVer = z.infer<typeof SemVerSchema>;

export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

// ============================================================================
// Core Submission Data Model
// ============================================================================

export const SubmissionMetadataSchema = z.object({
  // User agent and session tracking
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  sessionId: UUIDSchema.optional(),

  // Form completion tracking
  completionPercentage: z.number().min(0).max(100).optional(),
  estimatedTimeRemaining: z.number().optional(), // minutes
  totalTimeSpent: z.number().optional(), // minutes

  // Device and browser info
  deviceType: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  browserName: z.string().optional(),
  browserVersion: z.string().optional(),
  screenResolution: z.string().optional(),

  // Collaboration info
  collaborators: z.array(UUIDSchema).optional(),
  lockedFields: z.array(z.string()).optional(),
  lastActiveUsers: z.array(z.object({
    userId: UUIDSchema,
    lastSeen: z.date(),
    currentField: z.string().optional()
  })).optional(),

  // Custom metadata
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  externalId: z.string().optional(),
  customFields: z.record(z.any()).optional()
});
export type SubmissionMetadata = z.infer<typeof SubmissionMetadataSchema>;

export const SubmissionDataSchema = z.record(z.any()); // JSONB field data
export type SubmissionData = z.infer<typeof SubmissionDataSchema>;

export const EncryptedFieldsSchema = z.record(z.string()); // field_id -> encrypted_value
export type EncryptedFields = z.infer<typeof EncryptedFieldsSchema>;

// ============================================================================
// Validation System
// ============================================================================

export const ValidationErrorSchema = z.object({
  fieldId: z.string(),
  errorCode: z.string(),
  message: z.string(),
  value: z.any(),
  context: z.record(z.any()).optional(),
  severity: z.enum(['error', 'warning']).default('error')
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

export const FieldValidationErrorSchema = z.object({
  fieldId: z.string(),
  errorCode: z.string(),
  message: z.string(),
  value: z.any(),
  context: z.record(z.any()).optional()
});
export type FieldValidationError = z.infer<typeof FieldValidationErrorSchema>;

export const FormValidationErrorSchema = z.object({
  errorCode: z.string(),
  message: z.string(),
  affectedFields: z.array(z.string()),
  context: z.record(z.any()).optional()
});
export type FormValidationError = z.infer<typeof FormValidationErrorSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationErrorSchema),
  fieldErrors: z.array(FieldValidationErrorSchema),
  formErrors: z.array(FormValidationErrorSchema),
  errorCount: z.number(),
  warningCount: z.number(),
  validatedAt: z.date(),
  validationDuration: z.number() // milliseconds
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const ValidationContextSchema = z.object({
  submissionId: UUIDSchema,
  formDefinitionId: UUIDSchema,
  formVersion: SemVerSchema,
  userId: UUIDSchema.optional(),
  validationType: z.enum(['field', 'section', 'form', 'full']),
  skipAsyncValidation: z.boolean().default(false),
  validationRules: z.record(z.any()).optional()
});
export type ValidationContext = z.infer<typeof ValidationContextSchema>;

// ============================================================================
// File Attachment System
// ============================================================================

export const FileTypeConfigSchema = z.object({
  allowedMimeTypes: z.array(z.string()),
  allowedExtensions: z.array(z.string()),
  maxFileSize: z.number().min(1).max(104857600), // 100MB max
  maxTotalSize: z.number().min(1),
  scanForViruses: z.boolean().default(true),
  extractMetadata: z.boolean().default(true),
  generateThumbnails: z.boolean().default(false)
});
export type FileTypeConfig = z.infer<typeof FileTypeConfigSchema>;

export const FileMetadataSchema = z.object({
  // Basic file info
  originalName: z.string(),
  sanitizedName: z.string(),
  fileSize: z.number().min(1),
  mimeType: z.string(),
  extension: z.string(),

  // Security info
  checksum: z.string(),
  virusScanResult: z.enum(['clean', 'infected', 'unknown', 'pending']).optional(),
  virusScanDate: z.date().optional(),

  // Processing info
  thumbnailGenerated: z.boolean().default(false),
  metadataExtracted: z.boolean().default(false),
  processed: z.boolean().default(false),

  // Content metadata (extracted from files)
  dimensions: z.object({
    width: z.number(),
    height: z.number()
  }).optional(),
  duration: z.number().optional(), // for video/audio files
  pageCount: z.number().optional(), // for documents
  wordCount: z.number().optional(), // for text documents

  // EXIF data for images
  exifData: z.record(z.any()).optional(),

  // Custom metadata
  customMetadata: z.record(z.any()).optional()
});
export type FileMetadata = z.infer<typeof FileMetadataSchema>;

export const SubmissionAttachmentSchema = z.object({
  id: UUIDSchema,
  submissionId: UUIDSchema,
  fieldId: z.string(),
  fileName: z.string().max(500),
  fileSize: z.number().min(1).max(104857600),
  mimeType: z.string(),
  storagePath: z.string(),
  checksum: z.string(),
  encrypted: z.boolean().default(false),
  metadata: FileMetadataSchema.optional(),
  uploadedAt: z.date(),
  uploadedBy: UUIDSchema
});
export type SubmissionAttachment = z.infer<typeof SubmissionAttachmentSchema>;

// ============================================================================
// Draft and Version Management
// ============================================================================

export const DraftConfigSchema = z.object({
  autoSaveEnabled: z.boolean().default(true),
  autoSaveIntervalMs: z.number().default(30000),
  maxDrafts: z.number().default(10),
  retentionDays: z.number().default(30),
  compressOldDrafts: z.boolean().default(true)
});
export type DraftConfig = z.infer<typeof DraftConfigSchema>;

export const FieldChangeSchema = z.object({
  fieldId: z.string(),
  oldValue: z.any(),
  newValue: z.any(),
  changeType: z.enum(['add', 'update', 'remove']),
  timestamp: z.date(),
  userId: UUIDSchema.optional()
});
export type FieldChange = z.infer<typeof FieldChangeSchema>;

export const SubmissionChangeSchema = z.object({
  version: z.number().min(1),
  changeType: SubmissionChangeTypeSchema,
  fieldChanges: z.array(FieldChangeSchema),
  metadata: z.object({
    reason: z.string().optional(),
    description: z.string().optional(),
    automated: z.boolean().default(false),
    source: z.enum(['user', 'system', 'api', 'workflow']).default('user')
  }),
  timestamp: z.date(),
  userId: UUIDSchema.optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional()
});
export type SubmissionChange = z.infer<typeof SubmissionChangeSchema>;

// ============================================================================
// Optimistic Locking
// ============================================================================

export const OptimisticLockConfigSchema = z.object({
  enabled: z.boolean().default(true),
  lockVersionField: z.string().default('lock_version'),
  retryAttempts: z.number().default(3),
  retryBackoffMs: z.number().default(100),
  conflictResolution: z.enum(['fail', 'merge', 'overwrite']).default('fail')
});
export type OptimisticLockConfig = z.infer<typeof OptimisticLockConfigSchema>;

export const ConcurrentUpdateErrorSchema = z.object({
  submissionId: UUIDSchema,
  currentVersion: z.number(),
  attemptedVersion: z.number(),
  conflictFields: z.array(z.string()),
  canAutoResolve: z.boolean(),
  mergeStrategy: z.enum(['field_level', 'timestamp_based', 'user_priority']).optional()
});
export type ConcurrentUpdateError = z.infer<typeof ConcurrentUpdateErrorSchema>;

// ============================================================================
// Merge Strategies
// ============================================================================

export const MergeStrategySchema = z.object({
  type: z.enum(['last_write_wins', 'field_level_merge', 'user_resolution']),
  conflictFields: z.array(z.string()),
  autoResolvable: z.boolean(),
  requiresUserInput: z.boolean(),
  preserveHistory: z.boolean().default(true)
});
export type MergeStrategy = z.infer<typeof MergeStrategySchema>;

export const MergeResultSchema = z.object({
  success: z.boolean(),
  mergedData: SubmissionDataSchema,
  conflicts: z.array(z.object({
    fieldId: z.string(),
    localValue: z.any(),
    remoteValue: z.any(),
    resolution: z.enum(['local', 'remote', 'manual']),
    resolvedValue: z.any().optional()
  })),
  requiresUserResolution: z.boolean(),
  newVersion: z.number()
});
export type MergeResult = z.infer<typeof MergeResultSchema>;

// ============================================================================
// Encryption Configuration
// ============================================================================

export const EncryptionConfigSchema = z.object({
  algorithm: z.enum(['AES-256-GCM']).default('AES-256-GCM'),
  keyRotation: z.boolean().default(true),
  encryptedFields: z.array(z.string()),
  keyManagement: z.enum(['envelope', 'direct']).default('envelope'),
  compressionBeforeEncryption: z.boolean().default(true)
});
export type EncryptionConfig = z.infer<typeof EncryptionConfigSchema>;

export const EncryptionMetadataSchema = z.object({
  algorithm: z.string(),
  keyId: z.string(),
  keyVersion: z.number(),
  encryptedAt: z.date(),
  compressed: z.boolean().default(false)
});
export type EncryptionMetadata = z.infer<typeof EncryptionMetadataSchema>;

// ============================================================================
// Comments and Collaboration
// ============================================================================

export const SubmissionCommentSchema = z.object({
  id: UUIDSchema,
  submissionId: UUIDSchema,
  commentText: z.string().min(1).max(10000),
  commentType: CommentTypeSchema.default('note'),
  fieldId: z.string().optional(), // Field-specific comments
  createdAt: z.date(),
  createdBy: UUIDSchema,
  updatedAt: z.date().optional(),
  updatedBy: UUIDSchema.optional(),
  metadata: z.object({
    attachments: z.array(UUIDSchema).optional(),
    mentions: z.array(UUIDSchema).optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});
export type SubmissionComment = z.infer<typeof SubmissionCommentSchema>;

// ============================================================================
// Main Submission Schema
// ============================================================================

export const FormSubmissionSchema = z.object({
  // Primary identifiers
  id: UUIDSchema,
  formDefinitionId: UUIDSchema,
  formVersion: SemVerSchema,

  // Core submission data
  submissionData: SubmissionDataSchema,
  encryptedFields: EncryptedFieldsSchema.optional(),
  metadata: SubmissionMetadataSchema.optional(),

  // State management
  status: SubmissionStatusSchema.default('draft'),
  version: z.number().min(1).default(1),
  lockVersion: z.number().min(0).default(0),

  // Validation tracking
  validationErrors: z.array(ValidationErrorSchema).optional(),
  validationWarnings: z.array(ValidationErrorSchema).optional(),
  lastValidatedAt: z.date().optional(),
  validationResult: ValidationResultSchema.optional(),

  // Lifecycle timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  submittedAt: z.date().optional(),
  completedAt: z.date().optional(),

  // User tracking
  createdBy: UUIDSchema,
  updatedBy: UUIDSchema.optional(),
  submittedBy: UUIDSchema.optional(),

  // Audit and compliance
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  sessionId: UUIDSchema.optional(),

  // Related data
  attachments: z.array(SubmissionAttachmentSchema).optional(),
  comments: z.array(SubmissionCommentSchema).optional(),
  history: z.array(SubmissionChangeSchema).optional()
});
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

// ============================================================================
// History and Audit
// ============================================================================

export const SubmissionHistorySchema = z.object({
  id: UUIDSchema,
  submissionId: UUIDSchema,
  version: z.number().min(1),
  changeType: SubmissionChangeTypeSchema,
  changes: z.object({
    fieldChanges: z.array(FieldChangeSchema),
    statusChange: z.object({
      from: SubmissionStatusSchema.optional(),
      to: SubmissionStatusSchema
    }).optional(),
    metadataChanges: z.record(z.any()).optional()
  }),
  changedAt: z.date(),
  changedBy: UUIDSchema.optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  reason: z.string().optional()
});
export type SubmissionHistory = z.infer<typeof SubmissionHistorySchema>;

// ============================================================================
// Query and Search Schemas
// ============================================================================

export const DateRangeSchema = z.object({
  start: z.date(),
  end: z.date()
}).refine(data => data.start <= data.end, {
  message: "Start date must be before or equal to end date"
});
export type DateRange = z.infer<typeof DateRangeSchema>;

export const FieldSearchCriteriaSchema = z.object({
  fieldId: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in']),
  value: z.any(),
  caseSensitive: z.boolean().default(false)
});
export type FieldSearchCriteria = z.infer<typeof FieldSearchCriteriaSchema>;

export const SubmissionSearchQuerySchema = z.object({
  text: z.string().optional(),
  formId: UUIDSchema.optional(),
  status: z.array(SubmissionStatusSchema).optional(),
  dateRange: DateRangeSchema.optional(),
  fields: z.array(FieldSearchCriteriaSchema).optional(),
  userId: UUIDSchema.optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  includeComments: z.boolean().default(false),
  includeAttachments: z.boolean().default(false),
  includeHistory: z.boolean().default(false)
});
export type SubmissionSearchQuery = z.infer<typeof SubmissionSearchQuerySchema>;

export const SubmissionSearchResultSchema = z.object({
  submissions: z.array(FormSubmissionSchema),
  totalCount: z.number(),
  hasMore: z.boolean(),
  searchDuration: z.number(), // milliseconds
  facets: z.record(z.record(z.number())).optional(),
  aggregations: z.record(z.any()).optional()
});
export type SubmissionSearchResult = z.infer<typeof SubmissionSearchResultSchema>;

// ============================================================================
// Analytics and Reporting
// ============================================================================

export const SubmissionAnalyticsSchema = z.object({
  formId: UUIDSchema,
  dateRange: DateRangeSchema,
  totalSubmissions: z.number(),
  submissionsByStatus: z.record(z.number()),
  submissionsByDate: z.array(z.object({
    date: z.date(),
    count: z.number()
  })),
  averageCompletionTime: z.number(), // minutes
  averageFieldCompletionRate: z.record(z.number()),
  mostCommonValidationErrors: z.array(z.object({
    errorCode: z.string(),
    count: z.number(),
    percentage: z.number()
  })),
  deviceBreakdown: z.record(z.number()),
  browserBreakdown: z.record(z.number()),
  collaborationStats: z.object({
    averageCollaborators: z.number(),
    maxConcurrentUsers: z.number(),
    totalEditingTime: z.number() // minutes
  }).optional()
});
export type SubmissionAnalytics = z.infer<typeof SubmissionAnalyticsSchema>;

// ============================================================================
// Configuration Schemas
// ============================================================================

export const SubmissionEngineConfigSchema = z.object({
  database: z.object({
    url: z.string(),
    maxConnections: z.number().default(100),
    connectionTimeout: z.number().default(30000),
    queryTimeout: z.number().default(60000)
  }),
  storage: z.object({
    provider: z.enum(['filesystem', 's3', 'gcs', 'azure']),
    config: z.record(z.any()),
    encryptionEnabled: z.boolean().default(true)
  }),
  validation: z.object({
    maxSubmissionSize: z.number().default(10485760), // 10MB
    maxFileSize: z.number().default(104857600), // 100MB
    maxTotalFileSize: z.number().default(1073741824), // 1GB
    asyncValidationTimeout: z.number().default(30000),
    enableVirusScanning: z.boolean().default(true)
  }),
  cache: z.object({
    provider: z.enum(['redis', 'memory']),
    ttl: z.number().default(3600),
    maxSize: z.number().default(10000)
  }),
  security: z.object({
    encryptionKey: z.string(),
    encryptionAlgorithm: z.string().default('AES-256-GCM'),
    enableFieldEncryption: z.boolean().default(true),
    enableAuditLogging: z.boolean().default(true)
  }),
  collaboration: z.object({
    enableRealTimeEditing: z.boolean().default(true),
    maxConcurrentUsers: z.number().default(50),
    fieldLockTimeout: z.number().default(300000), // 5 minutes
    presenceTimeout: z.number().default(60000) // 1 minute
  }),
  performance: z.object({
    enableQueryCache: z.boolean().default(true),
    maxConcurrentValidations: z.number().default(100),
    compressionLevel: z.number().default(6),
    enableLazyLoading: z.boolean().default(true)
  })
});
export type SubmissionEngineConfig = z.infer<typeof SubmissionEngineConfigSchema>;

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const CreateSubmissionRequestSchema = z.object({
  formDefinitionId: UUIDSchema,
  formVersion: SemVerSchema.optional(),
  submissionData: SubmissionDataSchema.optional(),
  metadata: SubmissionMetadataSchema.optional(),
  isDraft: z.boolean().default(true)
});
export type CreateSubmissionRequest = z.infer<typeof CreateSubmissionRequestSchema>;

export const UpdateSubmissionRequestSchema = z.object({
  submissionData: SubmissionDataSchema.optional(),
  metadata: SubmissionMetadataSchema.optional(),
  lockVersion: z.number().optional(),
  validateOnUpdate: z.boolean().default(true),
  mergeStrategy: MergeStrategySchema.optional()
});
export type UpdateSubmissionRequest = z.infer<typeof UpdateSubmissionRequestSchema>;

export const SubmitSubmissionRequestSchema = z.object({
  finalValidation: z.boolean().default(true),
  lockVersion: z.number().optional(),
  submissionData: SubmissionDataSchema.optional(),
  comments: z.string().optional()
});
export type SubmitSubmissionRequest = z.infer<typeof SubmitSubmissionRequestSchema>;

export const ValidateSubmissionRequestSchema = z.object({
  validationType: z.enum(['field', 'section', 'form', 'full']).default('full'),
  fieldId: z.string().optional(),
  skipAsyncValidation: z.boolean().default(false)
});
export type ValidateSubmissionRequest = z.infer<typeof ValidateSubmissionRequestSchema>;

export const FileUploadRequestSchema = z.object({
  fieldId: z.string(),
  file: z.any(), // File object
  metadata: FileMetadataSchema.optional(),
  overwrite: z.boolean().default(false)
});
export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;

// ============================================================================
// Event Schemas
// ============================================================================

export const SubmissionEventSchema = z.object({
  type: z.enum([
    'submission_created',
    'submission_updated',
    'submission_submitted',
    'submission_validated',
    'submission_approved',
    'submission_rejected',
    'submission_completed',
    'submission_cancelled',
    'field_updated',
    'file_uploaded',
    'file_deleted',
    'comment_added'
  ]),
  submissionId: UUIDSchema,
  formId: UUIDSchema,
  fieldId: z.string().optional(),
  data: z.any(),
  userId: UUIDSchema.optional(),
  timestamp: z.date(),
  version: z.number().optional(),
  metadata: z.record(z.any()).optional()
});
export type SubmissionEvent = z.infer<typeof SubmissionEventSchema>;

export const CollaborationEventSchema = z.object({
  type: z.enum(['user_joined', 'user_left', 'field_locked', 'field_unlocked', 'presence_update']),
  submissionId: UUIDSchema,
  userId: UUIDSchema,
  fieldId: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
});
export type CollaborationEvent = z.infer<typeof CollaborationEventSchema>;

// ============================================================================
// Error Schemas
// ============================================================================

export const SubmissionEngineErrorSchema = z.object({
  code: z.enum([
    'SUBMISSION_NOT_FOUND',
    'FORM_NOT_FOUND',
    'VALIDATION_FAILED',
    'CONCURRENT_UPDATE',
    'FILE_TOO_LARGE',
    'INVALID_FILE_TYPE',
    'STORAGE_ERROR',
    'ENCRYPTION_ERROR',
    'PERMISSION_DENIED',
    'RATE_LIMIT_EXCEEDED',
    'VIRUS_DETECTED',
    'FIELD_LOCKED',
    'INVALID_STATUS_TRANSITION'
  ]),
  message: z.string(),
  details: z.record(z.any()).optional(),
  context: z.object({
    submissionId: UUIDSchema.optional(),
    fieldId: z.string().optional(),
    userId: UUIDSchema.optional(),
    timestamp: z.date()
  }).optional()
});
export type SubmissionEngineError = z.infer<typeof SubmissionEngineErrorSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates a submission object against the schema
 */
export function validateSubmission(submission: unknown): FormSubmission {
  return FormSubmissionSchema.parse(submission);
}

/**
 * Validates submission data against expected structure
 */
export function validateSubmissionData(data: unknown): SubmissionData {
  return SubmissionDataSchema.parse(data);
}

/**
 * Validates a search query
 */
export function validateSearchQuery(query: unknown): SubmissionSearchQuery {
  return SubmissionSearchQuerySchema.parse(query);
}

/**
 * Creates a new submission with default values
 */
export function createDefaultSubmission(
  formDefinitionId: string,
  formVersion: string,
  userId: string
): Partial<FormSubmission> {
  return {
    formDefinitionId,
    formVersion,
    submissionData: {},
    status: 'draft',
    version: 1,
    lockVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: userId,
    metadata: {
      completionPercentage: 0,
      totalTimeSpent: 0
    }
  };
}

/**
 * Type guards for submission status
 */
export function isDraftStatus(status: SubmissionStatus): boolean {
  return status === 'draft' || status === 'partial';
}

export function isSubmittedStatus(status: SubmissionStatus): boolean {
  return ['submitted', 'processing', 'approved', 'rejected', 'completed'].includes(status);
}

export function isFinalStatus(status: SubmissionStatus): boolean {
  return ['completed', 'cancelled'].includes(status);
}

/**
 * Helper function to check if a field is encrypted
 */
export function isFieldEncrypted(fieldId: string, encryptedFields?: EncryptedFields): boolean {
  return encryptedFields ? fieldId in encryptedFields : false;
}

/**
 * Helper function to get field value (decrypted if necessary)
 */
export function getFieldValue(
  fieldId: string,
  submissionData: SubmissionData,
  encryptedFields?: EncryptedFields
): any {
  if (isFieldEncrypted(fieldId, encryptedFields)) {
    // In a real implementation, this would decrypt the value
    // For now, just return the encrypted value as a placeholder
    return encryptedFields![fieldId];
  }
  return submissionData[fieldId];
}

// ============================================================================
// Export all schemas for external use
// ============================================================================

export const SubmissionEngineSchemas = {
  // Core schemas
  FormSubmission: FormSubmissionSchema,
  SubmissionData: SubmissionDataSchema,
  SubmissionMetadata: SubmissionMetadataSchema,

  // Validation schemas
  ValidationResult: ValidationResultSchema,
  ValidationError: ValidationErrorSchema,
  ValidationContext: ValidationContextSchema,

  // File schemas
  SubmissionAttachment: SubmissionAttachmentSchema,
  FileMetadata: FileMetadataSchema,
  FileTypeConfig: FileTypeConfigSchema,

  // History and audit schemas
  SubmissionHistory: SubmissionHistorySchema,
  SubmissionChange: SubmissionChangeSchema,
  FieldChange: FieldChangeSchema,

  // Search and query schemas
  SubmissionSearchQuery: SubmissionSearchQuerySchema,
  SubmissionSearchResult: SubmissionSearchResultSchema,
  FieldSearchCriteria: FieldSearchCriteriaSchema,

  // Configuration schemas
  SubmissionEngineConfig: SubmissionEngineConfigSchema,
  EncryptionConfig: EncryptionConfigSchema,
  OptimisticLockConfig: OptimisticLockConfigSchema,

  // Request/Response schemas
  CreateSubmissionRequest: CreateSubmissionRequestSchema,
  UpdateSubmissionRequest: UpdateSubmissionRequestSchema,
  SubmitSubmissionRequest: SubmitSubmissionRequestSchema,
  ValidateSubmissionRequest: ValidateSubmissionRequestSchema,

  // Event schemas
  SubmissionEvent: SubmissionEventSchema,
  CollaborationEvent: CollaborationEventSchema,

  // Error schemas
  SubmissionEngineError: SubmissionEngineErrorSchema
} as const;