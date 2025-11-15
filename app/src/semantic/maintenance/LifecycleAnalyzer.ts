/**
 * LifecycleAnalyzer - Content Lifecycle Management
 *
 * Manages content lifecycle, supersession chains, and archival decisions.
 * Supports automated stale content detection and chain validation.
 *
 * Features:
 * - Supersession chain detection and validation
 * - Stale content identification
 * - Archival candidate suggestions
 * - Content age tracking
 * - Auto-marking workflows
 * - MaintenanceScheduler integration
 */

import type { MaintenanceJob, JobContext } from './MaintenanceScheduler'
import { JobPriority } from './MaintenanceScheduler'

/**
 * Entity type for lifecycle analysis
 */
export interface Entity {
  id: string
  properties: {
    name: string
    createdAt: number
    lastModified: number
    supersededBy?: string
    supersedes?: string
  }
  lifecycle?: {
    state: 'current' | 'evolving' | 'deprecated' | 'archived'
    supersededBy?: string
  }
  relationships?: Array<{
    type: string
    targetId: string
  }>
}

/**
 * Storage interface for lifecycle analysis
 */
export interface LifecycleStorage {
  getEntityById(id: string): Promise<Entity | null>
  getAllEntities(): Promise<Entity[]>
  getEntitiesByState(state: string): Promise<Entity[]>
  updateEntityLifecycle(id: string, lifecycle: any): Promise<void>
  getRelationships(entityId: string, type: string): Promise<Array<{ targetId: string }>>
}

/**
 * Supersession chain
 */
export interface SupersessionChain {
  entities: Entity[]
  isValid: boolean
  errors?: string[]
}

/**
 * Stale entity with score
 */
export interface StaleEntity {
  id: string
  name: string
  lastModified: number
  stalenessScore: number
}

/**
 * Stale content report
 */
export interface StaleContentReport {
  staleEntities: StaleEntity[]
  freshEntities: Entity[]
  errors?: string[]
}

/**
 * Archival candidate
 */
export interface ArchivalCandidate {
  id: string
  name: string
  reason: string
  archivalScore: number
  deprecatedSince?: number
}

/**
 * Content age statistics
 */
export interface ContentAgeStats {
  avgAgeDays: number
  avgModificationAgeDays: number
  distribution: {
    '0-30': number
    '31-90': number
    '91-180': number
    '181+': number
  }
}

/**
 * Analyzer configuration
 */
export interface AnalyzerConfig {
  storage: LifecycleStorage
  defaultStalenessDays?: number
}

/**
 * Stale content config
 */
export interface StaleContentConfig {
  stalenessDays: number
  continueOnError?: boolean
}

/**
 * Auto-mark config
 */
export interface AutoMarkConfig {
  stalenessDays: number
  markAs?: 'evolving' | 'deprecated'
  dryRun?: boolean
}

/**
 * Auto-mark result
 */
export interface AutoMarkResult {
  marked: Entity[]
  wouldMark: Entity[]
}

/**
 * Archival config
 */
export interface ArchivalConfig {
  minDeprecationDays?: number
  includeOrphans?: boolean
}

/**
 * LifecycleAnalyzer implementation
 */
export class LifecycleAnalyzer {
  private storage: LifecycleStorage
  private defaultStalenessDays: number

  constructor(config: AnalyzerConfig) {
    this.storage = config.storage
    this.defaultStalenessDays = config.defaultStalenessDays ?? 90
  }

  /**
   * Detect supersession chain for an entity
   */
  async detectSupersessionChain(entityId: string): Promise<SupersessionChain> {
    const entities: Entity[] = []
    const visited = new Set<string>()
    const errors: string[] = []

    try {
      // Find head of chain (walk backwards)
      let current = await this.storage.getEntityById(entityId)
      if (!current) {
        return {
          entities: [],
          isValid: false,
          errors: [`Entity ${entityId} not found`],
        }
      }

      // Walk backwards to find head
      while (current.lifecycle?.supersededBy || current.properties.supersededBy) {
        const supersededBy = current.lifecycle?.supersededBy || current.properties.supersededBy
        if (!supersededBy) break

        if (visited.has(supersededBy)) {
          errors.push('circular reference detected')
          return { entities, isValid: false, errors }
        }

        const next = await this.storage.getEntityById(supersededBy)
        if (!next) {
          break // Reached head
        }

        visited.add(current.id)
        current = next
      }

      // Now walk forward from head to build complete chain
      const head = current
      visited.clear()
      entities.push(head)
      visited.add(head.id)

      current = head
      while (current.properties.supersedes) {
        const supersedes = current.properties.supersedes

        if (visited.has(supersedes)) {
          errors.push('circular reference detected')
          return { entities, isValid: false, errors }
        }

        const next = await this.storage.getEntityById(supersedes)
        if (!next) {
          errors.push(`orphaned reference to ${supersedes}`)
          return { entities, isValid: false, errors }
        }

        entities.push(next)
        visited.add(next.id)
        current = next
      }

      // Validate chronological order (each entity should be newer than the one it supersedes)
      for (let i = 0; i < entities.length - 1; i++) {
        if (entities[i].properties.createdAt < entities[i + 1].properties.createdAt) {
          errors.push('chronological order violated')
          return { entities, isValid: false, errors }
        }
      }

      return {
        entities,
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      return { entities, isValid: false, errors }
    }
  }

  /**
   * Identify stale content
   */
  async identifyStaleContent(config: StaleContentConfig): Promise<StaleContentReport> {
    if (config.stalenessDays <= 0) {
      throw new Error('Invalid staleness days')
    }

    const errors: string[] = []
    const staleEntities: StaleEntity[] = []
    const freshEntities: Entity[] = []

    try {
      const allEntities = await this.storage.getAllEntities()
      const staleThreshold = Date.now() - (config.stalenessDays * 24 * 60 * 60 * 1000)

      for (const entity of allEntities) {
        // Skip deprecated/archived content
        if (entity.lifecycle?.state === 'deprecated' || entity.lifecycle?.state === 'archived') {
          continue
        }

        const lastModified = entity.properties.lastModified

        if (lastModified < staleThreshold) {
          // Calculate staleness score (0-1, higher = more stale)
          const daysSinceModified = (Date.now() - lastModified) / (24 * 60 * 60 * 1000)
          const stalenessScore = Math.min(1.0, daysSinceModified / 365) // Cap at 1 year

          staleEntities.push({
            id: entity.id,
            name: entity.properties.name,
            lastModified,
            stalenessScore,
          })
        } else {
          freshEntities.push(entity)
        }
      }

      // Sort by staleness score (most stale first)
      staleEntities.sort((a, b) => b.stalenessScore - a.stalenessScore)

      return {
        staleEntities,
        freshEntities,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(errorMessage)

      if (config.continueOnError) {
        return { staleEntities, freshEntities, errors }
      }

      throw error
    }
  }

  /**
   * Suggest archival candidates
   */
  async suggestArchivalCandidates(config: ArchivalConfig = {}): Promise<ArchivalCandidate[]> {
    const candidates: ArchivalCandidate[] = []
    const minDeprecationDays = config.minDeprecationDays ?? 90
    const deprecationThreshold = Date.now() - (minDeprecationDays * 24 * 60 * 60 * 1000)

    // Get deprecated entities
    const deprecated = await this.storage.getEntitiesByState('deprecated')

    for (const entity of deprecated) {
      const daysSinceModified = (Date.now() - entity.properties.lastModified) / (24 * 60 * 60 * 1000)

      if (entity.properties.lastModified < deprecationThreshold) {
        const archivalScore = Math.min(1.0, daysSinceModified / 365) // Score based on 1 year

        candidates.push({
          id: entity.id,
          name: entity.properties.name,
          reason: 'deprecated and old',
          archivalScore,
          deprecatedSince: entity.properties.lastModified,
        })
      }
    }

    // Check for orphans if requested
    if (config.includeOrphans) {
      const allEntities = await this.storage.getAllEntities()

      for (const entity of allEntities) {
        if (entity.lifecycle?.state === 'deprecated' || entity.lifecycle?.state === 'archived') {
          continue
        }

        const relationships = await this.storage.getRelationships(entity.id, 'SUPERSEDES')

        if (relationships.length === 0 && (!entity.relationships || entity.relationships.length === 0)) {
          candidates.push({
            id: entity.id,
            name: entity.properties.name,
            reason: 'orphaned (no relationships)',
            archivalScore: 0.5,
          })
        }
      }
    }

    // Sort by archival score (highest first)
    candidates.sort((a, b) => b.archivalScore - a.archivalScore)

    return candidates
  }

  /**
   * Get content age statistics
   */
  async getContentAgeStats(): Promise<ContentAgeStats> {
    const allEntities = await this.storage.getAllEntities()

    if (allEntities.length === 0) {
      return {
        avgAgeDays: 0,
        avgModificationAgeDays: 0,
        distribution: {
          '0-30': 0,
          '31-90': 0,
          '91-180': 0,
          '181+': 0,
        },
      }
    }

    let totalAge = 0
    let totalModAge = 0
    const distribution = {
      '0-30': 0,
      '31-90': 0,
      '91-180': 0,
      '181+': 0,
    }

    for (const entity of allEntities) {
      const ageDays = (Date.now() - entity.properties.createdAt) / (24 * 60 * 60 * 1000)
      const modAgeDays = (Date.now() - entity.properties.lastModified) / (24 * 60 * 60 * 1000)

      totalAge += ageDays
      totalModAge += modAgeDays

      // Categorize by modification age
      if (modAgeDays <= 30) {
        distribution['0-30']++
      } else if (modAgeDays <= 90) {
        distribution['31-90']++
      } else if (modAgeDays <= 180) {
        distribution['91-180']++
      } else {
        distribution['181+']++
      }
    }

    return {
      avgAgeDays: totalAge / allEntities.length,
      avgModificationAgeDays: totalModAge / allEntities.length,
      distribution,
    }
  }

  /**
   * Auto-mark stale content
   */
  async autoMarkStaleContent(config: AutoMarkConfig): Promise<AutoMarkResult> {
    const report = await this.identifyStaleContent({
      stalenessDays: config.stalenessDays,
    })

    const markAs = config.markAs ?? 'evolving'
    const marked: Entity[] = []
    const wouldMark: Entity[] = []

    for (const staleEntity of report.staleEntities) {
      const entity = await this.storage.getEntityById(staleEntity.id)
      if (!entity) continue

      if (config.dryRun) {
        wouldMark.push(entity)
      } else {
        await this.storage.updateEntityLifecycle(entity.id, {
          ...entity.lifecycle,
          state: markAs,
        })
        marked.push(entity)
      }
    }

    return { marked, wouldMark }
  }

  /**
   * Create lifecycle analysis job for scheduler
   */
  createAnalysisJob(config: Partial<StaleContentConfig> = {}): MaintenanceJob {
    const stalenessDays = config.stalenessDays ?? this.defaultStalenessDays

    return {
      id: `lifecycle-analysis-${Date.now()}`,
      name: 'Lifecycle Analysis',
      priority: JobPriority.NORMAL,
      execute: async (ctx: JobContext) => {
        try {
          ctx.log(`Starting lifecycle analysis (staleness threshold: ${stalenessDays} days)`)

          if (ctx.isCancelled()) {
            return { success: false, reason: 'cancelled' }
          }

          // Identify stale content
          ctx.updateProgress(0.3)
          const staleReport = await this.identifyStaleContent({
            stalenessDays,
            continueOnError: true,
          })

          ctx.log(`Found ${staleReport.staleEntities.length} stale entities`)

          if (ctx.isCancelled()) {
            return { success: false, reason: 'cancelled' }
          }

          // Suggest archival candidates
          ctx.updateProgress(0.6)
          const archivalCandidates = await this.suggestArchivalCandidates({
            minDeprecationDays: stalenessDays,
          })

          ctx.log(`Identified ${archivalCandidates.length} archival candidates`)

          if (ctx.isCancelled()) {
            return { success: false, reason: 'cancelled' }
          }

          // Get age statistics
          ctx.updateProgress(0.9)
          const ageStats = await this.getContentAgeStats()

          ctx.log(`Avg content age: ${ageStats.avgAgeDays.toFixed(1)} days`)

          ctx.updateProgress(1.0)

          return {
            success: true,
            staleCount: staleReport.staleEntities.length,
            archivalCount: archivalCandidates.length,
            avgAgeDays: ageStats.avgAgeDays,
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          ctx.log(`Analysis failed: ${errorMessage}`)
          return { success: false, error: errorMessage }
        }
      },
    }
  }
}
