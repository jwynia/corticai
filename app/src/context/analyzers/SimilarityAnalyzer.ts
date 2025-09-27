/**
 * Main similarity analyzer that orchestrates multiple analysis layers
 */

import {
  FileInfo,
  SimilarityResult,
  BatchSimilarityResult,
  SimilarityConfig,
  DEFAULT_SIMILARITY_CONFIG,
  CacheEntry,
  SimilarityDetails,
  SimilarityConfigError,
  SimilarityRecommendation,
  SimilarityAnalysisTimeoutError,
  SimilarityAnalysisError,
} from './types';

import { FilenameAnalyzer } from './layers/FilenameAnalyzer';
import { StructureAnalyzer } from './layers/StructureAnalyzer';
import { SemanticAnalyzer } from './layers/SemanticAnalyzer';
import { generateCacheKey } from './utils';
import { Logger } from '../../utils/Logger';

export class SimilarityAnalyzer {
  private config: SimilarityConfig;
  private cache: Map<string, CacheEntry>;
  private logger: Logger;
  private layers: {
    filename: FilenameAnalyzer;
    structure: StructureAnalyzer;
    semantic: SemanticAnalyzer;
  };

  constructor(config?: SimilarityConfig) {
    this.logger = Logger.createConsoleLogger('SimilarityAnalyzer');
    this.config = config || DEFAULT_SIMILARITY_CONFIG;
    if (config) {
      this.validateConfig(config);
    }
    this.cache = new Map();
    this.layers = {
      filename: new FilenameAnalyzer(),
      structure: new StructureAnalyzer(),
      semantic: new SemanticAnalyzer(),
    };
  }

  /**
   * Analyze similarity between two files
   */
  async analyzeSimilarity(file1: FileInfo, file2: FileInfo): Promise<SimilarityResult> {
    // Validate inputs
    this.validateFile(file1);
    this.validateFile(file2);

    // Check cache if enabled
    const cacheKey = generateCacheKey(file1.path, file2.path);
    if (this.config.performance.enableCache) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Compute similarity
    const result = await this.computeSimilarity(file1, file2);

    // Cache result if enabled
    if (this.config.performance.enableCache) {
      this.cacheResult(cacheKey, result);
    }

    return result;
  }

  /**
   * Analyze a new file against multiple existing files
   */
  async analyzeBatch(
    newFile: FileInfo,
    existingFiles: FileInfo[]
  ): Promise<BatchSimilarityResult> {
    // Validate new file
    this.validateFile(newFile);

    // Validate all existing files
    for (let i = 0; i < existingFiles.length; i++) {
      if (!existingFiles[i]) {
        throw new Error(`Invalid file in batch at index ${i}`);
      }
      this.validateFile(existingFiles[i]);
    }

    const startTime = Date.now();
    const similarities: SimilarityResult[] = [];

    // Analyze against each existing file
    for (const existingFile of existingFiles) {
      const result = await this.analyzeSimilarity(newFile, existingFile);
      similarities.push(result);
    }

    // Sort by score descending
    similarities.sort((a, b) => b.overallScore - a.overallScore);

    // Find potential duplicates
    const potentialDuplicates = similarities.filter(
      s => s.overallScore >= this.config.thresholds.similar &&
           s.overallConfidence >= this.config.thresholds.similar
    );

    const totalAnalysisTime = Date.now() - startTime;

    return {
      newFile: newFile.path,
      similarities,
      bestMatch: similarities.length > 0 ? similarities[0] : undefined,
      potentialDuplicates,
      totalAnalysisTime,
    };
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Find similar files to a target file from a list of candidates
   */
  async findSimilarFiles(
    targetFile: FileInfo,
    candidateFiles: FileInfo[],
    minSimilarity?: number
  ): Promise<SimilarityResult[]> {
    // Analyze similarity with each candidate file
    const results: SimilarityResult[] = [];

    for (const candidate of candidateFiles) {
      const similarity = await this.analyzeSimilarity(targetFile, candidate);
      results.push(similarity);
    }

    // Filter by minimum similarity threshold if provided
    let filteredResults = results;
    if (minSimilarity !== undefined) {
      filteredResults = results.filter(result => result.overallScore >= minSimilarity);
    }

    // Sort by similarity score (descending)
    return filteredResults.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Update configuration
   */
  updateConfig(config: SimilarityConfig): void {
    this.validateConfig(config);
    this.config = { ...this.config, ...config };
    this.clearCache(); // Clear cache when config changes
  }

  /**
   * Get current configuration
   */
  getConfig(): SimilarityConfig {
    return this.config;
  }

  /**
   * Validate configuration for correctness
   */
  private validateConfig(config: Partial<SimilarityConfig>): void {
    if (config.layerWeights) {
      // Check for negative weights
      const weights = config.layerWeights;
      if (weights.filename < 0 || weights.structure < 0 || weights.semantic < 0 || weights.content < 0) {
        throw new SimilarityConfigError('Layer weights cannot be negative');
      }

      // Check if total weights exceed 1.0 (with small tolerance for floating point)
      const total = weights.filename + weights.structure + weights.semantic + weights.content;
      if (total > 1.01) { // Small tolerance for floating point precision
        throw new SimilarityConfigError('Total layer weights cannot exceed 1.0');
      }
    }

    if (config.thresholds) {
      const thresholds = config.thresholds;
      // Check if thresholds are within valid range [0, 1]
      if (thresholds.identical > 1 || thresholds.identical < 0 ||
          thresholds.similar > 1 || thresholds.similar < 0 ||
          thresholds.different > 1 || thresholds.different < 0) {
        throw new SimilarityConfigError('Thresholds must be between 0.0 and 1.0');
      }

      // Check threshold ordering: identical >= similar >= different
      if (thresholds.identical < thresholds.similar ||
          thresholds.similar < thresholds.different) {
        throw new SimilarityConfigError('Threshold order must be: identical >= similar >= different');
      }
    }
  }

  /**
   * Compute similarity between two files
   */
  private async computeSimilarity(file1: FileInfo, file2: FileInfo): Promise<SimilarityResult> {
    const startTime = Date.now();

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new SimilarityAnalysisTimeoutError(
          `Analysis timed out after ${this.config.performance.maxAnalysisTimeMs}ms`,
          this.config.performance.maxAnalysisTimeMs
        ));
      }, this.config.performance.maxAnalysisTimeMs);
    });

    // Create analysis promise
    const analysisPromise = this.performAnalysis(file1, file2, startTime);

    // Race between analysis and timeout
    return Promise.race([analysisPromise, timeoutPromise]);
  }

  /**
   * Perform the actual similarity analysis
   */
  private async performAnalysis(file1: FileInfo, file2: FileInfo, startTime: number): Promise<SimilarityResult> {

    // Check for identical files
    if (file1.path === file2.path || (file1.content && file1.content === file2.content)) {
      const recommendation = this.generateRecommendation(1.0, 1.0, file1.path, file2.path);
      return {
        overallScore: 1.0,
        overallConfidence: 1.0,
        layers: {
          filename: { score: 1.0, confidence: 1.0, explanation: 'Identical files' },
          structure: { score: 1.0, confidence: 1.0, explanation: 'Identical files' },
          semantic: { score: 1.0, confidence: 1.0, explanation: 'Identical files' }
        },
        recommendation,
        metadata: {
          analysisTime: new Date(startTime),
          processingTimeMs: Math.max(1, Date.now() - startTime), // Ensure at least 1ms
          algorithmsUsed: ['identical-check'],
          sourceFile: file1.path,
          targetFile: file2.path
        }
      };
    }

    // Get weights for this file type
    const weights = this.getWeights(file1.metadata.extension, file2.metadata.extension);

    // Run enabled analysis layers with error handling
    const layerResults = {
      filename: this.config.enabledLayers.filename
        ? await this.safeLayerAnalysis(() => this.layers.filename.analyze(file1, file2))
        : { score: 0, confidence: 0 },
      structure: this.config.enabledLayers.structure
        ? await this.safeLayerAnalysis(() => this.layers.structure.analyze(file1, file2))
        : { score: 0, confidence: 0 },
      semantic: this.config.enabledLayers.semantic
        ? await this.safeLayerAnalysis(() => this.layers.semantic.analyze(file1, file2))
        : { score: 0, confidence: 0 },
    };

    // Extract scores for overall calculation
    const layerScores = {
      filename: layerResults.filename.score,
      structure: layerResults.structure.score,
      semantic: layerResults.semantic.score,
    };

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore(layerScores, weights);

    // Calculate confidence based on various factors
    const confidence = this.calculateConfidence(file1, file2, layerScores, overallScore);

    // Merge details from all layers
    const details = this.mergeDetails();

    const analysisTime = Date.now() - startTime;

    // Ensure analysis time doesn't exceed limit
    if (analysisTime > this.config.performance.maxAnalysisTimeMs) {
      this.logger.warn(`Analysis took ${analysisTime}ms, exceeding limit of ${this.config.performance.maxAnalysisTimeMs}ms`);
    }

    // Generate recommendation based on scores
    const recommendation = this.generateRecommendation(overallScore, confidence, file1.path, file2.path);

    return {
      overallScore,
      overallConfidence: confidence,
      layers: {
        filename: {
          score: layerResults.filename.score,
          confidence: layerResults.filename.confidence,
          explanation: `Filename similarity analysis`
        },
        structure: {
          score: layerResults.structure.score,
          confidence: layerResults.structure.confidence,
          explanation: `Structure similarity analysis`
        },
        semantic: {
          score: layerResults.semantic.score,
          confidence: layerResults.semantic.confidence,
          explanation: `Semantic similarity analysis`
        }
      },
      recommendation,
      metadata: {
        analysisTime: new Date(startTime),
        processingTimeMs: Math.max(1, analysisTime), // Ensure at least 1ms
        algorithmsUsed: ['filename', 'structure', 'semantic'],
        sourceFile: file1.path,
        targetFile: file2.path
      }
    };
  }

  /**
   * Get weights for file type combination
   */
  private getWeights(ext1: string, ext2: string): typeof DEFAULT_SIMILARITY_CONFIG.layerWeights {
    // Use default weights for now - file type specific settings not implemented yet
    return this.config.layerWeights;
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(
    layerScores: { filename: number; structure: number; semantic: number },
    weights: typeof DEFAULT_SIMILARITY_CONFIG.layerWeights
  ): number {
    let score = 0;
    let totalWeight = 0;

    if (weights.filename !== undefined) {
      score += layerScores.filename * weights.filename;
      totalWeight += weights.filename;
    }

    if (weights.structure !== undefined) {
      score += layerScores.structure * weights.structure;
      totalWeight += weights.structure;
    }

    if (weights.semantic !== undefined) {
      score += layerScores.semantic * weights.semantic;
      totalWeight += weights.semantic;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Calculate confidence in the similarity assessment
   */
  private calculateConfidence(
    file1: FileInfo,
    file2: FileInfo,
    layerScores: { filename: number; structure: number; semantic: number },
    overallScore: number
  ): number {
    let confidence = overallScore; // Start with overall score

    // Reduce confidence only for truly problematic cases
    // Empty files have low confidence
    if ((file1.content && file1.content.trim() === '') || (file2.content && file2.content.trim() === '')) {
      confidence *= 0.7; // Less penalty
    }

    // Very small files have slightly lower confidence
    const avgSize = (file1.metadata.size + file2.metadata.size) / 2;
    if (avgSize < 20) { // Only for very tiny files
      confidence *= 0.8;
    }

    // High confidence for high overall scores
    if (overallScore > 0.8) {
      confidence = Math.max(confidence, 0.8);
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Merge details from all analysis layers
   */
  private mergeDetails(): SimilarityDetails {
    const details: SimilarityDetails = {};

    const filenameDetails = this.layers.filename.getDetails();
    const structureDetails = this.layers.structure.getDetails();
    const semanticDetails = this.layers.semantic.getDetails();

    if (filenameDetails.filenamePatterns) {
      details.filenamePatterns = filenameDetails.filenamePatterns;
    }

    if (structureDetails.commonStructures) {
      details.commonStructures = structureDetails.commonStructures;
    }

    if (semanticDetails.sharedKeywords) {
      details.sharedKeywords = semanticDetails.sharedKeywords;
    }

    // Add high-level similarities
    details.similarities = this.identifySimilarities(details);

    // Add differences
    details.differences = this.identifyDifferences(details);

    return details;
  }

  /**
   * Identify key similarities from details
   */
  private identifySimilarities(details: SimilarityDetails): string[] {
    const similarities: string[] = [];

    if (details.filenamePatterns?.includes('version_pattern')) {
      similarities.push('Files appear to be different versions');
    }

    if (details.filenamePatterns?.includes('backup_pattern')) {
      similarities.push('One file appears to be a backup of the other');
    }

    if (details.commonStructures && details.commonStructures.length > 5) {
      similarities.push(`Share ${details.commonStructures.length} structural elements`);
    }

    if (details.sharedKeywords && details.sharedKeywords.length > 10) {
      similarities.push(`Share ${details.sharedKeywords.length} semantic keywords`);
    }

    return similarities;
  }

  /**
   * Identify key differences from details
   */
  private identifyDifferences(details: SimilarityDetails): string[] {
    const differences: string[] = [];

    // This would be enhanced with actual difference detection
    // For now, return empty array

    return differences;
  }

  /**
   * Validate file input
   */
  private validateFile(file: any): void {
    if (!file) {
      throw new SimilarityAnalysisError('Invalid file input: file is null or undefined', 'INVALID_FILE');
    }

    if (!file.path || typeof file.path !== 'string') {
      throw new SimilarityAnalysisError('Invalid file structure: missing or invalid path', 'INVALID_FILE');
    }

    if (!file.metadata || typeof file.metadata !== 'object') {
      throw new SimilarityAnalysisError('Invalid file structure: missing or invalid metadata', 'INVALID_FILE');
    }

    if (!file.metadata.extension || typeof file.metadata.extension !== 'string') {
      throw new SimilarityAnalysisError('Invalid file structure: missing or invalid extension in metadata', 'INVALID_FILE');
    }

    if (typeof file.metadata.size !== 'number') {
      throw new SimilarityAnalysisError('Invalid file structure: missing or invalid size in metadata', 'INVALID_FILE');
    }
  }

  /**
   * Get cached result if valid
   */
  private getCached(key: string): SimilarityResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache is still valid
    if (this.config.performance.cacheTTL && age > this.config.performance.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache a result
   */
  private cacheResult(key: string, result: SimilarityResult): void {
    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
    });

    // Limit cache size to prevent memory issues
    if (this.cache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 100 entries
      for (let i = 0; i < 100; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Safely run layer analysis with error handling
   */
  private async safeLayerAnalysis(analysisFunction: () => Promise<number>): Promise<{ score: number; confidence: number }> {
    try {
      const score = await analysisFunction();
      return { score, confidence: 1.0 }; // Successful analysis has full confidence
    } catch (error) {
      this.logger.warn('Layer analysis failed, returning 0', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { score: 0, confidence: 0 }; // Failed analysis has no confidence
    }
  }

  /**
   * Generate recommendation based on similarity score and confidence
   */
  private generateRecommendation(
    overallScore: number,
    confidence: number,
    sourceFile: string,
    targetFile: string
  ): SimilarityRecommendation {
    const thresholds = this.config.thresholds;

    if (overallScore >= thresholds.identical) {
      return {
        action: 'duplicate',
        confidence: confidence,
        reason: `Files are highly similar (${(overallScore * 100).toFixed(1)}%). Consider if one is a duplicate.`,
        suggestedSteps: ['Review files for potential consolidation', 'Check if one can be removed'],
        involvedFiles: [sourceFile, targetFile]
      };
    } else if (overallScore >= thresholds.similar) {
      return {
        action: 'merge',
        confidence: confidence,
        reason: `Files have significant similarity (${(overallScore * 100).toFixed(1)}%). Consider merging common functionality.`,
        suggestedSteps: ['Extract common code into shared module', 'Refactor to reduce duplication'],
        involvedFiles: [sourceFile, targetFile]
      };
    } else if (overallScore > thresholds.different) {
      return {
        action: 'review',
        confidence: confidence,
        reason: `Files have moderate similarity (${(overallScore * 100).toFixed(1)}%). Review for potential improvements.`,
        suggestedSteps: ['Check for naming consistency', 'Look for common patterns'],
        involvedFiles: [sourceFile, targetFile]
      };
    } else {
      return {
        action: 'create',
        confidence: confidence,
        reason: `Files are sufficiently different (${(overallScore * 100).toFixed(1)}%). Safe to create new file.`,
        suggestedSteps: ['Proceed with file creation'],
        involvedFiles: [sourceFile, targetFile]
      };
    }
  }
}