/**
 * Types for the Continuity Cortex Similarity Analysis System
 */

/**
 * File information for similarity analysis
 */
export interface FileInfo {
  /** Absolute path to the file */
  path: string;
  /** File name with extension */
  name: string;
  /** File extension (e.g., '.ts', '.md') */
  extension: string;
  /** File content as string */
  content: string;
  /** File size in bytes */
  size: number;
  /** File creation timestamp */
  createdAt?: Date;
  /** File modification timestamp */
  modifiedAt?: Date;
  /** MIME type if known */
  mimeType?: string;
}

/**
 * Result of similarity analysis between two files
 */
export interface SimilarityResult {
  /** Source file that was analyzed */
  sourceFile: string;
  /** Target file that was compared against */
  targetFile: string;
  /** Overall similarity score (0.0 to 1.0) */
  overallScore: number;
  /** Individual layer scores */
  layerScores: LayerScores;
  /** Confidence in the similarity assessment (0.0 to 1.0) */
  confidence: number;
  /** Detailed analysis results */
  details: SimilarityDetails;
  /** Time taken for analysis in milliseconds */
  analysisTime: number;
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
  /** Weights for combining layer scores */
  layerWeights: {
    filename: number;
    structure: number;
    semantic: number;
    content?: number;
  };
  /** Minimum similarity threshold for considering files similar */
  similarityThreshold: number;
  /** Minimum confidence threshold for recommendations */
  confidenceThreshold: number;
  /** Performance settings */
  performance: {
    /** Maximum analysis time per file in milliseconds */
    maxAnalysisTime: number;
    /** Enable caching of analysis results */
    enableCache: boolean;
    /** Cache TTL in milliseconds */
    cacheTTL?: number;
  };
  /** File type specific settings */
  fileTypeSettings?: {
    [extension: string]: {
      /** Custom weights for this file type */
      weights?: Partial<SimilarityConfig['layerWeights']>;
      /** Ignore certain analysis layers */
      ignoreLayers?: Array<keyof LayerScores>;
    };
  };
}

/**
 * Interface for individual analysis layers
 */
export interface AnalysisLayer {
  /** Name of the analysis layer */
  name: string;
  /** Analyze similarity between two files */
  analyze(file1: FileInfo, file2: FileInfo): Promise<number>;
  /** Get detailed analysis information */
  getDetails?(): SimilarityDetails;
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
 * Default configuration values
 */
export const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  layerWeights: {
    filename: 0.25,
    structure: 0.35,
    semantic: 0.40,
  },
  similarityThreshold: 0.70,
  confidenceThreshold: 0.60,
  performance: {
    maxAnalysisTime: 100,
    enableCache: true,
    cacheTTL: 300000, // 5 minutes
  },
};