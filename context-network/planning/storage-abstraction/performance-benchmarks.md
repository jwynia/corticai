# Storage Performance Benchmarks

## Performance Requirements

### Baseline Performance Targets

Based on current JSON storage implementation:

| Operation | Current (JSON) | Target (Abstracted) | Improvement |
|-----------|---------------|-------------------|-------------|
| Single Get | 5ms | 1ms | 5x |
| Single Set | 10ms | 2ms | 5x |
| Bulk Get (1000) | 500ms | 50ms | 10x |
| Bulk Set (1000) | 1000ms | 100ms | 10x |
| Query (10k items) | 200ms | 20ms | 10x |
| Clear All | 50ms | 10ms | 5x |

### Scalability Targets

| Data Size | Current Limit | Target Limit | Operations/sec |
|-----------|--------------|--------------|----------------|
| Small (1K items) | ✅ Works | ✅ Optimal | 10,000 |
| Medium (10K items) | ✅ Works | ✅ Optimal | 5,000 |
| Large (100K items) | ⚠️ Slow | ✅ Optimal | 2,000 |
| Huge (1M items) | ❌ OOM | ✅ Works | 1,000 |
| Massive (10M items) | ❌ Fails | ✅ Works | 500 |

## Benchmark Suite Design

### Benchmark Framework
```typescript
interface BenchmarkResult {
  operation: string
  adapter: string
  dataSize: number
  iterations: number
  duration: number
  opsPerSecond: number
  memoryUsed: number
  percentiles: {
    p50: number
    p95: number
    p99: number
  }
}

class StorageBenchmark {
  constructor(
    private adapter: Storage<any>,
    private options: BenchmarkOptions = {}
  ) {}
  
  async runSuite(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    // Run benchmarks for different data sizes
    for (const size of [1000, 10000, 100000]) {
      results.push(...await this.runForSize(size))
    }
    
    return results
  }
  
  private async runForSize(size: number): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    // Prepare data
    await this.prepareData(size)
    
    // Run each benchmark
    results.push(await this.benchmarkWrites(size))
    results.push(await this.benchmarkReads(size))
    results.push(await this.benchmarkQueries(size))
    results.push(await this.benchmarkDeletes(size))
    results.push(await this.benchmarkMixed(size))
    
    // Cleanup
    await this.cleanup()
    
    return results
  }
}
```

## Write Performance Benchmarks

### Sequential Writes
```typescript
async function benchmarkSequentialWrites(
  storage: Storage<any>,
  count: number
): Promise<BenchmarkResult> {
  const latencies: number[] = []
  const startMemory = process.memoryUsage()
  const startTime = performance.now()
  
  for (let i = 0; i < count; i++) {
    const opStart = performance.now()
    await storage.set(`key-${i}`, {
      id: i,
      data: 'x'.repeat(1000), // 1KB payload
      timestamp: Date.now()
    })
    latencies.push(performance.now() - opStart)
  }
  
  const duration = performance.now() - startTime
  const endMemory = process.memoryUsage()
  
  return {
    operation: 'sequential-write',
    adapter: storage.constructor.name,
    dataSize: count,
    iterations: count,
    duration,
    opsPerSecond: count / (duration / 1000),
    memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
    percentiles: calculatePercentiles(latencies)
  }
}
```

### Batch Writes
```typescript
async function benchmarkBatchWrites(
  storage: BatchStorage<any>,
  count: number,
  batchSize: number = 100
): Promise<BenchmarkResult> {
  const batches = Math.ceil(count / batchSize)
  const latencies: number[] = []
  const startTime = performance.now()
  
  for (let batch = 0; batch < batches; batch++) {
    const entries = new Map<string, any>()
    const batchStart = batch * batchSize
    const batchEnd = Math.min(batchStart + batchSize, count)
    
    for (let i = batchStart; i < batchEnd; i++) {
      entries.set(`key-${i}`, {
        id: i,
        data: 'x'.repeat(1000)
      })
    }
    
    const opStart = performance.now()
    await storage.setMany(entries)
    latencies.push(performance.now() - opStart)
  }
  
  const duration = performance.now() - startTime
  
  return {
    operation: `batch-write-${batchSize}`,
    adapter: storage.constructor.name,
    dataSize: count,
    iterations: batches,
    duration,
    opsPerSecond: count / (duration / 1000),
    memoryUsed: 0, // Measured separately
    percentiles: calculatePercentiles(latencies)
  }
}
```

## Read Performance Benchmarks

### Random Reads
```typescript
async function benchmarkRandomReads(
  storage: Storage<any>,
  count: number,
  reads: number
): Promise<BenchmarkResult> {
  const latencies: number[] = []
  const startTime = performance.now()
  
  for (let i = 0; i < reads; i++) {
    const key = `key-${Math.floor(Math.random() * count)}`
    const opStart = performance.now()
    await storage.get(key)
    latencies.push(performance.now() - opStart)
  }
  
  const duration = performance.now() - startTime
  
  return {
    operation: 'random-read',
    adapter: storage.constructor.name,
    dataSize: count,
    iterations: reads,
    duration,
    opsPerSecond: reads / (duration / 1000),
    memoryUsed: 0,
    percentiles: calculatePercentiles(latencies)
  }
}
```

### Sequential Scan
```typescript
async function benchmarkSequentialScan(
  storage: Storage<any>
): Promise<BenchmarkResult> {
  const startTime = performance.now()
  let count = 0
  
  for await (const [key, value] of storage.entries()) {
    count++
    // Simulate processing
    JSON.stringify(value)
  }
  
  const duration = performance.now() - startTime
  
  return {
    operation: 'sequential-scan',
    adapter: storage.constructor.name,
    dataSize: count,
    iterations: count,
    duration,
    opsPerSecond: count / (duration / 1000),
    memoryUsed: 0,
    percentiles: { p50: 0, p95: 0, p99: 0 }
  }
}
```

## Query Performance Benchmarks

### Simple Query
```typescript
async function benchmarkSimpleQuery(
  storage: QueryableStorage<any>,
  dataSize: number
): Promise<BenchmarkResult> {
  const queries = [
    { where: { field: 'status', operator: 'eq', value: 'active' } },
    { where: { field: 'score', operator: 'gte', value: 80 } },
    { where: { field: 'category', operator: 'in', value: ['A', 'B'] } }
  ]
  
  const latencies: number[] = []
  const startTime = performance.now()
  
  for (const query of queries) {
    const opStart = performance.now()
    const results = await storage.findMany(query as any)
    latencies.push(performance.now() - opStart)
  }
  
  const duration = performance.now() - startTime
  
  return {
    operation: 'simple-query',
    adapter: storage.constructor.name,
    dataSize,
    iterations: queries.length,
    duration,
    opsPerSecond: queries.length / (duration / 1000),
    memoryUsed: 0,
    percentiles: calculatePercentiles(latencies)
  }
}
```

### Complex Query
```typescript
async function benchmarkComplexQuery(
  storage: QueryableStorage<any>,
  dataSize: number
): Promise<BenchmarkResult> {
  const query = {
    where: {
      operator: 'and',
      conditions: [
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'score', operator: 'gte', value: 50 },
        {
          operator: 'or',
          conditions: [
            { field: 'category', operator: 'eq', value: 'premium' },
            { field: 'priority', operator: 'gte', value: 8 }
          ]
        }
      ]
    },
    orderBy: [
      { field: 'score', direction: 'desc' },
      { field: 'created', direction: 'asc' }
    ],
    limit: 100,
    offset: 0
  }
  
  const startTime = performance.now()
  const results = await storage.findMany(query as any)
  const duration = performance.now() - startTime
  
  return {
    operation: 'complex-query',
    adapter: storage.constructor.name,
    dataSize,
    iterations: 1,
    duration,
    opsPerSecond: 1 / (duration / 1000),
    memoryUsed: 0,
    percentiles: { p50: duration, p95: duration, p99: duration }
  }
}
```

## Memory Usage Benchmarks

### Memory Scaling
```typescript
async function benchmarkMemoryScaling(
  createStorage: () => Storage<any>
): Promise<MemoryScalingResult[]> {
  const results: MemoryScalingResult[] = []
  const sizes = [1000, 10000, 100000]
  
  for (const size of sizes) {
    const storage = createStorage()
    
    // Measure baseline
    global.gc?.() // Force GC if available
    const baseline = process.memoryUsage()
    
    // Load data
    for (let i = 0; i < size; i++) {
      await storage.set(`key-${i}`, {
        id: i,
        data: 'x'.repeat(1000) // 1KB per item
      })
    }
    
    // Measure after load
    global.gc?.()
    const afterLoad = process.memoryUsage()
    
    // Perform operations
    for (let i = 0; i < 100; i++) {
      await storage.get(`key-${Math.floor(Math.random() * size)}`)
    }
    
    // Measure after operations
    global.gc?.()
    const afterOps = process.memoryUsage()
    
    results.push({
      dataSize: size,
      memoryBaseline: baseline.heapUsed,
      memoryAfterLoad: afterLoad.heapUsed,
      memoryAfterOps: afterOps.heapUsed,
      memoryPerItem: (afterLoad.heapUsed - baseline.heapUsed) / size
    })
    
    // Cleanup
    await storage.clear()
  }
  
  return results
}
```

## Concurrent Operations Benchmarks

### Concurrent Reads/Writes
```typescript
async function benchmarkConcurrency(
  storage: Storage<any>,
  concurrency: number
): Promise<BenchmarkResult> {
  // Prepare data
  for (let i = 0; i < 10000; i++) {
    await storage.set(`key-${i}`, { id: i })
  }
  
  const operations = Array.from({ length: concurrency }, async (_, i) => {
    const results = []
    for (let j = 0; j < 100; j++) {
      const op = Math.random()
      if (op < 0.5) {
        // Read
        const start = performance.now()
        await storage.get(`key-${Math.floor(Math.random() * 10000)}`)
        results.push(performance.now() - start)
      } else {
        // Write
        const start = performance.now()
        await storage.set(`key-${10000 + i * 100 + j}`, { id: j })
        results.push(performance.now() - start)
      }
    }
    return results
  })
  
  const startTime = performance.now()
  const allResults = await Promise.all(operations)
  const duration = performance.now() - startTime
  
  const allLatencies = allResults.flat()
  
  return {
    operation: `concurrent-${concurrency}`,
    adapter: storage.constructor.name,
    dataSize: 10000,
    iterations: concurrency * 100,
    duration,
    opsPerSecond: (concurrency * 100) / (duration / 1000),
    memoryUsed: 0,
    percentiles: calculatePercentiles(allLatencies)
  }
}
```

## Transaction Performance

### Transaction Overhead
```typescript
async function benchmarkTransactionOverhead(
  storage: TransactionalStorage<any>
): Promise<BenchmarkResult> {
  const iterations = 1000
  const latencies: number[] = []
  
  // Benchmark with transactions
  const txStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    const opStart = performance.now()
    await storage.transaction(async (tx) => {
      await tx.set(`key-${i}`, { id: i })
      await tx.get(`key-${i}`)
      await tx.delete(`key-${i}`)
    })
    latencies.push(performance.now() - opStart)
  }
  const txDuration = performance.now() - txStart
  
  // Benchmark without transactions
  const noTxStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    await storage.set(`key-${i}`, { id: i })
    await storage.get(`key-${i}`)
    await storage.delete(`key-${i}`)
  }
  const noTxDuration = performance.now() - noTxStart
  
  const overhead = ((txDuration - noTxDuration) / noTxDuration) * 100
  
  return {
    operation: 'transaction-overhead',
    adapter: storage.constructor.name,
    dataSize: iterations,
    iterations,
    duration: txDuration,
    opsPerSecond: iterations / (txDuration / 1000),
    memoryUsed: 0,
    percentiles: calculatePercentiles(latencies),
    metadata: {
      overhead: `${overhead.toFixed(2)}%`,
      withTx: txDuration,
      withoutTx: noTxDuration
    }
  }
}
```

## Benchmark Comparison

### Adapter Comparison Matrix
```typescript
async function compareAdapters(
  adapters: Map<string, () => Storage<any>>
): Promise<ComparisonMatrix> {
  const results = new Map<string, Map<string, BenchmarkResult>>()
  
  for (const [name, createAdapter] of adapters) {
    const adapter = createAdapter()
    const benchmark = new StorageBenchmark(adapter)
    const adapterResults = await benchmark.runSuite()
    
    const resultMap = new Map<string, BenchmarkResult>()
    for (const result of adapterResults) {
      resultMap.set(result.operation, result)
    }
    results.set(name, resultMap)
  }
  
  return generateComparisonMatrix(results)
}

function generateComparisonMatrix(
  results: Map<string, Map<string, BenchmarkResult>>
): ComparisonMatrix {
  const matrix: ComparisonMatrix = {
    adapters: Array.from(results.keys()),
    operations: [],
    comparisons: []
  }
  
  // Get all operations
  const operations = new Set<string>()
  for (const adapterResults of results.values()) {
    for (const operation of adapterResults.keys()) {
      operations.add(operation)
    }
  }
  matrix.operations = Array.from(operations)
  
  // Generate comparisons
  for (const operation of matrix.operations) {
    const comparison: OperationComparison = {
      operation,
      results: {}
    }
    
    for (const [adapter, adapterResults] of results) {
      const result = adapterResults.get(operation)
      if (result) {
        comparison.results[adapter] = {
          opsPerSecond: result.opsPerSecond,
          p50: result.percentiles.p50,
          p95: result.percentiles.p95,
          p99: result.percentiles.p99
        }
      }
    }
    
    matrix.comparisons.push(comparison)
  }
  
  return matrix
}
```

## Performance Monitoring

### Runtime Performance Monitor
```typescript
class PerformanceMonitor {
  private metrics: Map<string, Metric[]> = new Map()
  private sampling = false
  
  startMonitoring(storage: Storage<any>, sampleRate = 0.01) {
    this.sampling = true
    
    // Wrap storage methods
    const originalGet = storage.get.bind(storage)
    storage.get = async (key: string) => {
      if (Math.random() < sampleRate) {
        const start = performance.now()
        const result = await originalGet(key)
        this.record('get', performance.now() - start)
        return result
      }
      return originalGet(key)
    }
    
    // Wrap other methods similarly...
  }
  
  stopMonitoring() {
    this.sampling = false
  }
  
  private record(operation: string, latency: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    
    this.metrics.get(operation)!.push({
      timestamp: Date.now(),
      latency,
      memory: process.memoryUsage().heapUsed
    })
    
    // Keep only last 1000 samples
    const samples = this.metrics.get(operation)!
    if (samples.length > 1000) {
      samples.shift()
    }
  }
  
  getReport(): PerformanceReport {
    const report: PerformanceReport = {}
    
    for (const [operation, samples] of this.metrics) {
      const latencies = samples.map(s => s.latency)
      report[operation] = {
        count: samples.length,
        mean: mean(latencies),
        median: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
        min: Math.min(...latencies),
        max: Math.max(...latencies)
      }
    }
    
    return report
  }
}
```

## Performance Regression Detection

### Regression Test Suite
```typescript
class PerformanceRegressionTest {
  constructor(
    private baseline: BenchmarkResult[],
    private threshold = 0.1 // 10% regression threshold
  ) {}
  
  async test(storage: Storage<any>): Promise<RegressionTestResult> {
    const benchmark = new StorageBenchmark(storage)
    const current = await benchmark.runSuite()
    
    const regressions: Regression[] = []
    
    for (const currentResult of current) {
      const baselineResult = this.baseline.find(
        b => b.operation === currentResult.operation
      )
      
      if (!baselineResult) continue
      
      const regression = this.checkRegression(
        baselineResult,
        currentResult
      )
      
      if (regression) {
        regressions.push(regression)
      }
    }
    
    return {
      passed: regressions.length === 0,
      regressions,
      current,
      baseline: this.baseline
    }
  }
  
  private checkRegression(
    baseline: BenchmarkResult,
    current: BenchmarkResult
  ): Regression | null {
    const opsRegression = 
      (baseline.opsPerSecond - current.opsPerSecond) / 
      baseline.opsPerSecond
    
    const p95Regression = 
      (current.percentiles.p95 - baseline.percentiles.p95) / 
      baseline.percentiles.p95
    
    if (opsRegression > this.threshold || p95Regression > this.threshold) {
      return {
        operation: baseline.operation,
        metric: 'performance',
        baseline: baseline.opsPerSecond,
        current: current.opsPerSecond,
        regression: Math.max(opsRegression, p95Regression)
      }
    }
    
    return null
  }
}
```

## Benchmark Report Format

### HTML Report Generator
```typescript
class BenchmarkReporter {
  generateHTML(results: BenchmarkResult[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Storage Performance Report</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
  <h1>Storage Performance Benchmark Report</h1>
  <h2>Summary</h2>
  ${this.generateSummaryTable(results)}
  
  <h2>Operations/Second by Data Size</h2>
  <div id="ops-chart"></div>
  
  <h2>Latency Percentiles</h2>
  <div id="latency-chart"></div>
  
  <h2>Memory Usage</h2>
  <div id="memory-chart"></div>
  
  <script>
    ${this.generateChartScripts(results)}
  </script>
</body>
</html>
    `
  }
  
  private generateSummaryTable(results: BenchmarkResult[]): string {
    // Generate HTML table with results
  }
  
  private generateChartScripts(results: BenchmarkResult[]): string {
    // Generate Plotly chart scripts
  }
}
```

## Optimization Opportunities

Based on benchmarks, identify optimization opportunities:

### 1. Caching Layer
- Add LRU cache for frequently accessed items
- Expected improvement: 10x for cache hits

### 2. Index Optimization
- Create indexes for common query patterns
- Expected improvement: 5-10x for indexed queries

### 3. Batch Processing
- Batch small operations into larger ones
- Expected improvement: 5x for bulk operations

### 4. Connection Pooling
- Reuse database connections
- Expected improvement: 2x for connection-heavy workloads

### 5. Query Optimization
- Query planner and optimizer
- Expected improvement: 3-5x for complex queries

## Continuous Performance Monitoring

### GitHub Action for Performance Tests
```yaml
name: Performance Benchmarks

on:
  pull_request:
    paths:
      - 'src/storage/**'
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run benchmarks
        run: npm run benchmark
      
      - name: Check for regressions
        run: npm run benchmark:regression
      
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: benchmark-results.json
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./benchmark-results.json')
            const comment = generateBenchmarkComment(results)
            github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body: comment
            })
```