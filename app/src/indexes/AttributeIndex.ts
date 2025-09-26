/**
 * AttributeIndex - Inverted index for finding entities with shared attributes
 * 
 * This class provides efficient querying of entities based on their attributes,
 * supporting boolean queries, persistence, and integration with the Entity type system.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type { Entity } from '../types/entity';
import type { AttributeQuery, BooleanOperator, IndexStatistics, SerializedIndex } from './types';
import { Storage, JSONStorageAdapter } from '../storage';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

/**
 * Inverted index for efficient attribute-based entity queries
 */
export class AttributeIndex {
  // Main index: attribute -> value -> Set of entity IDs
  private index: Map<string, Map<any, Set<string>>>;
  
  // Reverse index: entity ID -> Set of attributes (for efficient entity removal)
  private entityAttributes: Map<string, Set<string>>;
  
  // Storage adapter for persistence
  private storage?: Storage<SerializedIndex>;

  constructor(storage?: Storage<SerializedIndex>) {
    this.index = new Map();
    this.entityAttributes = new Map();
    this.storage = storage;
  }

  /**
   * Add an attribute-value pair for an entity
   */
  addAttribute(entityId: string, attribute: string, value: any): void {
    // Validate inputs
    if (entityId === null || entityId === undefined) {
      throw new Error('Entity ID cannot be null or undefined');
    }
    if (typeof entityId !== 'string') {
      throw new Error('Entity ID must be a string');
    }
    if (!entityId) {
      throw new Error('Entity ID cannot be empty');
    }
    if (attribute === null || attribute === undefined) {
      throw new Error('Attribute name cannot be null or undefined');
    }
    if (typeof attribute !== 'string') {
      throw new Error('Attribute name must be a string');
    }
    if (!attribute) {
      throw new Error('Attribute name cannot be empty');
    }

    // Initialize attribute map if needed
    if (!this.index.has(attribute)) {
      this.index.set(attribute, new Map());
    }

    const attributeMap = this.index.get(attribute)!;
    
    // Normalize value for consistent indexing
    const normalizedValue = this.normalizeValue(value);
    
    // Initialize value set if needed
    if (!attributeMap.has(normalizedValue)) {
      attributeMap.set(normalizedValue, new Set());
    }

    // Add entity to the value set
    attributeMap.get(normalizedValue)!.add(entityId);

    // Update reverse index
    if (!this.entityAttributes.has(entityId)) {
      this.entityAttributes.set(entityId, new Set());
    }
    // Store a unique key for the attribute-value pair
    const key = this.createAttributeKey(attribute, normalizedValue);
    this.entityAttributes.get(entityId)!.add(key);
  }

  /**
   * Remove a specific attribute from an entity
   */
  removeAttribute(entityId: string, attribute: string, value?: any): void {
    // Validate inputs
    if (entityId === null || entityId === undefined) {
      throw new Error('Entity ID cannot be null or undefined');
    }
    if (typeof entityId !== 'string') {
      throw new Error('Entity ID must be a string');
    }
    if (attribute === null || attribute === undefined) {
      throw new Error('Attribute name cannot be null or undefined');
    }
    if (typeof attribute !== 'string') {
      throw new Error('Attribute name must be a string');
    }
    
    const attributeMap = this.index.get(attribute);
    if (!attributeMap) return;

    if (value !== undefined) {
      // Remove specific value
      const normalizedValue = this.normalizeValue(value);
      const entitySet = attributeMap.get(normalizedValue);
      if (entitySet) {
        entitySet.delete(entityId);
        
        // Clean up empty sets
        if (entitySet.size === 0) {
          attributeMap.delete(normalizedValue);
        }
      }
    } else {
      // Remove all values for this attribute-entity pair
      for (const [val, entitySet] of attributeMap.entries()) {
        if (entitySet.has(entityId)) {
          entitySet.delete(entityId);
          if (entitySet.size === 0) {
            attributeMap.delete(val);
          }
        }
      }
    }

    // Clean up empty attribute map
    if (attributeMap.size === 0) {
      this.index.delete(attribute);
    }

    // Update reverse index
    const entityAttrs = this.entityAttributes.get(entityId);
    if (entityAttrs) {
      // Remove matching attributes from reverse index
      const toRemove = new Set<string>();
      for (const attrKey of entityAttrs) {
        const { attribute: keyAttr } = this.parseAttributeKey(attrKey);
        if (keyAttr === attribute) {
          if (value !== undefined) {
            // Only remove if it matches the specific value
            const { value: keyValue } = this.parseAttributeKey(attrKey);
            const normalizedKeyValue = this.normalizeValue(keyValue);
            const normalizedTargetValue = this.normalizeValue(value);
            if (JSON.stringify(normalizedKeyValue) === JSON.stringify(normalizedTargetValue)) {
              toRemove.add(attrKey);
            }
          } else {
            // Remove all values for this attribute
            toRemove.add(attrKey);
          }
        }
      }
      toRemove.forEach(attr => entityAttrs.delete(attr));
      
      if (entityAttrs.size === 0) {
        this.entityAttributes.delete(entityId);
      }
    }
  }

  /**
   * Remove all attributes for an entity
   */
  removeEntity(entityId: string): void {
    // Validate inputs
    if (entityId === null || entityId === undefined) {
      throw new Error('Entity ID cannot be null or undefined');
    }
    if (typeof entityId !== 'string') {
      throw new Error('Entity ID must be a string');
    }
    
    const entityAttrs = this.entityAttributes.get(entityId);
    if (!entityAttrs) return;

    // Parse and remove each attribute
    for (const attrKey of entityAttrs) {
      const { attribute, value } = this.parseAttributeKey(attrKey);
      
      const attributeMap = this.index.get(attribute);
      if (attributeMap) {
        const normalizedValue = this.normalizeValue(value);
        const entitySet = attributeMap.get(normalizedValue);
        if (entitySet) {
          entitySet.delete(entityId);
          if (entitySet.size === 0) {
            attributeMap.delete(normalizedValue);
          }
        }
        if (attributeMap.size === 0) {
          this.index.delete(attribute);
        }
      }
    }

    // Remove from reverse index
    this.entityAttributes.delete(entityId);
  }

  /**
   * Find entities by a single attribute
   * @param attribute - The attribute name to search for
   * @param value - Optional value to match. If omitted, returns all entities with the attribute
   */
  findByAttribute(attribute: string, value?: any): Set<string> {
    const attributeMap = this.index.get(attribute);
    if (!attributeMap) {
      return new Set();
    }

    // Check arguments.length to differentiate between undefined passed explicitly vs omitted
    // This allows findByAttribute('attr', undefined) to search for undefined values
    if (arguments.length === 1) {
      // Only one argument means we want ALL entities with this attribute
      const results = new Set<string>();
      for (const entitySet of attributeMap.values()) {
        entitySet.forEach(id => results.add(id));
      }
      return results;
    }

    // Return entities with specific value
    const normalizedValue = this.normalizeValue(value);
    
    // For complex objects/arrays, we need to check each stored value
    if (typeof normalizedValue === 'object' && normalizedValue !== null) {
      const results = new Set<string>();
      const searchStr = JSON.stringify(normalizedValue);
      
      for (const [storedValue, entitySet] of attributeMap.entries()) {
        if (JSON.stringify(storedValue) === searchStr) {
          entitySet.forEach(id => results.add(id));
        }
      }
      return results;
    }
    
    return new Set(attributeMap.get(normalizedValue) || []);
  }

  /**
   * Find entities by multiple attributes with boolean logic
   */
  findByAttributes(queries: AttributeQuery[], operator: BooleanOperator = 'AND'): Set<string> {
    // Validate operator
    if (operator !== 'AND' && operator !== 'OR') {
      throw new Error(`Invalid combinator: ${operator}`);
    }
    
    if (queries.length === 0) {
      return new Set();
    }

    const resultSets: Set<string>[] = [];

    for (const query of queries) {
      // Validate query object
      if (!query || typeof query !== 'object') {
        throw new Error('Invalid query object');
      }
      if (!('attribute' in query)) {
        throw new Error('Attribute name is required');
      }
      if (query.attribute === null || query.attribute === undefined) {
        throw new Error('Attribute name cannot be null or undefined');
      }
      if (!query.attribute) {
        throw new Error('Attribute name is required');
      }
      
      // Validate operator
      if ('operator' in query && (query.operator === null || query.operator === undefined)) {
        throw new Error('Operator cannot be null or undefined');
      }
      
      let resultSet: Set<string>;

      switch (query.operator || 'equals') {
        case 'equals':
          resultSet = this.findByAttribute(query.attribute, query.value);
          break;

        case 'exists':
          resultSet = this.findByAttribute(query.attribute);
          break;

        case 'contains':
          resultSet = this.findByContains(query.attribute, query.value);
          break;

        case 'startsWith':
          resultSet = this.findByStartsWith(query.attribute, query.value);
          break;

        default:
          throw new Error(`Invalid operator: ${query.operator}`);
      }

      resultSets.push(resultSet);
    }

    // Combine results based on operator
    if (operator === 'AND') {
      return this.intersectSets(resultSets);
    } else {
      return this.unionSets(resultSets);
    }
  }

  /**
   * Index multiple entities at once
   */
  indexEntities(entities: Entity[]): void {
    if (!Array.isArray(entities)) {
      throw new Error('Entities must be an array');
    }
    
    for (const entity of entities) {
      // Skip invalid entities gracefully
      if (!entity || typeof entity !== 'object') {
        continue;
      }
      if (!entity.id || typeof entity.id !== 'string') {
        continue;
      }
      
      try {
        // Index basic properties
        this.addAttribute(entity.id, 'type', entity.type);
        this.addAttribute(entity.id, 'name', entity.name);
        
        // Index metadata if present
        if (entity.metadata) {
          for (const [key, value] of Object.entries(entity.metadata)) {
            if (value !== undefined) {
              this.addAttribute(entity.id, key, value);
            }
          }
        }
      } catch (error) {
        // Skip entities that cause errors during indexing
        console.warn(`Failed to index entity: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }
  }

  /**
   * Save index to storage
   * @param keyOrPath - Storage key (when using storage adapter) or file path (for backward compatibility)
   */
  async save(keyOrPath: string): Promise<void> {
    // Serialize the index
    const serialized: SerializedIndex = {
      version: '1.0.0',
      index: {},
      entityAttributes: {},
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        entityCount: this.entityAttributes.size
      }
    };

    // Convert Maps to serializable format
    for (const [attr, valueMap] of this.index.entries()) {
      serialized.index[attr] = {};
      for (const [value, entitySet] of valueMap.entries()) {
        const serializedValue = JSON.stringify(value);
        serialized.index[attr][serializedValue] = Array.from(entitySet);
      }
    }

    // Serialize entity attributes
    for (const [entityId, attrs] of this.entityAttributes.entries()) {
      serialized.entityAttributes[entityId] = Array.from(attrs) as any;
    }

    if (this.storage) {
      // Use storage adapter
      await this.storage.set(keyOrPath, serialized);
    } else {
      // Backward compatibility: treat keyOrPath as a file path
      const filePath = keyOrPath;
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      try {
        await mkdir(dir, { recursive: true });
      } catch (error: any) {
        // Only ignore EEXIST errors, re-throw others
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }

      await writeFile(filePath, JSON.stringify(serialized, null, 2), 'utf-8');
    }
  }

  /**
   * Load index from storage
   * @param keyOrPath - Storage key (when using storage adapter) or file path (for backward compatibility)
   */
  async load(keyOrPath: string): Promise<void> {
    let serialized: SerializedIndex;
    
    if (this.storage) {
      // Use storage adapter
      const data = await this.storage.get(keyOrPath);
      if (!data) {
        throw new Error(`No data found for key: ${keyOrPath}`);
      }
      serialized = data;
    } else {
      // Backward compatibility: treat keyOrPath as a file path
      const filePath = keyOrPath;
      try {
        const data = await readFile(filePath, 'utf-8');
        serialized = JSON.parse(data);
      } catch (error: any) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON format in file: ${filePath}`);
        }
        throw error;
      }
    }

    // Validate data structure
    if (!serialized || typeof serialized !== 'object') {
      throw new Error('Invalid AttributeIndex data structure');
    }
    if (!serialized.index || typeof serialized.index !== 'object') {
      throw new Error('Invalid AttributeIndex data structure');
    }
    
    // Validate index structure - each attribute must map to an object
    for (const [attr, valueMap] of Object.entries(serialized.index)) {
      if (typeof valueMap !== 'object' || valueMap === null || Array.isArray(valueMap)) {
        throw new Error('Invalid data structure');
      }
    }

    // Clear existing index
    this.index.clear();
    this.entityAttributes.clear();

    // Restore index
    for (const [attr, valueMap] of Object.entries(serialized.index)) {
      const attributeMap = new Map();
      for (const [serializedValue, entityIds] of Object.entries(valueMap)) {
        try {
          const value = JSON.parse(serializedValue);
          attributeMap.set(value, new Set(entityIds));
        } catch {
          // Skip invalid entries
          continue;
        }
      }
      this.index.set(attr, attributeMap);
    }

    // Restore entity attributes
    if (serialized.entityAttributes) {
      for (const [entityId, attrs] of Object.entries(serialized.entityAttributes)) {
        this.entityAttributes.set(entityId, new Set(attrs as any));
      }
    }
  }

  /**
   * Get statistics about the index
   */
  getStatistics(): IndexStatistics {
    const totalEntities = this.entityAttributes.size;
    const totalAttributes = this.index.size;
    
    let totalValues = 0;
    for (const valueMap of this.index.values()) {
      totalValues += valueMap.size;
    }

    let totalAttributeCount = 0;
    for (const attrs of this.entityAttributes.values()) {
      totalAttributeCount += attrs.size;
    }

    return {
      totalEntities,
      totalAttributes,
      totalValues,
      averageAttributesPerEntity: totalEntities > 0 ? totalAttributeCount / totalEntities : 0
    };
  }

  /**
   * Get all unique attributes in the index
   */
  getAllAttributes(): Set<string> {
    return new Set(this.index.keys());
  }

  /**
   * Get all unique values for a specific attribute
   */
  getValuesForAttribute(attribute: string): Set<any> {
    if (attribute === null || attribute === undefined) {
      throw new Error('Attribute name cannot be null or undefined');
    }
    if (typeof attribute !== 'string') {
      throw new Error('Attribute name must be a string');
    }
    
    const attributeMap = this.index.get(attribute);
    if (!attributeMap) {
      return new Set();
    }
    return new Set(attributeMap.keys());
  }

  // Private helper methods

  private createAttributeKey(attribute: string, value: any): string {
    // Create a unique key for storing in reverse index
    if (value === null) {
      return `${attribute}:null`;
    }
    if (value === undefined) {
      return `${attribute}:undefined`;
    }
    return `${attribute}:${JSON.stringify(value)}`;
  }

  private parseAttributeKey(key: string): { attribute: string; value: any } {
    const colonIndex = key.indexOf(':');
    const attribute = key.substring(0, colonIndex);
    const valueStr = key.substring(colonIndex + 1);
    
    let value: any;
    if (valueStr === 'null') {
      value = null;
    } else if (valueStr === 'undefined') {
      value = undefined;
    } else {
      value = JSON.parse(valueStr);
    }
    
    return { attribute, value };
  }

  private normalizeValue(value: any): any {
    // Handle special cases for consistent comparison
    if (value === null) {
      return null;
    }
    if (value === undefined) {
      return undefined;
    }
    
    // For objects and arrays, create a consistent string representation
    if (typeof value === 'object') {
      try {
        // Handle circular references
        const seen = new WeakSet();
        const stringified = JSON.stringify(value, (key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '[Circular]';
            }
            seen.add(val);
          }
          return val;
        });
        // Return the parsed object to maintain structure
        return JSON.parse(stringified);
      } catch {
        return value;
      }
    }
    
    return value;
  }

  private findByContains(attribute: string, searchValue: any): Set<string> {
    const results = new Set<string>();
    const attributeMap = this.index.get(attribute);
    
    if (!attributeMap) {
      return results;
    }

    const searchStr = String(searchValue);
    
    for (const [value, entitySet] of attributeMap.entries()) {
      if (String(value).includes(searchStr)) {
        entitySet.forEach(id => results.add(id));
      }
    }
    
    return results;
  }

  private findByStartsWith(attribute: string, searchValue: any): Set<string> {
    const results = new Set<string>();
    const attributeMap = this.index.get(attribute);
    
    if (!attributeMap) {
      return results;
    }

    const searchStr = String(searchValue);
    
    for (const [value, entitySet] of attributeMap.entries()) {
      if (String(value).startsWith(searchStr)) {
        entitySet.forEach(id => results.add(id));
      }
    }
    
    return results;
  }

  private intersectSets(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) {
      return new Set();
    }
    
    // Start with the smallest set for efficiency
    const sortedSets = sets.sort((a, b) => a.size - b.size);
    const result = new Set(sortedSets[0]);
    
    for (let i = 1; i < sortedSets.length; i++) {
      for (const item of result) {
        if (!sortedSets[i].has(item)) {
          result.delete(item);
        }
      }
    }
    
    return result;
  }

  private unionSets(sets: Set<string>[]): Set<string> {
    const result = new Set<string>();
    
    for (const set of sets) {
      set.forEach(item => result.add(item));
    }
    
    return result;
  }
}