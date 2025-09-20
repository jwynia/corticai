/**
 * Type definitions for the File Operation Interceptor system
 *
 * This module defines the interfaces and types used for intercepting,
 * analyzing, and forwarding file system operations.
 */

/**
 * Supported file operations that can be intercepted
 */
export type FileOperation = 'create' | 'write' | 'move' | 'delete';

/**
 * Configuration for the FileOperationInterceptor
 */
export interface InterceptorConfig {
  /** Paths to watch for file operations (supports glob patterns) */
  watchPaths: string[];

  /** Patterns to ignore (e.g., node_modules, .git) */
  ignorePatterns: string[];

  /** Debounce time in milliseconds to prevent duplicate events */
  debounceMs: number;

  /** Maximum file size to read content (in bytes) */
  maxFileSize: number;

  /** Which file operations to monitor */
  enabledOperations: FileOperation[];
}

/**
 * Metadata about a file extracted during interception
 */
export interface FileMetadata {
  /** File size in bytes */
  size: number;

  /** File extension (e.g., '.ts', '.md') */
  extension: string;

  /** MIME type of the file */
  mimeType: string;

  /** File encoding (if text file) */
  encoding?: string;

  /** Last modification time */
  lastModified: Date;
}

/**
 * Event data for a file operation
 */
export interface FileOperationEvent {
  /** Type of operation performed */
  operation: FileOperation;

  /** Full path to the file */
  path: string;

  /** When the event was detected */
  timestamp: Date;

  /** File content (if readable and under size limit) */
  content?: string;

  /** SHA-256 hash of content for caching */
  contentHash?: string;

  /** File metadata */
  metadata: FileMetadata;
}

/**
 * Handler function for file operation events
 */
export type FileOperationHandler = (event: FileOperationEvent) => Promise<void>;

/**
 * Core interface for the FileOperationInterceptor
 */
export interface FileOperationInterceptor {
  /**
   * Start monitoring file operations with the given configuration
   */
  start(config: InterceptorConfig): Promise<void>;

  /**
   * Stop monitoring file operations
   */
  stop(): Promise<void>;

  /**
   * Add a path to watch for file operations
   */
  addWatchPath(path: string): void;

  /**
   * Remove a path from being watched
   */
  removeWatchPath(path: string): void;

  /**
   * Register a handler for file operation events
   */
  onFileOperation(handler: FileOperationHandler): void;

  /**
   * Unregister a handler for file operation events
   */
  offFileOperation(handler: FileOperationHandler): void;

  /**
   * Update the interceptor configuration
   */
  updateConfig(config: Partial<InterceptorConfig>): void;

  /**
   * Get the current configuration
   */
  getConfig(): InterceptorConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_INTERCEPTOR_CONFIG: InterceptorConfig = {
  watchPaths: ['**/*'],
  ignorePatterns: [
    'node_modules/**',
    '.git/**',
    '.DS_Store',
    '*.log',
    'dist/**',
    'build/**',
    '.vitest/**'
  ],
  debounceMs: 100,
  maxFileSize: 1024 * 1024, // 1MB
  enabledOperations: ['create', 'write', 'move', 'delete']
};

/**
 * Error types for FileOperationInterceptor
 */
export class InterceptorError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: Error) {
    super(message);
    this.name = 'InterceptorError';
  }
}

export class InterceptorConfigError extends InterceptorError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause);
    this.name = 'InterceptorConfigError';
  }
}

export class InterceptorStartError extends InterceptorError {
  constructor(message: string, cause?: Error) {
    super(message, 'START_ERROR', cause);
    this.name = 'InterceptorStartError';
  }
}

export class InterceptorFileError extends InterceptorError {
  constructor(message: string, public readonly filePath: string, cause?: Error) {
    super(message, 'FILE_ERROR', cause);
    this.name = 'InterceptorFileError';
  }
}