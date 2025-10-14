/**
 * Circular Dependency Detector Tests
 *
 * Comprehensive test suite for circular dependency detection.
 * Tests written FIRST following TDD approach.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CircularDependencyDetector } from '../../../src/patterns/detectors/CircularDependencyDetector'
import {
  PatternType,
  PatternSeverity,
  PatternDetectionConfig,
  CircularDependency
} from '../../../src/patterns/types/PatternTypes'
import { GraphNode, GraphEdge } from '../../../src/storage/types/GraphTypes'

describe('CircularDependencyDetector', () => {
  let detector: CircularDependencyDetector

  beforeEach(() => {
    detector = new CircularDependencyDetector()
  })

  describe('detect - Simple Cycles', () => {
    it('should detect a 2-node circular dependency (A → B → A)', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe(PatternType.CIRCULAR_DEPENDENCY)
      expect(patterns[0].severity).toBe(PatternSeverity.WARNING)
      expect(patterns[0].nodes).toHaveLength(2)
      expect(patterns[0].nodes).toContain('A')
      expect(patterns[0].nodes).toContain('B')

      const circular = patterns[0] as CircularDependency
      expect(circular.cycle).toHaveLength(3) // A → B → A
      expect(circular.cycleLength).toBe(2)
    })

    it('should detect a 3-node circular dependency (A → B → C → A)', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'C', type: 'depends_on', properties: {} },
        { from: 'C', to: 'A', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      const circular = patterns[0] as CircularDependency
      expect(circular.cycle).toHaveLength(4) // A → B → C → A
      expect(circular.cycleLength).toBe(3)
      expect(circular.nodes).toHaveLength(3)
    })

    it('should detect a self-referencing circular dependency (A → A)', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'A', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      const circular = patterns[0] as CircularDependency
      expect(circular.cycle).toEqual(['A', 'A'])
      expect(circular.cycleLength).toBe(1)
      expect(circular.severity).toBe(PatternSeverity.ERROR) // Self-references are more severe
    })
  })

  describe('detect - Complex Cycles', () => {
    it('should detect multiple independent circular dependencies', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} },
        { id: 'D', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        // First cycle: A → B → A
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} },
        // Second cycle: C → D → C
        { from: 'C', to: 'D', type: 'depends_on', properties: {} },
        { from: 'D', to: 'C', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(2)
      expect(patterns.every(p => p.type === PatternType.CIRCULAR_DEPENDENCY)).toBe(true)
    })

    it('should detect a 5-node circular dependency', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} },
        { id: 'D', type: 'module', properties: {} },
        { id: 'E', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'C', type: 'depends_on', properties: {} },
        { from: 'C', to: 'D', type: 'depends_on', properties: {} },
        { from: 'D', to: 'E', type: 'depends_on', properties: {} },
        { from: 'E', to: 'A', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      const circular = patterns[0] as CircularDependency
      expect(circular.cycleLength).toBe(5)
      expect(circular.nodes).toHaveLength(5)
    })

    it('should detect nested cycles (cycle within a larger graph)', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} },
        { id: 'D', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        // Cycle: B → C → B
        { from: 'B', to: 'C', type: 'depends_on', properties: {} },
        { from: 'C', to: 'B', type: 'depends_on', properties: {} },
        // Non-circular edges
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'C', to: 'D', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      const circular = patterns[0] as CircularDependency
      expect(circular.nodes).toHaveLength(2)
      expect(circular.nodes).toContain('B')
      expect(circular.nodes).toContain('C')
    })
  })

  describe('detect - No Cycles', () => {
    it('should return empty array for acyclic graph', async () => {
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

    it('should return empty array for empty graph', async () => {
      // Arrange
      const nodes: GraphNode[] = []
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(0)
    })

    it('should return empty array for graph with nodes but no edges', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = []

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(0)
    })
  })

  describe('detect - Configuration', () => {
    it('should respect excludedNodeTypes configuration', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'test', properties: {} },
        { id: 'B', type: 'test', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} }
      ]
      const config: PatternDetectionConfig = {
        excludedNodeTypes: ['test']
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(0)
    })

    it('should respect excludedEdgeTypes configuration', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'test_dependency', properties: {} },
        { from: 'B', to: 'A', type: 'test_dependency', properties: {} }
      ]
      const config: PatternDetectionConfig = {
        excludedEdgeTypes: ['test_dependency']
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(0)
    })
  })

  describe('detect - Remediation Suggestions', () => {
    it('should provide remediation suggestions for detected cycles', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns[0].remediations).toBeDefined()
      expect(patterns[0].remediations.length).toBeGreaterThan(0)
      expect(patterns[0].remediations[0]).toHaveProperty('action')
      expect(patterns[0].remediations[0]).toHaveProperty('description')
      expect(patterns[0].remediations[0]).toHaveProperty('priority')
    })

    it('should exclude remediations when config.includeRemediations is false', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} }
      ]
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
    it('should handle graphs with disconnected components', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} },
        { id: 'D', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        // Component 1: A → B (no cycle)
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        // Component 2: C → D → C (cycle)
        { from: 'C', to: 'D', type: 'depends_on', properties: {} },
        { from: 'D', to: 'C', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      expect(patterns[0].nodes).toContain('C')
      expect(patterns[0].nodes).toContain('D')
    })

    it('should handle duplicate edges correctly', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'A', to: 'B', type: 'depends_on', properties: {} }, // Duplicate
        { from: 'B', to: 'A', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe(PatternType.CIRCULAR_DEPENDENCY)
    })

    it('should not detect false positives in DAG', async () => {
      // Arrange - Diamond pattern (A → B, A → C, B → D, C → D)
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} },
        { id: 'D', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'A', to: 'C', type: 'depends_on', properties: {} },
        { from: 'B', to: 'D', type: 'depends_on', properties: {} },
        { from: 'C', to: 'D', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(0) // No cycles in diamond pattern
    })
  })

  describe('detect - Metadata', () => {
    it('should include detection timestamp', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} }
      ]

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
        { id: 'B', type: 'module', properties: {} },
        { id: 'C', type: 'module', properties: {} },
        { id: 'D', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} },
        { from: 'C', to: 'D', type: 'depends_on', properties: {} },
        { from: 'D', to: 'C', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(2)
      expect(patterns[0].id).toBeDefined()
      expect(patterns[1].id).toBeDefined()
      expect(patterns[0].id).not.toBe(patterns[1].id)
    })

    it('should include edges in pattern metadata', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} },
        { from: 'B', to: 'A', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns[0].edges).toBeDefined()
      expect(patterns[0].edges?.length).toBe(2)
      expect(patterns[0].edges?.some(e => e.from === 'A' && e.to === 'B')).toBe(true)
      expect(patterns[0].edges?.some(e => e.from === 'B' && e.to === 'A')).toBe(true)
    })
  })
})
