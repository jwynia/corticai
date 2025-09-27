/**
 * Test Suite for Logger Output Implementations
 *
 * Tests for Console, File, and JSON output implementations
 * Written BEFORE implementation as per TDD principles.
 */

import {
  ConsoleOutput,
  FileOutput,
  JSONOutput,
  LogEntry,
  LogLevel
} from '../../src/utils/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { vi } from 'vitest';

describe('LoggerOutputs', () => {
  describe('ConsoleOutput', () => {
    let originalConsole: typeof console;
    let mockConsole: any;
    let consoleOutput: ConsoleOutput;

    beforeEach(() => {
      // Mock console methods
      originalConsole = global.console;
      mockConsole = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      };
      global.console = mockConsole as any;

      consoleOutput = new ConsoleOutput();
    });

    afterEach(() => {
      global.console = originalConsole;
      vi.clearAllMocks();
    });

    it('should write DEBUG messages to console.log', () => {
      const entry: LogEntry = {
        level: LogLevel.DEBUG,
        message: 'Debug message',
        module: 'Test',
        timestamp: new Date()
      };

      consoleOutput.write(entry);
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should write INFO messages to console.info', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Info message',
        module: 'Test',
        timestamp: new Date()
      };

      consoleOutput.write(entry);
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should write WARN messages to console.warn', () => {
      const entry: LogEntry = {
        level: LogLevel.WARN,
        message: 'Warning message',
        module: 'Test',
        timestamp: new Date()
      };

      consoleOutput.write(entry);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should write ERROR messages to console.error', () => {
      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Error message',
        module: 'Test',
        timestamp: new Date()
      };

      consoleOutput.write(entry);
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should format messages with timestamp and module', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        module: 'TestModule',
        timestamp: new Date('2023-01-01T12:00:00Z')
      };

      consoleOutput.write(entry);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] Test message')
      );
    });

    it('should include context when provided', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        module: 'Test',
        timestamp: new Date(),
        context: { userId: '123', action: 'test' }
      };

      consoleOutput.write(entry);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('userId')
      );
    });

    it('should handle flush operation', () => {
      expect(() => consoleOutput.flush()).not.toThrow();
    });
  });

  describe('FileOutput', () => {
    let tempDir: string;
    let logFile: string;
    let fileOutput: FileOutput;

    beforeEach(async () => {
      tempDir = '/tmp/logger-test';
      await fs.mkdir(tempDir, { recursive: true });
      logFile = path.join(tempDir, 'test.log');
      fileOutput = new FileOutput(logFile);
    });

    afterEach(async () => {
      try {
        await fileOutput.close();
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create log file if it does not exist', async () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        module: 'Test',
        timestamp: new Date()
      };

      await fileOutput.write(entry);
      await fileOutput.flush();

      const exists = await fs.access(logFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should write formatted log entries to file', async () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        module: 'TestModule',
        timestamp: new Date('2023-01-01T12:00:00Z')
      };

      await fileOutput.write(entry);
      await fileOutput.flush();

      const content = await fs.readFile(logFile, 'utf8');
      expect(content).toContain('INFO');
      expect(content).toContain('TestModule');
      expect(content).toContain('Test message');
      expect(content).toContain('2023-01-01');
    });

    it('should append to existing log file', async () => {
      const entry1: LogEntry = {
        level: LogLevel.INFO,
        message: 'First message',
        module: 'Test',
        timestamp: new Date()
      };

      const entry2: LogEntry = {
        level: LogLevel.WARN,
        message: 'Second message',
        module: 'Test',
        timestamp: new Date()
      };

      await fileOutput.write(entry1);
      await fileOutput.write(entry2);
      await fileOutput.flush();

      const content = await fs.readFile(logFile, 'utf8');
      expect(content).toContain('First message');
      expect(content).toContain('Second message');
    });

    it('should handle write errors gracefully', async () => {
      // Create output with invalid path
      const invalidOutput = new FileOutput('/invalid/path/that/does/not/exist.log');

      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Test message',
        module: 'Test',
        timestamp: new Date()
      };

      // Should not throw error
      await expect(invalidOutput.write(entry)).resolves.not.toThrow();
    });

    it('should rotate log files when size limit reached', async () => {
      const smallFileOutput = new FileOutput(logFile, { maxSizeBytes: 100 });

      // Write enough entries to exceed size limit
      for (let i = 0; i < 10; i++) {
        await smallFileOutput.write({
          level: LogLevel.INFO,
          message: `Test message ${i} with enough content to exceed size limit`,
          module: 'Test',
          timestamp: new Date()
        });
      }

      await smallFileOutput.flush();

      // Check that rotation occurred
      const rotatedFile = logFile + '.1';
      const rotatedExists = await fs.access(rotatedFile).then(() => true).catch(() => false);
      expect(rotatedExists).toBe(true);
    });
  });

  describe('JSONOutput', () => {
    let tempDir: string;
    let logFile: string;
    let jsonOutput: JSONOutput;

    beforeEach(async () => {
      tempDir = '/tmp/logger-json-test';
      await fs.mkdir(tempDir, { recursive: true });
      logFile = path.join(tempDir, 'test.json');
      jsonOutput = new JSONOutput(logFile);
    });

    afterEach(async () => {
      try {
        await jsonOutput.close();
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should write valid JSON entries', async () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        module: 'TestModule',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        context: { userId: '123', action: 'test' }
      };

      await jsonOutput.write(entry);
      await jsonOutput.flush();

      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(1);

      const parsedEntry = JSON.parse(lines[0]);
      expect(parsedEntry.level).toBe('INFO');
      expect(parsedEntry.message).toBe('Test message');
      expect(parsedEntry.module).toBe('TestModule');
      expect(parsedEntry.context.userId).toBe('123');
    });

    it('should write multiple JSON entries as separate lines', async () => {
      const entry1: LogEntry = {
        level: LogLevel.INFO,
        message: 'First message',
        module: 'Test',
        timestamp: new Date()
      };

      const entry2: LogEntry = {
        level: LogLevel.WARN,
        message: 'Second message',
        module: 'Test',
        timestamp: new Date()
      };

      await jsonOutput.write(entry1);
      await jsonOutput.write(entry2);
      await jsonOutput.flush();

      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);

      const parsed1 = JSON.parse(lines[0]);
      const parsed2 = JSON.parse(lines[1]);

      expect(parsed1.message).toBe('First message');
      expect(parsed2.message).toBe('Second message');
    });

    it('should handle circular references in context', async () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Circular test',
        module: 'Test',
        timestamp: new Date(),
        context: circular
      };

      // Should not throw error
      await expect(jsonOutput.write(entry)).resolves.not.toThrow();
      await jsonOutput.flush();

      const content = await fs.readFile(logFile, 'utf8');
      expect(content).toBeTruthy();

      // Should be valid JSON
      const parsed = JSON.parse(content.trim());
      expect(parsed.message).toBe('Circular test');
    });

    it('should compress old JSON files when size limit reached', async () => {
      const compressingOutput = new JSONOutput(logFile, {
        maxSizeBytes: 200,
        compress: true
      });

      // Write enough entries to exceed size limit
      for (let i = 0; i < 20; i++) {
        await compressingOutput.write({
          level: LogLevel.INFO,
          message: `Test message ${i}`,
          module: 'Test',
          timestamp: new Date()
        });
      }

      await compressingOutput.flush();

      // Check that compressed file exists
      const compressedFile = logFile + '.gz';
      const compressedExists = await fs.access(compressedFile).then(() => true).catch(() => false);
      expect(compressedExists).toBe(true);
    });
  });
});