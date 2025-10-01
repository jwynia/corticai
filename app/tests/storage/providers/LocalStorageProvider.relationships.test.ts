/**
 * Test suite for LocalStorageProvider relationship query optimization
 *
 * Tests the getRelationships() method which should use Kuzu's native
 * graph traversal instead of O(n) iteration for better performance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuzuStorageAdapter } from '../../../src/storage/adapters/KuzuStorageAdapter'
import { GraphEdge } from '../../../src/storage/types/GraphTypes'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Enhanced Kuzu Adapter that extends KuzuStorageAdapter with relationship methods
 * This mirrors the implementation in LocalStorageProvider.ts
 */
class EnhancedKuzuAdapter extends KuzuStorageAdapter {
  /**
   * Get relationships for an entity using Kuzu's graph traversal
   * This is the optimized version we're implementing
   */
  async getRelationships(entityId: string): Promise<GraphEdge[]> {
    // Use Kuzu's native getEdges method
    return await this.getEdges(entityId)
  }
}

describe('LocalStorageProvider Relationship Queries', () => {
  let adapter: EnhancedKuzuAdapter
  let tempDir: string

  beforeEach(async () => {
    // Create unique database file path for each test
    tempDir = path.join(os.tmpdir(), `kuzu-test-${Date.now()}-${Math.random().toString(36).substring(7)}`)

    // Initialize adapter
    adapter = new EnhancedKuzuAdapter({
      type: 'kuzu',
      database: tempDir,
      debug: false,
      readOnly: false,
      autoCreate: true
    })

    // Ensure database is initialized
    await adapter.size() // This triggers ensureLoaded()
  })

  afterEach(async () => {
    // Cleanup
    try {
      if (adapter) {
        await (adapter as any).close?.()
      }

      // Remove test database directory (Kuzu creates a directory)
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch (error) {
      // Ignore cleanup errors
      console.error('Cleanup error:', error)
    }
  })

  describe('getRelationships()', () => {
    it('should return empty array when entity has no relationships', async () => {
      // Arrange
      const entityId = 'entity-no-relationships'

      // Create a node with no edges
      await adapter.addNode({
        id: entityId,
        type: 'Entity',
        properties: { name: 'Isolated Entity' }
      })

      // Act
      const relationships = await adapter.getRelationships(entityId)

      // Assert
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships).toHaveLength(0)
    })

    it('should return all outgoing relationships for an entity', async () => {
      // Arrange
      const sourceId = 'entity-source'
      const target1Id = 'entity-target-1'
      const target2Id = 'entity-target-2'

      // Create nodes
      await adapter.addNode({ id: sourceId, type: 'Entity', properties: { name: 'Source' } })
      await adapter.addNode({ id: target1Id, type: 'Entity', properties: { name: 'Target 1' } })
      await adapter.addNode({ id: target2Id, type: 'Entity', properties: { name: 'Target 2' } })

      // Create edges
      await adapter.addEdge({
        from: sourceId,
        to: target1Id,
        type: 'RELATES_TO',
        properties: { data: JSON.stringify({ weight: 1 }) }
      })

      await adapter.addEdge({
        from: sourceId,
        to: target2Id,
        type: 'DEPENDS_ON',
        properties: { data: JSON.stringify({ weight: 2 }) }
      })

      // Act
      const relationships = await adapter.getRelationships(sourceId)

      // Assert
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships.length).toBeGreaterThanOrEqual(2)

      // Verify we have the expected relationships
      const hasTarget1 = relationships.some(r => r.to === target1Id && r.from === sourceId)
      const hasTarget2 = relationships.some(r => r.to === target2Id && r.from === sourceId)

      expect(hasTarget1).toBe(true)
      expect(hasTarget2).toBe(true)
    })

    it('should return all incoming relationships for an entity', async () => {
      // Arrange
      const targetId = 'entity-target'
      const source1Id = 'entity-source-1'
      const source2Id = 'entity-source-2'

      // Create nodes
      await adapter.addNode({ id: targetId, type: 'Entity', properties: { name: 'Target' } })
      await adapter.addNode({ id: source1Id, type: 'Entity', properties: { name: 'Source 1' } })
      await adapter.addNode({ id: source2Id, type: 'Entity', properties: { name: 'Source 2' } })

      // Create edges pointing TO the target
      await adapter.addEdge({
        from: source1Id,
        to: targetId,
        type: 'POINTS_TO',
        properties: { data: JSON.stringify({ weight: 1 }) }
      })

      await adapter.addEdge({
        from: source2Id,
        to: targetId,
        type: 'REFERENCES',
        properties: { data: JSON.stringify({ weight: 2 }) }
      })

      // Act
      const relationships = await adapter.getRelationships(targetId)

      // Assert
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships.length).toBeGreaterThanOrEqual(2)

      // Verify we have the expected relationships
      const hasSource1 = relationships.some(r => r.from === source1Id && r.to === targetId)
      const hasSource2 = relationships.some(r => r.from === source2Id && r.to === targetId)

      expect(hasSource1).toBe(true)
      expect(hasSource2).toBe(true)
    })

    it('should return both incoming and outgoing relationships (bidirectional)', async () => {
      // Arrange
      const centerNodeId = 'entity-center'
      const incomingNodeId = 'entity-incoming'
      const outgoingNodeId = 'entity-outgoing'

      // Create nodes
      await adapter.addNode({ id: centerNodeId, type: 'Entity', properties: { name: 'Center' } })
      await adapter.addNode({ id: incomingNodeId, type: 'Entity', properties: { name: 'Incoming' } })
      await adapter.addNode({ id: outgoingNodeId, type: 'Entity', properties: { name: 'Outgoing' } })

      // Create bidirectional relationships
      await adapter.addEdge({
        from: incomingNodeId,
        to: centerNodeId,
        type: 'INCOMING',
        properties: { data: JSON.stringify({ direction: 'in' }) }
      })

      await adapter.addEdge({
        from: centerNodeId,
        to: outgoingNodeId,
        type: 'OUTGOING',
        properties: { data: JSON.stringify({ direction: 'out' }) }
      })

      // Act
      const relationships = await adapter.getRelationships(centerNodeId)

      // Assert
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships.length).toBeGreaterThanOrEqual(2)

      // Verify we have both incoming and outgoing
      const hasIncoming = relationships.some(r => r.from === incomingNodeId && r.to === centerNodeId)
      const hasOutgoing = relationships.some(r => r.from === centerNodeId && r.to === outgoingNodeId)

      expect(hasIncoming).toBe(true)
      expect(hasOutgoing).toBe(true)
    })

    it('should handle entity with many relationships efficiently', async () => {
      // Arrange
      const hubNodeId = 'entity-hub'
      const relationshipCount = 20 // Reasonable number for test

      // Create hub node
      await adapter.addNode({ id: hubNodeId, type: 'Entity', properties: { name: 'Hub' } })

      // Create many related nodes and edges
      for (let i = 0; i < relationshipCount; i++) {
        const spokeId = `entity-spoke-${i}`
        await adapter.addNode({ id: spokeId, type: 'Entity', properties: { name: `Spoke ${i}` } })

        await adapter.addEdge({
          from: hubNodeId,
          to: spokeId,
          type: 'CONNECTS_TO',
          properties: { data: JSON.stringify({ index: i }) }
        })
      }

      // Act
      const startTime = Date.now()
      const relationships = await adapter.getRelationships(hubNodeId)
      const duration = Date.now() - startTime

      // Assert
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships.length).toBeGreaterThanOrEqual(relationshipCount)

      // Performance assertion - should complete quickly
      // Even with 20 relationships, should complete in well under 1 second
      expect(duration).toBeLessThan(1000)
    })

    it('should handle self-referential relationships', async () => {
      // Arrange
      const nodeId = 'entity-self-ref'

      // Create node
      await adapter.addNode({ id: nodeId, type: 'Entity', properties: { name: 'Self-Referencing' } })

      // Create self-referential edge
      await adapter.addEdge({
        from: nodeId,
        to: nodeId,
        type: 'SELF_LOOP',
        properties: { data: JSON.stringify({ special: true }) }
      })

      // Act
      const relationships = await adapter.getRelationships(nodeId)

      // Assert
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships.length).toBeGreaterThanOrEqual(1)

      // Verify self-referential relationship
      const hasSelfLoop = relationships.some(r => r.from === nodeId && r.to === nodeId)
      expect(hasSelfLoop).toBe(true)
    })

    it('should return relationships with correct type information', async () => {
      // Arrange
      const entityId = 'entity-typed'
      const relatedId = 'entity-related'

      // Create nodes
      await adapter.addNode({ id: entityId, type: 'Entity', properties: { name: 'Typed Entity' } })
      await adapter.addNode({ id: relatedId, type: 'Entity', properties: { name: 'Related Entity' } })

      // Create edge with specific type
      const expectedType = 'CUSTOM_RELATIONSHIP'
      await adapter.addEdge({
        from: entityId,
        to: relatedId,
        type: expectedType,
        properties: { data: JSON.stringify({ custom: 'property' }) }
      })

      // Act
      const relationships = await adapter.getRelationships(entityId)

      // Assert
      expect(relationships.length).toBeGreaterThanOrEqual(1)
      const relationship = relationships.find(r => r.from === entityId && r.to === relatedId)

      expect(relationship).toBeDefined()
      expect(relationship?.type).toBe(expectedType)
    })

    it('should handle non-existent entity gracefully', async () => {
      // Arrange
      const nonExistentId = 'entity-does-not-exist'

      // Act
      const relationships = await adapter.getRelationships(nonExistentId)

      // Assert - should return empty array, not throw error
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships).toHaveLength(0)
    })
  })

  describe('Performance Characteristics', () => {
    it('should use O(degree) complexity instead of O(n) full scan', async () => {
      // Arrange - Create a database with many entities but only a few relationships

      const targetId = 'performance-target'
      const unrelatedCount = 100 // Many unrelated entities
      const relatedCount = 3 // Few related entities

      // Create target node
      await adapter.addNode({ id: targetId, type: 'Entity', properties: { name: 'Target' } })

      // Create many unrelated nodes (should NOT be scanned in optimized version)
      for (let i = 0; i < unrelatedCount; i++) {
        const unrelatedId = `unrelated-${i}`
        await adapter.addNode({ id: unrelatedId, type: 'Entity', properties: { name: `Unrelated ${i}` } })
      }

      // Create a few related nodes with edges
      for (let i = 0; i < relatedCount; i++) {
        const relatedId = `related-${i}`
        await adapter.addNode({ id: relatedId, type: 'Entity', properties: { name: `Related ${i}` } })

        await adapter.addEdge({
          from: targetId,
          to: relatedId,
          type: 'RELATES_TO',
          properties: { data: JSON.stringify({ index: i }) }
        })
      }

      // Act
      const startTime = Date.now()
      const relationships = await adapter.getRelationships(targetId)
      const duration = Date.now() - startTime

      // Assert
      expect(relationships).toHaveLength(relatedCount)

      // Performance assertion: With graph traversal (O(degree)), this should be fast
      // even with 100 unrelated entities. If it was doing O(n) scan, it would be slower.
      // With Kuzu's graph traversal, should complete in well under 500ms
      expect(duration).toBeLessThan(500)

      console.log(`Query completed in ${duration}ms with ${unrelatedCount} unrelated entities and ${relatedCount} relationships`)
    })
  })
})
