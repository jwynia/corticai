import { UniversalFallbackAdapter } from './UniversalFallbackAdapter';
import type {
  DomainAdapter,
  Entity,
  FileMetadata,
  Relationship,
  EntityMetadata
} from '../types/entity';

/**
 * Coordinates for spatial location
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Bounding box for area definition
 */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Hours of operation for a single day
 */
export interface DayHours {
  open: string;  // "HH:MM" format
  close: string; // "HH:MM" format
}

/**
 * Weekly hours of operation
 */
export interface WeeklyHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

/**
 * Event information
 */
export interface Event {
  name: string;
  startTime: string;
  endTime: string;
}

/**
 * Place data structure
 */
export interface PlaceData {
  id?: string;
  name?: string;
  type?: string;
  address?: string;
  coordinates?: Coordinates;
  bounds?: BoundingBox;
  hours?: WeeklyHours;
  events?: Event[];
  services?: string[];
  tags?: string[];
  rating?: number;
  priceLevel?: number;
  partOf?: string;
  places?: PlaceData[];
}

/**
 * PlaceDomainAdapter - Specialized for spatial and temporal data
 *
 * Extends the Universal Fallback Adapter to provide enhanced analysis
 * for places, locations, and venues, including:
 * - Place entity extraction from JSON
 * - Spatial properties (coordinates, bounding boxes)
 * - Temporal features (hours of operation, events)
 * - Distance calculations
 * - Relationship detection (contains, near, serves)
 */
export class PlaceDomainAdapter extends UniversalFallbackAdapter implements DomainAdapter {
  private readonly EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers
  private readonly NEAR_THRESHOLD_KM = 1; // Places within 1km are considered "near"

  /**
   * Main extraction method - processes place data and returns entities
   */
  extract(content: string, metadata: FileMetadata): Entity[] {
    // First, get the base entities from the Universal Fallback Adapter
    const baseEntities = super.extract(content, metadata);

    // Try to parse as JSON for structured place data
    let placeData: PlaceData | PlaceData[] | null = null;
    try {
      placeData = JSON.parse(content);
    } catch (error) {
      // If JSON parsing fails, return base entities (fallback to text extraction)
      return baseEntities;
    }

    // Extract place-specific entities
    const placeEntities = this.extractPlaceEntities(placeData, metadata);

    // Combine and return all entities
    return [...baseEntities, ...placeEntities];
  }

  /**
   * Extract place-specific entities from parsed JSON data
   */
  private extractPlaceEntities(data: PlaceData | PlaceData[] | null, metadata: FileMetadata): Entity[] {
    if (!data) {
      return [];
    }

    const entities: Entity[] = [];

    // Handle array of places
    if (Array.isArray(data)) {
      for (const place of data) {
        entities.push(...this.extractPlaceEntities(place, metadata));
      }
      return entities;
    }

    // Handle single place object
    if (typeof data === 'object') {
      const placeEntity = this.createPlaceEntity(data, metadata);
      if (placeEntity) {
        entities.push(placeEntity);
      }

      // Extract nested places if present
      if (data.places && Array.isArray(data.places)) {
        for (const nestedPlace of data.places) {
          const nestedEntity = this.createPlaceEntity(nestedPlace, metadata);
          if (nestedEntity) {
            entities.push(nestedEntity);
          }
        }
      }
    }

    return entities;
  }

  /**
   * Create a place entity from place data
   */
  private createPlaceEntity(data: PlaceData, fileMetadata: FileMetadata): Entity | null {
    // Need at least a name or type to create an entity
    if (!data.name && !data.type) {
      return null;
    }

    const entityType = this.determineEntityType(data);
    const name = data.name || `Unnamed ${data.type || 'place'}`;

    const entityMetadata: EntityMetadata = {
      filename: fileMetadata.filename,
      format: fileMetadata.extension,
      entityType,
      placeType: data.type
    };

    // Add spatial properties
    if (data.coordinates && this.isValidCoordinate(data.coordinates)) {
      entityMetadata.coordinates = data.coordinates;
    }

    if (data.bounds) {
      entityMetadata.bounds = data.bounds;
    }

    if (data.address) {
      entityMetadata.address = data.address;
    }

    // Add temporal properties
    if (data.hours) {
      entityMetadata.hours = data.hours;
    }

    if (data.events) {
      entityMetadata.events = data.events;
    }

    // Add services and tags
    if (data.services) {
      entityMetadata.services = data.services;
    }

    if (data.tags) {
      entityMetadata.tags = data.tags;
    }

    // Add rating and price level
    if (data.rating !== undefined) {
      entityMetadata.rating = data.rating;
    }

    if (data.priceLevel !== undefined) {
      entityMetadata.priceLevel = data.priceLevel;
    }

    // Preserve all other properties from the original data
    // This allows domain-specific properties (like category, difficulty, etc.) to pass through
    Object.keys(data).forEach(key => {
      const typedKey = key as keyof PlaceData;
      if (!entityMetadata[key] && data[typedKey] !== undefined) {
        // Skip already-handled fields and complex objects
        const skipFields = ['id', 'name', 'type', 'address', 'coordinates', 'bounds', 'hours',
                           'events', 'services', 'tags', 'rating', 'priceLevel', 'partOf', 'places'];
        if (!skipFields.includes(key)) {
          (entityMetadata as any)[key] = data[typedKey];
        }
      }
    });

    // Build relationships
    const relationships: Relationship[] = [];

    // Part-of relationship
    if (data.partOf) {
      relationships.push({
        type: 'part-of',
        target: data.partOf
      });
    }

    // Service relationships
    if (data.services && Array.isArray(data.services)) {
      for (const service of data.services) {
        relationships.push({
          type: 'references',
          target: service,
          metadata: { relationship: 'provides' }
        });
      }
    }

    const entity: Entity = {
      id: data.id || `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'container', // Use universal type
      name,
      content: data.address || '',
      metadata: entityMetadata,
      relationships: relationships.length > 0 ? relationships : undefined
    };

    return entity;
  }

  /**
   * Determine the entity type based on place data
   */
  private determineEntityType(data: PlaceData): string {
    if (data.type === 'activity') {
      return 'activity';
    }

    if (data.type === 'service') {
      return 'service';
    }

    return 'place';
  }

  /**
   * Validate that coordinates are within valid ranges
   * Latitude: -90 to 90
   * Longitude: -180 to 180
   */
  isValidCoordinate(coords: Coordinates | null | undefined): boolean {
    if (!coords) {
      return false;
    }

    const lat = Number(coords.lat);
    const lng = Number(coords.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return false;
    }

    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    if (!coord1 || !coord2) {
      throw new Error('Both coordinates must be provided');
    }

    if (!this.isValidCoordinate(coord1) || !this.isValidCoordinate(coord2)) {
      throw new Error('Invalid coordinates provided');
    }

    const lat1Rad = this.toRadians(coord1.lat);
    const lat2Rad = this.toRadians(coord2.lat);
    const deltaLat = this.toRadians(coord2.lat - coord1.lat);
    const deltaLng = this.toRadians(coord2.lng - coord1.lng);

    // Haversine formula
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Determine if a place is open at a specific time
   */
  isOpenAt(hours: WeeklyHours | null | undefined, time: Date): boolean {
    if (!hours || !time) {
      return false;
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayIndex = time.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIndex] as keyof WeeklyHours;

    const dayHours = hours[dayName];
    if (!dayHours) {
      return false; // Closed on this day
    }

    // Parse open and close times
    const timeMinutes = time.getHours() * 60 + time.getMinutes();
    const openMinutes = this.parseTimeToMinutes(dayHours.open);
    const closeMinutes = this.parseTimeToMinutes(dayHours.close);

    // Handle 24-hour operations
    if (openMinutes === 0 && closeMinutes >= 1439) { // 23:59 = 1439 minutes
      return true;
    }

    // Handle normal hours
    if (closeMinutes > openMinutes) {
      // Same day (e.g., 09:00 - 17:00)
      return timeMinutes >= openMinutes && timeMinutes < closeMinutes;
    } else {
      // Crosses midnight (e.g., 18:00 - 02:00)
      return timeMinutes >= openMinutes || timeMinutes < closeMinutes;
    }
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  private parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Detect relationships between entities (optional implementation)
   */
  detectRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];

    // Find places with coordinates
    const placesWithCoords = entities.filter(e =>
      e.metadata?.entityType === 'place' &&
      e.metadata?.coordinates &&
      this.isValidCoordinate(e.metadata.coordinates)
    );

    // Detect "near" relationships for places within threshold
    for (let i = 0; i < placesWithCoords.length; i++) {
      for (let j = i + 1; j < placesWithCoords.length; j++) {
        const place1 = placesWithCoords[i];
        const place2 = placesWithCoords[j];

        const distance = this.calculateDistance(
          place1.metadata!.coordinates!,
          place2.metadata!.coordinates!
        );

        if (distance < this.NEAR_THRESHOLD_KM) {
          relationships.push({
            type: 'references',
            target: place2.id,
            metadata: {
              relationship: 'near',
              distance: distance.toFixed(2),
              from: place1.id
            }
          });
        }
      }
    }

    return relationships;
  }
}
