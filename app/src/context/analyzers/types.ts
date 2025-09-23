/**
 * Type definitions for the Similarity Analysis system
 *
 * This module defines the interfaces and types used for analyzing
 * file similarity across multiple layers: filename, structure, semantic, and content.
 * Integrates with the FileOperationInterceptor foundation.
 */

import { FileOperationEvent, FileMetadata } from '../interceptors/types.js';

/**
 * Information about a file for similarity analysis
 */
export interface FileInfo {
  /** Full path to the file */
  path: string;

  /** File content (if available and readable) */
  content?: string;

  /** SHA-256 hash of content for caching */
  contentHash?: string;

  /** File metadata from interceptor */
  metadata: FileMetadata;

  /** File operation event that triggered analysis (if applicable) */
  event?: FileOperationEvent;
}

/**
 * Similarity score for a single analysis layer
 */
export interface LayerSimilarityScore {
  /** Numerical similarity score (0.0 = no similarity, 1.0 = identical) */
  score: number;

  /** Confidence in the similarity score (0.0 = low confidence, 1.0 = high confidence) */
  confidence: number;

  /** Detailed breakdown of what contributed to the score */
  breakdown?: Record<string, number>;

  /** Human-readable explanation of the similarity */
  explanation?: string;
}

/**
 * Combined similarity result from all analysis layers
 */
export interface SimilarityResult {
  /** Overall similarity score (weighted combination of all layers) */
  overallScore: number;

  /** Overall confidence level */
  overallConfidence: number;

  /** Scores from individual analysis layers */
  layers: {
    filename: LayerSimilarityScore;
    structure: LayerSimilarityScore;
    semantic: LayerSimilarityScore;
    content?: LayerSimilarityScore;
  };

  /** Recommended action based on similarity */
  recommendation: SimilarityRecommendation;

  /** Analysis metadata */
  metadata: {
    analysisTime: Date;
    processingTimeMs: number;
    algorithmsUsed: string[];
    sourceFile: string;
    targetFile: string;
  };
}

/**
 * Recommended action based on similarity analysis
 */
export interface SimilarityRecommendation {
  /** Type of recommendation */
  action: 'create' | 'merge' | 'update' | 'duplicate' | 'review';

  /** Confidence in the recommendation (0.0 = low, 1.0 = high) */
  confidence: number;

  /** Human-readable reason for the recommendation */
  reason: string;

  /** Suggested next steps */
  suggestedSteps?: string[];

  /** Files involved in the recommendation */
  involvedFiles: string[];
}

/**
 * Individual scores from different analysis layers
 */
export interface LayerScores {
  /** Filename similarity score (0.0 to 1.0) */
  filename: number;
  /** Document structure similarity score (0.0 to 1.0) */
  structure: number;
  /** Semantic content similarity score (0.0 to 1.0) */
  semantic: number;
  /** Raw content similarity score (0.0 to 1.0) */
  content?: number;
}

/**
 * Detailed similarity analysis information
 */
export interface SimilarityDetails {
  /** Shared keywords between files */
  sharedKeywords?: string[];
  /** Common structural elements */
  commonStructures?: string[];
  /** Filename pattern matches */
  filenamePatterns?: string[];
  /** Specific similarities found */
  similarities?: string[];
  /** Specific differences found */
  differences?: string[];
}

/**
 * Result of batch similarity analysis
 */
export interface BatchSimilarityResult {
  /** The new file being analyzed */
  newFile: string;
  /** All similarity results sorted by score */
  similarities: SimilarityResult[];
  /** Most similar file if any */
  bestMatch?: SimilarityResult;
  /** Files above the similarity threshold */
  potentialDuplicates: SimilarityResult[];
  /** Total analysis time in milliseconds */
  totalAnalysisTime: number;
}

/**
 * Configuration for similarity analysis
 */
export interface SimilarityConfig {
  /** Weights for combining different layer scores */
  layerWeights: {
    filename: number;
    structure: number;
    semantic: number;
    content: number;
  };

  /** Thresholds for determining similarity levels */
  thresholds: {
    identical: number;    // > this = considered identical
    similar: number;      // > this = considered similar
    different: number;    // <= this = considered different
  };

  /** Maximum content size to analyze (in bytes) */
  maxContentSize: number;

  /** Enable/disable specific analysis layers */
  enabledLayers: {
    filename: boolean;
    structure: boolean;
    semantic: boolean;
    content: boolean;
  };

  /** Algorithm-specific configurations */
  algorithms: {
    filename: {
      enableLevenshtein: boolean;
      enableSoundex: boolean;
      enableNgrams: boolean;
    };
    structure: {
      enableLineCount: boolean;
      enableFunctionSignatures: boolean;
      enableImportAnalysis: boolean;
    };
    semantic: {
      enableKeywordExtraction: boolean;
      enableTopicModeling: boolean;
      enableCommentAnalysis: boolean;
    };
    content: {
      enableDiffAnalysis: boolean;
      enableHashComparison: boolean;
      enableSyntaxTreeComparison: boolean;
    };
  };

  /** Performance settings */
  performance: {
    maxAnalysisTimeMs: number;
    enableCache: boolean;
    cacheTTL: number;
  };
}

/**
 * Interface for individual analysis layers
 */
export interface SimilarityLayer {
  /**
   * Analyze similarity between two files
   */
  analyze(file1: FileInfo, file2: FileInfo): Promise<LayerSimilarityScore>;

  /**
   * Get the name of this analysis layer
   */
  getName(): string;

  /**
   * Check if this layer can analyze the given file types
   */
  canAnalyze(file1: FileInfo, file2: FileInfo): boolean;
}

/**
 * Main interface for the similarity analyzer
 */
export interface SimilarityAnalyzer {
  /**
   * Analyze similarity between two files using all enabled layers
   */
  analyzeSimilarity(file1: FileInfo, file2: FileInfo): Promise<SimilarityResult>;

  /**
   * Find similar files to a target file from a list of candidates
   */
  findSimilarFiles(
    targetFile: FileInfo,
    candidateFiles: FileInfo[],
    minSimilarity?: number
  ): Promise<SimilarityResult[]>;

  /**
   * Update the analyzer configuration
   */
  updateConfig(config: Partial<SimilarityConfig>): void;

  /**
   * Get the current configuration
   */
  getConfig(): SimilarityConfig;
}

/**
 * Cache entry for similarity analysis
 */
export interface CacheEntry {
  /** Cache key (hash of file paths) */
  key: string;
  /** Cached result */
  result: SimilarityResult;
  /** Timestamp when cached */
  timestamp: number;
}

/**
 * Default configuration for similarity analysis
 */
export const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  layerWeights: {
    filename: 0.2,
    structure: 0.3,
    semantic: 0.3,
    content: 0.2
  },
  thresholds: {
    identical: 0.95,
    similar: 0.7,
    different: 0.3
  },
  maxContentSize: 1024 * 1024, // 1MB
  enabledLayers: {
    filename: true,
    structure: true,
    semantic: true,
    content: true
  },
  algorithms: {
    filename: {
      enableLevenshtein: true,
      enableSoundex: true,
      enableNgrams: true
    },
    structure: {
      enableLineCount: true,
      enableFunctionSignatures: true,
      enableImportAnalysis: true
    },
    semantic: {
      enableKeywordExtraction: true,
      enableTopicModeling: false, // Computationally expensive
      enableCommentAnalysis: true
    },
    content: {
      enableDiffAnalysis: true,
      enableHashComparison: true,
      enableSyntaxTreeComparison: false // Computationally expensive
    }
  },
  performance: {
    maxAnalysisTimeMs: 5000, // 5 seconds
    enableCache: true,
    cacheTTL: 300000 // 5 minutes
  }
};

/**
 * Error types for similarity analysis
 */
export class SimilarityAnalysisError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: Error) {
    super(message);
    this.name = 'SimilarityAnalysisError';
  }
}

export class SimilarityConfigError extends SimilarityAnalysisError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause);
    this.name = 'SimilarityConfigError';
  }
}

export class SimilarityLayerError extends SimilarityAnalysisError {
  constructor(message: string, public readonly layerName: string, cause?: Error) {
    super(message, 'LAYER_ERROR', cause);
    this.name = 'SimilarityLayerError';
  }
}

export class SimilarityAnalysisTimeoutError extends SimilarityAnalysisError {
  constructor(message: string, public readonly timeoutMs: number, cause?: Error) {
    super(message, 'TIMEOUT_ERROR', cause);
    this.name = 'SimilarityAnalysisTimeoutError';
  }
}