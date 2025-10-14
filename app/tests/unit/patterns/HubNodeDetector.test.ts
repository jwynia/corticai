/**
 * Hub Node Detector Tests
 *
 * Test suite for hub node detection (nodes with excessive connections).
 * Tests written FIRST following TDD approach.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HubNodeDetector } from '../../../src/patterns/detectors/HubNodeDetector'
import {
  PatternType,
  PatternSeverity,
  PatternDetectionConfig,
  HubNode
} from '../../../src/patterns/types/PatternTypes'
import { GraphNode, GraphEdge } from '../../../src/storage/types/GraphTypes'

describe('HubNodeDetector', () => {
  let detector: HubNodeDetector

  beforeEach(() => {
    detector = new HubNodeDetector()
  })

  describe('detect - Hub Nodes', () => {
    it('should detect a node exceeding default threshold (20 connections)', async () => {
      // Arrange
      const nodes: GraphNode[] = [{ id: 'Hub', type: 'module', properties: {} }]
      for (let i = 0; i < 25; i++) {
        nodes.push({ id: `Node${i}`, type: 'module', properties: {} })
      }

      const edges: GraphEdge[] = []
      for (let i = 0; i < 25; i++) {
        edges.push({ from: 'Hub', to: `Node${i}`, type: 'depends_on', properties: {} })
      }

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe(PatternType.HUB_NODE)
      expect((patterns[0] as HubNode).nodeId).toBe('Hub')
      expect((patterns[0] as HubNode).totalConnections).toBe(25)
    })

    it('should respect custom threshold configuration', async () => {
      // Arrange
      const nodes: GraphNode[] = [{ id: 'Hub', type: 'module', properties: {} }]
      for (let i = 0; i < 8; i++) {
        nodes.push({ id: `Node${i}`, type: 'module', properties: {} })
      }

      const edges: GraphEdge[] = []
      for (let i = 0; i < 8; i++) {
        edges.push({ from: 'Hub', to: `Node${i}`, type: 'depends_on', properties: {} })
      }

      const config: PatternDetectionConfig = {
        hubNodeThreshold: 5
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(1)
      expect((patterns[0] as HubNode).threshold).toBe(5)
    })

    it('should not detect nodes below threshold', async () => {
      // Arrange
      const nodes: GraphNode[] = [
        { id: 'A', type: 'module', properties: {} },
        { id: 'B', type: 'module', properties: {} }
      ]
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', type: 'depends_on', properties: {} }
      ]

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(0)
    })

    it('should count both incoming and outgoing edges', async () => {
      // Arrange
      const nodes: GraphNode[] = [{ id: 'Hub', type: 'module', properties: {} }]
      for (let i = 0; i < 15; i++) {
        nodes.push({ id: `In${i}`, type: 'module', properties: {} })
        nodes.push({ id: `Out${i}`, type: 'module', properties: {} })
      }

      const edges: GraphEdge[] = []
      for (let i = 0; i < 15; i++) {
        edges.push({ from: `In${i}`, to: 'Hub', type: 'depends_on', properties: {} })
        edges.push({ from: 'Hub', to: `Out${i}`, type: 'depends_on', properties: {} })
      }

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns).toHaveLength(1)
      const hubNode = patterns[0] as HubNode
      expect(hubNode.incomingCount).toBe(15)
      expect(hubNode.outgoingCount).toBe(15)
      expect(hubNode.totalConnections).toBe(30)
    })
  })

  describe('detect - Configuration', () => {
    it('should respect excludedNodeTypes', async () => {
      // Arrange
      const nodes: GraphNode[] = [{ id: 'Hub', type: 'test', properties: {} }]
      for (let i = 0; i < 25; i++) {
        nodes.push({ id: `Node${i}`, type: 'module', properties: {} })
      }

      const edges: GraphEdge[] = []
      for (let i = 0; i < 25; i++) {
        edges.push({ from: 'Hub', to: `Node${i}`, type: 'depends_on', properties: {} })
      }

      const config: PatternDetectionConfig = {
        excludedNodeTypes: ['test']
      }

      // Act
      const patterns = await detector.detect(nodes, edges, config)

      // Assert
      expect(patterns).toHaveLength(0)
    })
  })

  describe('detect - Remediations', () => {
    it('should include remediation suggestions', async () => {
      // Arrange
      const nodes: GraphNode[] = [{ id: 'Hub', type: 'module', properties: {} }]
      for (let i = 0; i < 25; i++) {
        nodes.push({ id: `Node${i}`, type: 'module', properties: {} })
      }

      const edges: GraphEdge[] = []
      for (let i = 0; i < 25; i++) {
        edges.push({ from: 'Hub', to: `Node${i}`, type: 'depends_on', properties: {} })
      }

      // Act
      const patterns = await detector.detect(nodes, edges)

      // Assert
      expect(patterns[0].remediations).toBeDefined()
      expect(patterns[0].remediations.length).toBeGreaterThan(0)
      expect(patterns[0].remediations[0].action).toBe('split')
    })
  })
})
