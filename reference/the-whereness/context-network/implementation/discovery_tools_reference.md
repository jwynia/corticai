# Discovery Tools Reference Guide

**For New Sessions**: Complete command reference for comprehensive discovery implementation

## 🔧 **Core Tools Available**

### 1. **Comprehensive Discovery Plan Generator**
```bash
# Location: tools/comprehensive_discovery.ts
# Purpose: Generates 85+ systematic queries for any category

# Usage:
deno run --allow-read --allow-write --allow-env --allow-net \
  tools/comprehensive_discovery.ts <city> <category> <subcategory>

# Examples:
tools/comprehensive_discovery.ts albuquerque food_beverage coffee_shops
tools/comprehensive_discovery.ts albuquerque essential_services laundry_cleaning
tools/comprehensive_discovery.ts albuquerque shopping_retail clothing_apparel

# Output: data/{city}/context/discovery/comprehensive_plan_{subcategory}.json
# Contains: 85+ queries across geographic, functional, neutral, utility patterns
```

### 2. **MCP Location Search (Primary Discovery Tool)**
```bash
# Purpose: Execute individual discovery queries via Claude Code's MCP integration

# Usage:
mcp__location__google-local-search(
  query="search term",
  location="Albuquerque, NM"
)

# Returns: 20 venues with names, addresses, ratings, hours, types

# Example Systematic Execution:
mcp__location__google-local-search("laundromat 87110", "Albuquerque, NM")
mcp__location__google-local-search("24 hour laundromat", "Albuquerque, NM")
mcp__location__google-local-search("laundromat Nob Hill", "Albuquerque, NM")
```

### 3. **Category Manager (Legacy)**
```bash
# Location: tools/category_manager.ts
# Purpose: Manages category taxonomy and progress tracking

# Usage:
tools/category_manager.ts <city>

# Provides: Category coverage analysis, progress reports
```

### 4. **Batch Discovery Tools (For Large-Scale Operations)**
```bash
# tools/mcp_batch_discovery_real.ts - Uses actual MCP functions
# tools/mcp_batch_discovery.ts - Standalone version
# tools/venue_discovery.ts - Legacy discovery tool

# Note: For new sessions, use comprehensive_discovery.ts + manual MCP calls
# Batch tools are for systematic rollout across all categories
```

## 📋 **Step-by-Step Workflow**

### Workflow 1: Discover New Category (Recommended)
```bash
# Step 1: Check current category status
find data/albuquerque/pipeline/enriched -name "*.json" -exec grep -o '"subcategory": "[^"]*"' {} \; | sort | uniq -c | sort -nr

# Step 2: Pick zero-count or low-count category
# Examples: bakeries, auto_services, pharmacy, clothing_apparel

# Step 3: Generate comprehensive plan
tools/comprehensive_discovery.ts albuquerque food_beverage bakeries

# Step 4: Execute high-yield searches from plan
# Geographic (highest yield):
mcp__location__google-local-search("bakery 87110", "Albuquerque, NM")
mcp__location__google-local-search("bakery 87106", "Albuquerque, NM")

# Functional (specialized needs):
mcp__location__google-local-search("custom cakes", "Albuquerque, NM")
mcp__location__google-local-search("gluten free bakery", "Albuquerque, NM")

# Neighborhood (local gems):
mcp__location__google-local-search("bakery Nob Hill", "Albuquerque, NM")
mcp__location__google-local-search("local bakery Old Town", "Albuquerque, NM")

# Step 5: Document results and continue with next category
```

### Workflow 2: Systematic Category Rollout
```bash
# For completing comprehensive discovery across all categories:

# 1. Generate plans for all missing categories
for category in essential_services shopping_retail fitness_wellness; do
  for subcategory in $(get_subcategories $category); do
    tools/comprehensive_discovery.ts albuquerque $category $subcategory
  done
done

# 2. Execute systematically (use batch tools or manual MCP calls)
# 3. Track progress in category_progress.json
```

## 🎯 **Search Pattern Reference**

### Geographic Patterns (Highest Yield: 15-20+ venues per search)
```bash
# ZIP Code Coverage (20 ZIP codes for Albuquerque):
"category 87101" "category 87102" "category 87104" "category 87105"
"category 87106" "category 87107" "category 87108" "category 87109"
"category 87110" "category 87111" "category 87112" "category 87113"
# ... continue through all 20 ZIP codes

# Neighborhood Coverage (12 neighborhoods):
"category Old Town" "category Nob Hill" "category Northeast Heights"
"category Foothills" "category Westside" "category North Valley"
"category Southeast" "category Southwest" "category Downtown"
"category Midtown" "category Uptown" "category East Mountains"

# Major Street Coverage (15 streets):
"category Central Avenue" "category Coors Boulevard" "category San Mateo Boulevard"
"category Juan Tabo Boulevard" "category Wyoming Boulevard" "category Louisiana Boulevard"
# ... continue through all major streets
```

### Functional Patterns (Medium Yield: 5-15 venues per search)
```bash
# Service-Specific:
"24 hour category" "category open late" "category open early"
"category delivery" "category pickup" "category drive through"

# Access-Specific:
"category with parking" "category wheelchair accessible" "category near bus"

# Need-Specific:
"emergency category" "same day category" "walk in category"
"category no appointment" "category while you wait"

# Equipment/Features:
"category wifi" "category large capacity" "category self service"
```

### Neutral Patterns (Medium Yield: 5-10 venues per search)
```bash
# Local Focus:
"local category {neighborhood}" "neighborhood category" "family owned category"

# Size/Scale:
"small category" "independent category" "local chain category"

# Geographic Neutral:
"category in Albuquerque" "category shops" "category services"
```

### Utility Patterns (Low-Medium Yield: 3-8 venues per search)
```bash
# Convenience:
"category within walking distance" "category near work" "category on commute"

# Timing:
"category open now" "category open weekend" "category holiday hours"

# Special Services:
"category consultation" "category warranty" "category financing"
```

## 📊 **Expected Discovery Rates by Category**

### High-Yield Categories (20+ venues per ZIP search):
- **essential_services**: laundry_cleaning, gas_stations, auto_services
- **food_beverage**: coffee_shops, restaurants_casual, grocery_markets
- **shopping_retail**: clothing_apparel, home_hardware

### Medium-Yield Categories (10+ venues per search):
- **fitness_wellness**: gyms_fitness, yoga_meditation
- **entertainment**: bars_cocktails, music_venues
- **food_beverage**: bakeries, specialty_food

### Lower-Yield Categories (5+ venues per search):
- **professional_services**: legal, financial, consulting
- **specialty_retail**: art_supplies, hobby_shops
- **wellness**: spa_massage, alternative_health

## 🔍 **Quality Validation**

### After Discovery, Check for:
1. **Geographic Distribution**: Venues across different ZIP codes/neighborhoods
2. **Service Diversity**: Budget to premium, chains to independents
3. **Operational Variety**: Different hours, services, specialties
4. **User Intent Coverage**: Convenience, quality, proximity options

### Red Flags (Indicates Poor Search Strategy):
- All results from same chain/brand
- All results from same neighborhood
- All results are highly-rated (missing utilitarian options)
- Results don't match search intent (searching "cheap" but getting premium)

## 📝 **Documentation Standards**

### For Each Discovery Session:
1. **Record searches used**: Query patterns and results count
2. **Note geographic spread**: Which areas are covered
3. **Track service diversity**: Types of businesses found
4. **Update progress files**: category_progress.json

### File Naming:
- Discovery plans: `comprehensive_plan_{subcategory}.json`
- Results documentation: `{subcategory}_discovery_results.md`
- Progress tracking: `category_progress.json`

## 🎯 **Quick Commands for Common Tasks**

### Check Discovery Status:
```bash
# Current venue counts by category:
find data/albuquerque/pipeline/enriched -name "*.json" -exec grep -o '"subcategory": "[^"]*"' {} \; | sort | uniq -c | sort -nr

# Generated discovery plans:
ls data/albuquerque/context/discovery/comprehensive_plan_*.json

# Categories with discovery strategies in master taxonomy:
grep -c "discovery_strategy" .context-network/data/master_categories.json
```

### Generate Plans for Missing Categories:
```bash
# Quick generation for common missing categories:
tools/comprehensive_discovery.ts albuquerque food_beverage bakeries
tools/comprehensive_discovery.ts albuquerque essential_services auto_services
tools/comprehensive_discovery.ts albuquerque shopping_retail clothing_apparel
tools/comprehensive_discovery.ts albuquerque fitness_wellness gyms_fitness
```

### Test Discovery Effectiveness:
```bash
# Test geographic pattern (should yield 15+ venues):
mcp__location__google-local-search("bakery 87110", "Albuquerque, NM")

# Test functional pattern (should yield 5+ specific venues):
mcp__location__google-local-search("24 hour laundromat", "Albuquerque, NM")

# Test neutral pattern (should yield varied results):
mcp__location__google-local-search("local coffee Nob Hill", "Albuquerque, NM")
```

## 🚨 **Troubleshooting**

### If Discovery Yields Are Low:
1. **Check query neutrality**: Remove superlatives ("best", "top")
2. **Try different geographic areas**: Some ZIP codes more dense than others
3. **Adjust specificity**: "auto repair" vs "mechanic" vs "car service"
4. **Check category density**: Some categories genuinely sparse in smaller cities

### If Results Are Too Similar:
1. **Use more diverse patterns**: Mix geographic, functional, neutral searches
2. **Search different neighborhoods**: Avoid clustering in one area
3. **Vary search terms**: "bakery" vs "pastry shop" vs "donut shop"

### If Tool Errors Occur:
1. **Check file permissions**: Deno needs read/write access
2. **Verify file paths**: Tools expect specific directory structure
3. **Check master categories**: Discovery strategies must be defined

---

**This reference provides everything needed to continue comprehensive discovery in any new session.**