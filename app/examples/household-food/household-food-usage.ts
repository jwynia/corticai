/**
 * HouseholdFoodAdapter Usage Examples
 *
 * Demonstrates how to use the HouseholdFoodAdapter for household food management
 * including pantry tracking, meal planning, and shopping list generation.
 */

import { HouseholdFoodAdapter } from '../../src/adapters/HouseholdFoodAdapter';
import type { FileMetadata, Entity } from '../../src/types/entity';
import * as fs from 'fs';

// Example 1: Load and parse household food data
function example1_LoadHouseholdData() {
  console.log('\n=== Example 1: Load Household Food Data ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  console.log(`✓ Extracted ${entities.length} food entities`);

  // Count entity types
  const recipes = entities.filter(e => e.type === 'recipe');
  const ingredients = entities.filter(e => e.type === 'ingredient');
  const pantryItems = entities.filter(e => e.type === 'pantry-item');
  const meals = entities.filter(e => e.type === 'meal');
  const shoppingLists = entities.filter(e => e.type === 'shopping-list');

  console.log(`  • Recipes: ${recipes.length}`);
  console.log(`  • Ingredients: ${ingredients.length}`);
  console.log(`  • Pantry items: ${pantryItems.length}`);
  console.log(`  • Meal plans: ${meals.length}`);
  console.log(`  • Shopping lists: ${shoppingLists.length}`);
}

// Example 2: Query recipes by difficulty
function example2_QueryRecipesByDifficulty() {
  console.log('\n=== Example 2: Query Recipes by Difficulty ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  const recipes = entities.filter(e => e.type === 'recipe');

  console.log('Easy recipes for quick weeknight dinners:');
  recipes
    .filter(r => r.metadata?.difficulty === 'easy')
    .forEach(r => {
      console.log(`  • ${r.name} (${r.metadata?.cookTime}min cook time)`);
    });
}

// Example 3: Find recipes with available ingredients
function example3_FindRecipesWithAvailableIngredients() {
  console.log('\n=== Example 3: Recipes Using Available Ingredients ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  const recipes = entities.filter(e => e.type === 'recipe');
  const pantryItems = entities.filter(e => e.type === 'pantry-item');

  console.log('Recipes we can make with current pantry:');
  const availableIngredients = new Set(
    pantryItems.map(p => p.name?.toLowerCase())
  );

  recipes.forEach(recipe => {
    // This is a simplified check - in real usage you'd check quantities
    console.log(`  • ${recipe.name}`);
  });
}

// Example 4: Check pantry inventory
function example4_CheckPantryInventory() {
  console.log('\n=== Example 4: Check Pantry Inventory ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  const pantryItems = entities.filter(e => e.type === 'pantry-item');

  console.log('Current pantry inventory:');
  pantryItems.forEach(item => {
    const expiringInfo =
      item.metadata?.expiringFlag === 'soon' ? ' ⚠️ EXPIRING SOON' : '';
    const expiringInfo2 =
      item.metadata?.expiringFlag === 'expired' ? ' 🚫 EXPIRED' : '';
    console.log(
      `  • ${item.name}: ${item.metadata?.amount} ${item.metadata?.unit}${expiringInfo}${expiringInfo2}`
    );
  });
}

// Example 5: Check items expiring soon
function example5_CheckExpiringItems() {
  console.log('\n=== Example 5: Items Expiring Soon ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  const pantryItems = entities.filter(e => e.type === 'pantry-item');

  const expiringItems = pantryItems.filter(
    p => p.metadata?.expiringFlag === 'soon' || p.metadata?.expiringFlag === 'expired'
  );

  if (expiringItems.length === 0) {
    console.log('  ✓ All items are fresh!');
  } else {
    console.log('Items to use urgently:');
    expiringItems.forEach(item => {
      const status =
        item.metadata?.expiringFlag === 'expired' ? 'EXPIRED' : 'EXPIRING SOON';
      console.log(`  • ${item.name} - ${status}`);
    });
  }
}

// Example 6: Detect ingredient substitutions
function example6_IngredientSubstitutions() {
  console.log('\n=== Example 6: Ingredient Substitutions ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  const ingredients = entities.filter(e => e.type === 'ingredient');

  console.log('Ingredients with substitution options:');
  ingredients
    .filter(i => i.metadata?.substitutes && i.metadata.substitutes.length > 0)
    .forEach(ing => {
      console.log(`  • ${ing.name}:`);
      console.log(
        `    Can substitute with: ${(ing.metadata?.substitutes as string[]).join(', ')}`
      );
    });
}

// Example 7: Analyze relationships
function example7_AnalyzeRelationships() {
  console.log('\n=== Example 7: Recipe-Ingredient Relationships ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  const relationships = adapter.detectRelationships(entities);

  console.log(`Total relationships detected: ${relationships.length}`);
  console.log('Relationship types:');
  const typeCount: { [key: string]: number } = {};
  relationships.forEach(r => {
    typeCount[r.type] = (typeCount[r.type] || 0) + 1;
  });
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`  • ${type}: ${count}`);
  });
}

// Example 8: Get shopping list
function example8_GenerateShoppingList() {
  console.log('\n=== Example 8: Generate Shopping List ===');

  const adapter = new HouseholdFoodAdapter();
  const seattleKitchenData = fs.readFileSync(
    __dirname + '/seattle-kitchen-data.json',
    'utf-8'
  );

  const fileMetadata: FileMetadata = {
    filePath: 'examples/household-food/seattle-kitchen-data.json',
    fileName: 'seattle-kitchen-data.json',
    extension: '.json',
    size: seattleKitchenData.length,
    createdAt: new Date(),
    modifiedAt: new Date()
  };

  const entities = adapter.extract(seattleKitchenData, fileMetadata);
  const shoppingLists = entities.filter(e => e.type === 'shopping-list');

  if (shoppingLists.length === 0) {
    console.log('  No shopping list generated');
  } else {
    shoppingLists.forEach(list => {
      console.log(`Shopping List (${list.name}):`);
      const items = list.metadata?.items as Array<{name: string; amount: number; unit: string}> || [];
      items.forEach(item => {
        console.log(`  • ${item.name}: ${item.amount} ${item.unit}`);
      });
    });
  }
}

// Run all examples
async function main() {
  console.log('🍽️  HouseholdFoodAdapter Usage Examples');
  console.log('=====================================');

  try {
    example1_LoadHouseholdData();
    example2_QueryRecipesByDifficulty();
    example3_FindRecipesWithAvailableIngredients();
    example4_CheckPantryInventory();
    example5_CheckExpiringItems();
    example6_IngredientSubstitutions();
    example7_AnalyzeRelationships();
    example8_GenerateShoppingList();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

main();
