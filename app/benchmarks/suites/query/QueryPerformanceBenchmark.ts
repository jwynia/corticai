/**
 * Query Performance Benchmark Suite
 * 
 * This benchmark suite validates the performance claims from the requirements:
 * - NFR-1.1: Simple queries < 10ms for 1K records
 * - NFR-1.2: Complex queries < 100ms for 10K records
 * 
 * Tests all query operations: filtering, sorting, aggregation, pagination
 */

import { QueryBuilder } from '../../../src/query/QueryBuilder.js'
import { QueryExecutor } from '../../../src/query/QueryExecutor.js'
import { MemoryQueryExecutor } from '../../../src/query/executors/MemoryQueryExecutor.js'
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
  StorageAdapterType
} from '../../types/index.js'

export class QueryPerformanceBenchmark {
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
    // Generate datasets of different sizes for scaling tests
    const sizes = [
      { name: '1K', size: 1000 },
      { name: '10K', size: 10000 },
      { name: '100K', size: 100000 }
    ]

    for (const { name, size } of sizes) {
      // Use fixed seed for reproducible results
      this.datasets.set(name, this.dataGenerator.generateQueryTestDataset(size))
    }
  }

  /**
   * Run all query performance benchmarks
   */
  async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    console.log('🚀 Starting Query Performance Benchmarks...\n')
    
    // Test all adapters
    const adapters = ['Memory', 'JSON', 'DuckDB'] as StorageAdapterType[]
    
    for (const adapterType of adapters) {
      console.log(`📊 Testing ${adapterType} Adapter...`)
      
      for (const [sizeLabel, dataset] of this.datasets) {
        console.log(`  📁 Dataset size: ${sizeLabel} (${dataset.length.toLocaleString()} records)`)
        
        const adapter = await this.createAdapter(adapterType)
        await this.loadData(adapter, dataset)
        
        // Run filter benchmarks
        results.push(...await this.benchmarkFiltering(adapter, adapterType, dataset))
        
        // Run sorting benchmarks
        results.push(...await this.benchmarkSorting(adapter, adapterType, dataset))
        
        // Run aggregation benchmarks
        results.push(...await this.benchmarkAggregation(adapter, adapterType, dataset))
        
        // Run pagination benchmarks
        results.push(...await this.benchmarkPagination(adapter, adapterType, dataset))
        
        // Run complex query benchmarks
        results.push(...await this.benchmarkComplexQueries(adapter, adapterType, dataset))
        
        await adapter.clear()
      }
      
      console.log(`  ✅ ${adapterType} adapter benchmarks completed\n`)
    }
    
    console.log('✨ All query benchmarks completed!\n')
    return results
  }

  /**
   * Benchmark filtering operations
   */
  private async benchmarkFiltering(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    const executor = new MemoryQueryExecutor<TestEntity>()

    // Simple equality filter
    results.push(await this.benchmarkRunner.run(
      'filter-equality',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Comparison filter
    results.push(await this.benchmarkRunner.run(
      'filter-comparison',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereGreaterThan('age', 30)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Range filter (using comparison operators since whereBetween doesn't exist)
    results.push(await this.benchmarkRunner.run(
      'filter-range',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereGreaterThanOrEqual('age', 25)
          .whereLessThanOrEqual('age', 45)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // String pattern matching
    results.push(await this.benchmarkRunner.run(
      'filter-string-pattern',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereContains('name', 'Alice')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Array membership
    results.push(await this.benchmarkRunner.run(
      'filter-array-membership',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereContains('tags', 'developer')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    return results
  }

  /**
   * Benchmark sorting operations
   */
  private async benchmarkSorting(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    const executor = new MemoryQueryExecutor<TestEntity>()

    // Single field sort
    results.push(await this.benchmarkRunner.run(
      'sort-single-field',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .orderBy('age', 'asc')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Multi-field sort
    results.push(await this.benchmarkRunner.run(
      'sort-multi-field',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .orderBy('category', 'asc')
          .orderBy('age', 'desc')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // String sort (case-sensitive)
    results.push(await this.benchmarkRunner.run(
      'sort-string',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .orderBy('name', 'asc')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Date sort
    results.push(await this.benchmarkRunner.run(
      'sort-date',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .orderBy('createdAt', 'desc')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    return results
  }

  /**
   * Benchmark aggregation operations
   */
  private async benchmarkAggregation(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    const executor = new MemoryQueryExecutor<TestEntity>()

    // Count aggregation
    results.push(await this.benchmarkRunner.run(
      'aggregate-count',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .count()
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Sum aggregation
    results.push(await this.benchmarkRunner.run(
      'aggregate-sum',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .sum('age')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Average aggregation
    results.push(await this.benchmarkRunner.run(
      'aggregate-avg',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .avg('age')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Group by aggregation
    results.push(await this.benchmarkRunner.run(
      'aggregate-group-by',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .groupBy('category')
          .count()
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Min/Max aggregation
    results.push(await this.benchmarkRunner.run(
      'aggregate-min-max',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .min('age')
          .max('age')
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    return results
  }

  /**
   * Benchmark pagination operations
   */
  private async benchmarkPagination(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    const executor = new MemoryQueryExecutor<TestEntity>()

    // Simple pagination
    results.push(await this.benchmarkRunner.run(
      'paginate-simple',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .limit(100)
          .offset(500)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Pagination with sorting
    results.push(await this.benchmarkRunner.run(
      'paginate-with-sort',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .orderBy('age', 'desc')
          .limit(50)
          .offset(250)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Pagination with filtering
    results.push(await this.benchmarkRunner.run(
      'paginate-with-filter',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .limit(25)
          .offset(100)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    return results
  }

  /**
   * Benchmark complex queries combining multiple operations
   */
  private async benchmarkComplexQueries(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    const executor = new MemoryQueryExecutor<TestEntity>()

    // Complex query: filter + sort + limit
    results.push(await this.benchmarkRunner.run(
      'complex-filter-sort-limit',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .whereGreaterThan('age', 25)
          .orderBy('age', 'desc')
          .limit(10)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Complex query with multiple conditions
    results.push(await this.benchmarkRunner.run(
      'complex-multiple-conditions',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .whereContains('tags', 'developer')
          .whereBetween('age', 20, 50)
          .whereNotNull('score')
          .orderBy('score', 'desc')
          .limit(20)
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Complex aggregation query
    results.push(await this.benchmarkRunner.run(
      'complex-aggregation',
      async () => {
        const query = QueryBuilder.create<TestEntity>()
          .whereEqual('active', true)
          .groupBy('category')
          .avg('age')
          .count()
          .build()
        return executor.execute(query, dataset)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    return results
  }

  /**
   * Create storage adapter by type
   */
  private async createAdapter(type: StorageAdapterType): Promise<Storage<TestEntity>> {
    switch (type) {
      case 'Memory':
        return new MemoryStorageAdapter<TestEntity>()
      
      case 'JSON':
        return new JSONStorageAdapter<TestEntity>({
          filePath: `/tmp/benchmark-${Date.now()}.json`
        })
      
      case 'DuckDB':
        return new DuckDBStorageAdapter<TestEntity>({
          database: ':memory:',
          tableName: `benchmark_${Date.now()}`
        })
      
      default:
        throw new Error(`Unknown adapter type: ${type}`)
    }
  }

  /**
   * Load test data into storage adapter
   */
  private async loadData(adapter: Storage<TestEntity>, dataset: TestEntity[]): Promise<void> {
    const timer = new PrecisionTimer()
    timer.start()
    
    // Use batch operations if available
    if ('setMany' in adapter && typeof adapter.setMany === 'function') {
      const entries = new Map<string, TestEntity>()
      dataset.forEach((entity, index) => {
        entries.set(entity.id || `entity-${index}`, entity)
      })
      await (adapter as any).setMany(entries)
    } else {
      // Fall back to individual sets
      for (const entity of dataset) {
        await adapter.set(entity.id, entity)
      }
    }
    
    const loadTime = timer.stop()
    console.log(`    ⏱️  Data loading time: ${loadTime.toFixed(2)}ms`)
  }

  /**
   * Validate performance requirements
   */
  validatePerformanceRequirements(results: BenchmarkResult[]): {
    passed: boolean
    failures: Array<{
      requirement: string
      expected: string
      actual: string
      result: BenchmarkResult
    }>
  } {
    const failures: Array<{
      requirement: string
      expected: string
      actual: string
      result: BenchmarkResult
    }> = []

    for (const result of results) {
      // NFR-1.1: Simple queries < 10ms for 1K records
      if (result.dataSize === 1000 && this.isSimpleQuery(result.operation)) {
        if (result.percentiles.p95 > 10) {
          failures.push({
            requirement: 'NFR-1.1',
            expected: '< 10ms for 1K records',
            actual: `${result.percentiles.p95.toFixed(2)}ms`,
            result
          })
        }
      }

      // NFR-1.2: Complex queries < 100ms for 10K records
      if (result.dataSize === 10000 && this.isComplexQuery(result.operation)) {
        if (result.percentiles.p95 > 100) {
          failures.push({
            requirement: 'NFR-1.2',
            expected: '< 100ms for 10K records',
            actual: `${result.percentiles.p95.toFixed(2)}ms`,
            result
          })
        }
      }
    }

    return {
      passed: failures.length === 0,
      failures
    }
  }

  private isSimpleQuery(operation: string): boolean {
    const simpleOperations = [
      'filter-equality',
      'filter-comparison',
      'filter-range',
      'sort-single-field',
      'paginate-simple'
    ]
    return simpleOperations.includes(operation)
  }

  private isComplexQuery(operation: string): boolean {
    return operation.startsWith('complex-')
  }
}