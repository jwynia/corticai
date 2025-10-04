# Search Engine API Specification

## Purpose
This document provides comprehensive API specifications for the Search Engine component in Pliers v3. It defines all REST endpoints, GraphQL schema, WebSocket events, and integration patterns for search functionality.

## Classification
- **Domain:** API Specification
- **Stability:** Stable
- **Abstraction:** Interface
- **Confidence:** Established

## REST API Endpoints

### Core Search Operations

#### Execute Search Query
```http
POST /api/v1/search
Content-Type: application/json
Authorization: Bearer {token}

{
  "query": "SEARCH forms WHERE title CONTAINS 'application'",
  "targets": ["forms", "submissions"],
  "options": {
    "limit": 50,
    "offset": 0,
    "facets": ["category", "status"],
    "aggregations": {
      "by_category": {
        "type": "terms",
        "field": "category",
        "size": 10
      },
      "avg_completion_rate": {
        "type": "avg",
        "field": "completion_rate"
      }
    },
    "highlight": true,
    "suggest": true,
    "timeout": 5000,
    "useCache": true
  }
}

200 OK
{
  "results": [
    {
      "id": "form-123",
      "type": "form_definition",
      "score": 0.95,
      "document": {
        "id": "form-123",
        "title": "Job Application Form",
        "category": "hr",
        "status": "published",
        "created_at": "2024-01-15T10:30:00Z"
      },
      "highlights": [
        {
          "field": "title",
          "fragments": ["Job <em>Application</em> Form"],
          "matchCount": 1
        }
      ],
      "metadata": {
        "last_modified": "2024-01-20T14:22:00Z",
        "form_version": "1.2.0"
      }
    }
  ],
  "totalCount": 42,
  "hasMore": true,
  "facets": [
    {
      "name": "category",
      "field": "category",
      "type": "terms",
      "values": [
        {
          "value": "hr",
          "count": 25,
          "selected": false
        },
        {
          "value": "finance",
          "count": 12,
          "selected": false
        }
      ]
    }
  ],
  "aggregations": [
    {
      "name": "by_category",
      "type": "terms",
      "field": "category",
      "result": {
        "buckets": [
          { "key": "hr", "doc_count": 25 },
          { "key": "finance", "doc_count": 12 }
        ]
      }
    }
  ],
  "suggestions": [
    "job application",
    "employment application",
    "application form"
  ],
  "executionTimeMs": 89,
  "fromCache": false,
  "query": {
    "targets": ["forms", "submissions"],
    "text": "application",
    "limit": 50,
    "offset": 0
  }
}

400 Bad Request
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "Invalid search query syntax",
    "details": {
      "line": 1,
      "column": 15,
      "expected": "field name"
    },
    "timestamp": "2024-01-22T15:30:00Z",
    "requestId": "req-123"
  }
}
```

#### Advanced Search with Structured Query
```http
POST /api/v1/search/advanced
Content-Type: application/json

{
  "targets": ["forms", "submissions"],
  "query": {
    "text": "employee evaluation",
    "textOperator": "AND",
    "where": {
      "operator": "AND",
      "conditions": [
        {
          "field": "category",
          "operator": "IN",
          "value": ["hr", "management"]
        },
        {
          "field": "created_at",
          "operator": "gte",
          "value": "2024-01-01T00:00:00Z"
        },
        {
          "field": "status",
          "operator": "equals",
          "value": "published"
        }
      ]
    },
    "orderBy": [
      {
        "field": "relevance",
        "direction": "desc"
      },
      {
        "field": "created_at",
        "direction": "desc"
      }
    ],
    "limit": 100,
    "offset": 0,
    "facets": ["category", "status", "created_by"],
    "highlight": true,
    "timeout": 10000
  }
}

200 OK
{
  "results": [...],
  "totalCount": 156,
  "hasMore": true,
  "facets": [...],
  "executionTimeMs": 156,
  "fromCache": false
}
```

### Search Suggestions and Auto-complete

#### Get Search Suggestions
```http
GET /api/v1/search/suggest?q=employee&type=forms&limit=10

200 OK
{
  "suggestions": [
    "employee onboarding",
    "employee evaluation",
    "employee benefits",
    "employee handbook",
    "employee training"
  ],
  "metadata": {
    "query": "employee",
    "type": "forms",
    "executionTimeMs": 12
  }
}
```

#### Get Auto-complete Suggestions
```http
GET /api/v1/search/autocomplete?q=empl&context=hr&limit=5

200 OK
{
  "completions": [
    {
      "text": "employee",
      "type": "term",
      "frequency": 1245,
      "category": "general"
    },
    {
      "text": "employment",
      "type": "term",
      "frequency": 892,
      "category": "general"
    },
    {
      "text": "employee onboarding",
      "type": "phrase",
      "frequency": 156,
      "category": "hr"
    }
  ]
}
```

### Search Facets and Filters

#### Get Available Facets
```http
GET /api/v1/search/facets?targets=forms&filters[category]=hr

200 OK
{
  "facets": [
    {
      "name": "status",
      "field": "status",
      "type": "terms",
      "values": [
        {
          "value": "published",
          "count": 45,
          "label": "Published"
        },
        {
          "value": "draft",
          "count": 12,
          "label": "Draft"
        }
      ],
      "totalValues": 3,
      "hasMore": false
    },
    {
      "name": "created_date",
      "field": "created_at",
      "type": "date_histogram",
      "values": [
        {
          "value": "2024-01",
          "count": 23,
          "label": "January 2024"
        },
        {
          "value": "2023-12",
          "count": 18,
          "label": "December 2023"
        }
      ]
    }
  ]
}
```

#### Apply Facet Filters
```http
POST /api/v1/search/facets/apply
Content-Type: application/json

{
  "baseQuery": {
    "targets": ["forms"],
    "text": "employee"
  },
  "facetFilters": {
    "category": ["hr", "management"],
    "status": ["published"],
    "created_at": {
      "gte": "2024-01-01",
      "lt": "2024-12-31"
    }
  },
  "requestedFacets": ["department", "form_type"]
}

200 OK
{
  "results": [...],
  "appliedFilters": {
    "category": ["hr", "management"],
    "status": ["published"],
    "created_at": {
      "gte": "2024-01-01",
      "lt": "2024-12-31"
    }
  },
  "availableFacets": [
    {
      "name": "department",
      "values": [...]
    }
  ]
}
```

### Saved Search Management

#### Create Saved Search
```http
POST /api/v1/search/saved
Content-Type: application/json

{
  "name": "Weekly HR Reports",
  "description": "All HR-related forms and submissions from the past week",
  "query": {
    "targets": ["forms", "submissions"],
    "where": {
      "operator": "AND",
      "conditions": [
        {
          "field": "category",
          "operator": "equals",
          "value": "hr"
        },
        {
          "field": "created_at",
          "operator": "gte",
          "value": "{{ date.now - 7d }}"
        }
      ]
    },
    "orderBy": [
      {
        "field": "created_at",
        "direction": "desc"
      }
    ],
    "limit": 100
  },
  "schedule": {
    "enabled": true,
    "cronExpression": "0 9 * * 1",
    "timezone": "America/New_York"
  },
  "notifications": {
    "email": true,
    "inApp": true,
    "frequency": "immediate",
    "conditions": {
      "newResults": true,
      "resultCountChange": {
        "enabled": true,
        "threshold": 5,
        "comparison": "increase"
      }
    }
  },
  "tags": ["hr", "weekly", "reports"],
  "isPublic": false
}

201 Created
{
  "id": "saved-search-123",
  "name": "Weekly HR Reports",
  "description": "All HR-related forms and submissions from the past week",
  "query": {...},
  "schedule": {...},
  "notifications": {...},
  "tags": ["hr", "weekly", "reports"],
  "isPublic": false,
  "userId": "user-456",
  "createdAt": "2024-01-22T15:30:00Z",
  "updatedAt": "2024-01-22T15:30:00Z",
  "executionCount": 0
}
```

#### List Saved Searches
```http
GET /api/v1/search/saved?folderId=folder-123&tags=hr,weekly&limit=20&offset=0

200 OK
{
  "data": [
    {
      "id": "saved-search-123",
      "name": "Weekly HR Reports",
      "description": "All HR-related forms and submissions from the past week",
      "tags": ["hr", "weekly", "reports"],
      "lastExecuted": "2024-01-21T09:00:00Z",
      "lastResultCount": 23,
      "executionCount": 8,
      "isScheduled": true,
      "nextRun": "2024-01-29T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Execute Saved Search
```http
POST /api/v1/search/saved/{id}/execute

200 OK
{
  "results": [...],
  "totalCount": 23,
  "executionId": "exec-789",
  "executedAt": "2024-01-22T15:45:00Z",
  "executionTimeMs": 234,
  "savedSearchId": "saved-search-123"
}
```

#### Get Saved Search Execution History
```http
GET /api/v1/search/saved/{id}/executions?limit=10&offset=0

200 OK
{
  "data": [
    {
      "id": "exec-789",
      "savedSearchId": "saved-search-123",
      "executedAt": "2024-01-22T15:45:00Z",
      "executionTimeMs": 234,
      "resultCount": 23,
      "success": true,
      "triggeredBy": "manual",
      "userId": "user-456"
    },
    {
      "id": "exec-788",
      "savedSearchId": "saved-search-123",
      "executedAt": "2024-01-22T09:00:00Z",
      "executionTimeMs": 189,
      "resultCount": 21,
      "success": true,
      "triggeredBy": "scheduled"
    }
  ],
  "pagination": {...}
}
```

### Search Analytics and Monitoring

#### Get Search Analytics
```http
GET /api/v1/search/analytics?period=7d&groupBy=hour&metrics=responseTime,resultCount,cacheHitRate

200 OK
{
  "period": "7d",
  "groupBy": "hour",
  "data": [
    {
      "timestamp": "2024-01-22T15:00:00Z",
      "metrics": {
        "totalQueries": 145,
        "uniqueQueries": 89,
        "averageResponseTime": 234,
        "medianResponseTime": 178,
        "p95ResponseTime": 567,
        "averageResultCount": 23.4,
        "zeroResultQueries": 12,
        "zeroResultRate": 0.083,
        "cacheHitRate": 0.67,
        "clickThroughRate": 0.34,
        "errorRate": 0.021
      }
    }
  ]
}
```

#### Get Popular Searches
```http
GET /api/v1/search/popular?period=30d&limit=20&minCount=5

200 OK
{
  "data": [
    {
      "queryHash": "hash-123",
      "queryText": "employee onboarding",
      "frequency": 156,
      "averageExecutionTime": 234,
      "averageResultCount": 18,
      "lastExecuted": "2024-01-22T14:30:00Z"
    },
    {
      "queryHash": "hash-124",
      "queryText": "performance review",
      "frequency": 134,
      "averageExecutionTime": 189,
      "averageResultCount": 12,
      "lastExecuted": "2024-01-22T15:15:00Z"
    }
  ]
}
```

#### Export Search Analytics
```http
POST /api/v1/search/analytics/export
Content-Type: application/json

{
  "format": "csv",
  "period": "30d",
  "groupBy": "day",
  "metrics": ["responseTime", "resultCount", "cacheHitRate", "errorRate"],
  "filters": {
    "queryType": ["simple", "advanced"],
    "userId": ["user-123", "user-456"]
  },
  "includeQueries": true
}

202 Accepted
{
  "exportId": "export-789",
  "status": "processing",
  "estimatedCompletionTime": "2024-01-22T15:50:00Z",
  "downloadUrl": null
}

# Poll for completion
GET /api/v1/search/analytics/export/{exportId}

200 OK
{
  "exportId": "export-789",
  "status": "completed",
  "completedAt": "2024-01-22T15:48:00Z",
  "downloadUrl": "https://api.pliers.com/downloads/search-analytics-export-789.csv",
  "expiresAt": "2024-01-23T15:48:00Z",
  "fileSize": 245760
}
```

### Search Configuration and Management

#### Get Search Configuration
```http
GET /api/v1/search/config

200 OK
{
  "search": {
    "maxQueryLength": 10000,
    "maxResultCount": 10000,
    "defaultTimeout": 5000,
    "defaultLimit": 50,
    "enableFuzzySearch": true,
    "fuzzyDistance": 2
  },
  "cache": {
    "enabled": true,
    "provider": "redis",
    "defaultTTL": 300,
    "maxCacheSize": 104857600
  },
  "performance": {
    "enableQueryPlanCache": true,
    "maxConcurrentQueries": 100,
    "enableParallelSearch": true
  },
  "features": {
    "enableSavedSearches": true,
    "enableScheduledSearches": true,
    "enableSearchAnalytics": true,
    "enableAdvancedQueries": true
  }
}
```

#### Update Search Configuration
```http
PATCH /api/v1/search/config
Content-Type: application/json

{
  "search": {
    "defaultTimeout": 7500,
    "enableFuzzySearch": false
  },
  "cache": {
    "defaultTTL": 600
  }
}

200 OK
{
  "updated": true,
  "changes": [
    "search.defaultTimeout: 5000 → 7500",
    "search.enableFuzzySearch: true → false",
    "cache.defaultTTL: 300 → 600"
  ]
}
```

#### Get Search Index Status
```http
GET /api/v1/search/indexes

200 OK
{
  "indexes": [
    {
      "id": "idx-forms-fulltext",
      "name": "forms_fulltext_search",
      "type": "full_text",
      "targetTable": "form_definitions",
      "targetColumns": ["title", "description", "category"],
      "isActive": true,
      "isValid": true,
      "documentCount": 1245,
      "indexSizeBytes": 15728640,
      "lastUpdated": "2024-01-22T15:30:00Z",
      "fragmentationRatio": 0.05
    },
    {
      "id": "idx-submissions-data",
      "name": "submissions_data_gin",
      "type": "faceted",
      "targetTable": "form_submissions",
      "targetColumns": ["submission_data"],
      "isActive": true,
      "isValid": true,
      "documentCount": 45678,
      "indexSizeBytes": 234881024,
      "lastUpdated": "2024-01-22T15:25:00Z",
      "fragmentationRatio": 0.12
    }
  ],
  "statistics": {
    "totalIndexes": 8,
    "activeIndexes": 8,
    "totalDocuments": 52341,
    "totalIndexSize": 367001600,
    "averageFragmentation": 0.08
  }
}
```

#### Rebuild Search Index
```http
POST /api/v1/search/indexes/{id}/rebuild

202 Accepted
{
  "jobId": "rebuild-job-123",
  "status": "queued",
  "estimatedDuration": "PT15M",
  "startedAt": null,
  "progress": 0
}

# Poll for progress
GET /api/v1/search/indexes/rebuild/{jobId}

200 OK
{
  "jobId": "rebuild-job-123",
  "status": "in_progress",
  "startedAt": "2024-01-22T15:35:00Z",
  "progress": 45,
  "currentPhase": "indexing_documents",
  "processedDocuments": 23456,
  "totalDocuments": 52341,
  "estimatedCompletion": "2024-01-22T15:47:00Z"
}
```

## GraphQL Schema

### Core Types
```graphql
scalar DateTime
scalar JSON

enum SearchTargetType {
  FORMS
  SUBMISSIONS
  WORKFLOWS
  USERS
  PLUGINS
  ATTACHMENTS
  COMMENTS
}

enum SearchResultType {
  FORM_DEFINITION
  FORM_SUBMISSION
  WORKFLOW_INSTANCE
  USER_PROFILE
  PLUGIN_CONTENT
  ATTACHMENT
  COMMENT
}

enum SortDirection {
  ASC
  DESC
}

type SearchResult {
  id: ID!
  type: SearchResultType!
  score: Float!
  document: JSON!
  highlights: [SearchHighlight!]
  metadata: JSON
  indexedAt: DateTime
  lastModified: DateTime
}

type SearchHighlight {
  field: String!
  fragments: [String!]!
  matchCount: Int
}

type SearchFacetValue {
  value: String!
  label: String
  count: Int!
  selected: Boolean!
  metadata: JSON
}

type SearchFacet {
  name: String!
  field: String!
  type: SearchFacetType!
  values: [SearchFacetValue!]!
  hasMore: Boolean
  totalValues: Int
  metadata: JSON
}

enum SearchFacetType {
  TERMS
  RANGE
  DATE_HISTOGRAM
  GEO_DISTANCE
  NESTED
}

type SearchAggregation {
  name: String!
  type: SearchAggregationType!
  field: String
  result: JSON!
  metadata: JSON
}

enum SearchAggregationType {
  COUNT
  SUM
  AVG
  MIN
  MAX
  TERMS
  DATE_HISTOGRAM
  RANGE
}

type SearchResponse {
  results: [SearchResult!]!
  totalCount: Int!
  hasMore: Boolean!
  facets: [SearchFacet!]
  aggregations: [SearchAggregation!]
  suggestions: [String!]
  executionTimeMs: Int!
  fromCache: Boolean!
  query: SearchQueryInput!
  queryId: String
  indexesUsed: [String!]
}
```

### Input Types
```graphql
input SearchQueryInput {
  targets: [SearchTargetType!]!
  text: String
  textOperator: TextOperator = AND
  where: QueryConditionInput
  orderBy: [SortCriteriaInput!]
  limit: Int = 50
  offset: Int = 0
  facets: [String!]
  aggregations: JSON
  highlight: Boolean = false
  suggest: Boolean = false
  timeout: Int = 5000
  useCache: Boolean = true
}

enum TextOperator {
  AND
  OR
  PHRASE
}

input QueryConditionInput {
  field: String
  operator: SearchOperator
  value: JSON
  dataType: DataType
  conditions: [QueryConditionInput!]
  condition: QueryConditionInput
  geometry: GeometryInput
}

enum SearchOperator {
  AND
  OR
  NOT
  EQUALS
  NOT_EQUALS
  GT
  GTE
  LT
  LTE
  CONTAINS
  MATCHES
  LIKE
  ILIKE
  STARTS_WITH
  ENDS_WITH
  IN
  NOT_IN
  ANY
  ALL
  IS_NULL
  IS_NOT_NULL
  EXISTS
  WITHIN
  RADIUS
  BBOX
  JSONB_CONTAINS
  JSONB_EXISTS
  JSONB_EXISTS_ANY
}

enum DataType {
  STRING
  NUMBER
  DATE
  BOOLEAN
  ARRAY
  OBJECT
}

input GeometryInput {
  type: GeometryType!
  coordinates: [Float!]!
  radius: Float
  unit: DistanceUnit
}

enum GeometryType {
  POINT
  CIRCLE
  POLYGON
}

enum DistanceUnit {
  KM
  MI
  M
}

input SortCriteriaInput {
  field: String!
  direction: SortDirection = ASC
  nullsFirst: Boolean
  caseInsensitive: Boolean
}

input SavedSearchInput {
  name: String!
  description: String
  query: SearchQueryInput!
  folderId: ID
  tags: [String!]
  isPublic: Boolean = false
  schedule: SavedSearchScheduleInput
  notifications: SavedSearchNotificationInput
  maxResults: Int = 100
  resultFormat: ResultFormat = JSON
  autoExport: Boolean = false
  exportDestination: String
}

input SavedSearchScheduleInput {
  enabled: Boolean!
  cronExpression: String
  timezone: String = "UTC"
}

input SavedSearchNotificationInput {
  email: Boolean = false
  webhook: Boolean = false
  webhookUrl: String
  inApp: Boolean = true
  frequency: NotificationFrequency = IMMEDIATE
  conditions: NotificationConditionsInput
}

enum ResultFormat {
  JSON
  CSV
  XLSX
}

enum NotificationFrequency {
  IMMEDIATE
  DAILY
  WEEKLY
}

input NotificationConditionsInput {
  newResults: Boolean = true
  resultCountChange: ResultCountChangeInput
  specificValues: [SpecificValueChangeInput!]
}

input ResultCountChangeInput {
  enabled: Boolean!
  threshold: Int!
  comparison: ChangeComparison!
}

enum ChangeComparison {
  INCREASE
  DECREASE
  CHANGE
}

input SpecificValueChangeInput {
  field: String!
  values: [JSON!]!
}
```

### Saved Search Types
```graphql
type SavedSearch {
  id: ID!
  userId: ID!
  name: String!
  description: String
  query: JSON!
  folderId: ID
  tags: [String!]
  isPublic: Boolean!
  isShared: Boolean!
  sharedWith: [ID!]
  schedule: SavedSearchSchedule
  notifications: SavedSearchNotification
  maxResults: Int!
  resultFormat: ResultFormat!
  autoExport: Boolean!
  exportDestination: String
  createdAt: DateTime!
  updatedAt: DateTime!
  lastExecuted: DateTime
  executionCount: Int!
  averageExecutionTime: Float
  lastResultCount: Int
  owner: User!
  folder: SavedSearchFolder
}

type SavedSearchSchedule {
  enabled: Boolean!
  cronExpression: String
  timezone: String!
  nextRun: DateTime
}

type SavedSearchNotification {
  email: Boolean!
  webhook: Boolean!
  webhookUrl: String
  inApp: Boolean!
  frequency: NotificationFrequency!
  conditions: NotificationConditions
}

type NotificationConditions {
  newResults: Boolean!
  resultCountChange: ResultCountChange
  specificValues: [SpecificValueChange!]
}

type ResultCountChange {
  enabled: Boolean!
  threshold: Int!
  comparison: ChangeComparison!
}

type SpecificValueChange {
  field: String!
  values: [JSON!]!
}

type SavedSearchExecution {
  id: ID!
  savedSearchId: ID!
  executedAt: DateTime!
  executionTimeMs: Int!
  resultCount: Int!
  success: Boolean!
  errorMessage: String
  resultHash: String
  triggeredBy: ExecutionTrigger!
  userId: ID
  savedSearch: SavedSearch!
  user: User
}

enum ExecutionTrigger {
  MANUAL
  SCHEDULED
  API
}

type SavedSearchFolder {
  id: ID!
  name: String!
  description: String
  parentId: ID
  userId: ID!
  isShared: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  savedSearches: [SavedSearch!]!
  children: [SavedSearchFolder!]!
  parent: SavedSearchFolder
  owner: User!
}
```

### Analytics Types
```graphql
type SearchMetrics {
  period: String!
  timestamp: DateTime!
  totalQueries: Int!
  uniqueQueries: Int!
  averageResponseTime: Float!
  medianResponseTime: Float!
  p95ResponseTime: Float!
  averageResultCount: Float!
  zeroResultQueries: Int!
  zeroResultRate: Float!
  cacheHitRate: Float!
  cacheHits: Int!
  cacheMisses: Int!
  clickThroughRate: Float!
  averageTimeSpent: Float!
  queryRefinementRate: Float!
  errorRate: Float!
  timeoutRate: Float!
  complexQueryRate: Float!
}

type PopularSearch {
  queryHash: String!
  queryText: String!
  frequency: Int!
  averageExecutionTime: Float!
  averageResultCount: Float!
  lastExecuted: DateTime!
}

type SearchAnalyticsEvent {
  id: ID!
  sessionId: ID
  userId: ID
  queryText: String!
  queryHash: String!
  queryType: QueryType!
  targets: [SearchTargetType!]!
  executionTimeMs: Int!
  resultCount: Int!
  cacheHit: Boolean!
  indexesUsed: [String!]
  clickedResults: Int!
  timeSpentViewingMs: Int!
  refinements: Int!
  executedAt: DateTime!
  ipAddress: String
  userAgent: String
  referrer: String
  isComplexQuery: Boolean!
  complexityScore: Float
  hasErrors: Boolean!
  errorType: String
  user: User
}

enum QueryType {
  SIMPLE
  ADVANCED
  FACETED
  AGGREGATED
}
```

### Queries
```graphql
type Query {
  # Core search operations
  search(
    query: SearchQueryInput!
    options: SearchOptionsInput
  ): SearchResponse!

  searchSuggestions(
    query: String!
    type: SearchTargetType!
    context: String
    limit: Int = 10
  ): [String!]!

  searchAutoComplete(
    query: String!
    context: String
    limit: Int = 5
  ): [AutoCompleteResult!]!

  # Faceted search
  searchFacets(
    targets: [SearchTargetType!]!
    filters: JSON
    facets: [String!]!
  ): [SearchFacet!]!

  # Saved searches
  savedSearches(
    folderId: ID
    tags: [String!]
    isPublic: Boolean
    limit: Int = 50
    offset: Int = 0
  ): SavedSearchConnection!

  savedSearch(id: ID!): SavedSearch

  savedSearchExecutions(
    savedSearchId: ID!
    limit: Int = 20
    offset: Int = 0
  ): SavedSearchExecutionConnection!

  # Search folders
  savedSearchFolders(
    parentId: ID
    includeShared: Boolean = false
  ): [SavedSearchFolder!]!

  # Analytics
  searchAnalytics(
    period: String!
    groupBy: AnalyticsGrouping!
    filters: AnalyticsFiltersInput
  ): [SearchMetrics!]!

  popularSearches(
    period: String = "30d"
    limit: Int = 20
    minCount: Int = 5
  ): [PopularSearch!]!

  searchAnalyticsEvents(
    filters: AnalyticsFiltersInput
    limit: Int = 100
    offset: Int = 0
  ): SearchAnalyticsEventConnection!

  # Configuration and monitoring
  searchConfiguration: SearchConfiguration!
  searchIndexes: [SearchIndex!]!
  searchIndex(id: ID!): SearchIndex
}

enum AnalyticsGrouping {
  HOUR
  DAY
  WEEK
  MONTH
}

input AnalyticsFiltersInput {
  userId: [ID!]
  queryType: [QueryType!]
  targets: [SearchTargetType!]
  dateRange: DateRangeInput
  hasErrors: Boolean
  cacheHit: Boolean
}

input DateRangeInput {
  start: DateTime!
  end: DateTime!
}

type AutoCompleteResult {
  text: String!
  type: CompletionType!
  frequency: Int!
  category: String
}

enum CompletionType {
  TERM
  PHRASE
  FIELD
}

type SearchConfiguration {
  search: SearchSettings!
  cache: CacheSettings!
  performance: PerformanceSettings!
  security: SecuritySettings!
  monitoring: MonitoringSettings!
  features: FeatureSettings!
}

type SearchSettings {
  maxQueryLength: Int!
  maxResultCount: Int!
  defaultTimeout: Int!
  defaultLimit: Int!
  maxFacets: Int!
  maxAggregations: Int!
  enableFuzzySearch: Boolean!
  fuzzyDistance: Int!
  enableStemming: Boolean!
  enableSynonyms: Boolean!
  titleWeight: Float!
  contentWeight: Float!
  tagsWeight: Float!
  recencyBoost: Float!
}

type CacheSettings {
  enabled: Boolean!
  provider: CacheProvider!
  defaultTTL: Int!
  maxCacheSize: Int!
  keyPrefix: String!
  enableCompression: Boolean!
  invalidateOnUpdate: Boolean!
  invalidationStrategy: InvalidationStrategy!
}

enum CacheProvider {
  MEMORY
  REDIS
  HYBRID
}

enum InvalidationStrategy {
  IMMEDIATE
  LAZY
  SCHEDULED
}

type PerformanceSettings {
  enableQueryPlanCache: Boolean!
  enableResultStreaming: Boolean!
  maxConcurrentQueries: Int!
  enableQueryComplexityCheck: Boolean!
  maxQueryComplexity: Int!
  enableParallelSearch: Boolean!
  parallelWorkers: Int!
}

type SecuritySettings {
  enableInputValidation: Boolean!
  enableSQLInjectionCheck: Boolean!
  enableRateLimiting: Boolean!
  rateLimit: RateLimit!
  enableAuditLogging: Boolean!
  logSensitiveQueries: Boolean!
}

type RateLimit {
  requestsPerMinute: Int!
  requestsPerHour: Int!
}

type MonitoringSettings {
  enableMetrics: Boolean!
  metricsInterval: Int!
  enableTracing: Boolean!
  enableHealthChecks: Boolean!
  healthCheckInterval: Int!
  responseTimeThreshold: Int!
  errorRateThreshold: Float!
  cacheHitRateThreshold: Float!
}

type FeatureSettings {
  enableSavedSearches: Boolean!
  enableScheduledSearches: Boolean!
  enableSearchSuggestions: Boolean!
  enableAutoComplete: Boolean!
  enableSearchAnalytics: Boolean!
  enableAdvancedQueries: Boolean!
  enableGeoSearch: Boolean!
  enableMLRanking: Boolean!
}

type SearchIndex {
  id: ID!
  name: String!
  type: IndexType!
  targetTable: String!
  targetColumns: [String!]!
  configuration: JSON!
  isActive: Boolean!
  isValid: Boolean!
  documentCount: Int!
  indexSizeBytes: Int!
  lastUpdated: DateTime!
  updateFrequency: String
  lastVacuum: DateTime
  lastAnalyze: DateTime
  fragmentationRatio: Float
}

enum IndexType {
  FULL_TEXT
  EXACT_MATCH
  FACETED
  GEOSPATIAL
  NUMERIC_RANGE
  DATE_RANGE
  COMPOSITE
}
```

### Mutations
```graphql
type Mutation {
  # Search operations
  executeSearch(
    query: SearchQueryInput!
    options: SearchOptionsInput
  ): SearchResponse!

  # Saved search management
  createSavedSearch(input: SavedSearchInput!): SavedSearch!
  updateSavedSearch(id: ID!, input: UpdateSavedSearchInput!): SavedSearch!
  deleteSavedSearch(id: ID!): Boolean!
  executeSavedSearch(id: ID!): SearchResponse!
  duplicateSavedSearch(id: ID!, name: String!): SavedSearch!

  # Saved search folders
  createSavedSearchFolder(input: SavedSearchFolderInput!): SavedSearchFolder!
  updateSavedSearchFolder(id: ID!, input: UpdateSavedSearchFolderInput!): SavedSearchFolder!
  deleteSavedSearchFolder(id: ID!): Boolean!
  moveSavedSearch(searchId: ID!, folderId: ID): SavedSearch!

  # Search sharing
  shareSavedSearch(id: ID!, userIds: [ID!]!): SavedSearch!
  unshareSavedSearch(id: ID!, userIds: [ID!]!): SavedSearch!
  publishSavedSearch(id: ID!): SavedSearch!
  unpublishSavedSearch(id: ID!): SavedSearch!

  # Search scheduling
  scheduleSavedSearch(
    id: ID!
    schedule: SavedSearchScheduleInput!
  ): SavedSearch!
  unscheduleSavedSearch(id: ID!): SavedSearch!

  # Search notifications
  updateSearchNotifications(
    id: ID!
    notifications: SavedSearchNotificationInput!
  ): SavedSearch!

  # Configuration management
  updateSearchConfiguration(input: UpdateSearchConfigurationInput!): SearchConfiguration!

  # Index management
  rebuildSearchIndex(id: ID!): IndexRebuildJob!
  optimizeSearchIndex(id: ID!): IndexOptimizeJob!
  createSearchIndex(input: CreateSearchIndexInput!): SearchIndex!
  deleteSearchIndex(id: ID!): Boolean!

  # Cache management
  clearSearchCache(pattern: String): Boolean!
  warmupSearchCache(queries: [SearchQueryInput!]!): Boolean!
}

input SearchOptionsInput {
  userId: ID
  sessionId: ID
  trackAnalytics: Boolean = true
  bypassCache: Boolean = false
  explain: Boolean = false
}

input UpdateSavedSearchInput {
  name: String
  description: String
  query: SearchQueryInput
  folderId: ID
  tags: [String!]
  isPublic: Boolean
  schedule: SavedSearchScheduleInput
  notifications: SavedSearchNotificationInput
  maxResults: Int
  resultFormat: ResultFormat
  autoExport: Boolean
  exportDestination: String
}

input SavedSearchFolderInput {
  name: String!
  description: String
  parentId: ID
  isShared: Boolean = false
}

input UpdateSavedSearchFolderInput {
  name: String
  description: String
  parentId: ID
  isShared: Boolean
}

input UpdateSearchConfigurationInput {
  search: UpdateSearchSettingsInput
  cache: UpdateCacheSettingsInput
  performance: UpdatePerformanceSettingsInput
  security: UpdateSecuritySettingsInput
  monitoring: UpdateMonitoringSettingsInput
  features: UpdateFeatureSettingsInput
}

input UpdateSearchSettingsInput {
  maxQueryLength: Int
  maxResultCount: Int
  defaultTimeout: Int
  defaultLimit: Int
  enableFuzzySearch: Boolean
  fuzzyDistance: Int
  titleWeight: Float
  contentWeight: Float
  tagsWeight: Float
  recencyBoost: Float
}

input UpdateCacheSettingsInput {
  enabled: Boolean
  provider: CacheProvider
  defaultTTL: Int
  maxCacheSize: Int
  enableCompression: Boolean
  invalidateOnUpdate: Boolean
  invalidationStrategy: InvalidationStrategy
}

input UpdatePerformanceSettingsInput {
  enableQueryPlanCache: Boolean
  enableResultStreaming: Boolean
  maxConcurrentQueries: Int
  enableQueryComplexityCheck: Boolean
  maxQueryComplexity: Int
  enableParallelSearch: Boolean
  parallelWorkers: Int
}

input UpdateSecuritySettingsInput {
  enableInputValidation: Boolean
  enableSQLInjectionCheck: Boolean
  enableRateLimiting: Boolean
  enableAuditLogging: Boolean
  logSensitiveQueries: Boolean
}

input UpdateMonitoringSettingsInput {
  enableMetrics: Boolean
  metricsInterval: Int
  enableTracing: Boolean
  enableHealthChecks: Boolean
  healthCheckInterval: Int
  responseTimeThreshold: Int
  errorRateThreshold: Float
  cacheHitRateThreshold: Float
}

input UpdateFeatureSettingsInput {
  enableSavedSearches: Boolean
  enableScheduledSearches: Boolean
  enableSearchSuggestions: Boolean
  enableAutoComplete: Boolean
  enableSearchAnalytics: Boolean
  enableAdvancedQueries: Boolean
  enableGeoSearch: Boolean
  enableMLRanking: Boolean
}

input CreateSearchIndexInput {
  name: String!
  type: IndexType!
  targetTable: String!
  targetColumns: [String!]!
  configuration: JSON!
}

type IndexRebuildJob {
  id: ID!
  indexId: ID!
  status: JobStatus!
  progress: Int!
  startedAt: DateTime
  completedAt: DateTime
  estimatedCompletion: DateTime
  errorMessage: String
}

type IndexOptimizeJob {
  id: ID!
  indexId: ID!
  status: JobStatus!
  progress: Int!
  startedAt: DateTime
  completedAt: DateTime
  optimizationsApplied: [String!]
  errorMessage: String
}

enum JobStatus {
  QUEUED
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}
```

### Subscriptions
```graphql
type Subscription {
  # Real-time search updates
  searchUpdates(searchId: ID!): SearchUpdate!

  # Saved search notifications
  savedSearchResults(savedSearchId: ID!): SearchResponse!

  # Search analytics updates
  searchMetricsUpdates(filters: AnalyticsFiltersInput): SearchMetrics!

  # Index management updates
  indexRebuildProgress(jobId: ID!): IndexRebuildJob!
  indexOptimizeProgress(jobId: ID!): IndexOptimizeJob!

  # System notifications
  searchSystemAlerts: SearchSystemAlert!
}

type SearchUpdate {
  searchId: ID!
  updateType: SearchUpdateType!
  affectedResults: [SearchResult!]
  newTotalCount: Int!
  timestamp: DateTime!
}

enum SearchUpdateType {
  INSERT
  UPDATE
  DELETE
  REINDEX
}

type SearchSystemAlert {
  id: ID!
  type: AlertType!
  severity: AlertSeverity!
  message: String!
  details: JSON
  timestamp: DateTime!
  acknowledged: Boolean!
}

enum AlertType {
  PERFORMANCE_DEGRADATION
  INDEX_CORRUPTION
  CACHE_FAILURE
  RATE_LIMIT_EXCEEDED
  ERROR_THRESHOLD_EXCEEDED
}

enum AlertSeverity {
  INFO
  WARNING
  ERROR
  CRITICAL
}
```

### Connection Types
```graphql
type SavedSearchConnection {
  edges: [SavedSearchEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type SavedSearchEdge {
  node: SavedSearch!
  cursor: String!
}

type SavedSearchExecutionConnection {
  edges: [SavedSearchExecutionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type SavedSearchExecutionEdge {
  node: SavedSearchExecution!
  cursor: String!
}

type SearchAnalyticsEventConnection {
  edges: [SearchAnalyticsEventEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type SearchAnalyticsEventEdge {
  node: SearchAnalyticsEvent!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

## WebSocket API

### Connection and Authentication
```typescript
// WebSocket connection establishment
const ws = new WebSocket('wss://api.pliers.com/search/ws');

// Authentication message
ws.send(JSON.stringify({
  type: 'auth',
  token: 'bearer-token-here'
}));

// Authentication response
{
  type: 'auth_response',
  success: true,
  userId: 'user-123'
}
```

### Search Subscription Events
```typescript
// Client → Server: Subscribe to search updates
{
  type: 'search:subscribe',
  payload: {
    searchId: 'search-session-123',
    query: {
      targets: ['forms', 'submissions'],
      text: 'employee onboarding',
      facets: ['category', 'status']
    },
    options: {
      liveUpdates: true,
      updateFrequency: 'realtime' // or 'throttled'
    }
  }
}

// Server → Client: Search results
{
  type: 'search:results',
  payload: {
    searchId: 'search-session-123',
    results: [...],
    totalCount: 45,
    facets: [...],
    executionTimeMs: 89,
    streaming: false
  }
}

// Server → Client: Real-time updates
{
  type: 'search:update',
  payload: {
    searchId: 'search-session-123',
    updateType: 'insert',
    affectedResults: [
      {
        id: 'form-new-123',
        type: 'form_definition',
        document: {...},
        score: 0.92
      }
    ],
    newTotalCount: 46,
    timestamp: '2024-01-22T15:45:00Z'
  }
}

// Client → Server: Unsubscribe from search
{
  type: 'search:unsubscribe',
  payload: {
    searchId: 'search-session-123'
  }
}
```

### Streaming Search Results
```typescript
// Client → Server: Execute streaming search
{
  type: 'search:execute',
  payload: {
    searchId: 'stream-search-456',
    query: {
      targets: ['submissions'],
      where: {
        field: 'form_category',
        operator: 'equals',
        value: 'survey'
      },
      limit: 1000
    },
    options: {
      streaming: true,
      chunkSize: 50
    }
  }
}

// Server → Client: Streaming chunks
{
  type: 'search:chunk',
  payload: {
    searchId: 'stream-search-456',
    chunkIndex: 0,
    results: [...], // 50 results
    isLastChunk: false,
    totalProcessed: 50,
    totalCount: 847
  }
}

{
  type: 'search:chunk',
  payload: {
    searchId: 'stream-search-456',
    chunkIndex: 1,
    results: [...], // 50 more results
    isLastChunk: false,
    totalProcessed: 100,
    totalCount: 847
  }
}

// Final chunk
{
  type: 'search:chunk',
  payload: {
    searchId: 'stream-search-456',
    chunkIndex: 16,
    results: [...], // Last 47 results
    isLastChunk: true,
    totalProcessed: 847,
    totalCount: 847
  }
}

// Completion notification
{
  type: 'search:complete',
  payload: {
    searchId: 'stream-search-456',
    totalResults: 847,
    executionTimeMs: 2341,
    facets: [...],
    aggregations: [...]
  }
}
```

### Error Handling
```typescript
// Server → Client: Search error
{
  type: 'search:error',
  payload: {
    searchId: 'search-session-123',
    error: {
      code: 'QUERY_TOO_COMPLEX',
      message: 'Query complexity score 1245 exceeds limit of 1000',
      retryable: true,
      suggestions: [
        'Reduce the number of facets',
        'Simplify WHERE conditions',
        'Decrease result limit'
      ]
    }
  }
}

// Server → Client: Connection error
{
  type: 'error',
  payload: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded: 1000 requests per hour',
    retryAfter: 3600,
    timestamp: '2024-01-22T15:45:00Z'
  }
}
```

### Saved Search Notifications
```typescript
// Client → Server: Subscribe to saved search notifications
{
  type: 'saved_search:subscribe',
  payload: {
    savedSearchId: 'saved-123',
    notificationTypes: ['new_results', 'result_count_change']
  }
}

// Server → Client: New results notification
{
  type: 'saved_search:notification',
  payload: {
    savedSearchId: 'saved-123',
    notificationType: 'new_results',
    executionId: 'exec-789',
    newResultsCount: 5,
    totalResultsCount: 28,
    executedAt: '2024-01-22T15:45:00Z',
    preview: [
      {
        id: 'form-456',
        title: 'New Employee Feedback Form',
        type: 'form_definition'
      }
    ]
  }
}

// Server → Client: Scheduled execution notification
{
  type: 'saved_search:scheduled',
  payload: {
    savedSearchId: 'saved-123',
    executionId: 'exec-790',
    scheduledFor: '2024-01-23T09:00:00Z',
    status: 'queued'
  }
}
```

### System Monitoring Events
```typescript
// Server → Client: Performance alert
{
  type: 'system:alert',
  payload: {
    alertType: 'performance_degradation',
    severity: 'warning',
    message: 'Average search response time exceeded threshold',
    details: {
      currentResponseTime: 1245,
      threshold: 1000,
      period: '5m'
    },
    timestamp: '2024-01-22T15:45:00Z'
  }
}

// Server → Client: Index status update
{
  type: 'system:index_update',
  payload: {
    indexId: 'idx-forms-fulltext',
    status: 'rebuilding',
    progress: 45,
    estimatedCompletion: '2024-01-22T16:15:00Z'
  }
}
```

## Relationships
- **Parent Nodes:** [components/search-engine/specification.md]
- **Related Nodes:**
  - [components/search-engine/schema.ts] - TypeScript types used in API responses
  - [components/search-engine/examples.md] - Usage examples for API endpoints
  - [components/form-engine/api.md] - Form-related search endpoints
  - [components/submission-engine/api.md] - Submission-related search endpoints

## Navigation Guidance
- **Access Context:** Use this document when implementing search API clients or understanding endpoint specifications
- **Common Next Steps:** Reference schema.ts for request/response types, examples.md for usage patterns
- **Related Tasks:** API client development, search integration, endpoint testing
- **Update Patterns:** Update when adding new endpoints or modifying existing API contracts

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-6 Implementation
- **Task:** DOC-002-6

## Change History
- 2025-01-22: Initial creation of Search Engine API specification (DOC-002-6)