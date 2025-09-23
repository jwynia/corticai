/**
 * Type definitions for FileDecisionEngine
 *
 * This module defines interfaces and types for making automated decisions
 * about file operations based on similarity analysis results.
 */

import { FileInfo, SimilarityResult } from '../analyzers/types.js';

/**
 * Decision thresholds for different actions
 */
export interface DecisionThresholds {
  /** Score above which to recommend merge */
  mergeThreshold: number;
  /** Score above which to recommend update */
  updateThreshold: number;
  /** Score below which to recommend create */
  createThreshold: number;
  /** Confidence threshold for auto-apply */
  autoApplyThreshold: number;
}

/**
 * Decision rules configuration
 */
export interface DecisionRules {
  /** Rules for different file types */
  fileTypeRules: Record<string, DecisionThresholds>;
  /** Global fallback rules */
  defaultRules: DecisionThresholds;
  /** Weight factors for different similarity aspects */
  weights: {
    filenameWeight: number;
    structureWeight: number;
    semanticWeight: number;
    contentWeight: number;
  };
}

/**
 * Alternative action suggestion
 */
export interface Alternative {
  /** Alternative action that could be taken */
  action: 'create' | 'update' | 'merge' | 'warn' | 'ignore';
  /** Target file for the alternative (if applicable) */
  targetFile?: string;
  /** Confidence in this alternative */
  confidence: number;
  /** Reason for suggesting this alternative */
  reason: string;
}

/**
 * Decision recommendation result
 */
export interface Recommendation {
  /** Primary recommended action */
  action: 'create' | 'update' | 'merge' | 'warn';
  /** Target file for merge/update actions */
  targetFile?: string;
  /** Confidence in the recommendation (0.0-1.0) */
  confidence: number;
  /** Human-readable reasoning for the recommendation */
  reasoning: string;
  /** Alternative actions that could be taken */
  alternatives: Alternative[];
  /** Whether this recommendation can be auto-applied */
  autoApply: boolean;
  /** Additional metadata about the decision */
  metadata: {
    /** Timestamp when recommendation was generated */
    timestamp: Date;
    /** Processing time in milliseconds */
    processingTimeMs: number;
    /** Rules that were applied */
    appliedRules: string[];
    /** Similarity results used in decision */
    similarityInputs: SimilarityResult[];
  };
}

/**
 * Configuration for FileDecisionEngine
 */
export interface FileDecisionEngineConfig {
  /** Decision rules configuration */
  rules: DecisionRules;
  /** Decision thresholds */
  thresholds: DecisionThresholds;
  /** Performance settings */
  performance: {
    maxDecisionTimeMs: number;
    enableExplanations: boolean;
    maxAlternatives: number;
  };
}

/**
 * Main interface for file decision engine
 */
export interface FileDecisionEngine {
  /**
   * Generate a recommendation for a new file based on similarity results
   */
  generateRecommendation(
    newFile: FileInfo,
    similarities: SimilarityResult[]
  ): Promise<Recommendation>;

  /**
   * Update decision thresholds
   */
  updateThresholds(thresholds: Partial<DecisionThresholds>): void;

  /**
   * Update decision rules
   */
  updateRules(rules: Partial<DecisionRules>): void;

  /**
   * Get current configuration
   */
  getConfig(): FileDecisionEngineConfig;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FileDecisionEngineConfig>): void;
}

/**
 * Default decision thresholds
 */
export const DEFAULT_THRESHOLDS: DecisionThresholds = {
  mergeThreshold: 0.85,
  updateThreshold: 0.7,
  createThreshold: 0.3,
  autoApplyThreshold: 0.9
};

/**
 * Default decision rules
 */
export const DEFAULT_RULES: DecisionRules = {
  fileTypeRules: {
    '.ts': {
      mergeThreshold: 0.9,
      updateThreshold: 0.75,
      createThreshold: 0.25,
      autoApplyThreshold: 0.95
    },
    '.md': {
      mergeThreshold: 0.8,
      updateThreshold: 0.6,
      createThreshold: 0.4,
      autoApplyThreshold: 0.85
    }
  },
  defaultRules: DEFAULT_THRESHOLDS,
  weights: {
    filenameWeight: 0.2,
    structureWeight: 0.3,
    semanticWeight: 0.3,
    contentWeight: 0.2
  }
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: FileDecisionEngineConfig = {
  rules: DEFAULT_RULES,
  thresholds: DEFAULT_THRESHOLDS,
  performance: {
    maxDecisionTimeMs: 1000,
    enableExplanations: true,
    maxAlternatives: 3
  }
};

/**
 * Error types for decision engine
 */
export class DecisionEngineError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DecisionEngineError';
  }
}

export class ConfigurationError extends DecisionEngineError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends DecisionEngineError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends DecisionEngineError {
  constructor(message: string, public readonly timeoutMs: number, cause?: Error) {
    super(message, 'TIMEOUT_ERROR', cause);
    this.name = 'TimeoutError';
  }
}