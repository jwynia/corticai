# Deduplication Strategies Research

## Purpose
This document researches approaches to detecting and preventing duplicate file creation, focusing on understanding when files are conceptually "the same" rather than just textually similar.

## Classification
- **Domain:** Research/Problem Validation
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Evolving

## Problem Statement

Agents and developers repeatedly create duplicate artifacts because they can't recognize existing ones. This isn't just about identical files - it's about files that serve the same purpose with different names, structures, or content.

Examples:
- `todo.md`, `tasks.md`, `current_work.md` - all tracking the same work
- `PLAN.md`, `ROADMAP.md`, `plan.txt` - all containing project plans
- Multiple README files in different formats
- Repeated documentation of the same concepts

## Research Questions

1. **Semantic Equivalence**: When are two files conceptually "the same"?
2. **Intent Detection**: How can we understand what someone is trying to create?
3. **Consolidation Strategies**: How to merge similar content without losing information?
4. **User Intervention**: When to automatically prevent vs warn vs allow?

## Literature Review

### Existing Approaches

**Code Duplication Detection:**
- Token-based: Comparing code tokens
- AST-based: Comparing syntax trees
- Semantic: Comparing program behavior
- *Limitation*: These focus on code, not documentation

**Document Similarity:**
- TF-IDF: Term frequency analysis
- LSA/LDA: Topic modeling
- Word embeddings: Semantic similarity
- *Limitation*: Miss structural/purpose similarity

**File Deduplication:**
- Hash-based: Exact matches only
- Block-level: Storage deduplication
- *Limitation*: No semantic understanding

## Proposed Approach

### Multi-Layer Similarity Detection

```typescript
interface SimilarityLayers {
  // Layer 1: Filename patterns
  namePattern: {
    exact: boolean
    stem: string  // todo, task, plan
    variants: string[]  // todos, to-do, to_do
    confidence: number
  }
  
  // Layer 2: Content structure
  structure: {
    format: 'markdown' | 'json' | 'yaml' | 'text'
    sections: string[]  // Headers, keys, etc
    listItems: number
    confidence: number
  }
  
  // Layer 3: Semantic content
  semantic: {
    topics: string[]  // Extracted concepts
    purpose: 'planning' | 'tracking' | 'documentation' | 'config'
    temporal: 'current' | 'historical' | 'future'
    confidence: number
  }
  
  // Layer 4: Usage patterns
  usage: {
    lastModified: Date
    modificationFrequency: number
    accessPatterns: 'write-once' | 'frequently-updated' | 'append-only'
    confidence: number
  }
}
```

### Intent Recognition

Before file creation, understand intent:

1. **Analyze the request context**
   - What was the user/agent asked to do?
   - What information are they trying to store?
   - Is this a new concept or existing one?

2. **Check for existing fulfillment**
   - Does a file already serve this purpose?
   - Could an existing file be updated instead?
   - Is this a different view of existing data?

3. **Suggest alternatives**
   - "Found existing todo.md - update instead?"
   - "This looks similar to PLAN.md - merge?"
   - "Consider adding to existing tasks.md"

### Consolidation Patterns

**Automatic Consolidation:**
- During quiet periods
- Merge files with high similarity scores
- Preserve all information
- Track provenance

**Guided Consolidation:**
- Suggest merges to user
- Show what would be combined
- Allow selective merging
- Learn from decisions

## Prototype Testing

### Test Cases

1. **Task Tracking Files**
   - Create multiple task files with different names
   - Test similarity detection accuracy
   - Measure false positive/negative rates

2. **Documentation Overlap**
   - Multiple files documenting same component
   - Test structural similarity detection
   - Validate merge suggestions

3. **Configuration Variants**
   - Different config file formats (JSON, YAML, etc)
   - Same settings, different structure
   - Test semantic equivalence detection

### Metrics

- **Precision**: Correctly identified duplicates / Total identified
- **Recall**: Correctly identified duplicates / Actual duplicates
- **User Acceptance**: Percentage of suggestions accepted
- **Information Loss**: Data lost during consolidation

## Failure Modes

1. **Over-aggressive**: Preventing legitimate file creation
2. **Under-aggressive**: Missing obvious duplicates
3. **Information Loss**: Losing nuance during consolidation
4. **User Frustration**: Too many interruptions

## Success Patterns

### What Works

1. **Filename Stemming**: Recognizing variants (todo, todos, to-do)
2. **Purpose Detection**: Understanding file intent from content
3. **Temporal Awareness**: Recognizing "current" vs "archive"
4. **Progressive Intervention**: Warn → Suggest → Prevent

### What Doesn't Work

1. **Pure text similarity**: Misses structural equivalence
2. **Blocking creation**: Users work around restrictions
3. **Automatic merging**: Loses important distinctions
4. **Ignoring context**: Missing why file is being created

## Recommendations

### Phase 1: Detection Only
- Implement similarity scoring
- Track duplicate creation patterns
- Learn from user behavior
- No intervention yet

### Phase 2: Gentle Suggestions
- Warn about potential duplicates
- Suggest existing files
- Learn from user choices
- Build trust

### Phase 3: Active Prevention
- Prevent obvious duplicates
- Offer merge workflows
- Automated consolidation
- Maintain provenance

## Open Questions

1. How to handle legitimate variants (dev vs prod configs)?
2. When should files remain separate vs merged?
3. How to preserve file-specific metadata during merges?
4. What similarity threshold prevents frustration?

## Relationships
- **Parent Nodes:** [research/index.md]
- **Related Nodes:** 
  - [foundation/problem_analysis.md] - addresses - The Amnesia Loop problem
  - [architecture/corticai_architecture.md] - implements - Continuity Cortex
  - [cognitive_models/memory_consolidation.md] - inspired-by - Memory consolidation patterns

## Navigation Guidance
- **Access Context:** Reference when implementing deduplication features
- **Common Next Steps:** Review similarity algorithms, test prototypes
- **Related Tasks:** Implementing Continuity Cortex, file operation interceptors
- **Update Patterns:** Update with testing results and user feedback

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Research Phase