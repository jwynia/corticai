/**
 * Search Engine TypeScript Interfaces and Zod Schemas
 *
 * This file contains all TypeScript interfaces and Zod schemas for the Search Engine component.
 * It provides runtime validation and type safety for search queries, results, and related data.
 */

import { z } from 'zod';

// ============================================================================
// Base Types and Enums
// ============================================================================

export const SearchTargetTypeSchema = z.enum([
  'forms',
  'submissions',
  'workflows',
  'users',
  'plugins',
  'attachments',
  'comments'
]);
export type SearchTargetType = z.infer<typeof SearchTargetTypeSchema>;

export const SearchResultTypeSchema = z.enum([
  'form_definition',
  'form_submission',
  'workflow_instance',
  'user_profile',
  'plugin_content',
  'attachment',
  'comment'
]);
export type SearchResultType = z.infer<typeof SearchResultTypeSchema>;

export const SortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const SearchOperatorSchema = z.enum([
  // Logical operators
  'AND', 'OR', 'NOT',
  // Comparison operators
  'equals', 'not_equals', 'gt', 'gte', 'lt', 'lte',
  // Text operators
  'CONTAINS', 'MATCHES', 'LIKE', 'ILIKE', 'starts_with', 'ends_with',
  // Array operators
  'IN', 'NOT_IN', 'ANY', 'ALL',
  // Existence operators
  'IS_NULL', 'IS_NOT_NULL', 'EXISTS',
  // Spatial operators
  'WITHIN', 'RADIUS', 'BBOX',
  // JSONB operators
  'jsonb_contains', 'jsonb_exists', 'jsonb_exists_any'
]);
export type SearchOperator = z.infer<typeof SearchOperatorSchema>;

// ============================================================================
// Query Language and DSL
// ============================================================================

export const QueryConditionSchema: z.ZodSchema<any> = z.lazy(() =>
  z.union([
    // Simple condition
    z.object({
      field: z.string(),
      operator: SearchOperatorSchema,
      value: z.any(),
      dataType: z.enum(['string', 'number', 'date', 'boolean', 'array', 'object']).optional()
    }),
    // Logical compound conditions
    z.object({
      operator: z.literal('AND'),
      conditions: z.array(QueryConditionSchema)
    }),
    z.object({
      operator: z.literal('OR'),
      conditions: z.array(QueryConditionSchema)
    }),
    z.object({
      operator: z.literal('NOT'),
      condition: QueryConditionSchema
    }),
    // Spatial condition
    z.object({
      field: z.string(),
      operator: z.enum(['WITHIN', 'RADIUS', 'BBOX']),
      geometry: z.object({
        type: z.enum(['Point', 'Circle', 'Polygon']),
        coordinates: z.array(z.number()),
        radius: z.number().optional(),
        unit: z.enum(['km', 'mi', 'm']).optional()
      })
    })
  ])
);
export type QueryCondition = {
  field?: string;
  operator: SearchOperator;
  value?: any;
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  conditions?: QueryCondition[];
  condition?: QueryCondition;
  geometry?: {
    type: 'Point' | 'Circle' | 'Polygon';
    coordinates: number[];
    radius?: number;
    unit?: 'km' | 'mi' | 'm';
  };
};

export const SortCriteriaSchema = z.object({
  field: z.string(),
  direction: SortDirectionSchema.default('asc'),
  nullsFirst: z.boolean().optional(),
  caseInsensitive: z.boolean().optional()
});
export type SortCriteria = z.infer<typeof SortCriteriaSchema>;

export const SearchQuerySchema = z.object({
  // Target specification
  targets: z.array(SearchTargetTypeSchema).min(1),

  // Text search
  text: z.string().optional(),
  textOperator: z.enum(['AND', 'OR', 'PHRASE']).optional().default('AND'),

  // Structured conditions
  where: QueryConditionSchema.optional(),

  // Sorting
  orderBy: z.array(SortCriteriaSchema).optional(),

  // Pagination
  limit: z.number().min(1).max(10000).optional().default(50),
  offset: z.number().min(0).optional().default(0),

  // Result enhancement
  facets: z.array(z.string()).optional(),
  aggregations: z.record(z.any()).optional(),
  highlight: z.boolean().optional().default(false),
  suggest: z.boolean().optional().default(false),

  // Performance options
  timeout: z.number().min(100).max(30000).optional().default(5000),
  useCache: z.boolean().optional().default(true),
  explain: z.boolean().optional().default(false)
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const ParsedQuerySchema = z.object({
  originalQuery: z.string(),
  parsedQuery: SearchQuerySchema,
  queryHash: z.string(),
  complexity: z.number(),
  estimatedCost: z.number().optional()
});
export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;

// ============================================================================
// Search Results
// ============================================================================

export const SearchHighlightSchema = z.object({
  field: z.string(),
  fragments: z.array(z.string()),
  matchCount: z.number().optional()
});
export type SearchHighlight = z.infer<typeof SearchHighlightSchema>;

export const SearchResultSchema = z.object({
  id: z.string(),
  type: SearchResultTypeSchema,
  score: z.number().min(0).max(1),

  // Document data
  document: z.record(z.any()),
  metadata: z.record(z.any()).optional(),

  // Search enhancements
  highlights: z.array(SearchHighlightSchema).optional(),
  explanation: z.object({
    value: z.number(),
    description: z.string(),
    details: z.array(z.any()).optional()
  }).optional(),

  // Relationship data
  relationships: z.record(z.array(z.string())).optional(),

  // Timestamps
  indexedAt: z.string().datetime().optional(),
  lastModified: z.string().datetime().optional()
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchFacetValueSchema = z.object({
  value: z.any(),
  label: z.string().optional(),
  count: z.number().min(0),
  selected: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional()
});
export type SearchFacetValue = z.infer<typeof SearchFacetValueSchema>;

export const SearchFacetSchema = z.object({
  name: z.string(),
  field: z.string(),
  type: z.enum(['terms', 'range', 'date_histogram', 'geo_distance', 'nested']),
  values: z.array(SearchFacetValueSchema),
  hasMore: z.boolean().optional(),
  totalValues: z.number().optional(),
  metadata: z.record(z.any()).optional()
});
export type SearchFacet = z.infer<typeof SearchFacetSchema>;

export const SearchAggregationSchema = z.object({
  name: z.string(),
  type: z.enum(['count', 'sum', 'avg', 'min', 'max', 'terms', 'date_histogram', 'range']),
  field: z.string().optional(),
  result: z.any(),
  metadata: z.record(z.any()).optional()
});
export type SearchAggregation = z.infer<typeof SearchAggregationSchema>;

export const SearchResponseSchema = z.object({
  // Core results
  results: z.array(SearchResultSchema),
  totalCount: z.number().min(0),
  hasMore: z.boolean(),

  // Enhancements
  facets: z.array(SearchFacetSchema).optional(),
  aggregations: z.array(SearchAggregationSchema).optional(),
  suggestions: z.array(z.string()).optional(),

  // Metadata
  executionTimeMs: z.number().min(0),
  fromCache: z.boolean().default(false),
  cacheKey: z.string().optional(),

  // Query information
  query: SearchQuerySchema,
  queryId: z.string().optional(),

  // Performance data
  indexesUsed: z.array(z.string()).optional(),
  queryPlan: z.any().optional()
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// ============================================================================
// Faceted Search
// ============================================================================

export const FacetDefinitionSchema = z.object({
  name: z.string(),
  field: z.string(),
  type: z.enum(['terms', 'range', 'date_histogram', 'geo_distance']),

  // Configuration options
  options: z.object({
    size: z.number().min(1).max(1000).optional().default(10),
    minCount: z.number().min(0).optional().default(1),
    sort: z.enum(['count', 'term', 'relevance']).optional().default('count'),
    order: SortDirectionSchema.optional().default('desc'),
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
    missing: z.string().optional(), // value for missing/null entries

    // Range-specific options
    ranges: z.array(z.object({
      from: z.number().optional(),
      to: z.number().optional(),
      label: z.string().optional()
    })).optional(),

    // Date histogram options
    interval: z.string().optional(), // '1d', '1w', '1M', etc.
    format: z.string().optional(),
    timezone: z.string().optional(),

    // Geo distance options
    origin: z.object({
      lat: z.number(),
      lon: z.number()
    }).optional(),
    unit: z.enum(['km', 'mi', 'm']).optional(),
    distanceType: z.enum(['arc', 'plane']).optional()
  }).optional().default({})
});
export type FacetDefinition = z.infer<typeof FacetDefinitionSchema>;

export const FacetRequestSchema = z.object({
  facets: z.array(FacetDefinitionSchema),
  globalFilters: z.array(QueryConditionSchema).optional()
});
export type FacetRequest = z.infer<typeof FacetRequestSchema>;

// ============================================================================
// Search Indexing
// ============================================================================

export const IndexTypeSchema = z.enum([
  'full_text',
  'exact_match',
  'faceted',
  'geospatial',
  'numeric_range',
  'date_range',
  'composite'
]);
export type IndexType = z.infer<typeof IndexTypeSchema>;

export const IndexDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: IndexTypeSchema,
  targetTable: z.string(),
  targetColumns: z.array(z.string()),

  // Index configuration
  configuration: z.object({
    // Full-text search config
    language: z.string().optional().default('english'),
    weights: z.record(z.enum(['A', 'B', 'C', 'D'])).optional(),
    dictionary: z.string().optional(),

    // JSONB path configuration
    jsonbPaths: z.array(z.string()).optional(),

    // Geospatial configuration
    srid: z.number().optional(),
    gistOps: z.boolean().optional(),

    // Performance settings
    fillFactor: z.number().min(10).max(100).optional(),
    parallelWorkers: z.number().min(1).max(32).optional(),
    maintenanceWorkMem: z.string().optional()
  }),

  // Index status
  isActive: z.boolean().default(true),
  isValid: z.boolean().default(true),

  // Statistics
  documentCount: z.number().min(0).default(0),
  indexSizeBytes: z.number().min(0).default(0),
  lastUpdated: z.string().datetime(),
  updateFrequency: z.string().optional(), // ISO 8601 duration

  // Maintenance
  lastVacuum: z.string().datetime().optional(),
  lastAnalyze: z.string().datetime().optional(),
  fragmentationRatio: z.number().min(0).max(1).optional()
});
export type IndexDefinition = z.infer<typeof IndexDefinitionSchema>;

export const IndexUpdateEventSchema = z.object({
  indexId: z.string().uuid(),
  updateType: z.enum(['insert', 'update', 'delete', 'bulk_update']),
  documentIds: z.array(z.string()),
  timestamp: z.string().datetime(),
  processingTimeMs: z.number().min(0),
  success: z.boolean(),
  errorMessage: z.string().optional()
});
export type IndexUpdateEvent = z.infer<typeof IndexUpdateEventSchema>;

// ============================================================================
// Saved Searches
// ============================================================================

export const SavedSearchScheduleSchema = z.object({
  enabled: z.boolean().default(false),
  cronExpression: z.string().optional(),
  timezone: z.string().optional().default('UTC'),
  nextRun: z.string().datetime().optional()
});
export type SavedSearchSchedule = z.infer<typeof SavedSearchScheduleSchema>;

export const SavedSearchNotificationSchema = z.object({
  email: z.boolean().default(false),
  webhook: z.boolean().default(false),
  webhookUrl: z.string().url().optional(),
  inApp: z.boolean().default(true),
  frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),

  // Notification conditions
  conditions: z.object({
    newResults: z.boolean().default(true),
    resultCountChange: z.object({
      enabled: z.boolean().default(false),
      threshold: z.number().min(0).default(0),
      comparison: z.enum(['increase', 'decrease', 'change']).default('change')
    }).optional(),
    specificValues: z.array(z.object({
      field: z.string(),
      values: z.array(z.any())
    })).optional()
  }).optional()
});
export type SavedSearchNotification = z.infer<typeof SavedSearchNotificationSchema>;

export const SavedSearchSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),

  // Search definition
  query: SearchQuerySchema,
  queryDSL: z.string().optional(), // Original DSL string

  // Organization
  folderId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  isShared: z.boolean().default(false),
  sharedWith: z.array(z.string().uuid()).optional(),

  // Scheduling and notifications
  schedule: SavedSearchScheduleSchema.optional(),
  notifications: SavedSearchNotificationSchema.optional(),

  // Result management
  maxResults: z.number().min(1).max(10000).default(100),
  resultFormat: z.enum(['json', 'csv', 'xlsx']).default('json'),
  autoExport: z.boolean().default(false),
  exportDestination: z.string().optional(),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastExecuted: z.string().datetime().optional(),

  // Execution statistics
  executionCount: z.number().min(0).default(0),
  averageExecutionTime: z.number().min(0).optional(),
  lastResultCount: z.number().min(0).optional()
});
export type SavedSearch = z.infer<typeof SavedSearchSchema>;

export const SavedSearchExecutionSchema = z.object({
  id: z.string().uuid(),
  savedSearchId: z.string().uuid(),
  executedAt: z.string().datetime(),
  executionTimeMs: z.number().min(0),
  resultCount: z.number().min(0),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  resultHash: z.string().optional(), // For detecting changes
  triggeredBy: z.enum(['manual', 'scheduled', 'api']),
  userId: z.string().uuid().optional()
});
export type SavedSearchExecution = z.infer<typeof SavedSearchExecutionSchema>;

// ============================================================================
// Search Analytics
// ============================================================================

export const SearchAnalyticsEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),

  // Query details
  queryText: z.string(),
  queryHash: z.string(),
  queryType: z.enum(['simple', 'advanced', 'faceted', 'aggregated']),
  targets: z.array(SearchTargetTypeSchema),

  // Performance metrics
  executionTimeMs: z.number().min(0),
  resultCount: z.number().min(0),
  cacheHit: z.boolean().default(false),
  indexesUsed: z.array(z.string()).optional(),

  // User interaction
  clickedResults: z.number().min(0).default(0),
  timeSpentViewingMs: z.number().min(0).default(0),
  refinements: z.number().min(0).default(0),

  // Context
  executedAt: z.string().datetime(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  referrer: z.string().optional(),

  // Query classification
  isComplexQuery: z.boolean().default(false),
  complexityScore: z.number().min(0).max(100).optional(),
  hasErrors: z.boolean().default(false),
  errorType: z.string().optional()
});
export type SearchAnalyticsEvent = z.infer<typeof SearchAnalyticsEventSchema>;

export const SearchMetricsSchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month']),
  timestamp: z.string().datetime(),

  // Query metrics
  totalQueries: z.number().min(0),
  uniqueQueries: z.number().min(0),
  averageResponseTime: z.number().min(0),
  medianResponseTime: z.number().min(0),
  p95ResponseTime: z.number().min(0),

  // Result metrics
  averageResultCount: z.number().min(0),
  zeroResultQueries: z.number().min(0),
  zeroResultRate: z.number().min(0).max(1),

  // Cache metrics
  cacheHitRate: z.number().min(0).max(1),
  cacheHits: z.number().min(0),
  cacheMisses: z.number().min(0),

  // User engagement
  clickThroughRate: z.number().min(0).max(1),
  averageTimeSpent: z.number().min(0),
  queryRefinementRate: z.number().min(0).max(1),

  // Error metrics
  errorRate: z.number().min(0).max(1),
  timeoutRate: z.number().min(0).max(1),
  complexQueryRate: z.number().min(0).max(1)
});
export type SearchMetrics = z.infer<typeof SearchMetricsSchema>;

// ============================================================================
// Search Configuration
// ============================================================================

export const SearchConfigurationSchema = z.object({
  // Database configuration
  database: z.object({
    maxConnections: z.number().min(1).max(1000).default(50),
    queryTimeout: z.number().min(1000).max(300000).default(30000),
    statementTimeout: z.number().min(1000).max(300000).default(60000),
    workMem: z.string().default('256MB'),
    maintenanceWorkMem: z.string().default('512MB'),
    effectiveCacheSize: z.string().default('2GB')
  }),

  // Search behavior
  search: z.object({
    maxQueryLength: z.number().min(100).max(100000).default(10000),
    maxResultCount: z.number().min(1).max(100000).default(10000),
    defaultTimeout: z.number().min(100).max(60000).default(5000),
    defaultLimit: z.number().min(1).max(1000).default(50),
    maxFacets: z.number().min(1).max(100).default(20),
    maxAggregations: z.number().min(1).max(50).default(10),

    // Text search settings
    enableFuzzySearch: z.boolean().default(true),
    fuzzyDistance: z.number().min(1).max(5).default(2),
    enableStemming: z.boolean().default(true),
    enableSynonyms: z.boolean().default(false),

    // Ranking settings
    titleWeight: z.number().min(0).max(10).default(2.0),
    contentWeight: z.number().min(0).max(10).default(1.0),
    tagsWeight: z.number().min(0).max(10).default(1.5),
    recencyBoost: z.number().min(0).max(10).default(0.2)
  }),

  // Caching configuration
  cache: z.object({
    enabled: z.boolean().default(true),
    provider: z.enum(['memory', 'redis', 'hybrid']).default('hybrid'),
    defaultTTL: z.number().min(60).max(86400).default(300), // 5 minutes
    maxCacheSize: z.number().min(1024 * 1024).default(100 * 1024 * 1024), // 100MB
    keyPrefix: z.string().default('search:'),
    enableCompression: z.boolean().default(true),

    // Cache invalidation
    invalidateOnUpdate: z.boolean().default(true),
    invalidationStrategy: z.enum(['immediate', 'lazy', 'scheduled']).default('immediate')
  }),

  // Performance settings
  performance: z.object({
    enableQueryPlanCache: z.boolean().default(true),
    enableResultStreaming: z.boolean().default(false),
    maxConcurrentQueries: z.number().min(1).max(1000).default(100),
    enableQueryComplexityCheck: z.boolean().default(true),
    maxQueryComplexity: z.number().min(100).max(10000).default(1000),
    enableParallelSearch: z.boolean().default(true),
    parallelWorkers: z.number().min(1).max(32).default(4)
  }),

  // Security settings
  security: z.object({
    enableInputValidation: z.boolean().default(true),
    enableSQLInjectionCheck: z.boolean().default(true),
    enableRateLimiting: z.boolean().default(true),
    rateLimit: z.object({
      requestsPerMinute: z.number().min(1).max(10000).default(1000),
      requestsPerHour: z.number().min(1).max(100000).default(10000)
    }),
    enableAuditLogging: z.boolean().default(true),
    logSensitiveQueries: z.boolean().default(false)
  }),

  // Monitoring settings
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsInterval: z.number().min(1000).max(300000).default(60000), // 1 minute
    enableTracing: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true),
    healthCheckInterval: z.number().min(1000).max(300000).default(30000), // 30 seconds

    // Alert thresholds
    responseTimeThreshold: z.number().min(100).max(10000).default(1000),
    errorRateThreshold: z.number().min(0).max(1).default(0.05),
    cacheHitRateThreshold: z.number().min(0).max(1).default(0.8)
  }),

  // Feature flags
  features: z.object({
    enableSavedSearches: z.boolean().default(true),
    enableScheduledSearches: z.boolean().default(true),
    enableSearchSuggestions: z.boolean().default(true),
    enableAutoComplete: z.boolean().default(true),
    enableSearchAnalytics: z.boolean().default(true),
    enableAdvancedQueries: z.boolean().default(true),
    enableGeoSearch: z.boolean().default(false),
    enableMLRanking: z.boolean().default(false)
  })
});
export type SearchConfiguration = z.infer<typeof SearchConfigurationSchema>;

// ============================================================================
// Error Handling
// ============================================================================

export const SearchErrorCodeSchema = z.enum([
  'INVALID_QUERY',
  'QUERY_TOO_COMPLEX',
  'TIMEOUT',
  'INDEX_NOT_FOUND',
  'INSUFFICIENT_PERMISSIONS',
  'FACET_ERROR',
  'AGGREGATION_ERROR',
  'CACHE_ERROR',
  'STORAGE_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'INVALID_PARAMETERS',
  'NETWORK_ERROR',
  'INTERNAL_ERROR'
]);
export type SearchErrorCode = z.infer<typeof SearchErrorCodeSchema>;

export const SearchErrorSchema = z.object({
  code: SearchErrorCodeSchema,
  message: z.string(),
  details: z.record(z.any()).optional(),
  query: z.string().optional(),
  queryId: z.string().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional(),
  userId: z.string().uuid().optional(),
  retryable: z.boolean().default(false),
  suggestions: z.array(z.string()).optional()
});
export type SearchError = z.infer<typeof SearchErrorSchema>;

// ============================================================================
// Utility Types and Helpers
// ============================================================================

// Type guards
export const isSearchQuery = (obj: unknown): obj is SearchQuery =>
  SearchQuerySchema.safeParse(obj).success;

export const isSearchResult = (obj: unknown): obj is SearchResult =>
  SearchResultSchema.safeParse(obj).success;

export const isSearchResponse = (obj: unknown): obj is SearchResponse =>
  SearchResponseSchema.safeParse(obj).success;

export const isSavedSearch = (obj: unknown): obj is SavedSearch =>
  SavedSearchSchema.safeParse(obj).success;

// Validation helpers
export const validateSearchQuery = (data: unknown) => {
  const result = SearchQuerySchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      code: err.code,
      message: err.message,
      value: 'input' in err ? err.input : undefined
    })),
    data: null
  };
};

export const validateSavedSearch = (data: unknown) => {
  const result = SavedSearchSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      code: err.code,
      message: err.message,
      value: 'input' in err ? err.input : undefined
    })),
    data: null
  };
};

// Query complexity calculation
export const calculateQueryComplexity = (query: SearchQuery): number => {
  let complexity = 0;

  // Base complexity
  complexity += 10;

  // Text search complexity
  if (query.text) {
    complexity += query.text.length / 10;
    if (query.textOperator === 'PHRASE') complexity += 20;
  }

  // Condition complexity
  if (query.where) {
    complexity += calculateConditionComplexity(query.where);
  }

  // Facet complexity
  if (query.facets) {
    complexity += query.facets.length * 15;
  }

  // Aggregation complexity
  if (query.aggregations) {
    complexity += Object.keys(query.aggregations).length * 25;
  }

  // Sorting complexity
  if (query.orderBy) {
    complexity += query.orderBy.length * 5;
  }

  // Result size complexity
  const limit = query.limit || 50;
  if (limit > 100) {
    complexity += (limit - 100) / 10;
  }

  return Math.round(complexity);
};

const calculateConditionComplexity = (condition: QueryCondition): number => {
  let complexity = 5;

  if (condition.conditions) {
    // Compound condition
    complexity += condition.conditions.reduce(
      (acc, subCondition) => acc + calculateConditionComplexity(subCondition),
      0
    );
  } else if (condition.condition) {
    // NOT condition
    complexity += calculateConditionComplexity(condition.condition) + 5;
  } else {
    // Simple condition
    if (condition.operator === 'CONTAINS' || condition.operator === 'MATCHES') {
      complexity += 10;
    } else if (['IN', 'NOT_IN'].includes(condition.operator || '')) {
      complexity += 8;
    } else if (condition.geometry) {
      complexity += 20; // Spatial queries are expensive
    }
  }

  return complexity;
};

// Search target utilities
export const getSearchTargetTables = (targets: SearchTargetType[]): string[] => {
  const tableMap: Record<SearchTargetType, string> = {
    forms: 'form_definitions',
    submissions: 'form_submissions',
    workflows: 'workflow_instances',
    users: 'users',
    plugins: 'plugin_content',
    attachments: 'submission_attachments',
    comments: 'submission_comments'
  };

  return targets.map(target => tableMap[target]);
};

// Cache key generation
export const generateSearchCacheKey = (query: SearchQuery, userId?: string): string => {
  const queryString = JSON.stringify({
    ...query,
    userId: userId || 'anonymous'
  });

  // Simple hash function (in production, use a proper hash function)
  let hash = 0;
  for (let i = 0; i < queryString.length; i++) {
    const char = queryString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `search:${Math.abs(hash).toString(36)}`;
};

// Export all schemas for external use
export const SearchEngineSchemas = {
  SearchQuery: SearchQuerySchema,
  SearchResponse: SearchResponseSchema,
  SearchResult: SearchResultSchema,
  SearchFacet: SearchFacetSchema,
  SavedSearch: SavedSearchSchema,
  SearchAnalyticsEvent: SearchAnalyticsEventSchema,
  SearchMetrics: SearchMetricsSchema,
  SearchConfiguration: SearchConfigurationSchema,
  SearchError: SearchErrorSchema,
  IndexDefinition: IndexDefinitionSchema,
  FacetDefinition: FacetDefinitionSchema
} as const;

// Export type inference helper
export type InferSearchSchemaType<T extends keyof typeof SearchEngineSchemas> =
  z.infer<typeof SearchEngineSchemas[T]>;

// Query builder utilities
export class SearchQueryBuilder {
  private query: Partial<SearchQuery> = {};

  static create(): SearchQueryBuilder {
    return new SearchQueryBuilder();
  }

  targets(targets: SearchTargetType[]): this {
    this.query.targets = targets;
    return this;
  }

  text(text: string, operator: 'AND' | 'OR' | 'PHRASE' = 'AND'): this {
    this.query.text = text;
    this.query.textOperator = operator;
    return this;
  }

  where(condition: QueryCondition): this {
    this.query.where = condition;
    return this;
  }

  orderBy(field: string, direction: SortDirection = 'asc'): this {
    if (!this.query.orderBy) {
      this.query.orderBy = [];
    }
    this.query.orderBy.push({ field, direction });
    return this;
  }

  limit(limit: number): this {
    this.query.limit = limit;
    return this;
  }

  offset(offset: number): this {
    this.query.offset = offset;
    return this;
  }

  facets(facets: string[]): this {
    this.query.facets = facets;
    return this;
  }

  highlight(enabled: boolean = true): this {
    this.query.highlight = enabled;
    return this;
  }

  suggest(enabled: boolean = true): this {
    this.query.suggest = enabled;
    return this;
  }

  timeout(timeoutMs: number): this {
    this.query.timeout = timeoutMs;
    return this;
  }

  build(): SearchQuery {
    const result = SearchQuerySchema.safeParse(this.query);
    if (!result.success) {
      throw new Error(`Invalid search query: ${result.error.message}`);
    }
    return result.data;
  }
}

// Condition builder utilities
export class ConditionBuilder {
  static equals(field: string, value: any): QueryCondition {
    return { field, operator: 'equals', value };
  }

  static contains(field: string, value: string): QueryCondition {
    return { field, operator: 'CONTAINS', value };
  }

  static in(field: string, values: any[]): QueryCondition {
    return { field, operator: 'IN', value: values };
  }

  static between(field: string, min: any, max: any): QueryCondition {
    return {
      operator: 'AND',
      conditions: [
        { field, operator: 'gte', value: min },
        { field, operator: 'lte', value: max }
      ]
    };
  }

  static and(...conditions: QueryCondition[]): QueryCondition {
    return { operator: 'AND', conditions };
  }

  static or(...conditions: QueryCondition[]): QueryCondition {
    return { operator: 'OR', conditions };
  }

  static not(condition: QueryCondition): QueryCondition {
    return { operator: 'NOT', condition };
  }

  static withinRadius(
    field: string,
    lat: number,
    lon: number,
    radius: number,
    unit: 'km' | 'mi' | 'm' = 'km'
  ): QueryCondition {
    return {
      field,
      operator: 'RADIUS',
      geometry: {
        type: 'Circle',
        coordinates: [lon, lat],
        radius,
        unit
      }
    };
  }
}