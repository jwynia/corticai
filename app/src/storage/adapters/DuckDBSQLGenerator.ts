/**
 * DuckDB SQL Generator
 * 
 * Provides SQL generation utilities for DuckDB operations.
 * Handles parameterized queries, path escaping, and DuckDB-specific
 * SQL features like Parquet support.
 */

import { DuckDBConnection, DuckDBPreparedStatement } from '@duckdb/node-api'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import { DuckDBTypeMapper } from './DuckDBTypeMapper'
import { Logger } from '../../utils/Logger'

/**
 * SQL Generator for DuckDB Storage Operations
 * 
 * Features:
 * - Safe SQL generation with parameter binding
 * - Parquet import/export SQL generation
 * - Path sanitization and escaping
 * - Transaction management SQL
 * - Query execution utilities
 */
export class DuckDBSQLGenerator {
  private static logger = Logger.createConsoleLogger('DuckDBSQLGenerator');

  
  /**
   * Generate SQL for creating a storage table
   * @param tableName The name of the table to create
   * @returns The CREATE TABLE SQL statement
   */
  static createTableSQL(tableName: string): string {
    return `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        key VARCHAR PRIMARY KEY,
        value JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  }
  
  /**
   * Generate SQL for loading all data from a table
   * @param tableName The name of the table to query
   * @returns The SELECT SQL statement
   */
  static loadAllDataSQL(tableName: string): string {
    return `SELECT key, value FROM ${tableName}`
  }
  
  /**
   * Generate SQL for inserting or updating a key-value pair
   * @param tableName The name of the table
   * @returns The INSERT ... ON CONFLICT SQL statement
   */
  static upsertSQL(tableName: string): string {
    return `
      INSERT INTO ${tableName} (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `
  }
  
  /**
   * Generate SQL for deleting a key
   * @param tableName The name of the table
   * @returns The DELETE SQL statement
   */
  static deleteSQL(tableName: string): string {
    return `DELETE FROM ${tableName} WHERE key = ?`
  }
  
  /**
   * Generate SQL for clearing all data from a table
   * @param tableName The name of the table
   * @returns The DELETE SQL statement
   */
  static clearAllSQL(tableName: string): string {
    return `DELETE FROM ${tableName}`
  }
  
  /**
   * Generate SQL for getting the count of records in a table
   * @param tableName The name of the table
   * @returns The COUNT SQL statement
   */
  static countSQL(tableName: string): string {
    return `SELECT COUNT(*) as count FROM ${tableName}`
  }
  
  /**
   * Generate SQL for checking if a key exists
   * @param tableName The name of the table
   * @returns The EXISTS SQL statement
   */
  static existsSQL(tableName: string): string {
    return `SELECT COUNT(*) > 0 as exists FROM ${tableName} WHERE key = ?`
  }
  
  /**
   * Generate SQL for Parquet export
   * @param tableName The name of the table to export
   * @param filePath The path to export to (will be sanitized)
   * @returns The COPY SQL statement
   */
  static exportParquetSQL(tableName: string, filePath: string): string {
    const safePath = DuckDBSQLGenerator.escapePath(filePath)
    return `COPY (SELECT * FROM ${tableName}) TO '${safePath}' (FORMAT PARQUET)`
  }
  
  /**
   * Generate SQL for Parquet import
   * @param tableName The name of the table to import into
   * @param filePath The path to import from (will be sanitized)
   * @returns The INSERT SQL statement
   */
  static importParquetSQL(tableName: string, filePath: string): string {
    const safePath = DuckDBSQLGenerator.escapePath(filePath)
    return `INSERT INTO ${tableName} SELECT * FROM read_parquet('${safePath}')`
  }
  
  /**
   * Execute a parameterized query with automatic parameter binding
   * @param connection The DuckDB connection
   * @param sql The SQL statement with ? placeholders
   * @param params Parameters to bind
   * @param debug Whether to log debug information
   * @returns Query results
   */
  static async executeQuery<R = any>(
    connection: DuckDBConnection, 
    sql: string, 
    params: any[] = [],
    debug = false
  ): Promise<R[]> {
    try {
      if (debug) {
        DuckDBSQLGenerator.logger.info(`[DuckDBSQLGenerator] Executing query: ${sql}`)
        if (params.length > 0) {
          DuckDBSQLGenerator.logger.info(`[DuckDBSQLGenerator] Parameters:`, { params })
        }
      }
      
      // For parameterized queries, we need to use prepared statements  
      if (params && params.length > 0) {
        // Convert ? placeholders to $1, $2, etc. for DuckDB
        const convertedSql = DuckDBTypeMapper.convertPlaceholders(sql)
        
        const prepared = await connection.prepare(convertedSql)
        
        // Bind parameters by type
        DuckDBTypeMapper.bindParameters(prepared, params)
        
        const reader = await prepared.runAndReadAll()
        const rows = reader.getRowObjectsJS()
        // Convert BigInt values to regular numbers for JSON compatibility
        const processedRows = DuckDBTypeMapper.processBigIntValues(rows)
        return processedRows as R[]
      } else {
        const reader = await connection.runAndReadAll(sql)
        const rows = reader.getRowObjectsJS()
        // Convert BigInt values to regular numbers for JSON compatibility
        const processedRows = DuckDBTypeMapper.processBigIntValues(rows)
        return processedRows as R[]
      }
      
    } catch (error) {
      throw new StorageError(
        `Query execution failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { sql, params, originalError: error }
      )
    }
  }
  
  /**
   * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
   * @param connection The DuckDB connection
   * @param sql The SQL statement with ? placeholders
   * @param params Parameters to bind
   * @param debug Whether to log debug information
   */
  static async executeNonQuery(
    connection: DuckDBConnection, 
    sql: string, 
    params: any[] = [],
    debug = false
  ): Promise<void> {
    try {
      if (debug) {
        DuckDBSQLGenerator.logger.info(`[DuckDBSQLGenerator] Executing non-query: ${sql}`)
        if (params.length > 0) {
          DuckDBSQLGenerator.logger.info(`[DuckDBSQLGenerator] Parameters:`, { params })
        }
      }
      
      if (params && params.length > 0) {
        const convertedSql = DuckDBTypeMapper.convertPlaceholders(sql)
        const prepared = await connection.prepare(convertedSql)
        DuckDBTypeMapper.bindParameters(prepared, params)
        await prepared.runAndReadAll()
      } else {
        await connection.run(sql)
      }
      
    } catch (error) {
      throw new StorageError(
        `Query execution failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { sql, params, originalError: error }
      )
    }
  }
  
  /**
   * Query Parquet file directly with parameterized query
   * @param connection The DuckDB connection
   * @param filePath Path to the Parquet file
   * @param sql SQL query with first ? being the file path
   * @param params Additional parameters
   * @param debug Whether to log debug information
   * @returns Query results
   */
  static async queryParquet<R = any>(
    connection: DuckDBConnection,
    filePath: string,
    sql: string,
    params: any[] = [],
    debug = false
  ): Promise<R[]> {
    try {
      if (debug) {
        DuckDBSQLGenerator.logger.info(`[DuckDBSQLGenerator] Querying Parquet file: ${filePath}`)
      }
      
      // Replace the first parameter with the file path for read_parquet
      // Escape single quotes to prevent SQL injection
      const safePath = DuckDBSQLGenerator.escapePath(filePath)
      const finalSQL = sql.replace(/\?/, `'${safePath}'`)
      
      // Handle remaining parameters like in the regular query method
      if (params && params.length > 0) {
        // Convert remaining ? placeholders to $1, $2, etc. for DuckDB
        const convertedSql = DuckDBTypeMapper.convertPlaceholders(finalSQL)
        
        const prepared = await connection.prepare(convertedSql)
        DuckDBTypeMapper.bindParameters(prepared, params)
        
        const reader = await prepared.runAndReadAll()
        const rows = reader.getRowObjectsJS()
        const processedRows = DuckDBTypeMapper.processBigIntValues(rows)
        return processedRows as R[]
      } else {
        const reader = await connection.runAndReadAll(finalSQL)
        const rows = reader.getRowObjectsJS()
        const processedRows = DuckDBTypeMapper.processBigIntValues(rows)
        return processedRows as R[]
      }
      
    } catch (error) {
      throw new StorageError(
        `Parquet query failed: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { filePath, sql, params, originalError: error }
      )
    }
  }
  
  /**
   * Escape single quotes in file paths to prevent SQL injection
   * @param path The file path to escape
   * @returns The escaped file path
   */
  static escapePath(path: string): string {
    return path.replace(/'/g, "''")
  }
  
  /**
   * Generate batch operation SQL for multiple upserts
   * @param tableName The name of the table
   * @param entries Array of key-value pairs
   * @returns SQL for batch upsert
   */
  static batchUpsertSQL(tableName: string, entries: Array<[string, any]>): { sql: string; params: any[] } {
    if (entries.length === 0) {
      return { sql: '', params: [] }
    }
    
    const values: string[] = []
    const params: any[] = []
    
    for (const [key, value] of entries) {
      values.push('(?, ?, CURRENT_TIMESTAMP)')
      params.push(key, JSON.stringify(value))
    }
    
    const sql = `
      INSERT INTO ${tableName} (key, value, updated_at) 
      VALUES ${values.join(', ')}
      ON CONFLICT (key) 
      DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `
    
    return { sql, params }
  }
  
  /**
   * Generate batch delete SQL for multiple keys
   * @param tableName The name of the table
   * @param keys Array of keys to delete
   * @returns SQL for batch delete
   */
  static batchDeleteSQL(tableName: string, keys: string[]): { sql: string; params: any[] } {
    if (keys.length === 0) {
      return { sql: '', params: [] }
    }
    
    const placeholders = keys.map(() => '?').join(', ')
    const sql = `DELETE FROM ${tableName} WHERE key IN (${placeholders})`
    
    return { sql, params: keys }
  }
}