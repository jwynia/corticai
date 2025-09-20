import { describe, it, expect, beforeEach } from 'vitest';
import { FilenameAnalyzer } from '../../../../src/context/analyzers/layers/FilenameAnalyzer';
import { FileInfo } from '../../../../src/context/analyzers/types';

describe('FilenameAnalyzer', () => {
  let analyzer: FilenameAnalyzer;

  beforeEach(() => {
    analyzer = new FilenameAnalyzer();
  });

  describe('analyze', () => {
    it('should return 1.0 for identical filenames', async () => {
      const file1: FileInfo = {
        path: '/project/src/Button.tsx',
        name: 'Button.tsx',
        extension: '.tsx',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/other/path/Button.tsx',
        name: 'Button.tsx',
        extension: '.tsx',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBe(1.0);
    });

    it('should detect high similarity for similar filenames', async () => {
      const file1: FileInfo = {
        path: '/project/Button.tsx',
        name: 'Button.tsx',
        extension: '.tsx',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/ButtonNew.tsx',
        name: 'ButtonNew.tsx',
        extension: '.tsx',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.6);
      expect(score).toBeLessThan(1.0);
    });

    it('should detect pattern-based similarity', async () => {
      const file1: FileInfo = {
        path: '/project/UserController.ts',
        name: 'UserController.ts',
        extension: '.ts',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/PostController.ts',
        name: 'PostController.ts',
        extension: '.ts',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.5); // Same pattern: *Controller.ts
    });

    it('should detect version patterns', async () => {
      const file1: FileInfo = {
        path: '/project/config.json',
        name: 'config.json',
        extension: '.json',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/config.v2.json',
        name: 'config.v2.json',
        extension: '.json',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.7); // Version pattern
    });

    it('should detect backup patterns', async () => {
      const file1: FileInfo = {
        path: '/project/data.db',
        name: 'data.db',
        extension: '.db',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/data_backup.db',
        name: 'data_backup.db',
        extension: '.db',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.6); // Backup pattern
    });

    it('should detect date patterns', async () => {
      const file1: FileInfo = {
        path: '/logs/app-2024-01-01.log',
        name: 'app-2024-01-01.log',
        extension: '.log',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/logs/app-2024-01-02.log',
        name: 'app-2024-01-02.log',
        extension: '.log',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.8); // Date pattern
    });

    it('should return low score for completely different names', async () => {
      const file1: FileInfo = {
        path: '/project/Button.tsx',
        name: 'Button.tsx',
        extension: '.tsx',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/logger.ts',
        name: 'logger.ts',
        extension: '.ts',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeLessThan(0.3);
    });

    it('should handle case variations', async () => {
      const file1: FileInfo = {
        path: '/project/MyComponent.tsx',
        name: 'MyComponent.tsx',
        extension: '.tsx',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/mycomponent.tsx',
        name: 'mycomponent.tsx',
        extension: '.tsx',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.8); // Case insensitive match
    });

    it('should handle files with numbers', async () => {
      const file1: FileInfo = {
        path: '/project/test1.js',
        name: 'test1.js',
        extension: '.js',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/test2.js',
        name: 'test2.js',
        extension: '.js',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.8); // Numbered sequence
    });

    it('should consider extension similarity', async () => {
      const file1: FileInfo = {
        path: '/project/script.js',
        name: 'script.js',
        extension: '.js',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/script.ts',
        name: 'script.ts',
        extension: '.ts',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.7); // Same base, related extensions
    });

    it('should detect copy patterns', async () => {
      const file1: FileInfo = {
        path: '/project/document.txt',
        name: 'document.txt',
        extension: '.txt',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/document_copy.txt',
        name: 'document_copy.txt',
        extension: '.txt',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.7); // Copy pattern
    });

    it('should handle special characters', async () => {
      const file1: FileInfo = {
        path: '/project/my-file.ts',
        name: 'my-file.ts',
        extension: '.ts',
        content: '',
        size: 0,
      };

      const file2: FileInfo = {
        path: '/project/my_file.ts',
        name: 'my_file.ts',
        extension: '.ts',
        content: '',
        size: 0,
      };

      const score = await analyzer.analyze(file1, file2);
      expect(score).toBeGreaterThan(0.9); // Dash vs underscore
    });

    it('should return patterns detected', () => {
      // This test would check getDetails() method
      const details = analyzer.getDetails();
      expect(details).toBeDefined();
      expect(details.filenamePatterns).toBeDefined();
    });
  });
});