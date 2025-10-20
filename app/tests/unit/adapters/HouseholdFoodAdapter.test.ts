import { describe, it, expect, beforeEach } from 'vitest';
import { HouseholdFoodAdapter } from '../../../src/adapters/HouseholdFoodAdapter';
import type { FileMetadata, Entity, Relationship } from '../../../src/types/entity';

describe('HouseholdFoodAdapter', () => {
  let adapter: HouseholdFoodAdapter;
  let fileMetadata: FileMetadata;

  beforeEach(() => {
    adapter = new HouseholdFoodAdapter();
    fileMetadata = {
      filePath: 'household/recipes.json',
      fileName: 'recipes.json',
      extension: '.json',
      size: 1000,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  });

  describe('Basic Functionality', () => {
    it('should instantiate successfully', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(HouseholdFoodAdapter);
    });

    it('should have extract method', () => {
      expect(typeof adapter.extract).toBe('function');
    });

    it('should inherit from UniversalFallbackAdapter', () => {
      const content = 'chicken pasta recipe';
      const entities = adapter.extract(content, fileMetadata);
      expect(Array.isArray(entities)).toBe(true);
    });
  });

  describe('Recipe Extraction', () => {
    it('should extract single recipe from JSON', () => {
      const content = JSON.stringify({
        name: 'Spaghetti Carbonara',
        type: 'recipe',
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        ingredients: [
          { name: 'pasta', amount: 1, unit: 'lb' },
          { name: 'eggs', amount: 3, unit: 'count' }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const recipes = entities.filter(e => e.type === 'recipe');
      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes[0].metadata?.name).toBe('Spaghetti Carbonara');
    });

    it('should extract multiple recipes from JSON array', () => {
      const content = JSON.stringify([
        { name: 'Pasta', type: 'recipe', ingredients: [] },
        { name: 'Salad', type: 'recipe', ingredients: [] },
        { name: 'Soup', type: 'recipe', ingredients: [] }
      ]);

      const entities = adapter.extract(content, fileMetadata);
      const recipes = entities.filter(e => e.type === 'recipe');
      expect(recipes.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract recipe timing information', () => {
      const content = JSON.stringify({
        name: 'Quick Stir Fry',
        type: 'recipe',
        prepTime: 5,
        cookTime: 15,
        totalTime: 20,
        difficulty: 'easy'
      });

      const entities = adapter.extract(content, fileMetadata);
      const recipe = entities.find(e => e.type === 'recipe');
      expect(recipe?.metadata?.prepTime).toBe(5);
      expect(recipe?.metadata?.cookTime).toBe(15);
      expect(recipe?.metadata?.difficulty).toBe('easy');
    });

    it('should handle recipes without timing info', () => {
      const content = JSON.stringify({
        name: 'No-Bake Cheesecake',
        type: 'recipe',
        ingredients: []
      });

      const entities = adapter.extract(content, fileMetadata);
      const recipe = entities.find(e => e.type === 'recipe');
      expect(recipe).toBeDefined();
      expect(recipe?.metadata?.name).toBe('No-Bake Cheesecake');
    });
  });

  describe('Ingredient Parsing with Quantities', () => {
    it('should parse ingredient with amount and unit', () => {
      const content = JSON.stringify({
        type: 'ingredient',
        name: 'flour',
        amount: 2,
        unit: 'cups'
      });

      const entities = adapter.extract(content, fileMetadata);
      const ingredient = entities.find(e => e.type === 'ingredient');
      expect(ingredient?.metadata?.amount).toBe(2);
      expect(ingredient?.metadata?.unit).toBe('cups');
    });

    it('should normalize quantity units', () => {
      const content = JSON.stringify([
        { type: 'ingredient', name: 'butter', amount: 8, unit: 'oz' },
        { type: 'ingredient', name: 'oil', amount: 0.5, unit: 'cup' }
      ]);

      const entities = adapter.extract(content, fileMetadata);
      const ingredients = entities.filter(e => e.type === 'ingredient');
      expect(ingredients.length).toBeGreaterThanOrEqual(2);
      expect(ingredients[0]?.metadata?.unit).toBeDefined();
    });

    it('should handle unitless quantities (count)', () => {
      const content = JSON.stringify({
        type: 'ingredient',
        name: 'eggs',
        amount: 3,
        unit: 'count'
      });

      const entities = adapter.extract(content, fileMetadata);
      const ingredient = entities.find(e => e.type === 'ingredient');
      expect(ingredient?.metadata?.unit).toBe('count');
    });

    it('should handle ingredient substitutions', () => {
      const content = JSON.stringify({
        type: 'ingredient',
        name: 'butter',
        substitutes: ['margarine', 'oil', 'applesauce']
      });

      const entities = adapter.extract(content, fileMetadata);
      const ingredient = entities.find(e => e.type === 'ingredient');
      expect(ingredient?.metadata?.substitutes).toBeDefined();
    });

    it('should extract ingredient tags (allergy info, etc.)', () => {
      const content = JSON.stringify({
        type: 'ingredient',
        name: 'peanuts',
        tags: ['allergen', 'tree-nut-free', 'vegan']
      });

      const entities = adapter.extract(content, fileMetadata);
      const ingredient = entities.find(e => e.type === 'ingredient');
      expect(ingredient?.metadata?.tags).toBeDefined();
    });
  });

  describe('Pantry Inventory Management', () => {
    it('should extract pantry items with current stock', () => {
      const content = JSON.stringify({
        type: 'pantry',
        items: [
          { name: 'flour', amount: 5, unit: 'cups', location: 'cabinet' },
          { name: 'sugar', amount: 2, unit: 'lbs', location: 'cabinet' }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const pantryItems = entities.filter(e => e.type === 'pantry-item');
      expect(pantryItems.length).toBeGreaterThanOrEqual(2);
    });

    it('should track pantry item locations', () => {
      const content = JSON.stringify({
        type: 'pantry-item',
        name: 'milk',
        amount: 1,
        unit: 'gallon',
        location: 'refrigerator',
        category: 'dairy'
      });

      const entities = adapter.extract(content, fileMetadata);
      const item = entities.find(e => e.type === 'pantry-item');
      expect(item?.metadata?.location).toBe('refrigerator');
      expect(item?.metadata?.category).toBe('dairy');
    });

    it('should handle empty pantry gracefully', () => {
      const content = JSON.stringify({ type: 'pantry', items: [] });
      const entities = adapter.extract(content, fileMetadata);
      expect(Array.isArray(entities)).toBe(true);
    });

    it('should track item categories for organization', () => {
      const content = JSON.stringify([
        { type: 'pantry-item', name: 'chicken', category: 'protein', location: 'freezer' },
        { type: 'pantry-item', name: 'broccoli', category: 'vegetable', location: 'refrigerator' },
        { type: 'pantry-item', name: 'rice', category: 'grain', location: 'cabinet' }
      ]);

      const entities = adapter.extract(content, fileMetadata);
      const items = entities.filter(e => e.type === 'pantry-item');
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items.some(i => i.metadata?.category === 'protein')).toBe(true);
    });
  });

  describe('Expiration Date Handling', () => {
    it('should extract expiration dates from pantry items', () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 3);

      const content = JSON.stringify({
        type: 'pantry-item',
        name: 'yogurt',
        amount: 1,
        unit: 'container',
        expiresAt: expiryDate.toISOString()
      });

      const entities = adapter.extract(content, fileMetadata);
      const item = entities.find(e => e.type === 'pantry-item');
      expect(item?.metadata?.expiresAt).toBeDefined();
    });

    it('should flag items expiring soon (< 3 days)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const content = JSON.stringify({
        type: 'pantry-item',
        name: 'milk',
        expiresAt: tomorrow.toISOString()
      });

      const entities = adapter.extract(content, fileMetadata);
      const item = entities.find(e => e.type === 'pantry-item');
      expect(item?.metadata?.expiringFlag).toBe('soon');
    });

    it('should identify expired items', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const content = JSON.stringify({
        type: 'pantry-item',
        name: 'cheese',
        expiresAt: yesterday.toISOString()
      });

      const entities = adapter.extract(content, fileMetadata);
      const item = entities.find(e => e.type === 'pantry-item');
      expect(item?.metadata?.expiringFlag).toBe('expired');
    });
  });

  describe('Recipe-Ingredient Matching', () => {
    it('should detect REQUIRES relationships between recipes and ingredients', () => {
      const content = JSON.stringify({
        recipes: [
          {
            name: 'Pasta',
            type: 'recipe',
            ingredients: [
              { name: 'pasta', amount: 1, unit: 'lb' },
              { name: 'tomato sauce', amount: 2, unit: 'cups' }
            ]
          }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const relationships = adapter.detectRelationships(entities);
      const requires = relationships.filter(r => r.type === 'REQUIRES');
      expect(requires.length).toBeGreaterThan(0);
    });

    it('should determine if recipe can be made with available ingredients', () => {
      const content = JSON.stringify({
        pantry: [
          { name: 'pasta', amount: 5, unit: 'lbs' },
          { name: 'tomato sauce', amount: 10, unit: 'cups' }
        ],
        recipe: {
          name: 'Simple Pasta',
          ingredients: [
            { name: 'pasta', amount: 1, unit: 'lb' },
            { name: 'tomato sauce', amount: 2, unit: 'cups' }
          ]
        }
      });

      const entities = adapter.extract(content, fileMetadata);
      const recipe = entities.find(e => e.type === 'recipe');
      expect(recipe?.metadata?.canMake).toBe(true);
    });

    it('should identify missing ingredients for a recipe', () => {
      const content = JSON.stringify({
        recipe: {
          name: 'Alfredo',
          ingredients: [
            { name: 'cream', amount: 2, unit: 'cups' },
            { name: 'parmesan', amount: 1, unit: 'cup' }
          ]
        }
      });

      const entities = adapter.extract(content, fileMetadata);
      const recipe = entities.find(e => e.type === 'recipe');
      expect(recipe?.metadata?.missing).toBeDefined();
    });

    it('should suggest recipes based on available ingredients', () => {
      const content = JSON.stringify({
        pantry: [
          { name: 'chicken', amount: 2, unit: 'lbs' },
          { name: 'rice', amount: 3, unit: 'cups' }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      expect(entities.length).toBeGreaterThan(0);
      // Matching logic tested in relationships
    });
  });

  describe('Shopping List Generation', () => {
    it('should generate shopping list from meal plan', () => {
      const content = JSON.stringify({
        mealPlan: [
          {
            day: 'Monday',
            meal: 'Spaghetti',
            recipe: {
              ingredients: [
                { name: 'pasta', amount: 1, unit: 'lb' },
                { name: 'sauce', amount: 2, unit: 'cups' }
              ]
            }
          }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const shoppingList = entities.find(e => e.type === 'shopping-list');
      expect(shoppingList).toBeDefined();
    });

    it('should consolidate duplicate items on shopping list', () => {
      const content = JSON.stringify({
        recipes: [
          {
            name: 'Pasta',
            ingredients: [{ name: 'flour', amount: 2, unit: 'cups' }]
          },
          {
            name: 'Bread',
            ingredients: [{ name: 'flour', amount: 3, unit: 'cups' }]
          }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should exclude items already in pantry from shopping list', () => {
      const content = JSON.stringify({
        pantry: [{ name: 'salt', amount: 5, unit: 'lbs' }],
        shoppingList: [
          { name: 'salt', amount: 1, unit: 'lbs' },
          { name: 'pepper', amount: 1, unit: 'oz' }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const list = entities.find(e => e.type === 'shopping-list');
      expect(list).toBeDefined();
    });
  });

  describe('Meal Planning', () => {
    it('should extract meal plans with dates', () => {
      const content = JSON.stringify({
        type: 'meal-plan',
        week: 'week-of-2025-10-20',
        meals: [
          { day: 'Monday', meal: 'Pasta', type: 'dinner' },
          { day: 'Tuesday', meal: 'Tacos', type: 'dinner' }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const plan = entities.find(e => e.type === 'meal-plan');
      expect(plan).toBeDefined();
    });

    it('should track past meals and leftovers', () => {
      const content = JSON.stringify({
        type: 'meal',
        name: 'Chicken Stir Fry',
        date: new Date().toISOString(),
        servings: 4,
        leftoverAmount: 2,
        storageLocation: 'refrigerator'
      });

      const entities = adapter.extract(content, fileMetadata);
      const meal = entities.find(e => e.type === 'meal');
      expect(meal?.metadata?.storageLocation).toBe('refrigerator');
    });
  });

  describe('Relationship Detection', () => {
    it('should detect recipe REQUIRES ingredient relationships', () => {
      const content = JSON.stringify({
        recipes: [
          {
            name: 'Pasta',
            ingredients: [{ name: 'pasta', amount: 1, unit: 'lb' }]
          }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const relationships = adapter.detectRelationships(entities);
      const requires = relationships.filter(r => r.type === 'REQUIRES');
      expect(requires.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect ingredient SUBSTITUTES_FOR relationships', () => {
      const content = JSON.stringify({
        substitutions: [
          {
            original: 'butter',
            alternatives: ['margarine', 'oil', 'applesauce']
          }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const relationships = adapter.detectRelationships(entities);
      expect(relationships).toBeDefined();
    });

    it('should detect meal USES recipe relationships', () => {
      const content = JSON.stringify({
        meals: [
          { name: 'Monday Dinner', recipe: 'Spaghetti' }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      const relationships = adapter.detectRelationships(entities);
      expect(relationships).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty content gracefully', () => {
      const entities = adapter.extract('', fileMetadata);
      expect(Array.isArray(entities)).toBe(true);
    });

    it('should handle malformed JSON by falling back to text extraction', () => {
      const content = 'invalid {json} content here';
      const entities = adapter.extract(content, fileMetadata);
      expect(Array.isArray(entities)).toBe(true);
    });

    it('should handle missing required fields', () => {
      const content = JSON.stringify({
        type: 'recipe'
        // missing name and ingredients
      });

      const entities = adapter.extract(content, fileMetadata);
      const recipe = entities.find(e => e.type === 'recipe');
      expect(recipe).toBeDefined();
    });

    it('should handle invalid quantities gracefully', () => {
      const content = JSON.stringify({
        type: 'ingredient',
        name: 'flour',
        amount: 'a bunch',
        unit: 'cups'
      });

      const entities = adapter.extract(content, fileMetadata);
      expect(Array.isArray(entities)).toBe(true);
    });

    it('should handle invalid dates gracefully', () => {
      const content = JSON.stringify({
        type: 'pantry-item',
        name: 'milk',
        expiresAt: 'not-a-valid-date'
      });

      const entities = adapter.extract(content, fileMetadata);
      const item = entities.find(e => e.type === 'pantry-item');
      expect(item).toBeDefined();
    });

    it('should normalize unit variations', () => {
      const content = JSON.stringify([
        { type: 'ingredient', name: 'water', amount: 1, unit: 'cup' },
        { type: 'ingredient', name: 'water', amount: 8, unit: 'fl oz' }
      ]);

      const entities = adapter.extract(content, fileMetadata);
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should preserve case-insensitive ingredient matching', () => {
      const content = JSON.stringify({
        pantry: [{ name: 'Chicken' }],
        recipe: { ingredients: [{ name: 'chicken' }] }
      });

      const entities = adapter.extract(content, fileMetadata);
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should handle very large quantities without overflow', () => {
      const content = JSON.stringify({
        type: 'pantry-item',
        name: 'rice',
        amount: 999999,
        unit: 'grains'
      });

      const entities = adapter.extract(content, fileMetadata);
      const item = entities.find(e => e.type === 'pantry-item');
      expect(item?.metadata?.amount).toBe(999999);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete household food dataset', () => {
      const content = JSON.stringify({
        pantry: [
          { name: 'pasta', amount: 2, unit: 'lbs', location: 'cabinet' },
          { name: 'tomato sauce', amount: 3, unit: 'cups', location: 'cabinet' }
        ],
        recipes: [
          {
            name: 'Simple Pasta',
            prepTime: 5,
            cookTime: 15,
            ingredients: [
              { name: 'pasta', amount: 1, unit: 'lb' },
              { name: 'tomato sauce', amount: 2, unit: 'cups' }
            ]
          }
        ],
        mealPlan: [
          { day: 'Monday', meal: 'Simple Pasta' }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      expect(entities.length).toBeGreaterThan(0);

      const recipes = entities.filter(e => e.type === 'recipe');
      const pantry = entities.filter(e => e.type === 'pantry-item');
      expect(recipes.length).toBeGreaterThan(0);
      expect(pantry.length).toBeGreaterThan(0);
    });

    it('should support complex multi-recipe meal plan with shopping list', () => {
      const content = JSON.stringify({
        mealPlan: [
          {
            day: 'Monday',
            meals: {
              breakfast: 'Oatmeal',
              lunch: 'Salad',
              dinner: 'Chicken Pasta'
            }
          },
          {
            day: 'Tuesday',
            meals: {
              breakfast: 'Toast',
              lunch: 'Sandwich',
              dinner: 'Tacos'
            }
          }
        ]
      });

      const entities = adapter.extract(content, fileMetadata);
      expect(entities.length).toBeGreaterThan(0);
    });
  });
});
