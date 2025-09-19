/**
 * PerformanceMonitor
 *
 * A lightweight performance monitoring utility for tracking operation execution times,
 * calculating statistics, and identifying performance bottlenecks.
 *
 * Features:
 * - Track execution times for named operations
 * - Calculate statistics (average, p95, max)
 * - Log warnings for slow operations
 * - Enable/disable via configuration
 * - Lightweight with minimal performance impact
 */

export interface PerformanceConfig {
  /** Whether performance monitoring is enabled */
  enabled?: boolean
  /** Threshold in milliseconds to log slow operations */
  slowOperationThreshold?: number
  /** Maximum number of timing records to keep in history per operation */
  maxMetricsHistory?: number
}

export interface PerformanceMetrics {
  /** Number of times this operation has been executed */
  executionCount: number
  /** Average execution time in milliseconds */
  averageTime: number
  /** Maximum execution time in milliseconds */
  maxTime: number
  /** 95th percentile execution time in milliseconds */
  p95Time: number
  /** Last execution time in milliseconds */
  lastTime: number
  /** Timestamp of first execution */
  firstExecuted: Date
  /** Timestamp of last execution */
  lastExecuted: Date
}

interface ActiveTiming {
  startTime: number
  context?: Record<string, any>
}

interface TimingRecord {
  duration: number
  timestamp: Date
  context?: Record<string, any>
}

interface OperationMetrics {
  totalCount: number
  history: TimingRecord[]
}

export class PerformanceMonitor {
  private config: Required<PerformanceConfig>
  private activeTiming: Map<string, ActiveTiming> = new Map()
  private operationMetrics: Map<string, OperationMetrics> = new Map()

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      slowOperationThreshold: config.slowOperationThreshold ?? 100,
      maxMetricsHistory: config.maxMetricsHistory ?? 1000
    }
  }

  /**
   * Check if performance monitoring is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable performance monitoring
   */
  enable(): void {
    this.config.enabled = true
  }

  /**
   * Disable performance monitoring
   */
  disable(): void {
    this.config.enabled = false
  }

  /**
   * Start timing an operation
   * @param operationName - Name of the operation
   * @param context - Optional context information
   */
  startTiming(operationName: string, context?: Record<string, any>): void {
    if (!this.config.enabled) {
      return
    }

    if (this.activeTiming.has(operationName)) {
      throw new Error(`Timing already active for operation: ${operationName}`)
    }

    this.activeTiming.set(operationName, {
      startTime: performance.now(),
      context
    })
  }

  /**
   * End timing an operation and return the duration
   * @param operationName - Name of the operation
   * @returns Duration in milliseconds, or 0 if monitoring is disabled
   */
  endTiming(operationName: string): number {
    if (!this.config.enabled) {
      return 0
    }

    const activeTimer = this.activeTiming.get(operationName)
    if (!activeTimer) {
      throw new Error(`No active timing found for operation: ${operationName}`)
    }

    const endTime = performance.now()
    const duration = endTime - activeTimer.startTime
    const now = new Date()

    // Remove from active timings
    this.activeTiming.delete(operationName)

    // Record the timing
    const record: TimingRecord = {
      duration,
      timestamp: now,
      context: activeTimer.context
    }

    // Add to history with proper count tracking
    if (!this.operationMetrics.has(operationName)) {
      this.operationMetrics.set(operationName, {
        totalCount: 0,
        history: []
      })
    }

    const metrics = this.operationMetrics.get(operationName)!
    metrics.totalCount++
    metrics.history.push(record)

    // Limit history size but keep total count accurate
    if (metrics.history.length > this.config.maxMetricsHistory) {
      metrics.history.shift()
    }

    // Check for slow operations
    if (duration > this.config.slowOperationThreshold) {
      this.logSlowOperation(operationName, duration, activeTimer.context)
    }

    return duration
  }

  /**
   * Get performance metrics for an operation
   * @param operationName - Name of the operation
   * @returns Metrics object or null if no data
   */
  getMetrics(operationName: string): PerformanceMetrics | null {
    // Handle invalid operation names
    if (!operationName || typeof operationName !== 'string') {
      return null
    }

    const operationMetrics = this.operationMetrics.get(operationName)
    if (!operationMetrics || operationMetrics.history.length === 0) {
      return null
    }

    const history = operationMetrics.history
    const durations = history.map(record => record.duration)
    const historyCount = durations.length

    // Calculate statistics
    const sum = durations.reduce((a, b) => a + b, 0)
    const average = sum / historyCount
    const max = Math.max(...durations)
    const last = durations[durations.length - 1]

    // Calculate 95th percentile correctly
    const sortedDurations = [...durations].sort((a, b) => a - b)
    const p95Index = Math.ceil(historyCount * 0.95) - 1
    const p95 = sortedDurations[Math.max(0, p95Index)]

    return {
      executionCount: operationMetrics.totalCount, // Use total count, not just history length
      averageTime: average,
      maxTime: max,
      p95Time: p95,
      lastTime: last,
      firstExecuted: history[0].timestamp,
      lastExecuted: history[history.length - 1].timestamp
    }
  }

  /**
   * Get all operation names that have metrics
   */
  getAllOperationNames(): string[] {
    return Array.from(this.operationMetrics.keys())
  }

  /**
   * Get metrics for all operations
   */
  getAllMetrics(): Record<string, PerformanceMetrics> {
    const result: Record<string, PerformanceMetrics> = {}

    for (const operationName of this.getAllOperationNames()) {
      const metrics = this.getMetrics(operationName)
      if (metrics) {
        result[operationName] = metrics
      }
    }

    return result
  }

  /**
   * Clear metrics for a specific operation or all operations
   * @param operationName - Optional operation name to clear, if not provided clears all
   */
  clearMetrics(operationName?: string): void {
    if (operationName) {
      this.operationMetrics.delete(operationName)
    } else {
      this.operationMetrics.clear()
    }
  }

  /**
   * Measure a function execution
   * @param operationName - Name of the operation
   * @param fn - Function to measure
   * @param context - Optional context information
   * @returns Promise that resolves to the function result
   */
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    if (!this.config.enabled) {
      return fn()
    }

    this.startTiming(operationName, context)
    try {
      const result = await fn()
      this.endTiming(operationName)
      return result
    } catch (error) {
      this.endTiming(operationName)
      throw error
    }
  }

  /**
   * Log slow operation warning
   * @private
   */
  private logSlowOperation(operationName: string, duration: number, context?: Record<string, any>): void {
    const message = `Slow operation detected: ${operationName}`
    const durationStr = `${duration.toFixed(2)}ms`

    if (context) {
      console.warn(`${message} (${durationStr})`, context)
    } else {
      console.warn(`${message} (${durationStr})`)
    }
  }
}