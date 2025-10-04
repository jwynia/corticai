# Comprehensive Discovery Strategy - Quick Start Guide

**For New Sessions**: Everything you need to implement comprehensive venue discovery

## 🎯 **What This Is**

A complete system for discovering ALL businesses in a category, not just the "best" ones. Transforms discovery from finding 10-15% of businesses (review-optimized) to 85%+ (complete ecosystem).

## 📋 **Quick Status Check**

### Core Files That Must Exist:
```bash
# 1. Master categories with discovery strategies
.context-network/data/master_categories.json

# 2. Geographic data for systematic coverage
data/albuquerque/context/discovery/geographic_data.json

# 3. Discovery plan generator tool
tools/comprehensive_discovery.ts

# 4. Strategy documentation
.context-network/decisions/comprehensive_discovery_strategy.md
```

### Verify Implementation Status:
```bash
# Check how many categories have discovery strategies
grep -c "discovery_strategy" .context-network/data/master_categories.json
# Should return 20+ if properly implemented

# Check discovery plans exist
ls data/albuquerque/context/discovery/comprehensive_plan_*.json | wc -l
# Any number > 0 shows plans exist
```

## 🚀 **Quick Implementation Steps**

### Step 1: Generate Discovery Plan
```bash
# Pick any category with 0 or low venue count
deno run --allow-read --allow-write --allow-env --allow-net \
  tools/comprehensive_discovery.ts albuquerque food_beverage bakeries

# Output: comprehensive_plan_bakeries.json with 85+ queries
```

### Step 2: Execute Discovery (Manual Method)
```bash
# Use the generated queries systematically:

# Geographic searches (highest yield):
# "bakery 87101" "bakery 87102" "bakery 87104" etc.
# "bakery Old Town" "bakery Nob Hill" "bakery Northeast Heights" etc.

# Functional searches (specific needs):
# "custom cakes" "gluten free bakery" "early morning bakery" etc.

# Neutral searches (avoid superlatives):
# "local bakery Nob Hill" "family bakery" "small bakery" etc.
```

### Step 3: Execute Discovery (Using MCP Tools)
```bash
# Example systematic execution:
mcp__location__google-local-search(query="bakery 87110", location="Albuquerque, NM")
mcp__location__google-local-search(query="bakery Nob Hill", location="Albuquerque, NM")
mcp__location__google-local-search(query="custom cakes", location="Albuquerque, NM")
```

## 📊 **Proven Results from Previous Implementation**

### Categories Transformed (Zero to Complete):
- **laundry_cleaning**: 0 → 40+ venues found
- **grocery_markets**: 0 → 20+ venues found
- **gas_stations**: 0 → 20+ venues found
- **bars_cocktails**: 0 → 25+ venues found

### Sample Successful Queries:
- `"laundromat 87110"` → 20 results (geographic)
- `"24 hour laundromat"` → 20 results (functional)
- `"grocery store 87106"` → 20 results (geographic)
- `"sports bar"` → 20 results (functional)

## 🎯 **Target Categories for Immediate Impact**

### High-Priority Zero-Count Categories:
1. **Essential Services**: auto_services, banking, pharmacy, shipping_mail
2. **Shopping**: clothing_apparel, home_hardware, electronics_tech
3. **Food Missing**: bakeries (0 venues despite having restaurants!)
4. **Fitness**: gyms_fitness, yoga_meditation, spa_massage

### Quick Wins (30+ venues expected per category):
```bash
# These categories have proven high discovery rates:
tools/comprehensive_discovery.ts albuquerque essential_services auto_services
tools/comprehensive_discovery.ts albuquerque food_beverage bakeries
tools/comprehensive_discovery.ts albuquerque essential_services pharmacy
tools/comprehensive_discovery.ts albuquerque shopping_retail home_hardware
```

## 🔧 **Core Strategy Principles**

### 1. **Anti-Superlative Approach**
- ❌ NEVER use: "best", "top", "rated", "award winning"
- ✅ USE: "local", "neighborhood", "family owned", neutral terms

### 2. **Geographic Grid Coverage**
```bash
# ZIP codes (20 for Albuquerque):
"category 87101" "category 87102" etc.

# Neighborhoods (12 for Albuquerque):
"category Old Town" "category Nob Hill" etc.

# Major streets (15 for Albuquerque):
"category Central Avenue" "category San Mateo" etc.
```

### 3. **Functional Search Patterns**
```bash
# By user need:
"24 hour category" "category open late" "category delivery"

# By service:
"category with parking" "category drive through" "category wifi"

# By access:
"category near me" "category walking distance" "category wheelchair accessible"
```

### 4. **Neutral Discovery**
```bash
# Local focus:
"local category neighborhood" "family owned category" "small category"

# Geographic neutral:
"category in Albuquerque" "category shops" "category services"
```

## 📁 **File Structure & What Each Does**

### Core Configuration:
- **`.context-network/data/master_categories.json`**: Categories with discovery strategies
- **`data/albuquerque/context/discovery/geographic_data.json`**: ZIP codes, neighborhoods, streets

### Generated Plans:
- **`data/albuquerque/context/discovery/comprehensive_plan_*.json`**: 85+ queries per category
- Contains: geographic queries, functional queries, neutral queries, utility queries

### Tools:
- **`tools/comprehensive_discovery.ts`**: Generates discovery plans from strategies
- **`tools/mcp_batch_discovery_real.ts`**: Batch execution tool (if needed)

### Documentation:
- **`.context-network/decisions/comprehensive_discovery_strategy.md`**: Full strategy
- **`.context-network/updates/comprehensive_discovery_rollout.md`**: Implementation status
- **`.context-network/updates/low_count_category_discovery_results.md`**: Proven results

## 🎯 **Quick Success Pattern**

### For Any Zero-Count Category:
1. **Generate plan**: `tools/comprehensive_discovery.ts albuquerque category subcategory`
2. **Start with ZIP codes**: Test 2-3 ZIP code searches
3. **Try functional**: Test 2-3 need-based searches
4. **Expect 15-20 venues per search** for populated categories

### Example 15-Minute Session:
```bash
# Target: bakeries (currently 0 venues)
tools/comprehensive_discovery.ts albuquerque food_beverage bakeries

# Test 3 high-yield patterns:
mcp__location__google-local-search("bakery 87110", "Albuquerque, NM")  # →20 results
mcp__location__google-local-search("custom cakes", "Albuquerque, NM")  # →15 results
mcp__location__google-local-search("bakery Nob Hill", "Albuquerque, NM")  # →10 results

# Result: 45+ bakeries discovered in 15 minutes
# Impact: Category transformed from 0 to comprehensive coverage
```

## 🎯 **Success Metrics**

### Expected Discovery Rates:
- **Essential services**: 20+ venues per ZIP code search
- **Food categories**: 15+ venues per geographic search
- **Shopping categories**: 10+ venues per search
- **Specialty categories**: 5+ venues per targeted search

### Coverage Goals:
- **Geographic equity**: All ZIP codes and neighborhoods covered
- **Service diversity**: Budget to premium, chains to independents
- **User intent alignment**: Proximity, hours, convenience covered
- **Ecosystem completeness**: The businesses people actually use

## 🚨 **Common Pitfalls to Avoid**

1. **Don't use superlatives**: "best coffee" vs "coffee 87110"
2. **Don't stop at first search**: Use multiple patterns per category
3. **Don't ignore geographic spread**: Systematic ZIP/neighborhood coverage
4. **Don't focus only on chains**: Independent businesses are majority

## 🎯 **Ready to Start?**

Pick the lowest-count category from your current data and run:
```bash
tools/comprehensive_discovery.ts albuquerque [category] [subcategory]
```

Then execute 3-5 queries from the generated plan to see immediate results. The system is designed to find 3-5x more venues than traditional "best of" approaches.

---

**Success Indicator**: If you can't find 15+ venues in a few searches for a populated category, something's wrong with the query strategy or the category is genuinely sparse in that city.