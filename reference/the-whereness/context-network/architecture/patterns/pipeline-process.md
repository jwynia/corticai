# Pipeline Process Pattern

## Purpose
This document defines the complete data processing pipeline for The Whereness System, from raw source collection through to static site generation.

## Classification
- **Domain:** Data Processing
- **Stability:** Stable
- **Abstraction:** Detailed
- **Confidence:** High

## The 5-Phase Pipeline

```
Sources → [1. Collection] → Extracted Entities
                ↓
         [2. Context Building] → Context Files
                ↓
         [3. Synthesis] → Combined Entities
                ↓
         [4. Evaluation] → Quality Validated
                ↓
         [5. Build] → Static Site Indices
```

## Phase 1: Collection

### Purpose
Gather raw data from various sources and extract structured entities.

### Input
- Source configurations (URLs, APIs, feeds)
- Collection parameters (city, date range, source types)

### Process
1. Connect to data sources (news, events, places)
2. Fetch current information
3. Extract structured entities
4. Assign initial confidence scores
5. Save to `/data/[city]/pipeline/extracted/`

### Output
- JSON files organized by entity type
- Each entity includes: id, name, type, source, collected_at, confidence

### Commands
- `/weekly-synthesis [city] --phase collect`

## Phase 2: Context Building (Critical Missing Step)

### Purpose
Analyze extracted entities to build context that guides synthesis.

### Input
- Extracted entities from Phase 1
- Previous context (if exists)

### Process
1. **Pattern Discovery**
   - Identify recurring patterns in entities
   - Document city-specific characteristics
   - Note temporal patterns (e.g., "Tuesday trivia nights")

2. **Source Reliability Assessment**
   - Calculate accuracy based on entity quality
   - Adjust confidence multipliers per source
   - Document source-specific biases

3. **Synthesis Rules Creation**
   - Define entity combination rules
   - Set confidence thresholds
   - Establish conflict resolution priorities

4. **Save Context Files**
   - `/data/[city]/context/patterns/` - Discovered patterns
   - `/data/[city]/context/sources/reliability.md` - Source scores
   - `/data/[city]/context/synthesis/rules.md` - Combination rules

### Output
- Context files that control how synthesis operates
- Documentation of city-specific patterns
- Source reliability scores

### Commands
- `/context-builder [city]` (to be created)

## Phase 3: Synthesis

### Purpose
Combine extracted entities using context rules to create unified, deduplicated dataset.

### Input
- Extracted entities from Phase 1
- Context files from Phase 2

### Process
1. **Load Context**
   - Read synthesis rules
   - Load source reliability scores
   - Import patterns for validation

2. **Entity Processing**
   - Deduplicate similar entities
   - Merge information from multiple sources
   - Apply confidence scoring based on source reliability
   - Resolve conflicts using context rules

3. **Relationship Discovery**
   - Identify connections between entities
   - Build relationship graph
   - Calculate relationship confidence

4. **Save Synthesized Data**
   - `/data/[city]/pipeline/synthesized/current/entities.json`
   - `/data/[city]/pipeline/synthesized/current/relationships.json`
   - `/data/[city]/pipeline/synthesized/current/metadata.json`

### Output
- Unified entity dataset
- Relationship graph
- Synthesis metadata

### Commands
- `/synthesis-runner [city]` (to be created)

## Phase 4: Evaluation

### Purpose
Validate quality of synthesized data before publication.

### Input
- Synthesized entities and relationships
- Quality thresholds from context

### Process
1. **Accuracy Checks**
   - Verify required fields present
   - Validate data formats
   - Check confidence thresholds

2. **Authenticity Validation**
   - Ensure local character preserved
   - Verify against known patterns
   - Flag suspicious outliers

3. **Relevance Scoring**
   - Calculate user value scores
   - Prioritize high-value content
   - Mark stale information

4. **Generate Quality Report**
   - Pass/fail status
   - Issues identified
   - Recommendations for improvement

### Output
- Quality validation report
- Flagged issues for review
- Go/no-go decision for build

### Commands
- `/synthesis-check [city]`

## Phase 5: Build

### Purpose
Generate static site indices from validated synthesis data.

### Input
- Quality-validated synthesized data
- Index configurations

### Process
1. **Generate Indices**
   - By neighborhood
   - By category/type
   - By activity
   - By time/schedule
   - Search index

2. **Create Relationship Maps**
   - Location clusters
   - Activity networks
   - Service connections

3. **Build Static Assets**
   - JSON data files
   - Search indices
   - Relationship graphs

4. **Deploy to Site**
   - Copy to `/data/[city]/indices/current/`
   - Prepare for static site generator

### Output
- Complete set of indices for static site
- Deployable data assets
- Site-ready JSON files

### Commands
- Build happens automatically after evaluation passes

## Complete Pipeline Execution

### Automated Flow
```bash
/pipeline-orchestrator [city]
```

This runs all 5 phases in sequence with validation between each.

### Manual Flow
```bash
# Phase 1: Collect raw data
/weekly-synthesis albuquerque --phase collect

# Phase 2: Build context from collected data
/context-builder albuquerque

# Phase 3: Run synthesis with context
/synthesis-runner albuquerque

# Phase 4: Validate quality
/synthesis-check albuquerque

# Phase 5: Build indices (automatic if phase 4 passes)
```

## Key Principles

1. **No Skipping Phases** - Each phase depends on the previous one
2. **Context is Critical** - Without Phase 2, synthesis cannot work properly
3. **Quality Gates** - Each phase validates before proceeding
4. **Incremental Updates** - Can run weekly on new data
5. **City-Specific** - Each city has its own context and pipeline

## Common Issues

### Problem: Synthesis produces no output
**Cause:** Missing context files (Phase 2 skipped)
**Solution:** Run `/context-builder` before synthesis

### Problem: Low confidence scores
**Cause:** No source reliability scores set
**Solution:** Update `/data/[city]/context/sources/reliability.md`

### Problem: Duplicate entities in synthesis
**Cause:** Missing deduplication rules
**Solution:** Update `/data/[city]/context/synthesis/rules.md`

## Data Flow Example

```
1. News article about "Flying Star Café opening new location"
   ↓ [Collection]
2. Extracted entity: {type: "place", name: "Flying Star Café", ...}
   ↓ [Context Building]
3. Pattern noted: "Local chain expansion"
   Source reliability: news = 0.9
   ↓ [Synthesis]
4. Merged with existing Flying Star entries, confidence: 0.85
   ↓ [Evaluation]
5. Validated as high-value local content
   ↓ [Build]
6. Added to: /indices/places.json, /indices/coffee.json, /indices/local-chains.json
```

## Related Documentation
- [Pipeline Commands](./.claude/commands/)
- [City Context](/data/[city]/context/)
- [Architecture Decisions](../decisions/)

## Metadata
- **Created:** 2024-11-18
- **Updated:** 2024-11-18
- **Status:** Active
- **Owner:** System Architects

## Change History
- 2024-11-18: Initial documentation of complete 5-phase pipeline