/**
 * JSON Storage Adapter implementation
 * 
 * This adapter implements the Storage interface for JSON file storage,
 * maintaining compatibility with existing AttributeIndex behavior.
 * 
 * Part of Stage 2: Current State Adapter (Task 2.1)
 * Extracts and abstracts current AttributeIndex storage logic
 */

import { 
  JSONStorageConfig,
  SaveableStorage,
  StorageError,
  StorageErrorCode
} from '../interfaces/Storage'
import { BaseStorageAdapter } from '../base/BaseStorageAdapter'
import { FileIOHandler } from '../helpers/FileIOHandler'

/**
 * JSON file storage adapter with support for both auto-save and manual save modes
 * 
 * Features:
 * - Full Storage and BatchStorage interface compliance
 * - Auto-save and manual save modes
 * - Atomic writes (write to temp file then rename)
 * - Pretty printing support
 * - Directory creation
 * - Corrupted file recovery
 * - Compatible with AttributeIndex JSON format
 */
export class JSONStorageAdapter<T = any> extends BaseStorageAdapter<T> implements SaveableStorage {
  private fileIO: FileIOHandler
  private jsonConfig: JSONStorageConfig
  private isLoaded: boolean = false

  constructor(config: JSONStorageConfig) {
    if (!config.filePath) {
      throw new StorageError(
        'filePath is required for JSON storage',
        StorageErrorCode.INVALID_VALUE,
        { config }
      )
    }

    super(config)
    
    this.jsonConfig = {
      encoding: 'utf8',
      pretty: false,
      atomic: true,
      autoSave: true,
      debug: false,
      ...config
    }
    
    this.fileIO = new FileIOHandler({
      filePath: this.jsonConfig.filePath,
      encoding: this.jsonConfig.encoding,
      atomic: this.jsonConfig.atomic,
      pretty: this.jsonConfig.pretty,
      debug: this.jsonConfig.debug,
      id: this.jsonConfig.id
    })
    
    if (this.jsonConfig.debug) {
      this.log(`Initialized with file: ${this.jsonConfig.filePath}`)
    }
  }

  // ============================================================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ============================================================================

  /**
   * Ensure data is loaded from file
   */
  protected async ensureLoaded(): Promise<void> {
    if (this.isLoaded) {
      return
    }

    try {
      await this.loadFromFile()
    } catch (error) {
      if (this.config.debug) {
        this.log('File does not exist or is corrupted, starting with empty storage')
      }
      // Start with empty storage if file doesn't exist or is corrupted
      this.data.clear()
    }
    
    this.isLoaded = true
  }

  /**
   * Persist data to file if auto-save is enabled
   */
  protected async persist(): Promise<void> {
    if (this.jsonConfig.autoSave) {
      await this.saveToFile()
    }
  }

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  /**
   * Load data from JSON file
   */
  private async loadFromFile(): Promise<void> {
    const jsonData = await this.fileIO.readJSON()
    
    // Clear existing data
    this.data.clear()
    
    // If file doesn't exist (null) or is empty object, keep data empty
    if (jsonData === null) {
      return
    }
    
    // Load data from JSON object
    if (jsonData && typeof jsonData === 'object') {
      Object.entries(jsonData).forEach(([key, value]) => {
        this.data.set(key, value as T)
      })
    }
    
    if (this.config.debug) {
      this.log(`Loaded ${this.data.size} items from file`)
    }
  }

  /**
   * Save data to JSON file
   */
  private async saveToFile(): Promise<void> {
    // Convert Map to plain object for JSON serialization
    const dataObject: Record<string, T> = {}
    for (const [key, value] of this.data.entries()) {
      dataObject[key] = value
    }
    
    await this.fileIO.writeJSON(dataObject)
  }

  // ============================================================================
  // SAVEABLE STORAGE INTERFACE
  // ============================================================================

  /**
   * Manually save data to file
   */
  async save(): Promise<void> {
    await this.ensureLoaded()
    await this.saveToFile()
    
    if (this.config.debug) {
      this.log('Manual save completed')
    }
  }

  // ============================================================================
  // PUBLIC UTILITIES
  // ============================================================================

  /**
   * Get the configured file path
   */
  getFilePath(): string {
    return this.jsonConfig.filePath
  }

  /**
   * Check if auto-save is enabled
   */
  isAutoSaveEnabled(): boolean {
    return this.jsonConfig.autoSave ?? true
  }

  /**
   * Set auto-save mode
   */
  setAutoSave(enabled: boolean): void {
    this.jsonConfig.autoSave = enabled
    if (this.config.debug) {
      this.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`)
    }
  }
}