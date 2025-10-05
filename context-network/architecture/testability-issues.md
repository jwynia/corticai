# Architecture Issues: Why We Have Integration Tests

## The Core Problem

**Integration tests are a code smell.** They indicate that the code is too tightly coupled to make unit testing practical.

### Current Architecture Issues

#### 1. **Tight Coupling to Database Implementation**

❌ **Problem**: Business logic is embedded in storage adapters
```typescript
// KuzuStorageAdapter does EVERYTHING
class KuzuStorageAdapter {
  async traverseGraph(pattern: TraversalPattern) {
    // Business logic for traversal
    const visited = new Set();
    const queue = [pattern.startNode];

    // MIXED WITH database operations
    const query = `MATCH path = (start:Entity {id: '${id}'})...`;
    const result = await this.connection.query(query);

    // More business logic
    return this.processResults(result);
  }
}
```

✅ **Should Be**: Business logic separated from I/O
```typescript
// Pure business logic - easily unit testable
class GraphTraversal {
  traverse(pattern: TraversalPattern, fetcher: NodeFetcher): GraphEntity[] {
    const visited = new Set();
    const queue = [pattern.startNode];

    while (queue.length > 0) {
      const current = queue.shift();
      const node = fetcher.getNode(current); // Injected dependency
      // Pure logic, no I/O
    }
  }
}

// I/O implementation - only integration tested if at all
class KuzuNodeFetcher implements NodeFetcher {
  async getNode(id: string): Promise<GraphNode> {
    return this.connection.query(`MATCH (n {id: '${id}'})...`);
  }
}
```

#### 2. **Violation of Dependency Inversion Principle**

❌ **Problem**: High-level modules depend on low-level details
```typescript
class ContextEngine {
  private storage = new KuzuStorageAdapter(config); // Concrete dependency

  async analyze() {
    return this.storage.traverseGraph(...); // Coupled to Kuzu
  }
}
```

✅ **Should Be**: Depend on abstractions
```typescript
interface IGraphStorage {
  traverseGraph(pattern: TraversalPattern): Promise<GraphEntity[]>;
}

class ContextEngine {
  constructor(private storage: IGraphStorage) {} // Injected

  async analyze() {
    return this.storage.traverseGraph(...); // Works with ANY storage
  }
}

// Now easily unit testable with mock
const engine = new ContextEngine(new MockGraphStorage());
```

#### 3. **No Clear Boundaries**

The code doesn't have clear layers:
- ❌ Storage adapters contain business logic
- ❌ Domain logic mixed with persistence
- ❌ Query building mixed with query execution
- ❌ No separation of concerns

Should have:
- **Domain Layer**: Pure business logic (100% unit testable)
- **Application Layer**: Use cases/workflows (mostly unit testable with mocked domain)
- **Infrastructure Layer**: I/O operations (minimal, only verified manually or in contract tests)

## Why Integration Tests Are Harmful

### 1. **They Hide Bad Design**
If you need integration tests to test business logic, the business logic is in the wrong place.

### 2. **They're Slow and Brittle**
- Real database setup/teardown
- File I/O operations
- Network dependencies
- State management issues
- Race conditions

### 3. **They Don't Prove Correctness**
Integration tests passing doesn't mean:
- ✗ The business logic is correct
- ✗ Edge cases are handled
- ✗ The code will work in production
- ✗ The code is maintainable

They only prove: "This specific workflow worked this one time with this specific database state"

### 4. **They Multiply Problems**
Bad design + integration tests = compound interest on technical debt:
- Can't refactor (tests break)
- Can't change storage (tests are coupled)
- Can't add features easily (more integration tests needed)
- Can't run tests quickly (slow feedback loop)

## How to Fix This

### Step 1: Extract Business Logic

**Before** (untestable):
```typescript
class KuzuStorageAdapter {
  async traverseGraph(pattern: TraversalPattern) {
    // 100 lines of traversal logic + database operations
  }
}
```

**After** (testable):
```typescript
// Pure business logic - zero dependencies
class GraphTraversalAlgorithm {
  execute(
    startNode: string,
    maxDepth: number,
    getNeighbors: (nodeId: string) => string[]
  ): string[] {
    const visited = new Set<string>();
    const queue = [{ node: startNode, depth: 0 }];
    const results: string[] = [];

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;

      if (visited.has(node) || depth > maxDepth) continue;

      visited.add(node);
      results.push(node);

      const neighbors = getNeighbors(node);
      queue.push(...neighbors.map(n => ({ node: n, depth: depth + 1 })));
    }

    return results;
  }
}

// Adapter only handles I/O
class KuzuStorageAdapter {
  async traverseGraph(pattern: TraversalPattern) {
    const algorithm = new GraphTraversalAlgorithm();

    return algorithm.execute(
      pattern.startNode,
      pattern.maxDepth,
      (nodeId) => this.getNeighbors(nodeId) // I/O injected as function
    );
  }

  private async getNeighbors(nodeId: string): Promise<string[]> {
    // Just database query, no logic
    const result = await this.connection.query(...);
    return result.map(r => r.id);
  }
}

// Unit test - no database needed!
describe('GraphTraversalAlgorithm', () => {
  it('should traverse to max depth', () => {
    const algorithm = new GraphTraversalAlgorithm();

    const mockNeighbors = (id: string) =>
      id === 'a' ? ['b', 'c'] :
      id === 'b' ? ['d'] : [];

    const result = algorithm.execute('a', 2, mockNeighbors);

    expect(result).toEqual(['a', 'b', 'c', 'd']);
  });
});
```

### Step 2: Use Dependency Injection

```typescript
// Define interface
interface INodeRepository {
  getNode(id: string): Promise<GraphNode>;
  getNeighbors(id: string): Promise<string[]>;
}

// Business logic depends on interface
class GraphAnalyzer {
  constructor(private repo: INodeRepository) {}

  async analyze(startNode: string) {
    const node = await this.repo.getNode(startNode);
    const neighbors = await this.repo.getNeighbors(startNode);

    // Pure business logic here
    return this.calculateMetrics(node, neighbors);
  }

  private calculateMetrics(node: GraphNode, neighbors: string[]) {
    // Pure function - easily unit tested
  }
}

// Kuzu implementation
class KuzuNodeRepository implements INodeRepository {
  async getNode(id: string) {
    return this.connection.query(...);
  }

  async getNeighbors(id: string) {
    return this.connection.query(...);
  }
}

// Unit test with mock
class MockNodeRepository implements INodeRepository {
  private nodes = new Map();

  async getNode(id: string) { return this.nodes.get(id); }
  async getNeighbors(id: string) { return [...]; }
}

const analyzer = new GraphAnalyzer(new MockNodeRepository());
// Test instantly, no database
```

### Step 3: Hexagonal Architecture

```
┌─────────────────────────────────────────┐
│           Domain Layer (Core)           │
│  - Pure business logic                  │
│  - No framework dependencies            │
│  - 100% unit testable                   │
│  - GraphTraversal, Analysis, etc.       │
└─────────────────────────────────────────┘
                    ▲
                    │ depends on abstractions
                    │
┌─────────────────────────────────────────┐
│        Application Layer (Use Cases)    │
│  - Orchestrates domain objects          │
│  - Defines interfaces (ports)           │
│  - IGraphStorage, INodeRepository       │
└─────────────────────────────────────────┘
                    ▲
                    │ implements interfaces
                    │
┌─────────────────────────────────────────┐
│      Infrastructure Layer (Adapters)    │
│  - Kuzu/DuckDB implementations          │
│  - File I/O                             │
│  - External APIs                        │
│  - NOT unit tested (or minimal)         │
└─────────────────────────────────────────┘
```

## Refactoring Priority

### High Priority (Do First)
1. **Extract traversal algorithms** from storage adapters
2. **Create repository interfaces** (IGraphStorage, INodeRepository, etc.)
3. **Inject dependencies** instead of new operators
4. **Move business logic** to pure domain classes

### Medium Priority
5. Build query builders as separate, pure functions
6. Create value objects for complex data
7. Add proper error handling in domain layer

### Low Priority
8. Consider removing integration test files entirely
9. If integration tests needed, mark them as "contract tests" run manually

## What "Good" Looks Like

```typescript
// ✅ Domain layer - pure, testable
class GraphMetricsCalculator {
  calculateDegree(node: GraphNode, edges: GraphEdge[]): number {
    return edges.filter(e =>
      e.source === node.id || e.target === node.id
    ).length;
  }

  findCentralNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
    return nodes
      .map(n => ({ node: n, degree: this.calculateDegree(n, edges) }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10)
      .map(x => x.node);
  }
}

// Unit test - instant, deterministic
it('should find central nodes', () => {
  const calc = new GraphMetricsCalculator();
  const nodes = [/* test data */];
  const edges = [/* test data */];

  const central = calc.findCentralNodes(nodes, edges);

  expect(central[0].id).toBe('hub-node');
});
```

## Action Items

- [ ] **Stop writing integration tests** for new features
- [ ] **Extract business logic** from storage adapters
- [ ] **Create repository interfaces** for all data access
- [ ] **Use dependency injection** everywhere
- [ ] **Write unit tests** for pure business logic
- [ ] **Delete integration tests** once code is properly separated
- [ ] **Document architecture** in ADRs

## Remember

> "If it's hard to test, it's probably hard to maintain, hard to extend, and wrong."
>
> Integration tests don't fix this - better design does.

---

Integration tests are a crutch. Good architecture makes them unnecessary.
