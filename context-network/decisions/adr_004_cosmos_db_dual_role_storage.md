# ADR-004: Cosmos DB Dual-Role Storage Architecture

## Status
Proposed

## Context

CorticAI currently uses a dual-database architecture with Kuzu for flexible graph storage and DuckDB for analytics. This works well for local development but creates challenges for cloud deployment:

1. **Cloud Storage Complexity**: Managing two different database systems in the cloud increases operational complexity
2. **Cost Optimization**: Separate databases may not optimize cost effectively in cloud scenarios
3. **Deployment Simplicity**: Reducing the number of cloud services simplifies deployment and management
4. **Unified Scaling**: A single storage system can provide unified scaling characteristics

The need for cloud deployment, particularly in Azure, has highlighted the requirement for a storage strategy that can work both locally (file-based) and in the cloud (service-based) while maintaining the same functional capabilities.

## Decision

We will implement a **dual-role storage architecture** that abstracts storage concerns by functional role rather than implementation technology:

### Storage Roles Definition
- **Primary Storage**: Universal, flexible storage for any data structure with standardized schema patterns
- **Semantic Storage**: Typed projections and semantically optimized views for analytics and search

### Implementation Strategies
- **Local Development**: Kuzu (Primary) + DuckDB (Semantic)
- **Cloud Deployment**: Azure Cosmos DB (Primary) + Azure Cosmos DB (Semantic)

### Technical Approach
1. Define role-based interfaces (`PrimaryStorage`, `SemanticStorage`) independent of implementation
2. Create storage provider abstraction that implements both roles
3. Implement environment-based provider selection (local vs. cloud)
4. Enable seamless migration between storage providers

## Alternatives Considered

### Alternative 1: Separate Cloud Databases
Use separate cloud services for each role (e.g., Azure Cosmos DB + Azure SQL Analytics)
- **Rejected**: Increases operational complexity and cost management challenges

### Alternative 2: Single Database for All Modes
Use the same database technology for both local and cloud (e.g., only Cosmos DB)
- **Rejected**: Would compromise local development experience and increase cloud costs for development

### Alternative 3: Maintain Current Architecture Only
Keep dual-database approach without cloud optimization
- **Rejected**: Does not address cloud deployment requirements and cost optimization needs

## Consequences

### Positive
- **Technology Flexibility**: Can switch between local and cloud storage without code changes
- **Local-First Development**: Maintains excellent developer experience with file-based storage
- **Cloud-Native Deployment**: Optimizes for cloud characteristics while reducing operational complexity
- **Cost Optimization**: Enables single-service optimization strategies in cloud deployment
- **Future-Proof**: Architecture supports adding new storage technologies without interface changes

### Negative
- **Implementation Complexity**: Requires building abstraction layer and dual implementations
- **Testing Complexity**: Must validate functionality across multiple storage combinations
- **Migration Complexity**: Needs robust migration tools between storage providers

### Neutral
- **Performance**: Performance characteristics will differ between local and cloud but both will be optimized for their target environment
- **Feature Parity**: All features must work across both storage strategies, which constrains some optimization opportunities

## Implementation Requirements

### Phase 1: Interface Definition
- Define `PrimaryStorage` and `SemanticStorage` interfaces
- Create `StorageProvider` abstraction combining both roles
- Implement provider factory for environment-based selection

### Phase 2: Provider Implementation
- Implement `LocalStorageProvider` using existing Kuzu + DuckDB adapters
- Implement `CosmosStorageProvider` using dual Cosmos configurations
- Add comprehensive testing for both providers

### Phase 3: Migration and Deployment
- Build migration utilities for moving data between providers
- Create Azure deployment configurations optimized for Cosmos DB
- Implement operational monitoring and cost optimization

## Monitoring

Success will be measured by:
- **Development Experience**: Local development remains as fast and simple as current implementation
- **Cloud Performance**: Cloud deployment meets performance requirements within cost targets
- **Migration Reliability**: Data migration between providers maintains 100% data integrity
- **Operational Simplicity**: Cloud deployment requires fewer manual operations than current approach

## Related Decisions
- [[adr_001_storage_abstraction]] - Foundation storage interface design
- [[adr_002_graph_database_selection]] - Original Kuzu selection for graph storage
- [[adr_003_analytics_database_selection]] - Original DuckDB selection for analytics

## References
- [[dual-role-storage-architecture]] - Detailed architecture documentation
- [[cosmos-db-integration-plan]] - Implementation strategy
- [[cosmos-storage-tasks]] - Task breakdown for implementation