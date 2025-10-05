/**
 * Mock Kuzu Storage Adapter for Unit Tests
 *
 * This mock provides an in-memory implementation of the KuzuStorageAdapter
 * interface without requiring real database files or I/O operations.
 *
 * Use this for:
 * - Fast unit tests
 * - Testing business logic without database overhead
 * - Predictable, deterministic test behavior
 *
 * DO NOT use for:
 * - Integration tests (use real KuzuStorageAdapter)
 * - Testing actual database operations
 * - Performance benchmarks
 */

import {
  GraphEntity,
  GraphNode,
  GraphEdge,
  TraversalPattern,
  KuzuStorageConfig,
} from '../../../src/storage/types/GraphTypes';
import { StorageError, StorageErrorCode } from '../../../src/storage/interfaces/Storage';

export class MockKuzuStorageAdapter {
  private storage = new Map<string, GraphEntity>();
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private config: KuzuStorageConfig;
  private initialized = false;

  constructor(config: KuzuStorageConfig) {
    this.config = config;
  }

  // Storage interface methods
  async size(): Promise<number> {
    this.ensureInitialized();
    return this.storage.size;
  }

  async get(key: string): Promise<GraphEntity | undefined> {
    this.ensureInitialized();
    return this.storage.get(key);
  }

  async set(key: string, value: GraphEntity): Promise<void> {
    this.ensureInitialized();
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    this.ensureInitialized();
    return this.storage.delete(key);
  }

  async has(key: string): Promise<boolean> {
    this.ensureInitialized();
    return this.storage.has(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
    this.nodes.clear();
    this.edges = [];
  }

  async *keys(): AsyncIterableIterator<string> {
    this.ensureInitialized();
    for (const key of this.storage.keys()) {
      yield key;
    }
  }

  async *values(): AsyncIterableIterator<GraphEntity> {
    this.ensureInitialized();
    for (const value of this.storage.values()) {
      yield value;
    }
  }

  async *entries(): AsyncIterableIterator<[string, GraphEntity]> {
    this.ensureInitialized();
    for (const entry of this.storage.entries()) {
      yield entry;
    }
  }

  // Graph operations
  async addNode(node: GraphNode): Promise<void> {
    this.ensureInitialized();
    this.nodes.set(node.id, node);
  }

  async getNode(id: string): Promise<GraphNode | undefined> {
    this.ensureInitialized();
    return this.nodes.get(id);
  }

  async addEdge(edge: GraphEdge): Promise<void> {
    this.ensureInitialized();
    this.edges.push(edge);
  }

  async traverseGraph(pattern: TraversalPattern): Promise<GraphEntity[]> {
    this.ensureInitialized();

    // Simple mock implementation - find connected nodes
    const results: GraphEntity[] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [
      { id: pattern.startNode, depth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id) || current.depth > pattern.maxDepth) {
        continue;
      }

      visited.add(current.id);
      const node = this.nodes.get(current.id);

      if (node) {
        results.push(node as unknown as GraphEntity);

        // Find connected edges
        const connectedEdges = this.edges.filter(
          (e) =>
            e.source === current.id &&
            (!pattern.edgeTypes || pattern.edgeTypes.includes(e.type))
        );

        // Add connected nodes to queue
        for (const edge of connectedEdges) {
          queue.push({ id: edge.target, depth: current.depth + 1 });
        }
      }
    }

    return results;
  }

  async findConnectedNodes(
    nodeId: string,
    depth: number = 1
  ): Promise<GraphEntity[]> {
    return this.traverseGraph({
      startNode: nodeId,
      maxDepth: depth,
    });
  }

  async shortestPath(
    startNodeId: string,
    endNodeId: string
  ): Promise<GraphEntity[]> {
    this.ensureInitialized();

    // Simple BFS for shortest path
    const queue: Array<{ id: string; path: GraphEntity[] }> = [];
    const visited = new Set<string>();

    const startNode = this.nodes.get(startNodeId);
    if (!startNode) return [];

    queue.push({ id: startNodeId, path: [startNode as unknown as GraphEntity] });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === endNodeId) {
        return current.path;
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const connectedEdges = this.edges.filter((e) => e.source === current.id);

      for (const edge of connectedEdges) {
        const targetNode = this.nodes.get(edge.target);
        if (targetNode) {
          queue.push({
            id: edge.target,
            path: [...current.path, targetNode as unknown as GraphEntity],
          });
        }
      }
    }

    return [];
  }

  // Mock-specific helper methods
  getMockData() {
    return {
      storage: Array.from(this.storage.entries()),
      nodes: Array.from(this.nodes.entries()),
      edges: [...this.edges],
    };
  }

  setMockData(data: {
    storage?: Array<[string, GraphEntity]>;
    nodes?: Array<[string, GraphNode]>;
    edges?: GraphEdge[];
  }) {
    if (data.storage) {
      this.storage = new Map(data.storage);
    }
    if (data.nodes) {
      this.nodes = new Map(data.nodes);
    }
    if (data.edges) {
      this.edges = data.edges;
    }
  }

  close() {
    // Mock close - just clear data
    return Promise.resolve();
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initialized = true;
    }
  }
}

/**
 * Factory function to create mock adapter with test data
 */
export function createMockKuzuAdapter(config?: Partial<KuzuStorageConfig>) {
  const defaultConfig: KuzuStorageConfig = {
    type: 'kuzu',
    database: ':memory:',
    id: 'mock-adapter',
    debug: false,
    autoCreate: true,
    ...config,
  };

  return new MockKuzuStorageAdapter(defaultConfig);
}

/**
 * Create a test graph with sample data
 */
export function createTestGraph() {
  const adapter = createMockKuzuAdapter();

  // Sample nodes
  const nodes: GraphNode[] = [
    {
      id: 'node1',
      type: 'Person',
      properties: { name: 'Alice', age: 30 },
    },
    {
      id: 'node2',
      type: 'Person',
      properties: { name: 'Bob', age: 25 },
    },
    {
      id: 'node3',
      type: 'Company',
      properties: { name: 'Acme Corp' },
    },
  ];

  // Sample edges
  const edges: GraphEdge[] = [
    {
      id: 'edge1',
      type: 'KNOWS',
      source: 'node1',
      target: 'node2',
      properties: { since: '2020' },
    },
    {
      id: 'edge2',
      type: 'WORKS_AT',
      source: 'node1',
      target: 'node3',
      properties: { role: 'Engineer' },
    },
  ];

  adapter.setMockData({ nodes: nodes.map((n) => [n.id, n]), edges });

  return { adapter, nodes, edges };
}
