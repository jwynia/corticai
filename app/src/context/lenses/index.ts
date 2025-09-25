/**
 * Context Lens System - Core Interface Exports
 *
 * This module provides the foundational interfaces and utilities for the Phase 3
 * Lens System. It exports all public types, classes, and helper functions needed
 * to implement and use context lenses for perspective-based context filtering.
 *
 * Usage:
 * ```typescript
 * import { ContextLens, BaseLens, createQueryContext } from '@/context/lenses'
 *
 * class MyCustomLens extends BaseLens {
 *   transformQuery<T>(query: Query<T>): Query<T> {
 *     // Custom transformation logic
 *   }
 * }
 * ```
 */

// Core types and interfaces
export type {
  ContextLens,
  LensConfig,
  ActivationContext,
  QueryContext,
  DeveloperAction,
  ProjectMetadata,
  ActivationRule,
  QueryModification,
  ResultTransformation
} from './types'

// Base implementation classes
export {
  BaseLens,
  LensError
} from './ContextLens'

// Configuration utilities
export {
  validateLensConfig,
  createDefaultLensConfig,
  mergeLensConfigs,
  LensConfigValidationError
} from './config'

// Helper functions
export {
  safeTransformQuery,
  safeProcessResults,
  createQueryContext
} from './ContextLens'

// Registry and activation system
export {
  LensRegistry,
  type LensConflict,
  type ActivationHistoryEntry,
  type LensRegistryEvent,
  type LensRegistryEventListener
} from './LensRegistry'

export {
  ActivationDetector,
  type FilePatterns,
  type ActionPatterns,
  type ConfidenceScores,
  type LensMatch,
  type ContextAnalysis
} from './ActivationDetector'