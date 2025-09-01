/**
 * Type definitions for the AttributeIndex system
 * These types define the contract for attribute-based querying
 */

/**
 * Represents a query for finding entities by attributes
 */
export interface AttributeQuery {
  /** The attribute name to query */
  attribute: string;
  
  /** The value to match (optional for EXISTS queries) */
  value?: any;
  
  /** The comparison operator to use */
  operator?: 'equals' | 'contains' | 'startsWith' | 'exists';
}

/**
 * Boolean logic for combining multiple queries
 */
export type BooleanOperator = 'AND' | 'OR';

/**
 * Statistics about the index
 */
export interface IndexStatistics {
  /** Total number of unique entities in the index */
  totalEntities: number;
  
  /** Total number of unique attributes */
  totalAttributes: number;
  
  /** Total number of attribute-value pairs */
  totalValues: number;
  
  /** Average number of attributes per entity */
  averageAttributesPerEntity: number;
}

/**
 * Serialized format for persistence
 */
export interface SerializedIndex {
  /** Version for migration compatibility */
  version: string;
  
  /** The main index data structure */
  index: Record<string, Record<string, string[]>>;
  
  /** Reverse index for entity removal */
  entityAttributes: Record<string, Set<string>>;
  
  /** Metadata about the index */
  metadata?: {
    createdAt?: string;
    lastModified?: string;
    entityCount?: number;
  };
}