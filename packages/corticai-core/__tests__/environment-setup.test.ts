import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Helper function for safe JSON parsing
function parseJsonFile(filePath: string, fileName: string): any {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`Failed to parse ${fileName}: ${error}`);
  }
}

describe('Environment Setup', () => {
  const projectRoot = join(__dirname, '..');
  
  describe('Project Structure', () => {
    it('should have a package.json file', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);
    });

    it('should have correct package.json configuration', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.name).toBe('@corticai/core');
      expect(packageJson.version).toBeDefined();
      expect(packageJson.type).toBe('module');
      expect(packageJson.engines.node).toBeDefined();
      expect(packageJson.engines.node).toMatch(/>=18/);
    });

    it('should have TypeScript configuration', () => {
      const tsconfigPath = join(projectRoot, 'tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = parseJsonFile(tsconfigPath, 'tsconfig.json');
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.target).toMatch(/ES2022|ESNext/);
      expect(tsconfig.compilerOptions.module).toMatch(/ESNext|NodeNext/);
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have source directory structure', () => {
      expect(existsSync(join(projectRoot, 'src'))).toBe(true);
      expect(existsSync(join(projectRoot, 'src/index.ts'))).toBe(true);
    });

    it('should have test directory structure', () => {
      expect(existsSync(join(projectRoot, '__tests__'))).toBe(true);
    });
  });

  describe('Build Configuration', () => {
    it('should have build scripts configured', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.clean).toBeDefined();
    });

    it('should have tsx configured for development', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.devDependencies?.tsx).toBeDefined();
      expect(packageJson.scripts.dev).toContain('tsx');
    });

    it('should have esbuild configured for production builds', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.devDependencies?.esbuild).toBeDefined();
    });

    it('should successfully build the project', () => {
      const result = execSync('npm run build', {
        cwd: projectRoot,
        encoding: 'utf-8'
      });
      
      expect(existsSync(join(projectRoot, 'dist'))).toBe(true);
      expect(existsSync(join(projectRoot, 'dist/index.js'))).toBe(true);
    });
  });

  describe('Testing Framework', () => {
    it('should have vitest configured', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.devDependencies?.vitest).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts.test).toContain('vitest');
    });

    it('should have vitest configuration file', () => {
      const vitestConfigPath = join(projectRoot, 'vitest.config.ts');
      expect(existsSync(vitestConfigPath)).toBe(true);
    });

    it('should have test coverage script', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.scripts['test:coverage']).toBeDefined();
      expect(packageJson.scripts['test:coverage']).toContain('--coverage');
    });
  });

  describe('Linting and Formatting', () => {
    it('should have ESLint configured', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.devDependencies?.eslint).toBeDefined();
      expect(packageJson.devDependencies?.['@typescript-eslint/parser']).toBeDefined();
      expect(packageJson.devDependencies?.['@typescript-eslint/eslint-plugin']).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
    });

    it('should have ESLint configuration file', () => {
      const eslintConfigPath = join(projectRoot, '.eslintrc.json');
      expect(existsSync(eslintConfigPath)).toBe(true);
      
      const eslintConfig = parseJsonFile(eslintConfigPath, '.eslintrc.json');
      expect(eslintConfig.parser).toBe('@typescript-eslint/parser');
      expect(eslintConfig.plugins).toContain('@typescript-eslint');
    });

    it('should have Prettier configured', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.devDependencies?.prettier).toBeDefined();
      expect(packageJson.scripts.format).toBeDefined();
    });

    it('should have Prettier configuration file', () => {
      const prettierConfigPath = join(projectRoot, '.prettierrc');
      expect(existsSync(prettierConfigPath)).toBe(true);
      
      const prettierConfig = parseJsonFile(prettierConfigPath, '.prettierrc');
      expect(prettierConfig.semi).toBeDefined();
      expect(prettierConfig.singleQuote).toBeDefined();
      expect(prettierConfig.tabWidth).toBe(2);
    });

    it('should have git hooks configured', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = parseJsonFile(packageJsonPath, 'package.json');
      
      expect(packageJson.devDependencies?.husky).toBeDefined();
      expect(packageJson.devDependencies?.['lint-staged']).toBeDefined();
    });
  });

  describe('Path Aliases', () => {
    it('should have path aliases configured in tsconfig', () => {
      const tsconfigPath = join(projectRoot, 'tsconfig.json');
      const tsconfig = parseJsonFile(tsconfigPath, 'tsconfig.json');
      
      expect(tsconfig.compilerOptions.paths).toBeDefined();
      expect(tsconfig.compilerOptions.paths['@/*']).toBeDefined();
      expect(tsconfig.compilerOptions.baseUrl).toBe('.');
    });
  });

  describe('Git Configuration', () => {
    it('should have .gitignore file', () => {
      const gitignorePath = join(projectRoot, '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
      
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      expect(gitignore).toContain('node_modules');
      expect(gitignore).toContain('dist');
      expect(gitignore).toContain('.env');
      expect(gitignore).toContain('coverage');
    });
  });

  describe('Environment Variables', () => {
    it('should have .env.example file', () => {
      const envExamplePath = join(projectRoot, '.env.example');
      expect(existsSync(envExamplePath)).toBe(true);
    });
  });

  describe('Documentation', () => {
    it('should have README.md file', () => {
      const readmePath = join(projectRoot, 'README.md');
      expect(existsSync(readmePath)).toBe(true);
      
      const readme = readFileSync(readmePath, 'utf-8');
      expect(readme).toContain('# CorticAI Core');
      expect(readme).toContain('## Installation');
      expect(readme).toContain('## Usage');
    });
  });
});