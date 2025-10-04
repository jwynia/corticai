/**
 * Experience & Discovery Entity Extensions for The Whereness System
 *
 * These types extend the base entities with experiential dimensions,
 * research depth layers, and discovery-oriented properties.
 */

import {
  EntityId,
  ISODateTime,
  Confidence,
  BaseEntity,
  Location,
  TimeOfDay,
  Season,
  DayOfWeek
} from './entities';

// ============================================================================
// Research Depth Layers
// ============================================================================

type ResearchLayer =
  | "surface"      // Tourist/official information
  | "functional"   // How things actually work
  | "cultural"     // Unspoken norms and dynamics
  | "underground"; // Informal systems and edge cases

interface LayeredInformation<T> {
  surface?: T;
  functional?: T;
  cultural?: T;
  underground?: T;
}

interface ResearchMetadata {
  layer: ResearchLayer;
  investigation_mode: "observational" | "participatory" | "insider" | "historical";
  confidence: Confidence;
  ethical_considerations?: string[];
  protection_needed?: boolean;
  sources: string[];
  last_verified: ISODateTime;
}

// ============================================================================
// Sensory Experience Types
// ============================================================================

interface SensoryExperience extends BaseEntity {
  sensory_type: "visual" | "sonic" | "taste" | "smell" | "tactile";

  location?: Location;
  associated_places?: EntityId[];

  experience_details: {
    distinctive_elements: string[];
    unique_to_place: boolean;
    intensity: "subtle" | "moderate" | "intense";
    duration?: number; // minutes
  };

  temporal_aspects: {
    best_times?: TimeOfDay[];
    best_seasons?: Season[];
    weather_dependent?: boolean;
    frequency?: "constant" | "regular" | "occasional" | "rare";
  };

  discovery_info: {
    difficulty: "obvious" | "findable" | "hidden" | "secret";
    local_knowledge_required: boolean;
    tourist_known: boolean;
    instagram_famous?: boolean;
  };

  research_layer: ResearchLayer;
}

// ============================================================================
// Discovery Zones
// ============================================================================

interface DiscoveryZone extends BaseEntity {
  zone_type: "serendipity" | "off-path" | "emerging" | "forgotten" | "transitional";

  boundaries?: {
    rough_area: string;
    landmarks: string[];
    avoid_specifics?: boolean; // For protection
  };

  discovery_characteristics: {
    reward_type: ("solitude" | "authenticity" | "surprise" | "connection")[];
    exploration_time: number; // minutes needed
    best_approached: "solo" | "pair" | "group" | "any";
    safety_level: "safe" | "use-caution" | "daylight-only" | "avoid";
  };

  serendipity_factors?: {
    density: "high" | "medium" | "low";
    diversity: "high" | "medium" | "low";
    interaction_likelihood: "high" | "medium" | "low";
    magic_time?: TimeOfDay[];
  };

  evolution_status: {
    trajectory: "gentrifying" | "declining" | "stable" | "cycling";
    discovery_window: "closing" | "stable" | "opening";
    local_sentiment?: string;
  };

  research_layers: LayeredInformation<string>;
}

// ============================================================================
// Temporal Magic Moments
// ============================================================================

interface TemporalMoment extends BaseEntity {
  moment_type: "daily" | "weekly" | "seasonal" | "weather" | "cultural" | "rare";

  trigger_conditions: {
    time?: {
      hour?: number;
      day_of_week?: DayOfWeek[];
      month?: number;
      season?: Season;
    };
    weather?: string[];
    cultural_calendar?: string;
    astronomical?: string;
  };

  experience_window: {
    duration: number; // minutes
    frequency: string;
    predictability: "scheduled" | "approximate" | "unpredictable";
    advance_notice?: number; // minutes
  };

  experience_quality: {
    uniqueness: "high" | "medium" | "low";
    intensity: "subtle" | "moderate" | "dramatic";
    shareability: "solo" | "intimate" | "small-group" | "communal";
    photography_quality?: "exceptional" | "good" | "poor";
  };

  access_info: {
    location: Location;
    accessibility: string;
    cost?: string;
    reservation_needed?: boolean;
    local_knowledge?: string[];
  };
}

// ============================================================================
// Cultural Immersion Opportunities
// ============================================================================

interface CulturalImmersion extends BaseEntity {
  immersion_type: "celebration" | "ritual" | "learning" | "practice" | "observation";
  cultural_group?: string;

  participation_levels: {
    observer: {
      welcome: boolean;
      guidelines?: string[];
    };
    participant: {
      welcome: boolean;
      requirements?: string[];
      preparation?: string[];
    };
    member: {
      path_exists: boolean;
      commitment?: string;
    };
  };

  cultural_authenticity: {
    tourist_oriented: number; // 0-1 scale
    local_participation: number; // 0-1 scale
    tradition_maintained: number; // 0-1 scale
    commercialization: number; // 0-1 scale
  };

  access_methods: {
    public_info: boolean;
    registration?: string;
    invitation_needed: boolean;
    insider_introduction?: boolean;
    discovery_path?: string[];
  };

  sensitivity_notes: {
    photography?: "prohibited" | "restricted" | "ask" | "welcome";
    dress_code?: string;
    behavioral_expectations?: string[];
    language_considerations?: string;
  };

  research_layer: ResearchLayer;
}

// ============================================================================
// Lifestyle Sampling
// ============================================================================

interface LifestyleSample extends BaseEntity {
  lifestyle_aspect: "daily-rhythm" | "work-pattern" | "social-life" |
                   "seasonal-adaptation" | "cultural-practice";
  demographic_group?: string;

  temporal_patterns: {
    daily?: {
      morning?: Activity[];
      afternoon?: Activity[];
      evening?: Activity[];
      late_night?: Activity[];
    };
    weekly?: {
      weekday?: string;
      weekend?: string;
    };
    seasonal?: Map<Season, string>;
  };

  participation_opportunities: {
    observation_points: Location[];
    participation_venues: EntityId[];
    immersion_activities: Activity[];
    time_investment: string;
  };

  cultural_markers: {
    dress_patterns?: string[];
    social_protocols?: string[];
    pace_of_life: "hectic" | "moderate" | "relaxed";
    values_expressed?: string[];
  };

  visitor_accessibility: {
    ease_of_entry: "easy" | "moderate" | "difficult";
    language_barriers?: string;
    cost_barriers?: string;
    social_barriers?: string[];
  };
}

// ============================================================================
// Underground/Informal Systems
// ============================================================================

interface InformalSystem extends BaseEntity {
  system_type: "mutual-aid" | "alternative-economy" | "underground-culture" |
              "survival-network" | "edge-community";

  // Intentionally vague for protection
  general_domain?: string;
  serves_population?: string;

  visibility: {
    surface_visible: boolean;
    signs_to_look_for?: string[];
    intentionally_hidden: boolean;
  };

  participation: {
    entry_points?: string[]; // Vague descriptions
    trust_required: "none" | "some" | "high" | "insider-only";
    risk_level?: "none" | "legal-grey" | "social" | "safety";
  };

  // Ethical documentation
  documentation_ethics: {
    can_document: boolean;
    abstraction_level: "full-detail" | "partial" | "abstract-only" | "do-not-document";
    protection_reason?: string;
    harm_potential?: string;
  };

  research_metadata: ResearchMetadata;
}

// ============================================================================
// Experience Pathways
// ============================================================================

interface ExperiencePathway extends BaseEntity {
  pathway_type: "discovery" | "immersion" | "learning" | "connection";

  target_audience?: {
    life_stage?: string[];
    interests?: string[];
    experience_level?: "beginner" | "intermediate" | "advanced";
  };

  pathway_nodes: {
    sequence: EntityId[];
    optional_detours?: EntityId[];
    time_between?: number[]; // minutes
    transport_mode?: string[];
  };

  experience_arc: {
    opening: string;
    development: string[];
    climax?: string;
    resolution: string;
    total_time: number; // minutes
  };

  seasonal_variations?: Map<Season, {
    available: boolean;
    modifications?: string[];
    alternatives?: EntityId[];
  }>;

  discovery_rewards: {
    guaranteed: string[];
    possible: string[];
    rare: string[];
  };
}

// ============================================================================
// Weekly/Newsletter Content
// ============================================================================

interface NewsletterItem extends BaseEntity {
  item_type: "event" | "opening" | "closing" | "seasonal" | "discovery" | "alert";

  temporal_relevance: {
    valid_from: ISODateTime;
    valid_until: ISODateTime;
    peak_relevance?: ISODateTime;
  };

  audience_targeting: {
    demographics?: string[];
    interests?: string[];
    experience_levels?: string[];
  };

  discovery_value: {
    uniqueness: "high" | "medium" | "low";
    local_character: "high" | "medium" | "low";
    accessibility: "high" | "medium" | "low";
    time_sensitivity: "urgent" | "moderate" | "evergreen";
  };

  content_elements: {
    headline: string;
    summary: string;
    insider_tip?: string;
    visual?: string; // Image reference
    call_to_action?: string;
  };

  verification: {
    confirmed: boolean;
    source_quality: "primary" | "secondary" | "crowd";
    last_checked: ISODateTime;
  };
}

// ============================================================================
// Activity Extensions
// ============================================================================

interface Activity {
  // Additional fields for experiential dimensions
  experience_layers?: LayeredInformation<string>;

  sensory_elements?: {
    primary: ("visual" | "sonic" | "tactile" | "taste" | "smell")[];
    intensity: "high" | "medium" | "low";
  };

  discovery_difficulty?: "tourist-obvious" | "local-known" | "insider-only" | "hidden";

  cultural_significance?: {
    tradition_based: boolean;
    community_role?: string;
    identity_marker?: boolean;
  };

  underground_variants?: {
    exists: boolean;
    access_notes?: string; // Kept vague
    ethical_notes?: string;
  };
}

// ============================================================================
// Export all types
// ============================================================================

export {
  // Research layers
  ResearchLayer,
  LayeredInformation,
  ResearchMetadata,

  // Experience entities
  SensoryExperience,
  DiscoveryZone,
  TemporalMoment,
  CulturalImmersion,
  LifestyleSample,
  InformalSystem,
  ExperiencePathway,
  NewsletterItem,

  // Extended activity
  Activity
};