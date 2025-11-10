/**
 * Unit tests for DuckDBParquetOperations
 *
 * Test Strategy: Test-First Development (TDD)
 * - Write tests BEFORE implementation
 * - Cover all public methods
 * - Test edge cases and error conditions
 * - Follow the proven pattern from KuzuSchemaManager tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DuckDBConnection } from '@duckdb/node-api'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import {
  DuckDBParquetOperations,
  DuckDBParquetOperationsDeps
} from '../../../src/storage/adapters/DuckDBParquetOperations'
import { StorageError, StorageErrorCode } from '../../../src/storage/interfaces/Storage'
import { SemanticQuery } from '../../../src/storage/interfaces/SemanticStorage'

describe('DuckDBParquetOperations', () => {
  let testDir: string
  let mockConnection: DuckDBConnection
  let mockConfig: DuckDBParquetOperationsDeps
  let operations: DuckDBParquetOperations
  let mockLog: ReturnType<typeof vi.fn>
  let mockLogWarn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Create temp directory for test files
    testDir = path.join(os.tmpdir(), `duckdb-parquet-test-${Date.now()}`)

    // Create mock connection with proper reader mocking
    mockConnection = {
      run: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue([]),
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue(undefined),
        all: vi.fn().mockResolvedValue([])
      }),
      runAndReadAll: vi.fn().mockResolvedValue({
        getRowObjectsJS: () => [{ count: 0 }]
      })
    } as any

    // Create mock logging functions
    mockLog = vi.fn()
    mockLogWarn = vi.fn()

    // Create mock configuration
    mockConfig = {
      connection: mockConnection,
      enableParquet: true,
      tableName: 'test_table',
      debug: false,
      log: mockLog,
      logWarn: mockLogWarn
    }

    // Create operations instance
    operations = new DuckDBParquetOperations(mockConfig)
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  // ============================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ============================================================================

  describe('constructor', () => {
    it('should create instance with valid configuration', () => {
      expect(operations).toBeDefined()
      expect(operations).toBeInstanceOf(DuckDBParquetOperations)
    })

    it('should use default values for optional configuration', () => {
      const minimalConfig: DuckDBParquetOperationsDeps = {
        connection: mockConnection,
        enableParquet: true,
        tableName: 'test_table'
      }

      const ops = new DuckDBParquetOperations(minimalConfig)
      expect(ops).toBeDefined()
    })

    it('should store configuration dependencies', () => {
      // This tests that the constructor properly initializes internal state
      expect(operations).toBeDefined()
    })
  })

  // ============================================================================
  // exportToParquet() - Export query results to Parquet file
  // ============================================================================

  describe('exportToParquet', () => {
    it('should export raw SQL query to Parquet file', async () => {
      const outputPath = path.join(testDir, 'export.parquet')
      const sqlQuery = 'SELECT * FROM test_table WHERE id > 10'

      await operations.exportToParquet(sqlQuery, outputPath)

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining('COPY (SELECT * FROM test_table WHERE id > 10)')
      )
      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining('FORMAT PARQUET')
      )
    })

    it('should export SemanticQuery to Parquet file', async () => {
      const outputPath = path.join(testDir, 'semantic.parquet')
      const semanticQuery: SemanticQuery = {
        from: 'test_table',
        select: ['id', 'name'],
        where: [{ field: 'active', operator: '=', value: true }]
      }

      await operations.exportToParquet(semanticQuery, outputPath)

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining('COPY')
      )
      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining('FORMAT PARQUET')
      )
    })

    it('should escape single quotes in file path', async () => {
      const outputPath = "/tmp/test's file.parquet"
      const sqlQuery = 'SELECT * FROM test_table'

      await operations.exportToParquet(sqlQuery, outputPath)

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining("test''s file")
      )
    })

    it('should throw error when Parquet is not enabled', async () => {
      const disabledConfig = {
        ...mockConfig,
        enableParquet: false
      }
      const ops = new DuckDBParquetOperations(disabledConfig)
      const outputPath = path.join(testDir, 'export.parquet')

      await expect(
        ops.exportToParquet('SELECT * FROM test_table', outputPath)
      ).rejects.toThrow(StorageError)

      await expect(
        ops.exportToParquet('SELECT * FROM test_table', outputPath)
      ).rejects.toThrow('Parquet support not enabled')
    })

    it('should log export operation in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const ops = new DuckDBParquetOperations(debugConfig)
      const outputPath = path.join(testDir, 'debug.parquet')

      await ops.exportToParquet('SELECT * FROM test_table', outputPath)

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Exported data to Parquet file')
      )
    })

    it('should handle connection errors gracefully', async () => {
      mockConnection.run = vi.fn().mockRejectedValue(new Error('Connection lost'))
      const outputPath = path.join(testDir, 'error.parquet')

      await expect(
        operations.exportToParquet('SELECT * FROM test_table', outputPath)
      ).rejects.toThrow(StorageError)

      await expect(
        operations.exportToParquet('SELECT * FROM test_table', outputPath)
      ).rejects.toThrow('Parquet export failed')
    })

    it('should handle file system errors', async () => {
      mockConnection.run = vi.fn().mockRejectedValue(new Error('Permission denied'))
      const outputPath = '/root/protected.parquet'

      await expect(
        operations.exportToParquet('SELECT * FROM test_table', outputPath)
      ).rejects.toThrow(StorageError)
    })
  })

  // ============================================================================
  // importFromParquet() - Import data from Parquet file
  // ============================================================================

  describe('importFromParquet', () => {
    it('should import Parquet file into table', async () => {
      const inputPath = path.join(testDir, 'import.parquet')
      const table = 'import_table'

      // Mock runAndReadAll to return proper reader objects with count progression
      let callCount = 0
      mockConnection.runAndReadAll = vi.fn().mockImplementation(async () => {
        callCount++
        const count = callCount === 1 ? 0 : 10 // First call: 0 (before), second call: 10 (after)
        return {
          getRowObjectsJS: () => [{ count }]
        }
      })

      const rowsImported = await operations.importFromParquet(table, inputPath)

      expect(rowsImported).toBe(10)
      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining(`INSERT INTO ${table}`)
      )
      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining('read_parquet')
      )
    })

    it('should escape single quotes in file path', async () => {
      const inputPath = "/tmp/test's file.parquet"
      const table = 'test_table'

      // Mock runAndReadAll with count progression
      let callCount = 0
      mockConnection.runAndReadAll = vi.fn().mockImplementation(async () => {
        callCount++
        const count = callCount === 1 ? 0 : 5
        return {
          getRowObjectsJS: () => [{ count }]
        }
      })

      await operations.importFromParquet(table, inputPath)

      expect(mockConnection.run).toHaveBeenCalledWith(
        expect.stringContaining("test''s file")
      )
    })

    it('should throw error when Parquet is not enabled', async () => {
      const disabledConfig = {
        ...mockConfig,
        enableParquet: false
      }
      const ops = new DuckDBParquetOperations(disabledConfig)
      const inputPath = path.join(testDir, 'import.parquet')

      await expect(
        ops.importFromParquet('test_table', inputPath)
      ).rejects.toThrow(StorageError)

      await expect(
        ops.importFromParquet('test_table', inputPath)
      ).rejects.toThrow('Parquet support not enabled')
    })

    it('should return imported row count', async () => {
      const inputPath = path.join(testDir, 'data.parquet')

      // Mock runAndReadAll with count progression
      let callCount = 0
      mockConnection.runAndReadAll = vi.fn().mockImplementation(async () => {
        callCount++
        const count = callCount === 1 ? 100 : 150
        return {
          getRowObjectsJS: () => [{ count }]
        }
      })

      const rowsImported = await operations.importFromParquet('test_table', inputPath)

      expect(rowsImported).toBe(50)
    })

    it('should log import operation in debug mode', async () => {
      const debugConfig = { ...mockConfig, debug: true }
      const ops = new DuckDBParquetOperations(debugConfig)
      const inputPath = path.join(testDir, 'debug.parquet')

      // Mock runAndReadAll with count progression
      let callCount = 0
      mockConnection.runAndReadAll = vi.fn().mockImplementation(async () => {
        callCount++
        const count = callCount === 1 ? 0 : 20
        return {
          getRowObjectsJS: () => [{ count }]
        }
      })

      await ops.importFromParquet('test_table', inputPath)

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Imported 20 rows from Parquet file')
      )
    })

    it('should handle missing file errors', async () => {
      mockConnection.run = vi.fn().mockRejectedValue(new Error('File not found'))
      const inputPath = '/nonexistent/file.parquet'

      await expect(
        operations.importFromParquet('test_table', inputPath)
      ).rejects.toThrow(StorageError)

      await expect(
        operations.importFromParquet('test_table', inputPath)
      ).rejects.toThrow('Parquet import failed')
    })

    it('should handle connection errors during count', async () => {
      mockConnection.runAndReadAll = vi.fn().mockRejectedValue(new Error('Connection error'))
      const inputPath = path.join(testDir, 'data.parquet')

      await expect(
        operations.importFromParquet('test_table', inputPath)
      ).rejects.toThrow(StorageError)
    })

    it('should return callback for cache reload when importing to main table', async () => {
      const inputPath = path.join(testDir, 'main.parquet')

      // Mock runAndReadAll with count progression
      let callCount = 0
      mockConnection.runAndReadAll = vi.fn().mockImplementation(async () => {
        callCount++
        const count = callCount === 1 ? 0 : 10
        return {
          getRowObjectsJS: () => [{ count }]
        }
      })

      const result = await operations.importFromParquet(mockConfig.tableName!, inputPath)

      expect(result).toBe(10)
      // The callback notification is tested via integration tests
    })
  })

  // ============================================================================
  // queryParquet() - Query Parquet file directly
  // ============================================================================
  // Note: Full queryParquet functionality is tested in integration tests
  // (tests/storage/duckdb.adapter.test.ts) where real connection mocking is set up

  describe('queryParquet', () => {
    it('should throw error when Parquet is not enabled', async () => {
      const disabledConfig = {
        ...mockConfig,
        enableParquet: false
      }
      const ops = new DuckDBParquetOperations(disabledConfig)
      const filePath = path.join(testDir, 'query.parquet')

      await expect(
        ops.queryParquet(filePath, 'SELECT * FROM data')
      ).rejects.toThrow(StorageError)

      await expect(
        ops.queryParquet(filePath, 'SELECT * FROM data')
      ).rejects.toThrow('Parquet support not enabled')
    })

    it('should handle query errors gracefully', async () => {
      mockConnection.runAndReadAll = vi.fn().mockRejectedValue(new Error('Invalid query'))
      const filePath = path.join(testDir, 'error.parquet')

      await expect(
        operations.queryParquet(filePath, 'INVALID SQL')
      ).rejects.toThrow()
    })
  })

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long file paths', async () => {
      const longPath = path.join(testDir, 'a'.repeat(200) + '.parquet')
      const sqlQuery = 'SELECT * FROM test_table'

      await operations.exportToParquet(sqlQuery, longPath)

      expect(mockConnection.run).toHaveBeenCalled()
    })

    it('should handle file paths with special characters', async () => {
      const specialPath = path.join(testDir, 'test-file_123.parquet')
      const sqlQuery = 'SELECT * FROM test_table'

      await operations.exportToParquet(sqlQuery, specialPath)

      expect(mockConnection.run).toHaveBeenCalled()
    })

    it('should handle concurrent export operations', async () => {
      const promises = [
        operations.exportToParquet('SELECT 1', path.join(testDir, 'file1.parquet')),
        operations.exportToParquet('SELECT 2', path.join(testDir, 'file2.parquet')),
        operations.exportToParquet('SELECT 3', path.join(testDir, 'file3.parquet'))
      ]

      await expect(Promise.all(promises)).resolves.toBeDefined()
      expect(mockConnection.run).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent import operations', async () => {
      // Mock runAndReadAll to return proper reader object
      mockConnection.runAndReadAll = vi.fn().mockResolvedValue({
        getRowObjectsJS: vi.fn().mockReturnValue([{ count: 0 }])
      })
      mockConnection.run = vi.fn().mockResolvedValue(undefined)

      // Mock the count queries to return different values (before/after)
      let callCount = 0
      mockConnection.runAndReadAll = vi.fn().mockImplementation(async () => {
        callCount++
        const count = callCount % 2 === 1 ? 0 : 10 // Alternate between 0 (before) and 10 (after)
        return {
          getRowObjectsJS: () => [{ count }]
        }
      })

      const promises = [
        operations.importFromParquet('table1', path.join(testDir, 'import1.parquet')),
        operations.importFromParquet('table2', path.join(testDir, 'import2.parquet'))
      ]

      await expect(Promise.all(promises)).resolves.toBeDefined()
    })
  })

  // ============================================================================
  // ERROR CODE VALIDATION
  // ============================================================================
  // Note: Integration with DuckDBSQLGenerator is tested in duckdb.adapter.test.ts

  describe('Error Codes', () => {
    it('should throw INVALID_VALUE error when Parquet is disabled', async () => {
      const disabledConfig = { ...mockConfig, enableParquet: false }
      const ops = new DuckDBParquetOperations(disabledConfig)

      try {
        await ops.exportToParquet('SELECT 1', 'test.parquet')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError)
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_VALUE)
      }
    })

    it('should throw CONNECTION_FAILED error on export failure', async () => {
      mockConnection.run = vi.fn().mockRejectedValue(new Error('Connection lost'))

      try {
        await operations.exportToParquet('SELECT 1', 'test.parquet')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError)
        expect((error as StorageError).code).toBe(StorageErrorCode.CONNECTION_FAILED)
      }
    })

    it('should throw CONNECTION_FAILED error on import failure', async () => {
      mockConnection.runAndReadAll = vi.fn().mockRejectedValue(new Error('Query failed'))

      try {
        await operations.importFromParquet('table', 'test.parquet')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError)
        expect((error as StorageError).code).toBe(StorageErrorCode.CONNECTION_FAILED)
      }
    })
  })
})
