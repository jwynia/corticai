# Search Engine Examples and Use Cases

## Purpose
This document provides comprehensive examples and practical use cases for the Search Engine component in Pliers v3. It demonstrates real-world scenarios, query patterns, and implementation examples to help developers understand and implement search functionality.

## Classification
- **Domain:** Examples and Patterns
- **Stability:** Stable
- **Abstraction:** Practical
- **Confidence:** Established

## Query Language Examples

### Basic Text Search

#### Simple Text Search
```sql
-- Search for forms containing "employee"
SEARCH forms WHERE title CONTAINS "employee"

-- Search submissions with "onboarding" in any field
SEARCH submissions WHERE content CONTAINS "onboarding"

-- Case-insensitive search
SEARCH forms WHERE title ILIKE "%Employee%"
```

#### Multiple Target Search
```sql
-- Search across forms and submissions
SEARCH forms, submissions
WHERE content CONTAINS "performance review"
ORDER BY relevance DESC, created_date DESC
LIMIT 50
```

#### Phrase Search
```sql
-- Exact phrase matching
SEARCH forms WHERE description CONTAINS PHRASE "annual performance evaluation"

-- Multiple phrases with OR
SEARCH submissions
WHERE (content CONTAINS PHRASE "project budget")
   OR (content CONTAINS PHRASE "budget allocation")
```

### Advanced Query Patterns

#### Boolean Logic
```sql
-- Complex boolean search
SEARCH forms
WHERE (title CONTAINS "hr" AND category = "human_resources")
   OR (tags MATCH ANY("employee", "staff", "personnel"))
   AND status IN ("published", "active")
   AND NOT archived = true
```

#### Field-Specific Search
```sql
-- Search specific form fields
SEARCH submissions
WHERE data.employee.department = "engineering"
  AND data.salary BETWEEN 50000 AND 150000
  AND data.start_date >= "2024-01-01"
```

#### JSONB Path Search
```sql
-- Deep JSONB queries
SEARCH submissions
WHERE data.contact.address.city = "San Francisco"
  AND data.skills[*].name CONTAINS "javascript"
  AND data.projects[*].status = "completed"
```

### Faceted Search Examples

#### Basic Faceted Search
```sql
SEARCH forms
WHERE category IN ("hr", "finance")
FACET BY category, status, created_by
ORDER BY popularity DESC
LIMIT 100
```

#### Advanced Faceting with Filters
```sql
SEARCH submissions
WHERE submitted_date >= "2024-01-01"
  AND form_category = "employee_feedback"
FACET BY
  department AS dept_facet,
  rating AS rating_facet WITH RANGES (
    (1, 3) AS "Needs Improvement",
    (4, 7) AS "Satisfactory",
    (8, 10) AS "Excellent"
  ),
  submitted_date AS date_facet WITH HISTOGRAM "1 month"
```

### Geospatial Search Examples

#### Location-Based Search
```sql
-- Find submissions within 50km of San Francisco
SEARCH submissions
WHERE data.location WITHIN RADIUS(37.7749, -122.4194, 50, "km")
  AND form_type = "field_report"

-- Search within a bounding box
SEARCH submissions
WHERE data.location WITHIN BBOX(
  37.7049, -122.5280,  -- Southwest corner
  37.8049, -122.3280   -- Northeast corner
)
```

#### Distance-Based Sorting
```sql
-- Sort by distance from a point
SEARCH submissions
WHERE data.location IS NOT NULL
ORDER BY DISTANCE(data.location, POINT(37.7749, -122.4194)) ASC,
         relevance DESC
LIMIT 25
```

### Temporal Search Examples

#### Date Range Queries
```sql
-- Last 30 days
SEARCH submissions
WHERE submitted_at >= NOW() - INTERVAL "30 days"
  AND status = "completed"

-- Specific date range
SEARCH forms
WHERE created_at BETWEEN "2024-01-01" AND "2024-12-31"
  AND last_modified > "2024-06-01"
```

#### Time-Based Aggregations
```sql
SEARCH submissions
WHERE form_category = "sales_report"
  AND submitted_date >= "2024-01-01"
AGGREGATE
  COUNT(*) AS total_submissions BY DATE_TRUNC("month", submitted_date),
  AVG(data.revenue) AS avg_monthly_revenue BY DATE_TRUNC("month", submitted_date)
ORDER BY submitted_date DESC
```

## TypeScript/JavaScript Examples

### Basic Search Implementation

#### Simple Search Function
```typescript
import { SearchEngine, SearchQueryBuilder } from './search-engine';

async function searchForms(searchText: string, userId: string): Promise<SearchResponse> {
  const query = SearchQueryBuilder
    .create()
    .targets(['forms'])
    .text(searchText)
    .orderBy('relevance', 'desc')
    .limit(50)
    .highlight(true)
    .build();

  const searchEngine = new SearchEngine();
  return await searchEngine.search(query, { userId });
}

// Usage example
const results = await searchForms("employee onboarding", "user-123");
console.log(`Found ${results.totalCount} forms matching "employee onboarding"`);
```

#### Advanced Search with Filters
```typescript
async function advancedFormSearch(params: {
  text?: string;
  category?: string[];
  status?: string[];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
}): Promise<SearchResponse> {
  const builder = SearchQueryBuilder.create().targets(['forms']);

  // Add text search if provided
  if (params.text) {
    builder.text(params.text, 'AND');
  }

  // Build conditions
  const conditions: QueryCondition[] = [];

  if (params.category?.length) {
    conditions.push(ConditionBuilder.in('category', params.category));
  }

  if (params.status?.length) {
    conditions.push(ConditionBuilder.in('status', params.status));
  }

  if (params.dateRange) {
    conditions.push(ConditionBuilder.between(
      'created_at',
      params.dateRange.start.toISOString(),
      params.dateRange.end.toISOString()
    ));
  }

  if (params.tags?.length) {
    conditions.push({
      field: 'tags',
      operator: 'jsonb_exists_any',
      value: params.tags
    });
  }

  // Combine conditions with AND
  if (conditions.length > 0) {
    builder.where(
      conditions.length === 1
        ? conditions[0]
        : ConditionBuilder.and(...conditions)
    );
  }

  // Add facets for filtering UI
  builder
    .facets(['category', 'status', 'tags', 'created_by'])
    .orderBy('relevance', 'desc')
    .orderBy('created_at', 'desc')
    .limit(100);

  const searchEngine = new SearchEngine();
  return await searchEngine.search(builder.build());
}
```

### Faceted Search Implementation

#### Dynamic Facet Generation
```typescript
class FacetedSearchService {
  private searchEngine: SearchEngine;

  constructor() {
    this.searchEngine = new SearchEngine();
  }

  async searchWithFacets(
    baseQuery: SearchQuery,
    selectedFacets: Record<string, string[]> = {}
  ): Promise<{
    results: SearchResponse;
    availableFacets: SearchFacet[];
  }> {
    // Apply selected facet filters to the base query
    const filteredQuery = this.applyFacetFilters(baseQuery, selectedFacets);

    // Execute search with facets
    const results = await this.searchEngine.search({
      ...filteredQuery,
      facets: ['category', 'status', 'tags', 'form_type', 'created_by']
    });

    return {
      results,
      availableFacets: results.facets || []
    };
  }

  private applyFacetFilters(
    query: SearchQuery,
    facetFilters: Record<string, string[]>
  ): SearchQuery {
    const facetConditions: QueryCondition[] = [];

    for (const [field, values] of Object.entries(facetFilters)) {
      if (values.length > 0) {
        facetConditions.push(ConditionBuilder.in(field, values));
      }
    }

    if (facetConditions.length === 0) {
      return query;
    }

    const newCondition = facetConditions.length === 1
      ? facetConditions[0]
      : ConditionBuilder.and(...facetConditions);

    return {
      ...query,
      where: query.where
        ? ConditionBuilder.and(query.where, newCondition)
        : newCondition
    };
  }
}

// Usage example
const facetedSearch = new FacetedSearchService();
const result = await facetedSearch.searchWithFacets(
  {
    targets: ['forms'],
    text: 'employee evaluation'
  },
  {
    category: ['hr'],
    status: ['published', 'active']
  }
);
```

### Real-time Search Implementation

#### Live Search with Debouncing
```typescript
class LiveSearchComponent {
  private searchEngine: SearchEngine;
  private searchSubject = new Subject<string>();
  private currentResults$ = new BehaviorSubject<SearchResponse | null>(null);

  constructor() {
    this.searchEngine = new SearchEngine();
    this.setupLiveSearch();
  }

  private setupLiveSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(),
      filter(query => query.length >= 2), // Minimum 2 characters
      switchMap(query => this.performSearch(query)),
      catchError(error => {
        console.error('Search error:', error);
        return of(null);
      })
    ).subscribe(results => {
      if (results) {
        this.currentResults$.next(results);
      }
    });
  }

  private async performSearch(searchText: string): Promise<SearchResponse> {
    const query = SearchQueryBuilder
      .create()
      .targets(['forms', 'submissions'])
      .text(searchText)
      .limit(20)
      .highlight(true)
      .suggest(true)
      .timeout(2000) // Quick timeout for live search
      .build();

    return await this.searchEngine.search(query);
  }

  // Public API
  search(query: string): void {
    this.searchSubject.next(query);
  }

  getResults(): Observable<SearchResponse | null> {
    return this.currentResults$.asObservable();
  }
}

// Usage in React component
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const liveSearch = useRef(new LiveSearchComponent());

  useEffect(() => {
    const subscription = liveSearch.current.getResults().subscribe(setResults);
    return () => subscription.unsubscribe();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    liveSearch.current.search(value);
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="Search forms and submissions..."
      />
      {results && (
        <SearchResults results={results} />
      )}
    </div>
  );
}
```

### Saved Search Implementation

#### Saved Search Manager
```typescript
class SavedSearchManager {
  private searchEngine: SearchEngine;
  private apiClient: ApiClient;

  constructor(searchEngine: SearchEngine, apiClient: ApiClient) {
    this.searchEngine = searchEngine;
    this.apiClient = apiClient;
  }

  async createSavedSearch(params: {
    name: string;
    description?: string;
    query: SearchQuery;
    schedule?: SavedSearchSchedule;
    notifications?: SavedSearchNotification;
  }): Promise<SavedSearch> {
    const savedSearch: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: getCurrentUserId(),
      name: params.name,
      description: params.description,
      query: params.query,
      schedule: params.schedule,
      notifications: params.notifications,
      maxResults: 100,
      resultFormat: 'json',
      autoExport: false,
      isPublic: false,
      isShared: false,
      executionCount: 0
    };

    return await this.apiClient.post('/api/v1/search/saved', savedSearch);
  }

  async executeSavedSearch(savedSearchId: string): Promise<SearchResponse> {
    const savedSearch = await this.apiClient.get(`/api/v1/search/saved/${savedSearchId}`);

    // Execute the saved query
    const results = await this.searchEngine.search(savedSearch.query);

    // Update execution statistics
    await this.apiClient.post(`/api/v1/search/saved/${savedSearchId}/executions`, {
      executedAt: new Date().toISOString(),
      executionTimeMs: results.executionTimeMs,
      resultCount: results.totalCount,
      success: true,
      triggeredBy: 'manual'
    });

    return results;
  }

  async scheduleSearch(
    savedSearchId: string,
    schedule: SavedSearchSchedule
  ): Promise<void> {
    await this.apiClient.patch(`/api/v1/search/saved/${savedSearchId}`, {
      schedule
    });
  }

  async setupSearchAlert(
    savedSearchId: string,
    notifications: SavedSearchNotification
  ): Promise<void> {
    await this.apiClient.patch(`/api/v1/search/saved/${savedSearchId}`, {
      notifications
    });
  }
}

// Usage example
const savedSearchManager = new SavedSearchManager(searchEngine, apiClient);

// Create a saved search for monitoring new HR forms
const hrFormMonitor = await savedSearchManager.createSavedSearch({
  name: 'New HR Forms Monitor',
  description: 'Monitor all new HR forms created daily',
  query: {
    targets: ['forms'],
    where: ConditionBuilder.and(
      ConditionBuilder.equals('category', 'hr'),
      ConditionBuilder.equals('status', 'published')
    ),
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 50
  },
  schedule: {
    enabled: true,
    cronExpression: '0 9 * * 1-5', // 9 AM weekdays
    timezone: 'America/New_York'
  },
  notifications: {
    email: true,
    inApp: true,
    frequency: 'immediate',
    conditions: {
      newResults: true,
      resultCountChange: {
        enabled: true,
        threshold: 5,
        comparison: 'increase'
      }
    }
  }
});
```

## Use Case Examples

### HR Department Search Scenarios

#### Employee Information Search
```typescript
// Search for employee submissions across multiple forms
async function searchEmployeeSubmissions(employeeId: string): Promise<SearchResponse> {
  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.or(
      ConditionBuilder.equals('submitted_by', employeeId),
      ConditionBuilder.equals('data.employee_id', employeeId),
      ConditionBuilder.contains('data.employee.email', `@company.com`)
    ))
    .orderBy('submitted_at', 'desc')
    .facets(['form_type', 'status', 'department'])
    .limit(100)
    .build();

  return await searchEngine.search(query);
}

// Find all performance reviews in date range
async function findPerformanceReviews(
  startDate: Date,
  endDate: Date,
  department?: string
): Promise<SearchResponse> {
  const conditions: QueryCondition[] = [
    ConditionBuilder.contains('form_title', 'performance review'),
    ConditionBuilder.between('submitted_at', startDate.toISOString(), endDate.toISOString())
  ];

  if (department) {
    conditions.push(ConditionBuilder.equals('data.department', department));
  }

  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(...conditions))
    .orderBy('data.employee_name', 'asc')
    .facets(['department', 'rating', 'manager'])
    .build();

  return await searchEngine.search(query);
}
```

#### Compliance and Audit Searches
```typescript
// Find incomplete mandatory training records
async function findIncompleteTraining(): Promise<SearchResponse> {
  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(
      ConditionBuilder.contains('form_category', 'training'),
      ConditionBuilder.in('status', ['draft', 'partial']),
      ConditionBuilder.contains('data.training_type', 'mandatory')
    ))
    .orderBy('created_at', 'asc') // Oldest first
    .facets(['department', 'training_type', 'employee_level'])
    .build();

  return await searchEngine.search(query);
}

// Search for expense reports requiring approval
async function findPendingExpenseReports(managerId: string): Promise<SearchResponse> {
  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(
      ConditionBuilder.contains('form_type', 'expense'),
      ConditionBuilder.equals('status', 'submitted'),
      ConditionBuilder.equals('data.approver_id', managerId)
    ))
    .orderBy('submitted_at', 'asc')
    .facets(['amount_range', 'expense_category', 'urgency'])
    .build();

  return await searchEngine.search(query);
}
```

### Sales and Marketing Search Scenarios

#### Lead Management Search
```typescript
// Find high-value leads needing follow-up
async function findHighValueLeads(): Promise<SearchResponse> {
  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(
      ConditionBuilder.equals('form_category', 'lead_intake'),
      ConditionBuilder.gte('data.estimated_value', 10000),
      ConditionBuilder.in('data.status', ['new', 'contacted']),
      ConditionBuilder.lte('data.last_contact', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ))
    .orderBy('data.estimated_value', 'desc')
    .facets(['lead_source', 'industry', 'assigned_rep'])
    .build();

  return await searchEngine.search(query);
}

// Search for customer feedback by product
async function searchCustomerFeedback(
  productId: string,
  sentiment?: 'positive' | 'negative' | 'neutral'
): Promise<SearchResponse> {
  const conditions: QueryCondition[] = [
    ConditionBuilder.equals('form_type', 'customer_feedback'),
    ConditionBuilder.equals('data.product_id', productId)
  ];

  if (sentiment) {
    conditions.push(ConditionBuilder.equals('data.sentiment', sentiment));
  }

  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(...conditions))
    .orderBy('submitted_at', 'desc')
    .facets(['sentiment', 'customer_tier', 'feedback_category'])
    .highlight(true)
    .build();

  return await searchEngine.search(query);
}
```

### Analytics and Reporting Use Cases

#### Form Performance Analytics
```typescript
// Analyze form completion rates
async function analyzeFormCompletion(formId: string, period: number = 30): Promise<{
  searchResponse: SearchResponse;
  analytics: {
    totalSubmissions: number;
    completionRate: number;
    averageCompletionTime: number;
    dropoffPoints: Array<{ field: string; dropoffRate: number }>;
  };
}> {
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(
      ConditionBuilder.equals('form_definition_id', formId),
      ConditionBuilder.gte('created_at', startDate.toISOString())
    ))
    .facets(['status', 'completion_stage'])
    .build();

  const searchResponse = await searchEngine.search(query);

  // Calculate analytics from search results
  const statusFacet = searchResponse.facets?.find(f => f.name === 'status');
  const completed = statusFacet?.values.find(v => v.value === 'completed')?.count || 0;
  const total = searchResponse.totalCount;

  const analytics = {
    totalSubmissions: total,
    completionRate: total > 0 ? completed / total : 0,
    averageCompletionTime: 0, // Would be calculated from submission data
    dropoffPoints: [] // Would be analyzed from partial submissions
  };

  return { searchResponse, analytics };
}

// Search for trending topics in form submissions
async function findTrendingTopics(
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<SearchResponse> {
  const intervals = {
    day: 1,
    week: 7,
    month: 30
  };

  const startDate = new Date(Date.now() - intervals[timeframe] * 24 * 60 * 60 * 1000);

  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.gte('submitted_at', startDate.toISOString()))
    .orderBy('submitted_at', 'desc')
    .facets(['form_category', 'tags', 'department'])
    .limit(1000) // Larger sample for trending analysis
    .build();

  return await searchEngine.search(query);
}
```

### Geographic and Location-Based Search

#### Field Service Management
```typescript
// Find nearby service requests
async function findNearbyServiceRequests(
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<SearchResponse> {
  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(
      ConditionBuilder.equals('form_category', 'service_request'),
      ConditionBuilder.in('status', ['open', 'assigned']),
      ConditionBuilder.withinRadius('data.location', latitude, longitude, radiusKm, 'km')
    ))
    .orderBy('priority', 'desc')
    .orderBy('created_at', 'asc')
    .facets(['priority', 'service_type', 'estimated_duration'])
    .build();

  return await searchEngine.search(query);
}

// Analyze service coverage by region
async function analyzeServiceCoverage(region: {
  name: string;
  bounds: { north: number; south: number; east: number; west: number };
}): Promise<SearchResponse> {
  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(
      ConditionBuilder.equals('form_category', 'service_request'),
      {
        field: 'data.location',
        operator: 'BBOX',
        geometry: {
          type: 'Polygon',
          coordinates: [
            region.bounds.west, region.bounds.south,
            region.bounds.east, region.bounds.north
          ]
        }
      }
    ))
    .facets(['service_type', 'completion_status', 'response_time_range'])
    .build();

  return await searchEngine.search(query);
}
```

## Performance Optimization Examples

### Query Optimization Techniques

#### Index-Aware Query Writing
```typescript
// Optimized query that uses indexes effectively
async function optimizedSearchExample(): Promise<SearchResponse> {
  // This query is designed to hit specific indexes
  const query = SearchQueryBuilder
    .create()
    .targets(['submissions'])
    .where(ConditionBuilder.and(
      // Use indexed status field first (high selectivity)
      ConditionBuilder.equals('status', 'submitted'),
      // Then date range (often indexed)
      ConditionBuilder.gte('submitted_at', '2024-01-01'),
      // Finally, JSONB query (has GIN index)
      ConditionBuilder.equals('data.department', 'engineering')
    ))
    .orderBy('submitted_at', 'desc') // Uses index for sorting
    .limit(50) // Reasonable limit
    .build();

  return await searchEngine.search(query);
}

// Batch processing for large result sets
async function* processBatchedResults(
  baseQuery: SearchQuery,
  batchSize: number = 100
): AsyncGenerator<SearchResult[], void, unknown> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const query = {
      ...baseQuery,
      limit: batchSize,
      offset
    };

    const response = await searchEngine.search(query);

    if (response.results.length > 0) {
      yield response.results;
      offset += batchSize;
      hasMore = response.hasMore;
    } else {
      hasMore = false;
    }
  }
}

// Usage
const baseQuery = SearchQueryBuilder
  .create()
  .targets(['submissions'])
  .where(ConditionBuilder.equals('form_category', 'survey'))
  .build();

for await (const batch of processBatchedResults(baseQuery, 50)) {
  console.log(`Processing batch of ${batch.length} results`);
  // Process each batch
  await processBatch(batch);
}
```

### Caching Strategies

#### Multi-Level Caching Implementation
```typescript
class CachedSearchService {
  private memoryCache = new Map<string, { data: SearchResponse; expiry: number }>();
  private redis: RedisClient;
  private searchEngine: SearchEngine;

  constructor(redis: RedisClient, searchEngine: SearchEngine) {
    this.redis = redis;
    this.searchEngine = searchEngine;
  }

  async search(query: SearchQuery, options: { useCache?: boolean } = {}): Promise<SearchResponse> {
    if (!options.useCache) {
      return await this.searchEngine.search(query);
    }

    const cacheKey = generateSearchCacheKey(query);

    // L1: Memory cache
    const memoryResult = this.getFromMemoryCache(cacheKey);
    if (memoryResult) {
      return { ...memoryResult, fromCache: true };
    }

    // L2: Redis cache
    const redisResult = await this.getFromRedisCache(cacheKey);
    if (redisResult) {
      this.setMemoryCache(cacheKey, redisResult, 60); // 1 minute in memory
      return { ...redisResult, fromCache: true };
    }

    // L3: Database
    const result = await this.searchEngine.search(query);

    // Cache the result
    await this.setRedisCache(cacheKey, result, 300); // 5 minutes in Redis
    this.setMemoryCache(cacheKey, result, 60); // 1 minute in memory

    return result;
  }

  private getFromMemoryCache(key: string): SearchResponse | null {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.memoryCache.delete(key);
    return null;
  }

  private setMemoryCache(key: string, data: SearchResponse, ttlSeconds: number): void {
    this.memoryCache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  private async getFromRedisCache(key: string): Promise<SearchResponse | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Redis cache error:', error);
      return null;
    }
  }

  private async setRedisCache(key: string, data: SearchResponse, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis cache
    try {
      const keys = await this.redis.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis invalidation error:', error);
    }
  }
}
```

## Error Handling Examples

### Robust Error Handling
```typescript
class RobustSearchService {
  private searchEngine: SearchEngine;
  private fallbackSearchEngine: SearchEngine;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor(primary: SearchEngine, fallback: SearchEngine) {
    this.searchEngine = primary;
    this.fallbackSearchEngine = fallback;
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        return await this.executeSearchWithTimeout(query, 5000);
      } catch (error) {
        console.warn(`Search attempt ${attempt} failed:`, error);

        if (attempt === this.retryCount) {
          return await this.handleFinalFailure(query, error);
        }

        // Exponential backoff
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
      }
    }

    throw new Error('All search attempts failed');
  }

  private async executeSearchWithTimeout(
    query: SearchQuery,
    timeoutMs: number
  ): Promise<SearchResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Search timeout'));
      }, timeoutMs);

      this.searchEngine.search(query)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async handleFinalFailure(
    query: SearchQuery,
    error: any
  ): Promise<SearchResponse> {
    console.error('Primary search engine failed, trying fallback:', error);

    try {
      // Try with simplified query on fallback
      const simplifiedQuery = this.simplifyQuery(query);
      return await this.fallbackSearchEngine.search(simplifiedQuery);
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);

      // Return empty results with error info
      return {
        results: [],
        totalCount: 0,
        hasMore: false,
        executionTimeMs: 0,
        fromCache: false,
        query,
        facets: [],
        suggestions: ['Try a simpler search query', 'Check your search terms']
      };
    }
  }

  private simplifyQuery(query: SearchQuery): SearchQuery {
    // Remove complex parts that might cause issues
    return {
      ...query,
      where: undefined, // Remove complex WHERE conditions
      facets: [], // Remove facets
      aggregations: undefined, // Remove aggregations
      limit: Math.min(query.limit || 50, 20), // Reduce result count
      highlight: false, // Disable highlighting
      suggest: false // Disable suggestions
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Testing Examples

### Unit Test Examples
```typescript
describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let mockDatabase: jest.Mocked<Database>;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    searchEngine = new SearchEngine(mockDatabase);
  });

  describe('text search', () => {
    it('should perform basic text search', async () => {
      // Arrange
      const query = SearchQueryBuilder
        .create()
        .targets(['forms'])
        .text('employee onboarding')
        .build();

      mockDatabase.query.mockResolvedValue({
        rows: [
          { id: '1', title: 'Employee Onboarding Form', score: 0.95 },
          { id: '2', title: 'New Employee Setup', score: 0.87 }
        ]
      });

      // Act
      const result = await searchEngine.search(query);

      // Assert
      expect(result.results).toHaveLength(2);
      expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('ts_rank'),
        expect.any(Array)
      );
    });

    it('should handle empty search results', async () => {
      const query = SearchQueryBuilder
        .create()
        .targets(['forms'])
        .text('nonexistent')
        .build();

      mockDatabase.query.mockResolvedValue({ rows: [] });

      const result = await searchEngine.search(query);

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('faceted search', () => {
    it('should return facet counts', async () => {
      const query = SearchQueryBuilder
        .create()
        .targets(['forms'])
        .facets(['category', 'status'])
        .build();

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // Main query
        .mockResolvedValueOnce({ // Facet query
          rows: [
            { facet_name: 'category', facet_value: 'hr', doc_count: 15 },
            { facet_name: 'category', facet_value: 'finance', doc_count: 8 },
            { facet_name: 'status', facet_value: 'published', doc_count: 20 },
            { facet_name: 'status', facet_value: 'draft', doc_count: 3 }
          ]
        });

      const result = await searchEngine.search(query);

      expect(result.facets).toHaveLength(2);

      const categoryFacet = result.facets?.find(f => f.name === 'category');
      expect(categoryFacet?.values).toHaveLength(2);
      expect(categoryFacet?.values[0].count).toBe(15);
    });
  });
});

// Integration test example
describe('SearchEngine Integration', () => {
  let testDatabase: TestDatabase;
  let searchEngine: SearchEngine;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    await seedTestData(testDatabase);
    searchEngine = new SearchEngine(testDatabase);
  });

  afterAll(async () => {
    await testDatabase.cleanup();
  });

  it('should perform end-to-end search', async () => {
    const query = SearchQueryBuilder
      .create()
      .targets(['forms', 'submissions'])
      .text('performance review')
      .facets(['category', 'status'])
      .orderBy('relevance', 'desc')
      .limit(10)
      .build();

    const result = await searchEngine.search(query);

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.facets?.length).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeLessThan(1000);
  });
});
```

## Relationships
- **Parent Nodes:** [components/search-engine/specification.md]
- **Related Nodes:**
  - [components/search-engine/schema.ts] - TypeScript interfaces used in examples
  - [components/search-engine/api.md] - API endpoints demonstrated in examples
  - [components/form-engine/] - Form search integration examples
  - [components/submission-engine/] - Submission search examples

## Navigation Guidance
- **Access Context:** Use this document when implementing search functionality or understanding usage patterns
- **Common Next Steps:** Reference schema.ts for type definitions, api.md for endpoint specifications
- **Related Tasks:** Search implementation, query optimization, user interface development
- **Update Patterns:** Add new examples when implementing new search features or discovering optimization patterns

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/DOC-002-6 Implementation
- **Task:** DOC-002-6

## Change History
- 2025-01-22: Initial creation of Search Engine examples and use cases (DOC-002-6)