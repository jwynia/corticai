# Phase 1: Graph Integration & Context Structure - Detailed Tasks

## Overview
Phase 1 establishes the dual-database architecture and context separation that enables all future intelligence features.

## Task 1: Kuzu Graph Database Integration

### Task 1.1: Install and Configure Kuzu
**Estimated Time**: 2 hours
**Priority**: Critical
**Dependencies**: None

**Acceptance Criteria**:
- [ ] Kuzu package added to dependencies
- [ ] Basic connection test passing
- [ ] Database file creation working
- [ ] Error handling for connection failures
- [ ] Logging configured

**Implementation**:
```typescript
// app/src/storage/adapters/KuzuStorageAdapter.ts
import { Database } from 'kuzu';
import { BaseStorageAdapter } from '../base/BaseStorageAdapter';

export class KuzuStorageAdapter extends BaseStorageAdapter<GraphEntity> {
  private db: Database;

  async initialize(path: string): Promise<void> {
    this.db = new Database(path);
    await this.createSchema();
  }

  private async createSchema(): Promise<void> {
    // Create node and edge tables
    await this.db.query(`
      CREATE NODE TABLE IF NOT EXISTS nodes (
        id UUID PRIMARY KEY,
        type VARCHAR,
        properties JSON,
        created TIMESTAMP,
        modified TIMESTAMP
      )
    `);
  }
}
```

### Task 1.2: Implement Graph Operations
**Estimated Time**: 4 hours
**Priority**: Critical
**Dependencies**: Task 1.1

**Acceptance Criteria**:
- [ ] addNode() creates nodes with properties
- [ ] addEdge() creates relationships
- [ ] traverse() performs graph queries
- [ ] findConnected() returns related nodes
- [ ] All operations have error handling

**Key Methods**:
```typescript
interface GraphOperations {
  addNode(node: GraphNode): Promise<string>;
  addEdge(edge: GraphEdge): Promise<void>;
  traverse(startId: string, pattern: TraversalPattern): Promise<GraphPath[]>;
  findConnected(nodeId: string, depth: number): Promise<GraphNode[]>;
  shortestPath(fromId: string, toId: string): Promise<GraphPath | null>;
}
```

### Task 1.3: Adapt BaseStorageAdapter Methods
**Estimated Time**: 3 hours
**Priority**: Critical
**Dependencies**: Task 1.2

**Acceptance Criteria**:
- [ ] store() maps entities to nodes
- [ ] retrieve() returns node as entity
- [ ] delete() removes node and edges
- [ ] exists() checks node existence
- [ ] clear() removes all nodes/edges

**Mapping Strategy**:
- Entity ID → Node ID
- Entity type → Node type
- Entity attributes → Node properties (JSON)
- Entity relationships → Edges

### Task 1.4: Create Graph Query Builder
**Estimated Time**: 4 hours
**Priority**: High
**Dependencies**: Task 1.3

**Acceptance Criteria**:
- [ ] Cypher query generation
- [ ] Pattern matching support
- [ ] Path queries
- [ ] Aggregation support
- [ ] Integration with QueryBuilder

**Example Queries**:
```typescript
// Find all dependencies of a module
const deps = await graphQuery()
  .match('(m:Module {name: $name})-[:DEPENDS_ON]->(d:Module)')
  .return('d')
  .params({ name: 'corticai-core' })
  .execute();

// Find circular dependencies
const circular = await graphQuery()
  .match('(n)-[*2..10]->(n)')
  .return('n')
  .execute();
```

## Task 2: .context Directory Structure

### Task 2.1: Create Directory Initializer
**Estimated Time**: 2 hours
**Priority**: Critical
**Dependencies**: None

**Acceptance Criteria**:
- [ ] Creates all required directories
- [ ] Handles existing directories gracefully
- [ ] Creates default config.yaml
- [ ] Adds to .gitignore if needed
- [ ] Provides initialization status

**Implementation**:
```typescript
export class ContextInitializer {
  static readonly CONTEXT_DIR = '.context';

  async initialize(projectPath: string): Promise<ContextConfig> {
    const contextPath = path.join(projectPath, ContextInitializer.CONTEXT_DIR);

    // Create directory structure
    await this.createDirectories(contextPath);

    // Initialize configuration
    const config = await this.loadOrCreateConfig(contextPath);

    // Initialize databases
    await this.initializeDatabases(contextPath, config);

    // Update .gitignore
    await this.updateGitignore(projectPath);

    return config;
  }
}
```

### Task 2.2: Dual Database Initialization
**Estimated Time**: 3 hours
**Priority**: Critical
**Dependencies**: Task 1.1, Task 2.1

**Acceptance Criteria**:
- [ ] Initializes Kuzu in .context/working/graph.kuzu
- [ ] Initializes DuckDB in .context/semantic/analytics.duckdb
- [ ] Creates session database
- [ ] Handles connection pooling
- [ ] Provides health checks

**Database Paths**:
```
.context/
├── working/
│   ├── graph.kuzu/        # Kuzu graph database
│   └── sessions.db        # SQLite for session tracking
├── semantic/
│   ├── patterns.db        # Pattern storage
│   └── analytics.duckdb   # DuckDB analytics
└── episodic/
    └── glacier/           # Append-only archive
```

### Task 2.3: Configuration System
**Estimated Time**: 2 hours
**Priority**: High
**Dependencies**: Task 2.1

**Acceptance Criteria**:
- [ ] Loads config.yaml
- [ ] Provides defaults for missing values
- [ ] Validates configuration
- [ ] Supports environment overrides
- [ ] Hot-reload capability

**Config Schema**:
```yaml
# .context/config.yaml
engine:
  version: 1.0.0
  mode: development

databases:
  kuzu:
    path: working/graph.kuzu
    cache_size: 1GB
  duckdb:
    path: semantic/analytics.duckdb
    memory_limit: 2GB

consolidation:
  enabled: true
  schedule: "0 2 * * *"  # 2 AM daily
  batch_size: 1000

lenses:
  default: development
  auto_activate: true

storage:
  archive_after_days: 90
  compress_archives: true
```

## Task 3: Unified Storage Manager

### Task 3.1: Create StorageManager Class
**Estimated Time**: 3 hours
**Priority**: Critical
**Dependencies**: Task 1.3, Task 2.2

**Acceptance Criteria**:
- [ ] Manages both Kuzu and DuckDB adapters
- [ ] Routes operations based on data type
- [ ] Provides unified interface
- [ ] Handles initialization
- [ ] Manages lifecycle

**Implementation**:
```typescript
export class StorageManager {
  private graphDB: KuzuStorageAdapter;
  private analyticsDB: DuckDBStorageAdapter;
  private router: StorageRouter;

  async initialize(config: ContextConfig): Promise<void> {
    this.graphDB = new KuzuStorageAdapter();
    await this.graphDB.initialize(config.databases.kuzu.path);

    this.analyticsDB = new DuckDBStorageAdapter();
    await this.analyticsDB.initialize(config.databases.duckdb.path);

    this.router = new StorageRouter(this.graphDB, this.analyticsDB);
  }

  async store(entity: Entity): Promise<void> {
    // Store attributes in DuckDB
    await this.analyticsDB.store(entity);

    // Store as node in Kuzu
    await this.graphDB.addNode({
      id: entity.id,
      type: entity.type,
      properties: { entityId: entity.id }
    });
  }
}
```

### Task 3.2: Implement Storage Router
**Estimated Time**: 3 hours
**Priority**: Critical
**Dependencies**: Task 3.1

**Acceptance Criteria**:
- [ ] Routes based on operation type
- [ ] Handles relationships → Kuzu
- [ ] Handles attributes → DuckDB
- [ ] Supports cross-database queries
- [ ] Optimizes query paths

**Routing Rules**:
```typescript
interface RoutingRules {
  relationships: 'kuzu';      // Graph traversal, connections
  attributes: 'duckdb';       // Filtering, aggregation
  patterns: 'kuzu';          // Pattern matching
  analytics: 'duckdb';       // Statistics, aggregations
  temporal: 'duckdb';        // Time-series queries
  paths: 'kuzu';            // Shortest path, connectivity
}
```

### Task 3.3: Cross-Database Query Coordinator
**Estimated Time**: 4 hours
**Priority**: High
**Dependencies**: Task 3.2

**Acceptance Criteria**:
- [ ] Executes queries across both databases
- [ ] Joins results from both sources
- [ ] Optimizes execution order
- [ ] Handles transactions
- [ ] Provides consistent results

**Example Cross-Query**:
```typescript
// Find all files modified in last week (DuckDB)
// that depend on payment module (Kuzu)
const results = await storageManager.query()
  .fromDuckDB()
    .where('modified', '>', lastWeek)
    .select('id', 'path', 'modified')
  .joinKuzu()
    .match('(:Module {name: "payment"})<-[:DEPENDS_ON]-(m)')
    .where('m.id = duckdb.id')
  .execute();
```

### Task 3.4: Transaction Management
**Estimated Time**: 3 hours
**Priority**: High
**Dependencies**: Task 3.3

**Acceptance Criteria**:
- [ ] Supports distributed transactions
- [ ] Implements 2-phase commit
- [ ] Handles rollback on failure
- [ ] Provides isolation levels
- [ ] Logs transaction history

## Task 4: Integration and Testing

### Task 4.1: Update Storage Factory
**Estimated Time**: 1 hour
**Priority**: High
**Dependencies**: Task 1.3

**Acceptance Criteria**:
- [ ] Factory recognizes 'kuzu' type
- [ ] Creates KuzuStorageAdapter
- [ ] Configures from options
- [ ] Handles errors gracefully
- [ ] Updates documentation

### Task 4.2: Create Integration Tests
**Estimated Time**: 3 hours
**Priority**: High
**Dependencies**: All tasks

**Acceptance Criteria**:
- [ ] Tests dual database operations
- [ ] Tests cross-database queries
- [ ] Tests transaction rollback
- [ ] Tests configuration loading
- [ ] Tests initialization flow

**Test Scenarios**:
```typescript
describe('Dual Database Integration', () => {
  it('stores entity in both databases', async () => {
    const entity = createTestEntity();
    await storageManager.store(entity);

    // Verify in DuckDB
    const attributes = await analyticsDB.retrieve(entity.id);
    expect(attributes).toBeDefined();

    // Verify in Kuzu
    const node = await graphDB.getNode(entity.id);
    expect(node).toBeDefined();
  });

  it('maintains consistency across databases', async () => {
    // Test transaction rollback
    await expect(async () => {
      await storageManager.transaction(async (tx) => {
        await tx.store(entity1);
        throw new Error('Rollback test');
      });
    }).rejects.toThrow();

    // Verify neither database has the entity
    expect(await analyticsDB.exists(entity1.id)).toBe(false);
    expect(await graphDB.exists(entity1.id)).toBe(false);
  });
});
```

### Task 4.3: Performance Benchmarks
**Estimated Time**: 2 hours
**Priority**: Medium
**Dependencies**: Task 4.2

**Acceptance Criteria**:
- [ ] Benchmark graph operations
- [ ] Compare with DuckDB relationships
- [ ] Measure cross-database query overhead
- [ ] Generate performance report
- [ ] Identify optimization opportunities

## Effort Summary

### Total Estimated Time: 44 hours

### By Priority:
- **Critical**: 24 hours (Tasks essential for Phase 1)
- **High**: 17 hours (Tasks needed for full functionality)
- **Medium**: 3 hours (Performance and optimization)

### By Component:
- **Kuzu Integration**: 13 hours
- **Context Structure**: 7 hours
- **Storage Manager**: 13 hours
- **Integration & Testing**: 6 hours
- **Documentation & Reviews**: 5 hours

## Success Criteria for Phase 1 Completion

1. **Kuzu fully integrated** with all BaseStorageAdapter methods
2. **.context directory** structure created and initialized
3. **Dual database** operations working seamlessly
4. **Cross-database queries** executing successfully
5. **All tests passing** with >90% coverage
6. **Performance benchmarks** meeting requirements
7. **Documentation updated** with new capabilities

## Risks and Mitigations

### Risk 1: Kuzu API Complexity
- **Impact**: High
- **Probability**: Medium
- **Mitigation**: Start with simple operations, expand gradually
- **Fallback**: Use DuckDB JSON columns for relationships initially

### Risk 2: Performance Overhead
- **Impact**: Medium
- **Probability**: Medium
- **Mitigation**: Implement caching, optimize query routing
- **Monitoring**: Add performance metrics from day 1

### Risk 3: Transaction Complexity
- **Impact**: High
- **Probability**: Low
- **Mitigation**: Use eventual consistency where possible
- **Fallback**: Single database transactions with async sync

## Next Phase Preview

After Phase 1 completion, Phase 2 (Continuity Cortex) will:
- Use Kuzu to track file relationships
- Leverage dual database for similarity detection
- Build on storage manager for deduplication
- Utilize context structure for persistence