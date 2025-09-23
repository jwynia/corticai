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
} from './types';

import { FilenameAnalyzer } from './layers/FilenameAnalyzer';
import { StructureAnalyzer } from './layers/StructureAnalyzer';
import { SemanticAnalyzer } from './layers/SemanticAnalyzer';
import { generateCacheKey } from './utils';

export class SimilarityAnalyzer {
  private config: SimilarityConfig;
  private cache: Map<string, CacheEntry>;
  private layers: {
    filename: FilenameAnalyzer;
    structure: StructureAnalyzer;
    semantic: SemanticAnalyzer;
  };

  constructor(config?: SimilarityConfig) {
    this.config = config || DEFAULT_SIMILARITY_CONFIG;
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
      s => s.overallScore >= this.config.similarityThreshold &&
           s.confidence >= this.config.confidenceThreshold
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
   * Update configuration
   */
  updateConfig(config: SimilarityConfig): void {
    this.config = config;
    this.clearCache(); // Clear cache when config changes
  }

  /**
   * Get current configuration
   */
  getConfig(): SimilarityConfig {
    return this.config;
  }

  /**
   * Compute similarity between two files
   */
  private async computeSimilarity(file1: FileInfo, file2: FileInfo): Promise<SimilarityResult> {
    const startTime = Date.now();

    // Check for identical files
    if (file1.path === file2.path || (file1.content && file1.content === file2.content)) {
      return {
        sourceFile: file1.path,
        targetFile: file2.path,
        overallScore: 1.0,
        layerScores: {
          filename: 1.0,
          structure: 1.0,
          semantic: 1.0,
        },
        confidence: 1.0,
        details: {
          similarities: ['Identical files'],
        },
        analysisTime: Date.now() - startTime,
      };
    }

    // Get weights for this file type
    const weights = this.getWeights(file1.metadata.extension, file2.metadata.extension);

    // Run analysis layers
    const layerScores = {
      filename: await this.layers.filename.analyze(file1, file2),
      structure: await this.layers.structure.analyze(file1, file2),
      semantic: await this.layers.semantic.analyze(file1, file2),
    };

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore(layerScores, weights);

    // Calculate confidence based on various factors
    const confidence = this.calculateConfidence(file1, file2, layerScores, overallScore);

    // Merge details from all layers
    const details = this.mergeDetails();

    const analysisTime = Date.now() - startTime;

    // Ensure analysis time doesn't exceed limit
    if (analysisTime > this.config.performance.maxAnalysisTime) {
      console.warn(`Analysis took ${analysisTime}ms, exceeding limit of ${this.config.performance.maxAnalysisTime}ms`);
    }

    return {
      sourceFile: file1.path,
      targetFile: file2.path,
      overallScore,
      layerScores,
      confidence,
      details,
      analysisTime,
    };
  }

  /**
   * Get weights for file type combination
   */
  private getWeights(ext1: string, ext2: string): typeof DEFAULT_SIMILARITY_CONFIG.layerWeights {
    // Check for file type specific settings
    const settings1 = this.config.fileTypeSettings?.[ext1];
    const settings2 = this.config.fileTypeSettings?.[ext2];

    // If both have settings and are same type, use those weights
    if (settings1?.weights && ext1 === ext2) {
      return { ...this.config.layerWeights, ...settings1.weights };
    }

    // Otherwise use default weights
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

    // Empty files have low confidence
    if ((file1.content && file1.content.trim() === '') || (file2.content && file2.content.trim() === '')) {
      confidence *= 0.3;
    }

    // Very small files have lower confidence
    const avgSize = (file1.metadata.size + file2.metadata.size) / 2;
    if (avgSize < 50) {
      confidence *= 0.5;
    } else if (avgSize < 200) {
      confidence *= 0.8;
    }

    // High variance in layer scores reduces confidence
    const scores = [layerScores.filename, layerScores.structure, layerScores.semantic];
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    if (variance > 0.2) {
      confidence *= 0.8;
    }

    // Different file extensions reduce confidence slightly
    if (file1.metadata.extension !== file2.metadata.extension) {
      confidence *= 0.9;
    }

    return Math.max(0, Math.min(1, confidence));
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
      throw new Error('Invalid file input: file is null or undefined');
    }

    if (!file.path || typeof file.path !== 'string') {
      throw new Error('Invalid file structure: missing or invalid path');
    }

    if (!file.metadata || typeof file.metadata !== 'object') {
      throw new Error('Invalid file structure: missing or invalid metadata');
    }

    if (!file.metadata.extension || typeof file.metadata.extension !== 'string') {
      throw new Error('Invalid file structure: missing or invalid extension in metadata');
    }

    if (typeof file.metadata.size !== 'number') {
      throw new Error('Invalid file structure: missing or invalid size in metadata');
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
}