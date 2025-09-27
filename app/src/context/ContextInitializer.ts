import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { Logger } from '../utils/Logger';

/**
 * Configuration schema for the Universal Context Engine
 */
export interface ContextConfig {
  engine: {
    version: string;
    mode: 'development' | 'production' | 'test';
  };
  databases: {
    kuzu: {
      path: string;
      cache_size: string;
    };
    duckdb: {
      path: string;
      memory_limit: string;
    };
  };
  consolidation: {
    enabled: boolean;
    schedule: string;
    batch_size: number;
  };
  lenses: {
    default: string;
    auto_activate: boolean;
  };
  storage: {
    archive_after_days: number;
    compress_archives: boolean;
  };
}

/**
 * ContextInitializer establishes the critical separation between primary artifacts
 * and the context layer by creating the .context directory structure and configuration.
 *
 * This implements the three-tier memory model:
 * - working/: Hot memory (active working context)
 * - semantic/: Warm memory (consolidated patterns)
 * - episodic/: Cold memory (historical archive)
 * - meta/: System metadata
 *
 * @example
 * ```typescript
 * const initializer = new ContextInitializer();
 * const config = await initializer.initialize('/path/to/project');
 * this.logger.info('Context initialized with config:', config);
 * ```
 */
export class ContextInitializer {
  private logger = Logger.createConsoleLogger('ContextInitializer');

  /**
   * The name of the context directory
   */
  static readonly CONTEXT_DIR = '.context';

  /**
   * Initialize the context directory structure and configuration for a project.
   * This operation is idempotent - safe to run multiple times.
   *
   * @param projectPath - Absolute or relative path to the project root
   * @returns Promise resolving to the loaded configuration
   * @throws Error if initialization fails
   */
  async initialize(projectPath: string): Promise<ContextConfig> {
    const contextPath = path.join(projectPath, ContextInitializer.CONTEXT_DIR);

    try {
      // 1. Create directory structure
      await this.createDirectories(contextPath);

      // 2. Load or create configuration
      const config = await this.loadOrCreateConfig(contextPath);

      // 3. Update .gitignore
      await this.updateGitignore(projectPath);

      // 4. Return loaded configuration
      return config;
    } catch (error) {
      // Attempt rollback on failure
      try {
        await fs.rm(contextPath, { recursive: true, force: true });
      } catch (rollbackError) {
        // Ignore rollback errors
      }

      throw new Error(
        `Failed to initialize context directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create the three-tier memory model directory structure
   *
   * @private
   * @param contextPath - Path to the .context directory
   */
  private async createDirectories(contextPath: string): Promise<void> {
    // Create main .context directory
    await fs.mkdir(contextPath, { recursive: true });

    // Create three-tier memory directories
    await fs.mkdir(path.join(contextPath, 'working'), { recursive: true });
    await fs.mkdir(path.join(contextPath, 'semantic'), { recursive: true });
    await fs.mkdir(path.join(contextPath, 'episodic'), { recursive: true });

    // Create metadata directory
    await fs.mkdir(path.join(contextPath, 'meta'), { recursive: true });
  }

  /**
   * Load existing configuration or create default configuration
   *
   * @private
   * @param contextPath - Path to the .context directory
   * @returns Promise resolving to the configuration object
   */
  private async loadOrCreateConfig(contextPath: string): Promise<ContextConfig> {
    const configPath = path.join(contextPath, 'config.yaml');

    try {
      // Try to load existing configuration
      const configContent = await fs.readFile(configPath, 'utf8');
      const userConfig = yaml.load(configContent) as Partial<ContextConfig>;

      if (!this.isValidConfig(userConfig)) {
        throw new Error('Invalid configuration schema');
      }

      // For existing configs, merge with defaults
      return this.mergeWithDefaults(userConfig);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // Config file doesn't exist, create default
        return await this.createDefaultConfig(configPath);
      } else if (error instanceof Error && error.message.includes('YAML parsing error')) {
        throw new Error('Failed to parse configuration: invalid YAML format');
      } else if (error instanceof yaml.YAMLException) {
        throw new Error('Failed to parse configuration: invalid YAML format');
      } else {
        throw error;
      }
    }
  }

  /**
   * Create default configuration file
   *
   * @private
   * @param configPath - Path to the config.yaml file
   * @returns Promise resolving to the default configuration
   */
  private async createDefaultConfig(configPath: string): Promise<ContextConfig> {
    const defaultConfig = this.getDefaultConfig();

    try {
      const yamlContent = yaml.dump(defaultConfig, {
        indent: 2,
        lineWidth: 120
      });

      await fs.writeFile(configPath, yamlContent, 'utf8');
      return defaultConfig;
    } catch (error) {
      throw new Error(`Failed to create default configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the default configuration object
   *
   * @private
   * @returns Default configuration
   */
  private getDefaultConfig(): ContextConfig {
    return {
      engine: {
        version: '1.0.0',
        mode: 'development'
      },
      databases: {
        kuzu: {
          path: 'working/graph.kuzu',
          cache_size: '1GB'
        },
        duckdb: {
          path: 'semantic/analytics.duckdb',
          memory_limit: '2GB'
        }
      },
      consolidation: {
        enabled: true,
        schedule: '0 2 * * *',
        batch_size: 1000
      },
      lenses: {
        default: 'development',
        auto_activate: true
      },
      storage: {
        archive_after_days: 90,
        compress_archives: true
      }
    };
  }

  /**
   * Validate configuration object structure
   *
   * @private
   * @param config - Configuration object to validate
   * @returns True if configuration is valid
   */
  private isValidConfig(config: any): config is Partial<ContextConfig> {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check for obviously invalid structure (like {invalid: 'structure'})
    if (config.invalid !== undefined) {
      return false;
    }

    // Empty objects are valid (will be merged with defaults)
    // Valid if it has some expected keys or is empty object
    const keys = Object.keys(config);
    if (keys.length === 0) {
      return true; // Empty config is valid, will use defaults
    }

    const validKeys = ['engine', 'databases', 'consolidation', 'lenses', 'storage'];
    const hasValidKeys = keys.some(key => validKeys.includes(key));

    return hasValidKeys;
  }

  /**
   * Merge user configuration with defaults
   *
   * @private
   * @param userConfig - Partial user configuration
   * @returns Complete configuration with defaults merged
   */
  private mergeWithDefaults(userConfig: Partial<ContextConfig>): ContextConfig {
    const defaultConfig = this.getDefaultConfig();

    return {
      engine: {
        ...defaultConfig.engine,
        ...userConfig.engine
      },
      databases: {
        kuzu: {
          ...defaultConfig.databases.kuzu,
          ...userConfig.databases?.kuzu
        },
        duckdb: {
          ...defaultConfig.databases.duckdb,
          ...userConfig.databases?.duckdb
        }
      },
      consolidation: {
        ...defaultConfig.consolidation,
        ...userConfig.consolidation
      },
      lenses: {
        ...defaultConfig.lenses,
        ...userConfig.lenses
      },
      storage: {
        ...defaultConfig.storage,
        ...userConfig.storage
      }
    };
  }

  /**
   * Update .gitignore to include .context directory
   *
   * @private
   * @param projectPath - Path to the project root
   */
  private async updateGitignore(projectPath: string): Promise<void> {
    const gitignorePath = path.join(projectPath, '.gitignore');

    try {
      let content = '';

      // Try to read existing .gitignore
      try {
        content = await fs.readFile(gitignorePath, 'utf8');
      } catch (error) {
        // File doesn't exist, will create new one
      }

      // Check if .context is already in .gitignore
      if (content.includes('.context/')) {
        return; // Already present, nothing to do
      }

      // Add .context to .gitignore
      let contextEntry: string;
      if (content === '') {
        contextEntry = '# Universal Context Engine\n.context/\n';
      } else if (content.endsWith('\n')) {
        contextEntry = '\n# Universal Context Engine\n.context/\n';
      } else {
        contextEntry = '\n\n# Universal Context Engine\n.context/\n';
      }

      const newContent = content + contextEntry;
      await fs.writeFile(gitignorePath, newContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to update .gitignore: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}