/**
 * Core entity types based on universal patterns research
 * These types represent the fundamental information structures
 * that exist across all domains (code, documents, novels, etc.)
 */

/**
 * Represents any identifiable piece of information
 */
export interface Entity {
  /** Unique identifier for this entity */
  id: string;
  
  /** The type of entity - universal across domains */
  type: 'document' | 'section' | 'paragraph' | 'reference' | 'container' | 'list' | 'list-item';
  
  /** Human-readable name or title */
  name: string;
  
  /** The actual content (optional for containers) */
  content?: string;
  
  /** Additional metadata about the entity */
  metadata?: EntityMetadata;
  
  /** Relationships to other entities */
  relationships?: Relationship[];
}

/**
 * Metadata associated with an entity
 */
export interface EntityMetadata {
  /** Original filename if applicable */
  filename?: string;
  
  /** Line numbers in source file [start, end] */
  lineNumbers?: [number, number];
  
  /** File format/extension */
  format?: string;
  
  /** Heading level for sections (1-6 for markdown) */
  level?: number;
  
  /** Additional domain-specific metadata */
  [key: string]: any;
}

/**
 * Represents a relationship between entities
 */
export interface Relationship {
  /** Type of relationship */
  type: 'contains' | 'references' | 'part-of' | 'follows' | 'precedes' | 'calls';

  /** ID of the target entity */
  target: string;

  /** Optional metadata about the relationship */
  metadata?: any;
}

/**
 * File metadata passed to adapters
 */
export interface FileMetadata {
  /** Full file path */
  path: string;
  
  /** Just the filename */
  filename: string;
  
  /** File extension (e.g., '.md', '.txt') */
  extension: string;
  
  /** File size in bytes */
  size?: number;
  
  /** File encoding */
  encoding?: string;
}

/**
 * Base interface for all domain adapters
 */
export interface DomainAdapter {
  /** Extract entities from content */
  extract(content: string, metadata: FileMetadata): Entity[];
  
  /** Optional: detect relationships between entities */
  detectRelationships?(entities: Entity[]): Relationship[];
}

/**
 * Result of extraction including both entities and relationships
 */
export interface ExtractionResult {
  /** Extracted entities */
  entities: Entity[];
  
  /** Detected relationships */
  relationships: Relationship[];
  
  /** Any errors encountered during extraction */
  errors?: ExtractionError[];
}

/**
 * Error that occurred during extraction
 */
export interface ExtractionError {
  /** Error type */
  type: 'parse' | 'pattern' | 'unknown';
  
  /** Error message */
  message: string;
  
  /** Location in content where error occurred */
  location?: {
    line?: number;
    column?: number;
    offset?: number;
  };
}