# CorticAI CosmosDB Integration

This document describes the new Azure CosmosDB storage integration for CorticAI, enabling seamless dual-environment operation between local development and Azure cloud projects.

## Overview

The CosmosDB integration provides:

- **Automatic Environment Detection**: CorticAI detects Azure environments and automatically switches to CosmosDB when available
- **Dual-Role Architecture**: Both primary (graph) and semantic (analytics) storage roles implemented with CosmosDB
- **Seamless Fallback**: Graceful fallback to local storage when Azure is unavailable
- **Production Ready**: Full ACID compliance, retry logic, and error handling

## Quick Start

### Automatic Configuration (Recommended)

CorticAI automatically detects your environment and configures the appropriate storage:

```typescript
import { createStorageProvider } from './src/storage/providers/StorageProviderFactory'

// Automatically detects environment and creates appropriate provider
const provider = await createStorageProvider({
  debug: true,
  enableFallback: true
})

// Use primary storage for entities and relationships
await provider.primary.addEntity({
  id: 'entity_1',
  type: 'document',
  name: 'My Document',
  metadata: { created: new Date().toISOString() }
})

// Use semantic storage for analytics and search
await provider.semantic.search('document', { limit: 10 })
```

### Manual Configuration

For explicit control over storage selection:

```typescript
// Force local storage
const localProvider = await createStorageProvider({
  forceProvider: 'local',
  localPaths: {
    primary: './data/graph.kuzu',
    semantic: './data/analytics.duckdb'
  }
})

// Force Azure storage
const azureProvider = await createStorageProvider({
  forceProvider: 'azure',
  azure: {
    connectionString: process.env.COSMOS_CONNECTION_STRING,
    database: 'corticai',
    primaryContainer: 'entities',
    semanticContainer: 'analytics'
  }
})
```

## Environment Detection

CorticAI automatically detects Azure environments based on:

### Environment Variables
- `AZURE_CLIENT_ID` - Azure service principal
- `COSMOS_CONNECTION_STRING` or `AZURE_COSMOS_CONNECTION_STRING` - CosmosDB connection
- `COSMOS_ENDPOINT` + `COSMOS_KEY` - CosmosDB endpoint and key
- `WEBSITE_INSTANCE_ID` - Azure App Service indicator
- `MSI_ENDPOINT` or `IDENTITY_ENDPOINT` - Azure managed identity

### Detection Logic
```typescript
import { detectEnvironment } from './src/storage/providers/StorageProviderFactory'

const env = detectEnvironment()
console.log({
  isAzure: env.isAzure,
  hasCosmosConnection: env.hasCosmosConnection,
  cosmosEndpoint: env.cosmosEndpoint
})
```

## Configuration Options

### CosmosDB Configuration

```typescript
interface CosmosDBStorageConfig {
  type: 'cosmosdb'

  // Connection (choose one approach)
  connectionString?: string                    // Recommended: complete connection string
  endpoint?: string                           // Alternative: endpoint + key
  key?: string                               // Alternative: endpoint + key

  // Required
  database: string                           // Database name
  container: string                          // Container name

  // Optional Performance Tuning
  throughput?: {
    type: 'manual' | 'autoscale'
    value: number                            // RU/s for manual, max RU/s for autoscale
  }
  consistencyLevel?: 'Strong' | 'BoundedStaleness' | 'Session' | 'ConsistentPrefix' | 'Eventual'
  partitionKey?: string                      // Default: '/entityType'

  // Optional Connection Policies
  connectionPolicy?: {
    maxRetryAttempts?: number                // Default: 3
    maxRetryWaitTime?: number                // Default: 30000ms
    enableEndpointDiscovery?: boolean        // Default: true
    preferredLocations?: string[]            // Multi-region preference
  }

  // Optional Authentication (for advanced scenarios)
  auth?: {
    type: 'managed-identity' | 'service-principal' | 'default-azure-credential'
    clientId?: string
    clientSecret?: string
    tenantId?: string
  }
}
```

### Environment Variables Setup

#### Development (Local)
```bash
# No special environment variables needed
# CorticAI will automatically use local storage
```

#### Azure App Service
```bash
# Minimum required for CosmosDB
COSMOS_CONNECTION_STRING="AccountEndpoint=https://your-cosmos.documents.azure.com:443/;AccountKey=your-key;"

# Or separate endpoint and key
COSMOS_ENDPOINT="https://your-cosmos.documents.azure.com:443/"
COSMOS_KEY="your-cosmos-key"
```

#### Azure Container Instances / Kubernetes
```bash
# Using managed identity (recommended)
AZURE_CLIENT_ID="your-managed-identity-client-id"

# Plus CosmosDB connection
COSMOS_ENDPOINT="https://your-cosmos.documents.azure.com:443/"
# Key provided via Azure Key Vault or managed identity
```

## Storage Provider Architecture

### Dual-Role Design

CorticAI uses a dual-role storage architecture:

#### Primary Storage (Graph Operations)
- **Purpose**: Entities, relationships, graph traversal
- **Local Implementation**: KuzuStorageAdapter (graph database)
- **Azure Implementation**: CosmosDBStorageAdapter (flexible documents)
- **Operations**: `addEntity()`, `addRelationship()`, `traverse()`, `findConnected()`

#### Semantic Storage (Analytics & Search)
- **Purpose**: Search indices, materialized views, analytics
- **Local Implementation**: DuckDBStorageAdapter (columnar analytics)
- **Azure Implementation**: CosmosDBStorageAdapter (optimized for queries)
- **Operations**: `search()`, `aggregate()`, `createView()`, `refreshView()`

### Provider Factory

The `StorageProviderFactory` handles:
- Environment detection
- Provider selection and configuration
- Fallback logic
- Health checking
- Retry mechanisms

```typescript
const factory = StorageProviderFactory.getInstance()

// Get environment information
const env = factory.detectEnvironment()

// Create provider with retry logic
const provider = await factory.createWithRetry({
  enableFallback: true,
  debug: true
})

// Test provider health
const healthy = await factory.testProvider(provider)
```

## Usage Examples

### Basic Entity Management

```typescript
// Create storage provider
const provider = await createStorageProvider()

// Add entities
await provider.primary.addEntity({
  id: 'file_001',
  type: 'file',
  name: 'UserService.ts',
  path: 'src/services/UserService.ts',
  content: '// TypeScript code...'
})

await provider.primary.addEntity({
  id: 'class_001',
  type: 'class',
  name: 'UserService',
  file: 'file_001'
})

// Add relationships
await provider.primary.addRelationship(
  'file_001',
  'class_001',
  'contains',
  { lineStart: 1, lineEnd: 50 }
)

// Query relationships
const relationships = await provider.primary.getRelationships('file_001')
console.log(`Found ${relationships.length} relationships`)

// Graph traversal
const connected = await provider.primary.findConnected('file_001', 'contains')
```

### Analytics and Search

```typescript
// Store analytics data
await provider.semantic.set('metrics_001', {
  file: 'UserService.ts',
  complexity: 8,
  lines: 120,
  dependencies: 5,
  testCoverage: 85
})

// Full-text search
const searchResults = await provider.semantic.search('UserService', {
  fields: ['file', 'name'],
  limit: 10
})

// Aggregations
const avgComplexity = await provider.semantic.aggregate({
  type: 'avg',
  field: 'complexity'
})

// Materialized views
await provider.semantic.createView('high_complexity_files', `
  SELECT * FROM c
  WHERE c.value.complexity > 10
`)

await provider.semantic.refreshView('high_complexity_files')
const highComplexityFiles = await provider.semantic.getView('high_complexity_files')
```

### Cross-Storage Operations

```typescript
// Get entity from primary storage
const entity = await provider.primary.getEntity('class_001')

if (entity) {
  // Find related analytics in semantic storage
  const analytics = await provider.semantic.search(entity.name)

  // Create cross-reference
  await provider.semantic.set(`xref_${entity.id}`, {
    entityId: entity.id,
    entityType: entity.type,
    analyticsCount: analytics.length,
    lastAnalyzed: new Date().toISOString()
  })
}
```

## Performance Considerations

### CosmosDB Optimization

#### Request Units (RU) Management
- Point reads: ~1 RU
- Simple queries: 3-10 RUs
- Complex queries: 10-100+ RUs
- Batch operations: Optimized for bulk processing

#### Partitioning Strategy
- **Default**: Partition by `/entityType` for balanced distribution
- **Custom**: Configure partition key for specific access patterns
- **Best Practice**: Ensure even distribution to avoid hot partitions

#### Indexing Policy
```typescript
// Automatic indexing for common paths
{
  includedPaths: [
    { path: '/key/?' },        // Storage key
    { path: '/entityType/?' }, // Partition key
    { path: '/_ts/?' }         // Timestamp
  ],
  excludedPaths: [
    { path: '/value/*' }       // Exclude content to save RUs
  ]
}
```

### Local Storage Optimization

#### File Paths
- **Primary**: `.context/working/graph.kuzu` (graph operations)
- **Semantic**: `.context/semantic/analytics.duckdb` (analytics)

#### Performance Tuning
```typescript
const localProvider = await createStorageProvider({
  forceProvider: 'local',
  localPaths: {
    primary: './fast-ssd/graph.kuzu',      // Place on fastest storage
    semantic: './fast-ssd/analytics.duckdb'
  }
})
```

## Migration and Data Portability

### Local to Azure Migration

```typescript
import { StorageMigrator } from './src/storage/migration/StorageMigrator'

const migrator = new StorageMigrator()

// Migrate from local to Azure
await migrator.migrate(localProvider, azureProvider, {
  batchSize: 100,
  validateIntegrity: true,
  progressCallback: (progress) => {
    console.log(`Migration progress: ${progress.percentage}%`)
  }
})
```

### Development Snapshots

```typescript
// Create local snapshot of Azure data
await migrator.createSnapshot(azureProvider, './dev-snapshot/', {
  includeAnalytics: true,
  compress: true
})

// Restore from snapshot
await migrator.restoreSnapshot('./dev-snapshot/', localProvider)
```

## Deployment

### Azure App Service

1. **Configure App Settings**:
   ```
   COSMOS_CONNECTION_STRING=AccountEndpoint=https://...;AccountKey=...
   ```

2. **Deploy Application**:
   ```bash
   # CorticAI will automatically detect Azure environment
   npm run build
   az webapp deploy --resource-group myResourceGroup --name myApp
   ```

### Azure Container Instances

1. **Use Managed Identity** (recommended):
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   spec:
     template:
       spec:
         containers:
         - name: corticai
           env:
           - name: AZURE_CLIENT_ID
             value: "your-managed-identity-client-id"
           - name: COSMOS_ENDPOINT
             value: "https://your-cosmos.documents.azure.com:443/"
   ```

### Infrastructure as Code

Azure Bicep template example:
```bicep
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2021-10-15' = {
  name: 'corticai-cosmos'
  location: location
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    capabilities: [
      {
        name: 'EnableServerless'  // For development
      }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2021-10-15' = {
  parent: cosmosAccount
  name: 'corticai'
  properties: {
    resource: {
      id: 'corticai'
    }
  }
}
```

## Monitoring and Troubleshooting

### Health Checks

```typescript
// Provider health
const status = await provider.getStatus()
console.log({
  healthy: status.healthy,
  primaryReady: status.primaryReady,
  semanticReady: status.semanticReady,
  latency: status.latency
})

// Detailed health check
const healthy = await provider.healthCheck()
if (!healthy) {
  console.error('Provider unhealthy, check connection')
}
```

### Debug Logging

```typescript
const provider = await createStorageProvider({
  debug: true  // Enable detailed logging
})

// Logs will include:
// - Environment detection results
// - Connection attempts and results
// - Query execution times
// - Error details with context
```

### Common Issues

#### Connection Failures
```
Error: Failed to initialize CosmosDB adapter: Connection failed
```
**Solution**: Verify connection string and network connectivity

#### RU Throttling
```
Error: Request rate too large (429)
```
**Solution**: Increase throughput or implement backoff strategy

#### Partition Hot Spots
```
Warning: High latency on operations
```
**Solution**: Review partition key strategy and data distribution

## Testing

### Unit Tests
```bash
npm test -- tests/storage/adapters/CosmosDBStorageAdapter.test.ts
```

### Integration Tests with Emulator
```bash
# Start CosmosDB emulator
docker run -p 8081:8081 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator

# Run integration tests
npm test -- tests/integration/cosmos-integration.test.ts
```

### Performance Tests
```bash
npm run benchmark -- --adapters CosmosDB --data-size 10K
```

## Security Best Practices

### Connection Security
- ✅ Use connection strings over endpoint+key when possible
- ✅ Store secrets in Azure Key Vault, not environment variables
- ✅ Use managed identity in production
- ✅ Enable SSL/TLS for all connections
- ❌ Don't commit connection strings to source control

### Access Control
- Configure least-privilege access
- Use separate CosmosDB accounts for dev/staging/prod
- Regular key rotation
- Monitor access patterns

### Data Protection
- Enable encryption at rest (automatic)
- Use customer-managed keys if required
- Configure backup policies
- Test disaster recovery procedures

## Migration Guide

### From Local-Only to Dual-Environment

1. **Install Dependencies**:
   ```bash
   npm install @azure/cosmos
   ```

2. **Update Code**:
   ```typescript
   // Old: Direct storage adapter
   const storage = new KuzuStorageAdapter(config)

   // New: Provider factory with environment detection
   const provider = await createStorageProvider()
   const primary = provider.primary
   const semantic = provider.semantic
   ```

3. **Configure Environment**:
   ```bash
   # Production
   COSMOS_CONNECTION_STRING="..."

   # Development (no changes needed)
   ```

4. **Test Migration**:
   ```typescript
   // Verify dual environment capability
   const localProvider = await createStorageProvider({ forceProvider: 'local' })
   const azureProvider = await createStorageProvider({ forceProvider: 'azure' })

   // Test data migration
   await testMigration(localProvider, azureProvider)
   ```

## Conclusion

The CosmosDB integration enables CorticAI to work seamlessly across local development and Azure cloud environments. The automatic environment detection and fallback capabilities ensure that your application works reliably regardless of the deployment context.

Key benefits:
- **Zero Configuration**: Automatic environment detection
- **Seamless Fallback**: Graceful degradation when cloud unavailable
- **Production Ready**: Enterprise-grade reliability and performance
- **Flexible Deployment**: Works in any Azure service
- **Data Portability**: Easy migration between environments

For questions or issues, refer to the test suite and example implementations in the `/examples` directory.