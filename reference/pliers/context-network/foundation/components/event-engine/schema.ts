/**
 * Event Engine TypeScript Schema Definitions
 *
 * Comprehensive type definitions for the Event Engine component,
 * providing type safety for event sourcing, processing, and integration.
 */

import { z } from 'zod';

// ============================================================================
// CORE EVENT SCHEMAS
// ============================================================================

/**
 * Event metadata schema for additional context information
 */
export const EventMetadataSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  sourceSystem: z.string(),
  sourceVersion: z.string(),
  tags: z.array(z.string()).optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  region: z.string().optional(),
  requestId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional()
});

export type EventMetadata = z.infer<typeof EventMetadataSchema>;

/**
 * Base event schema - foundation for all events in the system
 */
export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1).max(100),
  version: z.number().int().positive().default(1),
  timestamp: z.date(),
  aggregateId: z.string().min(1).max(255),
  aggregateType: z.string().min(1).max(50),
  sequenceNumber: z.number().int().positive(),
  causationId: z.string().uuid().optional(),
  correlationId: z.string().uuid().optional(),
  metadata: EventMetadataSchema.default({}),
  payload: z.record(z.unknown())
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

/**
 * Event batch schema for atomic multi-event operations
 */
export const EventBatchSchema = z.object({
  batchId: z.string().uuid(),
  events: z.array(BaseEventSchema).min(1),
  timestamp: z.date(),
  aggregateId: z.string(),
  expectedVersion: z.number().int().nonnegative(),
  metadata: EventMetadataSchema.optional()
});

export type EventBatch = z.infer<typeof EventBatchSchema>;

// ============================================================================
// EVENT FILTERING & QUERYING
// ============================================================================

/**
 * JSON query schema for complex payload/metadata querying
 */
export const JSONQuerySchema = z.object({
  path: z.string(),
  operator: z.enum(['equals', 'contains', 'exists', 'regex', 'gt', 'lt', 'gte', 'lte']),
  value: z.unknown().optional()
});

export type JSONQuery = z.infer<typeof JSONQuerySchema>;

/**
 * Time window schema for temporal queries
 */
export const TimeWindowSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional()
});

export type TimeWindow = z.infer<typeof TimeWindowSchema>;

/**
 * Event filter schema for subscription and querying
 */
export const EventFilterSchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  aggregateTypes: z.array(z.string()).optional(),
  aggregateIds: z.array(z.string()).optional(),
  metadataFilters: z.array(JSONQuerySchema).optional(),
  payloadFilters: z.array(JSONQuerySchema).optional(),
  timestampRange: TimeWindowSchema.optional(),
  sequenceRange: z.object({
    from: z.number().int().nonnegative().optional(),
    to: z.number().int().nonnegative().optional()
  }).optional(),
  tags: z.array(z.string()).optional(),
  userId: z.string().optional(),
  excludeEventTypes: z.array(z.string()).optional()
});

export type EventFilter = z.infer<typeof EventFilterSchema>;

/**
 * Event query schema with pagination support
 */
export const EventQuerySchema = EventFilterSchema.extend({
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
  cursor: z.string().optional(),
  sortBy: z.enum(['timestamp', 'sequence_number', 'event_type']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includePayload: z.boolean().default(true),
  includeMetadata: z.boolean().default(true)
});

export type EventQuery = z.infer<typeof EventQuerySchema>;

/**
 * Event query result schema
 */
export const EventQueryResultSchema = z.object({
  events: z.array(BaseEventSchema),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  cursor: z.string().optional(),
  executionTime: z.number().nonnegative(),
  queryId: z.string().uuid()
});

export type EventQueryResult = z.infer<typeof EventQueryResultSchema>;

// ============================================================================
// EVENT STORE SCHEMAS
// ============================================================================

/**
 * Event snapshot schema for performance optimization
 */
export const EventSnapshotSchema = z.object({
  aggregateId: z.string(),
  aggregateType: z.string(),
  sequenceNumber: z.number().int().positive(),
  snapshotData: z.record(z.unknown()),
  createdAt: z.date(),
  version: z.number().int().positive().default(1),
  metadata: z.record(z.unknown()).optional()
});

export type EventSnapshot = z.infer<typeof EventSnapshotSchema>;

/**
 * Aggregate metadata schema
 */
export const AggregateMetadataSchema = z.object({
  aggregateId: z.string(),
  aggregateType: z.string(),
  version: z.number().int().nonnegative(),
  firstEventTimestamp: z.date(),
  lastEventTimestamp: z.date(),
  eventCount: z.number().int().nonnegative(),
  snapshotVersion: z.number().int().nonnegative().optional(),
  snapshotTimestamp: z.date().optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional()
});

export type AggregateMetadata = z.infer<typeof AggregateMetadataSchema>;

// ============================================================================
// SUBSCRIPTION & STREAMING SCHEMAS
// ============================================================================

/**
 * Stream options schema for real-time event streaming
 */
export const StreamOptionsSchema = z.object({
  includeHistory: z.boolean().default(false),
  historyLimit: z.number().int().positive().max(1000).optional(),
  bufferSize: z.number().int().positive().default(100),
  heartbeatInterval: z.number().int().positive().default(30000),
  maxReconnectAttempts: z.number().int().positive().default(5),
  reconnectDelay: z.number().int().positive().default(1000),
  enableCompression: z.boolean().default(false),
  authToken: z.string().optional()
});

export type StreamOptions = z.infer<typeof StreamOptionsSchema>;

/**
 * Subscription schema for event subscriptions
 */
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  filter: EventFilterSchema,
  options: StreamOptionsSchema.optional(),
  createdAt: z.date(),
  lastEventAt: z.date().optional(),
  eventsDelivered: z.number().int().nonnegative().default(0),
  status: z.enum(['active', 'paused', 'error', 'closed']).default('active'),
  clientId: z.string().optional(),
  description: z.string().optional()
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

/**
 * Stream info schema for monitoring active streams
 */
export const StreamInfoSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string(),
  connectedAt: z.date(),
  filter: EventFilterSchema,
  eventsDelivered: z.number().int().nonnegative(),
  lastEventAt: z.date().optional(),
  status: z.enum(['connected', 'disconnected', 'error']),
  bufferUtilization: z.number().min(0).max(1),
  averageLatency: z.number().nonnegative()
});

export type StreamInfo = z.infer<typeof StreamInfoSchema>;

/**
 * WebSocket message schema for real-time communication
 */
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('event'),
    streamId: z.string().uuid(),
    data: BaseEventSchema,
    timestamp: z.date(),
    sequenceNumber: z.number().int().positive()
  }),
  z.object({
    type: z.literal('heartbeat'),
    streamId: z.string().uuid(),
    timestamp: z.date(),
    serverTime: z.date()
  }),
  z.object({
    type: z.literal('error'),
    streamId: z.string().uuid(),
    data: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional()
    }),
    timestamp: z.date()
  }),
  z.object({
    type: z.literal('subscription_confirmed'),
    streamId: z.string().uuid(),
    data: z.object({
      subscriptionId: z.string().uuid(),
      filter: EventFilterSchema,
      historyIncluded: z.boolean()
    }),
    timestamp: z.date()
  }),
  z.object({
    type: z.literal('subscription_closed'),
    streamId: z.string().uuid(),
    data: z.object({
      reason: z.string(),
      code: z.number().int()
    }),
    timestamp: z.date()
  })
]);

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// ============================================================================
// PLUGIN SYSTEM SCHEMAS
// ============================================================================

/**
 * Retry configuration schema
 */
export const RetryConfigSchema = z.object({
  maxAttempts: z.number().int().positive().max(10).default(3),
  backoffStrategy: z.enum(['fixed', 'linear', 'exponential']).default('exponential'),
  baseDelay: z.number().int().positive().default(1000),
  maxDelay: z.number().int().positive().default(60000),
  jitter: z.boolean().default(true),
  retryableErrors: z.array(z.string()).optional()
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

/**
 * Plugin options schema
 */
export const PluginOptionsSchema = z.object({
  priority: z.number().int().min(0).max(100).default(50),
  async: z.boolean().default(false),
  retry: RetryConfigSchema.optional(),
  timeout: z.number().int().positive().default(30000),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional()
});

export type PluginOptions = z.infer<typeof PluginOptionsSchema>;

/**
 * Plugin context schema for execution environment
 */
export const PluginContextSchema = z.object({
  event: BaseEventSchema,
  previousResults: z.array(z.object({
    pluginId: z.string(),
    success: z.boolean(),
    metadata: z.record(z.unknown()).optional()
  })),
  correlationId: z.string().uuid(),
  traceId: z.string().uuid(),
  executionId: z.string().uuid(),
  startTime: z.date(),
  timeout: z.number().int().positive(),
  environment: z.record(z.unknown()).optional()
});

export type PluginContext = z.infer<typeof PluginContextSchema>;

/**
 * Plugin result schema
 */
export const PluginResultSchema = z.object({
  pluginId: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  executionTime: z.number().nonnegative(),
  metadata: z.record(z.unknown()).optional(),
  generatedEvents: z.array(BaseEventSchema).optional(),
  warnings: z.array(z.string()).optional(),
  retryable: z.boolean().default(true)
});

export type PluginResult = z.infer<typeof PluginResultSchema>;

/**
 * Plugin registration schema
 */
export const PluginRegistrationSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  version: z.string(),
  description: z.string().optional(),
  eventTypes: z.array(z.string()).min(1),
  options: PluginOptionsSchema.optional(),
  configSchema: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
  healthCheckEndpoint: z.string().url().optional(),
  registeredAt: z.date(),
  lastHealthCheck: z.date().optional(),
  status: z.enum(['active', 'inactive', 'error', 'maintenance']).default('active')
});

export type PluginRegistration = z.infer<typeof PluginRegistrationSchema>;

// ============================================================================
// ROUTING & FILTERING SCHEMAS
// ============================================================================

/**
 * Routing condition schema
 */
export const RoutingConditionSchema = z.object({
  type: z.enum(['event_type', 'aggregate_type', 'metadata', 'payload', 'custom']),
  operator: z.enum(['equals', 'contains', 'regex', 'in', 'not_in', 'exists', 'gt', 'lt']),
  field: z.string().optional(),
  value: z.unknown(),
  customFunction: z.string().optional(),
  description: z.string().optional()
});

export type RoutingCondition = z.infer<typeof RoutingConditionSchema>;

/**
 * Routing target schema
 */
export const RoutingTargetSchema = z.object({
  type: z.enum(['webhook', 'queue', 'plugin', 'websocket', 'email', 'slack']),
  config: z.record(z.unknown()),
  retryConfig: RetryConfigSchema.optional(),
  enabled: z.boolean().default(true),
  description: z.string().optional()
});

export type RoutingTarget = z.infer<typeof RoutingTargetSchema>;

/**
 * Routing rule schema
 */
export const RoutingRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  conditions: z.array(RoutingConditionSchema).min(1),
  targets: z.array(RoutingTargetSchema).min(1),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  rateLimit: z.object({
    maxEvents: z.number().int().positive(),
    timeWindow: z.number().int().positive()
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string()
});

export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

/**
 * Route result schema
 */
export const RouteResultSchema = z.object({
  ruleId: z.string().uuid(),
  targetType: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  deliveryTime: z.number().nonnegative(),
  timestamp: z.date(),
  attempts: z.number().int().positive().default(1),
  metadata: z.record(z.unknown()).optional()
});

export type RouteResult = z.infer<typeof RouteResultSchema>;

// ============================================================================
// DEAD LETTER QUEUE SCHEMAS
// ============================================================================

/**
 * Processing error schema
 */
export const ProcessingErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  code: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

export type ProcessingError = z.infer<typeof ProcessingErrorSchema>;

/**
 * Dead letter event schema
 */
export const DeadLetterEventSchema = z.object({
  id: z.string().uuid(),
  originalEvent: BaseEventSchema,
  failedAt: z.date(),
  error: ProcessingErrorSchema,
  attempts: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  nextRetryAt: z.date().optional(),
  status: z.enum(['pending_retry', 'retrying', 'permanent_failure', 'resolved']),
  failureReason: z.string().optional(),
  retryHistory: z.array(z.object({
    attemptNumber: z.number().int().positive(),
    timestamp: z.date(),
    error: ProcessingErrorSchema.optional(),
    success: z.boolean()
  })).default([]),
  metadata: z.record(z.unknown()).optional()
});

export type DeadLetterEvent = z.infer<typeof DeadLetterEventSchema>;

/**
 * Dead letter filter schema
 */
export const DeadLetterFilterSchema = z.object({
  status: z.enum(['pending_retry', 'retrying', 'permanent_failure', 'resolved']).optional(),
  errorType: z.string().optional(),
  eventType: z.string().optional(),
  aggregateId: z.string().optional(),
  failedAfter: z.date().optional(),
  failedBefore: z.date().optional(),
  maxAttempts: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0)
});

export type DeadLetterFilter = z.infer<typeof DeadLetterFilterSchema>;

/**
 * Retry result schema
 */
export const RetryResultSchema = z.object({
  id: z.string().uuid(),
  success: z.boolean(),
  error: ProcessingErrorSchema.optional(),
  retryAttempt: z.number().int().positive(),
  timestamp: z.date(),
  nextRetryAt: z.date().optional(),
  processingTime: z.number().nonnegative()
});

export type RetryResult = z.infer<typeof RetryResultSchema>;

// ============================================================================
// COMPACTION SCHEMAS
// ============================================================================

/**
 * Compaction strategy schema
 */
export const CompactionStrategySchema = z.object({
  type: z.enum(['snapshot', 'eliminate_intermediates', 'merge_similar', 'time_based', 'custom']),
  config: z.object({
    snapshotFrequency: z.number().int().positive().optional(),
    keepSnapshots: z.number().int().positive().optional(),
    eliminateTypes: z.array(z.string()).optional(),
    keepLast: z.boolean().optional(),
    mergeTypes: z.array(z.string()).optional(),
    mergeWindow: z.number().int().positive().optional(),
    timeThreshold: z.number().int().positive().optional(),
    customFunction: z.string().optional(),
    preserveAuditTrail: z.boolean().default(true)
  })
});

export type CompactionStrategy = z.infer<typeof CompactionStrategySchema>;

/**
 * Compaction result schema
 */
export const CompactionResultSchema = z.object({
  compactionId: z.string().uuid(),
  aggregateId: z.string().optional(),
  originalEventCount: z.number().int().nonnegative(),
  compactedEventCount: z.number().int().nonnegative(),
  spaceSaved: z.number().int().nonnegative(),
  snapshotsCreated: z.number().int().nonnegative(),
  eventsEliminated: z.number().int().nonnegative(),
  compactionTime: z.number().nonnegative(),
  startTime: z.date(),
  endTime: z.date(),
  strategy: CompactionStrategySchema,
  success: z.boolean(),
  error: z.string().optional()
});

export type CompactionResult = z.infer<typeof CompactionResultSchema>;

/**
 * Compaction schedule schema
 */
export const CompactionScheduleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  strategy: CompactionStrategySchema,
  schedule: z.string(), // Cron expression
  enabled: z.boolean().default(true),
  aggregateTypes: z.array(z.string()).optional(),
  lastRun: z.date().optional(),
  nextRun: z.date().optional(),
  createdAt: z.date(),
  createdBy: z.string()
});

export type CompactionSchedule = z.infer<typeof CompactionScheduleSchema>;

// ============================================================================
// METRICS & MONITORING SCHEMAS
// ============================================================================

/**
 * Volume metrics schema
 */
export const VolumeMetricsSchema = z.object({
  totalEvents: z.number().int().nonnegative(),
  eventsPerSecond: z.number().nonnegative(),
  eventsByType: z.record(z.number().int().nonnegative()),
  eventsByAggregateType: z.record(z.number().int().nonnegative()),
  peakVolume: z.number().nonnegative(),
  averageVolume: z.number().nonnegative(),
  timeRange: TimeWindowSchema,
  buckets: z.array(z.object({
    timestamp: z.date(),
    count: z.number().int().nonnegative()
  })).optional()
});

export type VolumeMetrics = z.infer<typeof VolumeMetricsSchema>;

/**
 * Performance metrics schema
 */
export const PerformanceMetricsSchema = z.object({
  averageEventProcessingTime: z.number().nonnegative(),
  p50EventProcessingTime: z.number().nonnegative(),
  p95EventProcessingTime: z.number().nonnegative(),
  p99EventProcessingTime: z.number().nonnegative(),
  averageQueryTime: z.number().nonnegative(),
  p95QueryTime: z.number().nonnegative(),
  throughput: z.number().nonnegative(),
  concurrentSubscriptions: z.number().int().nonnegative(),
  memoryUsage: z.number().nonnegative(),
  cpuUsage: z.number().min(0).max(100),
  timeRange: TimeWindowSchema
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

/**
 * Error metrics schema
 */
export const ErrorMetricsSchema = z.object({
  totalErrors: z.number().int().nonnegative(),
  errorRate: z.number().min(0).max(100),
  errorsByType: z.record(z.number().int().nonnegative()),
  deadLetterQueueSize: z.number().int().nonnegative(),
  failedPluginExecutions: z.number().int().nonnegative(),
  retrySuccessRate: z.number().min(0).max(100),
  timeRange: TimeWindowSchema,
  criticalErrors: z.number().int().nonnegative(),
  errorTrends: z.array(z.object({
    timestamp: z.date(),
    errorCount: z.number().int().nonnegative(),
    errorRate: z.number().min(0).max(100)
  })).optional()
});

export type ErrorMetrics = z.infer<typeof ErrorMetricsSchema>;

/**
 * Storage metrics schema
 */
export const StorageMetricsSchema = z.object({
  totalEventCount: z.number().int().nonnegative(),
  totalStorageSize: z.number().int().nonnegative(),
  averageEventSize: z.number().nonnegative(),
  storageGrowthRate: z.number(),
  oldestEvent: z.date().optional(),
  newestEvent: z.date().optional(),
  snapshotCount: z.number().int().nonnegative(),
  snapshotStorageSize: z.number().int().nonnegative(),
  compressionRatio: z.number().min(0).max(1),
  partitionCount: z.number().int().nonnegative(),
  indexSize: z.number().int().nonnegative()
});

export type StorageMetrics = z.infer<typeof StorageMetricsSchema>;

// ============================================================================
// HEALTH & STATUS SCHEMAS
// ============================================================================

/**
 * Health status schema
 */
export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date(),
  version: z.string(),
  uptime: z.number().nonnegative(),
  components: z.record(z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    message: z.string().optional(),
    lastCheck: z.date(),
    responseTime: z.number().nonnegative().optional()
  })),
  metrics: z.object({
    eventsProcessedLast1m: z.number().int().nonnegative(),
    activeSubscriptions: z.number().int().nonnegative(),
    errorRate: z.number().min(0).max(100),
    memoryUsage: z.number().min(0).max(100),
    diskUsage: z.number().min(0).max(100)
  })
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

/**
 * Event engine configuration schema
 */
export const EventEngineConfigSchema = z.object({
  store: z.object({
    connectionString: z.string(),
    maxConnections: z.number().int().positive().default(20),
    queryTimeout: z.number().int().positive().default(30000),
    partitionStrategy: z.enum(['monthly', 'weekly', 'daily']).default('monthly'),
    enableCompression: z.boolean().default(true),
    compressionLevel: z.number().int().min(1).max(9).default(6)
  }),

  publishing: z.object({
    maxBatchSize: z.number().int().positive().default(100),
    publishTimeout: z.number().int().positive().default(5000),
    retryAttempts: z.number().int().positive().default(3),
    enableCompression: z.boolean().default(true),
    bufferSize: z.number().int().positive().default(1000)
  }),

  streaming: z.object({
    maxConnections: z.number().int().positive().default(1000),
    heartbeatInterval: z.number().int().positive().default(30000),
    bufferSize: z.number().int().positive().default(100),
    enableAuthentication: z.boolean().default(true),
    maxSubscriptionsPerClient: z.number().int().positive().default(10)
  }),

  cache: z.object({
    provider: z.enum(['redis', 'memory']).default('redis'),
    ttl: z.number().int().positive().default(3600),
    maxSize: z.number().int().positive().default(10000),
    connectionString: z.string().optional()
  }),

  plugins: z.object({
    maxConcurrent: z.number().int().positive().default(10),
    defaultTimeout: z.number().int().positive().default(30000),
    enableSandbox: z.boolean().default(true),
    maxMemoryPerPlugin: z.number().int().positive().default(128 * 1024 * 1024) // 128MB
  }),

  deadLetterQueue: z.object({
    maxAttempts: z.number().int().positive().default(5),
    backoffStrategy: z.enum(['exponential', 'linear', 'fixed']).default('exponential'),
    cleanupInterval: z.number().int().positive().default(3600000), // 1 hour
    retentionPeriod: z.number().int().positive().default(2592000000) // 30 days
  }),

  compaction: z.object({
    enableAutoCompaction: z.boolean().default(true),
    compactionInterval: z.number().int().positive().default(86400000), // 24 hours
    snapshotFrequency: z.number().int().positive().default(100),
    retentionPeriod: z.number().int().positive().default(31536000000) // 1 year
  }),

  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsInterval: z.number().int().positive().default(60000), // 1 minute
    enableTracing: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true),
    alertThresholds: z.object({
      errorRate: z.number().min(0).max(100).default(5),
      memoryUsage: z.number().min(0).max(100).default(85),
      diskUsage: z.number().min(0).max(100).default(80),
      responseTime: z.number().nonnegative().default(1000)
    })
  })
});

export type EventEngineConfig = z.infer<typeof EventEngineConfigSchema>;

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

/**
 * API response wrapper schema
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional()
    }).optional(),
    metadata: z.object({
      requestId: z.string().uuid(),
      timestamp: z.date(),
      version: z.string(),
      processingTime: z.number().nonnegative()
    })
  });

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
  cursor: z.string().optional(),
  totalCount: z.number().int().nonnegative().optional(),
  hasMore: z.boolean().optional()
});

export type Pagination = z.infer<typeof PaginationSchema>;

// ============================================================================
// DOMAIN-SPECIFIC EVENT SCHEMAS
// ============================================================================

/**
 * Form engine event schemas
 */
export const FormCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('form.created'),
  aggregateType: z.literal('form'),
  payload: z.object({
    formId: z.string().uuid(),
    name: z.string(),
    version: z.number().int().positive(),
    definition: z.record(z.unknown()),
    createdBy: z.string()
  })
});

export const FormUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('form.updated'),
  aggregateType: z.literal('form'),
  payload: z.object({
    formId: z.string().uuid(),
    previousVersion: z.number().int().positive(),
    newVersion: z.number().int().positive(),
    changes: z.record(z.unknown()),
    updatedBy: z.string()
  })
});

/**
 * Submission engine event schemas
 */
export const SubmissionCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('submission.created'),
  aggregateType: z.literal('submission'),
  payload: z.object({
    submissionId: z.string().uuid(),
    formId: z.string().uuid(),
    data: z.record(z.unknown()),
    status: z.string(),
    submittedBy: z.string()
  })
});

export const SubmissionStatusChangedEventSchema = BaseEventSchema.extend({
  type: z.literal('submission.status.changed'),
  aggregateType: z.literal('submission'),
  payload: z.object({
    submissionId: z.string().uuid(),
    fromStatus: z.string(),
    toStatus: z.string(),
    changedBy: z.string(),
    reason: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  })
});

/**
 * Export all domain event types for type unions
 */
export type FormCreatedEvent = z.infer<typeof FormCreatedEventSchema>;
export type FormUpdatedEvent = z.infer<typeof FormUpdatedEventSchema>;
export type SubmissionCreatedEvent = z.infer<typeof SubmissionCreatedEventSchema>;
export type SubmissionStatusChangedEvent = z.infer<typeof SubmissionStatusChangedEventSchema>;

/**
 * Union type for all domain events
 */
export type DomainEvent =
  | FormCreatedEvent
  | FormUpdatedEvent
  | SubmissionCreatedEvent
  | SubmissionStatusChangedEvent;

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard functions for runtime type checking
 */
export const isFormEvent = (event: BaseEvent): event is FormCreatedEvent | FormUpdatedEvent => {
  return event.aggregateType === 'form';
};

export const isSubmissionEvent = (event: BaseEvent): event is SubmissionCreatedEvent | SubmissionStatusChangedEvent => {
  return event.aggregateType === 'submission';
};

export const isFormCreatedEvent = (event: BaseEvent): event is FormCreatedEvent => {
  return event.type === 'form.created';
};

export const isSubmissionStatusChangedEvent = (event: BaseEvent): event is SubmissionStatusChangedEvent => {
  return event.type === 'submission.status.changed';
};

/**
 * Event validation utilities
 */
export const validateEvent = (event: unknown): event is BaseEvent => {
  return BaseEventSchema.safeParse(event).success;
};

export const validateEventBatch = (batch: unknown): batch is EventBatch => {
  return EventBatchSchema.safeParse(batch).success;
};

/**
 * Schema registry for dynamic event validation
 */
export const EVENT_SCHEMAS = {
  'form.created': FormCreatedEventSchema,
  'form.updated': FormUpdatedEventSchema,
  'submission.created': SubmissionCreatedEventSchema,
  'submission.status.changed': SubmissionStatusChangedEventSchema
} as const;

/**
 * Validate event against its specific schema
 */
export const validateEventByType = (event: BaseEvent): boolean => {
  const schema = EVENT_SCHEMAS[event.type as keyof typeof EVENT_SCHEMAS];
  return schema ? schema.safeParse(event).success : BaseEventSchema.safeParse(event).success;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Event type constants for type safety
 */
export const EVENT_TYPES = {
  // Form events
  FORM_CREATED: 'form.created',
  FORM_UPDATED: 'form.updated',
  FORM_DELETED: 'form.deleted',
  FORM_VERSION_CREATED: 'form.version.created',

  // Submission events
  SUBMISSION_CREATED: 'submission.created',
  SUBMISSION_UPDATED: 'submission.updated',
  SUBMISSION_DELETED: 'submission.deleted',
  SUBMISSION_STATUS_CHANGED: 'submission.status.changed',

  // Plugin events
  PLUGIN_REGISTERED: 'plugin.registered',
  PLUGIN_EXECUTED: 'plugin.executed',
  PLUGIN_FAILED: 'plugin.failed',

  // System events
  SYSTEM_STARTED: 'system.started',
  SYSTEM_STOPPED: 'system.stopped',
  SYSTEM_ERROR: 'system.error'
} as const;

/**
 * Aggregate type constants
 */
export const AGGREGATE_TYPES = {
  FORM: 'form',
  SUBMISSION: 'submission',
  USER: 'user',
  PLUGIN: 'plugin',
  SYSTEM: 'system'
} as const;

/**
 * Error type constants
 */
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'validation_error',
  PROCESSING_ERROR: 'processing_error',
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  AUTHORIZATION_ERROR: 'authorization_error',
  CONFIGURATION_ERROR: 'configuration_error'
} as const;