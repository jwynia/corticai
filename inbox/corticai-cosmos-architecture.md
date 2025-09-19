# CorticAI Azure Cosmos DB Architecture

## Overview

This document outlines how CorticAI implements a dual-mode architecture that supports both local file-based storage for laptop development and Azure Cosmos DB for cloud deployments. The key design principle is **"local-first development, cloud-native deployment"** with zero file dependencies when running in Azure.

## Architecture Principles

1. **Storage Abstraction**: All storage operations go through an interface, allowing seamless switching between backends
2. **Environment Detection**: Automatically selects appropriate storage based on environment
3. **No Shared Dependencies**: Local and cloud modes have completely separate dependency chains
4. **Progressive Complexity**: Start simple locally, scale to cloud when needed

## Storage Interface

```typescript
interface ICorticAIStorage {
  // Core operations
  addNode(node: Node): Promise<void>
  addEdge(edge: Edge): Promise<void>
  getNode(id: string): Promise<Node>
  
  // Query operations
  query(pattern: string): Promise<Result[]>
  traverse(start: string, relationship: string, depth: number): Promise<Node[]>
  search(text: string): Promise<Node[]>
  
  // Maintenance operations
  consolidate(): Promise<ConsolidationResult>
  archive(beforeDate: Date): Promise<void>
  
  // Analytics
  aggregate(pipeline: AggregationPipeline): Promise<any[]>
  getPatterns(): Promise<Pattern[]>
}
```

## Implementation Modes

### Local Mode: File-Based Storage

For laptop development with zero cloud dependencies:

```typescript
class LocalFileStorage implements ICorticAIStorage {
  private kuzu: KuzuDB        // Embedded graph database
  private duckdb: DuckDB      // Embedded analytics database
  private basePath: string    // .context folder
  
  async initialize(projectPath: string) {
    this.basePath = path.join(projectPath, '.context')
    
    // Initialize embedded databases
    this.kuzu = await KuzuDB.open(
      path.join(this.basePath, 'graph.kuzu')
    )
    
    this.duckdb = await DuckDB.open(
      path.join(this.basePath, 'analytics.duckdb')
    )
    
    await this.setupSchemas()
  }
  
  // All operations work with local files
  async addNode(node: Node) {
    await this.kuzu.execute(
      'CREATE (n:Node {id: $id, type: $type, properties: $props})',
      { id: node.id, type: node.type, props: JSON.stringify(node.properties) }
    )
  }
  
  async traverse(start: string, relationship: string, depth: number) {
    // Native graph traversal with Kuzu
    const query = `
      MATCH (s {id: $start})-[:${relationship}*1..${depth}]->(n)
      RETURN n
    `
    return await this.kuzu.execute(query, { start })
  }
}
```

### Cloud Mode: Azure Cosmos DB

For Azure deployments with zero file system dependencies:

```typescript
class CosmosDBStorage implements ICorticAIStorage {
  private client: CosmosClient
  private database: Database
  private containers: {
    entities: Container      // Nodes and primary data
    relationships: Container // Edges and connections
    analytics: Container     // Materialized views
    episodes: Container      // Event stream with TTL
  }
  
  async initialize(config: CosmosConfig) {
    this.client = new CosmosClient({
      endpoint: config.endpoint,
      key: config.key
    })
    
    this.database = this.client.database(config.database)
    
    // Setup containers with appropriate partition strategies
    this.containers = {
      entities: await this.setupContainer('entities', '/type'),
      relationships: await this.setupContainer('relationships', '/relationshipType'),
      analytics: await this.setupContainer('analytics', '/viewType'),
      episodes: await this.setupContainer('episodes', '/timestamp', { ttl: 2592000 })
    }
  }
  
  async addNode(node: Node) {
    await this.containers.entities.items.create({
      id: node.id,
      partitionKey: node.type,
      docType: 'node',
      ...node,
      searchText: this.generateSearchText(node),
      _indexed: new Date().toISOString()
    })
  }
  
  async traverse(start: string, relationship: string, depth: number) {
    // Simulate graph traversal with denormalized paths
    const results = []
    let currentLevel = [start]
    
    for (let d = 0; d < depth; d++) {
      const query = {
        query: `
          SELECT * FROM c 
          WHERE c.docType = 'edge' 
          AND c.relationshipType = @relationship
          AND ARRAY_CONTAINS(@currentNodes, c.from)
        `,
        parameters: [
          { name: '@relationship', value: relationship },
          { name: '@currentNodes', value: currentLevel }
        ]
      }
      
      const { resources } = await this.containers.relationships.items
        .query(query)
        .fetchAll()
      
      results.push(...resources)
      currentLevel = resources.map(r => r.to)
      
      if (currentLevel.length === 0) break
    }
    
    return results
  }
}
```

## Environment Detection and Initialization

```typescript
class CorticAI {
  private storage: ICorticAIStorage
  
  static async initialize(options?: InitOptions): Promise<CorticAI> {
    const instance = new CorticAI()
    
    // Auto-detect environment if not specified
    const environment = options?.environment || this.detectEnvironment()
    
    switch (environment) {
      case 'local':
        instance.storage = await this.initializeLocal(options)
        break
        
      case 'azure':
        instance.storage = await this.initializeAzure(options)
        break
        
      case 'development':
        instance.storage = await this.initializeDevelopment(options)
        break
        
      default:
        throw new Error(`Unknown environment: ${environment}`)
    }
    
    return instance
  }
  
  private static detectEnvironment(): Environment {
    // Azure App Service / Functions
    if (process.env.WEBSITE_INSTANCE_ID || process.env.FUNCTIONS_WORKER_RUNTIME) {
      return 'azure'
    }
    
    // Cosmos DB connection string present
    if (process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY) {
      return 'azure'
    }
    
    // Local development
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return 'local'
    }
    
    // Default to local for safety
    return 'local'
  }
  
  private static async initializeLocal(options?: InitOptions) {
    const storage = new LocalFileStorage()
    await storage.initialize(options?.projectPath || process.cwd())
    return storage
  }
  
  private static async initializeAzure(options?: InitOptions) {
    const storage = new CosmosDBStorage()
    await storage.initialize({
      endpoint: options?.cosmosEndpoint || process.env.COSMOS_ENDPOINT,
      key: options?.cosmosKey || process.env.COSMOS_KEY,
      database: options?.database || 'corticai'
    })
    return storage
  }
  
  private static async initializeDevelopment(options?: InitOptions) {
    // Use Cosmos Emulator for development
    const storage = new CosmosDBStorage()
    await storage.initialize({
      endpoint: 'https://localhost:8081',
      key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
      database: 'corticai-dev'
    })
    return storage
  }
}
```

## Cosmos DB Schema Design

### Document Structures

```typescript
// Node Document
{
  "id": "node-uuid",
  "partitionKey": "/type/component",
  "docType": "node",
  "type": "component",
  "subtype": "service",
  "properties": {
    // All domain-specific data as JSON
    "name": "PaymentService",
    "domain": "payments",
    "criticality": "high"
  },
  "metadata": {
    "created": "2024-01-15T10:00:00Z",
    "modified": "2024-01-15T10:00:00Z",
    "createdBy": "agent-001",
    "provenance": {
      "sources": ["episode-123"],
      "confidence": 0.95
    }
  },
  "search": {
    "text": "payment service stripe integration billing",
    "embedding": [...],  // Vector for semantic search
    "tags": ["payment", "critical", "external-api"]
  },
  "paths": {
    // Denormalized for fast traversal
    "dependencies": ["stripe-api", "database", "queue"],
    "dependents": ["checkout", "admin"],
    "ancestors": ["services", "backend", "system"]
  }
}

// Edge Document
{
  "id": "edge-uuid",
  "partitionKey": "/relationships/DEPENDS_ON",
  "docType": "edge",
  "relationshipType": "DEPENDS_ON",
  "from": {
    "id": "payment-service",
    "type": "service",
    "name": "Payment Service"  // Denormalized
  },
  "to": {
    "id": "stripe-api",
    "type": "external-api",
    "name": "Stripe API"  // Denormalized
  },
  "properties": {
    "strength": "critical",
    "version": "3.0",
    "established": "2024-01-15T10:00:00Z"
  }
}

// Analytics View Document
{
  "id": "view-pattern-summary",
  "partitionKey": "/views/analytics",
  "docType": "view",
  "viewType": "pattern_summary",
  "data": {
    "circular_dependencies": 3,
    "god_objects": 1,
    "orphaned_nodes": 12,
    "last_updated": "2024-01-15T10:00:00Z"
  }
}

// Episode Document (with TTL)
{
  "id": "episode-uuid",
  "partitionKey": "/episodes/2024-01",
  "docType": "episode",
  "timestamp": "2024-01-15T10:00:00Z",
  "type": "file_change",
  "data": {
    "file": "src/payment.ts",
    "changeType": "modified",
    "diff": "...",
    "agent": "coding-agent"
  },
  "ttl": 2592000  // 30 days
}
```

### Indexing Policy

```json
{
  "indexingPolicy": {
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
      {
        "path": "/*"
      }
    ],
    "excludedPaths": [
      {
        "path": "/search/embedding/*"
      }
    ],
    "compositeIndexes": [
      [
        {"path": "/docType", "order": "ascending"},
        {"path": "/type", "order": "ascending"},
        {"path": "/metadata/created", "order": "descending"}
      ],
      [
        {"path": "/docType", "order": "ascending"},
        {"path": "/relationshipType", "order": "ascending"}
      ]
    ],
    "spatialIndexes": [
      {
        "path": "/properties/location/*",
        "types": ["Point", "Polygon"]
      }
    ],
    "vectorIndexes": [
      {
        "path": "/search/embedding",
        "type": "flat",
        "dimensions": 1536
      }
    ]
  }
}
```

## Graph Operations in Cosmos DB

### Simulated Graph Traversal

```typescript
class CosmosGraphOperations {
  // Pre-compute common traversals during write
  async addNodeWithPaths(node: Node) {
    // Calculate paths
    const paths = await this.computePaths(node)
    
    // Store with denormalized paths
    await this.container.items.create({
      ...node,
      paths: {
        dependencies: paths.dependencies,
        dependents: paths.dependents,
        ancestors: paths.ancestors,
        descendants: paths.descendants
      }
    })
  }
  
  // Fast traversal using pre-computed paths
  async getDescendants(nodeId: string, depth: number = -1) {
    const node = await this.container.item(nodeId).read()
    
    if (depth === 1) {
      return node.paths.children || []
    }
    
    if (depth === -1) {
      return node.paths.descendants || []
    }
    
    // For specific depth, need to traverse
    return await this.traverseToDepth(nodeId, 'descendants', depth)
  }
  
  // Pattern detection using materialized views
  async detectCircularDependencies() {
    const query = {
      query: `
        SELECT c.id, c.paths.dependencies
        FROM c
        WHERE c.docType = 'node'
        AND ARRAY_CONTAINS(c.paths.dependencies, c.id)
      `
    }
    
    return await this.container.items.query(query).fetchAll()
  }
}
```

### Change Feed Processing

```typescript
class CosmosChangeProcessor {
  async startProcessing() {
    const changeFeedIterator = this.container.items.changeFeed(
      undefined,
      { startFromBeginning: false }
    )
    
    while (changeFeedIterator.hasMoreResults) {
      const { result } = await changeFeedIterator.readNext()
      
      for (const change of result) {
        // Update materialized views
        if (change.docType === 'node') {
          await this.updateNodeViews(change)
        }
        
        if (change.docType === 'edge') {
          await this.updateGraphViews(change)
        }
        
        // Trigger consolidation if needed
        if (this.shouldConsolidate(change)) {
          await this.triggerConsolidation()
        }
      }
    }
  }
}
```

## Search Implementation

### Full-Text Search

```typescript
class CosmosSearchOperations {
  async search(query: string) {
    // Use Cosmos DB's CONTAINS for simple search
    const results = await this.container.items.query({
      query: `
        SELECT * FROM c 
        WHERE c.docType = 'node'
        AND CONTAINS(LOWER(c.search.text), LOWER(@query))
      `,
      parameters: [
        { name: '@query', value: query }
      ]
    }).fetchAll()
    
    return results.resources
  }
  
  async semanticSearch(query: string, limit: number = 10) {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query)
    
    // Use Cosmos DB's vector search (preview feature)
    const results = await this.container.items.query({
      query: `
        SELECT TOP @limit 
          c.id,
          c.type,
          c.properties.name,
          VectorDistance(c.search.embedding, @queryEmbedding) as similarity
        FROM c
        WHERE c.docType = 'node'
        ORDER BY VectorDistance(c.search.embedding, @queryEmbedding)
      `,
      parameters: [
        { name: '@limit', value: limit },
        { name: '@queryEmbedding', value: queryEmbedding }
      ]
    }).fetchAll()
    
    return results.resources
  }
}
```

## Azure Deployment Configuration

### Infrastructure as Code (Bicep)

```bicep
// main.bicep
param location string = resourceGroup().location
param cosmosAccountName string = 'corticai-cosmos'

// Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'  // For development
      }
    ]
  }
}

// Database
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosAccount
  name: 'corticai'
  properties: {
    resource: {
      id: 'corticai'
    }
  }
}

// Containers
resource entitiesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: database
  name: 'entities'
  properties: {
    resource: {
      id: 'entities'
      partitionKey: {
        paths: ['/type']
        kind: 'Hash'
      }
      indexingPolicy: loadJsonContent('cosmos-indexing-policy.json')
    }
    options: {
      autoscaleSettings: {
        maxThroughput: 4000
      }
    }
  }
}

// App Service
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'corticai-plan'
  location: location
  sku: {
    name: 'P1v3'
    tier: 'PremiumV3'
  }
  kind: 'linux'
}

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: 'corticai-api'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      appSettings: [
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_KEY'
          value: cosmosAccount.listKeys().primaryMasterKey
        }
        {
          name: 'ENVIRONMENT'
          value: 'azure'
        }
      ]
    }
  }
}
```

### Environment Variables

```env
# Local Development (.env.local)
ENVIRONMENT=local
PROJECT_PATH=./

# Azure Development (.env.development)
ENVIRONMENT=development
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==

# Azure Production (App Service Configuration)
ENVIRONMENT=azure
COSMOS_ENDPOINT=https://corticai-cosmos.documents.azure.com:443/
COSMOS_KEY=[Managed Identity or Key Vault Reference]
```

## Cost Optimization Strategies

### Tiered Storage Strategy

```typescript
class CosmosCostOptimizer {
  // Hot tier: Active working memory (Autoscale)
  private hotContainer: Container     // 400-4000 RU/s autoscale
  
  // Warm tier: Recent consolidated (Fixed)
  private warmContainer: Container    // 400 RU/s fixed
  
  // Cold tier: Archive (TTL + Blob)
  private coldContainer: Container    // 400 RU/s with 90-day TTL
  private blobStorage: BlobClient     // Long-term archive
  
  async optimizeCosts() {
    // Move data through tiers based on age
    await this.moveToWarm(7)   // After 7 days
    await this.moveToCold(30)  // After 30 days
    await this.archiveToBlob(90) // After 90 days
  }
  
  // Batch operations to minimize RU consumption
  async batchWrite(items: any[], maxBatchSize: number = 100) {
    const batches = []
    
    for (let i = 0; i < items.length; i += maxBatchSize) {
      const batch = items.slice(i, i + maxBatchSize).map(item => ({
        operationType: 'Upsert',
        resourceBody: item
      }))
      
      batches.push(this.container.items.batch(batch))
    }
    
    await Promise.all(batches)
  }
  
  // Use point reads when possible (1 RU vs query)
  async efficientRead(id: string, partitionKey: string) {
    // Point read: 1 RU
    return await this.container.item(id, partitionKey).read()
    
    // vs Query: 3+ RUs
    // await this.container.items.query(`SELECT * FROM c WHERE c.id = '${id}'`)
  }
}
```

## Local Development Tools

### Cosmos Emulator Setup

```bash
# Install Cosmos Emulator (Windows/Linux/Mac)
# Windows: Download installer
# Mac/Linux: Use Docker
docker run -p 8081:8081 -p 10251:10251 -p 10252:10252 -p 10253:10253 -p 10254:10254 \
  --name azure-cosmos-emulator \
  -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=10 \
  -e AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=true \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator

# Emulator automatically uses well-known key
# Endpoint: https://localhost:8081
# Key: C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
```

### Development Workflow

```typescript
// dev.ts - Local development entry point
import { CorticAI } from './corticai'

async function setupDevelopment() {
  // Check if Cosmos Emulator is running
  const useEmulator = await checkCosmosEmulator()
  
  const corticai = await CorticAI.initialize({
    environment: useEmulator ? 'development' : 'local',
    projectPath: process.cwd()
  })
  
  // Seed with test data if needed
  if (process.env.SEED_DATA) {
    await seedTestData(corticai)
  }
  
  return corticai
}

async function checkCosmosEmulator(): Promise<boolean> {
  try {
    const response = await fetch('https://localhost:8081/_explorer/emulator.pem')
    return response.ok
  } catch {
    console.log('Cosmos Emulator not found, using local file storage')
    return false
  }
}
```

## Migration Utilities

### From Local to Cloud

```typescript
class MigrationManager {
  async migrateLocalToCloud(localPath: string, cosmosConfig: CosmosConfig) {
    // Initialize both storages
    const local = new LocalFileStorage()
    await local.initialize(localPath)
    
    const cloud = new CosmosDBStorage()
    await cloud.initialize(cosmosConfig)
    
    // Migrate nodes
    console.log('Migrating nodes...')
    const nodes = await local.getAllNodes()
    for (const node of nodes) {
      await cloud.addNode(node)
    }
    
    // Migrate edges
    console.log('Migrating relationships...')
    const edges = await local.getAllEdges()
    for (const edge of edges) {
      await cloud.addEdge(edge)
    }
    
    // Migrate episodes
    console.log('Migrating history...')
    const episodes = await local.getAllEpisodes()
    for (const episode of episodes) {
      await cloud.addEpisode(episode)
    }
    
    console.log('Migration complete')
  }
  
  async migrateCloudToLocal(cosmosConfig: CosmosConfig, localPath: string) {
    // Reverse process for backup/export
    // Useful for creating local development snapshots
  }
}
```

## Summary

This architecture provides:

1. **True Dual-Mode Operation**: Fully functional both locally (with files) and in Azure (with Cosmos DB)
2. **Zero File Dependencies in Cloud**: When deployed to Azure, no file system access is required
3. **Seamless Switching**: Same API regardless of storage backend
4. **Cost Optimization**: Tiered storage, TTL, and batch operations minimize Azure costs
5. **Developer Experience**: Works on laptop without Azure account, but scales to cloud instantly

The key is the storage abstraction layer that makes Cosmos DB and local file storage completely interchangeable from the application's perspective.