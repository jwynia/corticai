/**
 * Unit tests for DuckDBSemanticQueryBuilder
 *
 * Test Strategy: Test-First Development (TDD)
 * - Write tests BEFORE implementation
 * - Cover all public methods
 * - Test edge cases and error conditions
 * - Follow the proven pattern from DuckDBParquetOperations tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DuckDBConnection } from '@duckdb/node-api'
import {
  DuckDBSemanticQueryBuilder,
  DuckDBSemanticQueryBuilderDeps
} from '../../../src/storage/adapters/DuckDBSemanticQueryBuilder'
import {
  SemanticQuery,
  SemanticQueryResult,
  AggregationOperator,
  QueryFilter
} from '../../../src/storage/interfaces/SemanticStorage'
import { DuckDBSQLGenerator } from '../../../src/storage/adapters/DuckDBSQLGenerator'

// Mock DuckDBSQLGenerator
vi.mock('../../../src/storage/adapters/DuckDBSQLGenerator', () => ({
  DuckDBSQLGenerator: {
    executeQuery: vi.fn()
  }
}))

describe('DuckDBSemanticQueryBuilder', () => {
  let mockConnection: DuckDBConnection
  let mockConfig: DuckDBSemanticQueryBuilderDeps
  let builder: DuckDBSemanticQueryBuilder
  let mockLog: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset DuckDBSQLGenerator mock
    vi.clearAllMocks()

    // Create default mock prepared statement (can be overridden in tests)
    const createMockPrepared = (data: any[] = []) => ({
      run: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue(data),
      runAndReadAll: vi.fn().mockResolvedValue({
        getRowObjectsJS: () => data
      }),
      bind: vi.fn()
    })

    // Create mock connection
    mockConnection = {
      run: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue([]),
      prepare: vi.fn().mockImplementation(() => Promise.resolve(createMockPrepared())),
      runAndReadAll: vi.fn().mockResolvedValue({
        getRowObjectsJS: () => []
      })
    } as any

    // Create mock logging function
    mockLog = vi.fn()

    // Create mock configuration
    mockConfig = {
      connection: mockConnection,
      debug: false,
      log: mockLog
    }

    // Create builder instance
    builder = new DuckDBSemanticQueryBuilder(mockConfig)
  })

  // ============================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ============================================================================

  describe('constructor', () => {
    it('should create instance with valid configuration', () => {
      expect(builder).toBeDefined()
      expect(builder).toBeInstanceOf(DuckDBSemanticQueryBuilder)
    })

    it('should use default values for optional configuration', () => {
      const minimalConfig: DuckDBSemanticQueryBuilderDeps = {
        connection: mockConnection
      }

      const minimalBuilder = new DuckDBSemanticQueryBuilder(minimalConfig)
      expect(minimalBuilder).toBeDefined()
    })

    it('should store configuration dependencies', () => {
      expect(builder).toBeDefined()
    })
  })

  // ============================================================================
  // SQL BUILDING - BASIC SELECT
  // ============================================================================

  describe('buildSQLFromSemanticQuery', () => {
    it('should build basic SELECT * FROM table query', () => {
      const query: SemanticQuery = {
        from: 'entities'
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities')
      expect(result.params).toEqual([])
    })

    it('should build SELECT with specific fields', () => {
      const query: SemanticQuery = {
        from: 'entities',
        select: ['id', 'type', 'created_at']
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT id, type, created_at FROM entities')
      expect(result.params).toEqual([])
    })

    it('should handle empty select array as SELECT *', () => {
      const query: SemanticQuery = {
        from: 'entities',
        select: []
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities')
    })
  })

  // ============================================================================
  // SQL BUILDING - WHERE CLAUSES
  // ============================================================================

  describe('buildSQLFromSemanticQuery - WHERE clauses', () => {
    it('should build WHERE clause with single filter', () => {
      const query: SemanticQuery = {
        from: 'entities',
        where: [
          { field: 'type', operator: '=', value: 'File' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities WHERE type = $1')
      expect(result.params).toEqual(['File'])
    })

    it('should build WHERE clause with multiple filters (AND logic)', () => {
      const query: SemanticQuery = {
        from: 'entities',
        where: [
          { field: 'type', operator: '=', value: 'File' },
          { field: 'status', operator: '!=', value: 'deleted' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities WHERE type = $1 AND status != $2')
      expect(result.params).toEqual(['File', 'deleted'])
    })

    it('should handle various comparison operators', () => {
      const operators = ['=', '!=', '>', '<', '>=', '<='] as const

      operators.forEach((op, index) => {
        const query: SemanticQuery = {
          from: 'test',
          where: [{ field: 'value', operator: op, value: 100 }]
        }

        const result = builder.buildSQLFromSemanticQuery(query)
        expect(result.sql).toBe(`SELECT * FROM test WHERE value ${op} $1`)
        expect(result.params).toEqual([100])
      })
    })

    it('should handle IN operator', () => {
      const query: SemanticQuery = {
        from: 'entities',
        where: [
          { field: 'type', operator: 'IN', value: ['File', 'Folder', 'Concept'] }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities WHERE type IN $1')
      expect(result.params).toEqual([['File', 'Folder', 'Concept']])
    })

    it('should handle LIKE operator', () => {
      const query: SemanticQuery = {
        from: 'entities',
        where: [
          { field: 'name', operator: 'LIKE', value: '%test%' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities WHERE name LIKE $1')
      expect(result.params).toEqual(['%test%'])
    })
  })

  // ============================================================================
  // SQL BUILDING - GROUP BY
  // ============================================================================

  describe('buildSQLFromSemanticQuery - GROUP BY', () => {
    it('should build GROUP BY clause with single field', () => {
      const query: SemanticQuery = {
        from: 'entities',
        groupBy: ['type']
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities GROUP BY type')
    })

    it('should build GROUP BY clause with multiple fields', () => {
      const query: SemanticQuery = {
        from: 'entities',
        groupBy: ['type', 'status']
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities GROUP BY type, status')
    })
  })

  // ============================================================================
  // SQL BUILDING - AGGREGATIONS
  // ============================================================================

  describe('buildSQLFromSemanticQuery - Aggregations', () => {
    it('should build aggregation without alias', () => {
      const query: SemanticQuery = {
        from: 'entities',
        aggregations: [
          { operator: 'count', field: '*' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT COUNT(*) AS count_* FROM entities')
    })

    it('should build aggregation with custom alias', () => {
      const query: SemanticQuery = {
        from: 'entities',
        aggregations: [
          { operator: 'count', field: '*', as: 'total' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT COUNT(*) AS total FROM entities')
    })

    it('should build multiple aggregations', () => {
      const query: SemanticQuery = {
        from: 'entities',
        aggregations: [
          { operator: 'count', field: '*', as: 'total' },
          { operator: 'sum', field: 'size', as: 'total_size' },
          { operator: 'avg', field: 'size', as: 'avg_size' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT COUNT(*) AS total, SUM(size) AS total_size, AVG(size) AS avg_size FROM entities')
    })

    it('should combine select fields with aggregations', () => {
      const query: SemanticQuery = {
        from: 'entities',
        select: ['type'],
        aggregations: [
          { operator: 'count', field: '*', as: 'count' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT type, COUNT(*) AS count FROM entities')
    })

    it('should handle all aggregation operators', () => {
      const operators: AggregationOperator[] = ['count', 'sum', 'avg', 'min', 'max', 'distinct']

      operators.forEach(op => {
        const query: SemanticQuery = {
          from: 'test',
          aggregations: [{ operator: op, field: 'value', as: 'result' }]
        }

        const result = builder.buildSQLFromSemanticQuery(query)
        expect(result.sql).toContain(op.toUpperCase())
      })
    })
  })

  // ============================================================================
  // SQL BUILDING - ORDER BY
  // ============================================================================

  describe('buildSQLFromSemanticQuery - ORDER BY', () => {
    it('should build ORDER BY with single field ascending', () => {
      const query: SemanticQuery = {
        from: 'entities',
        orderBy: [
          { field: 'created_at', direction: 'asc' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities ORDER BY created_at ASC')
    })

    it('should build ORDER BY with single field descending', () => {
      const query: SemanticQuery = {
        from: 'entities',
        orderBy: [
          { field: 'created_at', direction: 'desc' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities ORDER BY created_at DESC')
    })

    it('should build ORDER BY with multiple fields', () => {
      const query: SemanticQuery = {
        from: 'entities',
        orderBy: [
          { field: 'type', direction: 'asc' },
          { field: 'created_at', direction: 'desc' }
        ]
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities ORDER BY type ASC, created_at DESC')
    })
  })

  // ============================================================================
  // SQL BUILDING - LIMIT & OFFSET
  // ============================================================================

  describe('buildSQLFromSemanticQuery - LIMIT & OFFSET', () => {
    it('should build LIMIT clause', () => {
      const query: SemanticQuery = {
        from: 'entities',
        limit: 10
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities LIMIT 10')
    })

    it('should build OFFSET clause', () => {
      const query: SemanticQuery = {
        from: 'entities',
        offset: 20
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities OFFSET 20')
    })

    it('should build LIMIT and OFFSET together', () => {
      const query: SemanticQuery = {
        from: 'entities',
        limit: 10,
        offset: 20
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities LIMIT 10 OFFSET 20')
    })

    it('should handle limit of 0', () => {
      const query: SemanticQuery = {
        from: 'entities',
        limit: 0
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities LIMIT 0')
    })
  })

  // ============================================================================
  // SQL BUILDING - COMPLEX QUERIES
  // ============================================================================

  describe('buildSQLFromSemanticQuery - Complex queries', () => {
    it('should build complex query with all clauses', () => {
      const query: SemanticQuery = {
        from: 'entities',
        select: ['type', 'status'],
        where: [
          { field: 'created_at', operator: '>', value: '2024-01-01' },
          { field: 'status', operator: '!=', value: 'deleted' }
        ],
        groupBy: ['type', 'status'],
        aggregations: [
          { operator: 'count', field: '*', as: 'count' }
        ],
        orderBy: [
          { field: 'count', direction: 'desc' }
        ],
        limit: 5,
        offset: 10
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe(
        'SELECT type, status, COUNT(*) AS count FROM entities ' +
        'WHERE created_at > $1 AND status != $2 ' +
        'GROUP BY type, status ' +
        'ORDER BY count DESC ' +
        'LIMIT 5 OFFSET 10'
      )
      expect(result.params).toEqual(['2024-01-01', 'deleted'])
    })

    it('should handle query with only aggregations (no select)', () => {
      const query: SemanticQuery = {
        from: 'entities',
        aggregations: [
          { operator: 'count', field: '*', as: 'total' },
          { operator: 'avg', field: 'size', as: 'avg_size' }
        ],
        groupBy: ['type']
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe(
        'SELECT COUNT(*) AS total, AVG(size) AS avg_size FROM entities GROUP BY type'
      )
    })
  })

  // ============================================================================
  // EXECUTE SEMANTIC QUERY
  // ============================================================================

  describe('executeSemanticQuery', () => {
    it('should execute semantic query and return results', async () => {
      const testData = [
        { id: '1', type: 'File', name: 'test.ts' },
        { id: '2', type: 'File', name: 'test2.ts' }
      ]

      // Mock DuckDBSQLGenerator.executeQuery to return test data
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockResolvedValue(testData)

      const query: SemanticQuery = {
        from: 'entities',
        where: [{ field: 'type', operator: '=', value: 'File' }]
      }

      const result = await builder.executeSemanticQuery(query)

      expect(result.data).toEqual(testData)
      expect(result.metadata.rowsScanned).toBe(2)
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0)
      expect(result.metadata.fromCache).toBe(false)
      expect(result.errors).toBeUndefined()
    })

    it('should handle empty result set', async () => {
      // Mock DuckDBSQLGenerator.executeQuery to return empty array
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockResolvedValue([])

      const query: SemanticQuery = {
        from: 'entities',
        where: [{ field: 'type', operator: '=', value: 'NonExistent' }]
      }

      const result = await builder.executeSemanticQuery(query)

      expect(result.data).toEqual([])
      expect(result.metadata.rowsScanned).toBe(0)
    })

    it('should return errors on query execution failure', async () => {
      // Mock DuckDBSQLGenerator.executeQuery to throw error
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockRejectedValue(
        new Error('Table does not exist')
      )

      const query: SemanticQuery = {
        from: 'nonexistent_table'
      }

      const result = await builder.executeSemanticQuery(query)

      expect(result.data).toEqual([])
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Table does not exist')
    })

    it('should measure execution time', async () => {
      // Mock DuckDBSQLGenerator.executeQuery with delay
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockImplementation(async () => {
        // Simulate small delay
        await new Promise(resolve => setTimeout(resolve, 10))
        return []
      })

      const query: SemanticQuery = { from: 'entities' }
      const result = await builder.executeSemanticQuery(query)

      expect(result.metadata.executionTime).toBeGreaterThan(0)
    })

    it('should use prepared statements when params are present', async () => {
      // Mock DuckDBSQLGenerator.executeQuery
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockResolvedValue([])

      const query: SemanticQuery = {
        from: 'entities',
        where: [{ field: 'type', operator: '=', value: 'File' }]
      }

      await builder.executeSemanticQuery(query)

      // Should call DuckDBSQLGenerator.executeQuery with params
      expect(DuckDBSQLGenerator.executeQuery).toHaveBeenCalledWith(
        mockConnection,
        'SELECT * FROM entities WHERE type = $1',
        ['File'],
        false
      )
    })
  })

  // ============================================================================
  // EXECUTE RAW SQL
  // ============================================================================

  describe('executeSQL', () => {
    it('should execute raw SQL query', async () => {
      const testData = [{ count: 42 }]

      // Mock DuckDBSQLGenerator.executeQuery to return test data
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockResolvedValue(testData)

      const result = await builder.executeSQL('SELECT COUNT(*) as count FROM entities')

      expect(result.data).toEqual(testData)
      expect(result.metadata.rowsScanned).toBe(1)
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('should execute SQL with parameters', async () => {
      const testData = [{ id: '1', type: 'File' }]

      // Mock DuckDBSQLGenerator.executeQuery to return test data
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockResolvedValue(testData)

      const result = await builder.executeSQL(
        'SELECT * FROM entities WHERE type = $1',
        ['File']
      )

      expect(result.data).toEqual(testData)
      expect(DuckDBSQLGenerator.executeQuery).toHaveBeenCalled()
    })

    it('should handle SQL execution errors', async () => {
      // Mock DuckDBSQLGenerator.executeQuery to throw error
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockRejectedValue(
        new Error('Syntax error in SQL')
      )

      const result = await builder.executeSQL('SELECT * FORM entities')

      expect(result.data).toEqual([])
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Syntax error in SQL')
    })

    it('should handle empty params array', async () => {
      // Mock DuckDBSQLGenerator.executeQuery to return empty array
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockResolvedValue([])

      const result = await builder.executeSQL('SELECT * FROM entities', [])

      expect(result.data).toEqual([])
      // Should call DuckDBSQLGenerator.executeQuery with empty params
      expect(DuckDBSQLGenerator.executeQuery).toHaveBeenCalledWith(
        mockConnection,
        'SELECT * FROM entities',
        [],
        false
      )
    })
  })

  // ============================================================================
  // DEBUG LOGGING
  // ============================================================================

  describe('debug logging', () => {
    it('should log SQL when debug is enabled', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const debugBuilder = new DuckDBSemanticQueryBuilder(debugConfig)

      mockConnection.runAndReadAll = vi.fn().mockResolvedValue({
        getRowObjectsJS: () => []
      })

      const query: SemanticQuery = { from: 'entities' }
      await debugBuilder.executeSemanticQuery(query)

      expect(mockLog).toHaveBeenCalled()
    })

    it('should not log SQL when debug is disabled', async () => {
      mockConnection.runAndReadAll = vi.fn().mockResolvedValue({
        getRowObjectsJS: () => []
      })

      const query: SemanticQuery = { from: 'entities' }
      await builder.executeSemanticQuery(query)

      expect(mockLog).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle query with undefined/null optional fields', () => {
      const query: SemanticQuery = {
        from: 'entities',
        select: undefined,
        where: undefined,
        groupBy: undefined,
        aggregations: undefined,
        orderBy: undefined,
        limit: undefined,
        offset: undefined
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM entities')
    })

    it('should handle table names with special characters (quoted)', () => {
      const query: SemanticQuery = {
        from: '"my-table"'
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT * FROM "my-table"')
    })

    it('should handle field names with special characters', () => {
      const query: SemanticQuery = {
        from: 'entities',
        select: ['"field-name"', '"another.field"']
      }

      const result = builder.buildSQLFromSemanticQuery(query)

      expect(result.sql).toBe('SELECT "field-name", "another.field" FROM entities')
    })

    it('should handle very large result sets', async () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: `id-${i}`,
        value: i
      }))

      // Mock DuckDBSQLGenerator.executeQuery to return large dataset
      vi.mocked(DuckDBSQLGenerator.executeQuery).mockResolvedValue(largeData)

      const query: SemanticQuery = { from: 'entities' }
      const result = await builder.executeSemanticQuery(query)

      expect(result.data).toHaveLength(10000)
      expect(result.metadata.rowsScanned).toBe(10000)
    })
  })
})
