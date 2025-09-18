/**
 * KuzuStorageAdapter Test Suite
 *
 * Comprehensive test-driven development tests for the Kuzu graph database adapter.
 * These tests are written BEFORE implementation to define the expected behavior.
 *
 * Test Categories:
 * 1. Initialization tests
 * 2. Basic CRUD tests
 * 3. Graph-specific tests
 * 4. Error handling tests
 * 5. Edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KuzuStorageAdapter } from './KuzuStorageAdapter'
import {
  GraphEntity,
  GraphNode,
  GraphEdge,
  TraversalPattern,
  KuzuStorageConfig
} from '../types/GraphTypes'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import * as fs from 'fs'
import * as path from 'path'

describe('KuzuStorageAdapter', () => {
  let adapter: KuzuStorageAdapter
  let testDbPath: string
  let config: KuzuStorageConfig

  beforeEach(() => {
    // Create unique database path for each test
    testDbPath = path.join('/tmp', `kuzu-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    config = {
      type: 'kuzu',
      database: testDbPath,
      id: 'test-adapter',
      debug: true,
      autoCreate: true
    }
  })

  afterEach(async () => {
    // Cleanup: close adapter and remove test database
    try {
      if (adapter) {
        await adapter.clear()
        // Close any open connections
        if (typeof (adapter as any).close === 'function') {
          await (adapter as any).close()
        }
      }
    } catch (error) {
      // Log but don't fail test on cleanup errors
      console.debug('Cleanup error (non-critical):', error);
    }

    // Remove test database files
    try {
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true })
      }
    } catch (error) {
      // Log but don't fail test on cleanup errors
      console.debug('Cleanup error (non-critical):', error);
    }
  })

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('initialization', () => {
    it('should create database at specified path', async () => {
      adapter = new KuzuStorageAdapter(config)

      // Should not exist yet
      expect(fs.existsSync(testDbPath)).toBe(false)

      // Initialize should create the database
      await adapter.size() // This should trigger ensureLoaded()

      // Database should now exist
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('should create schema on first initialization', async () => {
      adapter = new KuzuStorageAdapter(config)

      // Initialize and verify basic operations work
      await adapter.set('test-key', createTestEntity('test-id'))

      const retrieved = await adapter.get('test-key')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('test-id')
    })

    it('should handle existing database gracefully', async () => {
      // Create first adapter and add data
      const adapter1 = new KuzuStorageAdapter(config)
      await adapter1.set('existing-key', createTestEntity('existing-id'))

      // Create second adapter with same database
      const adapter2 = new KuzuStorageAdapter(config)
      const retrieved = await adapter2.get('existing-key')

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('existing-id')
    })

    it('should throw error for invalid path', async () => {
      const invalidConfig = {
        ...config,
        database: '/invalid/path/that/cannot/be/created'
      }

      adapter = new KuzuStorageAdapter(invalidConfig)

      // Should throw when trying to initialize
      await expect(adapter.size()).rejects.toThrow(StorageError)
    })

    it('should handle configuration validation', () => {
      expect(() => new KuzuStorageAdapter({} as any)).toThrow(StorageError)
      expect(() => new KuzuStorageAdapter({ type: 'kuzu', database: '' })).toThrow(StorageError)
    })
  })

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  describe('basic operations', () => {
    beforeEach(async () => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should store and retrieve entities', async () => {
      const entity = createTestEntity('test-entity-1')

      await adapter.set('key1', entity)
      const retrieved = await adapter.get('key1')

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('test-entity-1')
      expect(retrieved?.type).toBe('TestEntity')
      expect(retrieved?.properties.name).toBe('Test Entity')
    })

    it('should return undefined for non-existent keys', async () => {
      const retrieved = await adapter.get('non-existent-key')
      expect(retrieved).toBeUndefined()
    })

    it('should check existence correctly', async () => {
      const entity = createTestEntity('exists-test')

      expect(await adapter.has('test-key')).toBe(false)

      await adapter.set('test-key', entity)
      expect(await adapter.has('test-key')).toBe(true)
    })

    it('should delete entities', async () => {
      const entity = createTestEntity('delete-test')

      await adapter.set('delete-key', entity)
      expect(await adapter.has('delete-key')).toBe(true)

      const deleted = await adapter.delete('delete-key')
      expect(deleted).toBe(true)
      expect(await adapter.has('delete-key')).toBe(false)

      // Deleting non-existent key should return false
      const deletedAgain = await adapter.delete('delete-key')
      expect(deletedAgain).toBe(false)
    })

    it('should clear all data', async () => {
      const entity1 = createTestEntity('clear-test-1')
      const entity2 = createTestEntity('clear-test-2')

      await adapter.set('key1', entity1)
      await adapter.set('key2', entity2)

      expect(await adapter.size()).toBe(2)

      await adapter.clear()
      expect(await adapter.size()).toBe(0)
      expect(await adapter.has('key1')).toBe(false)
      expect(await adapter.has('key2')).toBe(false)
    })

    it('should list all keys', async () => {
      const entity1 = createTestEntity('list-test-1')
      const entity2 = createTestEntity('list-test-2')

      await adapter.set('list-key-1', entity1)
      await adapter.set('list-key-2', entity2)

      const keys = []
      for await (const key of adapter.keys()) {
        keys.push(key)
      }

      expect(keys).toHaveLength(2)
      expect(keys).toContain('list-key-1')
      expect(keys).toContain('list-key-2')
    })

    it('should return correct size', async () => {
      expect(await adapter.size()).toBe(0)

      await adapter.set('size-key-1', createTestEntity('size-1'))
      expect(await adapter.size()).toBe(1)

      await adapter.set('size-key-2', createTestEntity('size-2'))
      expect(await adapter.size()).toBe(2)

      await adapter.delete('size-key-1')
      expect(await adapter.size()).toBe(1)
    })
  })

  // ============================================================================
  // GRAPH-SPECIFIC OPERATIONS
  // ============================================================================

  describe('graph operations', () => {
    beforeEach(async () => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should add nodes with properties', async () => {
      const node: GraphNode = {
        id: 'node-1',
        type: 'Function',
        properties: {
          name: 'testFunction',
          lineNumber: 42,
          isPublic: true
        }
      }

      const nodeId = await adapter.addNode(node)
      expect(nodeId).toBe('node-1')

      // Verify node was added
      const retrieved = await adapter.getNode('node-1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.type).toBe('Function')
      expect(retrieved?.properties.name).toBe('testFunction')
    })

    it('should add edges between nodes', async () => {
      // Create two nodes first
      const node1: GraphNode = { id: 'func-1', type: 'Function', properties: { name: 'caller' } }
      const node2: GraphNode = { id: 'func-2', type: 'Function', properties: { name: 'callee' } }

      await adapter.addNode(node1)
      await adapter.addNode(node2)

      // Add edge between them
      const edge: GraphEdge = {
        from: 'func-1',
        to: 'func-2',
        type: 'calls',
        properties: { weight: 1 }
      }

      await adapter.addEdge(edge)

      // Verify edge was added
      const edges = await adapter.getEdges('func-1')
      expect(edges).toHaveLength(1)
      expect(edges[0].from).toBe('func-1')
      expect(edges[0].to).toBe('func-2')
      expect(edges[0].type).toBe('calls')
    })

    it('should traverse graph from starting node', async () => {
      // Create a simple graph: A -> B -> C
      await adapter.addNode({ id: 'A', type: 'Node', properties: {} })
      await adapter.addNode({ id: 'B', type: 'Node', properties: {} })
      await adapter.addNode({ id: 'C', type: 'Node', properties: {} })

      await adapter.addEdge({ from: 'A', to: 'B', type: 'connects', properties: {} })
      await adapter.addEdge({ from: 'B', to: 'C', type: 'connects', properties: {} })

      const pattern: TraversalPattern = {
        startNode: 'A',
        direction: 'outgoing',
        maxDepth: 2,
        edgeTypes: ['connects']
      }

      const paths = await adapter.traverse(pattern)

      expect(paths).toHaveLength(2) // A->B and A->B->C
      expect(paths[0].nodes).toHaveLength(2) // A->B
      expect(paths[1].nodes).toHaveLength(3) // A->B->C
    })

    it('should find connected nodes within depth', async () => {
      // Create a star pattern: A connects to B, C, D
      await adapter.addNode({ id: 'A', type: 'Center', properties: {} })
      await adapter.addNode({ id: 'B', type: 'Leaf', properties: {} })
      await adapter.addNode({ id: 'C', type: 'Leaf', properties: {} })
      await adapter.addNode({ id: 'D', type: 'Leaf', properties: {} })

      await adapter.addEdge({ from: 'A', to: 'B', type: 'connects', properties: {} })
      await adapter.addEdge({ from: 'A', to: 'C', type: 'connects', properties: {} })
      await adapter.addEdge({ from: 'A', to: 'D', type: 'connects', properties: {} })

      const connected = await adapter.findConnected('A', 1)

      expect(connected).toHaveLength(3)
      expect(connected.map(n => n.id)).toContain('B')
      expect(connected.map(n => n.id)).toContain('C')
      expect(connected.map(n => n.id)).toContain('D')
    })

    it('should handle disconnected nodes', async () => {
      await adapter.addNode({ id: 'isolated', type: 'Node', properties: {} })

      const connected = await adapter.findConnected('isolated', 2)
      expect(connected).toHaveLength(0)

      const pattern: TraversalPattern = {
        startNode: 'isolated',
        direction: 'both',
        maxDepth: 1
      }

      const paths = await adapter.traverse(pattern)
      expect(paths).toHaveLength(0)
    })

    it('should find shortest path between nodes', async () => {
      // Create path: A -> B -> C and A -> D -> C (shorter path)
      await adapter.addNode({ id: 'A', type: 'Node', properties: {} })
      await adapter.addNode({ id: 'B', type: 'Node', properties: {} })
      await adapter.addNode({ id: 'C', type: 'Node', properties: {} })
      await adapter.addNode({ id: 'D', type: 'Node', properties: {} })

      await adapter.addEdge({ from: 'A', to: 'B', type: 'path', properties: { weight: 2 } })
      await adapter.addEdge({ from: 'B', to: 'C', type: 'path', properties: { weight: 2 } })
      await adapter.addEdge({ from: 'A', to: 'D', type: 'path', properties: { weight: 1 } })
      await adapter.addEdge({ from: 'D', to: 'C', type: 'path', properties: { weight: 1 } })

      const path = await adapter.shortestPath('A', 'C')

      expect(path).toBeDefined()
      expect(path?.nodes).toHaveLength(3) // A -> D -> C
      expect(path?.nodes.map(n => n.id)).toEqual(['A', 'D', 'C'])
    })
  })

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  describe('batch operations', () => {
    beforeEach(async () => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should handle batch storage operations', async () => {
      const entities = [
        createTestEntity('batch-1'),
        createTestEntity('batch-2'),
        createTestEntity('batch-3')
      ]

      const entryMap = new Map([
        ['key1', entities[0]],
        ['key2', entities[1]],
        ['key3', entities[2]]
      ])

      await adapter.setMany(entryMap)

      expect(await adapter.size()).toBe(3)
      expect(await adapter.has('key1')).toBe(true)
      expect(await adapter.has('key2')).toBe(true)
      expect(await adapter.has('key3')).toBe(true)
    })

    it('should handle batch retrieval', async () => {
      await adapter.set('batch-key-1', createTestEntity('batch-entity-1'))
      await adapter.set('batch-key-2', createTestEntity('batch-entity-2'))

      const results = await adapter.getMany(['batch-key-1', 'batch-key-2', 'non-existent'])

      expect(results.size).toBe(2)
      expect(results.has('batch-key-1')).toBe(true)
      expect(results.has('batch-key-2')).toBe(true)
      expect(results.has('non-existent')).toBe(false)
    })
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    beforeEach(async () => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should handle connection failures gracefully', async () => {
      // Create adapter with invalid configuration after initialization
      const brokenConfig = {
        ...config,
        database: '/dev/null/cannot-write-here'
      }

      const brokenAdapter = new KuzuStorageAdapter(brokenConfig)

      await expect(brokenAdapter.size()).rejects.toThrow(StorageError)
    })

    it('should validate input data', async () => {
      // Test invalid keys
      await expect(adapter.set('', createTestEntity('test'))).rejects.toThrow()
      await expect(adapter.get('')).rejects.toThrow()

      // Test invalid values
      await expect(adapter.set('key', null as any)).rejects.toThrow()
      await expect(adapter.set('key', undefined as any)).rejects.toThrow()
    })

    it('should provide meaningful error messages', async () => {
      try {
        const invalidAdapter = new KuzuStorageAdapter({} as any)
        await invalidAdapter.size()
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError)
        expect((error as StorageError).message).toContain('database')
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_VALUE)
      }
    })

    it('should handle graph operation errors', async () => {
      // Adding edge without source node
      const edge: GraphEdge = {
        from: 'non-existent-source',
        to: 'non-existent-target',
        type: 'invalid',
        properties: {}
      }

      await expect(adapter.addEdge(edge)).rejects.toThrow()
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    beforeEach(async () => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should handle empty results', async () => {
      expect(await adapter.size()).toBe(0)

      const keys = []
      for await (const key of adapter.keys()) {
        keys.push(key)
      }
      expect(keys).toHaveLength(0)

      const values = []
      for await (const value of adapter.values()) {
        values.push(value)
      }
      expect(values).toHaveLength(0)
    })

    it('should handle large property values', async () => {
      const largeText = 'A'.repeat(10000)
      const entity = createTestEntity('large-prop')
      entity.properties.largeText = largeText

      await adapter.set('large-key', entity)
      const retrieved = await adapter.get('large-key')

      expect(retrieved?.properties.largeText).toBe(largeText)
    })

    it('should handle special characters in properties', async () => {
      const entity = createTestEntity('special-chars')
      entity.properties.special = "Special chars: 中文, émoji: 🚀, quotes: \"'`"

      await adapter.set('special-key', entity)
      const retrieved = await adapter.get('special-key')

      expect(retrieved?.properties.special).toBe("Special chars: 中文, émoji: 🚀, quotes: \"'`")
    })

    it('should handle concurrent operations', async () => {
      const promises = []

      for (let i = 0; i < 10; i++) {
        promises.push(adapter.set(`concurrent-${i}`, createTestEntity(`entity-${i}`)))
      }

      await Promise.all(promises)
      expect(await adapter.size()).toBe(10)
    })

    it('should handle circular references in graph', async () => {
      // Create nodes A -> B -> A (circular)
      await adapter.addNode({ id: 'A', type: 'Node', properties: {} })
      await adapter.addNode({ id: 'B', type: 'Node', properties: {} })

      await adapter.addEdge({ from: 'A', to: 'B', type: 'connects', properties: {} })
      await adapter.addEdge({ from: 'B', to: 'A', type: 'connects', properties: {} })

      const pattern: TraversalPattern = {
        startNode: 'A',
        direction: 'outgoing',
        maxDepth: 5 // Should not get stuck in infinite loop
      }

      const paths = await adapter.traverse(pattern)
      expect(paths.length).toBeGreaterThan(0)

      // Should have finished in reasonable time (not infinite loop)
      expect(true).toBe(true) // If we get here, no infinite loop occurred
    })
  })

  // ============================================================================
  // INTEGRATION TESTS WITH BASE ADAPTER
  // ============================================================================

  describe('BaseStorageAdapter integration', () => {
    beforeEach(async () => {
      adapter = new KuzuStorageAdapter(config)
    })

    it('should work with query interface', async () => {
      const entity = createTestEntity('query-test')
      await adapter.set('query-key', entity)

      // Test that adapter integrates with query system
      const query = {} // Minimal query object
      const result = await adapter.query(query)

      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
    })

    it('should support iterator patterns', async () => {
      const entity1 = createTestEntity('iter-1')
      const entity2 = createTestEntity('iter-2')

      await adapter.set('key1', entity1)
      await adapter.set('key2', entity2)

      // Test entries iterator
      const entries = []
      for await (const [key, value] of adapter.entries()) {
        entries.push([key, value])
      }

      expect(entries).toHaveLength(2)
      expect(entries.find(([k]) => k === 'key1')).toBeDefined()
      expect(entries.find(([k]) => k === 'key2')).toBeDefined()
    })
  })
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a test graph entity
 */
function createTestEntity(id: string): GraphEntity {
  return {
    id,
    type: 'TestEntity',
    properties: {
      name: 'Test Entity',
      description: `Test entity with id ${id}`,
      version: 1
    },
    metadata: {
      created: new Date(),
      source: 'test'
    }
  }
}