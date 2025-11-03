/**
 * Mock PostgreSQL client for unit testing
 *
 * Provides a test double for IPostgreSQLClient that uses vitest mocks/spies
 * instead of making real database connections.
 *
 * This allows unit tests to:
 * - Run without a database
 * - Execute quickly (< 1s)
 * - Verify SQL queries and parameters
 * - Simulate various database responses and errors
 */

import { vi } from 'vitest';
import {
  IPostgreSQLClient,
  IPostgreSQLConnection,
  PostgreSQLQueryResult
} from '../../../src/storage/adapters/database/IPostgreSQLClient';

/**
 * Mock PostgreSQL client for testing
 *
 * Uses vitest mock functions to track calls and allow custom responses.
 */
export class MockPostgreSQLClient implements IPostgreSQLClient {
  /**
   * Mock function for query calls
   * Can be configured to return specific results or throw errors
   */
  queryMock = vi.fn<[string, any[]?], Promise<PostgreSQLQueryResult>>();

  /**
   * Mock function for getConnection calls
   */
  getConnectionMock = vi.fn<[], Promise<IPostgreSQLConnection>>();

  /**
   * Mock function for close calls
   */
  closeMock = vi.fn<[], Promise<void>>();

  /**
   * Create a new mock PostgreSQL client
   *
   * Sets up default mock behaviors (empty results)
   */
  constructor() {
    // Default: return empty results
    this.queryMock.mockResolvedValue({
      rows: [],
      rowCount: 0
    });

    // Default: return mock connection
    this.getConnectionMock.mockImplementation(async () => {
      const connectionQueryMock = vi.fn<[string, any[]?], Promise<PostgreSQLQueryResult>>();
      const releaseMock = vi.fn();

      connectionQueryMock.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      return {
        query: connectionQueryMock,
        release: releaseMock
      };
    });

    // Default: resolve immediately
    this.closeMock.mockResolvedValue();
  }

  /**
   * Execute a mocked query
   */
  async query<T = any>(sql: string, params?: any[]): Promise<PostgreSQLQueryResult<T>> {
    return this.queryMock(sql, params);
  }

  /**
   * Get a mocked connection
   */
  async getConnection(): Promise<IPostgreSQLConnection> {
    return this.getConnectionMock();
  }

  /**
   * Mock close operation
   */
  async close(): Promise<void> {
    return this.closeMock();
  }

  // ============================================================================
  // HELPER METHODS FOR TEST SETUP
  // ============================================================================

  /**
   * Configure the mock to return a specific query result
   *
   * @param result - The result to return from query calls
   *
   * @example
   * ```typescript
   * mockPg.mockQueryResult({
   *   rows: [{ id: 1, name: 'Test' }],
   *   rowCount: 1
   * });
   * ```
   */
  mockQueryResult<T = any>(result: PostgreSQLQueryResult<T>): void {
    this.queryMock.mockResolvedValue(result);
  }

  /**
   * Configure the mock to throw an error on query
   *
   * @param error - The error to throw
   *
   * @example
   * ```typescript
   * mockPg.mockQueryError(new Error('Connection failed'));
   * ```
   */
  mockQueryError(error: Error): void {
    this.queryMock.mockRejectedValue(error);
  }

  /**
   * Configure query mock with a custom implementation
   *
   * @param implementation - Function that receives (sql, params) and returns result
   *
   * @example
   * ```typescript
   * mockPg.mockQueryImplementation((sql, params) => {
   *   if (sql.includes('SELECT')) {
   *     return { rows: [{ id: params[0] }], rowCount: 1 };
   *   }
   *   return { rows: [], rowCount: 0 };
   * });
   * ```
   */
  mockQueryImplementation(
    implementation: (sql: string, params?: any[]) => Promise<PostgreSQLQueryResult>
  ): void {
    this.queryMock.mockImplementation(implementation);
  }

  /**
   * Configure connection mock to return a specific connection
   *
   * @param connection - The mock connection to return
   */
  mockConnection(connection: IPostgreSQLConnection): void {
    this.getConnectionMock.mockResolvedValue(connection);
  }

  /**
   * Reset all mocks to their default state
   *
   * Call this in beforeEach() to ensure test isolation
   */
  reset(): void {
    this.queryMock.mockClear();
    this.getConnectionMock.mockClear();
    this.closeMock.mockClear();

    // Restore default behaviors
    this.queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    this.closeMock.mockResolvedValue();
  }

  /**
   * Get all SQL queries that were executed
   *
   * @returns Array of SQL query strings
   */
  getExecutedQueries(): string[] {
    return this.queryMock.mock.calls.map(call => call[0]);
  }

  /**
   * Get all query parameters that were passed
   *
   * @returns Array of parameter arrays
   */
  getQueryParameters(): any[][] {
    return this.queryMock.mock.calls.map(call => call[1] || []);
  }

  /**
   * Verify that a specific SQL pattern was executed
   *
   * @param pattern - SQL pattern to match (can include regex)
   * @returns true if pattern was found in any query
   *
   * @example
   * ```typescript
   * expect(mockPg.wasQueryExecuted('INSERT INTO nodes')).toBe(true);
   * ```
   */
  wasQueryExecuted(pattern: string | RegExp): boolean {
    const queries = this.getExecutedQueries();

    if (typeof pattern === 'string') {
      return queries.some(q => q.includes(pattern));
    } else {
      return queries.some(q => pattern.test(q));
    }
  }
}
