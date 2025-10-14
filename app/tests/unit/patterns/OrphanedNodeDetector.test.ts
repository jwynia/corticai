/**
 * Orphaned Node Detector Tests
 *
 * Comprehensive test suite for orphaned node detection.
 * Tests written FIRST following TDD approach.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { OrphanedNodeDetector } from '../../../src/patterns/detectors/OrphanedNodeDetector'
import {
  PatternType,
  PatternSeverity,
  PatternDetectionConfig,
  OrphanedNode
} from '../../../src/patterns/types/PatternTypes'
import { GraphNode, GraphEdge } from '../../../src/storage/types/GraphTypes'

describe('OrphanedNodeDetector', () => {
  let detector: OrphanedNodeDetector

  beforeEach(() => {
    detector = new OrphanedNodeDetector()
  })

  describe('detect - Fully Isolated Nodes', () => {
    it('should detect a node with no incoming or outgoing edges', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} } // Orphaned
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe(PatternType.ORPHANED_NODE)
      expect(patterns[0].nodeId).toBe('C')
      expect((patterns[0] as OrphanedNode).noIncoming).toBe(true)
      expect((patterns[0] as OrphanedNode).noOutgoing).toBe(true)
      expect(patterns[0].severity).toBe(PatternSeverity.WARNING)
    })

    it('should detect multiple orphaned nodes', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} }, // Orphaned
        { id: 'D', type: 'module', properties: {} }  // Orphaned
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(2)
      expect(patterns.every(p => p.type === PatternType.ORPHANED_NODE)).toBe(true)
      const orphanedIds = patterns.map(p => (p as OrphanedNode).nodeId)
      expect(orphanedIds).toContain('C')
      expect(orphanedIds).toContain('D')
    })

    it('should not detect nodes with any connections', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'C', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(0)
    })
  })

  describe('detect - Partially Isolated Nodes', () => {
    it('should detect a node with only incoming edges (sink node) when configured', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} } // Sink node
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'C', type: 'depends_on', properties: {} }
        // C has incoming but no outgoing
      ]
      const config: PatternDetectionConfig = {
        detectPartiallyIsolatedNodes: true
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(2) // Both A (source) and C (sink)
      const sinkNode = patterns.find(p => (p as OrphanedNode).nodeId === 'C')
      expect(sinkNode).toBeDefined()
      expect((sinkNode as OrphanedNode).noIncoming).toBe(false)
      expect((sinkNode as OrphanedNode).noOutgoing).toBe(true)
      expect(sinkNode?.severity).toBe(PatternSeverity.INFO) // Less severe than fully isolated
    })

    it('should detect a node with only outgoing edges (source node) when configured', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }, // Source node
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'C', type: 'depends_on', properties: {} }
        // A has outgoing but no incoming
      ]
      const config: PatternDetectionConfig = {
        detectPartiallyIsolatedNodes: true
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(2) // Both A (source) and C (sink)
      const sourceNode = patterns.find(p => (p as OrphanedNode).nodeId === 'A')
      expect(sourceNode).toBeDefined()
      expect((sourceNode as OrphanedNode).noIncoming).toBe(true)
      expect((sourceNode as OrphanedNode).noOutgoing).toBe(false)
      expect(sourceNode?.severity).toBe(PatternSeverity.INFO)
    })
  })

  describe('detect - Configuration', () => {
    it('should respect excludedNodeTypes configuration', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'test_helper', properties: {} }, // Orphaned but excluded type
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []
      const config: PatternDetectionConfig = {
        excludedNodeTypes: ['test_helper']
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      // Should only detect B, not A (excluded type)
      expect(patterns).toHaveLength(1)
      expect((patterns[0] as OrphanedNode).nodeId).toBe('B')
    })

    it('should include remediations when config.includeRemediations is true', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []
      const config: PatternDetectionConfig = {
        includeRemediations: true
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns[0].remediations).toBeDefined()
      expect(patterns[0].remediations.length).toBeGreaterThan(0)
    })

    it('should exclude remediations when config.includeRemediations is false', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []
      const config: PatternDetectionConfig = {
        includeRemediations: false
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns[0].remediations).toHaveLength(0)
    })
  })

  describe('detect - Edge Cases', () => {
    it('should return empty array for empty graph', async () => {
      // Arrange
      const nodes: GraphNode[] = []
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(0)
    })

    it('should detect all nodes as orphaned when graph has nodes but no edges', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(3)
      expect(patterns.every(p => p.type === PatternType.ORPHANED_NODE)).toBe(true)
    })

    it('should handle self-referencing nodes correctly', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'A', type: 'self_ref', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      // Self-referencing node has both incoming and outgoing, not orphaned
      expect(patterns).toHaveLength(0)
    })

    it('should handle nodes with multiple edge types', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'A', to: 'B', type: 'uses', properties: {} }
      ]
      const config: PatternDetectionConfig = {
        detectPartiallyIsolatedNodes: true
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      // B has incoming edges, A has outgoing edges
      expect(patterns).toHaveLength(2)
      // A is source, B is sink
      const nodeA = patterns.find(p => (p as OrphanedNode).nodeId === 'A')
      const nodeB = patterns.find(p => (p as OrphanedNode).nodeId === 'B')
      expect((nodeA as OrphanedNode).noIncoming).toBe(true)
      expect((nodeB as OrphanedNode).noOutgoing).toBe(true)
    })
  })

  describe('detect - Remediation Suggestions', () => {
    it('should provide different remediations for fully isolated vs partially isolated', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }, // Source
        { id: 'B', type: 'module', properties: {} }, // Sink
        { id: 'C', type: 'module', properties: {} }  // Fully isolated
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} }
      ]
      const config: PatternDetectionConfig = {
        detectPartiallyIsolatedNodes: true
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(3)

      const fullyIsolated = patterns.find(p => (p as OrphanedNode).nodeId === 'C')
      const sourceNode = patterns.find(p => (p as OrphanedNode).nodeId === 'A')

      expect(fullyIsolated?.remediations[0].action).toBe('remove')
      expect(sourceNode?.remediations[0].action).toBe('investigate')
    })
  })

  describe('detect - Metadata', () => {
    it('should include detection timestamp', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns[0].detectedAt).toBeInstanceOf(Date)
      expect(patterns[0].detectedAt.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should include unique pattern IDs', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(2)
      expect(patterns[0].id).toBeDefined()
      expect(patterns[1].id).toBeDefined()
      expect(patterns[0].id).not.toBe(patterns[1].id)
    })

    it('should include node count in metadata', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns[0].nodes).toHaveLength(1)
      expect(patterns[0].nodes[0]).toBe('A')
    })
  })

  describe('detect - Severity Levels', () => {
    it('should assign WARNING severity to fully isolated nodes', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns[0].severity).toBe(PatternSeverity.WARNING)
    })

    it('should assign INFO severity to partially isolated nodes', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} }
      ]
      const config: PatternDetectionConfig = {
        detectPartiallyIsolatedNodes: true
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(2)
      expect(patterns.every(p => p.severity === PatternSeverity.INFO)).toBe(true)
    })
  })
})
