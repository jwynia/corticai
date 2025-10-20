/**
 * KuzuSchemaManager Unit Tests
 *
 * Test-First Development for KuzuSchemaManager module
 * Tests database initialization, schema creation, and data loading
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Database, Connection } from 'kuzu'
import type { KuzuStorageConfig, GraphEntity } from '../../../src/storage/types/GraphTypes'

// Mock dependencies
const mockDb = {
  close: vi.fn().mockResolvedValue(undefined)
}

const mockConnection = {
  query: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined)
}

const mockLogger = {
  log: vi.fn(),
  logWarn: vi.fn()
}

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn()
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn()
}))

// Mock kuzu module
vi.mock('kuzu', () => ({
  Database: vi.fn().mockImplementation(() => mockDb),
  Connection: vi.fn().mockImplementation(() => mockConnection)
}))

import * as fs from 'fs'
import { Database, Connection } from 'kuzu'

describe('KuzuSchemaManager', () => {
  let config: KuzuStorageConfig

  beforeEach(() => {
    // Reset mock call counts but preserve implementations
    mockConnection.query.mockClear()
    mockConnection.close.mockClear()
    mockDb.close.mockClear()
    mockLogger.log.mockClear()
    mockLogger.logWarn.mockClear()
    vi.mocked(fs.existsSync).mockClear()
    vi.mocked(fs.mkdirSync).mockClear()

    // Re-setup mock implementations
    mockConnection.query.mockResolvedValue({})
    mockConnection.close.mockResolvedValue(undefined)
    mockDb.close.mockResolvedValue(undefined)

    config = {
      database: '/tmp/test-db',
      autoCreate: true,
      readOnly: false,
      bufferPoolSize: 64 * 1024 * 1024,
      debug: false
    }
  })

  describe('initialize', () => {
    it('should create database instance with correct path and buffer size', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      expect(Database).toHaveBeenCalledWith(
        '/tmp/test-db',
        64 * 1024 * 1024
      )
    })

    it('should create database directory if autoCreate is true and directory does not exist', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      vi.mocked(fs.existsSync).mockReturnValue(false)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      expect(fs.existsSync).toHaveBeenCalledWith('/tmp')
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true })
    })

    it('should not create directory if it already exists', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      vi.mocked(fs.existsSync).mockReturnValue(true)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })

    it('should not create directory if autoCreate is false', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      config.autoCreate = false

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      expect(fs.existsSync).not.toHaveBeenCalled()
      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })

    it('should create connection from database', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      expect(Connection).toHaveBeenCalledWith(mockDb)
    })

    it('should return database and connection objects', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const result = await manager.initialize()

      expect(result).toHaveProperty('db')
      expect(result).toHaveProperty('connection')
      expect(result.db).toBe(mockDb)
      expect(result.connection).toBe(mockConnection)
    })

    it('should log initialization when debug is true', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      config.debug = true

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Database and connection created')
      )
    })

    it('should throw error if database creation fails', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const dbError = new Error('Database creation failed')
      vi.mocked(Database).mockImplementationOnce(() => {
        throw dbError
      })

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await expect(manager.initialize()).rejects.toThrow('Failed to create Kuzu database')
    })
  })

  describe('createSchema', () => {
    it('should create Entity node table', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      mockConnection.query.mockResolvedValue({})

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()
      await manager.createSchema(connection)

      expect(mockConnection.query).toHaveBeenCalledWith(
        'CREATE NODE TABLE Entity(id STRING, type STRING, data STRING, PRIMARY KEY (id))'
      )
    })

    it('should create Relationship table', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      mockConnection.query.mockResolvedValue({})

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()
      await manager.createSchema(connection)

      expect(mockConnection.query).toHaveBeenCalledWith(
        'CREATE REL TABLE Relationship(FROM Entity TO Entity, type STRING, data STRING)'
      )
    })

    it('should handle "already exists" errors gracefully', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const alreadyExistsError = new Error('Table already exists')
      mockConnection.query.mockRejectedValueOnce(alreadyExistsError)
      mockConnection.query.mockResolvedValueOnce({}) // Second call succeeds

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()

      // Should not throw
      await expect(manager.createSchema(connection)).resolves.not.toThrow()
    })

    it('should handle "duplicate" errors gracefully', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const duplicateError = new Error('duplicate key')
      mockConnection.query.mockRejectedValueOnce(duplicateError)
      mockConnection.query.mockResolvedValueOnce({})

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()

      await expect(manager.createSchema(connection)).resolves.not.toThrow()
    })

    it('should throw error for other schema creation failures', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const schemaError = new Error('Invalid schema syntax')
      mockConnection.query.mockRejectedValue(schemaError)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()

      await expect(manager.createSchema(connection)).rejects.toThrow('Failed to create database schema')
    })

    it('should log schema creation when debug is true', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      config.debug = true
      mockConnection.query.mockResolvedValue({})

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()
      await manager.createSchema(connection)

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Database schema created')
      )
    })
  })

  describe('loadExistingData', () => {
    it('should query for existing entities', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      mockConnection.query.mockResolvedValue({})

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()
      await manager.loadExistingData(connection)

      expect(mockConnection.query).toHaveBeenCalledWith(
        'MATCH (e:Entity) RETURN e.id, e.type, e.data'
      )
    })

    it('should return empty map for new database', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      mockConnection.query.mockResolvedValue({})

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()
      const data = await manager.loadExistingData(connection)

      expect(data).toBeInstanceOf(Map)
      expect(data.size).toBe(0)
    })

    it('should handle query errors gracefully (empty database)', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const queryError = new Error('No data found')
      mockConnection.query.mockRejectedValue(queryError)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()

      // Should not throw for empty database
      await expect(manager.loadExistingData(connection)).resolves.not.toThrow()
    })

    it('should log warning when data loading fails', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      config.debug = true
      const queryError = new Error('Query failed')
      mockConnection.query.mockRejectedValue(queryError)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()
      await manager.loadExistingData(connection)

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Could not load existing data')
      )
    })

    it('should log data loading when debug is true', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      config.debug = true
      mockConnection.query.mockResolvedValue({})

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      const { connection } = await manager.initialize()
      await manager.loadExistingData(connection)

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Database query executed for loading existing data')
      )
    })
  })

  describe('close', () => {
    it('should close connection before database', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const closeOrder: string[] = []
      mockConnection.close.mockImplementation(async () => {
        closeOrder.push('connection')
      })
      mockDb.close.mockImplementation(async () => {
        closeOrder.push('database')
      })

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()
      await manager.close()

      expect(closeOrder).toEqual(['connection', 'database'])
    })

    it('should handle connection close errors gracefully', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const closeError = new Error('Connection close failed')
      mockConnection.close.mockRejectedValue(closeError)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      // Should not throw
      await expect(manager.close()).resolves.not.toThrow()
    })

    it('should handle database close errors gracefully', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const closeError = new Error('Database close failed')
      mockDb.close.mockRejectedValue(closeError)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      // Should not throw
      await expect(manager.close()).resolves.not.toThrow()
    })

    it('should log warning on close errors', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const closeError = new Error('Close failed')
      mockConnection.close.mockRejectedValue(closeError)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()
      await manager.close()

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Error closing database')
      )
    })

    it('should log close when debug is true', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      config.debug = true

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      await manager.initialize()

      // Clear mocks after initialization to isolate close() logging
      mockLogger.log.mockClear()

      await manager.close()

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Database connection closed')
      )
    })

    it('should handle close when not initialized', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      // Don't call initialize()

      // Should not throw
      await expect(manager.close()).resolves.not.toThrow()

      // Should not call close on null objects
      expect(mockConnection.close).not.toHaveBeenCalled()
      expect(mockDb.close).not.toHaveBeenCalled()
    })
  })

  describe('integration scenarios', () => {
    it('should handle full initialization lifecycle', async () => {
      const { KuzuSchemaManager } = await import('../../../src/storage/adapters/KuzuSchemaManager')

      mockConnection.query.mockResolvedValue({})
      mockConnection.close.mockResolvedValue(undefined)
      mockDb.close.mockResolvedValue(undefined)

      const manager = new KuzuSchemaManager({
        config,
        log: mockLogger.log,
        logWarn: mockLogger.logWarn
      })

      // Initialize
      const { db, connection } = await manager.initialize()
      expect(db).toBeDefined()
      expect(connection).toBeDefined()

      // Create schema
      await manager.createSchema(connection)
      expect(mockConnection.query).toHaveBeenCalledTimes(2) // Entity + Relationship

      // Load data
      const data = await manager.loadExistingData(connection)
      expect(data).toBeInstanceOf(Map)

      // Close
      await manager.close()
      expect(mockConnection.close).toHaveBeenCalled()
      expect(mockDb.close).toHaveBeenCalled()
    })
  })
})
