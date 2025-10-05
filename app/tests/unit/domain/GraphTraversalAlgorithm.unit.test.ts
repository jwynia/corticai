/**
 * Unit Tests for GraphTraversalAlgorithm
 *
 * These tests verify the pure business logic of graph traversal algorithms
 * WITHOUT any database dependencies. All I/O is mocked using simple functions.
 *
 * This demonstrates proper separation of concerns:
 * - Business logic is pure and easily testable
 * - No database setup/teardown needed
 * - Tests run in milliseconds
 * - 100% deterministic and reliable
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GraphTraversalAlgorithm } from '../../../src/domain/graph/GraphTraversalAlgorithm'
import { TraversalOptions, TraversalResult } from '../../../src/domain/graph/GraphTraversalAlgorithm'

describe('GraphTraversalAlgorithm', () => {
  let algorithm: GraphTraversalAlgorithm

  beforeEach(() => {
    algorithm = new GraphTraversalAlgorithm()
  })

  describe('breadthFirstTraversal', () => {
    describe('happy path - basic traversal', () => {
      it('should traverse single node graph', async () => {
        // Arrange: Graph with just one node
        const getNeighbors = async (id: string): Promise<string[]> => []

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'outgoing'
        }

        // Act
        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        // Assert
        expect(result.visitedNodes).toEqual(['a'])
        expect(result.depth).toBe(0)
        expect(result.totalNodesVisited).toBe(1)
      })

      it('should traverse linear graph to max depth', async () => {
        // Arrange: Linear graph a -> b -> c -> d
        const getNeighbors = async (id: string): Promise<string[]> => {
          const graph: Record<string, string[]> = {
            'a': ['b'],
            'b': ['c'],
            'c': ['d'],
            'd': []
          }
          return graph[id] || []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 3,
          direction: 'outgoing'
        }

        // Act
        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        // Assert
        expect(result.visitedNodes).toEqual(['a', 'b', 'c', 'd'])
        expect(result.totalNodesVisited).toBe(4)
        expect(result.maxDepthReached).toBe(3)
      })

      it('should traverse tree structure correctly', async () => {
        // Arrange: Tree structure
        //     a
        //    / \
        //   b   c
        //  / \
        // d   e
        const getNeighbors = async (id: string): Promise<string[]> => {
          const graph: Record<string, string[]> = {
            'a': ['b', 'c'],
            'b': ['d', 'e'],
            'c': [],
            'd': [],
            'e': []
          }
          return graph[id] || []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 2,
          direction: 'outgoing'
        }

        // Act
        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        // Assert
        expect(result.visitedNodes).toContain('a')
        expect(result.visitedNodes).toContain('b')
        expect(result.visitedNodes).toContain('c')
        expect(result.visitedNodes).toContain('d')
        expect(result.visitedNodes).toContain('e')
        expect(result.totalNodesVisited).toBe(5)
      })

      it('should handle cyclic graph without infinite loop', async () => {
        // Arrange: Cyclic graph a -> b -> c -> a
        const getNeighbors = async (id: string): Promise<string[]> => {
          const graph: Record<string, string[]> = {
            'a': ['b'],
            'b': ['c'],
            'c': ['a'] // Creates cycle
          }
          return graph[id] || []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 10, // High depth should still terminate
          direction: 'outgoing'
        }

        // Act
        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        // Assert
        expect(result.visitedNodes).toEqual(['a', 'b', 'c'])
        expect(result.totalNodesVisited).toBe(3)
        expect(result.hasCycle).toBe(true)
      })
    })

    describe('edge cases - depth limits', () => {
      it('should stop at maxDepth = 1', async () => {
        const getNeighbors = async (id: string): Promise<string[]> => {
          const graph: Record<string, string[]> = {
            'a': ['b', 'c'],
            'b': ['d'],
            'c': ['e']
          }
          return graph[id] || []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'outgoing'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        // Should visit a and its immediate neighbors (b, c) but not d, e
        expect(result.visitedNodes).toContain('a')
        expect(result.visitedNodes).toContain('b')
        expect(result.visitedNodes).toContain('c')
        expect(result.visitedNodes).not.toContain('d')
        expect(result.visitedNodes).not.toContain('e')
      })

      it('should handle maxDepth = 0', async () => {
        const getNeighbors = async (id: string): Promise<string[]> => ['b', 'c']

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 0,
          direction: 'outgoing'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        expect(result.visitedNodes).toEqual(['a'])
        expect(result.maxDepthReached).toBe(0)
      })
    })

    describe('edge cases - edge type filtering', () => {
      it('should filter by single edge type', async () => {
        // Arrange: Mock that returns edges with type information
        const getNeighborsWithTypes = async (id: string, edgeTypes?: string[]): Promise<string[]> => {
          // Simulating filtered results
          if (!edgeTypes || edgeTypes.includes('KNOWS')) {
            return id === 'a' ? ['b', 'c'] : []
          }
          return []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'outgoing',
          edgeTypes: ['KNOWS']
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighborsWithTypes)

        expect(result.visitedNodes).toContain('a')
        expect(result.visitedNodes).toContain('b')
        expect(result.visitedNodes).toContain('c')
      })

      it('should filter by multiple edge types', async () => {
        const getNeighborsWithTypes = async (id: string, edgeTypes?: string[]): Promise<string[]> => {
          if (!edgeTypes) return []

          const hasKnows = edgeTypes.includes('KNOWS')
          const hasWorks = edgeTypes.includes('WORKS_WITH')

          if (id === 'a' && hasKnows) return ['b']
          if (id === 'a' && hasWorks) return ['c']
          return []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'outgoing',
          edgeTypes: ['KNOWS', 'WORKS_WITH']
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighborsWithTypes)

        expect(result.totalNodesVisited).toBeGreaterThan(1)
      })

      it('should return only start node when no edges match filter', async () => {
        const getNeighborsWithTypes = async (id: string, edgeTypes?: string[]): Promise<string[]> => {
          // No edges of type FRIEND_OF exist
          if (edgeTypes?.includes('FRIEND_OF')) return []
          return ['b', 'c'] // These shouldn't be visited
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'outgoing',
          edgeTypes: ['FRIEND_OF']
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighborsWithTypes)

        expect(result.visitedNodes).toEqual(['a'])
      })
    })

    describe('edge cases - empty and error conditions', () => {
      it('should handle getNeighbors returning empty array', async () => {
        const getNeighbors = async (id: string): Promise<string[]> => []

        const options: TraversalOptions = {
          startNode: 'isolated',
          maxDepth: 5,
          direction: 'outgoing'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        expect(result.visitedNodes).toEqual(['isolated'])
        expect(result.totalNodesVisited).toBe(1)
      })

      it('should handle very large depth values efficiently', async () => {
        const getNeighbors = async (id: string): Promise<string[]> => {
          return id === 'a' ? ['b'] : id === 'b' ? ['c'] : []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1000000, // Very large depth
          direction: 'outgoing'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        // Should terminate quickly despite large depth
        expect(result.visitedNodes).toEqual(['a', 'b', 'c'])
        expect(result.totalNodesVisited).toBe(3)
      })

      it('should handle duplicate neighbors from getNeighbors', async () => {
        const getNeighbors = async (id: string): Promise<string[]> => {
          // Simulating a bug or weird edge case where same node appears multiple times
          return id === 'a' ? ['b', 'b', 'b'] : []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'outgoing'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        // Should only visit 'b' once despite duplicates
        expect(result.visitedNodes).toEqual(['a', 'b'])
        expect(result.totalNodesVisited).toBe(2)
      })
    })

    describe('direction handling', () => {
      it('should respect outgoing direction', async () => {
        // This is tested via the mock's behavior
        const getNeighbors = async (id: string, edgeTypes?: string[], direction?: string): Promise<string[]> => {
          if (direction === 'outgoing' && id === 'a') return ['b']
          return []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'outgoing'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        expect(result.visitedNodes).toContain('a')
        expect(result.visitedNodes).toContain('b')
      })

      it('should respect incoming direction', async () => {
        const getNeighbors = async (id: string, edgeTypes?: string[], direction?: string): Promise<string[]> => {
          if (direction === 'incoming' && id === 'a') return ['c']
          return []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'incoming'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        expect(result.visitedNodes).toContain('a')
        expect(result.visitedNodes).toContain('c')
      })

      it('should respect both direction', async () => {
        const getNeighbors = async (id: string, edgeTypes?: string[], direction?: string): Promise<string[]> => {
          if (direction === 'both' && id === 'a') return ['b', 'c']
          return []
        }

        const options: TraversalOptions = {
          startNode: 'a',
          maxDepth: 1,
          direction: 'both'
        }

        const result = await algorithm.breadthFirstTraversal(options, getNeighbors)

        expect(result.visitedNodes).toContain('a')
        expect(result.visitedNodes).toContain('b')
        expect(result.visitedNodes).toContain('c')
      })
    })
  })

  describe('findConnectedNodes', () => {
    it('should find all nodes within depth', async () => {
      const getNeighbors = async (id: string): Promise<string[]> => {
        const graph: Record<string, string[]> = {
          'a': ['b', 'c'],
          'b': ['d'],
          'c': ['e'],
          'd': [],
          'e': []
        }
        return graph[id] || []
      }

      const result = await algorithm.findConnectedNodes('a', 2, getNeighbors)

      expect(result).toContain('a')
      expect(result).toContain('b')
      expect(result).toContain('c')
      expect(result).toContain('d')
      expect(result).toContain('e')
      expect(result).toHaveLength(5)
    })

    it('should not include start node with excludeStart option', async () => {
      const getNeighbors = async (id: string): Promise<string[]> => {
        return id === 'a' ? ['b', 'c'] : []
      }

      const result = await algorithm.findConnectedNodes('a', 1, getNeighbors, true)

      expect(result).not.toContain('a')
      expect(result).toContain('b')
      expect(result).toContain('c')
    })

    it('should return empty array for isolated node when excluding start', async () => {
      const getNeighbors = async (id: string): Promise<string[]> => []

      const result = await algorithm.findConnectedNodes('isolated', 1, getNeighbors, true)

      expect(result).toEqual([])
    })
  })

  describe('performance characteristics', () => {
    it('should complete traversal quickly for moderately sized graphs', async () => {
      // Create a graph with 100 nodes
      const getNeighbors = async (id: string): Promise<string[]> => {
        const nodeNum = parseInt(id.replace('node', ''))
        if (nodeNum < 100) {
          return [`node${nodeNum + 1}`]
        }
        return []
      }

      const options: TraversalOptions = {
        startNode: 'node0',
        maxDepth: 100,
        direction: 'outgoing'
      }

      const startTime = Date.now()
      const result = await algorithm.breadthFirstTraversal(options, getNeighbors)
      const duration = Date.now() - startTime

      expect(result.totalNodesVisited).toBe(101)
      expect(duration).toBeLessThan(100) // Should complete in < 100ms
    })

    it('should handle wide graphs efficiently', async () => {
      // Graph with one node connected to 1000 neighbors
      const getNeighbors = async (id: string): Promise<string[]> => {
        if (id === 'hub') {
          return Array.from({ length: 1000 }, (_, i) => `leaf${i}`)
        }
        return []
      }

      const options: TraversalOptions = {
        startNode: 'hub',
        maxDepth: 1,
        direction: 'outgoing'
      }

      const startTime = Date.now()
      const result = await algorithm.breadthFirstTraversal(options, getNeighbors)
      const duration = Date.now() - startTime

      expect(result.totalNodesVisited).toBe(1001)
      expect(duration).toBeLessThan(100) // Should complete in < 100ms
    })
  })
})
