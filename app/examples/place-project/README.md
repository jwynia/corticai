# PlaceDomainAdapter Examples

This directory contains examples demonstrating the PlaceDomainAdapter's capabilities for extracting and querying spatial and temporal data.

## What is PlaceDomainAdapter?

The PlaceDomainAdapter is a specialized domain adapter for CorticAI that handles place-based entities with:

- **Spatial Features**: Coordinates, bounding boxes, distance calculations
- **Temporal Features**: Hours of operation, event scheduling, time-based queries
- **Entity Types**: Places, activities, services, neighborhoods
- **Relationship Detection**: Near, contains, serves relationships
- **Natural Language Queries**: Support for intuitive queries like "coffee shops near SOMA"

## Files

- `san-francisco-places.json` - Sample place data for San Francisco locations
- `place-usage.ts` - Comprehensive usage examples
- `README.md` - This file

## Sample Data

The `san-francisco-places.json` file contains real places in San Francisco including:

- **Cafes**: Blue Bottle Coffee
- **Parks**: Dolores Park
- **Markets**: Ferry Building Marketplace
- **Landmarks**: Golden Gate Bridge
- **Restaurants**: Pizzeria Delfina
- **Neighborhoods**: Mission District

Each place includes:
- Name and type
- Address and coordinates
- Hours of operation
- Services and amenities
- Ratings and price levels
- Tags for categorization

## Usage Examples

### Running the Examples

```bash
# From the app directory
npx ts-node examples/place-project/place-usage.ts
```

### Example 1: Extract Places

```typescript
import { PlaceDomainAdapter } from '../../src/adapters/PlaceDomainAdapter';

const adapter = new PlaceDomainAdapter();
const entities = adapter.extract(jsonContent, metadata);

console.log(`Extracted ${entities.length} entities`);
```

### Example 2: Query by Type

```typescript
// Find all cafes
const cafes = entities.filter(e => e.metadata?.placeType === 'cafe');
```

### Example 3: Calculate Distances

```typescript
const distance = adapter.calculateDistance(
  place1.metadata.coordinates,
  place2.metadata.coordinates
);

console.log(`Distance: ${distance.toFixed(2)} km`);
```

### Example 4: Find Open Places

```typescript
const mondayMorning = new Date('2025-10-06T10:00:00');

const openPlaces = entities.filter(place => {
  const hours = place.metadata?.hours;
  return hours && adapter.isOpenAt(hours, mondayMorning);
});
```

### Example 5: Find Nearby Places

```typescript
const nearbyPlaces = entities.filter(place => {
  if (place.metadata?.coordinates && referenceCoords) {
    const distance = adapter.calculateDistance(
      referenceCoords,
      place.metadata.coordinates
    );
    return distance <= 2.0; // Within 2km
  }
  return false;
});
```

### Example 6: Natural Language Queries

```typescript
// Query: "coffee shops in SOMA"
const results = entities.filter(e => {
  const isCafe = e.metadata?.placeType === 'cafe';
  const coords = e.metadata?.coordinates;
  const inSoma = coords &&
                 coords.lat >= 37.77 &&
                 coords.lat <= 37.79;
  return isCafe && inSoma;
});
```

### Example 7: Detect Relationships

```typescript
// Automatically detect "near" relationships
const relationships = adapter.detectRelationships(entities);

// Places within 1km of each other get "near" relationships
```

## Spatial Features

### Coordinate Validation

```typescript
const isValid = adapter.isValidCoordinate({
  lat: 37.7749,  // Must be -90 to 90
  lng: -122.4194 // Must be -180 to 180
});
```

### Distance Calculation

Uses the Haversine formula for accurate distance calculation on a sphere:

```typescript
const distanceKm = adapter.calculateDistance(coord1, coord2);
```

### Bounding Boxes

Places can define an area using bounding boxes:

```typescript
{
  "name": "Mission District",
  "type": "neighborhood",
  "bounds": {
    "north": 37.7699,
    "south": 37.7499,
    "east": -122.4000,
    "west": -122.4300
  }
}
```

## Temporal Features

### Hours of Operation

```typescript
{
  "hours": {
    "monday": { "open": "07:00", "close": "18:00" },
    "tuesday": { "open": "07:00", "close": "18:00" },
    // ... other days
  }
}
```

### Checking if Open

```typescript
const isOpen = adapter.isOpenAt(place.metadata.hours, new Date());
```

### Event Scheduling

```typescript
{
  "events": [
    {
      "name": "Yoga Class",
      "startTime": "2025-10-15T09:00:00Z",
      "endTime": "2025-10-15T10:00:00Z"
    }
  ]
}
```

## Relationship Detection

The adapter automatically detects:

- **Near**: Places within 1km of each other
- **Part-of**: When a place specifies a `partOf` field
- **Serves**: When a place lists services it provides

## Use Cases

### 1. Location-Based Services
Build apps that help users find places based on:
- Type (cafes, parks, restaurants)
- Location (near me, in specific area)
- Time (open now, open late)

### 2. Travel Planning
Create itineraries by:
- Finding places near each other
- Checking operating hours
- Grouping by neighborhood

### 3. Business Intelligence
Analyze:
- Competitive density (cafes per area)
- Operating hour patterns
- Service availability

### 4. Urban Planning
Understand:
- Amenity distribution
- Access to services
- Neighborhood characteristics

## Testing

Comprehensive tests ensure correctness:

```bash
npm test -- PlaceDomainAdapter
```

Test coverage includes:
- Basic extraction (3 tests)
- Place entities (3 tests)
- Spatial properties (4 tests)
- Temporal features (4 tests)
- Activities and services (2 tests)
- Relationship detection (3 tests)
- Natural language queries (3 tests)
- Edge cases and errors (8 tests)
- Integration scenarios (2 tests)

**Total: 30 tests, all passing**

## Architecture

The PlaceDomainAdapter:

1. **Extends UniversalFallbackAdapter**: Inherits base text extraction
2. **Parses JSON**: Structured place data
3. **Validates Data**: Coordinate ranges, required fields
4. **Enriches Metadata**: Spatial and temporal properties
5. **Detects Relationships**: Proximity-based and explicit

## Domain-Specific Properties

The adapter preserves custom properties:

```typescript
{
  "name": "Hiking Trail",
  "type": "activity",
  "category": "outdoor",      // Preserved
  "difficulty": "moderate"    // Preserved
}
```

## Performance

- **Coordinate validation**: O(1)
- **Distance calculation**: O(1) per pair
- **Relationship detection**: O(n²) for n places
- **Extraction**: O(n) for n places in JSON

## Future Enhancements

Potential additions:

- [ ] Support for GeoJSON format
- [ ] Routing and directions
- [ ] Transit integration
- [ ] Place categories/taxonomies
- [ ] User reviews and ratings
- [ ] Photo metadata
- [ ] Accessibility information
- [ ] Multi-language support

## Related Documentation

- [CorticAI Architecture](../../context-network/architecture/system_architecture.md)
- [Domain Adapters](../../context-network/foundation/domain_adapters.md)
- [Entity Types](../../src/types/entity.ts)

## License

MIT License - See project root for details
