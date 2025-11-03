/**
 * PostgreSQL Schema Manager for PgVector Storage
 *
 * Handles creation and management of database schema including:
 * - Tables for nodes, edges, and key-value data
 * - Indexes for performance
 * - pgvector extension setup
 * - Schema migrations
 *
 * ## Table Design
 *
 * ### data table (key-value storage)
 * - key: TEXT PRIMARY KEY
 * - value: JSONB (flexible storage)
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 *
 * ### nodes table (graph nodes)
 * - id: TEXT PRIMARY KEY
 * - type: TEXT (indexed)
 * - properties: JSONB
 * - embedding: VECTOR(dimensions) (optional)
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 *
 * ### edges table (graph relationships)
 * - id: SERIAL PRIMARY KEY
 * - from_node: TEXT REFERENCES nodes(id) ON DELETE CASCADE
 * - to_node: TEXT REFERENCES nodes(id) ON DELETE CASCADE
 * - type: TEXT (indexed)
 * - properties: JSONB
 * - created_at: TIMESTAMP
 * - UNIQUE constraint on (from_node, to_node, type)
 */

import { IPostgreSQLConnection } from './database/IPostgreSQLClient';
import { PgVectorStorageConfig } from '../interfaces/Storage';
import { StorageError, StorageErrorCode } from '../interfaces/Storage';

export class PgVectorSchemaManager {
  constructor(private config: Required<PgVectorStorageConfig>) {}

  /**
   * Create all required tables and indexes
   */
  async createSchema(conn: IPostgreSQLConnection): Promise<void> {
    try {
      await this.createDataTable(conn);
      await this.createNodesTable(conn);
      await this.createEdgesTable(conn);
      await this.createIndexes(conn);
    } catch (error) {
      throw new StorageError(
        `Failed to create schema: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error }
      );
    }
  }

  /**
   * Create the data table for key-value storage
   */
  private async createDataTable(conn: IPostgreSQLConnection): Promise<void> {
    const tableName = this.qualifiedTableName(this.config.dataTable);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on value for JSONB queries
    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.dataTable}_value_idx
      ON ${tableName} USING GIN (value)
    `);
  }

  /**
   * Create the nodes table for graph storage
   */
  private async createNodesTable(conn: IPostgreSQLConnection): Promise<void> {
    const tableName = this.qualifiedTableName(this.config.nodesTable);

    // Determine vector column definition
    const vectorColumn = this.config.enableVectorIndex
      ? `, embedding VECTOR(${this.config.vectorDimensions})`
      : '';

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        ${vectorColumn}
      )
    `);

    // Create GIN index on properties for fast JSONB queries
    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.nodesTable}_properties_idx
      ON ${tableName} USING GIN (properties)
    `);

    // Create vector index if enabled
    if (this.config.enableVectorIndex) {
      await this.createVectorIndex(conn, this.config.nodesTable, 'embedding');
    }
  }

  /**
   * Create the edges table for graph relationships
   */
  private async createEdgesTable(conn: IPostgreSQLConnection): Promise<void> {
    const tableName = this.qualifiedTableName(this.config.edgesTable);
    const nodesTable = this.qualifiedTableName(this.config.nodesTable);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY,
        from_node TEXT NOT NULL REFERENCES ${nodesTable}(id) ON DELETE CASCADE,
        to_node TEXT NOT NULL REFERENCES ${nodesTable}(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (from_node, to_node, type)
      )
    `);

    // Create GIN index on properties
    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.edgesTable}_properties_idx
      ON ${tableName} USING GIN (properties)
    `);
  }

  /**
   * Create performance indexes
   */
  private async createIndexes(conn: IPostgreSQLConnection): Promise<void> {
    const nodesTable = this.qualifiedTableName(this.config.nodesTable);
    const edgesTable = this.qualifiedTableName(this.config.edgesTable);

    // Index on node type for fast type-based queries
    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.nodesTable}_type_idx
      ON ${nodesTable} (type)
    `);

    // Indexes on edge relationships for fast traversal
    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.edgesTable}_from_idx
      ON ${edgesTable} (from_node)
    `);

    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.edgesTable}_to_idx
      ON ${edgesTable} (to_node)
    `);

    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.edgesTable}_type_idx
      ON ${edgesTable} (type)
    `);

    // Composite index for efficient edge lookups
    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.edgesTable}_from_type_idx
      ON ${edgesTable} (from_node, type)
    `);

    await conn.query(`
      CREATE INDEX IF NOT EXISTS ${this.config.edgesTable}_to_type_idx
      ON ${edgesTable} (to_node, type)
    `);
  }

  /**
   * Create a vector index on a table column
   */
  async createVectorIndex(
    conn: IPostgreSQLConnection,
    tableName: string,
    columnName: string,
    dimensions?: number
  ): Promise<void> {
    const qualifiedTable = this.qualifiedTableName(tableName);
    const indexName = `${tableName}_${columnName}_vector_idx`;

    // Choose distance function based on config
    const distanceOp = this.getDistanceOperator();

    if (this.config.indexType === 'ivfflat') {
      // IVFFlat index (good for large datasets)
      await conn.query(`
        CREATE INDEX IF NOT EXISTS ${indexName}
        ON ${qualifiedTable}
        USING ivfflat (${columnName} ${distanceOp})
        WITH (lists = ${this.config.ivfLists})
      `);

      // Set probes for query time
      await conn.query(`SET ivfflat.probes = ${this.config.ivfProbes}`);
    } else if (this.config.indexType === 'hnsw') {
      // HNSW index (better recall, requires PostgreSQL 16+ with pgvector 0.5.0+)
      // Note: May not be available in all pgvector versions
      try {
        await conn.query(`
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON ${qualifiedTable}
          USING hnsw (${columnName} ${distanceOp})
          WITH (m = ${this.config.hnswM}, ef_construction = ${this.config.hnswEfConstruction})
        `);
      } catch (error) {
        // Fall back to IVFFlat if HNSW not available
        console.warn(`HNSW index not available, falling back to IVFFlat: ${(error as Error).message}`);
        await conn.query(`
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON ${qualifiedTable}
          USING ivfflat (${columnName} ${distanceOp})
          WITH (lists = ${this.config.ivfLists})
        `);
      }
    }
  }

  /**
   * Drop all tables (dangerous - use with caution)
   */
  async dropSchema(conn: IPostgreSQLConnection): Promise<void> {
    const edgesTable = this.qualifiedTableName(this.config.edgesTable);
    const nodesTable = this.qualifiedTableName(this.config.nodesTable);
    const dataTable = this.qualifiedTableName(this.config.dataTable);

    // Drop in correct order (edges first due to foreign keys)
    await conn.query(`DROP TABLE IF EXISTS ${edgesTable} CASCADE`);
    await conn.query(`DROP TABLE IF EXISTS ${nodesTable} CASCADE`);
    await conn.query(`DROP TABLE IF EXISTS ${dataTable} CASCADE`);
  }

  /**
   * Check if schema exists
   */
  async schemaExists(conn: IPostgreSQLConnection): Promise<boolean> {
    const dataTable = this.config.dataTable;
    const nodesTable = this.config.nodesTable;
    const edgesTable = this.config.edgesTable;

    const result = await conn.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_name IN ($2, $3, $4)
    `, [this.config.schema, dataTable, nodesTable, edgesTable]);

    return result.rows[0].count === '3';
  }

  /**
   * Get fully qualified table name (schema.table)
   */
  private qualifiedTableName(tableName: string): string {
    return `${this.config.schema}.${tableName}`;
  }

  /**
   * Get the distance operator for the configured metric
   */
  private getDistanceOperator(): string {
    switch (this.config.distanceMetric) {
      case 'cosine':
        return 'vector_cosine_ops';
      case 'euclidean':
        return 'vector_l2_ops';
      case 'inner_product':
        return 'vector_ip_ops';
      default:
        return 'vector_cosine_ops';
    }
  }

  /**
   * Create update trigger for updated_at columns
   */
  async createUpdateTriggers(conn: IPostgreSQLConnection): Promise<void> {
    // Create trigger function if it doesn't exist
    await conn.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create triggers for each table
    for (const table of [this.config.dataTable, this.config.nodesTable, this.config.edgesTable]) {
      const qualifiedTable = this.qualifiedTableName(table);
      const triggerName = `${table}_updated_at_trigger`;

      await conn.query(`
        DROP TRIGGER IF EXISTS ${triggerName} ON ${qualifiedTable}
      `);

      await conn.query(`
        CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${qualifiedTable}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);
    }
  }
}
