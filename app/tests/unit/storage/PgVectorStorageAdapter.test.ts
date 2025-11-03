/**
 * Unit Tests for PgVectorStorageAdapter
 *
 * These are TRUE unit tests:
 * - No real PostgreSQL database required
 * - Fast execution (< 5s total)
 * - Fully isolated using MockPostgreSQLClient
 * - Deterministic
 *
 * Tests verify:
 * 1. Basic Storage interface operations
 * 2. PrimaryStorage graph operations
 * 3. SQL query construction and parameterization
 * 4. Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PgVectorStorageAdapter } from '../../../src/storage/adapters/PgVectorStorageAdapter';
import { MockPostgreSQLClient } from '../mocks/MockPostgreSQLClient';
import { PgVectorStorageConfig } from '../../../src/storage/interfaces/Storage';
import { GraphNode, GraphEdge } from '../../../src/storage/types/GraphTypes';

describe('PgVectorStorageAdapter (Unit Tests)', () => {
  let adapter: PgVectorStorageAdapter<any>;
  let mockPg: MockPostgreSQLClient;
  let config: PgVectorStorageConfig;

  beforeEach(async () => {
    // Create mock PostgreSQL client
    mockPg = new MockPostgreSQLClient();

    // Create test configuration
    config = {
      type: 'pgvector',
      connectionString: 'postgresql://test:test@localhost:5432/test',
      schema: 'public',
      dataTable: 'data',
      nodesTable: 'nodes',
      edgesTable: 'edges',
      vectorDimensions: 1536,
      distanceMetric: 'cosine',
      enableVectorIndex: false, // Disable for unit tests
      poolSize: 10,
    };

    // Create adapter with mock injected
    adapter = new PgVectorStorageAdapter(config, mockPg);

    // Initialize the adapter (creates schema)
    mockPg.mockQueryImplementation(async (sql) => {
      // Mock successful schema creation
      if (sql.includes('CREATE TABLE') || sql.includes('CREATE INDEX') || sql.includes('CREATE EXTENSION')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });

    await adapter.initialize();

    // Reset mock after initialization
    mockPg.reset();
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ==========================================================================
  // BASIC STORAGE OPERATIONS
  // ==========================================================================

  describe('Basic Storage Operations', () => {
    it('should store and retrieve a value with set/get', async () => {
      const testValue = { id: 'test-1', type: 'Test', properties: { name: 'Test Entity' } };

      // Mock set operation (INSERT)
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('INSERT INTO') && sql.includes('data')) {
          expect(params).toEqual(['test-key', JSON.stringify(testValue)]);
          return { rows: [], rowCount: 1 };
        }
        // Mock get operation (SELECT)
        if (sql.includes('SELECT value FROM') && sql.includes('data')) {
          expect(params).toEqual(['test-key']);
          return { rows: [{ value: testValue }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      await adapter.set('test-key', testValue);
      const retrieved = await adapter.get('test-key');

      expect(retrieved).toEqual(testValue);
      expect(mockPg.wasQueryExecuted('INSERT INTO')).toBe(true);
      expect(mockPg.wasQueryExecuted('SELECT value FROM')).toBe(true);
    });

    it('should return undefined for non-existent key', async () => {
      mockPg.mockQueryResult({ rows: [], rowCount: 0 });

      const result = await adapter.get('non-existent');

      expect(result).toBeUndefined();
    });

    it('should check if key exists with has()', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('SELECT 1 FROM') && sql.includes('WHERE key')) {
          expect(params).toEqual(['existing-key']);
          return { rows: [{ '?column?': 1 }], rowCount: 1 }; // Row exists
        }
        return { rows: [], rowCount: 0 };
      });

      const exists = await adapter.has('existing-key');

      expect(exists).toBe(true);
      expect(mockPg.wasQueryExecuted('SELECT 1 FROM')).toBe(true);
    });

    it('should delete a key and return true if existed', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('DELETE FROM') && sql.includes('data')) {
          expect(params).toEqual(['test-key']);
          return { rows: [], rowCount: 1 }; // 1 row deleted
        }
        return { rows: [], rowCount: 0 };
      });

      const deleted = await adapter.delete('test-key');

      expect(deleted).toBe(true);
      expect(mockPg.wasQueryExecuted('DELETE FROM')).toBe(true);
    });

    it('should delete a key and return false if did not exist', async () => {
      mockPg.mockQueryResult({ rows: [], rowCount: 0 }); // 0 rows deleted

      const deleted = await adapter.delete('non-existent');

      expect(deleted).toBe(false);
    });

    it('should clear all data', async () => {
      mockPg.mockQueryImplementation(async (sql) => {
        if (sql.includes('TRUNCATE TABLE')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      });

      await adapter.clear();

      expect(mockPg.wasQueryExecuted('TRUNCATE TABLE')).toBe(true);
    });

    it('should return correct size', async () => {
      mockPg.mockQueryImplementation(async (sql) => {
        if (sql.includes('SELECT COUNT(*) as count FROM') && sql.includes('data')) {
          return { rows: [{ count: '42' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      const size = await adapter.size();

      expect(size).toBe(42);
      expect(mockPg.wasQueryExecuted('SELECT COUNT')).toBe(true);
    });

    it('should iterate over keys', async () => {
      // Mock getConnection to return a connection with query results
      const connectionQueryMock = vi.fn().mockResolvedValue({
        rows: [{ key: 'key1' }, { key: 'key2' }, { key: 'key3' }],
        rowCount: 3
      });
      const releaseMock = vi.fn();

      mockPg.getConnectionMock.mockResolvedValue({
        query: connectionQueryMock,
        release: releaseMock
      });

      const keys: string[] = [];
      for await (const key of adapter.keys()) {
        keys.push(key);
      }

      expect(keys).toEqual(['key1', 'key2', 'key3']);
      expect(releaseMock).toHaveBeenCalled();
    });

    it('should iterate over values', async () => {
      const value1 = { id: '1', type: 'Test', properties: {} };
      const value2 = { id: '2', type: 'Test', properties: {} };

      const connectionQueryMock = vi.fn().mockResolvedValue({
        rows: [{ value: value1 }, { value: value2 }],
        rowCount: 2
      });
      const releaseMock = vi.fn();

      mockPg.getConnectionMock.mockResolvedValue({
        query: connectionQueryMock,
        release: releaseMock
      });

      const values: any[] = [];
      for await (const value of adapter.values()) {
        values.push(value);
      }

      expect(values).toEqual([value1, value2]);
      expect(releaseMock).toHaveBeenCalled();
    });

    it('should iterate over entries', async () => {
      const value1 = { id: '1', type: 'Test', properties: {} };
      const value2 = { id: '2', type: 'Test', properties: {} };

      const connectionQueryMock = vi.fn().mockResolvedValue({
        rows: [
          { key: 'key1', value: value1 },
          { key: 'key2', value: value2 }
        ],
        rowCount: 2
      });
      const releaseMock = vi.fn();

      mockPg.getConnectionMock.mockResolvedValue({
        query: connectionQueryMock,
        release: releaseMock
      });

      const entries: Array<[string, any]> = [];
      for await (const entry of adapter.entries()) {
        entries.push(entry);
      }

      expect(entries).toEqual([
        ['key1', value1],
        ['key2', value2]
      ]);
      expect(releaseMock).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GRAPH NODE OPERATIONS
  // ==========================================================================

  describe('Graph Node Operations', () => {
    it('should add a node', async () => {
      const node: GraphNode = {
        id: 'node-1',
        type: 'Person',
        properties: { name: 'Alice', age: 30 }
      };

      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('INSERT INTO') && sql.includes('nodes')) {
          expect(params?.[0]).toBe('node-1');
          expect(params?.[1]).toBe('Person');
          // Properties are passed as JSON string
          expect(params?.[2]).toBe(JSON.stringify({ name: 'Alice', age: 30 }));
          return { rows: [{ id: 'node-1' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      const nodeId = await adapter.addNode(node);

      expect(nodeId).toBe('node-1');
      expect(mockPg.wasQueryExecuted('INSERT INTO')).toBe(true);
    });

    it('should retrieve a node by ID', async () => {
      const node: GraphNode = {
        id: 'node-1',
        type: 'Person',
        properties: { name: 'Alice' }
      };

      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('SELECT') && sql.includes('nodes') && sql.includes('WHERE id')) {
          expect(params).toEqual(['node-1']);
          return {
            rows: [{
              id: 'node-1',
              type: 'Person',
              properties: { name: 'Alice' }
            }],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const retrieved = await adapter.getNode('node-1');

      expect(retrieved).toEqual(node);
    });

    it('should return null for non-existent node', async () => {
      mockPg.mockQueryResult({ rows: [], rowCount: 0 });

      const node = await adapter.getNode('non-existent');

      expect(node).toBeNull();
    });

    it('should update a node', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('UPDATE') && sql.includes('nodes')) {
          // Properties passed as JSON string, then nodeId
          expect(params?.[0]).toBe(JSON.stringify({ name: 'Alice Updated', age: 31 }));
          expect(params?.[1]).toBe('node-1');
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      await adapter.updateNode('node-1', { name: 'Alice Updated', age: 31 });

      expect(mockPg.wasQueryExecuted('UPDATE')).toBe(true);
    });

    it('should delete a node', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('DELETE FROM') && sql.includes('nodes')) {
          expect(params).toEqual(['node-1']);
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      await adapter.deleteNode('node-1');

      expect(mockPg.wasQueryExecuted('DELETE FROM')).toBe(true);
    });

    it('should query nodes by type', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('SELECT') && sql.includes('nodes') && sql.includes('WHERE type')) {
          expect(params).toEqual(['Person']);
          return {
            rows: [
              { id: 'node-1', type: 'Person', properties: { name: 'Alice' } },
              { id: 'node-2', type: 'Person', properties: { name: 'Bob' } }
            ],
            rowCount: 2
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const nodes = await adapter.queryNodes('Person');

      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBe('node-1');
      expect(nodes[1].id).toBe('node-2');
    });

    it('should query nodes by properties using JSONB containment', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('properties @>')) {
          expect(params?.[0]).toBe('Person');
          // Properties passed as JSON string
          expect(params?.[1]).toBe(JSON.stringify({ age: 30 }));
          return {
            rows: [
              { id: 'node-1', type: 'Person', properties: { name: 'Alice', age: 30 } }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const nodes = await adapter.queryNodes('Person', { age: 30 });

      expect(nodes).toHaveLength(1);
      expect(nodes[0].properties.name).toBe('Alice');
    });
  });

  // ==========================================================================
  // GRAPH EDGE OPERATIONS
  // ==========================================================================

  describe('Graph Edge Operations', () => {
    it('should add an edge', async () => {
      const edge: GraphEdge = {
        type: 'KNOWS',
        from: 'node-1',
        to: 'node-2',
        properties: { since: 2020 }
      };

      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('INSERT INTO') && sql.includes('edges')) {
          expect(params?.[0]).toBe('node-1');
          expect(params?.[1]).toBe('node-2');
          expect(params?.[2]).toBe('KNOWS');
          // Properties passed as JSON string
          expect(params?.[3]).toBe(JSON.stringify({ since: 2020 }));
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      // addEdge returns void, not ID
      await adapter.addEdge(edge);

      expect(mockPg.wasQueryExecuted('INSERT INTO')).toBe(true);
    });

    it('should retrieve an edge by from/to nodes', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('SELECT') && sql.includes('edges') && sql.includes('from_node')) {
          expect(params).toEqual(['node-1', 'node-2']);
          return {
            rows: [{
              from_node: 'node-1',
              to_node: 'node-2',
              type: 'KNOWS',
              properties: { since: 2020 }
            }],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const edge = await adapter.getEdge('node-1', 'node-2');

      expect(edge).toBeDefined();
      expect(edge?.from).toBe('node-1');
      expect(edge?.to).toBe('node-2');
      expect(edge?.type).toBe('KNOWS');
    });

    it('should return null for non-existent edge', async () => {
      mockPg.mockQueryResult({ rows: [], rowCount: 0 });

      const edge = await adapter.getEdge('node-1', 'node-2');

      expect(edge).toBeNull();
    });

    it('should delete an edge', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('DELETE FROM') && sql.includes('edges')) {
          expect(params).toEqual(['node-1', 'node-2']);
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      const deleted = await adapter.deleteEdge('node-1', 'node-2');

      expect(deleted).toBe(true);
      expect(mockPg.wasQueryExecuted('DELETE FROM')).toBe(true);
    });

    it('should get edges for a node (both directions)', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('SELECT') && sql.includes('edges')) {
          expect(params).toEqual(['node-1']);
          return {
            rows: [
              {
                from_node: 'node-1',
                to_node: 'node-2',
                type: 'KNOWS',
                properties: {}
              },
              {
                from_node: 'node-3',
                to_node: 'node-1',
                type: 'KNOWS',
                properties: {}
              }
            ],
            rowCount: 2
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const edges = await adapter.getEdges('node-1');

      expect(edges).toHaveLength(2);
      expect(edges[0].from).toBe('node-1');
      expect(edges[1].to).toBe('node-1');
    });

    it('should filter edges by type', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('type = ANY')) {
          expect(params[0]).toBe('node-1');
          expect(params[1]).toEqual(['WORKS_WITH']);
          return {
            rows: [{
              from_node: 'node-1',
              to_node: 'node-4',
              type: 'WORKS_WITH',
              properties: {}
            }],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const edges = await adapter.getEdges('node-1', ['WORKS_WITH']);

      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('WORKS_WITH');
    });

    it('should filter edges by multiple types', async () => {
      mockPg.mockQueryImplementation(async (sql, params) => {
        if (sql.includes('type = ANY')) {
          expect(params[0]).toBe('node-1');
          expect(params[1]).toEqual(['KNOWS', 'WORKS_WITH']);
          return {
            rows: [{
              from_node: 'node-1',
              to_node: 'node-2',
              type: 'KNOWS',
              properties: {}
            }, {
              from_node: 'node-1',
              to_node: 'node-4',
              type: 'WORKS_WITH',
              properties: {}
            }],
            rowCount: 2
          };
        }
        return { rows: [], rowCount: 0 };
      });

      const edges = await adapter.getEdges('node-1', ['KNOWS', 'WORKS_WITH']);

      expect(edges).toHaveLength(2);
      expect(edges.map(e => e.type)).toContain('KNOWS');
      expect(edges.map(e => e.type)).toContain('WORKS_WITH');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPg.mockQueryError(new Error('Connection failed'));

      await expect(adapter.get('test-key')).rejects.toThrow('Connection failed');
    });

    it('should handle SQL syntax errors', async () => {
      mockPg.mockQueryError(new Error('syntax error at or near "SELECT"'));

      await expect(adapter.size()).rejects.toThrow();
    });
  });

  // ==========================================================================
  // SQL PARAMETERIZATION (SQL INJECTION PREVENTION)
  // ==========================================================================

  describe('SQL Parameterization', () => {
    it('should use parameterized queries for get()', async () => {
      mockPg.mockQueryResult({ rows: [], rowCount: 0 });

      await adapter.get('test-key');

      const queries = mockPg.getExecutedQueries();
      const params = mockPg.getQueryParameters();

      expect(queries.some(q => q.includes('$1'))).toBe(true);
      expect(params.some(p => p.includes('test-key'))).toBe(true);
    });

    it('should use parameterized queries for addNode()', async () => {
      mockPg.mockQueryResult({ rows: [{ id: 'node-1' }], rowCount: 1 });

      await adapter.addNode({
        id: 'node-1',
        type: 'Test',
        properties: { name: 'Test' }
      });

      const queries = mockPg.getExecutedQueries();
      expect(queries.some(q => q.includes('$1') && q.includes('$2'))).toBe(true);
    });

    it('should sanitize user input in property queries', async () => {
      mockPg.mockQueryResult({ rows: [], rowCount: 0 });

      // Attempt SQL injection via properties
      await adapter.queryNodes({
        type: 'Person',
        properties: { name: "'; DROP TABLE nodes; --" }
      });

      // Query should use parameterized $1, $2 placeholders
      const queries = mockPg.getExecutedQueries();
      expect(queries.some(q => q.includes('DROP TABLE'))).toBe(false);
      expect(queries.some(q => q.includes('$1'))).toBe(true);
    });
  });
});
