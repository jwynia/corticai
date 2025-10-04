# MAINT-004: Add Formal Classification Metadata

## Metadata
- **Status:** ready
- **Type:** maintenance
- **Epic:** infrastructure
- **Priority:** high
- **Size:** large
- **Created:** 2025-09-27
- **Branch:** task/MAINT-004-classification-metadata

## Description
Add formal classification metadata (Domain, Stability, Abstraction, Confidence) to foundation and elements nodes to improve searchability and organization. Currently only 3.9% of files have proper classification.

## Acceptance Criteria
- [ ] Add classification to all files in `foundation/` directory
- [ ] Add classification to all files in `elements/` directory
- [ ] Follow classification system documented in discovery.md
- [ ] Ensure consistency in domain categories across related files
- [ ] Update any existing classifications that are incomplete
- [ ] Document any new domain categories discovered during classification

## Original Recommendation
From Context Network Audit: "Add formal classification - Apply to at least foundation and elements"

## Risk Assessment
**Risk Level:** Low
- Metadata-only additions
- Improves organization without changing functionality
- No breaking changes to existing content

## Dependencies
- Need to understand content of each file to classify appropriately
- Must follow documented classification system
- Should identify patterns for consistent domain categorization

## Effort Estimate
- **Time:** 60-90 minutes (1-2 minutes per file review)
- **Complexity:** Medium (content analysis + consistent categorization)
- **Testing:** Verify classification completeness and consistency

## Classification Guidelines
**Domains:** Core Concept, Supporting Element, External Factor, Resource, Output
**Stability:** Static (principles), Semi-stable (patterns), Dynamic (changing info)
**Abstraction:** Conceptual (high-level), Structural (patterns), Detailed (implementations)
**Confidence:** Established (verified), Evolving (partially validated), Speculative (exploratory)

## Implementation Strategy
1. Review classification system and examples in discovery.md
2. Systematically review each file in foundation/ and elements/
3. Apply appropriate classifications based on content
4. Look for patterns to ensure consistency
5. Document any new domain categories needed