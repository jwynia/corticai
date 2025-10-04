# The Whereness Project - Discovery

## Project Overview

The Whereness System is a network of city guides that captures authentic local reality through weekly synthesis of scattered online sources (podcasts, Reddit, news) into static sites.

## Core Purpose

Create authentic, local perspectives on cities by:
- Aggregating scattered online discussions and content
- Synthesizing insights through LLM processing
- Building static city guide sites with high signal-to-noise ratio
- Focusing on "whereness" - the authentic character of places

## Current Implementation Status

**Metro Areas Configured:**
- Twin Cities (Minneapolis-St. Paul) (live/primary)
- Albuquerque (moving to)
- Denver (test/development)

**Pipeline State:** Weekly batch processing
- Sources → Extraction → Synthesis → Evaluation → Build → Deploy

## Architecture Principles

1. **Static-First**: No database, file-based pipeline only
2. **Weekly Batch**: Not real-time, weekly synthesis cycles
3. **LLM Synthesis**: Claude/GPT for content combination
4. **Index Model**: Same entities appear in multiple contexts
5. **Citation Required**: Every claim links to sources
6. **Confidence Scoring**: All data includes reliability metrics

## Key Directories

- `.context-network/`: Project-level decisions and architecture
- `data/[city]/`: City-specific processing and context
- `tools/`: Processing scripts (extractors, synthesizers, evaluators)
- `site/`: Static site generation templates

## Next Steps

1. Implement extraction patterns for Twin Cities metro
2. Set up synthesis rules and confidence thresholds
3. Create evaluation framework for content quality
4. Build initial static site generation

## Questions to Resolve

- Static site generator choice (Hugo/11ty/Astro)
- LLM provider and cost management
- Source reliability scoring system
- Content freshness and decay algorithms