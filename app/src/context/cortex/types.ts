/**
 * Type definitions for Continuity Cortex Integration
 *
 * This module defines the interfaces and types for the main Continuity Cortex
 * orchestrator that coordinates FileOperationInterceptor, SimilarityAnalyzer,
 * and FileDecisionEngine components.
 */

import { FileOperationEvent, FileMetadata } from '../interceptors/types.js';
import { FileInfo, SimilarityResult, BatchSimilarityResult } from '../analyzers/types.js';
import { Recommendation } from '../engines/types.js';

/**
 * Configuration for the Continuity Cortex system
 */
export interface CortexConfig {
  /** File operation monitoring settings */
  monitoring: {
    /** Paths to monitor for file operations */
    watchPaths: string[];
    /** Patterns to ignore during monitoring */
    ignorePatterns: string[];
    /** Debounce time for file events in milliseconds */
    debounceMs: number;
    /** Maximum file size to process in bytes */
    maxFileSize: number;
    /** Operations to monitor */
    enabledOperations: ('create' | 'write' | 'move' | 'delete')[];
  };

  /** Similarity analysis settings */
  analysis: {
    /** Enable automatic similarity analysis on file operations */
    enabled: boolean;
    /** Minimum similarity threshold for recommendations */
    similarityThreshold: number;
    /** Confidence threshold for reliable recommendations */
    confidenceThreshold: number;
    /** Maximum number of existing files to compare against */
    maxComparisonFiles: number;
    /** Performance timeout for analysis in milliseconds */
    analysisTimeoutMs: number;
  };

  /** Decision engine settings */
  decisions: {
    /** Enable automatic decision generation */
    enabled: boolean;
    /** Auto-apply threshold (recommendations above this are applied automatically) */
    autoApplyThreshold: number;
    /** Maximum alternatives to generate */
    maxAlternatives: number;
    /** Enable detailed reasoning explanations */
    enableExplanations: boolean;
  };

  /** Performance and resource management */
  performance: {
    /** Enable result caching */
    enableCache: boolean;
    /** Cache TTL in milliseconds */
    cacheTTL: number;
    /** Maximum concurrent analyses */
    maxConcurrentAnalyses: number;
    /** Enable performance metrics collection */
    enableMetrics: boolean;
  };

  /** Integration settings */
  integration: {
    /** Enable storage integration for learning */
    enableStorage: boolean;
    /** Storage connection configuration */
    storageConfig?: {
      host: string;
      port: number;
      database: string;
    };
    /** Enable webhook notifications */
    enableWebhooks: boolean;
    /** Webhook endpoints for notifications */
    webhookUrls?: string[];
  };
}

/**
 * Result of a Continuity Cortex analysis
 */
export interface CortexAnalysisResult {
  /** The file that triggered the analysis */
  targetFile: FileInfo;
  /** File operation event that triggered analysis */
  triggeringEvent: FileOperationEvent;
  /** Similarity analysis results */
  similarities: BatchSimilarityResult;
  /** Decision recommendation */
  recommendation: Recommendation;
  /** Analysis metadata */
  metadata: {
    /** Timestamp when analysis started */
    startTime: Date;
    /** Timestamp when analysis completed */
    endTime: Date;
    /** Total processing time in milliseconds */
    processingTimeMs: number;
    /** Components involved in analysis */
    componentsUsed: string[];
    /** Whether analysis was cached */
    fromCache: boolean;
    /** Performance metrics */
    metrics?: CortexMetrics;
  };
}

/**
 * Recommendation from the Continuity Cortex
 */
export interface CortexRecommendation {
  /** Primary recommended action */
  action: 'create' | 'update' | 'merge' | 'warn' | 'ignore';
  /** Target file for the action (if applicable) */
  targetFile?: string;
  /** Confidence in the recommendation (0.0-1.0) */
  confidence: number;
  /** Human-readable explanation */
  reason: string;
  /** Detailed reasoning steps */
  reasoningSteps: string[];
  /** Alternative actions with their confidence scores */
  alternatives: Array<{
    action: string;
    confidence: number;
    reason: string;
    targetFile?: string;
  }>;
  /** Whether this can be auto-applied */
  autoApply: boolean;
  /** Supporting data */
  supportingData: {
    /** Best similarity match */
    bestMatch?: SimilarityResult;
    /** All potential duplicates found */
    potentialDuplicates: SimilarityResult[];
    /** Applied decision rules */
    appliedRules: string[];
  };
}

/**
 * Performance metrics for Cortex operations
 */
export interface CortexMetrics {
  /** File operation interception metrics */
  interception: {
    /** Number of events processed */
    eventsProcessed: number;
    /** Average event processing time */
    avgEventProcessingTime: number;
    /** Number of events ignored */
    eventsIgnored: number;
  };

  /** Similarity analysis metrics */
  analysis: {
    /** Number of analyses performed */
    analysesPerformed: number;
    /** Average analysis time */
    avgAnalysisTime: number;
    /** Cache hit rate */
    cacheHitRate: number;
    /** Number of timeouts */
    timeouts: number;
  };

  /** Decision engine metrics */
  decisions: {
    /** Number of recommendations generated */
    recommendationsGenerated: number;
    /** Average decision time */
    avgDecisionTime: number;
    /** Number of auto-applied recommendations */
    autoApplied: number;
    /** Number of user interventions required */
    userInterventions: number;
  };

  /** Resource usage metrics */
  resources: {
    /** Peak memory usage in bytes */
    peakMemoryUsage: number;
    /** Average CPU usage percentage */
    avgCpuUsage: number;
    /** Disk I/O operations */
    diskOperations: number;
  };
}

/**
 * Status information for the Cortex system
 */
export interface CortexStatus {
  /** Overall system status */
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  /** Individual component statuses */
  components: {
    interceptor: 'running' | 'stopped' | 'error';
    analyzer: 'running' | 'stopped' | 'error';
    decisionEngine: 'running' | 'stopped' | 'error';
    storage?: 'connected' | 'disconnected' | 'error';
  };
  /** Current configuration */
  config: CortexConfig;
  /** Runtime metrics */
  metrics?: CortexMetrics;
  /** Last error (if any) */
  lastError?: {
    message: string;
    timestamp: Date;
    component: string;
    code: string;
  };
  /** Uptime in milliseconds */
  uptimeMs: number;
  /** Files currently being monitored */
  monitoredPaths: string[];
  /** Active analyses */
  activeAnalyses: number;
}

/**
 * Event listener for Cortex operations
 */
export interface CortexEventListener {
  /** Called when a file operation is detected */
  onFileOperation?(event: FileOperationEvent): void;
  /** Called when similarity analysis begins */
  onAnalysisStart?(file: FileInfo): void;
  /** Called when similarity analysis completes */
  onAnalysisComplete?(result: CortexAnalysisResult): void;
  /** Called when a recommendation is generated */
  onRecommendation?(recommendation: CortexRecommendation): void;
  /** Called when an error occurs */
  onError?(error: CortexError): void;
  /** Called when system status changes */
  onStatusChange?(status: CortexStatus): void;
}

/**
 * Main interface for the Continuity Cortex orchestrator
 */
export interface ContinuityCortex {
  /**
   * Start the Continuity Cortex system
   */
  start(): Promise<void>;

  /**
   * Stop the Continuity Cortex system
   */
  stop(): Promise<void>;

  /**
   * Analyze a specific file operation
   */
  analyzeFileOperation(fileInfo: FileInfo): Promise<CortexAnalysisResult>;

  /**
   * Get current system status
   */
  getStatus(): CortexStatus;

  /**
   * Update system configuration
   */
  updateConfig(config: Partial<CortexConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): CortexConfig;

  /**
   * Add event listener
   */
  addEventListener(listener: CortexEventListener): void;

  /**
   * Remove event listener
   */
  removeEventListener(listener: CortexEventListener): void;

  /**
   * Get performance metrics
   */
  getMetrics(): CortexMetrics;

  /**
   * Clear caches and reset state
   */
  reset(): Promise<void>;

  /**
   * Enable/disable monitoring for specific paths
   */
  setMonitoringEnabled(enabled: boolean, paths?: string[]): void;
}

/**
 * Default configuration for Continuity Cortex
 */
export const DEFAULT_CORTEX_CONFIG: CortexConfig = {
  monitoring: {
    watchPaths: [process.cwd()],
    ignorePatterns: [
      'node_modules/**',
      '.git/**',
      '*.log',
      '.DS_Store',
      'dist/**',
      'build/**'
    ],
    debounceMs: 300,
    maxFileSize: 1024 * 1024, // 1MB
    enabledOperations: ['create', 'write', 'move', 'delete']
  },
  analysis: {
    enabled: true,
    similarityThreshold: 0.7,
    confidenceThreshold: 0.6,
    maxComparisonFiles: 100,
    analysisTimeoutMs: 5000
  },
  decisions: {
    enabled: true,
    autoApplyThreshold: 0.9,
    maxAlternatives: 3,
    enableExplanations: true
  },
  performance: {
    enableCache: true,
    cacheTTL: 300000, // 5 minutes
    maxConcurrentAnalyses: 3,
    enableMetrics: true
  },
  integration: {
    enableStorage: false,
    enableWebhooks: false
  }
};

/**
 * Error types for Cortex operations
 */
export class CortexError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly component: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CortexError';
  }
}

export class CortexConfigError extends CortexError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', 'cortex', cause);
    this.name = 'CortexConfigError';
  }
}

export class CortexStartupError extends CortexError {
  constructor(message: string, component: string, cause?: Error) {
    super(message, 'STARTUP_ERROR', component, cause);
    this.name = 'CortexStartupError';
  }
}

export class CortexAnalysisError extends CortexError {
  constructor(message: string, public readonly filePath: string, cause?: Error) {
    super(message, 'ANALYSIS_ERROR', 'analyzer', cause);
    this.name = 'CortexAnalysisError';
  }
}

export class CortexTimeoutError extends CortexError {
  constructor(message: string, public readonly timeoutMs: number, cause?: Error) {
    super(message, 'TIMEOUT_ERROR', 'cortex', cause);
    this.name = 'CortexTimeoutError';
  }
}