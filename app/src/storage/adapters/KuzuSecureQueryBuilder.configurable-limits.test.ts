/**
 * Tests for Configurable Query Result Limits in KuzuSecureQueryBuilder
 *
 * These tests verify that query result limits can be configured via options
 * while maintaining sensible defaults and preventing resource exhaustion.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { KuzuSecureQueryBuilder } from './KuzuSecureQueryBuilder'

// Mock connection since we're only testing query string generation
const mockConnection = {
  prepare: () => ({ isSuccess: () => true }),
  execute: () => ({})
} as any

describe('KuzuSecureQueryBuilder - Configurable Result Limits', () => {
  let queryBuilder: KuzuSecureQueryBuilder

  beforeEach(() => {
    queryBuilder = new KuzuSecureQueryBuilder(mockConnection)
  })

  describe('buildTraversalQuery', () => {
    describe('default limits', () => {
      it('should use default limit of 100 for traversal queries when no limit specified', () => {
        const query = queryBuilder.buildTraversalQuery('node1', '-[r*1..2]->', 2)

        expect(query.statement).toContain('LIMIT 100')
      })

      it('should use default limit for single-hop traversal', () => {
        const query = queryBuilder.buildTraversalQuery('node1', '-[r:Relationship]->', 1)

        expect(query.statement).toContain('LIMIT 100')
      })
    })

    describe('custom limits', () => {
      it('should use custom limit when provided in options', () => {
        const query = queryBuilder.buildTraversalQuery(
          'node1',
          '-[r*1..2]->',
          2,
          undefined,
          { resultLimit: 50 }
        )

        expect(query.statement).toContain('LIMIT 50')
        expect(query.statement).not.toContain('LIMIT 100')
      })

      it('should accept limit of 1 for minimal results', () => {
        const query = queryBuilder.buildTraversalQuery(
          'node1',
          '-[r*1..2]->',
          2,
          undefined,
          { resultLimit: 1 }
        )

        expect(query.statement).toContain('LIMIT 1')
      })

      it('should accept maximum limit of 10000', () => {
        const query = queryBuilder.buildTraversalQuery(
          'node1',
          '-[r*1..2]->',
          2,
          undefined,
          { resultLimit: 10000 }
        )

        expect(query.statement).toContain('LIMIT 10000')
      })

      it('should accept medium-sized limits', () => {
        const query = queryBuilder.buildTraversalQuery(
          'node1',
          '-[r*1..2]->',
          2,
          undefined,
          { resultLimit: 500 }
        )

        expect(query.statement).toContain('LIMIT 500')
      })
    })

    describe('limit validation', () => {
      it('should reject limit of 0', () => {
        expect(() => {
          queryBuilder.buildTraversalQuery(
            'node1',
            '-[r*1..2]->',
            2,
            undefined,
            { resultLimit: 0 }
          )
        }).toThrow('Result limit must be positive')
      })

      it('should reject negative limits', () => {
        expect(() => {
          queryBuilder.buildTraversalQuery(
            'node1',
            '-[r*1..2]->',
            2,
            undefined,
            { resultLimit: -1 }
          )
        }).toThrow('Result limit must be positive')
      })

      it('should reject limits exceeding maximum of 10000', () => {
        expect(() => {
          queryBuilder.buildTraversalQuery(
            'node1',
            '-[r*1..2]->',
            2,
            undefined,
            { resultLimit: 10001 }
          )
        }).toThrow('Result limit exceeds maximum allowed limit of 10000')
      })

      it('should reject non-integer limits', () => {
        expect(() => {
          queryBuilder.buildTraversalQuery(
            'node1',
            '-[r*1..2]->',
            2,
            undefined,
            { resultLimit: 50.5 }
          )
        }).toThrow('Result limit must be an integer')
      })

      it('should reject NaN as limit', () => {
        expect(() => {
          queryBuilder.buildTraversalQuery(
            'node1',
            '-[r*1..2]->',
            2,
            undefined,
            { resultLimit: NaN }
          )
        }).toThrow('Result limit must be an integer')
      })

      it('should reject Infinity as limit', () => {
        expect(() => {
          queryBuilder.buildTraversalQuery(
            'node1',
            '-[r*1..2]->',
            2,
            undefined,
            { resultLimit: Infinity }
          )
        }).toThrow('Result limit must be an integer')
      })
    })

    describe('backward compatibility', () => {
      it('should work without options parameter (backward compatible)', () => {
        const query = queryBuilder.buildTraversalQuery('node1', '-[r*1..2]->', 2)

        expect(query.statement).toBeDefined()
        expect(query.statement).toContain('LIMIT 100')
      })

      it('should work with empty options object', () => {
        const query = queryBuilder.buildTraversalQuery(
          'node1',
          '-[r*1..2]->',
          2,
          undefined,
          {}
        )

        expect(query.statement).toContain('LIMIT 100')
      })
    })
  })

  describe('buildFindConnectedQuery', () => {
    describe('default limits', () => {
      it('should use default limit of 1000 for connected node queries', () => {
        const query = queryBuilder.buildFindConnectedQuery('node1', 3)

        expect(query.statement).toContain('LIMIT 1000')
      })
    })

    describe('custom limits', () => {
      it('should use custom limit when provided in options', () => {
        const query = queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 100 })

        expect(query.statement).toContain('LIMIT 100')
        expect(query.statement).not.toContain('LIMIT 1000')
      })

      it('should accept limit of 1 for minimal results', () => {
        const query = queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 1 })

        expect(query.statement).toContain('LIMIT 1')
      })

      it('should accept maximum limit of 10000', () => {
        const query = queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 10000 })

        expect(query.statement).toContain('LIMIT 10000')
      })

      it('should accept medium-sized limits', () => {
        const query = queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 2500 })

        expect(query.statement).toContain('LIMIT 2500')
      })
    })

    describe('limit validation', () => {
      it('should reject limit of 0', () => {
        expect(() => {
          queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 0 })
        }).toThrow('Result limit must be positive')
      })

      it('should reject negative limits', () => {
        expect(() => {
          queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: -100 })
        }).toThrow('Result limit must be positive')
      })

      it('should reject limits exceeding maximum of 10000', () => {
        expect(() => {
          queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 15000 })
        }).toThrow('Result limit exceeds maximum allowed limit of 10000')
      })

      it('should reject non-integer limits', () => {
        expect(() => {
          queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 100.7 })
        }).toThrow('Result limit must be an integer')
      })

      it('should reject NaN as limit', () => {
        expect(() => {
          queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: NaN })
        }).toThrow('Result limit must be an integer')
      })
    })

    describe('backward compatibility', () => {
      it('should work without options parameter (backward compatible)', () => {
        const query = queryBuilder.buildFindConnectedQuery('node1', 3)

        expect(query.statement).toBeDefined()
        expect(query.statement).toContain('LIMIT 1000')
      })

      it('should work with empty options object', () => {
        const query = queryBuilder.buildFindConnectedQuery('node1', 3, {})

        expect(query.statement).toContain('LIMIT 1000')
      })
    })
  })

  describe('buildShortestPathQuery', () => {
    describe('default limits', () => {
      it('should use default limit of 1 for shortest path queries', () => {
        const query = queryBuilder.buildShortestPathQuery('node1', 'node2', 5)

        // Shortest path should always return at most 1 result by default
        expect(query.statement).toContain('LIMIT 1')
      })
    })

    describe('custom limits', () => {
      it('should allow custom limit for multiple shortest paths', () => {
        const query = queryBuilder.buildShortestPathQuery(
          'node1',
          'node2',
          5,
          { resultLimit: 5 }
        )

        expect(query.statement).toContain('LIMIT 5')
        expect(query.statement).not.toContain('LIMIT 1')
      })

      it('should accept limit of 1 (default behavior)', () => {
        const query = queryBuilder.buildShortestPathQuery(
          'node1',
          'node2',
          5,
          { resultLimit: 1 }
        )

        expect(query.statement).toContain('LIMIT 1')
      })

      it('should accept maximum limit of 10000', () => {
        const query = queryBuilder.buildShortestPathQuery(
          'node1',
          'node2',
          5,
          { resultLimit: 10000 }
        )

        expect(query.statement).toContain('LIMIT 10000')
      })
    })

    describe('limit validation', () => {
      it('should reject limit of 0', () => {
        expect(() => {
          queryBuilder.buildShortestPathQuery('node1', 'node2', 5, { resultLimit: 0 })
        }).toThrow('Result limit must be positive')
      })

      it('should reject negative limits', () => {
        expect(() => {
          queryBuilder.buildShortestPathQuery('node1', 'node2', 5, { resultLimit: -1 })
        }).toThrow('Result limit must be positive')
      })

      it('should reject limits exceeding maximum', () => {
        expect(() => {
          queryBuilder.buildShortestPathQuery('node1', 'node2', 5, { resultLimit: 20000 })
        }).toThrow('Result limit exceeds maximum allowed limit of 10000')
      })

      it('should reject non-integer limits', () => {
        expect(() => {
          queryBuilder.buildShortestPathQuery('node1', 'node2', 5, { resultLimit: 3.14 })
        }).toThrow('Result limit must be an integer')
      })
    })

    describe('backward compatibility', () => {
      it('should work without options parameter (backward compatible)', () => {
        const query = queryBuilder.buildShortestPathQuery('node1', 'node2', 5)

        expect(query.statement).toBeDefined()
        expect(query.statement).toContain('LIMIT 1')
      })

      it('should work with empty options object', () => {
        const query = queryBuilder.buildShortestPathQuery('node1', 'node2', 5, {})

        expect(query.statement).toContain('LIMIT 1')
      })
    })
  })

  describe('default constants', () => {
    it('should use 100 as default for traversal operations', () => {
      const query1 = queryBuilder.buildTraversalQuery('node1', '-[r*1..2]->', 2)
      expect(query1.statement).toContain('LIMIT 100')
    })

    it('should use 1000 as default for search operations', () => {
      const query2 = queryBuilder.buildFindConnectedQuery('node1', 3)
      expect(query2.statement).toContain('LIMIT 1000')
    })

    it('should use 1 as default for shortest path operations', () => {
      const query3 = queryBuilder.buildShortestPathQuery('node1', 'node2', 5)
      expect(query3.statement).toContain('LIMIT 1')
    })
  })

  describe('edge cases', () => {
    it('should handle very large but valid limits', () => {
      const query = queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 9999 })

      expect(query.statement).toContain('LIMIT 9999')
    })

    it('should handle limit exactly at boundary (10000)', () => {
      const query = queryBuilder.buildTraversalQuery(
        'node1',
        '-[r*1..2]->',
        2,
        undefined,
        { resultLimit: 10000 }
      )

      expect(query.statement).toContain('LIMIT 10000')
    })

    it('should handle limit exactly at lower boundary (1)', () => {
      const query = queryBuilder.buildFindConnectedQuery('node1', 3, { resultLimit: 1 })

      expect(query.statement).toContain('LIMIT 1')
    })
  })
})
