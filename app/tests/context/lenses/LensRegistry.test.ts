/**
 * Tests for LensRegistry - Core lens management and activation system
 *
 * This test suite covers all aspects of lens registration, activation detection,
 * conflict resolution, and performance requirements for the lens registry system.
 *
 * Test Categories:
 * 1. Lens Registration Management
 * 2. Activation Detection
 * 3. Active Lens Tracking
 * 4. Manual Override Functionality
 * 5. Conflict Detection
 * 6. Performance Requirements
 * 7. Memory Management
 */

import { BaseLens } from '../../../src/context/lenses/ContextLens'
import type {
  ContextLens,
  LensConfig,
  ActivationContext,
  QueryContext,
  DeveloperAction,
  ProjectMetadata
} from '../../../src/context/lenses/types'
import type { Query } from '../../../src/query/types'

// Mock lens implementations for testing
class MockDebugLens extends BaseLens {
  constructor(id: string = 'debug-lens', priority: number = 10) {
    const config: Partial<LensConfig> = {
      enabled: true,
      activationTriggers: ['debugger_start', 'test_run', 'error_occurrence'],
      transformationRules: {
        emphasizeErrorHandling: true,
        includeDebugInfo: true
      }
    }
    super(id, 'Debug Lens', priority, config)
  }

  shouldActivate(context: ActivationContext): boolean {
    return context.recentActions.some(action =>
      ['debugger_start', 'test_run', 'error_occurrence'].includes(action.type)
    ) || context.currentFiles.some(file => file.includes('.test.') || file.includes('.spec.'))
  }

  transformQuery<T>(query: Query<T>): Query<T> {
    return Object.assign({}, query, {
      metadata: Object.assign({}, query.metadata, {
        lensTransform: 'debug-emphasis'
      })
    })
  }

  processResults<T>(results: T[], context: QueryContext): T[] {
    return results.map(result => Object.assign({}, result, {
      debugInfo: `Processed by ${this.id} at ${context.timestamp}`
    }))
  }
}

class MockDocumentationLens extends BaseLens {
  constructor(id: string = 'docs-lens', priority: number = 5) {
    const config: Partial<LensConfig> = {
      enabled: true,
      activationTriggers: ['file_open'],
      transformationRules: {
        emphasizePublicAPIs: true,
        includeExamples: true
      }
    }
    super(id, 'Documentation Lens', priority, config)
  }

  shouldActivate(context: ActivationContext): boolean {
    return context.currentFiles.some(file =>
      file.endsWith('.md') || file.includes('README') || file.includes('doc')
    )
  }

  transformQuery<T>(query: Query<T>): Query<T> {
    return Object.assign({}, query, {
      metadata: Object.assign({}, query.metadata, {
        lensTransform: 'docs-emphasis'
      })
    })
  }

  processResults<T>(results: T[], context: QueryContext): T[] {
    return results.map(result => Object.assign({}, result, {
      docInfo: `Processed by ${this.id} for documentation context`
    }))
  }
}

// Helper functions for creating test data
function createMockActivationContext(overrides: Partial<ActivationContext> = {}): ActivationContext {
  const defaultProjectMetadata: ProjectMetadata = {
    name: 'test-project',
    type: 'typescript',
    dependencies: ['react', 'typescript'],
    structure: {
      hasTests: true,
      hasComponents: true,
      hasDocs: true,
      hasConfig: true
    }
  }

  return Object.assign({
    currentFiles: ['src/index.ts', 'src/utils.ts'],
    recentActions: [],
    projectContext: defaultProjectMetadata
  }, overrides)
}

function createMockDeveloperAction(
  type: DeveloperAction['type'],
  overrides: Partial<DeveloperAction> = {}
): DeveloperAction {
  return Object.assign({
    type,
    timestamp: new Date().toISOString()
  }, overrides)
}

function createMockQueryContext(): QueryContext {
  return {
    requestId: 'test-request-123',
    timestamp: new Date().toISOString(),
    activeLenses: [],
    performance: {
      startTime: performance.now(),
      hints: {}
    }
  }
}

// Import the implemented classes
import { LensRegistry } from '../../../src/context/lenses/LensRegistry'
import { ActivationDetector } from '../../../src/context/lenses/ActivationDetector'

describe('LensRegistry', () => {
  let registry: any
  let mockDebugLens: MockDebugLens
  let mockDocsLens: MockDocumentationLens

  beforeEach(() => {
    registry = new LensRegistry()
    mockDebugLens = new MockDebugLens()
    mockDocsLens = new MockDocumentationLens()
  })

  afterEach(() => {
    if (registry && registry.clear) {
      registry.clear()
    }
  })

  describe('Lens Registration Management', () => {
    it('should register a lens successfully', () => {
      expect(() => registry.register(mockDebugLens)).not.toThrow()
      expect(registry.isRegistered('debug-lens')).toBe(true)
    })

    it('should unregister a lens successfully', () => {
      registry.register(mockDebugLens)
      expect(registry.isRegistered('debug-lens')).toBe(true)

      expect(() => registry.unregister('debug-lens')).not.toThrow()
      expect(registry.isRegistered('debug-lens')).toBe(false)
    })

    it('should prevent duplicate lens registration', () => {
      registry.register(mockDebugLens)

      expect(() => registry.register(mockDebugLens)).toThrow('Lens with id "debug-lens" is already registered')
    })

    it('should handle unregistering non-existent lens gracefully', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow()
    })

    it('should list all registered lenses', () => {
      registry.register(mockDebugLens)
      registry.register(mockDocsLens)

      const lenses = registry.getRegisteredLenses()
      expect(lenses).toHaveLength(2)
      expect(lenses.map(l => l.id)).toContain('debug-lens')
      expect(lenses.map(l => l.id)).toContain('docs-lens')
    })

    it('should get lens by id', () => {
      registry.register(mockDebugLens)

      const lens = registry.getLens('debug-lens')
      expect(lens).toBe(mockDebugLens)
      expect(registry.getLens('non-existent')).toBeNull()
    })

    it('should check if lens is registered', () => {
      expect(registry.isRegistered('debug-lens')).toBe(false)

      registry.register(mockDebugLens)
      expect(registry.isRegistered('debug-lens')).toBe(true)
    })
  })

  describe('Activation Detection', () => {
    beforeEach(() => {
      registry.register(mockDebugLens)
      registry.register(mockDocsLens)
    })

    it('should activate debug lens when debugger starts', () => {
      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses.map(l => l.id)).toContain('debug-lens')
    })

    it('should activate debug lens for test files', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/utils.test.ts', 'src/component.spec.ts']
      })

      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses.map(l => l.id)).toContain('debug-lens')
    })

    it('should activate documentation lens for markdown files', () => {
      const context = createMockActivationContext({
        currentFiles: ['README.md', 'docs/api.md']
      })

      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses.map(l => l.id)).toContain('docs-lens')
    })

    it('should activate multiple lenses when conditions match', () => {
      const context = createMockActivationContext({
        currentFiles: ['README.md', 'src/utils.test.ts'],
        recentActions: [createMockDeveloperAction('test_run')]
      })

      const activeLenses = registry.getActiveLenses(context)
      const lensIds = activeLenses.map(l => l.id)
      expect(lensIds).toContain('debug-lens')
      expect(lensIds).toContain('docs-lens')
    })

    it('should not activate disabled lenses', () => {
      const disabledLens = new MockDebugLens('disabled-lens')
      disabledLens.configure({ ...disabledLens.getConfig(), enabled: false })
      registry.register(disabledLens)

      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses.map(l => l.id)).not.toContain('disabled-lens')
    })

    it('should respect lens priority in activation order', () => {
      const highPriorityLens = new MockDebugLens('high-priority', 20)
      const lowPriorityLens = new MockDebugLens('low-priority', 1)

      registry.register(highPriorityLens)
      registry.register(lowPriorityLens)

      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses[0].id).toBe('high-priority')
    })
  })

  describe('Active Lens Tracking', () => {
    beforeEach(() => {
      registry.register(mockDebugLens)
      registry.register(mockDocsLens)
    })

    it('should track currently active lenses', () => {
      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      registry.updateActiveContext(context)

      const activeLenses = registry.getCurrentlyActiveLenses()
      expect(activeLenses.map(l => l.id)).toContain('debug-lens')
    })

    it('should update active lenses when context changes', () => {
      // First context activates debug lens
      const debugContext = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })
      registry.updateActiveContext(debugContext)
      expect(registry.getCurrentlyActiveLenses().map(l => l.id)).toContain('debug-lens')

      // Second context activates docs lens
      const docsContext = createMockActivationContext({
        currentFiles: ['README.md']
      })
      registry.updateActiveContext(docsContext)

      const activeLenses = registry.getCurrentlyActiveLenses()
      expect(activeLenses.map(l => l.id)).toContain('docs-lens')
      expect(activeLenses.map(l => l.id)).not.toContain('debug-lens')
    })

    it('should maintain lens state across multiple updates', () => {
      const context1 = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      const context2 = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')],
        currentFiles: ['README.md']
      })

      registry.updateActiveContext(context1)
      const activeLenses1 = registry.getCurrentlyActiveLenses()

      registry.updateActiveContext(context2)
      const activeLenses2 = registry.getCurrentlyActiveLenses()

      expect(activeLenses2.length).toBeGreaterThan(activeLenses1.length)
    })

    it('should provide lens activation history', () => {
      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      registry.updateActiveContext(context)

      const history = registry.getActivationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].lensId).toBe('debug-lens')
      expect(history[0].timestamp).toBeDefined()
      expect(history[0].trigger).toBe('debugger_start')
    })
  })

  describe('Manual Override Functionality', () => {
    beforeEach(() => {
      registry.register(mockDebugLens)
      registry.register(mockDocsLens)
    })

    it('should activate manually specified lens regardless of context', () => {
      const context = createMockActivationContext({
        manualOverride: 'docs-lens',
        currentFiles: ['src/index.ts'] // No conditions for docs lens
      })

      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses.map(l => l.id)).toContain('docs-lens')
    })

    it('should disable automatic activation when manual override is active', () => {
      const context = createMockActivationContext({
        manualOverride: 'docs-lens',
        recentActions: [createMockDeveloperAction('debugger_start')] // Should activate debug lens
      })

      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses).toHaveLength(1)
      expect(activeLenses[0].id).toBe('docs-lens')
    })

    it('should handle invalid manual override gracefully', () => {
      const context = createMockActivationContext({
        manualOverride: 'non-existent-lens'
      })

      expect(() => registry.getActiveLenses(context)).not.toThrow()
      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses).toHaveLength(0)
    })

    it('should allow clearing manual override', () => {
      // Set manual override
      registry.setManualOverride('docs-lens')
      expect(registry.getManualOverride()).toBe('docs-lens')

      // Clear override
      registry.clearManualOverride()
      expect(registry.getManualOverride()).toBeNull()

      // Should return to automatic activation
      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })
      const activeLenses = registry.getActiveLenses(context)
      expect(activeLenses.map(l => l.id)).toContain('debug-lens')
    })
  })

  describe('Lens Conflict Detection', () => {
    it('should detect priority conflicts between lenses', () => {
      const lens1 = new MockDebugLens('lens1', 10)
      const lens2 = new MockDebugLens('lens2', 10) // Same priority

      registry.register(lens1)
      registry.register(lens2)

      const conflicts = registry.detectConflicts()
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('priority_conflict')
      expect(conflicts[0].lensIds).toContain('lens1')
      expect(conflicts[0].lensIds).toContain('lens2')
    })

    it('should detect transformation conflicts', () => {
      // Create lenses with same name but different priorities (no priority conflict)
      const lens1 = new MockDebugLens('debug1', 10)
      const lens2 = new MockDebugLens('debug2', 20) // Different priority, same name

      registry.register(lens1)
      registry.register(lens2)

      const conflicts = registry.detectConflicts()
      const transformConflicts = conflicts.filter(c => c.type === 'transformation_conflict')
      expect(transformConflicts.length).toBeGreaterThan(0)
      expect(transformConflicts[0].lensIds).toContain('debug1')
      expect(transformConflicts[0].lensIds).toContain('debug2')
    })

    it('should suggest resolution for conflicts', () => {
      const lens1 = new MockDebugLens('lens1', 10)
      const lens2 = new MockDebugLens('lens2', 10)

      registry.register(lens1)
      registry.register(lens2)

      const conflicts = registry.detectConflicts()
      expect(conflicts[0].resolution).toBeDefined()
      expect(conflicts[0].resolution.type).toBe('adjust_priority')
    })

    it('should resolve conflicts automatically when configured', () => {
      registry.setAutoResolveConflicts(true)

      const lens1 = new MockDebugLens('lens1', 10)
      const lens2 = new MockDebugLens('lens2', 10)

      registry.register(lens1)
      registry.register(lens2)

      // Should automatically adjust priorities
      expect(lens1.priority).not.toBe(lens2.priority)
    })
  })

  describe('Performance Requirements', () => {
    it('should handle 20+ registered lenses efficiently', () => {
      // Register 25 lenses
      const lenses: ContextLens[] = []
      for (let i = 0; i < 25; i++) {
        const lens = new MockDebugLens(`lens-${i}`, i)
        lenses.push(lens)
        registry.register(lens)
      }

      expect(registry.getRegisteredLenses()).toHaveLength(25)

      // Performance test - activation should be fast
      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      const startTime = performance.now()
      const activeLenses = registry.getActiveLenses(context)
      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(10) // Less than 10ms for activation
      expect(activeLenses.length).toBeGreaterThan(0)
    })

    it('should cache activation results for repeated queries', () => {
      registry.register(mockDebugLens)
      registry.register(mockDocsLens)

      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      // First call - should cache result
      const startTime1 = performance.now()
      const activeLenses1 = registry.getActiveLenses(context)
      const duration1 = performance.now() - startTime1

      // Second call - should use cache
      const startTime2 = performance.now()
      const activeLenses2 = registry.getActiveLenses(context)
      const duration2 = performance.now() - startTime2

      expect(activeLenses1).toEqual(activeLenses2)
      expect(duration2).toBeLessThan(duration1)
    })

    it('should invalidate cache when registry changes', () => {
      registry.register(mockDebugLens)

      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      // Get initial active lenses
      const activeLenses1 = registry.getActiveLenses(context)
      expect(activeLenses1).toHaveLength(1)

      // Register new lens
      registry.register(mockDocsLens)

      // Should invalidate cache and include new lens if it matches
      const newContext = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')],
        currentFiles: ['README.md']
      })

      const activeLenses2 = registry.getActiveLenses(newContext)
      expect(activeLenses2.length).toBeGreaterThan(activeLenses1.length)
    })
  })

  describe('Memory Management', () => {
    it('should not leak memory when registering and unregistering lenses', () => {
      const initialLensCount = registry.getRegisteredLenses().length

      // Register 100 lenses
      const lensIds: string[] = []
      for (let i = 0; i < 100; i++) {
        const lensId = `temp-lens-${i}`
        const lens = new MockDebugLens(lensId, i)
        registry.register(lens)
        lensIds.push(lensId)
      }

      expect(registry.getRegisteredLenses()).toHaveLength(initialLensCount + 100)

      // Unregister all lenses
      lensIds.forEach(id => registry.unregister(id))

      expect(registry.getRegisteredLenses()).toHaveLength(initialLensCount)
    })

    it('should clear all event listeners when clearing registry', () => {
      registry.register(mockDebugLens)
      registry.register(mockDocsLens)

      // Simulate event listeners being added
      registry.addEventListener('activation', () => {})
      registry.addEventListener('deactivation', () => {})

      expect(registry.getEventListenerCount()).toBeGreaterThan(0)

      registry.clear()

      expect(registry.getRegisteredLenses()).toHaveLength(0)
      expect(registry.getEventListenerCount()).toBe(0)
    })

    it('should handle garbage collection of lens instances', () => {
      const lensId = 'gc-test-lens'
      const lens = new MockDebugLens(lensId)

      registry.register(lens)
      expect(registry.isRegistered(lensId)).toBe(true)

      // Simulate lens being garbage collected
      registry.unregister(lensId)

      // Registry should not hold references
      expect(registry.getLens(lensId)).toBeNull()
    })
  })

  describe('Integration with Existing Types', () => {
    it('should work with real ActivationContext objects', () => {
      registry.register(mockDebugLens)

      const realContext: ActivationContext = {
        currentFiles: ['src/test.spec.ts'],
        recentActions: [{
          type: 'test_run',
          timestamp: '2025-09-25T10:00:00.000Z',
          file: 'src/test.spec.ts',
          metadata: { testFramework: 'jest' }
        }],
        projectContext: {
          name: 'real-project',
          type: 'typescript',
          dependencies: ['jest', '@types/jest'],
          structure: {
            hasTests: true,
            hasComponents: false,
            hasDocs: false,
            hasConfig: true
          }
        }
      }

      expect(() => registry.getActiveLenses(realContext)).not.toThrow()
      const activeLenses = registry.getActiveLenses(realContext)
      expect(activeLenses.map(l => l.id)).toContain('debug-lens')
    })

    it('should integrate with QueryContext for result processing', () => {
      registry.register(mockDebugLens)

      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      registry.updateActiveContext(context)
      const activeLenses = registry.getCurrentlyActiveLenses()

      const queryContext = createMockQueryContext()
      const testResults = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]

      const processedResults = registry.processResults(testResults, queryContext)
      expect(processedResults[0]).toHaveProperty('debugInfo')
    })
  })

  describe('Error Handling', () => {
    it('should handle lens shouldActivate throwing errors', () => {
      const errorLens = new MockDebugLens('error-lens')
      errorLens.shouldActivate = () => {
        throw new Error('Activation error')
      }

      registry.register(errorLens)

      const context = createMockActivationContext()

      expect(() => registry.getActiveLenses(context)).not.toThrow()
      const activeLenses = registry.getActiveLenses(context)
      // Should exclude the erroring lens
      expect(activeLenses.map(l => l.id)).not.toContain('error-lens')
    })

    it('should handle lens transformQuery throwing errors', () => {
      const errorLens = new MockDebugLens('transform-error-lens')
      errorLens.transformQuery = () => {
        throw new Error('Transform error')
      }

      registry.register(errorLens)

      const context = createMockActivationContext({
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      registry.updateActiveContext(context)

      const query = { type: 'test', metadata: {} }
      expect(() => registry.transformQuery(query)).not.toThrow()

      // Should fallback to original query
      const transformedQuery = registry.transformQuery(query)
      expect(transformedQuery).toEqual(query)
    })

    it('should emit error events for lens failures', () => {
      const errorEvents: any[] = []
      registry.addEventListener('lens_error', (event: any) => {
        errorEvents.push(event)
      })

      const errorLens = new MockDebugLens('error-lens')
      errorLens.shouldActivate = () => {
        throw new Error('Test error')
      }

      registry.register(errorLens)

      const context = createMockActivationContext()
      registry.getActiveLenses(context)

      expect(errorEvents).toHaveLength(1)
      expect(errorEvents[0].lensId).toBe('error-lens')
      expect(errorEvents[0].error.message).toBe('Test error')
    })
  })
})