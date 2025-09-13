/**
 * Storage Adapter Performance Benchmark Suite
 * 
 * This benchmark suite tests CRUD operations performance across all storage adapters:
 * - Memory Storage Adapter
 * - JSON Storage Adapter  
 * - DuckDB Storage Adapter
 * 
 * Based on performance targets from context-network/planning/storage-abstraction/performance-benchmarks.md
 */

import { Storage, BatchStorage } from '../../../src/storage/interfaces/Storage.js'
import { MemoryStorageAdapter } from '../../../src/storage/adapters/MemoryStorageAdapter.js'
import { JSONStorageAdapter } from '../../../src/storage/adapters/JSONStorageAdapter.js'
import { DuckDBStorageAdapter } from '../../../src/storage/adapters/DuckDBStorageAdapter.js'

import { TestDataGenerator } from '../../data-generators/TestDataGenerator.js'
import { BenchmarkRunner, PrecisionTimer, MemoryTracker } from '../../utils/BenchmarkUtils.js'
import { 
  BenchmarkResult, 
  TestEntity, 
  BenchmarkOptions,
  StorageAdapterType,
  MemoryScalingResult
} from '../../types/index.js'

export class StorageAdapterBenchmark {
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
      this.datasets.set(name, this.dataGenerator.generateDataset(size, 12345))
    }
  }

  /**
   * Run all storage adapter performance benchmarks
   */
  async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    console.log('🗄️  Starting Storage Adapter Performance Benchmarks...\n')
    
    // Test all adapters
    const adapters = ['Memory', 'JSON', 'DuckDB'] as StorageAdapterType[]
    
    for (const adapterType of adapters) {
      console.log(`📊 Testing ${adapterType} Storage Adapter...`)
      
      for (const [sizeLabel, dataset] of this.datasets) {
        console.log(`  📁 Dataset size: ${sizeLabel} (${dataset.length.toLocaleString()} records)`)
        
        const adapter = await this.createAdapter(adapterType)
        
        // CRUD operation benchmarks
        results.push(...await this.benchmarkCRUDOperations(adapter, adapterType, dataset))
        
        // Batch operation benchmarks
        if (this.supportsBatchOperations(adapter)) {
          results.push(...await this.benchmarkBatchOperations(adapter, adapterType, dataset))
        }
        
        // Iterator benchmarks
        results.push(...await this.benchmarkIteratorOperations(adapter, adapterType, dataset))
        
        // Memory scaling benchmarks
        results.push(...await this.benchmarkMemoryScaling(adapter, adapterType, dataset))
        
        await this.cleanup(adapter)
      }
      
      console.log(`  ✅ ${adapterType} storage benchmarks completed\n`)
    }
    
    console.log('✨ All storage benchmarks completed!\n')
    return results
  }

  /**
   * Benchmark basic CRUD operations
   */
  private async benchmarkCRUDOperations(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    // Single SET operations
    results.push(await this.benchmarkRunner.run(
      'crud-single-set',
      async () => {
        const entity = dataset[Math.floor(Math.random() * dataset.length)]
        await adapter.set(`temp-${Date.now()}`, entity)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Load data first for read/update/delete tests
    await this.loadData(adapter, dataset.slice(0, Math.min(1000, dataset.length)))

    // Single GET operations  
    results.push(await this.benchmarkRunner.run(
      'crud-single-get',
      async () => {
        const randomEntity = dataset[Math.floor(Math.random() * Math.min(1000, dataset.length))]
        return await adapter.get(randomEntity.id)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Single UPDATE operations
    results.push(await this.benchmarkRunner.run(
      'crud-single-update',
      async () => {
        const randomEntity = dataset[Math.floor(Math.random() * Math.min(1000, dataset.length))]
        const updatedEntity = { ...randomEntity, age: randomEntity.age + 1 }
        await adapter.set(randomEntity.id, updatedEntity)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // Single DELETE operations
    results.push(await this.benchmarkRunner.run(
      'crud-single-delete',
      async () => {
        const randomEntity = dataset[Math.floor(Math.random() * Math.min(1000, dataset.length))]
        await adapter.delete(randomEntity.id)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // HAS key operations
    results.push(await this.benchmarkRunner.run(
      'crud-has-key',
      async () => {
        const randomEntity = dataset[Math.floor(Math.random() * Math.min(1000, dataset.length))]
        return await adapter.has(randomEntity.id)
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // SIZE operation
    results.push(await this.benchmarkRunner.run(
      'crud-size',
      async () => {
        return await adapter.size()
      },
      { adapter: adapterType, dataSize: dataset.length }
    ))

    // CLEAR operation (test with small dataset)
    results.push(await this.benchmarkRunner.run(
      'crud-clear',
      async () => {
        const tempAdapter = await this.createAdapter(adapterType)
        await this.loadData(tempAdapter, dataset.slice(0, 100))
        await tempAdapter.clear()
        await this.cleanup(tempAdapter)
      },
      { adapter: adapterType, dataSize: 100 }
    ))

    return results
  }

  /**
   * Benchmark batch operations
   */
  private async benchmarkBatchOperations(
    adapter: BatchStorage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    // Batch SET operations
    const batchSizes = [10, 100, 1000]
    for (const batchSize of batchSizes) {
      if (batchSize <= dataset.length) {
        results.push(await this.benchmarkRunner.run(
          `batch-set-${batchSize}`,
          async () => {
            const batch = new Map<string, TestEntity>()
            for (let i = 0; i < batchSize; i++) {
              const entity = dataset[i]
              batch.set(`batch-${Date.now()}-${i}`, entity)
            }
            await adapter.setMany(batch)
          },
          { adapter: adapterType, dataSize: batchSize }
        ))
      }
    }

    // Load data for batch read/delete tests
    await this.loadData(adapter, dataset.slice(0, Math.min(1000, dataset.length)))

    // Batch GET operations
    for (const batchSize of batchSizes) {
      if (batchSize <= Math.min(1000, dataset.length)) {
        results.push(await this.benchmarkRunner.run(
          `batch-get-${batchSize}`,
          async () => {
            const keys = dataset.slice(0, batchSize).map(e => e.id)
            return await adapter.getMany(keys)
          },
          { adapter: adapterType, dataSize: batchSize }
        ))
      }
    }

    // Batch DELETE operations
    for (const batchSize of batchSizes) {
      if (batchSize <= Math.min(1000, dataset.length)) {
        results.push(await this.benchmarkRunner.run(
          `batch-delete-${batchSize}`,
          async () => {
            const keys = dataset.slice(0, batchSize).map(e => `delete-${e.id}`)
            // First set some temporary data to delete
            const tempData = new Map<string, TestEntity>()
            keys.forEach((key, i) => tempData.set(key, dataset[i]))
            await adapter.setMany(tempData)
            
            // Now delete it
            await adapter.deleteMany(keys)
          },
          { adapter: adapterType, dataSize: batchSize }
        ))
      }
    }

    return results
  }

  /**
   * Benchmark iterator operations
   */
  private async benchmarkIteratorOperations(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    // Load data first
    const testData = dataset.slice(0, Math.min(1000, dataset.length))
    await this.loadData(adapter, testData)

    // Keys iteration
    results.push(await this.benchmarkRunner.run(
      'iterator-keys',
      async () => {
        const keys: string[] = []
        for await (const key of adapter.keys()) {
          keys.push(key)
        }
        return keys
      },
      { adapter: adapterType, dataSize: testData.length }
    ))

    // Values iteration
    results.push(await this.benchmarkRunner.run(
      'iterator-values',
      async () => {
        const values: TestEntity[] = []
        for await (const value of adapter.values()) {
          values.push(value)
        }
        return values
      },
      { adapter: adapterType, dataSize: testData.length }
    ))

    // Entries iteration
    results.push(await this.benchmarkRunner.run(
      'iterator-entries',
      async () => {
        const entries: Array<[string, TestEntity]> = []
        for await (const entry of adapter.entries()) {
          entries.push(entry)
        }
        return entries
      },
      { adapter: adapterType, dataSize: testData.length }
    ))

    return results
  }

  /**
   * Benchmark memory scaling
   */
  private async benchmarkMemoryScaling(
    adapter: Storage<TestEntity>,
    adapterType: StorageAdapterType,
    dataset: TestEntity[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    // Memory usage during bulk loading
    results.push(await this.benchmarkRunner.run(
      'memory-bulk-load',
      async () => {
        const memoryTracker = new MemoryTracker()
        memoryTracker.start()
        
        const testData = dataset.slice(0, Math.min(1000, dataset.length))
        await this.loadData(adapter, testData)
        
        const memoryUsed = memoryTracker.stop()
        
        return {
          memoryUsed,
          recordCount: testData.length,
          memoryPerRecord: memoryUsed / testData.length
        }
      },
      { adapter: adapterType, dataSize: Math.min(1000, dataset.length) }
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
          filePath: `/tmp/benchmark-storage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`
        })
      
      case 'DuckDB':
        return new DuckDBStorageAdapter<TestEntity>({
          database: ':memory:',
          tableName: `benchmark_storage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      
      default:
        throw new Error(`Unknown adapter type: ${type}`)
    }
  }

  /**
   * Load test data into storage adapter
   */
  private async loadData(adapter: Storage<TestEntity>, dataset: TestEntity[]): Promise<void> {
    if (this.supportsBatchOperations(adapter)) {
      const entries = new Map<string, TestEntity>()
      dataset.forEach((entity) => {
        entries.set(entity.id, entity)
      })
      await (adapter as BatchStorage<TestEntity>).setMany(entries)
    } else {
      // Fall back to individual sets
      for (const entity of dataset) {
        await adapter.set(entity.id, entity)
      }
    }
  }

  /**
   * Check if adapter supports batch operations
   */
  private supportsBatchOperations(adapter: Storage<TestEntity>): adapter is BatchStorage<TestEntity> {
    return 'setMany' in adapter && typeof adapter.setMany === 'function'
  }

  /**
   * Clean up adapter resources
   */
  private async cleanup(adapter: Storage<TestEntity>): Promise<void> {
    await adapter.clear()
    
    // Additional cleanup for specific adapters
    if (adapter instanceof JSONStorageAdapter) {
      // JSON adapter cleanup is handled internally
    }
    
    if (adapter instanceof DuckDBStorageAdapter) {
      // DuckDB adapter cleanup is handled internally
    }
  }

  /**
   * Validate performance targets from the context network
   */
  validatePerformanceTargets(results: BenchmarkResult[]): {
    passed: boolean
    failures: Array<{
      target: string
      expected: string
      actual: string
      result: BenchmarkResult
    }>
  } {
    const failures: Array<{
      target: string
      expected: string
      actual: string
      result: BenchmarkResult
    }> = []

    for (const result of results) {
      // Performance targets from context-network/planning/storage-abstraction/performance-benchmarks.md
      
      // Single Get: Target 1ms (current JSON 5ms)
      if (result.operation === 'crud-single-get') {
        const target = result.adapter === 'JSON' ? 5 : 1
        if (result.percentiles.p95 > target) {
          failures.push({
            target: `Single Get - ${result.adapter}`,
            expected: `< ${target}ms`,
            actual: `${result.percentiles.p95.toFixed(2)}ms`,
            result
          })
        }
      }

      // Single Set: Target 2ms (current JSON 10ms)  
      if (result.operation === 'crud-single-set') {
        const target = result.adapter === 'JSON' ? 10 : 2
        if (result.percentiles.p95 > target) {
          failures.push({
            target: `Single Set - ${result.adapter}`,
            expected: `< ${target}ms`,
            actual: `${result.percentiles.p95.toFixed(2)}ms`,
            result
          })
        }
      }

      // Bulk Get (1000): Target 50ms (current JSON 500ms)
      if (result.operation === 'batch-get-1000') {
        const target = result.adapter === 'JSON' ? 500 : 50
        if (result.percentiles.p95 > target) {
          failures.push({
            target: `Bulk Get (1000) - ${result.adapter}`,
            expected: `< ${target}ms`,
            actual: `${result.percentiles.p95.toFixed(2)}ms`,
            result
          })
        }
      }

      // Bulk Set (1000): Target 100ms (current JSON 1000ms)
      if (result.operation === 'batch-set-1000') {
        const target = result.adapter === 'JSON' ? 1000 : 100
        if (result.percentiles.p95 > target) {
          failures.push({
            target: `Bulk Set (1000) - ${result.adapter}`,
            expected: `< ${target}ms`,
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

  /**
   * Generate performance comparison matrix
   */
  generateComparisonMatrix(results: BenchmarkResult[]): string {
    const operations = [...new Set(results.map(r => r.operation))]
    const adapters = [...new Set(results.map(r => r.adapter))]
    
    let matrix = '\n📊 Storage Adapter Performance Comparison\n'
    matrix += '=' .repeat(60) + '\n\n'

    for (const operation of operations) {
      matrix += `Operation: ${operation}\n`
      matrix += '-'.repeat(40) + '\n'
      
      const opResults = results.filter(r => r.operation === operation)
      
      for (const adapter of adapters) {
        const result = opResults.find(r => r.adapter === adapter)
        if (result) {
          matrix += `${adapter.padEnd(8)}: ${result.opsPerSecond.toFixed(0).padStart(8)} ops/sec `
          matrix += `(P95: ${result.percentiles.p95.toFixed(2)}ms)\n`
        }
      }
      
      matrix += '\n'
    }

    return matrix
  }
}