/**
 * FileDecisionEngine - Main implementation
 *
 * Analyzes file similarity results and generates recommendations for file operations.
 * Integrates with SimilarityAnalyzer to complete the Continuity Cortex decision pipeline.
 */

import * as path from 'path';
import {
  FileDecisionEngine as IFileDecisionEngine,
  DecisionThresholds,
  DecisionRules,
  Recommendation,
  FileDecisionEngineConfig,
  ValidationError,
  TimeoutError
} from './types.js';
import { FileInfo, SimilarityResult } from '../analyzers/types.js';
import { ConfigurationManager } from './config.js';
import { RuleEngine } from './rules.js';

/**
 * Implementation of FileDecisionEngine
 */
export class FileDecisionEngine implements IFileDecisionEngine {
  private configManager: ConfigurationManager;
  private ruleEngine: RuleEngine;

  constructor(config?: Partial<FileDecisionEngineConfig>) {
    this.configManager = new ConfigurationManager(config);
    this.ruleEngine = new RuleEngine();
  }

  /**
   * Generate recommendation for a new file based on similarity results
   */
  async generateRecommendation(
    newFile: FileInfo,
    similarities: SimilarityResult[]
  ): Promise<Recommendation> {
    const startTime = Date.now();
    const config = this.configManager.getConfig();

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(
          `Decision timeout: exceeded ${config.performance.maxDecisionTimeMs}ms limit`,
          config.performance.maxDecisionTimeMs
        ));
      }, config.performance.maxDecisionTimeMs);
    });

    // Create decision promise
    const decisionPromise = this.makeDecision(newFile, similarities);

    try {
      // Race between decision and timeout
      const result = await Promise.race([decisionPromise, timeoutPromise]);
      const endTime = Date.now();
      result.metadata.processingTimeMs = endTime - startTime;
      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      throw new ValidationError(
        `Decision generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update decision thresholds
   */
  updateThresholds(thresholds: Partial<DecisionThresholds>): void {
    this.configManager.updateThresholds(thresholds);
  }

  /**
   * Update decision rules
   */
  updateRules(rules: Partial<DecisionRules>): void {
    this.configManager.updateRules(rules);
  }

  /**
   * Get current configuration
   */
  getConfig(): FileDecisionEngineConfig {
    return this.configManager.getConfig();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FileDecisionEngineConfig>): void {
    this.configManager.updateConfig(config);
  }

  /**
   * Core decision making logic
   */
  private async makeDecision(
    newFile: FileInfo,
    similarities: SimilarityResult[]
  ): Promise<Recommendation> {
    // Validate inputs
    this.validateInputs(newFile, similarities);

    const config = this.configManager.getConfig();
    const thresholds = this.configManager.getThresholdsForFile(newFile.path);

    // Sort similarities by score (highest first)
    const sortedSimilarities = [...similarities].sort((a, b) => b.overallScore - a.overallScore);

    // Apply rules to determine primary action
    const { action, confidence, targetFile } = this.ruleEngine.applyRules(
      newFile,
      sortedSimilarities,
      thresholds,
      config.rules
    );

    // Generate alternatives
    const alternatives = this.ruleEngine.generateAlternatives(
      action,
      sortedSimilarities,
      confidence,
      config.performance.maxAlternatives
    );

    // Use overall score for reasoning
    const overallScore = sortedSimilarities.length > 0 ?
      sortedSimilarities[0].overallScore :
      0;

    // Determine applied rules
    const appliedRules = this.ruleEngine.getAppliedRules(
      newFile,
      thresholds,
      config.rules.defaultRules
    );

    // Generate reasoning
    const reasoning = this.ruleEngine.generateReasoning(
      action,
      newFile,
      sortedSimilarities,
      overallScore,
      appliedRules
    );

    // Determine auto-apply eligibility
    const autoApply = confidence >= thresholds.autoApplyThreshold;

    return {
      action,
      targetFile,
      confidence,
      reasoning,
      alternatives,
      autoApply,
      metadata: {
        timestamp: new Date(),
        processingTimeMs: 0, // Will be set by caller
        appliedRules,
        similarityInputs: sortedSimilarities
      }
    };
  }

  /**
   * Validate inputs before processing
   */
  private validateInputs(newFile: FileInfo, similarities: SimilarityResult[]): void {
    // Validate newFile
    if (!newFile) {
      throw new ValidationError('newFile is required');
    }

    if (!newFile.path || typeof newFile.path !== 'string') {
      throw new ValidationError('Invalid file path');
    }

    if (newFile.path.trim() === '') {
      throw new ValidationError('File path cannot be empty');
    }

    // Validate similarities array
    if (!Array.isArray(similarities)) {
      throw new ValidationError('similarities must be an array');
    }

    // Validate individual similarity results
    for (let i = 0; i < similarities.length; i++) {
      const similarity = similarities[i];
      if (!similarity) {
        throw new ValidationError(`similarity at index ${i} is null or undefined`);
      }

      if (typeof similarity.overallScore !== 'number' || isNaN(similarity.overallScore)) {
        throw new ValidationError('Invalid similarity data: overallScore must be a valid number');
      }

      if (typeof similarity.overallConfidence !== 'number' ||
          similarity.overallConfidence < 0 || similarity.overallConfidence > 1) {
        throw new ValidationError('Invalid similarity data: overallConfidence must be between 0 and 1');
      }

      if (!similarity.layers) {
        throw new ValidationError('Invalid similarity data: layers is required');
      }

      if (!similarity.metadata) {
        throw new ValidationError('Invalid similarity data: metadata is required');
      }
    }
  }

}

// Export the class as default
export default FileDecisionEngine;