/**
 * CosmosDB Storage Adapter Tests
 *
 * Comprehensive test suite for the CosmosDB storage adapter including
 * basic operations, batch operations, error handling, and configuration validation.
 *
 * @note Azure SDK Mocking Strategy
 * This test suite mocks the @azure/cosmos SDK to enable testing without a live Azure connection.
 * The mock includes:
 * - CosmosClient: Main client class for connecting to Azure Cosmos DB
 * - PartitionKeyKind: Enum defining partition key types (Hash, Range, MultiHash)
 *
 * TypeScript types/interfaces (Container, Database, ItemResponse, etc.) are imported for
 * type-checking only and do not require runtime mocking.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { CosmosDBStorageAdapter } from '../../../src/storage/adapters/CosmosDBStorageAdapter'
import { CosmosDBStorageConfig, StorageError, StorageErrorCode } from '../../../src/storage/interfaces/Storage'

// Mock Azure Cosmos SDK
// Note: We only mock runtime values (classes, enums, functions), not TypeScript types/interfaces
const mockContainer = {
  items: {
    upsert: vi.fn(),
    query: vi.fn(),
    createIfNotExists: vi.fn()
  },
  item: vi.fn()
}

const mockDatabase = {
  containers: {
    createIfNotExists: vi.fn().mockResolvedValue({ container: mockContainer })
  }
}

const mockClient = {
  databases: {
    createIfNotExists: vi.fn().mockResolvedValue({ database: mockDatabase })
  }
}

// Mock the entire @azure/cosmos module
vi.mock('@azure/cosmos', () => ({
  CosmosClient: vi.fn().mockImplementation(() => mockClient),
  PartitionKeyKind: {
    Hash: 'Hash',
    Range: 'Range',
    MultiHash: 'MultiHash'
  }
}))

describe('CosmosDBStorageAdapter', () => {
  let adapter: CosmosDBStorageAdapter<any>
  let mockConfig: CosmosDBStorageConfig

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Reset mock implementations
    mockClient.databases.createIfNotExists.mockResolvedValue({ database: mockDatabase })
    mockDatabase.containers.createIfNotExists.mockResolvedValue({ container: mockContainer })
    mockContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] })
    })
    mockContainer.item.mockReturnValue({
      read: vi.fn().mockRejectedValue({ code: 404 }),
      delete: vi.fn().mockResolvedValue({})
    })

    mockConfig = {
      type: 'cosmosdb',
      database: 'test-db',
      container: 'test-container',
      connectionString: 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=test-key;',
      debug: false
    }

    adapter = new CosmosDBStorageAdapter(mockConfig)
  })

  afterEach(async () => {
    try {
      await adapter.close()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  describe('Configuration Validation', () => {
    it('should reject config without database name', () => {
      expect(() => {
        new CosmosDBStorageAdapter({
          type: 'cosmosdb',
          container: 'test-container',
          connectionString: 'test-connection'
        } as CosmosDBStorageConfig)
      }).toThrow('Database name is required')
    })

    it('should reject config without container name', () => {
      expect(() => {
        new CosmosDBStorageAdapter({
          type: 'cosmosdb',
          database: 'test-db',
          connectionString: 'test-connection'
        } as CosmosDBStorageConfig)
      }).toThrow('Container name is required')
    })

    it('should reject config without connection info', () => {
      expect(() => {
        new CosmosDBStorageAdapter({
          type: 'cosmosdb',
          database: 'test-db',
          container: 'test-container'
        } as CosmosDBStorageConfig)
      }).toThrow('Either connectionString or both endpoint and key are required')
    })

    it('should accept valid endpoint + key config', () => {
      expect(() => {
        new CosmosDBStorageAdapter({
          type: 'cosmosdb',
          database: 'test-db',
          container: 'test-container',
          endpoint: 'https://test.documents.azure.com:443/',
          key: 'test-key'
        })
      }).not.toThrow()
    })

    it('should accept valid connection string config', () => {
      expect(() => {
        new CosmosDBStorageAdapter(mockConfig)
      }).not.toThrow()
    })
  })

  describe('Initialization', () => {
    beforeEach(() => {
      // Mock successful initialization
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] })
      })

      // Mock container.item() to return a mock item with read method
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockRejectedValue({ code: 404 })
      })
    })

    it('should initialize successfully with valid config', async () => {
      await expect(adapter.get('test-key')).resolves.toBeUndefined()

      expect(mockClient.databases.createIfNotExists).toHaveBeenCalledWith({
        id: 'test-db',
        throughput: undefined
      })

      expect(mockDatabase.containers.createIfNotExists).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-container',
          partitionKey: {
            paths: ['/entityType'],
            kind: 'Hash'
          }
        }),
        undefined
      )
    })

    it('should handle initialization errors gracefully', async () => {
      mockClient.databases.createIfNotExists.mockRejectedValue(new Error('Connection failed'))

      await expect(adapter.get('test-key')).rejects.toThrow('Failed to initialize CosmosDB adapter')
    })

    it('should only initialize once', async () => {
      // Reset mock call counts
      mockClient.databases.createIfNotExists.mockClear()
      mockDatabase.containers.createIfNotExists.mockClear()

      await adapter.get('test-key-1')
      await adapter.get('test-key-2')

      expect(mockClient.databases.createIfNotExists).toHaveBeenCalledTimes(1)
      expect(mockDatabase.containers.createIfNotExists).toHaveBeenCalledTimes(1)
    })
  })

  describe('Basic Operations', () => {
    beforeEach(async () => {
      // Setup successful initialization
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] })
      })

      // Mock container.item() to return a mock item with read method
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockRejectedValue({ code: 404 }),
        delete: vi.fn().mockResolvedValue({})
      })

      // Trigger initialization
      await adapter.size()
    })

    describe('get()', () => {
      it('should retrieve existing item', async () => {
        const testValue = { id: 'test', data: 'value' }

        mockContainer.item.mockReturnValue({
          read: vi.fn().mockResolvedValue({
            resource: {
              id: 'test-key',
              key: 'test-key',
              value: testValue,
              entityType: 'partition_0'
            }
          })
        })

        const result = await adapter.get('test-key')
        expect(result).toEqual(testValue)
      })

      it('should return undefined for non-existent item', async () => {
        mockContainer.item.mockReturnValue({
          read: vi.fn().mockRejectedValue({ code: 404 })
        })

        const result = await adapter.get('non-existent-key')
        expect(result).toBeUndefined()
      })

      it('should throw StorageError for other errors', async () => {
        mockContainer.item.mockReturnValue({
          read: vi.fn().mockRejectedValue(new Error('Network error'))
        })

        await expect(adapter.get('test-key')).rejects.toThrow(StorageError)
      })
    })

    describe('set()', () => {
      it('should store item successfully', async () => {
        const testValue = { id: 'test', data: 'value' }

        mockContainer.items.upsert.mockResolvedValue({})

        await adapter.set('test-key', testValue)

        expect(mockContainer.items.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-key',
            key: 'test-key',
            value: testValue,
            entityType: expect.stringMatching(/^partition_\d+$/)
          })
        )
      })

      it('should handle storage errors', async () => {
        mockContainer.items.upsert.mockRejectedValue(new Error('Write failed'))

        await expect(adapter.set('test-key', 'value')).rejects.toThrow(StorageError)
      })
    })

    describe('delete()', () => {
      it('should delete existing item', async () => {
        mockContainer.item.mockReturnValue({
          delete: vi.fn().mockResolvedValue({})
        })

        const result = await adapter.delete('test-key')
        expect(result).toBe(true)
      })

      it('should return false for non-existent item', async () => {
        mockContainer.item.mockReturnValue({
          delete: vi.fn().mockRejectedValue({ code: 404 })
        })

        const result = await adapter.delete('non-existent-key')
        expect(result).toBe(false)
      })

      it('should throw StorageError for other errors', async () => {
        mockContainer.item.mockReturnValue({
          delete: vi.fn().mockRejectedValue(new Error('Delete failed'))
        })

        await expect(adapter.delete('test-key')).rejects.toThrow(StorageError)
      })
    })

    describe('has()', () => {
      it('should return true for existing item', async () => {
        mockContainer.item.mockReturnValue({
          read: vi.fn().mockResolvedValue({
            resource: { value: 'test-value' }
          })
        })

        const result = await adapter.has('test-key')
        expect(result).toBe(true)
      })

      it('should return false for non-existent item', async () => {
        mockContainer.item.mockReturnValue({
          read: vi.fn().mockRejectedValue({ code: 404 })
        })

        const result = await adapter.has('non-existent-key')
        expect(result).toBe(false)
      })
    })

    describe('clear()', () => {
      it('should delete all items', async () => {
        const mockItems = [
          { id: 'item1', entityType: 'partition_0' },
          { id: 'item2', entityType: 'partition_1' }
        ]

        mockContainer.items.query.mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: mockItems })
        })

        const mockDelete = vi.fn().mockResolvedValue({})
        mockContainer.item.mockReturnValue({ delete: mockDelete })

        await adapter.clear()

        expect(mockDelete).toHaveBeenCalledTimes(2)
      })

      it('should handle clear errors gracefully', async () => {
        mockContainer.items.query.mockReturnValue({
          fetchAll: vi.fn().mockRejectedValue(new Error('Query failed'))
        })

        await expect(adapter.clear()).rejects.toThrow(StorageError)
      })
    })

    describe('size()', () => {
      it('should return correct count', async () => {
        mockContainer.items.query.mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [42] })
        })

        const result = await adapter.size()
        expect(result).toBe(42)
      })

      it('should return 0 for empty container', async () => {
        mockContainer.items.query.mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] })
        })

        const result = await adapter.size()
        expect(result).toBe(0)
      })
    })
  })

  describe('Iterator Operations', () => {
    beforeEach(async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] })
      })
      await adapter.size() // Initialize
    })

    describe('keys()', () => {
      it('should iterate over all keys', async () => {
        const mockKeys = [
          { key: 'key1' },
          { key: 'key2' },
          { key: 'key3' }
        ]

        mockContainer.items.query.mockReturnValue({
          fetchNext: vi.fn()
            .mockResolvedValueOnce({
              resources: mockKeys.slice(0, 2),
              continuationToken: 'token1'
            })
            .mockResolvedValueOnce({
              resources: mockKeys.slice(2),
              continuationToken: null
            })
        })

        const keys = []
        for await (const key of adapter.keys()) {
          keys.push(key)
        }

        expect(keys).toEqual(['key1', 'key2', 'key3'])
      })
    })

    describe('values()', () => {
      it('should iterate over all values', async () => {
        const mockValues = [
          { value: 'value1' },
          { value: 'value2' }
        ]

        mockContainer.items.query.mockReturnValue({
          fetchNext: vi.fn()
            .mockResolvedValueOnce({
              resources: mockValues,
              continuationToken: null
            })
        })

        const values = []
        for await (const value of adapter.values()) {
          values.push(value)
        }

        expect(values).toEqual(['value1', 'value2'])
      })
    })

    describe('entries()', () => {
      it('should iterate over all entries', async () => {
        const mockEntries = [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' }
        ]

        mockContainer.items.query.mockReturnValue({
          fetchNext: vi.fn()
            .mockResolvedValueOnce({
              resources: mockEntries,
              continuationToken: null
            })
        })

        const entries = []
        for await (const entry of adapter.entries()) {
          entries.push(entry)
        }

        expect(entries).toEqual([['key1', 'value1'], ['key2', 'value2']])
      })
    })
  })

  describe('Batch Operations', () => {
    beforeEach(async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] })
      })
      await adapter.size() // Initialize
    })

    describe('getMany()', () => {
      it('should retrieve multiple items', async () => {
        mockContainer.item
          .mockReturnValueOnce({
            read: vi.fn().mockResolvedValue({
              resource: { value: 'value1' }
            })
          })
          .mockReturnValueOnce({
            read: vi.fn().mockRejectedValue({ code: 404 })
          })
          .mockReturnValueOnce({
            read: vi.fn().mockResolvedValue({
              resource: { value: 'value3' }
            })
          })

        const result = await adapter.getMany(['key1', 'key2', 'key3'])

        expect(result.size).toBe(2)
        expect(result.get('key1')).toBe('value1')
        expect(result.get('key3')).toBe('value3')
        expect(result.has('key2')).toBe(false)
      })
    })

    describe('setMany()', () => {
      it('should store multiple items', async () => {
        mockContainer.items.upsert.mockResolvedValue({})

        const entries = new Map([
          ['key1', 'value1'],
          ['key2', 'value2']
        ])

        await adapter.setMany(entries)

        expect(mockContainer.items.upsert).toHaveBeenCalledTimes(2)
      })
    })

    describe('deleteMany()', () => {
      it('should delete multiple items', async () => {
        mockContainer.item
          .mockReturnValueOnce({
            delete: vi.fn().mockResolvedValue({})
          })
          .mockReturnValueOnce({
            delete: vi.fn().mockRejectedValue({ code: 404 })
          })

        const deletedCount = await adapter.deleteMany(['key1', 'key2'])

        expect(deletedCount).toBe(1)
      })
    })

    describe('batch()', () => {
      it('should execute batch operations', async () => {
        mockContainer.items.upsert.mockResolvedValue({})
        mockContainer.item.mockReturnValue({
          delete: vi.fn().mockResolvedValue({})
        })

        const operations = [
          { type: 'set' as const, key: 'key1', value: 'value1' },
          { type: 'delete' as const, key: 'key2' }
        ]

        const result = await adapter.batch(operations)

        expect(result.success).toBe(true)
        expect(result.operations).toBe(2)
        expect(result.errors).toEqual([])
      })

      it('should handle batch operation errors', async () => {
        mockContainer.items.upsert.mockRejectedValue(new Error('Write failed'))

        const operations = [
          { type: 'set' as const, key: 'key1', value: 'value1' }
        ]

        const result = await adapter.batch(operations)

        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should map CosmosDB errors to StorageErrors', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] })
      })
      await adapter.size() // Initialize

      mockContainer.item.mockReturnValue({
        read: vi.fn().mockRejectedValue(new Error('Network timeout'))
      })

      await expect(adapter.get('test-key')).rejects.toThrow(StorageError)
    })

    it('should handle connection failures during initialization', async () => {
      mockClient.databases.createIfNotExists.mockRejectedValue(new Error('Connection failed'))

      await expect(adapter.get('test-key')).rejects.toThrow(StorageError)
    })
  })

  describe('Configuration Options', () => {
    it('should handle throughput configuration', () => {
      const configWithThroughput: CosmosDBStorageConfig = {
        ...mockConfig,
        throughput: {
          type: 'manual',
          value: 400
        }
      }

      expect(() => new CosmosDBStorageAdapter(configWithThroughput)).not.toThrow()
    })

    it('should handle consistency level configuration', () => {
      const configWithConsistency: CosmosDBStorageConfig = {
        ...mockConfig,
        consistencyLevel: 'Strong'
      }

      expect(() => new CosmosDBStorageAdapter(configWithConsistency)).not.toThrow()
    })

    it('should handle partition key configuration', () => {
      const configWithPartitionKey: CosmosDBStorageConfig = {
        ...mockConfig,
        partitionKey: '/customPartition'
      }

      expect(() => new CosmosDBStorageAdapter(configWithPartitionKey)).not.toThrow()
    })
  })

  describe('Cleanup', () => {
    it('should close connections properly', async () => {
      // First ensure the adapter is initialized
      await adapter.size()

      // Close should not throw
      await expect(adapter.close()).resolves.not.toThrow()

      // Verify internal state is reset
      expect((adapter as any).client).toBeNull()
      expect((adapter as any).database).toBeNull()
      expect((adapter as any).container).toBeNull()
      expect((adapter as any).isLoaded).toBe(false)
    })
  })
})