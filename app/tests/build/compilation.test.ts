import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

/**
 * Test suite to validate TypeScript compilation compliance
 *
 * These tests ensure that:
 * 1. TypeScript compilation succeeds without errors
 * 2. All imports are properly resolved
 * 3. Type checking passes for all source files
 * 4. No syntax errors exist in the codebase
 */
describe('TypeScript Compilation Compliance', () => {
  const projectRoot = join(process.cwd());

  describe('TypeScript Compilation', () => {
    it('should compile without TypeScript errors', () => {
      try {
        // Run TypeScript compiler with no emit to check for errors
        const result = execSync('npx tsc --noEmit', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        // If we get here, compilation succeeded
        expect(true).toBe(true);
      } catch (error: any) {
        // Parse TypeScript errors for better reporting
        const stderr = error.stderr || error.stdout || '';
        const errors = parseTypescriptErrors(stderr);

        // Fail with detailed error information
        const errorSummary = `TypeScript compilation failed with ${errors.length} errors:\n\n` +
          errors.slice(0, 10).map((err, index) =>
            `${index + 1}. ${err.file}:${err.line}:${err.column} - ${err.code}: ${err.message}`
          ).join('\n') +
          (errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : '');

        throw new Error(errorSummary);
      }
    });

    it('should have valid TypeScript configuration', () => {
      try {
        // Validate tsconfig.json can be loaded
        const result = execSync('npx tsc --showConfig', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        // Parse the config to ensure it's valid JSON
        const config = JSON.parse(result);

        // Validate key configuration properties
        expect(config.compilerOptions).toBeDefined();
        expect(config.compilerOptions.strict).toBe(true);
        expect(config.include).toBeDefined();
        expect(Array.isArray(config.include)).toBe(true);
      } catch (error: any) {
        throw new Error(`Invalid TypeScript configuration: ${error.message}`);
      }
    });

    it('should have no syntax errors in source files', () => {
      try {
        // Run TypeScript with --noEmit and --skipLibCheck for faster syntax checking
        execSync('npx tsc --noEmit --skipLibCheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        expect(true).toBe(true);
      } catch (error: any) {
        const stderr = error.stderr || error.stdout || '';
        throw new Error(`Syntax errors found in source files:\n${stderr}`);
      }
    });
  });

  describe('Import Resolution', () => {
    it('should resolve all imports without errors', () => {
      try {
        // TypeScript compilation inherently checks import resolution
        execSync('npx tsc --noEmit --moduleResolution bundler', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        expect(true).toBe(true);
      } catch (error: any) {
        const stderr = error.stderr || error.stdout || '';
        const importErrors = parseImportErrors(stderr);

        if (importErrors.length > 0) {
          const errorSummary = `Import resolution failed:\n` +
            importErrors.map(err => `- ${err}`).join('\n');
          throw new Error(errorSummary);
        }

        throw new Error(`Import resolution failed: ${stderr}`);
      }
    });
  });

  describe('Code Quality Standards', () => {
    it('should have proper ESLint configuration when available', () => {
      // This test checks if ESLint config exists and is valid
      // Currently the project doesn't have ESLint setup, so we'll make this conditional
      try {
        const fs = require('fs');
        const path = require('path');

        const eslintFiles = [
          '.eslintrc.js',
          '.eslintrc.json',
          '.eslintrc.yaml',
          '.eslintrc.yml',
          'eslint.config.js'
        ];

        const hasEslintConfig = eslintFiles.some(file =>
          fs.existsSync(path.join(projectRoot, file))
        );

        if (hasEslintConfig) {
          // If ESLint config exists, validate it works
          execSync('npx eslint --print-config src/index.ts', {
            cwd: projectRoot,
            encoding: 'utf-8',
            stdio: 'pipe'
          });
        }

        // Test passes whether ESLint is configured or not
        // This is future-proofing for when ESLint is added
        expect(true).toBe(true);
      } catch (error: any) {
        throw new Error(`ESLint configuration invalid: ${error.message}`);
      }
    });
  });
});

/**
 * Parse TypeScript compiler error output into structured format
 */
function parseTypescriptErrors(stderr: string): Array<{
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}> {
  const errors: Array<{
    file: string;
    line: number;
    column: number;
    code: string;
    message: string;
  }> = [];

  // TypeScript error format: file(line,column): error TSxxxx: message
  const errorRegex = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;

  const lines = stderr.split('\n');
  for (const line of lines) {
    const match = line.match(errorRegex);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5]
      });
    }
  }

  return errors;
}

/**
 * Parse import-related errors from TypeScript output
 */
function parseImportErrors(stderr: string): string[] {
  const importErrors: string[] = [];
  const lines = stderr.split('\n');

  for (const line of lines) {
    if (line.includes('Cannot find module') ||
        line.includes('Module not found') ||
        line.includes('Cannot resolve')) {
      importErrors.push(line.trim());
    }
  }

  return importErrors;
}