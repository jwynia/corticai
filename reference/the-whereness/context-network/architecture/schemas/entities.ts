/**
 * Entity Schema Definitions for The Whereness System
 *
 * Core entity types that represent the fundamental building blocks
 * of place-based information in metro areas.
 */

// ============================================================================
// Base Types
// ============================================================================

type EntityId = string; // Format: "type-name-disambiguator"
type ISODateTime = string; // ISO 8601 format
type Confidence = number; // 0.0 to 1.0

interface BaseEntity {
  id: EntityId;
  name: string;
  confidence: Confidence;
  last_verified: ISODateTime;
  sources: string[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ============================================================================
// Geographic Types
// ============================================================================

type MetroCity =
  | "minneapolis"
  | "st-paul"
  | "bloomington"
  | "edina"
  | "minnetonka"
  | "plymouth"
  | "eden-prairie"
  | "burnsville"
  | "woodbury"
  | "maple-grove"
  | "roseville"
  | "inver-grove-heights"
  | "other";

type MetroZone =
  | "downtown-mpls"
  | "downtown-stp"
  | "inner-ring"
  | "outer-ring"
  | "exurbs";

interface Location {
  address?: string;
  city?: MetroCity;
  neighborhood?: string;
  metro_zone?: MetroZone;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  plus_code?: string; // Google Plus Code for location
}

// ============================================================================
// Temporal Types
// ============================================================================

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type TimeOfDay =
  | "early-morning"  // 5am-8am
  | "morning"        // 8am-12pm
  | "afternoon"      // 12pm-5pm
  | "evening"        // 5pm-9pm
  | "late-night";    // 9pm-2am

type Season = "spring" | "summer" | "fall" | "winter";

interface Hours {
  [key in DayOfWeek]?: {
    open: string;  // 24hr format "HH:MM"
    close: string; // 24hr format "HH:MM"
    notes?: string; // "Kitchen closes at 9pm"
  };
}

interface TemporalPattern {
  seasonal?: boolean;
  seasons?: Season[];
  weather_dependent?: boolean;
  holiday_hours?: boolean;
  temporary_closure?: {
    start: ISODateTime;
    end: ISODateTime;
    reason: string;
  };
}

// ============================================================================
// Primary Entity: Place
// ============================================================================

type PlaceType = "venue" | "area" | "point" | "route";

type VenueSubtype =
  | "coffee-shop"
  | "restaurant"
  | "bar"
  | "brewery"
  | "retail"
  | "grocery"
  | "park"
  | "library"
  | "museum"
  | "gallery"
  | "theater"
  | "music-venue"
  | "sports-facility"
  | "community-center"
  | "maker-space"
  | "coworking"
  | "other";

interface Place extends BaseEntity {
  type: PlaceType;
  subtype?: VenueSubtype | string;
  location: Location;

  // Operational details
  hours?: Hours;
  temporal?: TemporalPattern;

  // Access and amenities
  accessibility?: {
    wheelchair: boolean;
    transit: boolean;
    parking: "street" | "lot" | "ramp" | "none";
    bike_parking: boolean;
  };

  amenities?: {
    wifi?: boolean;
    outlets?: "none" | "limited" | "abundant";
    restrooms?: boolean;
    outdoor_seating?: boolean;
    indoor_seating?: boolean;
  };

  // Characteristics
  atmosphere?: {
    noise_level?: "quiet" | "moderate" | "loud";
    crowd_level?: "empty" | "moderate" | "busy" | "packed";
    vibe?: string[]; // ["cozy", "professional", "casual"]
  };

  price_range?: "$" | "$$" | "$$$" | "$$$$";
}

// ============================================================================
// Primary Entity: Activity
// ============================================================================

type ActivityType = "ongoing" | "scheduled" | "conditional";

type ActivityCategory =
  | "active"      // sports, fitness, outdoor
  | "social"      // meetups, gatherings, parties
  | "cultural"    // arts, music, theater
  | "educational" // classes, workshops, lectures
  | "relaxation"  // meditation, spa, quiet time
  | "everyday";   // shopping, errands, routine

interface Activity extends BaseEntity {
  type: ActivityType;
  category: ActivityCategory;
  subcategory?: string;

  description: string;

  // Requirements and conditions
  requirements?: {
    equipment?: string[];
    skills?: string[];
    fitness_level?: "any" | "beginner" | "intermediate" | "advanced";
    group_size?: {
      min?: number;
      max?: number;
    };
  };

  // Temporal aspects
  typical_duration?: number; // minutes
  best_times?: TimeOfDay[];
  seasonal?: Season[];
  weather_restrictions?: string[];

  // Cost
  cost?: {
    type: "free" | "paid" | "donation";
    amount?: string;
    notes?: string;
  };
}

// ============================================================================
// Primary Entity: Service
// ============================================================================

type ServiceCategory =
  | "essential"     // medical, repair, government
  | "personal"      // haircuts, massage, fitness
  | "professional"  // business, financial, legal
  | "hospitality"   // lodging, tours, concierge
  | "educational"   // tutoring, training, coaching
  | "household";    // cleaning, maintenance, delivery

interface Service extends BaseEntity {
  category: ServiceCategory;
  subcategory?: string;

  description: string;

  // Service delivery
  delivery_method?: "in-person" | "remote" | "hybrid";
  booking?: "walk-in" | "appointment" | "both";
  typical_wait?: number; // minutes

  // Pricing
  pricing_model?: "hourly" | "flat-rate" | "subscription" | "quote";
  price_range?: string;

  // Availability
  emergency_available?: boolean;
  languages?: string[];

  // Qualifications
  certifications?: string[];
  insurance_accepted?: string[];
}

// ============================================================================
// Primary Entity: Product
// ============================================================================

type ProductCategory =
  | "physical"    // tangible goods
  | "consumable"  // food, drinks
  | "digital";    // software, media

type ProductSubcategory =
  | "local-goods"    // made locally
  | "specialty"      // hard to find
  | "everyday"       // common items
  | "artisan"        // handmade
  | "vintage"        // antique, used
  | "seasonal";      // seasonal items

interface Product extends BaseEntity {
  category: ProductCategory;
  subcategory?: ProductSubcategory;

  description: string;

  // Product details
  brand?: string;
  local?: boolean;
  sustainable?: boolean;
  dietary?: string[]; // ["vegan", "gluten-free", "organic"]

  // Availability
  in_season?: Season[];
  limited_edition?: boolean;
  pre_order?: boolean;

  // Pricing
  price_range?: string;
  bulk_discount?: boolean;
}

// ============================================================================
// Primary Entity: Group
// ============================================================================

type GroupType =
  | "organization"     // formal nonprofits
  | "club"            // interest groups
  | "informal"        // loose associations
  | "business_entity" // companies
  | "government";     // public entities

interface Group extends BaseEntity {
  type: GroupType;

  description: string;
  mission?: string;

  // Organization details
  founded?: number; // year
  size?: "small" | "medium" | "large";
  membership?: {
    type: "open" | "application" | "invitation";
    count?: number;
    fee?: string;
  };

  // Contact and presence
  website?: string;
  social_media?: {
    [platform: string]: string;
  };

  // Activities
  meeting_frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annual";
  primary_activities?: string[];
}

// ============================================================================
// Temporal Entity: Event
// ============================================================================

type EventRecurrence =
  | "one-time"
  | "daily"
  | "weekly"
  | "monthly"
  | "annual";

interface Event extends BaseEntity {
  description: string;

  // Temporal details
  recurrence: EventRecurrence;
  start_date?: ISODateTime;
  end_date?: ISODateTime;

  // For recurring events
  schedule?: {
    day_of_week?: DayOfWeek[];
    day_of_month?: number[];
    time: string; // "HH:MM"
    duration: number; // minutes
    exceptions?: string[]; // ["holidays", "summer"]
  };

  // Event details
  category?: string;
  audience?: string[];
  age_restriction?: string;

  // Participation
  registration?: "none" | "recommended" | "required";
  capacity?: number;
  cost?: {
    type: "free" | "paid" | "donation";
    amount?: string;
  };

  // Series connection
  series_id?: EntityId;
  series_name?: string;
}

// ============================================================================
// Specialized Entity: HobbyResource
// ============================================================================

type HobbyResourceType =
  | "supply"          // materials and tools
  | "service"         // repair, maintenance
  | "education"       // classes, workshops
  | "community"       // clubs, meetups
  | "infrastructure"; // shared spaces, equipment

type ExpertiseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "professional";

interface HobbyResource extends BaseEntity {
  type: HobbyResourceType;

  // Hobby classification
  hobbies: string[];
  hobby_categories: string[];

  // Location (can be multiple for chains)
  locations: Location[];

  // Expertise targeting
  expertise_levels: ExpertiseLevel[];

  // Temporal patterns
  temporal?: {
    seasonal_relevance?: Season[];
    best_times?: TimeOfDay[];
    booking_requirements?: string;
  };

  // Ecosystem connections
  relationships?: {
    prerequisites?: EntityId[];
    complements?: EntityId[];
    alternatives?: EntityId[];
    next_steps?: EntityId[];
  };

  // Quality indicators
  signals?: {
    community_endorsed: boolean;
    longevity_years?: number;
    price_range?: string;
    accessibility_features?: string[];
  };
}

// ============================================================================
// Aggregate Entity: HobbyEcosystem
// ============================================================================

interface HobbyEcosystem extends BaseEntity {
  hobby: string;
  metro: "twin-cities" | "albuquerque" | "denver";

  // Geographic distribution
  distribution: {
    minneapolis_resources?: number;
    st_paul_resources?: number;
    suburb_resources?: number;
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
    primary_suppliers: EntityId[];
    learning_centers: EntityId[];
    community_hubs: EntityId[];
    infrastructure_access: EntityId[];
  };

  // Temporal patterns
  seasonal_pattern?: "year_round" | "seasonal" | "weather_dependent";
  peak_season?: Season;
  indoor_alternatives?: EntityId[];

  // Community health
  community: {
    estimated_size?: "small" | "medium" | "large";
    growth_trend?: "growing" | "stable" | "declining";
    diversity_indicators?: string[];
    online_presence?: string[];
  };

  // Entry points
  getting_started: {
    first_resource: EntityId;
    expected_investment: string;
    learning_curve: "easy" | "moderate" | "challenging";
    metro_advantages?: string[];
    common_progression?: EntityId[];
  };
}

// ============================================================================
// Export all types
// ============================================================================

export {
  // Base types
  EntityId,
  ISODateTime,
  Confidence,
  BaseEntity,

  // Geographic types
  MetroCity,
  MetroZone,
  Location,

  // Temporal types
  DayOfWeek,
  TimeOfDay,
  Season,
  Hours,
  TemporalPattern,

  // Primary entities
  Place,
  PlaceType,
  VenueSubtype,
  Activity,
  ActivityType,
  ActivityCategory,
  Service,
  ServiceCategory,
  Product,
  ProductCategory,
  ProductSubcategory,
  Group,
  GroupType,
  Event,
  EventRecurrence,

  // Specialized entities
  HobbyResource,
  HobbyResourceType,
  ExpertiseLevel,
  HobbyEcosystem
};