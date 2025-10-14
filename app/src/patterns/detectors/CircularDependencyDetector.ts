/**
 * Circular Dependency Detector
 *
 * Detects circular dependencies in graph structures using Depth-First Search (DFS).
 * Implements Tarjan's algorithm for strongly connected components detection.
 */

import { GraphNode, GraphEdge } from '../../storage/types/GraphTypes'
import {
  DetectedPattern,
  CircularDependency,
  PatternType,
  PatternSeverity,
  PatternDetectionConfig,
  RemediationSuggestion
} from '../types/PatternTypes'
import { randomUUID } from 'crypto'

/**
 * Circular Dependency Detector
 *
 * Uses DFS-based cycle detection to find all circular dependencies in a graph.
 */
export class CircularDependencyDetector {
  /**
   * Detect circular dependencies in the given graph
   *
   * @param nodes - All nodes in the graph
   * @param edges - All edges in the graph
   * @param config - Optional configuration for detection
   * @returns Array of detected circular dependency patterns
   */
  async detect(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Promise<CircularDependency[]> {
    const patterns: CircularDependency[] = []

    // Build adjacency list for efficient traversal
    const adjList = this.buildAdjacencyList(nodes, edges, config)

    // Track visited nodes and nodes in current recursion stack
    const visited = new Set<string>()
    const recStack = new Set<string>()

    // Detect cycles using DFS from each unvisited node
    for (const node of nodes) {
      // Skip excluded node types
      if (config?.excludedNodeTypes?.includes(node.type)) {
        continue
      }

      if (!visited.has(node.id)) {
        const cycles = this.detectCyclesDFS(
          node.id,
          adjList,
          visited,
          recStack,
          []
        )

        // Convert detected cycles to CircularDependency patterns
        for (const cycle of cycles) {
          const pattern = this.createCircularDependencyPattern(
            cycle,
            nodes,
            edges,
            config
          )
          patterns.push(pattern)
        }
      }
    }

    // Deduplicate cycles (same cycle detected from different starting points)
    const uniquePatterns = this.deduplicateCycles(patterns)

    return uniquePatterns
  }

  /**
   * Build adjacency list from edges, respecting configuration
   */
  private buildAdjacencyList(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): Map<string, string[]> {
    const adjList = new Map<string, string[]>()

    // Initialize adjacency list for all nodes
    for (const node of nodes) {
      if (!config?.excludedNodeTypes?.includes(node.type)) {
        adjList.set(node.id, [])
      }
    }

    // Add edges to adjacency list
    for (const edge of edges) {
      // Skip excluded edge types
      if (config?.excludedEdgeTypes?.includes(edge.type)) {
        continue
      }

      // Skip edges involving excluded node types
      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)
      if (
        !fromNode ||
        !toNode ||
        config?.excludedNodeTypes?.includes(fromNode.type) ||
        config?.excludedNodeTypes?.includes(toNode.type)
      ) {
        continue
      }

      const neighbors = adjList.get(edge.from) || []
      neighbors.push(edge.to)
      adjList.set(edge.from, neighbors)
    }

    return adjList
  }

  /**
   * Detect cycles using Depth-First Search
   *
   * @param nodeId - Current node being visited
   * @param adjList - Adjacency list representation of graph
   * @param visited - Set of visited nodes
   * @param recStack - Set of nodes in current recursion stack
   * @param path - Current path being explored
   * @returns Array of detected cycles
   */
  private detectCyclesDFS(
    nodeId: string,
    adjList: Map<string, string[]>,
    visited: Set<string>,
    recStack: Set<string>,
    path: string[]
  ): string[][] {
    const cycles: string[][] = []

    // Mark current node as visited and add to recursion stack
    visited.add(nodeId)
    recStack.add(nodeId)
    path.push(nodeId)

    // Get neighbors
    const neighbors = adjList.get(nodeId) || []

    // Visit all neighbors
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        // Unvisited neighbor - continue DFS
        const nestedCycles = this.detectCyclesDFS(
          neighbor,
          adjList,
          visited,
          recStack,
          [...path]
        )
        cycles.push(...nestedCycles)
      } else if (recStack.has(neighbor)) {
        // Neighbor is in recursion stack - cycle detected!
        const cycle = this.extractCycle(path, neighbor)
        cycles.push(cycle)
      }
      // If visited but not in recStack, it's a cross-edge (not a cycle)
    }

    // Remove from recursion stack before backtracking
    recStack.delete(nodeId)

    return cycles
  }

  /**
   * Extract cycle from path when back edge is detected
   *
   * @param path - Current DFS path
   * @param backEdgeTarget - Target of the back edge (where cycle starts)
   * @returns Array of node IDs forming the cycle
   */
  private extractCycle(path: string[], backEdgeTarget: string): string[] {
    const cycleStartIndex = path.indexOf(backEdgeTarget)
    if (cycleStartIndex === -1) {
      // Should not happen, but handle gracefully
      return []
    }

    // Extract cycle: from backEdgeTarget to end of path, plus backEdgeTarget again to close the cycle
    const cycle = path.slice(cycleStartIndex)
    cycle.push(backEdgeTarget) // Close the cycle

    return cycle
  }

  /**
   * Create CircularDependency pattern from detected cycle
   */
  private createCircularDependencyPattern(
    cycle: string[],
    nodes: GraphNode[],
    edges: GraphEdge[],
    config?: PatternDetectionConfig
  ): CircularDependency {
    // Get unique nodes in cycle (exclude the closing duplicate)
    const uniqueNodes = Array.from(new Set(cycle.slice(0, -1)))

    // Determine severity
    const severity = this.determineSeverity(cycle, uniqueNodes)

    // Extract edges forming the cycle
    const cycleEdges = this.extractCycleEdges(cycle, edges)

    // Generate remediations
    const remediations = config?.includeRemediations === false
      ? []
      : this.generateRemediations(cycle, uniqueNodes)

    return {
      id: randomUUID(),
      type: PatternType.CIRCULAR_DEPENDENCY,
      severity,
      description: this.generateDescription(cycle, uniqueNodes),
      nodes: uniqueNodes,
      edges: cycleEdges,
      remediations,
      cycle,
      cycleLength: uniqueNodes.length,
      detectedAt: new Date()
    }
  }

  /**
   * Determine severity based on cycle characteristics
   */
  private determineSeverity(cycle: string[], uniqueNodes: string[]): PatternSeverity {
    // Self-reference (A → A) is ERROR
    if (uniqueNodes.length === 1) {
      return PatternSeverity.ERROR
    }

    // Short cycles (2-3 nodes) are WARNING
    if (uniqueNodes.length <= 3) {
      return PatternSeverity.WARNING
    }

    // Longer cycles (4+ nodes) are INFO (less critical, harder to untangle)
    return PatternSeverity.INFO
  }

  /**
   * Extract edges that form the cycle
   */
  private extractCycleEdges(
    cycle: string[],
    allEdges: GraphEdge[]
  ): Array<{ from: string; to: string; type: string }> {
    const cycleEdges: Array<{ from: string; to: string; type: string }> = []

    for (let i = 0; i < cycle.length - 1; i++) {
      const from = cycle[i]
      const to = cycle[i + 1]

      // Find the edge (there might be multiple edges between same nodes)
      const edge = allEdges.find(e => e.from === from && e.to === to)
      if (edge) {
        cycleEdges.push({
          from: edge.from,
          to: edge.to,
          type: edge.type
        })
      }
    }

    return cycleEdges
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(cycle: string[], uniqueNodes: string[]): string {
    if (uniqueNodes.length === 1) {
      return `Self-referencing circular dependency detected: ${uniqueNodes[0]} references itself`
    }

    const cycleString = cycle.join(' → ')
    return `Circular dependency detected: ${cycleString}`
  }

  /**
   * Generate remediation suggestions
   */
  private generateRemediations(cycle: string[], uniqueNodes: string[]): RemediationSuggestion[] {
    const remediations: RemediationSuggestion[] = []

    if (uniqueNodes.length === 1) {
      // Self-reference
      remediations.push({
        action: 'refactor',
        description: 'Remove self-reference by extracting shared logic',
        steps: [
          'Identify the shared logic causing the self-reference',
          'Extract shared logic into a separate utility/helper',
          'Update the node to use the extracted utility instead'
        ],
        priority: 1,
        estimatedEffort: 2
      })
    } else if (uniqueNodes.length === 2) {
      // Two-node cycle - often can be refactored
      remediations.push({
        action: 'refactor',
        description: 'Break the cycle by introducing an interface or abstraction',
        steps: [
          'Identify the direction of the primary dependency',
          'Create an interface for the reverse dependency',
          'Use dependency injection to break the direct cycle'
        ],
        priority: 1,
        estimatedEffort: 3
      })
    } else {
      // Multi-node cycle
      remediations.push({
        action: 'split',
        description: 'Consider splitting one of the nodes to break the cycle',
        steps: [
          'Identify the weakest link in the cycle',
          'Split the node into smaller, more focused components',
          'Re-route dependencies through the new structure'
        ],
        priority: 2,
        estimatedEffort: 5
      })

      remediations.push({
        action: 'investigate',
        description: 'Analyze if the circular dependency is intentional',
        steps: [
          'Review the business logic requiring the cycle',
          'Check if all dependencies in the cycle are necessary',
          'Document the rationale if the cycle is unavoidable'
        ],
        priority: 3,
        estimatedEffort: 1
      })
    }

    return remediations
  }

  /**
   * Deduplicate cycles that are the same cycle detected from different starting points
   *
   * For example, [A, B, C, A] and [B, C, A, B] are the same cycle
   */
  private deduplicateCycles(patterns: CircularDependency[]): CircularDependency[] {
    const uniquePatterns: CircularDependency[] = []
    const seen = new Set<string>()

    for (const pattern of patterns) {
      // Create normalized cycle representation
      const normalized = this.normalizeCycle(pattern.cycle)

      if (!seen.has(normalized)) {
        seen.add(normalized)
        uniquePatterns.push(pattern)
      }
    }

    return uniquePatterns
  }

  /**
   * Normalize cycle representation for deduplication
   *
   * Cycles like [A, B, C, A] and [B, C, A, B] are the same cycle.
   * Normalize by finding the lexicographically smallest rotation.
   */
  private normalizeCycle(cycle: string[]): string {
    // Remove the closing duplicate
    const nodes = cycle.slice(0, -1)

    if (nodes.length === 0) {
      return ''
    }

    // Find the lexicographically smallest rotation
    // Using JSON.stringify for array comparison provides correct lexicographic ordering
    let minRotation = nodes
    for (let i = 1; i < nodes.length; i++) {
      const rotation = [...nodes.slice(i), ...nodes.slice(0, i)]
      if (JSON.stringify(rotation) < JSON.stringify(minRotation)) {
        minRotation = rotation
      }
    }

    return JSON.stringify(minRotation)
  }
}
