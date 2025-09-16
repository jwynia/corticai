/**
 * KuzuStorageAdapter Security Tests
 *
 * Tests to verify protection against SQL injection vulnerabilities
 * and proper input sanitization.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuzuStorageAdapter } from './KuzuStorageAdapter'
import {
  GraphEntity,
  GraphEdge,
  TraversalPattern,
  KuzuStorageConfig
} from '../types/GraphTypes'
import { StorageError } from '../interfaces/Storage'
import * as fs from 'fs'
import * as path from 'path'

describe('KuzuStorageAdapter Security Tests', () => {
  let adapter: KuzuStorageAdapter
  let testDbPath: string
  let config: KuzuStorageConfig

  beforeEach(() => {
    // Create unique database path for each test
    testDbPath = path.join('/tmp', `kuzu-security-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    config = {
      type: 'kuzu',
      database: testDbPath,
      id: 'security-test-adapter',
      debug: false,
      autoCreate: true
    }
    adapter = new KuzuStorageAdapter(config)
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

  describe('SQL Injection Protection', () => {
    it('should safely handle malicious entity IDs during storage', async () => {
      // Arrange: Create entity with SQL injection attempt in ID
      const maliciousEntity: GraphEntity = {
        id: "'; DELETE FROM Entity; --",
        type: 'MaliciousEntity',
        properties: { name: 'Test' }
      }

      // Act: Store the entity (should not execute injection)
      await expect(adapter.set('safe-key', maliciousEntity)).resolves.not.toThrow()

      // Assert: The entity should be stored safely and retrievable
      const retrieved = await adapter.get('safe-key')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe("'; DELETE FROM Entity; --")

      // Verify other data still exists
      const size = await adapter.size()
      expect(size).toBeGreaterThan(0)
    })

    it('should safely handle malicious entity types', async () => {
      // Arrange: Create entity with SQL injection attempt in type
      const maliciousEntity: GraphEntity = {
        id: 'test-id',
        type: "'; DROP TABLE Entity; --",
        properties: { name: 'Test' }
      }

      // Act & Assert: Should handle safely
      await expect(adapter.set('type-injection-test', maliciousEntity)).resolves.not.toThrow()

      const retrieved = await adapter.get('type-injection-test')
      expect(retrieved?.type).toBe("'; DROP TABLE Entity; --")
    })

    it('should safely handle malicious entity data/properties', async () => {
      // Arrange: Create entity with SQL injection attempt in properties
      const maliciousEntity: GraphEntity = {
        id: 'data-test',
        type: 'TestEntity',
        properties: {
          maliciousField: "'; DELETE FROM Entity WHERE 1=1; --",
          normalField: 'normal value'
        }
      }

      // Act & Assert: Should handle safely
      await expect(adapter.set('data-injection-test', maliciousEntity)).resolves.not.toThrow()

      const retrieved = await adapter.get('data-injection-test')
      expect(retrieved?.properties.maliciousField).toBe("'; DELETE FROM Entity WHERE 1=1; --")
      expect(retrieved?.properties.normalField).toBe('normal value')
    })

    it('should safely handle malicious edge IDs', async () => {
      // Arrange: Set up nodes and edge with injection attempts
      const fromEntity: GraphEntity = { id: 'from-node', type: 'Node', properties: {} }
      const toEntity: GraphEntity = { id: 'to-node', type: 'Node', properties: {} }

      await adapter.set('from-key', fromEntity)
      await adapter.set('to-key', toEntity)

      const maliciousEdge: GraphEdge = {
        from: "'; DELETE FROM Relationship; --",
        to: "'; DROP TABLE Entity; --",
        type: 'INJECTION_EDGE',
        properties: {}
      }

      // Act: Should either safely handle or reject malicious edge
      try {
        await adapter.addEdge(maliciousEdge)
        // If it doesn't throw, verify it was handled safely
        const edges = await adapter.getEdges('from-node')
        // Should not have deleted all relationships
        expect(Array.isArray(edges)).toBe(true)
      } catch (error) {
        // If it throws, it should be a validation error, not SQL error
        expect(error).toBeInstanceOf(StorageError)
        expect((error as StorageError).message).not.toContain('SQL')
        expect((error as StorageError).message).not.toContain('syntax')
      }
    })

    it('should safely handle malicious edge types', async () => {
      // Arrange: Set up valid nodes
      const fromEntity: GraphEntity = { id: 'from-safe', type: 'Node', properties: {} }
      const toEntity: GraphEntity = { id: 'to-safe', type: 'Node', properties: {} }

      await adapter.set('from-safe-key', fromEntity)
      await adapter.set('to-safe-key', toEntity)

      const edgeWithMaliciousType: GraphEdge = {
        from: 'from-safe',
        to: 'to-safe',
        type: "'; UPDATE Entity SET data = 'hacked'; --",
        properties: {}
      }

      // Act & Assert: Should handle safely
      await adapter.addEdge(edgeWithMaliciousType)

      // Verify the entities weren't corrupted
      const fromRetrieved = await adapter.get('from-safe-key')
      const toRetrieved = await adapter.get('to-safe-key')

      expect(fromRetrieved?.properties).not.toEqual({ data: 'hacked' })
      expect(toRetrieved?.properties).not.toEqual({ data: 'hacked' })
    })

    it('should safely handle malicious traversal patterns', async () => {
      // Arrange: Create a simple graph
      const nodeA: GraphEntity = { id: 'node-a', type: 'Node', properties: {} }
      const nodeB: GraphEntity = { id: 'node-b', type: 'Node', properties: {} }

      await adapter.set('a-key', nodeA)
      await adapter.set('b-key', nodeB)

      await adapter.addEdge({
        from: 'node-a',
        to: 'node-b',
        type: 'CONNECTS',
        properties: {}
      })

      const maliciousPattern: TraversalPattern = {
        startNode: "'; DELETE FROM Entity; --",
        maxDepth: 1,
        direction: 'outgoing',
        edgeTypes: ["'; DROP TABLE Relationship; --"]
      }

      // Act: Should handle malicious pattern safely
      try {
        const paths = await adapter.traverse(maliciousPattern)
        expect(Array.isArray(paths)).toBe(true)
      } catch (error) {
        // If it throws, should be validation error
        expect(error).toBeInstanceOf(StorageError)
      }

      // Assert: Graph should still be intact
      const size = await adapter.size()
      expect(size).toBeGreaterThanOrEqual(2)
    })

    it('should safely handle malicious node IDs in findConnected', async () => {
      // Arrange: Set up test nodes
      const centralNode: GraphEntity = { id: 'central', type: 'Node', properties: {} }
      const connectedNode: GraphEntity = { id: 'connected', type: 'Node', properties: {} }

      await adapter.set('central-key', centralNode)
      await adapter.set('connected-key', connectedNode)

      await adapter.addEdge({
        from: 'central',
        to: 'connected',
        type: 'CONNECTS',
        properties: {}
      })

      // Act: Try to find connected nodes with malicious ID
      try {
        const connected = await adapter.findConnected("'; DELETE FROM Entity; --", 1)
        expect(Array.isArray(connected)).toBe(true)
      } catch (error) {
        // Should be validation error if it throws
        expect(error).toBeInstanceOf(StorageError)
      }

      // Assert: Original nodes should still exist
      const originalCentral = await adapter.get('central-key')
      const originalConnected = await adapter.get('connected-key')
      expect(originalCentral).toBeDefined()
      expect(originalConnected).toBeDefined()
    })

    it('should safely handle malicious node IDs in shortestPath', async () => {
      // Arrange: Set up path nodes
      const startNode: GraphEntity = { id: 'start', type: 'Node', properties: {} }
      const endNode: GraphEntity = { id: 'end', type: 'Node', properties: {} }

      await adapter.set('start-key', startNode)
      await adapter.set('end-key', endNode)

      await adapter.addEdge({
        from: 'start',
        to: 'end',
        type: 'PATH',
        properties: {}
      })

      // Act: Try shortest path with malicious IDs
      try {
        const path = await adapter.shortestPath(
          "'; DELETE FROM Entity; --",
          "'; DROP TABLE Relationship; --"
        )
        // May return null for no path found, which is fine
        expect(path === null || typeof path === 'object').toBe(true)
      } catch (error) {
        // Should be validation error if it throws
        expect(error).toBeInstanceOf(StorageError)
      }

      // Assert: Original data should be intact
      const size = await adapter.size()
      expect(size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Input Validation', () => {
    it('should reject entities with invalid ID types', async () => {
      const invalidEntity = {
        id: 123, // number instead of string
        type: 'TestEntity',
        properties: {}
      } as any

      await expect(adapter.set('invalid-key', invalidEntity)).rejects.toThrow()
    })

    it('should reject entities with invalid type values', async () => {
      const invalidEntity = {
        id: 'valid-id',
        type: null, // null instead of string
        properties: {}
      } as any

      await expect(adapter.set('invalid-type-key', invalidEntity)).rejects.toThrow()
    })

    it('should reject edges with missing required fields', async () => {
      const invalidEdge = {
        from: 'valid-from',
        // missing 'to' field
        type: 'INVALID',
        properties: {}
      } as any

      await expect(adapter.addEdge(invalidEdge)).rejects.toThrow()
    })

    it('should reject traversal patterns with invalid depth', async () => {
      const invalidPattern: TraversalPattern = {
        startNode: 'valid-node',
        maxDepth: -1, // invalid negative depth
        direction: 'outgoing'
      }

      await expect(adapter.traverse(invalidPattern)).rejects.toThrow()
    })
  })

  describe('Query Logging and Monitoring', () => {
    it('should log queries when debug mode is enabled', async () => {
      // Arrange: Enable debug mode
      const debugConfig = { ...config, debug: true }
      const debugAdapter = new KuzuStorageAdapter(debugConfig)

      const consoleSpy = vitest.spyOn(console, 'log').mockImplementation(() => {})

      try {
        // Act: Perform operations that should be logged
        const entity: GraphEntity = { id: 'log-test', type: 'TestEntity', properties: {} }
        await debugAdapter.set('log-key', entity)

        // Assert: Should have logged the operation
        expect(consoleSpy).toHaveBeenCalled()

        // Check that sensitive data is not logged in plain text
        const logCalls = consoleSpy.mock.calls.flat()
        const hasRawQuery = logCalls.some(call =>
          typeof call === 'string' &&
          call.includes('MERGE') &&
          call.includes('log-test')
        )

        // We want to log operations but not expose raw queries with user data
        expect(hasRawQuery).toBe(false)
      } finally {
        consoleSpy.mockRestore()
        await debugAdapter.clear()
      }
    })
  })
})

// Helper function for creating test entities
function createTestEntity(id: string): GraphEntity {
  return {
    id,
    type: 'TestEntity',
    properties: {
      name: 'Test Entity',
      timestamp: new Date().toISOString()
    }
  }
}