# SurrealDB Implementation Guide for CorticAI

## Classification
- **Domain:** Implementation, Practical
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Medium-High (based on architecture analysis)

## Overview

This guide provides actionable implementation patterns for integrating SurrealDB as the Primary Storage solution in CorticAI's dual-role storage architecture.

## Architecture Decision

### Recommended Configuration

**Primary Storage (Graph):** SurrealDB
- **Role:** Graph operations, flexible schema, relationship modeling
- **Deployment:** Embedded (`@surrealdb/node`)
- **Use Cases:**
  - Context network relationships
  - Entity connections
  - Episode stream storage
  - Real-time data ingestion

**Semantic Storage (Analytics):** DuckDB
- **Role:** Analytics, aggregations, typed projections
- **Deployment:** Embedded (existing implementation)
- **Use Cases:**
  - Large-scale aggregations
  - Materialized views
  - Full-text search indexes
  - Analytics queries

**Why This Combination Works:**
```
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│         (AttributeIndex, Components)                 │
└───────────────┬─────────────────────────────────────┘
                │
        ┌───────┴──────────┐
        │                  │
        ▼                  ▼
┌──────────────┐    ┌──────────────┐
│  SurrealDB   │    │   DuckDB     │
│  (Primary)   │    │  (Semantic)  │
├──────────────┤    ├──────────────┤
│ • Graph ops  │    │ • Analytics  │
│ • Flexible   │    │ • Aggregation│
│ • Real-time  │    │ • Columnar   │
│ • Multi-model│    │ • Fast scans │
└──────────────┘    └──────────────┘
```

## Installation & Setup

### Step 1: Install Dependencies

```bash
npm install surrealdb @surrealdb/node
# or
yarn add surrealdb @surrealdb/node
```

**Package Versions (as of 2025-10-13):**
- `surrealdb`: Latest stable (check npm for current version)
- `@surrealdb/node`: Latest stable

### Step 2: Project Structure

```
app/src/storage/
├── adapters/
│   ├── SurrealDBStorageAdapter.ts       # New adapter
│   ├── SurrealDBGraphOperations.ts      # Graph-specific operations
│   ├── SurrealDBStorageOperations.ts    # Basic CRUD operations
│   ├── SurrealDBQueryBuilder.ts         # Query construction helpers
│   ├── DuckDBStorageAdapter.ts          # Keep existing
│   └── KuzuStorageAdapter.ts            # Deprecate after migration
├── interfaces/
│   ├── Storage.ts                       # Existing interface
│   ├── GraphStorage.ts                  # Enhanced for graph ops
│   └── PrimaryStorage.ts                # Role-specific interface
└── providers/
    ├── LocalStorageProvider.ts          # SurrealDB + DuckDB
    └── CosmosStorageProvider.ts         # Future: Cosmos DB dual-role
```

### Step 3: Configuration

```typescript
// app/src/config/storage.config.ts

export interface SurrealDBConfig {
  // Connection
  connectionString: string;  // 'mem://' or 'surrealkv://path'
  namespace: string;
  database: string;

  // Performance
  enableCache?: boolean;
  cacheSize?: number;

  // Security
  username?: string;
  password?: string;
  token?: string;

  // Debugging
  debug?: boolean;
  logQueries?: boolean;
}

export const storageConfig = {
  development: {
    primary: {
      type: 'surrealdb',
      connectionString: 'mem://',  // In-memory for dev
      namespace: 'corticai_dev',
      database: 'primary',
      debug: true,
      logQueries: true
    },
    semantic: {
      type: 'duckdb',
      database: ':memory:',
      // ... existing DuckDB config
    }
  },
  production: {
    primary: {
      type: 'surrealdb',
      connectionString: 'surrealkv://.context/primary.db',
      namespace: 'corticai',
      database: 'primary',
      enableCache: true,
      cacheSize: 10000
    },
    semantic: {
      type: 'duckdb',
      database: '.context/semantic.duckdb',
      // ... existing DuckDB config
    }
  }
};
```

## Adapter Implementation

### Core SurrealDBStorageAdapter

```typescript
// app/src/storage/adapters/SurrealDBStorageAdapter.ts

import { Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';
import { BaseStorageAdapter } from '../base/BaseStorageAdapter';
import { PrimaryStorage } from '../interfaces/PrimaryStorage';
import { GraphPath, TraversalPattern } from '../types/graph.types';

export class SurrealDBStorageAdapter<T = any>
  extends BaseStorageAdapter<T>
  implements PrimaryStorage<T>
{
  private db: Surreal;
  private config: SurrealDBConfig;
  private initialized = false;

  constructor(config: SurrealDBConfig) {
    super();
    this.config = config;
    this.db = new Surreal({ engines: surrealdbNodeEngines() });
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.db.connect(this.config.connectionString);
      await this.db.use({
        namespace: this.config.namespace,
        database: this.config.database
      });

      // Authenticate if credentials provided
      if (this.config.username && this.config.password) {
        await this.db.signin({
          username: this.config.username,
          password: this.config.password
        });
      }

      this.initialized = true;
      this.debug('SurrealDB initialized');
    } catch (error) {
      throw new Error(`Failed to initialize SurrealDB: ${error.message}`);
    }
  }

  /**
   * Basic CRUD Operations
   */

  async get(key: string): Promise<T | undefined> {
    await this.ensureInitialized();
    try {
      const results = await this.db.select<T>(key);
      return results?.[0];
    } catch (error) {
      this.handleError('get', error);
      return undefined;
    }
  }

  async set(key: string, value: T): Promise<void> {
    await this.ensureInitialized();
    this.validateKey(key);
    this.validateValue(value);

    try {
      // SurrealDB allows direct create/update via key
      await this.db.create(key, value);
      this.debug(`Set ${key}`);
    } catch (error) {
      throw this.handleError('set', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await this.db.delete(key);
      this.debug(`Deleted ${key}`);
      return true;
    } catch (error) {
      this.handleError('delete', error);
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    // Note: SurrealDB doesn't have a single "clear" command
    // Need to delete all records from all tables
    const tables = await this.getTables();
    for (const table of tables) {
      await this.db.query(`DELETE ${table}`);
    }
    this.debug('Cleared all data');
  }

  async size(): Promise<number> {
    await this.ensureInitialized();
    // Count all records across tables
    const result = await this.db.query(`
      SELECT count() AS total FROM (
        SELECT * FROM entity UNION SELECT * FROM concept /* ... etc */
      ) GROUP ALL
    `);
    return result[0]?.total ?? 0;
  }

  /**
   * Graph Operations
   */

  async storeEntity(entity: any): Promise<void> {
    const table = entity.type || 'entity';
    const id = entity.id || this.generateId();
    await this.db.create(`${table}:${id}`, entity);
  }

  async createRelationship(
    from: string,
    relationship: string,
    to: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.ensureInitialized();

    const content = properties ? `CONTENT ${JSON.stringify(properties)}` : '';
    const query = `RELATE ${from} -> ${relationship} -> ${to} ${content}`;

    await this.db.query(query);
    this.debug(`Created relationship: ${from} -[${relationship}]-> ${to}`);
  }

  async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
    await this.ensureInitialized();

    // Build SurrealQL traversal query
    const query = this.buildTraversalQuery(pattern);
    const results = await this.db.query(query);

    return this.parseTraversalResults(results);
  }

  async findConnected(
    startKey: string,
    relationshipType?: string,
    maxDepth: number = 3
  ): Promise<string[]> {
    await this.ensureInitialized();

    // Build multi-hop traversal query
    const relFilter = relationshipType ? `${relationshipType}` : '*';
    const query = this.buildConnectedQuery(startKey, relFilter, maxDepth);

    const results = await this.db.query(query);
    return this.extractConnectedNodes(results);
  }

  async shortestPath(
    from: string,
    to: string,
    relationshipType?: string
  ): Promise<GraphPath | null> {
    await this.ensureInitialized();

    // SurrealDB doesn't have built-in shortest path
    // Need to implement using BFS or recursive query
    // This is a simplified example
    const query = this.buildShortestPathQuery(from, to, relationshipType);
    const results = await this.db.query(query);

    return this.parsePathResult(results);
  }

  /**
   * Query Building Helpers
   */

  private buildTraversalQuery(pattern: TraversalPattern): string {
    const { startKey, relationshipType, direction, maxDepth } = pattern;

    const arrow = direction === 'outgoing' ? '->' : '<-';
    const rel = relationshipType || '*';

    // Build depth-aware traversal
    let traversal = `${arrow}${rel}${arrow}`;

    if (maxDepth && maxDepth > 1) {
      // Multi-hop: repeat traversal pattern
      traversal = Array(maxDepth).fill(traversal).join('');
    }

    return `
      SELECT
        id,
        ${traversal}* AS connections
      FROM ${startKey}
    `;
  }

  private buildConnectedQuery(
    startKey: string,
    relationshipType: string,
    maxDepth: number
  ): string {
    // Build query for each depth level
    const levels = [];
    for (let i = 1; i <= maxDepth; i++) {
      const traversal = `->${relationshipType}`.repeat(i);
      levels.push(`${traversal}->*.id AS level${i}`);
    }

    return `
      SELECT
        ${levels.join(',\\n        ')}
      FROM ${startKey}
    `;
  }

  private buildShortestPathQuery(
    from: string,
    to: string,
    relationshipType?: string
  ): string {
    // Simplified BFS approach
    // In production, would need more sophisticated pathfinding
    const rel = relationshipType || '*';

    return `
      SELECT
        ->#{rel}->* AS path
      FROM ${from}
      WHERE path CONTAINS ${to}
      ORDER BY array::len(path) ASC
      LIMIT 1
    `;
  }

  /**
   * Result Parsing
   */

  private parseTraversalResults(results: any[]): GraphPath[] {
    // Transform SurrealDB results to GraphPath format
    return results.map(r => ({
      nodes: this.extractNodes(r.connections),
      edges: this.extractEdges(r.connections),
      length: this.calculatePathLength(r.connections)
    }));
  }

  private extractConnectedNodes(results: any[]): string[] {
    const nodes = new Set<string>();

    for (const result of results) {
      // Extract node IDs from all depth levels
      Object.keys(result)
        .filter(key => key.startsWith('level'))
        .forEach(level => {
          const levelNodes = result[level];
          if (Array.isArray(levelNodes)) {
            levelNodes.forEach(id => nodes.add(id));
          }
        });
    }

    return Array.from(nodes);
  }

  private parsePathResult(results: any[]): GraphPath | null {
    if (!results.length) return null;

    const path = results[0].path;
    return {
      nodes: this.extractNodes(path),
      edges: this.extractEdges(path),
      length: path.length
    };
  }

  /**
   * Batch Operations
   */

  async getMany(keys: string[]): Promise<Map<string, T>> {
    await this.ensureInitialized();
    const results = new Map<string, T>();

    // SurrealDB supports multiple selects
    const promises = keys.map(async (key) => {
      const value = await this.get(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    });

    await Promise.all(promises);
    return results;
  }

  async setMany(entries: Map<string, T>): Promise<void> {
    await this.ensureInitialized();

    const promises = Array.from(entries.entries()).map(([key, value]) =>
      this.set(key, value)
    );

    await Promise.all(promises);
  }

  async deleteMany(keys: string[]): Promise<number> {
    await this.ensureInitialized();

    const promises = keys.map(key => this.delete(key));
    const results = await Promise.all(promises);

    return results.filter(Boolean).length;
  }

  /**
   * Transaction Support
   */

  async transaction<R>(fn: () => Promise<R>): Promise<R> {
    await this.ensureInitialized();

    // SurrealDB transactions
    await this.db.query('BEGIN TRANSACTION');

    try {
      const result = await fn();
      await this.db.query('COMMIT TRANSACTION');
      return result;
    } catch (error) {
      await this.db.query('CANCEL TRANSACTION');
      throw error;
    }
  }

  /**
   * Lifecycle
   */

  async close(): Promise<void> {
    if (this.initialized) {
      await this.db.close();
      this.initialized = false;
      this.debug('SurrealDB connection closed');
    }
  }

  /**
   * Utilities
   */

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async getTables(): Promise<string[]> {
    const result = await this.db.query('INFO FOR DB');
    // Parse table list from result
    return result[0]?.tables || [];
  }

  private generateId(): string {
    return `ulid:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private debug(message: string): void {
    if (this.config.debug) {
      console.log(`[SurrealDB] ${message}`);
    }
  }

  private handleError(operation: string, error: any): Error {
    const message = `SurrealDB ${operation} failed: ${error.message}`;
    console.error(message, error);
    return new Error(message);
  }
}
```

## Storage Provider Pattern

```typescript
// app/src/storage/providers/LocalStorageProvider.ts

import { SurrealDBStorageAdapter } from '../adapters/SurrealDBStorageAdapter';
import { DuckDBStorageAdapter } from '../adapters/DuckDBStorageAdapter';
import { PrimaryStorage } from '../interfaces/PrimaryStorage';
import { SemanticStorage } from '../interfaces/SemanticStorage';

export class LocalStorageProvider {
  primary: PrimaryStorage;
  semantic: SemanticStorage;

  constructor(config: LocalStorageConfig) {
    // Initialize Primary Storage (SurrealDB)
    this.primary = new SurrealDBStorageAdapter({
      connectionString: config.primary.connectionString,
      namespace: config.primary.namespace,
      database: config.primary.database,
      debug: config.primary.debug
    });

    // Initialize Semantic Storage (DuckDB)
    this.semantic = new DuckDBStorageAdapter({
      type: 'duckdb',
      database: config.semantic.database,
      enableParquet: config.semantic.enableParquet
    });
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.primary.initialize(),
      this.semantic.initialize()
    ]);
  }

  async close(): Promise<void> {
    await Promise.all([
      this.primary.close(),
      this.semantic.close()
    ]);
  }
}

// Usage
const storageProvider = new LocalStorageProvider(storageConfig.development);
await storageProvider.initialize();

// Use primary storage for graph operations
await storageProvider.primary.createRelationship(
  'person:alice',
  'knows',
  'person:bob'
);

// Use semantic storage for analytics
const results = await storageProvider.semantic.query(`
  SELECT type, COUNT(*) as count
  FROM entities
  GROUP BY type
`);
```

## Usage Examples

### Example 1: Creating Entities and Relationships

```typescript
const storage = new SurrealDBStorageAdapter({
  connectionString: 'mem://',
  namespace: 'test',
  database: 'test'
});

await storage.initialize();

// Create entities
await storage.create('person:alice', {
  name: 'Alice',
  role: 'developer',
  skills: ['TypeScript', 'React']
});

await storage.create('concept:typescript', {
  title: 'TypeScript',
  category: 'programming-language'
});

// Create relationship
await storage.createRelationship(
  'person:alice',
  'knows',
  'concept:typescript',
  { proficiency: 'expert', yearsExperience: 5 }
);
```

### Example 2: Graph Traversal

```typescript
// Find all concepts Alice knows
const query = `
  SELECT
    name,
    ->knows->concept.title AS known_concepts,
    ->knows.proficiency AS proficiency_levels
  FROM person:alice
`;

const results = await storage.db.query(query);
console.log(results);
// Output:
// [{
//   name: 'Alice',
//   known_concepts: ['TypeScript', 'React', 'Node.js'],
//   proficiency_levels: ['expert', 'advanced', 'intermediate']
// }]
```

### Example 3: Multi-Hop Traversal

```typescript
// Find friends-of-friends
const query = `
  SELECT
    name,
    ->friends->person.name AS direct_friends,
    ->friends->person->friends->person.name AS friends_of_friends
  FROM person:alice
`;

const results = await storage.db.query(query);
```

### Example 4: Bidirectional Queries

```typescript
// Who knows about TypeScript?
const query = `
  SELECT
    <-knows<-person.name AS experts
  FROM concept:typescript
  WHERE <-knows.proficiency = 'expert'
`;

const results = await storage.db.query(query);
```

## Performance Optimization

### 1. Indexing Strategy

```typescript
// Define indexes for frequent queries
await db.query(`
  DEFINE INDEX idx_person_name ON TABLE person COLUMNS name;
  DEFINE INDEX idx_concept_category ON TABLE concept COLUMNS category;
  DEFINE INDEX idx_knows_proficiency ON TABLE knows COLUMNS proficiency;
`);
```

### 2. Caching Layer

```typescript
class CachedSurrealDBAdapter extends SurrealDBStorageAdapter {
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 60000; // 60 seconds

  async get(key: string): Promise<any> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Fetch from database
    const value = await super.get(key);

    // Cache result
    if (value !== undefined) {
      this.cache.set(key, value);
      setTimeout(() => this.cache.delete(key), this.cacheTimeout);
    }

    return value;
  }
}
```

### 3. Batch Operations

```typescript
// Batch multiple operations in a transaction
await storage.transaction(async () => {
  await storage.setMany(new Map([
    ['person:1', { name: 'Alice' }],
    ['person:2', { name: 'Bob' }],
    ['person:3', { name: 'Charlie' }]
  ]));
});
```

## Testing Strategy

### Unit Tests

```typescript
// app/src/storage/adapters/SurrealDBStorageAdapter.test.ts

describe('SurrealDBStorageAdapter', () => {
  let adapter: SurrealDBStorageAdapter;

  beforeEach(async () => {
    adapter = new SurrealDBStorageAdapter({
      connectionString: 'mem://',
      namespace: 'test',
      database: 'test'
    });
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.close();
  });

  test('should store and retrieve entity', async () => {
    await adapter.set('person:test', { name: 'Test' });
    const result = await adapter.get('person:test');
    expect(result).toEqual({ name: 'Test' });
  });

  test('should create relationships', async () => {
    await adapter.create('person:alice', { name: 'Alice' });
    await adapter.create('person:bob', { name: 'Bob' });
    await adapter.createRelationship('person:alice', 'knows', 'person:bob');

    const query = 'SELECT ->knows->person.name FROM person:alice';
    const results = await adapter.db.query(query);
    expect(results[0]).toContain('Bob');
  });

  test('should traverse graph', async () => {
    // Set up test data
    await seedTestGraph(adapter);

    const paths = await adapter.traverse({
      startKey: 'person:alice',
      relationshipType: 'knows',
      direction: 'outgoing',
      maxDepth: 2
    });

    expect(paths.length).toBeGreaterThan(0);
  });
});
```

## Migration from Kuzu

See [[surrealdb-alternative-2025-10-13/migration-analysis]] for detailed migration strategy.

### Quick Migration Checklist

- [ ] Install SurrealDB dependencies
- [ ] Implement SurrealDBStorageAdapter
- [ ] Create query translation mappings
- [ ] Write parallel validation tests
- [ ] Export Kuzu data
- [ ] Transform to SurrealDB format
- [ ] Import to SurrealDB
- [ ] Validate data integrity
- [ ] Performance benchmark
- [ ] Update application code
- [ ] Deploy with fallback
- [ ] Monitor production
- [ ] Remove Kuzu dependency

## Troubleshooting

### Common Issues

**Issue 1: Connection Errors**
```typescript
// Ensure proper initialization order
await storage.initialize();  // Must be called before operations
```

**Issue 2: Query Syntax Errors**
```typescript
// SurrealQL is not Cypher - use SurrealDB syntax
// ❌ MATCH (p:Person) WHERE p.name = 'Alice'
// ✅ SELECT * FROM person WHERE name = 'Alice'
```

**Issue 3: Relationship Direction**
```typescript
// Remember: -> is outgoing, <- is incoming
// person:alice ->knows-> person:bob
// person:bob <-knows<- person:alice (same relationship, different direction)
```

## Best Practices

1. **Always initialize before use**
   ```typescript
   await adapter.initialize();
   ```

2. **Use transactions for multi-step operations**
   ```typescript
   await adapter.transaction(async () => {
     // Multiple operations here
   });
   ```

3. **Close connections properly**
   ```typescript
   try {
     // Use storage
   } finally {
     await storage.close();
   }
   ```

4. **Validate record IDs**
   ```typescript
   // Use format: table:id
   'person:alice'  // ✅
   'alice'         // ❌ (ambiguous)
   ```

5. **Index frequently queried fields**
   ```typescript
   await db.query('DEFINE INDEX idx_name ON TABLE person COLUMNS name');
   ```

## Related Documents
- [[surrealdb-alternative-2025-10-13/overview]] - Research overview
- [[surrealdb-alternative-2025-10-13/comparison-matrix]] - Feature comparison
- [[surrealdb-alternative-2025-10-13/migration-analysis]] - Migration strategy
- [[surrealdb-alternative-2025-10-13/query-language-mapping]] - Query translation
- [[architecture/dual-role-storage-architecture]] - Architecture context
