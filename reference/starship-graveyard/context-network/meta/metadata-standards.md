# Context Network Metadata Standards

## Purpose
Defines standardized metadata formats for all documents within the context network to ensure consistency, navigation, and maintainability.

## Classification
- **Domain:** Meta/Standards
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established

## Metadata Format Tiers

### Tier 1: Full Metadata Format
For primary content nodes including frameworks, major planning documents, and comprehensive guides.

```markdown
# [Document Title]

## Purpose
[Concise explanation of this document's function within the networlink standards

## Classification
- **Domain:** [Primary knowledge arelink standards
- **Stability:** [Static/Semi-stable/Dynamic]
- **Abstraction:** [Conceptual/Structural/Detailelink standards
- **Confidence:** [Established/Evolving/Speculative]

## Content
[Primary content sectionlink standards

## Relationships
- **Parent Nodes:** [List or "None" for root nodelink standards
- **Child Nodes:** [List or "None" if no childrelink standards
- **Related Nodes:** 
  - [Node Name] - [Relationship Type] - [Brief descriptiolink standards

## Navigation Guidance
- **Access Context:** [When to reference this documenlink standards
- **Common Next Steps:** [Typical navigation paths from here]
- **Related Tasks:** [Activities where this information is relevanlink standards
- **Update Patterns:** [When and how this document changelink standards

## Metadata
- **Created:** YYYY-MM-DD
- **Last Updated:** YYYY-MM-DD
- **Updated By:** [Person/Agent/Role]
- **Version:** [Optional - for critical documentlink standards

## Change History
- YYYY-MM-DD: [Brief description of changelink standards
```

### Tier 2: Index Metadata Format
For navigation hubs, index files, and directory overviews.

```markdown
# [Index Title]

## Purpose
[Navigation/index purpose]

## Quick Navigation
[Navigation links and structure]

## Metadata
- **Type:** Index/Navigation Hub
- **Scope:** [What this indexelink standards
- **Last Updated:** YYYY-MM-DD
- **Maintainer:** [Role responsible for updatelink standards
```

### Tier 3: Minimal Metadata Format
For atomic notes, discovery records, and brief references.

```markdown
# [Title]

## Purpose
[Brief purpose if not obvious from title]

[Contenlink standards

---
**Created:** YYYY-MM-DD | **Updated:** YYYY-MM-DD | **Type:** [Discovery/Note/Reference]
```

## Field Definitions

### Classification Fields

#### Domain
Primary knowledge area. Standard values:
- **Core Concept** - Fundamental project elements
- **Supporting Element** - Additional details and extensions
- **Process** - Workflows and procedures
- **Navigation** - Indices and guides
- **Reference** - Templates and standards
- **Meta** - Information about the network itself

#### Stability
Expected change frequency:
- **Static** - Rarely changes (fundamental principles)
- **Semi-stable** - Occasional updates (established patterns)
- **Dynamic** - Frequent changes (active development)

#### Abstraction
Level of detail:
- **Conceptual** - High-level ideas and principles
- **Structural** - Organization and architecture
- **Detailed** - Specific implementations

#### Confidence
Information reliability:
- **Established** - Verified and settled
- **Evolving** - In active development
- **Speculative** - Experimental or proposed

### Relationship Types
- **extends** - Builds upon the linked node
- **implements** - Applies concepts from linked node
- **complements** - Provides additional perspective
- **contrasts** - Offers alternative approach
- **requires** - Depends on linked node
- **informs** - Provides context for linked node

## Implementation Guidelines

### When to Use Each Tier

**Use Tier 1 (Full) for:**
- Framework documents
- Major planning documents
- Character/world/theme overviews
- Process documentation
- Decision records

**Use Tier 2 (Index) for:**
- Directory index.md files
- Navigation hubs
- Quick reference guides
- Link collections

**Use Tier 3 (Minimal) for:**
- Discovery findings
- Quick notes
- Example files
- Temporary documents

### Migration Process
1. Identify current format tier for each document
2. Update metadata when document is next modified
3. Prioritize high-traffic documents
4. Use templates for new documents

### Quality Checks
- Verify all Tier 1 documents have complete metadata
- Ensure classification fields use standard values
- Check relationship links are bidirectional where appropriate
- Validate date formats (YYYY-MM-DD)

## Relationships
- **Parent Nodes:** [[maintenance]]
- **Child Nodes:** [[node_template]], [[link-standardlink standards]
- **Related Nodes:**
  - [[../processes/document_integratiolink standards] - implements - Uses these standards
  - [templates](../templates/) - informs - Templates follow these standards

## Navigation Guidance
- **Access Context:** Reference when creating or updating documents
- **Common Next Steps:** Apply to specific document type
- **Related Tasks:** Document creation, metadata updates
- **Update Patterns:** Updates when new patterns emerge

## Metadata
- **Created:** 2025-06-29
- **Last Updated:** 2025-06-29
- **Updated By:** Assistant
- **Version:** 1.0

## Change History
- 2025-06-29: Initial creation based on analysis of existing formats