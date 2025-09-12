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

    // Validate encoding if provided
    if (config.encoding) {
      const validEncodings = ['utf8', 'utf-8', 'ascii', 'latin1', 'binary', 'hex', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le']
      if (!validEncodings.includes(config.encoding)) {
        throw new StorageError(
          `Invalid encoding: ${config.encoding}`,
          StorageErrorCode.INVALID_VALUE,
          { encoding: config.encoding, validEncodings }
        )
      }
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
  // OVERRIDE BASE METHODS FOR JSON-SPECIFIC HANDLING
  // ============================================================================

  /**
   * Override set method to handle JSON-specific value preprocessing
   */
  async set(key: string, value: T): Promise<void> {
    // Import here to use the existing validation
    const { StorageValidator } = await import('../helpers/StorageValidator')
    StorageValidator.validateKey(key)
    
    // Custom JSON-friendly value validation and conversion
    const processedValue = this.preprocessValue(value)
    
    await this.ensureLoaded()
    
    this.data.set(key, processedValue)
    await this.persist()
    
    if (this.config.debug) {
      this.log(`SET ${key}`)
    }
  }

  /**
   * Override setMany method to handle JSON-specific value preprocessing
   */
  async setMany(entries: Map<string, T>): Promise<void> {
    const { StorageValidator } = await import('../helpers/StorageValidator')
    
    // Validate keys and preprocess values
    const processedEntries = new Map<string, T>()
    for (const [key, value] of entries) {
      StorageValidator.validateKey(key)
      processedEntries.set(key, this.preprocessValue(value))
    }
    
    await this.ensureLoaded()
    
    // Apply all changes
    for (const [key, value] of processedEntries) {
      this.data.set(key, value)
    }
    
    await this.persist()
    
    if (this.config.debug) {
      this.log(`SET_MANY ${entries.size} entries`)
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

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Preprocess values to handle JSON serialization issues
   * Converts non-serializable values to serializable forms
   */
  private preprocessValue(value: any, seen = new WeakSet()): any {
    if (value === null || value === undefined) {
      return value
    }
    
    if (typeof value === 'function') {
      return { __type: 'function', __value: value.toString() }
    }
    
    if (typeof value === 'symbol') {
      return { __type: 'symbol', __value: value.toString() }
    }
    
    if (typeof value === 'bigint') {
      return { __type: 'bigint', __value: value.toString() }
    }
    
    if (typeof value === 'object' && value !== null) {
      // Handle circular references
      if (seen.has(value)) {
        return { __type: 'circular', __value: '[Circular Reference]' }
      }
      seen.add(value)
      
      if (Array.isArray(value)) {
        return value.map(item => this.preprocessValue(item, seen))
      } else {
        const result: any = {}
        for (const [key, val] of Object.entries(value)) {
          result[key] = this.preprocessValue(val, seen)
        }
        return result
      }
    }
    
    return value
  }
}