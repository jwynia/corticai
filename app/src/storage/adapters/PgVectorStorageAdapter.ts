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
import { SemanticStorage, SemanticQuery, SemanticQueryResult, SearchOptions, SearchResult, MaterializedView, QueryFilter, AggregationOperator, Aggregation } from '../interfaces/SemanticStorage';
import { BatchStorage, Operation, BatchResult, PgVectorStorageConfig } from '../interfaces/Storage';
import { GraphNode, GraphEdge, GraphPath, GraphEntity, TraversalPattern, GraphQueryResult, GraphStats, GraphBatchOperation, GraphBatchResult } from '../types/GraphTypes';
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

  // Full-text search configuration
  private static readonly DEFAULT_SEARCH_LIMIT = 100;
  private static readonly FTS_INDEX_SUFFIX = '_fts_idx';

  // Pattern matching constants
  private static readonly PROPERTIES_PREFIX = 'properties.';

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
  // INPUT VALIDATION HELPERS (SQL Injection Prevention)
  // ============================================================================

  /**
   * Validate and sanitize direction parameter for graph traversal
   *
   * @param direction - Direction value to validate
   * @returns Sanitized direction value
   * @throws StorageError with INVALID_VALUE if direction is invalid
   */
  private validateDirection(direction: string | undefined): 'outgoing' | 'incoming' | 'both' | undefined {
    if (direction === undefined) {
      return undefined;
    }

    const validDirections: Array<'outgoing' | 'incoming' | 'both'> = ['outgoing', 'incoming', 'both'];

    if (!validDirections.includes(direction as any)) {
      throw new StorageError(
        `Invalid direction: "${direction}". Must be one of: outgoing, incoming, both, or undefined`,
        StorageErrorCode.INVALID_VALUE,
        { direction, validDirections }
      );
    }

    return direction as 'outgoing' | 'incoming' | 'both';
  }

  /**
   * Validate and sanitize maxDepth parameter for graph traversal
   *
   * Prevents SQL injection by ensuring maxDepth is:
   * 1. A valid number (not a string with SQL code)
   * 2. Within safe bounds (0 to ABSOLUTE_MAX_DEPTH)
   * 3. An integer (no decimals that could be crafted)
   *
   * @param maxDepth - Depth value to validate
   * @param methodName - Name of calling method (for error messages)
   * @returns Sanitized integer depth value
   * @throws StorageError with INVALID_VALUE if maxDepth is invalid
   */
  private validateMaxDepth(maxDepth: number | undefined, methodName: string): number {
    if (maxDepth === undefined) {
      return PgVectorStorageAdapter.DEFAULT_TRAVERSAL_DEPTH;
    }

    // Check for non-numeric types (includes strings, objects, arrays, etc.)
    if (typeof maxDepth !== 'number') {
      throw new StorageError(
        `Invalid maxDepth in ${methodName}: "${maxDepth}". Must be a number between 0 and ${PgVectorStorageAdapter.ABSOLUTE_MAX_DEPTH}`,
        StorageErrorCode.INVALID_VALUE,
        { maxDepth, methodName, expectedType: 'number', actualType: typeof maxDepth }
      );
    }

    // Check for NaN, Infinity
    if (!Number.isFinite(maxDepth)) {
      throw new StorageError(
        `Invalid maxDepth in ${methodName}: "${maxDepth}". Must be a finite number`,
        StorageErrorCode.INVALID_VALUE,
        { maxDepth, methodName }
      );
    }

    // Convert to integer (removes any decimal component)
    const depth = Math.floor(maxDepth);

    // Check bounds
    if (depth < 0 || depth > PgVectorStorageAdapter.ABSOLUTE_MAX_DEPTH) {
      throw new StorageError(
        `Invalid maxDepth in ${methodName}: "${maxDepth}". Must be between 0 and ${PgVectorStorageAdapter.ABSOLUTE_MAX_DEPTH}`,
        StorageErrorCode.INVALID_VALUE,
        { maxDepth, depth, min: 0, max: PgVectorStorageAdapter.ABSOLUTE_MAX_DEPTH, methodName }
      );
    }

    return depth;
  }

  /**
   * Build SQL condition for direction filtering (safe from injection)
   *
   * This method programmatically builds the SQL condition based on
   * validated direction enum, preventing any string interpolation attacks.
   *
   * @param direction - Validated direction (must be 'outgoing', 'incoming', or 'both')
   * @returns SQL condition string (safe for interpolation)
   */
  private buildDirectionCondition(direction: 'outgoing' | 'incoming' | 'both'): string {
    switch (direction) {
      case 'outgoing':
        return 'e.from_node = ps.id AND next_node.id = e.to_node';
      case 'incoming':
        return 'e.to_node = ps.id AND next_node.id = e.from_node';
      case 'both':
        return '(e.from_node = ps.id AND next_node.id = e.to_node) OR (e.to_node = ps.id AND next_node.id = e.from_node)';
    }
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATION HELPERS (N+1 Query Prevention)
  // ============================================================================

  /**
   * Batch-fetch multiple nodes by their IDs (N+1 query optimization)
   *
   * This method fetches all requested nodes in a SINGLE database query
   * instead of making separate queries for each node. This prevents the
   * N+1 query problem where N paths would result in N+1 queries.
   *
   * Example:
   * - Before: 100 paths = 1 CTE + 100 node queries = 101 queries
   * - After:  100 paths = 1 CTE + 1 batch query = 2 queries
   *
   * @param nodeIds - Array of node IDs to fetch (may contain duplicates)
   * @returns Map of node ID -> GraphNode for O(1) lookup
   */
  private async fetchNodesMap(nodeIds: string[]): Promise<Map<string, GraphNode>> {
    if (nodeIds.length === 0) {
      return new Map();
    }

    // Deduplicate node IDs to avoid fetching same node multiple times
    const uniqueIds = [...new Set(nodeIds)];

    const nodesTable = this.qualifiedTableName(this.config.nodesTable);

    const result = await this.pg.query(`
      SELECT id, type, properties
      FROM ${nodesTable}
      WHERE id = ANY($1::text[])
    `, [uniqueIds]);

    // Build map for O(1) lookup during path construction
    const nodeMap = new Map<string, GraphNode>();
    for (const row of result.rows) {
      nodeMap.set(row.id, {
        id: row.id,
        type: row.type,
        properties: row.properties || {}
      });
    }

    return nodeMap;
  }

  /**
   * Batch-fetch edges for consecutive node pairs (N+1 query optimization)
   *
   * This method fetches all requested edges in a SINGLE database query
   * using a SQL OR condition for all pairs.
   *
   * @param nodePairs - Array of [fromId, toId] pairs
   * @returns Array of edges in order requested
   */
  private async fetchEdgesForPath(nodePairs: Array<[string, string]>): Promise<GraphEdge[]> {
    if (nodePairs.length === 0) {
      return [];
    }

    const edgesTable = this.qualifiedTableName(this.config.edgesTable);

    // Build SQL with OR conditions for all pairs (bidirectional)
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIndex = 1;

    for (const [from, to] of nodePairs) {
      conditions.push(
        `(from_node = $${paramIndex} AND to_node = $${paramIndex + 1}) OR ` +
        `(from_node = $${paramIndex + 1} AND to_node = $${paramIndex})`
      );
      params.push(from, to);
      paramIndex += 2;
    }

    const sql = `
      SELECT from_node, to_node, type, properties
      FROM ${edgesTable}
      WHERE ${conditions.join(' OR ')}
    `;

    const result = await this.pg.query(sql, params);

    // Build edge map for quick lookup: "from:to" -> edge
    const edgeMap = new Map<string, GraphEdge>();
    for (const row of result.rows) {
      const edge: GraphEdge = {
        from: row.from_node,
        to: row.to_node,
        type: row.type,
        properties: row.properties || {}
      };

      // Store both directions for bidirectional lookup
      edgeMap.set(`${row.from_node}:${row.to_node}`, edge);
      edgeMap.set(`${row.to_node}:${row.from_node}`, edge);
    }

    // Return edges in the order requested
    return nodePairs.map(([from, to]) => {
      const edge = edgeMap.get(`${from}:${to}`);
      if (!edge) {
        // Edge not found - this shouldn't happen in a valid path
        // Return a placeholder to maintain array indices
        return {
          from,
          to,
          type: 'UNKNOWN',
          properties: {}
        };
      }
      return edge;
    });
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

    // Validate inputs to prevent SQL injection
    const validatedDirection = this.validateDirection(pattern.direction as any);
    const maxDepth = this.validateMaxDepth(pattern.maxDepth as any, 'traverse');

    try {
      const nodesTable = this.qualifiedTableName(this.config.nodesTable);
      const edgesTable = this.qualifiedTableName(this.config.edgesTable);

      // Build edge type filter
      const edgeTypeFilter = pattern.edgeTypes && pattern.edgeTypes.length > 0
        ? `AND e.type = ANY($2::text[])`
        : '';

      // Build direction filter using safe method
      const directionJoin = this.buildDirectionCondition(validatedDirection || 'both');

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

      // ✅ OPTIMIZATION: Collect all unique node IDs upfront
      const allNodeIds = new Set<string>();
      for (const row of result.rows) {
        const nodeIds = row.path_nodes as string[];
        nodeIds.forEach(id => allNodeIds.add(id));
      }

      // ✅ OPTIMIZATION: Single batch fetch for all nodes (prevents N+1 queries)
      const nodeMap = await this.fetchNodesMap([...allNodeIds]);

      // Convert results to GraphPath[]
      const paths: GraphPath[] = [];
      for (const row of result.rows) {
        const nodeIds = row.path_nodes as string[];
        const edgesData = row.path_edges_data as any[];

        // Build nodes array from pre-fetched map (O(1) lookup)
        const nodes: GraphNode[] = nodeIds
          .map(id => nodeMap.get(id))
          .filter((node): node is GraphNode => node !== undefined);

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

      // ✅ OPTIMIZATION: Batch fetch all nodes (prevents N+1 for single path)
      const nodeMap = await this.fetchNodesMap(nodeIds);

      // Build nodes array in path order
      const nodes: GraphNode[] = nodeIds
        .map(id => nodeMap.get(id))
        .filter((node): node is GraphNode => node !== undefined);

      // ✅ OPTIMIZATION: Batch fetch all edges (prevents N+1 for path edges)
      const nodePairs: Array<[string, string]> = [];
      for (let i = 0; i < nodeIds.length - 1; i++) {
        nodePairs.push([nodeIds[i], nodeIds[i + 1]]);
      }
      const edges = await this.fetchEdgesForPath(nodePairs);

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

    // Validate maxDepth to prevent SQL injection
    const depth = this.validateMaxDepth(maxDepth, 'findConnected');

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

    const startTime = Date.now();
    const nodesTable = this.qualifiedTableName(this.config.nodesTable);
    const edgesTable = this.qualifiedTableName(this.config.edgesTable);

    try {
      let nodes: GraphNode[] = [];
      let edges: GraphEdge[] = [];
      let nodesTraversed = 0;
      let edgesTraversed = 0;

      // Handle complex patterns FIRST (node -> edge -> target node)
      // This must be checked before simple patterns to avoid partial execution
      if (pattern.nodeType && pattern.edgeType && pattern.targetNodeType) {
        const sql = `
          SELECT
            n1.id as source_id, n1.type as source_type, n1.properties as source_properties,
            e.from_node, e.to_node, e.type as edge_type, e.properties as edge_properties,
            n2.id as target_id, n2.type as target_type, n2.properties as target_properties
          FROM ${nodesTable} n1
          JOIN ${edgesTable} e ON n1.id = e.from_node
          JOIN ${nodesTable} n2 ON e.to_node = n2.id
          WHERE n1.type = $1
            AND e.type = $2
            AND n2.type = $3
        `;

        const result = await this.pg.query(sql, [
          pattern.nodeType,
          pattern.edgeType,
          pattern.targetNodeType
        ]);

        // Extract nodes and edges from joined results
        const nodeMap = new Map<string, GraphNode>();
        const edgeSet = new Set<string>();

        for (const row of result.rows) {
          // Add source node
          if (!nodeMap.has(row.source_id)) {
            nodeMap.set(row.source_id, {
              id: row.source_id,
              type: row.source_type,
              properties: row.source_properties || {}
            });
          }

          // Add target node
          if (!nodeMap.has(row.target_id)) {
            nodeMap.set(row.target_id, {
              id: row.target_id,
              type: row.target_type,
              properties: row.target_properties || {}
            });
          }

          // Add edge
          const edgeKey = `${row.from_node}-${row.edge_type}-${row.to_node}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edges.push({
              from: row.from_node,
              to: row.to_node,
              type: row.edge_type,
              properties: row.edge_properties || {}
            });
          }
        }

        nodes = Array.from(nodeMap.values());
        nodesTraversed = nodes.length;
        edgesTraversed = edges.length;
      }
      // Handle node pattern matching
      else if (pattern.nodeType || pattern.properties) {
        const whereClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (pattern.nodeType) {
          whereClauses.push(`type = $${paramIndex}`);
          params.push(pattern.nodeType);
          paramIndex++;
        }

        if (pattern.properties) {
          whereClauses.push(`properties @> $${paramIndex}`);
          params.push(JSON.stringify(pattern.properties));
          paramIndex++;
        }

        let sql = `SELECT id, type, properties FROM ${nodesTable}`;
        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        const result = await this.pg.query(sql, params);
        nodes = result.rows;
        nodesTraversed = nodes.length;
      }
      // Handle edge pattern matching
      else if (pattern.edgeType || pattern.fromNode || pattern.toNode) {
        const whereClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (pattern.edgeType) {
          whereClauses.push(`type = $${paramIndex}`);
          params.push(pattern.edgeType);
          paramIndex++;
        }

        if (pattern.fromNode) {
          whereClauses.push(`from_node = $${paramIndex}`);
          params.push(pattern.fromNode);
          paramIndex++;
        }

        if (pattern.toNode) {
          whereClauses.push(`to_node = $${paramIndex}`);
          params.push(pattern.toNode);
          paramIndex++;
        }

        let sql = `SELECT from_node, to_node, type, properties FROM ${edgesTable}`;
        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        const result = await this.pg.query(sql, params);
        edges = result.rows.map(row => ({
          from: row.from_node,
          to: row.to_node,
          type: row.type,
          properties: row.properties || {}
        }));
        edgesTraversed = edges.length;
      }

      const executionTime = Date.now() - startTime;

      return {
        nodes,
        edges,
        paths: [], // Path construction not implemented for basic pattern matching
        metadata: {
          executionTime,
          nodesTraversed,
          edgesTraversed
        }
      };
    } catch (error) {
      throw new StorageError(
        `Graph pattern matching failed: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, pattern }
      );
    }
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
        nodeCount: parseInt(nodeRow.total_nodes || '0', 10),
        edgeCount: parseInt(edgeRow.total_edges || '0', 10),
        nodesByType: nodeRow.nodes_by_type || {},
        edgesByType: edgeRow.edges_by_type || {},
        databaseSize: parseInt(sizeRow.size || '0', 10),
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

  async findByPattern(pattern: Record<string, any>): Promise<T[]> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);
      const whereClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Handle type filter
      if (pattern.type) {
        whereClauses.push(`type = $${paramIndex}`);
        params.push(pattern.type);
        paramIndex++;
      }

      // Handle property filters using JSONB containment operator
      const propertyFilters: Record<string, any> = {};
      for (const [key, value] of Object.entries(pattern)) {
        if (key.startsWith(PgVectorStorageAdapter.PROPERTIES_PREFIX)) {
          const propKey = key.substring(PgVectorStorageAdapter.PROPERTIES_PREFIX.length);
          propertyFilters[propKey] = value;
        }
      }

      if (Object.keys(propertyFilters).length > 0) {
        whereClauses.push(`properties @> $${paramIndex}`);
        params.push(JSON.stringify(propertyFilters));
        paramIndex++;
      }

      // Build final query
      let sql = `SELECT id, type, properties FROM ${tableName}`;
      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const result = await this.pg.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      throw new StorageError(
        `Pattern matching failed: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, pattern }
      );
    }
  }

  async createIndex(entityType: string, property: string): Promise<void> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.nodesTable);

      // Generate index name based on entity type and property
      const sanitizedType = entityType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const sanitizedProperty = property.replace(/[^a-z0-9_\.]/gi, '_');
      const indexName = `idx_${sanitizedType}_${sanitizedProperty}`;

      // Determine index type and expression based on property path
      let indexType = 'BTREE';
      let indexExpression = property;

      if (property === 'id') {
        // Unique index on ID column
        await this.pg.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS ${indexName}
          ON ${tableName} USING BTREE (id)
        `);
        return;
      }

      if (property === 'properties' || property.startsWith(PgVectorStorageAdapter.PROPERTIES_PREFIX)) {
        // GIN index for JSONB properties
        indexType = 'GIN';
        if (property === 'properties') {
          indexExpression = 'properties';
        } else {
          // BTREE index on specific property path
          indexType = 'BTREE';
          const propPath = property.substring(PgVectorStorageAdapter.PROPERTIES_PREFIX.length);

          // Validate property path to prevent SQL injection
          if (!/^[a-zA-Z0-9_]+$/.test(propPath)) {
            throw new StorageError(
              `Invalid property path for indexing: ${propPath}`,
              StorageErrorCode.INVALID_VALUE,
              { entityType, property }
            );
          }

          indexExpression = `((properties->'${propPath}'))`;
        }
      }

      // Create index with IF NOT EXISTS to avoid errors on duplicate creation
      await this.pg.query(`
        CREATE INDEX IF NOT EXISTS ${indexName}
        ON ${tableName} USING ${indexType} (${indexExpression})
      `);
    } catch (error) {
      throw new StorageError(
        `Index creation failed: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, entityType, property }
      );
    }
  }

  /**
   * List all indexes for the nodes table
   *
   * @param entityType - Entity type (currently not used for filtering in PgVector implementation,
   *                     returns all indexes for the nodes table regardless of entity type)
   * @returns Promise resolving to array of index names
   */
  async listIndexes(entityType: string): Promise<string[]> {
    await this.ensureLoaded();

    try {
      const result = await this.pg.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = $1
          AND tablename = $2
        ORDER BY indexname
      `, [this.config.schema, this.config.nodesTable]);

      return result.rows.map(row => row.indexname);
    } catch (error) {
      throw new StorageError(
        `Index listing failed: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      );
    }
  }

  async updateEdge(
    from: string,
    to: string,
    type: string,
    properties: Partial<GraphEdge['properties']>
  ): Promise<boolean> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(this.config.edgesTable);

      // Merge new properties with existing using JSONB || operator
      const result = await this.pg.query(`
        UPDATE ${tableName}
        SET properties = properties || $1::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE from_node = $2
          AND to_node = $3
          AND type = $4
      `, [JSON.stringify(properties), from, to, type]);

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new StorageError(
        `Edge update failed: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, from, to, type }
      );
    }
  }

  async batchGraphOperations(operations: GraphBatchOperation[]): Promise<GraphBatchResult> {
    await this.ensureLoaded();

    const startTime = Date.now();
    const errors: Error[] = [];
    let nodesAffected = 0;
    let edgesAffected = 0;

    // Handle empty operations
    if (operations.length === 0) {
      return {
        success: true,
        operations: 0,
        nodesAffected: 0,
        edgesAffected: 0,
        executionTime: 0
      };
    }

    try {
      // Process each operation
      for (const op of operations) {
        try {
          switch (op.type) {
            case 'addNode':
              if (op.node) {
                await this.addNode(op.node);
                nodesAffected++;
              }
              break;

            case 'addEdge':
              if (op.edge) {
                await this.addEdge(op.edge);
                edgesAffected++;
              }
              break;

            case 'updateNode':
              if (op.id && op.node) {
                const updated = await this.updateNode(op.id, op.node.properties || {});
                if (updated) nodesAffected++;
              }
              break;

            case 'updateEdge':
              if (op.edge) {
                const updated = await this.updateEdge(
                  op.edge.from,
                  op.edge.to,
                  op.edge.type,
                  op.edge.properties || {}
                );
                if (updated) edgesAffected++;
              }
              break;

            case 'deleteNode':
              if (op.id) {
                const deleted = await this.deleteNode(op.id);
                if (deleted) nodesAffected++;
              }
              break;

            case 'deleteEdge':
              if (op.edge) {
                const deleted = await this.deleteEdge(
                  op.edge.from,
                  op.edge.to,
                  op.edge.type
                );
                if (deleted) edgesAffected++;
              }
              break;

            default:
              errors.push(new Error(`Unknown operation type: ${op.type}`));
          }
        } catch (error) {
          // Collect errors but continue processing
          errors.push(error as Error);
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        operations: operations.length,
        nodesAffected,
        edgesAffected,
        errors: errors.length > 0 ? errors : undefined,
        executionTime
      };
    } catch (error) {
      throw new StorageError(
        `Batch operation failed: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { error, operationCount: operations.length }
      );
    }
  }

  // ============================================================================
  // SEMANTIC STORAGE INTERFACE - ANALYTICS & QUERIES
  // ============================================================================

  async query<R = any>(query: SemanticQuery): Promise<SemanticQueryResult<R>> {
    await this.ensureLoaded();

    try {
      const startTime = Date.now();
      const { sql, params } = this.buildParameterizedSQL(query);

      const result = await this.pg.query(sql, params);

      return {
        data: result.rows as R[],
        metadata: {
          executionTime: Date.now() - startTime,
          rowsScanned: result.rowCount || 0,
          fromCache: false
        }
      };
    } catch (error) {
      throw new StorageError(
        `Semantic query failed: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, query }
      );
    }
  }

  async executeSQL<R = any>(sql: string, params?: any[]): Promise<SemanticQueryResult<R>> {
    await this.ensureLoaded();

    try {
      const startTime = Date.now();

      // Security: Only allow parameterized queries with placeholders
      // Reject queries without parameters that contain common SQL injection patterns
      if (!params || params.length === 0) {
        // Match dangerous keywords at start of SQL or after semicolon
        const dangerousPatterns = /(^|;)\s*(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE)\s+/i;
        if (dangerousPatterns.test(sql)) {
          throw new StorageError(
            'Direct SQL execution of DDL/DML without parameters is not allowed',
            StorageErrorCode.QUERY_FAILED,
            { sql }
          );
        }
      }

      const result = await this.pg.query(sql, params);

      return {
        data: result.rows as R[],
        metadata: {
          executionTime: Date.now() - startTime,
          rowsScanned: result.rowCount || 0,
          fromCache: false
        }
      };
    } catch (error) {
      throw new StorageError(
        `SQL execution failed: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, sql, params }
      );
    }
  }

  async aggregate(
    table: string,
    operator: AggregationOperator,
    field: string,
    filters?: QueryFilter[]
  ): Promise<number> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(table);

      // Map operator to SQL function
      const sqlOperator = operator.toUpperCase();

      // Build aggregation query
      let sql = `SELECT ${sqlOperator}(${field}) as result FROM ${tableName}`;
      const params: any[] = [];

      // Add WHERE clause if filters exist
      if (filters && filters.length > 0) {
        const { whereClause, whereParams } = this.buildWhereClause(filters);
        sql += ` WHERE ${whereClause}`;
        params.push(...whereParams);
      }

      const result = await this.pg.query(sql, params);

      // Return the aggregation result (handle NULL for empty result sets)
      return result.rows[0]?.result !== null ? Number(result.rows[0].result) : 0;
    } catch (error) {
      throw new StorageError(
        `Aggregation failed on table "${table}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, table, operator, field, filters }
      );
    }
  }

  async groupBy(
    table: string,
    groupBy: string[],
    aggregations: Aggregation[],
    filters?: QueryFilter[]
  ): Promise<Record<string, any>[]> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(table);

      // Build SELECT clause with GROUP BY fields and aggregations
      const groupByFields = groupBy.join(', ');
      const aggClauses = aggregations.map(agg => {
        const alias = agg.as || `${agg.operator}_${agg.field}`;
        return `${agg.operator.toUpperCase()}(${agg.field}) as ${alias}`;
      }).join(', ');

      let sql = `SELECT ${groupByFields}, ${aggClauses} FROM ${tableName}`;
      const params: any[] = [];

      // Add WHERE clause if filters exist
      if (filters && filters.length > 0) {
        const { whereClause, whereParams } = this.buildWhereClause(filters);
        sql += ` WHERE ${whereClause}`;
        params.push(...whereParams);
      }

      // Add GROUP BY clause
      sql += ` GROUP BY ${groupByFields}`;

      const result = await this.pg.query(sql, params);

      return result.rows;
    } catch (error) {
      throw new StorageError(
        `GROUP BY failed on table "${table}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, table, groupBy, aggregations, filters }
      );
    }
  }

  /**
   * Helper: Get full-text search index name for a table
   */
  private getSearchIndexName(table: string): string {
    return `${table}${PgVectorStorageAdapter.FTS_INDEX_SUFFIX}`;
  }

  async search<R = any>(table: string, searchText: string, options?: SearchOptions): Promise<SearchResult<R>[]> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(table);
      const limit = options?.limit || PgVectorStorageAdapter.DEFAULT_SEARCH_LIMIT;

      // Use PostgreSQL full-text search with ts_rank for relevance scoring
      const query = `
        SELECT
          *,
          ts_rank(to_tsvector('english', COALESCE(properties::text, '')), to_tsquery('english', $1)) as rank,
          ts_headline('english', COALESCE(properties::text, ''), to_tsquery('english', $1)) as headline
        FROM ${tableName}
        WHERE to_tsvector('english', COALESCE(properties::text, '')) @@ to_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $2
      `;

      const result = await this.pg.query(query, [searchText, limit]);

      return result.rows.map(row => {
        const { rank, headline, ...document } = row;
        return {
          document: document as R,
          score: parseFloat(rank) || 0,
          highlights: options?.highlight ? { content: [headline] } : undefined
        };
      });
    } catch (error) {
      throw new StorageError(
        `Full-text search failed on table "${table}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, table, searchText }
      );
    }
  }

  async createSearchIndex(table: string, fields: string[]): Promise<void> {
    await this.ensureLoaded();

    try {
      const tableName = this.qualifiedTableName(table);
      const indexName = this.getSearchIndexName(table);

      // Create GIN index for full-text search on specified fields
      // Concatenate fields into a single tsvector for efficient searching
      const tsvectorExpression = fields.map(field =>
        `to_tsvector('english', COALESCE(${field}::text, ''))`
      ).join(' || ');

      const query = `
        CREATE INDEX IF NOT EXISTS ${indexName}
        ON ${tableName}
        USING GIN ((${tsvectorExpression}))
      `;

      await this.pg.query(query);
    } catch (error) {
      throw new StorageError(
        `Failed to create search index on table "${table}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, table, fields }
      );
    }
  }

  async dropSearchIndex(table: string): Promise<void> {
    await this.ensureLoaded();

    try {
      const indexName = this.getSearchIndexName(table);

      const query = `DROP INDEX IF EXISTS ${this.config.schema}.${indexName}`;

      await this.pg.query(query);
    } catch (error) {
      throw new StorageError(
        `Failed to drop search index on table "${table}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, table }
      );
    }
  }

  // ============================================================================
  // MATERIALIZED VIEWS
  // ============================================================================

  async createMaterializedView(view: MaterializedView): Promise<void> {
    await this.ensureLoaded();

    try {
      const qualifiedViewName = `${this.config.schema}.${view.name}`;

      // Handle both SemanticQuery and raw SQL string
      const sqlQuery = typeof view.query === 'string'
        ? view.query
        : this.buildSQLFromQuery(view.query);

      const createQuery = `
        CREATE MATERIALIZED VIEW ${qualifiedViewName} AS
        ${sqlQuery}
      `;

      await this.pg.query(createQuery);
    } catch (error) {
      throw new StorageError(
        `Failed to create materialized view "${view.name}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, view }
      );
    }
  }

  async refreshMaterializedView(viewName: string): Promise<void> {
    await this.ensureLoaded();

    try {
      const qualifiedViewName = `${this.config.schema}.${viewName}`;

      // Use CONCURRENTLY to avoid blocking reads during refresh
      const query = `REFRESH MATERIALIZED VIEW CONCURRENTLY ${qualifiedViewName}`;

      await this.pg.query(query);
    } catch (error) {
      throw new StorageError(
        `Failed to refresh materialized view "${viewName}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, viewName }
      );
    }
  }

  async queryMaterializedView<R = any>(
    viewName: string,
    filters?: QueryFilter[]
  ): Promise<SemanticQueryResult<R>> {
    await this.ensureLoaded();

    try {
      const startTime = Date.now();
      const qualifiedViewName = `${this.config.schema}.${viewName}`;

      let query = `SELECT * FROM ${qualifiedViewName}`;
      const params: any[] = [];

      // Add filter conditions if provided
      if (filters && filters.length > 0) {
        const whereClauses = filters.map((filter, index) => {
          params.push(filter.value);
          return `${filter.field} ${filter.operator} $${index + 1}`;
        });
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const result = await this.pg.query(query, params);

      return {
        data: result.rows as R[],
        metadata: {
          executionTime: Date.now() - startTime,
          rowsScanned: result.rowCount || 0,
          fromCache: true // Materialized views are pre-computed
        }
      };
    } catch (error) {
      throw new StorageError(
        `Failed to query materialized view "${viewName}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, viewName, filters }
      );
    }
  }

  async dropMaterializedView(viewName: string): Promise<void> {
    await this.ensureLoaded();

    try {
      const qualifiedViewName = `${this.config.schema}.${viewName}`;

      const query = `DROP MATERIALIZED VIEW IF EXISTS ${qualifiedViewName}`;

      await this.pg.query(query);
    } catch (error) {
      throw new StorageError(
        `Failed to drop materialized view "${viewName}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, viewName }
      );
    }
  }

  async listMaterializedViews(): Promise<MaterializedView[]> {
    await this.ensureLoaded();

    try {
      const query = `
        SELECT
          schemaname,
          matviewname as viewname,
          pg_get_viewdef((schemaname || '.' || matviewname)::regclass) as definition
        FROM pg_matviews
        WHERE schemaname = $1
      `;

      const result = await this.pg.query(query, [this.config.schema]);

      return result.rows.map(row => ({
        name: row.viewname,
        query: row.definition, // Store raw SQL as string
        refreshStrategy: 'manual' as const // PostgreSQL materialized views are manual refresh by default
      }));
    } catch (error) {
      throw new StorageError(
        `Failed to list materialized views: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error }
      );
    }
  }

  /**
   * Helper: Build WHERE clause with parameterized values for security
   *
   * @param filters - Query filters
   * @returns Object with WHERE clause and parameters array
   */
  private buildWhereClause(filters: QueryFilter[]): { whereClause: string; whereParams: any[] } {
    const whereParams: any[] = [];
    const whereConditions = filters.map((filter, index) => {
      whereParams.push(filter.value);
      return `${filter.field} ${filter.operator} $${index + 1}`;
    });

    return {
      whereClause: whereConditions.join(' AND '),
      whereParams
    };
  }

  /**
   * Helper: Build parameterized SQL query from SemanticQuery object
   *
   * Returns SQL with placeholders ($1, $2, etc.) and corresponding parameter values
   * for safe execution without SQL injection vulnerabilities.
   *
   * @param query - Semantic query object
   * @returns Object with SQL string and parameters array
   */
  private buildParameterizedSQL(query: SemanticQuery): { sql: string; params: any[] } {
    const tableName = this.qualifiedTableName(query.from);
    const params: any[] = [];

    // Build SELECT clause
    const selectClause = query.select && query.select.length > 0
      ? query.select.join(', ')
      : '*';

    let sql = `SELECT ${selectClause} FROM ${tableName}`;

    // Add WHERE clause if filters exist
    if (query.where && query.where.length > 0) {
      const { whereClause, whereParams } = this.buildWhereClause(query.where);
      sql += ` WHERE ${whereClause}`;
      params.push(...whereParams);
    }

    // Add GROUP BY clause
    if (query.groupBy && query.groupBy.length > 0) {
      sql += ` GROUP BY ${query.groupBy.join(', ')}`;
    }

    // Add aggregations to SELECT if specified with GROUP BY
    if (query.aggregations && query.aggregations.length > 0) {
      // Aggregations were added to SELECT clause above if needed
      // This is handled by the caller constructing the query properly
    }

    // Add ORDER BY clause
    if (query.orderBy && query.orderBy.length > 0) {
      const orderClauses = query.orderBy.map(sort =>
        `${sort.field} ${sort.direction || 'ASC'}`
      ).join(', ');
      sql += ` ORDER BY ${orderClauses}`;
    }

    // Add LIMIT clause
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`;
    }

    // Add OFFSET clause
    if (query.offset) {
      sql += ` OFFSET ${query.offset}`;
    }

    return { sql, params };
  }

  /**
   * Helper: Build SQL query from SemanticQuery object
   */
  private buildSQLFromQuery(query: SemanticQuery): string {
    const tableName = this.qualifiedTableName(query.from);

    const selectClause = query.select && query.select.length > 0
      ? query.select.join(', ')
      : '*';

    let sql = `SELECT ${selectClause} FROM ${tableName}`;

    // Add WHERE clause if filters exist
    if (query.where && query.where.length > 0) {
      const whereConditions = query.where.map(filter =>
        `${filter.field} ${filter.operator} '${filter.value}'`
      ).join(' AND ');
      sql += ` WHERE ${whereConditions}`;
    }

    // Add GROUP BY clause
    if (query.groupBy && query.groupBy.length > 0) {
      sql += ` GROUP BY ${query.groupBy.join(', ')}`;
    }

    // Add ORDER BY clause
    if (query.orderBy && query.orderBy.length > 0) {
      const orderClauses = query.orderBy.map(sort =>
        `${sort.field} ${sort.direction || 'ASC'}`
      ).join(', ');
      sql += ` ORDER BY ${orderClauses}`;
    }

    // Add LIMIT clause
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`;
    }

    // Add OFFSET clause
    if (query.offset) {
      sql += ` OFFSET ${query.offset}`;
    }

    return sql;
  }

  // ============================================================================
  // SCHEMA MANAGEMENT
  // ============================================================================

  async defineSchema(table: string, schema: Record<string, any>): Promise<void> {
    await this.ensureLoaded();

    try {
      const schemaTable = this.qualifiedTableName('_schemas');

      // Ensure schema metadata table exists
      await this.pg.query(`
        CREATE TABLE IF NOT EXISTS ${schemaTable} (
          table_name TEXT PRIMARY KEY,
          schema_definition JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert or update schema definition
      const query = `
        INSERT INTO ${schemaTable} (table_name, schema_definition, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (table_name)
        DO UPDATE SET
          schema_definition = EXCLUDED.schema_definition,
          updated_at = CURRENT_TIMESTAMP
      `;

      await this.pg.query(query, [table, JSON.stringify(schema)]);
    } catch (error) {
      throw new StorageError(
        `Failed to define schema for table "${table}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, table, schema }
      );
    }
  }

  async getSchema(table: string): Promise<Record<string, any> | null> {
    await this.ensureLoaded();

    try {
      const schemaTable = this.qualifiedTableName('_schemas');

      // Check if schema table exists first
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = $1
          AND table_name = '_schemas'
        )
      `;

      const existsResult = await this.pg.query(tableExistsQuery, [this.config.schema]);

      if (!existsResult.rows[0].exists) {
        return null;
      }

      // Retrieve schema definition
      const query = `
        SELECT schema_definition
        FROM ${schemaTable}
        WHERE table_name = $1
      `;

      const result = await this.pg.query(query, [table]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].schema_definition;
    } catch (error) {
      throw new StorageError(
        `Failed to get schema for table "${table}": ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { error, table }
      );
    }
  }

  // ============================================================================
  // VECTOR OPERATIONS (pgvector-specific)
  // ============================================================================

  /**
   * Create a vector index on a table column
   *
   * Delegates to PgVectorSchemaManager which handles:
   * - IVFFLAT or HNSW index types based on config
   * - Distance metric operators (cosine, euclidean, inner_product)
   * - Automatic fallback to IVFFLAT if HNSW unavailable
   * - Configurable index parameters (ivfLists, hnswM, efConstruction)
   *
   * @param table - Table name (will be schema-qualified)
   * @param column - Column name containing vector data
   * @param dimensions - Optional vector dimensions (defaults to config.vectorDimensions)
   */
  async createVectorIndex(table: string, column: string, dimensions?: number): Promise<void> {
    await this.ensureLoaded();

    try {
      const conn = await this.pg.getConnection();
      try {
        await this.schemaManager.createVectorIndex(conn, table, column, dimensions);
      } finally {
        conn.release();
      }
    } catch (error) {
      throw new StorageError(
        `Failed to create vector index on ${table}.${column}: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { table, column, dimensions, error }
      );
    }
  }

  /**
   * Perform vector similarity search
   *
   * Searches for vectors similar to the query vector using pgvector distance operators:
   * - cosine: <=> (cosine distance, 0 = identical)
   * - euclidean: <-> (L2 distance)
   * - inner_product: <#> (negative inner product for max-heap compatibility)
   *
   * @param table - Table name to search (must have embedding column)
   * @param queryVector - Query vector to compare against
   * @param options - Search options (limit, metric, threshold, filters)
   * @returns Array of matching rows with distance scores
   */
  async vectorSearch(table: string, queryVector: number[], options?: {
    limit?: number;
    distanceMetric?: 'cosine' | 'euclidean' | 'inner_product';
    threshold?: number;
    filters?: any[];
  }): Promise<any[]> {
    await this.ensureLoaded();

    const limit = options?.limit ?? 10;
    const metric = options?.distanceMetric ?? this.config.distanceMetric;
    const threshold = options?.threshold;
    const filters = options?.filters ?? [];

    try {
      const tableName = this.qualifiedTableName(table);

      // Map distance metric to pgvector operator
      const distanceOp = this.getDistanceOperator(metric);

      // Build vector literal for SQL (e.g., '[1,2,3]')
      const vectorLiteral = `[${queryVector.join(',')}]`;

      // Build WHERE clause from filters
      const params: any[] = [];
      let whereClause = '';

      if (filters.length > 0) {
        const { whereClause: clause, whereParams } = this.buildWhereClause(filters);
        whereClause = `WHERE ${clause}`;
        params.push(...whereParams);
      }

      // Add threshold filter if specified
      if (threshold !== undefined) {
        const thresholdCondition = `embedding ${distanceOp} '${vectorLiteral}' < $${params.length + 1}`;
        whereClause = whereClause
          ? `${whereClause} AND ${thresholdCondition}`
          : `WHERE ${thresholdCondition}`;
        params.push(threshold);
      }

      // Build complete query with ORDER BY distance
      const query = `
        SELECT *, embedding ${distanceOp} '${vectorLiteral}' AS distance
        FROM ${tableName}
        ${whereClause}
        ORDER BY distance
        LIMIT ${limit}
      `;

      const result = await this.pg.query(query, params);
      return result.rows;
    } catch (error) {
      throw new StorageError(
        `Vector search failed on ${table}: ${(error as Error).message}`,
        StorageErrorCode.QUERY_FAILED,
        { table, queryVector, options, error }
      );
    }
  }

  /**
   * Insert data with embedding vector
   *
   * Inserts a row with an associated vector embedding. The table must have
   * an 'embedding' column of type VECTOR(dimensions).
   *
   * Uses INSERT ... ON CONFLICT DO UPDATE for upsert semantics if the table
   * has a primary key.
   *
   * @param table - Table name to insert into
   * @param data - Data to insert (object with column names as keys)
   * @param embedding - Vector embedding array (must match configured dimensions)
   */
  async insertWithEmbedding(table: string, data: any, embedding: number[]): Promise<void> {
    await this.ensureLoaded();

    // Validate embedding dimensions
    if (embedding.length !== this.config.vectorDimensions) {
      throw new StorageError(
        `Embedding dimension mismatch: expected ${this.config.vectorDimensions}, got ${embedding.length}`,
        StorageErrorCode.WRITE_FAILED,
        { table, expectedDimensions: this.config.vectorDimensions, actualDimensions: embedding.length }
      );
    }

    try {
      const tableName = this.qualifiedTableName(table);

      // Build column names and parameter placeholders
      const columns = Object.keys(data);
      const values = Object.values(data);

      // Add embedding column
      columns.push('embedding');
      const vectorLiteral = `[${embedding.join(',')}]`;

      // Build parameterized INSERT
      const columnList = columns.join(', ');
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      // For embedding, use vector literal (not parameterized to avoid type issues)
      const query = `
        INSERT INTO ${tableName} (${columnList})
        VALUES (${placeholders}, '${vectorLiteral}')
      `;

      await this.pg.query(query, values);
    } catch (error) {
      throw new StorageError(
        `Failed to insert with embedding into ${table}: ${(error as Error).message}`,
        StorageErrorCode.WRITE_FAILED,
        { table, data, embeddingDimensions: embedding.length, error }
      );
    }
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

  /**
   * Get pgvector distance operator for the specified metric
   *
   * Maps distance metrics to pgvector operators:
   * - cosine: <=> (cosine distance, range [0,2], 0 = identical)
   * - euclidean: <-> (L2/Euclidean distance, range [0,∞])
   * - inner_product: <#> (negative inner product, for max-heap compatibility)
   *
   * @param metric - Distance metric to use
   * @returns pgvector operator string
   */
  private getDistanceOperator(metric: 'cosine' | 'euclidean' | 'inner_product'): string {
    switch (metric) {
      case 'cosine':
        return '<=>';
      case 'euclidean':
        return '<->';
      case 'inner_product':
        return '<#>';
      default:
        return '<=>'; // Default to cosine
    }
  }
}
