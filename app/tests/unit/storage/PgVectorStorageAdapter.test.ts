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

  // ============================================================================
  // SECURITY TESTS: SQL Injection Prevention
  // ============================================================================

  describe('Security: SQL Injection Prevention', () => {
    beforeEach(() => {
      // Reset mock before each test
      mockPg.reset();
      mockPg.mockQueryResult({ rows: [], rowCount: 0 });
    });

    describe('traverse() input validation', () => {
      it('should reject invalid direction values', async () => {
        const pattern: any = {
          startNode: 'node-1',
          direction: 'UNION SELECT * FROM users--' // SQL injection attempt
        };

        await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid direction/);
      });

      it('should reject direction with SQL keywords', async () => {
        const pattern: any = {
          startNode: 'node-1',
          direction: '; DROP TABLE nodes; --'
        };

        await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid direction/);
      });

      it('should accept valid direction: outgoing', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const pattern = {
          startNode: 'node-1',
          direction: 'outgoing' as const
        };

        await expect(adapter.traverse(pattern)).resolves.toEqual([]);
      });

      it('should accept valid direction: incoming', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const pattern = {
          startNode: 'node-1',
          direction: 'incoming' as const
        };

        await expect(adapter.traverse(pattern)).resolves.toEqual([]);
      });

      it('should accept valid direction: both', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const pattern = {
          startNode: 'node-1',
          direction: 'both' as const
        };

        await expect(adapter.traverse(pattern)).resolves.toEqual([]);
      });

      it('should accept undefined direction (defaults to both)', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const pattern = {
          startNode: 'node-1'
        };

        await expect(adapter.traverse(pattern)).resolves.toEqual([]);
      });

      it('should reject negative maxDepth', async () => {
        const pattern: any = {
          startNode: 'node-1',
          maxDepth: -1
        };

        await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid maxDepth/);
      });

      it('should reject maxDepth exceeding absolute maximum', async () => {
        const pattern: any = {
          startNode: 'node-1',
          maxDepth: 99999 // Way over ABSOLUTE_MAX_DEPTH (50)
        };

        await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid maxDepth/);
      });

      it('should reject non-numeric maxDepth', async () => {
        const pattern: any = {
          startNode: 'node-1',
          maxDepth: 'DROP TABLE nodes' // SQL injection attempt
        };

        await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid maxDepth/);
      });

      it('should reject maxDepth with SQL injection payload', async () => {
        const pattern: any = {
          startNode: 'node-1',
          maxDepth: '5; DROP TABLE nodes; --'
        };

        await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid maxDepth/);
      });

      it('should accept valid maxDepth within bounds', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const pattern = {
          startNode: 'node-1',
          maxDepth: 5
        };

        await expect(adapter.traverse(pattern)).resolves.toEqual([]);
      });

      it('should accept maxDepth at upper bound (ABSOLUTE_MAX_DEPTH)', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const pattern = {
          startNode: 'node-1',
          maxDepth: 50 // ABSOLUTE_MAX_DEPTH
        };

        await expect(adapter.traverse(pattern)).resolves.toEqual([]);
      });

      it('should sanitize maxDepth to prevent string interpolation attacks', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          // Verify SQL doesn't contain injected code
          expect(sql).not.toContain('DROP TABLE');
          expect(sql).not.toContain('UNION SELECT');
          expect(sql).not.toContain('--');
          return { rows: [], rowCount: 0 };
        });

        const pattern: any = {
          startNode: 'node-1',
          maxDepth: '5) OR 1=1; DROP TABLE nodes; --'
        };

        // Should throw validation error before SQL execution
        await expect(adapter.traverse(pattern)).rejects.toThrow();
      });
    });

    describe('shortestPath() input validation', () => {
      it('should reject negative maxDepth in edgeTypes array', async () => {
        const pattern: any = {
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          edgeTypes: ['KNOWS', '-1; DROP TABLE edges; --']
        };

        // Should not throw on edge types (they're parameterized)
        // But would need validation for direction if it existed
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });
        await expect(adapter.shortestPath('node-1', 'node-2', pattern.edgeTypes)).resolves.toBeNull();
      });

      it('should handle empty node IDs safely', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        await expect(adapter.shortestPath('', '')).resolves.toBeNull();
      });

      it('should sanitize node IDs with SQL injection attempts', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          // Verify parameters are used, not interpolated
          expect(sql).toContain('$1');
          expect(sql).toContain('$2');
          expect(sql).not.toContain('DROP TABLE');

          // Verify malicious input is passed as parameter
          if (params) {
            expect(params[0]).toContain('DROP TABLE');
          }

          return { rows: [], rowCount: 0 };
        });

        await adapter.shortestPath(
          "'; DROP TABLE nodes; --",
          "node-2"
        );
      });
    });

    describe('findConnected() input validation', () => {
      it('should reject negative maxDepth', async () => {
        await expect(adapter.findConnected('node-1', -5)).rejects.toThrow(/Invalid maxDepth/);
      });

      it('should reject maxDepth exceeding absolute maximum', async () => {
        await expect(adapter.findConnected('node-1', 10000)).rejects.toThrow(/Invalid maxDepth/);
      });

      it('should reject non-numeric maxDepth', async () => {
        const nodeId = 'node-1';
        const maliciousDepth: any = 'DROP TABLE nodes';

        await expect(adapter.findConnected(nodeId, maliciousDepth)).rejects.toThrow(/Invalid maxDepth/);
      });

      it('should accept valid maxDepth', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        await expect(adapter.findConnected('node-1', 5)).resolves.toEqual([]);
      });

      it('should accept undefined maxDepth (uses default)', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        await expect(adapter.findConnected('node-1')).resolves.toEqual([]);
      });

      it('should sanitize maxDepth to prevent interpolation attacks', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          // Verify SQL doesn't contain injected code
          expect(sql).not.toContain('DROP TABLE');
          expect(sql).not.toContain('UNION SELECT');
          return { rows: [], rowCount: 0 };
        });

        const maliciousDepth: any = '3; DROP TABLE nodes; --';

        // Should throw validation error
        await expect(adapter.findConnected('node-1', maliciousDepth)).rejects.toThrow();
      });
    });

    describe('Direction validation comprehensive tests', () => {
      const invalidDirections = [
        'invalid',
        'OUTGOING', // wrong case
        'in', // partial
        'out', // partial
        '1=1',
        'outgoing OR 1=1',
        'incoming; DROP TABLE',
        'both\')',
        null as any,
        42 as any,
        {} as any,
        [] as any
      ];

      invalidDirections.forEach(direction => {
        it(`should reject invalid direction: ${JSON.stringify(direction)}`, async () => {
          const pattern: any = {
            startNode: 'node-1',
            direction
          };

          await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid direction/);
        });
      });
    });

    describe('MaxDepth boundary tests', () => {
      const invalidDepths = [
        -1,
        -100,
        51, // Just over ABSOLUTE_MAX_DEPTH (50)
        100,
        999999,
        Infinity,
        NaN,
        '5',
        '5; DROP TABLE',
        null as any,
        {} as any,
        [] as any
      ];

      invalidDepths.forEach(depth => {
        it(`should reject invalid maxDepth: ${JSON.stringify(depth)}`, async () => {
          const pattern: any = {
            startNode: 'node-1',
            maxDepth: depth
          };

          await expect(adapter.traverse(pattern)).rejects.toThrow(/Invalid maxDepth/);
        });
      });

      const validDepths = [0, 1, 5, 10, 20, 49, 50];

      validDepths.forEach(depth => {
        it(`should accept valid maxDepth: ${depth}`, async () => {
          mockPg.mockQueryResult({ rows: [], rowCount: 0 });

          const pattern = {
            startNode: 'node-1',
            maxDepth: depth
          };

          await expect(adapter.traverse(pattern)).resolves.toEqual([]);
        });
      });
    });

    describe('SQL query construction safety', () => {
      it('should never interpolate direction string directly into SQL', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          // SQL should be built programmatically, not with user strings
          // Check that common injection patterns don't appear
          expect(sql).not.toMatch(/e\.from_node.*\$[^0-9]/); // No weird parameter syntax
          return { rows: [], rowCount: 0 };
        });

        await adapter.traverse({
          startNode: 'node-1',
          direction: 'outgoing'
        });
      });

      it('should always use integer for maxDepth in SQL', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          // Find the maxDepth comparison in SQL
          const depthMatch = sql.match(/depth < (\d+)/);
          expect(depthMatch).toBeTruthy();

          if (depthMatch) {
            const depth = parseInt(depthMatch[1], 10);
            expect(depth).toBeGreaterThanOrEqual(0);
            expect(depth).toBeLessThanOrEqual(50); // ABSOLUTE_MAX_DEPTH
          }

          return { rows: [], rowCount: 0 };
        });

        await adapter.traverse({
          startNode: 'node-1',
          maxDepth: 5
        });
      });
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS: N+1 Query Optimization
  // ============================================================================

  describe('Performance: N+1 Query Optimization', () => {
    beforeEach(() => {
      mockPg.reset();
    });

    describe('traverse() batch fetching', () => {
      it('should fetch nodes in single batch query (not per path)', async () => {
        // Setup: Mock CTE query that returns multiple paths
        let queryCount = 0;
        const queries: string[] = [];

        mockPg.mockQueryImplementation(async (sql, params) => {
          queryCount++;
          queries.push(sql);

          // First query: CTE returns multiple paths
          if (sql.includes('WITH RECURSIVE')) {
            return {
              rows: [
                {
                  path_nodes: ['node-1', 'node-2', 'node-3'],
                  path_edges_data: [
                    { from: 'node-1', to: 'node-2', type: 'KNOWS', properties: {} },
                    { from: 'node-2', to: 'node-3', type: 'KNOWS', properties: {} }
                  ],
                  depth: 2
                },
                {
                  path_nodes: ['node-1', 'node-4', 'node-5'],
                  path_edges_data: [
                    { from: 'node-1', to: 'node-4', type: 'KNOWS', properties: {} },
                    { from: 'node-4', to: 'node-5', type: 'KNOWS', properties: {} }
                  ],
                  depth: 2
                },
                {
                  path_nodes: ['node-1', 'node-2', 'node-6'],
                  path_edges_data: [
                    { from: 'node-1', to: 'node-2', type: 'KNOWS', properties: {} },
                    { from: 'node-2', to: 'node-6', type: 'KNOWS', properties: {} }
                  ],
                  depth: 2
                }
              ],
              rowCount: 3
            };
          }

          // Second query: Batch fetch all nodes
          if (sql.includes('WHERE id = ANY')) {
            // Verify this is called with ALL unique node IDs at once
            expect(params).toBeDefined();
            expect(params![0]).toBeInstanceOf(Array);
            const nodeIds = params![0] as string[];

            // Should fetch all 6 unique nodes in one query
            expect(nodeIds.length).toBeGreaterThanOrEqual(5); // At least 5 unique nodes
            expect(nodeIds).toContain('node-1');
            expect(nodeIds).toContain('node-2');
            expect(nodeIds).toContain('node-3');

            return {
              rows: nodeIds.map(id => ({
                id,
                type: 'Person',
                properties: { name: `Node ${id}` }
              })),
              rowCount: nodeIds.length
            };
          }

          return { rows: [], rowCount: 0 };
        });

        const pattern = {
          startNode: 'node-1',
          maxDepth: 3
        };

        await adapter.traverse(pattern);

        // CRITICAL: Should be only 2 queries (1 CTE + 1 batch fetch)
        // NOT 4 queries (1 CTE + 3 per-path fetches)
        expect(queryCount).toBe(2);

        // Verify we have exactly 1 CTE query and 1 batch node fetch
        const cteQueries = queries.filter(q => q.includes('WITH RECURSIVE'));
        const nodeFetchQueries = queries.filter(q => q.includes('WHERE id = ANY'));

        expect(cteQueries.length).toBe(1);
        expect(nodeFetchQueries.length).toBe(1); // Single batch fetch
      });

      it('should handle empty result set efficiently', async () => {
        let queryCount = 0;

        mockPg.mockQueryImplementation(async (sql) => {
          queryCount++;

          if (sql.includes('WITH RECURSIVE')) {
            return { rows: [], rowCount: 0 }; // No paths found
          }

          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.traverse({
          startNode: 'node-1',
          maxDepth: 3
        });

        // Should only run CTE query, no node fetch for empty result
        expect(queryCount).toBe(1);
        expect(result).toEqual([]);
      });

      it('should deduplicate node IDs before fetching', async () => {
        let nodeIds: string[] | undefined;

        mockPg.mockQueryImplementation(async (sql, params) => {
          if (sql.includes('WITH RECURSIVE')) {
            // Return paths with overlapping nodes
            return {
              rows: [
                {
                  path_nodes: ['node-1', 'node-2', 'node-3'],
                  path_edges_data: [],
                  depth: 2
                },
                {
                  path_nodes: ['node-1', 'node-2', 'node-4'], // node-1 and node-2 repeated
                  path_edges_data: [],
                  depth: 2
                }
              ],
              rowCount: 2
            };
          }

          if (sql.includes('WHERE id = ANY')) {
            nodeIds = params![0] as string[];

            return {
              rows: nodeIds.map(id => ({
                id,
                type: 'Person',
                properties: {}
              })),
              rowCount: nodeIds.length
            };
          }

          return { rows: [], rowCount: 0 };
        });

        await adapter.traverse({
          startNode: 'node-1',
          maxDepth: 3
        });

        // Should fetch only unique nodes: node-1, node-2, node-3, node-4 (4 nodes, not 6)
        expect(nodeIds).toBeDefined();
        expect(new Set(nodeIds).size).toBe(nodeIds!.length); // All unique
        expect(nodeIds!.length).toBe(4);
      });

      it('should scale well with many paths (performance test)', async () => {
        let queryCount = 0;

        mockPg.mockQueryImplementation(async (sql, params) => {
          queryCount++;

          if (sql.includes('WITH RECURSIVE')) {
            // Simulate 50 paths with 3 nodes each
            const paths = Array.from({ length: 50 }, (_, i) => ({
              path_nodes: [`node-${i * 3}`, `node-${i * 3 + 1}`, `node-${i * 3 + 2}`],
              path_edges_data: [],
              depth: 2
            }));

            return { rows: paths, rowCount: paths.length };
          }

          if (sql.includes('WHERE id = ANY')) {
            const nodeIds = params![0] as string[];
            return {
              rows: nodeIds.map(id => ({
                id,
                type: 'Person',
                properties: {}
              })),
              rowCount: nodeIds.length
            };
          }

          return { rows: [], rowCount: 0 };
        });

        const startTime = Date.now();
        await adapter.traverse({
          startNode: 'node-0',
          maxDepth: 3
        });
        const duration = Date.now() - startTime;

        // Should still be only 2 queries even with 50 paths
        expect(queryCount).toBe(2);

        // Should be fast (< 100ms for mock)
        expect(duration).toBeLessThan(100);
      });
    });

    describe('shortestPath() batch fetching', () => {
      it('should fetch nodes in single batch query', async () => {
        let queryCount = 0;
        const queries: string[] = [];

        mockPg.mockQueryImplementation(async (sql, params) => {
          queryCount++;
          queries.push(sql);

          // CTE query returns shortest path
          if (sql.includes('WITH RECURSIVE')) {
            return {
              rows: [{
                path_nodes: ['node-1', 'node-2', 'node-3', 'node-4'],
                path_edges: ['KNOWS', 'WORKS_WITH', 'MANAGES'],
                depth: 3
              }],
              rowCount: 1
            };
          }

          // Batch node fetch
          if (sql.includes('WHERE id = ANY') && !sql.includes('from_node')) {
            const nodeIds = params![0] as string[];
            return {
              rows: nodeIds.map(id => ({
                id,
                type: 'Person',
                properties: {}
              })),
              rowCount: nodeIds.length
            };
          }

          // Edge queries
          if (sql.includes('from_node')) {
            return {
              rows: [{
                from_node: params![0],
                to_node: params![1],
                type: 'KNOWS',
                properties: {}
              }],
              rowCount: 1
            };
          }

          return { rows: [], rowCount: 0 };
        });

        await adapter.shortestPath('node-1', 'node-4');

        // Should use batch fetching (1 CTE + 1 batch node fetch + N edge fetches)
        const nodeFetchQueries = queries.filter(q =>
          q.includes('WHERE id = ANY') && !q.includes('from_node')
        );

        expect(nodeFetchQueries.length).toBe(1); // Single batch fetch for nodes
      });

      it('should handle path not found efficiently', async () => {
        let queryCount = 0;

        mockPg.mockQueryImplementation(async (sql) => {
          queryCount++;

          if (sql.includes('WITH RECURSIVE')) {
            return { rows: [], rowCount: 0 }; // No path found
          }

          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.shortestPath('node-1', 'node-99');

        // Should only run CTE query
        expect(queryCount).toBe(1);
        expect(result).toBeNull();
      });
    });

    describe('Query count metrics', () => {
      it('should minimize database round trips for traverse()', async () => {
        const queryLog: Array<{ type: string; time: number }> = [];

        mockPg.mockQueryImplementation(async (sql) => {
          const start = Date.now();

          let type = 'unknown';
          if (sql.includes('WITH RECURSIVE')) type = 'CTE';
          else if (sql.includes('WHERE id = ANY')) type = 'batch_fetch';

          // Simulate network latency
          await new Promise(resolve => setTimeout(resolve, 1));

          queryLog.push({ type, time: Date.now() - start });

          if (type === 'CTE') {
            return {
              rows: [
                { path_nodes: ['node-1', 'node-2'], path_edges_data: [], depth: 1 },
                { path_nodes: ['node-1', 'node-3'], path_edges_data: [], depth: 1 }
              ],
              rowCount: 2
            };
          }

          if (type === 'batch_fetch') {
            return {
              rows: [
                { id: 'node-1', type: 'Person', properties: {} },
                { id: 'node-2', type: 'Person', properties: {} },
                { id: 'node-3', type: 'Person', properties: {} }
              ],
              rowCount: 3
            };
          }

          return { rows: [], rowCount: 0 };
        });

        await adapter.traverse({
          startNode: 'node-1',
          maxDepth: 2
        });

        // Verify query pattern
        expect(queryLog.length).toBe(2);
        expect(queryLog[0].type).toBe('CTE');
        expect(queryLog[1].type).toBe('batch_fetch');

        // Each query should have minimal overhead
        // Note: Use generous threshold for CI environments with variable timing
        queryLog.forEach(log => {
          expect(log.time).toBeLessThan(100); // < 100ms overhead (generous for CI)
        });
      });
    });
  });

  // ==========================================================================
  // PHASE 3: SEMANTIC STORAGE - FULL-TEXT SEARCH
  // ==========================================================================

  describe('Full-Text Search', () => {
    describe('search()', () => {
      it('should perform full-text search with relevance ranking', async () => {
        mockPg.mockQueryResult({
          rows: [
            {
              id: 'doc-1',
              content: 'PostgreSQL full-text search tutorial',
              rank: 0.95,
              headline: '<b>PostgreSQL</b> <b>full-text</b> <b>search</b> tutorial'
            },
            {
              id: 'doc-2',
              content: 'Advanced search techniques',
              rank: 0.75,
              headline: 'Advanced <b>search</b> techniques'
            }
          ],
          rowCount: 2
        });

        const results = await adapter.search('documents', 'PostgreSQL search', {
          fields: ['content'],
          limit: 10,
          highlight: true
        });

        expect(results).toHaveLength(2);
        expect(results[0].score).toBeGreaterThan(results[1].score);
        expect(results[0].document.id).toBe('doc-1');
        expect(results[1].document.id).toBe('doc-2');
        expect(mockPg.wasQueryExecuted('ts_rank')).toBe(true);
        expect(mockPg.wasQueryExecuted('to_tsquery')).toBe(true);
      });

      it('should handle empty search results', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const results = await adapter.search('documents', 'nonexistent', {
          fields: ['content']
        });

        expect(results).toHaveLength(0);
      });

      it('should apply search options (limit)', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(params).toContain(5); // limit
          return { rows: [], rowCount: 0 };
        });

        await adapter.search('documents', 'test', { fields: ['content'], limit: 5 });
      });
    });

    describe('createSearchIndex()', () => {
      it('should create GIN index for full-text search', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('CREATE INDEX');
          expect(sql).toContain('GIN');
          expect(sql).toContain('to_tsvector');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createSearchIndex('documents', ['title', 'content']);

        expect(mockPg.getExecutedQueries().length).toBeGreaterThan(0);
      });

      it('should handle single field index', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('to_tsvector');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createSearchIndex('documents', ['content']);
      });
    });

    describe('dropSearchIndex()', () => {
      it('should drop search index', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('DROP INDEX');
          expect(sql).toContain('IF EXISTS');
          return { rows: [], rowCount: 0 };
        });

        await adapter.dropSearchIndex('documents');

        expect(mockPg.wasQueryExecuted('DROP INDEX')).toBe(true);
      });
    });
  });

  // ==========================================================================
  // PHASE 3: SEMANTIC STORAGE - MATERIALIZED VIEWS
  // ==========================================================================

  describe('Materialized Views', () => {
    describe('createMaterializedView()', () => {
      it('should create materialized view with query', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('CREATE MATERIALIZED VIEW');
          expect(sql).toContain('node_stats');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createMaterializedView({
          name: 'node_stats',
          query: {
            table: 'nodes',
            select: ['type', 'COUNT(*) as count'],
            groupBy: ['type']
          }
        });

        expect(mockPg.wasQueryExecuted('CREATE MATERIALIZED VIEW')).toBe(true);
      });

      it('should handle complex query with filters', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        await adapter.createMaterializedView({
          name: 'active_nodes',
          query: {
            table: 'nodes',
            select: ['*'],
            where: [{ field: 'active', operator: '=', value: true }]
          }
        });

        expect(mockPg.wasQueryExecuted('WHERE')).toBe(true);
      });
    });

    describe('refreshMaterializedView()', () => {
      it('should refresh materialized view concurrently', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('REFRESH MATERIALIZED VIEW');
          expect(sql).toContain('CONCURRENTLY');
          return { rows: [], rowCount: 0 };
        });

        await adapter.refreshMaterializedView('node_stats');

        expect(mockPg.wasQueryExecuted('REFRESH')).toBe(true);
      });

      it('should handle non-existent view gracefully', async () => {
        mockPg.mockQueryImplementation(async () => {
          throw new Error('relation "nonexistent_view" does not exist');
        });

        await expect(adapter.refreshMaterializedView('nonexistent_view'))
          .rejects.toThrow('does not exist');
      });
    });

    describe('queryMaterializedView()', () => {
      it('should query materialized view with filters', async () => {
        mockPg.mockQueryResult({
          rows: [
            { type: 'Person', count: 100 },
            { type: 'Document', count: 50 }
          ],
          rowCount: 2
        });

        const result = await adapter.queryMaterializedView('node_stats', [
          { field: 'count', operator: '>', value: 10 }
        ]);

        expect(result.data).toHaveLength(2);
        expect(result.metadata).toBeDefined();
        expect(mockPg.wasQueryExecuted('SELECT')).toBe(true);
      });

      it('should return empty result for no matches', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const result = await adapter.queryMaterializedView('node_stats');

        expect(result.data).toHaveLength(0);
      });
    });

    describe('dropMaterializedView()', () => {
      it('should drop materialized view', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('DROP MATERIALIZED VIEW');
          expect(sql).toContain('IF EXISTS');
          return { rows: [], rowCount: 0 };
        });

        await adapter.dropMaterializedView('node_stats');

        expect(mockPg.wasQueryExecuted('DROP')).toBe(true);
      });
    });

    describe('listMaterializedViews()', () => {
      it('should list all materialized views in schema', async () => {
        mockPg.mockQueryResult({
          rows: [
            { viewname: 'node_stats', definition: 'SELECT ...' },
            { viewname: 'edge_stats', definition: 'SELECT ...' }
          ],
          rowCount: 2
        });

        const views = await adapter.listMaterializedViews();

        expect(views).toHaveLength(2);
        expect(views[0].name).toBe('node_stats');
        expect(mockPg.wasQueryExecuted('pg_matviews')).toBe(true);
      });

      it('should return empty array when no views exist', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const views = await adapter.listMaterializedViews();

        expect(views).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // PHASE 3: SEMANTIC STORAGE - SCHEMA MANAGEMENT
  // ==========================================================================

  describe('Schema Management', () => {
    describe('defineSchema()', () => {
      it('should store schema definition', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          // Handle CREATE TABLE query
          if (sql.includes('CREATE TABLE')) {
            return { rows: [], rowCount: 0 };
          }
          // Handle INSERT query
          if (sql.includes('INSERT')) {
            expect(params).toContain('users');
            return { rows: [], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.defineSchema('users', {
          id: { type: 'uuid', primaryKey: true },
          name: { type: 'text', nullable: false },
          email: { type: 'text', unique: true },
          created_at: { type: 'timestamp', default: 'now()' }
        });

        expect(mockPg.wasQueryExecuted('INSERT')).toBe(true);
      });

      it('should update existing schema definition', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          // Handle CREATE TABLE query
          if (sql.includes('CREATE TABLE')) {
            return { rows: [], rowCount: 0 };
          }
          // Handle INSERT query
          if (sql.includes('INSERT')) {
            return { rows: [], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.defineSchema('users', { id: { type: 'uuid' } });

        expect(mockPg.wasQueryExecuted('ON CONFLICT')).toBe(true);
      });
    });

    describe('getSchema()', () => {
      it('should retrieve schema definition', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          // Handle EXISTS check
          if (sql.includes('information_schema.tables')) {
            return { rows: [{ exists: true }], rowCount: 1 };
          }
          // Handle schema SELECT
          if (sql.includes('schema_definition')) {
            return {
              rows: [{
                schema_definition: {
                  id: { type: 'uuid', primaryKey: true },
                  name: { type: 'text', nullable: false }
                }
              }],
              rowCount: 1
            };
          }
          return { rows: [], rowCount: 0 };
        });

        const schema = await adapter.getSchema('users');

        expect(schema).toBeDefined();
        expect(schema?.id.type).toBe('uuid');
        expect(schema?.name.type).toBe('text');
      });

      it('should return null for non-existent table', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          // Handle EXISTS check - return false
          if (sql.includes('information_schema.tables')) {
            return { rows: [{ exists: false }], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        const schema = await adapter.getSchema('nonexistent');

        expect(schema).toBeNull();
      });
    });
  });

  describe('Semantic Storage - Query Operations', () => {
    it('should execute semantic query with filters', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [
          { id: '1', type: 'document', name: 'Test Doc' },
          { id: '2', type: 'document', name: 'Another Doc' }
        ],
        rowCount: 2
      });

      const result = await adapter.query({
        from: 'entities',
        select: ['id', 'type', 'name'],
        where: [{ field: 'type', operator: '=', value: 'document' }],
        limit: 10
      });

      expect(result.data).toHaveLength(2);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.rowsScanned).toBe(2);
      expect(result.metadata.fromCache).toBe(false);

      // Verify parameterized query was used
      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['document'])
      );
    });

    it('should execute query with ORDER BY and LIMIT', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ id: '1', name: 'First' }],
        rowCount: 1
      });

      await adapter.query({
        from: 'entities',
        orderBy: [{ field: 'name', direction: 'asc' }],
        limit: 5,
        offset: 10
      });

      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name asc LIMIT 5 OFFSET 10'),
        []
      );
    });

    it('should execute query with GROUP BY', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ type: 'document', count: 5 }],
        rowCount: 1
      });

      await adapter.query({
        from: 'entities',
        select: ['type'],
        groupBy: ['type']
      });

      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY'),
        []
      );
    });
  });

  describe('Semantic Storage - SQL Execution', () => {
    it('should execute raw SQL with parameters', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ count: 42 }],
        rowCount: 1
      });

      const result = await adapter.executeSQL(
        'SELECT COUNT(*) as count FROM entities WHERE type = $1',
        ['document']
      );

      expect(result.data).toEqual([{ count: 42 }]);
      expect(result.metadata.fromCache).toBe(false);
      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.any(String),
        ['document']
      );
    });

    it('should allow SELECT queries without parameters', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ id: '1' }],
        rowCount: 1
      });

      await adapter.executeSQL('SELECT * FROM entities LIMIT 10');

      expect(mockPg.queryMock).toHaveBeenCalled();
    });

    it('should reject dangerous SQL without parameters', async () => {
      await expect(
        adapter.executeSQL('DROP TABLE entities')
      ).rejects.toThrow('DDL/DML without parameters is not allowed');

      await expect(
        adapter.executeSQL('DELETE FROM entities WHERE id = 1')
      ).rejects.toThrow('DDL/DML without parameters is not allowed');

      await expect(
        adapter.executeSQL('UPDATE entities SET name = "test"')
      ).rejects.toThrow('DDL/DML without parameters is not allowed');
    });

    it('should allow dangerous SQL with parameters', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await adapter.executeSQL(
        'DELETE FROM entities WHERE id = $1',
        ['some-id']
      );

      expect(mockPg.queryMock).toHaveBeenCalled();
    });
  });

  describe('Semantic Storage - Aggregations', () => {
    it('should perform COUNT aggregation', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ result: 42 }],
        rowCount: 1
      });

      const count = await adapter.aggregate('entities', 'count', '*');

      expect(count).toBe(42);
      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        []
      );
    });

    it('should perform SUM aggregation', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ result: 12345 }],
        rowCount: 1
      });

      const sum = await adapter.aggregate('entities', 'sum', 'value');

      expect(sum).toBe(12345);
      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('SUM(value)'),
        []
      );
    });

    it('should perform AVG aggregation', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ result: 3.14 }],
        rowCount: 1
      });

      const avg = await adapter.aggregate('entities', 'avg', 'score');

      expect(avg).toBe(3.14);
    });

    it('should perform MIN/MAX aggregations', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ result: 1 }],
        rowCount: 1
      });

      const min = await adapter.aggregate('entities', 'min', 'value');
      expect(min).toBe(1);

      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ result: 100 }],
        rowCount: 1
      });

      const max = await adapter.aggregate('entities', 'max', 'value');
      expect(max).toBe(100);
    });

    it('should perform aggregation with filters', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ result: 10 }],
        rowCount: 1
      });

      await adapter.aggregate('entities', 'count', '*', [
        { field: 'type', operator: '=', value: 'document' },
        { field: 'status', operator: '=', value: 'active' }
      ]);

      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        ['document', 'active']
      );
    });

    it('should return 0 for NULL aggregation results', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ result: null }],
        rowCount: 1
      });

      const count = await adapter.aggregate('entities', 'count', '*');

      expect(count).toBe(0);
    });
  });

  describe('Semantic Storage - GROUP BY', () => {
    it('should group by single field with aggregation', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [
          { type: 'document', count_all: 10 },
          { type: 'concept', count_all: 5 }
        ],
        rowCount: 2
      });

      const results = await adapter.groupBy(
        'entities',
        ['type'],
        [{ operator: 'count', field: '*', as: 'count_all' }]
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ type: 'document', count_all: 10 });
      expect(results[1]).toEqual({ type: 'concept', count_all: 5 });
    });

    it('should group by multiple fields', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [
          { type: 'document', status: 'active', count: 8 }
        ],
        rowCount: 1
      });

      await adapter.groupBy(
        'entities',
        ['type', 'status'],
        [{ operator: 'count', field: '*', as: 'count' }]
      );

      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY type, status'),
        []
      );
    });

    it('should support multiple aggregations', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [
          { type: 'document', total: 100, avg_score: 75.5, min_score: 50, max_score: 100 }
        ],
        rowCount: 1
      });

      const results = await adapter.groupBy(
        'entities',
        ['type'],
        [
          { operator: 'count', field: '*', as: 'total' },
          { operator: 'avg', field: 'score', as: 'avg_score' },
          { operator: 'min', field: 'score', as: 'min_score' },
          { operator: 'max', field: 'score', as: 'max_score' }
        ]
      );

      expect(results[0]).toHaveProperty('total', 100);
      expect(results[0]).toHaveProperty('avg_score', 75.5);
      expect(results[0]).toHaveProperty('min_score', 50);
      expect(results[0]).toHaveProperty('max_score', 100);
    });

    it('should support GROUP BY with filters', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ type: 'document', count: 5 }],
        rowCount: 1
      });

      await adapter.groupBy(
        'entities',
        ['type'],
        [{ operator: 'count', field: '*', as: 'count' }],
        [{ field: 'status', operator: '=', value: 'active' }]
      );

      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        ['active']
      );
    });

    it('should use default alias when not specified', async () => {
      mockPg.queryMock.mockResolvedValueOnce({
        rows: [{ type: 'document', count_star: 10 }],
        rowCount: 1
      });

      await adapter.groupBy(
        'entities',
        ['type'],
        [{ operator: 'count', field: '*' }]  // No 'as' field
      );

      expect(mockPg.queryMock).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as count_*'),
        []
      );
    });
  });

  // ==========================================================================
  // VECTOR OPERATIONS (pgvector-specific)
  // ==========================================================================

  describe('Vector Operations', () => {
    describe('createVectorIndex()', () => {
      it('should create IVFFLAT vector index with default dimensions', async () => {
        let indexCreated = false;
        const mockConnection = {
          query: async (sql: string) => {
            if (sql.includes('CREATE INDEX')) {
              indexCreated = true;
              expect(sql).toContain('USING ivfflat');
              expect(sql).toContain('vector_cosine_ops'); // Default distance metric
              expect(sql).toContain('WITH (lists = 100)'); // Default ivfLists
            }
            return { rows: [], rowCount: 0 };
          },
          release: () => {}
        };

        mockPg.mockConnection(mockConnection);

        await adapter.createVectorIndex('test_table', 'embedding');

        expect(indexCreated).toBe(true);
      });

      it('should create vector index with custom dimensions', async () => {
        let queriesExecuted: string[] = [];
        const mockConnection = {
          query: async (sql: string) => {
            queriesExecuted.push(sql);
            return { rows: [], rowCount: 0 };
          },
          release: () => {}
        };

        mockPg.mockConnection(mockConnection);

        await adapter.createVectorIndex('test_table', 'embedding', 768);

        // Schema manager will execute CREATE INDEX
        expect(queriesExecuted.some(q => q.includes('CREATE INDEX'))).toBe(true);
      });

      it('should handle HNSW index type when configured', async () => {
        // Create adapter with HNSW configuration
        const hnswConfig = {
          ...config,
          indexType: 'hnsw' as const,
          hnswM: 16,
          hnswEfConstruction: 64
        };
        const hnswMockPg = new MockPostgreSQLClient();
        const hnswAdapter = new PgVectorStorageAdapter(hnswConfig, hnswMockPg);

        let hnswIndexAttempted = false;
        const initConnection = {
          query: async (sql: string) => {
            // Mock initialization queries
            return { rows: [], rowCount: 0 };
          },
          release: () => {}
        };

        const indexConnection = {
          query: async (sql: string) => {
            if (sql.includes('CREATE INDEX') && sql.includes('USING hnsw')) {
              hnswIndexAttempted = true;
              expect(sql).toContain('WITH (m = 16, ef_construction = 64)');
            }
            return { rows: [], rowCount: 0 };
          },
          release: () => {}
        };

        hnswMockPg.mockConnection(initConnection);
        await hnswAdapter.initialize();

        hnswMockPg.mockConnection(indexConnection);
        await hnswAdapter.createVectorIndex('test_table', 'embedding');

        expect(hnswIndexAttempted).toBe(true);
        await hnswAdapter.close();
      });

      it('should handle index creation errors gracefully', async () => {
        const mockConnection = {
          query: async () => {
            throw new Error('Index creation failed');
          },
          release: () => {}
        };

        mockPg.mockConnection(mockConnection);

        await expect(
          adapter.createVectorIndex('test_table', 'embedding')
        ).rejects.toThrow('Failed to create vector index');
      });

      it('should properly release connection after index creation', async () => {
        let connectionReleased = false;

        const mockConnection = {
          query: async () => ({ rows: [], rowCount: 0 }),
          release: () => { connectionReleased = true; }
        };

        mockPg.mockConnection(mockConnection);

        await adapter.createVectorIndex('test_table', 'embedding');

        expect(connectionReleased).toBe(true);
      });

      it('should release connection even on error', async () => {
        let connectionReleased = false;

        const mockConnection = {
          query: async () => { throw new Error('Query failed'); },
          release: () => { connectionReleased = true; }
        };

        mockPg.mockConnection(mockConnection);

        await expect(
          adapter.createVectorIndex('test_table', 'embedding')
        ).rejects.toThrow();

        expect(connectionReleased).toBe(true);
      });
    });

    describe('vectorSearch()', () => {
      const testVector = [0.1, 0.2, 0.3];
      const mockResults = [
        { id: '1', data: 'result1', distance: 0.1 },
        { id: '2', data: 'result2', distance: 0.2 }
      ];

      it('should perform basic vector similarity search with cosine distance', async () => {
        mockPg.mockQueryResult({ rows: mockResults, rowCount: 2 });

        const results = await adapter.vectorSearch('test_table', testVector, {
          limit: 10,
          distanceMetric: 'cosine'
        });

        expect(results).toEqual(mockResults);
        expect(mockPg.wasQueryExecuted('embedding <=> ')).toBe(true);
        expect(mockPg.wasQueryExecuted('ORDER BY distance')).toBe(true);
        expect(mockPg.wasQueryExecuted('LIMIT 10')).toBe(true);
      });

      it('should use euclidean distance metric', async () => {
        mockPg.mockQueryResult({ rows: mockResults, rowCount: 2 });

        await adapter.vectorSearch('test_table', testVector, {
          distanceMetric: 'euclidean'
        });

        expect(mockPg.wasQueryExecuted('embedding <-> ')).toBe(true);
      });

      it('should use inner_product distance metric', async () => {
        mockPg.mockQueryResult({ rows: mockResults, rowCount: 2 });

        await adapter.vectorSearch('test_table', testVector, {
          distanceMetric: 'inner_product'
        });

        expect(mockPg.wasQueryExecuted('embedding <#> ')).toBe(true);
      });

      it('should default to config distance metric when not specified', async () => {
        mockPg.mockQueryResult({ rows: mockResults, rowCount: 2 });

        await adapter.vectorSearch('test_table', testVector);

        // Config default is 'cosine'
        expect(mockPg.wasQueryExecuted('embedding <=> ')).toBe(true);
      });

      it('should default to limit of 10 when not specified', async () => {
        mockPg.mockQueryResult({ rows: mockResults, rowCount: 2 });

        await adapter.vectorSearch('test_table', testVector);

        expect(mockPg.wasQueryExecuted('LIMIT 10')).toBe(true);
      });

      it('should apply custom limit', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        await adapter.vectorSearch('test_table', testVector, { limit: 50 });

        expect(mockPg.wasQueryExecuted('LIMIT 50')).toBe(true);
      });

      it('should apply threshold filter', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('WHERE');
          expect(sql).toContain('embedding <=>');
          expect(sql).toContain('< $1');
          expect(params).toEqual([0.5]);
          return { rows: mockResults, rowCount: 2 };
        });

        await adapter.vectorSearch('test_table', testVector, {
          threshold: 0.5
        });
      });

      it('should combine filters and threshold', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('WHERE');
          expect(sql).toContain('AND');
          expect(params?.length).toBeGreaterThan(1); // Filter params + threshold
          return { rows: mockResults, rowCount: 2 };
        });

        await adapter.vectorSearch('test_table', testVector, {
          filters: [{ field: 'status', operator: '=', value: 'active' }],
          threshold: 0.5
        });
      });

      it('should apply filters without threshold', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('WHERE');
          expect(params).toContain('active');
          return { rows: mockResults, rowCount: 2 };
        });

        await adapter.vectorSearch('test_table', testVector, {
          filters: [{ field: 'status', operator: '=', value: 'active' }]
        });
      });

      it('should properly format vector literal in SQL', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('[0.1,0.2,0.3]');
          return { rows: mockResults, rowCount: 2 };
        });

        await adapter.vectorSearch('test_table', testVector);
      });

      it('should handle empty results', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const results = await adapter.vectorSearch('test_table', testVector);

        expect(results).toEqual([]);
      });

      it('should include distance in results', async () => {
        mockPg.mockQueryResult({ rows: mockResults, rowCount: 2 });

        const results = await adapter.vectorSearch('test_table', testVector);

        expect(results[0]).toHaveProperty('distance');
        expect(results[1]).toHaveProperty('distance');
      });

      it('should handle search errors gracefully', async () => {
        mockPg.mockQueryImplementation(async () => {
          throw new Error('Search failed');
        });

        await expect(
          adapter.vectorSearch('test_table', testVector)
        ).rejects.toThrow('Vector search failed');
      });

      it('should properly qualify table name with schema', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('public.test_table');
          return { rows: mockResults, rowCount: 2 };
        });

        await adapter.vectorSearch('test_table', testVector);
      });
    });

    describe('insertWithEmbedding()', () => {
      const validEmbedding = new Array(1536).fill(0.1); // Match config.vectorDimensions

      it('should insert data with embedding vector', async () => {
        const testData = { id: 'doc-1', title: 'Test Document' };

        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('INSERT INTO');
          expect(sql).toContain('public.test_table');
          expect(sql).toContain('id, title, embedding');
          expect(sql).toContain('VALUES');
          expect(params).toContain('doc-1');
          expect(params).toContain('Test Document');
          return { rows: [], rowCount: 1 };
        });

        await adapter.insertWithEmbedding('test_table', testData, validEmbedding);

        expect(mockPg.wasQueryExecuted('INSERT INTO')).toBe(true);
      });

      it('should format vector literal correctly in SQL', async () => {
        const testData = { id: 'doc-1' };
        const embedding = [0.1, 0.2, 0.3, ...new Array(1533).fill(0)]; // 1536 total

        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('[0.1,0.2,0.3');
          return { rows: [], rowCount: 1 };
        });

        await adapter.insertWithEmbedding('test_table', testData, embedding);
      });

      it('should validate embedding dimensions match config', async () => {
        const testData = { id: 'doc-1' };
        const wrongSizeEmbedding = [0.1, 0.2, 0.3]; // Only 3 dimensions, not 1536

        await expect(
          adapter.insertWithEmbedding('test_table', testData, wrongSizeEmbedding)
        ).rejects.toThrow('Embedding dimension mismatch');
      });

      it('should include dimension info in error message', async () => {
        const testData = { id: 'doc-1' };
        const wrongSizeEmbedding = [0.1, 0.2, 0.3];

        try {
          await adapter.insertWithEmbedding('test_table', testData, wrongSizeEmbedding);
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('expected 1536');
          expect(error.message).toContain('got 3');
        }
      });

      it('should handle insert errors gracefully', async () => {
        const testData = { id: 'doc-1' };

        mockPg.mockQueryImplementation(async () => {
          throw new Error('Insert failed');
        });

        await expect(
          adapter.insertWithEmbedding('test_table', testData, validEmbedding)
        ).rejects.toThrow('Failed to insert with embedding');
      });

      it('should handle multiple data fields', async () => {
        const testData = {
          id: 'doc-1',
          title: 'Test',
          content: 'Content',
          metadata: { tags: ['test'] }
        };

        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('id, title, content, metadata, embedding');
          expect(params).toHaveLength(4); // All fields except embedding
          return { rows: [], rowCount: 1 };
        });

        await adapter.insertWithEmbedding('test_table', testData, validEmbedding);
      });

      it('should properly parameterize data values for SQL injection protection', async () => {
        const testData = {
          id: 'doc-1',
          title: "Test'; DROP TABLE users; --"
        };

        mockPg.mockQueryImplementation(async (sql, params) => {
          // SQL should use placeholders, not direct string interpolation for data
          expect(sql).toContain('$1');
          expect(sql).toContain('$2');
          expect(params).toContain("Test'; DROP TABLE users; --");
          return { rows: [], rowCount: 1 };
        });

        await adapter.insertWithEmbedding('test_table', testData, validEmbedding);
      });

      it('should handle empty data object', async () => {
        const testData = {};

        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('embedding');
          expect(sql).toContain('VALUES');
          return { rows: [], rowCount: 1 };
        });

        await adapter.insertWithEmbedding('test_table', testData, validEmbedding);
      });

      it('should handle zero vector embedding', async () => {
        const testData = { id: 'doc-1' };
        const zeroEmbedding = new Array(1536).fill(0);

        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('[0,0,0');
          return { rows: [], rowCount: 1 };
        });

        await adapter.insertWithEmbedding('test_table', testData, zeroEmbedding);
      });

      it('should handle negative values in embedding', async () => {
        const testData = { id: 'doc-1' };
        const embedding = [-0.5, 0.3, ...new Array(1534).fill(0)];

        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('[-0.5,0.3');
          return { rows: [], rowCount: 1 };
        });

        await adapter.insertWithEmbedding('test_table', testData, embedding);
      });
    });
  });

  // ==========================================================================
  // REMAINING PRIMARY STORAGE METHODS
  // ==========================================================================

  describe('Remaining PrimaryStorage Methods', () => {
    describe('findByPattern()', () => {
      it('should find entities by exact type match', async () => {
        const mockResults = [
          { id: 'file:1', type: 'File', properties: { path: '/src/index.ts' } },
          { id: 'file:2', type: 'File', properties: { path: '/src/app.ts' } }
        ];

        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('SELECT id, type, properties FROM');
          expect(sql).toContain('public.nodes');
          expect(sql).toContain('WHERE');
          expect(sql).toContain('type = $1');
          expect(params).toEqual(['File']);
          return { rows: mockResults, rowCount: 2 };
        });

        const results = await adapter.findByPattern({ type: 'File' });

        expect(results).toEqual(mockResults);
        expect(mockPg.wasQueryExecuted('SELECT')).toBe(true);
      });

      it('should find entities by property match', async () => {
        const mockResults = [
          { id: 'file:1', type: 'File', properties: { language: 'TypeScript' } }
        ];

        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('properties @> $');
          // params[0] = 'File' (type), params[1] = properties filter
          expect(params).toContain('File');
          expect(params?.[1]).toEqual(JSON.stringify({ language: 'TypeScript' }));
          return { rows: mockResults, rowCount: 1 };
        });

        const results = await adapter.findByPattern({
          type: 'File',
          'properties.language': 'TypeScript'
        });

        expect(results).toEqual(mockResults);
      });

      it('should handle multiple property filters', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('type = $');
          expect(sql).toContain('properties @> $');
          return { rows: [], rowCount: 0 };
        });

        await adapter.findByPattern({
          type: 'File',
          'properties.language': 'TypeScript',
          'properties.path': '*.test.ts'
        });

        expect(mockPg.wasQueryExecuted('SELECT')).toBe(true);
      });

      it('should return empty array when no matches found', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const results = await adapter.findByPattern({ type: 'NonExistent' });

        expect(results).toEqual([]);
      });

      it('should handle errors gracefully', async () => {
        mockPg.mockQueryImplementation(async () => {
          throw new Error('Query failed');
        });

        await expect(
          adapter.findByPattern({ type: 'File' })
        ).rejects.toThrow('Pattern matching failed');
      });

      it('should properly qualify table name with schema', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('public.nodes');
          return { rows: [], rowCount: 0 };
        });

        await adapter.findByPattern({ type: 'File' });
      });
    });

    describe('patternMatch()', () => {
      it('should execute graph pattern query', async () => {
        const mockResults = {
          nodes: [
            { id: 'person:1', type: 'Person', properties: { name: 'Alice' } }
          ],
          edges: [],
          paths: []
        };

        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('SELECT');
          expect(sql).toContain('FROM');
          return {
            rows: mockResults.nodes,
            rowCount: 1
          };
        });

        const result = await adapter.patternMatch({
          nodeType: 'Person',
          properties: { name: 'Alice' }
        });

        expect(result).toHaveProperty('nodes');
        expect(result).toHaveProperty('edges');
        expect(result).toHaveProperty('metadata');
        expect(result.metadata).toHaveProperty('executionTime');
        expect(result.metadata).toHaveProperty('nodesTraversed');
        expect(result.metadata).toHaveProperty('edgesTraversed');
      });

      it('should handle edge pattern matching', async () => {
        const mockResults = [
          { from: 'person:1', to: 'person:2', type: 'knows', properties: {} }
        ];

        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('public.edges');
          return { rows: mockResults, rowCount: 1 };
        });

        const result = await adapter.patternMatch({
          edgeType: 'knows',
          fromNode: 'person:1'
        });

        expect(result).toHaveProperty('edges');
      });

      it('should handle complex graph patterns', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('JOIN');
          return { rows: [], rowCount: 0 };
        });

        await adapter.patternMatch({
          nodeType: 'Person',
          edgeType: 'knows',
          targetNodeType: 'Person'
        });

        expect(mockPg.wasQueryExecuted('SELECT')).toBe(true);
      });

      it('should handle errors gracefully', async () => {
        mockPg.mockQueryImplementation(async () => {
          throw new Error('Pattern match failed');
        });

        await expect(
          adapter.patternMatch({ nodeType: 'Person' })
        ).rejects.toThrow('Graph pattern matching failed');
      });
    });

    describe('createIndex()', () => {
      it('should create BTREE index on entity property', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('CREATE INDEX');
          expect(sql).toContain('public.nodes');
          expect(sql).toContain('BTREE');
          expect(sql).toContain('properties');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createIndex('File', 'properties.path');

        expect(mockPg.wasQueryExecuted('CREATE INDEX')).toBe(true);
      });

      it('should create GIN index for JSONB properties', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('CREATE INDEX');
          expect(sql).toContain('GIN');
          expect(sql).toContain('properties');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createIndex('File', 'properties');

        expect(mockPg.wasQueryExecuted('CREATE INDEX')).toBe(true);
      });

      it('should create unique index when specified', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('CREATE UNIQUE INDEX');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createIndex('File', 'id');

        expect(mockPg.wasQueryExecuted('CREATE')).toBe(true);
      });

      it('should handle IF NOT EXISTS to avoid duplicate indexes', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('IF NOT EXISTS');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createIndex('File', 'properties.path');
      });

      it('should handle errors gracefully', async () => {
        mockPg.mockQueryImplementation(async () => {
          throw new Error('Index creation failed');
        });

        await expect(
          adapter.createIndex('File', 'properties.path')
        ).rejects.toThrow('Index creation failed');
      });

      it('should properly qualify table name with schema', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('public.nodes');
          return { rows: [], rowCount: 0 };
        });

        await adapter.createIndex('File', 'properties.path');
      });
    });

    describe('listIndexes()', () => {
      it('should list all indexes for entity type', async () => {
        const mockIndexes = [
          { indexname: 'idx_file_path', indexdef: 'CREATE INDEX idx_file_path ON nodes ((properties->\'path\'))' },
          { indexname: 'idx_file_language', indexdef: 'CREATE INDEX idx_file_language ON nodes ((properties->\'language\'))' }
        ];

        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('pg_indexes');
          expect(sql).toContain('schemaname = $1');
          expect(sql).toContain('tablename = $2');
          expect(params).toEqual(['public', 'nodes']);
          return { rows: mockIndexes, rowCount: 2 };
        });

        const indexes = await adapter.listIndexes('File');

        expect(indexes).toHaveLength(2);
        expect(indexes).toContain('idx_file_path');
        expect(indexes).toContain('idx_file_language');
      });

      it('should return empty array when no indexes exist', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const indexes = await adapter.listIndexes('File');

        expect(indexes).toEqual([]);
      });

      it('should filter by entity type pattern if supported', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('pg_indexes');
          return { rows: [], rowCount: 0 };
        });

        await adapter.listIndexes('File');

        expect(mockPg.wasQueryExecuted('SELECT')).toBe(true);
      });

      it('should handle errors gracefully', async () => {
        mockPg.mockQueryImplementation(async () => {
          throw new Error('Index listing failed');
        });

        await expect(
          adapter.listIndexes('File')
        ).rejects.toThrow('Index listing failed');
      });

      it('should properly qualify schema name', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(params).toContain('public');
          return { rows: [], rowCount: 0 };
        });

        await adapter.listIndexes('File');
      });
    });

    describe('updateEdge()', () => {
      it('should update edge properties', async () => {
        mockPg.mockQueryImplementation(async (sql, params) => {
          expect(sql).toContain('UPDATE');
          expect(sql).toContain('public.edges');
          expect(sql).toContain('SET properties =');
          expect(sql).toContain('WHERE from_node = $');
          expect(sql).toContain('AND to_node = $');
          expect(sql).toContain('AND type = $');
          expect(params).toContain('person:1');
          expect(params).toContain('person:2');
          expect(params).toContain('knows');
          return { rows: [], rowCount: 1 };
        });

        const updated = await adapter.updateEdge('person:1', 'person:2', 'knows', {
          strength: 'strong',
          since: '2020'
        });

        expect(updated).toBe(true);
        expect(mockPg.wasQueryExecuted('UPDATE')).toBe(true);
      });

      it('should merge new properties with existing properties', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('properties ||');
          return { rows: [], rowCount: 1 };
        });

        await adapter.updateEdge('person:1', 'person:2', 'knows', {
          newProp: 'value'
        });
      });

      it('should return false when edge not found', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 0 });

        const updated = await adapter.updateEdge('person:1', 'person:999', 'knows', {
          strength: 'weak'
        });

        expect(updated).toBe(false);
      });

      it('should handle empty property updates', async () => {
        mockPg.mockQueryResult({ rows: [], rowCount: 1 });

        const updated = await adapter.updateEdge('person:1', 'person:2', 'knows', {});

        expect(updated).toBe(true);
      });

      it('should handle errors gracefully', async () => {
        mockPg.mockQueryImplementation(async () => {
          throw new Error('Update failed');
        });

        await expect(
          adapter.updateEdge('person:1', 'person:2', 'knows', { prop: 'value' })
        ).rejects.toThrow('Edge update failed');
      });

      it('should properly qualify table name with schema', async () => {
        mockPg.mockQueryImplementation(async (sql) => {
          expect(sql).toContain('public.edges');
          return { rows: [], rowCount: 1 };
        });

        await adapter.updateEdge('person:1', 'person:2', 'knows', {});
      });
    });

    describe('batchGraphOperations()', () => {
      it('should execute batch of addNode operations', async () => {
        const operations = [
          { type: 'addNode' as const, node: { id: 'person:1', type: 'Person', properties: { name: 'Alice' } } },
          { type: 'addNode' as const, node: { id: 'person:2', type: 'Person', properties: { name: 'Bob' } } }
        ];

        let queryCount = 0;
        mockPg.mockQueryImplementation(async (sql) => {
          queryCount++;
          if (sql.includes('INSERT INTO') && sql.includes('nodes')) {
            return { rows: [], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.batchGraphOperations(operations);

        expect(result.success).toBe(true);
        expect(result.operations).toBe(2);
        expect(result.nodesAffected).toBe(2);
        expect(result.edgesAffected).toBe(0);
        expect(result).toHaveProperty('executionTime');
        expect(queryCount).toBeGreaterThan(0);
      });

      it('should execute batch of addEdge operations', async () => {
        const operations = [
          { type: 'addEdge' as const, edge: { from: 'person:1', to: 'person:2', type: 'knows', properties: {} } },
          { type: 'addEdge' as const, edge: { from: 'person:2', to: 'person:3', type: 'knows', properties: {} } }
        ];

        mockPg.mockQueryImplementation(async (sql) => {
          if (sql.includes('INSERT INTO') && sql.includes('edges')) {
            return { rows: [], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.batchGraphOperations(operations);

        expect(result.success).toBe(true);
        expect(result.operations).toBe(2);
        expect(result.nodesAffected).toBe(0);
        expect(result.edgesAffected).toBe(2);
      });

      it('should execute mixed batch operations', async () => {
        const operations = [
          { type: 'addNode' as const, node: { id: 'person:1', type: 'Person', properties: {} } },
          { type: 'addEdge' as const, edge: { from: 'person:1', to: 'person:2', type: 'knows', properties: {} } },
          { type: 'updateNode' as const, id: 'person:1', node: { id: 'person:1', type: 'Person', properties: { updated: true } } }
        ];

        mockPg.mockQueryImplementation(async (sql) => {
          return { rows: [], rowCount: 1 };
        });

        const result = await adapter.batchGraphOperations(operations);

        expect(result.success).toBe(true);
        expect(result.operations).toBe(3);
      });

      it('should handle empty operations array', async () => {
        const result = await adapter.batchGraphOperations([]);

        expect(result.success).toBe(true);
        expect(result.operations).toBe(0);
        expect(result.nodesAffected).toBe(0);
        expect(result.edgesAffected).toBe(0);
      });

      it('should collect errors but continue processing', async () => {
        const operations = [
          { type: 'addNode' as const, node: { id: 'person:1', type: 'Person', properties: {} } },
          { type: 'addNode' as const, node: { id: 'person:2', type: 'Person', properties: {} } },
          { type: 'addNode' as const, node: { id: 'person:3', type: 'Person', properties: {} } }
        ];

        let callCount = 0;
        mockPg.mockQueryImplementation(async (sql) => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Operation 2 failed');
          }
          return { rows: [], rowCount: 1 };
        });

        const result = await adapter.batchGraphOperations(operations);

        expect(result.success).toBe(false);
        expect(result.operations).toBe(3);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });

      it('should execute operations in transaction if supported', async () => {
        const operations = [
          { type: 'addNode' as const, node: { id: 'person:1', type: 'Person', properties: {} } }
        ];

        mockPg.mockQueryImplementation(async (sql) => {
          // Check for transaction commands
          if (sql.includes('BEGIN') || sql.includes('COMMIT')) {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [], rowCount: 1 };
        });

        await adapter.batchGraphOperations(operations);
      });

      it('should include execution time in result', async () => {
        const operations = [
          { type: 'addNode' as const, node: { id: 'person:1', type: 'Person', properties: {} } }
        ];

        mockPg.mockQueryResult({ rows: [], rowCount: 1 });

        const result = await adapter.batchGraphOperations(operations);

        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
