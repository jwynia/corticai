/**
 * Core Lens System Types
 *
 * This module defines all the foundational types for the Phase 3 Lens System.
 * These types enable perspective-based context filtering and emphasis built on
 * top of the Phase 2 Progressive Loading System.
 *
 * Key Types:
 * - ContextLens: Core lens interface for context transformation
 * - LensConfig: Configuration structure for lens behavior
 * - ActivationContext: Context information for lens activation decisions
 * - Supporting types for developer actions, project metadata, and transformations
 */

import type { Query } from '../../query/types'

/**
 * Core lens interface for context transformation
 *
 * A ContextLens is a composable query transformer that modifies context
 * retrieval behavior based on developer task context. Lenses operate at
 * the query level, transforming requests before they reach storage adapters.
 */
export interface ContextLens {
  /** Unique identifier for this lens */
  readonly id: string

  /** Human-readable name for this lens */
  readonly name: string

  /** Priority for conflict resolution (higher = more important) */
  readonly priority: number

  /**
   * Transform a query based on lens-specific logic
   * @param query The original query to transform
   * @returns Modified query with lens-specific changes
   */
  transformQuery<T>(query: Query<T>): Query<T>

  /**
   * Post-process query results to add lens-specific metadata
   * @param results Raw query results
   * @param context Query execution context
   * @returns Results with lens-specific enhancements
   */
  processResults<T>(results: T[], context: QueryContext): T[]

  /**
   * Determine if this lens should activate given the current context
   * @param context Current development context
   * @returns true if lens should be active
   */
  shouldActivate(context: ActivationContext): boolean

  /**
   * Update lens configuration
   * @param config New configuration to apply
   */
  configure(config: LensConfig): void

  /**
   * Get current lens configuration
   * @returns Current lens configuration
   */
  getConfig(): LensConfig
}

/**
 * Context information for lens activation decisions
 *
 * Contains all the information a lens needs to decide whether it should
 * be active based on current developer activity and project context.
 */
export interface ActivationContext {
  /** Currently open/active files */
  readonly currentFiles: string[]

  /** Recent developer actions (file opens, saves, etc.) */
  readonly recentActions: DeveloperAction[]

  /** Project-level metadata and structure info */
  readonly projectContext: ProjectMetadata

  /** Manual lens override (if user explicitly activated a lens) */
  readonly manualOverride?: string
}

/**
 * Represents a developer action that might trigger lens activation
 */
export interface DeveloperAction {
  /** Type of action performed */
  type: 'file_open' | 'file_save' | 'file_edit' | 'debugger_start' | 'test_run' | 'error_occurrence' | 'build_start'

  /** When the action occurred */
  timestamp: string

  /** File involved in the action (if applicable) */
  file?: string

  /** Additional action-specific metadata */
  metadata?: Record<string, any>
}

/**
 * Project metadata for activation context
 */
export interface ProjectMetadata {
  /** Project name */
  name: string

  /** Project type (typescript, javascript, python, etc.) */
  type: string

  /** Key project dependencies */
  dependencies: string[]

  /** Project structure information */
  structure: {
    hasTests: boolean
    hasComponents: boolean
    hasDocs: boolean
    hasConfig: boolean
  }
}

/**
 * Context for query execution with lens information
 */
export interface QueryContext {
  /** Unique identifier for this query request */
  requestId: string

  /** When the query was initiated */
  timestamp: string

  /** Currently active lenses for this query */
  activeLenses: string[]

  /** Performance tracking information */
  performance: {
    startTime: number
    hints: Record<string, any>
  }
}

/**
 * Configuration structure for lens behavior
 *
 * Defines how a lens should behave, when it should activate,
 * and what transformations it should apply.
 */
export interface LensConfig {
  /** Whether this lens is enabled */
  readonly enabled: boolean

  /** Priority for conflict resolution (0-100, higher = more important) */
  readonly priority: number

  /** Rules for when this lens should activate */
  readonly activationRules: ActivationRule[]

  /** Query modifications this lens applies */
  readonly queryModifications: QueryModification[]

  /** Result transformations this lens applies */
  readonly resultTransformations: ResultTransformation[]
}

/**
 * Rule for lens activation based on context
 */
export interface ActivationRule {
  /** Type of activation rule */
  type: 'file_pattern' | 'file_extension' | 'recent_action' | 'project_type' | 'manual'

  /** Pattern or value to match (context-dependent) */
  pattern?: string

  /** Weight of this rule (0.0 to 1.0) */
  weight: number

  /** Additional rule-specific configuration */
  config?: Record<string, any>
}

/**
 * Query modification specification
 */
export interface QueryModification {
  /** Type of modification to apply */
  type: 'add_condition' | 'modify_depth' | 'add_ordering' | 'set_hint'

  /** Field to modify (for condition-based modifications) */
  field?: string

  /** Operator for conditions */
  operator?: 'equals' | 'contains' | 'starts_with' | 'regex' | 'in'

  /** Value for the modification */
  value?: any

  /** Additional modification configuration */
  config?: Record<string, any>
}

/**
 * Result transformation specification
 */
export interface ResultTransformation {
  /** Type of transformation to apply */
  type: 'add_metadata' | 'highlight' | 'reorder' | 'filter' | 'group'

  /** Key for metadata additions */
  key?: string

  /** Value for the transformation */
  value?: any

  /** Field to transform (for field-specific transformations) */
  field?: string

  /** Additional transformation configuration */
  config?: Record<string, any>
}