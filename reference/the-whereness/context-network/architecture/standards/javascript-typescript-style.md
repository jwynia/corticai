# JavaScript/TypeScript Style Guide

*Integrated from inbox: 2025-09-23*

## Purpose

This document establishes coding standards and best practices for JavaScript and TypeScript development in The Whereness Project. All code should follow these guidelines to maintain consistency, readability, and quality.

## Applies To

- `**/*.js` - JavaScript files
- `**/*.jsx` - React JavaScript files
- `**/*.ts` - TypeScript files
- `**/*.tsx` - React TypeScript files

## Core Philosophy

Act as a top-tier software engineer with serious JavaScript/TypeScript discipline to carefully implement high quality software.

### Before Writing Code

1. Read the lint and formatting rules
2. Observe the project's relevant existing code
3. Conform to existing code style, patterns, and conventions
4. These guidelines override project conventions unless user explicitly states otherwise

## Coding Constraints

### General Principles
- **Be concise** - Omit needless code and variables
- **Functional programming** - Keep functions short, pure, and composable
- **One job per function** - Separate mapping from IO
- **Keep related code together** - Group by feature, not by technical type
- **Positive form** - Put statements and expressions in positive form
- **Parallel concepts** - Use parallel code for parallel concepts

### Code Structure
```typescript
// ✅ Good: Feature-grouped, concise, functional
const processVenues = (venues: Venue[]) =>
  venues
    .filter(isOpen)
    .map(addDistanceInfo)
    .sort(byDistance);

// ❌ Bad: Verbose, imperative, technical grouping
function processVenueList(venueArray: Venue[]) {
  const openVenues = [];
  for (let i = 0; i < venueArray.length; i++) {
    if (venueArray[i].isOpen === true) {
      openVenues.push(venueArray[i]);
    }
  }
  // ... more imperative code
}
```

### Function Signatures
- **Explicit parameter naming** - Function callers should understand expected signature
- **Default values in signatures** - Provide type hints and reasonable defaults
- **Options objects** - Avoid null/undefined arguments

```typescript
// ✅ Good: Clear signature with defaults
const createVenue = ({
  id = generateId(),
  name = '',
  category = 'unknown',
  address = { street: '', city: '', state: '' }
} = {}) => ({ id, name, category, address });

// ❌ Bad: Unclear signature
const createVenue = (payload = {}) => ({
  id: payload.id || generateId(),
  name: payload.name || '',
  // ...
});
```

### Modern JavaScript/TypeScript Patterns
- **Concise syntax** - Arrow functions, destructuring, template literals
- **Immutability** - Use const, spread, rest operators instead of mutation
- **Array methods** - Prefer map, filter, reduce over manual loops
- **Async/await** - Prefer over raw promise chains
- **Strict equality** - Use `===` always
- **Chaining** - Chain operations rather than intermediate variables

```typescript
// ✅ Good: Concise, immutable, chained
const processDiscoveries = async (rawData: RawDiscovery[]) => {
  const { validDiscoveries, errors } = await validateDiscoveries(rawData);

  return validDiscoveries
    .filter(({ confidence }) => confidence > 0.7)
    .map(enrichWithMetadata)
    .sort(byRelevanceScore);
};

// ❌ Bad: Verbose, mutable, intermediate variables
const processDiscoveries = async (rawData: RawDiscovery[]) => {
  const validationResult = await validateDiscoveries(rawData);
  const validDiscoveries = validationResult.validDiscoveries;
  const filteredDiscoveries = [];

  for (const discovery of validDiscoveries) {
    if (discovery.confidence > 0.7) {
      filteredDiscoveries.push(discovery);
    }
  }
  // ... more verbose code
};
```

## Naming Conventions

### Functions
- **Use verbs** - `increment()`, `filter()`, `processVenues()`
- **Active voice** - `createUser()` not `User.create()`
- **Avoid "doSomething"** - `notify()` not `Notifier.doNotification()`
- **Standalone verbs** - `createUser()` not `User.create()`

### Booleans and Predicates
- **Yes/no questions** - `isActive`, `hasPermission`, `canEdit`
- **Strong negatives** - `isEmpty(thing)` not `!isDefined(thing)`

### Lifecycle Methods
- **Before/After pattern** - `beforeUpdate()`, `afterValidation()`

### Higher-Order Functions
- **with${Thing} pattern** - `withAuth`, `withValidation`, `withRetry`

```typescript
// ✅ Good naming examples
const isValidVenue = (venue: Venue): boolean => venue.name && venue.address;
const createDiscovery = ({ source, data }: DiscoveryInput) => ({ source, data, timestamp: Date.now() });
const filterOpenVenues = (venues: Venue[]) => venues.filter(isOpen);
const withRetry = (fn: Function, maxAttempts = 3) => async (...args: any[]) => {
  // retry logic
};

// ❌ Bad naming examples
const checkVenueIsValid = (venue: Venue) => venue.name && venue.address;
const Discovery = { create: (input: DiscoveryInput) => ({ ...input, timestamp: Date.now() }) };
const getOpenVenuesFromArray = (venues: Venue[]) => venues.filter(v => v.isOpen);
const RetryDecorator = { doRetry: (fn: Function) => { /* logic */ } };
```

## Anti-Patterns to Avoid

### Classes and Inheritance
- **Avoid `class` and `extends`** - Prefer functional composition
- **No OOP hierarchies** - Use composition and higher-order functions

### Mutation and Loops
- **No manual loops** - Use array methods
- **No mutation** - Use immutable updates with spread operators
- **No `var`** - Use `const` primarily, `let` when reassignment needed

### Complex Procedural Code
- **No loose procedural sequences** - Compose clear pipelines
- **No deeply nested conditions** - Extract to well-named functions
- **No long functions** - Break into smaller, composable pieces

## Project-Specific Applications

### Discovery Queue Scripts
```typescript
// Apply to tools/discovery_queue/*.ts
const processDiscoveryQueue = ({
  city = 'albuquerque',
  batchSize = 10,
  sources = DEFAULT_SOURCES
} = {}) =>
  loadQueueItems(city)
    .then(filterPendingItems)
    .then(takeBatch(batchSize))
    .then(processWithSources(sources))
    .then(saveResults);
```

### MCP Tool Integration
```typescript
// Functional approach to MCP tool calls
const searchLocalBusinesses = async ({
  query,
  location = 'Albuquerque, New Mexico',
  useCache = true
} = {}) => {
  const results = await mcpLocalSearch({ query, location, useCache });
  return results.map(normalizeBusinessData);
};
```

### Data Processing Pipelines
```typescript
// Venue processing example
const processVenueData = (rawVenues: RawVenue[]) =>
  rawVenues
    .filter(hasRequiredFields)
    .map(normalizeAddress)
    .map(addGeocoding)
    .map(enrichWithCategories)
    .filter(meetsQualityThreshold);
```

## Integration Notes

- This style guide takes precedence over existing code patterns when refactoring
- New code must follow these guidelines
- Existing code should be gradually refactored to match these patterns
- Tool scripts in `tools/` directory are primary candidates for style updates
- Discovery and processing scripts should prioritize functional composition

## Enforcement

1. **Code review** - All new TypeScript/JavaScript code reviewed against these standards
2. **Refactoring** - Existing scripts updated incrementally during maintenance
3. **Documentation** - Code comments should explain "why", not "what"
4. **Testing** - Pure functions are easier to test and more reliable

*Last updated: 2025-09-23*