/**
 * KuzuStorageAdapter Query Syntax Tests
 *
 * Test-driven development approach to fix Kuzu Cypher query syntax issues.
 * These tests define the expected behavior BEFORE implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuzuStorageAdapter } from './KuzuStorageAdapter'
import { KuzuSecureQueryBuilder } from './KuzuSecureQueryBuilder'
import {
  GraphEntity,
  GraphEdge,
  TraversalPattern,
  KuzuStorageConfig
} from '../types/GraphTypes'
import * as fs from 'fs'
import * as path from 'path'

describe('KuzuStorageAdapter Query Syntax Fixes', () => {
  let adapter: KuzuStorageAdapter
  let testDbPath: string
  let config: KuzuStorageConfig

  beforeEach(() => {
    testDbPath = path.join('/tmp', `kuzu-syntax-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    config = {
      type: 'kuzu',
      database: testDbPath,
      id: 'syntax-test-adapter',
      debug: false, // Turn off debug to avoid query logging interference
      autoCreate: true
    }
    adapter = new KuzuStorageAdapter(config)
  })

  afterEach(async () => {
    try {
      if (adapter) {
        await adapter.clear()
        if (typeof (adapter as any).close === 'function') {
          await (adapter as any).close()
        }
      }
    } catch (error) {
      console.debug('Cleanup error (non-critical):', error);
    }

    try {
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true })
      }
    } catch (error) {
      console.debug('Cleanup error (non-critical):', error);
    }
  })

  describe('Parameterized Query Builder Integration', () => {
    it('should use KuzuSecureQueryBuilder for all graph operations', async () => {
      // Test that the adapter has properly integrated the secure query builder
      expect(typeof (adapter as any).buildSecureQuery).toBe('function')
      expect(typeof (adapter as any).executeSecureQuery).toBe('function')
    })

    it('should generate valid parameterized traversal queries', async () => {
      // Ensure adapter is loaded so secureQueryBuilder is initialized
      await adapter.size()

      // Test the secure query builder generates correct traversal syntax
      const queryBuilder = (adapter as any).secureQueryBuilder as KuzuSecureQueryBuilder

      const traversalQuery = queryBuilder.buildTraversalQuery(
        'node1',
        '-[r:Relationship*1..3]->',
        3,
        ['CONNECTS', 'CALLS']
      )

      expect(traversalQuery.statement).toContain('MATCH path = (start:Entity {id: $startNodeId})')
      expect(traversalQuery.statement).toContain('*1..$maxDepth')
      expect(traversalQuery.statement).toContain('WHERE r.type IN $edgeTypes')
      expect(traversalQuery.parameters.startNodeId).toBe('node1')
      expect(traversalQuery.parameters.maxDepth).toBe(3)
      expect(traversalQuery.parameters.edgeTypes).toEqual(['CONNECTS', 'CALLS'])
    })

    it('should generate valid parameterized findConnected queries', async () => {
      // Ensure adapter is loaded so secureQueryBuilder is initialized
      await adapter.size()

      // Test the secure query builder generates correct findConnected syntax
      const queryBuilder = (adapter as any).secureQueryBuilder as KuzuSecureQueryBuilder

      const connectedQuery = queryBuilder.buildFindConnectedQuery('node1', 2)

      expect(connectedQuery.statement).toContain('MATCH (start:Entity {id: $nodeId})')
      expect(connectedQuery.statement).toContain('-[*1..$depth]-')
      expect(connectedQuery.statement).toContain('WHERE connected.id <> $nodeId')
      expect(connectedQuery.parameters.nodeId).toBe('node1')
      expect(connectedQuery.parameters.depth).toBe(2)
    })

    it('should generate valid parameterized shortestPath queries', async () => {
      // Ensure adapter is loaded so secureQueryBuilder is initialized
      await adapter.size()

      // Test the secure query builder generates correct shortestPath syntax
      const queryBuilder = (adapter as any).secureQueryBuilder as KuzuSecureQueryBuilder

      const pathQuery = queryBuilder.buildShortestPathQuery('from1', 'to1', 5)

      expect(pathQuery.statement).toContain('MATCH path = (from:Entity {id: $fromId})')
      expect(pathQuery.statement).toContain('-[r* SHORTEST 1..$maxDepth]-')
      expect(pathQuery.statement).toContain('(to:Entity {id: $toId})')
      expect(pathQuery.parameters.fromId).toBe('from1')
      expect(pathQuery.parameters.toId).toBe('to1')
      expect(pathQuery.parameters.maxDepth).toBe(5)
    })
  })

  describe('Graph Traversal Query Syntax', () => {
    it('should execute traversal without syntax errors', async () => {
      // Setup: Create a simple graph
      const nodeA: GraphEntity = { id: 'A', type: 'Node', properties: { name: 'Node A' } }
      const nodeB: GraphEntity = { id: 'B', type: 'Node', properties: { name: 'Node B' } }
      const nodeC: GraphEntity = { id: 'C', type: 'Node', properties: { name: 'Node C' } }

      await adapter.set('key-A', nodeA)
      await adapter.set('key-B', nodeB)
      await adapter.set('key-C', nodeC)

      // Add edges: A -> B -> C
      await adapter.addEdge({
        from: 'A',
        to: 'B',
        type: 'CONNECTS',
        properties: {}
      })

      await adapter.addEdge({
        from: 'B',
        to: 'C',
        type: 'CONNECTS',
        properties: {}
      })

      // Test: Traversal should work without syntax errors
      const pattern: TraversalPattern = {
        startNode: 'A',
        direction: 'outgoing',
        maxDepth: 2,
        edgeTypes: ['CONNECTS']
      }

      // This should NOT throw a syntax error
      await expect(adapter.traverse(pattern)).resolves.not.toThrow()

      // The result should be an array (even if empty due to implementation)
      const paths = await adapter.traverse(pattern)
      expect(Array.isArray(paths)).toBe(true)
    })

    it('should execute findConnected without syntax errors', async () => {
      // Setup: Create connected nodes
      const nodeA: GraphEntity = { id: 'central', type: 'Node', properties: { name: 'Central' } }
      const nodeB: GraphEntity = { id: 'connected1', type: 'Node', properties: { name: 'Connected 1' } }

      await adapter.set('central-key', nodeA)
      await adapter.set('connected1-key', nodeB)

      await adapter.addEdge({
        from: 'central',
        to: 'connected1',
        type: 'LINKS',
        properties: {}
      })

      // Test: findConnected should work without syntax errors
      await expect(adapter.findConnected('central', 1)).resolves.not.toThrow()

      const connected = await adapter.findConnected('central', 1)
      expect(Array.isArray(connected)).toBe(true)
    })

    it('should execute shortestPath without syntax errors', async () => {
      // Setup: Create path nodes
      const nodeStart: GraphEntity = { id: 'start', type: 'Node', properties: { name: 'Start' } }
      const nodeEnd: GraphEntity = { id: 'end', type: 'Node', properties: { name: 'End' } }

      await adapter.set('start-key', nodeStart)
      await adapter.set('end-key', nodeEnd)

      await adapter.addEdge({
        from: 'start',
        to: 'end',
        type: 'PATH',
        properties: {}
      })

      // Test: shortestPath should work without syntax errors
      await expect(adapter.shortestPath('start', 'end')).resolves.not.toThrow()

      const path = await adapter.shortestPath('start', 'end')
      // Should return null or a valid path object, not throw
      expect(path === null || typeof path === 'object').toBe(true)
    })
  })

  describe('Variable-Length Path Syntax', () => {
    it('should handle variable-length paths with correct Kuzu syntax', async () => {
      // Ensure adapter is loaded so secureQueryBuilder is initialized
      await adapter.size()

      // Test various variable-length path patterns
      const queryBuilder = (adapter as any).secureQueryBuilder as KuzuSecureQueryBuilder

      // Test 1-hop path
      const oneHop = queryBuilder.buildTraversalQuery('node1', '-[r*1..1]->', 1)
      expect(oneHop.statement).toContain('*1..$maxDepth')

      // Test multi-hop path
      const multiHop = queryBuilder.buildTraversalQuery('node1', '-[r*1..5]->', 5)
      expect(multiHop.statement).toContain('*1..$maxDepth')

      // Test bidirectional path
      const bidirectional = queryBuilder.buildFindConnectedQuery('node1', 3)
      expect(bidirectional.statement).toContain('*1..$depth')
    })

    it('should handle edge type filtering in variable-length paths', async () => {
      // Ensure adapter is loaded so secureQueryBuilder is initialized
      await adapter.size()

      const queryBuilder = (adapter as any).secureQueryBuilder as KuzuSecureQueryBuilder

      const filteredQuery = queryBuilder.buildTraversalQuery(
        'node1',
        '-[r*1..2]->',
        2,
        ['TYPE1', 'TYPE2']
      )

      expect(filteredQuery.statement).toContain('WHERE r.type IN $edgeTypes')
      expect(filteredQuery.parameters.edgeTypes).toEqual(['TYPE1', 'TYPE2'])
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle query failures gracefully without crashing worker', async () => {
      // Test that malformed queries don't crash the worker process

      // This should fail gracefully, not crash
      const invalidPattern: TraversalPattern = {
        startNode: 'non-existent-node',
        direction: 'outgoing',
        maxDepth: 1
      }

      // Should return empty array, not crash
      const result = await adapter.traverse(invalidPattern)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should validate depth parameters before query execution', async () => {
      // Test input validation
      await expect(adapter.findConnected('node1', -1)).rejects.toThrow()
      await expect(adapter.findConnected('node1', 0)).rejects.toThrow()
      await expect(adapter.findConnected('node1', 1000)).rejects.toThrow()
    })

    it('should handle empty results without errors', async () => {
      // Test queries that return no results
      const pattern: TraversalPattern = {
        startNode: 'isolated-node',
        direction: 'both',
        maxDepth: 1
      }

      const paths = await adapter.traverse(pattern)
      expect(paths).toEqual([])

      const connected = await adapter.findConnected('isolated-node', 1)
      expect(connected).toEqual([])

      const path = await adapter.shortestPath('isolated-node', 'another-isolated-node')
      expect(path).toBeNull()
    })
  })

  describe('Performance and Limits', () => {
    it('should respect query limits to prevent runaway queries', async () => {
      // Ensure adapter is loaded so secureQueryBuilder is initialized
      await adapter.size()

      const queryBuilder = (adapter as any).secureQueryBuilder as KuzuSecureQueryBuilder

      const traversalQuery = queryBuilder.buildTraversalQuery('node1', '-[r*1..3]->', 3)

      // Should have LIMIT clause
      expect(traversalQuery.statement).toContain('LIMIT')

      const connectedQuery = queryBuilder.buildFindConnectedQuery('node1', 2)
      expect(connectedQuery.statement).toContain('LIMIT')

      const pathQuery = queryBuilder.buildShortestPathQuery('from', 'to', 5)
      expect(pathQuery.statement).toContain('LIMIT')
    })

    it('should handle reasonable depth limits', async () => {
      // Ensure we don't allow excessive depth that could cause performance issues
      const pattern: TraversalPattern = {
        startNode: 'node1',
        direction: 'outgoing',
        maxDepth: 10 // Should be within reasonable limits
      }

      // Should not throw for reasonable depth
      await expect(adapter.traverse(pattern)).resolves.not.toThrow()
    })
  })
})