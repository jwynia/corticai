/**
 * Comprehensive Test Suite for Structured Logger
 *
 * Tests written BEFORE implementation as per TDD principles.
 * This test suite defines the contract for the Logger class.
 */

import { Logger, LogLevel, LogEntry, LogOutput } from '../../src/utils/Logger';
import { vi } from 'vitest';

describe('Logger', () => {
  let logger: Logger;
  let mockOutput: any;

  beforeEach(() => {
    // Create mock output for testing
    mockOutput = {
      write: vi.fn(),
      flush: vi.fn()
    };

    // Create logger instance
    logger = new Logger('TestModule', {
      level: LogLevel.DEBUG,
      outputs: [mockOutput]
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with module name', () => {
      expect(logger.getModuleName()).toBe('TestModule');
    });

    it('should use default configuration when not provided', () => {
      const defaultLogger = new Logger('Default');
      expect(defaultLogger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should throw error for empty module name', () => {
      expect(() => new Logger('')).toThrow('Module name cannot be empty');
    });

    it('should throw error for null module name', () => {
      expect(() => new Logger(null as any)).toThrow('Module name cannot be empty');
    });
  });

  describe('log level filtering', () => {
    it('should log messages at or above configured level', () => {
      logger = new Logger('Test', { level: LogLevel.WARN, outputs: [mockOutput] });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockOutput.write).toHaveBeenCalledTimes(2); // warn and error only
    });

    it('should log all messages when level is DEBUG', () => {
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockOutput.write).toHaveBeenCalledTimes(4);
    });

    it('should not log any messages when level is OFF', () => {
      logger = new Logger('Test', { level: LogLevel.OFF, outputs: [mockOutput] });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockOutput.write).toHaveBeenCalledTimes(0);
    });
  });

  describe('structured logging methods', () => {
    it('should log debug messages with correct structure', () => {
      const context = { userId: '123', operation: 'test' };
      logger.debug('Debug message', context);

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
          message: 'Debug message',
          module: 'TestModule',
          context,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should log info messages with correct structure', () => {
      logger.info('Info message');

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Info message',
          module: 'TestModule'
        })
      );
    });

    it('should log warning messages with correct structure', () => {
      logger.warn('Warning message');

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.WARN,
          message: 'Warning message',
          module: 'TestModule'
        })
      );
    });

    it('should log error messages with error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error });

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.ERROR,
          message: 'Error occurred',
          module: 'TestModule',
          context: { error }
        })
      );
    });
  });

  describe('context handling', () => {
    it('should handle undefined context gracefully', () => {
      logger.info('Message without context');

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Message without context',
          context: undefined
        })
      );
    });

    it('should handle empty object context', () => {
      logger.info('Message', {});

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Message',
          context: {}
        })
      );
    });

    it('should handle complex nested context', () => {
      const complexContext = {
        user: { id: '123', name: 'John' },
        metadata: { version: '1.0', tags: ['test', 'logging'] }
      };

      logger.info('Complex context', complexContext);

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          context: complexContext
        })
      );
    });

    it('should sanitize circular references in context', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      logger.info('Circular context', circular);

      expect(mockOutput.write).toHaveBeenCalled();
      // Should not throw error due to circular reference
    });
  });

  describe('performance measurement integration', () => {
    it('should log performance timing', () => {
      const startTime = Date.now();
      logger.timing('Operation completed', startTime, { operation: 'test' });

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Operation completed',
          context: expect.objectContaining({
            operation: 'test',
            durationMs: expect.any(Number)
          })
        })
      );
    });

    it('should handle negative timing gracefully', () => {
      const futureTime = Date.now() + 1000;
      logger.timing('Future operation', futureTime);

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            durationMs: expect.any(Number)
          })
        })
      );
    });
  });

  describe('multiple outputs', () => {
    it('should write to all configured outputs', () => {
      const output1 = { write: vi.fn(), flush: vi.fn() };
      const output2 = { write: vi.fn(), flush: vi.fn() };

      logger = new Logger('Multi', { outputs: [output1, output2] });
      logger.info('Test message');

      expect(output1.write).toHaveBeenCalled();
      expect(output2.write).toHaveBeenCalled();
    });

    it('should handle output errors gracefully', () => {
      const failingOutput = {
        write: vi.fn().mockImplementation(() => {
          throw new Error('Output failed');
        }),
        flush: vi.fn()
      };

      logger = new Logger('Failing', { outputs: [failingOutput, mockOutput] });

      // Should not throw error even if one output fails
      expect(() => logger.info('Test')).not.toThrow();
      expect(mockOutput.write).toHaveBeenCalled();
    });
  });

  describe('configuration updates', () => {
    it('should allow updating log level', () => {
      logger.setLevel(LogLevel.ERROR);

      logger.info('Should not log');
      logger.error('Should log');

      expect(mockOutput.write).toHaveBeenCalledTimes(1);
      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({ level: LogLevel.ERROR })
      );
    });

    it('should allow adding outputs', () => {
      const newOutput = { write: vi.fn(), flush: vi.fn() };
      logger.addOutput(newOutput);

      logger.info('Test');

      expect(mockOutput.write).toHaveBeenCalled();
      expect(newOutput.write).toHaveBeenCalled();
    });

    it('should allow removing outputs', () => {
      logger.removeOutput(mockOutput);
      logger.info('Test');

      expect(mockOutput.write).not.toHaveBeenCalled();
    });
  });

  describe('static factory methods', () => {
    it('should create logger with console output', () => {
      const consoleLogger = Logger.createConsoleLogger('Console');
      expect(consoleLogger.getModuleName()).toBe('Console');
    });

    it('should create logger with file output', () => {
      const fileLogger = Logger.createFileLogger('File', '/tmp/test.log');
      expect(fileLogger.getModuleName()).toBe('File');
    });

    it('should create logger with JSON output', () => {
      const jsonLogger = Logger.createJSONLogger('JSON');
      expect(jsonLogger.getModuleName()).toBe('JSON');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle extremely long messages', () => {
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({ message: longMessage })
      );
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Test\n\t"special"\x00chars';
      logger.info(specialMessage);

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({ message: specialMessage })
      );
    });

    it('should handle null and undefined in context', () => {
      logger.info('Test', { nullValue: null, undefinedValue: undefined });

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { nullValue: null, undefinedValue: undefined }
        })
      );
    });
  });

  describe('flush operation', () => {
    it('should flush all outputs', () => {
      logger.flush();
      expect(mockOutput.flush).toHaveBeenCalled();
    });

    it('should handle flush errors gracefully', () => {
      mockOutput.flush.mockImplementation(() => {
        throw new Error('Flush failed');
      });

      expect(() => logger.flush()).not.toThrow();
    });
  });

  describe('data sanitization', () => {
    it('should NOT sanitize by default (backward compatibility)', () => {
      logger = new Logger('Test', { level: LogLevel.DEBUG, outputs: [mockOutput] });

      const context = {
        userId: 'user_abc123456',
        email: 'john@example.com',
        database: '/Users/john/data.db'
      };

      logger.info('Test message', context);

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {
            userId: 'user_abc123456',
            email: 'john@example.com',
            database: '/Users/john/data.db'
          }
        })
      );
    });

    it('should sanitize context when sanitization is enabled', () => {
      logger = new Logger('Test', {
        level: LogLevel.DEBUG,
        outputs: [mockOutput],
        sanitize: true
      });

      const context = {
        userId: 'user_abc123456',
        email: 'john@example.com',
        database: '/Users/john/projects/data.db',
        operation: 'UPDATE'
      };

      logger.info('Test message', context);

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {
            userId: 'user_***3456',
            email: '***@example.com',
            database: '/***/**/data.db',
            operation: 'UPDATE' // Not sensitive, preserved
          }
        })
      );
    });

    it('should sanitize user IDs in context', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('User action', { userId: 'user_abc123456', action: 'login' });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.userId).toBe('user_***3456');
      expect(call.context.action).toBe('login');
    });

    it('should sanitize emails in context', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('Email sent', { userEmail: 'john.doe@example.com' });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.userEmail).toBe('***@example.com');
    });

    it('should sanitize file paths in context', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('File accessed', { filePath: '/Users/john/projects/myapp/data.db' });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.filePath).toBe('/***/**/data.db');
    });

    it('should redact sensitive field names completely', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('Auth attempt', {
        username: 'john',
        password: 'secret123',
        apiKey: 'key_abc123',
        token: 'Bearer xyz789'
      });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.username).toBe('john');
      expect(call.context.password).toBe('[REDACTED]');
      expect(call.context.apiKey).toBe('[REDACTED]');
      expect(call.context.token).toBe('[REDACTED]');
    });

    it('should sanitize nested context objects', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      const context = {
        user: {
          id: 'user_123456',
          email: 'test@example.com',
          profile: {
            phone: '+1-555-123-4567'
          }
        }
      };

      logger.info('User data', context);

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.user.id).toBe('user_***3456');
      expect(call.context.user.email).toBe('***@example.com');
      expect(call.context.user.profile.phone).toBe('+***-***-***-4567');
    });

    it('should sanitize arrays in context', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('Batch operation', {
        userIds: ['user_123456', 'user_789012']
      });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.userIds).toEqual(['user_***3456', 'user_***9012']);
    });

    it('should handle undefined context with sanitization enabled', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('No context');

      expect(mockOutput.write).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No context',
          context: undefined
        })
      );
    });

    it('should not sanitize log messages, only context', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('User user_abc123456 logged in from /home/user/path');

      const call = mockOutput.write.mock.calls[0][0];
      // Message should NOT be sanitized
      expect(call.message).toBe('User user_abc123456 logged in from /home/user/path');
    });

    it('should respect custom sanitizer configuration', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true,
        sanitizerConfig: {
          idSuffixLength: 6,
          sensitiveFields: ['customSecret']
        }
      });

      logger.info('Custom sanitization', {
        userId: 'user_abc123456',
        customSecret: 'my-secret',
        password: 'pass123' // Should still be redacted (default)
      });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.userId).toBe('user_***123456'); // 6 chars suffix
      expect(call.context.customSecret).toBe('[REDACTED]');
      expect(call.context.password).toBe('[REDACTED]');
    });

    it('should preserve primitives during sanitization', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      logger.info('Mixed types', {
        count: 42,
        isActive: true,
        ratio: 3.14,
        status: 'active'
      });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.count).toBe(42);
      expect(call.context.isActive).toBe(true);
      expect(call.context.ratio).toBe(3.14);
      expect(call.context.status).toBe('active');
    });

    it('should work with all log levels when sanitization is enabled', () => {
      logger = new Logger('Test', {
        level: LogLevel.DEBUG,
        outputs: [mockOutput],
        sanitize: true
      });

      const context = { userId: 'user_abc123456' };

      logger.debug('Debug', context);
      logger.info('Info', context);
      logger.warn('Warn', context);
      logger.error('Error', context);

      expect(mockOutput.write).toHaveBeenCalledTimes(4);
      mockOutput.write.mock.calls.forEach((call: any) => {
        expect(call[0].context.userId).toBe('user_***3456');
      });
    });

    it('should sanitize context in performance timing logs', () => {
      logger = new Logger('Test', {
        outputs: [mockOutput],
        sanitize: true
      });

      const startTime = Date.now();
      logger.timing('Operation', startTime, {
        userId: 'user_abc123456',
        operation: 'query'
      });

      const call = mockOutput.write.mock.calls[0][0];
      expect(call.context.userId).toBe('user_***3456');
      expect(call.context.operation).toBe('query');
      expect(call.context.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});