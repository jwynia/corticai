# Research Depth Layers Pattern

## Overview

This pattern defines how The Whereness System captures information at different depths, from tourist-level surface data to underground informal systems. It ensures we document not just what's visible, but the hidden systems that make places actually work.

## Core Philosophy

**Layered Reality Model**

Places operate on multiple levels simultaneously:
- What tourists see
- What newcomers discover
- What residents know
- What insiders protect

Each layer reveals different truths about how a place functions, and authentic whereness requires understanding all layers.

## The Four Research Layers

### Layer 1: Surface
**Tourist/Relocation Guide Content**

What gets documented:
- Major attractions and landmarks
- Official business hours and addresses
- Advertised events and festivals
- Published prices and services
- Formal transportation options

Extraction sources:
- Tourism websites
- Google Maps / Yelp
- Official city guides
- Chamber of Commerce
- Major media outlets

Confidence indicators:
- Widely advertised
- Multiple official sources
- Corporate/institutional backing

### Layer 2: Functional
**How Daily Life Actually Works**

What gets documented:
- Actual vs advertised hours ("closes at 10pm but kitchen stops at 9")
- Workarounds for broken systems
- Seasonal variations not mentioned officially
- Real costs including hidden fees
- Practical transportation patterns

Extraction sources:
- Reddit threads about practical issues
- Neighborhood Facebook groups
- Local blog posts about daily life
- Comments on review sites
- Transit forums

Confidence indicators:
- Multiple independent confirmations
- Specific details provided
- Recent timestamps
- Local source attribution

### Layer 3: Cultural
**Unspoken Norms and Values in Action**

What gets documented:
- Social hierarchies and dynamics
- Unwritten rules and expectations
- Cultural conflicts and tensions
- Identity markers and boundaries
- Community values expressed through behavior

Extraction sources:
- Long-form local journalism
- Community organization discussions
- Local podcast conversations
- Neighborhood association minutes
- Cultural event planning discussions

Confidence indicators:
- Pattern appears across contexts
- Locals acknowledge when asked
- Behavioral evidence visible
- Historical consistency

### Layer 4: Underground
**Informal Systems and Edge Cases**

What gets documented:
- Grey market economies
- Informal mutual aid networks
- Alternative conflict resolution
- Underground cultural scenes
- Survival strategies for marginalized groups

Extraction sources:
- Carefully vetted community forums
- Trusted local informants
- Participant observation
- Historical precedent
- Inference from visible patterns

Confidence indicators:
- Consistent but guarded mentions
- Behavioral patterns without explanation
- Gaps in official narrative
- Protection through vagueness

## Layer-Specific Extraction Patterns

### Surface Layer Extraction

```json
{
  "extraction_rules": {
    "trust_official": true,
    "require_sources": 1,
    "confidence_baseline": 0.8,
    "update_frequency": "monthly",
    "validation": "cross_reference_official"
  }
}
```

### Functional Layer Extraction

```json
{
  "extraction_rules": {
    "prioritize_recent": true,
    "require_sources": 3,
    "confidence_baseline": 0.6,
    "look_for": [
      "but actually",
      "pro tip",
      "locals know",
      "don't believe the",
      "real story is"
    ],
    "validation": "community_confirmation"
  }
}
```

### Cultural Layer Extraction

```json
{
  "extraction_rules": {
    "seek_patterns": true,
    "require_sources": 5,
    "confidence_baseline": 0.5,
    "look_for": [
      "unspoken rule",
      "everyone knows",
      "cultural expectation",
      "social dynamics",
      "implicit understanding"
    ],
    "validation": "behavioral_consistency"
  }
}
```

### Underground Layer Extraction

```json
{
  "extraction_rules": {
    "protect_sources": true,
    "require_sources": "pattern_based",
    "confidence_baseline": 0.3,
    "look_for": [
      "informal network",
      "alternative system",
      "grey area",
      "survival strategy",
      "edge case"
    ],
    "validation": "indirect_evidence",
    "ethical_filter": "harm_reduction_only"
  }
}
```

## Investigation Modes

### Observational Mode
- What can be seen/experienced directly
- No interaction required
- Surface and some functional layer
- High confidence, limited depth

### Participatory Mode
- Requires engaging with systems
- User experience perspective
- Functional and cultural layers
- Medium confidence, good depth

### Insider Mode
- Requires trust and relationships
- Long-term engagement
- Cultural and underground layers
- Variable confidence, maximum depth

### Historical Mode
- How patterns formed over time
- Archive and memory work
- All layers with temporal perspective
- Confidence depends on sources

## Twin Cities Specific Layer Examples

### Surface Layer Example
```markdown
**Como Zoo**: Free admission zoo and conservatory in St. Paul
- Open daily 10am-6pm (buildings 10am-4pm)
- Free parking available
- Major attraction for families
```

### Functional Layer Example
```markdown
**Como Zoo (Functional Reality)**:
- Parking fills by 11am on weekends
- Best to visit Tuesday-Thursday for smaller crowds
- Conservatory is primary winter destination for locals
- Hidden pay parking at State Fairgrounds during peak times
- Food expensive inside, locals bring picnics
```

### Cultural Layer Example
```markdown
**Como Zoo (Cultural Dynamics)**:
- Dividing line between "St. Paul families" and "Minneapolis visitors"
- Multi-generational tradition for many immigrant families
- Informal ESL conversation groups meet at conservatory
- Class dynamics visible in voluntary donation patterns
- Site of subtle East Side vs Highland Park territorial display
```

### Underground Layer Example
```markdown
**Como Zoo (Informal Systems)**:
- Network of parents sharing membership benefits
- Informal childcare swaps during morning hours
- Quiet LGBTQ+ youth meetup spot in Japanese garden
- Underground plant propagation network via conservatory volunteers
- Homeless individuals use conservatory for winter warmth (tacitly accepted)
```

## Information Lifecycle by Layer

### Surface Information
- Decay rate: Slow (months/years)
- Update trigger: Official changes
- Validation: Simple verification
- Distribution: Wide

### Functional Information
- Decay rate: Medium (weeks/months)
- Update trigger: Seasonal/operational changes
- Validation: Community confirmation
- Distribution: Targeted

### Cultural Information
- Decay rate: Slow (years)
- Update trigger: Demographic shifts
- Validation: Pattern consistency
- Distribution: Contextual

### Underground Information
- Decay rate: Fast (days/weeks)
- Update trigger: Threat/opportunity changes
- Validation: Indirect evidence
- Distribution: Protected

## Ethical Considerations

### Protection Principles

1. **Do No Harm**: Never expose vulnerable populations
2. **Respect Privacy**: Some systems work because they're invisible
3. **Consider Consequences**: Will documentation destroy what it describes?
4. **Maintain Vagueness**: Sometimes specific details should stay hidden
5. **Platform Appropriateness**: Not all information belongs on public sites

### Information Filters

```typescript
interface LayerFilter {
  surface: "full_detail";
  functional: "practical_detail";
  cultural: "respectful_observation";
  underground: "protective_abstraction";
}
```

## Synthesis Across Layers

### Vertical Integration
Connect information from different layers about same entity:
- Surface: Coffee shop open 7am-7pm
- Functional: Gets busy 8-10am with commuters
- Cultural: Where young professionals network
- Underground: Informal job board in bathroom

### Horizontal Patterns
Identify patterns across entities at same layer:
- Multiple venues have "unofficial" hours
- Several neighborhoods have informal leaders
- Pattern of alternative service provision

### Depth Indicators

Mark content with depth level:
```markdown
🏢 Surface - Tourist/official information
🚶 Functional - Daily life reality
🎭 Cultural - Social dynamics
🌙 Underground - Informal systems
```

## Quality Validation by Layer

### Surface Validation
- [ ] Matches official sources
- [ ] Recently verified
- [ ] Complete basic information

### Functional Validation
- [ ] Multiple local confirmations
- [ ] Practical details included
- [ ] Workarounds documented

### Cultural Validation
- [ ] Pattern appears repeatedly
- [ ] Historical context provided
- [ ] Multiple perspectives represented

### Underground Validation
- [ ] Information protects vulnerable
- [ ] Abstracted appropriately
- [ ] Ethical review completed

## Implementation Guidelines

### For Extractors
1. Tag content with research layer
2. Note investigation mode used
3. Assess ethical implications
4. Apply appropriate abstraction

### For Synthesizers
1. Integrate across layers
2. Respect protection needs
3. Provide context for depth
4. Balance completeness with harm

### For Publishers
1. Filter by audience appropriateness
2. Add disclaimers where needed
3. Protect source anonymity
4. Regular ethical review

## Metadata

- **Pattern Type:** Research Methodology
- **Stability:** Core
- **Created:** 2024-09-17
- **Updated:** 2024-09-17
- **Status:** Active
- **Source:** Adapted from place-framework.md

## Change History

- 2024-09-17: Initial creation based on place-framework.md research layers