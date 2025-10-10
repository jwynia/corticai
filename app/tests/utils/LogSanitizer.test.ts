import { describe, it, expect, beforeEach } from 'vitest';
import { LogSanitizer, SanitizerConfig } from '../../src/utils/LogSanitizer';

describe('LogSanitizer', () => {
  let sanitizer: LogSanitizer;

  beforeEach(() => {
    sanitizer = new LogSanitizer();
  });

  describe('Construction', () => {
    it('should be instantiable with default config', () => {
      expect(sanitizer).toBeDefined();
      expect(sanitizer).toBeInstanceOf(LogSanitizer);
    });

    it('should accept custom configuration', () => {
      const customSanitizer = new LogSanitizer({
        enabled: false,
        idSuffixLength: 6,
        maxStringLength: 200
      });
      expect(customSanitizer).toBeDefined();
    });

    it('should throw error if invalid config provided', () => {
      expect(() => new LogSanitizer({
        idSuffixLength: -1
      } as SanitizerConfig)).toThrow();

      expect(() => new LogSanitizer({
        maxStringLength: 0
      } as SanitizerConfig)).toThrow();
    });
  });

  describe('sanitizeId', () => {
    it('should truncate IDs showing only last 4 chars by default', () => {
      const result = sanitizer.sanitizeId('user_abc123456');
      expect(result).toBe('user_***3456');
    });

    it('should handle short IDs gracefully', () => {
      const result = sanitizer.sanitizeId('abc');
      expect(result).toBe('***');
    });

    it('should handle empty strings', () => {
      const result = sanitizer.sanitizeId('');
      expect(result).toBe('[EMPTY]');
    });

    it('should handle null and undefined', () => {
      expect(sanitizer.sanitizeId(null as any)).toBe('[NULL]');
      expect(sanitizer.sanitizeId(undefined as any)).toBe('[UNDEFINED]');
    });

    it('should preserve IDs under threshold length', () => {
      // IDs <= 8 chars are preserved to avoid over-redaction
      const result = sanitizer.sanitizeId('user123');
      expect(result).toBe('user123');
    });

    it('should handle UUIDs correctly', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = sanitizer.sanitizeId(uuid);
      expect(result).toBe('550e8400-e29b-41d4-a716-***0000');
    });

    it('should respect custom suffix length', () => {
      const customSanitizer = new LogSanitizer({ idSuffixLength: 6 });
      const result = customSanitizer.sanitizeId('user_abc123456');
      expect(result).toBe('user_***123456');
    });

    it('should handle numeric IDs', () => {
      const result = sanitizer.sanitizeId('1234567890');
      expect(result).toBe('123456***7890');
    });

    it('should preserve prefix pattern for readability', () => {
      const result = sanitizer.sanitizeId('entity_12345678');
      expect(result).toBe('entity_***5678');
    });
  });

  describe('sanitizePath', () => {
    it('should redact directory paths preserving filename', () => {
      const result = sanitizer.sanitizePath('/Users/john/projects/mydb.kuzu');
      expect(result).toBe('/***/**/mydb.kuzu');
    });

    it('should handle Windows paths', () => {
      const result = sanitizer.sanitizePath('C:\\Users\\john\\projects\\mydb.kuzu');
      expect(result).toBe('C:\\***\\**\\mydb.kuzu');
    });

    it('should handle relative paths', () => {
      const result = sanitizer.sanitizePath('./data/database.db');
      expect(result).toBe('./***/database.db');
    });

    it('should handle paths with no directories', () => {
      const result = sanitizer.sanitizePath('database.db');
      expect(result).toBe('database.db');
    });

    it('should handle empty path', () => {
      const result = sanitizer.sanitizePath('');
      expect(result).toBe('[EMPTY]');
    });

    it('should handle root paths', () => {
      const result = sanitizer.sanitizePath('/database.db');
      expect(result).toBe('/database.db');
    });

    it('should preserve file extension', () => {
      const result = sanitizer.sanitizePath('/very/long/path/to/file.txt');
      expect(result).toBe('/***/**/file.txt');
    });
  });

  describe('sanitizeEmail', () => {
    it('should redact email username', () => {
      const result = sanitizer.sanitizeEmail('john.doe@example.com');
      expect(result).toBe('***@example.com');
    });

    it('should handle email with subdomain', () => {
      const result = sanitizer.sanitizeEmail('user@mail.example.com');
      expect(result).toBe('***@mail.example.com');
    });

    it('should handle empty email', () => {
      const result = sanitizer.sanitizeEmail('');
      expect(result).toBe('[EMPTY]');
    });

    it('should handle invalid email format', () => {
      const result = sanitizer.sanitizeEmail('not-an-email');
      expect(result).toBe('not-an-email');
    });
  });

  describe('sanitizePhone', () => {
    it('should redact phone number showing only last 4 digits', () => {
      const result = sanitizer.sanitizePhone('+1-555-123-4567');
      expect(result).toBe('+***-***-***-4567');
    });

    it('should handle phone without country code', () => {
      const result = sanitizer.sanitizePhone('555-123-4567');
      expect(result).toBe('***-***-4567');
    });

    it('should handle numeric-only phone', () => {
      const result = sanitizer.sanitizePhone('5551234567');
      expect(result).toBe('******4567');
    });

    it('should handle empty phone', () => {
      const result = sanitizer.sanitizePhone('');
      expect(result).toBe('[EMPTY]');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings to max length', () => {
      const longString = 'a'.repeat(200);
      const result = sanitizer.truncateString(longString);
      expect(result).toBe('a'.repeat(100) + '...[truncated 100 chars]');
    });

    it('should preserve short strings', () => {
      const shortString = 'Hello World';
      const result = sanitizer.truncateString(shortString);
      expect(result).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      const result = sanitizer.truncateString('');
      expect(result).toBe('');
    });

    it('should respect custom max length', () => {
      const customSanitizer = new LogSanitizer({ maxStringLength: 50 });
      const longString = 'a'.repeat(100);
      const result = customSanitizer.truncateString(longString);
      expect(result).toBe('a'.repeat(50) + '...[truncated 50 chars]');
    });

    it('should handle exactly max length strings', () => {
      const exactString = 'a'.repeat(100);
      const result = sanitizer.truncateString(exactString);
      expect(result).toBe(exactString);
    });
  });

  describe('sanitizeContext', () => {
    it('should sanitize nested object with sensitive data', () => {
      const context = {
        userId: 'user_abc123456',
        email: 'john@example.com',
        database: '/Users/john/myapp/data.db',
        operation: 'UPDATE',
        timestamp: Date.now()
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.userId).toBe('user_***3456');
      expect(result.email).toBe('***@example.com');
      expect(result.database).toBe('/***/**/data.db');
      expect(result.operation).toBe('UPDATE'); // Not sensitive
      expect(result.timestamp).toBe(context.timestamp); // Numbers preserved
    });

    it('should handle deeply nested objects', () => {
      const context = {
        user: {
          id: 'user_123456',
          profile: {
            email: 'test@example.com',
            address: {
              street: '123 Main St',
              path: '/home/user/files'
            }
          }
        }
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.user.id).toBe('user_***3456');
      expect(result.user.profile.email).toBe('***@example.com');
      expect(result.user.profile.address.path).toBe('/***/**/files');
    });

    it('should handle arrays in context', () => {
      const context = {
        userIds: ['user_123456', 'user_789012'],
        emails: ['a@test.com', 'b@test.com']
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.userIds).toEqual(['user_***3456', 'user_***9012']);
      expect(result.emails).toEqual(['***@test.com', '***@test.com']);
    });

    it('should handle null and undefined values', () => {
      const context = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
      expect(result.emptyString).toBe('');
      expect(result.zero).toBe(0);
    });

    it('should handle empty context', () => {
      const result = sanitizer.sanitizeContext({});
      expect(result).toEqual({});
    });

    it('should handle undefined context', () => {
      const result = sanitizer.sanitizeContext(undefined);
      expect(result).toBeUndefined();
    });

    it('should detect and sanitize common sensitive field names', () => {
      const context = {
        password: 'secret123',
        token: 'Bearer abc123',
        apiKey: 'key_abc123',
        secret: 'my-secret',
        accessToken: 'token123',
        sessionId: 'session_abc123'
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.secret).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.sessionId).toBe('session_***c123');
    });

    it('should truncate long string values in context', () => {
      const longString = 'a'.repeat(200);
      const context = {
        longValue: longString
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.longValue).toBe('a'.repeat(100) + '...[truncated 100 chars]');
    });

    it('should preserve boolean and number types', () => {
      const context = {
        isActive: true,
        count: 42,
        ratio: 3.14,
        status: 'active'
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.isActive).toBe(true);
      expect(result.count).toBe(42);
      expect(result.ratio).toBe(3.14);
      expect(result.status).toBe('active');
    });

    it('should handle circular references gracefully', () => {
      const context: any = {
        id: 'user_123456',
        name: 'John'
      };
      context.self = context; // Create circular reference

      const result = sanitizer.sanitizeContext(context);

      expect(result.id).toBe('user_***3456');
      expect(result.name).toBe('John');
      expect(result.self).toBe('[Circular]');
    });

    it('should detect email patterns in strings', () => {
      const context = {
        message: 'Contact john@example.com for details',
        description: 'User alice@test.org reported an issue'
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.message).toBe('Contact ***@example.com for details');
      expect(result.description).toBe('User ***@test.org reported an issue');
    });

    it('should detect phone patterns in strings', () => {
      const context = {
        message: 'Call +1-555-123-4567 for support',
        note: 'Contact: 555-987-6543'
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.message).toContain('***-***-***-4567');
      expect(result.note).toContain('***-***-6543');
    });

    it('should detect file path patterns in strings', () => {
      const context = {
        message: 'Database at /Users/john/data/app.db',
        config: 'Config in C:\\Users\\john\\config.json'
      };

      const result = sanitizer.sanitizeContext(context);

      expect(result.message).toBe('Database at /***/**/app.db');
      expect(result.config).toBe('Config in C:\\***\\**\\config.json');
    });
  });

  describe('Configuration', () => {
    it('should allow disabling sanitization entirely', () => {
      const disabledSanitizer = new LogSanitizer({ enabled: false });

      const context = {
        userId: 'user_abc123456',
        email: 'john@example.com',
        password: 'secret123'
      };

      const result = disabledSanitizer.sanitizeContext(context);

      // When disabled, should return original values
      expect(result.userId).toBe('user_abc123456');
      expect(result.email).toBe('john@example.com');
      // Password should still be redacted for safety
      expect(result.password).toBe('[REDACTED]');
    });

    it('should allow custom sensitive field patterns', () => {
      const customSanitizer = new LogSanitizer({
        sensitiveFields: ['customSecret', 'internalId']
      });

      const context = {
        customSecret: 'my-secret',
        internalId: 'internal_123',
        publicId: 'public_456'
      };

      const result = customSanitizer.sanitizeContext(context);

      expect(result.customSecret).toBe('[REDACTED]');
      expect(result.internalId).toBe('[REDACTED]');
      expect(result.publicId).toBe('public_456');
    });

    it('should allow custom ID patterns', () => {
      const customSanitizer = new LogSanitizer({
        idPatterns: [/^account_/, /^order_/]
      });

      const context = {
        accountId: 'account_abc123',
        orderId: 'order_xyz789',
        userId: 'user_def456'
      };

      const result = customSanitizer.sanitizeContext(context);

      expect(result.accountId).toBe('account_***c123');
      expect(result.orderId).toBe('order_***z789');
      // Default patterns still apply
      expect(result.userId).toBe('user_***f456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-string types gracefully', () => {
      expect(sanitizer.sanitizeId(123 as any)).toBe('123');
      expect(sanitizer.sanitizePath(null as any)).toBe('[NULL]');
      expect(sanitizer.sanitizeEmail(undefined as any)).toBe('[UNDEFINED]');
    });

    it('should handle special characters in IDs', () => {
      const result = sanitizer.sanitizeId('user@#$%^&*()_+123');
      expect(result).toBe('user@#$%^&*()_***+123');
    });

    it('should handle Unicode characters', () => {
      const result = sanitizer.sanitizeId('用户_abc123');
      expect(result).toBe('用户_***c123');
    });

    it('should handle very long IDs', () => {
      const longId = 'user_' + 'a'.repeat(1000);
      const result = sanitizer.sanitizeId(longId);
      expect(result).toContain('***');
      expect(result.length).toBeLessThan(longId.length);
    });

    it('should handle objects with toString methods', () => {
      class CustomObject {
        toString() {
          return 'custom_object_123';
        }
      }

      const context = {
        obj: new CustomObject()
      };

      const result = sanitizer.sanitizeContext(context);
      // Should handle object with toString gracefully
      expect(result.obj).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large contexts efficiently', () => {
      const largeContext: any = {};
      for (let i = 0; i < 1000; i++) {
        largeContext[`field${i}`] = `user_${i}`;
      }

      const startTime = Date.now();
      const result = sanitizer.sanitizeContext(largeContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      expect(Object.keys(result).length).toBe(1000);
    });

    it('should handle deep nesting efficiently', () => {
      let deepContext: any = { value: 'user_123456' };
      for (let i = 0; i < 50; i++) {
        deepContext = { nested: deepContext };
      }

      const startTime = Date.now();
      const result = sanitizer.sanitizeContext(deepContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete in < 50ms
      expect(result).toBeDefined();
    });
  });
});
