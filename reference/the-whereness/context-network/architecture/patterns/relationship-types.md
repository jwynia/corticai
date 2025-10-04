# Relationship Types Pattern

## Overview

This pattern defines how entities in The Whereness System connect to each other. Relationships carry semantic meaning beyond simple associations - they express the nature, strength, temporality, and conditions of connections between places, activities, services, products, groups, events, and hobby resources.

## Core Philosophy

**Relationship Semantics Over Node Properties**

Instead of loading entities with properties, we express meaning through typed relationships. This allows:
- Same entity to have different meanings in different contexts
- Richer expression of conditional or temporal connections
- Graph-like traversal of information
- Discovery through relationship paths

## Primary Relationship Categories

### 1. Spatial Relationships

Connections based on physical location and proximity.

```typescript
type SpatialRelationship =
  | 'CONTAINED_IN'      // Venue inside building/area
  | 'CONTAINS'          // Area contains venues
  | 'ADJACENT_TO'       // Physical neighbors
  | 'NEAR'              // Proximity (requires distance)
  | 'CONNECTED_BY'      // Skyway, tunnel, trail
  | 'PART_OF'           // Neighborhood part of city
  | 'ACCESSIBLE_FROM'   // Transit/parking access
```

Example metadata:
```json
{
  "type": "CONNECTED_BY",
  "from": "ids-center",
  "to": "nicollet-mall",
  "metadata": {
    "connection_type": "skyway",
    "accessible": true,
    "distance_meters": 50
  }
}
```

### 2. Temporal Relationships

Connections with time-based characteristics.

```typescript
type TemporalRelationship =
  | 'HAPPENS_AT'        // Event at place
  | 'OCCURS_BEFORE'     // Sequence
  | 'OCCURS_AFTER'      // Sequence
  | 'CONCURRENT_WITH'   // Same time
  | 'ALTERNATES_WITH'   // Rotating schedule
  | 'SEASONAL_AT'       // Seasonal availability
  | 'SCHEDULED_FOR'     // Future planning
```

Example metadata:
```json
{
  "type": "HAPPENS_AT",
  "from": "trivia-night",
  "to": "lakes-and-legends",
  "metadata": {
    "day_of_week": ["tuesday"],
    "time": "19:00",
    "frequency": "weekly",
    "exceptions": ["holidays"]
  }
}
```

### 3. Operational Relationships

Connections expressing ownership, management, and provision.

```typescript
type OperationalRelationship =
  | 'OPERATED_BY'       // Business operations
  | 'OWNS'              // Ownership
  | 'MANAGES'           // Management without ownership
  | 'FRANCHISED_BY'     // Chain relationships
  | 'PROVIDES'          // Service/product provision
  | 'HOSTS'             // Regular hosting
  | 'SPONSORS'          // Financial support
  | 'PARTNERS_WITH'     // Business partnership
```

Example metadata:
```json
{
  "type": "OPERATED_BY",
  "from": "spyhouse-nicollet",
  "to": "spyhouse-coffee-roasters",
  "metadata": {
    "relationship_start": "2015-03-01",
    "franchise": false,
    "ownership_type": "corporate"
  }
}
```

### 4. Activity Relationships

Connections between activities and their requirements or contexts.

```typescript
type ActivityRelationship =
  | 'ENABLES'           // Makes activity possible
  | 'REQUIRES'          // Necessary for activity
  | 'ENHANCES'          // Improves activity
  | 'SUITABLE_FOR'      // Appropriate venue
  | 'COMBINES_WITH'     // Often done together
  | 'CONFLICTS_WITH'    // Cannot co-occur
  | 'LEADS_TO'          // Natural progression
```

Example metadata:
```json
{
  "type": "REQUIRES",
  "from": "ice-climbing",
  "to": "vertical-endeavors",
  "metadata": {
    "requirement_type": "equipment",
    "specific_needs": ["ice_tools", "crampons"],
    "rental_available": true,
    "expertise_level": "intermediate"
  }
}
```

### 5. Supply Chain Relationships

Connections in the flow of products and materials.

```typescript
type SupplyChainRelationship =
  | 'SUPPLIES'          // Provides materials
  | 'SOURCES_FROM'      // Gets materials from
  | 'PRODUCES'          // Creates products
  | 'DISTRIBUTES'       // Sells/distributes
  | 'REPAIRS'           // Maintenance services
  | 'CUSTOMIZES'        // Modification services
  | 'CONSUMES'          // Uses products
```

Example metadata:
```json
{
  "type": "SOURCES_FROM",
  "from": "fair-trade-coffee-shop",
  "to": "peace-coffee-roasters",
  "metadata": {
    "product_types": ["coffee_beans", "cold_brew"],
    "exclusivity": false,
    "local": true,
    "delivery_schedule": "weekly"
  }
}
```

### 6. Community Relationships

Connections expressing social and community bonds.

```typescript
type CommunityRelationship =
  | 'MEMBER_OF'         // Membership
  | 'AFFILIATED_WITH'   // Loose association
  | 'COMPETES_WITH'     // Competition
  | 'COLLABORATES_WITH' // Active collaboration
  | 'MENTORS'           // Teaching relationship
  | 'ALUMNI_OF'         // Past association
  | 'RECOMMENDS'        // Endorsement
```

Example metadata:
```json
{
  "type": "COLLABORATES_WITH",
  "from": "northeast-makers-guild",
  "to": "twin-cities-maker",
  "metadata": {
    "collaboration_type": "tool_sharing",
    "formal_agreement": true,
    "start_date": "2023-01-01"
  }
}
```

### 7. Progression Relationships

Connections showing learning paths and skill development.

```typescript
type ProgressionRelationship =
  | 'PREREQUISITE_FOR'  // Must complete first
  | 'PREPARATION_FOR'   // Helpful but not required
  | 'ADVANCES_TO'       // Next level
  | 'ALTERNATIVE_TO'    // Different path
  | 'SPECIALIZES_FROM'  // Specialization
  | 'BRANCHES_TO'       // Multiple options
```

Example metadata:
```json
{
  "type": "PREREQUISITE_FOR",
  "from": "basic-woodworking",
  "to": "furniture-making",
  "metadata": {
    "skills_required": ["measuring", "cutting", "joining"],
    "tools_needed": ["saw", "drill", "sander"],
    "typical_duration": "3_months"
  }
}
```

## Relationship Metadata Schema

All relationships can carry metadata to express conditions, strength, and temporality:

```typescript
interface RelationshipMetadata {
  // Temporal aspects
  temporal?: {
    start_date?: string;
    end_date?: string;
    day_of_week?: string[];
    time_of_day?: string[];
    frequency?: 'daily' | 'weekly' | 'monthly' | 'annual';
    seasonal?: boolean;
    season?: ('spring' | 'summer' | 'fall' | 'winter')[];
  };

  // Strength and confidence
  strength?: 'primary' | 'secondary' | 'occasional' | 'weak';
  confidence?: number; // 0.0 to 1.0
  verified?: string; // Date of last verification

  // Conditions
  conditions?: {
    weather?: string[];
    membership_required?: boolean;
    appointment_needed?: boolean;
    age_restrictions?: string;
    cost?: string;
  };

  // Quantitative measures
  metrics?: {
    distance_meters?: number;
    duration_minutes?: number;
    capacity?: number;
    frequency_per_month?: number;
  };

  // Sources and validation
  sources?: string[];
  last_updated?: string;
  update_frequency?: string;
}
```

## Twin Cities Specific Relationships

### Skyway/Tunnel Connections

```typescript
interface SkywayConnection {
  type: 'CONNECTED_BY';
  connection_type: 'skyway' | 'tunnel';
  accessibility: {
    wheelchair: boolean;
    hours: string;
    public: boolean;
  };
}
```

### Cross-City Relationships

```typescript
interface CrossCityRelationship {
  cities_involved: ('minneapolis' | 'st-paul' | string)[];
  transit_connection?: string;
  typical_travel_time?: number;
}
```

### Seasonal Variations

```typescript
interface SeasonalRelationship {
  summer_relationship?: string;
  winter_relationship?: string;
  transition_periods?: {
    spring: [string, string]; // [start, end]
    fall: [string, string];
  };
}
```

## Relationship Expression in Context

### In Markdown Files

```markdown
## Relationships

### Operated By
- [[groups/businesses/spyhouse-coffee]] (since 2015)

### Hosts
- [[events/recurring/trivia-night]] - Tuesdays at 8pm
- [[groups/clubs/chess-club]] - Saturdays 2-5pm

### Connected To
- [[places/venues/ids-center]] - via skyway (wheelchair accessible)
- [[places/transit/nicollet-mall-station]] - 2 minute walk

### Enables Activities
- [[activities/social/coworking]] - wifi, outlets, quiet space
- [[activities/everyday/coffee-meetings]] - private corners available
```

### In JSON Relationships

```json
{
  "relationships": [
    {
      "type": "OPERATED_BY",
      "from": "spyhouse-nicollet",
      "to": "spyhouse-coffee-roasters",
      "metadata": {
        "strength": "primary",
        "confidence": 1.0
      }
    },
    {
      "type": "HOSTS",
      "from": "spyhouse-nicollet",
      "to": "tuesday-trivia",
      "metadata": {
        "temporal": {
          "day_of_week": ["tuesday"],
          "time_of_day": ["20:00"],
          "frequency": "weekly"
        }
      }
    }
  ]
}
```

## Relationship Discovery Patterns

### Path-Based Discovery

Find entities through relationship chains:

```
User Need: "Coffee shop for working"
Path 1: activity/coworking -> SUITABLE_FOR -> venues/coffee-shops
Path 2: service/wifi -> PROVIDED_BY -> venues/with-wifi
Path 3: neighborhood/northeast -> CONTAINS -> venues/coffee-shops
```

### Relationship Clustering

Identify entity importance through relationship density:

```
High relationship density indicates:
- Community hubs (many HOSTS relationships)
- Supply chain centers (many SUPPLIES relationships)
- Educational centers (many TEACHES relationships)
```

## Validation Rules

### Required Relationships

Certain entity types MUST have specific relationships:

```yaml
required_relationships:
  venue:
    - CONTAINED_IN or PART_OF (location)
    - OPERATED_BY or OWNS (management)

  event:
    - HAPPENS_AT (location)
    - ORGANIZED_BY (responsible party)

  hobby_resource:
    - ENABLES or SUPPLIES (purpose)
    - LOCATED_IN (geographic context)
```

### Relationship Consistency

```yaml
consistency_rules:
  - If A CONTAINS B, then B CONTAINED_IN A
  - If A PREREQUISITE_FOR B, then NOT B PREREQUISITE_FOR A
  - If A PARTNERS_WITH B, then B PARTNERS_WITH A
  - If A COMPETES_WITH B, then B COMPETES_WITH A
```

### Confidence Inheritance

```yaml
confidence_rules:
  - Child relationship confidence <= parent entity confidence
  - Transitive relationships lose 0.1 confidence per hop
  - Time-decay: -0.1 confidence per year without verification
  - Multiple source validation: +0.2 confidence
```

## Implementation Guidelines

### Relationship Storage

```
data/[metro]/pipeline/synthesized/relationships/
├── spatial/
│   ├── containment.json
│   ├── proximity.json
│   └── connections.json
├── temporal/
│   ├── schedules.json
│   ├── seasonal.json
│   └── events.json
├── operational/
│   ├── ownership.json
│   ├── management.json
│   └── provision.json
└── community/
    ├── affiliations.json
    ├── collaborations.json
    └── progressions.json
```

### Relationship Indexing

Create indices for common traversal patterns:

```typescript
interface RelationshipIndex {
  by_type: Map<RelationType, Relationship[]>;
  by_entity: Map<EntityId, Relationship[]>;
  by_temporal: Map<DayOfWeek, Relationship[]>;
  by_strength: Map<Strength, Relationship[]>;
  by_neighborhood: Map<Neighborhood, Relationship[]>;
}
```

## Quality Metrics

### Relationship Health Indicators

- **Completeness**: All required relationships present
- **Consistency**: Bidirectional relationships match
- **Freshness**: Recent verification dates
- **Confidence**: Average confidence scores
- **Coverage**: Geographic and temporal coverage

### Red Flags

- Orphan entities (no relationships)
- One-way relationships that should be bidirectional
- Expired temporal relationships
- Geographic impossibilities
- Conflicting relationships

## Metadata

- **Pattern Type:** Foundational
- **Stability:** Core
- **Created:** 2024-09-17
- **Updated:** 2024-09-17
- **Status:** Active

## Change History

- 2024-09-17: Initial creation combining patterns from both guides
- 2024-09-17: Added Twin Cities specific relationship types