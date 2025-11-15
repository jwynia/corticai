/**
 * QualityMetrics - Semantic Quality Monitoring
 *
 * Tracks and monitors quality metrics for semantic data including:
 * - Embedding quality scores
 * - Relationship consistency
 * - Orphaned content detection
 * - Trend analysis over time
 *
 * Features:
 * - Multi-factor quality scoring
 * - Historical tracking and trending
 * - MaintenanceScheduler integration
 * - Error-tolerant analysis
 */

import type { MaintenanceJob, JobContext } from './MaintenanceScheduler'
import { JobPriority } from './MaintenanceScheduler'

/**
 * Quality level classifications
 */
export type QualityLevel = 'missing' | 'poor' | 'fair' | 'good' | 'excellent'

/**
 * Embedding quality score
 */
export interface QualityScore {
  entityId: string
  score: number
  quality: QualityLevel
  warnings?: string[]
}

/**
 * Relationship inconsistency
 */
export interface Inconsistency {
  type: 'missing_reverse' | 'dangling_reference' | 'circular' | 'invalid_type'
  sourceId: string
  targetId?: string
  relationshipType?: string
  description: string
}

/**
 * Consistency report
 */
export interface ConsistencyReport {
  isConsistent: boolean
  inconsistencies: Inconsistency[]
  totalRelationships: number
  errors?: string[]
}

/**
 * Orphaned entity
 */
export interface OrphanedEntity {
  id: string
  severity: number
  age?: number
  properties?: any
}

/**
 * Orphan detection report
 */
export interface OrphanReport {
  orphans: OrphanedEntity[]
  totalEntities: number
  orphanRatio: number
  errors?: string[]
}

/**
 * Overall quality metrics
 */
export interface OverallQuality {
  embeddingQuality: number
  relationshipQuality: number
  orphanRatio: number
  overallScore: number
  timestamp: number
}

/**
 * Quality check configuration
 */
export interface QualityConfig {
  weights?: {
    embeddingQuality?: number
    relationshipQuality?: number
    orphanPenalty?: number
  }
  continueOnError?: boolean
}

/**
 * Orphan detection config
 */
export interface OrphanDetectionConfig {
  excludeRoots?: boolean
  continueOnError?: boolean
}

/**
 * Quality trend
 */
export interface QualityTrend {
  direction: 'improving' | 'declining' | 'stable'
  change: number
  confidence: number
}

/**
 * Storage interface
 */
export interface QualityStorage {
  getAllEntities(): Promise<any[]>
  getEntityById(id: string): Promise<any | null>
  getRelationships(entityId: string): Promise<any[]>
  getEmbedding(entityId: string): Promise<number[] | null>
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  storage: QualityStorage
  historyLimit?: number
}

/**
 * QualityMetrics implementation
 */
export class QualityMetrics {
  private storage: QualityStorage
  private history: OverallQuality[] = []
  private historyLimit: number

  constructor(config: MetricsConfig) {
    this.storage = config.storage
    this.historyLimit = config.historyLimit ?? 100
  }

  /**
   * Map quality score to quality level
   */
  private scoreToQualityLevel(score: number): QualityLevel {
    if (score > 0.8) return 'excellent'
    if (score > 0.6) return 'good'
    if (score > 0.4) return 'fair'
    return 'poor'
  }

  /**
   * Calculate embedding quality for an entity
   */
  async calculateEmbeddingQuality(entityId: string): Promise<QualityScore> {
    const warnings: string[] = []

    try {
      const embedding = await this.storage.getEmbedding(entityId)

      if (!embedding) {
        return {
          entityId,
          score: 0,
          quality: 'missing',
        }
      }

      // Check for corrupted values
      const hasInvalid = embedding.some(v => !isFinite(v))
      if (hasInvalid) {
        warnings.push('corrupted embedding')
        return {
          entityId,
          score: 0,
          quality: 'poor',
          warnings,
        }
      }

      // Calculate quality metrics
      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
      const mean = embedding.reduce((sum, v) => sum + v, 0) / embedding.length
      const variance = embedding.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / embedding.length

      // Zero vector = poor quality
      if (magnitude < 0.01) {
        return {
          entityId,
          score: 0,
          quality: 'poor',
          warnings,
        }
      }

      // Score based on variance and magnitude
      // Good embeddings have decent variance (not all same value)
      // Scale variance more aggressively since typical values are small
      let score = Math.min(1.0, Math.sqrt(variance) * 10) // Use sqrt for better scaling

      // Boost score if magnitude is reasonable (normalized embeddings)
      if (magnitude > 0.5 && magnitude < 2.0) {
        score = Math.min(1.0, score * 1.2)
      }

      return {
        entityId,
        score,
        quality: this.scoreToQualityLevel(score),
        warnings: warnings.length > 0 ? warnings : undefined,
      }
    } catch (error) {
      return {
        entityId,
        score: 0,
        quality: 'poor',
        warnings: [`Error: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }

  /**
   * Check relationship consistency across all entities
   */
  async checkRelationshipConsistency(): Promise<ConsistencyReport> {
    const inconsistencies: Inconsistency[] = []
    const errors: string[] = []
    let totalRelationships = 0

    try {
      const entities = await this.storage.getAllEntities()

      for (const entity of entities) {
        if (!entity.relationships) continue

        for (const rel of entity.relationships) {
          totalRelationships++

          // Check if target exists
          const target = await this.storage.getEntityById(rel.targetId)
          if (!target) {
            inconsistencies.push({
              type: 'dangling_reference',
              sourceId: entity.id,
              targetId: rel.targetId,
              relationshipType: rel.type,
              description: `${entity.id} references non-existent entity ${rel.targetId}`,
            })
            continue
          }

          // Check for reverse relationship (for bidirectional types)
          if (this.requiresReverse(rel.type)) {
            const reverseType = this.getReverseType(rel.type)
            const hasReverse = target.relationships?.some(
              (r: any) => r.type === reverseType && r.targetId === entity.id
            )

            if (!hasReverse) {
              inconsistencies.push({
                type: 'missing_reverse',
                sourceId: entity.id,
                targetId: rel.targetId,
                relationshipType: rel.type,
                description: `${entity.id} ${rel.type} ${rel.targetId} but reverse relationship missing`,
              })
            }
          }
        }
      }

      return {
        isConsistent: inconsistencies.length === 0,
        inconsistencies,
        totalRelationships,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      return {
        isConsistent: false,
        inconsistencies,
        totalRelationships,
        errors,
      }
    }
  }

  /**
   * Detect orphaned content (entities with no relationships)
   */
  async detectOrphanedContent(config: OrphanDetectionConfig = {}): Promise<OrphanReport> {
    const orphans: OrphanedEntity[] = []
    const errors: string[] = []

    try {
      const entities = await this.storage.getAllEntities()

      for (const entity of entities) {
        // Skip roots if configured
        if (config.excludeRoots && entity.properties?.isRoot) {
          continue
        }

        // Check if entity has any relationships
        const hasRelationships = entity.relationships && entity.relationships.length > 0
        if (!hasRelationships) {
          // Calculate severity based on age
          const age = entity.properties?.createdAt
            ? Date.now() - entity.properties.createdAt
            : 0
          const ageDays = age / (24 * 60 * 60 * 1000)
          const severity = Math.min(1.0, ageDays / 365) // Severity increases with age

          orphans.push({
            id: entity.id,
            severity,
            age,
            properties: entity.properties,
          })
        }
      }

      const orphanRatio = entities.length > 0 ? orphans.length / entities.length : 0

      return {
        orphans,
        totalEntities: entities.length,
        orphanRatio,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))

      if (config.continueOnError) {
        return {
          orphans,
          totalEntities: 0,
          orphanRatio: 0,
          errors,
        }
      }

      throw error
    }
  }

  /**
   * Calculate overall quality score
   */
  async calculateOverallQuality(config: QualityConfig = {}): Promise<OverallQuality> {
    const weights = {
      embeddingQuality: config.weights?.embeddingQuality ?? 0.4,
      relationshipQuality: config.weights?.relationshipQuality ?? 0.4,
      orphanPenalty: config.weights?.orphanPenalty ?? 0.2,
    }

    // Get all quality metrics
    const entities = await this.storage.getAllEntities()

    // Calculate average embedding quality
    let embeddingScoreSum = 0
    let embeddingCount = 0

    for (const entity of entities) {
      try {
        const score = await this.calculateEmbeddingQuality(entity.id)
        embeddingScoreSum += score.score
        embeddingCount++
      } catch {
        // Skip on error
      }
    }

    const embeddingQuality = embeddingCount > 0 ? embeddingScoreSum / embeddingCount : 0

    // Check relationship consistency
    const consistencyReport = await this.checkRelationshipConsistency()
    const relationshipQuality = consistencyReport.isConsistent
      ? 1.0
      : Math.max(0, 1.0 - (consistencyReport.inconsistencies.length / consistencyReport.totalRelationships))

    // Check orphan ratio
    const orphanReport = await this.detectOrphanedContent()
    const orphanPenalty = 1.0 - orphanReport.orphanRatio

    // Calculate weighted overall score
    const overallScore =
      (embeddingQuality * weights.embeddingQuality) +
      (relationshipQuality * weights.relationshipQuality) +
      (orphanPenalty * weights.orphanPenalty)

    return {
      embeddingQuality,
      relationshipQuality,
      orphanRatio: orphanReport.orphanRatio,
      overallScore,
      timestamp: Date.now(),
    }
  }

  /**
   * Record a quality snapshot
   */
  async recordSnapshot(): Promise<OverallQuality> {
    const snapshot = await this.calculateOverallQuality()

    this.history.push(snapshot)

    // Trim history if needed
    if (this.history.length > this.historyLimit) {
      this.history.shift()
    }

    return snapshot
  }

  /**
   * Get quality history
   */
  getHistory(): OverallQuality[] {
    return [...this.history]
  }

  /**
   * Get quality trend
   */
  getTrend(): QualityTrend {
    if (this.history.length < 2) {
      return {
        direction: 'stable',
        change: 0,
        confidence: 0,
      }
    }

    const recent = this.history.slice(-3) // Last 3 snapshots
    const firstScore = recent[0].overallScore
    const lastScore = recent[recent.length - 1].overallScore

    const change = lastScore - firstScore
    const confidence = Math.min(1.0, recent.length / 10) // More data = more confidence

    let direction: 'improving' | 'declining' | 'stable'
    if (Math.abs(change) < 0.01) { // Lower threshold for better sensitivity
      direction = 'stable'
    } else if (change > 0) {
      direction = 'improving'
    } else {
      direction = 'declining'
    }

    return {
      direction,
      change,
      confidence,
    }
  }

  /**
   * Create quality check job for scheduler
   */
  createQualityCheckJob(config: QualityConfig = {}): MaintenanceJob {
    return {
      id: `quality-check-${Date.now()}`,
      name: 'Quality Check',
      priority: JobPriority.NORMAL,
      execute: async (ctx: JobContext) => {
        try {
          ctx.log('Starting quality check')

          if (ctx.isCancelled()) {
            return { success: false, reason: 'cancelled' }
          }

          ctx.updateProgress(0.3)
          const overall = await this.calculateOverallQuality(config)

          ctx.log(`Overall quality score: ${(overall.overallScore * 100).toFixed(1)}%`)
          ctx.log(`Embedding quality: ${(overall.embeddingQuality * 100).toFixed(1)}%`)
          ctx.log(`Relationship quality: ${(overall.relationshipQuality * 100).toFixed(1)}%`)
          ctx.log(`Orphan ratio: ${(overall.orphanRatio * 100).toFixed(1)}%`)

          if (ctx.isCancelled()) {
            return { success: false, reason: 'cancelled' }
          }

          ctx.updateProgress(0.9)

          // Record snapshot
          await this.recordSnapshot()

          ctx.updateProgress(1.0)

          return {
            success: true,
            overallScore: overall.overallScore,
            embeddingQuality: overall.embeddingQuality,
            relationshipQuality: overall.relationshipQuality,
            orphanRatio: overall.orphanRatio,
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          ctx.log(`Quality check failed: ${errorMessage}`)
          return { success: false, error: errorMessage }
        }
      },
    }
  }

  /**
   * Check if relationship type requires reverse
   */
  private requiresReverse(type: string): boolean {
    const bidirectional = ['SUPERSEDES', 'RELATES_TO']
    return bidirectional.includes(type)
  }

  /**
   * Get reverse relationship type
   */
  private getReverseType(type: string): string {
    const reverseMap: Record<string, string> = {
      'SUPERSEDES': 'SUPERSEDED_BY',
      'SUPERSEDED_BY': 'SUPERSEDES',
      'RELATES_TO': 'RELATES_TO',
    }
    return reverseMap[type] || type
  }
}
