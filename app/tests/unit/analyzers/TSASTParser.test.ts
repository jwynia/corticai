import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TSASTParser } from '../../../src/analyzers/TSASTParser';
import { TSImportResolver } from '../../../src/analyzers/TSImportResolver';
import type { FileAnalysis } from '../../../src/analyzers/types';

describe('TSASTParser', () => {
  let parser: TSASTParser;
  let resolver: TSImportResolver;
  const testProjectDir = path.join(__dirname, 'test-ast-parser');

  beforeEach(() => {
    resolver = new TSImportResolver();
    parser = new TSASTParser({ importResolver: resolver });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testProjectDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('parseFile', () => {
    describe('ES6 imports', () => {
      it('should extract default imports', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'default-import.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `import React from 'react';`);

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
        const testFile = path.join(testProjectDir, 'named-imports.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `import { useState, useEffect } from 'react';`);

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
        const testFile = path.join(testProjectDir, 'namespace-import.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `import * as utils from './utils';`);

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
        const testFile = path.join(testProjectDir, 'type-import.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `import type { Config } from './config';`);

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
        const testFile = path.join(testProjectDir, 'mixed-imports.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'commonjs.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `const fs = require('fs');`);

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
        const testFile = path.join(testProjectDir, 'commonjs-destructure.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `const { readFile, writeFile } = require('fs/promises');`);

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
        const testFile = path.join(testProjectDir, 'named-exports.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'default-export.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `export default function myDefault() {}`);

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
        const testFile = path.join(testProjectDir, 're-exports.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'type-exports.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
      it('should resolve relative import dependencies', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'src', 'index.ts');
        const utilsFile = path.join(testProjectDir, 'src', 'utils.ts');

        await fs.mkdir(path.dirname(testFile), { recursive: true });
        await fs.writeFile(testFile, `import { util } from './utils';`);
        await fs.writeFile(utilsFile, `export function util() {}`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.dependencies).toContain(utilsFile);
      });

      it('should not include external dependencies in dependency list', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'index.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `import React from 'react';`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.dependencies).toHaveLength(0);
        expect(analysis.imports).toHaveLength(1); // Import is tracked, but not as dependency
      });

      it('should handle multiple dependencies', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'src', 'index.ts');
        const utils1 = path.join(testProjectDir, 'src', 'utils1.ts');
        const utils2 = path.join(testProjectDir, 'src', 'utils2.ts');
        const helpers = path.join(testProjectDir, 'src', 'helpers.ts');

        await fs.mkdir(path.dirname(testFile), { recursive: true });
        await fs.writeFile(testFile, `
          import { util1 } from './utils1';
          import { util2 } from './utils2';
          import { helper } from './helpers';
        `);
        await fs.writeFile(utils1, `export function util1() {}`);
        await fs.writeFile(utils2, `export function util2() {}`);
        await fs.writeFile(helpers, `export function helper() {}`);

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
        const nonExistentFile = path.join(testProjectDir, 'does-not-exist.ts');

        // Act & Assert
        await expect(parser.parseFile(nonExistentFile))
          .rejects.toThrow(/File not found/);
      });

      it('should handle syntax errors gracefully', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'syntax-error.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'malformed-import.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'malformed-export.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'test.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `export const x = 1;`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.path).toBe(testFile);
      });

      it('should initialize dependents array', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'test.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `export const x = 1;`);

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.dependents).toBeDefined();
        expect(analysis.dependents).toEqual([]);
      });

      it('should handle empty files', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'empty.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, '');

        // Act
        const analysis = await parser.parseFile(testFile);

        // Assert
        expect(analysis.imports).toHaveLength(0);
        expect(analysis.exports).toHaveLength(0);
        expect(analysis.dependencies).toHaveLength(0);
      });

      it('should handle files with only comments', async () => {
        // Arrange
        const testFile = path.join(testProjectDir, 'comments-only.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'component.tsx');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'decorators.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'generics.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
        const testFile = path.join(testProjectDir, 'enums.ts');
        await fs.mkdir(testProjectDir, { recursive: true });
        await fs.writeFile(testFile, `
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
      it.skipIf(process.env.CI === 'true')('should parse files efficiently', async () => {
        // Note: Performance tests are skipped in CI because they're non-deterministic
        // (same code doesn't always get same result due to environment variance)

        // Arrange
        const testFile = path.join(testProjectDir, 'large-file.ts');
        await fs.mkdir(testProjectDir, { recursive: true });

        // Create a file with many imports and exports
        const imports = Array.from({ length: 50 }, (_, i) =>
          `import { func${i} } from './module${i}';`
        ).join('\n');
        const exports = Array.from({ length: 50 }, (_, i) =>
          `export function func${i}() {}`
        ).join('\n');

        await fs.writeFile(testFile, `${imports}\n\n${exports}`);

        // Act
        const startTime = Date.now();
        const analysis = await parser.parseFile(testFile);
        const duration = Date.now() - startTime;

        // Assert
        expect(analysis.imports).toHaveLength(50);
        expect(analysis.exports).toHaveLength(50);
        expect(duration).toBeLessThan(2000); // Local dev threshold
      });
    });
  });

  describe('with custom import resolver', () => {
    it('should use injected import resolver', async () => {
      // Arrange
      const mockResolver = new TSImportResolver();
      const mockResolve = vi.spyOn(mockResolver, 'resolveDependencyPath');
      mockResolve.mockResolvedValue('/mock/resolved/path.ts');

      const customParser = new TSASTParser({ importResolver: mockResolver });

      const testFile = path.join(testProjectDir, 'with-import.ts');
      await fs.mkdir(testProjectDir, { recursive: true });
      await fs.writeFile(testFile, `import { x } from './module';`);

      // Act
      await customParser.parseFile(testFile);

      // Assert
      expect(mockResolve).toHaveBeenCalled();
    });
  });
});
