# Cross-Domain Patterns Research

## Purpose
This document researches universal patterns that exist across all domains - from software to novels to contracts to game design - identifying the fundamental primitives of knowledge organization that CorticAI can leverage.

## Classification
- **Domain:** Research/Universal Patterns
- **Stability:** Dynamic
- **Abstraction:** Conceptual
- **Confidence:** Evolving

## Universal Information Patterns

### 1. Hierarchical Organization

**Universal Pattern**: Information naturally organizes into hierarchies regardless of domain.

**Manifestations**:
- **Code**: Package → Module → Class → Method → Statement
- **Novel**: Book → Part → Chapter → Scene → Paragraph
- **Contract**: Agreement → Article → Section → Clause → Term
- **RPG**: Campaign → Adventure → Session → Encounter → Action
- **Research**: Field → Topic → Paper → Section → Claim

**Common Properties**:
```typescript
interface Hierarchy {
  root: Node
  levels: Level[]
  traversal: 'depth-first' | 'breadth-first'
  relationship: 'contains' | 'part-of'
  
  // Universal operations
  getParent(node: Node): Node | null
  getChildren(node: Node): Node[]
  getSiblings(node: Node): Node[]
  getAncestors(node: Node): Node[]
  getDescendants(node: Node): Node[]
}
```

### 2. Network/Graph Relationships

**Universal Pattern**: Entities connect in non-hierarchical ways forming networks.

**Manifestations**:
- **Code**: Function calls, dependencies, data flow
- **Novel**: Character relationships, plot threads, foreshadowing
- **Contract**: Cross-references, dependencies, amendments
- **RPG**: NPC relationships, quest connections, item requirements
- **Research**: Citations, author collaborations, concept links

**Common Properties**:
```typescript
interface Network {
  nodes: Set<Node>
  edges: Set<Edge>
  
  // Universal relationship types
  relationships: {
    references: Edge[]  // One mentions another
    depends: Edge[]     // One requires another
    conflicts: Edge[]   // One contradicts another
    derives: Edge[]     // One comes from another
    associates: Edge[]  // Loosely connected
  }
}
```

### 3. Sequential/Temporal Patterns

**Universal Pattern**: Information has temporal or sequential relationships.

**Manifestations**:
- **Code**: Execution order, version history, commits
- **Novel**: Timeline, flashbacks, parallel narratives
- **Contract**: Effective dates, amendment history, deadlines
- **RPG**: Campaign timeline, session order, turn sequence
- **Research**: Publication dates, research progression, citations over time

**Common Properties**:
```typescript
interface Temporal {
  // Time representations
  absolute: Timestamp     // Specific date/time
  relative: Duration      // Before/after relationships
  ordering: Sequence      // First, second, third
  
  // Universal operations
  precedes(a: Node, b: Node): boolean
  concurrent(a: Node, b: Node): boolean
  during(event: Node, period: Period): boolean
  evolution(node: Node): Version[]
}
```

### 4. Categorical/Tagged Organization

**Universal Pattern**: Information groups by shared properties or tags.

**Manifestations**:
- **Code**: Language, framework, design pattern, bug type
- **Novel**: Genre, theme, POV character, location
- **Contract**: Clause type, party, obligation, risk level
- **RPG**: Encounter type, difficulty, treasure tier, skill check
- **Research**: Methodology, field, keyword, funding source

**Common Properties**:
```typescript
interface Categorical {
  categories: Set<Category>
  tags: Set<Tag>
  
  // Universal categorization
  membership: {
    exclusive: Category[]  // Belongs to exactly one
    overlapping: Tag[]     // Can have multiple
    hierarchical: Tree     // Categories have subcategories
  }
  
  // Faceted classification
  facets: Map<Dimension, Value[]>
}
```

## Universal Entity Types

### Core Entities Present in All Domains

```typescript
interface UniversalEntities {
  // Container entities (hold other things)
  Container: {
    examples: ['File', 'Chapter', 'Section', 'Module', 'Folder']
    properties: ['name', 'contents', 'metadata']
    relationships: ['contains', 'part-of']
  }
  
  // Actor entities (do things or have agency)
  Actor: {
    examples: ['Function', 'Character', 'Party', 'Player', 'Author']
    properties: ['identifier', 'capabilities', 'state']
    relationships: ['performs', 'owns', 'creates']
  }
  
  // Event entities (things that happen)
  Event: {
    examples: ['Commit', 'Scene', 'Amendment', 'Session', 'Publication']
    properties: ['timestamp', 'participants', 'outcome']
    relationships: ['triggers', 'caused-by', 'during']
  }
  
  // Artifact entities (things that are created)
  Artifact: {
    examples: ['Code', 'Document', 'Contract', 'Map', 'Dataset']
    properties: ['content', 'format', 'version']
    relationships: ['created-by', 'derived-from', 'references']
  }
  
  // Concept entities (abstract ideas)
  Concept: {
    examples: ['Pattern', 'Theme', 'Term', 'Rule', 'Theory']
    properties: ['definition', 'examples', 'context']
    relationships: ['relates-to', 'contradicts', 'specializes']
  }
}
```

## Universal Relationship Types

### Relationships That Appear Everywhere

```typescript
enum UniversalRelationship {
  // Structural
  CONTAINS = 'contains',           // Parent-child
  PART_OF = 'part_of',            // Component
  INSTANCE_OF = 'instance_of',    // Type-instance
  
  // Reference
  REFERENCES = 'references',       // Mentions
  LINKS_TO = 'links_to',          // Connects
  CITES = 'cites',                // Sources
  
  // Dependency
  DEPENDS_ON = 'depends_on',      // Requires
  ENABLES = 'enables',            // Makes possible
  BLOCKS = 'blocks',              // Prevents
  
  // Evolution
  DERIVES_FROM = 'derives_from',  // Origins
  EVOLVES_TO = 'evolves_to',     // Becomes
  REPLACES = 'replaces',          // Supersedes
  
  // Similarity
  SIMILAR_TO = 'similar_to',      // Alike
  CONTRASTS = 'contrasts',        // Different
  DUPLICATES = 'duplicates',      // Same as
  
  // Temporal
  PRECEDES = 'precedes',          // Before
  FOLLOWS = 'follows',            // After
  CONCURRENT = 'concurrent',      // Same time
}
```

## Universal Operations

### Operations That Apply to All Domains

```typescript
interface UniversalOperations {
  // Navigation
  navigate: {
    up(): Node        // To parent/container
    down(): Node[]    // To children/contents
    next(): Node      // Sequential next
    previous(): Node  // Sequential previous
    related(): Node[] // Connected nodes
  }
  
  // Search
  search: {
    byName(pattern: string): Node[]
    byContent(query: string): Node[]
    byRelationship(type: Relationship): Node[]
    byProperty(key: string, value: any): Node[]
    bySimilarity(reference: Node): Node[]
  }
  
  // Analysis
  analyze: {
    findDuplicates(): NodePair[]
    findOrphans(): Node[]
    findCycles(): Cycle[]
    findClusters(): Cluster[]
    findPaths(from: Node, to: Node): Path[]
  }
  
  // Transformation
  transform: {
    merge(nodes: Node[]): Node
    split(node: Node): Node[]
    extract(node: Node, pattern: Pattern): Node[]
    abstract(nodes: Node[]): Concept
    concretize(concept: Concept): Node[]
  }
}
```

## Domain-Agnostic Patterns

### Patterns That Work Regardless of Content Type

#### 1. The Index Pattern
Every domain benefits from multiple indexes:
- **Alphabetical**: Finding by name
- **Categorical**: Finding by type
- **Temporal**: Finding by time
- **Relational**: Finding by connection
- **Frequency**: Finding by importance

#### 2. The Version Pattern
Everything evolves over time:
- **Linear**: Version 1 → 2 → 3
- **Branching**: Alternative versions
- **Merging**: Combining versions
- **Abandoning**: Discontinued paths

#### 3. The Annotation Pattern
Metadata enriches content:
- **Tags**: Categorical metadata
- **Comments**: Explanatory metadata
- **Ratings**: Evaluative metadata
- **Timestamps**: Temporal metadata
- **Authorship**: Provenance metadata

#### 4. The Composition Pattern
Complex things built from simple:
- **Aggregation**: Collecting related items
- **Layering**: Building in levels
- **Inheritance**: Extending existing
- **Mixing**: Combining properties

## Cross-Domain Learning

### How Patterns from One Domain Inform Another

**From Software to Writing**:
- Refactoring → Revision patterns
- Debugging → Consistency checking
- Version control → Draft management
- Code review → Beta reading

**From Legal to Software**:
- Contract clauses → Interface contracts
- Amendment tracking → Change management
- Compliance checking → Test coverage
- Party relationships → Stakeholder management

**From Gaming to Business**:
- Campaign planning → Project planning
- Encounter balance → Resource allocation
- Player engagement → User engagement
- Loot tables → Reward systems

**From Research to Everything**:
- Citation networks → Dependency tracking
- Literature review → Context gathering
- Hypothesis testing → Validation
- Peer review → Quality assurance

## Implementation Implications

### What This Means for CorticAI

1. **Core Engine Should Handle**:
   - Hierarchies (universal)
   - Networks (universal)
   - Sequences (universal)
   - Categories (universal)

2. **Domain Adapters Should Provide**:
   - Domain-specific entity types
   - Domain-specific relationship names
   - Domain-specific operations
   - Domain-specific views

3. **Learning Transfer**:
   - Patterns learned in one domain can suggest patterns in another
   - Successful organizational schemes can be adapted
   - Problem-solving approaches can be translated

## Open Questions

1. What patterns are truly universal vs just common?
2. How deep should the universal layer go?
3. Can we automatically detect domain from patterns?
4. How to handle pattern conflicts between domains?
5. What's the minimal universal set?

## Success Criteria

- Can represent any domain without loss of information
- Patterns discovered in one domain apply to others
- Users recognize their domain's concepts in universal terms
- No domain requires special-case handling in core
- Learning transfers between domains effectively

## Relationships
- **Parent Nodes:** [research/index.md]
- **Related Nodes:** 
  - [problem_validation/multi_perspective_access.md] - enables - Universal views
  - [knowledge_representation/ontology_design.md] - defines - Universal ontology
  - Domain adapter research (to be created) - implements - Domain specialization

## Navigation Guidance
- **Access Context:** Reference when designing core engine
- **Common Next Steps:** Define universal operations, test with multiple domains
- **Related Tasks:** Core engine design, adapter interface definition
- **Update Patterns:** Update as new domains reveal new patterns

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Universal Context Research