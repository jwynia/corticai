/**
 * Comprehensive test suite for FilenameAnalyzer
 *
 * This test suite follows test-driven development principles:
 * - Tests define the expected behavior before implementation
 * - Coverage includes happy path, edge cases, and error conditions
 * - Tests serve as documentation of the API contract
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  FileInfo,
  LayerSimilarityScore,
  SimilarityLayer
} from '../../../../src/context/analyzers/types.js';

// Import the implementation (this will fail initially - that's expected in TDD)
import { FilenameAnalyzer } from '../../../../src/context/analyzers/layers/FilenameAnalyzer.js';

describe('FilenameAnalyzer', () => {
  let analyzer: SimilarityLayer;
  let tempDir: string;

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

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'filename-analyzer-test-'));

    // Create analyzer instance
    analyzer = new FilenameAnalyzer();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Layer Interface', () => {
    it('should implement SimilarityLayer interface', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer.analyze).toBeInstanceOf(Function);
      expect(analyzer.getName).toBeInstanceOf(Function);
      expect(analyzer.canAnalyze).toBeInstanceOf(Function);
    });

    it('should have correct layer name', () => {
      expect(analyzer.getName()).toBe('filename');
    });

    it('should accept files for analysis', () => {
      const file1 = createFileInfo(path.join(tempDir, 'test1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test2.ts'), 'content2');

      expect(analyzer.canAnalyze(file1, file2)).toBe(true);
    });
  });

  describe('Identical Filenames', () => {
    it('should return perfect score for identical filenames', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'component.tsx'), 'content1');
      const file2 = createFileInfo(path.join('/different/path', 'component.tsx'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBe(1.0);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.explanation).toContain('identical');
    });

    it('should return perfect score for same file', async () => {
      // Arrange
      const file = createFileInfo(path.join(tempDir, 'same.ts'), 'content');

      // Act
      const result = await analyzer.analyze(file, file);

      // Assert
      expect(result.score).toBe(1.0);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Similar Filenames', () => {
    it('should detect high similarity for slightly different names', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'UserButton.tsx'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'UserButton2.tsx'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.score).toBeLessThan(1.0);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect similarity with case differences', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'MyComponent.tsx'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'mycomponent.tsx'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.breakdown).toHaveProperty('caseInsensitive');
    });

    it('should detect similarity with different extensions', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'utils.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'utils.js'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBeGreaterThan(0.6);
      expect(result.breakdown).toHaveProperty('baseName');
    });

    it('should detect similarity with version numbers', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'api-v1.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'api-v2.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBeGreaterThan(0.6);
      expect(result.breakdown).toHaveProperty('versionStripped');
    });

    it('should detect similarity with prefixes and suffixes', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'Button.tsx'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'NewButton.tsx'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBeGreaterThan(0.4);
      expect(result.breakdown).toHaveProperty('stemSimilarity');
    });
  });

  describe('Levenshtein Distance Analysis', () => {
    it('should calculate edit distance for similar names', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'component.tsx'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'components.tsx'), 'content2'); // 1 character difference

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown).toHaveProperty('levenshtein');
      expect(result.breakdown?.levenshtein).toBeGreaterThan(0.8); // High similarity for 1 char diff
    });

    it('should handle very different names with low scores', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'a.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'zzzzzzzzz.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBeLessThan(0.3);
      expect(result.breakdown?.levenshtein).toBeLessThan(0.2);
    });
  });

  describe('Soundex Analysis', () => {
    it('should detect phonetically similar names', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'Smith.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'Smyth.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown).toHaveProperty('soundex');
      expect(result.breakdown?.soundex).toBeGreaterThan(0.5);
    });

    it('should handle non-phonetic differences', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'test.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'xyz.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown?.soundex).toBeLessThan(0.2);
    });
  });

  describe('N-gram Analysis', () => {
    it('should analyze character n-grams for similarity', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'userService.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'userUtils.ts'), 'content2'); // Common 'user' prefix

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown).toHaveProperty('ngrams');
      expect(result.breakdown?.ngrams).toBeGreaterThan(0.3);
    });

    it('should handle completely different n-grams', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'abc.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'xyz.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown?.ngrams).toBeLessThan(0.2);
    });
  });

  describe('Path Analysis', () => {
    it('should consider directory structure in similarity', async () => {
      // Arrange
      const file1 = createFileInfo('/project/src/components/Button.tsx', 'content1');
      const file2 = createFileInfo('/project/src/components/Link.tsx', 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown).toHaveProperty('pathSimilarity');
      expect(result.breakdown?.pathSimilarity).toBeGreaterThan(0.7); // Same directory
    });

    it('should detect different directory structures', async () => {
      // Arrange
      const file1 = createFileInfo('/project/src/components/Button.tsx', 'content1');
      const file2 = createFileInfo('/project/tests/utils/helper.ts', 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown?.pathSimilarity).toBeLessThan(0.3);
    });
  });

  describe('File Extension Handling', () => {
    it('should handle same extensions with higher weight', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'component.tsx'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'button.tsx'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown).toHaveProperty('extensionMatch');
      expect(result.breakdown?.extensionMatch).toBe(1.0);
    });

    it('should handle related extensions (ts/tsx, js/jsx)', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'component.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'component.tsx'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown?.extensionMatch).toBeGreaterThan(0.7);
      expect(result.breakdown?.extensionMatch).toBeLessThan(1.0);
    });

    it('should handle completely different extensions', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'image.png'), 'binary');
      const file2 = createFileInfo(path.join(tempDir, 'document.txt'), 'text');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown?.extensionMatch).toBeLessThan(0.2);
    });

    it('should handle files without extensions', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'README'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'LICENSE'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Special Characters and Patterns', () => {
    it('should handle special characters in filenames', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'file-name_test.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'fileName.test.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown).toHaveProperty('normalizedSimilarity');
    });

    it('should handle numbers in filenames', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'test123.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'test456.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.breakdown).toHaveProperty('numberStripped');
      expect(result.breakdown?.numberStripped).toBeGreaterThan(0.7);
    });

    it('should handle unicode characters', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, '测试文件.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, '测试.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete analysis quickly for normal filenames', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'component.tsx'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'button.tsx'), 'content2');

      // Act
      const startTime = Date.now();
      const result = await analyzer.analyze(file1, file2);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result).toBeDefined();
    });

    it('should handle very long filenames efficiently', async () => {
      // Arrange
      const longName = 'a'.repeat(500); // Very long filename
      const file1 = createFileInfo(path.join(tempDir, `${longName}.ts`), 'content1');
      const file2 = createFileInfo(path.join(tempDir, `${longName}2.ts`), 'content2');

      // Act
      const startTime = Date.now();
      const result = await analyzer.analyze(file1, file2);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms even for long names
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle null or undefined paths gracefully', async () => {
      // Arrange
      const validFile = createFileInfo(path.join(tempDir, 'valid.ts'), 'content');
      const invalidFile = { ...validFile, path: '' };

      // Act & Assert
      await expect(analyzer.analyze(invalidFile, validFile))
        .rejects.toThrow();
    });

    it('should handle malformed paths', async () => {
      // Arrange
      const file1 = createFileInfo('\\invalid\\windows\\path', 'content1');
      const file2 = createFileInfo('/valid/unix/path', 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert - Should not throw but might give low confidence
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should handle very short filenames', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'a'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'b'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty basenames with extensions only', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, '.gitignore'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, '.eslintrc'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0); // Should detect similarity in dot files
    });

    it('should handle filenames with only numbers', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, '123.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, '456.ts'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result).toBeDefined();
      expect(result.breakdown?.extensionMatch).toBe(1.0); // Should match on extension
    });

    it('should handle identical basenames but different paths', async () => {
      // Arrange
      const file1 = createFileInfo('/path1/dir1/file.ts', 'content1');
      const file2 = createFileInfo('/path2/dir2/file.ts', 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.score).toBeGreaterThan(0.8); // High similarity for same basename
      expect(result.breakdown).toHaveProperty('baseName');
      expect(result.breakdown?.baseName).toBe(1.0);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence for clear matches', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'Button.tsx'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'Button.tsx'), 'content2');

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should have lower confidence for ambiguous matches', async () => {
      // Arrange
      const file1 = createFileInfo(path.join(tempDir, 'a.ts'), 'content1');
      const file2 = createFileInfo(path.join(tempDir, 'b.ts'), 'content2'); // Very short, ambiguous

      // Act
      const result = await analyzer.analyze(file1, file2);

      // Assert
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should adjust confidence based on filename length', async () => {
      // Arrange
      const shortFile1 = createFileInfo(path.join(tempDir, 'ab.ts'), 'content1');
      const shortFile2 = createFileInfo(path.join(tempDir, 'ac.ts'), 'content2');

      const longFile1 = createFileInfo(path.join(tempDir, 'VeryDescriptiveComponentName.tsx'), 'content1');
      const longFile2 = createFileInfo(path.join(tempDir, 'VeryDescriptiveComponentNam.tsx'), 'content2');

      // Act
      const shortResult = await analyzer.analyze(shortFile1, shortFile2);
      const longResult = await analyzer.analyze(longFile1, longFile2);

      // Assert
      expect(longResult.confidence).toBeGreaterThan(shortResult.confidence);
    });
  });
});