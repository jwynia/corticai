/**
 * Graph Database Types for KuzuStorageAdapter
 *
 * Defines the core types and interfaces needed for graph database operations
 * with Kuzu, including nodes, edges, paths, and traversal patterns.
 */

/**
 * Basic properties for graph entities
 */
export interface GraphProperties {
  [key: string]: string | number | boolean | null
}

/**
 * Graph node representing an entity in the graph
 */
export interface GraphNode {
  /** Unique identifier for the node */
  id: string
  /** Node type/label (e.g., 'Entity', 'Function', 'Module') */
  type: string
  /** Node properties */
  properties: GraphProperties
  /** Optional metadata */
  metadata?: {
    created?: Date
    updated?: Date
    source?: string
  }
}

/**
 * Graph edge representing a relationship between nodes
 */
export interface GraphEdge {
  /** Unique identifier for the edge */
  id?: string
  /** Source node ID */
  from: string
  /** Target node ID */
  to: string
  /** Edge type/label (e.g., 'depends_on', 'calls', 'imports') */
  type: string
  /** Edge properties */
  properties: GraphProperties
  /** Optional metadata */
  metadata?: {
    created?: Date
    updated?: Date
    source?: string
  }
}

/**
 * Graph path representing a traversal route through the graph
 */
export interface GraphPath {
  /** Nodes in the path */
  nodes: GraphNode[]
  /** Edges connecting the nodes */
  edges: GraphEdge[]
  /** Total length of the path */
  length: number
  /** Optional path weight/cost */
  weight?: number
}

/**
 * Traversal pattern for graph queries
 */
export interface TraversalPattern {
  /** Starting node ID */
  startNode: string
  /** Edge types to follow (empty means all types) */
  edgeTypes?: string[]
  /** Direction of traversal */
  direction: 'outgoing' | 'incoming' | 'both'
  /** Maximum depth to traverse */
  maxDepth: number
  /** Optional filter conditions for nodes */
  nodeFilter?: {
    types?: string[]
    properties?: Partial<GraphProperties>
  }
  /** Optional filter conditions for edges */
  edgeFilter?: {
    properties?: Partial<GraphProperties>
  }
}

/**
 * Graph query result containing nodes and their relationships
 */
export interface GraphQueryResult {
  /** Nodes found in the query */
  nodes: GraphNode[]
  /** Edges found in the query */
  edges: GraphEdge[]
  /** Paths found (if applicable) */
  paths?: GraphPath[]
  /** Query execution metadata */
  metadata: {
    /** Execution time in milliseconds */
    executionTime: number
    /** Number of nodes traversed */
    nodesTraversed: number
    /** Number of edges traversed */
    edgesTraversed: number
  }
}

/**
 * Configuration for Kuzu storage adapter
 */
export interface KuzuStorageConfig {
  /** Storage type identifier */
  type: 'kuzu'
  /** Database file path */
  database: string
  /** Storage identifier for debugging */
  id?: string
  /** Enable debug logging */
  debug?: boolean
  /** Auto-create database if it doesn't exist */
  autoCreate?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Buffer pool size in MB */
  bufferPoolSize?: number
  /** Maximum number of threads */
  maxNumThreads?: number
  /** Timeout for operations in ms */
  timeoutMs?: number
}

/**
 * Graph entity that can be stored in the KuzuStorageAdapter
 * This extends the basic graph node to include storage metadata
 */
export interface GraphEntity extends GraphNode {
  /** Storage-specific metadata */
  _storage?: {
    /** When the entity was stored */
    storedAt: Date
    /** Version of the entity */
    version: number
    /** Checksum for integrity */
    checksum?: string
  }
}

/**
 * Statistics about the graph database
 */
export interface GraphStats {
  /** Total number of nodes */
  nodeCount: number
  /** Total number of edges */
  edgeCount: number
  /** Node count by type */
  nodesByType: Record<string, number>
  /** Edge count by type */
  edgesByType: Record<string, number>
  /** Database size in bytes */
  databaseSize: number
  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Batch operation for graph entities
 */
export interface GraphBatchOperation {
  /** Operation type */
  type: 'addNode' | 'addEdge' | 'updateNode' | 'updateEdge' | 'deleteNode' | 'deleteEdge'
  /** Node data (for node operations) */
  node?: GraphNode
  /** Edge data (for edge operations) */
  edge?: GraphEdge
  /** Node/Edge ID (for update/delete operations) */
  id?: string
}

/**
 * Result of batch operation execution
 */
export interface GraphBatchResult {
  /** Whether the batch operation succeeded */
  success: boolean
  /** Number of operations processed */
  operations: number
  /** Number of nodes affected */
  nodesAffected: number
  /** Number of edges affected */
  edgesAffected: number
  /** Any errors that occurred */
  errors?: Error[]
  /** Execution time in milliseconds */
  executionTime: number
}