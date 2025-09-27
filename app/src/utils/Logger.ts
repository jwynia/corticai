/**
 * Structured Logger Implementation
 *
 * Provides structured logging with multiple output formats and log levels.
 * Replaces console.* statements with proper structured logging.
 *
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, OFF)
 * - Structured log entries with context
 * - Multiple output formats (Console, File, JSON)
 * - Performance timing integration
 * - Circular reference handling
 * - Configurable log rotation
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  module: string;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Log output interface
 */
export interface LogOutput {
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel;
  outputs?: LogOutput[];
}

/**
 * File output configuration
 */
export interface FileOutputConfig {
  maxSizeBytes?: number;
  maxFiles?: number;
}

/**
 * JSON output configuration
 */
export interface JSONOutputConfig {
  maxSizeBytes?: number;
  compress?: boolean;
}

/**
 * Console output implementation
 */
export class ConsoleOutput implements LogOutput {
  write(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.module}]`;

    let message = `${prefix} ${entry.message}`;

    if (entry.context) {
      const contextStr = this.formatContext(entry.context);
      message += ` ${contextStr}`;
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.log(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  flush(): void {
    // Console output doesn't need flushing
  }

  private formatContext(context: Record<string, any>): string {
    try {
      return JSON.stringify(context, this.replacer, 2);
    } catch (error) {
      return '[Context serialization failed]';
    }
  }

  private replacer(key: string, value: any): any {
    // Handle circular references
    const seen = new WeakSet();
    return function(this: any, key: string, val: any) {
      if (val != null && typeof val === 'object') {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    }.call(this, key, value);
  }
}

/**
 * File output implementation with rotation
 */
export class FileOutput implements LogOutput {
  private filePath: string;
  private config: FileOutputConfig;
  private writeStream: fsSync.WriteStream | null = null;
  private currentSize = 0;

  constructor(filePath: string, config: FileOutputConfig = {}) {
    this.filePath = filePath;
    this.config = {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB default
      maxFiles: 5,
      ...config
    };

    this.ensureDirectoryExists();
    this.initializeStream();
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const logLine = this.formatLogEntry(entry);
      const lineSize = Buffer.byteLength(logLine, 'utf8');

      // Check if rotation is needed
      if (this.currentSize + lineSize > this.config.maxSizeBytes!) {
        await this.rotateFile();
      }

      if (this.writeStream) {
        this.writeStream.write(logLine);
        this.currentSize += lineSize;
      }
    } catch (error) {
      // Silently handle write errors to prevent logging from breaking the application
    }
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(resolve);
      } else {
        resolve();
      }
    });
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      await this.flush();
      this.writeStream = null;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    let line = `[${timestamp}] [${levelName}] [${entry.module}] ${entry.message}`;

    if (entry.context) {
      try {
        const contextStr = JSON.stringify(entry.context, this.replacer);
        line += ` ${contextStr}`;
      } catch (error) {
        line += ' [Context serialization failed]';
      }
    }

    return line + '\n';
  }

  private replacer(key: string, value: any): any {
    // Handle circular references
    const seen = new WeakSet();
    return function(this: any, key: string, val: any) {
      if (val != null && typeof val === 'object') {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    }.call(this, key, value);
  }

  private ensureDirectoryExists(): void {
    try {
      const dir = path.dirname(this.filePath);
      fsSync.mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Ignore directory creation errors
    }
  }

  private initializeStream(): void {
    try {
      this.writeStream = fsSync.createWriteStream(this.filePath, { flags: 'a' });

      // Get current file size
      try {
        const stats = fsSync.statSync(this.filePath);
        this.currentSize = stats.size;
      } catch (error) {
        this.currentSize = 0;
      }
    } catch (error) {
      this.writeStream = null;
    }
  }

  private async rotateFile(): Promise<void> {
    try {
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      // Rotate existing files
      for (let i = this.config.maxFiles! - 1; i > 0; i--) {
        const oldFile = `${this.filePath}.${i}`;
        const newFile = `${this.filePath}.${i + 1}`;

        try {
          await fs.access(oldFile);
          if (i === this.config.maxFiles! - 1) {
            await fs.unlink(oldFile); // Delete oldest file
          } else {
            await fs.rename(oldFile, newFile);
          }
        } catch (error) {
          // File doesn't exist, continue
        }
      }

      // Move current log to .1
      try {
        await fs.rename(this.filePath, `${this.filePath}.1`);
      } catch (error) {
        // Original file doesn't exist, continue
      }

      // Create new stream
      this.currentSize = 0;
      this.initializeStream();
    } catch (error) {
      // Handle rotation errors gracefully
      this.initializeStream();
    }
  }
}

/**
 * JSON output implementation with compression
 */
export class JSONOutput implements LogOutput {
  private filePath: string;
  private config: JSONOutputConfig;
  private writeStream: fsSync.WriteStream | null = null;
  private currentSize = 0;

  constructor(filePath: string, config: JSONOutputConfig = {}) {
    this.filePath = filePath;
    this.config = {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB default
      compress: false,
      ...config
    };

    this.ensureDirectoryExists();
    this.initializeStream();
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const jsonLine = this.formatJSONEntry(entry);
      const lineSize = Buffer.byteLength(jsonLine, 'utf8');

      // Check if rotation is needed
      if (this.currentSize + lineSize > this.config.maxSizeBytes!) {
        await this.rotateFile();
      }

      if (this.writeStream) {
        this.writeStream.write(jsonLine);
        this.currentSize += lineSize;
      }
    } catch (error) {
      // Silently handle write errors
    }
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(resolve);
      } else {
        resolve();
      }
    });
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      await this.flush();
      this.writeStream = null;
    }
  }

  private formatJSONEntry(entry: LogEntry): string {
    try {
      const jsonEntry = {
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        module: entry.module,
        message: entry.message,
        ...(entry.context && { context: entry.context })
      };

      return JSON.stringify(jsonEntry, this.replacer) + '\n';
    } catch (error) {
      // Fallback for serialization errors
      return JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        module: entry.module,
        message: entry.message,
        error: 'Context serialization failed'
      }) + '\n';
    }
  }

  private replacer(key: string, value: any): any {
    // Handle circular references
    const seen = new WeakSet();
    return function(this: any, key: string, val: any) {
      if (val != null && typeof val === 'object') {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    }.call(this, key, value);
  }

  private ensureDirectoryExists(): void {
    try {
      const dir = path.dirname(this.filePath);
      fsSync.mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Ignore directory creation errors
    }
  }

  private initializeStream(): void {
    try {
      this.writeStream = fsSync.createWriteStream(this.filePath, { flags: 'a' });

      // Get current file size
      try {
        const stats = fsSync.statSync(this.filePath);
        this.currentSize = stats.size;
      } catch (error) {
        this.currentSize = 0;
      }
    } catch (error) {
      this.writeStream = null;
    }
  }

  private async rotateFile(): Promise<void> {
    try {
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      // Compress and archive old file if compression is enabled
      if (this.config.compress) {
        try {
          const data = await fs.readFile(this.filePath);
          const compressed = await gzip(data);
          await fs.writeFile(`${this.filePath}.gz`, compressed);
          await fs.unlink(this.filePath);
        } catch (error) {
          // Handle compression errors gracefully
        }
      } else {
        // Simple rotation without compression
        try {
          await fs.rename(this.filePath, `${this.filePath}.old`);
        } catch (error) {
          // Handle rotation errors gracefully
        }
      }

      // Create new stream
      this.currentSize = 0;
      this.initializeStream();
    } catch (error) {
      // Handle rotation errors gracefully
      this.initializeStream();
    }
  }
}

/**
 * Main Logger class
 */
export class Logger {
  private moduleName: string;
  private level: LogLevel;
  private outputs: LogOutput[];

  constructor(moduleName: string, config: LoggerConfig = {}) {
    if (!moduleName || moduleName.trim() === '') {
      throw new Error('Module name cannot be empty');
    }

    this.moduleName = moduleName.trim();
    this.level = config.level ?? LogLevel.INFO;
    this.outputs = config.outputs ?? [new ConsoleOutput()];
  }

  /**
   * Static factory methods
   */
  static createConsoleLogger(moduleName: string, level: LogLevel = LogLevel.INFO): Logger {
    return new Logger(moduleName, {
      level,
      outputs: [new ConsoleOutput()]
    });
  }

  static createFileLogger(moduleName: string, filePath: string, level: LogLevel = LogLevel.INFO): Logger {
    return new Logger(moduleName, {
      level,
      outputs: [new FileOutput(filePath)]
    });
  }

  static createJSONLogger(moduleName: string, filePath?: string, level: LogLevel = LogLevel.INFO): Logger {
    const jsonFilePath = filePath ?? `/tmp/logs/${moduleName.toLowerCase()}.json`;
    return new Logger(moduleName, {
      level,
      outputs: [new JSONOutput(jsonFilePath)]
    });
  }

  /**
   * Getters
   */
  getModuleName(): string {
    return this.moduleName;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Configuration methods
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  addOutput(output: LogOutput): void {
    this.outputs.push(output);
  }

  removeOutput(output: LogOutput): void {
    const index = this.outputs.indexOf(output);
    if (index > -1) {
      this.outputs.splice(index, 1);
    }
  }

  /**
   * Logging methods
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Performance timing method
   */
  timing(message: string, startTime: number, context?: Record<string, any>): void {
    const durationMs = Math.max(0, Date.now() - startTime);
    const timingContext = {
      ...context,
      durationMs
    };
    this.info(message, timingContext);
  }

  /**
   * Flush all outputs
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.outputs.map(async (output) => {
        try {
          if (output.flush) {
            await output.flush();
          }
        } catch (error) {
          // Handle flush errors gracefully
        }
      })
    );
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level < this.level) {
      return; // Skip logging if below configured level
    }

    const entry: LogEntry = {
      level,
      message,
      module: this.moduleName,
      timestamp: new Date(),
      context
    };

    // Write to all outputs
    this.outputs.forEach(output => {
      try {
        const result = output.write(entry);
        // Handle async outputs
        if (result instanceof Promise) {
          result.catch(() => {
            // Silently handle async write errors
          });
        }
      } catch (error) {
        // Silently handle sync write errors
      }
    });
  }
}