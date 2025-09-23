/**
 * Configuration management for Continuity Cortex
 *
 * Provides centralized configuration management with validation,
 * defaults, and runtime updates.
 */

import { CortexConfig, DEFAULT_CORTEX_CONFIG, CortexConfigError } from './types.js';
import { DEFAULT_SIMILARITY_CONFIG } from '../analyzers/types.js';
import { DEFAULT_CONFIG as DEFAULT_DECISION_CONFIG } from '../engines/types.js';
import { DEFAULT_INTERCEPTOR_CONFIG } from '../interceptors/types.js';

/**
 * Configuration manager for Continuity Cortex
 */
export class CortexConfigManager {
  private config: CortexConfig;
  private readonly defaultConfig: CortexConfig;

  constructor(initialConfig?: Partial<CortexConfig>) {
    this.defaultConfig = { ...DEFAULT_CORTEX_CONFIG };
    this.config = this.createConfig(initialConfig);
  }

  /**
   * Get the current configuration
   */
  getConfig(): CortexConfig {
    return JSON.parse(JSON.stringify(this.config)); // Deep clone
  }

  /**
   * Update configuration with partial changes
   */
  updateConfig(updates: Partial<CortexConfig>): void {
    this.validatePartialConfig(updates);
    this.config = this.mergeConfig(this.config, updates);
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Get configuration for a specific component
   */
  getInterceptorConfig() {
    return {
      watchPaths: this.config.monitoring.watchPaths,
      ignorePatterns: this.config.monitoring.ignorePatterns,
      debounceMs: this.config.monitoring.debounceMs,
      maxFileSize: this.config.monitoring.maxFileSize,
      enabledOperations: this.config.monitoring.enabledOperations
    };
  }

  /**
   * Get configuration for similarity analyzer
   */
  getSimilarityConfig() {
    return {
      ...DEFAULT_SIMILARITY_CONFIG,
      similarityThreshold: this.config.analysis.similarityThreshold,
      confidenceThreshold: this.config.analysis.confidenceThreshold,
      performance: {
        ...DEFAULT_SIMILARITY_CONFIG.performance,
        maxAnalysisTime: this.config.analysis.analysisTimeoutMs,
        enableCache: this.config.performance.enableCache,
        cacheTTL: this.config.performance.cacheTTL
      }
    };
  }

  /**
   * Get configuration for decision engine
   */
  getDecisionEngineConfig() {
    return {
      ...DEFAULT_DECISION_CONFIG,
      thresholds: {
        ...DEFAULT_DECISION_CONFIG.thresholds,
        autoApplyThreshold: this.config.decisions.autoApplyThreshold
      },
      performance: {
        ...DEFAULT_DECISION_CONFIG.performance,
        maxAlternatives: this.config.decisions.maxAlternatives,
        enableExplanations: this.config.decisions.enableExplanations
      }
    };
  }

  /**
   * Validate a complete configuration object
   */
  validateConfig(config: CortexConfig): void {
    this.validateMonitoringConfig(config.monitoring);
    this.validateAnalysisConfig(config.analysis);
    this.validateDecisionConfig(config.decisions);
    this.validatePerformanceConfig(config.performance);
    this.validateIntegrationConfig(config.integration);
  }

  /**
   * Create a full configuration from partial input
   */
  private createConfig(partial?: Partial<CortexConfig>): CortexConfig {
    const config = this.mergeConfig(this.defaultConfig, partial || {});
    this.validateConfig(config);
    return config;
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(base: CortexConfig, updates: Partial<CortexConfig>): CortexConfig {
    const merged = JSON.parse(JSON.stringify(base)); // Deep clone

    if (updates.monitoring) {
      merged.monitoring = { ...merged.monitoring, ...updates.monitoring };
    }

    if (updates.analysis) {
      merged.analysis = { ...merged.analysis, ...updates.analysis };
    }

    if (updates.decisions) {
      merged.decisions = { ...merged.decisions, ...updates.decisions };
    }

    if (updates.performance) {
      merged.performance = { ...merged.performance, ...updates.performance };
    }

    if (updates.integration) {
      merged.integration = { ...merged.integration, ...updates.integration };
    }

    return merged;
  }

  /**
   * Validate partial configuration updates
   */
  private validatePartialConfig(partial: Partial<CortexConfig>): void {
    if (partial.monitoring) {
      this.validateMonitoringConfig(partial.monitoring as CortexConfig['monitoring']);
    }

    if (partial.analysis) {
      this.validateAnalysisConfig(partial.analysis as CortexConfig['analysis']);
    }

    if (partial.decisions) {
      this.validateDecisionConfig(partial.decisions as CortexConfig['decisions']);
    }

    if (partial.performance) {
      this.validatePerformanceConfig(partial.performance as CortexConfig['performance']);
    }

    if (partial.integration) {
      this.validateIntegrationConfig(partial.integration as CortexConfig['integration']);
    }
  }

  /**
   * Validate monitoring configuration
   */
  private validateMonitoringConfig(monitoring: CortexConfig['monitoring']): void {
    if (!Array.isArray(monitoring.watchPaths) || monitoring.watchPaths.length === 0) {
      throw new CortexConfigError('watchPaths must be a non-empty array');
    }

    for (const path of monitoring.watchPaths) {
      if (typeof path !== 'string' || path.trim() === '') {
        throw new CortexConfigError('All watch paths must be non-empty strings');
      }
    }

    if (!Array.isArray(monitoring.ignorePatterns)) {
      throw new CortexConfigError('ignorePatterns must be an array');
    }

    if (typeof monitoring.debounceMs !== 'number' || monitoring.debounceMs < 0) {
      throw new CortexConfigError('debounceMs must be a non-negative number');
    }

    if (typeof monitoring.maxFileSize !== 'number' || monitoring.maxFileSize <= 0) {
      throw new CortexConfigError('maxFileSize must be a positive number');
    }

    if (!Array.isArray(monitoring.enabledOperations) || monitoring.enabledOperations.length === 0) {
      throw new CortexConfigError('enabledOperations must be a non-empty array');
    }

    const validOperations = ['create', 'write', 'move', 'delete'];
    for (const operation of monitoring.enabledOperations) {
      if (!validOperations.includes(operation)) {
        throw new CortexConfigError(`Invalid operation: ${operation}`);
      }
    }
  }

  /**
   * Validate analysis configuration
   */
  private validateAnalysisConfig(analysis: CortexConfig['analysis']): void {
    if (typeof analysis.enabled !== 'boolean') {
      throw new CortexConfigError('analysis.enabled must be a boolean');
    }

    if (typeof analysis.similarityThreshold !== 'number' ||
        analysis.similarityThreshold < 0 || analysis.similarityThreshold > 1) {
      throw new CortexConfigError('similarityThreshold must be between 0 and 1');
    }

    if (typeof analysis.confidenceThreshold !== 'number' ||
        analysis.confidenceThreshold < 0 || analysis.confidenceThreshold > 1) {
      throw new CortexConfigError('confidenceThreshold must be between 0 and 1');
    }

    if (typeof analysis.maxComparisonFiles !== 'number' || analysis.maxComparisonFiles < 1) {
      throw new CortexConfigError('maxComparisonFiles must be a positive number');
    }

    if (typeof analysis.analysisTimeoutMs !== 'number' || analysis.analysisTimeoutMs <= 0) {
      throw new CortexConfigError('analysisTimeoutMs must be a positive number');
    }
  }

  /**
   * Validate decision configuration
   */
  private validateDecisionConfig(decisions: CortexConfig['decisions']): void {
    if (typeof decisions.enabled !== 'boolean') {
      throw new CortexConfigError('decisions.enabled must be a boolean');
    }

    if (typeof decisions.autoApplyThreshold !== 'number' ||
        decisions.autoApplyThreshold < 0 || decisions.autoApplyThreshold > 1) {
      throw new CortexConfigError('autoApplyThreshold must be between 0 and 1');
    }

    if (typeof decisions.maxAlternatives !== 'number' || decisions.maxAlternatives < 0) {
      throw new CortexConfigError('maxAlternatives must be a non-negative number');
    }

    if (typeof decisions.enableExplanations !== 'boolean') {
      throw new CortexConfigError('enableExplanations must be a boolean');
    }
  }

  /**
   * Validate performance configuration
   */
  private validatePerformanceConfig(performance: CortexConfig['performance']): void {
    if (typeof performance.enableCache !== 'boolean') {
      throw new CortexConfigError('enableCache must be a boolean');
    }

    if (typeof performance.cacheTTL !== 'number' || performance.cacheTTL < 0) {
      throw new CortexConfigError('cacheTTL must be a non-negative number');
    }

    if (typeof performance.maxConcurrentAnalyses !== 'number' || performance.maxConcurrentAnalyses < 1) {
      throw new CortexConfigError('maxConcurrentAnalyses must be a positive number');
    }

    if (typeof performance.enableMetrics !== 'boolean') {
      throw new CortexConfigError('enableMetrics must be a boolean');
    }
  }

  /**
   * Validate integration configuration
   */
  private validateIntegrationConfig(integration: CortexConfig['integration']): void {
    if (typeof integration.enableStorage !== 'boolean') {
      throw new CortexConfigError('enableStorage must be a boolean');
    }

    if (typeof integration.enableWebhooks !== 'boolean') {
      throw new CortexConfigError('enableWebhooks must be a boolean');
    }

    if (integration.storageConfig) {
      const storage = integration.storageConfig;
      if (typeof storage.host !== 'string' || storage.host.trim() === '') {
        throw new CortexConfigError('storageConfig.host must be a non-empty string');
      }

      if (typeof storage.port !== 'number' || storage.port < 1 || storage.port > 65535) {
        throw new CortexConfigError('storageConfig.port must be a valid port number');
      }

      if (typeof storage.database !== 'string' || storage.database.trim() === '') {
        throw new CortexConfigError('storageConfig.database must be a non-empty string');
      }
    }

    if (integration.webhookUrls) {
      if (!Array.isArray(integration.webhookUrls)) {
        throw new CortexConfigError('webhookUrls must be an array');
      }

      for (const url of integration.webhookUrls) {
        if (typeof url !== 'string' || url.trim() === '') {
          throw new CortexConfigError('All webhook URLs must be non-empty strings');
        }

        try {
          new URL(url);
        } catch (error) {
          throw new CortexConfigError(`Invalid webhook URL: ${url}`);
        }
      }
    }
  }

  /**
   * Export configuration to JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(json: string): void {
    try {
      const config = JSON.parse(json) as CortexConfig;
      this.validateConfig(config);
      this.config = config;
    } catch (error) {
      if (error instanceof CortexConfigError) {
        throw error;
      }
      throw new CortexConfigError(
        `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get configuration schema for validation
   */
  static getConfigSchema() {
    return {
      type: 'object',
      properties: {
        monitoring: {
          type: 'object',
          properties: {
            watchPaths: { type: 'array', items: { type: 'string' } },
            ignorePatterns: { type: 'array', items: { type: 'string' } },
            debounceMs: { type: 'number', minimum: 0 },
            maxFileSize: { type: 'number', minimum: 1 },
            enabledOperations: {
              type: 'array',
              items: { enum: ['create', 'write', 'move', 'delete'] }
            }
          },
          required: ['watchPaths', 'ignorePatterns', 'debounceMs', 'maxFileSize', 'enabledOperations']
        },
        analysis: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            similarityThreshold: { type: 'number', minimum: 0, maximum: 1 },
            confidenceThreshold: { type: 'number', minimum: 0, maximum: 1 },
            maxComparisonFiles: { type: 'number', minimum: 1 },
            analysisTimeoutMs: { type: 'number', minimum: 1 }
          },
          required: ['enabled', 'similarityThreshold', 'confidenceThreshold', 'maxComparisonFiles', 'analysisTimeoutMs']
        },
        decisions: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            autoApplyThreshold: { type: 'number', minimum: 0, maximum: 1 },
            maxAlternatives: { type: 'number', minimum: 0 },
            enableExplanations: { type: 'boolean' }
          },
          required: ['enabled', 'autoApplyThreshold', 'maxAlternatives', 'enableExplanations']
        },
        performance: {
          type: 'object',
          properties: {
            enableCache: { type: 'boolean' },
            cacheTTL: { type: 'number', minimum: 0 },
            maxConcurrentAnalyses: { type: 'number', minimum: 1 },
            enableMetrics: { type: 'boolean' }
          },
          required: ['enableCache', 'cacheTTL', 'maxConcurrentAnalyses', 'enableMetrics']
        },
        integration: {
          type: 'object',
          properties: {
            enableStorage: { type: 'boolean' },
            enableWebhooks: { type: 'boolean' },
            storageConfig: {
              type: 'object',
              properties: {
                host: { type: 'string' },
                port: { type: 'number', minimum: 1, maximum: 65535 },
                database: { type: 'string' }
              }
            },
            webhookUrls: {
              type: 'array',
              items: { type: 'string', format: 'uri' }
            }
          },
          required: ['enableStorage', 'enableWebhooks']
        }
      },
      required: ['monitoring', 'analysis', 'decisions', 'performance', 'integration']
    };
  }
}