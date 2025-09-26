# CorticAI Technical Backlog

## Purpose
Detailed technical tasks derived from the roadmap, organized by phase and priority. Each task includes specific implementation details and acceptance criteria.

## Classification
- **Domain:** Planning
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** Established

## Phase 2: Progressive Loading System ✅ COMPLETE

### 2.1 Core Depth Infrastructure ✅ COMPLETE
- [x] **Define ContextDepth enum** ✅ COMPLETE
  - Location: `app/src/types/context.ts:20-35` ✅ IMPLEMENTED
  - Values: SIGNATURE, STRUCTURE, SEMANTIC, DETAILED, HISTORICAL ✅ IMPLEMENTED
  - Include depth comparison utilities ✅ IMPLEMENTED
  - Add documentation for each level ✅ IMPLEMENTED

- [x] **Implement depth configuration** ✅ COMPLETE
  - Add to ContextOptions interface ✅ IMPLEMENTED
  - Support per-query depth override ✅ IMPLEMENTED
  - Default depth settings in config ✅ IMPLEMENTED
  - Depth inheritance for nested queries ✅ IMPLEMENTED

- [x] **Create property projection maps** ✅ COMPLETE
  - Define which properties load at each depth ✅ IMPLEMENTED
  - Support domain-specific projections ✅ IMPLEMENTED
  - Allow custom projection definitions ✅ IMPLEMENTED
  - Performance benchmarks for each level ✅ IMPLEMENTED

### 2.2 Query System Enhancement ✅ COMPLETE
- [x] **Extend QueryBuilder for depth** ✅ COMPLETE
  - Add `withDepth()` method ✅ IMPLEMENTED (`app/src/query/QueryBuilder.ts`)
  - Modify Cypher generation for property filtering ✅ IMPLEMENTED
  - Support depth in relationship traversal ✅ IMPLEMENTED
  - Test with complex nested queries ✅ IMPLEMENTED

- [x] **Implement progressive query execution** ✅ COMPLETE
  - Lazy evaluation of query parts ✅ IMPLEMENTED
  - Cursor-based result streaming ✅ IMPLEMENTED
  - Partial result caching ✅ IMPLEMENTED
  - Query plan optimization based on depth ✅ IMPLEMENTED

- [x] **Add batch loading strategies** ✅ COMPLETE
  - N+1 query prevention ✅ IMPLEMENTED
  - Dataloader pattern implementation ✅ IMPLEMENTED
  - Parallel query execution ✅ IMPLEMENTED
  - Connection pooling optimization ✅ IMPLEMENTED

### 2.3 Storage Adapter Updates
- [ ] **Enhance KuzuStorageAdapter**
  - Implement depth-aware node retrieval
  - Add property filtering in Cypher
  - Support incremental property loading
  - Handle JSON nested property access

- [ ] **Create caching layer**
  - LRU cache for loaded nodes
  - Depth-aware cache invalidation
  - Cache warming strategies
  - Memory usage monitoring

- [ ] **Implement lazy relationships**
  - Relationship stub creation
  - On-demand relationship loading
  - Circular reference handling
  - Relationship depth limits

## Phase 3: Lens System ✅ COMPLETE

### 3.1 Core Lens Infrastructure ✅ COMPLETE
- [x] **Define ContextLens interface** ✅ COMPLETE
  - Activation patterns (keywords, queries) ✅ IMPLEMENTED (`app/src/context/lenses/ContextLens.ts`)
  - Highlighting rules (emphasize/deemphasize) ✅ IMPLEMENTED
  - Loading priorities ✅ IMPLEMENTED
  - Composition rules ✅ IMPLEMENTED

- [x] **Create lens registry** ✅ COMPLETE
  - Lens registration API ✅ IMPLEMENTED (`app/src/context/lenses/LensRegistry.ts`)
  - Lens discovery mechanism ✅ IMPLEMENTED
  - Conflict resolution ✅ IMPLEMENTED
  - Priority ordering ✅ IMPLEMENTED

- [x] **Implement lens application** ✅ COMPLETE
  - Query modification pipeline ✅ IMPLEMENTED
  - Result filtering/transformation ✅ IMPLEMENTED
  - Lens stacking/composition ✅ IMPLEMENTED
  - Performance impact measurement ✅ IMPLEMENTED

### 3.2 Default Lenses ✅ COMPLETE
- [x] **Debug lens** ✅ COMPLETE
  - Show all relationships ✅ IMPLEMENTED
  - Include metadata ✅ IMPLEMENTED
  - Expose internal IDs ✅ IMPLEMENTED
  - Performance metrics ✅ IMPLEMENTED

- [x] **Production lens** ✅ COMPLETE
  - Hide internal details ✅ IMPLEMENTED
  - Optimize for speed ✅ IMPLEMENTED
  - Security filtering ✅ IMPLEMENTED
  - Error sanitization ✅ IMPLEMENTED

- [x] **Exploration lens** ✅ COMPLETE
  - Breadth-first loading ✅ IMPLEMENTED
  - Pattern highlighting ✅ IMPLEMENTED
  - Anomaly detection ✅ IMPLEMENTED
  - Relationship discovery ✅ IMPLEMENTED

## Phase 4: Domain Adapters (In Progress)

### 4.0 NovelAdapter (Proof of Concept) ✅ COMPLETE
- [x] **Implement core adapter** ✅ COMPLETE
  - Node type definitions (narrative, character, plot, etc.) ✅ IMPLEMENTED (`app/src/adapters/NovelAdapter.ts`)
  - Relationship mappings ✅ IMPLEMENTED
  - Property schemas ✅ IMPLEMENTED
  - Validation rules ✅ IMPLEMENTED

- [x] **Cross-domain validation** ✅ COMPLETE
  - Comprehensive test suite ✅ IMPLEMENTED
  - Narrative analysis capabilities ✅ IMPLEMENTED
  - Domain-agnostic foundation proven ✅ VALIDATED

### 4.1 PlaceDomainAdapter (Proof of Concept)
- [ ] **Implement core adapter**
  - Node type definitions (place, activity, service, etc.)
  - Relationship mappings
  - Property schemas
  - Validation rules

- [ ] **Add spatial support**
  - Coordinate storage
  - Distance calculations
  - Bounding box queries
  - Geographic indexing

- [ ] **Implement temporal features**
  - Hours of operation
  - Event scheduling
  - Temporal queries
  - Timezone handling

- [ ] **Natural language queries**
  - "coffee shops in SOMA"
  - "open late on Tuesday"
  - "family-friendly activities"
  - Query explanation

### 4.2 CodeDomainAdapter
- [ ] **AST integration**
  - Parse TypeScript/JavaScript
  - Extract symbols and dependencies
  - Build call graphs
  - Track type relationships

- [ ] **Code intelligence**
  - Find references
  - Go to definition
  - Rename refactoring support
  - Dead code detection

### 4.3 Adapter Framework
- [ ] **Adapter composition**
  - Multi-domain projects
  - Adapter chaining
  - Conflict resolution
  - Priority handling

- [ ] **Validation framework**
  - Schema validation
  - Relationship constraints
  - Property type checking
  - Custom validators

## Phase 5: Extensions

### 5.1 Pattern Detection
- [ ] **Universal patterns**
  - Circular dependencies
  - God objects
  - Orphaned nodes
  - Duplicate detection

- [ ] **Domain patterns**
  - Code smells
  - Anti-patterns
  - Best practice violations
  - Security issues

- [ ] **Pattern visualization**
  - Graph visualization
  - Pattern highlighting
  - Remediation suggestions
  - Trend analysis

### 5.2 External Integration
- [ ] **API framework**
  - OAuth support
  - Rate limiting
  - Error handling
  - Retry logic

- [ ] **Data synchronization**
  - Change detection
  - Conflict resolution
  - Merge strategies
  - Audit logging

## Technical Debt & Refactoring

### High Priority
- [ ] **Nested property query support**
  - Test Kuzu JSON path expressions
  - Implement fallback strategies
  - Performance optimization
  - Documentation

- [ ] **Error handling standardization**
  - Custom error types
  - Error context preservation
  - Recovery strategies
  - User-friendly messages

### Medium Priority
- [ ] **Test coverage improvement**
  - Integration tests for complex queries
  - Performance benchmarks
  - Load testing
  - Edge case coverage

- [ ] **API documentation**
  - Generate from TypeScript
  - Usage examples
  - Best practices
  - Migration guides

### Low Priority
- [ ] **Code organization**
  - Extract query strategies
  - Separate concerns
  - Dependency injection
  - Plugin architecture

## Implementation Guidelines

### For Each Task:
1. Create feature branch
2. Write tests first (TDD)
3. Implement incrementally
4. Document as you go
5. Performance benchmark
6. Code review
7. Update context network

### Definition of Done:
- [ ] Tests passing (unit & integration)
- [ ] Documentation updated
- [ ] Performance benchmarked
- [ ] Code reviewed
- [ ] Context network updated
- [ ] No regression in existing features

## Priority Matrix

### Must Have (Phase 2)
- ContextDepth implementation
- Basic progressive loading
- Query depth support

### Should Have (Phase 3-4)
- Lens system
- PlaceDomainAdapter
- Pattern detection

### Could Have (Phase 5)
- External integrations
- Advanced visualizations
- Predictive features

## Phase 7: Cloud Storage Architecture (Future)

**Prerequisites**: Phase 5 completion, production deployment requirements
**Scope**: Dual-role storage architecture with Azure Cosmos DB backend
**Context**: Enable cloud-native deployment while preserving local-first development

### Phase Overview
- **Primary Storage Role**: Cosmos DB containers with flexible document schemas
- **Semantic Storage Role**: Cosmos DB containers optimized for analytics and search
- **Migration Strategy**: Seamless transition between local (Kuzu+DuckDB) and cloud (Cosmos+Cosmos)
- **Validation Case**: Test CorticAI's ability to manage its own complex planning context

**→ Detailed Implementation**: See [[cosmos-storage-tasks]] for complete task breakdown (17 tasks, 5 sequences)
**→ Architecture Details**: See [[cosmos-db-integration-plan]] and [[dual-role-storage-architecture]]

### Key Decision Points
- **When to Start**: After Phase 5 extensions complete, before production scaling needs
- **Validation Criteria**: CorticAI successfully prevents planning orphaning in its own context
- **Success Metrics**: Local-cloud feature parity, <2x performance difference, cost-optimized RU consumption

### Won't Have (This Iteration)
- Multi-tenancy
- Real-time collaboration
- Cross-cloud provider support

## Relationships
- **Parent Nodes:** [planning/roadmap.md]
- **Related Nodes:**
  - [architecture/system_architecture.md] - implements
  - [foundation/core_concepts.md] - realizes

## Navigation Guidance
- **Access Context:** Reference when planning sprints or assigning work
- **Common Next Steps:** Pick tasks for implementation, create feature branches
- **Update Patterns:** Update as tasks are completed or new tasks identified