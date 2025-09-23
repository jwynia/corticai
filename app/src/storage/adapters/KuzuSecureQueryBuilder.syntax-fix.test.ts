/**
 * Tests for KuzuSecureQueryBuilder with Kuzu 0.11.2
 *
 * These tests verify that the query builder correctly uses Kuzu 0.11.2's
 * support for variable-length paths and SHORTEST path algorithms.
 */

import { describe, it, expect } from 'vitest'
import { KuzuSecureQueryBuilder } from './KuzuSecureQueryBuilder'

// Mock connection since we're only testing query string generation
const mockConnection = {
  prepare: () => ({ isSuccess: () => true }),
  execute: () => ({})
} as any

describe('KuzuSecureQueryBuilder Syntax Fixes', () => {
  let queryBuilder: KuzuSecureQueryBuilder

  beforeEach(() => {
    queryBuilder = new KuzuSecureQueryBuilder(mockConnection)
  })

  describe('buildTraversalQuery', () => {
    it('should construct variable-length relationship query with Kuzu 0.11.2', () => {
      const query = queryBuilder.buildTraversalQuery(
        'node1',
        '-[r:Relationship*1..3]->',
        3,
        ['TYPE1', 'TYPE2']
      )

      // Should contain variable-length syntax (now supported in Kuzu 0.11.2)
      expect(query.statement).toContain('*1..3')

      // Should use variable-length traversal
      expect(query.statement).toContain('-[r:Relationship*1..3]-')

      // Should parameterize the node ID
      expect(query.statement).toContain('$startNodeId')

      // Edge type filtering is now done in post-processing, so no WHERE clause
      expect(query.statement).not.toContain('WHERE')

      // Should not have maxDepth or edgeTypes as parameters since they're now handled differently
      expect(query.parameters).not.toHaveProperty('maxDepth')
      expect(query.parameters).not.toHaveProperty('edgeTypes')
      expect(query.parameters.startNodeId).toBe('node1')
    })

    it('should handle queries without edge type filtering', () => {
      const query = queryBuilder.buildTraversalQuery('node1', '-[r*1..2]->', 2)

      // Should use variable-length without edge type filtering
      expect(query.statement).toContain('*1..2')
      expect(query.statement).toContain('-[r:Relationship*1..2]-')
      expect(query.statement).not.toContain('WHERE ALL')
      expect(query.parameters).not.toHaveProperty('edgeTypes')
      expect(query.parameters.startNodeId).toBe('node1')
    })

    it('should return proper result structure for variable-length traversal', () => {
      const query = queryBuilder.buildTraversalQuery('node1', '-[r*1..2]->', 2)

      // Should return path and path length information
      expect(query.statement).toContain('RETURN path')
      expect(query.statement).toContain('length(r) as pathLength')
      expect(query.statement).toContain('LIMIT 100')
    })
  })

  describe('buildFindConnectedQuery', () => {
    it('should construct variable-length bidirectional query with Kuzu 0.11.2', () => {
      const query = queryBuilder.buildFindConnectedQuery('node1', 3)

      // Should contain variable-length syntax (now supported in Kuzu 0.11.2)
      expect(query.statement).toContain('*1..3')

      // Should use variable-length bidirectional relationship
      expect(query.statement).toContain('-[*1..3]-(connected:Entity)')

      // Should still parameterize the node ID
      expect(query.statement).toContain('$nodeId')

      // Depth is now embedded in the query string as a literal
      expect(query.parameters).not.toHaveProperty('depth')
      expect(query.parameters.nodeId).toBe('node1')
    })

    it('should exclude the starting node from results', () => {
      const query = queryBuilder.buildFindConnectedQuery('node1', 2)

      // Should have WHERE clause to exclude starting node
      expect(query.statement).toContain('WHERE connected.id <> $nodeId')
      expect(query.statement).toContain('DISTINCT')
    })
  })

  describe('buildShortestPathQuery', () => {
    it('should construct SHORTEST path query with Kuzu 0.11.2', () => {
      const query = queryBuilder.buildShortestPathQuery('from1', 'to1', 5)

      // Should contain SHORTEST syntax (now supported in Kuzu 0.11.2)
      expect(query.statement).toContain('SHORTEST')

      // Should use SHORTEST path algorithm
      expect(query.statement).toContain('(sourceNode:Entity {id: $fromId})-[r* SHORTEST 1..5]-(targetNode:Entity {id: $toId})')

      // Should still parameterize the node IDs
      expect(query.statement).toContain('$fromId')
      expect(query.statement).toContain('$toId')

      // Should not have maxDepth as a parameter (embedded in query)
      expect(query.parameters).not.toHaveProperty('maxDepth')
      expect(query.parameters.fromId).toBe('from1')
      expect(query.parameters.toId).toBe('to1')
    })

    it('should return path and length information', () => {
      const query = queryBuilder.buildShortestPathQuery('from', 'to', 2)

      // Should return path and path length
      expect(query.statement).toContain('RETURN path')
      expect(query.statement).toContain('length(r) as pathLength')
      expect(query.statement).toContain('LIMIT 1')
    })
  })

  describe('Input validation', () => {
    it('should validate depth parameters to prevent injection', () => {
      // Should reject negative depths
      expect(() => queryBuilder.buildTraversalQuery('node1', '-[r*1..(-1)]->', -1))
        .toThrow('Invalid depth parameter: depth must be positive')

      expect(() => queryBuilder.buildFindConnectedQuery('node1', -1))
        .toThrow('Invalid depth parameter: depth must be positive')

      expect(() => queryBuilder.buildShortestPathQuery('from', 'to', -1))
        .toThrow('Invalid depth parameter: depth must be positive')
    })

    it('should limit maximum depth to prevent performance issues', () => {
      // Should reject excessive depths
      expect(() => queryBuilder.buildTraversalQuery('node1', '-[r*1..1000]->', 1000))
        .toThrow('Depth exceeds maximum allowed limit of 50')

      expect(() => queryBuilder.buildFindConnectedQuery('node1', 1000))
        .toThrow('Depth exceeds maximum allowed limit of 50')

      expect(() => queryBuilder.buildShortestPathQuery('from', 'to', 1000))
        .toThrow('Depth exceeds maximum allowed limit of 50')
    })

    it('should validate that depth is an integer', () => {
      expect(() => queryBuilder.buildTraversalQuery('node1', '-[r*1..2.5]->', 2.5 as any))
        .toThrow('Depth must be an integer')
    })
  })

  describe('Security validation', () => {
    it('should ensure all user input is still parameterized except depth patterns', () => {
      const query = queryBuilder.buildTraversalQuery(
        'malicious\'); DROP TABLE entities; --',
        '-[r*1..3]->',
        3,
        ['TYPE1', 'TYPE2']
      )

      // Malicious input should be safely parameterized
      expect(query.parameters.startNodeId).toBe('malicious\'); DROP TABLE entities; --')
      expect(query.statement).not.toContain('DROP TABLE')
      expect(query.statement).toContain('$startNodeId')
    })
  })
})