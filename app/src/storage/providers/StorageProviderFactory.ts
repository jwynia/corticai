/**
 * Storage Provider Factory
 *
 * Factory class for creating storage providers based on environment detection
 * and configuration. Handles automatic fallback between Azure and local storage.
 */

import { LocalStorageProvider, LocalStorageConfig } from './LocalStorageProvider'
import { AzureStorageProvider, AzureStorageConfig } from './AzureStorageProvider'
import { IStorageProvider, StorageProviderConfig } from './IStorageProvider'
import { Logger } from '../../utils/Logger'

const logger = Logger.createConsoleLogger('StorageProviderFactory')

/**
 * Environment detection result
 */
export interface EnvironmentInfo {
  isAzure: boolean
  isLocal: boolean
  hasCosmosConnection: boolean
  azureSubscriptionId?: string
  azureResourceGroup?: string
  cosmosEndpoint?: string
  cosmosConnectionString?: string
}

/**
 * Factory configuration options
 */
export interface FactoryConfig {
  /** Force a specific provider type */
  forceProvider?: 'local' | 'azure'

  /** Enable fallback to local storage if Azure fails */
  enableFallback?: boolean

  /** Debug logging */
  debug?: boolean

  /** Custom storage paths for local storage */
  localPaths?: {
    primary?: string
    semantic?: string
  }

  /** Custom Azure configuration */
  azure?: {
    endpoint?: string
    key?: string
    connectionString?: string
    database?: string
    primaryContainer?: string
    semanticContainer?: string
  }
}

/**
 * Storage Provider Factory
 */
export class StorageProviderFactory {
  private static instance: StorageProviderFactory | null = null

  /**
   * Get singleton instance
   */
  static getInstance(): StorageProviderFactory {
    if (!StorageProviderFactory.instance) {
      StorageProviderFactory.instance = new StorageProviderFactory()
    }
    return StorageProviderFactory.instance
  }

  /**
   * Detect the current environment
   */
  detectEnvironment(): EnvironmentInfo {
    const env = process.env

    // Check for Azure environment indicators
    const isAzure = !!(
      env.WEBSITE_INSTANCE_ID ||           // Azure App Service
      env.AZURE_CLIENT_ID ||               // Azure service principal
      env.MSI_ENDPOINT ||                  // Azure managed identity
      env.IDENTITY_ENDPOINT ||             // Azure managed identity (newer)
      env.AZURE_SUBSCRIPTION_ID ||         // Azure subscription
      env.COSMOS_CONNECTION_STRING ||      // Custom cosmos connection
      env.AZURE_COSMOS_CONNECTION_STRING   // Azure cosmos connection
    )

    // Check for CosmosDB connection
    const hasCosmosConnection = !!(
      env.COSMOS_CONNECTION_STRING ||
      env.AZURE_COSMOS_CONNECTION_STRING ||
      (env.COSMOS_ENDPOINT && env.COSMOS_KEY) ||
      (env.AZURE_COSMOS_ENDPOINT && env.AZURE_COSMOS_KEY)
    )

    // Extract Azure metadata
    const azureSubscriptionId = env.AZURE_SUBSCRIPTION_ID
    const azureResourceGroup = env.AZURE_RESOURCE_GROUP || env.RESOURCE_GROUP
    const cosmosEndpoint = env.COSMOS_ENDPOINT || env.AZURE_COSMOS_ENDPOINT
    const cosmosConnectionString = env.COSMOS_CONNECTION_STRING || env.AZURE_COSMOS_CONNECTION_STRING

    const isLocal = !isAzure || !hasCosmosConnection

    return {
      isAzure,
      isLocal,
      hasCosmosConnection,
      azureSubscriptionId,
      azureResourceGroup,
      cosmosEndpoint,
      cosmosConnectionString
    }
  }

  /**
   * Create storage provider based on environment and configuration
   */
  async createProvider(config: FactoryConfig = {}): Promise<IStorageProvider> {
    const environment = this.detectEnvironment()

    if (config.debug) {
      logger.debug('Environment detected:', {
        isAzure: environment.isAzure,
        isLocal: environment.isLocal,
        hasCosmosConnection: environment.hasCosmosConnection,
        forceProvider: config.forceProvider
      })
    }

    // Handle forced provider selection
    if (config.forceProvider === 'azure') {
      return this.createAzureProvider(config, environment)
    }

    if (config.forceProvider === 'local') {
      return this.createLocalProvider(config)
    }

    // Auto-detect provider based on environment
    if (environment.isAzure && environment.hasCosmosConnection) {
      try {
        return await this.createAzureProvider(config, environment)
      } catch (error) {
        if (config.enableFallback !== false) {
          if (config.debug) {
            logger.debug('Azure provider failed, falling back to local:', (error as any).message)
          }
          return this.createLocalProvider(config)
        }
        throw error
      }
    }

    // Default to local provider
    return this.createLocalProvider(config)
  }

  /**
   * Create Azure storage provider
   */
  private async createAzureProvider(config: FactoryConfig, environment: EnvironmentInfo): Promise<AzureStorageProvider> {
    const azureConfig: AzureStorageConfig = {
      type: 'azure',
      debug: config.debug || false,
      primary: {
        type: 'cosmosdb',
        database: config.azure?.database || 'corticai',
        container: config.azure?.primaryContainer || 'primary',
        connectionString: environment.cosmosConnectionString || config.azure?.connectionString,
        endpoint: environment.cosmosEndpoint || config.azure?.endpoint,
        key: config.azure?.key,
        partitionKey: '/entityType',
        consistencyLevel: 'Session',
        debug: config.debug || false
      },
      semantic: {
        type: 'cosmosdb',
        database: config.azure?.database || 'corticai',
        container: config.azure?.semanticContainer || 'semantic',
        connectionString: environment.cosmosConnectionString || config.azure?.connectionString,
        endpoint: environment.cosmosEndpoint || config.azure?.endpoint,
        key: config.azure?.key,
        partitionKey: '/entityType',
        consistencyLevel: 'Session',
        debug: config.debug || false
      }
    }

    // Validate configuration
    if (!azureConfig.primary.connectionString && (!azureConfig.primary.endpoint || !azureConfig.primary.key)) {
      throw new Error('Azure storage requires either connectionString or both endpoint and key')
    }

    const provider = new AzureStorageProvider(azureConfig)
    await provider.initialize()

    if (config.debug) {
      logger.debug('Azure storage provider created successfully')
    }

    return provider
  }

  /**
   * Create local storage provider
   */
  private async createLocalProvider(config: FactoryConfig): Promise<LocalStorageProvider> {
    // Use project-relative paths by default
    const defaultPrimaryPath = config.localPaths?.primary || '.context/working/graph.kuzu'
    const defaultSemanticPath = config.localPaths?.semantic || '.context/semantic/analytics.duckdb'

    const localConfig: LocalStorageConfig = {
      type: 'local',
      debug: config.debug || false,
      primary: {
        database: defaultPrimaryPath,
        readOnly: false
      },
      semantic: {
        database: defaultSemanticPath,
        threads: 4,
        memoryLimit: '2GB'
      }
    }

    const provider = new LocalStorageProvider(localConfig)
    await provider.initialize()

    if (config.debug) {
      logger.debug('Local storage provider created successfully', {
        primary: defaultPrimaryPath,
        semantic: defaultSemanticPath
      })
    }

    return provider
  }

  /**
   * Create provider with explicit configuration
   */
  async createWithConfig(config: StorageProviderConfig): Promise<IStorageProvider> {
    switch (config.type) {
      case 'local':
        const localProvider = new LocalStorageProvider(config as LocalStorageConfig)
        await localProvider.initialize()
        return localProvider

      case 'azure':
        const azureProvider = new AzureStorageProvider(config as AzureStorageConfig)
        await azureProvider.initialize()
        return azureProvider

      default:
        throw new Error(`Unsupported storage provider type: ${(config as any).type}`)
    }
  }

  /**
   * Test storage provider connectivity
   */
  async testProvider(provider: IStorageProvider): Promise<boolean> {
    try {
      const status = await provider.getStatus()
      return status.healthy && status.primaryReady && status.semanticReady
    } catch (error) {
      return false
    }
  }

  /**
   * Get recommended provider for current environment
   */
  getRecommendedProviderType(): 'local' | 'azure' {
    const environment = this.detectEnvironment()

    if (environment.isAzure && environment.hasCosmosConnection) {
      return 'azure'
    }

    return 'local'
  }

  /**
   * Create provider with automatic retry and fallback
   */
  async createWithRetry(config: FactoryConfig = {}): Promise<IStorageProvider> {
    const maxRetries = 3
    const retryDelay = 1000 // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createProvider(config)
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Failed to create storage provider after ${maxRetries} attempts: ${(error as any).message}`)
        }

        if (config.debug) {
          logger.debug(`Storage provider creation attempt ${attempt} failed, retrying in ${retryDelay}ms:`, (error as any).message)
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    }

    throw new Error('Unexpected error in storage provider creation')
  }
}

/**
 * Convenience function to create a storage provider
 */
export async function createStorageProvider(config: FactoryConfig = {}): Promise<IStorageProvider> {
  const factory = StorageProviderFactory.getInstance()
  return factory.createProvider(config)
}

/**
 * Convenience function to detect environment
 */
export function detectEnvironment(): EnvironmentInfo {
  const factory = StorageProviderFactory.getInstance()
  return factory.detectEnvironment()
}

/**
 * Convenience function to get recommended provider type
 */
export function getRecommendedProviderType(): 'local' | 'azure' {
  const factory = StorageProviderFactory.getInstance()
  return factory.getRecommendedProviderType()
}