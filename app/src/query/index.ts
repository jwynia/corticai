/**
 * Query Interface Layer - Main exports
 * 
 * This file exports all the public interfaces and classes for the Query Interface Layer
 */

// Core types
export * from './types'

// QueryBuilder for fluent query construction
export { QueryBuilder } from './QueryBuilder'

// Main query executor
export { QueryExecutor, type AdapterType, type QueryableStorage } from './QueryExecutor'

// Specialized executors
export { MemoryQueryExecutor } from './executors/MemoryQueryExecutor'

// Re-export key interfaces from storage for convenience
export type { Storage } from '../storage/interfaces/Storage'