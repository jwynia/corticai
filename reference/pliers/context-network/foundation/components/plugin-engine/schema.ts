/**
 * Plugin Engine TypeScript Schema Definitions
 *
 * Comprehensive type definitions for the Plugin Engine component,
 * providing type safety for plugin management, execution, and integration.
 */

import { z } from 'zod';

// ============================================================================
// PLUGIN MANIFEST SCHEMAS
// ============================================================================

/**
 * Engine compatibility schema
 */
export const EngineCompatibilitySchema = z.object({
  pliers: z.string(), // Semantic version range (e.g., "^3.0.0")
  node: z.string()    // Node.js version range (e.g., ">=18.0.0")
});

export type EngineCompatibility = z.infer<typeof EngineCompatibilitySchema>;

/**
 * Plugin permissions schema
 */
export const PluginPermissionsSchema = z.object({
  database: z.array(z.enum(['read', 'write', 'execute'])).optional(),
  network: z.array(z.enum(['outbound', 'inbound'])).optional(),
  filesystem: z.array(z.enum(['read', 'write'])).optional(),
  events: z.array(z.enum(['subscribe', 'publish'])).optional(),
  api: z.array(z.enum(['register', 'call'])).optional()
});

export type PluginPermissions = z.infer<typeof PluginPermissionsSchema>;

/**
 * Plugin hook configuration schema
 */
export const PluginHookConfigSchema = z.object({
  priority: z.number().int().min(1).max(1000).default(100),
  async: z.boolean().default(true),
  timeout: z.number().positive().default(30000), // 30 seconds
  retries: z.number().int().min(0).max(5).default(0)
});

export type PluginHookConfig = z.infer<typeof PluginHookConfigSchema>;

/**
 * Plugin API endpoint schema
 */
export const PluginAPIEndpointSchema = z.object({
  path: z.string().regex(/^\/plugins\/[a-z0-9-]+\/.+/),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  handler: z.string().min(1),
  middleware: z.array(z.string()).optional(),
  validation: z.object({
    body: z.record(z.unknown()).optional(),
    query: z.record(z.unknown()).optional(),
    params: z.record(z.unknown()).optional()
  }).optional(),
  rateLimit: z.object({
    requests: z.number().positive(),
    window: z.number().positive() // seconds
  }).optional(),
  auth: z.object({
    required: z.boolean().default(false),
    roles: z.array(z.string()).optional(),
    permissions: z.array(z.string()).optional()
  }).optional()
});

export type PluginAPIEndpoint = z.infer<typeof PluginAPIEndpointSchema>;

/**
 * Plugin configuration schema
 */
export const PluginConfigurationSchema = z.object({
  schema: z.string().optional(), // Path to JSON schema file
  default: z.string().optional() // Path to default config file
});

export type PluginConfiguration = z.infer<typeof PluginConfigurationSchema>;

/**
 * Complete plugin manifest schema
 */
export const PluginManifestSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+/), // Semantic version
  description: z.string().min(10).max(500),
  author: z.string().min(1),
  license: z.string().min(1),
  main: z.string().default('./dist/index.js'),
  types: z.string().optional(),
  engines: EngineCompatibilitySchema,
  keywords: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  permissions: PluginPermissionsSchema.optional(),
  hooks: z.record(z.string(), PluginHookConfigSchema).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  configuration: PluginConfigurationSchema.optional(),
  api: z.object({
    endpoints: z.array(PluginAPIEndpointSchema).optional()
  }).optional()
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// ============================================================================
// PLUGIN LIFECYCLE SCHEMAS
// ============================================================================

/**
 * Plugin state enumeration
 */
export const PluginStateSchema = z.enum([
  'unloaded',
  'loading',
  'loaded',
  'initializing',
  'active',
  'error',
  'stopping',
  'stopped',
  'unloading'
]);

export type PluginState = z.infer<typeof PluginStateSchema>;

/**
 * Plugin lifecycle transition schema
 */
export const PluginTransitionSchema = z.object({
  from: PluginStateSchema,
  to: PluginStateSchema,
  timestamp: z.date(),
  reason: z.string().optional(),
  error: z.string().optional()
});

export type PluginTransition = z.infer<typeof PluginTransitionSchema>;

/**
 * Plugin instance schema
 */
export const PluginInstanceSchema = z.object({
  id: z.string().uuid(),
  manifestId: z.string(),
  version: z.string(),
  state: PluginStateSchema,
  config: z.record(z.unknown()).optional(),
  loadedAt: z.date().optional(),
  activatedAt: z.date().optional(),
  lastError: z.string().optional(),
  metrics: z.object({
    executions: z.number().default(0),
    errors: z.number().default(0),
    avgExecutionTime: z.number().default(0),
    memoryUsage: z.number().default(0),
    cpuUsage: z.number().default(0)
  }).optional()
});

export type PluginInstance = z.infer<typeof PluginInstanceSchema>;

// ============================================================================
// HOOK SYSTEM SCHEMAS
// ============================================================================

/**
 * Hook context metadata schema
 */
export const HookContextMetadataSchema = z.object({
  executionId: z.string().uuid(),
  timestamp: z.date(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional()
});

export type HookContextMetadata = z.infer<typeof HookContextMetadataSchema>;

/**
 * Hook context schema
 */
export const HookContextSchema = z.object({
  hookName: z.string(),
  data: z.record(z.unknown()),
  metadata: HookContextMetadataSchema,
  state: z.map(z.string(), z.unknown()).optional(),
  pluginId: z.string(),
  timeout: z.number().positive().default(30000)
});

export type HookContext = z.infer<typeof HookContextSchema>;

/**
 * Hook execution result schema
 */
export const HookExecutionResultSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  duration: z.number(),
  pluginId: z.string(),
  hookName: z.string(),
  metadata: HookContextMetadataSchema
});

export type HookExecutionResult = z.infer<typeof HookExecutionResultSchema>;

/**
 * Hook registration schema
 */
export const HookRegistrationSchema = z.object({
  pluginId: z.string(),
  hookName: z.string(),
  handler: z.string(), // Function name in plugin
  config: PluginHookConfigSchema,
  registeredAt: z.date()
});

export type HookRegistration = z.infer<typeof HookRegistrationSchema>;

// ============================================================================
// SECURITY AND SANDBOXING SCHEMAS
// ============================================================================

/**
 * Resource limits schema
 */
export const ResourceLimitsSchema = z.object({
  memory: z.number().positive().default(128), // MB
  cpu: z.number().positive().default(1000),   // CPU time in ms
  disk: z.number().positive().default(100),   // MB
  network: z.number().positive().default(1024), // KB/s
  executionTime: z.number().positive().default(30000), // ms
  concurrency: z.number().positive().default(10)
});

export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;

/**
 * Security policies schema
 */
export const SecurityPoliciesSchema = z.object({
  allowedModules: z.array(z.string()).default([]),
  blockedModules: z.array(z.string()).default([]),
  fileAccess: z.array(z.string()).default([]),
  networkDomains: z.array(z.string()).default([]),
  databaseTables: z.array(z.string()).default([])
});

export type SecurityPolicies = z.infer<typeof SecurityPoliciesSchema>;

/**
 * Plugin sandbox configuration schema
 */
export const PluginSandboxSchema = z.object({
  pluginId: z.string(),
  limits: ResourceLimitsSchema,
  policies: SecurityPoliciesSchema,
  isolated: z.boolean().default(true),
  timeout: z.number().positive().default(30000)
});

export type PluginSandbox = z.infer<typeof PluginSandboxSchema>;

// ============================================================================
// DEPENDENCY MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Dependency schema
 */
export const DependencySchema = z.object({
  name: z.string(),
  version: z.string(), // Semantic version range
  optional: z.boolean().default(false),
  scope: z.enum(['runtime', 'peer', 'dev']).default('runtime')
});

export type Dependency = z.infer<typeof DependencySchema>;

/**
 * Dependency conflict schema
 */
export const DependencyConflictSchema = z.object({
  plugin1: z.string(),
  plugin2: z.string(),
  dependency: z.string(),
  version1: z.string(),
  version2: z.string(),
  severity: z.enum(['error', 'warning']),
  resolution: z.string().optional()
});

export type DependencyConflict = z.infer<typeof DependencyConflictSchema>;

/**
 * Dependency graph node schema
 */
export const DependencyNodeSchema = z.object({
  id: z.string(),
  version: z.string(),
  dependencies: z.array(DependencySchema),
  dependents: z.array(z.string()),
  loadOrder: z.number().default(0)
});

export type DependencyNode = z.infer<typeof DependencyNodeSchema>;

// ============================================================================
// MARKETPLACE INTEGRATION SCHEMAS
// ============================================================================

/**
 * Plugin listing schema
 */
export const PluginListingSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  license: z.string(),
  downloads: z.number().default(0),
  rating: z.number().min(0).max(5).default(0),
  verified: z.boolean().default(false),
  lastUpdated: z.date(),
  compatibility: z.array(z.string()),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  documentation: z.string().url().optional()
});

export type PluginListing = z.infer<typeof PluginListingSchema>;

/**
 * Marketplace query schema
 */
export const MarketplaceQuerySchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  compatibility: z.string().optional(),
  license: z.array(z.string()).optional(),
  verified: z.boolean().optional(),
  sortBy: z.enum(['name', 'downloads', 'rating', 'updated']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().positive().max(100).default(20),
  offset: z.number().nonnegative().default(0)
});

export type MarketplaceQuery = z.infer<typeof MarketplaceQuerySchema>;

/**
 * Plugin installation result schema
 */
export const InstallationResultSchema = z.object({
  success: z.boolean(),
  pluginId: z.string(),
  version: z.string(),
  installedAt: z.date(),
  dependencies: z.array(z.string()).optional(),
  conflicts: z.array(DependencyConflictSchema).optional(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional()
});

export type InstallationResult = z.infer<typeof InstallationResultSchema>;

// ============================================================================
// PERFORMANCE AND MONITORING SCHEMAS
// ============================================================================

/**
 * Plugin metrics schema
 */
export const PluginMetricsSchema = z.object({
  pluginId: z.string(),
  timestamp: z.date(),
  execution: z.object({
    count: z.number().default(0),
    successCount: z.number().default(0),
    errorCount: z.number().default(0),
    avgDuration: z.number().default(0),
    maxDuration: z.number().default(0),
    totalDuration: z.number().default(0)
  }),
  resources: z.object({
    memoryUsage: z.object({
      current: z.number().default(0),
      peak: z.number().default(0),
      average: z.number().default(0)
    }),
    cpuUsage: z.object({
      current: z.number().default(0),
      peak: z.number().default(0),
      total: z.number().default(0)
    }),
    diskIO: z.object({
      read: z.number().default(0),
      write: z.number().default(0)
    }),
    networkIO: z.object({
      bytesIn: z.number().default(0),
      bytesOut: z.number().default(0),
      requests: z.number().default(0)
    })
  }),
  health: z.object({
    status: z.enum(['healthy', 'warning', 'critical']),
    lastCheck: z.date(),
    uptime: z.number().default(0),
    restarts: z.number().default(0)
  })
});

export type PluginMetrics = z.infer<typeof PluginMetricsSchema>;

// ============================================================================
// ERROR HANDLING SCHEMAS
// ============================================================================

/**
 * Plugin error type enumeration
 */
export const PluginErrorTypeSchema = z.enum([
  'load_error',
  'init_error',
  'runtime_error',
  'config_error',
  'dependency_error',
  'security_error',
  'resource_error',
  'timeout_error',
  'validation_error'
]);

export type PluginErrorType = z.infer<typeof PluginErrorTypeSchema>;

/**
 * Plugin error schema
 */
export const PluginErrorSchema = z.object({
  id: z.string().uuid(),
  type: PluginErrorTypeSchema,
  pluginId: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  timestamp: z.date(),
  context: z.object({
    hook: z.string().optional(),
    executionId: z.string().optional(),
    metadata: z.record(z.unknown()).default({})
  })
});

export type PluginError = z.infer<typeof PluginErrorSchema>;

/**
 * Recovery action schema
 */
export const RecoveryActionSchema = z.object({
  strategy: z.enum(['restart', 'disable', 'fallback', 'retry', 'ignore']),
  maxRetries: z.number().int().min(0).max(10).optional(),
  backoffStrategy: z.enum(['linear', 'exponential']).optional(),
  fallbackPlugin: z.string().optional(),
  notifyAdmin: z.boolean().default(true)
});

export type RecoveryAction = z.infer<typeof RecoveryActionSchema>;

// ============================================================================
// DEVELOPMENT AND TESTING SCHEMAS
// ============================================================================

/**
 * Plugin development configuration schema
 */
export const DevConfigurationSchema = z.object({
  hotReload: z.boolean().default(true),
  debugMode: z.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  watchPaths: z.array(z.string()).default(['./src']),
  buildCommand: z.string().optional(),
  testCommand: z.string().optional()
});

export type DevConfiguration = z.infer<typeof DevConfigurationSchema>;

/**
 * Plugin test result schema
 */
export const PluginTestResultSchema = z.object({
  pluginId: z.string(),
  testSuite: z.string(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  duration: z.number(),
  coverage: z.number().min(0).max(100).optional(),
  results: z.array(z.object({
    name: z.string(),
    status: z.enum(['passed', 'failed', 'skipped']),
    duration: z.number(),
    error: z.string().optional()
  }))
});

export type PluginTestResult = z.infer<typeof PluginTestResultSchema>;

// ============================================================================
// API INTEGRATION SCHEMAS
// ============================================================================

/**
 * Plugin API request schema
 */
export const PluginAPIRequestSchema = z.object({
  pluginId: z.string(),
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.record(z.string()).optional(),
  query: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  metadata: z.object({
    requestId: z.string(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    timestamp: z.date()
  })
});

export type PluginAPIRequest = z.infer<typeof PluginAPIRequestSchema>;

/**
 * Plugin API response schema
 */
export const PluginAPIResponseSchema = z.object({
  status: z.number().int().min(100).max(599),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  duration: z.number(),
  pluginId: z.string(),
  endpoint: z.string(),
  metadata: z.object({
    requestId: z.string(),
    timestamp: z.date(),
    cached: z.boolean().default(false)
  })
});

export type PluginAPIResponse = z.infer<typeof PluginAPIResponseSchema>;

// ============================================================================
// CONFIGURATION MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Plugin configuration validation schema
 */
export const ConfigValidationSchema = z.object({
  strict: z.boolean().default(true),
  additionalProperties: z.boolean().default(false),
  validateDefaults: z.boolean().default(true),
  coerceTypes: z.boolean().default(false)
});

export type ConfigValidation = z.infer<typeof ConfigValidationSchema>;

/**
 * Plugin configuration management schema
 */
export const PluginConfigManagerSchema = z.object({
  pluginId: z.string(),
  schema: z.record(z.unknown()).optional(),
  defaultConfig: z.record(z.unknown()).optional(),
  currentConfig: z.record(z.unknown()).optional(),
  environment: z.object({
    development: z.record(z.unknown()).optional(),
    staging: z.record(z.unknown()).optional(),
    production: z.record(z.unknown()).optional()
  }).optional(),
  validation: ConfigValidationSchema,
  hotReload: z.boolean().default(false),
  lastUpdated: z.date().optional()
});

export type PluginConfigManager = z.infer<typeof PluginConfigManagerSchema>;

// ============================================================================
// UTILITY TYPE DEFINITIONS
// ============================================================================

/**
 * Plugin priority enumeration for hook execution
 */
export enum PluginPriority {
  CRITICAL = 1000,
  HIGH = 500,
  NORMAL = 100,
  LOW = 50,
  CLEANUP = 10
}

/**
 * Hook execution modes
 */
export enum HookExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  PARALLEL = 'parallel'
}

/**
 * Plugin categories for marketplace organization
 */
export const PLUGIN_CATEGORIES = [
  'form-processing',
  'validation',
  'workflow',
  'integration',
  'notification',
  'analytics',
  'security',
  'ui-enhancement',
  'data-transform',
  'reporting'
] as const;

/**
 * Standard hook names in the Pliers system
 */
export const HOOK_NAMES = {
  // Form lifecycle
  FORM_VALIDATE: 'form.validate',
  FORM_BEFORE_CREATE: 'form.beforeCreate',
  FORM_AFTER_CREATE: 'form.afterCreate',
  FORM_BEFORE_UPDATE: 'form.beforeUpdate',
  FORM_AFTER_UPDATE: 'form.afterUpdate',
  FORM_BEFORE_DELETE: 'form.beforeDelete',
  FORM_AFTER_DELETE: 'form.afterDelete',

  // Submission processing
  SUBMISSION_BEFORE_VALIDATE: 'submission.beforeValidate',
  SUBMISSION_AFTER_VALIDATE: 'submission.afterValidate',
  SUBMISSION_BEFORE_SAVE: 'submission.beforeSave',
  SUBMISSION_AFTER_SAVE: 'submission.afterSave',
  SUBMISSION_TRANSFORM: 'submission.transform',
  SUBMISSION_ENRICH: 'submission.enrich',

  // Workflow
  WORKFLOW_BEFORE_TRANSITION: 'workflow.beforeTransition',
  WORKFLOW_AFTER_TRANSITION: 'workflow.afterTransition',
  WORKFLOW_CONDITION: 'workflow.condition',
  WORKFLOW_ACTION: 'workflow.action',

  // Integration
  INTEGRATION_SYNC: 'integration.sync',
  API_REQUEST: 'api.request',
  API_RESPONSE: 'api.response',

  // Authentication & Authorization
  AUTH_AUTHENTICATE: 'auth.authenticate',
  AUTH_AUTHORIZE: 'auth.authorize'
} as const;

export type HookName = typeof HOOK_NAMES[keyof typeof HOOK_NAMES];

// ============================================================================
// EXPORT ALL SCHEMAS FOR RUNTIME VALIDATION
// ============================================================================

export const PLUGIN_SCHEMAS = {
  PluginManifest: PluginManifestSchema,
  PluginInstance: PluginInstanceSchema,
  PluginPermissions: PluginPermissionsSchema,
  PluginHookConfig: PluginHookConfigSchema,
  PluginAPIEndpoint: PluginAPIEndpointSchema,
  HookContext: HookContextSchema,
  HookExecutionResult: HookExecutionResultSchema,
  HookRegistration: HookRegistrationSchema,
  ResourceLimits: ResourceLimitsSchema,
  SecurityPolicies: SecurityPoliciesSchema,
  PluginSandbox: PluginSandboxSchema,
  Dependency: DependencySchema,
  DependencyConflict: DependencyConflictSchema,
  PluginListing: PluginListingSchema,
  MarketplaceQuery: MarketplaceQuerySchema,
  InstallationResult: InstallationResultSchema,
  PluginMetrics: PluginMetricsSchema,
  PluginError: PluginErrorSchema,
  RecoveryAction: RecoveryActionSchema,
  PluginAPIRequest: PluginAPIRequestSchema,
  PluginAPIResponse: PluginAPIResponseSchema,
  PluginConfigManager: PluginConfigManagerSchema
} as const;