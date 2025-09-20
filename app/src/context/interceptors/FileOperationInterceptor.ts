/**
 * FileOperationInterceptor Implementation
 *
 * Real-time file system monitoring and event interception using Chokidar.
 * Implements comprehensive file operation detection with debouncing,
 * content extraction, and metadata analysis.
 */

import * as chokidar from 'chokidar';
import { promises as fs, constants as fsConstants } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import { lookup as mimeTypeLookup } from 'mime-types';

import {
  FileOperationInterceptor,
  InterceptorConfig,
  FileOperationEvent,
  FileOperationHandler,
  FileMetadata,
  FileOperation,
  DEFAULT_INTERCEPTOR_CONFIG,
  InterceptorError,
  InterceptorConfigError,
  InterceptorStartError,
  InterceptorFileError
} from './types.js';

/**
 * Implementation of FileOperationInterceptor using Chokidar file watching
 */
export class FileOperationInterceptorImpl implements FileOperationInterceptor {
  // Configuration constants
  private static readonly WATCHER_INIT_TIMEOUT_MS = 5000;
  private static readonly BINARY_DETECTION_SAMPLE_SIZE = 1024;
  private static readonly BINARY_THRESHOLD_RATIO = 0.2;
  private static readonly WATCHER_DEPTH = 10;

  private watcher: chokidar.FSWatcher | null = null;
  private config: InterceptorConfig;
  private handlers: Set<FileOperationHandler> = new Set();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private isStarted = false;

  constructor(initialConfig?: Partial<InterceptorConfig>) {
    this.config = { ...DEFAULT_INTERCEPTOR_CONFIG };
    if (initialConfig) {
      this.updateConfig(initialConfig);
    }
  }

  /**
   * Start monitoring file operations with the given configuration
   */
  async start(config: InterceptorConfig): Promise<void> {
    if (this.isStarted) {
      throw new InterceptorStartError('Interceptor is already started');
    }

    try {
      // Validate and update configuration
      this.updateConfig(config);

      // Create and configure the file watcher
      // Detect test environment for more reliable testing
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

      this.watcher = chokidar.watch(this.config.watchPaths, {
        ignored: this.config.ignorePatterns,
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: FileOperationInterceptorImpl.WATCHER_DEPTH,
        usePolling: isTestEnv, // Use polling in test environment for reliability
        interval: isTestEnv ? 50 : 100, // Faster polling in tests
        binaryInterval: isTestEnv ? 100 : 300,
        alwaysStat: true,
        atomic: true // Wait for write operations to complete
      });

      // Set up event handlers
      if (this.config.enabledOperations.includes('create')) {
        this.watcher.on('add', (filePath: string, stats?: any) => {
          this.handleFileEvent('create', filePath, stats);
        });
      }

      if (this.config.enabledOperations.includes('write')) {
        this.watcher.on('change', (filePath: string, stats?: any) => {
          this.handleFileEvent('write', filePath, stats);
        });
      }

      if (this.config.enabledOperations.includes('delete')) {
        this.watcher.on('unlink', (filePath: string) => {
          this.handleFileEvent('delete', filePath);
        });
      }

      // Handle watcher errors
      this.watcher.on('error', (error: Error) => {
        console.error('File watcher error:', error);
      });

      // Wait for watcher to be ready before considering started
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Watcher initialization timeout'));
        }, FileOperationInterceptorImpl.WATCHER_INIT_TIMEOUT_MS);

        this.watcher?.on('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.watcher?.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.isStarted = true;

    } catch (error) {
      throw new InterceptorStartError(
        `Failed to start file operation interceptor: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Stop monitoring file operations
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return; // Already stopped or never started
    }

    try {
      // Clear all debounce timers
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();

      // Close the watcher
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }

      this.isStarted = false;

    } catch (error) {
      throw new InterceptorError(
        `Failed to stop file operation interceptor: ${error instanceof Error ? error.message : String(error)}`,
        'STOP_ERROR',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Add a path to watch for file operations
   */
  addWatchPath(filePath: string): void {
    if (!this.watcher) {
      // Update config for when watcher is started
      this.config.watchPaths.push(filePath);
      return;
    }

    this.watcher.add(filePath);
    if (!this.config.watchPaths.includes(filePath)) {
      this.config.watchPaths.push(filePath);
    }
  }

  /**
   * Remove a path from being watched
   */
  removeWatchPath(filePath: string): void {
    if (!this.watcher) {
      // Update config for when watcher is started
      this.config.watchPaths = this.config.watchPaths.filter(p => p !== filePath);
      return;
    }

    this.watcher.unwatch(filePath);
    this.config.watchPaths = this.config.watchPaths.filter(p => p !== filePath);
  }

  /**
   * Register a handler for file operation events
   */
  onFileOperation(handler: FileOperationHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Unregister a handler for file operation events
   */
  offFileOperation(handler: FileOperationHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Update the interceptor configuration
   */
  updateConfig(config: Partial<InterceptorConfig>): void {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Merge with existing configuration
      this.config = { ...this.config, ...config };

    } catch (error) {
      throw new InterceptorConfigError(
        `Invalid configuration: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): InterceptorConfig {
    return { ...this.config };
  }

  /**
   * Handle file system events with debouncing
   */
  private handleFileEvent(operation: FileOperation, filePath: string, stats?: any): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      try {
        await this.processFileEvent(operation, filePath, stats);
      } catch (error) {
        console.error(`Error processing file event for ${filePath}:`, error);
      } finally {
        this.debounceTimers.delete(filePath);
      }
    }, this.config.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process a file event and notify handlers
   */
  private async processFileEvent(
    operation: FileOperation,
    filePath: string,
    stats?: any
  ): Promise<void> {
    try {
      // Check if file matches ignore patterns
      if (this.shouldIgnoreFile(filePath)) {
        return; // Skip ignored files
      }

      // Extract file metadata
      const metadata = await this.extractFileMetadata(filePath, stats);

      // Read file content if appropriate
      let content: string | undefined;
      let contentHash: string | undefined;

      if (operation !== 'delete' && metadata.size <= this.config.maxFileSize) {
        const contentResult = await this.readFileContent(filePath);
        content = contentResult?.content;
        contentHash = contentResult?.hash;
      }

      // Create file operation event
      const event: FileOperationEvent = {
        operation,
        path: filePath,
        timestamp: new Date(),
        content,
        contentHash,
        metadata
      };

      // Notify all handlers
      await this.notifyHandlers(event);

    } catch (error) {
      throw new InterceptorFileError(
        `Failed to process file event: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Extract metadata from a file
   */
  private async extractFileMetadata(filePath: string, stats?: any): Promise<FileMetadata> {
    try {
      // Get file stats if not provided
      let fileStats = stats;
      if (!fileStats) {
        try {
          fileStats = await fs.stat(filePath);
        } catch (error) {
          // File might have been deleted
          fileStats = {
            size: 0,
            mtime: new Date()
          };
        }
      }

      // Extract basic metadata
      const extension = path.extname(filePath);
      const size = fileStats.size || 0;
      const lastModified = fileStats.mtime || new Date();

      // Determine MIME type
      let mimeType = 'application/octet-stream';

      if (extension) {
        const lookupResult = mimeTypeLookup(extension);
        if (lookupResult) {
          mimeType = lookupResult;
        }
      }

      // Try to detect file type for better MIME type detection
      try {
        const fileType = await fileTypeFromFile(filePath);
        if (fileType) {
          mimeType = fileType.mime;
        }
      } catch (error) {
        // File might not exist or be accessible
      }

      // Determine encoding for text files
      let encoding: string | undefined;
      if (mimeType.startsWith('text/')) {
        encoding = 'utf8';
      }

      return {
        size,
        extension,
        mimeType,
        encoding,
        lastModified
      };

    } catch (error) {
      throw new InterceptorFileError(
        `Failed to extract file metadata: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Read file content and generate hash
   */
  private async readFileContent(filePath: string): Promise<{ content: string; hash: string } | null> {
    try {
      // Check if file is accessible
      await fs.access(filePath, fsConstants.R_OK);

      // Check if file is likely binary by reading a small sample
      const buffer = await fs.readFile(filePath);

      // Simple binary detection: check for null bytes or high ratio of non-printable chars
      if (this.isBinaryFile(buffer)) {
        return null; // Skip binary files
      }

      // Read file content as text
      const content = buffer.toString('utf8');

      // Generate SHA-256 hash
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      return { content, hash };

    } catch (error) {
      // File might be binary, too large, or inaccessible
      return null;
    }
  }

  /**
   * Simple binary file detection
   */
  private isBinaryFile(buffer: Buffer): boolean {
    // Check first N bytes for binary characteristics
    const sampleSize = Math.min(buffer.length, FileOperationInterceptorImpl.BINARY_DETECTION_SAMPLE_SIZE);
    let nullBytes = 0;
    let nonPrintableBytes = 0;

    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];

      // Null byte indicates binary
      if (byte === 0) {
        nullBytes++;
      }

      // Check for non-printable characters (excluding common whitespace)
      // ASCII printable range: 32-126, plus TAB(9), LF(10), CR(13)
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        nonPrintableBytes++;
      }

      // Check for high-bit characters (> 127) which often indicate binary
      if (byte > 127) {
        nonPrintableBytes++;
      }
    }

    // File is likely binary if:
    // - Contains null bytes
    // - More than 20% non-printable characters
    return nullBytes > 0 || (nonPrintableBytes / sampleSize) > 0.2;
  }

  /**
   * Notify all registered handlers of a file event
   */
  private async notifyHandlers(event: FileOperationEvent): Promise<void> {
    const handlerPromises = Array.from(this.handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error('Error in file operation handler:', error);
        // Continue with other handlers even if one fails
      }
    });

    // Wait for all handlers to complete
    await Promise.all(handlerPromises);
  }

  /**
   * Check if a file should be ignored based on ignore patterns
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(process.cwd(), filePath);

    for (const pattern of this.config.ignorePatterns) {
      // Simple pattern matching
      if (pattern.includes('*')) {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\*\*/g, '.*')      // ** matches any path
          .replace(/\*/g, '[^/]*')     // * matches any filename
          .replace(/\./g, '\\.');      // Escape dots

        const regex = new RegExp(`^${regexPattern}$`);

        if (regex.test(fileName) || regex.test(relativePath) || regex.test(filePath)) {
          return true;
        }
      } else {
        // Exact match
        if (fileName === pattern || relativePath === pattern || filePath === pattern) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate interceptor configuration
   */
  private validateConfig(config: Partial<InterceptorConfig>): void {
    if (config.watchPaths !== undefined) {
      if (!Array.isArray(config.watchPaths) || config.watchPaths.length === 0) {
        throw new Error('watchPaths must be a non-empty array');
      }

      // Validate that watch paths are reasonable
      for (const watchPath of config.watchPaths) {
        if (typeof watchPath !== 'string' || watchPath.trim() === '') {
          throw new Error('All watch paths must be non-empty strings');
        }

        // Check if path appears to be valid (basic validation)
        if (watchPath.includes('//') || watchPath.includes('\\\\')) {
          throw new Error(`Invalid watch path format: ${watchPath}`);
        }

        // Skip path existence check for testing and non-glob patterns
        // Chokidar will handle non-existent paths gracefully
        // This allows tests to use temporary paths that may not exist yet
      }
    }

    if (config.ignorePatterns !== undefined) {
      if (!Array.isArray(config.ignorePatterns)) {
        throw new Error('ignorePatterns must be an array');
      }
    }

    if (config.debounceMs !== undefined) {
      if (typeof config.debounceMs !== 'number' || config.debounceMs < 0) {
        throw new Error('debounceMs must be a non-negative number');
      }
    }

    if (config.maxFileSize !== undefined) {
      if (typeof config.maxFileSize !== 'number' || config.maxFileSize <= 0) {
        throw new Error('maxFileSize must be a positive number');
      }
    }

    if (config.enabledOperations !== undefined) {
      if (!Array.isArray(config.enabledOperations) || config.enabledOperations.length === 0) {
        throw new Error('enabledOperations must be a non-empty array');
      }

      const validOperations: FileOperation[] = ['create', 'write', 'move', 'delete'];
      for (const operation of config.enabledOperations) {
        if (!validOperations.includes(operation)) {
          throw new Error(`Invalid operation: ${operation}`);
        }
      }
    }
  }
}

// Export the implementation as the default implementation
export { FileOperationInterceptorImpl as FileOperationInterceptor };