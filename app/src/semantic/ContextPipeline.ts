/**
 * ContextPipeline - Orchestrator for 5-Stage Semantic Pipeline
 *
 * Coordinates all pipeline stages to transform user queries into ranked,
 * enriched, and presented results.
 *
 * Pipeline Flow:
 * 1. QueryParser: Parse user query → ParsedQuery
 * 2. StructuralFilter: Filter entities → CandidateResult[]
 * 3. SemanticEnricher: Enrich candidates → EnrichedResult[]
 * 4. SemanticRanker: Rank by relevance → RankedResult[]
 * 5. SemanticPresenter: Format results → PresentedResult[]
 *
 * Performance target: <100ms per query
 */

import { QueryParser } from './QueryParser'
import { StructuralFilter, type EntityProvider } from './StructuralFilter'
import { SemanticEnricher, type EntityLookupFn } from './SemanticEnricher'
import { SemanticRanker, type EmbeddingSimilarityFn } from './SemanticRanker'
import { SemanticPresenter, type BlockLookupFn, type ChainEntityLookupFn } from './SemanticPresenter'
import { ProjectionEngine } from './ProjectionEngine'
import { ContextDepth } from '../types/context'

import type {
  ParsedQuery,
  CandidateResult,
  EnrichedResult,
  RankedResult,
  PresentedResult,
  PipelineConfig,
  PipelineResult,
} from './types'
import type { ProjectedResult } from './ProjectionEngine'

/**
 * Context Pipeline configuration
 */
export interface ContextPipelineConfig extends PipelineConfig {
  /** Entity provider for structural filtering */
  entityProvider: EntityProvider

  /** Entity lookup for enrichment (supersession chains) */
  entityLookup: EntityLookupFn

  /** Optional: Embedding similarity function for ranking */
  embeddingSimilarity?: EmbeddingSimilarityFn

  /** Optional: Block lookup for presentation */
  blockLookup?: BlockLookupFn

  /** Optional: Chain entity lookup for presentation */
  chainEntityLookup?: ChainEntityLookupFn
}

/**
 * Context Pipeline orchestrator
 */
export class ContextPipeline {
  private queryParser: QueryParser
  private structuralFilter: StructuralFilter
  private semanticEnricher: SemanticEnricher
  private semanticRanker: SemanticRanker
  private semanticPresenter: SemanticPresenter
  private projectionEngine: ProjectionEngine
  private config: ContextPipelineConfig

  /**
   * Create a new ContextPipeline
   *
   * @param config - Pipeline configuration
   */
  constructor(config: ContextPipelineConfig) {
    this.config = config

    // Initialize all stages
    this.queryParser = new QueryParser()
    this.structuralFilter = new StructuralFilter(config.entityProvider)
    this.semanticEnricher = new SemanticEnricher(config.entityLookup)
    this.semanticRanker = new SemanticRanker(config.embeddingSimilarity)
    this.semanticPresenter = new SemanticPresenter(
      config.blockLookup,
      config.chainEntityLookup
    )
    this.projectionEngine = new ProjectionEngine({
      defaultDepth: ContextDepth.STRUCTURE,
    })
  }

  /**
   * Execute the full pipeline for a query
   *
   * @param query - User query string
   * @param config - Optional pipeline configuration overrides
   * @returns Complete pipeline result with all stage outputs
   */
  async execute(query: string, config?: Partial<PipelineConfig>): Promise<PipelineResult> {
    const startTime = Date.now()
    const timings: PipelineResult['stageTimings'] = {
      stage1: 0,
      stage2: 0,
      stage3: 0,
      stage4: 0,
      stage5: 0,
    }

    // Merge configuration
    const effectiveConfig: PipelineConfig = {
      ...this.config,
      ...config,
    }

    // Stage 1: Query Parsing
    const stage1Start = Date.now()
    const parsedQuery = this.queryParser.parse(query)
    timings.stage1 = Date.now() - stage1Start

    // Stage 2: Structural Filtering
    const stage2Start = Date.now()
    const candidates = await this.structuralFilter.filter(parsedQuery, effectiveConfig)
    timings.stage2 = Date.now() - stage2Start

    // Stage 3: Semantic Enrichment
    const stage3Start = Date.now()
    const enrichedResults = await this.semanticEnricher.enrich(
      candidates,
      parsedQuery,
      effectiveConfig
    )
    timings.stage3 = Date.now() - stage3Start

    // Stage 4: Semantic Ranking
    const stage4Start = Date.now()
    const rankedResults = await this.semanticRanker.rank(
      enrichedResults,
      parsedQuery,
      effectiveConfig
    )
    timings.stage4 = Date.now() - stage4Start

    // Stage 5: Semantic Presentation
    const stage5Start = Date.now()
    const presentedResults = await this.semanticPresenter.present(
      rankedResults,
      parsedQuery,
      effectiveConfig
    )

    // Stage 5 (Phase 4): Projection to target depth
    const targetDepth = effectiveConfig.depth ?? ContextDepth.STRUCTURE
    const projectedResults = await this.projectionEngine.project(rankedResults, {
      depth: targetDepth,
      suggestedDepth: this.projectionEngine.suggestDepth(parsedQuery),
      maxBlocksPerResult: effectiveConfig.maxBlocksPerResult,
      maxSuggestions: effectiveConfig.maxSuggestions,
    })

    timings.stage5 = Date.now() - stage5Start

    const executionTime = Date.now() - startTime

    return {
      query,
      parsedQuery,
      candidates,
      enrichedResults,
      rankedResults,
      presentedResults,
      projectedResults,
      executionTime,
      stageTimings: timings,
    }
  }

  /**
   * Quick query execution that returns only final results
   *
   * @param query - User query string
   * @param config - Optional pipeline configuration overrides
   * @returns Final presented results (or projected results if depth is specified)
   */
  async query(query: string, config?: Partial<PipelineConfig>): Promise<PresentedResult[] | ProjectedResult[]> {
    const result = await this.execute(query, config)
    // Return projected results if depth was specified, otherwise presented results
    return result.projectedResults || result.presentedResults
  }
}
