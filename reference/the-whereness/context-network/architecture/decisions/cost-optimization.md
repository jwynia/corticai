# Architecture Decision: Cost Optimization Strategy

## Decision

**We adopt an aggressive cost optimization strategy targeting <$10/month operational costs for the entire system**, achieved through static generation, client-side processing, and strategic use of free tiers.

## Status

Accepted

## Context

The Whereness System must be financially sustainable as an independent project. Traditional web architectures can quickly escalate to hundreds of dollars per month. We need to architect for near-zero marginal costs.

### Traditional Cost Centers to Eliminate

| Component | Typical Cost | Our Approach | Our Cost |
|-----------|--------------|--------------|----------|
| Database | $20-100/mo | Static files + client storage | $0 |
| API Server | $50-200/mo | Static generation | $0 |
| Search Service | $50-500/mo | Client-side search | $0 |
| CDN | $20-100/mo | Free tier usage | $0 |
| Analytics | $10-50/mo | Privacy-first, no analytics | $0 |
| User Auth | $10-100/mo | No accounts needed | $0 |
| **Total** | **$160-1050/mo** | **Our approach** | **<$10/mo** |

## Cost Optimization Principles

### 1. Build-Time Computation
**Principle**: Do expensive work once at build time, not per-request

```javascript
// EXPENSIVE (per request)
app.get('/search', (req, res) => {
  const results = searchDatabase(req.query);
  res.json(results);
});

// CHEAP (build time)
const searchIndex = buildSearchIndex(allData);
fs.writeFileSync('search-index.json', searchIndex);
// Client downloads once, searches locally
```

### 2. Client-Side Processing
**Principle**: Use visitor's device for computation

- Search happens in browser
- Filtering on device
- Preferences stored locally
- No server round trips

### 3. Edge Caching Everything
**Principle**: Serve from CDN edge, not origin servers

- Static files cached globally
- No origin server needed
- Instant response times
- Free tier sufficient

### 4. Batch Processing
**Principle**: Group expensive operations

```javascript
// LLM API calls - batch weekly
const weeklyProcess = async () => {
  const allSources = await gatherWeeklySources();
  const batchSynthesis = await llm.batch(allSources); // One API call
  await generateSite(batchSynthesis);
};
```

## Detailed Cost Breakdown

### Development Phase Costs

| Item | Monthly Cost | Notes |
|------|--------------|-------|
| LLM API (development) | $30-50 | Heavy testing and iteration |
| Domain | $1 ($12/year) | Standard .com domain |
| Development tools | $0 | Open source stack |
| **Total Dev** | **$31-51** | Temporary during build |

### Production Costs (Per City)

| Item | Monthly Cost | Strategy |
|------|--------------|----------|
| Hosting (CDN) | $0 | Cloudflare Pages free tier (unlimited bandwidth) |
| Weekly LLM synthesis | $2-3 | Batch processing, ~1000 tokens per venue |
| Source data | $0 | Public APIs, RSS, Reddit |
| Storage | $0 | Client-side only |
| **Total per city** | **$2-3** | Linear scaling |

### At Scale (10 Cities)

| Item | Monthly Cost | Notes |
|------|--------------|-------|
| CDN | $0-10 | May need paid tier at 100GB+/month |
| LLM API | $20-30 | Batch processing for all cities |
| Build processing | $0 | GitHub Actions free tier (2000 mins/month) |
| Monitoring | $0 | Basic uptime checking only |
| **Total** | **$20-40** | 10 cities fully operational |

## Free Tier Optimization

### Cloudflare Pages
- **Free Tier**: Unlimited bandwidth, 500 builds/month
- **Our Usage**: ~30 builds/month (weekly × cities)
- **Buffer**: 94% headroom

### GitHub Actions
- **Free Tier**: 2000 minutes/month
- **Our Usage**: ~300 minutes (10 min × 30 builds)
- **Buffer**: 85% headroom

### Netlify (Alternative)
- **Free Tier**: 100GB bandwidth, 300 build mins
- **Our Usage**: Within limits for 3-5 cities
- **Fallback**: If Cloudflare changes terms

## LLM Cost Optimization

### Batching Strategy
```python
# Expensive: Individual calls
for venue in venues:
    result = llm.complete(venue)  # $0.01 × 1000 = $10

# Cheap: Batched calls
batches = chunk(venues, size=50)
for batch in batches:
    results = llm.complete(batch)  # $0.20 × 20 = $4
```

### Caching Strategy
- Cache source extractions (1 month)
- Cache synthesis results (1 week)
- Incremental updates only
- Skip unchanged content

### Model Selection
- Use cheaper models for extraction
- Premium models only for synthesis
- Fine-tune prompts to reduce tokens
- Stop sequences to prevent overrun

## Storage Cost Avoidance

### No Cloud Storage Needed
```javascript
// Traditional: Cloud storage
aws.s3.putObject({  // $0.023/GB/month
  Bucket: 'user-preferences',
  Key: userId,
  Body: preferences
});

// Our approach: Client storage
localStorage.setItem('preferences', JSON.stringify(preferences)); // $0
```

### No Database Needed
```javascript
// Traditional: Database queries
const venues = await db.query(
  'SELECT * FROM venues WHERE city = ?',
  [city]
); // $20-100/month for database

// Our approach: Static JSON
const venues = await fetch('/data/cities/minneapolis/venues.json')
  .then(r => r.json()); // $0
```

## Bandwidth Optimization

### Initial Load Budget
| Resource | Size | Strategy |
|----------|------|----------|
| HTML | 10KB | Minimal, semantic |
| CSS | 20KB | Utility-first, purged |
| JS | 50KB | Vanilla or Preact |
| Data (essential) | 200KB | This week only |
| **Total** | **280KB** | Under 3G target |

### Progressive Loading
```javascript
// Load essential data first
const essential = await fetch('/data/essential.json'); // 200KB

// Background load full dataset
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    fetch('/data/full.json'); // 2-5MB in background
  });
}
```

## Cost Monitoring

### Key Metrics
- CDN bandwidth usage
- Build minutes consumed
- LLM tokens used
- Free tier percentages

### Alerts
- 80% of free tier = warning
- 90% of free tier = critical
- Unexpected costs = immediate review

## Scaling Strategy

### Linear Scaling
- Each city adds ~$2-3/month
- No exponential growth
- Predictable costs

### Revenue Options (Future)
- Optional "coffee" donations
- City sponsor acknowledgments
- Never ads or tracking

## Cost Anti-Patterns to Avoid

❌ **Don't**:
- Add "just one" API service
- Use cloud functions for simple tasks
- Store user data in cloud
- Add real-time features
- Implement server-side rendering
- Use managed search services
- Add analytics/tracking

✅ **Do**:
- Question every external service
- Batch expensive operations
- Cache aggressively
- Use client resources
- Optimize at build time
- Stay within free tiers
- Monitor usage closely

## Emergency Cost Reduction

If costs exceed budget:

1. **Immediate**: Reduce update frequency (weekly → biweekly)
2. **Short-term**: Optimize LLM prompts for fewer tokens
3. **Medium-term**: Switch to cheaper LLM provider
4. **Long-term**: Implement own extraction without LLM

## Success Metrics

- **Cost per city**: <$5/month
- **Cost per 1000 users**: <$0.10
- **Free tier usage**: <80%
- **Cost predictability**: ±10% monthly

## Review Schedule

Review when:
- Monthly costs exceed $10
- Adding new city
- Free tier changes announced
- 10,000 active users reached

## Metadata

- **ADR Number:** 003
- **Created:** 2024-11-17
- **Updated:** 2024-11-17
- **Status:** Accepted
- **Deciders:** System architects
- **Tags:** #architecture #cost-optimization #sustainability #free-tier

## Change History

- 2024-11-17: Initial cost optimization strategy documented