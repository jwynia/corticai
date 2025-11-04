import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import { TSASTParser, type FileSystem } from '../../../src/analyzers/TSASTParser';
import { TSImportResolver } from '../../../src/analyzers/TSImportResolver';
import type { FileAnalysis } from '../../../src/analyzers/types';
import { itPerformance } from '../../helpers/performance';

/**
 * Mock FileSystem for proper unit testing
 * Eliminates real file I/O - tests are fast, deterministic, and truly isolated
 */
class MockFileSystem implements FileSystem {
  private files: Map<string, string> = new Map();

  setFile(filePath: string, content: string): void {
    this.files.set(filePath, content);
  }

  async readFile(filePath: string, encoding: 'utf-8'): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    return content;
  }

  async access(filePath: string): Promise<void> {
    if (!this.files.has(filePath)) {
      throw new Error(`ENOENT: no such file or directory, access '${filePath}'`);
    }
  }

  clear(): void {
    this.files.clear();
  }
}

describe('TSASTParser', () => {
  let parser: TSASTParser;
  let resolver: TSImportResolver;
  let mockFs: MockFileSystem;

  beforeEach(() => {
    resolver = new TSImportResolver();
    mockFs = new MockFileSystem();
    parser = new TSASTParser({
      importResolver: resolver,
      fileSystem: mockFs
    });
  });

  describe('parseFile', () => {
    describe('ES6 imports', () => {
      it('should extract default imports', async () => {
        // Arrange
        const testFile = '/test/default-import.ts';        mockFs.setFile(testFile, `import React from 'react';`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(1);
        expect(analysis.imports[0]).toMatchObject({
          source: 'react',
          type: 'default',
          specifiers: ['React']
        });
      });

      it('should extract named imports', async () => {
        // Arrange
        const testFile = '/test/named-imports.ts';        mockFs.setFile(testFile, `import { useState, useEffect } from 'react';`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(1);
        expect(analysis.imports[0]).toMatchObject({
          source: 'react',
          type: 'named',
          specifiers: expect.arrayContaining(['useState', 'useEffect'])
        });
      });

      it('should extract namespace imports', async () => {
        // Arrange
        const testFile = '/test/namespace-import.ts';        mockFs.setFile(testFile, `import * as utils from './utils';`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(1);
        expect(analysis.imports[0]).toMatchObject({
          source: './utils',
          type: 'namespace',
          specifiers: ['utils']
        });
      });

      it('should extract type-only imports', async () => {
        // Arrange
        const testFile = '/test/type-import.ts';        mockFs.setFile(testFile, `import type { Config } from './config';`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(1);
        expect(analysis.imports[0]).toMatchObject({
          source: './config',
          type: 'type',
          specifiers: ['Config']
        });
      });

      it('should extract mixed import types', async () => {
        // Arrange
        const testFile = '/test/mixed-imports.ts';        mockFs.setFile(testFile, `
          import React from 'react';
          import { Component } from 'react';
          import * as ReactDOM from 'react-dom';
          import type { FC } from 'react';
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(4);
        expect(analysis.imports.map(i => i.type)).toEqual(['default', 'named', 'namespace', 'type']);
      });
    });

    describe('CommonJS imports', () => {
      it('should extract require statements', async () => {
        // Arrange
        const testFile = '/test/commonjs.ts';        mockFs.setFile(testFile, `const fs = require('fs');`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(1);
        expect(analysis.imports[0]).toMatchObject({
          source: 'fs',
          type: 'commonjs',
          specifiers: ['fs']
        });
      });

      it('should extract destructured require statements', async () => {
        // Arrange
        const testFile = '/test/commonjs-destructure.ts';        mockFs.setFile(testFile, `const { readFile, writeFile } = require('fs/promises');`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(1);
        expect(analysis.imports[0]).toMatchObject({
          source: 'fs/promises',
          type: 'commonjs',
          specifiers: expect.arrayContaining(['readFile', 'writeFile'])
        });
      });
    });

    describe('exports', () => {
      it('should extract named exports', async () => {
        // Arrange
        const testFile = '/test/named-exports.ts';        mockFs.setFile(testFile, `
          export const myConst = 42;
          export function myFunction() {}
          export class MyClass {}
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.exports).toHaveLength(3);
        expect(analysis.exports).toContainEqual(
          expect.objectContaining({ name: 'myConst', type: 'named' })
        );
        expect(analysis.exports).toContainEqual(
          expect.objectContaining({ name: 'myFunction', type: 'named' })
        );
        expect(analysis.exports).toContainEqual(
          expect.objectContaining({ name: 'MyClass', type: 'named' })
        );
      });

      it('should extract default exports', async () => {
        // Arrange
        const testFile = '/test/default-export.ts';        mockFs.setFile(testFile, `export default function myDefault() {}`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.exports).toHaveLength(1);
        expect(analysis.exports[0]).toMatchObject({
          name: 'default',
          type: 'default'
        });
      });

      it('should extract re-exports', async () => {
        // Arrange
        const testFile = '/test/re-exports.ts';        mockFs.setFile(testFile, `
          export { something } from './other';
          export * from './all';
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.exports.length).toBeGreaterThan(0);
        expect(analysis.imports.length).toBeGreaterThan(0); // Re-exports create implicit imports
      });

      it('should extract type exports', async () => {
        // Arrange
        const testFile = '/test/type-exports.ts';        mockFs.setFile(testFile, `
          export type MyType = string;
          export interface MyInterface {}
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.exports).toHaveLength(2);
      });
    });

    describe('dependency resolution', () => {
      // TODO: Move to integration tests - requires real filesystem for TSImportResolver
      it.skip('should resolve relative import dependencies', async () => {
        // Arrange
        const testFile = '/test/src/index.ts';
        const utilsFile = '/test/src/utils.ts';        mockFs.setFile(testFile, `import { util } from './utils';`);
        mockFs.setFile(utilsFile, `export function util() {}`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.dependencies).toContain(utilsFile);
      });

      it('should not include external dependencies in dependency list', async () => {
        // Arrange
        const testFile = '/test/index.ts';        mockFs.setFile(testFile, `import React from 'react';`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.dependencies).toHaveLength(0);
        expect(analysis.imports).toHaveLength(1); // Import is tracked, but not as dependency
      });

      // TODO: Move to integration tests - requires real filesystem for TSImportResolver
      it.skip('should handle multiple dependencies', async () => {
        // Arrange
        const testFile = '/test/src/index.ts';
        const utils1 = '/test/src/utils1.ts';
        const utils2 = '/test/src/utils2.ts';
        const helpers = '/test/src/helpers.ts';        mockFs.setFile(testFile, `
          import { util1 } from './utils1';
          import { util2 } from './utils2';
          import { helper } from './helpers';
        `);
        mockFs.setFile(utils1, `export function util1() {}`);
        mockFs.setFile(utils2, `export function util2() {}`);
        mockFs.setFile(helpers, `export function helper() {}`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.dependencies).toHaveLength(3);
        expect(analysis.dependencies).toContain(utils1);
        expect(analysis.dependencies).toContain(utils2);
        expect(analysis.dependencies).toContain(helpers);
      });
    });

    describe('error handling', () => {
      it('should throw error for non-existent files', async () => {
        // Arrange
        const nonExistentFile = '/test/does-not-exist.ts';

        // Act & Assert
        await expect(parser.parseFile(nonExistentFile))
          .rejects.toThrow(/File not found/);
      });

      it('should handle syntax errors gracefully', async () => {
        // Arrange
        const testFile = '/test/syntax-error.ts';        mockFs.setFile(testFile, `
          import { something from 'broken';  // Missing closing brace
          const x = ;  // Invalid syntax
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.errors).toBeDefined();
        expect(analysis.errors!.length).toBeGreaterThan(0);
        expect(analysis.errors![0].type).toBe('parse');
      });

      it('should handle malformed imports', async () => {
        // Arrange
        const testFile = '/test/malformed-import.ts';        mockFs.setFile(testFile, `
          import from './module';
          import { } from './empty';
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.errors).toBeDefined();
        expect(analysis.errors!.length).toBeGreaterThan(0);
      });

      it('should handle malformed exports', async () => {
        // Arrange
        const testFile = '/test/malformed-export.ts';        mockFs.setFile(testFile, `
          export;
          export { };
          export class;
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.errors).toBeDefined();
        expect(analysis.errors!.length).toBeGreaterThan(0);
      });
    });

    describe('file metadata', () => {
      it('should include file path in analysis', async () => {
        // Arrange
        const testFile = '/test/test.ts';        mockFs.setFile(testFile, `export const x = 1;`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.path).toBe(testFile);
      });

      it('should initialize dependents array', async () => {
        // Arrange
        const testFile = '/test/test.ts';        mockFs.setFile(testFile, `export const x = 1;`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.dependents).toBeDefined();
        expect(analysis.dependents).toEqual([]);
      });

      it('should handle empty files', async () => {
        // Arrange
        const testFile = '/test/empty.ts';        mockFs.setFile(testFile, '');

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(0);
        expect(analysis.exports).toHaveLength(0);
        expect(analysis.dependencies).toHaveLength(0);
      });

      it('should handle files with only comments', async () => {
        // Arrange
        const testFile = '/test/comments-only.ts';        mockFs.setFile(testFile, `
          // This is a comment
          /* Multi-line
             comment */
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(0);
        expect(analysis.exports).toHaveLength(0);
        expect(analysis.dependencies).toHaveLength(0);
      });
    });

    describe('complex TypeScript features', () => {
      it('should handle JSX/TSX syntax', async () => {
        // Arrange
        const testFile = '/test/component.tsx';        mockFs.setFile(testFile, `
          import React from 'react';
          export const Component = () => <div>Hello</div>;
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(1);
        expect(analysis.exports).toHaveLength(1);
      });

      it('should handle decorators', async () => {
        // Arrange
        const testFile = '/test/decorators.ts';        mockFs.setFile(testFile, `
          function decorator(target: any) {}

          @decorator
          export class MyClass {}
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.exports).toHaveLength(1);
      });

      it('should handle generics', async () => {
        // Arrange
        const testFile = '/test/generics.ts';        mockFs.setFile(testFile, `
          export function identity<T>(arg: T): T {
            return arg;
          }
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.exports).toHaveLength(1);
        expect(analysis.exports[0].name).toBe('identity');
      });

      it('should handle enum exports', async () => {
        // Arrange
        const testFile = '/test/enums.ts';        mockFs.setFile(testFile, `
          export enum Status {
            ACTIVE,
            INACTIVE
          }
        `);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.exports).toHaveLength(1);
        expect(analysis.exports[0].name).toBe('Status');
      });
    });

    describe('performance', () => {
      itPerformance('should parse files efficiently', async () => {

        // Arrange
        const testFile = '/test/large-file.ts';
        // Create a file with many imports and exports
        const imports = Array.from({ length: 50 }, (_, i) =>
          `import { func${i} } from './module${i}';`
        ).join('\n');
        const exports = Array.from({ length: 50 }, (_, i) =>
          `export function func${i}() {}`
        ).join('\n');

        mockFs.setFile(testFile, `${imports}\n\n${exports}`);

        // Act
        const startTime = Date.now();
        const analysis = await parser.parseFile(testFile);
        const duration = Date.now() - startTime;

        // Assert
        expect(analysis.imports).toHaveLength(50);
        expect(analysis.exports).toHaveLength(50);
        expect(duration).toBeLessThan(3000); // Increased threshold for test environment variability
      });
    });
  });

  describe('with custom import resolver', () => {
    // TODO: Move to integration tests - requires real filesystem for TSImportResolver
    it.skip('should use injected import resolver', async () => {
      // Arrange
      const mockResolver = new TSImportResolver();
      const mockResolve = vi.spyOn(mockResolver, 'resolveDependencyPath');
      mockResolve.mockResolvedValue('/mock/resolved/path.ts');

      const customParser = new TSASTParser({ importResolver: mockResolver });

      const testFile = '/test/with-import.ts';      mockFs.setFile(testFile, `import { x } from './module';`);

      // Act
      await customParser.parseFile(testFile);

      // Assert
      expect(mockResolve).toHaveBeenCalled();
    });
  });
});
