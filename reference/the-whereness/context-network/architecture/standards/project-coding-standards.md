# Project Coding Standards - The Whereness System

*Created: 2025-09-23*

## Overview

This document establishes comprehensive coding standards for The Whereness Project, ensuring consistency, maintainability, and quality across all code contributions.

## Language-Specific Standards

### JavaScript/TypeScript
- **Primary reference**: [JavaScript/TypeScript Style Guide](./javascript-typescript-style.md)
- **Key principles**: Functional programming, immutability, composition over inheritance
- **File patterns**: `**/*.js`, `**/*.jsx`, `**/*.ts`, `**/*.tsx`

### Shell Scripts
- **Use bash shebang**: `#!/bin/bash`
- **Set strict mode**: `set -e` for error handling
- **Quote variables**: `"$VARIABLE"` to prevent word splitting
- **Use functions**: Break complex scripts into named functions
- **File patterns**: `**/*.sh`

### Python (if used)
- **Follow PEP 8**: Standard Python style guide
- **Use type hints**: For function signatures and complex variables
- **Prefer f-strings**: Over `.format()` or `%` formatting
- **File patterns**: `**/*.py`

## Project-Specific Conventions

### File Organization
```
tools/
├── discovery_queue/       # Discovery and queue management
├── extractors/            # Data extraction tools
├── synthesizers/          # Data synthesis and processing
├── evaluators/            # Quality and validation tools
└── site_builder/          # Static site generation
```

### Naming Conventions

#### Files and Directories
- **Snake case**: `new_business_monitor.ts`, `discovery_queue/`
- **Descriptive names**: `weekly_new_business_update.sh` not `update.sh`
- **Hyphenated for URLs**: `venue-data.json` in public-facing files

#### Functions and Variables
- **Camel case**: `processVenueData`, `discoveryConfig`
- **Verbs for functions**: `createVenue()`, `processDiscoveries()`
- **Nouns for data**: `venueList`, `businessData`

#### Constants
- **UPPER_SNAKE_CASE**: `DEFAULT_CONFIG`, `MAX_RETRIES`
- **Descriptive context**: `DISCOVERY_CONFIDENCE_THRESHOLD` not `THRESHOLD`

### Data Structure Standards

#### JSON Schema Consistency
```typescript
// Standard venue format
interface Venue {
  readonly id: string;           // kebab-case: "abq-venue-name-location"
  readonly name: string;         // Official business name
  readonly address: Address;     // Structured address object
  readonly category: string;     // Primary category
  readonly subcategory?: string; // Optional subcategory
  readonly confidence: number;   // 0.0-1.0 confidence score
  readonly source: string;       // Discovery source
  readonly discovered_at: string; // ISO timestamp
}
```

#### ID Generation Pattern
```typescript
// Format: {city}-{normalized-name}-{location-hint}
const generateVenueId = (name: string, location: string, city = 'abq') =>
  `${city}-${normalize(name)}-${normalize(location)}`;
```

### Error Handling Standards

#### TypeScript/JavaScript
```typescript
// Use Result pattern for operations that can fail
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

const processVenue = async (venue: RawVenue): Promise<Result<ProcessedVenue>> => {
  try {
    const processed = await validateAndEnrich(venue);
    return { success: true, data: processed };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
```

#### Shell Scripts
```bash
# Always check command success
if ! command_that_might_fail; then
    echo "❌ Command failed: command_that_might_fail" >&2
    exit 1
fi

# Use meaningful exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_CONFIG_ERROR=1
readonly EXIT_NETWORK_ERROR=2
```

### Logging and Output Standards

#### Console Output Formatting
```typescript
// Use consistent emoji prefixes for different message types
console.log('🚀 Starting process...');    // Starting operations
console.log('✅ Operation successful');   // Success messages
console.log('📡 Fetching data...');       // Network operations
console.log('📊 Processing results...');  // Data processing
console.log('💾 Saving to file...');      // File operations
console.log('⚠️ Warning: ...');           // Warnings
console.error('❌ Error: ...');           // Errors
```

#### Structured Logging
```typescript
// For complex operations, use structured logging
const logOperation = (operation: string, metadata: Record<string, unknown>) => {
  console.log(`📋 ${operation}:`, JSON.stringify(metadata, null, 2));
};
```

### Testing Standards

#### Unit Tests
- **One test file per module**: `venue_processor.test.ts` for `venue_processor.ts`
- **Descriptive test names**: `should_create_valid_venue_id_from_name_and_location`
- **AAA pattern**: Arrange, Act, Assert

#### Integration Tests
- **Test actual workflows**: End-to-end discovery pipelines
- **Use real data samples**: Sanitized copies of actual API responses
- **Mock external services**: Don't hit real APIs in tests

### Performance Standards

#### Async Operations
```typescript
// Prefer Promise.all for parallel operations
const processMultipleSources = async (sources: Source[]) => {
  const results = await Promise.all(
    sources.map(source => processSource(source))
  );
  return results.flat();
};

// Use rate limiting for external APIs
const withRateLimit = (fn: Function, delayMs: number) => async (...args: any[]) => {
  await delay(delayMs);
  return fn(...args);
};
```

#### Memory Management
- **Stream large datasets**: Don't load everything into memory
- **Clean up resources**: Close file handles and network connections
- **Use readonly types**: Prevent accidental mutations

### Security Standards

#### Data Handling
- **No secrets in code**: Use environment variables
- **Sanitize inputs**: Validate all external data
- **Limit file access**: Use specific paths, not user input

```typescript
// Good: Specific, validated paths
const loadVenueData = (city: string) => {
  const allowedCities = ['albuquerque', 'denver', 'minneapolis'];
  if (!allowedCities.includes(city)) {
    throw new Error(`Invalid city: ${city}`);
  }
  return readFile(`data/${city}/venues.json`);
};
```

#### API Security
```typescript
// Rate limit API calls
const API_RATE_LIMIT = 1000; // ms between calls
let lastApiCall = 0;

const makeApiCall = async (endpoint: string) => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;

  if (timeSinceLastCall < API_RATE_LIMIT) {
    await delay(API_RATE_LIMIT - timeSinceLastCall);
  }

  lastApiCall = Date.now();
  return fetch(endpoint);
};
```

## Documentation Standards

### Code Comments
```typescript
// Only comment WHY, not WHAT
const confidence = baseConfidence * 0.8; // Reduce confidence for social media sources

// Document complex business logic
/**
 * Discovery confidence calculation based on source reliability and verification status.
 * Social media sources get reduced confidence due to higher false positive rates.
 * News sources get boosted confidence due to editorial oversight.
 */
const calculateDiscoveryConfidence = (source: Source, verification: Verification) => {
  // Implementation...
};
```

### README Files
- **Purpose**: What the module/tool does
- **Usage**: How to run it with examples
- **Dependencies**: What it requires to function
- **Output**: What it produces and where

### API Documentation
```typescript
/**
 * Discovers new businesses using multiple search sources
 *
 * @param config - Discovery configuration with city, sources, and search parameters
 * @returns Promise resolving to array of discovered businesses
 *
 * @example
 * ```typescript
 * const discoveries = await discoverNewBusinesses({
 *   city: 'albuquerque',
 *   sources: ['google_local', 'news_search'],
 *   days: 7
 * });
 * ```
 */
const discoverNewBusinesses = async (config: DiscoveryConfig): Promise<BusinessDiscovery[]> => {
  // Implementation...
};
```

## Git and Version Control

### Commit Messages
```
feat: Add new business discovery monitoring system
fix: Correct venue ID generation for special characters
docs: Update API documentation for discovery endpoints
refactor: Convert business monitor to functional programming style
test: Add integration tests for Google Local Search
```

### Branch Naming
- **Feature branches**: `feature/new-business-discovery`
- **Bug fixes**: `fix/venue-id-generation`
- **Documentation**: `docs/api-documentation`

### Pull Request Standards
- **Clear description**: What changes and why
- **Test coverage**: Include relevant tests
- **Documentation**: Update docs for API changes
- **Code review**: At least one reviewer for significant changes

## Quality Assurance

### Code Review Checklist
- [ ] Follows language-specific style guide
- [ ] Uses appropriate error handling
- [ ] Includes necessary tests
- [ ] Updates relevant documentation
- [ ] No hardcoded secrets or sensitive data
- [ ] Performance considerations addressed
- [ ] Security implications reviewed

### Automated Checks
- **Linting**: ESLint for TypeScript, shellcheck for bash
- **Type checking**: TypeScript strict mode
- **Testing**: Unit and integration test suites
- **Security**: Dependency vulnerability scanning

## Migration Path

### Existing Code
1. **Prioritize new code**: All new files must follow these standards
2. **Gradual refactoring**: Update existing code during maintenance
3. **Critical paths first**: Focus on frequently modified files
4. **Document exceptions**: Note any legacy code that can't be updated

### Tools Integration
- **IDE configuration**: Share VS Code settings for consistent formatting
- **Pre-commit hooks**: Automatic formatting and linting
- **CI/CD integration**: Automated quality checks on pull requests

## Enforcement

### Team Practices
- **Code reviews**: Mandatory for all changes
- **Pair programming**: For complex features or refactoring
- **Regular retrospectives**: Discuss and improve standards

### Documentation Updates
- **Living document**: Update standards as project evolves
- **Version control**: Track changes to standards over time
- **Team consensus**: Major changes require team discussion

*Last updated: 2025-09-23*