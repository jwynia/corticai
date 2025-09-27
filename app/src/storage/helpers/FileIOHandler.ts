/**
 * File I/O Handler for JSON Storage
 * 
 * Encapsulates all file system operations for JSON storage,
 * including atomic writes, directory creation, and error handling.
 */

import * as fs from 'fs'
import * as path from 'path'
import { StorageError, StorageErrorCode } from '../interfaces/Storage'
import { Logger } from '../../utils/Logger'

/**
 * Configuration for file I/O operations
 */
export interface FileIOConfig {
  filePath: string
  encoding?: BufferEncoding
  atomic?: boolean
  pretty?: boolean
  debug?: boolean
  id?: string
}

/**
 * Handles all file I/O operations for JSON storage
 */
export class FileIOHandler {
  private config: Required<Omit<FileIOConfig, 'id'>> & { id?: string }
  private logger: Logger

  constructor(config: FileIOConfig) {
    this.logger = Logger.createConsoleLogger('FileIOHandler');
    if (!config.filePath) {
      throw new StorageError(
        'filePath is required for file I/O',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    this.config = {
      filePath: config.filePath,
      encoding: config.encoding || 'utf8',
      atomic: config.atomic ?? true,
      pretty: config.pretty ?? false,
      debug: config.debug ?? false,
      id: config.id
    }
  }

  /**
   * Read and parse JSON data from file
   * @returns Parsed data object or null if file doesn't exist
   */
  async readJSON(): Promise<Record<string, any> | null> {
    try {
      const content = await fs.promises.readFile(this.config.filePath, this.config.encoding)
      const parsed = JSON.parse(content)
      
      if (this.config.debug) {
        const size = parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 0
        this.log(`Loaded ${size} items from file`)
      }
      
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return null to indicate new storage
        if (this.config.debug) {
          this.log('File does not exist, will be created on first write')
        }
        return null
      }
      
      if (error instanceof SyntaxError) {
        // Corrupted JSON, log warning but continue with empty storage
        if (this.config.debug) {
          this.logWarn(`Corrupted JSON file, starting fresh: ${error.message}`)
        }
        return {}
      }
      
      // Re-throw other errors
      throw new StorageError(
        `Failed to read file: ${error.message}`,
        StorageErrorCode.IO_ERROR,
        { originalError: error, filePath: this.config.filePath }
      )
    }
  }

  /**
   * Write JSON data to file with optional atomic write
   * @param data Data to serialize and write
   */
  async writeJSON(data: Record<string, any>): Promise<void> {
    const jsonContent = this.config.pretty 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data)
    
    // Ensure directory exists
    const dir = path.dirname(this.config.filePath)
    await fs.promises.mkdir(dir, { recursive: true })
    
    if (this.config.atomic) {
      await this.atomicWrite(jsonContent)
    } else {
      await this.directWrite(jsonContent)
    }
    
    if (this.config.debug) {
      const size = Object.keys(data).length
      this.log(`Saved ${size} items to file`)
    }
  }

  /**
   * Perform atomic write (write to temp file then rename)
   */
  private async atomicWrite(content: string): Promise<void> {
    const tempPath = this.generateTempPath()
    
    try {
      await fs.promises.writeFile(tempPath, content, this.config.encoding)
      await fs.promises.rename(tempPath, this.config.filePath)
    } catch (error) {
      // Clean up temp file if it exists
      await this.cleanupTempFile(tempPath)
      
      throw new StorageError(
        `Atomic write failed: ${(error as Error).message}`,
        StorageErrorCode.IO_ERROR,
        { originalError: error, filePath: this.config.filePath }
      )
    }
  }

  /**
   * Perform direct write to file
   */
  private async directWrite(content: string): Promise<void> {
    try {
      await fs.promises.writeFile(this.config.filePath, content, this.config.encoding)
    } catch (error) {
      throw new StorageError(
        `Direct write failed: ${(error as Error).message}`,
        StorageErrorCode.IO_ERROR,
        { originalError: error, filePath: this.config.filePath }
      )
    }
  }

  /**
   * Generate a unique temporary file path
   */
  private generateTempPath(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${this.config.filePath}.tmp.${timestamp}.${random}`
  }

  /**
   * Clean up temporary file if it exists
   */
  private async cleanupTempFile(tempPath: string): Promise<void> {
    try {
      await fs.promises.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Log a debug message
   */
  private log(message: string): void {
    const prefix = `[FileIO${this.config.id ? `:${this.config.id}` : ''}]`
    this.logger.info(`${prefix} ${message}`)
  }

  /**
   * Log a warning message
   */
  private logWarn(message: string): void {
    const prefix = `[FileIO${this.config.id ? `:${this.config.id}` : ''}]`
    this.logger.warn(`${prefix} ${message}`)
  }

  /**
   * Check if file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.promises.access(this.config.filePath, fs.constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get file stats
   */
  async getStats(): Promise<fs.Stats | null> {
    try {
      return await fs.promises.stat(this.config.filePath)
    } catch {
      return null
    }
  }
}