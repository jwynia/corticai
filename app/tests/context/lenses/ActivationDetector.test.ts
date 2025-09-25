/**
 * Tests for ActivationDetector - Context analysis and lens matching
 *
 * This test suite covers the context analysis engine that determines
 * which lenses should be activated based on developer actions and context.
 *
 * Test Categories:
 * 1. File Pattern Detection
 * 2. Action Pattern Recognition
 * 3. Context Confidence Scoring
 * 4. Lens Matching Logic
 * 5. Performance Optimization
 */

import type {
  ActivationContext,
  DeveloperAction,
  ProjectMetadata
} from '../../../src/context/lenses/types'

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

  return {
    currentFiles: ['src/index.ts'],
    recentActions: [],
    projectContext: defaultProjectMetadata,
    ...overrides
  }
}

function createMockDeveloperAction(
  type: DeveloperAction['type'],
  overrides: Partial<DeveloperAction> = {}
): DeveloperAction {
  return {
    type,
    timestamp: new Date().toISOString(),
    ...overrides
  }
}

// Import the implemented class
import { ActivationDetector } from '../../../src/context/lenses/ActivationDetector'

describe('ActivationDetector', () => {
  let detector: any

  beforeEach(() => {
    detector = new ActivationDetector()
  })

  describe('File Pattern Detection', () => {
    it('should detect test file patterns', () => {
      const context = createMockActivationContext({
        currentFiles: [
          'src/utils.test.ts',
          'src/component.spec.ts',
          'tests/integration.test.js',
          '__tests__/unit.test.ts'
        ]
      })

      const patterns = detector.detectFilePatterns(context.currentFiles)

      expect(patterns.testFiles).toBe(true)
      expect(patterns.testFileCount).toBe(4)
      expect(patterns.testTypes).toContain('unit')
      expect(patterns.testTypes).toContain('integration')
    })

    it('should detect documentation file patterns', () => {
      const context = createMockActivationContext({
        currentFiles: [
          'README.md',
          'docs/api.md',
          'CHANGELOG.md',
          'docs/getting-started.md'
        ]
      })

      const patterns = detector.detectFilePatterns(context.currentFiles)

      expect(patterns.documentationFiles).toBe(true)
      expect(patterns.docFileCount).toBe(4)
      expect(patterns.docTypes).toContain('readme')
      expect(patterns.docTypes).toContain('api')
      expect(patterns.docTypes).toContain('changelog')
    })

    it('should detect configuration file patterns', () => {
      const context = createMockActivationContext({
        currentFiles: [
          'package.json',
          'tsconfig.json',
          '.eslintrc.js',
          'jest.config.js',
          'webpack.config.js'
        ]
      })

      const patterns = detector.detectFilePatterns(context.currentFiles)

      expect(patterns.configFiles).toBe(true)
      expect(patterns.configFileCount).toBe(5)
      expect(patterns.configTypes).toContain('package')
      expect(patterns.configTypes).toContain('typescript')
      expect(patterns.configTypes).toContain('linting')
      expect(patterns.configTypes).toContain('testing')
      expect(patterns.configTypes).toContain('bundling')
    })

    it('should detect component file patterns', () => {
      const context = createMockActivationContext({
        currentFiles: [
          'src/components/Button.tsx',
          'src/components/Modal.jsx',
          'src/ui/Header.vue',
          'src/widgets/Chart.ts'
        ]
      })

      const patterns = detector.detectFilePatterns(context.currentFiles)

      expect(patterns.componentFiles).toBe(true)
      expect(patterns.componentFileCount).toBe(4)
      expect(patterns.frameworks).toContain('react')
      expect(patterns.frameworks).toContain('vue')
    })

    it('should detect source file patterns', () => {
      const context = createMockActivationContext({
        currentFiles: [
          'src/index.ts',
          'src/utils.js',
          'lib/helper.ts',
          'app/main.js'
        ]
      })

      const patterns = detector.detectFilePatterns(context.currentFiles)

      expect(patterns.sourceFiles).toBe(true)
      expect(patterns.sourceFileCount).toBe(4)
      expect(patterns.languages).toContain('typescript')
      expect(patterns.languages).toContain('javascript')
    })

    it('should handle empty file list', () => {
      const context = createMockActivationContext({
        currentFiles: []
      })

      const patterns = detector.detectFilePatterns(context.currentFiles)

      expect(patterns.testFiles).toBe(false)
      expect(patterns.documentationFiles).toBe(false)
      expect(patterns.sourceFiles).toBe(false)
      expect(patterns.configFiles).toBe(false)
    })

    it('should handle mixed file types', () => {
      const context = createMockActivationContext({
        currentFiles: [
          'src/utils.ts',           // source
          'src/utils.test.ts',      // test
          'README.md',              // documentation
          'package.json'            // config
        ]
      })

      const patterns = detector.detectFilePatterns(context.currentFiles)

      expect(patterns.testFiles).toBe(true)
      expect(patterns.documentationFiles).toBe(true)
      expect(patterns.sourceFiles).toBe(true)
      expect(patterns.configFiles).toBe(true)
      expect(patterns.diversity).toBeGreaterThan(0.5)
    })
  })

  describe('Action Pattern Recognition', () => {
    it('should detect debugging activity patterns', () => {
      const context = createMockActivationContext({
        recentActions: [
          createMockDeveloperAction('debugger_start', { timestamp: '2025-09-25T10:00:00.000Z' }),
          createMockDeveloperAction('error_occurrence', { timestamp: '2025-09-25T10:01:00.000Z' }),
          createMockDeveloperAction('test_run', { timestamp: '2025-09-25T10:02:00.000Z' })
        ]
      })

      const patterns = detector.detectActionPatterns(context.recentActions)

      expect(patterns.debuggingActivity).toBe(true)
      expect(patterns.debuggingIntensity).toBeGreaterThan(0.7)
      expect(patterns.debuggingActions).toHaveLength(3)
      expect(patterns.recentDebugging).toBe(true)
    })

    it('should detect testing activity patterns', () => {
      const context = createMockActivationContext({
        recentActions: [
          createMockDeveloperAction('test_run', { file: 'src/utils.test.ts' }),
          createMockDeveloperAction('test_run', { file: 'src/component.test.ts' }),
          createMockDeveloperAction('file_open', { file: 'src/new.test.ts' })
        ]
      })

      const patterns = detector.detectActionPatterns(context.recentActions)

      expect(patterns.testingActivity).toBe(true)
      expect(patterns.testingIntensity).toBeGreaterThan(0.6)
      expect(patterns.testFilesAccessed).toBe(true)
      expect(patterns.multipleTestRuns).toBe(true)
    })

    it('should detect documentation activity patterns', () => {
      const context = createMockActivationContext({
        recentActions: [
          createMockDeveloperAction('file_open', { file: 'README.md' }),
          createMockDeveloperAction('file_edit', { file: 'docs/api.md' }),
          createMockDeveloperAction('file_save', { file: 'README.md' })
        ]
      })

      const patterns = detector.detectActionPatterns(context.recentActions)

      expect(patterns.documentationActivity).toBe(true)
      expect(patterns.documentationIntensity).toBeGreaterThan(0.5)
      expect(patterns.docFilesModified).toBe(true)
    })

    it('should detect build and configuration activity', () => {
      const context = createMockActivationContext({
        recentActions: [
          createMockDeveloperAction('build_start'),
          createMockDeveloperAction('file_edit', { file: 'package.json' }),
          createMockDeveloperAction('file_edit', { file: 'tsconfig.json' })
        ]
      })

      const patterns = detector.detectActionPatterns(context.recentActions)

      expect(patterns.buildActivity).toBe(true)
      expect(patterns.configurationActivity).toBe(true)
      expect(patterns.projectSetupActivity).toBe(true)
    })

    it('should calculate action recency and frequency', () => {
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60000).toISOString()
      const fiveMinutesAgo = new Date(now.getTime() - 300000).toISOString()

      const context = createMockActivationContext({
        recentActions: [
          createMockDeveloperAction('debugger_start', { timestamp: oneMinuteAgo }),
          createMockDeveloperAction('test_run', { timestamp: fiveMinutesAgo }),
          createMockDeveloperAction('debugger_start', { timestamp: now.toISOString() })
        ]
      })

      const patterns = detector.detectActionPatterns(context.recentActions)

      expect(patterns.recentActivity.veryRecent).toBeGreaterThan(0)
      expect(patterns.recentActivity.recent).toBeGreaterThan(0)
      expect(patterns.actionFrequency.debugger_start).toBe(2)
      expect(patterns.actionFrequency.test_run).toBe(1)
    })

    it('should handle empty action list', () => {
      const context = createMockActivationContext({
        recentActions: []
      })

      const patterns = detector.detectActionPatterns(context.recentActions)

      expect(patterns.debuggingActivity).toBe(false)
      expect(patterns.testingActivity).toBe(false)
      expect(patterns.documentationActivity).toBe(false)
      expect(patterns.overallActivity).toBe(false)
    })
  })

  describe('Context Confidence Scoring', () => {
    it('should calculate confidence scores for debugging context', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/utils.test.ts', 'src/debug.ts'],
        recentActions: [
          createMockDeveloperAction('debugger_start'),
          createMockDeveloperAction('error_occurrence'),
          createMockDeveloperAction('test_run')
        ]
      })

      const confidence = detector.calculateConfidenceScores(context)

      expect(confidence.debugging).toBeGreaterThan(0.8)
      expect(confidence.testing).toBeGreaterThan(0.7)
      expect(confidence.overall).toBeGreaterThan(0.7)
    })

    it('should calculate confidence scores for documentation context', () => {
      const context = createMockActivationContext({
        currentFiles: ['README.md', 'docs/api.md'],
        recentActions: [
          createMockDeveloperAction('file_open', { file: 'README.md' }),
          createMockDeveloperAction('file_edit', { file: 'docs/api.md' })
        ]
      })

      const confidence = detector.calculateConfidenceScores(context)

      expect(confidence.documentation).toBeGreaterThan(0.8)
      expect(confidence.debugging).toBeLessThan(0.3)
      expect(confidence.overall).toBeGreaterThan(0.5)
    })

    it('should handle mixed context appropriately', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/utils.ts', 'README.md', 'src/test.spec.ts'],
        recentActions: [
          createMockDeveloperAction('file_save'),
          createMockDeveloperAction('test_run'),
          createMockDeveloperAction('file_edit', { file: 'README.md' })
        ]
      })

      const confidence = detector.calculateConfidenceScores(context)

      expect(confidence.testing).toBeGreaterThan(0.4)
      expect(confidence.documentation).toBeGreaterThan(0.4)
      expect(confidence.development).toBeGreaterThan(0.5)
    })

    it('should apply time decay to older actions', () => {
      const now = new Date()
      const oldTimestamp = new Date(now.getTime() - 3600000).toISOString() // 1 hour ago
      const recentTimestamp = now.toISOString()

      const oldContext = createMockActivationContext({
        recentActions: [
          createMockDeveloperAction('debugger_start', { timestamp: oldTimestamp })
        ]
      })

      const recentContext = createMockActivationContext({
        recentActions: [
          createMockDeveloperAction('debugger_start', { timestamp: recentTimestamp })
        ]
      })

      const oldConfidence = detector.calculateConfidenceScores(oldContext)
      const recentConfidence = detector.calculateConfidenceScores(recentContext)

      expect(recentConfidence.debugging).toBeGreaterThan(oldConfidence.debugging)
    })

    it('should consider project context in confidence scoring', () => {
      const testHeavyProject: ProjectMetadata = {
        name: 'test-project',
        type: 'typescript',
        dependencies: ['jest', '@testing-library/react', 'cypress'],
        structure: {
          hasTests: true,
          hasComponents: true,
          hasDocs: false,
          hasConfig: true
        }
      }

      const context = createMockActivationContext({
        projectContext: testHeavyProject,
        currentFiles: ['src/component.test.ts'],
        recentActions: [createMockDeveloperAction('test_run')]
      })

      const confidence = detector.calculateConfidenceScores(context)

      expect(confidence.testing).toBeGreaterThan(0.8)
      expect(confidence.projectAlignment.testing).toBe(true)
    })
  })

  describe('Lens Matching Logic', () => {
    it('should match lenses based on activation criteria', () => {
      const debugContext = createMockActivationContext({
        currentFiles: ['src/utils.test.ts'],
        recentActions: [createMockDeveloperAction('debugger_start')]
      })

      const mockLensConfigs = [
        {
          id: 'debug-lens',
          triggers: ['debugger_start', 'test_run', 'error_occurrence'],
          filePatterns: ['*.test.*', '*.spec.*']
        },
        {
          id: 'docs-lens',
          triggers: ['file_open'],
          filePatterns: ['*.md', 'README*']
        }
      ]

      const matches = detector.findLensMatches(mockLensConfigs, debugContext)

      expect(matches).toHaveLength(1)
      expect(matches[0].lensId).toBe('debug-lens')
      expect(matches[0].score).toBeGreaterThan(0.7)
      expect(matches[0].reasons).toContain('debugger_start trigger matched')
      expect(matches[0].reasons).toContain('test file pattern matched')
    })

    it('should rank matches by relevance score', () => {
      const context = createMockActivationContext({
        currentFiles: ['README.md', 'src/utils.test.ts'],
        recentActions: [
          createMockDeveloperAction('debugger_start'),
          createMockDeveloperAction('file_open', { file: 'README.md' })
        ]
      })

      const mockLensConfigs = [
        {
          id: 'debug-lens',
          triggers: ['debugger_start'],
          filePatterns: ['*.test.*'],
          priority: 10
        },
        {
          id: 'docs-lens',
          triggers: ['file_open'],
          filePatterns: ['*.md'],
          priority: 5
        }
      ]

      const matches = detector.findLensMatches(mockLensConfigs, context)

      expect(matches).toHaveLength(2)
      expect(matches[0].lensId).toBe('debug-lens')
      expect(matches[0].score).toBeGreaterThan(matches[1].score)
    })

    it('should provide detailed matching reasons', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/component.test.tsx'],
        recentActions: [
          createMockDeveloperAction('test_run', { metadata: { framework: 'jest' } }),
          createMockDeveloperAction('error_occurrence', { file: 'src/component.test.tsx' })
        ]
      })

      const mockLensConfig = {
        id: 'debug-lens',
        triggers: ['test_run', 'error_occurrence'],
        filePatterns: ['*.test.*', '*.spec.*']
      }

      const matches = detector.findLensMatches([mockLensConfig], context)

      expect(matches[0].reasons).toContain('test_run trigger matched')
      expect(matches[0].reasons).toContain('error_occurrence trigger matched')
      expect(matches[0].reasons).toContain('test file pattern matched')
      expect(matches[0].details.triggerMatches).toBe(2)
      expect(matches[0].details.filePatternMatches).toBe(1)
    })

    it('should handle no matching lenses', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/index.ts'],
        recentActions: [createMockDeveloperAction('file_save')]
      })

      const mockLensConfigs = [
        {
          id: 'debug-lens',
          triggers: ['debugger_start', 'error_occurrence'],
          filePatterns: ['*.test.*']
        }
      ]

      const matches = detector.findLensMatches(mockLensConfigs, context)

      expect(matches).toHaveLength(0)
    })

    it('should apply minimum score thresholds', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/index.ts'],
        recentActions: [createMockDeveloperAction('file_open')]
      })

      const mockLensConfig = {
        id: 'weak-lens',
        triggers: ['file_open'],
        filePatterns: ['*.css'], // No match
        minimumScore: 0.6
      }

      const matches = detector.findLensMatches([mockLensConfig], context)

      expect(matches).toHaveLength(0) // Should be filtered out by minimum score
    })
  })

  describe('Performance Optimization', () => {
    it('should cache pattern detection results', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/utils.test.ts', 'README.md']
      })

      // First call
      const startTime1 = performance.now()
      const patterns1 = detector.detectFilePatterns(context.currentFiles)
      const duration1 = performance.now() - startTime1

      // Second call with same files - should use cache
      const startTime2 = performance.now()
      const patterns2 = detector.detectFilePatterns(context.currentFiles)
      const duration2 = performance.now() - startTime2

      expect(patterns1).toEqual(patterns2)
      expect(duration2).toBeLessThan(duration1)
    })

    it('should handle large numbers of files efficiently', () => {
      const manyFiles = Array.from({ length: 1000 }, (_, i) => `src/file${i}.ts`)
      manyFiles.push('src/test.spec.ts', 'README.md') // Add some pattern matches

      const context = createMockActivationContext({
        currentFiles: manyFiles
      })

      const startTime = performance.now()
      const patterns = detector.detectFilePatterns(context.currentFiles)
      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(50) // Should complete in under 50ms
      expect(patterns.testFiles).toBe(true)
      expect(patterns.documentationFiles).toBe(true)
    })

    it('should handle large numbers of actions efficiently', () => {
      const manyActions = Array.from({ length: 1000 }, (_, i) =>
        createMockDeveloperAction('file_save', { file: `src/file${i}.ts` })
      )
      manyActions.push(
        createMockDeveloperAction('debugger_start'),
        createMockDeveloperAction('test_run')
      )

      const context = createMockActivationContext({
        recentActions: manyActions
      })

      const startTime = performance.now()
      const patterns = detector.detectActionPatterns(context.recentActions)
      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(100) // Should complete in under 100ms
      expect(patterns.debuggingActivity).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should provide complete context analysis', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/utils.test.ts', 'README.md', 'src/component.tsx'],
        recentActions: [
          createMockDeveloperAction('debugger_start'),
          createMockDeveloperAction('test_run'),
          createMockDeveloperAction('file_edit', { file: 'README.md' })
        ],
        projectContext: {
          name: 'full-stack-app',
          type: 'typescript',
          dependencies: ['react', 'jest', '@testing-library/react'],
          structure: {
            hasTests: true,
            hasComponents: true,
            hasDocs: true,
            hasConfig: true
          }
        }
      })

      const analysis = detector.analyzeContext(context)

      expect(analysis.filePatterns.testFiles).toBe(true)
      expect(analysis.filePatterns.componentFiles).toBe(true)
      expect(analysis.filePatterns.documentationFiles).toBe(true)

      expect(analysis.actionPatterns.debuggingActivity).toBe(true)
      expect(analysis.actionPatterns.testingActivity).toBe(true)
      expect(analysis.actionPatterns.documentationActivity).toBe(true)

      expect(analysis.confidence.debugging).toBeGreaterThan(0.7)
      expect(analysis.confidence.testing).toBeGreaterThan(0.7)
      expect(analysis.confidence.documentation).toBeGreaterThan(0.5)

      expect(analysis.recommendations).toBeDefined()
      expect(analysis.recommendations.primaryContext).toBeDefined()
      expect(analysis.recommendations.suggestedLenses).toBeDefined()
    })

    it('should generate actionable recommendations', () => {
      const context = createMockActivationContext({
        currentFiles: ['src/buggy-component.tsx'],
        recentActions: [
          createMockDeveloperAction('error_occurrence', {
            file: 'src/buggy-component.tsx',
            metadata: { errorType: 'TypeError' }
          }),
          createMockDeveloperAction('debugger_start')
        ]
      })

      const analysis = detector.analyzeContext(context)

      expect(analysis.recommendations.primaryContext).toBe('debugging')
      expect(analysis.recommendations.confidence).toBeGreaterThan(0.8)
      expect(analysis.recommendations.suggestedLenses).toContain('debug-lens')
      expect(analysis.recommendations.reasons).toContain('Error occurred in current file')
    })
  })
})