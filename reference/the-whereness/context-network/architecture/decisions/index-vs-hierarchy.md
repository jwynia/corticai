# Architecture Decision: Index Model vs Hierarchical Organization

## Decision

**We adopt an Index Model for organizing place-based information**, where entities can appear in multiple locations based on different access patterns, rather than a hierarchical Table of Contents model where each entity has one canonical location.

## Status

Accepted

## Context

The Whereness System needs to organize complex information about places, activities, services, products, groups, events, and hobby resources. Users need to discover this information through multiple different paths based on their current context and needs.

### Two Competing Models

1. **Hierarchical/Table of Contents Model**
   - Each entity has ONE primary location
   - Tree-like structure with parent-child relationships
   - Example: Coffee Shop → Neighborhoods → Northeast → Venues → Spyhouse

2. **Index Model**
   - Entities appear in MULTIPLE locations
   - Graph-like structure with many-to-many relationships
   - Example: Spyhouse appears in:
     - neighborhoods/northeast/coffee.md
     - activities/coworking/venues.md
     - services/wifi/locations.md
     - products/coffee-beans/retailers.md

## Decision Drivers

### User Discovery Patterns

Users approach place discovery from different angles:
- "What's in my neighborhood?" (geographic)
- "Where can I work with wifi?" (activity)
- "What's open late?" (temporal)
- "Where do knitters meet?" (hobby)
- "What's free?" (budget)

A hierarchical model forces users down one primary path, while an index model supports all paths equally.

### Real-World Complexity

Places serve multiple purposes:
- A brewery is a venue, manufactures products, hosts events, enables activities
- A maker space is infrastructure for multiple hobbies, education center, community hub
- A coffee shop enables work, socializing, and serves as a third place

Forcing these into one category loses essential connections.

### Maintenance Considerations

- **Hierarchical**: Easier to prevent duplication, harder to express relationships
- **Index**: More complex to maintain consistency, but better represents reality

## Consequences

### Benefits

1. **Natural Discovery**: Users can find information through their preferred mental model
2. **Rich Relationships**: Complex connections between entities are preserved
3. **Flexible Evolution**: New access patterns can be added without restructuring
4. **Authentic Representation**: Matches how locals actually think about places
5. **Cross-Pollination**: Serendipitous discovery through multiple appearances

### Drawbacks

1. **Maintenance Complexity**: Same entity must be updated in multiple locations
2. **Potential Inconsistency**: Information might diverge across locations
3. **Storage Overhead**: Some duplication of references
4. **Learning Curve**: Contributors need to understand the model

## Implementation Strategy

### Primary Storage

Entities have a canonical storage location for factual data:
```
data/[metro]/pipeline/synthesized/current/
├── places/[id].json      # Canonical place data
├── activities/[id].json  # Canonical activity data
└── events/[id].json      # Canonical event data
```

### Index Layers

Multiple markdown indices reference the canonical data:
```
data/[metro]/context/indices/
├── by-neighborhood.md     # Geographic index
├── by-time.md            # Temporal index
├── by-budget.md          # Economic index
├── by-interest.md        # Interest-based index
└── by-accessibility.md   # Accessibility index
```

### Relationship Expression

Relationships are first-class entities, not properties:
```json
{
  "type": "ENABLES",
  "from": "spyhouse-northeast",
  "to": "coworking",
  "conditions": {
    "wifi": true,
    "outlets": "abundant",
    "noise_level": "moderate"
  }
}
```

### Consistency Mechanisms

1. **Single Source of Truth**: Factual data (address, hours) in one place
2. **Generated Indices**: Some indices built programmatically from canonical data
3. **Validation Scripts**: Check consistency across references
4. **Temporal Versioning**: Track when indices were generated

## Examples

### Coffee Shop Discovery Paths

```markdown
# Geographic Path
neighborhoods/northeast/venues.md
→ Spyhouse Coffee (among other venues)

# Activity Path
activities/coworking/locations.md
→ Spyhouse Coffee (wifi, outlets, quiet)

# Temporal Path
indices/by-time.md#early-morning
→ Spyhouse Coffee (opens 6:30am)

# Product Path
products/local-coffee/where-to-buy.md
→ Spyhouse Coffee (sells own roasts)

# Budget Path
indices/by-budget.md#moderate
→ Spyhouse Coffee ($3-6 drinks)
```

### Maker Space Multiple Roles

```markdown
# Infrastructure
hobbies/woodworking/infrastructure.md
→ Twin Cities Maker (woodshop access)

# Education
education/technical/workshops.md
→ Twin Cities Maker (classes offered)

# Community
groups/maker-community/spaces.md
→ Twin Cities Maker (member gatherings)

# Geographic
neighborhoods/northeast/businesses.md
→ Twin Cities Maker (location listing)
```

## Alternatives Considered

### Pure Hierarchical Model

**Rejected because:**
- Forces artificial primary categorization
- Loses rich relationships
- Creates discovery dead-ends
- Doesn't match user mental models

### Tag-Based System

**Rejected because:**
- Too unstructured for navigation
- Difficult to express relationships
- Hard to maintain quality
- Poor discovery paths

### Hybrid Model

**Considered but complex:**
- Primary hierarchy with secondary indices
- Adds complexity without clear benefits
- Still forces primary categorization

## Related Decisions

- Graph database concepts (adopted)
- Static file generation (adopted)
- Relationship-first design (adopted)
- Progressive enhancement (adopted)

## Review Schedule

Review this decision after:
- First 100 entities are documented
- First user feedback on navigation
- 6 months of maintenance experience

## Metadata

- **ADR Number:** 001
- **Created:** 2024-09-17
- **Updated:** 2024-09-17
- **Status:** Accepted
- **Deciders:** System architects
- **Tags:** #architecture #information-architecture #navigation

## Change History

- 2024-09-17: Initial decision documented based on place-context-network-guide.md