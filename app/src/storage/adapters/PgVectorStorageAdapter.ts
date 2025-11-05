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

  // Full-text search configuration
  private static readonly DEFAULT_SEARCH_LIMIT = 100;
  private static readonly FTS_INDEX_SUFFIX = '_fts_idx';

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
    // TODO: Implement pattern matching
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async createIndex(entityType: string, property: string): Promise<void> {
    await this.ensureLoaded();
    // TODO: Implement index creation
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async listIndexes(entityType: string): Promise<string[]> {
    await this.ensureLoaded();
    // TODO: Implement index listing
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async updateEdge(
    from: string,
    to: string,
    type: string,
    properties: Partial<GraphEdge['properties']>
  ): Promise<boolean> {
    await this.ensureLoaded();
    // TODO: Implement edge update
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async batchGraphOperations(operations: any[]): Promise<any> {
    await this.ensureLoaded();
    // TODO: Implement batch graph operations
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  // ============================================================================
  // SEMANTIC STORAGE INTERFACE - ANALYTICS & QUERIES
  // ============================================================================

  async query<R = any>(query: SemanticQuery): Promise<SemanticQueryResult<R>> {
    await this.ensureLoaded();
    // TODO: Implement semantic query
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async executeSQL<R = any>(sql: string, params?: any[]): Promise<SemanticQueryResult<R>> {
    await this.ensureLoaded();
    // TODO: Implement SQL execution
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async aggregate(
    table: string,
    operator: AggregationOperator,
    field: string,
    filters?: QueryFilter[]
  ): Promise<number> {
    await this.ensureLoaded();
    // TODO: Implement aggregation
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
  }

  async groupBy(
    table: string,
    groupBy: string[],
    aggregations: Aggregation[],
    filters?: QueryFilter[]
  ): Promise<Record<string, any>[]> {
    await this.ensureLoaded();
    // TODO: Implement group by
    throw new StorageError('Not implemented', StorageErrorCode.NOT_IMPLEMENTED);
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
