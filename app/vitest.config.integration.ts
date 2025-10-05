import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest Configuration for Integration Tests
 *
 * Integration tests may:
 * - Use real databases (Kuzu, DuckDB)
 * - Perform file I/O operations
 * - Take longer to execute (< 30s per test)
 * - Require cleanup after each test
 *
 * These tests verify that components work together correctly
 * with real dependencies.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.ts',
        'src/**/*.tsx',
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.ts',
        '**/*.config.js',
        '.mastra/**',
        'dist/**',
        'coverage/**',
      ],
    },
    // Integration tests can take longer - 30 second timeout per test
    testTimeout: 30000,
    // Run sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Give more time for cleanup
    teardownTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
