/**
 * Comprehensive test suite for SimilarityAnalyzer
 *
 * This test suite follows test-driven development principles:
 * - Tests define the expected behavior before implementation
 * - Coverage includes happy path, edge cases, and error conditions
 * - Tests serve as documentation of the API contract
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  SimilarityAnalyzer,
  SimilarityConfig,
  SimilarityResult,
  FileInfo,
  LayerSimilarityScore,
  SimilarityLayer,
  DEFAULT_SIMILARITY_CONFIG,
  SimilarityAnalysisError,
  SimilarityConfigError,
  SimilarityLayerError,
  SimilarityAnalysisTimeoutError
} from '../../../src/context/analyzers/types.js';

// Import the implementation (this will fail initially - that's expected in TDD)
import { SimilarityAnalyzerImpl } from '../../../src/context/analyzers/SimilarityAnalyzer.js';

// Mock individual analyzer layers
import { FilenameAnalyzer } from '../../../src/context/analyzers/layers/FilenameAnalyzer.js';
import { StructureAnalyzer } from '../../../src/context/analyzers/layers/StructureAnalyzer.js';
import { SemanticAnalyzer } from '../../../src/context/analyzers/layers/SemanticAnalyzer.js';

// Mock the analyzer layers
vi.mock('../../../src/context/analyzers/layers/FilenameAnalyzer.js');
vi.mock('../../../src/context/analyzers/layers/StructureAnalyzer.js');
vi.mock('../../../src/context/analyzers/layers/SemanticAnalyzer.js');

describe('SimilarityAnalyzer', () => {
  let analyzer: SimilarityAnalyzer;
  let testConfig: SimilarityConfig;
  let tempDir: string;

  // Mock analyzer layers
  let mockFilenameAnalyzer: Mock;
  let mockStructureAnalyzer: Mock;
  let mockSemanticAnalyzer: Mock;

  // Helper function to create test FileInfo
  const createFileInfo = (
    filePath: string,
    content?: string,
    options?: Partial<FileInfo>
  ): FileInfo => ({
    path: filePath,
    content,
    contentHash: content ? 'mock-hash-' + content.length : undefined,
    metadata: {
      size: content?.length || 0,
      extension: path.extname(filePath),
      mimeType: 'text/plain',
      lastModified: new Date(),
      ...options?.metadata
    },
    ...options
  });

  // Helper function to create mock layer score
  const createMockLayerScore = (
    score: number,
    confidence: number = 0.8,
    explanation?: string
  ): LayerSimilarityScore => ({
    score,
    confidence,
    explanation: explanation || `Mock analysis score: ${score}`,
    breakdown: { mock: score }
  });

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'similarity-test-'));

    // Create test configuration
    testConfig = {
      ...DEFAULT_SIMILARITY_CONFIG,
      performance: {
        ...DEFAULT_SIMILARITY_CONFIG.performance,
        maxAnalysisTimeMs: 1000 // Shorter for testing
      }
    };

    // Setup mocks for analyzer layers
    mockFilenameAnalyzer = vi.fn();
    mockStructureAnalyzer = vi.fn();
    mockSemanticAnalyzer = vi.fn();

    (FilenameAnalyzer as any).mockImplementation(() => ({
      analyze: mockFilenameAnalyzer,
      getName: () => 'filename',
      canAnalyze: () => true
    }));

    (StructureAnalyzer as any).mockImplementation(() => ({
      analyze: mockStructureAnalyzer,
      getName: () => 'structure',
      canAnalyze: () => true
    }));

    (SemanticAnalyzer as any).mockImplementation(() => ({
      analyze: mockSemanticAnalyzer,
      getName: () => 'semantic',
      canAnalyze: () => true
    }));

    // Create analyzer instance
    analyzer = new SimilarityAnalyzerImpl(testConfig);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Configuration Management', () => {
    it('should accept valid configuration', () => {
      // Arrange
      const config: SimilarityConfig = {
        ...DEFAULT_SIMILARITY_CONFIG,
        layerWeights: {
          filename: 0.3,
          structure: 0.4,
          semantic: 0.2,
          content: 0.1
        }
      };

      // Act & Assert - Should not throw
      expect(() => {
        analyzer.updateConfig(config);
      }).not.toThrow();

      expect(analyzer.getConfig()).toEqual(config);
    });

    it('should merge partial configuration updates', () => {
      // Arrange
      analyzer.updateConfig(testConfig);
      const partialUpdate = {
        layerWeights: {
          filename: 0.5,
          structure: 0.2,
          semantic: 0.2,
          content: 0.1
        }
      };

      // Act
      analyzer.updateConfig(partialUpdate);

      // Assert
      const updatedConfig = analyzer.getConfig();
      expect(updatedConfig.layerWeights.filename).toBe(0.5);
      expect(updatedConfig.thresholds).toEqual(testConfig.thresholds);
    });

    it('should throw SimilarityConfigError for invalid weights', () => {
      // Arrange
      const invalidConfig = {
        layerWeights: {
          filename: -0.1, // Negative weight should be invalid
          structure: 0.3,
          semantic: 0.3,
          content: 0.5 // Total > 1 should be invalid
        }
      } as Partial<SimilarityConfig>;

      // Act & Assert
      expect(() => {
        analyzer.updateConfig(invalidConfig);
      }).toThrow(SimilarityConfigError);
    });

    it('should throw SimilarityConfigError for invalid thresholds', () => {
      // Arrange
      const invalidConfig = {
        thresholds: {
          identical: 1.5, // > 1 should be invalid
          similar: 0.7,
          different: 0.3
        }
      } as Partial<SimilarityConfig>;

      // Act & Assert
      expect(() => {
        analyzer.updateConfig(invalidConfig);
      }).toThrow(SimilarityConfigError);
    });
  });

  describe('Similarity Analysis', () => {
    beforeEach(() => {
      // Setup default mock responses
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(0.8));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.7));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.6));
    });

    it('should analyze similarity between two files', async () => {
      // Arrange
      const file1 = createFileInfo(
        path.join(tempDir, 'test1.ts'),
        'function hello() { return "world"; }'
      );
      const file2 = createFileInfo(
        path.join(tempDir, 'test2.ts'),
        'function hello() { return "universe"; }'
      );

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);

      // Check that all layers were called
      expect(mockFilenameAnalyzer).toHaveBeenCalledWith(file1, file2);
      expect(mockStructureAnalyzer).toHaveBeenCalledWith(file1, file2);
      expect(mockSemanticAnalyzer).toHaveBeenCalledWith(file1, file2);

      // Check layer scores
      expect(result.layers.filename).toBeDefined();
      expect(result.layers.structure).toBeDefined();
      expect(result.layers.semantic).toBeDefined();

      // Check metadata
      expect(result.metadata.analysisTime).toBeInstanceOf(Date);
      expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
      expect(result.metadata.sourceFile).toBe(file1.path);
      expect(result.metadata.targetFile).toBe(file2.path);
      expect(result.metadata.algorithmsUsed).toContain('filename');
      expect(result.metadata.algorithmsUsed).toContain('structure');
      expect(result.metadata.algorithmsUsed).toContain('semantic');
    });

    it('should handle disabled layers', async () => {
      // Arrange
      analyzer.updateConfig({
        enabledLayers: {
          filename: true,
          structure: false,
          semantic: true,
          content: false
        }
      });

      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert
      expect(mockFilenameAnalyzer).toHaveBeenCalled();
      expect(mockStructureAnalyzer).not.toHaveBeenCalled();
      expect(mockSemanticAnalyzer).toHaveBeenCalled();

      expect(result.layers.filename).toBeDefined();
      expect(result.layers.structure.score).toBe(0); // Should be 0 for disabled layer
      expect(result.layers.semantic).toBeDefined();
    });

    it('should weight layer scores according to configuration', async () => {
      // Arrange
      analyzer.updateConfig({
        layerWeights: {
          filename: 0.5,
          structure: 0.3,
          semantic: 0.2,
          content: 0.0
        }
      });

      // Mock specific scores to test weighting
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(1.0));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.5));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.0));

      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert - Should be weighted: 0.5*1.0 + 0.3*0.5 + 0.2*0.0 = 0.65
      expect(result.overallScore).toBeCloseTo(0.65, 2);
    });

    it('should generate appropriate recommendations', async () => {
      // Arrange - High similarity should suggest merge/update
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(0.95));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.9));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.85));

      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.action).toBeOneOf(['merge', 'update', 'duplicate']);
      expect(result.recommendation.confidence).toBeGreaterThan(0.5);
      expect(result.recommendation.reason).toBeTruthy();
      expect(result.recommendation.involvedFiles).toContain(file1.path);
      expect(result.recommendation.involvedFiles).toContain(file2.path);
    });

    it('should handle layer analysis errors gracefully', async () => {
      // Arrange
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(0.8));
      mockStructureAnalyzer.mockRejectedValue(new Error('Structure analysis failed'));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.6));

      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert - Should continue with other layers
      expect(result.layers.filename).toBeDefined();
      expect(result.layers.structure.score).toBe(0); // Failed layer should have 0 score
      expect(result.layers.structure.confidence).toBe(0);
      expect(result.layers.semantic).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0); // Should still calculate overall score
    });

    it('should timeout long-running analysis', async () => {
      // Arrange
      analyzer.updateConfig({
        performance: { maxAnalysisTimeMs: 100, enableCache: false, cacheTTL: 0 }
      });

      // Mock a slow analyzer
      mockFilenameAnalyzer.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockLayerScore(0.8)), 200))
      );

      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      // Act & Assert
      await expect(analyzer.analyzeSimilarity(file1, file2))
        .rejects.toThrow(SimilarityAnalysisTimeoutError);
    });
  });

  describe('Batch Analysis', () => {
    beforeEach(() => {
      // Setup default mock responses
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(0.5));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.6));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.7));
    });

    it('should find similar files from candidates', async () => {
      // Arrange
      const targetFile = createFileInfo(
        path.join(tempDir, 'target.ts'),
        'function main() { console.log("hello"); }'
      );

      const candidates = [
        createFileInfo(path.join(tempDir, 'candidate1.ts'), 'function main() { console.log("world"); }'),
        createFileInfo(path.join(tempDir, 'candidate2.js'), 'console.log("different");'),
        createFileInfo(path.join(tempDir, 'candidate3.ts'), 'function main() { console.log("universe"); }')
      ];

      // Act
      const results = await analyzer.findSimilarFiles(targetFile, candidates);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].overallScore).toBeGreaterThanOrEqual(results[1].overallScore);
      expect(results[1].overallScore).toBeGreaterThanOrEqual(results[2].overallScore);

      // Check that all candidates were analyzed
      expect(mockFilenameAnalyzer).toHaveBeenCalledTimes(3);
      expect(mockStructureAnalyzer).toHaveBeenCalledTimes(3);
      expect(mockSemanticAnalyzer).toHaveBeenCalledTimes(3);
    });

    it('should filter by minimum similarity threshold', async () => {
      // Arrange
      const targetFile = createFileInfo(path.join(tempDir, 'target.ts'), 'content');
      const candidates = [
        createFileInfo(path.join(tempDir, 'candidate1.ts'), 'similar'),
        createFileInfo(path.join(tempDir, 'candidate2.ts'), 'different')
      ];

      // Mock different similarity scores
      mockFilenameAnalyzer.mockResolvedValueOnce(createMockLayerScore(0.9))
                          .mockResolvedValueOnce(createMockLayerScore(0.2));
      mockStructureAnalyzer.mockResolvedValueOnce(createMockLayerScore(0.8))
                           .mockResolvedValueOnce(createMockLayerScore(0.1));
      mockSemanticAnalyzer.mockResolvedValueOnce(createMockLayerScore(0.7))
                          .mockResolvedValueOnce(createMockLayerScore(0.0));

      // Act
      const results = await analyzer.findSimilarFiles(targetFile, candidates, 0.5);

      // Assert - Only high similarity results should be returned
      expect(results.length).toBeLessThanOrEqual(1);
      if (results.length > 0) {
        expect(results[0].overallScore).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should handle empty candidate list', async () => {
      // Arrange
      const targetFile = createFileInfo(path.join(tempDir, 'target.ts'), 'content');
      const candidates: FileInfo[] = [];

      // Act
      const results = await analyzer.findSimilarFiles(targetFile, candidates);

      // Assert
      expect(results).toHaveLength(0);
      expect(mockFilenameAnalyzer).not.toHaveBeenCalled();
    });
  });

  describe('Performance Requirements', () => {
    beforeEach(() => {
      // Setup fast mock responses
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(0.8));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.7));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.6));
    });

    it('should complete analysis within time limits', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      // Act
      const startTime = Date.now();
      const result = await analyzer.analyzeSimilarity(file1, file2);
      const endTime = Date.now();

      // Assert
      const actualTime = endTime - startTime;
      expect(actualTime).toBeLessThan(testConfig.performance.maxAnalysisTimeMs);
      expect(result.metadata.processingTimeMs).toBeLessThan(testConfig.performance.maxAnalysisTimeMs);
    });

    it('should handle large file content efficiently', async () => {
      // Arrange - Large file content
      const largeContent = 'x'.repeat(10000);
      const file1 = createFileInfo(path.join(tempDir, 'large1.ts'), largeContent);
      const file2 = createFileInfo(path.join(tempDir, 'large2.ts'), largeContent);

      // Act
      const startTime = Date.now();
      const result = await analyzer.analyzeSimilarity(file1, file2);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toBeDefined();
    });

    it('should handle multiple concurrent analyses', async () => {
      // Arrange
      const files = Array.from({ length: 5 }, (_, i) =>
        createFileInfo(path.join(tempDir, `file${i}.ts`), `content ${i}`)
      );

      // Act - Run multiple analyses concurrently
      const promises = [];
      for (let i = 0; i < files.length - 1; i++) {
        promises.push(analyzer.analyzeSimilarity(files[i], files[i + 1]));
      }

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file information', async () => {
      // Arrange
      const invalidFile1 = createFileInfo('', ''); // Empty path
      const validFile2 = createFileInfo(path.join(tempDir, 'valid.ts'), 'content');

      // Act & Assert
      await expect(analyzer.analyzeSimilarity(invalidFile1, validFile2))
        .rejects.toThrow(SimilarityAnalysisError);
    });

    it('should handle missing file content gracefully', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'test1.ts')); // No content
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'some content');

      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(0.8));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.0)); // Can't analyze structure without content
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.0)); // Can't analyze semantics without content

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert - Should still provide result based on available data
      expect(result).toBeDefined();
      expect(result.layers.filename.score).toBeGreaterThan(0); // Filename analysis should work
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should propagate layer-specific errors with context', async () => {
      // Arrange
      const layerError = new Error('Layer-specific error');
      mockFilenameAnalyzer.mockRejectedValue(layerError);
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.7));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.6));

      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert - Should handle layer error gracefully
      expect(result.layers.filename.score).toBe(0);
      expect(result.layers.filename.confidence).toBe(0);
      expect(result.layers.structure.score).toBeGreaterThan(0);
      expect(result.layers.semantic.score).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle identical files', async () => {
      // Arrange
      const content = 'function test() { return "identical"; }';
      const file1 = createFileInfo(path.join(tempDir, 'identical1.ts'), content);
      const file2 = createFileInfo(path.join(tempDir, 'identical2.ts'), content);

      // Mock perfect scores for identical files
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(1.0));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(1.0));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(1.0));

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert
      expect(result.overallScore).toBeCloseTo(1.0, 2);
      expect(result.recommendation.action).toBeOneOf(['duplicate', 'merge']);
    });

    it('should handle completely different files', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'test.ts'), 'TypeScript code');
      const file2 = createFileInfo(path.join(tempDir, 'image.png'), 'Binary image data');

      // Mock very low scores for different files
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(0.1));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(0.0));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(0.0));

      // Act
      const result = await analyzer.analyzeSimilarity(file1, file2);

      // Assert
      expect(result.overallScore).toBeLessThan(0.3);
      expect(result.recommendation.action).toBe('create');
    });

    it('should handle same file compared to itself', async () => {
      // Arrange
      const file = createFileInfo(path.join(tempDir, 'self.ts'), 'self content');

      // Mock perfect scores for self-comparison
      mockFilenameAnalyzer.mockResolvedValue(createMockLayerScore(1.0));
      mockStructureAnalyzer.mockResolvedValue(createMockLayerScore(1.0));
      mockSemanticAnalyzer.mockResolvedValue(createMockLayerScore(1.0));

      // Act
      const result = await analyzer.analyzeSimilarity(file, file);

      // Assert
      expect(result.overallScore).toBe(1.0);
      expect(result.recommendation.action).toBe('duplicate');
    });
  });
});

// Additional test utilities
export function createTestFileInfo(
  filePath: string,
  content?: string,
  overrides?: Partial<FileInfo>
): FileInfo {
  return {
    path: filePath,
    content,
    contentHash: content ? `hash-${content.length}` : undefined,
    metadata: {
      size: content?.length || 0,
      extension: path.extname(filePath),
      mimeType: 'text/plain',
      lastModified: new Date()
    },
    ...overrides
  };
}

export function createMockSimilarityResult(
  score: number,
  confidence: number = 0.8,
  sourceFile: string = '/test/source.ts',
  targetFile: string = '/test/target.ts'
): SimilarityResult {
  return {
    overallScore: score,
    overallConfidence: confidence,
    layers: {
      filename: { score: score * 0.8, confidence, explanation: 'Mock filename analysis' },
      structure: { score: score * 0.9, confidence, explanation: 'Mock structure analysis' },
      semantic: { score: score * 0.7, confidence, explanation: 'Mock semantic analysis' }
    },
    recommendation: {
      action: score > 0.8 ? 'merge' : score > 0.5 ? 'review' : 'create',
      confidence,
      reason: `Mock recommendation based on score ${score}`,
      involvedFiles: [sourceFile, targetFile]
    },
    metadata: {
      analysisTime: new Date(),
      processingTimeMs: 100,
      algorithmsUsed: ['filename', 'structure', 'semantic'],
      sourceFile,
      targetFile
    }
  };
}