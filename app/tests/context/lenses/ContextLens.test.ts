/**
 * Test suite for Core Lens Interface Foundation
 *
 * This test suite validates the foundational lens interfaces and infrastructure
 * that all lens types will implement. Tests are written FIRST to define the
 * contract and guide implementation.
 *
 * Tests cover:
 * - ContextLens interface compliance
 * - LensConfig validation and behavior
 * - ActivationContext structure and usage
 * - Error handling and graceful degradation
 * - Lens lifecycle management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Query } from '../../../src/query/types'
import { ContextDepth } from '../../../src/types/context'
import type {
  ContextLens,
  LensConfig,
  ActivationContext,
  DeveloperAction,
  ProjectMetadata,
  QueryContext,
  ActivationRule,
  QueryModification,
  ResultTransformation
} from '../../../src/context/lenses/types'

// Test implementation of ContextLens interface
class TestLens implements ContextLens {
  readonly id: string
  readonly name: string
  readonly priority: number
  private config: LensConfig

  constructor(id: string, name: string, priority: number = 5) {
    this.id = id
    this.name = name
    this.priority = priority
    this.config = {
      enabled: true,
      priority: priority,
      activationRules: [],
      queryModifications: [],
      resultTransformations: []
    }
  }

  transformQuery<T>(query: Query<T>): Query<T> {
    return {
      ...query,
      depth: ContextDepth.DETAILED,
      conditions: [
        ...query.conditions || [],
        { field: 'lensApplied', operator: 'equals', value: this.id }
      ]
    }
  }

  processResults<T>(results: T[], context: QueryContext): T[] {
    return results.map(result => ({
      ...result,
      _lensMetadata: {
        appliedLens: this.id,
        processedAt: new Date().toISOString()
      }
    }))
  }

  shouldActivate(context: ActivationContext): boolean {
    if (!this.config.enabled) return false
    return context.currentFiles.length > 0
  }

  configure(config: LensConfig): void {
    if (!config.enabled && config.enabled !== false) {
      throw new Error('LensConfig must specify enabled state')
    }
    if (typeof config.priority !== 'number' || config.priority < 0) {
      throw new Error('LensConfig priority must be a non-negative number')
    }
    this.config = { ...config }
  }

  getConfig(): LensConfig {
    return { ...this.config }
  }
}

// Mock data generators
const createMockQuery = <T = any>(): Query<T> => ({
  conditions: [
    { field: 'type', operator: 'equals', value: 'file' }
  ],
  ordering: [
    { field: 'name', direction: 'asc' }
  ],
  depth: ContextDepth.SEMANTIC
})

const createMockActivationContext = (): ActivationContext => ({
  currentFiles: ['src/components/Button.tsx', 'src/utils/helpers.ts'],
  recentActions: [
    {
      type: 'file_open',
      timestamp: new Date().toISOString(),
      file: 'src/components/Button.tsx'
    }
  ] as DeveloperAction[],
  projectContext: {
    name: 'test-project',
    type: 'typescript',
    dependencies: ['react', 'typescript'],
    structure: {
      hasTests: true,
      hasComponents: true,
      hasDocs: false
    }
  } as ProjectMetadata
})

const createMockQueryContext = (): QueryContext => ({
  requestId: 'test-123',
  timestamp: new Date().toISOString(),
  activeLenses: ['test-lens'],
  performance: {
    startTime: Date.now(),
    hints: {}
  }
})

describe('ContextLens Interface Foundation', () => {
  let testLens: TestLens
  let mockQuery: Query
  let mockActivationContext: ActivationContext
  let mockQueryContext: QueryContext

  beforeEach(() => {
    testLens = new TestLens('test-lens', 'Test Lens', 5)
    mockQuery = createMockQuery()
    mockActivationContext = createMockActivationContext()
    mockQueryContext = createMockQueryContext()
  })

  afterEach(() => {
    // Clean up any test state
  })

  describe('ContextLens Interface Compliance', () => {
    it('should define required readonly properties', () => {
      expect(testLens.id).toBe('test-lens')
      expect(testLens.name).toBe('Test Lens')
      expect(testLens.priority).toBe(5)

      // Properties should be readonly (TypeScript enforced)
      expect(typeof testLens.id).toBe('string')
      expect(typeof testLens.name).toBe('string')
      expect(typeof testLens.priority).toBe('number')
    })

    it('should implement transformQuery method correctly', () => {
      const originalQuery = createMockQuery()
      const transformedQuery = testLens.transformQuery(originalQuery)

      // Should return a modified query
      expect(transformedQuery).toBeDefined()
      expect(transformedQuery.depth).toBe(ContextDepth.DETAILED)

      // Should add lens-specific conditions
      expect(transformedQuery.conditions).toContainEqual({
        field: 'lensApplied',
        operator: 'equals',
        value: 'test-lens'
      })

      // Should preserve original conditions
      expect(transformedQuery.conditions).toContainEqual(
        originalQuery.conditions![0]
      )
    })

    it('should implement processResults method correctly', () => {
      const mockResults = [
        { id: '1', name: 'file1.ts', type: 'file' },
        { id: '2', name: 'file2.ts', type: 'file' }
      ]

      const processedResults = testLens.processResults(mockResults, mockQueryContext)

      expect(processedResults).toHaveLength(2)
      processedResults.forEach((result, index) => {
        expect(result).toMatchObject(mockResults[index])
        expect(result._lensMetadata).toBeDefined()
        expect(result._lensMetadata.appliedLens).toBe('test-lens')
        expect(result._lensMetadata.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      })
    })

    it('should implement shouldActivate method correctly', () => {
      // Should activate with current files
      expect(testLens.shouldActivate(mockActivationContext)).toBe(true)

      // Should not activate with no current files
      const emptyContext: ActivationContext = {
        ...mockActivationContext,
        currentFiles: []
      }
      expect(testLens.shouldActivate(emptyContext)).toBe(false)
    })

    it('should implement configure method correctly', () => {
      const newConfig: LensConfig = {
        enabled: false,
        priority: 10,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      }

      testLens.configure(newConfig)

      // Configuration should be updated
      const currentConfig = testLens.getConfig()
      expect(currentConfig.enabled).toBe(false)
      expect(currentConfig.priority).toBe(10)

      // Lens behavior should reflect configuration
      expect(testLens.shouldActivate(mockActivationContext)).toBe(false)
    })
  })

  describe('LensConfig Validation', () => {
    it('should require enabled state to be specified', () => {
      const invalidConfig = {
        priority: 5,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      } as any

      expect(() => testLens.configure(invalidConfig)).toThrow(
        'LensConfig must specify enabled state'
      )
    })

    it('should require priority to be a non-negative number', () => {
      const invalidConfigs = [
        { enabled: true, priority: -1, activationRules: [], queryModifications: [], resultTransformations: [] },
        { enabled: true, priority: 'high', activationRules: [], queryModifications: [], resultTransformations: [] },
        { enabled: true, priority: null, activationRules: [], queryModifications: [], resultTransformations: [] }
      ]

      invalidConfigs.forEach(config => {
        expect(() => testLens.configure(config as any)).toThrow(
          'LensConfig priority must be a non-negative number'
        )
      })
    })

    it('should accept valid configuration', () => {
      const validConfig: LensConfig = {
        enabled: true,
        priority: 0,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      }

      expect(() => testLens.configure(validConfig)).not.toThrow()
    })
  })

  describe('ActivationContext Structure', () => {
    it('should provide current files array', () => {
      expect(Array.isArray(mockActivationContext.currentFiles)).toBe(true)
      expect(mockActivationContext.currentFiles).toHaveLength(2)
      expect(mockActivationContext.currentFiles).toContain('src/components/Button.tsx')
    })

    it('should provide recent actions array', () => {
      expect(Array.isArray(mockActivationContext.recentActions)).toBe(true)
      expect(mockActivationContext.recentActions[0]).toMatchObject({
        type: 'file_open',
        timestamp: expect.any(String),
        file: 'src/components/Button.tsx'
      })
    })

    it('should provide project metadata', () => {
      expect(mockActivationContext.projectContext).toBeDefined()
      expect(mockActivationContext.projectContext.name).toBe('test-project')
      expect(mockActivationContext.projectContext.type).toBe('typescript')
      expect(Array.isArray(mockActivationContext.projectContext.dependencies)).toBe(true)
    })

    it('should support optional manual override', () => {
      const contextWithOverride: ActivationContext = {
        ...mockActivationContext,
        manualOverride: 'debug'
      }

      expect(contextWithOverride.manualOverride).toBe('debug')
    })
  })

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle invalid query transformation gracefully', () => {
      // Create a lens that might fail during transformation
      class FailingLens extends TestLens {
        transformQuery<T>(query: Query<T>): Query<T> {
          if (!query.conditions) {
            throw new Error('Query must have conditions')
          }
          return super.transformQuery(query)
        }
      }

      const failingLens = new FailingLens('failing-lens', 'Failing Lens')
      const queryWithoutConditions: Query = {
        conditions: undefined as any,
        ordering: []
      }

      expect(() => failingLens.transformQuery(queryWithoutConditions)).toThrow(
        'Query must have conditions'
      )
    })

    it('should handle result processing errors gracefully', () => {
      class FailingResultsLens extends TestLens {
        processResults<T>(results: T[], context: QueryContext): T[] {
          if (!results || results.length === 0) {
            throw new Error('Results cannot be empty')
          }
          return super.processResults(results, context)
        }
      }

      const failingLens = new FailingResultsLens('failing-results', 'Failing Results Lens')

      expect(() => failingLens.processResults([], mockQueryContext)).toThrow(
        'Results cannot be empty'
      )
    })

    it('should handle activation context validation', () => {
      class StrictActivationLens extends TestLens {
        shouldActivate(context: ActivationContext): boolean {
          if (!context.projectContext?.type) {
            throw new Error('Project type is required for activation')
          }
          return super.shouldActivate(context)
        }
      }

      const strictLens = new StrictActivationLens('strict', 'Strict Lens')
      const invalidContext: ActivationContext = {
        ...mockActivationContext,
        projectContext: {
          ...mockActivationContext.projectContext,
          type: undefined as any
        }
      }

      expect(() => strictLens.shouldActivate(invalidContext)).toThrow(
        'Project type is required for activation'
      )
    })
  })

  describe('Lens Lifecycle Management', () => {
    it('should maintain consistent state through configuration changes', () => {
      // Initial state
      expect(testLens.shouldActivate(mockActivationContext)).toBe(true)

      // Disable lens
      testLens.configure({
        enabled: false,
        priority: 5,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      })
      expect(testLens.shouldActivate(mockActivationContext)).toBe(false)

      // Re-enable lens
      testLens.configure({
        enabled: true,
        priority: 5,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      })
      expect(testLens.shouldActivate(mockActivationContext)).toBe(true)
    })

    it('should handle priority changes correctly', () => {
      expect(testLens.priority).toBe(5)

      // Priority should not change after configure (readonly)
      testLens.configure({
        enabled: true,
        priority: 10,
        activationRules: [],
        queryModifications: [],
        resultTransformations: []
      })

      // The lens priority property remains readonly
      expect(testLens.priority).toBe(5)

      // But the configuration priority is updated
      expect(testLens.getConfig().priority).toBe(10)
    })
  })

  describe('Integration with Progressive Loading', () => {
    it('should work with all ContextDepth levels', () => {
      const depthLevels = [
        ContextDepth.SIGNATURE,
        ContextDepth.STRUCTURE,
        ContextDepth.SEMANTIC,
        ContextDepth.DETAILED,
        ContextDepth.HISTORICAL
      ]

      depthLevels.forEach(depth => {
        const queryWithDepth: Query = {
          ...mockQuery,
          depth
        }

        const transformedQuery = testLens.transformQuery(queryWithDepth)
        expect(transformedQuery.depth).toBe(ContextDepth.DETAILED) // TestLens overrides to DETAILED
      })
    })

    it('should preserve performance hints when transforming queries', () => {
      const queryWithHints: Query = {
        ...mockQuery,
        performanceHints: {
          cacheKey: 'test-cache',
          estimatedResults: 100,
          preferredTimeout: 1000
        }
      }

      const transformedQuery = testLens.transformQuery(queryWithHints)
      expect(transformedQuery.performanceHints).toEqual(queryWithHints.performanceHints)
    })
  })
})