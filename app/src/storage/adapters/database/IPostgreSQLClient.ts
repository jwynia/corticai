/**
 * Interface for PostgreSQL client operations
 *
 * This interface wraps the pg library's Pool API to enable dependency injection
 * and testing. It is specifically shaped around pg's API, not a generic database
 * abstraction.
 *
 * The pg library itself is assumed to be tested and working correctly. This
 * interface exists solely to allow mocking the database boundary in unit tests.
 *
 * @see https://node-postgres.com/ - pg library documentation
 */

/**
 * PostgreSQL client interface
 *
 * Wraps the essential pg.Pool operations needed by the storage adapter.
 */
export interface IPostgreSQLClient {
  /**
   * Execute a SQL query with optional parameters
   *
   * @param sql - SQL query string
   * @param params - Optional query parameters ($1, $2, etc.)
   * @returns Promise resolving to query result
   */
  query<T = any>(sql: string, params?: any[]): Promise<PostgreSQLQueryResult<T>>;

  /**
   * Get a connection from the pool
   *
   * The connection must be released after use by calling release()
   *
   * @returns Promise resolving to a connection
   */
  getConnection(): Promise<IPostgreSQLConnection>;

  /**
   * Close the connection pool
   *
   * Terminates all connections and releases resources
   *
   * @returns Promise resolving when pool is closed
   */
  close(): Promise<void>;
}

/**
 * PostgreSQL connection interface
 *
 * Represents a single connection from the pool that must be released
 * after use.
 */
export interface IPostgreSQLConnection {
  /**
   * Execute a SQL query on this connection
   *
   * @param sql - SQL query string
   * @param params - Optional query parameters ($1, $2, etc.)
   * @returns Promise resolving to query result
   */
  query<T = any>(sql: string, params?: any[]): Promise<PostgreSQLQueryResult<T>>;

  /**
   * Release this connection back to the pool
   *
   * Must be called after finishing work with the connection,
   * typically in a finally block.
   */
  release(): void;
}

/**
 * PostgreSQL query result
 *
 * Matches the essential fields from pg's QueryResult
 */
export interface PostgreSQLQueryResult<T = any> {
  /**
   * Array of result rows
   */
  rows: T[];

  /**
   * Number of rows affected by the query
   * null if the database driver doesn't provide this information
   */
  rowCount: number | null;
}

/**
 * PostgreSQL connection pool configuration
 */
export interface PostgreSQLPoolConfig {
  /**
   * Maximum number of connections in the pool
   * @default 10
   */
  poolSize?: number;

  /**
   * Time in milliseconds a connection can remain idle before being closed
   * @default 30000 (30 seconds)
   */
  idleTimeout?: number;

  /**
   * Time in milliseconds to wait for a connection before timing out
   * @default 5000 (5 seconds)
   */
  connectionTimeout?: number;
}
