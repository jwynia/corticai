# Dual-Role Storage Architecture

## Overview

The CorticAI storage layer employs a dual-role architecture that separates storage concerns based on functional requirements rather than implementation technology. This design enables flexible backend selection while maintaining consistent interfaces for different storage roles.

## Classification
- **Domain:** Architecture
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Established
- **Lifecycle Stage:** Planning
- **Audience:** Architects, Developers

## Storage Role Definitions

### Primary Storage Role
**Purpose**: Universal, flexible storage for any data structure with standardized schema patterns

**Characteristics**:
- Schema-agnostic (handles any data structure via flexible JSON properties)
- Universal patterns that work across all context networks
- Raw storage of relationships, entities, events, and episodes
- Graph traversal and relationship discovery capabilities
- High write throughput for real-time data ingestion
- Optimized for relationship queries and pattern matching

**Data Types**:
- Graph entities (nodes and edges)
- Episode streams (temporal event data)
- Raw relationship mappings
- Unstructured context data
- Cross-reference indexes

**Query Patterns**:
- Graph traversal (`MATCH (a)-[r]->(b) WHERE...`)
- Pattern matching across entity types
- Relationship discovery and path finding
- Real-time data ingestion and retrieval

### Semantic Storage Role
**Purpose**: Typed projections and semantically optimized views for analytics and search

**Characteristics**:
- Strongly typed schemas derived from discovered patterns
- Optimized for specific query patterns and analytics workloads
- Full-text search capabilities across consolidated content
- Materialized views for performance optimization
- Aggregation and analytical processing
- Structured data with enforced schemas

**Data Types**:
- Materialized views of stable patterns
- Full-text search indexes
- Aggregated analytics data
- Typed projections from primary storage
- Performance-optimized denormalized views

**Query Patterns**:
- Full-text search across content
- Analytical aggregations and summaries
- Fast lookups via materialized views
- Cross-context pattern analysis
- Performance-critical read queries

## Interface Design Principles

### Role-Based Abstraction
Storage interfaces are defined by **role** rather than **implementation technology**:

```typescript
// Role-based interfaces (implementation-agnostic)
interface PrimaryStorage {
  // Universal, flexible operations
  storeEntity(entity: any): Promise<void>
  traverseRelationships(pattern: TraversalPattern): Promise<Path[]>
  findByPattern(pattern: any): Promise<Entity[]>
  streamEpisodes(filter?: EpisodeFilter): AsyncIterator<Episode>
}

interface SemanticStorage {
  // Typed, optimized operations
  search(query: string): Promise<SearchResult[]>
  aggregate(pipeline: AggregationPipeline): Promise<any[]>
  materializeView(viewDef: ViewDefinition): Promise<void>
  queryView(viewName: string, params: QueryParams): Promise<ViewResult[]>
}
```

### Implementation Independence
The consuming code works with role-based interfaces without knowledge of backend technology:

```typescript
class ContextEngine {
  constructor(
    private primaryStorage: PrimaryStorage,
    private semanticStorage: SemanticStorage
  ) {}

  // Uses Primary Storage for flexible data
  async recordEpisode(episode: Episode): Promise<void> {
    return this.primaryStorage.storeEntity(episode)
  }

  // Uses Semantic Storage for optimized queries
  async searchContent(query: string): Promise<SearchResult[]> {
    return this.semanticStorage.search(query)
  }
}
```

## Implementation Strategies

### Local Development Strategy
- **Primary Storage**: Kuzu graph database with flexible JSON properties
- **Semantic Storage**: DuckDB analytics database with typed columnar storage

```typescript
class LocalStorageProvider implements StorageProvider {
  primary: KuzuStorageAdapter     // Flexible graph storage
  semantic: DuckDBStorageAdapter  // Typed analytics storage

  async initialize(config: LocalStorageConfig): Promise<void> {
    // Initialize both databases in .context directory
  }
}
```

### Cloud Deployment Strategy
- **Primary Storage**: Cosmos DB with flexible document containers
- **Semantic Storage**: Cosmos DB with optimized containers and materialized views

```typescript
class CosmosStorageProvider implements StorageProvider {
  primary: CosmosDBStorageAdapter    // Role 1 - flexible documents
  semantic: CosmosDBStorageAdapter   // Role 2 - optimized views

  async initialize(config: CosmosStorageConfig): Promise<void> {
    // Initialize containers with different optimization strategies
  }
}
```

## Architecture Benefits

### Technology Flexibility
- **Backend Independence**: Switch between local and cloud storage without code changes
- **Mixed Deployments**: Use different backends for different roles in same deployment
- **Future-Proof**: Easy addition of new storage technologies (Redis, Neo4j, etc.)

### Performance Optimization
- **Role-Specific Optimization**: Each storage role optimized for its specific workload
- **Query Pattern Alignment**: Storage technology matches query requirements
- **Scalability Options**: Independent scaling of different storage roles

### Development Experience
- **Local-First Development**: Full functionality with local file-based storage
- **Cloud-Native Deployment**: Seamless transition to cloud storage
- **Test Isolation**: Different storage backends for different test scenarios

## Data Flow Patterns

### Write Path
1. **Primary Storage**: Raw data ingestion and relationship recording
2. **Consolidation Process**: Background processing discovers patterns
3. **Semantic Storage**: Materialized views created from discovered patterns

### Read Path
- **Real-time Queries**: Direct access to Primary Storage for current data
- **Analytical Queries**: Access to Semantic Storage for optimized performance
- **Mixed Queries**: Combine both storage roles for comprehensive results

## Configuration Abstraction

```typescript
interface StorageProviderConfig {
  mode: 'local' | 'cosmos' | 'mixed'

  primary: {
    type: 'kuzu' | 'cosmos'
    config: KuzuConfig | CosmosConfig
  }

  semantic: {
    type: 'duckdb' | 'cosmos'
    config: DuckDBConfig | CosmosConfig
  }
}
```

## Migration Considerations

### Local to Cloud Migration
- **Data Export**: Extract from Kuzu/DuckDB in standardized format
- **Schema Mapping**: Map flexible schemas to Cosmos document structures
- **Relationship Preservation**: Maintain graph relationships during migration
- **Performance Validation**: Ensure query performance post-migration

### Cloud to Local Migration
- **Backup Creation**: Export Cosmos data for local development
- **Schema Inference**: Derive local schemas from cloud document structures
- **Development Snapshots**: Create local copies for development work

## Related Architecture Documents
- [[storage-layer]] - Current storage implementation details
- [[corticai_architecture]] - Overall system architecture
- [[cosmos-db-integration-plan]] - Specific Cosmos DB implementation approach

## Next Steps
This architecture definition enables the creation of:
1. Detailed interface specifications
2. Implementation sequencing plans
3. Migration utility designs
4. Testing strategies for dual-role scenarios