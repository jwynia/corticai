/**
 * Semantic Enrichment Processor
 *
 * Enriches entities with lifecycle metadata and semantic blocks during ingestion.
 * This is a write-time enrichment process that runs once when content is added
 * to the system, making subsequent queries fast.
 *
 * @see context-network/architecture/semantic-processing/write-time-enrichment.md
 */

import type { Entity } from '../types/entity'
import { LifecycleDetector } from './LifecycleDetector'
import { SemanticBlockParser } from './SemanticBlockParser'
import type {
  LifecycleMetadata,
  SemanticBlock,
  LifecycleDetectorConfig,
} from './types'

/**
 * Configuration for semantic enrichment
 */
export interface EnrichmentConfig {
  /** Configuration for lifecycle detection */
  lifecycleDetector?: LifecycleDetectorConfig

  /** Whether to extract semantic blocks (default: true) */
  extractSemanticBlocks?: boolean

  /** Whether to detect lifecycle state (default: true) */
  detectLifecycle?: boolean

  /**
   * Default lifecycle state when detection fails or is disabled
   * (default: 'stable')
   */
  defaultLifecycleState?: 'current' | 'stable' | 'evolving'
}

/**
 * Result of semantic enrichment
 */
export interface EnrichmentResult {
  /** The enriched entity */
  entity: Entity

  /** Whether lifecycle metadata was added */
  hasLifecycle: boolean

  /** Whether semantic blocks were extracted */
  hasSemanticBlocks: boolean

  /** Number of semantic blocks extracted */
  blockCount: number

  /** Any warnings or issues encountered */
  warnings: string[]
}

/**
 * Semantic Enrichment Processor
 *
 * Processes entities during ingestion to add lifecycle metadata and
 * extract semantic blocks. This is a write-time process that enriches
 * entities once, making subsequent queries fast.
 */
export class SemanticEnrichmentProcessor {
  private lifecycleDetector: LifecycleDetector
  private blockParser: SemanticBlockParser
  private config: {
    lifecycleDetector?: LifecycleDetectorConfig
    extractSemanticBlocks: boolean
    detectLifecycle: boolean
    defaultLifecycleState: 'current' | 'stable' | 'evolving'
  }

  /**
   * Create a new enrichment processor
   *
   * @param config Configuration options
   */
  constructor(config?: EnrichmentConfig) {
    this.lifecycleDetector = new LifecycleDetector(config?.lifecycleDetector)
    this.blockParser = new SemanticBlockParser()

    this.config = {
      lifecycleDetector: config?.lifecycleDetector,
      extractSemanticBlocks: config?.extractSemanticBlocks ?? true,
      detectLifecycle: config?.detectLifecycle ?? true,
      defaultLifecycleState: config?.defaultLifecycleState ?? 'stable',
    }
  }

  /**
   * Enrich a single entity with lifecycle and semantic metadata
   *
   * @param entity Entity to enrich
   * @returns Enrichment result with enriched entity
   */
  enrich(entity: Entity): EnrichmentResult {
    const warnings: string[] = []
    let hasLifecycle = false
    let hasSemanticBlocks = false
    let blockCount = 0

    // Clone entity to avoid mutation
    const enrichedEntity: Entity = {
      ...entity,
      metadata: {
        ...entity.metadata,
      },
    }

    // Extract semantic blocks if enabled and content exists
    if (this.config.extractSemanticBlocks && entity.content) {
      const parseResult = this.blockParser.parse(entity.content, entity.id)

      if (parseResult.blocks.length > 0) {
        enrichedEntity.metadata!.blocks = parseResult.blocks.map(block => ({
          id: block.id,
          type: block.type,
          content: block.content,
          importance: block.importance,
          attributes: block.attributes,
          location: block.location,
        }))

        hasSemanticBlocks = true
        blockCount = parseResult.blocks.length
      }

      // Collect parsing errors as warnings
      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(error => {
          warnings.push(
            `Semantic block parse error at line ${error.line}: ${error.message}`
          )
        })
      }
    }

    // Detect lifecycle state if enabled and content exists
    if (this.config.detectLifecycle && entity.content) {
      const filename = entity.metadata?.filename || entity.name
      const detectionResult = this.lifecycleDetector.detect(entity.content, filename)

      if (detectionResult) {
        enrichedEntity.metadata!.lifecycle = {
          state: detectionResult.state,
          confidence: detectionResult.confidence,
          manual: false, // Automatic detection
          supersededBy: detectionResult.supersededBy,
          stateChangedAt: new Date().toISOString(),
          stateChangedBy: 'automatic',
        }

        hasLifecycle = true

        // Add warning for low confidence detections
        if (
          detectionResult.confidence === 'low' &&
          this.lifecycleDetector.shouldFlagLowConfidence()
        ) {
          warnings.push(
            `Low confidence lifecycle detection for ${entity.id}: ${detectionResult.state}`
          )
        }
      } else {
        // No detection - apply default
        enrichedEntity.metadata!.lifecycle = {
          state: this.config.defaultLifecycleState,
          confidence: 'low',
          manual: false,
          stateChangedAt: new Date().toISOString(),
          stateChangedBy: 'automatic',
        }

        hasLifecycle = true
      }
    }

    return {
      entity: enrichedEntity,
      hasLifecycle,
      hasSemanticBlocks,
      blockCount,
      warnings,
    }
  }

  /**
   * Enrich multiple entities in batch
   *
   * @param entities Entities to enrich
   * @returns Array of enrichment results
   */
  enrichBatch(entities: Entity[]): EnrichmentResult[] {
    return entities.map(entity => this.enrich(entity))
  }

  /**
   * Check if an entity needs enrichment
   *
   * @param entity Entity to check
   * @returns True if entity should be enriched
   */
  needsEnrichment(entity: Entity): boolean {
    // Check if lifecycle metadata is missing
    if (this.config.detectLifecycle && !entity.metadata?.lifecycle) {
      return true
    }

    // Check if semantic blocks are missing but content has blocks
    if (
      this.config.extractSemanticBlocks &&
      entity.content &&
      !entity.metadata?.blocks &&
      this.blockParser.hasSemanticBlocks(entity.content)
    ) {
      return true
    }

    return false
  }

  /**
   * Re-enrich an entity (update existing enrichment)
   *
   * Useful when:
   * - Content has been updated
   * - Enrichment algorithms have improved
   * - Manual lifecycle assignment needs to be preserved
   *
   * @param entity Entity to re-enrich
   * @param preserveManual Whether to preserve manual lifecycle assignments (default: true)
   * @returns Enrichment result
   */
  reEnrich(entity: Entity, preserveManual = true): EnrichmentResult {
    // If preserving manual assignments, check if lifecycle was manually set
    const hadManualLifecycle = entity.metadata?.lifecycle?.manual === true

    // Perform enrichment
    const result = this.enrich(entity)

    // Restore manual lifecycle if requested
    if (preserveManual && hadManualLifecycle && entity.metadata?.lifecycle) {
      result.entity.metadata!.lifecycle = entity.metadata.lifecycle
    }

    return result
  }

  /**
   * Manually set lifecycle state for an entity
   *
   * @param entity Entity to update
   * @param state Lifecycle state to set
   * @param reason Optional reason for the state
   * @returns Updated entity
   */
  setLifecycleState(
    entity: Entity,
    state: LifecycleMetadata['state'],
    reason?: string
  ): Entity {
    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        lifecycle: {
          state,
          confidence: 'high',
          manual: true,
          reason,
          stateChangedAt: new Date().toISOString(),
          stateChangedBy: 'manual',
        },
      },
    }
  }

  /**
   * Extract just the semantic blocks from content
   *
   * Convenience method for extracting blocks without full enrichment
   *
   * @param content Content to parse
   * @param parentId Parent entity ID
   * @returns Array of semantic blocks
   */
  extractBlocks(content: string, parentId: string): SemanticBlock[] {
    const result = this.blockParser.parse(content, parentId)
    return result.blocks
  }

  /**
   * Detect just the lifecycle state from content
   *
   * Convenience method for lifecycle detection without full enrichment
   *
   * @param content Content to analyze
   * @param filename Optional filename
   * @returns Lifecycle metadata or null
   */
  detectLifecycleState(
    content: string,
    filename?: string
  ): LifecycleMetadata | null {
    const result = this.lifecycleDetector.detect(content, filename)

    if (!result) return null

    return {
      state: result.state,
      confidence: result.confidence,
      manual: false,
      supersededBy: result.supersededBy,
      stateChangedAt: new Date().toISOString(),
      stateChangedBy: 'automatic',
    }
  }

  /**
   * Get enrichment statistics for a batch of entities
   *
   * @param results Array of enrichment results
   * @returns Summary statistics
   */
  getStats(results: EnrichmentResult[]): {
    total: number
    enrichedWithLifecycle: number
    enrichedWithBlocks: number
    totalBlocks: number
    totalWarnings: number
    lifecycleDistribution: Record<string, number>
  } {
    const stats = {
      total: results.length,
      enrichedWithLifecycle: 0,
      enrichedWithBlocks: 0,
      totalBlocks: 0,
      totalWarnings: 0,
      lifecycleDistribution: {} as Record<string, number>,
    }

    for (const result of results) {
      if (result.hasLifecycle) {
        stats.enrichedWithLifecycle++

        const state = result.entity.metadata?.lifecycle?.state
        if (state) {
          stats.lifecycleDistribution[state] =
            (stats.lifecycleDistribution[state] || 0) + 1
        }
      }

      if (result.hasSemanticBlocks) {
        stats.enrichedWithBlocks++
        stats.totalBlocks += result.blockCount
      }

      stats.totalWarnings += result.warnings.length
    }

    return stats
  }
}

/**
 * Default enrichment processor instance
 */
export const defaultEnrichmentProcessor = new SemanticEnrichmentProcessor()

/**
 * Convenience function to enrich a single entity
 *
 * @param entity Entity to enrich
 * @returns Enrichment result
 */
export function enrichEntity(entity: Entity): EnrichmentResult {
  return defaultEnrichmentProcessor.enrich(entity)
}

/**
 * Convenience function to enrich multiple entities
 *
 * @param entities Entities to enrich
 * @returns Array of enrichment results
 */
export function enrichEntities(entities: Entity[]): EnrichmentResult[] {
  return defaultEnrichmentProcessor.enrichBatch(entities)
}
