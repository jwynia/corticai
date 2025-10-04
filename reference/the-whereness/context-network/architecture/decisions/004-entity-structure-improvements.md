# ADR 004: Entity Structure Improvements - Chain Classification and Metro Area Addresses

## Status
Accepted - 2025-09-21

## Context

Two critical issues were identified with the entity structure:

### 1. Chain Classification Missing
- No way to distinguish chains from independent businesses
- Users need to filter chains in/out for different purposes:
  - Exclude chains when seeking local/unique experiences
  - Include only chains for brand consistency or rewards programs
- No structured way to handle local vs national vs international chains

### 2. Address Schema Assumes Single City
- Address field assumed everything was in the primary city (e.g., Albuquerque)
- Critical errors: Meow Wolf showed as Albuquerque when it's actually in Santa Fe (45 miles away)
- No way to handle suburbs, nearby cities, or regional attractions
- Inconsistent city information across entities

## Decision

### Chain Classification System
Add `chain_type` field as string enum:
- `""` (empty string) - Independent business, not part of a chain
- `"local"` - Multiple locations within same metro area only
- `"regional"` - Multiple locations across state or region
- `"national"` - Locations across the United States
- `"international"` - Global presence

### Structured Address Schema
Replace simple string address with structured object:
```json
{
  "address": {
    "street": "1352 Rufina Cir",
    "city": "Santa Fe",
    "state": "NM",
    "full": "1352 Rufina Cir, Santa Fe, NM"
  }
}
```

### Metro Relationship Classification
Add `metro_relationship` field:
- `"primary"` - Primary city (Albuquerque, Minneapolis, Denver)
- `"suburb"` - Incorporated suburb (Rio Rancho, Corrales, Bloomington)
- `"regional_attraction"` - Worth the drive (Santa Fe, Stillwater, Boulder)
- `"extended_metro"` - Metro area but farther out (East Mountains, Chaska)

### ID Structure Revision
Update ID pattern to include actual city:
- Format: `{city}-{name-slug}-{location}`
- Examples: `abq-circle-k-lomas`, `santafe-meow-wolf`, `corrales-boxing-bear`

## Consequences

### Positive
- **Accurate Location Data**: No more 45-mile errors like Meow Wolf in wrong city
- **Better Filtering**: Users can easily filter by chain type or metro relationship
- **Scalable Pattern**: Works across all metro areas (Twin Cities, Denver, etc.)
- **No ID Collisions**: City prefixes prevent conflicts across metros
- **Realistic Planning**: Users get accurate drive times and distances

### Data Migration Required
- All existing entities need chain_type classification
- All addresses need restructuring to new schema
- All IDs need city prefixes added
- Metro relationships need assignment

### Updated TypeScript Schema
```typescript
type Place = {
  id: string // Format: {city}-{name-slug}-{location}
  name: string
  type: 'venue' | 'area' | 'point' | 'route'
  subtype?: string
  chain_type: '' | 'local' | 'regional' | 'national' | 'international'
  address: {
    street: string
    city: string
    state: string
    full: string
  }
  metro_relationship: 'primary' | 'suburb' | 'regional_attraction' | 'extended_metro'
  drive_time_from_primary?: string
  neighborhood?: string
}
```

## Implementation Examples

### Independent Local Business
```json
{
  "id": "abq-humble-coffee",
  "name": "Humble Coffee",
  "chain_type": "",
  "address": {
    "street": "3022 Central Ave SE",
    "city": "Albuquerque",
    "state": "NM",
    "full": "3022 Central Ave SE, Albuquerque, NM"
  },
  "metro_relationship": "primary"
}
```

### Regional Attraction
```json
{
  "id": "santafe-meow-wolf",
  "name": "Meow Wolf",
  "chain_type": "regional",
  "address": {
    "street": "1352 Rufina Cir",
    "city": "Santa Fe",
    "state": "NM",
    "full": "1352 Rufina Cir, Santa Fe, NM"
  },
  "metro_relationship": "regional_attraction",
  "drive_time_from_abq": "45 minutes"
}
```

### International Chain
```json
{
  "id": "abq-circle-k-lomas",
  "name": "Circle K",
  "chain_type": "international",
  "address": {
    "street": "300 Lomas Blvd NE",
    "city": "Albuquerque",
    "state": "NM",
    "full": "300 Lomas Blvd NE, Albuquerque, NM"
  },
  "metro_relationship": "primary"
}
```

## Usage Patterns

### Filter for Local Businesses Only
```javascript
const localOnly = entities.filter(e => e.chain_type === "");
```

### Filter by Metro Area Scope
```javascript
const primaryCityOnly = entities.filter(e => e.metro_relationship === "primary");
const includeSuburbs = entities.filter(e =>
  ["primary", "suburb"].includes(e.metro_relationship)
);
```

## Related Documents
- `.context-network/architecture/standards/chain_classification.md` - **Project-wide chain classification standards**
- `/data/{city}/context/extraction/chain_classification.md` - City-specific chain implementation
- `/data/{city}/context/extraction/address_schema.md` - Address structure documentation
- `.context-network/architecture/patterns/place-network.md` - Updated entity definitions