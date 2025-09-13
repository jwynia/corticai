/**
 * Benchmark utility functions
 * 
 * This module provides utility functions for running benchmarks,
 * calculating statistics, and measuring performance.
 */

import { BenchmarkResult, BenchmarkOptions, Metric } from '../types/index.js'

/**
 * Calculate percentiles from an array of values
 */
export function calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
  if (values.length === 0) {
    return { p50: 0, p95: 0, p99: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99)
  }
}

/**
 * Calculate a specific percentile from sorted values
 */
export function percentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0
  if (sortedValues.length === 1) return sortedValues[0]

  const index = (percentile / 100) * (sortedValues.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  
  if (lower === upper) {
    return sortedValues[lower]
  }
  
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

/**
 * Calculate mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const avg = mean(values)
  const squareDiffs = values.map(value => Math.pow(value - avg, 2))
  return Math.sqrt(mean(squareDiffs))
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1) {
    return `${(milliseconds * 1000).toFixed(2)}μs`
  } else if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`
  }
}

/**
 * Format memory usage in human-readable format
 */
export function formatMemory(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Format operations per second with appropriate units
 */
export function formatOpsPerSecond(ops: number): string {
  if (ops >= 1000000) {
    return `${(ops / 1000000).toFixed(2)}M ops/sec`
  } else if (ops >= 1000) {
    return `${(ops / 1000).toFixed(2)}K ops/sec`
  } else {
    return `${ops.toFixed(2)} ops/sec`
  }
}

/**
 * High-resolution timer for precise benchmarking
 */
export class PrecisionTimer {
  private startTime: [number, number] | null = null
  
  start(): void {
    this.startTime = process.hrtime()
  }
  
  stop(): number {
    if (!this.startTime) {
      throw new Error('Timer not started')
    }
    
    const [seconds, nanoseconds] = process.hrtime(this.startTime)
    this.startTime = null
    
    // Convert to milliseconds
    return seconds * 1000 + nanoseconds / 1000000
  }
  
  static measure<T>(fn: () => T): { result: T; duration: number }
  static measure<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }>
  static measure<T>(fn: () => T | Promise<T>): { result: T; duration: number } | Promise<{ result: T; duration: number }> {
    const timer = new PrecisionTimer()
    timer.start()
    
    const result = fn()
    
    if (result instanceof Promise) {
      return result.then(res => ({
        result: res,
        duration: timer.stop()
      }))
    } else {
      return {
        result,
        duration: timer.stop()
      }
    }
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private baseline: NodeJS.MemoryUsage | null = null
  
  start(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    this.baseline = process.memoryUsage()
  }
  
  getCurrentUsage(): number {
    if (!this.baseline) {
      throw new Error('Memory tracker not started')
    }
    
    const current = process.memoryUsage()
    return current.heapUsed - this.baseline.heapUsed
  }
  
  stop(): number {
    const usage = this.getCurrentUsage()
    this.baseline = null
    return usage
  }
  
  static measure<T>(fn: () => T): { result: T; memoryUsed: number }
  static measure<T>(fn: () => Promise<T>): Promise<{ result: T; memoryUsed: number }>
  static measure<T>(fn: () => T | Promise<T>): { result: T; memoryUsed: number } | Promise<{ result: T; memoryUsed: number }> {
    const tracker = new MemoryTracker()
    tracker.start()
    
    const result = fn()
    
    if (result instanceof Promise) {
      return result.then(res => ({
        result: res,
        memoryUsed: tracker.stop()
      }))
    } else {
      return {
        result,
        memoryUsed: tracker.stop()
      }
    }
  }
}

/**
 * Benchmark runner with warmup and statistics
 */
export class BenchmarkRunner {
  private options: Required<BenchmarkOptions>
  
  constructor(options: BenchmarkOptions = {}) {
    this.options = {
      minIterations: options.minIterations ?? 10,
      maxTime: options.maxTime ?? 10,
      warmupIterations: options.warmupIterations ?? 5,
      forceGC: options.forceGC ?? false,
      validator: options.validator ?? (() => true)
    }
  }
  
  async run<T>(
    name: string,
    operation: () => Promise<T> | T,
    context: {
      adapter: string
      dataSize: number
    }
  ): Promise<BenchmarkResult> {
    // Warmup
    for (let i = 0; i < this.options.warmupIterations; i++) {
      await operation()
      if (this.options.forceGC && global.gc) {
        global.gc()
      }
    }
    
    const latencies: number[] = []
    const startTime = performance.now()
    let iterations = 0
    
    // Run benchmark
    while (
      iterations < this.options.minIterations ||
      (performance.now() - startTime) / 1000 < this.options.maxTime
    ) {
      if (this.options.forceGC && global.gc) {
        global.gc()
      }
      
      const timer = new PrecisionTimer()
      timer.start()
      
      const result = await operation()
      const duration = timer.stop()
      
      // Validate result if validator provided
      if (!this.options.validator(result)) {
        throw new Error(`Validation failed for operation: ${name}`)
      }
      
      latencies.push(duration)
      iterations++
      
      // Break if max time exceeded
      if ((performance.now() - startTime) / 1000 >= this.options.maxTime) {
        break
      }
    }
    
    const totalDuration = performance.now() - startTime
    const percentiles = calculatePercentiles(latencies)
    
    return {
      operation: name,
      adapter: context.adapter,
      dataSize: context.dataSize,
      iterations,
      duration: totalDuration,
      opsPerSecond: iterations / (totalDuration / 1000),
      memoryUsed: 0, // Memory tracking done separately
      percentiles
    }
  }
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate a unique identifier for benchmark runs
 */
export function generateBenchmarkId(): string {
  return `benchmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Compare two benchmark results to detect performance regression
 */
export function compareResults(
  baseline: BenchmarkResult,
  current: BenchmarkResult,
  threshold = 0.1
): {
  isRegression: boolean
  opsRegression: number
  latencyRegression: number
} {
  const opsRegression = (baseline.opsPerSecond - current.opsPerSecond) / baseline.opsPerSecond
  const latencyRegression = (current.percentiles.p95 - baseline.percentiles.p95) / baseline.percentiles.p95
  
  return {
    isRegression: opsRegression > threshold || latencyRegression > threshold,
    opsRegression,
    latencyRegression
  }
}

/**
 * Create a performance summary table
 */
export function createSummaryTable(results: BenchmarkResult[]): string {
  const headers = ['Operation', 'Adapter', 'Data Size', 'Ops/sec', 'P50', 'P95', 'P99']
  const rows = results.map(result => [
    result.operation,
    result.adapter,
    result.dataSize.toLocaleString(),
    formatOpsPerSecond(result.opsPerSecond),
    formatDuration(result.percentiles.p50),
    formatDuration(result.percentiles.p95),
    formatDuration(result.percentiles.p99)
  ])
  
  const colWidths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => row[i].length))
  )
  
  const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+'
  const headerRow = '|' + headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('|') + '|'
  const dataRows = rows.map(row => 
    '|' + row.map((cell, i) => ` ${cell.padEnd(colWidths[i])} `).join('|') + '|'
  )
  
  return [separator, headerRow, separator, ...dataRows, separator].join('\n')
}