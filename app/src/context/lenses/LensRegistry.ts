/**
 * Lens Registry System - Core lens management and activation
 *
 * This module provides the central orchestration for the lens system, managing
 * lens registration, activation detection, and conflict resolution.
 *
 * Key Components:
 * - LensRegistry: Main registry for managing lens instances
 * - Conflict detection and resolution
 * - Performance optimization with caching
 * - Event-driven architecture for lens lifecycle
 */

import type { Query } from '../../query/types'
import type {
  ContextLens,
  ActivationContext,
  QueryContext
} from './types'
import { ActivationDetector } from './ActivationDetector'

// Constants for magic numbers
const RECENT_ACTION_THRESHOLD = 5 * 60 * 1000 // 5 minutes in milliseconds
const CACHE_DURATION = 60 * 1000 // 1 minute cache duration
const TRIGGER_CONFIDENCE_MULTIPLIER = 0.2
const MAX_TRIGGER_CONFIDENCE_BOOST = 0.4
const ACTIVITY_CONFIDENCE_MULTIPLIER = 0.1
const MAX_ACTIVITY_CONFIDENCE_BOOST = 0.3

/**
 * Represents a conflict between lenses
 */
export interface LensConflict {
  type: 'priority_conflict' | 'transformation_conflict'
  lensIds: string[]
  severity: 'low' | 'medium' | 'high'
  resolution: {
    type: 'adjust_priority' | 'disable_lens' | 'manual_review'
    description: string
  }
}

/**
 * Activation history entry
 */
export interface ActivationHistoryEntry {
  lensId: string
  timestamp: string
  trigger: string
  confidence: number
}

/**
 * Event types for lens registry
 */
export type LensRegistryEvent =
  | { type: 'lens_registered', lensId: string }
  | { type: 'lens_unregistered', lensId: string }
  | { type: 'activation', lensId: string, context: ActivationContext }
  | { type: 'deactivation', lensId: string }
  | { type: 'lens_error', lensId: string, error: Error, operation: string }

/**
 * Event listener callback
 */
export type LensRegistryEventListener = (event: LensRegistryEvent) => void

/**
 * Central registry for managing lens instances and their lifecycle
 *
 * The LensRegistry is the main orchestration point for the lens system,
 * handling registration, activation detection, conflict resolution,
 * and performance optimization.
 */
export class LensRegistry {
  private lenses = new Map<string, ContextLens>()
  private activeLenses: ContextLens[] = []
  private currentContext: ActivationContext | null = null
  private activationDetector = new ActivationDetector()
  private activationHistory: ActivationHistoryEntry[] = []
  private manualOverride: string | null = null
  private autoResolveConflicts = false
  private eventListeners = new Map<string, LensRegistryEventListener[]>()

  // Performance optimization
  private activationCache = new Map<string, ContextLens[]>()
  private lastCacheInvalidation = Date.now()

  /**
   * Register a new lens in the registry
   */
  register(lens: ContextLens): void {
    if (this.lenses.has(lens.id)) {
      throw new Error(`Lens with id "${lens.id}" is already registered`)
    }

    this.lenses.set(lens.id, lens)
    this.invalidateCache()

    // Auto-resolve conflicts if enabled
    if (this.autoResolveConflicts) {
      this.resolveConflictsAutomatically()
    }

    this.emit({ type: 'lens_registered', lensId: lens.id })
  }

  /**
   * Unregister a lens from the registry
   */
  unregister(lensId: string): void {
    if (!this.lenses.has(lensId)) {
      return // Gracefully handle non-existent lens
    }

    this.lenses.delete(lensId)

    // Remove from active lenses if present
    this.activeLenses = this.activeLenses.filter(lens => lens.id !== lensId)

    this.invalidateCache()
    this.emit({ type: 'lens_unregistered', lensId })
  }

  /**
   * Check if a lens is registered
   */
  isRegistered(lensId: string): boolean {
    return this.lenses.has(lensId)
  }

  /**
   * Get a lens by its ID
   */
  getLens(lensId: string): ContextLens | null {
    return this.lenses.get(lensId) || null
  }

  /**
   * Get all registered lenses
   */
  getRegisteredLenses(): ContextLens[] {
    return Array.from(this.lenses.values())
  }

  /**
   * Get active lenses based on current context
   */
  getActiveLenses(context: ActivationContext): ContextLens[] {
    // Check manual override first
    if (context.manualOverride || this.manualOverride) {
      const overrideId = context.manualOverride || this.manualOverride!
      const lens = this.lenses.get(overrideId)
      return lens ? [lens] : []
    }

    // Check cache first
    const cacheKey = this.createCacheKey(context)
    if (this.activationCache.has(cacheKey)) {
      return this.activationCache.get(cacheKey)!
    }

    // Calculate active lenses
    const activeLenses: ContextLens[] = []

    for (const lens of this.lenses.values()) {
      try {
        const config = lens.getConfig()
        if (config.enabled && lens.shouldActivate(context)) {
          activeLenses.push(lens)

          // Record activation in history
          this.activationHistory.push({
            lensId: lens.id,
            timestamp: new Date().toISOString(),
            trigger: this.determineTrigger(context),
            confidence: this.calculateActivationConfidence(lens, context)
          })

          this.emit({ type: 'activation', lensId: lens.id, context })
        }
      } catch (error) {
        this.emit({
          type: 'lens_error',
          lensId: lens.id,
          error: error as Error,
          operation: 'shouldActivate'
        })
      }
    }

    // Sort by priority (higher priority first)
    activeLenses.sort((a, b) => b.priority - a.priority)

    // Cache the result
    this.activationCache.set(cacheKey, activeLenses)

    return activeLenses
  }

  /**
   * Update the current context and refresh active lenses
   */
  updateActiveContext(context: ActivationContext): void {
    this.currentContext = context
    this.activeLenses = this.getActiveLenses(context)
  }

  /**
   * Get currently active lenses
   */
  getCurrentlyActiveLenses(): ContextLens[] {
    return this.activeLenses.slice()
  }

  /**
   * Get activation history
   */
  getActivationHistory(): ActivationHistoryEntry[] {
    return this.activationHistory.slice()
  }

  /**
   * Set manual lens override
   */
  setManualOverride(lensId: string): void {
    this.manualOverride = lensId
    this.invalidateCache()
  }

  /**
   * Clear manual lens override
   */
  clearManualOverride(): void {
    this.manualOverride = null
    this.invalidateCache()
  }

  /**
   * Get current manual override
   */
  getManualOverride(): string | null {
    return this.manualOverride
  }

  /**
   * Detect conflicts between registered lenses
   */
  detectConflicts(): LensConflict[] {
    const conflicts: LensConflict[] = []
    const lenses = Array.from(this.lenses.values())
    const processedLensCombinations = new Set<string>()

    // Check for priority conflicts
    const priorityGroups = new Map<number, ContextLens[]>()
    for (const lens of lenses) {
      const priority = lens.priority
      if (!priorityGroups.has(priority)) {
        priorityGroups.set(priority, [])
      }
      priorityGroups.get(priority)!.push(lens)
    }

    for (const [priority, lensGroup] of priorityGroups) {
      if (lensGroup.length > 1) {
        const lensIds = lensGroup.map(l => l.id).sort()
        const combinationKey = `priority:${lensIds.join(',')}`

        if (!processedLensCombinations.has(combinationKey)) {
          processedLensCombinations.add(combinationKey)
          conflicts.push({
            type: 'priority_conflict',
            lensIds: lensIds,
            severity: 'medium',
            resolution: {
              type: 'adjust_priority',
              description: `Adjust priorities to avoid conflicts. Consider setting different priorities for: ${lensGroup.map(l => l.name).join(', ')}`
            }
          })
        }
      }
    }

    // Check for transformation conflicts (only if not already covered by priority conflicts)
    const transformationGroups = new Map<string, ContextLens[]>()
    for (const lens of lenses) {
      // Only detect transformation conflicts for lenses with identical names
      const fullName = lens.name.toLowerCase()
      if (!transformationGroups.has(fullName)) {
        transformationGroups.set(fullName, [])
      }
      transformationGroups.get(fullName)!.push(lens)
    }

    for (const [name, lensGroup] of transformationGroups) {
      if (lensGroup.length > 1) {
        const lensIds = lensGroup.map(l => l.id).sort()
        const combinationKey = `transformation:${lensIds.join(',')}`
        const priorityKey = `priority:${lensIds.join(',')}`

        // Only add transformation conflict if we haven't already added a priority conflict for these lenses
        if (!processedLensCombinations.has(priorityKey) && !processedLensCombinations.has(combinationKey)) {
          const uniqueIds = new Set(lensIds)
          if (uniqueIds.size > 1) {
            processedLensCombinations.add(combinationKey)
            conflicts.push({
              type: 'transformation_conflict',
              lensIds: lensIds,
              severity: 'low',
              resolution: {
                type: 'manual_review',
                description: `Review transformation logic for identical lens names: ${lensGroup.map(l => l.name).join(', ')}`
              }
            })
          }
        }
      }
    }

    return conflicts
  }

  /**
   * Enable or disable automatic conflict resolution
   */
  setAutoResolveConflicts(enabled: boolean): void {
    this.autoResolveConflicts = enabled
    if (enabled) {
      this.resolveConflictsAutomatically()
    }
  }

  /**
   * Transform a query using active lenses
   */
  transformQuery<T>(query: Query<T>): Query<T> {
    let transformedQuery = Object.assign({}, query)

    for (const lens of this.activeLenses) {
      try {
        transformedQuery = lens.transformQuery(transformedQuery)
      } catch (error) {
        this.emit({
          type: 'lens_error',
          lensId: lens.id,
          error: error as Error,
          operation: 'transformQuery'
        })
        // Continue with original query for this lens
      }
    }

    return transformedQuery
  }

  /**
   * Process query results using active lenses
   */
  processResults<T>(results: T[], context: QueryContext): T[] {
    let processedResults = results.slice()

    for (const lens of this.activeLenses) {
      try {
        processedResults = lens.processResults(processedResults, context)
      } catch (error) {
        this.emit({
          type: 'lens_error',
          lensId: lens.id,
          error: error as Error,
          operation: 'processResults'
        })
        // Continue with current results for this lens
      }
    }

    return processedResults
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: LensRegistryEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }
    this.eventListeners.get(eventType)!.push(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: LensRegistryEventListener): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index >= 0) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get event listener count (for testing memory management)
   */
  getEventListenerCount(): number {
    let count = 0
    for (const listeners of this.eventListeners.values()) {
      count += listeners.length
    }
    return count
  }

  /**
   * Clear all lenses and reset registry
   */
  clear(): void {
    this.lenses.clear()
    this.activeLenses = []
    this.currentContext = null
    this.activationHistory = []
    this.manualOverride = null
    this.activationCache.clear()
    this.eventListeners.clear()
  }

  // Private helper methods

  private createCacheKey(context: ActivationContext): string {
    return JSON.stringify({
      files: context.currentFiles.sort(),
      actions: context.recentActions.slice(-5), // Only recent actions
      override: context.manualOverride || this.manualOverride,
      timestamp: Math.floor(Date.now() / CACHE_DURATION) // Cache per minute
    })
  }

  private invalidateCache(): void {
    this.activationCache.clear()
    this.lastCacheInvalidation = Date.now()
  }

  private determineTrigger(context: ActivationContext): string {
    if (context.recentActions.length === 0) return 'file_context'

    const lastAction = context.recentActions[context.recentActions.length - 1]
    return lastAction.type
  }

  private calculateActivationConfidence(lens: ContextLens, context: ActivationContext): number {
    // Simple confidence calculation based on matching criteria
    let confidence = 0.5 // Base confidence

    // Boost confidence for matching file patterns
    const config = lens.getConfig()
    if (config.activationRules) {
      const matchingTriggers = context.recentActions.filter(action =>
        config.activationRules.some(rule =>
          rule.type === 'recent_action' && rule.pattern === action.type
        )
      ).length
      confidence += Math.min(matchingTriggers * TRIGGER_CONFIDENCE_MULTIPLIER, MAX_TRIGGER_CONFIDENCE_BOOST)
    }

    // Boost confidence for recent activity
    const recentActivity = context.recentActions.filter(action => {
      const actionTime = new Date(action.timestamp).getTime()
      const now = Date.now()
      return (now - actionTime) < RECENT_ACTION_THRESHOLD // Last 5 minutes
    }).length

    confidence += Math.min(recentActivity * ACTIVITY_CONFIDENCE_MULTIPLIER, MAX_ACTIVITY_CONFIDENCE_BOOST)

    return Math.min(confidence, 1.0)
  }

  private resolveConflictsAutomatically(): void {
    const conflicts = this.detectConflicts()

    for (const conflict of conflicts) {
      if (conflict.type === 'priority_conflict' && conflict.resolution.type === 'adjust_priority') {
        // Auto-adjust priorities by modifying the lens priority directly
        const lenses = conflict.lensIds.map(id => this.lenses.get(id)!).filter(Boolean)
        lenses.forEach((lens, index) => {
          // Directly modify the priority property with an offset
          // This is a simple approach for conflict resolution
          if (index > 0) {
            (lens as any).priority = lens.priority + index
          }
        })
      }
    }
  }

  private emit(event: LensRegistryEvent): void {
    const listeners = this.eventListeners.get(event.type) || []
    const allListeners = this.eventListeners.get('*') || []

    const allListenersArray = listeners.concat(allListeners)

    allListenersArray.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        // Structured error logging with context
        console.error('LensRegistry: Event listener error', {
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    })
  }
}