/**
 * Performance Regression Check
 * 
 * Compares current benchmark results with baseline to detect
 * significant performance regressions.
 */

import fs from 'fs/promises'
import path from 'path'
import { BenchmarkResult } from './types/index.js'
import { compareResults } from './utils/BenchmarkUtils.js'

interface RegressionCheckResult {
  passed: boolean
  regressions: Array<{
    operation: string
    adapter: string
    baselineOps: number
    currentOps: number
    regression: number
    baselineLatency: number
    currentLatency: number
    latencyRegression: number
  }>
  improvements: Array<{
    operation: string
    adapter: string
    improvement: number
  }>
  summary: {
    totalChecks: number
    regressionCount: number
    improvementCount: number
    significantRegressions: number
  }
}

class RegressionChecker {
  private regressionThreshold = 0.15 // 15% regression threshold
  private significantRegressionThreshold = 0.30 // 30% significant regression threshold

  async checkRegressions(): Promise<RegressionCheckResult> {
    console.log('🔍 Checking for performance regressions...\n')

    // Load baseline results
    const baseline = await this.loadLatestResults('./benchmarks/baseline')
    if (!baseline) {
      console.log('⚠️  No baseline results found, skipping regression check')
      return {
        passed: true,
        regressions: [],
        improvements: [],
        summary: { totalChecks: 0, regressionCount: 0, improvementCount: 0, significantRegressions: 0 }
      }
    }

    // Load current results
    const current = await this.loadLatestResults('./benchmarks/results')
    if (!current) {
      console.error('❌ No current results found')
      process.exit(1)
    }

    console.log(`📊 Comparing ${current.results.length} current results with ${baseline.results.length} baseline results\n`)

    const result: RegressionCheckResult = {
      passed: true,
      regressions: [],
      improvements: [],
      summary: { totalChecks: 0, regressionCount: 0, improvementCount: 0, significantRegressions: 0 }
    }

    // Compare each benchmark result
    for (const currentResult of current.results) {
      const baselineResult = baseline.results.find(b => 
        b.operation === currentResult.operation && 
        b.adapter === currentResult.adapter &&
        b.dataSize === currentResult.dataSize
      )

      if (!baselineResult) {
        console.log(`ℹ️  No baseline found for: ${currentResult.operation} (${currentResult.adapter})`)
        continue
      }

      result.summary.totalChecks++

      const comparison = compareResults(baselineResult, currentResult, this.regressionThreshold)
      
      if (comparison.isRegression) {
        const regressionLevel = Math.max(comparison.opsRegression, comparison.latencyRegression)
        
        result.regressions.push({
          operation: currentResult.operation,
          adapter: currentResult.adapter,
          baselineOps: baselineResult.opsPerSecond,
          currentOps: currentResult.opsPerSecond,
          regression: comparison.opsRegression,
          baselineLatency: baselineResult.percentiles.p95,
          currentLatency: currentResult.percentiles.p95,
          latencyRegression: comparison.latencyRegression
        })
        
        result.summary.regressionCount++
        
        if (regressionLevel > this.significantRegressionThreshold) {
          result.summary.significantRegressions++
          result.passed = false
        }

        const emoji = regressionLevel > this.significantRegressionThreshold ? '🚨' : '⚠️'
        console.log(`${emoji} Regression: ${currentResult.operation} (${currentResult.adapter})`)
        console.log(`   Ops/sec: ${baselineResult.opsPerSecond.toFixed(0)} → ${currentResult.opsPerSecond.toFixed(0)} (${(comparison.opsRegression * 100).toFixed(1)}%)`)
        console.log(`   P95 Latency: ${baselineResult.percentiles.p95.toFixed(2)}ms → ${currentResult.percentiles.p95.toFixed(2)}ms (${(comparison.latencyRegression * 100).toFixed(1)}%)`)
        console.log('')

      } else if (comparison.opsRegression < -0.05) { // 5% improvement threshold
        result.improvements.push({
          operation: currentResult.operation,
          adapter: currentResult.adapter,
          improvement: -comparison.opsRegression
        })
        
        result.summary.improvementCount++
        
        console.log(`✅ Improvement: ${currentResult.operation} (${currentResult.adapter})`)
        console.log(`   Ops/sec: ${baselineResult.opsPerSecond.toFixed(0)} → ${currentResult.opsPerSecond.toFixed(0)} (+${(-comparison.opsRegression * 100).toFixed(1)}%)`)
        console.log('')
      }
    }

    return result
  }

  private async loadLatestResults(directory: string): Promise<{ results: BenchmarkResult[] } | null> {
    try {
      const files = await fs.readdir(directory)
      const jsonFiles = files
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse()

      if (jsonFiles.length === 0) {
        return null
      }

      const latestFile = path.join(directory, jsonFiles[0])
      const content = await fs.readFile(latestFile, 'utf8')
      return JSON.parse(content)

    } catch (error) {
      console.warn(`Warning: Could not load results from ${directory}:`, error)
      return null
    }
  }

  printSummary(result: RegressionCheckResult): void {
    console.log('\n' + '='.repeat(60))
    console.log('📋 REGRESSION CHECK SUMMARY')
    console.log('='.repeat(60))

    console.log(`Total comparisons: ${result.summary.totalChecks}`)
    console.log(`Regressions found: ${result.summary.regressionCount}`)
    console.log(`Significant regressions: ${result.summary.significantRegressions}`)
    console.log(`Improvements found: ${result.summary.improvementCount}`)

    if (result.passed) {
      console.log('\n✅ PASSED: No significant performance regressions detected')
    } else {
      console.log('\n❌ FAILED: Significant performance regressions detected')
      
      console.log('\n🚨 Significant Regressions:')
      for (const regression of result.regressions) {
        if (Math.max(regression.regression, regression.latencyRegression) > this.significantRegressionThreshold) {
          console.log(`   ${regression.operation} (${regression.adapter}): ${(regression.regression * 100).toFixed(1)}% slower`)
        }
      }
    }

    if (result.improvements.length > 0) {
      console.log('\n🎉 Performance Improvements:')
      for (const improvement of result.improvements.slice(0, 5)) {
        console.log(`   ${improvement.operation} (${improvement.adapter}): +${(improvement.improvement * 100).toFixed(1)}%`)
      }
    }

    console.log('='.repeat(60))
  }

  async saveResults(result: RegressionCheckResult): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `regression-check-${timestamp}.json`
      const filepath = path.join('./benchmarks/results', filename)
      
      await fs.writeFile(filepath, JSON.stringify(result, null, 2))
      console.log(`\n💾 Regression check results saved to: ${filepath}`)
    } catch (error) {
      console.warn('Warning: Could not save regression check results:', error)
    }
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    const checker = new RegressionChecker()
    const result = await checker.checkRegressions()
    
    checker.printSummary(result)
    await checker.saveResults(result)
    
    // Exit with error code if significant regressions detected
    process.exit(result.passed ? 0 : 1)
    
  } catch (error) {
    console.error('💥 Regression check failed:', error)
    process.exit(1)
  }
}

main().catch(console.error)