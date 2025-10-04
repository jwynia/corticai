# CI/CD Pipeline Integration

## Purpose
This document defines the continuous integration and deployment configuration for automated testing in the Pliers v3 platform, ensuring consistent test execution across environments and maintaining code quality gates.

## Classification
- **Domain:** Supporting Element
- **Stability:** Semi-stable
- **Abstraction:** Detailed
- **Confidence:** Established

## Overview

The CI/CD pipeline integration ensures that all tests are executed consistently across development, staging, and production environments. It provides automated quality gates, performance monitoring, and comprehensive reporting to maintain code quality and system reliability.

## CI/CD Platform Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    # Run tests daily at 2 AM UTC
    - cron: '0 2 * * *'

env:
  NODE_VERSION: '20'
  POSTGRES_VERSION: '15'
  REDIS_VERSION: '7'

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20, 21]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit
        env:
          NODE_ENV: test

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit-tests
          name: unit-tests-${{ matrix.node-version }}

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: pliers_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pliers_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pliers_test
          REDIS_URL: redis://localhost:6379

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results
          path: test-results/

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:performance

      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results/

  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier
        run: npm run format:check

      - name: Run TypeScript check
        run: npm run type-check

      - name: Run security audit
        run: npm audit --audit-level moderate

  test-summary:
    name: Test Summary
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, performance-tests, code-quality]
    if: always()

    steps:
      - name: Download test artifacts
        uses: actions/download-artifact@v3

      - name: Generate test summary
        run: |
          echo "## Test Results Summary" >> $GITHUB_STEP_SUMMARY
          echo "- Unit Tests: ${{ needs.unit-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Integration Tests: ${{ needs.integration-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Performance Tests: ${{ needs.performance-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Code Quality: ${{ needs.code-quality.result }}" >> $GITHUB_STEP_SUMMARY
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage --reporter=default --reporter=junit --outputFile=test-results/junit.xml",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:performance": "vitest run --config vitest.performance.config.ts",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --coverage --ui",
    "test:related": "vitest related",
    "test:changed": "vitest --changed",
    "test:ci": "npm run test:unit && npm run test:integration",
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit"
  }
}
```

## Vitest Configuration for CI

### Base Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      '**/*.integration.test.ts',
      '**/*.performance.test.ts'
    ],

    // CI-specific configuration
    reporter: process.env.CI
      ? ['default', 'junit', 'html']
      : ['default'],

    outputFile: {
      junit: 'test-results/junit.xml',
      html: 'test-results/index.html'
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: 'coverage',

      // Coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },

        // Higher thresholds for critical components
        'src/components/EventEngine/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },

        'src/components/FormEngine/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },

      exclude: [
        'src/**/*.d.ts',
        'src/**/*.config.ts',
        'src/**/*.mock.ts',
        'src/**/*.fixture.ts',
        'tests/**/*',
        'src/types/**',
        'src/**/*.stories.ts'
      ]
    },

    // Test execution configuration
    testTimeout: process.env.CI ? 30000 : 10000, // 30s in CI, 10s locally
    hookTimeout: process.env.CI ? 20000 : 10000, // 20s in CI, 10s locally

    // Retry configuration for CI
    retry: process.env.CI ? 2 : 0,

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: process.env.CI ? 2 : undefined,
        minThreads: 1
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
```

### Integration Test Configuration

```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/**/*.integration.test.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.performance.test.ts'],

    // Integration tests need more time
    testTimeout: 60000,
    hookTimeout: 30000,

    // Run integration tests sequentially to avoid conflicts
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1
      }
    },

    // Setup files for integration tests
    setupFiles: [
      './tests/setup/vitest.setup.ts',
      './tests/setup/database.setup.ts'
    ],

    // Environment variables for integration tests
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/pliers_test',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
    }
  }
});
```

### Performance Test Configuration

```typescript
// vitest.performance.config.ts
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/**/*.performance.test.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],

    // Performance tests need extended timeouts
    testTimeout: 120000, // 2 minutes
    hookTimeout: 60000,  // 1 minute

    // Run performance tests sequentially
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1
      }
    },

    // Performance-specific setup
    setupFiles: [
      './tests/setup/vitest.setup.ts',
      './tests/setup/performance.setup.ts'
    ],

    // Custom reporter for performance results
    reporter: ['default', './tests/reporters/performance-reporter.ts']
  }
});
```

## Quality Gates and Enforcement

### Coverage Gates

```typescript
// scripts/check-coverage.ts
import fs from 'fs';
import path from 'path';

interface CoverageReport {
  total: {
    lines: { pct: number };
    functions: { pct: number };
    statements: { pct: number };
    branches: { pct: number };
  };
}

const coverageReport: CoverageReport = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../coverage/coverage-summary.json'), 'utf8')
);

const thresholds = {
  lines: 80,
  functions: 80,
  statements: 80,
  branches: 80
};

const { total } = coverageReport;
const failures: string[] = [];

Object.entries(thresholds).forEach(([metric, threshold]) => {
  const actual = total[metric as keyof typeof total].pct;
  if (actual < threshold) {
    failures.push(`${metric}: ${actual}% < ${threshold}%`);
  }
});

if (failures.length > 0) {
  console.error('Coverage thresholds not met:');
  failures.forEach(failure => console.error(`  - ${failure}`));
  process.exit(1);
} else {
  console.log('All coverage thresholds met ✅');
}
```

### Performance Gates

```typescript
// scripts/check-performance.ts
import fs from 'fs';
import path from 'path';

interface PerformanceMetrics {
  testSuite: string;
  averageExecutionTime: number;
  p95ExecutionTime: number;
  memoryUsage: number;
  throughput: number;
}

const performanceReport: PerformanceMetrics[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../performance-results/summary.json'), 'utf8')
);

const thresholds = {
  'EventEngine.publishEvent': { maxTime: 50, maxMemory: 10 * 1024 * 1024 },
  'EventEngine.publishBatch': { maxTime: 500, maxMemory: 50 * 1024 * 1024 },
  'FormEngine.validateForm': { maxTime: 100, maxMemory: 5 * 1024 * 1024 }
};

const failures: string[] = [];

performanceReport.forEach(metric => {
  const threshold = thresholds[metric.testSuite];
  if (!threshold) return;

  if (metric.p95ExecutionTime > threshold.maxTime) {
    failures.push(
      `${metric.testSuite}: P95 execution time ${metric.p95ExecutionTime}ms > ${threshold.maxTime}ms`
    );
  }

  if (metric.memoryUsage > threshold.maxMemory) {
    failures.push(
      `${metric.testSuite}: Memory usage ${metric.memoryUsage} bytes > ${threshold.maxMemory} bytes`
    );
  }
});

if (failures.length > 0) {
  console.error('Performance thresholds not met:');
  failures.forEach(failure => console.error(`  - ${failure}`));
  process.exit(1);
} else {
  console.log('All performance thresholds met ✅');
}
```

## Test Environment Setup

### Database Setup for CI

```typescript
// tests/setup/database.setup.ts
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

const setupDatabase = async () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/pliers_test';
  const pool = new Pool({ connectionString });

  try {
    // Run migrations
    const migrationFiles = await fs.readdir('./migrations');
    for (const file of migrationFiles.sort()) {
      const migration = await fs.readFile(`./migrations/${file}`, 'utf8');
      await pool.query(migration);
    }

    // Seed test data
    const seedFiles = await fs.readdir('./tests/seeds');
    for (const file of seedFiles.sort()) {
      const seed = await fs.readFile(`./tests/seeds/${file}`, 'utf8');
      await pool.query(seed);
    }

    console.log('Database setup completed');
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Only run setup if we're in a test environment
if (process.env.NODE_ENV === 'test') {
  setupDatabase();
}
```

### Environment Configuration

```typescript
// tests/setup/test-env.setup.ts
import { vi } from 'vitest';

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock external services in test environment
vi.mock('@/external/EmailService', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    validateEmail: vi.fn().mockReturnValue(true)
  }))
}));

// Set up fake timers for consistent testing
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123'),
  randomBytes: vi.fn(() => Buffer.from('test-random-bytes'))
}));

// Configure global test timeout
if (process.env.CI) {
  vi.setConfig({ testTimeout: 30000 });
}
```

## Test Result Reporting

### Custom Performance Reporter

```typescript
// tests/reporters/performance-reporter.ts
import { Reporter } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

interface PerformanceData {
  testSuite: string;
  testName: string;
  executionTime: number;
  memoryUsage: number;
  timestamp: string;
}

export class PerformanceReporter implements Reporter {
  private performanceData: PerformanceData[] = [];

  onTestFinished(test: any) {
    if (test.name.includes('performance') || test.file.includes('.performance.')) {
      this.performanceData.push({
        testSuite: test.suite?.name || 'Unknown',
        testName: test.name,
        executionTime: test.result?.duration || 0,
        memoryUsage: this.getMemoryUsage(),
        timestamp: new Date().toISOString()
      });
    }
  }

  async onFinished() {
    await this.writePerformanceReport();
  }

  private getMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  private async writePerformanceReport() {
    const reportDir = 'performance-results';
    await fs.mkdir(reportDir, { recursive: true });

    // Write detailed report
    await fs.writeFile(
      path.join(reportDir, 'detailed.json'),
      JSON.stringify(this.performanceData, null, 2)
    );

    // Write summary report
    const summary = this.generateSummary();
    await fs.writeFile(
      path.join(reportDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log(`Performance report written to ${reportDir}/`);
  }

  private generateSummary() {
    const grouped = this.groupByTestSuite();

    return Object.entries(grouped).map(([testSuite, tests]) => ({
      testSuite,
      averageExecutionTime: this.average(tests.map(t => t.executionTime)),
      p95ExecutionTime: this.percentile(tests.map(t => t.executionTime), 0.95),
      memoryUsage: this.average(tests.map(t => t.memoryUsage)),
      throughput: tests.length / (this.sum(tests.map(t => t.executionTime)) / 1000)
    }));
  }

  private groupByTestSuite() {
    return this.performanceData.reduce((acc, data) => {
      if (!acc[data.testSuite]) {
        acc[data.testSuite] = [];
      }
      acc[data.testSuite].push(data);
      return acc;
    }, {} as Record<string, PerformanceData[]>);
  }

  private average(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
  }

  private percentile(numbers: number[], p: number): number {
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}

export default PerformanceReporter;
```

### Test Results Dashboard

```typescript
// scripts/generate-test-dashboard.ts
import fs from 'fs/promises';
import path from 'path';

interface TestResults {
  unit: { passed: number; failed: number; coverage: number };
  integration: { passed: number; failed: number };
  performance: { passed: number; failed: number; avgTime: number };
}

const generateDashboard = async () => {
  const testResults: TestResults = await collectTestResults();

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Results Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .passed { color: green; }
        .failed { color: red; }
        .metric { display: inline-block; margin: 10px 20px; }
    </style>
</head>
<body>
    <h1>Test Results Dashboard</h1>

    <div class="card">
        <h2>Unit Tests</h2>
        <div class="metric">
            <span class="passed">Passed: ${testResults.unit.passed}</span>
        </div>
        <div class="metric">
            <span class="failed">Failed: ${testResults.unit.failed}</span>
        </div>
        <div class="metric">
            Coverage: ${testResults.unit.coverage}%
        </div>
    </div>

    <div class="card">
        <h2>Integration Tests</h2>
        <div class="metric">
            <span class="passed">Passed: ${testResults.integration.passed}</span>
        </div>
        <div class="metric">
            <span class="failed">Failed: ${testResults.integration.failed}</span>
        </div>
    </div>

    <div class="card">
        <h2>Performance Tests</h2>
        <div class="metric">
            <span class="passed">Passed: ${testResults.performance.passed}</span>
        </div>
        <div class="metric">
            <span class="failed">Failed: ${testResults.performance.failed}</span>
        </div>
        <div class="metric">
            Average Time: ${testResults.performance.avgTime}ms
        </div>
    </div>
</body>
</html>
  `;

  await fs.writeFile('test-results/dashboard.html', html);
  console.log('Test dashboard generated at test-results/dashboard.html');
};

const collectTestResults = async (): Promise<TestResults> => {
  // Implementation to collect results from various test reports
  // This would parse JUnit XML, coverage reports, and performance results
  return {
    unit: { passed: 150, failed: 2, coverage: 85 },
    integration: { passed: 45, failed: 1 },
    performance: { passed: 20, failed: 0, avgTime: 125 }
  };
};

generateDashboard().catch(console.error);
```

## Pre-commit Hooks

### Husky Configuration

```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged to check staged files
npx lint-staged

# Run related tests for changed files
npm run test:related

# Check TypeScript types
npm run type-check
```

### Lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ],
    "*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{md,json,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

## Branch Protection Rules

### GitHub Branch Protection Configuration

```yaml
# .github/branch-protection.yml (using GitHub API)
protection_rules:
  main:
    required_status_checks:
      strict: true
      contexts:
        - "Unit Tests (18)"
        - "Unit Tests (20)"
        - "Unit Tests (21)"
        - "Integration Tests"
        - "Performance Tests"
        - "Code Quality"
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 2
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
    restrictions: null

  develop:
    required_status_checks:
      strict: true
      contexts:
        - "Unit Tests (20)"
        - "Integration Tests"
        - "Code Quality"
    enforce_admins: false
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
    restrictions: null
```

## Monitoring and Alerting

### Test Failure Notifications

```yaml
# .github/workflows/notify-failures.yml
name: Test Failure Notifications

on:
  workflow_run:
    workflows: ["Test Suite"]
    types:
      - completed

jobs:
  notify-on-failure:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}

    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#development'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          text: |
            🚨 Test Suite Failed
            Branch: ${{ github.event.workflow_run.head_branch }}
            Commit: ${{ github.event.workflow_run.head_sha }}
            Author: ${{ github.event.workflow_run.head_commit.author.name }}
```

### Performance Regression Detection

```typescript
// scripts/detect-performance-regression.ts
import fs from 'fs';
import path from 'path';

interface PerformanceBaseline {
  [testSuite: string]: {
    averageTime: number;
    p95Time: number;
    memoryUsage: number;
  };
}

const detectRegressions = async () => {
  const baseline: PerformanceBaseline = JSON.parse(
    fs.readFileSync('./performance-baseline.json', 'utf8')
  );

  const current = JSON.parse(
    fs.readFileSync('./performance-results/summary.json', 'utf8')
  );

  const regressions: string[] = [];
  const REGRESSION_THRESHOLD = 1.2; // 20% increase is considered regression

  current.forEach((metric: any) => {
    const baselineMetric = baseline[metric.testSuite];
    if (!baselineMetric) return;

    if (metric.p95ExecutionTime > baselineMetric.p95Time * REGRESSION_THRESHOLD) {
      regressions.push(
        `${metric.testSuite}: P95 time increased from ${baselineMetric.p95Time}ms to ${metric.p95ExecutionTime}ms`
      );
    }

    if (metric.memoryUsage > baselineMetric.memoryUsage * REGRESSION_THRESHOLD) {
      regressions.push(
        `${metric.testSuite}: Memory usage increased from ${baselineMetric.memoryUsage} to ${metric.memoryUsage}`
      );
    }
  });

  if (regressions.length > 0) {
    console.error('Performance regressions detected:');
    regressions.forEach(regression => console.error(`  - ${regression}`));
    process.exit(1);
  } else {
    console.log('No performance regressions detected ✅');
  }
};

detectRegressions().catch(console.error);
```

## Optimization for CI Performance

### Parallel Test Execution

```typescript
// vitest.config.ci.ts
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,

    // Optimize for CI environment
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: Math.min(4, Math.max(1, Math.floor(require('os').cpus().length / 2))),
        minThreads: 1
      }
    },

    // Cache configuration for faster subsequent runs
    cache: {
      dir: 'node_modules/.vitest'
    },

    // Optimize file watching (disabled in CI)
    watch: false,

    // Bail on first failure in CI for faster feedback
    bail: process.env.CI ? 1 : 0
  }
});
```

### Dependency Caching

```yaml
# GitHub Actions caching strategy
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
      .vitest
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache test results
  uses: actions/cache@v3
  with:
    path: |
      coverage
      test-results
    key: ${{ runner.os }}-tests-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-tests-
```

## Relationships
- **Parent Nodes:** [foundation/testing/unit-testing-strategy.md] - implements - CI/CD integration as part of testing strategy
- **Child Nodes:** None
- **Related Nodes:**
  - [foundation/testing/standards.md] - enforces - Quality standards through CI gates
  - [foundation/testing/patterns.md] - validates - Test patterns in CI environment
  - [foundation/testing/llm-instructions.md] - applies - LLM-generated tests in CI pipeline

## Navigation Guidance
- **Access Context**: Reference when setting up CI/CD pipelines or configuring automated testing
- **Common Next Steps**: Implement specific workflow configurations or set up monitoring
- **Related Tasks**: DevOps setup, pipeline configuration, automated testing deployment
- **Update Patterns**: Update when CI requirements change or new tools are adopted

## Metadata
- **Created:** 2025-01-22
- **Last Updated:** 2025-01-22
- **Updated By:** Claude/TEST-001-1 Implementation

## Change History
- 2025-01-22: Initial CI/CD pipeline integration document creation