import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AttributeIndex } from '../../src/indexes/AttributeIndex';
import type { Entity } from '../../src/types/entity';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test suite for AttributeIndex
 * Tests written BEFORE implementation following TDD principles
 */
describe('AttributeIndex', () => {
  let index: AttributeIndex;
  const testDataPath = path.join(__dirname, 'test-index.json');

  beforeEach(() => {
    // Create a fresh index for each test
    index = new AttributeIndex();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  describe('Basic Operations', () => {
    describe('addAttribute', () => {
      it('should add a single attribute to an entity', () => {
        index.addAttribute('entity1', 'type', 'function');
        
        const results = index.findByAttribute('type', 'function');
        expect(results).toEqual(new Set(['entity1']));
      });

      it('should add multiple attributes to the same entity', () => {
        index.addAttribute('entity1', 'type', 'function');
        index.addAttribute('entity1', 'language', 'typescript');
        
        const typeResults = index.findByAttribute('type', 'function');
        const langResults = index.findByAttribute('language', 'typescript');
        
        expect(typeResults).toEqual(new Set(['entity1']));
        expect(langResults).toEqual(new Set(['entity1']));
      });

      it('should add the same attribute to multiple entities', () => {
        index.addAttribute('entity1', 'type', 'function');
        index.addAttribute('entity2', 'type', 'function');
        index.addAttribute('entity3', 'type', 'function');
        
        const results = index.findByAttribute('type', 'function');
        expect(results).toEqual(new Set(['entity1', 'entity2', 'entity3']));
      });

      it('should handle different values for the same attribute', () => {
        index.addAttribute('entity1', 'type', 'function');
        index.addAttribute('entity2', 'type', 'class');
        index.addAttribute('entity3', 'type', 'function');
        
        const functionResults = index.findByAttribute('type', 'function');
        const classResults = index.findByAttribute('type', 'class');
        
        expect(functionResults).toEqual(new Set(['entity1', 'entity3']));
        expect(classResults).toEqual(new Set(['entity2']));
      });

      it('should handle numeric and boolean values', () => {
        index.addAttribute('entity1', 'size', 100);
        index.addAttribute('entity2', 'size', 200);
        index.addAttribute('entity3', 'isPublic', true);
        index.addAttribute('entity4', 'isPublic', false);
        
        expect(index.findByAttribute('size', 100)).toEqual(new Set(['entity1']));
        expect(index.findByAttribute('size', 200)).toEqual(new Set(['entity2']));
        expect(index.findByAttribute('isPublic', true)).toEqual(new Set(['entity3']));
        expect(index.findByAttribute('isPublic', false)).toEqual(new Set(['entity4']));
      });

      it('should handle null and undefined values appropriately', () => {
        index.addAttribute('entity1', 'optional', null);
        index.addAttribute('entity2', 'optional', undefined);
        
        expect(index.findByAttribute('optional', null)).toEqual(new Set(['entity1']));
        expect(index.findByAttribute('optional', undefined)).toEqual(new Set(['entity2']));
      });
    });

    describe('removeAttribute', () => {
      it('should remove a specific attribute from an entity', () => {
        index.addAttribute('entity1', 'type', 'function');
        index.addAttribute('entity1', 'language', 'typescript');
        
        index.removeAttribute('entity1', 'type');
        
        const typeResults = index.findByAttribute('type', 'function');
        const langResults = index.findByAttribute('language', 'typescript');
        
        expect(typeResults).toEqual(new Set());
        expect(langResults).toEqual(new Set(['entity1']));
      });

      it('should not affect other entities with the same attribute', () => {
        index.addAttribute('entity1', 'type', 'function');
        index.addAttribute('entity2', 'type', 'function');
        
        index.removeAttribute('entity1', 'type');
        
        const results = index.findByAttribute('type', 'function');
        expect(results).toEqual(new Set(['entity2']));
      });

      it('should handle removing non-existent attributes gracefully', () => {
        expect(() => {
          index.removeAttribute('entity1', 'nonexistent');
        }).not.toThrow();
      });

      it('should clean up empty value sets', () => {
        index.addAttribute('entity1', 'type', 'unique');
        index.removeAttribute('entity1', 'type');
        
        // Internal check - the attribute should be cleaned up
        const results = index.findByAttribute('type');
        expect(results).toEqual(new Set());
      });
    });

    describe('removeEntity', () => {
      it('should remove all attributes for an entity', () => {
        index.addAttribute('entity1', 'type', 'function');
        index.addAttribute('entity1', 'language', 'typescript');
        index.addAttribute('entity1', 'size', 100);
        
        index.removeEntity('entity1');
        
        expect(index.findByAttribute('type', 'function')).toEqual(new Set());
        expect(index.findByAttribute('language', 'typescript')).toEqual(new Set());
        expect(index.findByAttribute('size', 100)).toEqual(new Set());
      });

      it('should not affect other entities', () => {
        index.addAttribute('entity1', 'type', 'function');
        index.addAttribute('entity2', 'type', 'function');
        
        index.removeEntity('entity1');
        
        expect(index.findByAttribute('type', 'function')).toEqual(new Set(['entity2']));
      });
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      // Set up test data
      index.addAttribute('file1', 'type', 'module');
      index.addAttribute('file1', 'language', 'typescript');
      index.addAttribute('file1', 'size', 1000);
      
      index.addAttribute('file2', 'type', 'module');
      index.addAttribute('file2', 'language', 'javascript');
      index.addAttribute('file2', 'size', 500);
      
      index.addAttribute('file3', 'type', 'test');
      index.addAttribute('file3', 'language', 'typescript');
      index.addAttribute('file3', 'size', 1500);
    });

    describe('findByAttribute', () => {
      it('should find entities by attribute and value', () => {
        const results = index.findByAttribute('type', 'module');
        expect(results).toEqual(new Set(['file1', 'file2']));
      });

      it('should find entities by attribute existence (no value)', () => {
        const results = index.findByAttribute('language');
        expect(results).toEqual(new Set(['file1', 'file2', 'file3']));
      });

      it('should return empty set for non-existent attribute', () => {
        const results = index.findByAttribute('nonexistent');
        expect(results).toEqual(new Set());
      });

      it('should return empty set for non-existent value', () => {
        const results = index.findByAttribute('type', 'nonexistent');
        expect(results).toEqual(new Set());
      });
    });

    describe('findByAttributes (Complex Queries)', () => {
      it('should support AND queries', () => {
        const results = index.findByAttributes([
          { attribute: 'type', value: 'module', operator: 'equals' },
          { attribute: 'language', value: 'typescript', operator: 'equals' }
        ], 'AND');
        
        expect(results).toEqual(new Set(['file1']));
      });

      it('should support OR queries', () => {
        const results = index.findByAttributes([
          { attribute: 'type', value: 'test', operator: 'equals' },
          { attribute: 'language', value: 'javascript', operator: 'equals' }
        ], 'OR');
        
        expect(results).toEqual(new Set(['file2', 'file3']));
      });

      it('should support EXISTS operator', () => {
        index.addAttribute('file4', 'optional', 'value');
        
        const results = index.findByAttributes([
          { attribute: 'optional', operator: 'exists' }
        ]);
        
        expect(results).toEqual(new Set(['file4']));
      });

      it('should support CONTAINS operator for string values', () => {
        index.addAttribute('doc1', 'content', 'hello world');
        index.addAttribute('doc2', 'content', 'goodbye world');
        index.addAttribute('doc3', 'content', 'hello universe');
        
        const results = index.findByAttributes([
          { attribute: 'content', value: 'world', operator: 'contains' }
        ]);
        
        expect(results).toEqual(new Set(['doc1', 'doc2']));
      });

      it('should support STARTS_WITH operator', () => {
        index.addAttribute('item1', 'name', 'test_file.ts');
        index.addAttribute('item2', 'name', 'test_module.ts');
        index.addAttribute('item3', 'name', 'main_file.ts');
        
        const results = index.findByAttributes([
          { attribute: 'name', value: 'test_', operator: 'startsWith' }
        ]);
        
        expect(results).toEqual(new Set(['item1', 'item2']));
      });

      it('should handle complex mixed queries', () => {
        const results = index.findByAttributes([
          { attribute: 'language', value: 'typescript', operator: 'equals' },
          { attribute: 'size', value: 1000, operator: 'equals' }
        ], 'OR');
        
        expect(results).toEqual(new Set(['file1', 'file3']));
      });

      it('should return empty set for impossible AND queries', () => {
        const results = index.findByAttributes([
          { attribute: 'type', value: 'module', operator: 'equals' },
          { attribute: 'type', value: 'test', operator: 'equals' }
        ], 'AND');
        
        expect(results).toEqual(new Set());
      });
    });
  });

  describe('Persistence', () => {
    it('should save index to JSON file', async () => {
      index.addAttribute('entity1', 'type', 'function');
      index.addAttribute('entity2', 'type', 'class');
      index.addAttribute('entity1', 'language', 'typescript');
      
      await index.save(testDataPath);
      
      expect(fs.existsSync(testDataPath)).toBe(true);
    });

    it('should load index from JSON file', async () => {
      index.addAttribute('entity1', 'type', 'function');
      index.addAttribute('entity2', 'type', 'class');
      index.addAttribute('entity1', 'language', 'typescript');
      
      await index.save(testDataPath);
      
      const newIndex = new AttributeIndex();
      await newIndex.load(testDataPath);
      
      expect(newIndex.findByAttribute('type', 'function')).toEqual(new Set(['entity1']));
      expect(newIndex.findByAttribute('type', 'class')).toEqual(new Set(['entity2']));
      expect(newIndex.findByAttribute('language', 'typescript')).toEqual(new Set(['entity1']));
    });

    it('should handle loading non-existent file gracefully', async () => {
      const newIndex = new AttributeIndex();
      
      await expect(newIndex.load('/nonexistent/file.json')).rejects.toThrow();
    });

    it('should handle saving to invalid path gracefully', async () => {
      await expect(index.save('/invalid/path/file.json')).rejects.toThrow();
    });

    it('should preserve all data types through save/load cycle', async () => {
      index.addAttribute('entity1', 'string', 'value');
      index.addAttribute('entity2', 'number', 42);
      index.addAttribute('entity3', 'boolean', true);
      index.addAttribute('entity4', 'null', null);
      index.addAttribute('entity5', 'array', [1, 2, 3]);
      index.addAttribute('entity6', 'object', { key: 'value' });
      
      await index.save(testDataPath);
      
      const newIndex = new AttributeIndex();
      await newIndex.load(testDataPath);
      
      expect(newIndex.findByAttribute('string', 'value')).toEqual(new Set(['entity1']));
      expect(newIndex.findByAttribute('number', 42)).toEqual(new Set(['entity2']));
      expect(newIndex.findByAttribute('boolean', true)).toEqual(new Set(['entity3']));
      expect(newIndex.findByAttribute('null', null)).toEqual(new Set(['entity4']));
      expect(newIndex.findByAttribute('array', [1, 2, 3])).toEqual(new Set(['entity5']));
      expect(newIndex.findByAttribute('object', { key: 'value' })).toEqual(new Set(['entity6']));
    });
  });

  describe('Performance', () => {
    it('should handle 10,000 entities efficiently', () => {
      const startTime = Date.now();
      
      // Add 10,000 entities with various attributes
      for (let i = 0; i < 10000; i++) {
        index.addAttribute(`entity${i}`, 'type', i % 10); // 10 different types
        index.addAttribute(`entity${i}`, 'category', i % 100); // 100 categories
        index.addAttribute(`entity${i}`, 'size', i);
      }
      
      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Query performance test
      const queryStart = Date.now();
      const results = index.findByAttribute('type', 5);
      const queryTime = Date.now() - queryStart;
      
      expect(queryTime).toBeLessThan(10); // Query should complete in under 10ms
      expect(results.size).toBe(1000); // Should find 1000 entities with type=5
    });

    it('should handle complex queries on large datasets efficiently', () => {
      // Add 1000 entities
      for (let i = 0; i < 1000; i++) {
        index.addAttribute(`entity${i}`, 'type', i % 5);
        index.addAttribute(`entity${i}`, 'status', i % 3);
        index.addAttribute(`entity${i}`, 'priority', i % 7);  // Changed to 7 to avoid modulo conflicts
      }
      
      const startTime = Date.now();
      const results = index.findByAttributes([
        { attribute: 'type', value: 2, operator: 'equals' },
        { attribute: 'status', value: 1, operator: 'equals' },
        { attribute: 'priority', value: 5, operator: 'equals' }
      ], 'AND');
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(10); // Complex query under 10ms
      expect(results.size).toBeGreaterThan(0);
    });

    it('should maintain memory efficiency with large datasets', () => {
      // This is a simple check - in production we'd use actual memory profiling
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Add 10,000 entities
      for (let i = 0; i < 10000; i++) {
        index.addAttribute(`entity${i}`, 'data', `value${i}`);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB
      
      expect(memoryIncrease).toBeLessThan(100); // Should use less than 100MB
    });
  });

  describe('Integration with Entity Type', () => {
    it('should index entities from UniversalFallbackAdapter', () => {
      const entities: Entity[] = [
        {
          id: 'doc1',
          type: 'document',
          name: 'README.md',
          content: 'Project documentation',
          metadata: { format: 'markdown', filename: 'README.md' }
        },
        {
          id: 'sec1',
          type: 'section',
          name: 'Installation',
          content: 'How to install',
          metadata: { level: 2 }
        }
      ];
      
      // Index entities by their properties
      entities.forEach(entity => {
        index.addAttribute(entity.id, 'type', entity.type);
        index.addAttribute(entity.id, 'name', entity.name);
        if (entity.metadata?.format) {
          index.addAttribute(entity.id, 'format', entity.metadata.format);
        }
        if (entity.metadata?.level) {
          index.addAttribute(entity.id, 'level', entity.metadata.level);
        }
      });
      
      expect(index.findByAttribute('type', 'document')).toEqual(new Set(['doc1']));
      expect(index.findByAttribute('type', 'section')).toEqual(new Set(['sec1']));
      expect(index.findByAttribute('format', 'markdown')).toEqual(new Set(['doc1']));
      expect(index.findByAttribute('level', 2)).toEqual(new Set(['sec1']));
    });

    it('should support batch indexing of entities', () => {
      const entities: Entity[] = [
        { id: 'e1', type: 'paragraph', name: 'Para 1', content: 'Content 1' },
        { id: 'e2', type: 'paragraph', name: 'Para 2', content: 'Content 2' },
        { id: 'e3', type: 'list', name: 'List 1', content: 'Item content' }
      ];
      
      // Batch index method
      index.indexEntities(entities);
      
      expect(index.findByAttribute('type', 'paragraph')).toEqual(new Set(['e1', 'e2']));
      expect(index.findByAttribute('type', 'list')).toEqual(new Set(['e3']));
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty attribute names', () => {
      expect(() => {
        index.addAttribute('entity1', '', 'value');
      }).toThrow('Attribute name cannot be empty');
    });

    it('should handle empty entity IDs', () => {
      expect(() => {
        index.addAttribute('', 'type', 'value');
      }).toThrow('Entity ID cannot be empty');
    });

    it('should handle circular references in values', () => {
      const obj: any = { key: 'value' };
      obj.self = obj; // Create circular reference
      
      expect(() => {
        index.addAttribute('entity1', 'circular', obj);
      }).not.toThrow();
    });

    it('should handle very long attribute names', () => {
      const longName = 'a'.repeat(1000);
      index.addAttribute('entity1', longName, 'value');
      
      expect(index.findByAttribute(longName, 'value')).toEqual(new Set(['entity1']));
    });

    it('should handle special characters in entity IDs and attributes', () => {
      const specialId = 'entity!@#$%^&*()_+-=[]{}|;:,.<>?';
      const specialAttr = 'attr!@#$%^&*()';
      
      index.addAttribute(specialId, specialAttr, 'value');
      
      expect(index.findByAttribute(specialAttr, 'value')).toEqual(new Set([specialId]));
    });
  });

  describe('Statistics and Metadata', () => {
    it('should provide index statistics', () => {
      index.addAttribute('e1', 'type', 'a');
      index.addAttribute('e2', 'type', 'b');
      index.addAttribute('e1', 'status', 'active');
      
      const stats = index.getStatistics();
      
      expect(stats.totalEntities).toBe(2);
      expect(stats.totalAttributes).toBe(2);
      expect(stats.totalValues).toBe(3);
      expect(stats.averageAttributesPerEntity).toBeCloseTo(1.5);
    });

    it('should list all attributes', () => {
      index.addAttribute('e1', 'type', 'a');
      index.addAttribute('e2', 'category', 'b');
      index.addAttribute('e3', 'status', 'c');
      
      const attributes = index.getAllAttributes();
      
      expect(attributes).toEqual(new Set(['type', 'category', 'status']));
    });

    it('should list all values for an attribute', () => {
      index.addAttribute('e1', 'type', 'function');
      index.addAttribute('e2', 'type', 'class');
      index.addAttribute('e3', 'type', 'function');
      
      const values = index.getValuesForAttribute('type');
      
      expect(values).toEqual(new Set(['function', 'class']));
    });
  });
});