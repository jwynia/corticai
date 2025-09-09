# Logging Abstraction Task

## Priority
Medium

## Source
Code review recommendations - 2025-09-09

## Problem Statement
The storage adapters currently use 37 direct `console.log` statements for debug output. This creates several issues:
- No consistent logging format
- Cannot easily disable/enable logging levels
- Difficult to integrate with production logging systems
- Mixed concerns (storage logic + logging)

## Current State
Debug logging is controlled by `config.debug` boolean flag:
```typescript
if (this.config.debug) {
  console.log(`[JSONStorage${this.config.id ? `:${this.config.id}` : ''}] Loaded ${this.data.size} items from file`)
}
```

## Proposed Solution

### Option 1: Simple Logger Interface
```typescript
interface Logger {
  debug(message: string, context?: any): void
  info(message: string, context?: any): void
  warn(message: string, context?: any): void
  error(message: string, error?: Error, context?: any): void
}
```

### Option 2: Logging Service with Levels
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LoggingService {
  setLevel(level: LogLevel): void
  log(level: LogLevel, component: string, message: string, context?: any): void
}
```

## Design Considerations
1. Should be injectable via storage config
2. Default to no-op logger for production
3. Support structured logging for observability
4. Consider performance impact of logging calls
5. Allow filtering by component/namespace

## Implementation Steps
1. Design logger interface and levels
2. Create default implementations (console, no-op)
3. Update Storage interface to accept optional logger
4. Refactor all console.log statements
5. Add tests for logging behavior
6. Document logging configuration

## Affected Files
- `/src/storage/adapters/MemoryStorageAdapter.ts`
- `/src/storage/adapters/JSONStorageAdapter.ts`
- `/src/storage/interfaces/Storage.ts`
- Future storage adapters

## Related Tasks
- [[json-storage-refactor]] - Will benefit from logging during refactor
- Performance monitoring - Logging can provide metrics

## Acceptance Criteria
- [ ] All console.log statements replaced
- [ ] Logging can be completely disabled
- [ ] Log levels can be configured
- [ ] No performance regression
- [ ] Tests verify logging behavior