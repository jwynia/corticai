/**
 * Lifecycle Lens
 *
 * A context lens that filters and prioritizes results based on lifecycle
 * metadata. Helps solve the attention gravity problem by ensuring current
 * guidance takes precedence over historical/deprecated content.
 *
 * NOTE: Phase 1 implementation focuses on result processing and configuration.
 * Full query transformation will be implemented in Phase 2.
 *
 * @see context-network/architecture/semantic-processing/attention-gravity-problem.md
 * @see context-network/architecture/semantic-processing/semantic-pipeline-stages.md
 */

import { BaseLens } from './ContextLens'
import type { Query } from '../../query/types'
import type {
  ActivationContext,
  QueryContext,
  LensConfig,
} from './types'
import type { LifecycleState } from '../../semantic/types'

/**
 * Configuration for lifecycle lens
 */
export interface LifecycleLensConfig extends LensConfig {
  /** Lifecycle states to include (defaults to all if not specified) */
  includedStates?: LifecycleState[]

  /** Lifecycle states to exclude */
  excludedStates?: LifecycleState[]

  /**
   * Relevance weights for lifecycle states (0.0-1.0)
   * Used to boost/de-rank results based on lifecycle state
   */
  stateWeights?: Partial<Record<LifecycleState, number>>

  /**
   * Whether to filter out deprecated content entirely
   * or just de-rank it (default: false - de-rank only)
   */
  filterDeprecated?: boolean

  /**
   * Whether to prioritize "current" content (default: true)
   */
  prioritizeCurrent?: boolean
}

/**
 * Default relevance weights for lifecycle states
 *
 * Higher values = more relevant/higher priority in search results
 */
const DEFAULT_STATE_WEIGHTS: Record<LifecycleState, number> = {
  current: 1.0, // Highest priority
  stable: 0.9, // High authority
  evolving: 0.7, // Work in progress
  deprecated: 0.3, // De-ranked but not hidden
  historical: 0.2, // Background context
  archived: 0.1, // Lowest priority
}

/**
 * Lifecycle Lens
 *
 * Filters and ranks context based on lifecycle state, ensuring current
 * and stable content appears before deprecated/historical material.
 *
 * Phase 1: Focuses on result processing and metadata addition
 * Phase 2: Will add query transformation capabilities
 */
export class LifecycleLens extends BaseLens {
  private lifecycleConfig: LifecycleLensConfig

  /**
   * Create a new lifecycle lens
   *
   * @param config Configuration for the lens
   */
  constructor(config?: Partial<LifecycleLensConfig>) {
    super('lifecycle-lens', 'Lifecycle Filter', config?.priority || 80, config)

    this.lifecycleConfig = {
      enabled: config?.enabled ?? true,
      priority: config?.priority || 80,
      activationRules: config?.activationRules || [],
      queryModifications: config?.queryModifications || [],
      resultTransformations: config?.resultTransformations || [],
      includedStates: config?.includedStates,
      excludedStates: config?.excludedStates,
      stateWeights: { ...DEFAULT_STATE_WEIGHTS, ...config?.stateWeights },
      filterDeprecated: config?.filterDeprecated ?? false,
      prioritizeCurrent: config?.prioritizeCurrent ?? true,
    }
  }

  /**
   * Transform query (Phase 1: Pass-through, Phase 2: Add lifecycle filters)
   *
   * In Phase 1, we focus on result processing. Query transformation
   * will be added in Phase 2 when we implement the full semantic pipeline.
   */
  transformQuery<T>(query: Query<T>): Query<T> {
    // Phase 1: Return query unchanged
    // Phase 2: Add lifecycle-based conditions and ordering
    return query
  }

  /**
   * Process results to add lifecycle-based ranking
   */
  processResults<T>(results: T[], context: QueryContext): T[] {
    // Filter results based on lifecycle state
    let filtered = this.filterResults(results)

    // Add lifecycle metadata to each result
    filtered = filtered.map(result => this.processResult(result, context))

    // Sort by relevance weight
    if (this.lifecycleConfig.prioritizeCurrent) {
      filtered = this.sortByRelevance(filtered)
    }

    return filtered
  }

  /**
   * Filter results based on lifecycle configuration
   */
  private filterResults<T>(results: T[]): T[] {
    return results.filter(result => {
      if (typeof result !== 'object' || result === null) {
        return true
      }

      const resultObj = result as any
      const lifecycleState = resultObj.metadata?.lifecycle?.state as
        | LifecycleState
        | undefined

      if (!lifecycleState) {
        return true // Include results without lifecycle metadata
      }

      // Check exclusions
      if (
        this.lifecycleConfig.excludedStates &&
        this.lifecycleConfig.excludedStates.includes(lifecycleState)
      ) {
        return false
      }

      // Check inclusions
      if (
        this.lifecycleConfig.includedStates &&
        !this.lifecycleConfig.includedStates.includes(lifecycleState)
      ) {
        return false
      }

      // Filter deprecated if configured
      if (
        this.lifecycleConfig.filterDeprecated &&
        lifecycleState === 'deprecated'
      ) {
        return false
      }

      return true
    })
  }

  /**
   * Sort results by lifecycle relevance weight
   */
  private sortByRelevance<T>(results: T[]): T[] {
    return results.sort((a, b) => {
      const aWeight = this.getRelevanceWeight(a)
      const bWeight = this.getRelevanceWeight(b)
      return bWeight - aWeight // Higher weight first
    })
  }

  /**
   * Get relevance weight for a result
   */
  private getRelevanceWeight<T>(result: T): number {
    if (typeof result !== 'object' || result === null) {
      return DEFAULT_STATE_WEIGHTS.stable
    }

    const resultObj = result as any
    const metadata = resultObj._lensMetadata?.lifecycle

    if (metadata?.relevanceWeight !== undefined) {
      return metadata.relevanceWeight
    }

    const lifecycleState = resultObj.metadata?.lifecycle?.state as
      | LifecycleState
      | undefined

    if (!lifecycleState) {
      return DEFAULT_STATE_WEIGHTS.stable
    }

    return (
      this.lifecycleConfig.stateWeights?.[lifecycleState] ??
      DEFAULT_STATE_WEIGHTS[lifecycleState]
    )
  }

  /**
   * Process single result to add lifecycle metadata
   */
  protected processResult<T>(result: T, context: QueryContext): T {
    if (typeof result !== 'object' || result === null) {
      return result
    }

    const resultObj = result as any

    // Extract lifecycle state
    const lifecycleState = resultObj.metadata?.lifecycle?.state as
      | LifecycleState
      | undefined

    if (!lifecycleState) {
      // No lifecycle metadata - treat as stable
      return {
        ...result,
        _lensMetadata: {
          ...resultObj._lensMetadata,
          lifecycle: {
            state: 'stable',
            relevanceWeight: DEFAULT_STATE_WEIGHTS.stable,
            source: 'inferred',
          },
        },
      }
    }

    // Calculate relevance weight
    const relevanceWeight =
      this.lifecycleConfig.stateWeights?.[lifecycleState] ??
      DEFAULT_STATE_WEIGHTS[lifecycleState]

    // Add lens metadata
    return {
      ...result,
      _lensMetadata: {
        ...resultObj._lensMetadata,
        lifecycle: {
          state: lifecycleState,
          relevanceWeight,
          source: 'explicit',
          confidence: resultObj.metadata.lifecycle.confidence,
          manual: resultObj.metadata.lifecycle.manual,
        },
      },
    }
  }

  /**
   * Determine if lens should activate
   *
   * Lifecycle lens activates by default for all queries, but can be
   * configured with specific activation rules.
   */
  shouldActivate(context: ActivationContext): boolean {
    // If manual override is set, respect it
    if (context.manualOverride) {
      return context.manualOverride === this.id
    }

    // Lifecycle filtering is generally always useful
    // (unless explicitly disabled in config)
    return this.lifecycleConfig.enabled
  }

  /**
   * Update lifecycle-specific configuration
   */
  configure(config: LensConfig): void {
    // Update base config
    this.config = config

    // Merge lifecycle-specific config
    const lifecycleConfig = config as Partial<LifecycleLensConfig>
    if (lifecycleConfig.includedStates !== undefined) {
      this.lifecycleConfig.includedStates = lifecycleConfig.includedStates
    }
    if (lifecycleConfig.excludedStates !== undefined) {
      this.lifecycleConfig.excludedStates = lifecycleConfig.excludedStates
    }
    if (lifecycleConfig.stateWeights !== undefined) {
      this.lifecycleConfig.stateWeights = {
        ...this.lifecycleConfig.stateWeights,
        ...lifecycleConfig.stateWeights,
      }
    }
    if (lifecycleConfig.filterDeprecated !== undefined) {
      this.lifecycleConfig.filterDeprecated = lifecycleConfig.filterDeprecated
    }
    if (lifecycleConfig.prioritizeCurrent !== undefined) {
      this.lifecycleConfig.prioritizeCurrent = lifecycleConfig.prioritizeCurrent
    }
  }

  /**
   * Get lifecycle-specific configuration
   */
  getConfig(): LifecycleLensConfig {
    return this.lifecycleConfig
  }
}

/**
 * Create a lifecycle lens with sensible defaults for current work
 *
 * Filters out archived content and de-ranks deprecated content.
 */
export function createCurrentWorkLens(): LifecycleLens {
  return new LifecycleLens({
    excludedStates: ['archived'],
    filterDeprecated: false, // De-rank but don't hide
    prioritizeCurrent: true,
    priority: 80,
  })
}

/**
 * Create a lifecycle lens for historical research
 *
 * Includes all lifecycle states to provide full context.
 */
export function createHistoricalResearchLens(): LifecycleLens {
  return new LifecycleLens({
    includedStates: undefined, // Include all
    filterDeprecated: false,
    prioritizeCurrent: false, // Don't bias toward current
    priority: 60,
    stateWeights: {
      current: 0.8,
      stable: 0.8,
      evolving: 0.6,
      deprecated: 0.7, // Higher weight for historical research
      historical: 0.9, // Very relevant for historical research
      archived: 0.5,
    },
  })
}

/**
 * Create a lifecycle lens for stable patterns only
 *
 * Focuses on proven, stable approaches.
 */
export function createStableOnlyLens(): LifecycleLens {
  return new LifecycleLens({
    includedStates: ['current', 'stable'],
    priority: 90,
  })
}
