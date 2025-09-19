# CorticAI Use Case Analysis: Place Context System

## Executive Summary

This document analyzes how a complex place-based information system would be implemented using CorticAI, testing whether CorticAI can remain a general-purpose context engine while effectively managing domain-specific information. The place context system serves as a stress test for CorticAI's universality claims.

**Key Finding**: CorticAI successfully remains domain-agnostic while providing full functionality for the place context system through its adapter and lens architecture.

## The Place Context System Requirements

The place context system manages complex, overlapping information about:
- **Places**: Venues, areas, points of interest, routes
- **Activities**: Things people do (hiking, dancing, reading)
- **Services**: Things done for people (haircuts, repairs)
- **Products**: Things people acquire (coffee, books, meals)
- **Groups**: Organizations that make things happen
- **Events**: Temporal instances of activities

Key challenges include:
- Multiple access paths to same information (index vs. table of contents)
- Complex many-to-many relationships with metadata
- Geographic and temporal dimensions
- Real-time data requirements ("open now")
- Multi-perspective navigation (tourist vs. resident vs. night owl)

## Mapping to CorticAI Architecture

### 1. Entity Mapping

The place system's entities map directly to CorticAI's universal node structure without modification:

```typescript
// Place system defines entities
type Place = {
  id: string
  name: string
  type: 'venue' | 'area' | 'point' | 'route'
}

// CorticAI stores them generically
interface UniversalNode {
  id: string
  type: string  // "place" - just a string to CorticAI
  properties: JsonObject  // All place-specific data goes here
}

// Example: Coffee shop as universal node
{
  id: "blue-bottle-soma",
  type: "place",
  properties: {
    subtype: "venue",
    name: "Blue Bottle Coffee",
    address: "66 Mint Plaza",
    hours: {
      monday: { open: "7:00", close: "19:00" },
      // ...
    },
    coordinates: { lat: 37.7823, lon: -122.4076 }
  }
}
```

**Analysis**: CorticAI doesn't need to understand what a "place" is. It only needs to store nodes with properties and relationships. The meaning emerges from the domain adapter.

### 2. Relationship Mapping

Place relationships become generic edges in CorticAI:

```typescript
// Place system relationships
type ActivityPlaceRel = 
  | 'AVAILABLE_AT'     // Yoga available at studio
  | 'REQUIRES_TYPE'    // Hiking requires trails
  | 'SUITABLE_FOR'     // Cafe suitable for working

// CorticAI stores as generic edges
interface UniversalEdge {
  from: string  // Node ID
  to: string    // Node ID
  type: string  // "AVAILABLE_AT" - just a string
  properties: JsonObject
}

// Example: Trivia night at pub
{
  from: "trivia-night-activity",
  to: "mcmenamins-kennedy",
  type: "HOSTED_AT",
  properties: {
    day_of_week: ["Tuesday"],
    time: "20:00",
    frequency: "weekly",
    requires_registration: false
  }
}
```

**Analysis**: CorticAI treats relationship types as opaque strings. Only the PlaceDomainAdapter knows that "HOSTED_AT" implies a venue-activity relationship.

### 3. Multi-Path Navigation

The place system's index model aligns perfectly with CorticAI's design:

```typescript
// Multiple paths to find coffee
class PlaceNavigationPaths {
  // Geographic path
  async findByNeighborhood(neighborhood: string) {
    return await corticai.query(
      `MATCH (p:place)-[:LOCATED_IN]->(n {name: "${neighborhood}"})`
    )
  }
  
  // Activity path
  async findByActivity(activity: string) {
    return await corticai.query(
      `MATCH (p:place)<-[:AVAILABLE_AT]-(a {name: "${activity}"})`
    )
  }
  
  // Product path
  async findByProduct(product: string) {
    return await corticai.query(
      `MATCH (p:place)-[:SELLS]->(prod {name: "${product}"})`
    )
  }
  
  // Temporal path
  async findOpenNow() {
    const nodes = await corticai.query(`MATCH (p:place)`)
    return this.filterByHours(nodes, new Date())
  }
}
```

**Analysis**: CorticAI's graph structure naturally supports multiple access paths without privileging any single hierarchy.

## Domain Adapter Implementation

The PlaceDomainAdapter translates between place concepts and CorticAI's generic storage:

```typescript
class PlaceDomainAdapter extends BaseDomainAdapter {
  // Define place-specific node types
  nodeTypes = new Map([
    ['place', { 
      required: ['name', 'subtype'],
      optional: ['address', 'hours', 'coordinates']
    }],
    ['activity', { 
      required: ['name', 'type'],
      optional: ['duration', 'equipment_needed']
    }],
    ['service', { 
      required: ['name'],
      optional: ['price_range', 'appointment_required']
    }],
    ['product', { 
      required: ['name', 'category'],
      optional: ['price', 'local_made']
    }],
    ['group', { 
      required: ['name', 'type'],
      optional: ['membership_required', 'website']
    }],
    ['event', { 
      required: ['name'],
      optional: ['date', 'recurrence', 'registration']
    }]
  ])
  
  // Define place-specific relationships
  edgeTypes = new Map([
    ['AVAILABLE_AT', { connects: ['activity', 'place'] }],
    ['PROVIDED_BY', { connects: ['service', 'place'] }],
    ['SOLD_AT', { connects: ['product', 'place'] }],
    ['OPERATES', { connects: ['group', 'place'] }],
    ['HOSTS_AT', { connects: ['event', 'place'] }],
    ['LOCATED_IN', { connects: ['place', 'place'] }]
  ])
  
  // Extract place information from files
  async extract(file: File): Promise<Entity[]> {
    if (file.path.includes('places/venues/')) {
      return this.extractVenue(file)
    }
    // ... other extraction logic
  }
  
  // Translate natural queries to graph queries
  translateQuery(natural: string): GraphQuery {
    // "coffee shops in SOMA" becomes:
    // MATCH (p:place {subtype: 'venue'})-[:SELLS]->(prod {name: 'coffee'})
    // WHERE p.neighborhood = 'SOMA'
    
    // "things to do Tuesday night" becomes:
    // MATCH (a:activity)-[r:AVAILABLE_AT]->(p:place)
    // WHERE 'Tuesday' IN r.day_of_week AND r.time > '18:00'
    
    return this.queryParser.parse(natural)
  }
}
```

**Analysis**: The adapter encapsulates all place-specific logic, leaving CorticAI's core engine unchanged.

## Lens System for Place Perspectives

Different user perspectives are handled through CorticAI's lens system:

```typescript
// Tourist Lens - Emphasizes attractions and visitor services
const touristLens: ContextLens = {
  id: 'tourist',
  name: 'Tourist Perspective',
  activation: {
    patterns: ['attractions', 'must see', 'visit'],
    queries: ['what to do', 'tourist', 'sightseeing']
  },
  highlighting: {
    emphasize: `
      MATCH (p:place) 
      WHERE p.properties.tourist_attraction = true 
        OR p.properties.landmark = true
      RETURN p
    `,
    deemphasize: `
      MATCH (p:place)
      WHERE p.properties.residential_only = true
      RETURN p
    `,
    augment: ['tripadvisor_reviews', 'tourist_info_centers']
  },
  loading: {
    priority: [
      { type: 'monuments', depth: 'full' },
      { type: 'museums', depth: 'detailed' },
      { type: 'restaurants', depth: 'semantic' }
    ]
  }
}

// Local Resident Lens - Emphasizes everyday services and hidden gems
const residentLens: ContextLens = {
  id: 'resident',
  name: 'Local Resident Perspective',
  activation: {
    patterns: ['everyday', 'regular', 'local'],
    queries: ['groceries', 'haircut', 'dry cleaning']
  },
  highlighting: {
    emphasize: `
      MATCH (p:place)-[:PROVIDES]->(s:service)
      WHERE s.properties.essential = true
      RETURN p
    `,
    deemphasize: `
      MATCH (p:place)
      WHERE p.properties.tourist_trap = true
      RETURN p
    `
  }
}

// Night Owl Lens - Emphasizes late-night options
const nightOwlLens: ContextLens = {
  id: 'night_owl',
  name: 'Night Owl Perspective',
  activation: {
    patterns: ['late night', 'after midnight', '24 hour'],
    queries: ['open late', 'nightlife', 'after hours']
  },
  highlighting: {
    emphasize: `
      MATCH (p:place)
      WHERE p.properties.hours.close > '23:00' 
        OR p.properties.hours.24_hour = true
      RETURN p
    `
  },
  loading: {
    timeFilter: { after: '21:00', before: '05:00' }
  }
}
```

**Analysis**: Lenses provide perspective-specific filtering without modifying CorticAI's core functionality.

## Progressive Detail Loading

The place system benefits from CorticAI's depth-based loading:

```typescript
class PlaceContextLoader {
  async loadPlace(placeId: string, depth: ContextDepth) {
    switch(depth) {
      case ContextDepth.SIGNATURE:
        // Minimal: name, type, address
        return {
          name: "Blue Bottle Coffee",
          type: "cafe",
          address: "66 Mint Plaza"
        }
        
      case ContextDepth.STRUCTURE:
        // + Basic relationships
        return {
          ...signature,
          serves: ["coffee", "pastries"],
          neighborhood: "SOMA",
          priceRange: "$$$"
        }
        
      case ContextDepth.SEMANTIC:
        // + Meaning and patterns
        return {
          ...structure,
          vibe: "minimalist third-wave",
          bestFor: ["coffee aficionados", "remote work"],
          similarTo: ["Sightglass", "Ritual"]
        }
        
      case ContextDepth.DETAILED:
        // + Full details
        return {
          ...semantic,
          menu: fullMenu,
          reviews: recentReviews,
          events: upcomingEvents,
          photos: placePhotos
        }
        
      case ContextDepth.HISTORICAL:
        // + Evolution over time
        return {
          ...detailed,
          previousNames: ["Albina Press (2015-2019)"],
          changes: changeHistory,
          patterns: visitPatterns
        }
    }
  }
}
```

**Analysis**: Progressive loading works naturally for place information, allowing efficient context management.

## Handling Place-Specific Requirements

### Spatial Queries

Geographic queries are handled by the adapter, not CorticAI core:

```typescript
class PlaceSpatialExtension {
  private spatialIndex: RTree  // Separate spatial structure
  private corticai: CorticAI
  
  async findNearby(lat: number, lon: number, radius: number) {
    // Use spatial index for initial filtering
    const nearbyIds = this.spatialIndex.search({
      minLat: lat - radius,
      maxLat: lat + radius,
      minLon: lon - radius,
      maxLon: lon + radius
    })
    
    // Then query CorticAI for full details
    return await this.corticai.query(
      `MATCH (p:place) WHERE p.id IN [${nearbyIds}]`
    )
  }
}
```

### Real-Time Data

Temporal filtering happens in the adapter layer:

```typescript
class PlaceTemporalFilter {
  filterOpenNow(places: Node[]): Node[] {
    const now = new Date()
    const dayOfWeek = now.toLocaleLowerCase('en-US', { weekday: 'long' })
    const timeStr = now.toTimeString().slice(0, 5)  // "HH:MM"
    
    return places.filter(place => {
      const hours = place.properties.hours?.[dayOfWeek]
      if (!hours) return false
      
      return timeStr >= hours.open && timeStr <= hours.close
    })
  }
}
```

### External API Integration

External data augments CorticAI without modifying it:

```typescript
class PlaceAugmentationService {
  async augment(node: Node): Promise<Node> {
    if (node.type !== 'place') return node
    
    // Add external data to properties
    const augmented = { ...node }
    augmented.properties.external = {
      google: await this.fetchGooglePlace(node),
      yelp: await this.fetchYelpReviews(node),
      transit: await this.fetchTransitInfo(node)
    }
    
    return augmented
  }
}
```

## Universal Patterns in Place Context

CorticAI's universal patterns apply naturally to places:

```typescript
// Circular Dependency
// Example: Food court in mall with restaurants that are in the food court
MATCH (p1:place)-[:CONTAINS]->(p2:place)-[:LOCATED_IN]->(p1)

// God Object (Overly Central)
// Example: Shopping mall with too many contained venues
MATCH (mall:place)
WHERE COUNT((mall)-[:CONTAINS]->()) > 100
RETURN mall

// Orphan
// Example: Event with no venue, Service with no provider
MATCH (n)
WHERE NOT EXISTS((n)-[]-())
  AND n.type IN ['event', 'service']
RETURN n

// Duplicate Detection
// Example: Same restaurant listed multiple times
MATCH (p1:place), (p2:place)
WHERE p1.id <> p2.id 
  AND p1.properties.name = p2.properties.name
  AND p1.properties.address = p2.properties.address
```

## Implementation Architecture

```
project/
├── .context/                    # CorticAI storage
│   ├── graph.kuzu/             # Generic graph database
│   ├── analytics.duckdb        # Generic analytics
│   └── config.yaml             # CorticAI configuration
├── adapters/
│   ├── place/                  # Place-specific logic
│   │   ├── PlaceDomainAdapter.ts
│   │   ├── PlaceSpatialIndex.ts
│   │   └── PlaceTemporalFilter.ts
│   └── code/                   # Still works for code!
│       └── CodeDomainAdapter.ts
├── lenses/
│   ├── place/                  # Place perspectives
│   │   ├── tourist.lens.ts
│   │   ├── resident.lens.ts
│   │   └── nightowl.lens.ts
│   └── code/                   # Code perspectives
│       ├── debug.lens.ts
│       └── architecture.lens.ts
└── place-network/              # Original markdown files
    ├── places/
    ├── activities/
    └── services/
```

## Validation Criteria

### CorticAI Remains Generic ✅

1. **No place-specific code in core**: The core engine has zero knowledge of places, coordinates, hours, or any domain concept
2. **No special data types**: Everything is stored as generic nodes and edges with JSON properties
3. **No domain logic in engine**: All place logic lives in adapters and lenses
4. **Other adapters still work**: Code, document, and other adapters function unchanged

### Place System Gets Full Functionality ✅

1. **Multi-path navigation**: Works through CorticAI's graph structure
2. **Complex relationships**: Stored with full metadata in edge properties
3. **Multiple perspectives**: Implemented through lens system
4. **Progressive loading**: Uses CorticAI's depth levels
5. **Pattern detection**: Universal patterns apply to place domain

### Separation of Concerns ✅

```typescript
// CorticAI Core: Knows nothing about places
class ContextEngine {
  addNode(node: UniversalNode)  // Generic
  query(pattern: string)         // Generic
  traverse(start, relation)      // Generic
}

// Place Adapter: Knows everything about places
class PlaceDomainAdapter {
  interpretPlaceQuery(q: string)     // Place-specific
  validatePlaceData(node: Node)      // Place-specific
  enrichWithGeodata(node: Node)      // Place-specific
}

// Clear boundary maintained
```

## Conclusion

The place context system successfully validates CorticAI's universal design. CorticAI provides:

1. **Storage infrastructure** for nodes and relationships
2. **Query capabilities** for graph traversal
3. **Lens system** for perspectives
4. **Progressive loading** for context management
5. **Pattern detection** for insights
6. **Consolidation processes** for maintenance

While the place system provides:

1. **Domain vocabulary** through adapters
2. **Interpretation logic** for place concepts
3. **Spatial indexing** as an extension
4. **Temporal filtering** in the adapter layer
5. **External integrations** for real-time data

Neither system compromises the other. CorticAI remains completely domain-agnostic while the place system gets full functionality. This demonstrates that CorticAI can handle complex domain-specific requirements without becoming domain-specific itself.

### Key Success Factor

The success lies in CorticAI's design principle: **"Context is memory, not meaning."** CorticAI remembers relationships and patterns without needing to understand what they mean. Domain adapters provide meaning, while CorticAI provides memory.