import { UniversalFallbackAdapter } from './UniversalFallbackAdapter';
import type {
  DomainAdapter,
  Entity,
  FileMetadata,
  Relationship,
  EntityMetadata
} from '../types/entity';

/**
 * Quantity with amount and unit
 */
export interface Quantity {
  amount: number;
  unit: string;
}

/**
 * Ingredient with substitution options
 */
export interface Ingredient {
  name: string;
  amount?: number;
  unit?: string;
  tags?: string[];
  substitutes?: string[];
  category?: string;
}

/**
 * Recipe definition with timing and ingredients
 */
export interface Recipe {
  name: string;
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  totalTime?: number; // minutes
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  ingredients?: Ingredient[];
  instructions?: string;
  cuisine?: string;
  dietary?: string[];
}

/**
 * Pantry item with stock tracking
 */
export interface PantryItem {
  name: string;
  amount: number;
  unit: string;
  category?: string;
  location?: string;
  expiresAt?: string; // ISO date string
  purchasedAt?: string;
}

/**
 * Meal entry for tracking
 */
export interface Meal {
  name: string;
  date?: string;
  recipe?: string;
  servings?: number;
  leftoverAmount?: number;
  storageLocation?: string;
}

/**
 * HouseholdFoodAdapter - Specialized for household food management
 *
 * Extends the Universal Fallback Adapter to provide enhanced analysis
 * for household food management including:
 * - Recipe extraction with timing and ingredient tracking
 * - Pantry inventory management with expiration dates
 * - Ingredient quantity parsing and unit normalization
 * - Meal planning and shopping list generation
 * - Recipe-ingredient matching and substitution detection
 */
export class HouseholdFoodAdapter extends UniversalFallbackAdapter implements DomainAdapter {
  private recipeCounter = 0;
  private ingredientCounter = 0;
  private pantryCounter = 0;

  // Unit conversion map for normalization
  private readonly unitConversions: Record<string, Record<string, number>> = {
    volume: {
      'cup': 240,
      'cups': 240,
      'ml': 1,
      'l': 1000,
      'tsp': 5,
      'tbsp': 15,
      'fl oz': 29.5735
    },
    weight: {
      'g': 1,
      'kg': 1000,
      'oz': 28.35,
      'lb': 453.592,
      'lbs': 453.592
    }
  };

  /**
   * Main extraction method - processes food content and returns enhanced entities
   */
  extract(content: string, metadata: FileMetadata): Entity[] {
    // Get base entities from Universal Fallback Adapter
    const baseEntities = super.extract(content, metadata);

    // Reset counters for each extraction
    this.recipeCounter = 0;
    this.ingredientCounter = 0;
    this.pantryCounter = 0;

    // Try to parse as JSON first
    let foodEntities: Entity[] = [];
    try {
      const jsonData = JSON.parse(content);
      foodEntities = this.extractFoodEntities(jsonData, metadata);
    } catch {
      // If JSON parsing fails, just use base text extraction
      // The adapter will still work for simple text content
    }

    return [...baseEntities, ...foodEntities];
  }

  /**
   * Extract food-specific entities from parsed JSON
   */
  private extractFoodEntities(data: any, metadata: FileMetadata): Entity[] {
    const entities: Entity[] = [];

    // Handle array of items
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.type === 'recipe') {
          entities.push(...this.parseRecipe(item, metadata));
        } else if (item.type === 'ingredient') {
          entities.push(this.parseIngredient(item, metadata));
        } else if (item.type === 'pantry-item') {
          entities.push(this.parsePantryItem(item, metadata));
        } else if (item.type === 'meal') {
          entities.push(this.parseMeal(item, metadata));
        } else if (item.type === 'meal-plan') {
          entities.push(this.parseMealPlan(item, metadata));
        } else if (item.name && item.type === 'recipe') {
          entities.push(...this.parseRecipe(item, metadata));
        }
      }
      return entities;
    }

    // Handle object structure
    if (data.recipes && Array.isArray(data.recipes)) {
      for (const recipe of data.recipes) {
        entities.push(...this.parseRecipe(recipe, metadata));
      }
    }

    // Handle pantry object with type
    if (data.type === 'pantry' && Array.isArray(data.items)) {
      for (const item of data.items) {
        entities.push(this.parsePantryItem(item, metadata));
      }
    }

    if (data.pantry) {
      let items: any[] = [];
      if (Array.isArray(data.pantry)) {
        items = data.pantry;
      } else if (Array.isArray(data.pantry.items)) {
        items = data.pantry.items;
      }
      for (const item of items) {
        entities.push(this.parsePantryItem(item, metadata));
      }
    }

    if (data.ingredients && Array.isArray(data.ingredients)) {
      for (const ingredient of data.ingredients) {
        entities.push(this.parseIngredient(ingredient, metadata));
      }
    }

    if (data.mealPlan || data.meals) {
      const planData = data.mealPlan || data.meals;
      if (Array.isArray(planData)) {
        for (const meal of planData) {
          if (meal.type === 'meal' || meal.date) {
            entities.push(this.parseMeal(meal, metadata));
          }
        }
      } else if (planData.type === 'meal-plan') {
        entities.push(this.parseMealPlan(planData, metadata));
      }
    }

    // Handle single recipe/ingredient/pantry item
    if (data.type === 'recipe' && data.name) {
      entities.push(...this.parseRecipe(data, metadata));
    }

    if (data.type === 'ingredient' && data.name) {
      entities.push(this.parseIngredient(data, metadata));
    }

    if (data.type === 'pantry-item' && data.name) {
      entities.push(this.parsePantryItem(data, metadata));
    }

    if (data.type === 'meal-plan') {
      entities.push(this.parseMealPlan(data, metadata));
    }

    // Generate shopping list if recipes/meals and pantry exist
    if ((data.recipes || data.mealPlan) && data.pantry) {
      entities.push(this.generateShoppingList(data, metadata));
    }

    return entities;
  }

  /**
   * Parse recipe entity
   */
  private parseRecipe(recipe: Recipe, metadata: FileMetadata): Entity[] {
    const entities: Entity[] = [];

    // Skip recipes without name
    if (!recipe.name) {
      return entities;
    }

    const recipeEntity: Entity = {
      id: `recipe_${++this.recipeCounter}_${Date.now()}`,
      type: 'recipe',
      name: recipe.name,
      content: `Recipe: ${recipe.name}`,
      metadata: {
        name: recipe.name,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime || (recipe.prepTime || 0) + (recipe.cookTime || 0),
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine,
        dietary: recipe.dietary,
        canMake: false,
        missing: []
      },
      source: metadata.filePath,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    entities.push(recipeEntity);

    // Extract ingredients as separate entities
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      for (const ingredient of recipe.ingredients) {
        entities.push(this.parseIngredient(ingredient, metadata));
      }
    }

    return entities;
  }

  /**
   * Parse ingredient entity
   */
  private parseIngredient(ingredient: Ingredient, metadata: FileMetadata): Entity {
    const entity: Entity = {
      id: `ingredient_${++this.ingredientCounter}_${Date.now()}`,
      type: 'ingredient',
      name: ingredient.name,
      content: `Ingredient: ${ingredient.name}`,
      metadata: {
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit || 'count',
        category: ingredient.category,
        tags: ingredient.tags || [],
        substitutes: ingredient.substitutes || []
      },
      source: metadata.filePath,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return entity;
  }

  /**
   * Parse pantry item entity
   */
  private parsePantryItem(item: PantryItem, metadata: FileMetadata): Entity {
    const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
    const now = new Date();
    let expiringFlag = 'good';

    if (expiresAt) {
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) {
        expiringFlag = 'expired';
      } else if (daysUntilExpiry < 3) {
        expiringFlag = 'soon';
      }
    }

    const entity: Entity = {
      id: `pantry_${++this.pantryCounter}_${Date.now()}`,
      type: 'pantry-item',
      name: item.name,
      content: `Pantry Item: ${item.name}`,
      metadata: {
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        location: item.location,
        expiresAt: item.expiresAt,
        expiringFlag: expiringFlag,
        purchasedAt: item.purchasedAt
      },
      source: metadata.filePath,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return entity;
  }

  /**
   * Parse meal entity
   */
  private parseMeal(meal: Meal, metadata: FileMetadata): Entity {
    const entity: Entity = {
      id: `meal_${Date.now()}`,
      type: 'meal',
      name: meal.name,
      content: `Meal: ${meal.name}`,
      metadata: {
        name: meal.name,
        date: meal.date,
        recipe: meal.recipe,
        servings: meal.servings,
        leftoverAmount: meal.leftoverAmount,
        storageLocation: meal.storageLocation
      },
      source: metadata.filePath,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return entity;
  }

  /**
   * Parse meal plan entity
   */
  private parseMealPlan(plan: any, metadata: FileMetadata): Entity {
    const entity: Entity = {
      id: `meal-plan_${Date.now()}`,
      type: 'meal-plan',
      name: plan.week || plan.name || 'Meal Plan',
      content: `Meal Plan: ${plan.week || 'Weekly'}`,
      metadata: {
        week: plan.week,
        meals: plan.meals || []
      },
      source: metadata.filePath,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return entity;
  }

  /**
   * Generate shopping list entity
   */
  private generateShoppingList(data: any, metadata: FileMetadata): Entity {
    const recipes = data.recipes || [];
    let pantry: any[] = [];
    if (Array.isArray(data.pantry)) {
      pantry = data.pantry;
    } else if (data.pantry && Array.isArray(data.pantry.items)) {
      pantry = data.pantry.items;
    }

    // Collect all needed ingredients
    const neededItems = new Map<string, Quantity>();

    for (const recipe of recipes) {
      if (recipe.ingredients) {
        for (const ingredient of recipe.ingredients) {
          const key = ingredient.name.toLowerCase();
          if (neededItems.has(key)) {
            const existing = neededItems.get(key)!;
            existing.amount += ingredient.amount || 0;
          } else {
            neededItems.set(key, {
              amount: ingredient.amount || 0,
              unit: ingredient.unit || 'unit'
            });
          }
        }
      }
    }

    // Handle meals from meal plans
    if (data.mealPlan && Array.isArray(data.mealPlan)) {
      for (const mealEntry of data.mealPlan) {
        if (mealEntry.meal || mealEntry.recipe) {
          // Try to find matching recipe
          const recipeName = mealEntry.meal || mealEntry.recipe;
          const matchingRecipe = recipes.find(r => r.name === recipeName);
          if (matchingRecipe && matchingRecipe.ingredients) {
            for (const ingredient of matchingRecipe.ingredients) {
              const key = ingredient.name.toLowerCase();
              if (neededItems.has(key)) {
                const existing = neededItems.get(key)!;
                existing.amount += ingredient.amount || 0;
              } else {
                neededItems.set(key, {
                  amount: ingredient.amount || 0,
                  unit: ingredient.unit || 'unit'
                });
              }
            }
          }
        }
      }
    }

    // Remove items already in pantry
    const pantryMap = new Map<string, Quantity>();
    for (const item of pantry) {
      pantryMap.set(item.name.toLowerCase(), {
        amount: item.amount,
        unit: item.unit
      });
    }

    for (const [key] of neededItems) {
      if (pantryMap.has(key)) {
        neededItems.delete(key);
      }
    }

    const entity: Entity = {
      id: `shopping-list_${Date.now()}`,
      type: 'shopping-list',
      name: 'Shopping List',
      content: 'Generated shopping list from recipes',
      metadata: {
        items: Array.from(neededItems.entries()).map(([name, quantity]) => ({
          name,
          amount: quantity.amount,
          unit: quantity.unit
        }))
      },
      source: metadata.filePath,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return entity;
  }

  /**
   * Detect relationships between food entities
   */
  detectRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];

    // Find recipe and ingredient entities
    const recipes = entities.filter(e => e.type === 'recipe');
    const ingredients = entities.filter(e => e.type === 'ingredient');
    const pantryItems = entities.filter(e => e.type === 'pantry-item');
    const meals = entities.filter(e => e.type === 'meal');

    // REQUIRES: Recipe requires ingredients
    for (const recipe of recipes) {
      for (const ingredient of ingredients) {
        if (recipe.content?.toLowerCase().includes(ingredient.name?.toLowerCase())) {
          relationships.push({
            id: `rel_${Date.now()}_${Math.random()}`,
            type: 'REQUIRES',
            source: recipe.id,
            target: ingredient.id,
            metadata: {
              description: `${recipe.name} requires ${ingredient.name}`
            }
          });
        }
      }
    }

    // IS: PantryItem is an Ingredient
    for (const pantry of pantryItems) {
      for (const ingredient of ingredients) {
        if (this.normalizeName(pantry.name) === this.normalizeName(ingredient.name)) {
          relationships.push({
            id: `rel_${Date.now()}_${Math.random()}`,
            type: 'IS',
            source: pantry.id,
            target: ingredient.id,
            metadata: {
              description: `${pantry.name} is available in pantry`
            }
          });
        }
      }
    }

    // USES: Meal uses recipe
    for (const meal of meals) {
      if (meal.metadata?.recipe) {
        const recipe = recipes.find(r => this.normalizeName(r.name) === this.normalizeName(meal.metadata?.recipe));
        if (recipe) {
          relationships.push({
            id: `rel_${Date.now()}_${Math.random()}`,
            type: 'USES',
            source: meal.id,
            target: recipe.id,
            metadata: {
              description: `${meal.name} uses recipe ${recipe.name}`
            }
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Normalize name for comparison
   */
  private normalizeName(name: string | undefined): string {
    if (!name) return '';
    return name.toLowerCase().trim();
  }

  /**
   * Normalize unit for comparison
   */
  private normalizeUnit(unit: string): string {
    if (!unit) return 'count';
    const normalized = unit.toLowerCase().trim();
    return normalized;
  }
}
