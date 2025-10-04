# Intent-Based Classification Pattern

## Overview

Services and places must be classified not just by what they are, but by the intents they serve. The same category of service can meet wildly different needs, and our classification should reflect this reality.

## Core Pattern: Same Service, Different Needs

### The Problem
A search for "gym" returns everything from Planet Fitness to CrossFit boxes to climbing gyms, treating them as interchangeable. But someone seeking each has fundamentally different needs.

### The Solution
Classify entities by the user intent they serve, then match operational details to those intents.

## Intent Classification Examples

### Fitness/Gym Services

**Intent: Get Healthy Cheaply**
- Entities: Planet Fitness, YMCA, community centers
- Key factors: Low cost, no commitment, basic equipment
- Operational needs: Hours, crowding patterns, equipment availability

**Intent: Build Community**
- Entities: CrossFit boxes, boutique studios, run clubs
- Key factors: Group classes, social aspect, consistent members
- Operational needs: Class schedules, membership culture, beginner-friendly?

**Intent: Serious Training**
- Entities: Powerlifting gyms, sport-specific facilities
- Key factors: Specialized equipment, coaching, competitive atmosphere
- Operational needs: Peak hours, equipment policies, coaching availability

**Intent: Convenient Exercise**
- Entities: 24-hour chains, hotel gyms, apartment facilities
- Key factors: Location, hours, quick in/out
- Operational needs: Keycard access, parking, shower facilities

### Coffee Venues

**Intent: Workspace**
- Entities: Cafes with wifi, quiet coffee shops
- Key factors: Outlets, wifi reliability, seating, noise level
- Operational needs: Busy hours, laptop policies, purchase expectations

**Intent: Coffee Quality**
- Entities: Third-wave shops, roasters
- Key factors: Bean origin, brew methods, expertise
- Operational needs: Pour-over wait times, cupping schedules

**Intent: Quick Caffeine**
- Entities: Drive-throughs, Starbucks, Dutch Bros
- Key factors: Speed, consistency, convenience
- Operational needs: Drive-through lines, mobile ordering, peak times

**Intent: Social Meeting**
- Entities: Comfortable cafes, hotel lobbies with coffee
- Key factors: Comfortable seating, easy to find, parking
- Operational needs: Table availability, noise level, duration tolerance

### Religious Services

**Intent: Spiritual Community**
- Focus: Fellowship, programs, social connection
- Operational: Coffee hours, small groups, volunteer opportunities

**Intent: Traditional Worship**
- Focus: Liturgy style, denomination specifics, music type
- Operational: Service times, dress code, language options

**Intent: Family Programs**
- Focus: Sunday school, youth groups, family events
- Operational: Childcare, family service times, kid-friendly spaces

**Intent: Life Events**
- Focus: Weddings, funerals, counseling
- Operational: Availability, requirements for non-members, costs

### Laundry Services

**Intent: No Washer/Dryer**
- Service: Laundromats
- Key factors: Machine availability, safety, payment methods
- Operational: 24-hour access, change machines, wifi

**Intent: Professional Clothes Care**
- Service: Dry cleaning
- Key factors: Quality, turnaround, special services
- Operational: Rush service, leather/suede, alterations

**Intent: Time Saving**
- Service: Fluff-and-fold
- Key factors: Price, turnaround, care level
- Operational: Minimum pounds, pickup times, sorting preferences

**Intent: Ultimate Convenience**
- Service: Pickup/delivery
- Key factors: Scheduling, app quality, building access
- Operational: Delivery windows, communication, special instructions

## Intent Matching Framework

### 1. Identify Core Intents
For each service category, identify 3-7 distinct user intents based on:
- Problem being solved
- User situation/constraints
- Desired outcome
- Values/priorities

### 2. Map Entities to Intents
Each entity can serve multiple intents with different effectiveness:
```
Entity: Local Coffee Roaster
- Workspace: Medium (depends on specific location)
- Coffee Quality: High
- Quick Caffeine: Low
- Social Meeting: Medium-High
```

### 3. Capture Intent-Specific Operations
Different intents care about different operational details:
```
Intent: Workspace
- Critical: Wifi password, outlet locations, laptop policies
- Important: Busy hours, seating types, purchase pressure
- Nice-to-have: Printer, private rooms, parking

Intent: Coffee Quality
- Critical: Roast dates, brew methods, bean origins
- Important: Barista knowledge, cupping events, prices
- Nice-to-have: Retail beans, brewing equipment, classes
```

## Anti-Patterns to Avoid

### The "Best" Trap
Don't rank "best gym" - instead show "best gym for serious powerlifting" vs "best gym for families" vs "best gym for quick workouts"

### The Feature List
Don't list features without context. "Has pool" matters differently to lap swimmers vs parents vs rehab patients.

### The False Equivalence
Don't treat all entities in a category as substitutes. A climbing gym doesn't substitute for a yoga studio just because both are "fitness."

## Implementation in Code

```typescript
interface Intent {
  id: string
  name: string
  description: string
  keywords: string[]  // Search terms that indicate this intent
  requirements: Requirement[]  // Must-haves for this intent
  nice_to_haves: string[]  // Bonus features
  anti_patterns: string[]  // Things that disqualify
  operational_focus: string[]  // What details matter most
}

interface EntityIntentMatch {
  entity_id: string
  intent_id: string
  match_strength: "perfect" | "good" | "acceptable" | "poor"
  match_reasons: string[]
  missing_elements: string[]
  operational_notes: string[]  // Intent-specific operational details
}
```

## Benefits of Intent Classification

1. **Better Matches**: Users find what they actually need, not just what's popular
2. **Clearer Communication**: Entities understand which market they serve
3. **Reduced Disappointment**: Fewer mismatched expectations
4. **Operational Relevance**: Collect the details that matter for each intent
5. **Multiple Perspectives**: Same entity viewed through different lenses

## Application Examples

### Query: "I need a gym"
Instead of returning all gyms, ask or infer:
- Budget conscious? → Planet Fitness, YMCA
- Want coaching? → CrossFit, personal training gyms
- Hate crowds? → 24-hour access, off-peak times
- Specific goals? → Powerlifting, climbing, swimming

### Query: "Coffee shop"
Instead of all coffee venues:
- Need to work? → Shops with wifi and outlets
- Meeting someone? → Easy parking, comfortable seating
- Coffee snob? → Third-wave, single origin
- In a rush? → Drive-through, mobile order

This pattern transforms our data from a directory into a decision support system.