/**
 * Progressive Loading System - Context Depth Types
 *
 * This module defines the core types and utilities for the progressive loading system.
 * It enables memory-efficient context retrieval with depth-based control.
 *
 * Key Features:
 * - 5 depth levels from SIGNATURE to HISTORICAL
 * - Entity projection to specific depths
 * - Configurable depth-based property inclusion/exclusion
 * - Performance-optimized projection functions
 */

import { Entity } from './entity'

/**
 * Context depth levels for progressive loading
 * Each level includes all previous levels plus additional properties
 */
export enum ContextDepth {
  /** Level 1: Just id, type, name - minimal entity signature */
  SIGNATURE = 1,

  /** Level 2: + structure, relationships - entity connections */
  STRUCTURE = 2,

  /** Level 3: + semantic properties, metadata - meaning and context */
  SEMANTIC = 3,

  /** Level 4: + full properties, content - complete current state */
  DETAILED = 4,

  /** Level 5: + full audit trail, versions - complete history */
  HISTORICAL = 5
}

/**
 * Entity with depth-aware structure
 * Contains all properties organized by depth level
 */
export interface DepthAwareEntity extends Entity {
  /** SIGNATURE level properties (depth 1) */
  signature: {
    id: string
    type: string
    name: string
  }

  /** STRUCTURE level properties (depth 2) */
  structure: {
    relationships: Array<{
      type: string
      target: string
      metadata: any
    }>
    hierarchy: {
      parent: string | null
      children: string[]
    }
  }

  /** SEMANTIC level properties (depth 3) */
  semantic: {
    tags: string[]
    categories: string[]
    summary: string
  }

  /** DETAILED level properties (depth 4) */
  detailed: {
    content: string
    metadata: Record<string, any>
    properties: Record<string, any>
  }

  /** HISTORICAL level properties (depth 5) */
  historical: {
    versions: Array<{
      version: string
      timestamp: string
      hash: string
    }>
    auditTrail: Array<{
      action: string
      user: string
      timestamp: string
    }>
    changeHistory: any[]
  }
}

/**
 * Depth projection configuration
 * Defines what fields to include/exclude at each depth
 */
export interface DepthProjection {
  depth: ContextDepth
  includedFields: string[]
  excludedFields: string[]
  computed: Record<string, (entity: any) => any>
}

/**
 * Configuration for customizing depth projections
 */
export interface ContextDepthConfig {
  [ContextDepth.SIGNATURE]?: {
    included: string[]
    excluded: string[]
    computed: Record<string, (entity: any) => any>
  }
  [ContextDepth.STRUCTURE]?: {
    included: string[]
    excluded: string[]
    computed: Record<string, (entity: any) => any>
  }
  [ContextDepth.SEMANTIC]?: {
    included: string[]
    excluded: string[]
    computed: Record<string, (entity: any) => any>
  }
  [ContextDepth.DETAILED]?: {
    included: string[]
    excluded: string[]
    computed: Record<string, (entity: any) => any>
  }
  [ContextDepth.HISTORICAL]?: {
    included: string[]
    excluded: string[]
    computed: Record<string, (entity: any) => any>
  }
}

/**
 * Projection mapping for each depth level
 * Defines the exact set of fields to include at each depth
 */
export interface ProjectionMap {
  [ContextDepth.SIGNATURE]: string[]
  [ContextDepth.STRUCTURE]: string[]
  [ContextDepth.SEMANTIC]: string[]
  [ContextDepth.DETAILED]: string[]
  [ContextDepth.HISTORICAL]: string[]
}

/**
 * Metadata about a depth level
 */
export interface DepthMetadata {
  name: string
  description: string
  estimatedMemoryFactor: number
  recommendedUseCase: string
}

/**
 * Default projection mapping for standard entities
 */
const DEFAULT_PROJECTION_MAP: ProjectionMap = {
  [ContextDepth.SIGNATURE]: ['id', 'type', 'name'],
  [ContextDepth.STRUCTURE]: ['id', 'type', 'name', 'relationships', 'hierarchy'],
  [ContextDepth.SEMANTIC]: ['id', 'type', 'name', 'relationships', 'hierarchy', 'tags', 'categories', 'summary'],
  [ContextDepth.DETAILED]: ['id', 'type', 'name', 'relationships', 'hierarchy', 'tags', 'categories', 'summary', 'content', 'metadata', 'properties'],
  [ContextDepth.HISTORICAL]: ['id', 'type', 'name', 'relationships', 'hierarchy', 'tags', 'categories', 'summary', 'content', 'metadata', 'properties', 'versions', 'auditTrail', 'changeHistory']
}

/**
 * Validate that a depth value is valid
 */
export function validateDepth(depth: any): depth is ContextDepth {
  return typeof depth === 'number' &&
         Number.isInteger(depth) &&
         depth >= ContextDepth.SIGNATURE &&
         depth <= ContextDepth.HISTORICAL
}

/**
 * Project an entity to a specific depth level
 * Returns a new object containing only the properties appropriate for that depth
 */
export function projectEntityToDepth<T extends Partial<DepthAwareEntity>>(
  entity: T,
  depth: ContextDepth
): Partial<T> {
  if (!entity) {
    throw new Error('Entity cannot be null or undefined')
  }

  if (!validateDepth(depth)) {
    throw new Error(`Invalid depth value: ${depth}`)
  }

  const projection = createDepthProjection(depth)
  const result: any = {}

  // Handle different entity structures - check if it's a structured DepthAwareEntity
  // or a flat entity with the data embedded
  const isStructured = entity.signature && entity.structure && entity.semantic && entity.detailed && entity.historical

  if (isStructured) {
    // For structured entities, extract from nested structure
    for (const field of projection.includedFields) {
      if (field === 'id' || field === 'type' || field === 'name') {
        // These come from signature level
        result[field] = (entity as any).signature?.[field] || (entity as any)[field]
      } else if (field === 'relationships' || field === 'hierarchy') {
        // These come from structure level
        result[field] = (entity as any).structure?.[field]
      } else if (field === 'tags' || field === 'categories' || field === 'summary') {
        // These come from semantic level
        result[field] = (entity as any).semantic?.[field]
      } else if (field === 'content' || field === 'metadata' || field === 'properties') {
        // These come from detailed level
        result[field] = (entity as any).detailed?.[field]
      } else if (field === 'versions' || field === 'auditTrail' || field === 'changeHistory') {
        // These come from historical level
        result[field] = (entity as any).historical?.[field]
      } else {
        // Fallback to direct property access
        if (entity.hasOwnProperty(field)) {
          result[field] = (entity as any)[field]
        }
      }
    }
  } else {
    // For flat entities, use direct property access
    for (const field of projection.includedFields) {
      if (entity.hasOwnProperty(field)) {
        result[field] = (entity as any)[field]
      }
    }
  }

  // Apply computed fields
  for (const [key, computeFn] of Object.entries(projection.computed)) {
    try {
      result[key] = computeFn(entity)
    } catch (error) {
      // Ignore computation errors for robustness
    }
  }

  return result
}

/**
 * Create a depth projection configuration
 */
export function createDepthProjection(
  depth: ContextDepth,
  config?: ContextDepthConfig
): DepthProjection {
  if (!validateDepth(depth)) {
    throw new Error(`Invalid depth value: ${depth}`)
  }

  const customConfig = config?.[depth]

  // Start with default fields for this depth
  let includedFields = [...DEFAULT_PROJECTION_MAP[depth]]
  let excludedFields: string[] = []
  let computed: Record<string, (entity: any) => any> = {}

  // Apply custom configuration if provided
  if (customConfig) {
    if (customConfig.included.includes('*')) {
      // Include all fields except excluded ones
      includedFields = Object.values(DEFAULT_PROJECTION_MAP).flat()
      excludedFields = customConfig.excluded || []
    } else {
      includedFields = customConfig.included
    }

    excludedFields = customConfig.excluded || []
    computed = customConfig.computed || {}
  }

  // Remove excluded fields
  includedFields = includedFields.filter(field => !excludedFields.includes(field))

  return {
    depth,
    includedFields,
    excludedFields,
    computed
  }
}

/**
 * Get metadata about a specific depth level
 */
export function getDepthMetadata(depth: ContextDepth): DepthMetadata {
  if (!validateDepth(depth)) {
    throw new Error(`Invalid depth value: ${depth}`)
  }

  const metadata: Record<ContextDepth, DepthMetadata> = {
    [ContextDepth.SIGNATURE]: {
      name: 'SIGNATURE',
      description: 'Essential identification: id, type, name only',
      estimatedMemoryFactor: 0.05,
      recommendedUseCase: 'Quick browsing, search results, navigation'
    },
    [ContextDepth.STRUCTURE]: {
      name: 'STRUCTURE',
      description: 'Basic structure: relationships and hierarchy information',
      estimatedMemoryFactor: 0.2,
      recommendedUseCase: 'Understanding connections, graph navigation'
    },
    [ContextDepth.SEMANTIC]: {
      name: 'SEMANTIC',
      description: 'Semantic context: tags, categories, summary metadata',
      estimatedMemoryFactor: 0.4,
      recommendedUseCase: 'Content analysis, categorization, filtering'
    },
    [ContextDepth.DETAILED]: {
      name: 'DETAILED',
      description: 'Complete current state: full content and properties',
      estimatedMemoryFactor: 0.8,
      recommendedUseCase: 'Content editing, detailed analysis'
    },
    [ContextDepth.HISTORICAL]: {
      name: 'HISTORICAL',
      description: 'Complete history: full audit trail and version information',
      estimatedMemoryFactor: 1.5,
      recommendedUseCase: 'Version control, compliance, forensic analysis'
    }
  }

  return metadata[depth]
}

/**
 * Calculate estimated memory usage for an entity at a given depth
 */
export function estimateMemoryUsage(entity: DepthAwareEntity, depth: ContextDepth): number {
  const projected = projectEntityToDepth(entity, depth)
  const serialized = JSON.stringify(projected)
  return serialized.length
}

/**
 * Performance utilities for depth-aware operations
 */
export class DepthPerformanceUtils {
  /**
   * Benchmark projection performance for a given entity and depth
   */
  static benchmarkProjection(entity: DepthAwareEntity, depth: ContextDepth, iterations = 1000): {
    averageTimeMs: number
    totalTimeMs: number
    projectionsPerSecond: number
  } {
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      projectEntityToDepth(entity, depth)
    }

    const endTime = performance.now()
    const totalTimeMs = endTime - startTime
    const averageTimeMs = totalTimeMs / iterations
    const projectionsPerSecond = 1000 / averageTimeMs

    return {
      averageTimeMs,
      totalTimeMs,
      projectionsPerSecond
    }
  }

  /**
   * Compare memory usage across different depths
   */
  static compareMemoryUsage(entity: DepthAwareEntity): Record<string, number> {
    const results: Record<string, number> = {}

    for (const depth of [
      ContextDepth.SIGNATURE,
      ContextDepth.STRUCTURE,
      ContextDepth.SEMANTIC,
      ContextDepth.DETAILED,
      ContextDepth.HISTORICAL
    ]) {
      const metadata = getDepthMetadata(depth)
      results[metadata.name] = estimateMemoryUsage(entity, depth)
    }

    return results
  }
}

/**
 * Type guards for depth-aware entities
 */
export function isDepthAwareEntity(entity: any): entity is DepthAwareEntity {
  return entity &&
         typeof entity === 'object' &&
         typeof entity.id === 'string' &&
         typeof entity.type === 'string' &&
         typeof entity.name === 'string' &&
         entity.signature &&
         entity.structure &&
         entity.semantic &&
         entity.detailed &&
         entity.historical
}

/**
 * Convert a regular entity to a depth-aware entity
 * This function attempts to organize entity properties by depth level
 */
export function toDepthAwareEntity(entity: Entity): DepthAwareEntity {
  const depthAware: DepthAwareEntity = {
    ...entity,

    signature: {
      id: entity.id,
      type: entity.type,
      name: entity.name
    },

    structure: {
      relationships: entity.relationships || [],
      hierarchy: {
        parent: null,
        children: []
      }
    },

    semantic: {
      tags: [],
      categories: [],
      summary: ''
    },

    detailed: {
      content: entity.content || '',
      metadata: entity.metadata || {},
      properties: {}
    },

    historical: {
      versions: [],
      auditTrail: [],
      changeHistory: []
    }
  }

  return depthAware
}