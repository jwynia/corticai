/**
 * Dual Environment Storage Example
 *
 * Demonstrates how CorticAI automatically adapts between local and Azure storage
 * based on environment detection, enabling seamless development across both
 * local projects and Azure work environments.
 */

import { createStorageProvider, detectEnvironment, getRecommendedProviderType } from '../src/storage/providers/StorageProviderFactory'
import { Logger } from '../src/utils/Logger'

const logger = Logger.createConsoleLogger('DualEnvironmentExample')

/**
 * Example data structures for demonstration
 */
interface ProjectEntity {
  id: string
  type: 'file' | 'function' | 'class' | 'planning-doc'
  name: string
  content?: string
  metadata: {
    createdAt: string
    updatedAt: string
    path?: string
    author?: string
  }
}

interface Relationship {
  id: string
  from: string
  to: string
  type: 'depends-on' | 'implements' | 'references' | 'contains'
  strength: number
}

/**
 * Main example function
 */
async function dualEnvironmentExample() {
  logger.info('=== CorticAI Dual Environment Storage Example ===')

  // 1. Environment Detection
  logger.info('\n1. Detecting Environment...')
  const environment = detectEnvironment()
  logger.info('Environment detected:', {
    isAzure: environment.isAzure,
    isLocal: environment.isLocal,
    hasCosmosConnection: environment.hasCosmosConnection,
    recommended: getRecommendedProviderType()
  })

  // 2. Automatic Provider Creation
  logger.info('\n2. Creating Storage Provider (automatic detection)...')
  const provider = await createStorageProvider({
    debug: true,
    enableFallback: true
  })

  const status = await provider.getStatus()
  logger.info('Provider Status:', status)

  // 3. Demonstrate Primary Storage (Graph Operations)
  logger.info('\n3. Primary Storage - Graph Operations...')
  await demonstratePrimaryStorage(provider)

  // 4. Demonstrate Semantic Storage (Analytics & Search)
  logger.info('\n4. Semantic Storage - Analytics & Search...')
  await demonstrateSemanticStorage(provider)

  // 5. Cross-Storage Operations
  logger.info('\n5. Cross-Storage Operations...')
  await demonstrateCrossStorageOperations(provider)

  // 6. Environment-Specific Features
  logger.info('\n6. Environment-Specific Features...')
  await demonstrateEnvironmentSpecificFeatures(provider, status.type)

  // 7. Cleanup
  logger.info('\n7. Cleaning up...')
  await provider.close()

  logger.info('\n=== Example Complete ===')
}

/**
 * Demonstrate primary storage operations (entities and relationships)
 */
async function demonstratePrimaryStorage(provider: any) {
  const primary = provider.primary

  // Add entities
  const entities: ProjectEntity[] = [
    {
      id: 'file_001',
      type: 'file',
      name: 'UserService.ts',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        path: 'src/services/UserService.ts',
        author: 'developer'
      }
    },
    {
      id: 'class_001',
      type: 'class',
      name: 'UserService',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        path: 'src/services/UserService.ts',
        author: 'developer'
      }
    },
    {
      id: 'planning_001',
      type: 'planning-doc',
      name: 'User Authentication Requirements',
      content: 'Requirements for implementing user authentication...',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        path: 'docs/planning/auth-requirements.md',
        author: 'architect'
      }
    }
  ]

  for (const entity of entities) {
    await primary.addEntity(entity)
    logger.info(`Added entity: ${entity.name} (${entity.type})`)
  }

  // Add relationships
  await primary.addRelationship('file_001', 'class_001', 'contains', {
    lineStart: 1,
    lineEnd: 50
  })

  await primary.addRelationship('class_001', 'planning_001', 'implements', {
    requirementSection: 'Authentication Service'
  })

  logger.info('Added relationships between entities')

  // Query relationships
  const userServiceRelationships = await primary.getRelationships('class_001')
  logger.info(`Found ${userServiceRelationships.length} relationships for UserService`)

  // Traverse graph
  const connected = await primary.findConnected('file_001', 'contains')
  logger.info(`Found ${connected.length} entities connected to UserService.ts`)
}

/**
 * Demonstrate semantic storage operations (search and analytics)
 */
async function demonstrateSemanticStorage(provider: any) {
  const semantic = provider.semantic

  // Store analytical data
  const analyticsData = [
    {
      id: 'metric_001',
      type: 'code_metric',
      file: 'UserService.ts',
      complexity: 8,
      lines: 120,
      dependencies: 5,
      testCoverage: 85,
      lastModified: new Date().toISOString()
    },
    {
      id: 'metric_002',
      type: 'code_metric',
      file: 'AuthController.ts',
      complexity: 12,
      lines: 200,
      dependencies: 8,
      testCoverage: 92,
      lastModified: new Date().toISOString()
    },
    {
      id: 'usage_001',
      type: 'usage_pattern',
      pattern: 'dependency_injection',
      frequency: 15,
      files: ['UserService.ts', 'AuthController.ts', 'DatabaseService.ts'],
      confidence: 0.94
    }
  ]

  for (const data of analyticsData) {
    await semantic.set(data.id, data)
    logger.info(`Stored analytics: ${data.id}`)
  }

  // Search operations
  const searchResults = await semantic.search('UserService', {
    limit: 10,
    fields: ['file', 'type']
  })
  logger.info(`Search results for 'UserService': ${searchResults.length} items`)

  // Aggregation operations
  const avgComplexity = await semantic.aggregate({
    type: 'avg',
    field: 'complexity'
  })
  logger.info(`Average code complexity: ${avgComplexity}`)

  const totalLines = await semantic.aggregate({
    type: 'sum',
    field: 'lines'
  })
  logger.info(`Total lines of code: ${totalLines}`)

  // Create materialized view
  await semantic.createView('high_complexity_files', `
    SELECT * FROM c
    WHERE c.value.type = 'code_metric' AND c.value.complexity > 10
  `)
  logger.info('Created materialized view: high_complexity_files')
}

/**
 * Demonstrate operations that span both storage types
 */
async function demonstrateCrossStorageOperations(provider: any) {
  const primary = provider.primary
  const semantic = provider.semantic

  // Get entity from primary storage
  const userServiceEntity = await primary.getEntity('class_001')
  if (userServiceEntity) {
    // Find related analytics in semantic storage
    const analyticsResults = await semantic.search(userServiceEntity.name, {
      fields: ['file']
    })

    logger.info(`Found ${analyticsResults.length} analytics records for ${userServiceEntity.name}`)

    // Create cross-reference
    const crossReference = {
      id: `xref_${userServiceEntity.id}`,
      entityId: userServiceEntity.id,
      entityType: userServiceEntity.type,
      analyticsCount: analyticsResults.length,
      lastAnalyzed: new Date().toISOString()
    }

    await semantic.set(crossReference.id, crossReference)
    logger.info('Created cross-reference between entity and analytics')
  }
}

/**
 * Demonstrate features specific to different environments
 */
async function demonstrateEnvironmentSpecificFeatures(provider: any, providerType: string) {
  if (providerType === 'azure') {
    logger.info('Azure-specific features:')
    logger.info('- Global distribution enabled')
    logger.info('- Automatic scaling based on RU consumption')
    logger.info('- Multi-region failover capability')
    logger.info('- Enterprise-grade security and compliance')

    // Demonstrate Azure-specific operations
    await demonstrateAzureFeatures(provider)
  } else {
    logger.info('Local-specific features:')
    logger.info('- No network dependencies')
    logger.info('- Fast local file system access')
    logger.info('- Full data control and privacy')
    logger.info('- Development-optimized performance')

    // Demonstrate local-specific operations
    await demonstrateLocalFeatures(provider)
  }
}

/**
 * Azure-specific feature demonstrations
 */
async function demonstrateAzureFeatures(provider: any) {
  // Health check with latency measurement
  const healthCheck = await provider.healthCheck()
  const status = await provider.getStatus()

  logger.info('Azure connectivity:', {
    healthy: healthCheck,
    latency: status.latency ? `${status.latency}ms` : 'N/A'
  })

  // Demonstrate cloud-scale operations
  logger.info('Executing cloud-scale batch operations...')
  const batchData = new Map()

  for (let i = 0; i < 50; i++) {
    batchData.set(`batch_item_${i}`, {
      id: `batch_item_${i}`,
      data: `Cloud data item ${i}`,
      timestamp: new Date().toISOString(),
      region: 'auto-detected'
    })
  }

  await provider.semantic.setMany(batchData)
  logger.info('Batch operation completed - 50 items stored in Azure')
}

/**
 * Local-specific feature demonstrations
 */
async function demonstrateLocalFeatures(provider: any) {
  // Demonstrate local file system integration
  logger.info('Local file system operations:')

  const localData = {
    id: 'local_config',
    type: 'configuration',
    environment: 'development',
    paths: {
      database: '.context/working/graph.kuzu',
      analytics: '.context/semantic/analytics.duckdb'
    },
    capabilities: ['offline_mode', 'local_backup', 'fast_development']
  }

  await provider.primary.set('local_config', localData)
  logger.info('Stored local configuration in primary storage')

  // Demonstrate local performance
  const startTime = Date.now()
  await provider.primary.size()
  const endTime = Date.now()

  logger.info(`Local storage query time: ${endTime - startTime}ms`)
}

/**
 * Example of forcing a specific provider type
 */
async function forcedProviderExample() {
  logger.info('\n=== Forced Provider Example ===')

  // Force local provider
  logger.info('Creating forced local provider...')
  const localProvider = await createStorageProvider({
    forceProvider: 'local',
    debug: true,
    localPaths: {
      primary: './temp/test-graph.kuzu',
      semantic: './temp/test-analytics.duckdb'
    }
  })

  await localProvider.primary.set('test_key', { message: 'Hello from forced local!' })
  const value = await localProvider.primary.get('test_key')
  logger.info('Retrieved from forced local provider:', value)

  await localProvider.close()

  // Force Azure provider (will fail if no Azure config)
  try {
    logger.info('Attempting to create forced Azure provider...')
    const azureProvider = await createStorageProvider({
      forceProvider: 'azure',
      debug: true,
      azure: {
        connectionString: process.env.COSMOS_CONNECTION_STRING,
        database: 'test-db',
        primaryContainer: 'test-primary',
        semanticContainer: 'test-semantic'
      }
    })

    await azureProvider.primary.set('test_key', { message: 'Hello from forced Azure!' })
    const azureValue = await azureProvider.primary.get('test_key')
    logger.info('Retrieved from forced Azure provider:', azureValue)

    await azureProvider.close()
  } catch (error) {
    logger.info('Azure provider failed (expected without Azure configuration):', error.message)
  }
}

/**
 * Run the examples
 */
async function main() {
  try {
    await dualEnvironmentExample()
    await forcedProviderExample()
  } catch (error) {
    logger.error('Example failed:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export {
  dualEnvironmentExample,
  forcedProviderExample,
  demonstratePrimaryStorage,
  demonstrateSemanticStorage,
  demonstrateCrossStorageOperations
}