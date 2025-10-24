import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest Configuration for Unit Tests
 *
 * Unit tests should be:
 * - Fast (< 5 seconds total)
 * - Isolated (no external dependencies)
 * - Mocked (all I/O operations mocked)
 * - Deterministic (same result every time)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'src/**/*.unit.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/unit/adapters/HouseholdFoodAdapter.test.ts', // Excluded from v0.1.0 build
    ],
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
    // Unit tests should be fast - 5 second timeout
    testTimeout: 5000,
    // Allow parallel execution for speed
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
