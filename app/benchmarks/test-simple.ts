/**
 * Simple benchmark test to validate the suite is working
 */

import { TestDataGenerator } from './data-generators/TestDataGenerator.js'
import { BenchmarkRunner } from './utils/BenchmarkUtils.js'

async function simpleTest() {
  console.log('🧪 Running simple benchmark test...\n')
  
  try {
    // Test data generator
    console.log('1. Testing data generator...')
    const generator = new TestDataGenerator()
    const testData = generator.generateDataset(100)
    console.log(`   ✅ Generated ${testData.length} test entities`)
    
    // Test benchmark runner
    console.log('2. Testing benchmark runner...')
    const runner = new BenchmarkRunner({ minIterations: 3, maxTime: 5 })
    
    const result = await runner.run(
      'test-operation',
      async () => {
        // Simple test operation - array filter
        return testData.filter(entity => entity.active)
      },
      { adapter: 'Test', dataSize: testData.length }
    )
    
    console.log(`   ✅ Benchmark completed:`)
    console.log(`      Operation: ${result.operation}`)
    console.log(`      Iterations: ${result.iterations}`)
    console.log(`      Ops/sec: ${Math.round(result.opsPerSecond).toLocaleString()}`)
    console.log(`      P95 Latency: ${result.percentiles.p95.toFixed(2)}ms`)
    
    console.log('\n🎉 Simple benchmark test passed!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
    process.exit(1)
  }
}

simpleTest().catch(console.error)