/**
 * Benchmark types and interfaces
 * 
 * This module defines all the types and interfaces used throughout
 * the benchmarking suite for CorticAI storage and query performance.
 */

export interface BenchmarkResult {
  /** The operation being benchmarked (e.g., 'filter', 'sort', 'aggregate') */
  operation: string
  
  /** The adapter being tested (e.g., 'Memory', 'JSON', 'DuckDB') */
  adapter: string
  
  /** Size of the dataset used for the benchmark */
  dataSize: number
  
  /** Number of iterations performed */
  iterations: number
  
  /** Total execution time in milliseconds */
  duration: number
  
  /** Operations per second */
  opsPerSecond: number
  
  /** Memory used during the operation in bytes */
  memoryUsed: number
  
  /** Latency percentiles in milliseconds */
  percentiles: {
    p50: number
    p95: number
    p99: number
  }
  
  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface BenchmarkOptions {
  /** Minimum number of iterations to run */
  minIterations?: number
  
  /** Maximum time to spend on a single benchmark in seconds */
  maxTime?: number
  
  /** Warmup iterations before starting measurement */
  warmupIterations?: number
  
  /** Whether to run garbage collection between iterations */
  forceGC?: boolean
  
  /** Custom validation function for results */
  validator?: (result: any) => boolean
}

export interface DatasetConfig {
  /** Number of records to generate */
  size: number
  
  /** Seed for reproducible data generation */
  seed?: number
  
  /** Entity type configuration */
  entityConfig?: EntityConfig
}

export interface EntityConfig {
  /** Fields to include in generated entities */
  fields: {
    id: boolean
    name: boolean
    age: boolean
    active: boolean
    tags: boolean
    createdAt: boolean
    score: boolean
    category: boolean
    priority: boolean
    metadata: boolean
  }
  
  /** Value distributions for random data */
  distributions?: {
    age: [number, number] // min, max
    scoreRange: [number, number]
    categoryOptions: string[]
    priorityRange: [number, number]
    tagsCount: [number, number]
  }
}

export interface TestEntity {
  id: string
  name: string
  age: number
  active: boolean
  tags: string[]
  createdAt: Date
  score?: number
  category?: string
  priority?: number
  metadata?: Record<string, any>
}

export interface ComparisonMatrix {
  /** List of adapters being compared */
  adapters: string[]
  
  /** List of operations being compared */
  operations: string[]
  
  /** Comparison results for each operation */
  comparisons: OperationComparison[]
}

export interface OperationComparison {
  operation: string
  results: Record<string, {
    opsPerSecond: number
    p50: number
    p95: number
    p99: number
  }>
}

export interface MemoryScalingResult {
  dataSize: number
  memoryBaseline: number
  memoryAfterLoad: number
  memoryAfterOps: number
  memoryPerItem: number
}

export interface RegressionTestResult {
  /** Whether the test passed (no significant regressions) */
  passed: boolean
  
  /** List of detected regressions */
  regressions: Regression[]
  
  /** Current benchmark results */
  current: BenchmarkResult[]
  
  /** Baseline results for comparison */
  baseline: BenchmarkResult[]
}

export interface Regression {
  operation: string
  metric: string
  baseline: number
  current: number
  regression: number // percentage
}

export interface PerformanceReport {
  [operation: string]: {
    count: number
    mean: number
    median: number
    p95: number
    p99: number
    min: number
    max: number
  }
}

export interface Metric {
  timestamp: number
  latency: number
  memory: number
}

export interface BenchmarkSuiteConfig {
  /** Dataset sizes to test */
  dataSizes: number[]
  
  /** Adapters to test */
  adapters: string[]
  
  /** Operations to benchmark */
  operations: string[]
  
  /** Benchmark options */
  options: BenchmarkOptions
  
  /** Output configuration */
  output: {
    /** Directory to save results */
    resultsDir: string
    
    /** Generate HTML reports */
    generateHTML: boolean
    
    /** Generate JSON reports */
    generateJSON: boolean
    
    /** Generate CSV reports */
    generateCSV: boolean
  }
}

export type StorageAdapterType = 'Memory' | 'JSON' | 'DuckDB'
export type QueryExecutorType = 'Memory' | 'JSON' | 'DuckDB'