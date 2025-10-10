import { describe, it, expect, beforeEach } from 'vitest';
import { PlaceDomainAdapter } from '../../src/adapters/PlaceDomainAdapter';
import type { Entity, FileMetadata, Relationship } from '../../src/types/entity';

describe('PlaceDomainAdapter', () => {
  let adapter: PlaceDomainAdapter;

  beforeEach(() => {
    adapter = new PlaceDomainAdapter();
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(PlaceDomainAdapter);
    });

    it('should have an extract method', () => {
      expect(adapter.extract).toBeDefined();
      expect(typeof adapter.extract).toBe('function');
    });

    it('should extend UniversalFallbackAdapter functionality', () => {
      const content = 'Simple place description';
      const metadata: FileMetadata = {
        path: '/test/places.json',
        filename: 'places.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Place Entity Extraction', () => {
    it('should extract place entities from JSON data', () => {
      const content = JSON.stringify({
        name: "Blue Bottle Coffee",
        type: "cafe",
        address: "66 Mint St, San Francisco, CA 94103",
        coordinates: {
          lat: 37.7821,
          lng: -122.4093
        }
      });

      const metadata: FileMetadata = {
        path: '/test/places.json',
        filename: 'places.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const placeEntities = result.filter(e => e.metadata?.entityType === 'place');

      expect(placeEntities.length).toBeGreaterThan(0);

      const cafe = placeEntities.find(e => e.name === 'Blue Bottle Coffee');
      expect(cafe).toBeDefined();
      expect(cafe?.metadata?.placeType).toBe('cafe');
    });

    it('should extract multiple places from JSON array', () => {
      const content = JSON.stringify([
        {
          name: "Dolores Park",
          type: "park",
          coordinates: { lat: 37.7596, lng: -122.4269 }
        },
        {
          name: "Ferry Building Marketplace",
          type: "market",
          coordinates: { lat: 37.7956, lng: -122.3935 }
        }
      ]);

      const metadata: FileMetadata = {
        path: '/test/parks.json',
        filename: 'parks.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const placeEntities = result.filter(e => e.metadata?.entityType === 'place');

      expect(placeEntities.length).toBeGreaterThanOrEqual(2);

      const names = placeEntities.map(e => e.name);
      expect(names).toContain('Dolores Park');
      expect(names).toContain('Ferry Building Marketplace');
    });

    it('should handle places without coordinates gracefully', () => {
      const content = JSON.stringify({
        name: "Mystery Location",
        type: "restaurant",
        address: "123 Unknown St"
      });

      const metadata: FileMetadata = {
        path: '/test/place.json',
        filename: 'place.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const placeEntities = result.filter(e => e.metadata?.entityType === 'place');

      expect(placeEntities.length).toBeGreaterThan(0);
      const place = placeEntities[0];
      expect(place.name).toBe('Mystery Location');
    });
  });

  describe('Spatial Properties', () => {
    it('should store coordinate data correctly', () => {
      const content = JSON.stringify({
        name: "Golden Gate Bridge",
        type: "landmark",
        coordinates: {
          lat: 37.8199,
          lng: -122.4783
        }
      });

      const metadata: FileMetadata = {
        path: '/test/landmark.json',
        filename: 'landmark.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const landmark = result.find(e => e.name === 'Golden Gate Bridge');

      expect(landmark).toBeDefined();
      expect(landmark?.metadata?.coordinates).toBeDefined();
      expect(landmark?.metadata?.coordinates?.lat).toBe(37.8199);
      expect(landmark?.metadata?.coordinates?.lng).toBe(-122.4783);
    });

    it('should support bounding box data', () => {
      const content = JSON.stringify({
        name: "Mission District",
        type: "neighborhood",
        bounds: {
          north: 37.7699,
          south: 37.7499,
          east: -122.4000,
          west: -122.4300
        }
      });

      const metadata: FileMetadata = {
        path: '/test/neighborhood.json',
        filename: 'neighborhood.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const neighborhood = result.find(e => e.name === 'Mission District');

      expect(neighborhood).toBeDefined();
      expect(neighborhood?.metadata?.bounds).toBeDefined();
      expect(neighborhood?.metadata?.bounds?.north).toBe(37.7699);
    });

    it('should calculate distance between two places', () => {
      const place1 = {
        coordinates: { lat: 37.7749, lng: -122.4194 } // SF downtown
      };

      const place2 = {
        coordinates: { lat: 37.8199, lng: -122.4783 } // Golden Gate Bridge
      };

      const distance = adapter.calculateDistance(
        place1.coordinates,
        place2.coordinates
      );

      // Distance should be approximately 8-9 km
      expect(distance).toBeGreaterThan(7);
      expect(distance).toBeLessThan(10);
    });

    it('should handle missing coordinates in distance calculation', () => {
      expect(() => {
        adapter.calculateDistance(
          { lat: 37.7749, lng: -122.4194 },
          null as any
        );
      }).toThrow();
    });
  });

  describe('Temporal Features', () => {
    it('should extract hours of operation', () => {
      const content = JSON.stringify({
        name: "The Mill",
        type: "cafe",
        hours: {
          monday: { open: "07:00", close: "18:00" },
          tuesday: { open: "07:00", close: "18:00" },
          wednesday: { open: "07:00", close: "18:00" }
        }
      });

      const metadata: FileMetadata = {
        path: '/test/cafe.json',
        filename: 'cafe.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const cafe = result.find(e => e.name === 'The Mill');

      expect(cafe).toBeDefined();
      expect(cafe?.metadata?.hours).toBeDefined();
      expect(cafe?.metadata?.hours?.monday?.open).toBe('07:00');
    });

    it('should determine if place is open at specific time', () => {
      const place = {
        hours: {
          monday: { open: "09:00", close: "17:00" },
          tuesday: { open: "09:00", close: "17:00" }
        }
      };

      // Monday 10:00 AM - should be open
      const mondayMorning = new Date('2025-10-06T10:00:00'); // Monday
      expect(adapter.isOpenAt(place.hours, mondayMorning)).toBe(true);

      // Monday 6:00 PM - should be closed
      const mondayEvening = new Date('2025-10-06T18:00:00'); // Monday
      expect(adapter.isOpenAt(place.hours, mondayEvening)).toBe(false);
    });

    it('should handle 24-hour establishments', () => {
      const place = {
        hours: {
          monday: { open: "00:00", close: "23:59" }
        }
      };

      const anytime = new Date('2025-10-06T15:00:00'); // Monday 3 PM
      expect(adapter.isOpenAt(place.hours, anytime)).toBe(true);
    });

    it('should extract event scheduling data', () => {
      const content = JSON.stringify({
        name: "Community Center",
        type: "venue",
        events: [
          {
            name: "Yoga Class",
            startTime: "2025-10-15T09:00:00Z",
            endTime: "2025-10-15T10:00:00Z"
          }
        ]
      });

      const metadata: FileMetadata = {
        path: '/test/events.json',
        filename: 'events.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const venue = result.find(e => e.name === 'Community Center');

      expect(venue).toBeDefined();
      expect(venue?.metadata?.events).toBeDefined();
      expect(venue?.metadata?.events?.length).toBeGreaterThan(0);
    });
  });

  describe('Activity and Service Entities', () => {
    it('should extract activity entities', () => {
      const content = JSON.stringify({
        name: "Hiking Trail",
        type: "activity",
        category: "outdoor",
        difficulty: "moderate",
        coordinates: { lat: 37.8651, lng: -122.4960 }
      });

      const metadata: FileMetadata = {
        path: '/test/activities.json',
        filename: 'activities.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const activity = result.find(e => e.metadata?.entityType === 'activity');

      expect(activity).toBeDefined();
      expect(activity?.name).toBe('Hiking Trail');
      expect(activity?.metadata?.category).toBe('outdoor');
    });

    it('should extract service entities', () => {
      const content = JSON.stringify({
        name: "Free WiFi",
        type: "service",
        provider: "Blue Bottle Coffee",
        availability: "customers-only"
      });

      const metadata: FileMetadata = {
        path: '/test/services.json',
        filename: 'services.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const service = result.find(e => e.metadata?.entityType === 'service');

      expect(service).toBeDefined();
      expect(service?.name).toBe('Free WiFi');
    });
  });

  describe('Relationship Detection', () => {
    it('should detect contains relationships', () => {
      const content = JSON.stringify([
        {
          id: "sf",
          name: "San Francisco",
          type: "city"
        },
        {
          id: "mission",
          name: "Mission District",
          type: "neighborhood",
          partOf: "sf"
        }
      ]);

      const metadata: FileMetadata = {
        path: '/test/locations.json',
        filename: 'locations.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const neighborhood = result.find(e => e.name === 'Mission District');

      expect(neighborhood).toBeDefined();
      expect(neighborhood?.relationships).toBeDefined();

      const containsRel = neighborhood?.relationships?.find(r => r.type === 'part-of');
      expect(containsRel).toBeDefined();
    });

    it('should detect near relationships based on distance', () => {
      const content = JSON.stringify([
        {
          id: "place1",
          name: "Place A",
          type: "cafe",
          coordinates: { lat: 37.7749, lng: -122.4194 }
        },
        {
          id: "place2",
          name: "Place B",
          type: "restaurant",
          coordinates: { lat: 37.7750, lng: -122.4195 } // Very close
        }
      ]);

      const metadata: FileMetadata = {
        path: '/test/nearby.json',
        filename: 'nearby.json',
        extension: '.json'
      };

      const entities = adapter.extract(content, metadata);

      if (adapter.detectRelationships) {
        const relationships = adapter.detectRelationships(entities);

        // Should detect near relationship for places < 1km apart
        const nearRels = relationships.filter(r => r.type === 'references' && r.metadata?.relationship === 'near');
        expect(nearRels.length).toBeGreaterThan(0);
      }
    });

    it('should detect serves relationships', () => {
      const content = JSON.stringify([
        {
          id: "cafe1",
          name: "Blue Bottle Coffee",
          type: "cafe",
          services: ["wifi1", "parking1"]
        },
        {
          id: "wifi1",
          name: "Free WiFi",
          type: "service"
        }
      ]);

      const metadata: FileMetadata = {
        path: '/test/services.json',
        filename: 'services.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const cafe = result.find(e => e.name === 'Blue Bottle Coffee');

      expect(cafe).toBeDefined();
      expect(cafe?.relationships).toBeDefined();

      // Should have references to services
      const serviceRels = cafe?.relationships?.filter(r => r.type === 'references');
      expect(serviceRels?.length).toBeGreaterThan(0);
    });
  });

  describe('Natural Language Query Support', () => {
    it('should support querying by place type', () => {
      const places = [
        {
          name: "Blue Bottle Coffee",
          type: "cafe",
          coordinates: { lat: 37.7821, lng: -122.4093 }
        },
        {
          name: "Pizzeria Delfina",
          type: "restaurant",
          coordinates: { lat: 37.7699, lng: -122.4269 }
        },
        {
          name: "Ritual Coffee Roasters",
          type: "cafe",
          coordinates: { lat: 37.7604, lng: -122.4214 }
        }
      ];

      const content = JSON.stringify(places);
      const metadata: FileMetadata = {
        path: '/test/places.json',
        filename: 'places.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const cafes = result.filter(e => e.metadata?.placeType === 'cafe');

      expect(cafes.length).toBe(2);
    });

    it('should support filtering by area (bounding box)', () => {
      const places = [
        {
          name: "SOMA Cafe",
          type: "cafe",
          coordinates: { lat: 37.7821, lng: -122.4093 }
        },
        {
          name: "North Beach Restaurant",
          type: "restaurant",
          coordinates: { lat: 37.8044, lng: -122.4094 }
        }
      ];

      const content = JSON.stringify(places);
      const metadata: FileMetadata = {
        path: '/test/places.json',
        filename: 'places.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);

      // Filter places in SOMA area (roughly 37.77-37.79)
      const somaPlaces = result.filter(e => {
        const coords = e.metadata?.coordinates;
        return coords && coords.lat >= 37.77 && coords.lat <= 37.79;
      });

      expect(somaPlaces.length).toBe(1);
      expect(somaPlaces[0].name).toBe('SOMA Cafe');
    });

    it('should support time-based filtering (open late)', () => {
      const places = [
        {
          name: "Early Bird Cafe",
          type: "cafe",
          hours: {
            monday: { open: "06:00", close: "18:00" }
          }
        },
        {
          name: "Night Owl Bar",
          type: "bar",
          hours: {
            monday: { open: "18:00", close: "02:00" }
          }
        }
      ];

      const content = JSON.stringify(places);
      const metadata: FileMetadata = {
        path: '/test/places.json',
        filename: 'places.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);

      // Find places open at 10 PM on Monday
      const lateTime = new Date('2025-10-06T22:00:00'); // Monday 10 PM
      const lateNightPlaces = result.filter(e => {
        const hours = e.metadata?.hours;
        return hours && adapter.isOpenAt(hours, lateTime);
      });

      expect(lateNightPlaces.length).toBe(1);
      expect(lateNightPlaces[0].name).toBe('Night Owl Bar');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty JSON gracefully', () => {
      const content = '{}';
      const metadata: FileMetadata = {
        path: '/test/empty.json',
        filename: 'empty.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json {{{';
      const metadata: FileMetadata = {
        path: '/test/invalid.json',
        filename: 'invalid.json',
        extension: '.json'
      };

      // Should fall back to base adapter behavior
      const result = adapter.extract(content, metadata);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle missing required fields', () => {
      const content = JSON.stringify({
        type: "cafe"
        // Missing name
      });

      const metadata: FileMetadata = {
        path: '/test/incomplete.json',
        filename: 'incomplete.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      expect(result).toBeDefined();
      // Should still extract what it can
    });

    it('should handle malformed coordinates', () => {
      const content = JSON.stringify({
        name: "Bad Coords Place",
        type: "cafe",
        coordinates: {
          lat: "not a number",
          lng: -122.4194
        }
      });

      const metadata: FileMetadata = {
        path: '/test/bad-coords.json',
        filename: 'bad-coords.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const place = result.find(e => e.name === 'Bad Coords Place');

      // Should still extract the place even if coordinates are invalid
      expect(place).toBeDefined();
    });

    it('should validate latitude range (-90 to 90)', () => {
      const invalidLat = { lat: 100, lng: -122.4194 };
      expect(adapter.isValidCoordinate(invalidLat)).toBe(false);

      const validLat = { lat: 45, lng: -122.4194 };
      expect(adapter.isValidCoordinate(validLat)).toBe(true);
    });

    it('should validate longitude range (-180 to 180)', () => {
      const invalidLng = { lat: 37.7749, lng: 200 };
      expect(adapter.isValidCoordinate(invalidLng)).toBe(false);

      const validLng = { lat: 37.7749, lng: -122.4194 };
      expect(adapter.isValidCoordinate(validLng)).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete place data with all features', () => {
      const content = JSON.stringify({
        id: "bluebottle-mint",
        name: "Blue Bottle Coffee",
        type: "cafe",
        address: "66 Mint St, San Francisco, CA 94103",
        coordinates: {
          lat: 37.7821,
          lng: -122.4093
        },
        hours: {
          monday: { open: "07:00", close: "18:00" },
          tuesday: { open: "07:00", close: "18:00" },
          wednesday: { open: "07:00", close: "18:00" },
          thursday: { open: "07:00", close: "18:00" },
          friday: { open: "07:00", close: "18:00" },
          saturday: { open: "08:00", close: "18:00" },
          sunday: { open: "08:00", close: "18:00" }
        },
        services: ["wifi", "outdoor-seating"],
        tags: ["specialty-coffee", "minimalist", "popular"],
        rating: 4.5,
        priceLevel: 2
      });

      const metadata: FileMetadata = {
        path: '/test/complete-place.json',
        filename: 'complete-place.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);
      const cafe = result.find(e => e.name === 'Blue Bottle Coffee');

      expect(cafe).toBeDefined();
      expect(cafe?.metadata?.placeType).toBe('cafe');
      expect(cafe?.metadata?.coordinates).toBeDefined();
      expect(cafe?.metadata?.hours).toBeDefined();
      expect(cafe?.metadata?.services).toBeDefined();
      expect(cafe?.metadata?.rating).toBe(4.5);
    });

    it('should handle complex neighborhood data with multiple places', () => {
      const content = JSON.stringify({
        name: "Mission District",
        type: "neighborhood",
        bounds: {
          north: 37.7699,
          south: 37.7499,
          east: -122.4000,
          west: -122.4300
        },
        places: [
          {
            name: "Dolores Park",
            type: "park",
            coordinates: { lat: 37.7596, lng: -122.4269 }
          },
          {
            name: "Mission Dolores",
            type: "landmark",
            coordinates: { lat: 37.7642, lng: -122.4264 }
          }
        ]
      });

      const metadata: FileMetadata = {
        path: '/test/neighborhood.json',
        filename: 'neighborhood.json',
        extension: '.json'
      };

      const result = adapter.extract(content, metadata);

      // Should extract neighborhood
      const neighborhood = result.find(e => e.name === 'Mission District');
      expect(neighborhood).toBeDefined();

      // Should extract contained places
      const places = result.filter(e => e.metadata?.entityType === 'place' && e.name !== 'Mission District');
      expect(places.length).toBeGreaterThanOrEqual(2);
    });
  });
});
