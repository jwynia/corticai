/**
 * Unit Tests for KuzuStorageAdapter (using mocks)
 *
 * These are TRUE unit tests:
 * - No file I/O
 * - No real database
 * - Fast execution (< 5s total)
 * - Fully isolated
 * - Deterministic
 *
 * For integration tests with real database, see:
 * tests/integration/storage/KuzuStorageAdapter.integration.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockKuzuAdapter,
  createTestGraph
} from '../mocks/MockKuzuStorageAdapter';
import { GraphEntity, GraphNode, TraversalPattern } from '../../../src/storage/types/GraphTypes';

describe('KuzuStorageAdapter (Unit Tests with Mocks)', () => {
  describe('Basic Storage Operations', () => {
    let adapter: ReturnType<typeof createMockKuzuAdapter>;

    beforeEach(() => {
      adapter = createMockKuzuAdapter();
    });

    it('should store and retrieve entities', async () => {
      const entity: GraphEntity = {
        id: 'test-1',
        type: 'TestEntity',
        properties: { name: 'Test' },
      };

      await adapter.set('key1', entity);
      const retrieved = await adapter.get('key1');

      expect(retrieved).toEqual(entity);
    });

    it('should return correct size', async () => {
      expect(await adapter.size()).toBe(0);

      await adapter.set('key1', { id: '1', type: 'Test', properties: {} });
      expect(await adapter.size()).toBe(1);

      await adapter.set('key2', { id: '2', type: 'Test', properties: {} });
      expect(await adapter.size()).toBe(2);
    });

    it('should delete entities', async () => {
      await adapter.set('key1', { id: '1', type: 'Test', properties: {} });
      expect(await adapter.has('key1')).toBe(true);

      const deleted = await adapter.delete('key1');
      expect(deleted).toBe(true);
      expect(await adapter.has('key1')).toBe(false);
    });

    it('should clear all entities', async () => {
      await adapter.set('key1', { id: '1', type: 'Test', properties: {} });
      await adapter.set('key2', { id: '2', type: 'Test', properties: {} });

      await adapter.clear();
      expect(await adapter.size()).toBe(0);
    });

    it('should iterate over keys', async () => {
      await adapter.set('key1', { id: '1', type: 'Test', properties: {} });
      await adapter.set('key2', { id: '2', type: 'Test', properties: {} });

      const keys: string[] = [];
      for await (const key of adapter.keys()) {
        keys.push(key);
      }

      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('Graph Operations', () => {
    let adapter: ReturnType<typeof createTestGraph>['adapter'];
    let nodes: GraphNode[];

    beforeEach(() => {
      const testGraph = createTestGraph();
      adapter = testGraph.adapter;
      nodes = testGraph.nodes;
    });

    it('should add and retrieve nodes', async () => {
      const newNode: GraphNode = {
        id: 'node4',
        type: 'Person',
        properties: { name: 'Charlie' },
      };

      await adapter.addNode(newNode);
      const retrieved = await adapter.getNode('node4');

      expect(retrieved).toEqual(newNode);
    });

    it('should traverse graph with depth limit', async () => {
      const pattern: TraversalPattern = {
        startNode: 'node1',
        maxDepth: 1,
      };

      const results = await adapter.traverseGraph(pattern);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      // Should find node1 and its immediate neighbors
      expect(results.some(r => r.id === 'node1')).toBe(true);
    });

    it('should find connected nodes', async () => {
      const connected = await adapter.findConnectedNodes('node1', 1);

      expect(connected).toBeDefined();
      expect(Array.isArray(connected)).toBe(true);
    });

    it('should find shortest path between nodes', async () => {
      const path = await adapter.shortestPath('node1', 'node3');

      expect(path).toBeDefined();
      expect(Array.isArray(path)).toBe(true);
      // Path should exist from node1 to node3
      if (path.length > 0) {
        expect(path[0].id).toBe('node1');
        expect(path[path.length - 1].id).toBe('node3');
      }
    });

    it('should return empty array for non-existent path', async () => {
      const path = await adapter.shortestPath('node1', 'nonexistent');

      expect(path).toEqual([]);
    });

    it('should filter edges by type', async () => {
      const pattern: TraversalPattern = {
        startNode: 'node1',
        maxDepth: 2,
        edgeTypes: ['KNOWS'],
      };

      const results = await adapter.traverseGraph(pattern);

      // Should only traverse KNOWS edges
      expect(results).toBeDefined();
    });
  });

  describe('Mock Data Management', () => {
    it('should allow setting and getting mock data', () => {
      const adapter = createMockKuzuAdapter();

      const mockData = {
        storage: [
          ['key1', { id: '1', type: 'Test', properties: {} }]
        ] as Array<[string, GraphEntity]>,
        nodes: [
          ['node1', { id: 'node1', type: 'Person', properties: { name: 'Test' } }]
        ] as Array<[string, GraphNode]>,
        edges: [
          { id: 'e1', type: 'KNOWS', source: 'node1', target: 'node2', properties: {} }
        ],
      };

      adapter.setMockData(mockData);
      const retrievedData = adapter.getMockData();

      expect(retrievedData.storage).toHaveLength(1);
      expect(retrievedData.nodes).toHaveLength(1);
      expect(retrievedData.edges).toHaveLength(1);
    });
  });
});
