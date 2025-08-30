/**
 * CorticAI Core - Context Network System
 *
 * A three-tier memory system for code intelligence and knowledge management.
 */

import type {
  ICorticAI,
  CorticAIConfig,
  Location,
  Dependency,
  Stats,
} from './types.js';

export const VERSION = '0.1.0';

// Re-export types
export type {
  ICorticAI,
  CorticAIConfig,
  Location,
  Dependency,
  Stats,
};
export { DependencyType } from './types.js';

/**
 * Main CorticAI class implementing the ICorticAI interface
 */
export class CorticAI implements ICorticAI {
  private initialized = false;
  private _config: CorticAIConfig = {};

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(config?: CorticAIConfig): Promise<void> {
    if (this.initialized) {
      throw new Error('CorticAI already initialized');
    }
    this._config = config || {};
    // Database initialization will be added in subsequent tasks
    // Config will be used for database path, debug mode, etc.
    this.initialized = true;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      throw new Error('CorticAI not initialized');
    }
    // Cleanup will be added in subsequent tasks
    this.initialized = false;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async indexFile(_filePath: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('CorticAI not initialized');
    }
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async indexDirectory(_dirPath: string, _pattern?: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('CorticAI not initialized');
    }
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findDefinition(_symbol: string): Promise<Location | null> {
    if (!this.initialized) {
      throw new Error('CorticAI not initialized');
    }
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findReferences(_symbol: string): Promise<Location[]> {
    if (!this.initialized) {
      throw new Error('CorticAI not initialized');
    }
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getDependencies(_filePath: string): Promise<Dependency[]> {
    if (!this.initialized) {
      throw new Error('CorticAI not initialized');
    }
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getStats(): Promise<Stats> {
    if (!this.initialized) {
      throw new Error('CorticAI not initialized');
    }
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet');
  }

  /**
   * Get the current configuration
   */
  getConfig(): CorticAIConfig {
    return { ...this._config };
  }
}

export default CorticAI;