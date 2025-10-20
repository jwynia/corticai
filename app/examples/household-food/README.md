# HouseholdFoodAdapter Examples

This directory demonstrates the HouseholdFoodAdapter for practical household food management, including pantry tracking, meal planning, recipe organization, and shopping list generation.

## Overview

The HouseholdFoodAdapter enables you to:
- **Track pantry inventory** with expiration dates and storage locations
- **Organize recipes** with timing, difficulty, and dietary information
- **Plan weekly meals** and track what you're cooking
- **Generate shopping lists** automatically from meal plans
- **Detect ingredient substitutions** and alternatives
- **Analyze relationships** between recipes and ingredients

## Example Data

### seattle-kitchen-data.json

A realistic household kitchen dataset including:

**Pantry (10 items)**
- Grains: pasta, rice
- Proteins: chicken breast
- Vegetables: broccoli, garlic
- Dairy: butter, milk
- Oils & seasonings: olive oil, basil
- Pantry staples: canned tomatoes

**Recipes (4 recipes)**
1. **Quick Pasta Marinara** - Easy, 20 min, vegetarian
2. **Chicken and Broccoli Stir Fry** - Medium, 25 min, gluten-free
3. **Creamy Pasta Alfredo** - Easy, 25 min, vegetarian
4. **Simple Garlic Rice** - Easy, 22 min, vegan

**Meal Plan (1 week)**
- Monday: Pasta Marinara
- Tuesday: Chicken & Broccoli
- Wednesday: Alfredo
- Thursday: Pasta Marinara
- Friday: Chicken & Broccoli
- Saturday: Garlic Rice
- Sunday: Alfredo

## Usage Examples

### Example 1: Load Household Data

```typescript
import { HouseholdFoodAdapter } from '../../src/adapters/HouseholdFoodAdapter';

const adapter = new HouseholdFoodAdapter();
const content = fs.readFileSync('seattle-kitchen-data.json', 'utf-8');
const entities = adapter.extract(content, fileMetadata);

// 35+ entities extracted:
// - 4 recipes with 16+ ingredients
// - 10 pantry items
// - 7 meal plan entries
// - 1 auto-generated shopping list
```

### Example 2: Query Recipes by Difficulty

```typescript
const recipes = entities.filter(e => e.type === 'recipe');
const easyRecipes = recipes.filter(r => r.metadata?.difficulty === 'easy');

// Output: 3 easy recipes for quick weeknight dinners
```

### Example 3: Find Available Recipes

```typescript
const recipes = entities.filter(e => e.type === 'recipe');
const pantryItems = entities.filter(e => e.type === 'pantry-item');

// Check which recipes can be made with current ingredients
```

### Example 4: Check Pantry Inventory

```typescript
const pantryItems = entities.filter(e => e.type === 'pantry-item');

// Display inventory by category and storage location
// Show quantities and expiration status
```

### Example 5: Items Expiring Soon

```typescript
const expiringItems = pantryItems.filter(
  p => p.metadata?.expiringFlag === 'soon'
    || p.metadata?.expiringFlag === 'expired'
);

// Flag items that need to be used urgently
// Basil expires in 7 days → prioritize for this week's meals
```

### Example 6: Ingredient Substitutions

```typescript
const ingredients = entities.filter(e => e.type === 'ingredient');
const withSubstitutes = ingredients.filter(
  i => i.metadata?.substitutes?.length > 0
);

// Example: Basil can be substituted with oregano or parsley
//          Oil can be substituted with sesame oil or vegetable oil
```

### Example 7: Analyze Relationships

```typescript
const relationships = adapter.detectRelationships(entities);

// Relationship types:
// - REQUIRES: Recipe requires Ingredient
// - IS: PantryItem is Ingredient (stock check)
// - USES: Meal uses Recipe
```

### Example 8: Generate Shopping List

```typescript
const shoppingList = entities.find(e => e.type === 'shopping-list');

// Auto-generated from:
// 1. All recipes in meal plan
// 2. Minus items already in pantry
// 3. Consolidated and summed by ingredient
```

## Data Structure

### Recipe

```typescript
interface Recipe {
  name: string;
  prepTime?: number;           // minutes
  cookTime?: number;           // minutes
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietary?: string[];          // vegan, vegetarian, gluten-free, etc.
  ingredients?: Ingredient[];
}
```

### Ingredient

```typescript
interface Ingredient {
  name: string;
  amount?: number;
  unit?: string;               // cups, lbs, oz, count, tbsp, etc.
  category?: string;
  tags?: string[];             // allergen info
  substitutes?: string[];      // alternatives
}
```

### PantryItem

```typescript
interface PantryItem {
  name: string;
  amount: number;
  unit: string;
  category?: string;
  location?: string;           // cabinet, refrigerator, freezer
  expiresAt?: string;          // ISO date
  purchasedAt?: string;
}
```

### Meal

```typescript
interface Meal {
  name: string;
  date?: string;
  recipe?: string;             // recipe name
  servings?: number;
  leftoverAmount?: number;
  storageLocation?: string;
}
```

## Key Features

### 1. Expiration Tracking

- Items expiring within 3 days flagged as `expiringFlag: 'soon'`
- Expired items flagged as `expiringFlag: 'expired'`
- Helps reduce food waste

### 2. Quantity Normalization

Supports multiple unit types:
- **Volume**: cups, ml, tbsp, tsp, fl oz
- **Weight**: g, kg, oz, lb
- **Count**: individual items (eggs, cloves)
- **Custom**: vague quantities (bunch, head)

### 3. Ingredient Matching

- Case-insensitive matching (Chicken = chicken)
- Substitution detection (can use oil instead of butter)
- Dietary filtering (find vegan recipes, etc.)

### 4. Automatic Relationships

Detects:
- Recipe → Ingredients (REQUIRES)
- Pantry → Ingredients (IS)
- Meals → Recipes (USES)

### 5. Smart Shopping Lists

- Aggregates ingredients from meal plan
- Avoids duplicates (combines quantities)
- Excludes items already in pantry
- Ready for shopping trip

## Real-World Applications

### Meal Planning
- Plan weekly dinners considering expiration dates
- Rotate recipes to reduce waste
- Balance dietary needs

### Budget Management
- Track ingredient costs
- Compare unit prices
- Plan efficient shopping trips

### Allergy Management
- Filter recipes by dietary restrictions
- Track ingredient substitutes
- Warn about allergens

### Food Waste Reduction
- Use items before expiration
- Suggest recipes based on pantry contents
- Track leftovers for reuse

### Meal Prep
- Calculate quantities for batch cooking
- Generate shopping lists for multiple weeks
- Track which dishes freeze well

## Running the Examples

### TypeScript

```bash
npx ts-node examples/household-food/household-food-usage.ts
```

### With npm

```bash
npm run examples:household-food
```

## Integration with CorticAI

The HouseholdFoodAdapter demonstrates:

✅ **Domain Versatility** - Works with structured household data (like Code and Narrative domains)
✅ **Quantity Handling** - Processes numeric data with units (new pattern)
✅ **Temporal Logic** - Handles dates, schedules, and expiration
✅ **Relationship Detection** - Finds connections between entities
✅ **Practical Queries** - Supports real-world use cases

## Test Coverage

41 comprehensive tests covering:
- Recipe extraction and timing
- Ingredient parsing with quantities
- Pantry inventory management
- Expiration date handling
- Recipe-ingredient matching
- Shopping list generation
- Meal planning
- Relationship detection
- Edge cases and error handling

**Current Pass Rate**: 35/41 tests (85%)

## Future Enhancements

### Possible Extensions
- Nutritional analysis (calories, macros, micros)
- Cost tracking and budget optimization
- Recipe ratings and reviews
- Integration with grocery APIs
- Seasonal ingredient awareness
- Meal prep containers and storage
- Batch cooking strategies
- Dietary compliance checking
- Nutrition goals tracking

### Storage Integration
- Save pantry snapshots over time
- Track shopping history
- Recipe usage analytics
- Cost trends

### Query Patterns
- "What can I make with chicken and rice?"
- "What's expiring in the next 3 days?"
- "Vegetarian meals under 30 minutes?"
- "Budget-friendly dinners this week?"
- "Use up the basil before it expires"

## Related Documentation

- **Universal Fallback Adapter** - Base text extraction pattern
- **PlaceDomainAdapter** - Spatial/temporal pattern
- **CodebaseAdapter** - Complex structure extraction
- **Adapter Pattern** - How domain adapters work

## Contributing Examples

To add new household food examples:

1. Create `[cuisine]-[household-type].json` (e.g., `japanese-student.json`)
2. Include 10+ pantry items, 5+ recipes, 1-week meal plan
3. Add usage examples showing unique features
4. Update this README with the new scenario

## Notes

- This adapter focuses on practical household needs, not nutrition science
- Expiration flagging uses calendar dates (not precise time tracking)
- Substitution suggestions are generic (context-specific ones would benefit from external knowledge base)
- Shopping list generation is ingredient-based (no store-specific pricing)
