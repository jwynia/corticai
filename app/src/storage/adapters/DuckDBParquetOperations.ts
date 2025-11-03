/**
 * DuckDB Parquet Operations Module
 *
 * Extracted from DuckDBStorageAdapter to improve maintainability.
 * Handles all Parquet import/export/query operations.
 *
 * Design Pattern:
 * - Dependency injection for testability
 * - Follows the proven pattern from KuzuSchemaManager
 * - Clear separation of concerns
 *
 * Dependencies:
 * - DuckDBConnection: Database connection
 * - DuckDBSQLGenerator: For query execution (existing module)
 */

import { DuckDBConnection } from '@duckdb/node-api'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import { SemanticQuery } from '../interfaces/SemanticStorage'
import { DuckDBSQLGenerator } from './DuckDBSQLGenerator'

/**
 * Dependencies for DuckDBParquetOperations
 * Using dependency injection for testability
 */
export interface DuckDBParquetOperationsDeps {
  /** Database connection */
  connection: DuckDBConnection

  /** Whether Parquet support is enabled */
  enableParquet: boolean

  /** Table name for main storage (used for cache invalidation) */
  tableName: string

  /** Enable debug logging */
  debug?: boolean

  /** Optional logging function */
  log?: (message: string) => void

  /** Optional warning logging function */
  logWarn?: (message: string) => void
}

/**
 * DuckDB Parquet Operations
 *
 * Handles Parquet file import/export/query operations for DuckDB storage adapter.
 *
 * Features:
 * - Export query results to Parquet format
 * - Import data from Parquet files
 * - Query Parquet files directly without importing
 * - Path sanitization for SQL injection prevention
 * - Comprehensive error handling
 */
export class DuckDBParquetOperations {
  private connection: DuckDBConnection
  private enableParquet: boolean
  private tableName: string
  private debug: boolean
  private log: (message: string) => void
  private logWarn: (message: string) => void

  constructor(deps: DuckDBParquetOperationsDeps) {
    this.connection = deps.connection
    this.enableParquet = deps.enableParquet
    this.tableName = deps.tableName
    this.debug = deps.debug ?? false
    this.log = deps.log ?? (() => {})
    this.logWarn = deps.logWarn ?? (() => {})
  }

  // ============================================================================
  // PARQUET EXPORT
  // ============================================================================

  /**
   * Export query results to Parquet format
   *
   * @param query - SQL query string or SemanticQuery object
   * @param outputPath - Path where Parquet file will be created
   * @throws StorageError if Parquet is not enabled or export fails
   */
  async exportToParquet(query: SemanticQuery | string, outputPath: string): Promise<void> {
    if (!this.enableParquet) {
      throw new StorageError(
        'Parquet support not enabled. Set enableParquet: true in configuration',
        StorageErrorCode.INVALID_VALUE,
        { enableParquet: this.enableParquet }
      )
    }

    try {
      // Build the export SQL based on query type
      let exportSQL: string
      const safePath = this.sanitizePath(outputPath)

      if (typeof query === 'string') {
        // Check if it's a SQL query (contains spaces/keywords) or a table name
        const isTableName = !query.includes(' ') && !query.includes('(') && !query.includes('SELECT')
        if (isTableName) {
          // Simple table name - convert to SELECT query
          exportSQL = `COPY (SELECT * FROM ${query}) TO '${safePath}' (FORMAT PARQUET)`
        } else {
          // Raw SQL query
          exportSQL = `COPY (${query}) TO '${safePath}' (FORMAT PARQUET)`
        }
      } else {
        // Semantic query - use the table name from the semantic query
        exportSQL = `COPY (SELECT * FROM ${query.from}) TO '${safePath}' (FORMAT PARQUET)`
      }

      await this.connection.run(exportSQL)

      if (this.debug) {
        this.log(`Exported data to Parquet file: ${outputPath}`)
      }
    } catch (error) {
      throw new StorageError(
        `Parquet export failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { outputPath, originalError: error }
      )
    }
  }

  // ============================================================================
  // PARQUET IMPORT
  // ============================================================================

  /**
   * Import data from Parquet file
   *
   * @param table - Target table name
   * @param inputPath - Path to Parquet file to import
   * @returns Number of rows imported
   * @throws StorageError if Parquet is not enabled or import fails
   */
  async importFromParquet(table: string, inputPath: string): Promise<number> {
    if (!this.enableParquet) {
      throw new StorageError(
        'Parquet support not enabled. Set enableParquet: true in configuration',
        StorageErrorCode.INVALID_VALUE,
        { enableParquet: this.enableParquet }
      )
    }

    try {
      // Get count before import
      const countBefore = await this.getRowCount(table)

      // Import from Parquet file - escape single quotes to prevent SQL injection
      const safePath = this.sanitizePath(inputPath)
      const importSQL = `INSERT INTO ${table} SELECT * FROM read_parquet('${safePath}')`
      await this.connection.run(importSQL)

      // Get count after import
      const countAfter = await this.getRowCount(table)
      const imported = countAfter - countBefore

      if (this.debug) {
        this.log(`Imported ${imported} rows from Parquet file: ${inputPath}`)
      }

      return imported
    } catch (error) {
      throw new StorageError(
        `Parquet import failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { inputPath, originalError: error }
      )
    }
  }

  // ============================================================================
  // PARQUET QUERY
  // ============================================================================

  /**
   * Query Parquet file directly without importing
   * Delegates to DuckDBSQLGenerator for consistent query execution
   *
   * @param filePath - Path to Parquet file
   * @param sql - SQL query to execute
   * @param params - Query parameters (optional)
   * @returns Query results
   * @throws StorageError if Parquet is not enabled
   */
  async queryParquet<R = any>(filePath: string, sql: string, params: any[] = []): Promise<R[]> {
    if (!this.enableParquet) {
      throw new StorageError(
        'Parquet support not enabled. Set enableParquet: true in configuration',
        StorageErrorCode.INVALID_VALUE,
        { enableParquet: this.enableParquet }
      )
    }

    return DuckDBSQLGenerator.queryParquet<R>(this.connection, filePath, sql, params, this.debug)
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Sanitize file path for SQL injection prevention
   * Escapes single quotes in paths
   *
   * @param path - File path to sanitize
   * @returns Sanitized path safe for SQL
   */
  private sanitizePath(path: string): string {
    return path.replace(/'/g, "''")
  }

  /**
   * Get row count for a table
   * Helper method for import operation
   *
   * @param table - Table name
   * @returns Row count
   */
  private async getRowCount(table: string): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM ${table}`
    const result = await DuckDBSQLGenerator.executeQuery<{count: number}>(
      this.connection,
      sql,
      [],
      this.debug
    )
    return result[0]?.count ?? 0
  }
}
