/**
 * Debug Lens - Emphasizes debugging-relevant context
 *
 * This lens activates during debugging scenarios and emphasizes:
 * - Error-related code and messages
 * - Recently modified files
 * - Test failures
 * - Dependency chains leading to errors
 * - Stack traces and error handling code
 *
 * Activation triggers:
 * - Keywords: "error", "bug", "debug", "why", "crash", "fail"
 * - Actions: debugger start, error occurrence, test failures
 * - File patterns: test files, error logs, debug utilities
 */

import { BaseLens } from './ContextLens';
import type { Query } from '../../query/types';
import type {
  ActivationContext,
  QueryContext,
  LensConfig,
  DeveloperAction
} from './types';
import { ContextDepth } from '../../types/context';

/**
 * Metadata added to results by DebugLens
 */
export interface DebugMetadata {
  /** Whether this result is related to errors */
  isErrorRelated: boolean;
  /** Whether this result contains error-related keywords */
  hasErrorKeywords: boolean;
  /** Relevance score for debugging (0-100) */
  relevanceScore: number;
  /** Last modification timestamp (if available) */
  lastModified?: string;
  /** Whether this result is a test file */
  isTestFile?: boolean;
  /** Detected error patterns in content */
  errorPatterns?: string[];
}

export class DebugLens extends BaseLens {
  // Debug-related keywords to detect
  private static readonly DEBUG_KEYWORDS = [
    'error', 'bug', 'debug', 'why', 'crash', 'fail', 'exception',
    'throw', 'catch', 'try', 'stack', 'trace', 'assert', 'test'
  ];

  // Error-related patterns to highlight
  private static readonly ERROR_PATTERNS = [
    /error/i,
    /exception/i,
    /throw/i,
    /catch/i,
    /fail/i,
    /crash/i,
    /bug/i,
    /todo.*fix/i,
    /fixme/i,
    /hack/i
  ];

  constructor() {
    super('debug', 'Debug Lens', 80);
  }

  /**
   * Determine if this lens should activate
   */
  shouldActivate(context: ActivationContext): boolean {
    // Check manual override first
    if (context.manualOverride === 'debug') {
      return true;
    }

    // Check if lens is enabled
    if (!this.config.enabled) {
      return false;
    }

    // Check for debug-related actions
    if (this.hasDebugRelatedActions(context.recentActions)) {
      return true;
    }

    // Check for debug-related files
    if (this.hasDebugRelatedFiles(context.currentFiles)) {
      return true;
    }

    return false;
  }

  /**
   * Transform query to emphasize debug-relevant context
   */
  transformQuery<T>(query: Query<T>): Query<T> {
    const transformed = { ...query };

    // Set depth to DETAILED for comprehensive debugging
    transformed.depth = ContextDepth.DETAILED;

    // Add error-related conditions
    if (!transformed.conditions) {
      transformed.conditions = [];
    }

    // Add condition to include error-related content
    // Note: Using 'error' as a representative keyword; in practice,
    // the query executor would handle multiple keywords
    transformed.conditions.push({
      type: 'pattern' as const,
      field: 'content' as any, // Type assertion for generic query
      operator: 'contains' as const,
      value: 'error'
    });

    // Add ordering to prioritize recent modifications
    if (!transformed.ordering) {
      transformed.ordering = [];
    }

    transformed.ordering.push({
      field: 'lastModified' as any, // Type assertion for generic query
      direction: 'desc' as const
    });

    // Increase pagination limit for comprehensive debugging
    if (transformed.pagination) {
      transformed.pagination = {
        ...transformed.pagination,
        limit: Math.max(transformed.pagination.limit || 10, 50)
      };
    } else {
      transformed.pagination = {
        offset: 0,
        limit: 50
      };
    }

    // Add performance hints
    transformed.performanceHints = {
      expectedMemoryReduction: false, // We want full details for debugging
      estimatedMemoryFactor: 1.5, // May use more memory for detailed view
      optimizedFields: ['content', 'metadata', 'relationships'],
      cacheStrategy: 'minimal' // Fresh data for debugging
    };

    return transformed;
  }

  /**
   * Process results to add debug-specific metadata
   */
  processResults<T>(results: T[], context: QueryContext): T[] {
    if (results.length === 0) {
      return results;
    }

    // Process each result with debug metadata
    const processed = results.map(result => {
      const debugMetadata = this.calculateDebugMetadata(result);
      return {
        ...result,
        _debugMetadata: debugMetadata,
        _lensMetadata: {
          appliedLens: this.id,
          processedAt: new Date().toISOString(),
          contextId: context.requestId
        }
      };
    });

    // Sort by relevance score (highest first)
    processed.sort((a: any, b: any) => {
      const scoreA = a._debugMetadata?.relevanceScore || 0;
      const scoreB = b._debugMetadata?.relevanceScore || 0;
      return scoreB - scoreA;
    });

    return processed;
  }

  /**
   * Calculate debug-specific metadata for a result
   */
  private calculateDebugMetadata(result: any): DebugMetadata {
    const content = result.content || '';
    const filename = result.metadata?.filename || '';
    const name = result.name || '';

    // Check for error keywords
    const hasErrorKeywords = this.hasErrorKeywords(content + ' ' + name);

    // Check for error patterns
    const errorPatterns = this.detectErrorPatterns(content);

    // Check if this is a test file
    const isTestFile = this.isTestFile(filename);

    // Check if this is error-related
    const isErrorRelated = hasErrorKeywords ||
                          errorPatterns.length > 0 ||
                          filename.includes('error') ||
                          name.toLowerCase().includes('error');

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore({
      hasErrorKeywords,
      errorPatterns,
      isTestFile,
      isErrorRelated,
      filename,
      content
    });

    // Get last modified timestamp if available
    const lastModified = result.metadata?.lastModified;

    return {
      isErrorRelated,
      hasErrorKeywords,
      relevanceScore,
      lastModified,
      isTestFile,
      errorPatterns: errorPatterns.length > 0 ? errorPatterns : undefined
    };
  }

  /**
   * Calculate relevance score for debugging (0-100)
   */
  private calculateRelevanceScore(factors: {
    hasErrorKeywords: boolean;
    errorPatterns: string[];
    isTestFile: boolean;
    isErrorRelated: boolean;
    filename: string;
    content: string;
  }): number {
    let score = 0;

    // Base score for error-related content
    if (factors.isErrorRelated) {
      score += 30;
    }

    // Add score for error keywords
    if (factors.hasErrorKeywords) {
      score += 25;
    }

    // Add score for detected error patterns
    score += Math.min(factors.errorPatterns.length * 10, 30);

    // Add score for test files (tests often reveal bugs)
    if (factors.isTestFile) {
      score += 15;
    }

    // Add score for error handling code
    if (factors.content.includes('try') && factors.content.includes('catch')) {
      score += 10;
    }

    // Add score for throw statements
    if (factors.content.includes('throw')) {
      score += 10;
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Check if recent actions are debug-related
   */
  private hasDebugRelatedActions(actions: DeveloperAction[]): boolean {
    if (!actions || actions.length === 0) {
      return false;
    }

    return actions.some(action => {
      // Debugger start is a strong signal
      if (action.type === 'debugger_start') {
        return true;
      }

      // Error occurrence is a strong signal
      if (action.type === 'error_occurrence') {
        return true;
      }

      // Failed test runs indicate debugging need
      if (action.type === 'test_run') {
        const result = action.metadata?.result;
        return result === 'failed' || result === 'error';
      }

      // Check for debug keywords in file operations
      if (action.file) {
        return this.containsDebugKeywords(action.file);
      }

      // Check for debug keywords in action metadata
      if (action.metadata) {
        const metadataStr = JSON.stringify(action.metadata).toLowerCase();
        return this.containsDebugKeywords(metadataStr);
      }

      return false;
    });
  }

  /**
   * Check if current files are debug-related
   */
  private hasDebugRelatedFiles(files: string[]): boolean {
    if (!files || files.length === 0) {
      return false;
    }

    return files.some(file => {
      // Test files
      if (this.isTestFile(file)) {
        return true;
      }

      // Error log files
      if (file.includes('error') || file.includes('.log')) {
        return true;
      }

      // Debug-related files
      if (this.containsDebugKeywords(file)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Check if text contains debug keywords
   */
  private containsDebugKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return DebugLens.DEBUG_KEYWORDS.some(keyword =>
      lowerText.includes(keyword)
    );
  }

  /**
   * Check if content has error-related keywords
   */
  private hasErrorKeywords(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return ['error', 'exception', 'throw', 'catch', 'fail', 'crash'].some(
      keyword => lowerContent.includes(keyword)
    );
  }

  /**
   * Detect error patterns in content
   */
  private detectErrorPatterns(content: string): string[] {
    const patterns: string[] = [];

    for (const pattern of DebugLens.ERROR_PATTERNS) {
      if (pattern.test(content)) {
        patterns.push(pattern.source);
      }
    }

    return patterns;
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filename: string): boolean {
    return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
           filename.includes('__tests__');
  }
}
