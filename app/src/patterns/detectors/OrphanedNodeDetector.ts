/**
 * Orphaned Node Detector
 *
 * Detects nodes with no incoming and/or outgoing edges.
 * These nodes may represent dead code, unused components, or architectural issues.
 */

import { GraphNode, GraphEdge } from '../../storage/types/GraphTypes'
import {
  DetectedPattern,
  OrphanedNode,
  PatternType,
  PatternSeverity,
  PatternDetectionConfig,
  RemediationSuggestion
} from '../types/PatternTypes'
import { randomUUID } from 'crypto'

/**
 * Orphaned Node Detector
 *
 * Identifies nodes that are isolated or partially isolated from the graph.
 */
export class OrphanedNodeDetector {
  /**
   * Detect orphaned nodes in the given graph
   *
   * @param nodes - All nodes in the graph
   * @param edges - All edges in the graph
   * @param config - Optional configuration for detection
   * @returns Array of detected orphaned node patterns
   */
  async detect(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Promise<OrphanedNode[]> {
    const patterns: OrphanedNode[] = []

    // Build incoming and outgoing edge maps
    const incomingEdges = this.buildIncomingEdgeMap(edges, config)
    const outgoingEdges = this.buildOutgoingEdgeMap(edges, config)

    // Check each node for isolation
    for (const node of nodes) {
      // Skip excluded node types
      if (config?.excludedNodeTypes?.includes(node.type)) {
        continue
      }

      const hasIncoming = incomingEdges.get(node.id)?.length ?? 0 > 0
      const hasOutgoing = outgoingEdges.get(node.id)?.length ?? 0 > 0

      // Determine if node should be flagged based on configuration
      const fullyIsolated = !hasIncoming && !hasOutgoing
      const partiallyIsolated = !hasIncoming || !hasOutgoing

      // By default, only detect fully isolated nodes (true orphans)
      // If detectPartiallyIsolatedNodes is true, also detect source/sink nodes
      const shouldDetect = config?.detectPartiallyIsolatedNodes
        ? partiallyIsolated
        : fullyIsolated

      if (shouldDetect) {
        const pattern = this.createOrphanedNodePattern(
          node,
          !hasIncoming,
          !hasOutgoing,
          config
        )
        patterns.push(pattern)
      }
    }

    return patterns
  }

  /**
   * Build map of incoming edges for each node
   */
  private buildIncomingEdgeMap(
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Map<string, GraphEdge[]> {
    const incomingMap = new Map<string, GraphEdge[]>()

    for (const edge of edges) {
      // Skip excluded edge types
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
   * Build map of outgoing edges for each node
   */
  private buildOutgoingEdgeMap(
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Map<string, GraphEdge[]> {
    const outgoingMap = new Map<string, GraphEdge[]>()

    for (const edge of edges) {
      // Skip excluded edge types
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
   * Create OrphanedNode pattern for a detected orphaned node
   */
  private createOrphanedNodePattern(
    node: GraphNode,
    noIncoming: boolean,
    noOutgoing: boolean,
    config?: PatternDetectionConfig
  ): OrphanedNode {
    // Determine severity based on isolation level
    const severity = this.determineSeverity(noIncoming, noOutgoing)

    // Generate remediations
    const remediations = config?.includeRemediations === false
      ? []
      : this.generateRemediations(noIncoming, noOutgoing)

    return {
      id: randomUUID(),
      type: PatternType.ORPHANED_NODE,
      severity,
      description: this.generateDescription(node.id, noIncoming, noOutgoing),
      nodes: [node.id],
      nodeId: node.id,
      noIncoming,
      noOutgoing,
      remediations,
      detectedAt: new Date()
    }
  }

  /**
   * Determine severity based on isolation characteristics
   */
  private determineSeverity(noIncoming: boolean, noOutgoing: boolean): PatternSeverity {
    // Fully isolated (no incoming AND no outgoing) is WARNING
    if (noIncoming && noOutgoing) {
      return PatternSeverity.WARNING
    }

    // Partially isolated (source or sink node) is INFO
    return PatternSeverity.INFO
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(
    nodeId: string,
    noIncoming: boolean,
    noOutgoing: boolean
  ): string {
    if (noIncoming && noOutgoing) {
      return `Orphaned node detected: ${nodeId} has no incoming or outgoing edges (fully isolated)`
    }

    if (noIncoming) {
      return `Source node detected: ${nodeId} has no incoming edges (potential entry point or unused root)`
    }

    if (noOutgoing) {
      return `Sink node detected: ${nodeId} has no outgoing edges (potential endpoint or dead end)`
    }

    // Should not reach here
    return `Orphaned node detected: ${nodeId}`
  }

  /**
   * Generate remediation suggestions based on isolation type
   */
  private generateRemediations(
    noIncoming: boolean,
    noOutgoing: boolean
  ): RemediationSuggestion[] {
    const remediations: RemediationSuggestion[] = []

    if (noIncoming && noOutgoing) {
      // Fully isolated node
      remediations.push({
        action: 'remove',
        description: 'Consider removing this unused node',
        steps: [
          'Verify the node is truly unused and not referenced elsewhere',
          'Check if the node was intentionally isolated for testing',
          'Remove the node if it serves no purpose'
        ],
        priority: 1,
        estimatedEffort: 1
      })

      remediations.push({
        action: 'investigate',
        description: 'Investigate why this node is isolated',
        steps: [
          'Check if this is incomplete implementation',
          'Review if edges were accidentally removed',
          'Verify if the node should be connected to the graph'
        ],
        priority: 2,
        estimatedEffort: 2
      })
    } else if (noIncoming) {
      // Source node (no incoming)
      remediations.push({
        action: 'investigate',
        description: 'Verify if this source node is intentional',
        steps: [
          'Check if this is an entry point (e.g., main function, CLI command)',
          'Verify if this represents an external dependency',
          'Document the node as an intentional entry point if appropriate'
        ],
        priority: 2,
        estimatedEffort: 1
      })

      remediations.push({
        action: 'document',
        description: 'Document this node as a system entry point',
        steps: [
          'Add documentation explaining why this node has no dependencies',
          'Mark the node with metadata indicating it is an entry point',
          'Include the node in architecture diagrams as a root node'
        ],
        priority: 3,
        estimatedEffort: 1
      })
    } else if (noOutgoing) {
      // Sink node (no outgoing)
      remediations.push({
        action: 'investigate',
        description: 'Verify if this sink node is intentional',
        steps: [
          'Check if this is a leaf node (e.g., utility, configuration)',
          'Verify if this represents output/side effects',
          'Document the node as an intentional endpoint if appropriate'
        ],
        priority: 2,
        estimatedEffort: 1
      })

      remediations.push({
        action: 'document',
        description: 'Document this node as a system endpoint',
        steps: [
          'Add documentation explaining why this node has no dependents',
          'Mark the node with metadata indicating it is an endpoint',
          'Include the node in architecture diagrams as a leaf node'
        ],
        priority: 3,
        estimatedEffort: 1
      })
    }

    return remediations
  }
}
