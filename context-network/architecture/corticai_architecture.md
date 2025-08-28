# CorticAI System Architecture

## Purpose
This document defines the complete system architecture for CorticAI (Universal Context Engine), detailing how the system provides intelligent context management for file-based projects.

## Classification
- **Domain:** Architecture
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Evolving

## System Overview

CorticAI is a dual-layer system that provides intelligent context management for any file-based project. It maintains a separation between primary artifacts (code, documents) and their contextual relationships, enabling multi-perspective access, automatic maintenance, and progressive understanding.

## Architecture Principles

### 1. Separation of Concerns
- Primary artifacts remain in their native structure
- Context layer operates independently
- No modification of source files required

### 2. Progressive Enhancement
- Start with minimal structure
- Learn patterns through usage
- Materialize optimizations as patterns stabilize

### 3. Universal Patterns with Domain Adapters
- Core engine is domain-agnostic
- Adapters provide domain-specific mappings
- Cross-domain learning enabled

### 4. Memory-Inspired Processing
- Working memory for active context
- Consolidation during quiet periods
- Long-term storage for established patterns
- Episodic archive for full history

## Core Components

### Storage Layer

#### Dual Database Architecture

**Kuzu (Graph Database)**
- Purpose: Relationship storage and traversal
- Schema: Flexible JSON properties
- Operations: Pattern matching, path finding
- Optimized for: Graph queries, relationship discovery

**DuckDB (Analytics Database)**
- Purpose: Materialized views and analytics
- Schema: Typed columns from stabilized patterns
- Operations: Aggregation, full-text search
- Optimized for: Fast queries, bulk analysis

#### Storage Hierarchy

```
.context/
├── working/            # Active working memory
│   ├── graph.kuzu     # Current relationships
│   └── sessions.db    # Active session data
├── semantic/          # Long-term knowledge
│   ├── patterns.db    # Established patterns
│   └── analytics.duckdb # Materialized views
├── episodic/          # Historical archive
│   ├── glacier/       # Append-only episode log
│   └── versions/      # Historical versions
└── meta/              # System metadata
    ├── schema/        # Schema evolution
    └── config.yaml    # Configuration
```

### Intelligence Layer

#### The Continuity Cortex

Provides persistent intelligence across agent sessions:

```typescript
class ContinuityCortex {
  // Intercept file operations
  interceptWrite(request: WriteRequest): WriteResponse
  
  // Detect duplicates and staleness
  findSimilar(request: WriteRequest): SimilarFile[]
  
  // Maintain freshness
  refreshStaleDocuments(): void
  
  // Learn patterns
  learnFromActions(action: Action): void
}
```

#### Lens System

Provides task-specific views:

```typescript
interface ContextLens {
  id: string
  activation: ActivationRules
  highlighting: HighlightRules
  loading: LoadingStrategy
  effectiveness: number  // Learned from usage
}
```

#### Pattern Detection

Identifies cross-domain patterns:

```typescript
class PatternDetector {
  // Universal patterns (work across domains)
  detectCircularDependency(): Pattern
  detectGodObject(): Pattern
  detectOrphan(): Pattern
  
  // Domain patterns (specific to domain)
  detectDomainPattern(domain: string): Pattern[]
  
  // Learn new patterns
  learnFromUsage(usage: UsageData): Pattern
}
```

### Domain Adapters

Enable universal engine to work with specific domains:

```typescript
interface DomainAdapter {
  // Define domain concepts
  nodeTypes: NodeTypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  
  // Extract from files
  extract(files: File[]): Entity[]
  
  // Map to graph
  toGraph(entities: Entity[]): GraphElements
  
  // Domain-specific operations
  operations: DomainOperation[]
}
```

### API Layer

#### Query Interface

```typescript
interface QueryAPI {
  // Natural language queries
  query(text: string, lens?: Lens): Result[]
  
  // Graph queries
  traverse(start: Node, pattern: Pattern): Path[]
  
  // Temporal queries
  getAsOf(node: Node, timestamp: Date): HistoricalNode
  
  // Progressive loading
  load(node: Node, depth: ContextDepth): NodeWithContext
}
```

#### Maintenance Interface

```typescript
interface MaintenanceAPI {
  // Consolidation
  consolidate(): ConsolidationResult
  
  // Deduplication
  deduplicate(): DeduplicationResult
  
  // Staleness management
  refresh(): RefreshResult
  
  // Pattern learning
  learn(): LearnedPatterns
}
```

## Memory Architecture

### Three-Tier Memory Model

#### Tier 1: Working Memory (Hot)
- Recent changes and active patterns
- High detail, quick access
- Limited capacity
- Cleared after consolidation

#### Tier 2: Semantic Memory (Warm)
- Established patterns and relationships
- Optimized representations
- Indexed for search
- Updated through consolidation

#### Tier 3: Episodic Archive (Cold)
- Complete historical record
- Append-only storage
- Compressed for space
- Accessed for conflict resolution

### Consolidation Process

The consolidation process runs during quiet periods to:
1. Extract patterns from working memory
2. Resolve contradictions
3. Update semantic memory
4. Archive episodes
5. Clear working memory

### Provenance Tracking

Every piece of knowledge maintains its lineage:

```typescript
interface Provenance {
  sources: EpisodeReference[]      // Original sources
  transformations: Transform[]     // How it was derived
  confidence: number               // Certainty level
  conflicts: Contradiction[]       // Alternative interpretations
  history: Version[]              // Historical versions
}
```

## Data Flow

### Ingestion Flow
1. File changes detected
2. Domain adapter extracts entities
3. Relationships identified
4. Working memory updated
5. Indices refreshed

### Query Flow
1. Natural language processed
2. Lens activated if applicable
3. Graph query generated
4. Progressive loading applied
5. Results ranked and returned

### Consolidation Flow
1. Quiet period detected
2. Patterns extracted from working memory
3. Conflicts resolved
4. Semantic memory updated
5. Episodes archived
6. Working memory cleared

## Integration with Mastra Framework

CorticAI integrates with Mastra to provide:
- Memory persistence for agents
- Context-aware tool selection
- Workflow state management
- Decision governance support

The integration points include:
- Agent memory hooks
- Tool execution context
- Workflow step enrichment
- Decision interception layer

## Scalability Considerations

### Performance Optimizations
- Incremental processing for changes
- Materialized views for common queries
- Lazy loading for historical data
- Caching for frequently accessed patterns

### Storage Optimizations
- Compression for episodic storage
- Deduplication at multiple levels
- Partitioning by time and domain
- Archival of stale data

### Concurrency Support
- Read-write locks for consistency
- Session isolation for agents
- Eventual consistency for indices
- Conflict-free replicated data types (CRDTs) for distributed operation

## Relationships
- **Parent Nodes:** [foundation/system_overview.md]
- **Child Nodes:** 
  - [architecture/storage_architecture.md] - details - Storage layer implementation
  - [architecture/intelligence_architecture.md] - details - Intelligence layer design
- **Related Nodes:** 
  - [foundation/problem_analysis.md] - solves - Core problems identified
  - [planning/implementation_phases.md] - implements - Phased build approach
  - [decisions/adr_002_kuzu_selection.md] - justifies - Graph database choice
  - [decisions/adr_003_duckdb_selection.md] - justifies - Analytics database choice

## Navigation Guidance
- **Access Context:** Reference this document for understanding the overall system architecture
- **Common Next Steps:** Review specific architecture components or implementation phases
- **Related Tasks:** Architecture review, component design, integration planning
- **Update Patterns:** Update when major architectural decisions are made or components are redesigned

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-28
- **Updated By:** Planning Phase