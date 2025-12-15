/**
 * Local Storage Provider
 *
 * Implements the storage provider interface using local file-based storage.
 * Uses KuzuStorageAdapter for primary storage (graph operations) and
 * DuckDBStorageAdapter for semantic storage (analytics and search).
 *
 * Note: KuzuStorageAdapter is dynamically imported to avoid loading the kuzu
 * native module when this provider is not used.
 */

import { DuckDBStorageAdapter } from '../adapters/DuckDBStorageAdapter'
import {
  IStorageProvider,
  StorageProviderConfig,
  StorageProviderStatus
} from './IStorageProvider'
import { PrimaryStorage } from '../interfaces/PrimaryStorage'
import { SemanticStorage } from '../interfaces/SemanticStorage'
import { GraphEntity } from '../types/GraphTypes'
import { Logger } from '../../utils/Logger'

const logger = Logger.createConsoleLogger('LocalStorageProvider')

// Type for dynamically imported KuzuStorageAdapter
type KuzuStorageAdapterType = typeof import('../adapters/KuzuStorageAdapter').KuzuStorageAdapter;
let KuzuStorageAdapterClass: KuzuStorageAdapterType | null = null;

/**
 * Lazily load the KuzuStorageAdapter to avoid loading kuzu native module at import time
 */
async function getKuzuStorageAdapter(): Promise<KuzuStorageAdapterType> {
  if (!KuzuStorageAdapterClass) {
    const module = await import('../adapters/KuzuStorageAdapter');
    KuzuStorageAdapterClass = module.KuzuStorageAdapter;
  }
  return KuzuStorageAdapterClass;
}

/**
 * Type guard to check if an entity has an id property
 */
function hasId(entity: unknown): entity is { id: string } & Record<string, unknown> {
  return (
    typeof entity === 'object' &&
    entity !== null &&
    'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id !== ''
  )
}

/**
 * Type guard to check if an object is an Error
 */
function isError(error: unknown): error is Error {
  return (
    error instanceof Error ||
    (typeof error === 'object' && error !== null && 'message' in error)
  )
}

/**
 * Type guard to check if storage adapter has a close method
 */
function hasCloseMethod(adapter: unknown): adapter is { close(): Promise<void> } {
  return (
    typeof adapter === 'object' &&
    adapter !== null &&
    'close' in adapter &&
    typeof (adapter as Record<string, unknown>).close === 'function'
  )
}

/**
 * Interface for view metadata
 */
interface ViewMetadata {
  name: string
  query: string
  createdAt: string
  lastRefreshed?: string
}

/**
 * Configuration for local storage provider
 */
export interface LocalStorageConfig extends StorageProviderConfig {
  type: 'local'
  primary: {
    database: string      // Path to Kuzu database
    readOnly?: boolean
  }
  semantic: {
    database: string      // Path to DuckDB database
    threads?: number
    memoryLimit?: string
  }
}

/**
 * Interface for enhanced Kuzu adapter with graph operations
 */
interface EnhancedKuzuAdapterInterface {
  addEntity(entity: any): Promise<void>;
  addRelationship(from: string, to: string, type: string, properties?: any): Promise<void>;
  getEntity(id: string): Promise<any | undefined>;
  getRelationships(entityId: string): Promise<any[]>;
  set(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
  keys(): AsyncIterable<string>;
  values(): AsyncIterable<any>;
  entries(): AsyncIterable<[string, any]>;
  getEdges(entityId: string): Promise<any[]>;
  close?(): Promise<void>;
}

/**
 * Factory function to create an enhanced Kuzu adapter with graph operations.
 * This dynamically creates a class that extends the lazily-loaded KuzuStorageAdapter.
 *
 * Note: KuzuStorageAdapter already implements traverse() and findConnected() with proper
 * graph query implementations. The base class provides graph functionality with its own
 * signature patterns. We add the additional PrimaryStorage optional methods here and provide
 * compatibility adapters for the different method signatures.
 */
async function createEnhancedKuzuAdapter(config: {
  type: 'kuzu';
  database: string;
  readOnly?: boolean;
  debug?: boolean;
}): Promise<EnhancedKuzuAdapterInterface> {
  const KuzuStorageAdapter = await getKuzuStorageAdapter();

  // Create the enhanced class dynamically
  class EnhancedKuzuAdapter extends KuzuStorageAdapter {
    /**
     * Add entity to graph storage
     * @param entity The entity to add (must have string id or one will be generated)
     */
    async addEntity(entity: any): Promise<void> {
      // Extract ID from entity or generate one
      const id = hasId(entity) ? entity.id : `entity_${crypto.randomUUID()}`

      // Convert entity to GraphEntity format expected by KuzuStorageAdapter
      const graphEntity: GraphEntity = {
        id,
        type: entity.type || 'Entity',
        properties: entity.properties || entity,
        metadata: {
          created: new Date(),
          updated: new Date()
        }
      }

      await this.set(id, graphEntity)
    }

    /**
     * Add relationship between entities
     */
    async addRelationship(from: string, to: string, type: string, properties?: any): Promise<void> {
      const relationshipId = `${from}_${type}_${to}`
      const relationship: GraphEntity = {
        id: relationshipId,
        type: 'Relationship',
        properties: {
          from,
          to,
          relationshipType: type,
          ...(properties || {}),
          createdAt: new Date().toISOString()
        },
        metadata: {
          created: new Date()
        }
      }

      await this.set(relationshipId, relationship)
    }

    /**
     * Get entity by ID
     */
    async getEntity(id: string): Promise<any | undefined> {
      return await this.get(id)
    }

    /**
     * Get relationships for an entity
     *
     * Uses Kuzu's native graph traversal for O(degree) complexity instead of O(n) full scan.
     * Returns all edges (relationships) connected to the entity, both incoming and outgoing.
     *
     * Performance: O(degree) where degree is the number of connected relationships
     * Previous: O(n) where n was total number of entities in storage
     */
    async getRelationships(entityId: string): Promise<any[]> {
      // Use Kuzu's native getEdges method which uses graph queries
      // This leverages the graph database's indexing and traversal capabilities
      const edges = await this.getEdges(entityId)
      return edges
    }
  }

  return new EnhancedKuzuAdapter(config);
}

/**
 * Enhanced DuckDBStorageAdapter with semantic operations
 *
 * Note: DuckDBStorageAdapter now fully implements SemanticStorage interface,
 * so this class only adds provider-specific extensions.
 */
class EnhancedDuckDBAdapter<T = any> extends DuckDBStorageAdapter<T> {
  // DuckDBStorageAdapter now implements SemanticStorage interface
  // No additional overrides needed
}

/**
 * Local Storage Provider Implementation
 */
export class LocalStorageProvider implements IStorageProvider {
  private primaryAdapter: EnhancedKuzuAdapterInterface | null = null
  private semanticAdapter: EnhancedDuckDBAdapter | null = null
  private config: LocalStorageConfig
  private initialized = false

  constructor(config: LocalStorageConfig) {
    this.config = config
  }

  /**
   * Get primary storage instance
   */
  get primary(): PrimaryStorage {
    if (!this.primaryAdapter) {
      throw new Error('LocalStorageProvider not initialized')
    }
    // EnhancedKuzuAdapter implements PrimaryStorage's required methods (from BatchStorage)
    // The optional graph methods (traverse, findConnected) have different signatures in the base class
    // but are compatible for the use cases they serve
    return this.primaryAdapter as unknown as PrimaryStorage
  }

  /**
   * Get semantic storage instance
   */
  get semantic(): SemanticStorage {
    if (!this.semanticAdapter) {
      throw new Error('LocalStorageProvider not initialized')
    }
    return this.semanticAdapter
  }

  /**
   * Initialize the storage provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Initialize primary storage (Kuzu) - uses dynamic import to avoid loading native module at import time
      this.primaryAdapter = await createEnhancedKuzuAdapter({
        type: 'kuzu',
        database: this.config.primary.database,
        readOnly: this.config.primary.readOnly || false,
        debug: this.config.debug || false
      })

      // Initialize semantic storage (DuckDB)
      this.semanticAdapter = new EnhancedDuckDBAdapter({
        type: 'duckdb',
        database: this.config.semantic.database,
        threads: this.config.semantic.threads,
        options: {
          max_memory: this.config.semantic.memoryLimit
        },
        debug: this.config.debug || false
      })

      this.initialized = true

      if (this.config.debug) {
        logger.debug('Local storage provider initialized', {
          primary: this.config.primary.database,
          semantic: this.config.semantic.database
        })
      }
    } catch (error) {
      const errorMessage = isError(error) ? error.message : String(error)
      throw new Error(`Failed to initialize local storage provider: ${errorMessage}`)
    }
  }

  /**
   * Close storage connections
   */
  async close(): Promise<void> {
    if (this.primaryAdapter && hasCloseMethod(this.primaryAdapter)) {
      await this.primaryAdapter.close()
      this.primaryAdapter = null
    }

    if (this.semanticAdapter && hasCloseMethod(this.semanticAdapter)) {
      await this.semanticAdapter.close()
      this.semanticAdapter = null
    }

    this.initialized = false

    if (this.config.debug) {
      logger.debug('Local storage provider closed')
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false
    }

    try {
      // Test primary storage
      await this.primary.size()

      // Test semantic storage
      await this.semantic.size()

      return true
    } catch (error) {
      if (this.config.debug) {
        const errorMessage = isError(error) ? error.message : String(error)
        logger.debug('Health check failed:', { error: errorMessage })
      }
      return false
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<StorageProviderStatus> {
    const healthy = await this.healthCheck()

    return {
      type: 'local',
      healthy,
      primaryReady: this.primaryAdapter !== null,
      semanticReady: this.semanticAdapter !== null,
      uptime: process.uptime()
    }
  }
}