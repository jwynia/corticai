/**
 * Semantic Processing Module
 *
 * Phase 1 Foundation: Lifecycle metadata and semantic block extraction
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
