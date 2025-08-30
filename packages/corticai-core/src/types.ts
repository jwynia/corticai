/**
 * Type definitions for CorticAI Core
 */

/**
 * Configuration options for initializing CorticAI
 */
export interface CorticAIConfig {
  /** Path to the KuzuDB database file */
  databasePath?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum number of parallel parsers */
  maxParallelParsers?: number;
  /** Query timeout in milliseconds */
  queryTimeout?: number;
}

/**
 * Main interface for CorticAI functionality
 */
export interface ICorticAI {
  /**
   * Initialize the CorticAI system
   * @param config Optional configuration
   */
  init(config?: CorticAIConfig): Promise<void>;

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): Promise<void>;

  /**
   * Index a single file
   * @param filePath Path to the file to index
   */
  indexFile(filePath: string): Promise<void>;

  /**
   * Index an entire directory
   * @param dirPath Path to the directory
   * @param pattern Optional glob pattern for files
   */
  indexDirectory(dirPath: string, pattern?: string): Promise<void>;

  /**
   * Find the definition of a symbol
   * @param symbol The symbol to find
   * @returns Location of the definition
   */
  findDefinition(symbol: string): Promise<Location | null>;

  /**
   * Find all references to a symbol
   * @param symbol The symbol to find references for
   * @returns Array of locations
   */
  findReferences(symbol: string): Promise<Location[]>;

  /**
   * Get dependencies of a file
   * @param filePath Path to the file
   * @returns Array of dependencies
   */
  getDependencies(filePath: string): Promise<Dependency[]>;
}

/**
 * Represents a location in source code
 */
export interface Location {
  /** File path */
  filePath: string;
  /** Starting line number (1-indexed) */
  line: number;
  /** Starting column (1-indexed) */
  column: number;
  /** End line number */
  endLine?: number;
  /** End column */
  endColumn?: number;
}

/**
 * Represents a dependency relationship
 */
export interface Dependency {
  /** Source file */
  source: string;
  /** Target file */
  target: string;
  /** Type of dependency */
  type: DependencyType;
  /** Specific imports if applicable */
  imports?: string[];
}

/**
 * Types of dependencies
 */
export enum DependencyType {
  /** ES module import */
  Import = 'import',
  /** CommonJS require */
  Require = 'require',
  /** Dynamic import */
  DynamicImport = 'dynamic-import',
  /** Type-only import (TypeScript) */
  TypeImport = 'type-import',
}

/**
 * Statistics about the indexed codebase
 */
export interface Stats {
  /** Total number of files indexed */
  filesIndexed: number;
  /** Total number of nodes in graph */
  totalNodes: number;
  /** Total number of edges in graph */
  totalEdges: number;
  /** Last index timestamp */
  lastIndexed: Date;
  /** Database size in bytes */
  databaseSize: number;
}