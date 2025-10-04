# The Whereness System - Technical Roadmap

## Vision

Create a network of authentic, locally-sourced city guides delivered as lightning-fast, offline-capable Progressive Web Apps with zero ongoing hosting costs beyond CDN.

## Core Principles

1. **Static-First Architecture**: Everything pre-generated at build time
2. **Zero Backend Costs**: No servers, databases, or API calls in production
3. **Offline-First Experience**: Full functionality without network
4. **Privacy by Design**: All personalization happens on-device
5. **Web Standards Only**: PWA over native apps, avoiding store gatekeepers

## Phase 1: Foundation (Weeks 1-4)

### Goal: Working pipeline for single city

**Infrastructure:**
- [ ] Choose static site generator (Astro vs 11ty)
- [ ] Set up build pipeline (GitHub Actions)
- [ ] Configure CDN deployment (Cloudflare Pages or Netlify)
- [ ] Establish data processing pipeline

**Data Pipeline:**
- [ ] Implement extraction tools for 3 source types
- [ ] Create synthesis engine with LLM integration
- [ ] Build confidence scoring system
- [ ] Generate first indices

**Deliverables:**
- Basic static site with Twin Cities data
- Weekly processing pipeline
- Source → Extract → Synthesize → Build → Deploy

**Cost Target:** <$10/month (CDN only)

## Phase 2: Search & Discovery (Weeks 5-8)

### Goal: Client-side search and filtering

**Search Implementation:**
- [ ] Generate search indices at build time
- [ ] Implement client-side search (Lunr.js or Fuse.js)
- [ ] Create faceted filtering system
- [ ] Build quick-access indices

**Performance Targets:**
- Search index <500KB per city
- Search results <100ms
- Initial page load <1 second

**Deliverables:**
- Instant search across all entities
- Filter by neighborhood, time, activity, budget
- No server-side search costs

## Phase 3: Personalization Layer (Weeks 9-12)

### Goal: User preferences without backend

**Local Storage Strategy:**
- [ ] Implement preference storage in localStorage
- [ ] Create preference UI components
- [ ] Build content filtering system
- [ ] Add view modes (visitor/resident/planning)

**Preference Features:**
```javascript
preferences = {
  mode: 'visitor|resident|planning',
  city: 'minneapolis|albuquerque|denver',
  interests: ['coffee', 'music', 'outdoors'],
  accessibility: ['wheelchair', 'transit'],
  budget: 'low|moderate|high'
}
```

**Deliverables:**
- Persistent user preferences
- Filtered content views
- Shareable preference URLs
- Zero tracking or cookies

## Phase 4: PWA & Offline (Weeks 13-16)

### Goal: Full offline functionality

**Progressive Web App:**
- [ ] Implement service worker
- [ ] Create manifest.json
- [ ] Build install prompts
- [ ] Design offline UI

**Caching Strategy:**
```javascript
caching = {
  essential: '2MB',    // This week's data
  standard: '15MB',    // Full current data
  complete: '50MB'     // Everything + images
}
```

**Storage Implementation:**
- [ ] IndexedDB for entity data
- [ ] Cache API for assets
- [ ] Background sync for updates
- [ ] Storage management UI

**Deliverables:**
- Installable PWA
- Full offline search
- Smart sync on WiFi
- Storage controls

## Phase 5: Multi-City Scaling (Weeks 17-20)

### Goal: Three cities live

**Cities:**
1. Twin Cities (complete)
2. Albuquerque (launch)
3. Denver (launch)

**Optimizations:**
- [ ] Shared components across cities
- [ ] Lazy load city data
- [ ] Progressive enhancement
- [ ] CDN geo-distribution

**Deliverables:**
- Three city guides live
- City switcher interface
- Cross-city search
- <100MB total download

## Phase 6: Advanced Features (Weeks 21-24)

### Goal: Enhanced discovery

**Features:**
- [ ] Temporal layers (seasonal, time-of-day)
- [ ] Relationship explorer
- [ ] Serendipity engine
- [ ] Discovery paths

**All Client-Side:**
- Graph traversal in browser
- Pre-computed relationships
- Vector maps (Mapbox GL JS)
- WebGL visualizations

## Phase 7: Content Automation (Ongoing)

### Goal: Sustainable updates

**Weekly Pipeline:**
- [ ] Automated source ingestion
- [ ] LLM synthesis batch
- [ ] Quality validation
- [ ] Auto-deployment

**Cost Management:**
- Batch LLM API calls
- Cache extraction results
- Incremental updates only
- Static diff deployments

## Technology Stack

### Build Time
- **Static Generator:** Astro (recommended) or 11ty
- **Build:** GitHub Actions
- **Data Processing:** Python/Node scripts
- **LLM:** Claude/GPT API (batch mode)

### Runtime (Client Only)
- **Search:** Lunr.js or Fuse.js
- **Storage:** IndexedDB + localStorage
- **Maps:** Mapbox GL JS (vector tiles)
- **PWA:** Service Workers + Web Manifest
- **Framework:** Vanilla JS or Preact (3KB)

### Hosting
- **CDN:** Cloudflare Pages (free tier)
- **Alternative:** Netlify (free tier)
- **Domain:** $12/year
- **Total:** <$2/month at scale

## Cost Projections

### Development Phase
- LLM API calls: ~$50/month during development
- Source data: Free (Reddit, podcasts)
- Development tools: Free (open source)

### Production (per city)
- Hosting: $0 (CDN free tier)
- Weekly updates: ~$5/month LLM costs
- Storage: $0 (client-side)
- Search: $0 (client-side)
- Total: <$20/month for 3 cities

### At Scale (10 cities)
- CDN: ~$10/month (if exceeding free tier)
- LLM: ~$50/month (batch processing)
- Total: <$60/month for 10 cities

## Success Metrics

### Performance
- First paint: <1 second
- Search results: <100ms
- Offline capable: 100%
- Lighthouse score: >95

### User Experience
- Install rate: >20% of repeat visitors
- Offline usage: >30% of sessions
- Search usage: >50% of sessions
- Return rate: >40% weekly

### Cost Efficiency
- Per-city cost: <$10/month
- Per-user cost: <$0.001/month
- Zero marginal cost per user
- No scaling concerns

## Risk Mitigation

### Technical Risks
- **Browser storage limits:** Progressive download, user controls
- **Search index size:** Chunking, lazy loading
- **PWA adoption:** Progressive enhancement, works without install

### Content Risks
- **LLM costs:** Batch processing, caching, incremental updates
- **Data freshness:** Weekly updates, decay indicators
- **Quality control:** Confidence scores, source verification

## Non-Goals (Intentionally Excluded)

- User accounts or authentication
- Server-side personalization
- Real-time updates
- Social features
- User-generated content
- Analytics or tracking
- Dynamic pricing data
- Booking/reservation systems

## Next Steps

1. **Immediate:** Choose static site generator
2. **This Week:** Build extraction pipeline for Twin Cities
3. **Next Week:** Implement basic static site
4. **Two Weeks:** Add client-side search

## Metadata

- **Document Type:** Technical Roadmap
- **Created:** 2024-11-17
- **Updated:** 2024-11-17
- **Status:** Active
- **Owner:** System Architects

## Change History

- 2024-11-17: Initial roadmap with PWA/offline focus and cost optimization