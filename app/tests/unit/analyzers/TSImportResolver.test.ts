import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TSImportResolver } from '../../../src/analyzers/TSImportResolver';

describe('TSImportResolver', () => {
  let resolver: TSImportResolver;
  const testProjectDir = path.join(__dirname, 'test-import-resolver');

  beforeEach(() => {
    resolver = new TSImportResolver();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testProjectDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('resolveDependencyPath', () => {
    describe('relative imports', () => {
      it('should resolve relative import with .ts extension', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'components', 'Button.ts');
        const importSpecifier = './Icon';
        const expectedPath = path.join(testProjectDir, 'src', 'components', 'Icon.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should resolve relative import from parent directory', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'components', 'Button.ts');
        const importSpecifier = '../utils/helpers';
        const expectedPath = path.join(testProjectDir, 'src', 'utils', 'helpers.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.mkdir(path.join(testProjectDir, 'src', 'utils'), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should resolve import with explicit .ts extension', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = './utils.ts';
        const expectedPath = path.join(testProjectDir, 'src', 'utils.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should resolve import with .tsx extension', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'App.tsx');
        const importSpecifier = './Component';
        const expectedPath = path.join(testProjectDir, 'src', 'Component.tsx');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should prefer .ts over .tsx when both exist', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = './module';
        const tsPath = path.join(testProjectDir, 'src', 'module.ts');
        const tsxPath = path.join(testProjectDir, 'src', 'module.tsx');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(tsPath, '');
        await fs.writeFile(tsxPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(tsPath);
      });

      it('should resolve index.ts when importing a directory', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'App.ts');
        const importSpecifier = './components';
        const expectedPath = path.join(testProjectDir, 'src', 'components', 'index.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.mkdir(path.join(testProjectDir, 'src', 'components'), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should resolve index.tsx when index.ts does not exist', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'App.tsx');
        const importSpecifier = './components';
        const expectedPath = path.join(testProjectDir, 'src', 'components', 'index.tsx');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.mkdir(path.join(testProjectDir, 'src', 'components'), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should handle deeply nested relative paths', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'features', 'auth', 'components', 'LoginForm.ts');
        const importSpecifier = '../../../utils/validation';
        const expectedPath = path.join(testProjectDir, 'src', 'utils', 'validation.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.mkdir(path.join(testProjectDir, 'src', 'utils'), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });
    });

    describe('absolute imports', () => {
      it('should return null for node_modules imports', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = 'react';

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBeNull();
      });

      it('should return null for scoped package imports', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = '@testing-library/react';

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBeNull();
      });

      it('should return null for built-in Node.js modules', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = 'fs';

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should return null when file does not exist', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = './nonexistent';

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBeNull();
      });

      it('should handle imports with .js extension referencing .ts files', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = './utils.js';
        const expectedPath = path.join(testProjectDir, 'src', 'utils.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should handle imports with .jsx extension referencing .tsx files', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'App.tsx');
        const importSpecifier = './Component.jsx';
        const expectedPath = path.join(testProjectDir, 'src', 'Component.tsx');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should normalize paths with redundant separators', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = './utils/../helpers/./format';
        const expectedPath = path.join(testProjectDir, 'src', 'helpers', 'format.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.mkdir(path.join(testProjectDir, 'src', 'helpers'), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });

      it('should handle empty import specifier', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = '';

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBeNull();
      });

      it('should handle import specifier with query parameters', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = './style.css?inline';

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert - Should ignore non-TS imports
        expect(resolved).toBeNull();
      });

      it('should handle Windows-style paths', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importSpecifier = './utils\\helpers';
        const expectedPath = path.join(testProjectDir, 'src', 'utils', 'helpers.ts');

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.mkdir(path.join(testProjectDir, 'src', 'utils'), { recursive: true });
        await fs.writeFile(fromPath, '');
        await fs.writeFile(expectedPath, '');

        // Act
        const resolved = await resolver.resolveDependencyPath(fromPath, importSpecifier);

        // Assert
        expect(resolved).toBe(expectedPath);
      });
    });

    describe('performance', () => {
      it('should resolve paths efficiently for multiple imports', async () => {
        // Arrange
        const fromPath = path.join(testProjectDir, 'src', 'index.ts');
        const importCount = 20;

        await fs.mkdir(path.dirname(fromPath), { recursive: true });
        await fs.writeFile(fromPath, '');

        for (let i = 0; i < importCount; i++) {
          const targetPath = path.join(testProjectDir, 'src', `module${i}.ts`);
          await fs.writeFile(targetPath, '');
        }

        // Act
        const startTime = Date.now();
        const resolvedPaths = await Promise.all(
          Array.from({ length: importCount }, (_, i) =>
            resolver.resolveDependencyPath(fromPath, `./module${i}`)
          )
        );
        const duration = Date.now() - startTime;

        // Assert
        expect(resolvedPaths).toHaveLength(importCount);
        expect(resolvedPaths.every(p => p !== null)).toBe(true);
        expect(duration).toBeLessThan(1000); // Should resolve 20 paths in < 1 second
      });
    });
  });

  describe('normalizeFilePath', () => {
    it('should normalize path separators', () => {
      // Act
      const normalized = resolver.normalizeFilePath('src\\components\\Button.ts');

      // Assert
      expect(normalized).toBe(path.normalize('src/components/Button.ts'));
    });

    it('should remove redundant separators', () => {
      // Act
      const normalized = resolver.normalizeFilePath('src//components///Button.ts');

      // Assert
      expect(normalized).toBe(path.normalize('src/components/Button.ts'));
    });

    it('should resolve . and .. segments', () => {
      // Act
      const normalized = resolver.normalizeFilePath('src/components/../utils/./helpers.ts');

      // Assert
      expect(normalized).toBe(path.normalize('src/utils/helpers.ts'));
    });

    it('should handle absolute paths', () => {
      // Arrange
      const absolutePath = '/usr/src/app/index.ts';

      // Act
      const normalized = resolver.normalizeFilePath(absolutePath);

      // Assert
      expect(normalized).toBe(path.normalize(absolutePath));
    });
  });

  describe('isRelativeImport', () => {
    it('should return true for imports starting with ./', () => {
      expect(resolver.isRelativeImport('./utils')).toBe(true);
    });

    it('should return true for imports starting with ../', () => {
      expect(resolver.isRelativeImport('../helpers')).toBe(true);
    });

    it('should return false for absolute imports', () => {
      expect(resolver.isRelativeImport('react')).toBe(false);
    });

    it('should return false for scoped packages', () => {
      expect(resolver.isRelativeImport('@testing-library/react')).toBe(false);
    });

    it('should return false for built-in modules', () => {
      expect(resolver.isRelativeImport('fs')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(resolver.isRelativeImport('')).toBe(false);
    });
  });

  describe('getTypeScriptExtensions', () => {
    it('should return supported TypeScript file extensions', () => {
      // Act
      const extensions = resolver.getTypeScriptExtensions();

      // Assert
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.tsx');
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.jsx');
      expect(extensions.length).toBe(4);
    });
  });
});
