# Discovery & Experience Pattern

## Overview

This pattern defines how The Whereness System captures and organizes experiential and discovery-oriented information about places. Unlike survival/navigation guides, this focuses on engagement, exploration, and temporary lifestyle sampling for visitors and locals seeking fresh perspectives.

## Core Philosophy

**Experience-First Documentation**

Rather than just listing what exists, we capture:
- How things feel, sound, taste, smell
- What makes experiences distinctive
- How to participate, not just observe
- Temporal and seasonal magic moments
- Serendipity zones and discovery rewards

## Sensory Dimension Mapping

### Visual Experiences

```typescript
interface VisualExperience {
  type: "view" | "architecture" | "art" | "natural" | "street-scene";

  distinctive_elements: {
    unique_to_place: string[];
    best_viewing: {
      time_of_day?: TimeOfDay;
      season?: Season;
      weather?: string[];
    };
    instagram_vs_reality: {
      oversaturated: boolean;
      hidden_gems: string[];
      local_favorites: string[];
    };
  };

  accessibility: {
    physical_access: string;
    crowd_levels: TimeBasedCrowds;
    photography_restrictions?: string;
  };
}
```

### Sonic Experiences

```typescript
interface SonicExperience {
  type: "ambient" | "musical" | "natural" | "urban" | "cultural";

  soundscape: {
    characteristic_sounds: string[];
    quiet_spots: Location[];
    acoustic_qualities: string;
    best_listening: {
      venues?: EntityId[];
      outdoor?: Location[];
      unexpected?: string[];
    };
  };

  music_ecology: {
    live_music_density: "high" | "medium" | "low";
    genre_strengths: string[];
    venue_acoustics: Map<EntityId, string>;
  };
}
```

### Taste Landscapes

```typescript
interface TasteExperience {
  type: "local-specialty" | "fusion" | "traditional" | "seasonal";

  distinctive_flavors: {
    only_here: string[];
    done_best_here: string[];
    local_variations: string[];
    seasonal_specialties: Map<Season, string[]>;
  };

  discovery_paths: {
    tourist_obvious: EntityId[];
    local_hidden: EntityId[];
    insider_required: string[];
    time_specific: TemporalTaste[];
  };

  cultural_fusion: {
    immigrant_adaptations: string[];
    local_ingredients: string[];
    hybrid_cuisines: string[];
  };
}
```

### Tactile Experiences

```typescript
interface TactileExperience {
  type: "texture" | "temperature" | "physical-activity" | "hands-on";

  physical_engagement: {
    materials: string[];  // Local stone, prairie grass, lake water
    temperatures: string[]; // Winter wind, summer humidity
    activities: ActivityId[];
    craft_opportunities: EntityId[];
  };

  seasonal_touch: {
    winter: string[]; // Ice fishing, snow sculpture
    summer: string[]; // Lake swimming, outdoor yoga
    transitions: string[]; // Fall leaves, spring mud
  };
}
```

## Cultural Immersion Dimensions

### Celebration & Ritual Access

```typescript
interface CelebrationAccess {
  event_type: "festival" | "ceremony" | "tradition" | "seasonal";

  participation_levels: {
    observer_welcome: boolean;
    participant_welcome: boolean;
    invitation_required: boolean;
    cultural_sensitivity: string[];
  };

  discovery_methods: {
    advertised: boolean;
    word_of_mouth: boolean;
    community_calendars: string[];
    insider_knowledge: boolean;
  };

  authenticity_markers: {
    tourist_oriented: number; // 0-1 scale
    local_participation: number; // 0-1 scale
    cultural_integrity: number; // 0-1 scale
  };
}
```

### Learning & Skill Opportunities

```typescript
interface LearningOpportunity {
  type: "workshop" | "class" | "apprenticeship" | "informal";
  skill_category: string;

  access_model: {
    drop_in: boolean;
    registration: "required" | "recommended" | "none";
    commitment: "single" | "series" | "ongoing";
    cost_structure: string;
  };

  learning_style: {
    hands_on: boolean;
    observation: boolean;
    mentorship: boolean;
    peer_learning: boolean;
  };

  cultural_exchange: {
    locals_present: boolean;
    language_barriers?: string;
    cultural_context: boolean;
  };
}
```

## Discovery Adventure Patterns

### Off-Path Discovery Zones

```typescript
interface DiscoveryZone {
  zone_type: "emerging" | "forgotten" | "hidden" | "transitional";

  discovery_rewards: {
    solitude: boolean;
    authenticity: boolean;
    surprise_factor: "high" | "medium" | "low";
    local_interaction: boolean;
  };

  navigation: {
    difficulty: "easy" | "moderate" | "challenging";
    safety_considerations: string[];
    best_explored: "solo" | "pair" | "group";
    time_investment: number; // minutes
  };

  evolution_stage: {
    trajectory: "gentrifying" | "declining" | "stable" | "cycling";
    discovery_window: string; // "closing fast", "wide open"
    local_sentiment: string;
  };
}
```

### Temporal Magic Moments

```typescript
interface TemporalMoment {
  trigger: "time" | "season" | "weather" | "event";

  timing: {
    frequency: "daily" | "weekly" | "monthly" | "annual" | "rare";
    duration: number; // minutes
    predictability: "scheduled" | "approximate" | "unpredictable";
    local_knowledge: boolean;
  };

  experience_quality: {
    uniqueness: "high" | "medium" | "low";
    intensity: "subtle" | "moderate" | "dramatic";
    shareability: "solo" | "intimate" | "communal";
  };

  examples: {
    golden_hour_spots: Location[];
    seasonal_phenomena: string[];
    cultural_rhythms: string[];
    weather_dependent: string[];
  };
}
```

### Serendipity Engines

```typescript
interface SerendipityZone {
  zone_type: "wandering" | "conversation" | "discovery" | "connection";

  serendipity_factors: {
    density: "high" | "medium" | "low";
    diversity: "high" | "medium" | "low";
    openness: "high" | "medium" | "low";
    time_required: number; // minutes to "activate"
  };

  best_practices: {
    optimal_times: TimeOfDay[];
    avoiding_crowds: string[];
    conversation_starters: string[];
    local_protocols: string[];
  };
}
```

## Lifestyle Sampling Patterns

### Daily Rhythm Immersion

```typescript
interface DailyRhythm {
  demographic: string;

  temporal_pattern: {
    wake_time: string;
    morning_routine: Activity[];
    work_pattern: string;
    evening_activities: Activity[];
    weekend_different: boolean;
  };

  participation_points: {
    morning: Location[];
    afternoon: Location[];
    evening: Location[];
    late_night: Location[];
  };

  cultural_markers: {
    dress_codes: string[];
    social_norms: string[];
    pace_of_life: "fast" | "moderate" | "slow";
    interaction_style: string;
  };
}
```

### Seasonal Lifestyle Adaptation

```typescript
interface SeasonalAdaptation {
  season: Season;

  lifestyle_shifts: {
    activity_changes: Map<Activity, Activity>; // Summer->Winter substitutions
    clothing_essentials: string[];
    social_patterns: string[];
    mood_management: string[];
  };

  local_wisdom: {
    survival_tips: string[];
    enjoyment_hacks: string[];
    gear_requirements: string[];
    attitude_adjustments: string[];
  };

  visitor_participation: {
    minimum_stay: number; // days to appreciate
    essential_experiences: string[];
    local_immersion: string[];
  };
}
```

## Demographic Lens System

### Life Stage Lenses

```typescript
interface LifeStageLens {
  stage: "young-adult" | "family-young" | "family-teen" |
         "empty-nester" | "active-retiree";

  priority_experiences: {
    social: EntityId[];
    learning: EntityId[];
    adventure: EntityId[];
    relaxation: EntityId[];
  };

  constraints: {
    budget: string;
    time: string;
    mobility: string;
    interests: string[];
  };

  discovery_patterns: {
    information_sources: string[];
    decision_factors: string[];
    social_dynamics: string[];
  };
}
```

### Social Configuration Lenses

```typescript
interface SocialConfiguration {
  configuration: "solo" | "couple" | "friends" | "multi-gen" | "group";

  optimal_experiences: {
    size_appropriate: EntityId[];
    interaction_level: string;
    flexibility_required: boolean;
    planning_complexity: "low" | "medium" | "high";
  };

  social_dynamics: {
    bonding_activities: Activity[];
    stress_points: string[];
    success_factors: string[];
  };
}
```

## Weekly Discovery Updates

### Newsletter Research Protocol

```typescript
interface NewsletterResearch {
  week_number: number;

  recurring_searches: {
    new_openings: Source[];
    events_this_week: Source[];
    seasonal_highlights: Source[];
    community_announcements: Source[];
  };

  rotation_focus: {
    week_1: "families";
    week_2: "young-adults";
    week_3: "arts-culture";
    week_4: "outdoor-wellness";
  };

  quality_filters: {
    authenticity: boolean;
    accessibility: boolean;
    discovery_value: boolean;
    community_connection: boolean;
    seasonal_relevance: boolean;
  };
}
```

### Event Discovery Patterns

```typescript
interface EventDiscovery {
  source_hierarchy: [
    "local_community_calendars",
    "venue_direct",
    "social_media_local",
    "aggregators",
    "word_of_mouth"
  ];

  event_evaluation: {
    local_vs_franchise: number;
    community_involvement: number;
    accessibility_score: number;
    uniqueness_factor: number;
  };

  temporal_categories: {
    this_week: Event[];
    this_month: Event[];
    seasonal: Event[];
    annual_traditions: Event[];
  };
}
```

## Twin Cities Specific Experience Patterns

### Weather-Dependent Experiences

```yaml
winter_exclusive:
  - ice_castles: "Stillwater - January-February only"
  - pond_hockey: "Local tournaments on frozen lakes"
  - luminary_loppet: "Lake of the Isles ski and walk"
  - winter_carnival: "St. Paul tradition since 1886"

summer_exclusive:
  - lake_swimming: "Beach culture emerges May-September"
  - patio_season: "Outdoor dining April-October"
  - farmers_markets: "Peak June-September"
  - outdoor_concerts: "Free music May-September"

transition_magic:
  - fall_colors: "Peak viewing late September"
  - spring_melt: "Dramatic river changes March-April"
  - first_nice_day: "City-wide emergence phenomenon"
  - last_nice_day: "Melancholy outdoor gatherings"
```

### Cultural Crossroads

```yaml
immigrant_experiences:
  somali:
    - cedar_riverside: "Little Mogadishu"
    - karmel_mall: "Somali shopping center"
    - safari_restaurant: "Community gathering"

  hmong:
    - hmongtown_marketplace: "Weekend cultural hub"
    - hmong_new_year: "November celebration"
    - farm_direct_sales: "Local farming network"

  latinx:
    - mercado_central: "Lake Street marketplace"
    - el_burrito: "Grocery and community"
    - day_of_dead: "November celebrations"

fusion_points:
  - midtown_global_market: "Multiple cultures"
  - university_avenue: "Asian corridor"
  - northeast: "New immigrant businesses"
```

## Quality Validation

### Experience Documentation Checklist

- [ ] **Sensory details**: Beyond just visual
- [ ] **Temporal specificity**: When is best
- [ ] **Access clarity**: How to participate
- [ ] **Cultural sensitivity**: Appropriate engagement
- [ ] **Local distinction**: Why here vs anywhere
- [ ] **Insider knowledge**: Beyond tourist level
- [ ] **Practical details**: Cost, time, requirements
- [ ] **Social dynamics**: Who's there and why

## Implementation Notes

### For Extraction
- Prioritize first-person accounts
- Note temporal and seasonal variations
- Capture sensory descriptions
- Document participation barriers

### For Synthesis
- Connect experiences to demographics
- Build discovery pathways
- Note evolution and change
- Create serendipity maps

### For Publication
- Layer by visitor type
- Highlight temporal opportunities
- Provide participation guidance
- Include local context

## Metadata

- **Pattern Type:** Experience Documentation
- **Stability:** Core
- **Created:** 2024-09-17
- **Updated:** 2024-09-17
- **Status:** Active
- **Source:** Adapted from place-exploration.md

## Change History

- 2024-09-17: Initial creation from place-exploration.md focusing on discovery and experience