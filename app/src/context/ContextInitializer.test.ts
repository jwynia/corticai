import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ContextInitializer } from './ContextInitializer.js';

// Mock fs and yaml modules
vi.mock('fs/promises');
vi.mock('js-yaml');

// Create typed mocks
const mockFs = vi.mocked(fs);
const mockYaml = vi.mocked(yaml);

describe('ContextInitializer', () => {
  let tempProjectPath: string;
  let contextInitializer: ContextInitializer;

  beforeEach(() => {
    tempProjectPath = '/test/project';
    contextInitializer = new ContextInitializer();

    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('');
    mockYaml.dump.mockReturnValue('mocked yaml content');
    mockYaml.load.mockReturnValue({});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('directory creation', () => {
    it('should create .context directory structure', async () => {
      const result = await contextInitializer.initialize(tempProjectPath);

      const expectedContextPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR);

      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedContextPath, { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(expectedContextPath, 'working'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(expectedContextPath, 'semantic'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(expectedContextPath, 'episodic'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(expectedContextPath, 'meta'), { recursive: true });
      expect(result).toBeDefined();
    });

    it('should create working directory for hot memory', async () => {
      await contextInitializer.initialize(tempProjectPath);

      const expectedWorkingPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR, 'working');
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedWorkingPath, { recursive: true });
    });

    it('should create semantic directory for warm memory', async () => {
      await contextInitializer.initialize(tempProjectPath);

      const expectedSemanticPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR, 'semantic');
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedSemanticPath, { recursive: true });
    });

    it('should create episodic directory for cold memory', async () => {
      await contextInitializer.initialize(tempProjectPath);

      const expectedEpisodicPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR, 'episodic');
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedEpisodicPath, { recursive: true });
    });

    it('should create meta directory for metadata', async () => {
      await contextInitializer.initialize(tempProjectPath);

      const expectedMetaPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR, 'meta');
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedMetaPath, { recursive: true });
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      // First run
      await contextInitializer.initialize(tempProjectPath);
      const firstCallCount = mockFs.mkdir.mock.calls.length;

      // Reset mocks to simulate directories already existing
      vi.clearAllMocks();
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockResolvedValue(undefined); // Simulate existing directories
      mockFs.readFile.mockResolvedValue('engine:\n  version: 1.0.0\n  mode: development');
      mockYaml.load.mockReturnValue({ engine: { version: '1.0.0', mode: 'development' } });

      // Second run
      await contextInitializer.initialize(tempProjectPath);

      // Should still work without errors
      expect(mockFs.mkdir).toHaveBeenCalledTimes(5); // Should still attempt to create directories
    });
  });

  describe('configuration management', () => {
    it('should create default config.yaml if missing', async () => {
      // Mock that config file doesn't exist
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      const expectedConfig = {
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

      mockYaml.dump.mockReturnValue('mocked yaml content');
      mockYaml.load.mockReturnValue(expectedConfig);

      const result = await contextInitializer.initialize(tempProjectPath);

      const expectedConfigPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR, 'config.yaml');
      expect(mockFs.writeFile).toHaveBeenCalledWith(expectedConfigPath, 'mocked yaml content', 'utf8');
      expect(mockYaml.dump).toHaveBeenCalledWith(expectedConfig, { indent: 2, lineWidth: 120 });
      expect(result).toEqual(expectedConfig);
    });

    it('should load existing config.yaml if present', async () => {
      const existingConfig = {
        engine: { version: '2.0.0', mode: 'production' },
        databases: { kuzu: { path: 'custom/path.kuzu' } }
      };

      mockFs.readFile.mockResolvedValue(yaml.dump(existingConfig));
      mockYaml.load.mockReturnValue(existingConfig);

      const result = await contextInitializer.initialize(tempProjectPath);

      const expectedConfigPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR, 'config.yaml');
      expect(mockFs.readFile).toHaveBeenCalledWith(expectedConfigPath, 'utf8');
      expect(mockYaml.load).toHaveBeenCalled();

      // Should merge existing config with defaults
      expect(result.engine.version).toBe('2.0.0'); // from existing config
      expect(result.engine.mode).toBe('production'); // from existing config
      expect(result.databases.kuzu.path).toBe('custom/path.kuzu'); // from existing config
      expect(result.databases.kuzu.cache_size).toBe('1GB'); // from defaults
      expect(result.databases.duckdb).toBeDefined(); // from defaults
    });

    it('should validate configuration schema', async () => {
      const invalidConfig = { invalid: 'structure' };

      mockFs.readFile.mockResolvedValue(yaml.dump(invalidConfig));
      mockYaml.load.mockReturnValue(invalidConfig);

      await expect(contextInitializer.initialize(tempProjectPath)).rejects.toThrow('Invalid configuration');
    });

    it('should merge user config with defaults', async () => {
      const userConfig = {
        engine: { mode: 'production' },
        databases: { kuzu: { cache_size: '2GB' } }
      };

      mockFs.readFile.mockResolvedValue(yaml.dump(userConfig));
      mockYaml.load.mockReturnValue(userConfig);

      const result = await contextInitializer.initialize(tempProjectPath);

      // Should merge user config with defaults
      expect(result.engine.version).toBe('1.0.0'); // from defaults
      expect(result.engine.mode).toBe('production'); // from user config
      expect(result.databases.kuzu.cache_size).toBe('2GB'); // from user config
      expect(result.databases.kuzu.path).toBe('working/graph.kuzu'); // from defaults
    });

    it('should handle malformed YAML gracefully', async () => {
      mockFs.readFile.mockResolvedValue('invalid: yaml: content: [');
      mockYaml.load.mockImplementation(() => {
        throw new Error('YAML parsing error');
      });

      await expect(contextInitializer.initialize(tempProjectPath)).rejects.toThrow('Failed to parse configuration');
    });
  });

  describe('gitignore management', () => {
    it('should add .context to .gitignore if not present', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('engine:\n  version: 1.0.0\n') // config.yaml content (first call)
        .mockResolvedValueOnce('# Some existing content\nnode_modules/\n*.log\n'); // .gitignore content (second call)

      mockYaml.load.mockReturnValue({ engine: { version: '1.0.0' } });

      await contextInitializer.initialize(tempProjectPath);

      const expectedGitignorePath = path.join(tempProjectPath, '.gitignore');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expectedGitignorePath,
        '# Some existing content\nnode_modules/\n*.log\n\n# Universal Context Engine\n.context/\n',
        'utf8'
      );
    });

    it('should not duplicate .context in .gitignore', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('engine:\n  version: 1.0.0\n') // config.yaml content (first call)
        .mockResolvedValueOnce('node_modules/\n.context/\n*.log\n'); // .gitignore already contains .context (second call)

      mockYaml.load.mockReturnValue({ engine: { version: '1.0.0' } });

      await contextInitializer.initialize(tempProjectPath);

      const expectedGitignorePath = path.join(tempProjectPath, '.gitignore');
      // Should not modify .gitignore if .context is already present
      expect(mockFs.writeFile).not.toHaveBeenCalledWith(expectedGitignorePath, expect.any(String), 'utf8');
    });

    it('should create .gitignore if missing', async () => {
      mockFs.readFile
        .mockRejectedValueOnce(new Error('ENOENT')) // .gitignore doesn't exist
        .mockRejectedValueOnce(new Error('ENOENT')); // config.yaml doesn't exist either

      mockYaml.dump.mockReturnValue('mocked yaml');
      mockYaml.load.mockReturnValue({ engine: { version: '1.0.0' } });

      await contextInitializer.initialize(tempProjectPath);

      const expectedGitignorePath = path.join(tempProjectPath, '.gitignore');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expectedGitignorePath,
        '# Universal Context Engine\n.context/\n',
        'utf8'
      );
    });

    it('should preserve existing .gitignore content', async () => {
      const existingContent = '# My project\nnode_modules/\n*.env\n';

      mockFs.readFile
        .mockResolvedValueOnce('engine:\n  version: 1.0.0\n') // config.yaml content (first call)
        .mockResolvedValueOnce(existingContent); // .gitignore content (second call)

      mockYaml.load.mockReturnValue({ engine: { version: '1.0.0' } });

      await contextInitializer.initialize(tempProjectPath);

      const expectedGitignorePath = path.join(tempProjectPath, '.gitignore');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expectedGitignorePath,
        existingContent + '\n# Universal Context Engine\n.context/\n',
        'utf8'
      );
    });
  });

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      const permissionError = new Error('EACCES: permission denied');
      mockFs.mkdir.mockRejectedValue(permissionError);

      await expect(contextInitializer.initialize(tempProjectPath)).rejects.toThrow(
        'Failed to initialize context directory'
      );
    });

    it('should provide clear error messages', async () => {
      const diskError = new Error('ENOSPC: no space left on device');
      mockFs.writeFile.mockRejectedValue(diskError);

      await expect(contextInitializer.initialize(tempProjectPath)).rejects.toThrow(
        'Failed to initialize context directory'
      );
    });

    it('should roll back on failure', async () => {
      // Mock successful directory creation but failed config creation
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      mockFs.rm.mockResolvedValue(undefined);

      await expect(contextInitializer.initialize(tempProjectPath)).rejects.toThrow();

      // Should attempt to clean up created directories
      const expectedContextPath = path.join(tempProjectPath, ContextInitializer.CONTEXT_DIR);
      expect(mockFs.rm).toHaveBeenCalledWith(expectedContextPath, { recursive: true, force: true });
    });
  });

  describe('integration scenarios', () => {
    it('should handle absolute project paths', async () => {
      const absolutePath = '/home/user/projects/my-app';

      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockYaml.dump.mockReturnValue('mocked yaml');
      mockYaml.load.mockReturnValue({ engine: { version: '1.0.0' } });

      await contextInitializer.initialize(absolutePath);

      const expectedContextPath = path.join(absolutePath, ContextInitializer.CONTEXT_DIR);
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedContextPath, { recursive: true });
    });

    it('should handle relative project paths', async () => {
      const relativePath = './my-project';

      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockYaml.dump.mockReturnValue('mocked yaml');
      mockYaml.load.mockReturnValue({ engine: { version: '1.0.0' } });

      await contextInitializer.initialize(relativePath);

      const expectedContextPath = path.join(relativePath, ContextInitializer.CONTEXT_DIR);
      expect(mockFs.mkdir).toHaveBeenCalledWith(expectedContextPath, { recursive: true });
    });

    it('should return valid configuration object with all required fields', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      const expectedConfig = {
        engine: { version: '1.0.0', mode: 'development' },
        databases: {
          kuzu: { path: 'working/graph.kuzu', cache_size: '1GB' },
          duckdb: { path: 'semantic/analytics.duckdb', memory_limit: '2GB' }
        },
        consolidation: { enabled: true, schedule: '0 2 * * *', batch_size: 1000 },
        lenses: { default: 'development', auto_activate: true },
        storage: { archive_after_days: 90, compress_archives: true }
      };

      mockYaml.dump.mockReturnValue('mocked yaml');
      mockYaml.load.mockReturnValue(expectedConfig);

      const result = await contextInitializer.initialize(tempProjectPath);

      expect(result).toEqual(expectedConfig);
      expect(result.engine).toBeDefined();
      expect(result.databases).toBeDefined();
      expect(result.consolidation).toBeDefined();
      expect(result.lenses).toBeDefined();
      expect(result.storage).toBeDefined();
    });
  });

  describe('static constants', () => {
    it('should have correct CONTEXT_DIR constant', () => {
      expect(ContextInitializer.CONTEXT_DIR).toBe('.context');
    });
  });
});