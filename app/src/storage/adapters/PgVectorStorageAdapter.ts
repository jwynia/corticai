/**
 * PostgreSQL + pgvector Storage Adapter
 *
 * Implements both PrimaryStorage and SemanticStorage interfaces using PostgreSQL
 * with the pgvector extension for vector similarity search.
 *
 * ## Architecture Principle
 *
 * This adapter implements BOTH PrimaryStorage and SemanticStorage interfaces
 * **separately and independently**. It's a single adapter class that fulfills
 * both contracts, NOT a merged interface.
 *
 * - PrimaryStorage: Graph operations using PostgreSQL tables
 * - SemanticStorage: Analytics and queries using SQL
 * - Vector Operations: Similarity search using pgvector extension
 *
 * ## Design
 *
 * - Connection pooling via PgVectorConnectionManager
 * - SQL generation via PgVectorQueryBuilder
 * - Schema management via PgVectorSchemaManager
 * - Vector operations via pgvector extension
 *
 * @template T Entity type (default: GraphEntity for flexibility)
 */

import { PrimaryStorage } from '../interfaces/PrimaryStorage';
import { SemanticStorage, SemanticQuery, SemanticQueryResult, SearchOptions, SearchResult } from '../interfaces/SemanticStorage';
import { BatchStorage, Operation, BatchResult, PgVectorStorageConfig } from '../interfaces/Storage';
import { GraphNode, GraphEdge, GraphPath, GraphEntity, TraversalPattern, GraphQueryResult, GraphStats } from '../types/GraphTypes';
import { BaseStorageAdapter } from '../base/BaseStorageAdapter';
import { StorageError, StorageErrorCode } from '../interfaces/Storage';
import { PgVectorSchemaManager } from './PgVectorSchemaManager';
import { IPostgreSQLClient } from './database/IPostgreSQLClient';
import { PostgreSQLClient } from './database/PostgreSQLClient';

/**
 * PostgreSQL + pgvector Storage Adapter
 *
 * Implements both PrimaryStorage and SemanticStorage interfaces using a single
 * PostgreSQL backend with pgvector extension.
 */
export class PgVectorStorageAdapter<T extends GraphEntity = GraphEntity>
  extends BaseStorageAdapter<T>
  implements PrimaryStorage<T>, SemanticStorage<T> {

  // Graph traversal depth limits
  private static readonly DEFAULT_TRAVERSAL_DEPTH = 3;
  private static readonly MAX_TRAVERSAL_DEPTH = 20;
  private static readonly ABSOLUTE_MAX_DEPTH = 50; // Prevent DOS attacks

  private pg: IPostgreSQLClient;
  protected config: Required<PgVectorStorageConfig>;
  private initialized = false;
  private schemaManager: PgVectorSchemaManager;

  constructor(
    config: PgVectorStorageConfig,
    pgClient?: IPostgreSQLClient  // Optional dependency injection for testing
  ) {
    super(config);

    // Apply defaults to configuration
    this.config = {
      ...config,
      type: 'pgvector',
      schema: config.schema ?? 'public',
      vectorDimensions: config.vectorDimensions ?? 1536,
      distanceMetric: config.distanceMetric ?? 'cosine',
      autoGenerateEmbeddings: config.autoGenerateEmbeddings ?? false,
      embeddingProvider: config.embeddingProvider ?? 'none',
      poolSize: config.poolSize ?? 10,
      idleTimeout: config.idleTimeout ?? 30000,
      connectionTimeout: config.connectionTimeout ?? 5000,
      maintenanceWorkMem: config.maintenanceWorkMem ?? '256MB',
      enableVectorIndex: config.enableVectorIndex ?? true,
      indexType: config.indexType ?? 'ivfflat',
      ivfLists: config.ivfLists ?? 100,
      ivfProbes: config.ivfProbes ?? 10,
      hnswM: config.hnswM ?? 16,
      hnswEfConstruction: config.hnswEfConstruction ?? 64,
      nodesTable: config.nodesTable ?? 'nodes',
      edgesTable: config.edgesTable ?? 'edges',
      dataTable: config.dataTable ?? 'data',
    } as Required<PgVectorStorageConfig>;

    // Use injected client or create real PostgreSQL client
    this.pg = pgClient ?? new PostgreSQLClient(
      config.connectionString,
      {
        poolSize: this.config.poolSize,
        idleTimeout: this.config.idleTimeout,
        connectionTimeout: this.config.connectionTimeout
      }
    );

    // Initialize schema manager
    this.schemaManager = new PgVectorSchemaManager(this.config);
  }

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

  /**
   * Initialize the PostgreSQL connection and create schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Get a connection for setup
      const conn = await this.pg.getConnection();
      try {
        // Enable pgvector extension
        await conn.query('CREATE EXTENSION IF NOT EXISTS vector');

        // Create schema if it doesn't exist
        await conn.query(`CREATE SCHEMA IF NOT EXISTS ${this.config.schema}`);

        // Set schema search path
        await conn.query(`SET search_path TO ${this.config.schema}, public`);

        // Create tables and indexes
        await this.schemaManager.createSchema(conn);

        // Create update triggers
        await this.schemaManager.createUpdateTriggers(conn);

      } finally {
        conn.release();
      }

      this.initialized = true;
    } catch (error) {
      throw new StorageError(
        `Failed to initialize PgVector storage: ${(error as Error).message}`,
        StorageErrorCode.CONNECTION_FAILED,
        { error }
      );
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pg.close();
    this.initialized = false;
  }

  // ============================================================================
  // BASE STORAGE ADAPTER TEMPLATE METHODS
  // ============================================================================

  protected async ensureLoaded(): Promise<void> {
    await this.initialize();
  }

  protected async persist(): Promise<void> {
    // PostgreSQL persists automatically - no action needed
  }

  // ============================================================================
  // PRIMARY STORAGE INTERFACE - GRAPH OPERATIONS
  // ============================================================================

  async addNode(node: GraphNode): Promise<string> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);

      await this.pg.query(
        `INSERT INTO ${tableName} (id, type, properties)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE
         SET type = $2, properties = $3, updated_at = CURRENT_TIMESTAMP`,
        [node.id, node.type, JSON.stringify(node.properties || {})]
      );

      return node.id;
    } catch (error) {
      throw new StorageError(
        `Failed to add node "${node.id}": ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, node }
      );
    }
  }

  async getNode(nodeId: string): Promise<GraphNode | null> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);
      const result = await this.pg.query(
        `SELECT id, type, properties FROM ${tableName} WHERE id = $1`,
        [nodeId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        type: row.type,
        properties: row.properties || {}
      };
    } catch (error) {
      throw new StorageError(
        `Failed to get node "${nodeId}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, nodeId }
      );
    }
  }

  async updateNode(nodeId: string, properties: Partial<GraphNode['properties']>): Promise<boolean> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);

      // Merge properties using PostgreSQL jsonb || operator
      const result = await this.pg.query(
        `UPDATE ${tableName}
         SET properties = properties || $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(properties), nodeId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new StorageError(
        `Failed to update node "${nodeId}": ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, nodeId, properties }
      );
    }
  }

  async deleteNode(nodeId: string): Promise<boolean> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);

      // CASCADE will automatically delete related edges due to foreign key
      const result = await this.pg.query(
        `DELETE FROM ${tableName} WHERE id = $1`,
        [nodeId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new StorageError(
        `Failed to delete node "${nodeId}": ${(error as Error).message}`,
        StorageErrorCode.DELETE_FAILED,
        { error, nodeId }
      );
    }
  }

  async queryNodes(type: string, properties?: Record<string, any>): Promise<GraphNode[]> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);
      let query = `SELECT id, type, properties FROM ${tableName} WHERE type = $1`;
      const params: any[] = [type];

      // Add property filters if provided
      if (properties && Object.keys(properties).length > 0) {
        query += ` AND properties @> $2::jsonb`;
        params.push(JSON.stringify(properties));
      }

      const result = await this.pg.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        properties: row.properties || {}
      }));
    } catch (error) {
      throw new StorageError(
        `Failed to query nodes of type "${type}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, type, properties }
      );
    }
  }

  async addEdge(edge: GraphEdge): Promise<void> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.edgesTable);

      await this.pg.query(
        `INSERT INTO ${tableName} (from_node, to_node, type, properties)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (from_node, to_node, type) DO UPDATE
         SET properties = $4`,
        [edge.from, edge.to, edge.type, JSON.stringify(edge.properties || {})]
      );
    } catch (error) {
      throw new StorageError(
        `Failed to add edge ${edge.from} -> ${edge.to} (${edge.type}): ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, edge }
      );
    }
  }

  async getEdge(from: string, to: string, type?: string): Promise<GraphEdge | null> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.edgesTable);
      let query = `SELECT from_node, to_node, type, properties FROM ${tableName} WHERE from_node = $1 AND to_node = $2`;
      const params: any[] = [from, to];

      if (type) {
        query += ` AND type = $3`;
        params.push(type);
      }

      const result = await this.pg.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        from: row.from_node,
        to: row.to_node,
        type: row.type,
        properties: row.properties || {}
      };
    } catch (error) {
      throw new StorageError(
        `Failed to get edge ${from} -> ${to}: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, from, to, type }
      );
    }
  }

  async deleteEdge(from: string, to: string, type?: string): Promise<boolean> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.edgesTable);
      let query = `DELETE FROM ${tableName} WHERE from_node = $1 AND to_node = $2`;
      const params: any[] = [from, to];

      if (type) {
        query += ` AND type = $3`;
        params.push(type);
      }

      const result = await this.pg.query(query, params);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new StorageError(
        `Failed to delete edge ${from} -> ${to}: ${(error as Error).message}`,
        StorageErrorCode.DELETE_FAILED,
        { error, from, to, type }
      );
    }
  }

  async getEdges(nodeId: string, edgeTypes?: string[]): Promise<GraphEdge[]> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.edgesTable);
      const params: any[] = [nodeId];
      let query = `SELECT from_node, to_node, type, properties FROM ${tableName} WHERE (from_node = $1 OR to_node = $1)`;

      // Add edge type filter if provided
      if (edgeTypes && edgeTypes.length > 0) {
        query += ` AND type = ANY($2::text[])`;
        params.push(edgeTypes);
      }

      const result = await this.pg.query(query, params);

      return result.rows.map(row => ({
        from: row.from_node,
        to: row.to_node,
        type: row.type,
        properties: row.properties || {}
      }));
    } catch (error) {
      throw new StorageError(
        `Failed to get edges for node "${nodeId}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, nodeId, edgeTypes }
      );
    }
  }

  async traverse(pattern: TraversalPattern): Promise<GraphPath[]> {
    await this.ensureLoaded();

    try {
      const nodesTable = this.qualifiedTableName(this.config.nodesTable);
      const edgesTable = this.qualifiedTableName(this.config.edgesTable);
      const maxDepth = pattern.maxDepth || PgVectorStorageAdapter.DEFAULT_TRAVERSAL_DEPTH;

      // Build edge type filter
      const edgeTypeFilter = pattern.edgeTypes && pattern.edgeTypes.length > 0
        ? `AND e.type = ANY($2::text[])`
        : '';

      // Build direction filter
      let directionJoin = '';
      if (pattern.direction === 'outgoing') {
        directionJoin = 'e.from_node = ps.id AND next_node.id = e.to_node';
      } else if (pattern.direction === 'incoming') {
        directionJoin = 'e.to_node = ps.id AND next_node.id = e.from_node';
      } else {
        // Both directions
        directionJoin = '(e.from_node = ps.id AND next_node.id = e.to_node) OR (e.to_node = ps.id AND next_node.id = e.from_node)';
      }

      // Build params array
      const params: any[] = [pattern.startNode];
      if (pattern.edgeTypes && pattern.edgeTypes.length > 0) {
        params.push(pattern.edgeTypes);
      }

      // Use recursive CTE to find all paths
      const result = await this.pg.query(`
        WITH RECURSIVE path_traversal AS (
          -- Base case: starting node
          SELECT
            n.id,
            n.type,
            n.properties,
            ARRAY[n.id] as path_nodes,
            ARRAY[]::jsonb[] as path_edges_data,
            0 as depth
          FROM ${nodesTable} n
          WHERE n.id = $1

          UNION ALL

          -- Recursive case: explore paths
          SELECT
            next_node.id,
            next_node.type,
            next_node.properties,
            pt.path_nodes || next_node.id,
            pt.path_edges_data || jsonb_build_object(
              'from', e.from_node,
              'to', e.to_node,
              'type', e.type,
              'properties', e.properties
            ),
            pt.depth + 1
          FROM path_traversal pt
          JOIN ${edgesTable} e ON (${directionJoin})
          JOIN ${nodesTable} next_node ON (${directionJoin})
          WHERE next_node.id != ALL(pt.path_nodes)  -- Avoid cycles
            AND pt.depth < ${maxDepth}
            ${edgeTypeFilter}
        )
        SELECT DISTINCT path_nodes, path_edges_data, depth
        FROM path_traversal
        WHERE depth > 0  -- Exclude starting node alone
        ORDER BY depth, array_length(path_nodes, 1)
      `, params);

      // Convert results to GraphPath[]
      const paths: GraphPath[] = [];
      for (const row of result.rows) {
        const nodeIds = row.path_nodes as string[];
        const edgesData = row.path_edges_data as any[];

        // Fetch full node data
        const nodesResult = await this.pg.query(`
          SELECT id, type, properties
          FROM ${nodesTable}
          WHERE id = ANY($1::text[])
        `, [nodeIds]);

        // Build node lookup
        const nodeMap = new Map<string, GraphNode>();
        for (const nodeRow of nodesResult.rows) {
          nodeMap.set(nodeRow.id, {
            id: nodeRow.id,
            type: nodeRow.type,
            properties: nodeRow.properties || {}
          });
        }

        // Build nodes array in order
        const nodes: GraphNode[] = nodeIds.map(id => nodeMap.get(id)!).filter(Boolean);

        // Build edges array from stored data
        const edges: GraphEdge[] = edgesData.map(edgeData => ({
          from: edgeData.from,
          to: edgeData.to,
          type: edgeData.type,
          properties: edgeData.properties || {}
        }));

        // Apply node and edge filters if specified
        let includesPath = true;
        if (pattern.nodeFilter) {
          if (pattern.nodeFilter.types && pattern.nodeFilter.types.length > 0) {
            includesPath = nodes.some(n => pattern.nodeFilter!.types!.includes(n.type));
          }
          // TODO: Property filtering on nodes - requires JSONB containment operator (@>) for efficient matching
        }

        if (includesPath) {
          paths.push({
            nodes,
            edges,
            length: edges.length,
            weight: edges.length
          });
        }
      }

      return paths;
    } catch (error) {
      throw new StorageError(
        `Failed to traverse from "${pattern.startNode}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, pattern }
      );
    }
  }

  async shortestPath(fromNodeId: string, toNodeId: string, edgeTypes?: string[]): Promise<GraphPath | null> {
    await this.ensureLoaded();

    try {
      const nodesTable = this.qualifiedTableName(this.config.nodesTable);
      const edgesTable = this.qualifiedTableName(this.config.edgesTable);

      // Build edge type filter
      const edgeTypeFilter = edgeTypes && edgeTypes.length > 0
        ? `AND e.type = ANY($3::text[])`
        : '';
      const params: any[] = [fromNodeId, toNodeId];
      if (edgeTypes && edgeTypes.length > 0) {
        params.push(edgeTypes);
      }

      // Use recursive CTE to find shortest path with BFS
      const result = await this.pg.query(`
        WITH RECURSIVE path_search AS (
          -- Base case: starting node
          SELECT
            n.id,
            n.type,
            n.properties,
            ARRAY[n.id] as path_nodes,
            ARRAY[]::text[] as path_edges,
            0 as depth
          FROM ${nodesTable} n
          WHERE n.id = $1

          UNION ALL

          -- Recursive case: explore neighbors
          SELECT
            next_node.id,
            next_node.type,
            next_node.properties,
            ps.path_nodes || next_node.id,
            ps.path_edges || e.type,
            ps.depth + 1
          FROM path_search ps
          JOIN ${edgesTable} e ON (e.from_node = ps.id OR e.to_node = ps.id)
          JOIN ${nodesTable} next_node ON (
            (e.from_node = ps.id AND next_node.id = e.to_node) OR
            (e.to_node = ps.id AND next_node.id = e.from_node)
          )
          WHERE next_node.id != ALL(ps.path_nodes)  -- Avoid cycles
            AND ps.depth < ${PgVectorStorageAdapter.MAX_TRAVERSAL_DEPTH}
            ${edgeTypeFilter}
        )
        SELECT path_nodes, path_edges, depth
        FROM path_search
        WHERE id = $2
        ORDER BY depth
        LIMIT 1
      `, params);

      if (result.rows.length === 0) {
        return null; // No path found
      }

      const row = result.rows[0];
      const nodeIds = row.path_nodes as string[];

      // Fetch full node data for the path
      const nodesResult = await this.pg.query(`
        SELECT id, type, properties
        FROM ${nodesTable}
        WHERE id = ANY($1::text[])
      `, [nodeIds]);

      // Create lookup map for nodes
      const nodeMap = new Map<string, GraphNode>();
      for (const nodeRow of nodesResult.rows) {
        nodeMap.set(nodeRow.id, {
          id: nodeRow.id,
          type: nodeRow.type,
          properties: nodeRow.properties || {}
        });
      }

      // Build nodes array in path order
      const nodes: GraphNode[] = nodeIds.map(id => nodeMap.get(id)!).filter(Boolean);

      // Build edges array (between consecutive nodes in path)
      const edges: GraphEdge[] = [];
      for (let i = 0; i < nodeIds.length - 1; i++) {
        // Fetch the actual edge between consecutive nodes
        const edgeResult = await this.pg.query(`
          SELECT from_node, to_node, type, properties
          FROM ${edgesTable}
          WHERE (from_node = $1 AND to_node = $2) OR (from_node = $2 AND to_node = $1)
          LIMIT 1
        `, [nodeIds[i], nodeIds[i + 1]]);

        if (edgeResult.rows.length > 0) {
          const edgeRow = edgeResult.rows[0];
          edges.push({
            from: edgeRow.from_node,
            to: edgeRow.to_node,
            type: edgeRow.type,
            properties: edgeRow.properties || {}
          });
        }
      }

      return {
        nodes,
        edges,
        length: nodes.length - 1,
        weight: edges.length
      };
    } catch (error) {
      throw new StorageError(
        `Failed to find shortest path from "${fromNodeId}" to "${toNodeId}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, fromNodeId, toNodeId, edgeTypes }
      );
    }
  }

  async findConnected(nodeId: string, maxDepth?: number): Promise<GraphNode[]> {
    await this.ensureLoaded();

    const depth = maxDepth || 3; // Default max depth

    try {
      const nodesTable = this.qualifiedTableName(this.config.nodesTable);
      const edgesTable = this.qualifiedTableName(this.config.edgesTable);

      // Use recursive CTE to find all connected nodes within depth
      const result = await this.pg.query(`
        WITH RECURSIVE connected_nodes AS (
          -- Base case: starting node
          SELECT id, type, properties, 0 as depth
          FROM ${nodesTable}
          WHERE id = $1

          UNION

          -- Recursive case: follow edges up to max depth
          SELECT DISTINCT n.id, n.type, n.properties, cn.depth + 1
          FROM connected_nodes cn
          JOIN ${edgesTable} e ON (e.from_node = cn.id OR e.to_node = cn.id)
          JOIN ${nodesTable} n ON (
            (e.from_node = cn.id AND n.id = e.to_node) OR
            (e.to_node = cn.id AND n.id = e.from_node)
          )
          WHERE cn.depth < $2
            AND n.id NOT IN (SELECT id FROM connected_nodes)
        )
        SELECT DISTINCT id, type, properties
        FROM connected_nodes
        WHERE id != $1  -- Exclude starting node
        ORDER BY id
      `, [nodeId, depth]);

      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        properties: row.properties || {}
      }));
    } catch (error) {
      throw new StorageError(
        `Failed to find connected nodes for "${nodeId}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, nodeId, maxDepth: depth }
      );
    }
  }

  async patternMatch(pattern: any): Promise<GraphQueryResult> {
    await this.ensureLoaded();
    // TODO: Implement pattern matching
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async getGraphStats(): Promise<GraphStats> {
    await this.ensureLoaded();

    try {
      const nodesTable = this.qualifiedTableName(this.config.nodesTable);
      const edgesTable = this.qualifiedTableName(this.config.edgesTable);

      // Get node count and node types
      const nodeStatsResult = await this.pg.query(`
        SELECT
          COUNT(*) as total_nodes,
          jsonb_object_agg(type, count) as nodes_by_type
        FROM (
          SELECT type, COUNT(*) as count
          FROM ${nodesTable}
          GROUP BY type
        ) node_counts
      `);

      // Get edge count and edge types
      const edgeStatsResult = await this.pg.query(`
        SELECT
          COUNT(*) as total_edges,
          jsonb_object_agg(type, count) as edges_by_type
        FROM (
          SELECT type, COUNT(*) as count
          FROM ${edgesTable}
          GROUP BY type
        ) edge_counts
      `);

      // Get database size (approximate)
      const sizeResult = await this.pg.query(`
        SELECT pg_total_relation_size($1::regclass) as size
      `, [nodesTable]);

      const nodeRow = nodeStatsResult.rows[0] || {};
      const edgeRow = edgeStatsResult.rows[0] || {};
      const sizeRow = sizeResult.rows[0] || {};

      return {
        nodeCount: parseInt(nodeRow.total_nodes || '0'),
        edgeCount: parseInt(edgeRow.total_edges || '0'),
        nodesByType: nodeRow.nodes_by_type || {},
        edgesByType: edgeRow.edges_by_type || {},
        databaseSize: parseInt(sizeRow.size || '0'),
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new StorageError(
        `Failed to get graph stats: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      );
    }
  }

  async storeEntity(entity: T): Promise<void> {
    await this.ensureLoaded();

    // Entity storage is just adding a node to the graph
    // GraphEntity extends {id, type, properties} which matches GraphNode
    try {
      await this.addNode(entity as unknown as GraphNode);
    } catch (error) {
      throw new StorageError(
        `Failed to store entity "${entity.id}": ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, entity }
      );
    }
  }

  async streamEpisodes(episodes: T[]): Promise<void> {
    await this.ensureLoaded();

    // Batch insert episodes for high throughput
    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);

      // Build multi-row INSERT statement
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const episode of episodes) {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
        params.push(
          episode.id,
          episode.type,
          JSON.stringify(episode.properties || {})
        );
        paramIndex += 3;
      }

      if (values.length === 0) {
        return; // No episodes to insert
      }

      await this.pg.query(
        `INSERT INTO ${tableName} (id, type, properties)
         VALUES ${values.join(', ')}
         ON CONFLICT (id) DO UPDATE
         SET type = EXCLUDED.type, properties = EXCLUDED.properties, updated_at = CURRENT_TIMESTAMP`,
        params
      );
    } catch (error) {
      throw new StorageError(
        `Failed to stream episodes: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, count: episodes.length }
      );
    }
  }

  // ============================================================================
  // SEMANTIC STORAGE INTERFACE - ANALYTICS & QUERIES
  // ============================================================================

  async query<R = any>(query: SemanticQuery): Promise<SemanticQueryResult<R>> {
    await this.ensureLoaded();
    // TODO: Implement semantic query
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async executeSQL<R = any>(sql: string, params?: any[]): Promise<R[]> {
    await this.ensureLoaded();
    // TODO: Implement SQL execution
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async aggregate(table: string, aggregations: any[], groupBy?: string[]): Promise<any[]> {
    await this.ensureLoaded();
    // TODO: Implement aggregation
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async groupBy(table: string, fields: string[], aggregations: any[]): Promise<any[]> {
    await this.ensureLoaded();
    // TODO: Implement group by
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async search<R = any>(table: string, searchText: string, options?: SearchOptions): Promise<SearchResult<R>[]> {
    await this.ensureLoaded();
    // TODO: Implement full-text search
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async createSearchIndex(table: string, fields: string[]): Promise<void> {
    await this.ensureLoaded();
    // TODO: Implement search index creation
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async createMaterializedView(name: string, query: SemanticQuery): Promise<void> {
    await this.ensureLoaded();
    // TODO: Implement materialized view creation
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async refreshMaterializedView(name: string): Promise<void> {
    await this.ensureLoaded();
    // TODO: Implement materialized view refresh
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  // ============================================================================
  // VECTOR OPERATIONS (pgvector-specific)
  // ============================================================================

  /**
   * Create a vector index on a table column
   */
  async createVectorIndex(table: string, column: string, dimensions?: number): Promise<void> {
    await this.ensureLoaded();
    // TODO: Implement vector index creation
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  /**
   * Perform vector similarity search
   */
  async vectorSearch(table: string, queryVector: number[], options?: {
    limit?: number;
    distanceMetric?: 'cosine' | 'euclidean' | 'inner_product';
    threshold?: number;
    filters?: any[];
  }): Promise<any[]> {
    await this.ensureLoaded();
    // TODO: Implement vector similarity search
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  /**
   * Insert data with embedding vector
   */
  async insertWithEmbedding(table: string, data: any, embedding: number[]): Promise<void> {
    await this.ensureLoaded();
    // TODO: Implement insert with embedding
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  // ============================================================================
  // STORAGE INTERFACE - BASIC CRUD
  // ============================================================================

  async get(key: string): Promise<T | undefined> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.dataTable);
      const result = await this.pg.query(
        `SELECT value FROM ${tableName} WHERE key = $1`,
        [key]
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0].value as T;
    } catch (error) {
      throw new StorageError(
        `Failed to get key "${key}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, key }
      );
    }
  }

  async set(key: string, value: T): Promise<void> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.dataTable);

      // Use INSERT ... ON CONFLICT DO UPDATE (upsert)
      await this.pg.query(
        `INSERT INTO ${tableName} (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE
         SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value)]
      );
    } catch (error) {
      throw new StorageError(
        `Failed to set key "${key}": ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, key }
      );
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.dataTable);
      const result = await this.pg.query(
        `DELETE FROM ${tableName} WHERE key = $1`,
        [key]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new StorageError(
        `Failed to delete key "${key}": ${(error as Error).message}`,
        StorageErrorCode.DELETE_FAILED,
        { error, key }
      );
    }
  }

  async has(key: string): Promise<boolean> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.dataTable);
      const result = await this.pg.query(
        `SELECT 1 FROM ${tableName} WHERE key = $1 LIMIT 1`,
        [key]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw new StorageError(
        `Failed to check key "${key}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, key }
      );
    }
  }

  async clear(): Promise<void> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.dataTable);
      await this.pg.query(`TRUNCATE TABLE ${tableName}`);
    } catch (error) {
      throw new StorageError(
        `Failed to clear storage: ${(error as Error).message}`,
        StorageErrorCode.DELETE_FAILED,
        { error }
      );
    }
  }

  async size(): Promise<number> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.dataTable);
      const result = await this.pg.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new StorageError(
        `Failed to get storage size: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      );
    }
  }

  async *keys(): AsyncIterableIterator<string> {
    await this.ensureLoaded();

    const tableName = this.qualifiedTableName(this.config.dataTable);
    const conn = await this.pg.getConnection();

    try {
      const result = await conn.query(
        `SELECT key FROM ${tableName} ORDER BY key`
      );

      for (const row of result.rows) {
        yield row.key;
      }
    } catch (error) {
      throw new StorageError(
        `Failed to iterate keys: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      );
    } finally {
      conn.release();
    }
  }

  async *values(): AsyncIterableIterator<T> {
    await this.ensureLoaded();

    const tableName = this.qualifiedTableName(this.config.dataTable);
    const conn = await this.pg.getConnection();

    try {
      const result = await conn.query(
        `SELECT value FROM ${tableName} ORDER BY key`
      );

      for (const row of result.rows) {
        yield row.value as T;
      }
    } catch (error) {
      throw new StorageError(
        `Failed to iterate values: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      );
    } finally {
      conn.release();
    }
  }

  async *entries(): AsyncIterableIterator<[string, T]> {
    await this.ensureLoaded();

    const tableName = this.qualifiedTableName(this.config.dataTable);
    const conn = await this.pg.getConnection();

    try {
      const result = await conn.query(
        `SELECT key, value FROM ${tableName} ORDER BY key`
      );

      for (const row of result.rows) {
        yield [row.key, row.value as T];
      }
    } catch (error) {
      throw new StorageError(
        `Failed to iterate entries: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      );
    } finally {
      conn.release();
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get fully qualified table name (schema.table)
   */
  private qualifiedTableName(tableName: string): string {
    return `${this.config.schema}.${tableName}`;
  }
}
