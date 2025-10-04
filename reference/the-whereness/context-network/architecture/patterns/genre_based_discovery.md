# Genre-Based Discovery Strategy

## Problem

Generic searches like "restaurant" or "coffee" yield bland, homogenized results that don't capture the authentic character of a city. The first 10 results tend to be chains and tourist spots, missing local gems and unique experiences.

## Solution

Use specific genre queries that target distinct subcategories of venues, retail, and entertainment. Each genre search yields different venues and provides discovery suggestions for related genres.

## Key Insight from Testing

**Tea Search in Albuquerque revealed:**
- 20 diverse venues: traditional tea houses, bubble tea shops, coffee shops with quality tea
- 10 discovery suggestions: "Tea houses", "Bubble teas", "Coffee and Wi-Fi", etc.
- Each suggestion represents a distinct experiential genre

## Genre Taxonomy

### Food & Beverage Genres

**Coffee Culture:**
- `local coffee roaster`
- `third wave coffee`
- `coffee and wi-fi`
- `coffee and pastries`
- `espresso bar`

**Dining Experiences:**
- `farm-to-table restaurant`
- `asian fusion restaurant`
- `brazilian steakhouse`
- `late night eats`
- `brunch spot`
- `food truck`
- `hole in the wall restaurant`

**Specialty Food:**
- `gluten free bakery`
- `artisan pizza`
- `craft beer and food`
- `wine and cheese`
- `local market`

**Nightlife:**
- `craft cocktail bar`
- `wine bar`
- `microbrewery`
- `dive bar`
- `rooftop bar`

### Retail Genres

**Creative Retail:**
- `independent bookstore`
- `record shop`
- `vintage clothing store`
- `art supplies store`
- `local artist gallery`

**Lifestyle Retail:**
- `outdoor gear shop`
- `bike shop`
- `plant shop`
- `antique store`
- `thrift store`

### Entertainment & Experience Genres

**Live Entertainment:**
- `live music venue`
- `comedy club`
- `open mic night`
- `karaoke bar`
- `jazz club`

**Social Activities:**
- `trivia night`
- `pool hall`
- `board game cafe`
- `arcade bar`
- `bowling alley`

**Cultural:**
- `art gallery opening`
- `poetry reading`
- `book reading`
- `film screening`
- `community theater`

### Wellness & Recreation

**Fitness Culture:**
- `yoga studio`
- `climbing gym`
- `martial arts studio`
- `dance studio`
- `cycling community`

**Outdoor Recreation:**
- `hiking trails`
- `bike paths`
- `dog park`
- `community garden`
- `fishing spots`

## Implementation Strategy

### Phase 1: Core Genres (20-30 searches per city)
Start with highest-impact genres that reveal local character:
- `local coffee roaster`
- `craft cocktail bar`
- `live music venue`
- `independent bookstore`
- `farm-to-table restaurant`

### Phase 2: Discovery Expansion
Use Google's "discover_more_places" suggestions from Phase 1 searches to identify city-specific genres.

### Phase 3: Local Quirks
Add city-specific genres based on local culture:
- **Minneapolis**: `hot dish restaurant`, `hockey bar`
- **Albuquerque**: `green chile restaurant`, `pueblo pottery`
- **Denver**: `dispensary`, `mountain gear shop`

## Technical Implementation

### Search Pattern
```typescript
const coreGenres = [
  "local coffee roaster",
  "craft cocktail bar",
  "live music venue",
  "independent bookstore",
  "farm-to-table restaurant"
];

for (const genre of coreGenres) {
  const results = await searchGoogleLocal(genre, city);
  // Extract venues
  // Extract discovery suggestions for additional genres
}
```

### Results Processing
1. **Venue Extraction**: Pull venue data from search results
2. **Genre Mining**: Extract suggested genres from `discover_more_places`
3. **Local Validation**: Check if suggested genres reflect local culture
4. **Queue Expansion**: Add relevant suggested genres to search queue

## Expected Outcomes

### Better Coverage
- **Generic "restaurant"**: 10 results, mostly chains
- **Genre-specific**: 20+ unique venues per genre, 10+ new genre ideas

### Authentic Character
- Reveals local food culture, nightlife preferences, retail personality
- Captures "third places" where locals actually gather
- Identifies venues that define neighborhood character

### Discovery Suggestions as Intelligence
Google's suggestions reflect actual search patterns and local interest:
- `coffee and wi-fi` suggests remote work culture
- `late night eats` indicates nightlife patterns
- `dog park` reveals pet-friendly community aspects

## Quality Signals

### High-Value Genres (prioritize)
- Generate unique venues not found in generic searches
- Suggest 5+ related genres in discovery section
- Reveal local cultural patterns

### Low-Value Genres (deprioritize)
- Overlap heavily with generic searches
- Generate mostly chain results
- Few or irrelevant discovery suggestions

## Integration with Existing Pipeline

### Discovery Phase
Replace broad category searches with genre-specific searches in `discover_places.ts`

### Extraction Phase
Update venue extraction to capture genre context and discovery suggestions

### Synthesis Phase
Use genre patterns to build neighborhood and activity profiles

### Evaluation Phase
Validate venues appear in appropriate genre contexts