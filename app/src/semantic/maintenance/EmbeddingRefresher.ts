/**
 * EmbeddingRefresher - Embedding Maintenance and Model Migration
 *
 * Manages embedding refresh when models change or quality degrades.
 * Supports progressive, non-blocking refresh with resource management.
 *
 * Features:
 * - Model version tracking
 * - Progressive batch refresh
 * - Drift detection
 * - Rate limiting and concurrency control
 * - MaintenanceScheduler integration
 * - Error handling and retries
 */

import type { MaintenanceJob, JobContext } from './MaintenanceScheduler'
import { JobPriority } from './MaintenanceScheduler'

/**
 * Refresh status enum
 */
export enum RefreshStatus {
  IDLE = 'idle',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Refresh configuration
 */
export interface RefreshConfig {
  /** Number of entities to process per batch */
  batchSize?: number

  /** Maximum concurrent API calls */
  maxConcurrent?: number

  /** Delay between batches (ms) */
  delayBetweenBatches?: number

  /** Maximum retry attempts for failed batches */
  maxRetries?: number

  /** Continue on error or stop */
  continueOnError?: boolean

  /** Rate limiting configuration */
  rateLimit?: {
    requestsPerSecond: number
  }

  /** Job priority (for scheduler integration) */
  priority?: 'low' | 'normal' | 'high'

  /** Whether this is a recurring job */
  recurring?: boolean

  /** Interval for recurring jobs (ms) */
  interval?: number
}

/**
 * Refresh result
 */
export interface RefreshResult {
  status: RefreshStatus
  refreshed: number
  errors?: string[]
  startTime?: number
  endTime?: number
}

/**
 * Refresh statistics
 */
export interface RefreshStats {
  total: number
  refreshed: number
  pending: number
  avgQualityScore?: number
}

/**
 * Drift detection report
 */
export interface DriftReport {
  isDrifting: boolean
  qualityScore: number
  recommendation: 'none' | 'refresh' | 'urgent'
  timestamp: number
}

/**
 * Current refresh status
 */
export interface CurrentStatus {
  status: RefreshStatus
  progress: number
  processed: number
  total: number
  errors: number
  error?: string
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalRequests: number
  totalTime: number
  avgBatchTime: number
  successRate: number
}

/**
 * Embedding service interface
 */
export interface EmbeddingService {
  getModelVersion(): string
  generateEmbedding(text: string): Promise<number[]>
  batchGenerate(texts: string[]): Promise<number[][]>
}

/**
 * Storage interface for embeddings
 */
export interface EmbeddingStorage {
  getEntitiesNeedingRefresh(modelVersion: string, limit?: number): Promise<Array<{ id: string; content: string }>>
  updateEmbedding(entityId: string, embedding: number[], modelVersion: string): Promise<void>
  getEmbeddingStats(): Promise<{
    total: number
    currentVersion: number
    outdated: number
    avgQualityScore?: number
  }>
}

/**
 * EmbeddingRefresher configuration
 */
export interface EmbeddingRefresherConfig {
  embeddingService: EmbeddingService
  storage: EmbeddingStorage
  defaultBatchSize?: number
  defaultConcurrency?: number
}

/**
 * EmbeddingRefresher implementation
 */
export class EmbeddingRefresher {
  // Timing constants for refresh operations
  private static readonly DEFAULT_BATCH_DELAY_MS = 100
  private static readonly RETRY_DELAY_BASE_MS = 1000
  private static readonly DEFAULT_JOB_BATCH_DELAY_MS = 100

  private embeddingService: EmbeddingService
  private storage: EmbeddingStorage
  private currentStatus: CurrentStatus
  private driftHistory: DriftReport[] = []
  private metrics: PerformanceMetrics
  private isPaused: boolean = false
  private defaultBatchSize: number
  private defaultConcurrency: number

  constructor(config: EmbeddingRefresherConfig) {
    this.embeddingService = config.embeddingService
    this.storage = config.storage
    this.defaultBatchSize = config.defaultBatchSize ?? 50
    this.defaultConcurrency = config.defaultConcurrency ?? 3

    this.currentStatus = {
      status: RefreshStatus.IDLE,
      progress: 0,
      processed: 0,
      total: 0,
      errors: 0,
    }

    this.metrics = {
      totalRequests: 0,
      totalTime: 0,
      avgBatchTime: 0,
      successRate: 1.0,
    }
  }

  /**
   * Get current model version
   */
  async getCurrentModelVersion(): Promise<string> {
    return this.embeddingService.getModelVersion()
  }

  /**
   * Get entities needing refresh
   */
  async getEntitiesNeedingRefresh(limit?: number): Promise<Array<{ id: string; content: string }>> {
    const modelVersion = await this.getCurrentModelVersion()
    const effectiveLimit = limit ?? this.defaultBatchSize
    return this.storage.getEntitiesNeedingRefresh(modelVersion, effectiveLimit)
  }

  /**
   * Get refresh statistics
   */
  async getRefreshStats(): Promise<RefreshStats> {
    const stats = await this.storage.getEmbeddingStats()

    return {
      total: stats.total,
      refreshed: stats.currentVersion,
      pending: stats.outdated,
      avgQualityScore: stats.avgQualityScore,
    }
  }

  /**
   * Refresh a batch of embeddings
   */
  async refreshBatch(config: RefreshConfig = {}): Promise<RefreshResult> {
    // Validate configuration
    const batchSize = config.batchSize ?? this.defaultBatchSize
    if (batchSize <= 0) {
      throw new Error('Invalid batch size')
    }

    const startTime = Date.now()
    const errors: string[] = []
    let refreshed = 0

    try {
      // Get entities needing refresh
      const entities = await this.getEntitiesNeedingRefresh(batchSize)

      if (entities.length === 0) {
        return {
          status: RefreshStatus.COMPLETED,
          refreshed: 0,
          startTime,
          endTime: Date.now(),
        }
      }

      // Extract texts for batch processing
      const texts = entities.map(e => e.content)

      // Generate embeddings in batch
      const embeddings = await this.generateWithRetry(texts, config)

      // Update storage with new embeddings
      const modelVersion = await this.getCurrentModelVersion()

      // Apply rate limiting if configured
      if (config.rateLimit) {
        const delay = 1000 / config.rateLimit.requestsPerSecond
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Update embeddings (with concurrency control)
      const maxConcurrent = config.maxConcurrent ?? this.defaultConcurrency
      await this.updateEmbeddingsConcurrent(entities, embeddings, modelVersion, maxConcurrent)

      refreshed = entities.length

      // Update metrics
      this.metrics.totalRequests++
      this.metrics.totalTime += Date.now() - startTime
      this.metrics.avgBatchTime = this.metrics.totalTime / this.metrics.totalRequests

      // Check if more entities need refresh
      const stats = await this.getRefreshStats()
      const hasMore = stats.pending > 0

      return {
        status: hasMore ? RefreshStatus.IN_PROGRESS : RefreshStatus.COMPLETED,
        refreshed,
        startTime,
        endTime: Date.now(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(errorMessage)

      this.metrics.successRate = this.metrics.totalRequests > 0
        ? (this.metrics.totalRequests - errors.length) / this.metrics.totalRequests
        : 0

      if (config.continueOnError) {
        return {
          status: RefreshStatus.FAILED,
          refreshed,
          errors,
          startTime,
          endTime: Date.now(),
        }
      }

      throw error
    }
  }

  /**
   * Generate embeddings with retry logic
   */
  private async generateWithRetry(
    texts: string[],
    config: RefreshConfig
  ): Promise<number[][]> {
    const maxRetries = config.maxRetries ?? 3
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.embeddingService.batchGenerate(texts)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, EmbeddingRefresher.RETRY_DELAY_BASE_MS * attempt))
        }
      }
    }

    throw lastError || new Error('Failed to generate embeddings')
  }

  /**
   * Update embeddings with concurrency control
   */
  private async updateEmbeddingsConcurrent(
    entities: Array<{ id: string; content: string }>,
    embeddings: number[][],
    modelVersion: string,
    maxConcurrent: number
  ): Promise<void> {
    const chunks: Array<Array<number>> = []

    // Split into concurrent chunks
    for (let i = 0; i < entities.length; i += maxConcurrent) {
      const chunkIndices = Array.from(
        { length: Math.min(maxConcurrent, entities.length - i) },
        (_, idx) => i + idx
      )
      chunks.push(chunkIndices)
    }

    // Process chunks sequentially, but items within chunk concurrently
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(i =>
          this.storage.updateEmbedding(entities[i].id, embeddings[i], modelVersion)
        )
      )
    }
  }

  /**
   * Start progressive refresh (non-blocking)
   */
  async startProgressiveRefresh(config: RefreshConfig = {}): Promise<void> {
    this.currentStatus.status = RefreshStatus.IN_PROGRESS
    this.isPaused = false

    const batchSize = config.batchSize ?? this.defaultBatchSize
    const delayBetweenBatches = config.delayBetweenBatches ?? EmbeddingRefresher.DEFAULT_BATCH_DELAY_MS

    // Get total count
    const stats = await this.getRefreshStats()
    this.currentStatus.total = stats.pending
    this.currentStatus.processed = 0

    // Process batches progressively
    while (this.currentStatus.processed < this.currentStatus.total) {
      // Check pause before processing
      if (this.isPaused) {
        this.currentStatus.status = RefreshStatus.PAUSED
        return
      }

      const result = await this.refreshBatch({ ...config, batchSize })

      this.currentStatus.processed += result.refreshed
      this.currentStatus.progress = this.currentStatus.total > 0
        ? this.currentStatus.processed / this.currentStatus.total
        : 1.0

      if (result.status === RefreshStatus.COMPLETED) {
        break
      }

      // Check pause after processing (before delay)
      if (this.isPaused) {
        this.currentStatus.status = RefreshStatus.PAUSED
        return
      }

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }

    this.currentStatus.status = RefreshStatus.COMPLETED
  }

  /**
   * Pause progressive refresh
   */
  pause(): void {
    this.isPaused = true
    if (this.currentStatus.status === RefreshStatus.IN_PROGRESS) {
      this.currentStatus.status = RefreshStatus.PAUSED
    }
  }

  /**
   * Resume paused refresh
   *
   * Note: This method is synchronous but starts an async operation.
   * Check getStatus().error to detect if resume failed.
   */
  resume(): void {
    this.isPaused = false
    if (this.currentStatus.status === RefreshStatus.PAUSED) {
      this.currentStatus.status = RefreshStatus.IN_PROGRESS
      this.currentStatus.error = undefined // Clear any previous errors

      // Continue with progressive refresh
      this.startProgressiveRefresh({}).catch(err => {
        const errorMessage = err instanceof Error ? err.message : String(err)
        this.currentStatus.status = RefreshStatus.FAILED
        this.currentStatus.error = errorMessage
        console.error('Progressive refresh error:', errorMessage, err)
      })
    }
  }

  /**
   * Get current status
   */
  getStatus(): CurrentStatus {
    return { ...this.currentStatus }
  }

  /**
   * Detect embedding drift
   */
  async detectDrift(): Promise<DriftReport> {
    const stats = await this.storage.getEmbeddingStats()
    const qualityScore = stats.avgQualityScore ?? 1.0

    const isDrifting = qualityScore < 0.5
    const recommendation: 'none' | 'refresh' | 'urgent' =
      qualityScore < 0.3 ? 'urgent' :
      qualityScore < 0.5 ? 'refresh' :
      'none'

    const report: DriftReport = {
      isDrifting,
      qualityScore,
      recommendation,
      timestamp: Date.now(),
    }

    // Track history
    this.driftHistory.push(report)

    return report
  }

  /**
   * Get drift history
   */
  getDriftHistory(): DriftReport[] {
    return [...this.driftHistory]
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Create a maintenance job for scheduler integration
   */
  createRefreshJob(config: RefreshConfig = {}): MaintenanceJob {
    const batchSize = config.batchSize ?? this.defaultBatchSize

    return {
      id: `embedding-refresh-${Date.now()}`,
      name: 'Embedding Refresh',
      priority: this.mapPriority(config.priority),
      recurring: config.recurring ?? false,
      interval: config.interval,
      execute: async (ctx: JobContext) => {
        try {
          // Get total to refresh
          const stats = await this.getRefreshStats()
          const total = stats.pending

          if (total === 0) {
            ctx.log('No embeddings need refresh')
            return { success: true, refreshed: 0 }
          }

          ctx.log(`Refreshing ${total} embeddings in batches of ${batchSize}`)

          let processed = 0

          while (processed < total) {
            if (ctx.isCancelled()) {
              ctx.log('Refresh cancelled')
              return { success: false, reason: 'cancelled' }
            }

            const result = await this.refreshBatch({ ...config, batchSize })

            processed += result.refreshed
            const progress = total > 0 ? processed / total : 1.0
            ctx.updateProgress(progress)

            ctx.log(`Refreshed ${processed}/${total} embeddings`)

            if (result.status === RefreshStatus.COMPLETED) {
              break
            }

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches ?? EmbeddingRefresher.DEFAULT_JOB_BATCH_DELAY_MS))
          }

          ctx.updateProgress(1.0)
          return { success: true, refreshed: processed }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          ctx.log(`Refresh failed: ${errorMessage}`)
          return { success: false, error: errorMessage }
        }
      },
    }
  }

  /**
   * Map priority string to JobPriority enum
   */
  private mapPriority(priority?: 'low' | 'normal' | 'high'): JobPriority {
    switch (priority) {
      case 'low':
        return JobPriority.LOW
      case 'high':
        return JobPriority.HIGH
      case 'normal':
      default:
        return JobPriority.NORMAL
    }
  }
}
