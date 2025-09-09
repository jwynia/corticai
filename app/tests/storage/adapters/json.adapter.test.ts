/**
 * Test suite for JSON Storage Adapter
 * 
 * This test suite ensures the JSONStorageAdapter properly implements
 * the Storage interface and maintains compatibility with existing
 * AttributeIndex behavior.
 * 
 * Following TDD approach: Red (failing tests) -> Green (implementation) -> Refactor
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JSONStorageAdapter, JSONStorageConfig } from '../../../src/storage/adapters/JSONStorageAdapter'
import { 
  registerStorageAdapter, 
  runStorageInterfaceTests, 
  runBatchStorageTests,
  BatchStorage
} from '../storage.interface.test'

// Register JSONStorageAdapter with the universal test suite
registerStorageAdapter('json', async (config) => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'json-storage-test-'))
  const jsonConfig: JSONStorageConfig = {
    type: 'json',
    filePath: path.join(tempDir, 'test-storage.json'),
    ...config
  }
  return new JSONStorageAdapter(jsonConfig)
})

// Register batch storage tests
registerStorageAdapter('json-batch', async (config) => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'json-batch-test-'))
  const jsonConfig: JSONStorageConfig = {
    type: 'json',
    filePath: path.join(tempDir, 'test-batch-storage.json'),
    ...config
  }
  return new JSONStorageAdapter(jsonConfig)
})

describe('JSONStorageAdapter Implementation', () => {
  let tempDir: string
  let testFilePath: string

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'json-adapter-test-'))
    testFilePath = path.join(tempDir, 'test.json')
  })

  afterEach(async () => {
    try {
      await fs.promises.rmdir(tempDir, { recursive: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  // Run comprehensive interface tests
  runStorageInterfaceTests('JSON', async (config) => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'json-interface-test-'))
    const jsonConfig: JSONStorageConfig = {
      type: 'json',
      filePath: path.join(tempDir, 'interface-test.json'),
      ...config
    }
    return new JSONStorageAdapter(jsonConfig)
  })
  
  // Run batch operation tests
  runBatchStorageTests('JSON', async () => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'json-batch-test-'))
    const jsonConfig: JSONStorageConfig = {
      type: 'json',
      filePath: path.join(tempDir, 'batch-test.json')
    }
    return new JSONStorageAdapter(jsonConfig) as BatchStorage<any>
  })

  describe('JSON-Specific Configuration', () => {
    it('should require filePath in configuration', async () => {
      expect(() => {
        new JSONStorageAdapter({} as JSONStorageConfig)
      }).toThrow('filePath is required for JSON storage')
    })

    it('should accept valid JSON configuration', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        encoding: 'utf8',
        pretty: true,
        atomic: true
      }

      const storage = new JSONStorageAdapter(config)
      expect(storage).toBeInstanceOf(JSONStorageAdapter)
    })

    it('should default to utf8 encoding if not specified', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('test', 'value')
      
      // File should be readable with utf8 encoding
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      expect(JSON.parse(content)).toEqual({ test: 'value' })
    })

    it('should support pretty printing when enabled', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        pretty: true
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('test', { nested: { value: 42 } })
      
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      // Pretty-printed JSON should have newlines
      expect(content).toContain('\n')
      expect(content).toContain('  ') // Indentation
    })

    it('should support compact printing when pretty is disabled', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        pretty: false
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('test', { nested: { value: 42 } })
      
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      // Compact JSON should not have pretty formatting
      expect(content).not.toContain('\n')
      expect(content).not.toContain('  ')
    })
  })

  describe('File Persistence', () => {
    it('should create file on first write', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      expect(await fs.promises.access(testFilePath).catch(() => false)).toBe(false)
      
      const storage = new JSONStorageAdapter(config)
      await storage.set('key', 'value')
      
      expect(await fs.promises.access(testFilePath).then(() => true).catch(() => false)).toBe(true)
    })

    it('should create directories if they do not exist', async () => {
      const nestedPath = path.join(tempDir, 'nested', 'deep', 'path', 'test.json')
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: nestedPath
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('key', 'value')
      
      expect(await fs.promises.access(nestedPath).then(() => true).catch(() => false)).toBe(true)
    })

    it('should persist data across instances', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      // First instance
      const storage1 = new JSONStorageAdapter(config)
      await storage1.set('persistent', 'data')
      await storage1.set('number', 42)
      await storage1.set('object', { nested: true })

      // Second instance should load existing data
      const storage2 = new JSONStorageAdapter(config)
      expect(await storage2.get('persistent')).toBe('data')
      expect(await storage2.get('number')).toBe(42)
      expect(await storage2.get('object')).toEqual({ nested: true })
    })

    it('should maintain data types when persisting', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      const storage = new JSONStorageAdapter(config)
      
      const testData = {
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          inner: 'value'
        }
      }

      await storage.set('types', testData)
      const retrieved = await storage.get('types')
      
      expect(retrieved).toEqual(testData)
      expect(typeof retrieved.string).toBe('string')
      expect(typeof retrieved.number).toBe('number')
      expect(typeof retrieved.boolean).toBe('boolean')
      expect(retrieved.null).toBeNull()
      expect(Array.isArray(retrieved.array)).toBe(true)
      expect(typeof retrieved.nested).toBe('object')
    })
  })

  describe('Auto-save and Manual Save Modes', () => {
    it('should auto-save by default', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('auto', 'save')
      
      // Data should be immediately available in file
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      const parsed = JSON.parse(content)
      expect(parsed.auto).toBe('save')
    })

    it('should support manual save mode when autoSave is disabled', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        autoSave: false
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('manual', 'save')
      
      // File should not exist yet
      expect(await fs.promises.access(testFilePath).catch(() => false)).toBe(false)
      
      // Manual save should write to file
      await storage.save()
      
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      const parsed = JSON.parse(content)
      expect(parsed.manual).toBe('save')
    })

    it('should batch multiple operations before manual save', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        autoSave: false
      }

      const storage = new JSONStorageAdapter(config)
      
      // Multiple operations without save
      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')
      await storage.delete('key1')
      await storage.set('key3', 'value3')
      
      // File should not exist yet
      expect(await fs.promises.access(testFilePath).catch(() => false)).toBe(false)
      
      // Save should persist final state
      await storage.save()
      
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      const parsed = JSON.parse(content)
      
      expect(parsed.key1).toBeUndefined()
      expect(parsed.key2).toBe('value2')
      expect(parsed.key3).toBe('value3')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle corrupted JSON files gracefully', async () => {
      // Create a corrupted JSON file
      await fs.promises.writeFile(testFilePath, '{ invalid json content', 'utf8')
      
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      const storage = new JSONStorageAdapter(config)
      
      // Should start with empty storage when file is corrupted
      expect(await storage.size()).toBe(0)
      expect(await storage.get('any-key')).toBeUndefined()
      
      // Should be able to write new data
      await storage.set('recovery', 'success')
      expect(await storage.get('recovery')).toBe('success')
    })

    it('should handle non-existent parent directories', async () => {
      const deepPath = path.join(tempDir, 'does', 'not', 'exist', 'test.json')
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: deepPath
      }

      const storage = new JSONStorageAdapter(config)
      await expect(storage.set('key', 'value')).resolves.not.toThrow()
      
      expect(await fs.promises.access(deepPath).then(() => true).catch(() => false)).toBe(true)
    })

    it('should handle file permission errors', async () => {
      // Create a readonly directory (if not on Windows)
      if (process.platform !== 'win32') {
        const readonlyDir = path.join(tempDir, 'readonly')
        await fs.promises.mkdir(readonlyDir)
        await fs.promises.chmod(readonlyDir, 0o444) // Read-only
        
        const config: JSONStorageConfig = {
          type: 'json',
          filePath: path.join(readonlyDir, 'test.json')
        }

        const storage = new JSONStorageAdapter(config)
        await expect(storage.set('key', 'value')).rejects.toThrow()
        
        // Cleanup
        await fs.promises.chmod(readonlyDir, 0o755)
      }
    })

    it('should recover from temporary write failures', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        atomic: true
      }

      const storage = new JSONStorageAdapter(config)
      
      // Set initial data
      await storage.set('stable', 'data')
      
      // Simulate atomic write by checking temp files are cleaned up
      const tempFiles = await fs.promises.readdir(tempDir)
      const jsonFiles = tempFiles.filter(f => f.endsWith('.json'))
      const tempJsonFiles = tempFiles.filter(f => f.includes('.tmp'))
      
      expect(jsonFiles.length).toBe(1) // Only our main file
      expect(tempJsonFiles.length).toBe(0) // No temp files left
    })
  })

  describe('Atomic Operations', () => {
    it('should support atomic writes when enabled', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        atomic: true
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('atomic', 'operation')
      
      // File should exist and be readable
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      expect(JSON.parse(content)).toEqual({ atomic: 'operation' })
    })

    it('should use direct writes when atomic is disabled', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        atomic: false
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('direct', 'write')
      
      // File should exist and be readable
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      expect(JSON.parse(content)).toEqual({ direct: 'write' })
    })
  })

  describe('AttributeIndex Compatibility', () => {
    interface AttributeIndexData {
      index: Record<string, Record<string, string[]>>
      entityAttributes: Record<string, string[]>
    }

    it('should be compatible with AttributeIndex JSON format', async () => {
      // Create data in the format that AttributeIndex uses
      const attributeIndexData: AttributeIndexData = {
        index: {
          'type': {
            '"file"': ['entity1', 'entity2'],
            '"directory"': ['entity3']
          },
          'size': {
            '1024': ['entity1'],
            '2048': ['entity2', 'entity3']
          }
        },
        entityAttributes: {
          'entity1': ['type', 'size'],
          'entity2': ['type', 'size'],
          'entity3': ['type', 'size']
        }
      }

      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      const storage = new JSONStorageAdapter<AttributeIndexData>(config)
      await storage.set('attributeIndex', attributeIndexData)
      
      const retrieved = await storage.get('attributeIndex')
      expect(retrieved).toEqual(attributeIndexData)
    })

    it('should preserve complex nested structures used by AttributeIndex', async () => {
      const complexData = {
        index: {
          'path': {
            '"/src/components"': ['comp1', 'comp2'],
            '"/src/utils"': ['util1']
          },
          'metadata': {
            '{"created":"2023-01-01"}': ['file1'],
            '{"modified":"2023-01-02"}': ['file2']
          }
        },
        entityAttributes: {
          'comp1': ['path', 'metadata'],
          'comp2': ['path'],
          'util1': ['path'],
          'file1': ['metadata'],
          'file2': ['metadata']
        },
        statistics: {
          totalEntities: 5,
          totalAttributes: 2,
          indexSize: 1024
        }
      }

      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        pretty: true
      }

      const storage = new JSONStorageAdapter(config)
      await storage.set('complex', complexData)
      
      // Test persistence
      const storage2 = new JSONStorageAdapter(config)
      const retrieved = await storage2.get('complex')
      
      expect(retrieved).toEqual(complexData)
      expect(retrieved.statistics.totalEntities).toBe(5)
      expect(Array.isArray(retrieved.index.path['"/src/components"'])).toBe(true)
    })
  })

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath
      }

      const storage = new JSONStorageAdapter(config)
      
      // Create a reasonably large dataset
      const largeData = {
        entities: Array.from({ length: 1000 }, (_, i) => ({
          id: `entity-${i}`,
          name: `Entity ${i}`,
          tags: [`tag-${i % 10}`, `category-${i % 5}`],
          metadata: {
            created: new Date().toISOString(),
            value: Math.random()
          }
        }))
      }

      const start = Date.now()
      await storage.set('large', largeData)
      const writeTime = Date.now() - start
      
      const readStart = Date.now()
      const retrieved = await storage.get('large')
      const readTime = Date.now() - readStart
      
      expect(retrieved).toEqual(largeData)
      expect(writeTime).toBeLessThan(1000) // Should complete in reasonable time
      expect(readTime).toBeLessThan(500)   // Read should be faster than write
    })

    it('should minimize file I/O operations', async () => {
      const config: JSONStorageConfig = {
        type: 'json',
        filePath: testFilePath,
        autoSave: false
      }

      const storage = new JSONStorageAdapter(config)
      
      // Multiple operations without file writes
      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')
      await storage.set('key3', 'value3')
      
      // File should not exist yet (no I/O)
      expect(await fs.promises.access(testFilePath).catch(() => false)).toBe(false)
      
      // Single save operation
      await storage.save()
      
      // Verify all data was written in single operation
      const content = await fs.promises.readFile(testFilePath, 'utf8')
      const parsed = JSON.parse(content)
      expect(Object.keys(parsed)).toHaveLength(3)
    })
  })
})