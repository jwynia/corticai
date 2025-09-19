# Universal Context Engine: Design Document

## Executive Summary

This document outlines the design for a Universal Context Engine - a software system that provides structured context management for any file-based project. Originally developed for code repositories, the system has proven valuable across diverse domains including novels, contracts, role-playing games, and project management. The engine acts as an intelligent wrapper that augments direct file access with rich contextual understanding, relationships, and multi-perspective views.

## Problem Statement

### Core Problems

1. **Context Fragmentation**: Knowledge about projects exists across multiple disconnected systems (files, issue trackers, documentation, team memory) with no unified access method.

2. **Single-Hierarchy Limitation**: File systems enforce a "table of contents" organization where each piece of content exists in exactly one location, while understanding requires "index-like" access where content can be accessed from multiple perspectives.

3. **Context Maintenance Burden**: When agents (human or AI) responsible for primary work also maintain context documentation, both tasks suffer. Context updates become afterthoughts, leading to staleness and knowledge loss.

4. **Limited Historical Understanding**: Traditional version control preserves code history but loses experimental branches, decision rationale, and the learning journey. Critical context disappears with branch deletion, squash merges, and rebases.

5. **Static Organization**: Current tools provide fixed organizational schemes that can't adapt to different tasks, audiences, or perspectives. The same code needs different context when debugging versus feature development.

6. **Domain Specificity**: Existing solutions are typically domain-specific (code analyzers, writing tools, contract management), preventing knowledge transfer across domains despite shared patterns.

### Observed Patterns

Through 50-75 project implementations using markdown-based context networks, several patterns emerged:

- Context networks improve agent performance by enabling selective context loading
- Maintenance quality degrades when primary task agents also manage context
- The same organizational patterns work across vastly different domains
- Historical context and external connections dramatically improve understanding
- Multi-perspective access patterns naturally emerge in all domains

## Solution Architecture

### Conceptual Model

The Universal Context Engine implements a dual-layer architecture:

1. **Primary Layer**: Original files remain in their native structure (file system, git repository)
2. **Context Layer**: Rich metadata, relationships, and indexes stored separately

This separation enables:
- Clean version control for primary artifacts
- Rich context evolution without polluting primary history
- Multiple perspective views of the same content
- Independent scaling of context infrastructure

### Key Innovations

#### 1. Index-First Organization

Moving from "table of contents" to "index" thinking:

- **Traditional**: Files exist in one location, accessed by path
- **Context Engine**: Content accessible through multiple indexes based on concept, pattern, concern, or any other dimension

#### 2. Progressive Schema Evolution

Borrowing from EAV (Entity-Attribute-Value) patterns:

- **Phase 1**: Flexible JSON properties for discovering patterns
- **Phase 2**: Materialized typed views for established patterns
- **Result**: System learns optimal schema through usage

#### 3. Multi-Lens Viewing

The same content viewed differently based on context:

- **Debug Lens**: Emphasizes error paths, logs, recent changes
- **Architecture Lens**: Highlights patterns, dependencies, design decisions
- **Learning Lens**: Shows evolution, attempts, rationale

#### 4. Meta-Repository Pattern

Context repository observes and preserves the full history:

- Maintains deleted branches for learning from failed experiments
- Tracks context evolution separately from code evolution
- Enables temporal queries across all historical states

## System Design

### Core Components

```
Universal Context Engine
├── Storage Layer (Dual Database)
│   ├── Kuzu (Graph Database)
│   │   ├── Flexible node/edge schema
│   │   ├── Relationship tracking
│   │   └── Pattern detection
│   └── DuckDB (Analytics Database)
│       ├── Materialized typed views
│       ├── Full-text search indexes
│       └── Temporal analytics
├── Domain Adapters
│   ├── Code Adapter
│   ├── Document Adapter
│   ├── Contract Adapter
│   └── [Extensible for any domain]
├── Index System
│   ├── Structural Indexes (AST, hierarchy)
│   ├── Semantic Indexes (concepts, meanings)
│   ├── Temporal Indexes (changes, evolution)
│   └── External Indexes (issues, requirements)
├── Lens Manager
│   ├── Lens Definitions
│   ├── Activation Rules
│   └── Context Loading Strategies
└── API/Agent Interface
    ├── Query Interface
    ├── Update Interface
    └── Maintenance Agents
```

### Storage Design

#### Minimal Core Schema

```sql
-- Kuzu: Flexible graph storage
CREATE NODE TABLE nodes (
    id UUID PRIMARY KEY,
    type VARCHAR,
    properties JSON,
    created TIMESTAMP,
    modified TIMESTAMP
);

CREATE REL TABLE edges (
    from UUID,
    to UUID,
    type VARCHAR,
    properties JSON
);

-- DuckDB: Typed analytics when patterns stabilize
CREATE TABLE discovered_patterns AS
SELECT 
    node_id,
    json_extract_string(properties, '$.pattern_type') as pattern_name,
    -- Typed columns discovered through usage
    CAST(json_extract(properties, '$.complexity') AS INTEGER) as complexity
FROM kuzu_export
WHERE [pattern_conditions];
```

#### Schema Evolution Pipeline

1. **Capture**: Everything starts as JSON properties
2. **Observe**: Track frequently occurring properties
3. **Detect**: Identify stable patterns worth optimizing
4. **Materialize**: Create typed views for performance
5. **Maintain**: Keep both flexible and typed representations

### File Organization

```
project/
├── .gitignore (includes .context/)
├── .context/
│   ├── config.yaml           # Engine configuration
│   ├── graph.kuzu/          # Graph database
│   ├── analytics.duckdb     # Analytics database
│   ├── indexes/             # Semantic and search indexes
│   ├── lenses/              # Perspective definitions
│   └── context.git/         # Link to context repository

context-repo/ (separate repository)
├── observations/
│   ├── main-repo/           # Complete history mirror
│   ├── events/              # Change event log
│   └── patterns/            # Detected patterns
├── interpretations/
│   ├── graphs/              # Kuzu snapshots
│   └── analytics/           # DuckDB snapshots
└── meta/
    ├── schema_evolution.yaml
    └── learning_log.jsonl
```

### Domain Adapters

Each domain implements a standard interface:

```typescript
interface DomainAdapter {
  // Define domain-specific node types
  nodeTypes: Record<string, NodeTypeDefinition>
  
  // Define domain-specific relationships
  edgeTypes: Record<string, EdgeTypeDefinition>
  
  // Define domain-specific indexes
  indexes: Record<string, IndexDefinition>
  
  // Extract domain entities from files
  extract(files: File[]): Entity[]
  
  // Map domain queries to graph queries
  translateQuery(natural: string): GraphQuery
}
```

### Lens System

Lenses provide task-specific views:

```typescript
interface ContextLens {
  id: string
  name: string
  
  // When to activate this lens
  activation: {
    patterns: string[]     // File patterns, query patterns
    contexts: string[]     // Active work contexts
  }
  
  // How to modify visibility
  highlighting: {
    emphasize: GraphQuery  // What to make prominent
    deemphasize: GraphQuery // What to fade
    augment: DataSource[]  // External data to overlay
  }
  
  // Selective loading strategy
  loading: {
    priority: LoadingRule[]
    depth: number          // Traversal depth
    gradients: ContextDepth[] // Level of detail
  }
}
```

### Progressive Context Loading

Instead of binary loaded/not-loaded states:

```typescript
enum ContextDepth {
  SIGNATURE = 1,   // Names and interfaces only
  STRUCTURE = 2,   // + Relationships and dependencies
  SEMANTIC = 3,    // + Meanings and patterns
  DETAILED = 4,    // + Full implementation
  HISTORICAL = 5   // + Complete history
}
```

## Implementation Strategy

### Phase 1: Core Engine (Months 1-2)

1. Implement dual database storage (Kuzu + DuckDB)
2. Create minimal schema with JSON flexibility
3. Build basic file monitoring and event capture
4. Implement simple API for queries and updates

### Phase 2: Domain Support (Months 2-3)

1. Create code domain adapter (most structured)
2. Add document domain adapter (markdown, prose)
3. Implement universal pattern detection
4. Build basic index generation

### Phase 3: Intelligence Layer (Months 3-4)

1. Implement lens system with 2-3 initial lenses
2. Add progressive context loading
3. Create maintenance agents for context updates
4. Build query translation layer

### Phase 4: External Integration (Months 4-5)

1. Connect to GitHub/GitLab issues
2. Add Jira/Azure DevOps integration
3. Implement external index augmentation
4. Create bi-directional sync protocols

### Phase 5: Advanced Features (Months 5-6)

1. Implement meta-repository pattern
2. Add temporal query capabilities
3. Build pattern learning system
4. Create cross-domain insight detection

## Key Design Decisions

### Why Dual Database?

**Kuzu for relationships**: Optimized for graph traversal, pattern matching, and flexible schema
**DuckDB for analytics**: Optimized for aggregations, full-text search, and typed queries

Together they provide both flexibility and performance without compromise.

### Why Separate Context Repository?

- Preserves complete history including deleted branches
- Enables context evolution tracking independent of code
- Allows multiple working copies to share context
- Provides backup and versioning for context itself

### Why Domain Adapters?

- Enables universal patterns while respecting domain specifics
- Allows gradual addition of new domains
- Facilitates cross-domain learning and insights
- Maintains single core engine with multiple applications

### Why Lens System?

- Different tasks require different context emphasis
- Reduces cognitive load by filtering irrelevant information
- Enables learning which views are most effective
- Supports multiple simultaneous users/agents with different needs

## Success Metrics

### Performance Metrics

- Query response time < 100ms for indexed queries
- Context loading < 1s for typical working sets
- Update propagation < 500ms for file changes
- Schema evolution < 5m for pattern materialization

### Effectiveness Metrics

- Reduction in context switches during tasks
- Increase in relevant context retrieval precision
- Decrease in time to find related information
- Improvement in agent task completion quality

### Adoption Metrics

- Number of domains successfully adapted
- Frequency of lens usage patterns
- Growth in detected cross-domain patterns
- Maintenance burden reduction vs. manual context management

## Risk Mitigation

### Risk: Schema Evolution Complexity

**Mitigation**: Start with minimal required schema, use JSON for everything else, only materialize patterns that prove stable over time

### Risk: Synchronization Conflicts

**Mitigation**: Treat file system as source of truth, context as derived data that can be regenerated, use event sourcing for consistency

### Risk: Performance at Scale

**Mitigation**: Implement progressive loading, use materialized views for hot paths, partition historical data from active context

### Risk: Cross-Domain Confusion

**Mitigation**: Clear domain adapter boundaries, explicit domain tagging, prevent cross-domain pollution in indexes

## Future Enhancements

### Next Iteration

After the core system is operational, these enhancements become possible:

- Machine learning for pattern detection
- Automated lens generation from usage patterns
- Real-time collaborative context updates
- Plugin architecture for custom domains

### Future Iterations

As the system matures and patterns stabilize:

- Distributed context networks across teams
- Cross-project pattern learning
- Autonomous context maintenance agents
- Natural language context programming

### Enhancement Triggers

Rather than timeline-based planning, enhancements should be triggered by:
- Pattern stabilization in current implementation
- User/agent feedback revealing consistent needs
- Performance bottlenecks in common operations
- Discovery of cross-domain patterns worth generalizing

## Conclusion

The Universal Context Engine represents a fundamental shift in how we organize and access project information. By moving from single-hierarchy file systems to multi-dimensional index systems, implementing progressive schema evolution, and supporting multiple perspective lenses, the system enables more effective work across any domain.

The key insight is recognizing that context management patterns are universal - the same relationship types, organizational needs, and access patterns appear whether managing code, novels, contracts, or any other structured information. By building a domain-agnostic engine with domain-specific adapters, we can leverage learning across all domains while respecting their unique characteristics.

This design provides a path from the current successful markdown-based context networks to a more powerful, maintainable, and intelligent system that can truly serve as a "second brain" for any project.