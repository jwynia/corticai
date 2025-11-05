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
        queryLog.forEach(log => {
          expect(log.time).toBeLessThan(10); // < 10ms overhead
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
});
