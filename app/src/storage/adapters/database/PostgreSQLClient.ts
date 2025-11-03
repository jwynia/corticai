/**
 * Production PostgreSQL client implementation
 *
 * Wraps the pg library's Pool to implement IPostgreSQLClient interface,
 * enabling dependency injection while maintaining the exact pg API semantics.
 */

import { Pool, PoolClient } from 'pg';
import {
  IPostgreSQLClient,
  IPostgreSQLConnection,
  PostgreSQLQueryResult,
  PostgreSQLPoolConfig
} from './IPostgreSQLClient';

/**
 * PostgreSQL client using pg library's Pool
 *
 * This is the production implementation that wraps a real pg.Pool instance.
 * For testing, use MockPostgreSQLClient instead.
 */
export class PostgreSQLClient implements IPostgreSQLClient {
  private pool: Pool;

  /**
   * Create a new PostgreSQL client
   *
   * @param connectionString - PostgreSQL connection string
   * @param poolConfig - Optional pool configuration
   *
   * @example
   * ```typescript
   * const client = new PostgreSQLClient(
   *   'postgresql://user:pass@localhost:5432/dbname',
   *   { poolSize: 20, idleTimeout: 60000 }
   * );
   * ```
   */
  constructor(connectionString: string, poolConfig?: PostgreSQLPoolConfig) {
    this.pool = new Pool({
      connectionString,
      max: poolConfig?.poolSize ?? 10,
      idleTimeoutMillis: poolConfig?.idleTimeout ?? 30000,
      connectionTimeoutMillis: poolConfig?.connectionTimeout ?? 5000,
    });

    // Handle pool errors to prevent unhandled promise rejections
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  /**
   * Execute a SQL query using a connection from the pool
   *
   * @param sql - SQL query string with $1, $2, etc. placeholders
   * @param params - Values for the placeholders
   * @returns Promise resolving to query result
   */
  async query<T = any>(sql: string, params?: any[]): Promise<PostgreSQLQueryResult<T>> {
    const result = await this.pool.query(sql, params);

    return {
      rows: result.rows,
      rowCount: result.rowCount
    };
  }

  /**
   * Get a dedicated connection from the pool
   *
   * The connection must be released after use by calling release()
   *
   * @returns Promise resolving to a connection
   *
   * @example
   * ```typescript
   * const conn = await client.getConnection();
   * try {
   *   await conn.query('BEGIN');
   *   await conn.query('INSERT INTO ...');
   *   await conn.query('COMMIT');
   * } finally {
   *   conn.release();
   * }
   * ```
   */
  async getConnection(): Promise<IPostgreSQLConnection> {
    const client: PoolClient = await this.pool.connect();

    return {
      query: async <T = any>(sql: string, params?: any[]): Promise<PostgreSQLQueryResult<T>> => {
        const result = await client.query(sql, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount
        };
      },
      release: () => client.release()
    };
  }

  /**
   * Close the connection pool
   *
   * Waits for all active queries to complete and then terminates
   * all connections.
   *
   * @returns Promise resolving when pool is closed
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
