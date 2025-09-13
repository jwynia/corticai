#!/usr/bin/env node

/**
 * Benchmark CLI
 * 
 * Command-line interface for running CorticAI benchmarks
 */

import { BenchmarkSuiteRunner } from './BenchmarkRunner.js'
import { BenchmarkSuiteConfig } from './types/index.js'

interface CLIOptions {
  suites?: string[]
  dataSize?: string[]
  adapters?: string[]
  iterations?: number
  maxTime?: number
  output?: string
  format?: string[]
  help?: boolean
  version?: boolean
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2)
  const options: CLIOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--suites':
      case '-s':
        options.suites = args[++i]?.split(',') || []
        break
        
      case '--data-size':
      case '-d':
        options.dataSize = args[++i]?.split(',') || []
        break
        
      case '--adapters':
      case '-a':
        options.adapters = args[++i]?.split(',') || []
        break
        
      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i]) || 10
        break
        
      case '--max-time':
      case '-t':
        options.maxTime = parseInt(args[++i]) || 30
        break
        
      case '--output':
      case '-o':
        options.output = args[++i]
        break
        
      case '--format':
      case '-f':
        options.format = args[++i]?.split(',') || []
        break
        
      case '--help':
      case '-h':
        options.help = true
        break
        
      case '--version':
      case '-v':
        options.version = true
        break
        
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
    }
  }
  
  return options
}

function showHelp(): void {
  console.log(`
🚀 CorticAI Performance Benchmark Suite

Usage: npm run benchmark [options]

Options:
  -s, --suites <list>        Benchmark suites to run (query,storage,comparison)
  -d, --data-size <list>     Dataset sizes to test (1K,10K,100K)
  -a, --adapters <list>      Storage adapters to test (Memory,JSON,DuckDB)
  -i, --iterations <num>     Minimum iterations per benchmark (default: 10)
  -t, --max-time <num>       Maximum time per benchmark in seconds (default: 30)
  -o, --output <dir>         Output directory for results (default: ./benchmarks/results)
  -f, --format <list>        Output formats (json,html,csv) (default: json,html)
  -h, --help                 Show this help message
  -v, --version              Show version information

Examples:
  npm run benchmark                           # Run all benchmarks
  npm run benchmark -- --suites query        # Run only query benchmarks
  npm run benchmark -- --adapters Memory,JSON # Test only Memory and JSON adapters
  npm run benchmark -- --data-size 1K,10K    # Test only with 1K and 10K datasets
  npm run benchmark -- --iterations 20       # Run 20 iterations per benchmark
  npm run benchmark -- --format json         # Generate only JSON reports

Environment Variables:
  BENCHMARK_ITERATIONS       Override default iterations
  BENCHMARK_MAX_TIME         Override default max time
  BENCHMARK_OUTPUT_DIR       Override default output directory
`)
}

function showVersion(): void {
  console.log('CorticAI Benchmark Suite v1.0.0')
}

async function main(): Promise<void> {
  const options = parseArgs()
  
  if (options.help) {
    showHelp()
    return
  }
  
  if (options.version) {
    showVersion()
    return
  }

  // Parse data sizes
  const parseDataSizes = (sizes: string[] = []): number[] => {
    const sizeMap: Record<string, number> = {
      '1K': 1000,
      '10K': 10000, 
      '100K': 100000
    }
    
    return sizes.length > 0 
      ? sizes.map(s => sizeMap[s] || parseInt(s)).filter(n => !isNaN(n))
      : [1000, 10000, 100000]
  }

  // Build configuration
  const config: Partial<BenchmarkSuiteConfig> = {
    dataSizes: parseDataSizes(options.dataSize),
    adapters: options.adapters && options.adapters.length > 0 
      ? options.adapters as any[]
      : ['Memory', 'JSON', 'DuckDB'],
    operations: options.suites && options.suites.length > 0
      ? options.suites
      : ['query', 'storage', 'comparison'],
    options: {
      minIterations: options.iterations 
        || parseInt(process.env.BENCHMARK_ITERATIONS || '10'),
      maxTime: options.maxTime 
        || parseInt(process.env.BENCHMARK_MAX_TIME || '30'),
      warmupIterations: 5,
      forceGC: true
    },
    output: {
      resultsDir: options.output 
        || process.env.BENCHMARK_OUTPUT_DIR 
        || './benchmarks/results',
      generateJSON: !options.format || options.format.includes('json'),
      generateHTML: !options.format || options.format.includes('html'),
      generateCSV: options.format?.includes('csv') || false
    }
  }

  console.log('🔧 Configuration:')
  console.log(`   Suites: ${config.operations?.join(', ')}`)
  console.log(`   Adapters: ${config.adapters?.join(', ')}`)
  console.log(`   Data sizes: ${config.dataSizes?.map(s => `${(s/1000)}K`).join(', ')}`)
  console.log(`   Iterations: ${config.options?.minIterations}`)
  console.log(`   Max time: ${config.options?.maxTime}s`)
  console.log(`   Output: ${config.output?.resultsDir}`)
  console.log('')

  try {
    const runner = new BenchmarkSuiteRunner(config)
    const { results, reports } = await runner.runAllBenchmarks()
    
    // Print summary to console
    console.log('\n' + '='.repeat(60))
    console.log('📊 BENCHMARK RESULTS SUMMARY')
    console.log('='.repeat(60))
    
    if (reports.queryValidation) {
      const qv = reports.queryValidation
      console.log(`\n🎯 Query Performance Requirements: ${qv.passed ? '✅ PASSED' : '❌ FAILED'}`)
      if (!qv.passed) {
        for (const failure of qv.failures) {
          console.log(`   ❌ ${failure.requirement}: Expected ${failure.expected}, got ${failure.actual}`)
        }
      }
    }
    
    if (reports.storageValidation) {
      const sv = reports.storageValidation
      console.log(`\n🗄️  Storage Performance Targets: ${sv.passed ? '✅ PASSED' : '❌ FAILED'}`)
      if (!sv.passed) {
        for (const failure of sv.failures) {
          console.log(`   ❌ ${failure.target}: Expected ${failure.expected}, got ${failure.actual}`)
        }
      }
    }
    
    if (reports.comparisonAnalysis) {
      const ca = reports.comparisonAnalysis
      console.log(`\n🏆 Overall Performance Winner: ${ca.overallWinner}`)
      
      console.log('\n🥇 Top Performers by Operation:')
      for (const winner of ca.operationWinners.slice(0, 5)) {
        console.log(`   ${winner.operation}: ${winner.winner} (${winner.advantage})`)
      }
    }

    console.log(`\n📈 Performance Summary:`)
    console.log(`   Total benchmarks: ${results.length}`)
    console.log(`   Average ops/sec: ${Math.round(results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length).toLocaleString()}`)
    console.log(`   Average P95 latency: ${(results.reduce((sum, r) => sum + r.percentiles.p95, 0) / results.length).toFixed(2)}ms`)
    
    // Show requirement compliance
    const requirementFailures = results.filter(r => {
      if (r.dataSize === 1000 && isSimpleOperation(r.operation) && r.percentiles.p95 > 10) return true
      if (r.dataSize === 10000 && isComplexOperation(r.operation) && r.percentiles.p95 > 100) return true
      return false
    })
    
    console.log(`\n✅ Requirements compliance: ${((results.length - requirementFailures.length) / results.length * 100).toFixed(1)}%`)
    
    if (requirementFailures.length > 0) {
      console.log(`\n❌ Failed requirements (${requirementFailures.length}):`)
      for (const failure of requirementFailures.slice(0, 5)) {
        console.log(`   ${failure.operation} (${failure.adapter}): ${failure.percentiles.p95.toFixed(2)}ms`)
      }
      if (requirementFailures.length > 5) {
        console.log(`   ... and ${requirementFailures.length - 5} more`)
      }
    }

    console.log(`\n💾 Detailed reports saved to: ${config.output?.resultsDir}`)
    console.log('='.repeat(60))
    
    // Exit with appropriate code
    const hasFailures = (reports.queryValidation && !reports.queryValidation.passed) ||
                       (reports.storageValidation && !reports.storageValidation.passed)
    
    process.exit(hasFailures ? 1 : 0)
    
  } catch (error) {
    console.error('💥 Benchmark failed:', error)
    process.exit(1)
  }
}

function isSimpleOperation(operation: string): boolean {
  return [
    'filter-equality', 'filter-comparison', 'filter-range',
    'sort-single-field', 'paginate-simple', 'crud-single-get'
  ].includes(operation)
}

function isComplexOperation(operation: string): boolean {
  return operation.startsWith('complex-') || operation.includes('aggregate')
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

// Run CLI
main().catch(error => {
  console.error('CLI Error:', error)
  process.exit(1)
})