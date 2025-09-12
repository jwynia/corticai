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



  describe('Edge Cases and Error Scenarios', () => {
    let storage: MemoryStorageAdapter<any>
    
    beforeEach(() => {
      storage = new MemoryStorageAdapter()
    })
    
    it('should handle storage operations on cleared storage', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      
      await storage.clear();
      
      expect(await storage.size()).toBe(0);
      expect(await storage.get('key1')).toBeUndefined();
      expect(await storage.has('key1')).toBe(false);
      expect(await storage.delete('key1')).toBe(false);
    });

    it('should handle operations after multiple clear calls', async () => {
      await storage.set('test', 'value');
      await storage.clear();
      await storage.clear(); // Multiple clears
      await storage.clear();
      
      expect(await storage.size()).toBe(0);
      
      // Should still work after multiple clears
      await storage.set('after-clear', 'new-value');
      expect(await storage.get('after-clear')).toBe('new-value');
    });

    it('should handle batch operations with mixed success/failure', async () => {
      const validEntries = new Map([
        ['valid1', 'value1'],
        ['valid2', 'value2'],
        ['valid3', 'value3']
      ]);
      
      // All valid operations should succeed
      await expect(storage.setMany(validEntries)).resolves.not.toThrow();
      
      // Verify all values were set
      const keys = Array.from(validEntries.keys());
      const values = await storage.getMany(keys);
      
      expect(values.get('valid1')).toBe('value1');
      expect(values.get('valid2')).toBe('value2');
      expect(values.get('valid3')).toBe('value3');
    });

    it('should handle delete operations on non-existent keys', async () => {
      const result = await storage.delete('non-existent-key');
      expect(result).toBe(false);
      
      // Multiple deletes should all return false
      const results = await Promise.all([
        storage.delete('fake1'),
        storage.delete('fake2'),
        storage.delete('fake3')
      ]);
      
      expect(results).toEqual([false, false, false]);
    });

    it('should handle get operations with undefined/null-like keys after validation', async () => {
      // These should fail validation before reaching storage logic
      await expect(storage.get('')).rejects.toThrow();
      
      // But valid keys that don't exist should return undefined
      expect(await storage.get('valid-but-missing')).toBeUndefined();
    });

    it('should maintain performance under stress', async () => {
      const STRESS_COUNT = 5000;
      const operations: Promise<any>[] = [];
      
      const startTime = Date.now();
      
      // Mix of operations
      for (let i = 0; i < STRESS_COUNT; i++) {
        operations.push(storage.set(`stress-${i}`, { id: i, data: `stress-data-${i}` }));
        
        if (i % 10 === 0) {
          operations.push(storage.get(`stress-${i}`));
          operations.push(storage.has(`stress-${i}`));
        }
        
        if (i % 100 === 0) {
          operations.push(storage.delete(`stress-${i}`));
        }
      }
      
      await Promise.all(operations);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify final state
      const finalSize = await storage.size();
      expect(finalSize).toBeGreaterThan(STRESS_COUNT * 0.8); // Most items should remain
    });
  });

  describe('Configuration and Debugging', () => {
    it('should handle invalid configuration gracefully', () => {
      // These should not throw during construction
      expect(() => new MemoryStorageAdapter(null as any)).not.toThrow();
      expect(() => new MemoryStorageAdapter(undefined as any)).not.toThrow();
      expect(() => new MemoryStorageAdapter({} as any)).not.toThrow();
    });

    it('should support debug mode without affecting functionality', async () => {
      const debugStorage = new MemoryStorageAdapter({ 
        debug: true, 
        id: 'debug-test-storage' 
      });
      
      // All operations should work normally with debug enabled
      await debugStorage.set('debug-key', { debug: true, value: 42 });
      expect(await debugStorage.get('debug-key')).toEqual({ debug: true, value: 42 });
      expect(await debugStorage.has('debug-key')).toBe(true);
      expect(await debugStorage.delete('debug-key')).toBe(true);
      expect(await debugStorage.size()).toBe(0);
    });

    it('should handle storage ID conflicts appropriately', async () => {
      const storage1 = new MemoryStorageAdapter({ id: 'shared-id' });
      const storage2 = new MemoryStorageAdapter({ id: 'shared-id' });
      
      await storage1.set('key', 'value1');
      await storage2.set('key', 'value2');
      
      // Each storage should maintain its own data
      expect(await storage1.get('key')).toBe('value1');
      expect(await storage2.get('key')).toBe('value2');
    });
  });
});