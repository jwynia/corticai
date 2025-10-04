# Hobby & Interest Ecosystem Pattern

## Overview

The Hobby Ecosystem Pattern defines how The Whereness discovers, extracts, synthesizes, and organizes location-specific expressions of hobbies and interests. Unlike venues or events, hobby resources form ecosystems that require understanding supply chains, seasonal patterns, expertise gradients, and community networks.

## Core Concepts

### Hobby Resource Definition

A hobby resource is any entity that supports the practice, learning, or community around a specific interest:

- **Supply Sources**: Where to acquire materials, tools, equipment
- **Service Providers**: Repair, maintenance, specialized processing
- **Education Nodes**: Classes, workshops, mentorship
- **Community Hubs**: Meetups, guilds, informal gatherings
- **Infrastructure**: Shared spaces, tool libraries, maker spaces
- **Market Connections**: Where to sell, display, trade

### Key Differentiators from General Places

Hobby resources differ from general venues because they:

1. **Form ecosystems** rather than standalone entities
2. **Have expertise gradients** (beginner to master)
3. **Follow temporal patterns** (seasonal, weekly rhythms)
4. **Create supply chains** (raw materials → tools → education → output)
5. **Build communities** across multiple touchpoints

## Discovery Patterns

### 1. Reverse Engineering Pattern

Start from known endpoints and trace backwards:

```
Seed Discovery → Network Expansion → Infrastructure Mapping

Example for Twin Cities:
"Twin Cities Yarn Store" →
  → Instructors who teach there
  → Other places those instructors teach
  → Suppliers they recommend
  → Community events they host
  → Related services (swift rental, yarn winding)
```

### 2. Problem-Solution Mapping

Search for problems to find specialized solutions:

```
Problem Queries:
- "[twin cities] where to fix [vintage item]"
- "[minneapolis/st paul] [hobby] gone wrong"
- "[metro] need help with [specialty technique]"
- "[twin cities] looking for [rare supply]"

These reveal:
- Specialty repair shops
- Expert practitioners
- Rare supply sources
- Problem-solving communities
```

### 3. Calendar Mining

Events reveal community structure:

```
Event Types → Resource Discovery:
- "Knit Night" → Regular gathering spaces
- "Plant Swap" → Gardening community hubs
- "Guild Meeting" → Formal organizations
- "Workshop" → Education providers
- "Studio Tour" → Practitioner spaces
- "Maker Faire" → Cross-hobby communities
```

### 4. Regulatory/Certification Discovery

Formal structures reveal serious practitioners:

```
Certification/Regulation → Resources:
- Master Gardener Program → Extension offices, advanced education
- Cottage Food License → Commercial kitchens, farmers markets
- Guild Membership → Professional development, exhibition opportunities
- Trade Schools → Tool access, apprenticeships
```

### 5. Cross-Hobby Intersection

Shared infrastructure reveals hidden resources:

```
Shared Spaces:
- Maker Space: woodworking + 3D printing + electronics + crafts
- Tool Library: gardening + woodworking + home repair
- Community Center: multiple activity communities
- Art Centers: various creative pursuits

Shared Suppliers:
- Hardware stores serve multiple building/fixing hobbies
- Fabric stores serve sewing + quilting + cosplay + upholstery
```

## Organizational Structures

### 1. Hub-Spoke-Network Model

```json
{
  "hub": {
    "id": "textile-center-minneapolis",
    "primary_role": "fiber_arts_center",
    "hobby_tags": ["weaving", "dyeing", "spinning", "knitting"],
    "city": "minneapolis",

    "spokes": {
      "supplies": ["yarns", "fibers", "dyes", "looms", "wheels"],
      "services": ["equipment_rental", "studio_space", "finishing"],
      "education": ["beginner_classes", "workshops", "mentorship"],
      "community": ["guild_meetings", "fiber_festivals", "artist_talks"]
    },

    "network_connections": {
      "complements": ["steven-be-minneapolis", "yarnery-st-paul"],
      "prerequisites": ["basic_knitting_knowledge"],
      "alternatives": ["minneapolis-community-ed"]
    }
  }
}
```

### 2. Expertise Gradient Structure

```json
{
  "hobby": "woodworking",
  "metro": "twin-cities",

  "progression_pathway": [
    {
      "level": "curious",
      "resources": ["library-books", "youtube-channels"],
      "locations": ["any"],
      "investment": "$0-20"
    },
    {
      "level": "beginner",
      "resources": ["community-ed-intro", "harbor-freight-tools"],
      "locations": ["minneapolis-community-ed", "st-paul-community-ed"],
      "investment": "$50-200"
    },
    {
      "level": "intermediate",
      "resources": ["twin-cities-maker", "rockler-minnetonka"],
      "locations": ["northeast-mpls", "minnetonka"],
      "investment": "$200-1000"
    },
    {
      "level": "advanced",
      "resources": ["guild-membership", "specialty-lumber"],
      "locations": ["metro-wide"],
      "investment": "$1000+"
    }
  ]
}
```

### 3. Seasonal Activity Index

```json
{
  "hobby": "gardening",
  "metro": "twin-cities",
  "zone": "4b/4a",

  "annual_rhythm": {
    "january": {
      "focus": "planning",
      "resources_active": ["seed_catalogs", "online_forums"],
      "venues_relevant": ["libraries", "coffee_shops"]
    },
    "march": {
      "focus": "seed_starting",
      "resources_active": ["wagners-minneapolis", "gertens-inver-grove"],
      "venues_relevant": ["greenhouses", "garden_centers"]
    },
    "may": {
      "focus": "planting",
      "resources_active": ["all_nurseries", "compost_sites"],
      "venues_relevant": ["farmers_markets", "community_gardens"]
    },
    "september": {
      "focus": "harvest_preservation",
      "resources_active": ["extension_office", "canning_supplies"],
      "venues_relevant": ["kitchens", "farmers_markets"]
    }
  },

  "critical_dates": [
    {"date": "May 15", "significance": "average_last_frost"},
    {"date": "September 30", "significance": "average_first_frost"}
  ]
}
```

### 4. Supply Chain Tree

```json
{
  "hobby": "pottery",
  "metro": "twin-cities",

  "supply_chain": {
    "materials": {
      "basic": ["clay", "glazes", "tools"],
      "sources": ["continental-clay-minneapolis", "minnesota-clay-st-paul"],
      "alternatives": ["recycled-clay-program"]
    },
    "equipment": {
      "personal": ["hand_tools", "wheel"],
      "shared": ["kiln_access", "studio_space"],
      "sources": ["northern-clay-center", "community-ed-ceramics"]
    },
    "knowledge": {
      "formal": ["mcad-ceramics", "minneapolis-college"],
      "informal": ["youtube-channels", "guild-mentorship"],
      "advanced": ["visiting-artist-workshops", "residencies"]
    },
    "output": {
      "display": ["uptown-art-fair", "gallery-shows"],
      "sales": ["etsy", "northeast-studios-tour"],
      "community": ["empty-bowls", "charity-auctions"]
    }
  }
}
```

## Twin Cities Specific Patterns

### Climate-Dependent Hobbies

Zone 4a/4b considerations:
- **Gardening**: Short growing season (May 15 - Sept 30)
- **Outdoor sports**: Winter alternatives needed
- **Water activities**: Lakes frozen November-April
- **Astronomy**: Clear winter nights, summer humidity

### Indoor/Outdoor Season Flip

```yaml
winter_indoor_focus:
  - fiber_arts: Peak season for knitting/sewing
  - woodworking: Heated shop spaces essential
  - brewing: Temperature control easier
  - gaming: Extended indoor season

summer_outdoor_focus:
  - gardening: Compressed intense season
  - cycling: Trail networks active May-October
  - water_sports: Lake season June-September
  - outdoor_markets: Artist/craft fairs concentrate
```

### Metro Area Distribution

```yaml
hobby_clusters:
  northeast_minneapolis:
    - artist_studios
    - maker_spaces
    - craft_breweries

  st_paul_midway:
    - tool_library
    - community_workshops
    - urban_farming

  western_suburbs:
    - equestrian
    - large_format_woodworking
    - automotive_hobbyists

  southern_suburbs:
    - model_aviation
    - greenhouse_gardening
    - sporting_clubs
```

## Extraction Strategies

### Source Prioritization by Hobby Type

Different hobbies cluster in different online spaces:

| Hobby Category | Primary Sources | Secondary Sources | Validation Sources |
|---------------|-----------------|-------------------|-------------------|
| Gardening | UMN Extension, gardening forums | Facebook groups, NextDoor | Instagram gardens, local nursery sites |
| Fiber Arts | Ravelry, Instagram makers | Reddit r/TwinCities, guild websites | Yarn store sites, class listings |
| Making/Building | TC Maker site, Instructables | Reddit DIY subs, YouTube | Tool library catalogs, lumber stores |
| Collecting | Specialty forums, Discord servers | Craigslist, Facebook Marketplace | Swap meet calendars, auction houses |
| Food/Beverage | Local food blogs, Instagram | Reddit, brewery/distillery sites | Farmers market vendors, co-ops |

### Entity Extraction Rules

```json
{
  "type": "hobby_resource",
  "extraction_patterns": [
    {
      "pattern": "classes in|workshops on|learn to",
      "indicates": "education_node",
      "confidence_boost": 0.2
    },
    {
      "pattern": "guild|club|society|association",
      "indicates": "formal_organization",
      "confidence_boost": 0.3
    },
    {
      "pattern": "tool rental|equipment rental|kiln time",
      "indicates": "infrastructure_access",
      "confidence_boost": 0.25
    },
    {
      "pattern": "locally sourced|local supplier|wholesale",
      "indicates": "supply_chain",
      "confidence_boost": 0.15
    }
  ]
}
```

## Synthesis Rules

### Confidence Scoring for Hobby Resources

```yaml
confidence_factors:
  source_type:
    practitioner_mention: 1.0
    community_forum: 0.9
    class_listing: 0.8
    business_website: 0.7
    general_directory: 0.5

  validation_signals:
    multiple_independent_mentions: +0.2
    recent_activity_evidence: +0.1
    longevity_indicator: +0.1
    community_endorsement: +0.2

  penalty_factors:
    only_advertising_sources: -0.3
    no_recent_mentions: -0.2
    chain_or_franchise: -0.2
    outside_metro: -0.4
```

### Temporal Relevance Decay

```yaml
decay_patterns:
  stable_information:
    # Zone info, basic techniques
    decay_rate: 0.0

  seasonal_information:
    # Planting dates, class schedules
    decay_rate: 1.0_per_year

  inventory_information:
    # What's in stock, current prices
    decay_rate: 1.0_per_month

  community_information:
    # Meeting times, active members
    decay_rate: 1.0_per_quarter
```

### Ecosystem Completeness Scoring

```yaml
ecosystem_health:
  minimum_viable:
    - supply_source
    - learning_opportunity
    - practice_space
    - community_connection

  health_indicators:
    multiple_supply_sources:
      weight: 0.25
      threshold: 2

    regular_events:
      weight: 0.25
      threshold: monthly

    advancement_pathway:
      weight: 0.25
      threshold: 3_levels

    economic_viability:
      weight: 0.25
      threshold: 1_professional
```

## Implementation Schema

### HobbyResource Entity

```typescript
interface HobbyResource {
  // Core identification
  id: string;
  name: string;
  type: "supply" | "service" | "education" | "community" | "infrastructure";

  // Location
  city?: "minneapolis" | "st-paul" | "suburb";
  suburb_name?: string;
  neighborhood?: string;
  address?: string;

  // Hobby classification
  hobbies: string[];
  hobby_categories: string[];

  // Expertise targeting
  expertise_levels: ("beginner" | "intermediate" | "advanced" | "professional")[];

  // Temporal patterns
  temporal: {
    seasonal_relevance?: SeasonScore;
    best_times?: string[];
    booking_requirements?: string;
    event_schedule?: RecurringEvent[];
  };

  // Ecosystem connections
  relationships: {
    prerequisites?: string[];
    complements?: string[];
    alternatives?: string[];
    next_steps?: string[];
  };

  // Quality indicators
  signals: {
    community_endorsed: boolean;
    longevity_years?: number;
    price_range?: string;
    accessibility_features?: string[];
  };

  // Standard metadata
  confidence: number;
  last_verified: string;
  sources: string[];
}
```

### HobbyEcosystem Summary

```typescript
interface HobbyEcosystem {
  hobby: string;
  metro: "twin-cities";

  // Geographic distribution
  distribution: {
    minneapolis_resources: number;
    st_paul_resources: number;
    suburb_resources: number;
    primary_clusters: string[];
  };

  // Completeness metrics
  completeness: {
    has_supplies: boolean;
    has_education: boolean;
    has_community: boolean;
    has_infrastructure: boolean;
    overall_score: number;
  };

  // Key resources by role
  resources: {
    primary_suppliers: string[];
    learning_centers: string[];
    community_hubs: string[];
    infrastructure_access: string[];
  };

  // Temporal patterns
  seasonal_pattern?: "year_round" | "seasonal" | "weather_dependent";
  peak_season?: string;
  indoor_alternatives?: string[];

  // Community health
  community: {
    estimated_size?: "small" | "medium" | "large";
    growth_trend?: "growing" | "stable" | "declining";
    diversity_indicators?: string[];
  };

  // Entry points
  getting_started: {
    first_resource: string;
    expected_investment: string;
    learning_curve: "easy" | "moderate" | "challenging";
    metro_advantages?: string[];
  };
}
```

## Quality Validation Checklist

- [ ] **Supply chain mapped**: Can someone go from zero to practicing?
- [ ] **Temporal patterns identified**: When is this relevant in Twin Cities?
- [ ] **Community validated**: Multiple independent mentions?
- [ ] **Expertise levels clear**: Beginner-friendly or advanced only?
- [ ] **Alternatives provided**: What if this doesn't work out?
- [ ] **Local specificity**: Why this resource in THIS metro?
- [ ] **Seasonal considerations**: Winter alternatives for outdoor hobbies?
- [ ] **Cross-city coverage**: Resources in both Minneapolis and St. Paul?
- [ ] **Accessibility noted**: Physical, economic, cultural barriers?

## Integration Points

### With Place Network
- Hobby resources ARE places (venues, areas)
- Link through standard Place entities
- Share neighborhood/city taxonomy

### With Activity System
- Hobbies generate activities
- Activities require hobby resources
- Temporal patterns align

### With Group Management
- Groups organize hobby communities
- Groups operate hobby infrastructure
- Groups facilitate education

## Processing Priorities

1. **Phase 1**: Climate-dependent hobbies (gardening, outdoor activities)
2. **Phase 2**: Community-dependent hobbies (crafts, performing arts)
3. **Phase 3**: Infrastructure-dependent hobbies (making, specialized crafts)
4. **Phase 4**: Collection/trading hobbies (vintage, cards, records)

## Metadata

- **Pattern Type:** Domain-Specific
- **Domain:** Hobbies and Interests
- **Stability:** Core
- **Created:** 2024-09-17
- **Updated:** 2024-09-17
- **Status:** Active

## Change History

- 2024-09-17: Initial creation based on whereness-hobby-framework.md
- 2024-09-17: Adapted for Twin Cities metro area with climate considerations