/**
 * Pattern Detection Types
 *
 * Type definitions for the universal pattern detection system.
 * Supports detection of circular dependencies, orphaned nodes, hub nodes,
 * and dead code across domain-agnostic graph structures.
 */

import { GraphNode, GraphEdge } from '../../storage/types/GraphTypes'

/**
 * Pattern severity levels
 */
export enum PatternSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Pattern types that can be detected
 */
export enum PatternType {
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  ORPHANED_NODE = 'orphaned_node',
  HUB_NODE = 'hub_node',
  DEAD_CODE = 'dead_code'
}

/**
 * Base interface for all detected patterns
 */
export interface DetectedPattern {
  /** Unique identifier for this pattern instance */
  id: string
  /** Type of pattern detected */
  type: PatternType
  /** Severity level of the pattern */
  severity: PatternSeverity
  /** Human-readable description of the pattern */
  description: string
  /** Nodes involved in the pattern */
  nodes: string[]
  /** Edges involved in the pattern (if applicable) */
  edges?: Array<{ from: string; to: string; type: string }>
  /** Suggested remediation actions */
  remediations: RemediationSuggestion[]
  /** Additional metadata about the pattern */
  metadata?: Record<string, any>
  /** When the pattern was detected */
  detectedAt: Date
}

/**
 * Circular dependency pattern detection result
 */
export interface CircularDependency extends DetectedPattern {
  type: PatternType.CIRCULAR_DEPENDENCY
  /** The cycle of node IDs (A → B → C → A) */
  cycle: string[]
  /** Length of the dependency cycle */
  cycleLength: number
}

/**
 * Orphaned node pattern detection result
 */
export interface OrphanedNode extends DetectedPattern {
  type: PatternType.ORPHANED_NODE
  /** The isolated node ID */
  nodeId: string
  /** Whether the node has no incoming edges */
  noIncoming: boolean
  /** Whether the node has no outgoing edges */
  noOutgoing: boolean
}

/**
 * Hub node pattern (too many connections) detection result
 */
export interface HubNode extends DetectedPattern {
  type: PatternType.HUB_NODE
  /** The hub node ID */
  nodeId: string
  /** Number of incoming edges */
  incomingCount: number
  /** Number of outgoing edges */
  outgoingCount: number
  /** Total connection count */
  totalConnections: number
  /** Configured threshold that was exceeded */
  threshold: number
}

/**
 * Dead code pattern (never traversed) detection result
 */
export interface DeadCode extends DetectedPattern {
  type: PatternType.DEAD_CODE
  /** Nodes that are never reached in actual usage */
  unreachableNodes: string[]
  /** Root nodes used for reachability analysis */
  rootNodes: string[]
}

/**
 * Remediation suggestion for a detected pattern
 */
export interface RemediationSuggestion {
  /** Type of remediation action */
  action: 'remove' | 'refactor' | 'document' | 'split' | 'merge' | 'investigate'
  /** Human-readable description of the remediation */
  description: string
  /** Specific steps to remediate */
  steps?: string[]
  /** Priority of this remediation (1=highest) */
  priority: number
  /** Estimated effort (hours) */
  estimatedEffort?: number
}

/**
 * Configuration for pattern detection
 */
export interface PatternDetectionConfig {
  /** Maximum connection count before considering a node a "hub" */
  hubNodeThreshold?: number
  /** Patterns to enable/disable */
  enabledPatterns?: PatternType[]
  /** Minimum severity level to report */
  minSeverity?: PatternSeverity
  /** Whether to include suggested remediations */
  includeRemediations?: boolean
  /** Node types to exclude from pattern detection */
  excludedNodeTypes?: string[]
  /** Edge types to exclude from analysis */
  excludedEdgeTypes?: string[]
  /** Whether to detect partially isolated nodes (source/sink) in orphaned node detection */
  detectPartiallyIsolatedNodes?: boolean
}

/**
 * Pattern detection result summary
 */
export interface PatternDetectionResult {
  /** All detected patterns */
  patterns: DetectedPattern[]
  /** Summary counts by pattern type */
  summary: {
    [PatternType.CIRCULAR_DEPENDENCY]: number
    [PatternType.ORPHANED_NODE]: number
    [PatternType.HUB_NODE]: number
    [PatternType.DEAD_CODE]: number
    total: number
  }
  /** Summary counts by severity */
  bySeverity: {
    [PatternSeverity.INFO]: number
    [PatternSeverity.WARNING]: number
    [PatternSeverity.ERROR]: number
    [PatternSeverity.CRITICAL]: number
  }
  /** Configuration used for detection */
  config: PatternDetectionConfig
  /** When the analysis was performed */
  analyzedAt: Date
  /** Time taken for analysis (ms) */
  analysisTime: number
}

/**
 * Interface for retrieving graph data for pattern analysis
 */
export interface PatternAnalysisGraphAdapter {
  /** Get all nodes in the graph */
  getAllNodes(): Promise<GraphNode[]>
  /** Get all edges in the graph */
  getAllEdges(): Promise<GraphEdge[]>
  /** Get edges from a specific node */
  getEdgesFrom(nodeId: string): Promise<GraphEdge[]>
  /** Get edges to a specific node */
  getEdgesTo(nodeId: string): Promise<GraphEdge[]>
  /** Check if a path exists between two nodes */
  hasPath(fromId: string, toId: string): Promise<boolean>
}
