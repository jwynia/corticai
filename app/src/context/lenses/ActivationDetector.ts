/**
 * Activation Detector - Context analysis and lens matching engine
 *
 * This module provides sophisticated context analysis to determine which lenses
 * should be activated based on developer actions, file patterns, and project context.
 *
 * Key Features:
 * - File pattern detection and classification
 * - Developer action pattern recognition
 * - Context confidence scoring
 * - Lens matching with detailed reasoning
 * - Performance optimization with caching
 */

import type {
  ActivationContext,
  DeveloperAction,
  ProjectMetadata,
  ContextLens
} from './types'

/**
 * File pattern analysis results
 */
export interface FilePatterns {
  testFiles: boolean
  testFileCount: number
  testTypes: string[]
  documentationFiles: boolean
  docFileCount: number
  docTypes: string[]
  configFiles: boolean
  configFileCount: number
  configTypes: string[]
  componentFiles: boolean
  componentFileCount: number
  frameworks: string[]
  sourceFiles: boolean
  sourceFileCount: number
  languages: string[]
  diversity: number // 0-1 score indicating file type diversity
}

/**
 * Action pattern analysis results
 */
export interface ActionPatterns {
  debuggingActivity: boolean
  debuggingIntensity: number
  debuggingActions: DeveloperAction[]
  recentDebugging: boolean
  testingActivity: boolean
  testingIntensity: number
  testFilesAccessed: boolean
  multipleTestRuns: boolean
  documentationActivity: boolean
  documentationIntensity: number
  docFilesModified: boolean
  buildActivity: boolean
  configurationActivity: boolean
  projectSetupActivity: boolean
  overallActivity: boolean
  recentActivity: {
    veryRecent: number // Last minute
    recent: number     // Last 5 minutes
  }
  actionFrequency: Record<string, number>
}

/**
 * Confidence scores for different context types
 */
export interface ConfidenceScores {
  debugging: number
  testing: number
  documentation: number
  development: number
  configuration: number
  overall: number
  projectAlignment: {
    testing: boolean
    documentation: boolean
    configuration: boolean
  }
}

/**
 * Lens match with detailed reasoning
 */
export interface LensMatch {
  lensId: string
  lens: ContextLens
  score: number
  confidence: number
  reasons: string[]
  details: {
    triggerMatches: number
    filePatternMatches: number
    contextAlignment: number
  }
}

/**
 * Complete context analysis results
 */
export interface ContextAnalysis {
  filePatterns: FilePatterns
  actionPatterns: ActionPatterns
  confidence: ConfidenceScores
  recommendations: {
    primaryContext: string
    confidence: number
    suggestedLenses: string[]
    reasons: string[]
  }
}

/**
 * Context analysis and lens matching engine
 *
 * The ActivationDetector analyzes developer context to determine which lenses
 * should be activated. It uses sophisticated pattern matching and confidence
 * scoring to provide intelligent lens recommendations.
 */
export class ActivationDetector {
  private filePatternCache = new Map<string, FilePatterns>()
  private actionPatternCache = new Map<string, ActionPatterns>()
  private confidenceCache = new Map<string, ConfidenceScores>()

  /**
   * Detect file patterns in a list of files
   */
  detectFilePatterns(files: string[]): FilePatterns {
    // Create robust cache key with proper encoding
    const cacheKey = files.length === 0
      ? 'EMPTY_FILES'
      : files.slice().sort().map(f => f.replace(/[|\\]/g, '_')).join('|')
    if (this.filePatternCache.has(cacheKey)) {
      return this.filePatternCache.get(cacheKey)!
    }

    const patterns: FilePatterns = {
      testFiles: false,
      testFileCount: 0,
      testTypes: [],
      documentationFiles: false,
      docFileCount: 0,
      docTypes: [],
      configFiles: false,
      configFileCount: 0,
      configTypes: [],
      componentFiles: false,
      componentFileCount: 0,
      frameworks: [],
      sourceFiles: false,
      sourceFileCount: 0,
      languages: [],
      diversity: 0
    }

    if (files.length === 0) {
      this.filePatternCache.set(cacheKey, patterns)
      return patterns
    }

    const typeGroups = new Set<string>()

    for (const file of files) {
      const fileName = file.toLowerCase()
      const extension = fileName.split('.').pop() || ''

      // Test files
      if (this.isTestFile(fileName)) {
        patterns.testFiles = true
        patterns.testFileCount++
        typeGroups.add('test')

        if (fileName.includes('unit')) patterns.testTypes.push('unit')
        if (fileName.includes('integration')) patterns.testTypes.push('integration')
        if (fileName.includes('e2e') || fileName.includes('end-to-end')) patterns.testTypes.push('e2e')
      }

      // Documentation files
      if (this.isDocumentationFile(fileName)) {
        patterns.documentationFiles = true
        patterns.docFileCount++
        typeGroups.add('documentation')

        if (fileName.includes('readme')) patterns.docTypes.push('readme')
        if (fileName.includes('api')) patterns.docTypes.push('api')
        if (fileName.includes('changelog')) patterns.docTypes.push('changelog')
        if (fileName.includes('guide')) patterns.docTypes.push('guide')
      }

      // Configuration files
      if (this.isConfigFile(fileName)) {
        patterns.configFiles = true
        patterns.configFileCount++
        typeGroups.add('config')

        if (fileName.includes('package.json')) patterns.configTypes.push('package')
        if (fileName.includes('tsconfig')) patterns.configTypes.push('typescript')
        if (fileName.includes('eslint')) patterns.configTypes.push('linting')
        if (fileName.includes('jest') || fileName.includes('test')) patterns.configTypes.push('testing')
        if (fileName.includes('webpack') || fileName.includes('rollup') || fileName.includes('vite')) {
          patterns.configTypes.push('bundling')
        }
      }

      // Component files
      if (this.isComponentFile(fileName)) {
        patterns.componentFiles = true
        patterns.componentFileCount++
        typeGroups.add('component')

        if (extension === 'tsx' || extension === 'jsx') patterns.frameworks.push('react')
        if (extension === 'vue') patterns.frameworks.push('vue')
        if (extension === 'svelte') patterns.frameworks.push('svelte')
        if (fileName.includes('angular')) patterns.frameworks.push('angular')
      }

      // Source files
      if (this.isSourceFile(fileName)) {
        patterns.sourceFiles = true
        patterns.sourceFileCount++
        typeGroups.add('source')

        if (extension === 'ts' || extension === 'tsx') patterns.languages.push('typescript')
        if (extension === 'js' || extension === 'jsx') patterns.languages.push('javascript')
        if (extension === 'py') patterns.languages.push('python')
        if (extension === 'java') patterns.languages.push('java')
        if (extension === 'cpp' || extension === 'cc') patterns.languages.push('cpp')
      }
    }

    // Remove duplicates
    patterns.testTypes = Array.from(new Set(patterns.testTypes))
    patterns.docTypes = Array.from(new Set(patterns.docTypes))
    patterns.configTypes = Array.from(new Set(patterns.configTypes))
    patterns.frameworks = Array.from(new Set(patterns.frameworks))
    patterns.languages = Array.from(new Set(patterns.languages))

    // Calculate diversity score
    patterns.diversity = Math.min(typeGroups.size / 5, 1.0) // Max 5 type groups

    this.filePatternCache.set(cacheKey, patterns)
    return patterns
  }

  /**
   * Detect action patterns in developer actions
   */
  detectActionPatterns(actions: DeveloperAction[]): ActionPatterns {
    // Create stable cache key for recent actions
    const cacheKey = actions.length === 0
      ? 'EMPTY_ACTIONS'
      : `actions_${actions.slice(-20).map(a => `${a.type}:${a.timestamp}`).join('|')}`
    if (this.actionPatternCache.has(cacheKey)) {
      return this.actionPatternCache.get(cacheKey)!
    }

    const patterns: ActionPatterns = {
      debuggingActivity: false,
      debuggingIntensity: 0,
      debuggingActions: [],
      recentDebugging: false,
      testingActivity: false,
      testingIntensity: 0,
      testFilesAccessed: false,
      multipleTestRuns: false,
      documentationActivity: false,
      documentationIntensity: 0,
      docFilesModified: false,
      buildActivity: false,
      configurationActivity: false,
      projectSetupActivity: false,
      overallActivity: actions.length > 0,
      recentActivity: { veryRecent: 0, recent: 0 },
      actionFrequency: {}
    }

    if (actions.length === 0) {
      this.actionPatternCache.set(cacheKey, patterns)
      return patterns
    }

    const now = Date.now()
    let debuggingScore = 0
    let testingScore = 0
    let documentationScore = 0
    const testRuns = new Set<string>()

    // Count action frequencies
    for (const action of actions) {
      patterns.actionFrequency[action.type] = (patterns.actionFrequency[action.type] || 0) + 1

      const actionTime = new Date(action.timestamp).getTime()
      const timeDiff = now - actionTime

      // Recent activity tracking
      if (timeDiff < 60000) patterns.recentActivity.veryRecent++
      if (timeDiff < 300000) patterns.recentActivity.recent++

      // Debugging activity
      if (this.isDebuggingAction(action)) {
        patterns.debuggingActions.push(action)
        debuggingScore += this.calculateActionScore(action, timeDiff)

        if (timeDiff < 300000) patterns.recentDebugging = true
      }

      // Testing activity
      if (this.isTestingAction(action)) {
        testingScore += this.calculateActionScore(action, timeDiff)

        if (action.type === 'test_run' && action.file) {
          testRuns.add(action.file)
        }

        if (action.file && this.isTestFile(action.file)) {
          patterns.testFilesAccessed = true
        }
      }

      // Documentation activity
      if (this.isDocumentationAction(action)) {
        documentationScore += this.calculateActionScore(action, timeDiff)

        if (action.file && this.isDocumentationFile(action.file)) {
          patterns.docFilesModified = true
        }
      }

      // Build and configuration activity
      if (action.type === 'build_start') {
        patterns.buildActivity = true
      }

      if (action.file && this.isConfigFile(action.file)) {
        patterns.configurationActivity = true
      }
    }

    // Calculate activity flags and intensities
    patterns.debuggingActivity = debuggingScore > 0.3
    patterns.debuggingIntensity = Math.min(debuggingScore, 1.0)

    patterns.testingActivity = testingScore > 0.3
    patterns.testingIntensity = Math.min(testingScore, 1.0)
    patterns.multipleTestRuns = testRuns.size > 1

    patterns.documentationActivity = documentationScore > 0.3
    patterns.documentationIntensity = Math.min(documentationScore, 1.0)

    patterns.projectSetupActivity = patterns.configurationActivity && patterns.buildActivity

    this.actionPatternCache.set(cacheKey, patterns)
    return patterns
  }

  /**
   * Calculate confidence scores for different context types
   */
  calculateConfidenceScores(context: ActivationContext): ConfidenceScores {
    const cacheKey = JSON.stringify({
      files: context.currentFiles.sort(),
      actions: context.recentActions.slice(-10),
      project: context.projectContext.type
    })

    if (this.confidenceCache.has(cacheKey)) {
      return this.confidenceCache.get(cacheKey)!
    }

    const filePatterns = this.detectFilePatterns(context.currentFiles)
    const actionPatterns = this.detectActionPatterns(context.recentActions)

    const scores: ConfidenceScores = {
      debugging: 0,
      testing: 0,
      documentation: 0,
      development: 0,
      configuration: 0,
      overall: 0,
      projectAlignment: {
        testing: false,
        documentation: false,
        configuration: false
      }
    }

    // Base scores from file patterns
    if (filePatterns.testFiles) scores.testing += 0.4
    if (filePatterns.documentationFiles) scores.documentation += 0.4
    if (filePatterns.configFiles) scores.configuration += 0.3
    if (filePatterns.sourceFiles) scores.development += 0.3

    // Boost scores from action patterns
    scores.debugging += actionPatterns.debuggingIntensity * 0.6
    scores.testing += actionPatterns.testingIntensity * 0.5
    scores.documentation += actionPatterns.documentationIntensity * 0.5
    if (actionPatterns.buildActivity) scores.development += 0.2
    if (actionPatterns.configurationActivity) scores.configuration += 0.3

    // Project alignment factors
    scores.projectAlignment.testing = context.projectContext.structure.hasTests &&
      (scores.testing > 0.4 || actionPatterns.testingActivity)
    scores.projectAlignment.documentation = context.projectContext.structure.hasDocs &&
      (scores.documentation > 0.3 || actionPatterns.documentationActivity)
    scores.projectAlignment.configuration = context.projectContext.structure.hasConfig &&
      (scores.configuration > 0.3 || actionPatterns.configurationActivity)

    // Boost scores for project alignment
    if (scores.projectAlignment.testing) scores.testing += 0.2
    if (scores.projectAlignment.documentation) scores.documentation += 0.2
    if (scores.projectAlignment.configuration) scores.configuration += 0.2

    // Calculate overall confidence
    scores.overall = Math.max(
      scores.debugging,
      scores.testing,
      scores.documentation,
      scores.development,
      scores.configuration
    )

    // Cap all scores at 1.0
    Object.keys(scores).forEach(key => {
      if (typeof scores[key as keyof ConfidenceScores] === 'number') {
        (scores as any)[key] = Math.min((scores as any)[key], 1.0)
      }
    })

    this.confidenceCache.set(cacheKey, scores)
    return scores
  }

  /**
   * Find lens matches based on configuration and context
   */
  findLensMatches(lensConfigs: any[], context: ActivationContext): LensMatch[] {
    const matches: LensMatch[] = []
    const filePatterns = this.detectFilePatterns(context.currentFiles)
    const actionPatterns = this.detectActionPatterns(context.recentActions)

    for (const config of lensConfigs) {
      const match = this.evaluateLensMatch(config, context, filePatterns, actionPatterns)
      if (match && match.score >= (config.minimumScore || 0.3)) {
        matches.push(match)
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score)

    return matches
  }

  /**
   * Provide complete context analysis
   */
  analyzeContext(context: ActivationContext): ContextAnalysis {
    const filePatterns = this.detectFilePatterns(context.currentFiles)
    const actionPatterns = this.detectActionPatterns(context.recentActions)
    const confidence = this.calculateConfidenceScores(context)

    // Determine primary context
    const contextScores = {
      debugging: confidence.debugging,
      testing: confidence.testing,
      documentation: confidence.documentation,
      development: confidence.development,
      configuration: confidence.configuration
    }

    const primaryContext = Object.entries(contextScores)
      .sort(([,a], [,b]) => b - a)[0][0]

    // Generate recommendations
    const suggestedLenses: string[] = []
    const reasons: string[] = []

    if (confidence.debugging > 0.6) {
      suggestedLenses.push('debug-lens')
      if (actionPatterns.debuggingActions.some(a => a.type === 'error_occurrence')) {
        reasons.push('Error occurred in current file')
      }
      if (actionPatterns.recentDebugging) {
        reasons.push('Recent debugging activity detected')
      }
    }

    if (confidence.testing > 0.6) {
      suggestedLenses.push('test-lens')
      if (actionPatterns.multipleTestRuns) {
        reasons.push('Multiple test runs detected')
      }
    }

    if (confidence.documentation > 0.6) {
      suggestedLenses.push('docs-lens')
      if (actionPatterns.docFilesModified) {
        reasons.push('Documentation files being modified')
      }
    }

    return {
      filePatterns,
      actionPatterns,
      confidence,
      recommendations: {
        primaryContext,
        confidence: contextScores[primaryContext as keyof typeof contextScores],
        suggestedLenses,
        reasons
      }
    }
  }

  // Private helper methods

  private isTestFile(fileName: string): boolean {
    return fileName.includes('.test.') ||
           fileName.includes('.spec.') ||
           fileName.includes('__tests__') ||
           fileName.startsWith('test')
  }

  private isDocumentationFile(fileName: string): boolean {
    return fileName.endsWith('.md') ||
           fileName.includes('readme') ||
           fileName.includes('changelog') ||
           fileName.includes('doc') ||
           fileName.includes('guide')
  }

  private isConfigFile(fileName: string): boolean {
    return fileName.includes('config') ||
           fileName.includes('.json') ||
           fileName.includes('.yml') ||
           fileName.includes('.yaml') ||
           fileName.includes('.toml') ||
           fileName.startsWith('.')
  }

  private isComponentFile(fileName: string): boolean {
    const componentPatterns = ['component', 'widget', 'ui', 'view']
    return componentPatterns.some(pattern => fileName.includes(pattern)) ||
           fileName.endsWith('.tsx') ||
           fileName.endsWith('.jsx') ||
           fileName.endsWith('.vue') ||
           fileName.endsWith('.svelte')
  }

  private isSourceFile(fileName: string): boolean {
    const sourceExtensions = ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'cpp', 'cc', 'c', 'h']
    const extension = fileName.split('.').pop()?.toLowerCase()
    return extension ? sourceExtensions.includes(extension) : false
  }

  private isDebuggingAction(action: DeveloperAction): boolean {
    return ['debugger_start', 'error_occurrence', 'test_run'].includes(action.type)
  }

  private isTestingAction(action: DeveloperAction): boolean {
    return action.type === 'test_run' ||
           (action.type === 'file_open' && action.file && this.isTestFile(action.file))
  }

  private isDocumentationAction(action: DeveloperAction): boolean {
    return action.type === 'file_edit' &&
           action.file &&
           this.isDocumentationFile(action.file)
  }

  private calculateActionScore(action: DeveloperAction, timeDiff: number): number {
    let score = 0.3 // Base score

    // Boost score for recent actions (time decay)
    if (timeDiff < 60000) score += 0.4      // Last minute
    else if (timeDiff < 300000) score += 0.3 // Last 5 minutes
    else if (timeDiff < 900000) score += 0.2 // Last 15 minutes
    else if (timeDiff < 3600000) score += 0.1 // Last hour

    // Boost score for important action types
    const importantActions = ['debugger_start', 'error_occurrence', 'test_run']
    if (importantActions.includes(action.type)) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  private evaluateLensMatch(
    config: any,
    context: ActivationContext,
    filePatterns: FilePatterns,
    actionPatterns: ActionPatterns
  ): LensMatch | null {
    const reasons: string[] = []
    let score = 0
    let triggerMatches = 0
    let filePatternMatches = 0

    // Check trigger matches
    if (config.triggers) {
      for (const action of context.recentActions) {
        if (config.triggers.includes(action.type)) {
          triggerMatches++
          score += 0.3
          reasons.push(`${action.type} trigger matched`)
        }
      }
    }

    // Check file pattern matches
    if (config.filePatterns) {
      for (const file of context.currentFiles) {
        for (const pattern of config.filePatterns) {
          if (this.matchesPattern(file, pattern)) {
            filePatternMatches++
            score += 0.2
            reasons.push(`${pattern} pattern matched`)
          }
        }
      }
    }

    // Context alignment score
    let contextAlignment = 0
    if (config.id.includes('debug') && actionPatterns.debuggingActivity) {
      contextAlignment += 0.4
    }
    if (config.id.includes('test') && actionPatterns.testingActivity) {
      contextAlignment += 0.4
    }
    if (config.id.includes('doc') && actionPatterns.documentationActivity) {
      contextAlignment += 0.4
    }

    score += contextAlignment

    // Priority boost
    if (config.priority) {
      score += Math.min(config.priority / 100, 0.2)
    }

    if (score < 0.1 || reasons.length === 0) {
      return null
    }

    return {
      lensId: config.id,
      lens: config as ContextLens, // Type assertion for mock configs
      score: Math.min(score, 1.0),
      confidence: Math.min(score * 1.2, 1.0), // Slightly higher confidence
      reasons,
      details: {
        triggerMatches,
        filePatternMatches,
        contextAlignment
      }
    }
  }

  private matchesPattern(file: string, pattern: string): boolean {
    // Simple glob pattern matching
    if (pattern.includes('*')) {
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\./g, '\\.')
      )
      return regex.test(file)
    }
    return file.includes(pattern)
  }
}