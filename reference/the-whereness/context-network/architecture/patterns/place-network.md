# Place Context Network Pattern

## Overview

The Place Context Network is a markdown-based system for organizing place-based information using graph database concepts. It addresses the challenge of organizing complex, overlapping information about places, activities, services, products, groups, and events in any metro area.

## Core Design Philosophy

### Index Model vs Table of Contents

We use an **Index Model** where the same entity appears in multiple locations for different reasons (like book indexes), rather than a Table of Contents Model where each entity has one primary location.

**Why Index Model:**
- Same coffee shop appears under: neighborhoods, activities (reading/working), services (wifi), products (beans)
- Users discover places through different paths based on their current need
- Reflects how people actually think about places

### Key Design Principles

1. **Relationship semantics over node properties**: Meaning emerges from connections
2. **Multi-path navigation**: Same destination reachable via multiple routes
3. **Local interpretation layers**: Metro-specific rules interpret generic patterns
4. **Graceful degradation**: System remains useful with incomplete data
5. **Progressive enhancement**: Start simple, add complexity as needed

## Core Entity Model

### Five Primary Entities

```typescript
type Place = {
  id: string // Format: {city}-{name-slug}-{location} (e.g. "abq-circle-k-lomas")
  name: string
  type: 'venue' | 'area' | 'point' | 'route'
  subtype?: string // coffee_shop, park, trail, neighborhood
  chain_type: '' | 'local' | 'regional' | 'national' | 'international'
  address: {
    street: string
    city: string
    state: string
    full: string
  }
  metro_relationship: 'primary' | 'suburb' | 'regional_attraction' | 'extended_metro'
  drive_time_from_primary?: string // "15 minutes", "45 minutes"
  neighborhood?: string
}

type Activity = {
  id: string
  name: string
  type: 'ongoing' | 'scheduled' | 'conditional'
  category: string // active, social, cultural, relaxation, everyday
  // Things you DO: hiking, dancing, reading, people-watching
}

type Service = {
  id: string
  name: string
  category: string // essential, personal, professional, hospitality
  // Things done FOR you: dry cleaning, haircuts, auto repair
}

type Product = {
  id: string
  name: string
  category: 'physical' | 'consumable' | 'digital'
  subcategory?: string // local-goods, specialty, everyday, artisan
  // Things you ACQUIRE: coffee beans, books, meals, clothing
}

type Group = {
  id: string
  name: string
  type: 'organization' | 'club' | 'informal' | 'business_entity'
  // WHO makes things happen: trivia clubs, business chains, nonprofits
}
```

### Temporal Bridge Entity

```typescript
type Event = {
  id: string
  name: string
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'annual' | 'one-time'
  // WHEN activities happen, organized by Groups at Places
  // "Tuesday Jazz Night", "2025 Cherry Blossom Festival"
}
```

## Relationship Types

### Primary Relationships

```typescript
// Activity-Place Relationships
type ActivityPlaceRel =
  | 'AVAILABLE_AT'     // specific place
  | 'POSSIBLE_IN'      // place category
  | 'REQUIRES_TYPE'    // place requirements
  | 'SUITABLE_FOR'     // loose association

// Service-Place Relationships
type ServiceRel =
  | 'PROVIDED_BY'      // service at place
  | 'REQUIRES_BOOKING' // appointment needed
  | 'INCLUDES'         // service bundles
  | 'PREREQUISITE_FOR' // service dependencies

// Product Relationships
type ProductRel =
  | 'SOLD_AT'          // where to buy
  | 'MANUFACTURED_BY'  // local production
  | 'USED_IN'          // activity requirements
  | 'CONSUMABLE_AT'    // on-site consumption

// Group Relationships
type GroupRel =
  | 'ORGANIZES'        // events
  | 'HOSTS_AT'         // regular locations
  | 'OPERATES'         // owns/manages places
  | 'PROVIDES'         // services/products
  | 'FACILITATES'      // activities
  | 'CURATES'          // programs/series

// Event Relationships
type EventRel =
  | 'INSTANCE_OF'      // event type
  | 'OCCURS_AT'        // location
  | 'PART_OF_SERIES'   // connected events
  | 'ROTATES_BETWEEN'  // multiple venues
```

### Relationship Metadata

```typescript
type RelationshipMetadata = {
  strength?: 'primary' | 'secondary' | 'occasional'
  confidence?: number
  seasonal?: boolean
  conditions?: string[]
  day_of_week?: string[]
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'late-night'
  frequency?: 'daily' | 'weekly' | 'monthly'
  verified?: Date
}
```

## Directory Organization Pattern

```
data/[metro]/context/
├── places/
│   ├── venues/
│   │   ├── index.md            # Venue directory
│   │   └── discovery-paths.md  # How to find venues
│   ├── neighborhoods/
│   │   ├── index.md
│   │   ├── minneapolis/        # City-specific neighborhoods
│   │   ├── st-paul/
│   │   └── suburbs/
│   └── routes/
│       ├── trails/
│       └── transit/
│
├── activities/
│   ├── index.md                # Activity catalog
│   ├── active/                 # hiking, cycling, climbing
│   ├── social/                 # trivia, dancing, meetups
│   ├── cultural/               # museums, galleries, music
│   ├── relaxation/             # meditation, spa, reading
│   └── everyday/               # shopping, dining, errands
│
├── services/
│   ├── index.md                # Service directory
│   ├── essential/              # medical, repair, government
│   ├── personal/               # haircuts, massage, fitness
│   ├── professional/           # business, financial, legal
│   └── hospitality/            # lodging, tours, concierge
│
├── products/
│   ├── index.md                # Product categories
│   ├── local-goods/            # made-here products
│   ├── specialty/              # hard-to-find items
│   ├── everyday/               # groceries, supplies
│   └── artisan/                # handmade, craft items
│
├── groups/
│   ├── index.md                # Organizations directory
│   ├── businesses/             # companies, chains
│   ├── organizations/          # nonprofits, clubs
│   ├── collectives/            # informal groups
│   └── government/             # city departments
│
├── events/
│   ├── index.md                # Event hub
│   ├── recurring/              # weekly, monthly patterns
│   ├── seasonal/               # annual, holiday-based
│   ├── series/                 # connected events
│   └── one-time/              # special events
│
├── relationships/              # Junction documents
│   ├── ecosystems/            # Complex relationship networks
│   │   ├── coffee-culture.md  # Coffee shops ecosystem
│   │   ├── music-scene.md     # Music venues and events
│   │   └── family-activities.md # Kid-friendly networks
│   └── temporal/
│       ├── late-night.md      # After-hours options
│       └── seasonal-patterns.md # Weather-dependent activities
│
└── indices/                    # Multiple access paths
    ├── by-neighborhood.md      # Geographic organization
    ├── by-time.md              # Temporal organization
    ├── by-budget.md            # Price-based access
    ├── by-demographics.md      # Audience-specific
    ├── by-interest.md          # Interest/hobby based
    └── by-accessibility.md     # Mobility/sensory needs
```

## Relationship Expression in Markdown

### Methods for Showing Connections

1. **Section Headers**: Imply relationship types
   ```markdown
   ## Operated By
   [[groups/businesses/caribou-coffee]]

   ## What Happens Here
   - [[activities/social/trivia]] - Tuesday nights at 8pm
   ```

2. **Link Context**: Surrounding text defines relationship
   ```markdown
   Similar to [[places/venues/spyhouse-northeast]] but with more seating
   Requires [[products/specialty/climbing-shoes]] for bouldering
   ```

3. **Tables**: Many-to-many relationships with metadata
   ```markdown
   | Venue | Organizer | Day | Time | Style |
   |-------|-----------|-----|------|-------|
   | [[venues/lakes-and-legends]] | [[groups/trivia-mafia]] | Tue | 8pm | General |
   ```

4. **Front Matter**: Structured metadata
   ```yaml
   ---
   operated_by: mcmenamins
   neighborhood: northeast
   city: minneapolis
   price_range: $$
   confidence: 0.95
   ---
   ```

## Managing Scale and Complexity

### Progressive Detail Strategy

1. **Start Sparse**
   - Create index files first
   - Add individual files only when needed
   - Use tables for simple entities
   - Link to external sources initially

2. **Enhance Gradually**
   - Add detail to high-traffic entities
   - Create junction documents for complex relationships
   - Build specialized indices as patterns emerge
   - Generate some content programmatically

### Handling Common Challenges

#### Circular Dependencies
**Solution**: Junction documents in `relationships/` folder
- Document ecosystems rather than individual relationships
- Example: `coffee-culture.md` links all coffee-related entities

#### Information Duplication
**Solution**: Single source of truth principle
- Factual data (hours, addresses): One location only
- Experiential data: Can exist in multiple perspectives
- Use transclusion if supported: `{{places/venue#hours}}`

#### Cross-City Boundaries
**Solution**: Metro-wide perspective
- Tag entities with city: `city: st-paul`
- Create cross-city indices
- Note transit connections between cities

### File Naming Conventions

```
- Lowercase with hyphens: spyhouse-northeast.md
- Include disambiguators: central-park-roseville.md vs central-park-brooklyn-center.md
- No special characters except hyphens
- Include parent category if ambiguous: trails-fort-snelling.md
- Keep names short but descriptive
```

## Query Patterns and Discovery Paths

### Example Discovery Paths

```markdown
"What can I do on a rainy Tuesday afternoon?"
1. Start: indices/by-time.md#tuesday-afternoon
2. Filter: activities/indoor/
3. Check: events/recurring/tuesday/
4. Result: List of indoor venues with Tuesday activities

"Where can families go for free this weekend?"
1. Start: indices/by-demographics.md#families
2. Filter: indices/by-budget.md#free
3. Cross-reference: indices/by-time.md#weekend
4. Result: Free, family-friendly weekend options

"I need my bike fixed today"
1. Start: services/essential/bike-repair/
2. Check: Venues providing service
3. Filter: Currently open
4. Check: Walk-in vs appointment
5. Result: Available bike repair options
```

## Implementation Considerations

### Metro Area Specifics

For Twin Cities:
- Always specify which city (Minneapolis, St. Paul, suburbs)
- Note skyway/tunnel connections for downtown areas
- Consider seasonal variations (winter vs summer activities)
- Track lake/river proximity as significant feature

### Quality Validation

- [ ] **Entity completeness**: Basic info (name, location, type)
- [ ] **Relationship accuracy**: Verified connections
- [ ] **Temporal relevance**: Current hours/schedules
- [ ] **Geographic precision**: Correct neighborhood/city
- [ ] **Accessibility noted**: Physical, economic barriers
- [ ] **Local specificity**: Why this matters in THIS metro

## Integration with Pipeline

This pattern integrates with:
- Extraction: Entity detection from sources
- Synthesis: Relationship inference
- Evaluation: Completeness checking
- Build: Index generation for static site

## Metadata

- **Pattern Type:** Organizational
- **Stability:** Core
- **Created:** 2024-09-17
- **Updated:** 2024-09-17
- **Status:** Active

## Change History

- 2024-09-17: Initial creation based on place-context-network-guide.md
- 2024-09-17: Adapted for Twin Cities metro area scope