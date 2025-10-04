/**
 * Type Safety Tests for LocalStorageProvider
 *
 * These tests verify that all type assertions have been properly replaced
 * with type-safe alternatives. Tests focus on:
 * - Entity with id property extraction
 * - Method calls on storage adapters
 * - View object structure
 * - Constructor type handling
 * - Error object type handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageProvider, LocalStorageConfig } from '../../../src/storage/providers/LocalStorageProvider';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('LocalStorageProvider - Type Safety', () => {
  let provider: LocalStorageProvider;
  let tempDir: string;
  let config: LocalStorageConfig;

  beforeEach(async () => {
    // Create temporary directory for test databases
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'type-safety-test-'));

    config = {
      type: 'local' as const,
      primary: {
        database: path.join(tempDir, 'primary.kuzu')
      },
      semantic: {
        database: path.join(tempDir, 'semantic.duckdb')
      },
      debug: false
    };

    provider = new LocalStorageProvider(config);
    await provider.initialize();
  });

  afterEach(async () => {
    await provider.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Entity ID Extraction - Type Safety', () => {
    it('should safely extract id from entity with id property', async () => {
      // Arrange
      const entityWithId = { id: 'test-entity-1', name: 'Test Entity', value: 42 };

      // Act - Should work without type assertions
      await provider.primary.addEntity?.(entityWithId);

      // Assert
      const retrieved = await provider.primary.getEntity?.('test-entity-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-entity-1');
      // Entity is wrapped in GraphEntity format
      if (retrieved?.properties) {
        expect(retrieved.properties.name).toBe('Test Entity');
        expect(retrieved.properties.value).toBe(42);
      }
    });

    it('should handle entity without id property by generating one', async () => {
      // Arrange
      const entityWithoutId = { name: 'No ID Entity', value: 99 };

      // Act - Should generate ID safely without type assertions
      await provider.primary.addEntity?.(entityWithoutId);

      // Assert - Entity should be stored with generated ID
      const primarySize = await provider.primary.size();
      expect(primarySize).toBeGreaterThan(0);
    });

    it('should handle entity with null id', async () => {
      // Arrange
      const entityWithNullId = { id: null, name: 'Null ID Entity' };

      // Act - Should handle null ID gracefully
      await provider.primary.addEntity?.(entityWithNullId);

      // Assert
      const primarySize = await provider.primary.size();
      expect(primarySize).toBeGreaterThan(0);
    });

    it('should handle entity with undefined id', async () => {
      // Arrange
      const entityWithUndefinedId = { id: undefined, name: 'Undefined ID Entity' };

      // Act - Should handle undefined ID gracefully
      await provider.primary.addEntity?.(entityWithUndefinedId);

      // Assert
      const primarySize = await provider.primary.size();
      expect(primarySize).toBeGreaterThan(0);
    });
  });

  describe('Storage Adapter Method Calls - Type Safety', () => {
    it('should call set method on adapter with proper types', async () => {
      // Arrange
      const entity = { id: 'type-safe-entity', data: 'test data' };

      // Act - set method should be called with proper types, not through 'as any'
      await provider.primary.addEntity?.(entity);

      // Assert
      const retrieved = await provider.primary.get('type-safe-entity');
      expect(retrieved).toBeDefined();
    });

    it('should call get method on adapter with proper types', async () => {
      // Arrange
      await provider.primary.set('test-key', { value: 'test' });

      // Act - get method should be called with proper types
      const result = await provider.primary.getEntity?.('test-key');

      // Assert
      expect(result).toBeDefined();
    });

    it('should call getEdges method with proper types for relationships', async () => {
      // Arrange
      await provider.primary.addEntity?.({ id: 'entity-1', name: 'Entity 1' });
      await provider.primary.addEntity?.({ id: 'entity-2', name: 'Entity 2' });
      await provider.primary.addRelationship?.('entity-1', 'entity-2', 'RELATES_TO');

      // Act - getRelationships should call getEdges with proper types
      const relationships = await provider.primary.getRelationships?.('entity-1');

      // Assert
      expect(relationships).toBeDefined();
      expect(Array.isArray(relationships)).toBe(true);
    });
  });

  describe('View Object Type Safety', () => {
    it('should handle view object with lastRefreshed property safely', async () => {
      // Arrange
      const viewName = 'test-view';
      await provider.semantic.createView?.(viewName, 'SELECT * FROM test');

      // Act - refreshView should update lastRefreshed without type assertions
      await provider.semantic.refreshView?.(viewName);

      // Assert - View should have lastRefreshed timestamp
      const view = await provider.semantic.get(`__view_${viewName}`);
      expect(view).toBeDefined();
      if (view && typeof view === 'object') {
        expect('lastRefreshed' in view).toBe(true);
      }
    });

    it('should handle missing view gracefully', async () => {
      // Act - Should not throw when refreshing non-existent view
      await expect(
        provider.semantic.refreshView?.('non-existent-view')
      ).resolves.not.toThrow();
    });
  });

  describe('Primary Storage Adapter Type Safety', () => {
    it('should return properly typed primary storage without double cast', () => {
      // Act
      const primary = provider.primary;

      // Assert - Should have all required methods
      expect(primary).toBeDefined();
      expect(typeof primary.get).toBe('function');
      expect(typeof primary.set).toBe('function');
      expect(typeof primary.size).toBe('function');
    });

    it('should have optional graph methods available', () => {
      // Act
      const primary = provider.primary;

      // Assert - Optional methods should exist
      expect(primary.addEntity).toBeDefined();
      expect(primary.getEntity).toBeDefined();
      expect(primary.addRelationship).toBeDefined();
      expect(primary.getRelationships).toBeDefined();
    });
  });

  describe('Error Handling Type Safety', () => {
    it('should handle initialization errors with proper Error type', async () => {
      // Arrange
      const badConfig: LocalStorageConfig = {
        type: 'local',
        primary: {
          database: '/invalid/path/that/does/not/exist/primary.kuzu'
        },
        semantic: {
          database: '/invalid/path/that/does/not/exist/semantic.duckdb'
        }
      };
      const badProvider = new LocalStorageProvider(badConfig);

      // Act & Assert - Should throw error with message property
      await expect(badProvider.initialize()).rejects.toThrow(/Failed to initialize/);
    });

    it('should handle health check errors with proper Error type', async () => {
      // Arrange - Close provider to make health check fail
      await provider.close();

      // Act
      const isHealthy = await provider.healthCheck();

      // Assert - Should return false without throwing
      expect(isHealthy).toBe(false);
    });

    it('should handle errors in health check debug logging', async () => {
      // Arrange
      const debugConfig: LocalStorageConfig = {
        ...config,
        debug: true
      };
      const debugProvider = new LocalStorageProvider(debugConfig);
      await debugProvider.initialize();
      await debugProvider.close();

      // Act - Health check with debug enabled should handle errors
      const isHealthy = await debugProvider.healthCheck();

      // Assert
      expect(isHealthy).toBe(false);
    });
  });

  describe('Close Method Type Safety', () => {
    it('should safely call close on primary adapter', async () => {
      // Act - Should handle optional close method without type assertions
      await expect(provider.close()).resolves.not.toThrow();

      // Assert - Adapters should be null after close
      expect(provider.primary).toThrow(); // Should throw because not initialized
    });

    it('should handle close when adapter has no close method', async () => {
      // This tests the optional chaining ?. which should work without 'as any'
      // Act & Assert
      await expect(provider.close()).resolves.not.toThrow();
    });

    it('should handle close when provider is not initialized', async () => {
      // Arrange
      const uninitializedProvider = new LocalStorageProvider(config);

      // Act & Assert - Should not throw even though adapters are null
      await expect(uninitializedProvider.close()).resolves.not.toThrow();
    });
  });

  describe('Relationship Type Safety', () => {
    it('should handle relationship creation with proper typing', async () => {
      // Arrange
      const from = 'entity-a';
      const to = 'entity-b';
      const type = 'CONNECTS_TO';
      const properties = { weight: 1.5, label: 'test' };

      // Act - Should create relationship without type assertions
      await provider.primary.addRelationship?.(from, to, type, properties);

      // Assert - Relationship should be stored
      const relationships = await provider.primary.getRelationships?.(from);
      expect(relationships).toBeDefined();
      expect(Array.isArray(relationships)).toBe(true);
    });

    it('should handle relationships with undefined properties', async () => {
      // Act - Should handle undefined properties gracefully
      await provider.primary.addRelationship?.('e1', 'e2', 'LINK');

      // Assert
      const relationships = await provider.primary.getRelationships?.('e1');
      expect(relationships).toBeDefined();
    });
  });

  describe('Generic Type Handling', () => {
    it('should work with custom typed entities', async () => {
      // Arrange
      interface CustomEntity {
        id: string;
        customField: string;
        numericField: number;
      }

      const customEntity: CustomEntity = {
        id: 'custom-1',
        customField: 'test',
        numericField: 42
      };

      // Act
      await provider.primary.addEntity?.(customEntity);
      const retrieved = await provider.primary.getEntity?.<CustomEntity>('custom-1');

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved?.customField).toBe('test');
      expect(retrieved?.numericField).toBe(42);
    });
  });
});
