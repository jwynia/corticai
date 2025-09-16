# KuzuStorageAdapter Key Locations

## Graph Operations

### Core Graph Methods
- **traverse()**: `src/storage/adapters/KuzuStorageAdapter.ts:567-636`
  - Pattern-based graph traversal with direction and depth control
  - Related: [[TraversalPattern]], [[GraphPath]]

- **findConnected()**: `src/storage/adapters/KuzuStorageAdapter.ts:643-694`
  - BFS to find nodes within N hops
  - Related: [[GraphNode]], [[depth-first-search]]

- **shortestPath()**: `src/storage/adapters/KuzuStorageAdapter.ts:700-747`
  - Kuzu SHORTEST algorithm implementation
  - Related: [[path-finding]], [[graph-algorithms]]

## Helper Methods

### Query Building
- **escapeString()**: `src/storage/adapters/KuzuStorageAdapter.ts:761-774`
  - SQL injection prevention via string escaping
  - Critical for security until parameterized queries available

### Result Processing
- **extractProperties()**: `src/storage/adapters/KuzuStorageAdapter.ts:776-792`
  - Parses JSON properties from Kuzu results
  - Handles both string and object formats

- **convertToGraphPath()**: `src/storage/adapters/KuzuStorageAdapter.ts:794-844`
  - Transforms Kuzu RECURSIVE_REL to GraphPath interface
  - Handles _nodes and _rels arrays

## Configuration

### Constants
- **Query Limits**: `src/storage/adapters/KuzuStorageAdapter.ts:40-43`
  - DEFAULT_PATH_LIMIT = 100
  - DEFAULT_CONNECTED_LIMIT = 1000
  - DEFAULT_MAX_TRAVERSAL_DEPTH = 10

### Connection Management
- **Database Init**: `src/storage/adapters/KuzuStorageAdapter.ts:141-167`
  - Creates Database and Connection instances
  - Schema creation on first init

## Schema Definition

### Node Table
- **Entity Table**: `src/storage/adapters/KuzuStorageAdapter.ts:183-188`
  - Fields: id (STRING), type (STRING), data (STRING)
  - Primary key on id

### Relationship Table
- **Relationship Table**: `src/storage/adapters/KuzuStorageAdapter.ts:204-209`
  - FROM Entity TO Entity structure
  - Fields: type (STRING), data (STRING)

## Test Coverage
- **Test File**: `src/storage/adapters/KuzuStorageAdapter.test.ts`
  - Graph operations tests: lines 281-366
  - Connection tests: lines 46-105

## Recent Changes (2025-09-16)
- Replaced mock implementations with real Kuzu queries
- Added input validation for depth parameters
- Extracted magic numbers to constants
- Simplified complex nested ternaries
- Added helper method for property extraction