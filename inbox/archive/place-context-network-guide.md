# Place Information Context Network Design Guide

## Overview

This guide provides a comprehensive framework for managing place-based information using both graph database concepts and practical markdown/folder-based context networks. It addresses the challenge of organizing complex, overlapping information about places, activities, services, products, groups, and events in any city.

## Core Design Philosophy

### Index vs Table of Contents Approach

- **Index Model**: Same entity appears in multiple locations for different reasons (like book indexes)
- **Table of Contents Model**: Each entity has one primary location (hierarchical)
- **Recommendation**: Use Index Model for maximum flexibility and discovery paths

### Key Design Principles

1. **Relationship semantics over node properties**: Meaning emerges from connections
2. **Multi-path navigation**: Same destination reachable via multiple routes
3. **Local interpretation layers**: City-specific rules interpret generic patterns
4. **Graceful degradation**: System remains useful with incomplete data
5. **Progressive enhancement**: Start simple, add complexity as needed

## Core Entity Model

### Five Primary Entities

```typescript
type Place = {
  id: string
  name: string
  type: 'venue' | 'area' | 'point' | 'route'
  // Physical locations: coffee shops, parks, trails, neighborhoods
}

type Activity = {
  id: string
  name: string
  type: 'ongoing' | 'scheduled' | 'conditional'
  // Things you DO: hiking, dancing, reading, people-watching
}

type Service = {
  id: string
  name: string
  // Things done FOR you: dry cleaning, haircuts, auto repair
}

type Product = {
  id: string
  name: string
  category: 'physical' | 'consumable' | 'digital'
  // Things you ACQUIRE: coffee beans, books, meals, clothing
}

type Group = {
  id: string
  name: string
  type: 'organization' | 'club' | 'informal' | 'business_entity'
  // WHO makes things happen: trivia clubs, business chains, nonprofits
}
```

### Temporal Bridge

```typescript
type Event = {
  id: string
  name: string
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
  time_of_day?: 'morning' | 'afternoon' | 'evening'
  frequency?: 'daily' | 'weekly' | 'monthly'
  verified?: Date
}
```

## Markdown Context Network Structure

### Directory Organization

```
place-network/
├── discovery.md                 # Entry point and navigation guide
├── places/
│   ├── index.md                # All places catalog
│   ├── venues/
│   │   ├── index.md            # Venue directory
│   │   └── [venue-name].md     # Individual venue files
│   ├── areas/
│   │   ├── neighborhoods/
│   │   │   ├── index.md
│   │   │   └── [neighborhood].md
│   │   └── districts/
│   │       ├── index.md
│   │       └── [district].md
│   └── routes/
│       ├── trails/
│       │   ├── index.md
│       │   └── [trail].md
│       └── paths/
├── activities/
│   ├── index.md                # Activity catalog
│   ├── active/                 # hiking, cycling, climbing
│   ├── social/                 # trivia, dancing, meetups
│   ├── cultural/               # museums, galleries, music
│   ├── relaxation/             # meditation, spa, reading
│   └── everyday/               # shopping, dining, errands
├── services/
│   ├── index.md                # Service directory
│   ├── essential/              # medical, repair, government
│   ├── personal/               # haircuts, massage, fitness
│   ├── professional/           # business, financial, legal
│   └── hospitality/            # lodging, tours, concierge
├── products/
│   ├── index.md                # Product categories
│   ├── local-goods/            # made-here products
│   ├── specialty/              # hard-to-find items
│   ├── everyday/               # groceries, supplies
│   └── artisan/                # handmade, craft items
├── groups/
│   ├── index.md                # Organizations directory
│   ├── businesses/             # companies, chains
│   ├── organizations/          # nonprofits, clubs
│   ├── collectives/            # informal groups
│   └── government/             # city departments
├── events/
│   ├── index.md                # Event hub
│   ├── recurring/              # weekly, monthly patterns
│   ├── seasonal/               # annual, holiday-based
│   ├── series/                 # connected events
│   └── one-time/              # special events
├── indices/                     # Multiple access paths
│   ├── by-neighborhood.md      # Geographic organization
│   ├── by-time.md              # Temporal organization
│   ├── by-budget.md            # Price-based access
│   ├── by-demographics.md      # Audience-specific
│   ├── by-interest.md          # Interest/hobby based
│   └── by-accessibility.md     # Mobility/sensory needs
└── connections/                 # Junction documents
    ├── coffee-culture.md        # Coffee shops ecosystem
    ├── music-scene.md          # Music venues and events
    ├── family-activities.md     # Kid-friendly networks
    └── late-night.md           # After-hours options
```

## Entity File Templates

### Place Template

```markdown
# [Place Name]

## Quick Facts
- **Type**: [venue/area/point/route]
- **Address**: [if applicable]
- **Neighborhood**: [[areas/neighborhoods/name]]
- **Operated By**: [[groups/type/name]]
- **Hours**: [regular hours]
- **Accessibility**: [mobility, sensory, other]

## What Happens Here

### Activities Available
- [[activities/category/name]] - Description
- [[activities/category/name]] - Context

### Services Offered
- [[services/category/name]] - Details
- [[services/category/name]] - Notes

### Products Sold
- [[products/category/name]] - Type/variety
- [[products/category/name]] - Specialty items

## Events & Schedule

### Recurring
- **Day**: [[events/recurring/name]] - Time, details
- **Frequency**: [[events/series/name]] - Pattern

### Special Events
- See [[groups/name#events]] for organizer events

## Connections
- **Part of**: [[larger context]]
- **Contains**: [[smaller elements]]
- **Similar to**: [[comparable places]]
- **Nearby**: [[proximate places]]
- **Complements**: [[synergistic places]]

## Discovery Context
- Found via: [[indices/relevant-index]]
- Tags: #tag1 #tag2 #tag3
- Best for: [demographic or use case]

## Local Knowledge
- Best times to visit:
- Insider tips:
- Common combinations:
```

### Activity Template

```markdown
# [Activity Name]

## Overview
Brief description of the activity and what it entails.

## Where It Happens

### Regular Venues
| Venue | Details | Schedule | Notes |
|-------|---------|----------|-------|
| [[places/venue]] | Specifics | Days/times | Tips |

### Place Categories
- [[places/type]] facilities
- Public spaces that allow this
- Unexpected locations

## Temporal Patterns
- **Best seasons**: 
- **Peak times**: 
- **Quiet times**: 

## Related Elements

### Often Combined With
- [[activities/related]] - How they connect
- [[services/complementary]] - Supporting services

### Required Products
- [[products/necessary]] - Essential items
- [[products/optional]] - Enhance experience

### Groups That Facilitate
- [[groups/organizer]] - Regular programs
- [[groups/instructor]] - Classes/training

## Variations
- Beginner version:
- Advanced version:
- Seasonal adaptations:
- Cultural variations:

## Discovery Context
- Found via: [[indices/relevant]]
- Demographics: [[indices/by-demographics#relevant]]
- Tags: #tags
```

### Group Template

```markdown
# [Group Name]

## Overview
- **Type**: [organization/club/business/informal]
- **Founded**: [date if known]
- **Mission**: [if applicable]
- **Size**: [membership/employees]

## What They Do

### Places Operated
- [[places/venue]] - Primary location
- [[places/venue]] - Additional locations

### Activities Facilitated
- [[activities/type]] - How they enable it
- [[activities/type]] - Programs offered

### Services Provided
- [[services/type]] - Direct services
- [[services/type]] - Member benefits

### Events Organized
- [[events/recurring/name]] - Schedule
- [[events/series/name]] - Frequency

## Participation
- **How to join/engage**: 
- **Requirements**: 
- **Costs**: 
- **Contact**: 

## Network
- **Parent organization**: [[if applicable]]
- **Affiliates**: [[related groups]]
- **Partners**: [[collaborative groups]]

## Discovery Context
- Found via: [[indices/relevant]]
- Tags: #tags
```

## Index File Patterns

### Geographic Index Example

```markdown
# By Neighborhood

## [Neighborhood Name]

### Quick Character
Brief description of the neighborhood's personality and offerings.

### Places of Note
#### Venues
- [[places/venues/name]] - One-line description
- [[places/venues/name]] - What makes it special

#### Public Spaces
- [[places/areas/park]] - Key features
- [[places/routes/trail]] - Connection points

### Regular Rhythms
#### Daily
- Morning: [pattern]
- Afternoon: [pattern]
- Evening: [pattern]

#### Weekly
- **Monday**: [[events/recurring]]
- **Tuesday**: [[events/recurring]]

#### Monthly
- **First Friday**: [[events/series]]
- **Last Thursday**: [[events/series]]

### Services Hub
| Category | Notable Providers | Specialties |
|----------|------------------|-------------|
| Essential | [[services/provider]] | Details |
| Personal | [[services/provider]] | Details |

### Activity Centers
- **Active**: [venues for active pursuits]
- **Cultural**: [arts and culture spots]
- **Social**: [gathering places]

### Local Groups
- [[groups/name]] - Focus area
- [[groups/name]] - Community role

### Navigation
- From downtown: [directions/transit]
- Parking: [situation]
- Walkability: [score/description]
- Bike infrastructure: [description]
```

### Temporal Index Example

```markdown
# By Time

## Days of Week

### Monday
#### Typically Available
- Most museums closed
- [[events/recurring/monday-specials]] at various venues
- [[activities/quiet]] best availability

#### Special Events
- **First Monday**: [[events/series/name]]
- **Last Monday**: [[events/series/name]]

### Tuesday
#### Evening Events
- [[events/recurring/trivia]] at 15+ venues
- [[events/recurring/tango-tuesday]] - Dance lessons
- [[groups/clubs]] meeting nights

## Time of Day

### Early Morning (5am-8am)
#### Available
- [[activities/fitness]] - Gym/pool access
- [[services/coffee]] - Early opening cafes
- [[places/parks]] - Peaceful visiting

### Late Night (11pm-2am)
#### Still Open
- [[places/venues/24-hour]] - Round the clock
- [[services/late-night]] - Food, pharmacy
- [[activities/nightlife]] - Active scenes

## Seasonal Patterns

### Summer (June-September)
#### Peak Season For
- [[activities/outdoor]] - All varieties
- [[events/seasonal/summer-series]]
- [[places/outdoor-venues]] - Extended hours

### Winter (December-March)
#### Indoor Focus
- [[activities/indoor]] - Heated venues
- [[services/seasonal]] - Winter-specific
- [[events/seasonal/holiday]] - Celebrations
```

## Relationship Expression in Markdown

### Methods for Showing Connections

1. **Section Headers**: Imply relationship types
   - "Operated By" = ownership relationship
   - "What Happens Here" = activity relationships
   - "Part Of" = hierarchical relationships

2. **Link Context**: Surrounding text defines relationship
   - "Similar to [[place]]" = comparison
   - "Requires [[product]]" = dependency
   - "Hosted by [[group]]" = organization

3. **Tables**: Many-to-many with metadata
   ```markdown
   | Venue | Organizer | Day | Time | Style |
   |-------|-----------|-----|------|-------|
   | [[venue]] | [[group]] | Tue | 8pm | Type |
   ```

4. **Tags**: Non-hierarchical categorization
   - `#family-friendly`
   - `#late-night`
   - `#free-admission`

5. **Front Matter**: If tools support it
   ```yaml
   ---
   operated_by: mcmenamins
   neighborhood: concordia
   price_range: $$
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
**Solution**: Junction documents
- Create `connections/` folder for relationship-focused docs
- Document ecosystems rather than individual relationships
- Example: `coffee-culture.md` links all coffee-related entities

#### Information Duplication
**Solution**: Single source of truth
- Factual data (hours, addresses): One location only
- Experiential data: Can exist in multiple perspectives
- Use transclusion if supported: `{{places/venue#hours}}`

#### Rapid Growth
**Solution**: Hierarchical organization
- When files exceed 1000 lines, split by category
- Create sub-indices for large categories
- Implement naming conventions early
- Use consistent templates

### File Naming Conventions

```
- Lowercase with hyphens: mcmenamins-kennedy-school.md
- No special characters except hyphens
- Include parent category if ambiguous: trails-forest-park.md
- Date-prefix for events: 2025-01-15-event-name.md
- Keep names short but descriptive
```

## Query Patterns and Use Cases

### Example Discovery Paths

```markdown
"What can I do on a rainy Tuesday afternoon?"
- Start: indices/by-time.md#tuesday-afternoon
- Filter: activities/indoor/
- Check: events/recurring/tuesday/
- Result: List of indoor venues with Tuesday activities

"Where can families go for free this weekend?"
- Start: indices/by-demographics.md#families
- Filter: indices/by-budget.md#free
- Cross-reference: indices/by-time.md#weekend
- Result: Free, family-friendly weekend options

"I need my bike fixed today"
- Start: services/essential/bike-repair/
- Check: Venues providing service
- Filter: Currently open
- Check: Walk-in vs appointment
- Result: Available bike repair options

"Find local maker spaces"
- Start: groups/organizations/maker-spaces
- Or: activities/creative/making
- Or: services/professional/fabrication
- Result: Multiple paths to same resources
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Create directory structure
2. Build primary index files
3. Document major venues (10-20)
4. Establish naming conventions
5. Create templates

### Phase 2: Core Content (Week 3-4)
1. Add primary activities (20-30)
2. Document key services
3. Map major groups/organizations
4. Create neighborhood indices
5. Build temporal patterns

### Phase 3: Relationships (Week 5-6)
1. Create junction documents
2. Add cross-references
3. Build demographic indices
4. Document event series
5. Add discovery paths

### Phase 4: Enhancement (Ongoing)
1. Progressive detail addition
2. Seasonal updates
3. Event calendar maintenance
4. New venue/service additions
5. Community feedback integration

## Best Practices

### Maintenance Guidelines

1. **Regular Updates**
   - Weekly: Event listings
   - Monthly: Hours, services
   - Quarterly: Full review
   - Annually: Major restructuring

2. **Version Control**
   - Commit frequently
   - Tag stable versions
   - Document major changes
   - Use branches for experiments

3. **Quality Checks**
   - Verify links work
   - Check information currency
   - Validate cross-references
   - Test discovery paths

### Collaboration Patterns

1. **Division of Labor**
   - Geographic assignments
   - Domain expertise areas
   - Update responsibilities
   - Review partnerships

2. **Contribution Guidelines**
   - Template compliance
   - Naming standards
   - Link formatting
   - Metadata requirements

## Tools and Automation

### Recommended Tools

1. **Markdown Editors**
   - Obsidian (graph visualization)
   - VS Code (with extensions)
   - Typora (clean interface)
   - Notable (tagging support)

2. **Validation Scripts**
   - Link checker scripts
   - Format validators
   - Duplicate detectors
   - Update monitors

3. **Generation Tools**
   - Template generators
   - Index builders
   - Cross-reference creators
   - Update aggregators

### Automation Opportunities

```python
# Example: Generate venue index from individual files
import os
from pathlib import Path

def generate_venue_index():
    venues = Path("places/venues").glob("*.md")
    index_content = "# Venues\n\n"
    
    for venue in sorted(venues):
        if venue.name != "index.md":
            # Extract metadata from file
            name = venue.stem.replace("-", " ").title()
            index_content += f"- [[{venue.stem}]] - {name}\n"
    
    Path("places/venues/index.md").write_text(index_content)
```

## Migration Strategies

### From Existing Systems

1. **From Spreadsheets**
   - Export to CSV
   - Script to generate markdown
   - Preserve relationships via links
   - Maintain data types via front matter

2. **From Databases**
   - Export entities by type
   - Generate files from templates
   - Create relationship maps
   - Build indices from queries

3. **From Wikis**
   - Preserve page structure
   - Convert wiki links to markdown
   - Maintain categories as folders
   - Transform infoboxes to front matter

## Conclusion

This framework provides a flexible, scalable approach to managing place-based information that works both conceptually (as a graph model) and practically (as a markdown context network). The key is maintaining multiple access paths to the same information, allowing users to discover what they need through geography, time, interest, demographics, or any other relevant lens.

The system grows naturally from simple beginnings to complex networks, always maintaining human readability while supporting tool-based automation and analysis. By thinking in terms of indices rather than hierarchies, the same information serves multiple purposes without duplication or confusion.