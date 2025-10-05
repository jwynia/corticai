/**
 * Graph Traversal Algorithm - Pure Business Logic
 *
 * This class contains ZERO I/O operations and ZERO database dependencies.
 * All graph traversal logic is pure, testable, and framework-independent.
 *
 * The algorithm accepts a function to fetch neighbors, allowing it to work
 * with any data source (database, in-memory, mock, etc.) through dependency injection.
 *
 * This design follows:
 * - Single Responsibility Principle (only traversal logic)
 * - Dependency Inversion Principle (depends on abstractions, not concrete implementations)
 * - Open/Closed Principle (extensible without modification)
 *
 * Key Benefits:
 * - 100% unit testable without database
 * - No side effects or hidden dependencies
 * - Deterministic and easy to reason about
 * - Reusable across different storage backends
 */

/**
 * Options for graph traversal
 */
export interface TraversalOptions {
  /** Starting node ID */
  startNode: string

  /** Maximum depth to traverse (0 = just start node, 1 = immediate neighbors, etc.) */
  maxDepth: number

  /** Direction of traversal */
  direction: 'outgoing' | 'incoming' | 'both'

  /** Optional: Filter by specific edge types */
  edgeTypes?: string[]
}

/**
 * Result of a graph traversal operation
 */
export interface TraversalResult {
  /** Nodes visited in BFS order */
  visitedNodes: string[]

  /** Total number of nodes visited */
  totalNodesVisited: number

  /** Maximum depth actually reached */
  maxDepthReached: number

  /** Depth at which each node was discovered */
  depth: number

  /** Whether a cycle was detected during traversal */
  hasCycle: boolean
}

/**
 * Type for the neighbor fetching function
 * This is the abstraction that allows us to avoid I/O dependencies
 */
export type NeighborFetcher = (
  nodeId: string,
  edgeTypes?: string[],
  direction?: 'outgoing' | 'incoming' | 'both'
) => Promise<string[]>

/**
 * Pure graph traversal algorithms with zero dependencies
 */
export class GraphTraversalAlgorithm {
  /**
   * Perform breadth-first traversal of a graph
   *
   * This is a pure function with no side effects. It accepts a function
   * to fetch neighbors, making it completely independent of any storage implementation.
   *
   * Algorithm:
   * 1. Start with the initial node in a queue
   * 2. While queue is not empty:
   *    a. Dequeue a node
   *    b. If already visited or beyond max depth, skip
   *    c. Mark as visited
   *    d. Fetch neighbors using the provided function
   *    e. Add unvisited neighbors to queue with incremented depth
   *
   * @param options - Traversal configuration
   * @param getNeighbors - Function to fetch neighbors (injected dependency)
   * @returns Traversal result with visited nodes and metadata
   */
  async breadthFirstTraversal(
    options: TraversalOptions,
    getNeighbors: NeighborFetcher
  ): Promise<TraversalResult> {
    const { startNode, maxDepth, direction, edgeTypes } = options

    // Track visited nodes to avoid cycles
    const visited = new Set<string>()

    // Queue stores [nodeId, depth] pairs
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: startNode, depth: 0 }
    ]

    // Result in BFS order
    const visitedNodesInOrder: string[] = []
    let maxDepthReached = 0
    let hasCycle = false

    while (queue.length > 0) {
      const current = queue.shift()!
      const { nodeId, depth } = current

      // Skip if already visited (indicates cycle)
      if (visited.has(nodeId)) {
        hasCycle = true
        continue
      }

      // Skip if beyond max depth
      if (depth > maxDepth) {
        continue
      }

      // Mark as visited
      visited.add(nodeId)
      visitedNodesInOrder.push(nodeId)
      maxDepthReached = Math.max(maxDepthReached, depth)

      // Don't fetch neighbors if we're at max depth
      if (depth === maxDepth) {
        continue
      }

      // Fetch neighbors using injected function
      try {
        const neighbors = await getNeighbors(nodeId, edgeTypes, direction)

        // Add unvisited neighbors to queue
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            queue.push({ nodeId: neighborId, depth: depth + 1 })
          } else {
            // Detected a back edge (cycle)
            hasCycle = true
          }
        }
      } catch (error) {
        // If fetching neighbors fails, continue with other nodes
        // The error will be logged by the repository layer
        continue
      }
    }

    return {
      visitedNodes: visitedNodesInOrder,
      totalNodesVisited: visitedNodesInOrder.length,
      maxDepthReached,
      depth: maxDepthReached,
      hasCycle
    }
  }

  /**
   * Find all nodes connected to a given node within specified depth
   *
   * This is a convenience wrapper around breadthFirstTraversal that
   * returns just the node IDs rather than full traversal metadata.
   *
   * @param startNode - Node to start from
   * @param maxDepth - Maximum depth to search
   * @param getNeighbors - Function to fetch neighbors
   * @param excludeStart - Whether to exclude the start node from results (default: false)
   * @returns Array of connected node IDs
   */
  async findConnectedNodes(
    startNode: string,
    maxDepth: number,
    getNeighbors: NeighborFetcher,
    excludeStart: boolean = false
  ): Promise<string[]> {
    const result = await this.breadthFirstTraversal(
      {
        startNode,
        maxDepth,
        direction: 'both' // Search in all directions for connectivity
      },
      getNeighbors
    )

    if (excludeStart) {
      return result.visitedNodes.filter(id => id !== startNode)
    }

    return result.visitedNodes
  }
}
