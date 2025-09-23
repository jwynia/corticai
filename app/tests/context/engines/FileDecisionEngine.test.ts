/**
 * Comprehensive test suite for FileDecisionEngine
 *
 * This test suite follows test-driven development principles:
 * - Tests define the expected behavior before implementation
 * - Coverage includes happy path, edge cases, and error conditions
 * - Tests serve as documentation of the API contract
 * - Integration with existing SimilarityAnalyzer types
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import types from SimilarityAnalyzer
import {
  FileInfo,
  SimilarityResult,
  LayerSimilarityScore,
  SimilarityRecommendation
} from '../../../src/context/analyzers/types.js';

// Define FileDecisionEngine types (these will be implemented later)
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

// Import the real implementation
import { FileDecisionEngine as FileDecisionEngineImpl } from '../../../src/context/engines/FileDecisionEngine.js';

describe('FileDecisionEngine', () => {
  let engine: FileDecisionEngine;
  let tempDir: string;

  // Test data constants
  const DEFAULT_THRESHOLDS: DecisionThresholds = {
    mergeThreshold: 0.85,
    updateThreshold: 0.7,
    createThreshold: 0.3,
    autoApplyThreshold: 0.9
  };

  const DEFAULT_RULES: DecisionRules = {
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

  // Helper functions
  const createFileInfo = (
    filePath: string,
    content?: string,
    options?: Partial<FileInfo>
  ): FileInfo => ({
    path: filePath,
    content,
    contentHash: content ? 'hash-' + content.length : undefined,
    metadata: {
      size: content?.length || 0,
      extension: path.extname(filePath),
      mimeType: 'text/plain',
      lastModified: new Date(),
      ...options?.metadata
    },
    ...options
  });

  const createSimilarityResult = (
    overallScore: number,
    confidence: number = 0.8,
    sourceFile: string = '/test/source.ts',
    targetFile: string = '/test/target.ts'
  ): SimilarityResult => ({
    overallScore,
    overallConfidence: confidence,
    layers: {
      filename: { score: overallScore * 0.9, confidence, explanation: 'Filename similarity' },
      structure: { score: overallScore * 0.8, confidence, explanation: 'Structure similarity' },
      semantic: { score: overallScore * 0.7, confidence, explanation: 'Semantic similarity' }
    },
    recommendation: {
      action: overallScore > 0.8 ? 'merge' : overallScore > 0.5 ? 'update' : 'create',
      confidence,
      reason: `Score: ${overallScore}`,
      involvedFiles: [sourceFile, targetFile]
    },
    metadata: {
      analysisTime: new Date(),
      processingTimeMs: 50,
      algorithmsUsed: ['filename', 'structure', 'semantic'],
      sourceFile,
      targetFile
    }
  });

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'decision-engine-test-'));

    // Create real engine instance
    engine = new FileDecisionEngineImpl();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Configuration Management', () => {
    it('should initialize with default configuration', () => {
      // Act
      const config = engine.getConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.rules).toBeDefined();
      expect(config.thresholds).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.thresholds.mergeThreshold).toBe(DEFAULT_THRESHOLDS.mergeThreshold);
      expect(config.thresholds.updateThreshold).toBe(DEFAULT_THRESHOLDS.updateThreshold);
    });

    it('should update thresholds correctly', () => {
      // Arrange
      const newThresholds: Partial<DecisionThresholds> = {
        mergeThreshold: 0.9,
        updateThreshold: 0.75
      };

      // Act
      engine.updateThresholds(newThresholds);

      // Assert
      const config = engine.getConfig();
      expect(config.thresholds.mergeThreshold).toBe(0.9);
      expect(config.thresholds.updateThreshold).toBe(0.75);
    });

    it('should update rules correctly', () => {
      // Arrange
      const newRules: Partial<DecisionRules> = {
        weights: {
          filenameWeight: 0.3,
          structureWeight: 0.4,
          semanticWeight: 0.2,
          contentWeight: 0.1
        }
      };

      // Act
      engine.updateRules(newRules);

      // Assert
      const config = engine.getConfig();
      expect(config.rules.weights.filenameWeight).toBe(0.3);
      expect(config.rules.weights.structureWeight).toBe(0.4);
      expect(config.rules.weights.semanticWeight).toBe(0.2);
      expect(config.rules.weights.contentWeight).toBe(0.1);
    });

    it('should validate threshold values', () => {
      // Arrange
      const invalidThresholds = {
        mergeThreshold: 1.5, // Invalid: > 1.0
        updateThreshold: -0.1 // Invalid: < 0.0
      };

      // Act & Assert
      expect(() => {
        engine.updateThresholds(invalidThresholds);
      }).toThrow(/must be between 0.0 and 1.0/);
    });

    it('should validate rule weights sum to 1.0', () => {
      // Arrange
      const invalidRules = {
        weights: {
          filenameWeight: 0.5,
          structureWeight: 0.3,
          semanticWeight: 0.3,
          contentWeight: 0.2 // Sum = 1.3 > 1.0
        }
      };

      // Act & Assert
      expect(() => {
        engine.updateRules(invalidRules);
      }).toThrow(/Weights must sum to 1.0/);
    });
  });

  describe('generateRecommendation() - Core Functionality', () => {
    beforeEach(() => {
      // Setup default mock behavior
      mockImplementation.generateRecommendation.mockImplementation(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const bestMatch = similarities.length > 0 ? similarities[0] : null;
          const score = bestMatch?.overallScore || 0;
          const ext = path.extname(newFile.path);
          const filename = path.basename(newFile.path);

          let action: 'create' | 'update' | 'merge' | 'warn';
          let confidence = bestMatch?.overallConfidence || 0.5;
          let reasoning = `Based on similarity score ${score.toFixed(2)}`;
          let alternatives: Alternative[] = [];

          // Handle special cases
          if (!newFile.content && similarities.length > 0) {
            reasoning += ' with limited content available';
          }

          if (score >= 0.85) {
            action = 'merge';
            confidence = Math.min(confidence * 1.1, 1.0);
            // Generate alternatives for merge
            alternatives = [
              { action: 'update', confidence: confidence * 0.8, reason: 'Update instead of merge' },
              { action: 'create', confidence: confidence * 0.6, reason: 'Create new instead' }
            ];
          } else if (score >= 0.7) {
            action = 'update';
            // Generate alternatives for update
            alternatives = [
              { action: 'create', confidence: confidence * 0.8, reason: 'Create new instead of update' }
            ];
          } else if (score >= 0.3) {
            action = 'warn';
            confidence = confidence * 0.8;
          } else {
            action = 'create';
            confidence = confidence * 0.9;
          }

          // For create action with low similarity, don't set targetFile
          const targetFile = (action === 'create' && score < 0.3) ? undefined : bestMatch?.metadata.targetFile;

          return {
            action,
            targetFile,
            confidence,
            reasoning,
            alternatives,
            autoApply: confidence >= 0.9,
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 25,
              appliedRules: ['default'],
              similarityInputs: similarities
            }
          };
        }
      );
    });

    describe('High Confidence Similarity → Merge Recommendation', () => {
      it('should recommend merge for high similarity files', async () => {
        // Arrange
        const newFile = createFileInfo(
          path.join(tempDir, 'new-component.ts'),
          'export class NewComponent { render() { return "hello"; } }'
        );
        const similarities = [
          createSimilarityResult(0.92, 0.95, newFile.path, '/existing/component.ts')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('merge');
        expect(recommendation.confidence).toBeGreaterThan(0.8);
        expect(recommendation.targetFile).toBe('/existing/component.ts');
        expect(recommendation.reasoning).toContain('0.92');
        expect(recommendation.autoApply).toBe(true);
        expect(recommendation.metadata.similarityInputs).toEqual(similarities);
        expect(mockImplementation.generateRecommendation).toHaveBeenCalledWith(newFile, similarities);
      });

      it('should handle multiple high-confidence matches', async () => {
        // Arrange
        const newFile = createFileInfo(path.join(tempDir, 'util.ts'), 'utility functions');
        const similarities = [
          createSimilarityResult(0.91, 0.9, newFile.path, '/utils/helper.ts'),
          createSimilarityResult(0.88, 0.85, newFile.path, '/lib/utils.ts'),
          createSimilarityResult(0.86, 0.8, newFile.path, '/common/util.ts')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('merge');
        expect(recommendation.targetFile).toBe('/utils/helper.ts'); // Should pick highest scoring
        expect(recommendation.alternatives.length).toBeGreaterThan(0);
      });
    });

    describe('Medium Confidence → Update Recommendation', () => {
      it('should recommend update for medium similarity files', async () => {
        // Arrange
        const newFile = createFileInfo(
          path.join(tempDir, 'updated-config.json'),
          '{"version": "2.0", "settings": {}}'
        );
        const similarities = [
          createSimilarityResult(0.75, 0.8, newFile.path, '/config/app.json')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('update');
        expect(recommendation.confidence).toBeGreaterThan(0.6);
        expect(recommendation.targetFile).toBe('/config/app.json');
        expect(recommendation.autoApply).toBe(false); // Medium confidence shouldn't auto-apply
      });

      it('should suggest alternatives for update recommendations', async () => {
        // Arrange
        const newFile = createFileInfo(path.join(tempDir, 'style.css'), 'css styles');
        const similarities = [
          createSimilarityResult(0.72, 0.75, newFile.path, '/styles/main.css')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('update');
        expect(recommendation.alternatives).toBeDefined();
        // Should include create as alternative for update
        expect(recommendation.alternatives.some(alt => alt.action === 'create')).toBe(true);
      });
    });

    describe('Low Confidence → Create Recommendation', () => {
      it('should recommend create for low similarity files', async () => {
        // Arrange
        const newFile = createFileInfo(
          path.join(tempDir, 'novel-feature.ts'),
          'completely new functionality'
        );
        const similarities = [
          createSimilarityResult(0.25, 0.6, newFile.path, '/existing/old-feature.ts')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('create');
        expect(recommendation.targetFile).toBeUndefined();
        expect(recommendation.confidence).toBeGreaterThan(0);
        expect(recommendation.autoApply).toBe(false);
      });

      it('should handle no similarities found', async () => {
        // Arrange
        const newFile = createFileInfo(
          path.join(tempDir, 'unique.ts'),
          'completely unique content'
        );
        const similarities: SimilarityResult[] = [];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('create');
        expect(recommendation.confidence).toBeGreaterThan(0);
        expect(recommendation.reasoning).toBeTruthy();
      });
    });

    describe('Edge Cases', () => {
      it('should handle identical files (score = 1.0)', async () => {
        // Arrange
        const content = 'exact same content';
        const newFile = createFileInfo(path.join(tempDir, 'copy.ts'), content);
        const similarities = [
          createSimilarityResult(1.0, 1.0, newFile.path, '/original/file.ts')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('merge');
        expect(recommendation.confidence).toBe(1.0);
        expect(recommendation.autoApply).toBe(true);
      });

      it('should handle multiple files with same high scores', async () => {
        // Arrange
        const newFile = createFileInfo(path.join(tempDir, 'ambiguous.ts'), 'content');
        const similarities = [
          createSimilarityResult(0.89, 0.9, newFile.path, '/path1/file.ts'),
          createSimilarityResult(0.89, 0.9, newFile.path, '/path2/file.ts'),
          createSimilarityResult(0.89, 0.9, newFile.path, '/path3/file.ts')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation.action).toBe('merge');
        expect(recommendation.alternatives.length).toBeGreaterThan(0);
        // Should provide alternatives for other high-scoring matches
      });

      it('should handle files with missing content', async () => {
        // Arrange
        const newFile = createFileInfo(path.join(tempDir, 'no-content.ts')); // No content
        const similarities = [
          createSimilarityResult(0.5, 0.7, newFile.path, '/other/file.ts')
        ];

        // Act
        const recommendation = await engine.generateRecommendation(newFile, similarities);

        // Assert
        expect(recommendation).toBeDefined();
        expect(recommendation.reasoning).toContain('limited content');
      });
    });
  });

  describe('Rule Application Tests', () => {
    beforeEach(() => {
      // Reset to default mock for this section
      mockImplementation.generateRecommendation.mockImplementation(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const bestMatch = similarities.length > 0 ? similarities[0] : null;
          const score = bestMatch?.overallScore || 0;
          const ext = path.extname(newFile.path);

          let action: 'create' | 'update' | 'merge' | 'warn';
          let confidence = bestMatch?.overallConfidence || 0.5;

          if (score >= 0.85) {
            action = 'merge';
            confidence = Math.min(confidence * 1.1, 1.0);
          } else if (score >= 0.7) {
            action = 'update';
          } else {
            action = 'create';
          }

          return {
            action,
            targetFile: bestMatch?.metadata.targetFile,
            confidence,
            reasoning: `Applied ${ext} rules`,
            alternatives: [],
            autoApply: confidence >= 0.9,
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 25,
              appliedRules: [`${ext}-rules`],
              similarityInputs: similarities
            }
          };
        }
      );
    });

    it('should apply file-type specific rules', async () => {
      // Arrange
      const tsFile = createFileInfo(path.join(tempDir, 'code.ts'), 'typescript code');
      const mdFile = createFileInfo(path.join(tempDir, 'docs.md'), 'markdown content');

      const tsSimilarities = [createSimilarityResult(0.8, 0.85)];
      const mdSimilarities = [createSimilarityResult(0.8, 0.85)];

      // Mock different behavior for different file types
      mockImplementation.generateRecommendation.mockImplementation(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const ext = path.extname(newFile.path);
          const rules = ext === '.ts' ? DEFAULT_RULES.fileTypeRules['.ts'] :
                       ext === '.md' ? DEFAULT_RULES.fileTypeRules['.md'] :
                       DEFAULT_RULES.defaultRules;

          const score = similarities[0]?.overallScore || 0;
          let action: 'create' | 'update' | 'merge' | 'warn';

          if (score >= rules.mergeThreshold) action = 'merge';
          else if (score >= rules.updateThreshold) action = 'update';
          else action = 'create';

          return {
            action,
            confidence: 0.8,
            reasoning: `Applied ${ext} rules`,
            alternatives: [],
            autoApply: false,
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 10,
              appliedRules: [`${ext}-rules`],
              similarityInputs: similarities
            }
          };
        }
      );

      // Act
      const tsRecommendation = await engine.generateRecommendation(tsFile, tsSimilarities);
      const mdRecommendation = await engine.generateRecommendation(mdFile, mdSimilarities);

      // Assert
      expect(tsRecommendation.metadata.appliedRules).toContain('.ts-rules');
      expect(mdRecommendation.metadata.appliedRules).toContain('.md-rules');
      // With score 0.8, TS should require merge (threshold 0.9) but MD should merge (threshold 0.8)
      expect(tsRecommendation.action).toBe('update'); // 0.8 < 0.9 merge threshold
      expect(mdRecommendation.action).toBe('merge');  // 0.8 >= 0.8 merge threshold
    });

    it('should calculate confidence using rule weights', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'weighted.ts'), 'content');
      const similarities = [createSimilarityResult(0.8, 0.75)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle conflicting rules gracefully', async () => {
      // Arrange - Setup conflicting thresholds
      mockImplementation.updateThresholds.mockImplementation((thresholds: Partial<DecisionThresholds>) => {
        if (thresholds.mergeThreshold && thresholds.updateThreshold &&
            thresholds.mergeThreshold < thresholds.updateThreshold) {
          throw new Error('Configuration conflict: merge threshold must be >= update threshold');
        }
      });

      // Mock generateRecommendation to also detect conflicts
      mockImplementation.generateRecommendation.mockRejectedValue(
        new Error('Configuration conflict detected during recommendation generation')
      );

      const newFile = createFileInfo(path.join(tempDir, 'conflict.ts'), 'content');
      const similarities = [createSimilarityResult(0.7, 0.8)];

      // Act & Assert - Should throw when trying to set conflicting thresholds
      expect(() => {
        engine.updateThresholds({
          mergeThreshold: 0.6,
          updateThreshold: 0.8  // Invalid: update threshold > merge threshold
        });
      }).toThrow(/Configuration conflict/i);

      // Also test that recommendation generation would fail if somehow configured with conflicts
      await expect(engine.generateRecommendation(newFile, similarities))
        .rejects.toThrow(/threshold.*conflict|invalid.*configuration|Configuration conflict/i);
    });
  });

  describe('Alternative Suggestion Generation', () => {
    beforeEach(() => {
      // Mock implementation that generates alternatives
      mockImplementation.generateRecommendation.mockImplementation(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const score = similarities[0]?.overallScore || 0;
          const confidence = similarities[0]?.overallConfidence || 0.5;

          let action: 'create' | 'update' | 'merge' | 'warn';
          if (score >= 0.85) action = 'merge';
          else if (score >= 0.7) action = 'update';
          else action = 'create';

          const alternatives: Alternative[] = [];

          // Generate alternatives based on primary action
          if (action === 'merge') {
            alternatives.push(
              { action: 'update', confidence: confidence * 0.8, reason: 'Update instead of merge' },
              { action: 'create', confidence: confidence * 0.6, reason: 'Create new instead' }
            );
          } else if (action === 'update') {
            alternatives.push(
              { action: 'merge', confidence: confidence * 1.2, reason: 'Consider merge if confident' },
              { action: 'create', confidence: confidence * 0.7, reason: 'Create new if updates are complex' }
            );
          } else if (action === 'create') {
            if (similarities.length > 0) {
              alternatives.push(
                { action: 'update', confidence: confidence * 0.9, reason: 'Update most similar file' }
              );
            }
          }

          return {
            action,
            confidence,
            reasoning: `Primary action: ${action}`,
            alternatives,
            autoApply: confidence >= 0.9,
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 15,
              appliedRules: ['default'],
              similarityInputs: similarities
            }
          };
        }
      );
    });

    it('should generate alternatives for merge recommendations', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'merge-candidate.ts'), 'content');
      const similarities = [createSimilarityResult(0.9, 0.85)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('merge');
      expect(recommendation.alternatives).toHaveLength(2);
      expect(recommendation.alternatives.some(alt => alt.action === 'update')).toBe(true);
      expect(recommendation.alternatives.some(alt => alt.action === 'create')).toBe(true);
    });

    it('should generate alternatives for update recommendations', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'update-candidate.ts'), 'content');
      const similarities = [createSimilarityResult(0.75, 0.8)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.action).toBe('update');
      expect(recommendation.alternatives.length).toBeGreaterThan(0);
      expect(recommendation.alternatives.some(alt => alt.action === 'merge')).toBe(true);
      expect(recommendation.alternatives.some(alt => alt.action === 'create')).toBe(true);
    });

    it('should limit number of alternatives based on configuration', async () => {
      // Arrange
      engine.updateConfig({
        performance: { maxAlternatives: 2, maxDecisionTimeMs: 1000, enableExplanations: true }
      });

      const newFile = createFileInfo(path.join(tempDir, 'limited.ts'), 'content');
      const similarities = [createSimilarityResult(0.9, 0.85)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.alternatives.length).toBeLessThanOrEqual(2);
    });

    it('should rank alternatives by confidence', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'ranked.ts'), 'content');
      const similarities = [createSimilarityResult(0.75, 0.8)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      if (recommendation.alternatives.length > 1) {
        for (let i = 0; i < recommendation.alternatives.length - 1; i++) {
          expect(recommendation.alternatives[i].confidence)
            .toBeGreaterThanOrEqual(recommendation.alternatives[i + 1].confidence);
        }
      }
    });
  });

  describe('Integration with SimilarityAnalyzer Types', () => {
    beforeEach(() => {
      // Setup mock for integration tests
      mockImplementation.generateRecommendation.mockImplementation(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const bestMatch = similarities.length > 0 ? similarities[0] : null;
          const score = bestMatch?.overallScore || 0;

          return {
            action: score >= 0.85 ? 'merge' : 'update',
            targetFile: bestMatch?.metadata.targetFile,
            confidence: score,
            reasoning: 'Integration test result',
            alternatives: [],
            autoApply: false,
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 30,
              appliedRules: ['integration'],
              similarityInputs: similarities
            }
          };
        }
      );
    });

    it('should process SimilarityResult correctly', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'integration.ts'), 'content');
      const similarityResult: SimilarityResult = {
        overallScore: 0.85,
        overallConfidence: 0.9,
        layers: {
          filename: { score: 0.9, confidence: 0.95, explanation: 'High filename similarity' },
          structure: { score: 0.8, confidence: 0.85, explanation: 'Good structure match' },
          semantic: { score: 0.85, confidence: 0.9, explanation: 'Strong semantic similarity' }
        },
        recommendation: {
          action: 'merge',
          confidence: 0.9,
          reason: 'High overall similarity',
          involvedFiles: [newFile.path, '/target/file.ts']
        },
        metadata: {
          analysisTime: new Date(),
          processingTimeMs: 75,
          algorithmsUsed: ['filename', 'structure', 'semantic'],
          sourceFile: newFile.path,
          targetFile: '/target/file.ts'
        }
      };

      // Act
      const recommendation = await engine.generateRecommendation(newFile, [similarityResult]);

      // Assert
      expect(recommendation.metadata.similarityInputs).toContain(similarityResult);
      expect(recommendation.targetFile).toBe('/target/file.ts');
    });

    it('should handle multiple layer scores appropriately', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'multi-layer.ts'), 'content');
      const similarities = [
        createSimilarityResult(0.8, 0.85, newFile.path, '/high-structure.ts'),
        createSimilarityResult(0.7, 0.9, newFile.path, '/high-semantic.ts')
      ];

      // Modify layer scores to test different strengths
      similarities[0].layers.structure.score = 0.95;
      similarities[0].layers.semantic.score = 0.6;
      similarities[1].layers.structure.score = 0.5;
      similarities[1].layers.semantic.score = 0.95;

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation).toBeDefined();
      expect(recommendation.reasoning).toBeTruthy();
    });

    it('should preserve FileInfo metadata in decisions', async () => {
      // Arrange
      const newFile = createFileInfo(
        path.join(tempDir, 'metadata-test.ts'),
        'content with metadata',
        {
          metadata: {
            size: 1024,
            extension: '.ts',
            mimeType: 'text/typescript',
            lastModified: new Date('2023-01-01'),
            customProperty: 'test-value'
          }
        }
      );
      const similarities = [createSimilarityResult(0.8, 0.85)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(mockImplementation.generateRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          path: newFile.path,
          content: newFile.content,
          metadata: expect.objectContaining({
            extension: '.ts',
            mimeType: 'text/typescript'
          })
        }),
        similarities
      );
    });
  });

  describe('Performance Requirements', () => {
    beforeEach(() => {
      // Setup mock for performance tests
      mockImplementation.generateRecommendation.mockImplementation(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const score = similarities[0]?.overallScore || 0;
          return {
            action: 'create',
            confidence: 0.8,
            reasoning: 'Performance test',
            alternatives: [],
            autoApply: false,
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 20,
              appliedRules: ['performance'],
              similarityInputs: similarities
            }
          };
        }
      );
    });

    it('should complete recommendation generation within time limits', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'performance.ts'), 'content');
      const similarities = [createSimilarityResult(0.8, 0.85)];

      // Act
      const startTime = Date.now();
      const recommendation = await engine.generateRecommendation(newFile, similarities);
      const endTime = Date.now();

      // Assert
      const actualTime = endTime - startTime;
      expect(actualTime).toBeLessThan(1000); // Should complete within 1 second
      expect(recommendation.metadata.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle large number of similarity results efficiently', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'large-batch.ts'), 'content');
      const similarities = Array.from({ length: 100 }, (_, i) =>
        createSimilarityResult(0.5 + (i * 0.001), 0.8, newFile.path, `/file${i}.ts`)
      );

      // Act
      const startTime = Date.now();
      const recommendation = await engine.generateRecommendation(newFile, similarities);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(2000); // Should handle 100 results quickly
      expect(recommendation).toBeDefined();
    });

    it('should timeout long-running decision processes', async () => {
      // Arrange
      engine.updateConfig({
        performance: { maxDecisionTimeMs: 100, enableExplanations: true, maxAlternatives: 3 }
      });

      // Mock slow processing that times out
      mockImplementation.generateRecommendation.mockImplementation(
        () => new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Decision timeout: exceeded 100ms limit'));
          }, 150);
        })
      );

      const newFile = createFileInfo(path.join(tempDir, 'timeout.ts'), 'content');
      const similarities = [createSimilarityResult(0.8, 0.85)];

      // Act & Assert
      await expect(engine.generateRecommendation(newFile, similarities))
        .rejects.toThrow(/timeout|time.*limit/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file information', async () => {
      // Arrange
      const invalidFile = createFileInfo('', ''); // Empty path
      const similarities = [createSimilarityResult(0.8, 0.85)];

      // Mock error behavior
      mockImplementation.generateRecommendation.mockRejectedValue(
        new Error('Invalid file path')
      );

      // Act & Assert
      await expect(engine.generateRecommendation(invalidFile, similarities))
        .rejects.toThrow('Invalid file path');
    });

    it('should handle corrupted similarity results', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'test.ts'), 'content');
      const corruptedSimilarity = {
        overallScore: NaN, // Corrupted data
        overallConfidence: -1, // Invalid confidence
        layers: null,
        recommendation: undefined,
        metadata: null
      } as any;

      // Mock error handling
      mockImplementation.generateRecommendation.mockRejectedValue(
        new Error('Invalid similarity data')
      );

      // Act & Assert
      await expect(engine.generateRecommendation(newFile, [corruptedSimilarity]))
        .rejects.toThrow('Invalid similarity data');
    });

    it('should provide meaningful error messages', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'error-test.ts'), 'content');
      const similarities = [createSimilarityResult(0.8, 0.85)];

      mockImplementation.generateRecommendation.mockRejectedValue(
        new Error('Configuration validation failed: merge threshold must be greater than update threshold')
      );

      // Act & Assert
      try {
        await engine.generateRecommendation(newFile, similarities);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Configuration validation failed');
        expect(error.message).toContain('merge threshold');
      }
    });

    it('should handle memory constraints gracefully', async () => {
      // Arrange - Simulate memory pressure with very large input
      const newFile = createFileInfo(path.join(tempDir, 'memory-test.ts'), 'x'.repeat(100000));
      const similarities = Array.from({ length: 1000 }, (_, i) =>
        createSimilarityResult(0.5, 0.8, newFile.path, `/file${i}.ts`)
      );

      // Mock to return a valid recommendation for memory test
      mockImplementation.generateRecommendation.mockResolvedValueOnce({
        action: 'create',
        confidence: 0.7,
        reasoning: 'Memory constraint handling test',
        alternatives: [],
        autoApply: false,
        metadata: {
          timestamp: new Date(),
          processingTimeMs: 50,
          appliedRules: ['memory-test'],
          similarityInputs: similarities.slice(0, 10) // Truncated for memory efficiency
        }
      });

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert - Should complete without memory errors
      expect(recommendation).toBeDefined();
    });
  });

  describe('Auto-Apply Logic', () => {
    beforeEach(() => {
      // Setup mock for auto-apply tests
      mockImplementation.generateRecommendation.mockImplementation(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const score = similarities[0]?.overallScore || 0;
          const confidence = similarities[0]?.overallConfidence || 0.5;

          return {
            action: 'merge',
            confidence,
            reasoning: 'Auto-apply test',
            alternatives: [],
            autoApply: confidence >= 0.9,
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 15,
              appliedRules: ['auto-apply'],
              similarityInputs: similarities
            }
          };
        }
      );
    });

    it('should enable auto-apply for high confidence recommendations', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'auto-apply.ts'), 'content');
      const similarities = [createSimilarityResult(0.95, 0.98)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.autoApply).toBe(true);
      expect(recommendation.confidence).toBeGreaterThan(0.9);
    });

    it('should disable auto-apply for medium confidence recommendations', async () => {
      // Arrange
      const newFile = createFileInfo(path.join(tempDir, 'manual.ts'), 'content');
      const similarities = [createSimilarityResult(0.75, 0.8)];

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.autoApply).toBe(false);
      expect(recommendation.confidence).toBeLessThan(0.9);
    });

    it('should respect auto-apply threshold configuration', async () => {
      // Arrange - Override the mock to respect custom threshold
      mockImplementation.generateRecommendation.mockImplementationOnce(
        async (newFile: FileInfo, similarities: SimilarityResult[]): Promise<Recommendation> => {
          const confidence = similarities[0]?.overallConfidence || 0.5;
          const customThreshold = 0.95; // Simulate the custom threshold

          return {
            action: 'merge',
            confidence,
            reasoning: 'Threshold test with custom auto-apply threshold',
            alternatives: [],
            autoApply: confidence >= customThreshold, // Use custom threshold
            metadata: {
              timestamp: new Date(),
              processingTimeMs: 15,
              appliedRules: ['custom-threshold'],
              similarityInputs: similarities
            }
          };
        }
      );

      engine.updateThresholds({ autoApplyThreshold: 0.95 });

      const newFile = createFileInfo(path.join(tempDir, 'threshold-test.ts'), 'content');
      const similarities = [createSimilarityResult(0.9, 0.92)]; // Below 0.95 threshold

      // Act
      const recommendation = await engine.generateRecommendation(newFile, similarities);

      // Assert
      expect(recommendation.autoApply).toBe(false); // Should not auto-apply below threshold
    });
  });
});