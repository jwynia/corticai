/**
 * Core Lens Interface Implementation
 *
 * This module provides the base implementation and utilities for the ContextLens
 * interface. It includes abstract base classes and helper functions for common
 * lens operations.
 *
 * Key Components:
 * - BaseLens: Abstract base class implementing common lens functionality
 * - LensError: Specialized error for lens-related issues
 * - Helper functions for query transformation and result processing
 */

import type { Query } from '../../query/types'
import { ContextDepth } from '../../types/context'
import type {
  ContextLens,
  LensConfig,
  ActivationContext,
  QueryContext
} from './types'
import { validateLensConfig, LensConfigValidationError } from './config'

/**
 * Specialized error for lens-related issues
 */
export class LensError extends Error {
  public readonly lensId: string
  public readonly operation: string

  constructor(message: string, lensId: string, operation: string) {
    super(message)
    this.name = 'LensError'
    this.lensId = lensId
    this.operation = operation
  }
}

/**
 * Abstract base class for lens implementations
 *
 * Provides common functionality and validation that all lenses need,
 * allowing concrete lens implementations to focus on their specific logic.
 */
export abstract class BaseLens implements ContextLens {
  public readonly id: string
  public readonly name: string
  public readonly priority: number

  protected config: LensConfig

  constructor(id: string, name: string, priority: number, initialConfig?: Partial<LensConfig>) {
    this.id = id
    this.name = name
    this.priority = priority

    // Initialize with default configuration
    this.config = {
      enabled: true,
      priority,
      activationRules: [],
      queryModifications: [],
      resultTransformations: [],
      ...initialConfig
    }

    // Validate the initial configuration
    try {
      validateLensConfig(this.config)
    } catch (error) {
      throw new LensError(
        `Invalid initial configuration: ${error.message}`,
        this.id,
        'constructor'
      )
    }
  }

  /**
   * Transform a query based on lens-specific logic
   * Concrete implementations must override this method
   */
  abstract transformQuery<T>(query: Query<T>): Query<T>

  /**
   * Post-process query results to add lens-specific metadata
   * Default implementation adds basic lens metadata
   */
  processResults<T>(results: T[], context: QueryContext): T[] {
    try {
      return results.map(result => this.processResult(result, context))
    } catch (error) {
      throw new LensError(
        `Error processing results: ${error.message}`,
        this.id,
        'processResults'
      )
    }
  }

  /**
   * Process a single result item
   * Can be overridden by concrete implementations
   */
  protected processResult<T>(result: T, context: QueryContext): T {
    return {
      ...result,
      _lensMetadata: {
        appliedLens: this.id,
        processedAt: new Date().toISOString(),
        contextId: context.requestId
      }
    }
  }

  /**
   * Determine if this lens should activate given the current context
   * Default implementation checks if lens is enabled
   */
  shouldActivate(context: ActivationContext): boolean {
    try {
      if (!this.config.enabled) {
        return false
      }

      return this.evaluateActivationRules(context)
    } catch (error) {
      // If activation evaluation fails, default to inactive
      return false
    }
  }

  /**
   * Evaluate activation rules against context
   * Can be overridden by concrete implementations
   */
  protected evaluateActivationRules(context: ActivationContext): boolean {
    if (this.config.activationRules.length === 0) {
      // No specific rules, use default activation logic
      return this.defaultActivationLogic(context)
    }

    let totalWeight = 0
    let matchedWeight = 0

    for (const rule of this.config.activationRules) {
      totalWeight += rule.weight

      if (this.evaluateActivationRule(rule, context)) {
        matchedWeight += rule.weight
      }
    }

    // Activate if more than 50% of weighted rules match
    return totalWeight > 0 && (matchedWeight / totalWeight) > 0.5
  }

  /**
   * Evaluate a single activation rule
   */
  protected evaluateActivationRule(rule: any, context: ActivationContext): boolean {
    switch (rule.type) {
      case 'file_pattern':
        return context.currentFiles.some(file =>
          this.matchPattern(file, rule.pattern)
        )

      case 'file_extension':
        return context.currentFiles.some(file =>
          file.endsWith(rule.pattern)
        )

      case 'recent_action':
        return context.recentActions.some(action =>
          action.type === rule.pattern
        )

      case 'project_type':
        return context.projectContext.type === rule.pattern

      case 'manual':
        return context.manualOverride === rule.pattern

      default:
        return false
    }
  }

  /**
   * Default activation logic when no rules are specified
   * Can be overridden by concrete implementations
   */
  protected defaultActivationLogic(context: ActivationContext): boolean {
    // By default, activate if there are current files
    return context.currentFiles.length > 0
  }

  /**
   * Simple pattern matching for file patterns
   * Supports basic glob patterns (* and **)
   */
  protected matchPattern(text: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** matches any characters including /
      .replace(/\*/g, '[^/]*') // * matches any characters except /
      .replace(/\./g, '\\.')   // Escape dots
      .replace(/\?/g, '.')     // ? matches single character

    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(text)
  }

  /**
   * Update lens configuration
   */
  configure(config: LensConfig): void {
    try {
      validateLensConfig(config)
      this.config = { ...config }
    } catch (error) {
      throw new LensError(
        `Invalid configuration: ${error.message}`,
        this.id,
        'configure'
      )
    }
  }

  /**
   * Get current lens configuration (readonly copy)
   */
  getConfig(): Readonly<LensConfig> {
    return { ...this.config }
  }

  /**
   * Check if lens is currently enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable or disable the lens
   */
  setEnabled(enabled: boolean): void {
    this.configure({
      ...this.config,
      enabled
    })
  }
}

/**
 * Helper function to safely transform a query with error handling
 */
export function safeTransformQuery<T>(
  lens: ContextLens,
  query: Query<T>,
  fallbackQuery?: Query<T>
): Query<T> {
  try {
    return lens.transformQuery(query)
  } catch (error) {
    console.warn(`Lens ${lens.id} failed to transform query:`, error)
    return fallbackQuery || query
  }
}

/**
 * Helper function to safely process results with error handling
 */
export function safeProcessResults<T>(
  lens: ContextLens,
  results: T[],
  context: QueryContext
): T[] {
  try {
    return lens.processResults(results, context)
  } catch (error) {
    console.warn(`Lens ${lens.id} failed to process results:`, error)
    return results
  }
}

/**
 * Helper function to create a basic query context
 */
export function createQueryContext(
  requestId?: string,
  activeLenses: string[] = []
): QueryContext {
  return {
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    activeLenses,
    performance: {
      startTime: Date.now(),
      hints: {}
    }
  }
}