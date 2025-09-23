/**
 * Configuration management for FileDecisionEngine
 */

import {
  DecisionThresholds,
  DecisionRules,
  FileDecisionEngineConfig,
  DEFAULT_CONFIG,
  ConfigurationError
} from './types.js';

/**
 * Configuration manager for FileDecisionEngine
 */
export class ConfigurationManager {
  private config: FileDecisionEngineConfig;

  constructor(initialConfig?: Partial<FileDecisionEngineConfig>) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, initialConfig || {});
    this.validateConfiguration(this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): FileDecisionEngineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FileDecisionEngineConfig>): void {
    const mergedConfig = this.mergeConfig(this.config, newConfig);
    this.validateConfiguration(mergedConfig);
    this.config = mergedConfig;
  }

  /**
   * Update decision thresholds
   */
  updateThresholds(thresholds: Partial<DecisionThresholds>): void {
    const newThresholds = { ...this.config.thresholds, ...thresholds };
    this.validateThresholds(newThresholds);
    this.config.thresholds = newThresholds;
  }

  /**
   * Update decision rules
   */
  updateRules(rules: Partial<DecisionRules>): void {
    const newRules = this.mergeRules(this.config.rules, rules);
    this.validateRules(newRules);
    this.config.rules = newRules;
  }

  /**
   * Get thresholds for a specific file type
   */
  getThresholdsForFile(filePath: string): DecisionThresholds {
    const extension = this.getFileExtension(filePath);
    return this.config.rules.fileTypeRules[extension] || this.config.rules.defaultRules;
  }

  /**
   * Merge configurations deeply
   */
  private mergeConfig(
    base: FileDecisionEngineConfig,
    override: Partial<FileDecisionEngineConfig>
  ): FileDecisionEngineConfig {
    return {
      rules: override.rules ? this.mergeRules(base.rules, override.rules) : base.rules,
      thresholds: override.thresholds ? { ...base.thresholds, ...override.thresholds } : base.thresholds,
      performance: override.performance ? { ...base.performance, ...override.performance } : base.performance
    };
  }

  /**
   * Merge decision rules
   */
  private mergeRules(base: DecisionRules, override: Partial<DecisionRules>): DecisionRules {
    return {
      fileTypeRules: override.fileTypeRules ?
        { ...base.fileTypeRules, ...override.fileTypeRules } :
        base.fileTypeRules,
      defaultRules: override.defaultRules ?
        { ...base.defaultRules, ...override.defaultRules } :
        base.defaultRules,
      weights: override.weights ?
        { ...base.weights, ...override.weights } :
        base.weights
    };
  }

  /**
   * Validate complete configuration
   */
  private validateConfiguration(config: FileDecisionEngineConfig): void {
    this.validateThresholds(config.thresholds);
    this.validateRules(config.rules);
    this.validatePerformanceSettings(config.performance);
  }

  /**
   * Validate decision thresholds
   */
  private validateThresholds(thresholds: DecisionThresholds): void {
    // Check range constraints
    const values = Object.entries(thresholds);
    for (const [key, value] of values) {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new ConfigurationError(`${key} must be between 0.0 and 1.0, got ${value}`);
      }
    }

    // Check logical constraints
    if (thresholds.mergeThreshold < thresholds.updateThreshold) {
      throw new ConfigurationError(
        'Configuration conflict: merge threshold must be >= update threshold'
      );
    }

    if (thresholds.updateThreshold < thresholds.createThreshold) {
      throw new ConfigurationError(
        'Configuration conflict: update threshold must be >= create threshold'
      );
    }

    if (thresholds.autoApplyThreshold < thresholds.mergeThreshold) {
      throw new ConfigurationError(
        'Configuration conflict: auto-apply threshold should be >= merge threshold'
      );
    }
  }

  /**
   * Validate decision rules
   */
  private validateRules(rules: DecisionRules): void {
    // Validate default rules
    this.validateThresholds(rules.defaultRules);

    // Validate file type rules
    for (const [fileType, thresholds] of Object.entries(rules.fileTypeRules)) {
      if (!fileType.startsWith('.')) {
        throw new ConfigurationError(`File type '${fileType}' must start with a dot`);
      }
      this.validateThresholds(thresholds);
    }

    // Validate weights
    const weights = rules.weights;
    const weightSum = weights.filenameWeight + weights.structureWeight +
                     weights.semanticWeight + weights.contentWeight;

    if (Math.abs(weightSum - 1.0) > 0.001) {
      throw new ConfigurationError(
        `Weights must sum to 1.0, got ${weightSum.toFixed(3)}`
      );
    }

    // Check individual weight ranges
    for (const [key, value] of Object.entries(weights)) {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new ConfigurationError(`Weight ${key} must be between 0.0 and 1.0, got ${value}`);
      }
    }
  }

  /**
   * Validate performance settings
   */
  private validatePerformanceSettings(performance: FileDecisionEngineConfig['performance']): void {
    if (performance.maxDecisionTimeMs <= 0) {
      throw new ConfigurationError('maxDecisionTimeMs must be positive');
    }

    if (performance.maxAlternatives < 0) {
      throw new ConfigurationError('maxAlternatives must be non-negative');
    }

    if (performance.maxDecisionTimeMs > 600000) { // 10 minutes
      throw new ConfigurationError('maxDecisionTimeMs should not exceed 600000ms (10 minutes)');
    }
  }

  /**
   * Extract file extension from path
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot === -1 ? '' : filePath.slice(lastDot);
  }
}