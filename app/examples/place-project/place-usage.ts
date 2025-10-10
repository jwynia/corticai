/**
 * PlaceDomainAdapter Usage Examples
 *
 * This file demonstrates how to use the PlaceDomainAdapter to extract
 * and query place-based entities with spatial and temporal features.
 */

import { PlaceDomainAdapter } from '../../src/adapters/PlaceDomainAdapter';
import type { Entity, FileMetadata } from '../../src/types/entity';
import * as fs from 'fs';
import * as path from 'path';

// Initialize the adapter
const adapter = new PlaceDomainAdapter();

/**
 * Example 1: Extract places from JSON file
 */
function example1_ExtractPlaces() {
  console.log('\n=== Example 1: Extract Places from JSON ===\n');

  const content = fs.readFileSync(
    path.join(__dirname, 'san-francisco-places.json'),
    'utf-8'
  );

  const metadata: FileMetadata = {
    path: path.join(__dirname, 'san-francisco-places.json'),
    filename: 'san-francisco-places.json',
    extension: '.json'
  };

  const entities = adapter.extract(content, metadata);

  console.log(`Extracted ${entities.length} entities`);

  // Show places with their types
  const places = entities.filter(e => e.metadata?.entityType === 'place');
  console.log(`\nFound ${places.length} places:`);
  places.forEach(place => {
    console.log(`  - ${place.name} (${place.metadata?.placeType})`);
  });
}

/**
 * Example 2: Query places by type
 */
function example2_QueryByType() {
  console.log('\n=== Example 2: Query Places by Type ===\n');

  const content = fs.readFileSync(
    path.join(__dirname, 'san-francisco-places.json'),
    'utf-8'
  );

  const metadata: FileMetadata = {
    path: path.join(__dirname, 'san-francisco-places.json'),
    filename: 'san-francisco-places.json',
    extension: '.json'
  };

  const entities = adapter.extract(content, metadata);

  // Find all cafes
  const cafes = entities.filter(e => e.metadata?.placeType === 'cafe');
  console.log('Cafes:');
  cafes.forEach(cafe => {
    const coords = cafe.metadata?.coordinates;
    console.log(`  - ${cafe.name}`);
    console.log(`    Location: ${coords?.lat}, ${coords?.lng}`);
    console.log(`    Rating: ${cafe.metadata?.rating || 'N/A'}`);
  });

  // Find all restaurants
  const restaurants = entities.filter(e => e.metadata?.placeType === 'restaurant');
  console.log('\nRestaurants:');
  restaurants.forEach(restaurant => {
    console.log(`  - ${restaurant.name}`);
    console.log(`    Price Level: ${'$'.repeat(restaurant.metadata?.priceLevel || 1)}`);
  });
}

/**
 * Example 3: Calculate distances between places
 */
function example3_CalculateDistances() {
  console.log('\n=== Example 3: Calculate Distances ===\n');

  const content = fs.readFileSync(
    path.join(__dirname, 'san-francisco-places.json'),
    'utf-8'
  );

  const metadata: FileMetadata = {
    path: path.join(__dirname, 'san-francisco-places.json'),
    filename: 'san-francisco-places.json',
    extension: '.json'
  };

  const entities = adapter.extract(content, metadata);

  // Get places with coordinates
  const placesWithCoords = entities.filter(e =>
    e.metadata?.coordinates &&
    adapter.isValidCoordinate(e.metadata.coordinates)
  );

  // Calculate distance from Blue Bottle Coffee to other places
  const bluebottle = placesWithCoords.find(e => e.name === 'Blue Bottle Coffee');
  if (bluebottle) {
    console.log(`Distances from ${bluebottle.name}:\n`);
    placesWithCoords.forEach(place => {
      if (place.id !== bluebottle.id) {
        const distance = adapter.calculateDistance(
          bluebottle.metadata!.coordinates!,
          place.metadata!.coordinates!
        );
        console.log(`  - To ${place.name}: ${distance.toFixed(2)} km`);
      }
    });
  }
}

/**
 * Example 4: Find places open at specific time
 */
function example4_FindOpenPlaces() {
  console.log('\n=== Example 4: Find Places Open at Specific Time ===\n');

  const content = fs.readFileSync(
    path.join(__dirname, 'san-francisco-places.json'),
    'utf-8'
  );

  const metadata: FileMetadata = {
    path: path.join(__dirname, 'san-francisco-places.json'),
    filename: 'san-francisco-places.json',
    extension: '.json'
  };

  const entities = adapter.extract(content, metadata);

  // Check what's open on Monday at 10 AM
  const mondayMorning = new Date('2025-10-06T10:00:00'); // Monday
  console.log(`Places open on Monday at 10:00 AM:\n`);

  entities.forEach(place => {
    const hours = place.metadata?.hours;
    if (hours && adapter.isOpenAt(hours, mondayMorning)) {
      console.log(`  ✓ ${place.name}`);
      const mondayHours = hours.monday;
      if (mondayHours) {
        console.log(`    Hours: ${mondayHours.open} - ${mondayHours.close}`);
      }
    }
  });

  // Check what's open late on Friday night
  const fridayNight = new Date('2025-10-10T22:00:00'); // Friday 10 PM
  console.log(`\nPlaces open on Friday at 10:00 PM:\n`);

  entities.forEach(place => {
    const hours = place.metadata?.hours;
    if (hours && adapter.isOpenAt(hours, fridayNight)) {
      console.log(`  ✓ ${place.name}`);
    }
  });
}

/**
 * Example 5: Find nearby places
 */
function example5_FindNearbyPlaces() {
  console.log('\n=== Example 5: Find Nearby Places ===\n');

  const content = fs.readFileSync(
    path.join(__dirname, 'san-francisco-places.json'),
    'utf-8'
  );

  const metadata: FileMetadata = {
    path: path.join(__dirname, 'san-francisco-places.json'),
    filename: 'san-francisco-places.json',
    extension: '.json'
  };

  const entities = adapter.extract(content, metadata);

  // Find places near Dolores Park (within 2km)
  const doloresPark = entities.find(e => e.name === 'Dolores Park');
  if (doloresPark && doloresPark.metadata?.coordinates) {
    console.log(`Places within 2 km of ${doloresPark.name}:\n`);

    entities.forEach(place => {
      if (place.id !== doloresPark.id && place.metadata?.coordinates) {
        const distance = adapter.calculateDistance(
          doloresPark.metadata.coordinates,
          place.metadata.coordinates
        );

        if (distance <= 2.0) {
          console.log(`  - ${place.name} (${distance.toFixed(2)} km away)`);
          console.log(`    Type: ${place.metadata?.placeType}`);
        }
      }
    });
  }
}

/**
 * Example 6: Natural language query - "coffee shops near SOMA"
 */
function example6_NaturalLanguageQuery() {
  console.log('\n=== Example 6: Natural Language Query ===\n');
  console.log('Query: "coffee shops near SOMA"\n');

  const content = fs.readFileSync(
    path.join(__dirname, 'san-francisco-places.json'),
    'utf-8'
  );

  const metadata: FileMetadata = {
    path: path.join(__dirname, 'san-francisco-places.json'),
    filename: 'san-francisco-places.json',
    extension: '.json'
  };

  const entities = adapter.extract(content, metadata);

  // SOMA area (roughly 37.77-37.79 lat)
  const somaBounds = { minLat: 37.77, maxLat: 37.79 };

  const results = entities.filter(e => {
    const isCafe = e.metadata?.placeType === 'cafe';
    const coords = e.metadata?.coordinates;
    const inSoma = coords &&
                   coords.lat >= somaBounds.minLat &&
                   coords.lat <= somaBounds.maxLat;

    return isCafe && inSoma;
  });

  console.log(`Found ${results.length} coffee shops in SOMA:`);
  results.forEach(place => {
    console.log(`  - ${place.name}`);
    console.log(`    Address: ${place.metadata?.address}`);
    console.log(`    Rating: ${place.metadata?.rating || 'N/A'}`);
  });
}

/**
 * Example 7: Detect relationships between places
 */
function example7_DetectRelationships() {
  console.log('\n=== Example 7: Detect Relationships ===\n');

  const content = fs.readFileSync(
    path.join(__dirname, 'san-francisco-places.json'),
    'utf-8'
  );

  const metadata: FileMetadata = {
    path: path.join(__dirname, 'san-francisco-places.json'),
    filename: 'san-francisco-places.json',
    extension: '.json'
  };

  const entities = adapter.extract(content, metadata);

  // Detect "near" relationships
  if (adapter.detectRelationships) {
    const relationships = adapter.detectRelationships(entities);

    console.log(`Detected ${relationships.length} "near" relationships:\n`);

    relationships.forEach(rel => {
      const from = entities.find(e => e.id === rel.metadata?.from);
      const to = entities.find(e => e.id === rel.target);

      if (from && to) {
        console.log(`  - ${from.name} is near ${to.name}`);
        console.log(`    Distance: ${rel.metadata?.distance} km`);
      }
    });
  }
}

// Run all examples
if (require.main === module) {
  example1_ExtractPlaces();
  example2_QueryByType();
  example3_CalculateDistances();
  example4_FindOpenPlaces();
  example5_FindNearbyPlaces();
  example6_NaturalLanguageQuery();
  example7_DetectRelationships();
}

// Export for use in other modules
export {
  example1_ExtractPlaces,
  example2_QueryByType,
  example3_CalculateDistances,
  example4_FindOpenPlaces,
  example5_FindNearbyPlaces,
  example6_NaturalLanguageQuery,
  example7_DetectRelationships
};
