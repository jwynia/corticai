# Cache-First Search Architecture

## Overview
A comprehensive caching system designed to reduce API costs by 70-90% while maintaining high-quality search results. Implements intelligent query deduplication, fuzzy matching, and cost-aware routing.

## Problem Solved
- API costs were projected at $1,500/month for 100K searches
- No caching meant repeated identical/similar queries
- No cost tracking or optimization strategy
- Breaking scripts due to schema changes across multiple APIs

## Architecture Components

### 1. CachedSearchClient (`tools/mcp-client/cached_search_client.ts`)
Main orchestrator that provides cache-first search functionality:
- Checks exact cache match first
- Falls back to fuzzy matching for similar queries
- Only makes API calls as last resort
- Normalizes responses across different APIs
- Integrates metrics tracking

**Key Methods:**
```typescript
async search(query: string, location?: string, options: SearchOptions): Promise<NormalizedSearchResult>
async batchSearch(queries: Array<{query, location, options}>): Promise<NormalizedSearchResult[]>
async getMetrics(hoursBack: number): Promise<MetricsSummary>
async generateReport(hoursBack: number): Promise<string>
```

### 2. QueryDeduplicator (`tools/mcp-client/query_deduplicator.ts`)
Handles intelligent query matching and normalization:
- Implements Levenshtein distance for similarity scoring
- Normalizes queries (case, punctuation, whitespace)
- Groups similar queries for batch processing
- Creates representative queries for query groups

**Similarity Thresholds:**
- Venue searches: 85%
- General searches: 90%
- Research queries: 80%
- Location queries: 95%

### 3. CacheManager (`tools/caching/cache_manager.ts`)
Multi-layer caching with TTL policies:
- In-memory cache for hot data
- Disk-based persistence
- Type-specific TTL policies
- LRU eviction strategy

**Cache Types & TTL:**
- News: 1 day (86400s)
- Events: 1 week (604800s)
- Venues: 30 days (2592000s)
- Research: 90 days (7776000s)

### 4. CostAwareRouter (`tools/mcp-client/cost_aware_router.ts`)
Optimizes API selection based on cost and quotas:
- Tracks daily/monthly usage and costs
- Routes to cheapest available API with quota
- Implements fallback strategies
- Enforces cost limits ($10 daily, $100 monthly)

**API Pricing:**
- Brave Search: $3/1K requests (2000 free/month)
- Tavily: $7.50/1K requests (1000 free/month)
- Google Local: Free via MCP

### 5. CacheMetrics (`tools/caching/cache_metrics.ts`)
Comprehensive performance tracking:
- Records cache hits/misses with timing
- Tracks cost savings and API usage
- Generates performance reports
- Provides real-time statistics

**Metrics Tracked:**
- Hit/miss rates (overall and fuzzy)
- Response times (cache vs API)
- Cost per API and total spending
- Query frequency patterns
- Savings rate and projections

### 6. CacheIndex (`tools/caching/cache_index.ts`)
Fast lookup system for cached queries:
- In-memory index with fuzzy search
- Rebuilds automatically every 5 minutes
- Enables efficient similarity matching
- Removes corrupted cache files

## Configuration

### Cache Policies (`config/cache_policies.json`)
```json
{
  "retention": {
    "venue_data": 2592000,
    "news_data": 86400,
    "research_data": 7776000
  },
  "fuzzy_matching": {
    "venue_searches": 0.85,
    "general_searches": 0.90
  },
  "cost_optimization": {
    "daily_cost_alert_threshold": 10.00,
    "cache_hit_target": 0.85
  }
}
```

## Performance Benefits

### Cost Reduction
- **Before**: $1,500/month for 100K searches
- **After**: $300/month with 80% cache hit rate
- **Savings**: $1,200/month (80% cost reduction)

### Speed Improvement
- Cache hits: 10-100ms response time
- API calls: 500-2000ms response time
- **Speedup**: 5-20x faster for cached results

### Resource Efficiency
- Reduced API rate limit pressure
- Lower bandwidth usage
- Improved system reliability

## Integration Pattern

### Basic Usage
```typescript
import { CachedSearchClient } from './mcp-client/cached_search_client.ts';

const client = new CachedSearchClient();

// Search with caching
const results = await client.search(
  'coffee shops',
  'Minneapolis, MN',
  {
    fuzzyMatch: true,
    cacheType: 'venue_data'
  }
);

// Check performance
const stats = await client.getRealTimeStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Batch Processing
```typescript
const queries = [
  { query: 'coffee shops', location: 'Minneapolis, MN' },
  { query: 'coffee houses', location: 'Minneapolis, Minnesota' },
  { query: 'cafes', location: 'Minneapolis, MN' }
];

const results = await client.batchSearch(queries);
// Duplicate/similar queries automatically deduplicated
```

## Monitoring

### CLI Tool (`tools/cache_performance_cli.ts`)
```bash
# Real-time stats
deno run --allow-all tools/cache_performance_cli.ts stats

# Performance report
deno run --allow-all tools/cache_performance_cli.ts report 24

# Cost projections
deno run --allow-all tools/cache_performance_cli.ts costs

# Cleanup old metrics
deno run --allow-all tools/cache_performance_cli.ts cleanup
```

### Metrics Dashboard
- Hit rate tracking
- Cost savings visualization
- Query pattern analysis
- Performance trend monitoring

## Implementation Timeline

1. **Phase 1**: Basic caching with exact matches ✅
2. **Phase 2**: Fuzzy matching and deduplication ✅
3. **Phase 3**: Cost-aware routing ✅
4. **Phase 4**: Comprehensive metrics ✅
5. **Phase 5**: CLI tools and monitoring ✅

## Lessons Learned

### What Worked Well
- Cache-first approach dramatically reduced costs
- Fuzzy matching increased hit rates significantly
- Metrics provided clear ROI visibility
- TypeScript ecosystem integration was seamless

### Optimization Opportunities
- Machine learning for query similarity could improve matching
- Predictive caching based on usage patterns
- Geographic-aware caching strategies
- Content-aware cache invalidation

## Maintenance

### Regular Tasks
- Monitor cache hit rates (target: >80%)
- Review cost projections monthly
- Clean up old metrics (30+ days)
- Update similarity thresholds based on performance

### Alert Conditions
- Hit rate drops below 70%
- Daily costs exceed $10
- Cache storage exceeds 1GB
- API rate limits approached

## Related Patterns
- [Cost Optimization](./cost-optimization.md)
- [API Integration](./api-integration.md)
- [Performance Monitoring](./performance-monitoring.md)

## Anti-Patterns Avoided
- ❌ Direct API calls without caching
- ❌ Exact-match-only caching (low hit rates)
- ❌ No cost tracking or limits
- ❌ Synchronous cache operations
- ❌ No metrics or monitoring
- ❌ Single API dependency