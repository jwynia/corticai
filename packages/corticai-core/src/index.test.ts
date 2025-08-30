import { describe, it, expect, beforeEach } from 'vitest';
import { CorticAI, VERSION, DependencyType } from './index.js';
import type { CorticAIConfig, Location, Dependency, Stats } from './types.js';

describe('CorticAI', () => {
  let corticai: CorticAI;

  beforeEach(() => {
    corticai = new CorticAI();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      await expect(corticai.init()).resolves.toBeUndefined();
    });

    it('should initialize with custom config', async () => {
      const config: CorticAIConfig = {
        databasePath: '/custom/path/db',
        debug: true,
        maxParallelParsers: 4,
        queryTimeout: 5000
      };
      
      await expect(corticai.init(config)).resolves.toBeUndefined();
      expect(corticai.getConfig()).toEqual(config);
    });

    it('should prevent double initialization', async () => {
      await corticai.init();
      await expect(corticai.init()).rejects.toThrow('CorticAI already initialized');
    });

    it('should store configuration correctly', async () => {
      const config: CorticAIConfig = {
        databasePath: '/test/db',
        debug: false
      };
      
      await corticai.init(config);
      const storedConfig = corticai.getConfig();
      expect(storedConfig).toEqual(config);
      expect(storedConfig).not.toBe(config); // Should be a copy
    });

    it('should handle empty config object', async () => {
      await expect(corticai.init({})).resolves.toBeUndefined();
      expect(corticai.getConfig()).toEqual({});
    });
  });

  describe('Shutdown', () => {
    it('should shutdown successfully when initialized', async () => {
      await corticai.init();
      await expect(corticai.shutdown()).resolves.toBeUndefined();
    });

    it('should throw error when shutting down without initialization', async () => {
      await expect(corticai.shutdown()).rejects.toThrow('CorticAI not initialized');
    });

    it('should allow re-initialization after shutdown', async () => {
      await corticai.init();
      await corticai.shutdown();
      await expect(corticai.init()).resolves.toBeUndefined();
    });
  });

  describe('File Indexing', () => {
    beforeEach(async () => {
      await corticai.init();
    });

    it('should throw not implemented error for indexFile', async () => {
      await expect(corticai.indexFile('/test/file.ts')).rejects.toThrow('Not implemented yet');
    });

    it('should throw error when indexFile called without initialization', async () => {
      const uninitializedCorticai = new CorticAI();
      await expect(uninitializedCorticai.indexFile('/test/file.ts'))
        .rejects.toThrow('CorticAI not initialized');
    });

    it('should throw not implemented error for indexDirectory', async () => {
      await expect(corticai.indexDirectory('/test/dir')).rejects.toThrow('Not implemented yet');
    });

    it('should throw not implemented error for indexDirectory with pattern', async () => {
      await expect(corticai.indexDirectory('/test/dir', '**/*.ts'))
        .rejects.toThrow('Not implemented yet');
    });

    it('should throw error when indexDirectory called without initialization', async () => {
      const uninitializedCorticai = new CorticAI();
      await expect(uninitializedCorticai.indexDirectory('/test/dir'))
        .rejects.toThrow('CorticAI not initialized');
    });
  });

  describe('Symbol Operations', () => {
    beforeEach(async () => {
      await corticai.init();
    });

    it('should throw not implemented error for findDefinition', async () => {
      await expect(corticai.findDefinition('mySymbol')).rejects.toThrow('Not implemented yet');
    });

    it('should throw error when findDefinition called without initialization', async () => {
      const uninitializedCorticai = new CorticAI();
      await expect(uninitializedCorticai.findDefinition('mySymbol'))
        .rejects.toThrow('CorticAI not initialized');
    });

    it('should throw not implemented error for findReferences', async () => {
      await expect(corticai.findReferences('mySymbol')).rejects.toThrow('Not implemented yet');
    });

    it('should throw error when findReferences called without initialization', async () => {
      const uninitializedCorticai = new CorticAI();
      await expect(uninitializedCorticai.findReferences('mySymbol'))
        .rejects.toThrow('CorticAI not initialized');
    });
  });

  describe('Dependencies', () => {
    beforeEach(async () => {
      await corticai.init();
    });

    it('should throw not implemented error for getDependencies', async () => {
      await expect(corticai.getDependencies('/test/file.ts'))
        .rejects.toThrow('Not implemented yet');
    });

    it('should throw error when getDependencies called without initialization', async () => {
      const uninitializedCorticai = new CorticAI();
      await expect(uninitializedCorticai.getDependencies('/test/file.ts'))
        .rejects.toThrow('CorticAI not initialized');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await corticai.init();
    });

    it('should throw not implemented error for getStats', async () => {
      await expect(corticai.getStats()).rejects.toThrow('Not implemented yet');
    });

    it('should throw error when getStats called without initialization', async () => {
      const uninitializedCorticai = new CorticAI();
      await expect(uninitializedCorticai.getStats())
        .rejects.toThrow('CorticAI not initialized');
    });
  });

  describe('Exports', () => {
    it('should export VERSION constant', () => {
      expect(VERSION).toBe('0.1.0');
    });

    it('should export DependencyType enum', () => {
      expect(DependencyType.Import).toBe('import');
      expect(DependencyType.Require).toBe('require');
      expect(DependencyType.DynamicImport).toBe('dynamic-import');
      expect(DependencyType.TypeImport).toBe('type-import');
    });

    it('should export CorticAI as default', async () => {
      const module = await import('./index.js');
      expect(module.default).toBe(CorticAI);
    });
  });

  describe('Type Definitions', () => {
    it('should accept valid Location objects', () => {
      const location: Location = {
        filePath: '/test/file.ts',
        line: 10,
        column: 5,
        endLine: 12,
        endColumn: 20
      };
      expect(location).toBeDefined();
    });

    it('should accept valid Dependency objects', () => {
      const dependency: Dependency = {
        source: '/src/index.ts',
        target: '/src/utils.ts',
        type: DependencyType.Import,
        imports: ['helper', 'utility']
      };
      expect(dependency).toBeDefined();
    });

    it('should accept valid Stats objects', () => {
      const stats: Stats = {
        filesIndexed: 100,
        totalNodes: 500,
        totalEdges: 1200,
        lastIndexed: new Date(),
        databaseSize: 1024000
      };
      expect(stats).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      const uninitializedCorticai = new CorticAI();
      
      try {
        await uninitializedCorticai.indexFile('/test.ts');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('CorticAI not initialized');
      }
    });

    it('should handle initialization state correctly', async () => {
      // Should start uninitialized
      await expect(corticai.shutdown()).rejects.toThrow();
      
      // After init, operations should not throw initialization errors
      await corticai.init();
      // These should throw "Not implemented" instead of "not initialized"
      await expect(corticai.indexFile('/test.ts')).rejects.toThrow('Not implemented');
      
      // After shutdown, should be uninitialized again
      await corticai.shutdown();
      await expect(corticai.indexFile('/test.ts')).rejects.toThrow('not initialized');
    });
  });

  describe('Configuration Management', () => {
    it('should return empty config before initialization', () => {
      expect(corticai.getConfig()).toEqual({});
    });

    it('should not allow external modification of config', async () => {
      const config: CorticAIConfig = { debug: true };
      await corticai.init(config);
      
      const retrievedConfig = corticai.getConfig();
      retrievedConfig.debug = false;
      
      // Original config should remain unchanged
      expect(corticai.getConfig().debug).toBe(true);
    });

    it('should preserve all config properties', async () => {
      const config: CorticAIConfig = {
        databasePath: '/db/path',
        debug: true,
        maxParallelParsers: 8,
        queryTimeout: 10000
      };
      
      await corticai.init(config);
      const retrievedConfig = corticai.getConfig();
      
      expect(retrievedConfig.databasePath).toBe('/db/path');
      expect(retrievedConfig.debug).toBe(true);
      expect(retrievedConfig.maxParallelParsers).toBe(8);
      expect(retrievedConfig.queryTimeout).toBe(10000);
    });
  });
});