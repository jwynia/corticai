/**
 * Test suite for Memory Storage Adapter
 * 
 * This test suite ensures the MemoryStorageAdapter properly implements
 * the Storage interface and provides fast in-memory operations for testing.
 */

import { MemoryStorageAdapter } from '../../../src/storage/adapters/MemoryStorageAdapter'
import { createMemoryStorage } from '../../../src/storage'
import { 
  registerStorageAdapter, 
  runStorageInterfaceTests, 
  runBatchStorageTests,
  BatchStorage
} from '../storage.interface.test'

// Register MemoryStorageAdapter with the test suite
registerStorageAdapter('memory', async (config) => {
  return new MemoryStorageAdapter(config)
})

// Register batch storage tests
registerStorageAdapter('memory-batch', async (config) => {
  return new MemoryStorageAdapter(config)
})

describe('MemoryStorageAdapter Implementation', () => {
  // Run comprehensive interface tests
  runStorageInterfaceTests('Memory', async (config) => {
    return new MemoryStorageAdapter(config)
  })
  
  // Run batch operation tests
  runBatchStorageTests('Memory', async () => {
    return new MemoryStorageAdapter() as BatchStorage<any>
  })
  
  describe('Memory-Specific Features', () => {
    let storage: MemoryStorageAdapter<any>
    
    beforeEach(() => {
      storage = new MemoryStorageAdapter()
    })
    
    it('should support debug configuration without errors', async () => {
      const debugStorage = new MemoryStorageAdapter({ debug: true, id: 'test-storage' })
      
      // Verify operations complete successfully with debug enabled
      await expect(debugStorage.set('test', 'value')).resolves.not.toThrow()
      await expect(debugStorage.get('test')).resolves.toBe('value')
      await expect(debugStorage.delete('test')).resolves.toBe(true)
      
      // Verify storage state is correct
      await expect(debugStorage.size()).resolves.toBe(0)
    })
    
    it('should handle deep cloning correctly', async () => {
      const originalObj = {
        nested: { value: 42 },
        array: [1, 2, { inner: 'test' }],
        date: new Date('2023-01-01'),
        regex: /pattern/g
      }
      
      await storage.set('clone-test', originalObj)
      const retrieved = await storage.get('clone-test')
      
      // Verify deep equality but different references
      expect(retrieved).toEqual(originalObj)
      expect(retrieved).not.toBe(originalObj)
      expect(retrieved.nested).not.toBe(originalObj.nested)
      expect(retrieved.array).not.toBe(originalObj.array)
      
      // Verify special object handling
      expect(retrieved.date).toBeInstanceOf(Date)
      expect(retrieved.date.getTime()).toBe(originalObj.date.getTime())
      expect(retrieved.regex).toBeInstanceOf(RegExp)
      expect(retrieved.regex.source).toBe(originalObj.regex.source)
      expect(retrieved.regex.flags).toBe(originalObj.regex.flags)
    })
    
    it('should provide proper isolation between instances', async () => {
      const storage1 = new MemoryStorageAdapter({ id: 'storage1' })
      const storage2 = new MemoryStorageAdapter({ id: 'storage2' })
      
      await storage1.set('key', 'value1')
      await storage2.set('key', 'value2')
      
      expect(await storage1.get('key')).toBe('value1')
      expect(await storage2.get('key')).toBe('value2')
      
      expect(await storage1.size()).toBe(1)
      expect(await storage2.size()).toBe(1)
    })
    
    it('should handle concurrent operations safely', async () => {
      // Concurrent sets
      const setPromises = Array.from({ length: 100 }, (_, i) => 
        storage.set(`concurrent-${i}`, `value-${i}`)
      )
      
      await Promise.all(setPromises)
      expect(await storage.size()).toBe(100)
      
      // Concurrent gets
      const getPromises = Array.from({ length: 100 }, (_, i) => 
        storage.get(`concurrent-${i}`)
      )
      
      const results = await Promise.all(getPromises)
      results.forEach((value, index) => {
        expect(value).toBe(`value-${index}`)
      })
    })
  })
  
  describe('Factory Function', () => {
    it('should create memory storage via factory', async () => {
      const storage = await createMemoryStorage({ debug: false, id: 'factory-test' })
      
      expect(storage).toBeInstanceOf(MemoryStorageAdapter)
      
      await storage.set('factory-key', 'factory-value')
      expect(await storage.get('factory-key')).toBe('factory-value')
    })
    
    it('should support typed storage via factory', async () => {
      interface TestData {
        id: string
        value: number
      }
      
      const typedStorage = await createMemoryStorage<TestData>()
      
      const testData: TestData = { id: 'test', value: 42 }
      await typedStorage.set('typed-key', testData)
      
      const retrieved = await typedStorage.get('typed-key')
      expect(retrieved).toEqual(testData)
    })
  })
});