/**
 * @fileoverview CorticAI - TypeScript LLM Agent Framework
 * 
 * A comprehensive framework for building TypeScript LLM agents with DuckDB storage,
 * advanced query interfaces, dependency analysis, and Mastra framework integration.
 * 
 * @author CorticAI Team
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * import { DuckDBStorageAdapter, QueryBuilder, mastra } from 'corticai';
 * 
 * // Create storage adapter
 * const storage = new DuckDBStorageAdapter({
 *   database: './data.db',
 *   tableName: 'entities'
 * });
 * 
 * // Build complex queries
 * const query = new QueryBuilder()
 *   .select(['id', 'name'])
 *   .where('status', '=', 'active')
 *   .orderBy('created_at', 'DESC')
 *   .build();
 * 
 * // Use Mastra integration
 * const result = await mastra.workflows.weatherWorkflow.execute({
 *   location: 'San Francisco'
 * });
 * ```
 */

// Storage exports
export * from './storage/index.js'

// Query interface exports  
export * from './query/index.js'

// Mastra integration exports
export * from './mastra/index.js'

// Type definitions
export * from './types/entity.js'

// Analyzers
export { TypeScriptDependencyAnalyzer } from './analyzers/TypeScriptDependencyAnalyzer.js'
export type { 
  AnalyzerOptions, 
  DependencyGraph, 
  FileAnalysis,
  ProjectAnalysis,
  ProjectStats,
  Report,
  Node,
  Edge,
  Cycle,
  Import,
  Export,
  AnalysisError,
  ModuleImportInfo
} from './analyzers/types.js'