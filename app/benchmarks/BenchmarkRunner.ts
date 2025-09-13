/**
 * Main Benchmark Runner
 * 
 * This is the primary entry point for running all benchmarks and generating reports.
 * It coordinates query, storage, and comparison benchmarks, validates performance
 * requirements, and generates comprehensive reports.
 */

import fs from 'fs/promises'
import path from 'path'
import { QueryPerformanceBenchmark } from './suites/query/QueryPerformanceBenchmark.js'
import { StorageAdapterBenchmark } from './suites/storage/StorageAdapterBenchmark.js'
import { ExecutorComparisonBenchmark } from './suites/comparison/ExecutorComparisonBenchmark.js'
import { 
  BenchmarkResult, 
  BenchmarkOptions,
  BenchmarkSuiteConfig 
} from './types/index.js'
import {
  createSummaryTable,
  formatDuration,
  formatOpsPerSecond,
  generateBenchmarkId
} from './utils/BenchmarkUtils.js'

export class BenchmarkSuiteRunner {
  private config: BenchmarkSuiteConfig
  private runId: string
  private startTime: number = 0

  constructor(config?: Partial<BenchmarkSuiteConfig>) {
    this.runId = generateBenchmarkId()
    this.config = {
      dataSizes: [1000, 10000, 100000],
      adapters: ['Memory', 'JSON', 'DuckDB'],
      operations: ['query', 'storage', 'comparison'],
      options: {
        minIterations: 10,
        maxTime: 30,
        warmupIterations: 5,
        forceGC: true
      },
      output: {
        resultsDir: './benchmarks/results',
        generateHTML: true,
        generateJSON: true,
        generateCSV: false
      },
      ...config
    }
  }

  /**
   * Run all benchmark suites
   */
  async runAllBenchmarks(): Promise<{
    results: BenchmarkResult[]
    reports: {
      summary: string
      queryValidation: any
      storageValidation: any
      comparisonAnalysis: any
    }
  }> {
    this.startTime = Date.now()
    const allResults: BenchmarkResult[] = []
    
    console.log('🚀 Starting CorticAI Performance Benchmark Suite')
    console.log(`📋 Run ID: ${this.runId}`)
    console.log(`⏰ Started at: ${new Date().toISOString()}`)
    console.log('='.repeat(60))

    // Ensure results directory exists
    await this.ensureOutputDirectory()

    let queryResults: BenchmarkResult[] = []
    let storageResults: BenchmarkResult[] = []
    let comparisonResults: BenchmarkResult[] = []

    // Run Query Performance Benchmarks
    if (this.config.operations.includes('query')) {
      console.log('\n1️⃣ Query Performance Benchmarks')
      console.log('-'.repeat(40))
      const queryBenchmark = new QueryPerformanceBenchmark(this.config.options)
      queryResults = await queryBenchmark.runAllBenchmarks()
      allResults.push(...queryResults)
      console.log(`✅ Query benchmarks completed: ${queryResults.length} results`)
    }

    // Run Storage Adapter Benchmarks  
    if (this.config.operations.includes('storage')) {
      console.log('\n2️⃣ Storage Adapter Benchmarks')
      console.log('-'.repeat(40))
      const storageBenchmark = new StorageAdapterBenchmark(this.config.options)
      storageResults = await storageBenchmark.runAllBenchmarks()
      allResults.push(...storageResults)
      console.log(`✅ Storage benchmarks completed: ${storageResults.length} results`)
    }

    // Run Executor Comparison Benchmarks
    if (this.config.operations.includes('comparison')) {
      console.log('\n3️⃣ Executor Comparison Benchmarks')
      console.log('-'.repeat(40))
      const comparisonBenchmark = new ExecutorComparisonBenchmark(this.config.options)
      comparisonResults = await comparisonBenchmark.runAllBenchmarks()
      allResults.push(...comparisonResults)
      console.log(`✅ Comparison benchmarks completed: ${comparisonResults.length} results`)
    }

    // Generate reports
    console.log('\n📊 Generating Reports')
    console.log('-'.repeat(40))

    const reports = await this.generateAllReports(
      allResults,
      queryResults,
      storageResults, 
      comparisonResults
    )

    const totalTime = Date.now() - this.startTime
    console.log('\n🎉 Benchmark Suite Completed!')
    console.log(`⏰ Total time: ${formatDuration(totalTime)}`)
    console.log(`📊 Total benchmarks: ${allResults.length}`)
    console.log(`💾 Results saved to: ${this.config.output.resultsDir}`)

    return {
      results: allResults,
      reports
    }
  }

  /**
   * Generate all reports and analysis
   */
  private async generateAllReports(
    allResults: BenchmarkResult[],
    queryResults: BenchmarkResult[],
    storageResults: BenchmarkResult[],
    comparisonResults: BenchmarkResult[]
  ) {
    const reports = {
      summary: '',
      queryValidation: null as any,
      storageValidation: null as any,
      comparisonAnalysis: null as any
    }

    // Generate summary report
    reports.summary = this.generateSummaryReport(allResults)
    console.log('  📋 Summary report generated')

    // Validate query performance requirements
    if (queryResults.length > 0) {
      const queryBenchmark = new QueryPerformanceBenchmark(this.config.options)
      reports.queryValidation = queryBenchmark.validatePerformanceRequirements(queryResults)
      console.log('  🎯 Query validation completed')
    }

    // Validate storage performance targets
    if (storageResults.length > 0) {
      const storageBenchmark = new StorageAdapterBenchmark(this.config.options)
      reports.storageValidation = storageBenchmark.validatePerformanceTargets(storageResults)
      console.log('  🗄️  Storage validation completed')
    }

    // Analyze executor comparisons
    if (comparisonResults.length > 0) {
      const comparisonBenchmark = new ExecutorComparisonBenchmark(this.config.options)
      reports.comparisonAnalysis = comparisonBenchmark.analyzePerformanceWinners(comparisonResults)
      console.log('  ⚡ Comparison analysis completed')
    }

    // Save reports to files
    await this.saveReports(allResults, reports)
    console.log('  💾 Reports saved to files')

    return reports
  }

  /**
   * Generate summary report
   */
  private generateSummaryReport(results: BenchmarkResult[]): string {
    const totalTime = Date.now() - this.startTime
    
    let summary = `# CorticAI Performance Benchmark Report\n\n`
    summary += `**Run ID:** ${this.runId}\n`
    summary += `**Date:** ${new Date().toISOString()}\n`
    summary += `**Total Time:** ${formatDuration(totalTime)}\n`
    summary += `**Total Benchmarks:** ${results.length}\n\n`

    // Performance highlights
    summary += `## 🏆 Performance Highlights\n\n`
    
    // Find fastest operations
    const sortedByOps = [...results].sort((a, b) => b.opsPerSecond - a.opsPerSecond)
    if (sortedByOps.length > 0) {
      const fastest = sortedByOps[0]
      summary += `**Fastest Operation:** ${fastest.operation} (${fastest.adapter}) - ${formatOpsPerSecond(fastest.opsPerSecond)}\n`
    }

    // Find slowest operations  
    if (sortedByOps.length > 0) {
      const slowest = sortedByOps[sortedByOps.length - 1]
      summary += `**Slowest Operation:** ${slowest.operation} (${slowest.adapter}) - ${formatOpsPerSecond(slowest.opsPerSecond)}\n`
    }

    // Performance requirements check
    const requirementFailures = this.checkAllRequirements(results)
    summary += `**Requirements Status:** ${requirementFailures.length === 0 ? '✅ All Passed' : `❌ ${requirementFailures.length} Failed`}\n\n`

    if (requirementFailures.length > 0) {
      summary += `## ❌ Requirement Failures\n\n`
      for (const failure of requirementFailures) {
        summary += `- **${failure.requirement}**: Expected ${failure.expected}, got ${failure.actual} (${failure.operation})\n`
      }
      summary += '\n'
    }

    // Summary table
    summary += `## 📊 Benchmark Results Summary\n\n`
    summary += '```\n'
    summary += createSummaryTable(results)
    summary += '\n```\n\n'

    // Adapter performance comparison
    summary += this.generateAdapterComparison(results)

    return summary
  }

  /**
   * Generate adapter performance comparison
   */
  private generateAdapterComparison(results: BenchmarkResult[]): string {
    let comparison = `## 🔄 Adapter Performance Comparison\n\n`
    
    const adapters = [...new Set(results.map(r => r.adapter))]
    const operations = [...new Set(results.map(r => r.operation))]

    comparison += '| Operation | '
    for (const adapter of adapters) {
      comparison += `${adapter} (ops/sec) | `
    }
    comparison += '\n'

    comparison += '|-----------|'
    for (const adapter of adapters) {
      comparison += '---------------|'
    }
    comparison += '\n'

    for (const operation of operations.slice(0, 10)) { // Limit to first 10 for readability
      comparison += `| ${operation} | `
      
      for (const adapter of adapters) {
        const result = results.find(r => r.operation === operation && r.adapter === adapter)
        if (result) {
          comparison += `${Math.round(result.opsPerSecond).toLocaleString()} | `
        } else {
          comparison += 'N/A | '
        }
      }
      comparison += '\n'
    }

    comparison += '\n'
    return comparison
  }

  /**
   * Check all performance requirements
   */
  private checkAllRequirements(results: BenchmarkResult[]): Array<{
    requirement: string
    operation: string
    expected: string
    actual: string
  }> {
    const failures: Array<{
      requirement: string
      operation: string
      expected: string
      actual: string
    }> = []

    for (const result of results) {
      // NFR-1.1: Simple queries < 10ms for 1K records
      if (result.dataSize === 1000 && this.isSimpleQuery(result.operation)) {
        if (result.percentiles.p95 > 10) {
          failures.push({
            requirement: 'NFR-1.1 (Simple queries < 10ms for 1K records)',
            operation: `${result.operation} (${result.adapter})`,
            expected: '< 10ms',
            actual: `${result.percentiles.p95.toFixed(2)}ms`
          })
        }
      }

      // NFR-1.2: Complex queries < 100ms for 10K records
      if (result.dataSize === 10000 && this.isComplexQuery(result.operation)) {
        if (result.percentiles.p95 > 100) {
          failures.push({
            requirement: 'NFR-1.2 (Complex queries < 100ms for 10K records)',
            operation: `${result.operation} (${result.adapter})`,
            expected: '< 100ms', 
            actual: `${result.percentiles.p95.toFixed(2)}ms`
          })
        }
      }
    }

    return failures
  }

  private isSimpleQuery(operation: string): boolean {
    const simpleOperations = [
      'filter-equality', 'filter-comparison', 'filter-range', 
      'sort-single-field', 'paginate-simple', 'crud-single-get'
    ]
    return simpleOperations.includes(operation)
  }

  private isComplexQuery(operation: string): boolean {
    return operation.startsWith('complex-') || operation.includes('aggregate')
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.output.resultsDir, { recursive: true })
    } catch (error) {
      console.warn(`Warning: Could not create results directory: ${error}`)
    }
  }

  /**
   * Save all reports to files
   */
  private async saveReports(
    results: BenchmarkResult[],
    reports: any
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseFilename = `benchmark-${timestamp}`

    try {
      // Save JSON results
      if (this.config.output.generateJSON) {
        const jsonPath = path.join(this.config.output.resultsDir, `${baseFilename}.json`)
        await fs.writeFile(jsonPath, JSON.stringify({
          runId: this.runId,
          timestamp: new Date().toISOString(),
          config: this.config,
          results,
          reports
        }, null, 2))
      }

      // Save markdown summary
      const markdownPath = path.join(this.config.output.resultsDir, `${baseFilename}.md`)
      await fs.writeFile(markdownPath, reports.summary)

      // Save HTML report if requested
      if (this.config.output.generateHTML) {
        const htmlReport = this.generateHTMLReport(results, reports)
        const htmlPath = path.join(this.config.output.resultsDir, `${baseFilename}.html`)
        await fs.writeFile(htmlPath, htmlReport)
      }

    } catch (error) {
      console.warn(`Warning: Could not save reports: ${error}`)
    }
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(results: BenchmarkResult[], reports: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CorticAI Performance Benchmark Report</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .metric-label { font-size: 12px; color: #64748b; }
        .chart { margin: 20px 0; height: 400px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .table th { background: #f8f9fa; font-weight: 600; }
        .status-pass { color: #16a34a; font-weight: bold; }
        .status-fail { color: #dc2626; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 CorticAI Performance Benchmark Report</h1>
        <p><strong>Run ID:</strong> ${this.runId}</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Total Benchmarks:</strong> ${results.length}</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <div class="metric-value">${Math.round(results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length).toLocaleString()}</div>
            <div class="metric-label">Avg Ops/Sec</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(results.reduce((sum, r) => sum + r.percentiles.p95, 0) / results.length).toFixed(2)}ms</div>
            <div class="metric-label">Avg P95 Latency</div>
        </div>
        <div class="metric">
            <div class="metric-value">${[...new Set(results.map(r => r.adapter))].length}</div>
            <div class="metric-label">Adapters Tested</div>
        </div>
    </div>

    <h2>📊 Performance Charts</h2>
    <div id="opsChart" class="chart"></div>
    <div id="latencyChart" class="chart"></div>

    <h2>📋 Detailed Results</h2>
    <table class="table">
        <thead>
            <tr>
                <th>Operation</th>
                <th>Adapter</th>
                <th>Data Size</th>
                <th>Ops/Sec</th>
                <th>P95 Latency</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${results.map(r => `
                <tr>
                    <td>${r.operation}</td>
                    <td>${r.adapter}</td>
                    <td>${r.dataSize.toLocaleString()}</td>
                    <td>${Math.round(r.opsPerSecond).toLocaleString()}</td>
                    <td>${r.percentiles.p95.toFixed(2)}ms</td>
                    <td><span class="${this.getStatusClass(r)}">${this.getStatus(r)}</span></td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <script>
        // Generate operations per second chart
        const opsData = ${JSON.stringify(this.generateChartData(results, 'opsPerSecond'))}
        Plotly.newPlot('opsChart', opsData, {
            title: 'Operations per Second by Adapter',
            xaxis: { title: 'Operation' },
            yaxis: { title: 'Operations/Second' }
        })

        // Generate latency chart  
        const latencyData = ${JSON.stringify(this.generateChartData(results, 'p95'))}
        Plotly.newPlot('latencyChart', latencyData, {
            title: 'P95 Latency by Adapter',
            xaxis: { title: 'Operation' },
            yaxis: { title: 'Latency (ms)' }
        })
    </script>
</body>
</html>`
  }

  private generateChartData(results: BenchmarkResult[], metric: 'opsPerSecond' | 'p95') {
    const adapters = [...new Set(results.map(r => r.adapter))]
    const operations = [...new Set(results.map(r => r.operation))].slice(0, 10) // Limit for readability

    return adapters.map(adapter => ({
      x: operations,
      y: operations.map(op => {
        const result = results.find(r => r.operation === op && r.adapter === adapter)
        return result ? (metric === 'opsPerSecond' ? result.opsPerSecond : result.percentiles.p95) : 0
      }),
      name: adapter,
      type: 'bar'
    }))
  }

  private getStatusClass(result: BenchmarkResult): string {
    // Simple check - if operation meets basic performance expectations
    if (result.dataSize === 1000 && result.percentiles.p95 <= 10) return 'status-pass'
    if (result.dataSize === 10000 && result.percentiles.p95 <= 100) return 'status-pass'
    if (result.percentiles.p95 <= 50) return 'status-pass' // General threshold
    return 'status-fail'
  }

  private getStatus(result: BenchmarkResult): string {
    return this.getStatusClass(result) === 'status-pass' ? '✅ Pass' : '⚠️ Slow'
  }
}