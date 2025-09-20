import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimilarityAnalyzer } from '../../../src/context/analyzers/SimilarityAnalyzer';
import {
  FileInfo,
  SimilarityResult,
  BatchSimilarityResult,
  SimilarityConfig,
  DEFAULT_SIMILARITY_CONFIG,
} from '../../../src/context/analyzers/types';

describe('SimilarityAnalyzer', () => {
  let analyzer: SimilarityAnalyzer;
  let testFile1: FileInfo;
  let testFile2: FileInfo;
  let testFile3: FileInfo;

  beforeEach(() => {
    // Create test files with different similarity levels
    testFile1 = {
      path: '/project/src/components/Button.tsx',
      name: 'Button.tsx',
      extension: '.tsx',
      content: `import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};`,
      size: 300,
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-02'),
    };

    testFile2 = {
      path: '/project/src/components/ButtonNew.tsx',
      name: 'ButtonNew.tsx',
      extension: '.tsx',
      content: `import React from 'react';

interface ButtonProps {
  text: string;
  handleClick: () => void;
  isDisabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ text, handleClick, isDisabled }) => {
  return (
    <button onClick={handleClick} disabled={isDisabled}>
      {text}
    </button>
  );
};`,
      size: 320,
      createdAt: new Date('2024-01-03'),
      modifiedAt: new Date('2024-01-03'),
    };

    testFile3 = {
      path: '/project/src/utils/logger.ts',
      name: 'logger.ts',
      extension: '.ts',
      content: `export class Logger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }
}`,
      size: 150,
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-01'),
    };

    analyzer = new SimilarityAnalyzer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const analyzer = new SimilarityAnalyzer();
      expect(analyzer).toBeDefined();
      expect(analyzer.getConfig()).toEqual(DEFAULT_SIMILARITY_CONFIG);
    });

    it('should create instance with custom config', () => {
      const customConfig: SimilarityConfig = {
        ...DEFAULT_SIMILARITY_CONFIG,
        similarityThreshold: 0.8,
        layerWeights: {
          filename: 0.3,
          structure: 0.3,
          semantic: 0.4,
        },
      };
      const analyzer = new SimilarityAnalyzer(customConfig);
      expect(analyzer.getConfig()).toEqual(customConfig);
    });
  });

  describe('analyzeSimilarity', () => {
    describe('happy path', () => {
      it('should detect high similarity between nearly identical files', async () => {
        const result = await analyzer.analyzeSimilarity(testFile1, testFile2);

        expect(result.sourceFile).toBe(testFile1.path);
        expect(result.targetFile).toBe(testFile2.path);
        expect(result.overallScore).toBeGreaterThan(0.7);
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.layerScores.filename).toBeGreaterThan(0.5);
        expect(result.layerScores.structure).toBeGreaterThan(0.7);
        expect(result.layerScores.semantic).toBeGreaterThan(0.7);
        expect(result.analysisTime).toBeLessThan(100);
      });

      it('should detect low similarity between different files', async () => {
        const result = await analyzer.analyzeSimilarity(testFile1, testFile3);

        expect(result.overallScore).toBeLessThan(0.3);
        expect(result.layerScores.filename).toBeLessThan(0.3);
        expect(result.layerScores.structure).toBeLessThan(0.3);
        expect(result.layerScores.semantic).toBeLessThan(0.3);
      });

      it('should detect 100% similarity for identical files', async () => {
        const result = await analyzer.analyzeSimilarity(testFile1, testFile1);

        expect(result.overallScore).toBe(1.0);
        expect(result.layerScores.filename).toBe(1.0);
        expect(result.layerScores.structure).toBe(1.0);
        expect(result.layerScores.semantic).toBe(1.0);
        expect(result.confidence).toBe(1.0);
      });

      it('should include similarity details', async () => {
        const result = await analyzer.analyzeSimilarity(testFile1, testFile2);

        expect(result.details).toBeDefined();
        expect(result.details.sharedKeywords).toBeDefined();
        expect(result.details.sharedKeywords).toContain('React');
        expect(result.details.sharedKeywords).toContain('button');
        expect(result.details.sharedKeywords).toContain('disabled');
      });

      it('should respect custom layer weights', async () => {
        const customAnalyzer = new SimilarityAnalyzer({
          ...DEFAULT_SIMILARITY_CONFIG,
          layerWeights: {
            filename: 0.8,  // Heavy weight on filename
            structure: 0.1,
            semantic: 0.1,
          },
        });

        const result = await customAnalyzer.analyzeSimilarity(testFile1, testFile2);
        // Should have high overall score due to similar filenames
        expect(result.overallScore).toBeGreaterThan(0.5);
      });
    });

    describe('edge cases', () => {
      it('should handle empty files', async () => {
        const emptyFile1: FileInfo = {
          ...testFile1,
          content: '',
          size: 0,
        };
        const emptyFile2: FileInfo = {
          ...testFile2,
          content: '',
          size: 0,
        };

        const result = await analyzer.analyzeSimilarity(emptyFile1, emptyFile2);
        expect(result.overallScore).toBe(1.0); // Empty files are identical
        expect(result.confidence).toBeLessThan(0.5); // But low confidence
      });

      it('should handle very large files within time limit', async () => {
        const largeFile1: FileInfo = {
          ...testFile1,
          content: 'a'.repeat(1000000), // 1MB of 'a'
          size: 1000000,
        };
        const largeFile2: FileInfo = {
          ...testFile2,
          content: 'b'.repeat(1000000), // 1MB of 'b'
          size: 1000000,
        };

        const startTime = Date.now();
        const result = await analyzer.analyzeSimilarity(largeFile1, largeFile2);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(200); // Should complete quickly
        expect(result.analysisTime).toBeLessThan(200);
      });

      it('should handle files with different extensions', async () => {
        const mdFile: FileInfo = {
          ...testFile1,
          path: '/project/README.md',
          name: 'README.md',
          extension: '.md',
          content: '# Button Component\n\nA reusable button component.',
        };

        const result = await analyzer.analyzeSimilarity(testFile1, mdFile);
        expect(result.overallScore).toBeLessThan(0.5);
        expect(result.layerScores.filename).toBeLessThan(0.3);
      });

      it('should handle files with special characters', async () => {
        const specialFile: FileInfo = {
          ...testFile1,
          content: '🎨 const Button = () => <button>Click me! 🚀</button>;',
        };

        const result = await analyzer.analyzeSimilarity(testFile1, specialFile);
        expect(result).toBeDefined();
        expect(result.overallScore).toBeGreaterThan(0);
        expect(result.overallScore).toBeLessThan(1);
      });
    });

    describe('error handling', () => {
      it('should handle null file input', async () => {
        await expect(analyzer.analyzeSimilarity(null as any, testFile2))
          .rejects.toThrow('Invalid file input');
      });

      it('should handle undefined file input', async () => {
        await expect(analyzer.analyzeSimilarity(testFile1, undefined as any))
          .rejects.toThrow('Invalid file input');
      });

      it('should handle invalid file structure', async () => {
        const invalidFile = { path: '/test' } as FileInfo;
        await expect(analyzer.analyzeSimilarity(invalidFile, testFile2))
          .rejects.toThrow('Invalid file structure');
      });

      it('should handle missing required fields', async () => {
        const incompleteFile: any = {
          path: '/test.js',
          // Missing name, extension, content, size
        };
        await expect(analyzer.analyzeSimilarity(incompleteFile, testFile2))
          .rejects.toThrow('Invalid file structure');
      });
    });

    describe('performance', () => {
      it('should cache results when enabled', async () => {
        const spy = vi.spyOn(analyzer as any, 'computeSimilarity');

        // First call - should compute
        await analyzer.analyzeSimilarity(testFile1, testFile2);
        expect(spy).toHaveBeenCalledTimes(1);

        // Second call - should use cache
        await analyzer.analyzeSimilarity(testFile1, testFile2);
        expect(spy).toHaveBeenCalledTimes(1);

        // Reverse order - should also use cache
        await analyzer.analyzeSimilarity(testFile2, testFile1);
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('should not cache when disabled', async () => {
        const noCacheAnalyzer = new SimilarityAnalyzer({
          ...DEFAULT_SIMILARITY_CONFIG,
          performance: {
            ...DEFAULT_SIMILARITY_CONFIG.performance,
            enableCache: false,
          },
        });

        const spy = vi.spyOn(noCacheAnalyzer as any, 'computeSimilarity');

        await noCacheAnalyzer.analyzeSimilarity(testFile1, testFile2);
        expect(spy).toHaveBeenCalledTimes(1);

        await noCacheAnalyzer.analyzeSimilarity(testFile1, testFile2);
        expect(spy).toHaveBeenCalledTimes(2);
      });

      it('should expire cache after TTL', async () => {
        const shortTTLAnalyzer = new SimilarityAnalyzer({
          ...DEFAULT_SIMILARITY_CONFIG,
          performance: {
            ...DEFAULT_SIMILARITY_CONFIG.performance,
            cacheTTL: 100, // 100ms TTL
          },
        });

        const spy = vi.spyOn(shortTTLAnalyzer as any, 'computeSimilarity');

        await shortTTLAnalyzer.analyzeSimilarity(testFile1, testFile2);
        expect(spy).toHaveBeenCalledTimes(1);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        await shortTTLAnalyzer.analyzeSimilarity(testFile1, testFile2);
        expect(spy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('analyzeBatch', () => {
    it('should analyze a new file against multiple existing files', async () => {
      const existingFiles = [testFile1, testFile3];
      const result = await analyzer.analyzeBatch(testFile2, existingFiles);

      expect(result.newFile).toBe(testFile2.path);
      expect(result.similarities).toHaveLength(2);
      expect(result.similarities[0].overallScore).toBeGreaterThan(result.similarities[1].overallScore);
      expect(result.bestMatch).toBeDefined();
      expect(result.bestMatch?.targetFile).toBe(testFile1.path);
      expect(result.totalAnalysisTime).toBeLessThan(200);
    });

    it('should identify potential duplicates above threshold', async () => {
      const existingFiles = [testFile1, testFile3];
      const result = await analyzer.analyzeBatch(testFile2, existingFiles);

      expect(result.potentialDuplicates).toBeDefined();
      expect(result.potentialDuplicates.length).toBeGreaterThanOrEqual(1);
      expect(result.potentialDuplicates[0].overallScore).toBeGreaterThan(0.7);
    });

    it('should handle empty existing files array', async () => {
      const result = await analyzer.analyzeBatch(testFile1, []);

      expect(result.similarities).toHaveLength(0);
      expect(result.bestMatch).toBeUndefined();
      expect(result.potentialDuplicates).toHaveLength(0);
    });

    it('should handle large batches efficiently', async () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => ({
        ...testFile3,
        path: `/project/file${i}.ts`,
        name: `file${i}.ts`,
      }));

      const startTime = Date.now();
      const result = await analyzer.analyzeBatch(testFile1, manyFiles);
      const elapsed = Date.now() - startTime;

      expect(result.similarities).toHaveLength(100);
      expect(elapsed).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle batch with null entries', async () => {
      const filesWithNull = [testFile1, null as any, testFile3];

      await expect(analyzer.analyzeBatch(testFile2, filesWithNull))
        .rejects.toThrow('Invalid file in batch');
    });
  });

  describe('clearCache', () => {
    it('should clear the analysis cache', async () => {
      const spy = vi.spyOn(analyzer as any, 'computeSimilarity');

      // Populate cache
      await analyzer.analyzeSimilarity(testFile1, testFile2);
      expect(spy).toHaveBeenCalledTimes(1);

      // Clear cache
      analyzer.clearCache();

      // Should recompute after cache clear
      await analyzer.analyzeSimilarity(testFile1, testFile2);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig: SimilarityConfig = {
        ...DEFAULT_SIMILARITY_CONFIG,
        similarityThreshold: 0.9,
      };

      analyzer.updateConfig(newConfig);
      expect(analyzer.getConfig()).toEqual(newConfig);
    });

    it('should clear cache when config changes', async () => {
      const spy = vi.spyOn(analyzer as any, 'computeSimilarity');

      // Populate cache
      await analyzer.analyzeSimilarity(testFile1, testFile2);
      expect(spy).toHaveBeenCalledTimes(1);

      // Update config
      analyzer.updateConfig({
        ...DEFAULT_SIMILARITY_CONFIG,
        similarityThreshold: 0.5,
      });

      // Should recompute with new config
      await analyzer.analyzeSimilarity(testFile1, testFile2);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('file type specific handling', () => {
    it('should use file type specific settings when configured', async () => {
      const typeSpecificAnalyzer = new SimilarityAnalyzer({
        ...DEFAULT_SIMILARITY_CONFIG,
        fileTypeSettings: {
          '.md': {
            weights: {
              filename: 0.1,
              structure: 0.1,
              semantic: 0.8, // Focus on content for markdown
            },
          },
        },
      });

      const mdFile1: FileInfo = {
        ...testFile1,
        path: '/docs/guide.md',
        name: 'guide.md',
        extension: '.md',
        content: '# User Guide\n\nThis is a guide for users.',
      };

      const mdFile2: FileInfo = {
        ...testFile2,
        path: '/docs/tutorial.md',
        name: 'tutorial.md',
        extension: '.md',
        content: '# User Guide\n\nThis is a guide for users.',
      };

      const result = await typeSpecificAnalyzer.analyzeSimilarity(mdFile1, mdFile2);
      expect(result.overallScore).toBeGreaterThan(0.7); // High due to identical content
    });
  });
});