# Task: Implement Proper Logging System

## Source
Code Review - Medium Priority Issue

## Problem Description
Current codebase uses console.warn/console.log for logging, which is inadequate for production environments. This makes debugging difficult, lacks structured logging, and doesn't support log levels or remote monitoring.

## Current Issues
- **Location**: Throughout codebase, particularly in DatabaseService
- **Example**: `console.warn('Failed to rollback transaction:', rollbackError);`
- **Problems**: No structured format, no log levels, no remote collection

## Acceptance Criteria
- [ ] Logging service implemented with multiple log levels
- [ ] Structured logging format (JSON for production)
- [ ] Console.* calls replaced with proper logger
- [ ] Log levels configurable per environment
- [ ] Performance logging integrated
- [ ] Error context properly captured
- [ ] Sensitive data filtered from logs
- [ ] Remote logging capability (prepare for future)

## Proposed Solution
```javascript
// LoggerService with configurable adapters
class LoggerService {
  constructor(config) {
    this.level = config.logLevel || 'info';
    this.adapters = config.adapters || [new ConsoleAdapter()];
  }

  debug(message, context) { }
  info(message, context) { }
  warn(message, context) { }
  error(message, context, error) { }

  // Performance logging
  time(label) { }
  timeEnd(label) { }
}

// Usage example
logger.error('Transaction failed', {
  operation: 'rollback',
  transactionId: txId,
  duration: endTime - startTime
}, originalError);
```

## Implementation Requirements
1. **Logger Service**:
   - Support debug, info, warn, error, fatal levels
   - Structured context support
   - Performance timing helpers
   - Async logging capability

2. **Adapters**:
   - Console adapter (development)
   - File adapter (debug logs)
   - Remote adapter stub (future: Sentry, LogRocket, etc.)

3. **Security**:
   - Filter sensitive fields (password, key, token, secret)
   - Sanitize user input in logs
   - GDPR compliance considerations

4. **Integration Points**:
   - DatabaseService (all operations)
   - IdentityService (security events)
   - Error handlers (capture stack traces)
   - Performance monitoring points

## Dependencies
- Choose logging library (winston, pino, bunyan, or custom)
- Consider React Native constraints
- Coordinate with error handling system
- Plan for offline log storage

## Risk Level
**Low** - Adding new functionality without breaking changes

## Effort Estimate
**Medium** (4-6 hours)
- Design logging architecture: 1 hour
- Implement LoggerService: 2 hours
- Replace console calls: 1-2 hours
- Testing and validation: 1 hour

## Priority
Medium - Important for production readiness and debugging

## Library Options
1. **Custom Implementation**
   - Pros: Full control, minimal dependencies
   - Cons: More development time

2. **react-native-logs**
   - Pros: React Native specific, good performance
   - Cons: Limited features

3. **Winston + Adapter**
   - Pros: Feature-rich, battle-tested
   - Cons: May need React Native adaptation

## Success Metrics
- Zero console.* calls in production code
- All errors include structured context
- Log levels properly used
- Performance impact < 1ms per log
- Logs useful for debugging production issues

## Related Issues
- Error handling standardization (logs should use error context)
- Performance monitoring (integrate with logging)
- Security audit (ensure no data leakage)

## Notes
- Consider log rotation strategy for mobile storage
- Plan for offline log queue with sync on reconnect
- Add request ID correlation for distributed tracing
- Consider structured logging format (JSON) from start