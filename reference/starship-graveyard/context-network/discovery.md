# Narrative Context Network Navigation Guide

## Overview

This context network contains all planning documents, conceptual work, and coordination information for narrative projects including novels/series, short stories, RPG games and modules, narrative games, interactive fiction, and other storytelling projects. It is organized into several key sections to facilitate navigation and information discovery for worldbuilding and narrative development.

## Structure

The narrative context network is organized as follows:

```
context-network/
├── discovery.md                # This navigation guide
├── foundation/                 # Core narrative project information
│   ├── project_definition.md   # Main narrative project purpose and goals
│   ├── structure.md            # Narrative structure overview
│   ├── principles.md           # Storytelling principles and standards
│   └── techniques/             # Specific writing technique guides
│       ├── emotional-cascade.md # Emotional cascade principle
│       └── narrative-voice-tone.md # Narrative voice and tone guide
├── elements/                   # Narrative elements
│   ├── world/                  # Worldbuilding information
│   │   ├── overview.md         # World framework
│   │   ├── history.md          # Historical timeline
│   │   ├── rules.md            # Physical/magical/social rules
│   │   └── cultures.md         # Cultural groups and dynamics
│   ├── characters/             # Character information
│   │   ├── overview.md         # Character design principles
│   │   ├── protagonists/       # Main character details
│   │   │   ├── marcus-voice-guide.md # Marcus Patel voice guide
│   │   │   └── rhea-voice-guide.md   # Rhea AI voice guide
│   │   ├── antagonists/        # Opposition character details
│   │   └── supporting/         # Supporting character details
│   │       └── voice-guide-template.md # Template for supporting characters
│   ├── plot/                   # Plot information
│   │   ├── overview.md         # Plot structure and principles
│   │   ├── arcs.md             # Major and minor arcs
│   │   ├── events.md           # Key story events
│   │   └── outline.md          # Detailed story outline
│   ├── settings/               # Setting information
│   │   ├── overview.md         # Setting design principles
│   │   ├── locations/          # Specific location details
│   │   ├── maps.md             # Spatial relationships
│   │   └── descriptions.md     # Standard setting descriptions
│   ├── themes/                 # Thematic information
│   │   ├── overview.md         # Core themes and motifs
│   │   ├── symbols.md          # Symbol system and usage
│   │   └── progressions.md     # Thematic development
│   └── mechanics/              # For games/interactive narratives ONLY (NOT for novels)
│       ├── overview.md         # System design principles (⚠️ See note in file)
│       ├── rules.md            # Core mechanics
│       ├── progression.md      # Player/character advancement
│       └── integration.md      # Narrative-mechanic integration
├── processes/                  # Process documentation
│   ├── creation.md             # Creation workflows
│   ├── validation.md           # Validation procedures
│   ├── delivery.md             # Delivery processes
│   └── document_integration.md # Process for integrating inbox documents
├── decisions/                  # Key narrative decisions
│   ├── decision_index.md       # Index of all decisions
│   └── [individual decision records]
├── planning/                   # Planning documents
│   ├── roadmap.md              # Project roadmap
│   └── milestones.md           # Milestone definitions
├── connections/                # Cross-cutting concerns
│   ├── dependencies.md         # Dependencies between elements
│   └── interfaces.md           # Interface definitions
├── discoveries/                # Discovery layer for insights and learning
│   ├── records/               # Individual discovery records
│   │   ├── YYYY-MM-DD-###.md # Timestamped discoveries
│   │   ├── TEMPLATE.md        # Discovery record template
│   │   └── index.md          # Discovery record index
│   ├── locations/             # Location-based indexes
│   │   ├── [element].md       # Where to find specific elements
│   │   └── index.md          # Location index overview
│   └── triggers.md           # When to create documentation
├── learning-paths/            # How understanding evolved
│   ├── [concept]-path.md     # Learning journey for concepts
│   ├── TEMPLATE.md           # Learning path template
│   └── index.md              # Learning paths overview
├── meta/                       # Information about the network itself
│   ├── updates.md              # Record of network changes
│   └── maintenance.md          # Network maintenance procedures
└── archive/                    # Archived documents from the inbox
```

## Navigation Paths

### For New Project Members
1. Start with `foundation/project_definition.md` to understand the narrative project's purpose
2. Review `foundation/principles.md` to understand storytelling principles
3. Explore `foundation/structure.md` for a narrative structure overview
4. Check `elements/world/overview.md` and `elements/characters/overview.md` for foundational understanding

### For Narrative Development
1. Review `elements/plot/overview.md` to understand plot structure approach
2. Explore `elements/themes/overview.md` to grasp thematic elements
3. Examine `elements/characters/overview.md` for character development framework
4. Check `connections/dependencies.md` for relationships between narrative elements

### For Worldbuilding
1. Start with `elements/world/overview.md` for worldbuilding framework
2. Explore specific aspects in other world subdirectories
3. Review `elements/settings/overview.md` for specific location development
4. Check `connections/dependencies.md` for world-narrative integration points

### For Game/Interactive Narrative Development (NOT APPLICABLE to Novel Projects)
1. Review `elements/mechanics/overview.md` for game system approach (⚠️ See warning in file)
2. Explore `elements/mechanics/integration.md` for narrative-mechanics integration
3. Check `elements/plot/overview.md` for interactive plot structure
4. Review `connections/interfaces.md` for player-narrative interaction points

### For Understanding Key Narrative Decisions
1. Start with `decisions/decision_index.md`
2. Navigate to specific decision records of interest
3. Review related structure documentation in `foundation/structure.md`
4. Check `elements/plot/events.md` or other relevant element documentation

### For Document Integration
1. Follow the process outlined in `processes/document_integration.md`
2. Update relevant sections of the context network
3. Record changes in `meta/updates.md`
4. Archive processed documents in `archive/`

### For Discovery Documentation
1. Check `discoveries/triggers.md` to understand when to document
2. Use `discoveries/records/TEMPLATE.md` for new discoveries
3. Update `discoveries/locations/` with key finding locations
4. Track learning journeys in `learning-paths/`

### For Finding Information
1. Check `discoveries/locations/` for where specific elements are located
2. Review `discoveries/records/index.md` for recent insights
3. Follow `learning-paths/` to understand concept evolution
4. Use location indexes to navigate directly to source material

## Maintenance

This context network is maintained according to the procedures documented in `meta/maintenance.md`. All changes to the network structure should be recorded in `meta/updates.md`.

## Classification System

Information nodes in this context network are classified along these dimensions:

1. **Domain**: [Primary knowledge area]
   - Examples: Core Concept, Supporting Element, External Factor, Resource, Output
   - Project-specific examples might include: Research, Design, Content, Process, Outcome

2. **Stability**: [Change frequency expectation]
   - Static: Fundamental principles unlikely to change
   - Semi-stable: Established patterns that evolve gradually
   - Dynamic: Frequently changing information

3. **Abstraction**: [Detail level]
   - Conceptual: High-level ideas and principles
   - Structural: Organizational patterns and frameworks
   - Detailed: Specific implementations and examples

4. **Confidence**: [Information reliability]
   - Established: Verified and reliable information
   - Evolving: Partially validated but subject to refinement
   - Speculative: Exploratory ideas requiring validation
