/**
 * Type definitions for TypeScript Dependency Analyzer
 * These types support dependency graph analysis across TypeScript projects
 */

/**
 * Represents an import statement in a TypeScript file
 */
export interface Import {
  /** The module being imported from */
  source: string;
  
  /** Type of import (ES6, CommonJS, type-only) */
  type: 'default' | 'named' | 'namespace' | 'commonjs' | 'type';
  
  /** The specific items being imported */
  specifiers: string[];
}

/**
 * Represents an export statement in a TypeScript file
 */
export interface Export {
  /** Name of the exported item */
  name: string;
  
  /** Type of export */
  type: 'default' | 'named' | 're-export';
}

/**
 * Analysis result for a single TypeScript file
 */
export interface FileAnalysis {
  /** Absolute path to the file */
  path: string;
  
  /** All imports in the file */
  imports: Import[];
  
  /** All exports from the file */
  exports: Export[];
  
  /** Absolute paths of files this file depends on */
  dependencies: string[];
  
  /** Absolute paths of files that depend on this file */
  dependents: string[];
  
  /** Any errors encountered during analysis */
  errors?: AnalysisError[];
}

/**
 * Error that occurred during analysis
 */
export interface AnalysisError {
  /** Type of error */
  type: 'parse' | 'resolve' | 'unknown';
  
  /** Error message */
  message: string;
  
  /** Location in file where error occurred */
  location?: {
    line: number;
    column: number;
  };
}

/**
 * Node in the dependency graph
 */
export interface Node {
  /** File path */
  path: string;
  
  /** Number of imports */
  imports: number;
  
  /** Number of exports */
  exports: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Edge in the dependency graph
 */
export interface Edge {
  /** Source file */
  from: string;
  
  /** Target file */
  to: string;
  
  /** Type of dependency */
  type: 'import' | 'export' | 're-export';
  
  /** Specific items imported/exported */
  items?: string[];
}

/**
 * Detected circular dependency
 */
export interface Cycle {
  /** Files involved in the cycle */
  nodes: string[];
  
  /** Edges forming the cycle */
  edges: Edge[];
}

/**
 * Complete dependency graph for a project
 */
export interface DependencyGraph {
  /** All nodes (files) in the graph */
  nodes: Map<string, Node>;
  
  /** All edges (dependencies) in the graph */
  edges: Map<string, Edge[]>;
  
  /** Detected circular dependencies */
  cycles: Cycle[];
}

/**
 * Analysis result for an entire project/directory
 */
export interface ProjectAnalysis {
  /** Root directory analyzed */
  rootPath: string;
  
  /** Analysis results for each file */
  files: FileAnalysis[];
  
  /** Total number of imports across all files */
  totalImports: number;
  
  /** Total number of exports across all files */
  totalExports: number;
  
  /** The complete dependency graph */
  graph?: DependencyGraph;
  
  /** Analysis timestamp */
  timestamp?: Date;
}

/**
 * Summary statistics for a project
 */
export interface ProjectStats {
  /** Total number of files analyzed */
  totalFiles: number;
  
  /** Total imports */
  totalImports: number;
  
  /** Total exports */
  totalExports: number;
  
  /** Number of circular dependencies */
  totalCycles: number;
  
  /** Average imports per file */
  avgImportsPerFile: number;
  
  /** Average exports per file */
  avgExportsPerFile: number;
  
  /** Files with most dependencies */
  mostDependencies: { path: string; count: number }[];
  
  /** Files with most dependents */
  mostDependents: { path: string; count: number }[];
}

/**
 * Module import information for reporting
 */
export interface ModuleImportInfo {
  /** File path */
  path: string;
  
  /** Number of times this module is imported */
  importCount: number;
  
  /** Files that import this module */
  importedBy: string[];
}

/**
 * Comprehensive report generated from project analysis
 */
export interface Report {
  /** Summary statistics */
  summary: {
    totalFiles: number;
    totalImports: number;
    totalExports: number;
    totalCycles: number;
  };
  
  /** Most imported modules */
  mostImported: ModuleImportInfo[];
  
  /** Unused exports (exports not imported anywhere) */
  unusedExports: string[];
  
  /** Circular dependencies found */
  circularDependencies: Cycle[];
  
  /** Files with no imports or exports (isolated) */
  isolatedFiles: string[];
  
  /** Complexity metrics */
  complexity?: {
    /** Files ranked by complexity (import count + export count) */
    byComplexity: { path: string; score: number }[];
    
    /** Maximum dependency depth */
    maxDepth: number;
    
    /** Average dependency depth */
    avgDepth: number;
  };
  
  /** Timestamp of report generation */
  timestamp: Date;
}

/**
 * Options for analyzer configuration
 */
export interface AnalyzerOptions {
  /** Include .js and .jsx files */
  includeJavaScript?: boolean;
  
  /** Include node_modules dependencies */
  includeNodeModules?: boolean;
  
  /** File extensions to analyze */
  extensions?: string[];
  
  /** Directories to exclude */
  excludeDirs?: string[];
  
  /** Maximum depth for directory traversal */
  maxDepth?: number;
  
  /** Enable detailed logging */
  verbose?: boolean;
  
  /** Custom TypeScript config path */
  tsConfigPath?: string;
}