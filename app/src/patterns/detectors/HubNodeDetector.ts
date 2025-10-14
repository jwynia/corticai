/**
 * Hub Node Detector
 *
 * Detects nodes with excessive connections ("god objects" or "hub nodes").
 * These nodes may indicate architectural issues or violation of single responsibility principle.
 */

import { GraphNode, GraphEdge } from '../../storage/types/GraphTypes'
import {
  DetectedPattern,
  HubNode,
  PatternType,
  PatternSeverity,
  PatternDetectionConfig,
  RemediationSuggestion
} from '../types/PatternTypes'
import { randomUUID } from 'crypto'

const DEFAULT_HUB_THRESHOLD = 20

/**
 * Hub Node Detector
 *
 * Identifies nodes with too many connections.
 */
export class HubNodeDetector {
  /**
   * Detect hub nodes in the given graph
   *
   * @param nodes - All nodes in the graph
   * @param edges - All edges in the graph
   * @param config - Optional configuration for detection
   * @returns Array of detected hub node patterns
   */
  async detect(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Promise<HubNode[]> {
    const patterns: HubNode[] = []
    const threshold = config?.hubNodeThreshold ?? DEFAULT_HUB_THRESHOLD

    // Build connection maps
    const incomingMap = this.buildIncomingMap(edges, config)
    const outgoingMap = this.buildOutgoingMap(edges, config)

    // Check each node
    for (const node of nodes) {
      // Skip excluded node types
      if (config?.excludedNodeTypes?.includes(node.type)) {
        continue
      }

      const incomingCount = incomingMap.get(node.id)?.length ?? 0
      const outgoingCount = outgoingMap.get(node.id)?.length ?? 0
      const totalConnections = incomingCount + outgoingCount

      if (totalConnections > threshold) {
        const pattern = this.createHubNodePattern(
          node,
          incomingCount,
          outgoingCount,
          totalConnections,
          threshold,
          config
        )
        patterns.push(pattern)
      }
    }

    return patterns
  }

  /**
   * Build incoming edge map
   */
  private buildIncomingMap(
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Map<string, GraphEdge[]> {
    const incomingMap = new Map<string, GraphEdge[]>()

    for (const edge of edges) {
      if (config?.excludedEdgeTypes?.includes(edge.type)) {
        continue
      }

      const incoming = incomingMap.get(edge.to) || []
      incoming.push(edge)
      incomingMap.set(edge.to, incoming)
    }

    return incomingMap
  }

  /**
   * Build outgoing edge map
   */
  private buildOutgoingMap(
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Map<string, GraphEdge[]> {
    const outgoingMap = new Map<string, GraphEdge[]>()

    for (const edge of edges) {
      if (config?.excludedEdgeTypes?.includes(edge.type)) {
        continue
      }

      const outgoing = outgoingMap.get(edge.from) || []
      outgoing.push(edge)
      outgoingMap.set(edge.from, outgoing)
    }

    return outgoingMap
  }

  /**
   * Create HubNode pattern
   */
  private createHubNodePattern(
    node: GraphNode,
    incomingCount: number,
    outgoingCount: number,
    totalConnections: number,
    threshold: number,
    config?: PatternDetectionConfig
  ): HubNode {
    const severity = this.determineSeverity(totalConnections, threshold)
    const remediations = config?.includeRemediations === false
      ? []
      : this.generateRemediations(totalConnections, threshold)

    return {
      id: randomUUID(),
      type: PatternType.HUB_NODE,
      severity,
      description: `Hub node detected: ${node.id} has ${totalConnections} connections (threshold: ${threshold})`,
      nodes: [node.id],
      nodeId: node.id,
      incomingCount,
      outgoingCount,
      totalConnections,
      threshold,
      remediations,
      detectedAt: new Date()
    }
  }

  /**
   * Determine severity based on how much threshold is exceeded
   */
  private determineSeverity(totalConnections: number, threshold: number): PatternSeverity {
    const excessRatio = totalConnections / threshold

    if (excessRatio > 3) {
      return PatternSeverity.CRITICAL
    } else if (excessRatio > 2) {
      return PatternSeverity.ERROR
    } else if (excessRatio > 1.5) {
      return PatternSeverity.WARNING
    } else {
      return PatternSeverity.INFO
    }
  }

  /**
   * Generate remediation suggestions
   */
  private generateRemediations(totalConnections: number, threshold: number): RemediationSuggestion[] {
    return [
      {
        action: 'split',
        description: 'Split this hub node into smaller, focused components',
        steps: [
          'Identify distinct responsibilities within the hub node',
          'Extract each responsibility into a separate component',
          'Use composition or dependency injection to connect components',
          'Verify tests pass after refactoring'
        ],
        priority: 1,
        estimatedEffort: Math.ceil(totalConnections / 10)
      },
      {
        action: 'refactor',
        description: 'Apply the Single Responsibility Principle',
        steps: [
          'Analyze the connections to find logical groupings',
          'Create interfaces for each group of responsibilities',
          'Implement the interface segregation principle'
        ],
        priority: 2,
        estimatedEffort: Math.ceil(totalConnections / 15)
      },
      {
        action: 'investigate',
        description: 'Review if all connections are necessary',
        steps: [
          'Audit each connection to verify it is required',
          'Remove unnecessary dependencies',
          'Document why remaining connections are needed'
        ],
        priority: 3,
        estimatedEffort: 2
      }
    ]
  }
}
