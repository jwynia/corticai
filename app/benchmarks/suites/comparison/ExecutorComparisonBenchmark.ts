/**
 * Executor Comparison Benchmark Suite
 * 
 * This benchmark suite compares the performance of different query executors:
 * - Memory Query Executor (direct array operations)
 * - JSON Query Executor (file-based queries)
 * - DuckDB Query Executor (database queries)
 * 
 * Tests the same query operations across all executors to identify
 * the best performing adapter for different use cases.
 */

import { QueryBuilder } from '../../../src/query/QueryBuilder.js'
import { QueryExecutor } from '../../../src/query/QueryExecutor.js'
import { MemoryQueryExecutor } from '../../../src/query/executors/MemoryQueryExecutor.js'
import { JSONQueryExecutor } from '../../../src/query/executors/JSONQueryExecutor.js'
import { DuckDBQueryExecutor } from '../../../src/query/executors/DuckDBQueryExecutor.js'

import { Storage } from '../../../src/storage/interfaces/Storage.js'
import { MemoryStorageAdapter } from '../../../src/storage/adapters/MemoryStorageAdapter.js'
import { JSONStorageAdapter } from '../../../src/storage/adapters/JSONStorageAdapter.js'
import { DuckDBStorageAdapter } from '../../../src/storage/adapters/DuckDBStorageAdapter.js'

import { TestDataGenerator } from '../../data-generators/TestDataGenerator.js'
import { BenchmarkRunner, PrecisionTimer } from '../../utils/BenchmarkUtils.js'
import { 
  BenchmarkResult, 
  TestEntity, 
  BenchmarkOptions,
  QueryExecutorType,
  ComparisonMatrix,
  OperationComparison
} from '../../types/index.js'

interface ExecutorSetup {
  executor: MemoryQueryExecutor<TestEntity> | JSONQueryExecutor<TestEntity> | DuckDBQueryExecutor<TestEntity>
  adapter: Storage<TestEntity>
  type: QueryExecutorType
}

export class ExecutorComparisonBenchmark {
  private dataGenerator: TestDataGenerator
  private benchmarkRunner: BenchmarkRunner
  private datasets: Map<string, TestEntity[]>

  constructor(options: BenchmarkOptions = {}) {
    this.dataGenerator = new TestDataGenerator()
    this.benchmarkRunner = new BenchmarkRunner(options)
    this.datasets = new Map()
    
    // Pre-generate datasets for consistent testing
    this.generateDatasets()
  }

  private generateDatasets(): void {
    // Generate datasets of different sizes for comparison tests
    const sizes = [
      { name: '1K', size: 1000 },
      { name: '10K', size: 10000 },
      { name: '100K', size: 100000 }
    ]

    for (const { name, size } of sizes) {
      // Use fixed seed for reproducible results across all executors
      this.datasets.set(name, this.dataGenerator.generateQueryTestDataset(size))
    }
  }

  /**
   * Run comprehensive executor comparison benchmarks
   */
  async runAllComparisons(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    console.log('⚡ Starting Executor Comparison Benchmarks...\n')
    
    for (const [sizeLabel, dataset] of this.datasets) {
      console.log(`📊 Comparing executors with ${sizeLabel} dataset (${dataset.length.toLocaleString()} records)...`)
      
      // Set up all executors with the same data
      const executors = await this.setupExecutors(dataset)
      
      try {
        // Run the same queries on all executors for direct comparison
        results.push(...await this.compareFilteringOperations(executors, dataset))
        results.push(...await this.compareSortingOperations(executors, dataset))
        results.push(...await this.compareAggregationOperations(executors, dataset))
        results.push(...await this.comparePaginationOperations(executors, dataset))
        results.push(...await this.compareComplexQueryOperations(executors, dataset))
        
      } finally {
        // Clean up all executors
        await this.cleanupExecutors(executors)
      }
      
      console.log(`  ✅ ${sizeLabel} comparison completed\n`)
    }
    
    console.log('🎯 All executor comparisons completed!\n')
    return results
  }

  /**
   * Set up all executors with the same test data
   */
  private async setupExecutors(dataset: TestEntity[]): Promise<ExecutorSetup[]> {
    const executors: ExecutorSetup[] = []
    
    // Memory Executor
    const memoryAdapter = new MemoryStorageAdapter<TestEntity>()
    await this.loadData(memoryAdapter, dataset)
    executors.push({
      executor: new MemoryQueryExecutor<TestEntity>(),
      adapter: memoryAdapter,
      type: 'Memory'
    })

    // JSON Executor
    const jsonPath = `/tmp/executor-comparison-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`
    const jsonAdapter = new JSONStorageAdapter<TestEntity>({ filePath: jsonPath })
    await this.loadData(jsonAdapter, dataset)
    executors.push({
      executor: new JSONQueryExecutor<TestEntity>(),
      adapter: jsonAdapter,
      type: 'JSON'
    })

    // DuckDB Executor
    const duckdbAdapter = new DuckDBStorageAdapter<TestEntity>({
      database: ':memory:',
      tableName: `comparison_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
    await this.loadData(duckdbAdapter, dataset)
    executors.push({
      executor: new DuckDBQueryExecutor<TestEntity>(),
      adapter: duckdbAdapter,
      type: 'DuckDB'
    })

    return executors
  }

  /**
   * Compare filtering operations across all executors
   */
  private async compareFilteringOperations(
    executors: ExecutorSetup[],
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    const filterTests = [
      {
        name: 'filter-equality',
        queryBuilder: () => QueryBuilder.create<TestEntity>().whereEqual('active', true)
      },
      {
        name: 'filter-comparison',
        queryBuilder: () => QueryBuilder.create<TestEntity>().whereGreaterThan('age', 30)
      },
      {
        name: 'filter-range',
        queryBuilder: () => QueryBuilder.create<TestEntity>()
          .whereGreaterThanOrEqual('age', 25)
          .whereLessThanOrEqual('age', 45)
      },
      {
        name: 'filter-string-contains',
        queryBuilder: () => QueryBuilder.create<TestEntity>().whereContains('name', 'Alice')
      },
      {
        name: 'filter-null-check',
        queryBuilder: () => QueryBuilder.create<TestEntity>().whereNotNull('score')
      }
    ]

    for (const test of filterTests) {
      for (const setup of executors) {
        const query = test.queryBuilder().build()
        
        results.push(await this.benchmarkRunner.run(
          test.name,
          async () => {
            if (setup.executor instanceof MemoryQueryExecutor) {
              return setup.executor.execute(query, dataset)
            } else {
              // For JSON and DuckDB executors, execute via adapter
              return (setup.executor as any).execute(query, setup.adapter)
            }
          },
          { adapter: setup.type, dataSize: dataset.length }
        ))
      }
    }

    return results
  }

  /**
   * Compare sorting operations across all executors
   */
  private async compareSortingOperations(
    executors: ExecutorSetup[],
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    const sortTests = [
      {
        name: 'sort-single-field-asc',
        queryBuilder: () => QueryBuilder.create<TestEntity>().orderBy('age', 'asc')
      },
      {
        name: 'sort-single-field-desc',
        queryBuilder: () => QueryBuilder.create<TestEntity>().orderBy('age', 'desc')
      },
      {
        name: 'sort-multi-field',
        queryBuilder: () => QueryBuilder.create<TestEntity>()
          .orderBy('category', 'asc')
          .orderBy('age', 'desc')
      },
      {
        name: 'sort-string-field',
        queryBuilder: () => QueryBuilder.create<TestEntity>().orderBy('name', 'asc')
      },
      {
        name: 'sort-date-field',
        queryBuilder: () => QueryBuilder.create<TestEntity>().orderBy('createdAt', 'desc')
      }
    ]

    for (const test of sortTests) {
      for (const setup of executors) {
        const query = test.queryBuilder().build()
        
        results.push(await this.benchmarkRunner.run(
          test.name,
          async () => {
            if (setup.executor instanceof MemoryQueryExecutor) {
              return setup.executor.execute(query, dataset)
            } else {
              return (setup.executor as any).execute(query, setup.adapter)
            }
          },
          { adapter: setup.type, dataSize: dataset.length }
        ))
      }
    }

    return results
  }

  /**
   * Compare aggregation operations across all executors
   */
  private async compareAggregationOperations(
    executors: ExecutorSetup[],
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    const aggregateTests = [
      {
        name: 'aggregate-count',
        queryBuilder: () => QueryBuilder.create<TestEntity>().count()
      },
      {
        name: 'aggregate-sum',
        queryBuilder: () => QueryBuilder.create<TestEntity>().sum('age')
      },
      {
        name: 'aggregate-avg',
        queryBuilder: () => QueryBuilder.create<TestEntity>().avg('age')
      },
      {
        name: 'aggregate-min-max',
        queryBuilder: () => QueryBuilder.create<TestEntity>().min('age').max('age')
      },
      {
        name: 'aggregate-group-by',
        queryBuilder: () => QueryBuilder.create<TestEntity>().groupBy('category').count()
      }
    ]

    for (const test of aggregateTests) {
      for (const setup of executors) {
        const query = test.queryBuilder().build()
        
        results.push(await this.benchmarkRunner.run(
          test.name,
          async () => {
            if (setup.executor instanceof MemoryQueryExecutor) {
              return setup.executor.execute(query, dataset)
            } else {
              return (setup.executor as any).execute(query, setup.adapter)
            }
          },
          { adapter: setup.type, dataSize: dataset.length }
        ))
      }
    }

    return results
  }

  /**
   * Compare pagination operations across all executors
   */
  private async comparePaginationOperations(
    executors: ExecutorSetup[],
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    const paginationTests = [
      {
        name: 'paginate-first-page',
        queryBuilder: () => QueryBuilder.create<TestEntity>().limit(50).offset(0)
      },
      {
        name: 'paginate-middle-page',
        queryBuilder: () => QueryBuilder.create<TestEntity>().limit(50).offset(500)
      },
      {
        name: 'paginate-last-page',
        queryBuilder: () => QueryBuilder.create<TestEntity>().limit(50).offset(Math.max(0, dataset.length - 50))
      },
      {
        name: 'paginate-with-sort',
        queryBuilder: () => QueryBuilder.create<TestEntity>()
          .orderBy('age', 'desc')
          .limit(25)
          .offset(100)
      }
    ]

    for (const test of paginationTests) {
      for (const setup of executors) {
        const query = test.queryBuilder().build()
        
        results.push(await this.benchmarkRunner.run(
          test.name,
          async () => {
            if (setup.executor instanceof MemoryQueryExecutor) {
              return setup.executor.execute(query, dataset)
            } else {
              return (setup.executor as any).execute(query, setup.adapter)
            }
          },
          { adapter: setup.type, dataSize: dataset.length }
        ))
      }
    }

    return results
  }

  /**
   * Compare complex query operations across all executors
   */
  private async compareComplexQueryOperations(
    executors: ExecutorSetup[],
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    const complexTests = [
      {
        name: 'complex-filter-sort-limit',
        queryBuilder: () => QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .whereGreaterThan('age', 25)
          .orderBy('age', 'desc')
          .limit(10)
      },
      {
        name: 'complex-multiple-filters',
        queryBuilder: () => QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .whereBetween('age', 20, 50)
          .whereContains('tags', 'developer')
          .whereNotNull('score')
      },
      {
        name: 'complex-group-by-having',
        queryBuilder: () => QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .groupBy('category')
          .avg('age')
          .count()
      }
    ]

    for (const test of complexTests) {
      for (const setup of executors) {
        const query = test.queryBuilder().build()
        
        results.push(await this.benchmarkRunner.run(
          test.name,
          async () => {
            if (setup.executor instanceof MemoryQueryExecutor) {
              return setup.executor.execute(query, dataset)
            } else {
              return (setup.executor as any).execute(query, setup.adapter)
            }
          },
          { adapter: setup.type, dataSize: dataset.length }
        ))
      }
    }

    return results
  }

  /**
   * Load test data into storage adapter
   */
  private async loadData(adapter: Storage<TestEntity>, dataset: TestEntity[]): Promise<void> {
    if ('setMany' in adapter && typeof adapter.setMany === 'function') {
      const entries = new Map<string, TestEntity>()
      dataset.forEach((entity) => {
        entries.set(entity.id, entity)
      })
      await (adapter as any).setMany(entries)
    } else {
      // Fall back to individual sets
      for (const entity of dataset) {
        await adapter.set(entity.id, entity)
      }
    }
  }

  /**
   * Clean up all executors
   */
  private async cleanupExecutors(executors: ExecutorSetup[]): Promise<void> {
    for (const setup of executors) {
      await setup.adapter.clear()
    }
  }

  /**
   * Generate comparison matrix showing relative performance
   */
  generateComparisonMatrix(results: BenchmarkResult[]): ComparisonMatrix {
    const operations = [...new Set(results.map(r => r.operation))]
    const executors = [...new Set(results.map(r => r.adapter))]
    
    const comparisons: OperationComparison[] = []

    for (const operation of operations) {
      const operationResults = results.filter(r => r.operation === operation)
      
      const comparison: OperationComparison = {
        operation,
        results: {}
      }

      for (const executor of executors) {
        const result = operationResults.find(r => r.adapter === executor)
        if (result) {
          comparison.results[executor] = {
            opsPerSecond: result.opsPerSecond,
            p50: result.percentiles.p50,
            p95: result.percentiles.p95,
            p99: result.percentiles.p99
          }
        }
      }

      comparisons.push(comparison)
    }

    return {
      adapters: executors,
      operations,
      comparisons
    }
  }

  /**
   * Generate performance winner analysis
   */
  analyzePerformanceWinners(results: BenchmarkResult[]): {
    overallWinner: string
    operationWinners: Array<{
      operation: string
      winner: string
      advantage: string
      results: Array<{ executor: string; opsPerSecond: number; p95: number }>
    }>
  } {
    const operations = [...new Set(results.map(r => r.operation))]
    const operationWinners: Array<{
      operation: string
      winner: string
      advantage: string
      results: Array<{ executor: string; opsPerSecond: number; p95: number }>
    }> = []

    const executorScores = new Map<string, number>()

    for (const operation of operations) {
      const operationResults = results.filter(r => r.operation === operation)
      
      // Sort by ops/sec descending to find winner
      operationResults.sort((a, b) => b.opsPerSecond - a.opsPerSecond)
      
      if (operationResults.length > 0) {
        const winner = operationResults[0]
        const runnerUp = operationResults[1]
        
        const advantage = runnerUp 
          ? `${((winner.opsPerSecond - runnerUp.opsPerSecond) / runnerUp.opsPerSecond * 100).toFixed(1)}% faster`
          : 'Only executor'

        operationWinners.push({
          operation,
          winner: winner.adapter,
          advantage,
          results: operationResults.map(r => ({
            executor: r.adapter,
            opsPerSecond: r.opsPerSecond,
            p95: r.percentiles.p95
          }))
        })

        // Track scores for overall winner
        operationResults.forEach((result, index) => {
          const points = operationResults.length - index // First place gets most points
          executorScores.set(result.adapter, (executorScores.get(result.adapter) || 0) + points)
        })
      }
    }

    // Find overall winner
    let overallWinner = 'Unknown'
    let highestScore = 0
    for (const [executor, score] of executorScores) {
      if (score > highestScore) {
        highestScore = score
        overallWinner = executor
      }
    }

    return {
      overallWinner,
      operationWinners
    }
  }

  /**
   * Generate detailed comparison report
   */
  generateComparisonReport(results: BenchmarkResult[]): string {
    const matrix = this.generateComparisonMatrix(results)
    const analysis = this.analyzePerformanceWinners(results)
    
    let report = '\n🏆 Query Executor Performance Comparison Report\n'
    report += '='.repeat(60) + '\n\n'

    report += `🥇 Overall Winner: ${analysis.overallWinner}\n\n`

    report += '📊 Operation Winners:\n'
    report += '-'.repeat(40) + '\n'
    for (const winner of analysis.operationWinners) {
      report += `${winner.operation.padEnd(25)}: ${winner.winner} (${winner.advantage})\n`
    }

    report += '\n📈 Detailed Performance Matrix:\n'
    report += '-'.repeat(40) + '\n'
    
    for (const comparison of matrix.comparisons) {
      report += `\nOperation: ${comparison.operation}\n`
      
      const sortedResults = Object.entries(comparison.results)
        .sort(([,a], [,b]) => b.opsPerSecond - a.opsPerSecond)
      
      for (const [executor, metrics] of sortedResults) {
        report += `  ${executor.padEnd(8)}: ${metrics.opsPerSecond.toFixed(0).padStart(8)} ops/sec `
        report += `(P95: ${metrics.p95.toFixed(2)}ms)\n`
      }
    }

    return report
  }
}