/**
 * Semantic Processing Module
 *
 * Phase 1 Foundation: Lifecycle metadata and semantic block extraction
 * Phase 2: Q&A generation and relationship inference
 * Phase 3: Semantic Pipeline (5-stage query-time processing) - IN PROGRESS
 *
 * This module provides the foundation for CorticAI's semantic processing system,
 * which addresses the attention gravity problem and enables intelligent context
 * management for knowledge networks.
 *
 * @see context-network/architecture/semantic-processing/
 * @see context-network/planning/semantic-processing-implementation/
 */

// Types
export type {
  LifecycleState,
  LifecycleConfidence,
  LifecycleMetadata,
  SemanticBlockType,
  BlockImportance,
  SemanticBlock,
  SemanticEntityMetadata,
  SemanticRelationType,
  SemanticRelationship,
  LifecyclePattern,
  LifecycleDetectionResult,
  LifecycleDetectorConfig,
  Polarity,
  // Phase 3: Pipeline types
  QueryIntent,
  ParsedQuery,
  CandidateResult,
  EnrichedResult,
  RankedResult,
  PresentedResult,
  PipelineConfig,
  PipelineResult,
} from './types'

// Lifecycle Detection
export {
  LifecycleDetector,
  defaultLifecycleDetector,
  detectLifecycle,
} from './LifecycleDetector'

// Semantic Block Parsing
export {
  SemanticBlockParser,
  defaultSemanticBlockParser,
  parseSemanticBlocks,
  hasSemanticBlocks,
} from './SemanticBlockParser'
export type { ParseResult, ParseError } from './SemanticBlockParser'

// Semantic Enrichment
export {
  SemanticEnrichmentProcessor,
  defaultEnrichmentProcessor,
  enrichEntity,
  enrichEntities,
} from './SemanticEnrichmentProcessor'
export type {
  EnrichmentConfig,
  EnrichmentResult,
} from './SemanticEnrichmentProcessor'

// Phase 3: Query-Time Processing (Semantic Pipeline)
export { QueryParser } from './QueryParser'
export { StructuralFilter } from './StructuralFilter'
export type { FilterableEntity, EntityProvider } from './StructuralFilter'
export { SemanticEnricher } from './SemanticEnricher'
export type { EntityLookupFn } from './SemanticEnricher'
export { SemanticRanker } from './SemanticRanker'
export type { EmbeddingSimilarityFn } from './SemanticRanker'
export { SemanticPresenter } from './SemanticPresenter'
export type { BlockLookupFn, ChainEntityLookupFn } from './SemanticPresenter'
export { ContextPipeline } from './ContextPipeline'
export type { ContextPipelineConfig } from './ContextPipeline'
