/**
 * Log Sanitization Utility
 *
 * Provides data sanitization for logging to prevent exposure of sensitive information.
 * Implements truncation-based redaction (showing last N characters) for IDs and paths.
 *
 * Features:
 * - ID truncation (shows last 4 chars by default: user_***3456)
 * - Path redaction (preserves filename: /.../.../ file.txt)
 * - Email sanitization (redacts username: ***@domain.com)
 * - Phone sanitization (shows last 4 digits: ***-***-4567)
 * - Auto-detection of sensitive patterns in strings
 * - Configurable sanitization rules
 * - Circular reference handling
 * - GDPR/PII compliance
 *
 * Security Best Practices:
 * - Always redacts passwords, tokens, keys (never log these!)
 * - Truncates long values to prevent log bloat
 * - Detects common PII patterns (email, phone)
 * - Configurable for different environments (dev/prod)
 */

/**
 * Sanitizer configuration options
 */
export interface SanitizerConfig {
  /**
   * Enable/disable sanitization globally
   * @default true
   */
  enabled?: boolean;

  /**
   * Number of characters to show at end of IDs
   * @default 4
   */
  idSuffixLength?: number;

  /**
   * Maximum string length before truncation
   * @default 100
   */
  maxStringLength?: number;

  /**
   * Custom sensitive field names to always redact
   * @default ['password', 'token', 'apiKey', 'secret', 'accessToken', 'refreshToken', 'privateKey']
   */
  sensitiveFields?: string[];

  /**
   * Custom regex patterns for detecting IDs
   * @default [/^user_/, /^entity_/, /^session_/, /^account_/, /^order_/]
   */
  idPatterns?: RegExp[];
}

/**
 * Default sensitive field names that should always be redacted
 */
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'sessionKey',
  'session_key',
  'authToken',
  'auth_token',
  'bearerToken',
  'bearer_token'
];

/**
 * Default ID patterns to detect and sanitize
 */
const DEFAULT_ID_PATTERNS = [
  /^user_/,
  /^entity_/,
  /^session_/,
  /^account_/,
  /^order_/,
  /^customer_/,
  /^transaction_/
];

/**
 * Email regex pattern
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Phone number regex pattern (supports various formats)
 */
const PHONE_REGEX = /(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g;

/**
 * File path regex patterns
 */
const UNIX_PATH_REGEX = /(\/[^/\s]+)+/g;
const WINDOWS_PATH_REGEX = /([A-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*)/gi;

/**
 * Main LogSanitizer class
 */
export class LogSanitizer {
  private config: Required<SanitizerConfig>;
  private seenObjects: WeakSet<object>;

  constructor(config: SanitizerConfig = {}) {
    // Validate configuration
    // Note: idSuffixLength = 0 is allowed and will result in complete redaction
    // (e.g., "user_abc123" becomes "user_***")
    if (config.idSuffixLength !== undefined && config.idSuffixLength < 0) {
      throw new Error('idSuffixLength must be >= 0');
    }

    if (config.maxStringLength !== undefined && config.maxStringLength <= 0) {
      throw new Error('maxStringLength must be > 0');
    }

    this.config = {
      enabled: config.enabled ?? true,
      idSuffixLength: config.idSuffixLength ?? 4,
      maxStringLength: config.maxStringLength ?? 100,
      sensitiveFields: config.sensitiveFields ? [...DEFAULT_SENSITIVE_FIELDS, ...config.sensitiveFields] : DEFAULT_SENSITIVE_FIELDS,
      idPatterns: config.idPatterns ? [...DEFAULT_ID_PATTERNS, ...config.idPatterns] : DEFAULT_ID_PATTERNS
    };

    // Note: seenObjects is reset for each sanitizeContext call, not shared across calls
    this.seenObjects = new WeakSet();
  }

  /**
   * Sanitize an ID by showing only the last N characters
   * Example: user_abc123456 → user_***3456
   */
  sanitizeId(id: any): string {
    if (id === null) return '[NULL]';
    if (id === undefined) return '[UNDEFINED]';
    if (id === '') return '[EMPTY]';

    const idStr = String(id);

    // Fully redact very short non-numeric IDs (4 chars or less)
    // Numeric IDs like "123" are considered safe to preserve
    if (idStr.length <= 4 && !/^\d+$/.test(idStr)) {
      return '***';
    }

    // Preserve short IDs (5-8 chars) to avoid over-redaction
    // Most sensitive IDs (UUIDs, database IDs) are longer than 8 characters
    // This threshold balances security with debugging utility
    if (idStr.length <= 8) {
      return idStr;
    }

    const suffixLength = this.config.idSuffixLength;

    // For IDs with underscore prefix (e.g., "user_abc123"), preserve the prefix
    const underscoreParts = idStr.split('_');
    if (underscoreParts.length >= 2) {
      const prefix = underscoreParts[0];
      const rest = underscoreParts.slice(1).join('_');

      if (rest.length <= suffixLength) {
        return `${prefix}_***${rest}`;
      }

      const suffix = rest.slice(-suffixLength);
      return `${prefix}_***${suffix}`;
    }

    // For IDs with dash separators (e.g., UUIDs), handle similarly
    const dashParts = idStr.split('-');
    if (dashParts.length >= 2) {
      const allButLast = dashParts.slice(0, -1).join('-');
      const lastSegment = dashParts[dashParts.length - 1];

      if (lastSegment.length <= suffixLength) {
        return `${allButLast}-***${lastSegment}`;
      }

      const suffix = lastSegment.slice(-suffixLength);
      return `${allButLast}-***${suffix}`;
    }

    // For simple IDs without separators, show prefix + *** + suffix
    const prefixLength = idStr.length - suffixLength;
    return idStr.slice(0, prefixLength) + '***' + idStr.slice(-suffixLength);
  }

  /**
   * Sanitize a file path by redacting directory names but preserving filename
   * Example: /Users/john/projects/db.kuzu → /.../db.kuzu
   */
  sanitizePath(path: any): string {
    if (path === null) return '[NULL]';
    if (path === undefined) return '[UNDEFINED]';
    if (path === '') return '[EMPTY]';

    const pathStr = String(path);

    // Detect path type
    const isWindowsPath = /^[A-Z]:\\/i.test(pathStr);
    const isUnixPath = pathStr.startsWith('/');
    const isRelativePath = pathStr.startsWith('./') || pathStr.startsWith('../');

    if (!isWindowsPath && !isUnixPath && !isRelativePath) {
      // Not a path, return as-is
      return pathStr;
    }

    const separator = isWindowsPath ? '\\' : '/';
    const parts = pathStr.split(separator);

    // Handle root or simple filename
    if (parts.length <= 2) {
      return pathStr;
    }

    // Preserve drive letter (Windows) or leading slash (Unix)
    const prefix = isWindowsPath ? parts[0] : isUnixPath ? '' : parts[0];

    // Preserve filename
    const filename = parts[parts.length - 1];

    // Redact middle parts
    if (isWindowsPath) {
      return `${prefix}${separator}***${separator}**${separator}${filename}`;
    } else if (isUnixPath) {
      return `${separator}***${separator}**${separator}${filename}`;
    } else {
      return `${prefix}${separator}***${separator}${filename}`;
    }
  }

  /**
   * Sanitize an email address by redacting the username
   * Example: john.doe@example.com → ***@example.com
   */
  sanitizeEmail(email: any): string {
    if (email === null) return '[NULL]';
    if (email === undefined) return '[UNDEFINED]';
    if (email === '') return '[EMPTY]';

    const emailStr = String(email);

    // Check if it's a valid email format
    const emailPattern = /^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
    const match = emailStr.match(emailPattern);

    if (!match) {
      return emailStr; // Not an email, return as-is
    }

    const domain = match[2];
    return `***@${domain}`;
  }

  /**
   * Sanitize a phone number by showing only last 4 digits
   * Example: +1-555-123-4567 → +***-***-***-4567
   */
  sanitizePhone(phone: any): string {
    if (phone === null) return '[NULL]';
    if (phone === undefined) return '[UNDEFINED]';
    if (phone === '') return '[EMPTY]';

    const phoneStr = String(phone);

    // Extract last 4 digits
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }

    const lastFour = digits.slice(-4);

    // Try to preserve format structure including + prefix
    if (phoneStr.includes('-')) {
      const hasPlus = phoneStr.startsWith('+');
      const parts = phoneStr.split('-');
      if (parts.length >= 2) {
        const redactedParts = parts.slice(0, -1).map((part, index) => {
          // Preserve + prefix on first part if present
          if (index === 0 && hasPlus) {
            return '+***';
          }
          return '***';
        });
        return redactedParts.join('-') + '-' + lastFour;
      }
    }

    // Fallback: show just last 4 digits
    return '*'.repeat(digits.length - 4) + lastFour;
  }

  /**
   * Truncate a long string to max length
   * Example: 'a'.repeat(200) → 'a'.repeat(100) + '...[truncated 100 chars]'
   */
  truncateString(str: string): string {
    if (str.length <= this.config.maxStringLength) {
      return str;
    }

    const truncated = str.slice(0, this.config.maxStringLength);
    const remaining = str.length - this.config.maxStringLength;
    return `${truncated}...[truncated ${remaining} chars]`;
  }

  /**
   * Sanitize a context object recursively
   * - Detects and sanitizes sensitive field names
   * - Detects and sanitizes patterns (emails, phones, paths)
   * - Handles nested objects and arrays
   * - Handles circular references
   */
  sanitizeContext(context: any): any {
    // If sanitization is disabled, only redact critical secrets
    if (!this.config.enabled) {
      return this.redactSecretsOnly(context);
    }

    // Reset seenObjects for this sanitization call to avoid false circular detection
    this.seenObjects = new WeakSet();

    return this.sanitizeValue(context, '');
  }

  /**
   * Redact only critical secrets (password, token) when sanitization is disabled
   */
  private redactSecretsOnly(context: any): any {
    if (context === null || context === undefined) {
      return context;
    }

    if (typeof context !== 'object') {
      return context;
    }

    if (Array.isArray(context)) {
      return context.map(item => this.redactSecretsOnly(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || lowerKey.includes('token') ||
          lowerKey.includes('secret') || lowerKey.includes('key')) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactSecretsOnly(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Recursively sanitize a value
   */
  private sanitizeValue(value: any, key: string): any {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Check for sensitive field names
    if (this.isSensitiveField(key)) {
      return '[REDACTED]';
    }

    // Handle primitives
    if (typeof value === 'boolean' || typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value, key);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item, index) => this.sanitizeValue(item, `${key}[${index}]`));
    }

    // Handle objects
    if (typeof value === 'object') {
      // Check for circular references
      if (this.seenObjects.has(value)) {
        return '[Circular]';
      }

      this.seenObjects.add(value);

      const sanitized: any = {};
      for (const [objKey, objValue] of Object.entries(value)) {
        sanitized[objKey] = this.sanitizeValue(objValue, objKey);
      }

      return sanitized;
    }

    // For other types (functions, symbols, etc.), convert to string
    return String(value);
  }

  /**
   * Check if a field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.config.sensitiveFields.some(sensitive =>
      lowerFieldName === sensitive.toLowerCase() ||
      lowerFieldName.includes(sensitive.toLowerCase())
    );
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(str: string, key: string): string {
    // First truncate if too long
    let result = this.truncateString(str);

    // Detect and sanitize patterns based on field name
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('id') || lowerKey.includes('key') || lowerKey.includes('session')) {
      // Check if it matches ID patterns
      for (const pattern of this.config.idPatterns) {
        if (pattern.test(result)) {
          return this.sanitizeId(result);
        }
      }
    }

    if (lowerKey.includes('email')) {
      return this.sanitizeEmail(result);
    }

    if (lowerKey.includes('phone') || lowerKey.includes('tel')) {
      return this.sanitizePhone(result);
    }

    if (lowerKey.includes('path') || lowerKey.includes('file') || lowerKey.includes('dir') || lowerKey.includes('database')) {
      return this.sanitizePath(result);
    }

    // Detect patterns in string content
    result = this.sanitizePatterns(result);

    return result;
  }

  /**
   * Detect and sanitize common patterns in string content
   */
  private sanitizePatterns(str: string): string {
    let result = str;

    // Sanitize emails
    result = result.replace(EMAIL_REGEX, (match) => {
      return this.sanitizeEmail(match);
    });

    // Sanitize phone numbers
    result = result.replace(PHONE_REGEX, (match) => {
      return this.sanitizePhone(match);
    });

    // Sanitize Unix paths
    result = result.replace(UNIX_PATH_REGEX, (match) => {
      // Only sanitize if it looks like a full path (has multiple segments)
      if (match.split('/').length > 3) {
        return this.sanitizePath(match);
      }
      return match;
    });

    // Sanitize Windows paths
    result = result.replace(WINDOWS_PATH_REGEX, (match) => {
      return this.sanitizePath(match);
    });

    return result;
  }
}
