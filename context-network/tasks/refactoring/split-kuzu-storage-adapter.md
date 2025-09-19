# Task: Split KuzuStorageAdapter into Smaller Modules

## Priority: MEDIUM

## Context
Code review identified that KuzuStorageAdapter.ts has grown to over 1100 lines, making it difficult to maintain and understand. The file handles multiple responsibilities that should be separated.

## Current Issue
- File size: 1103 lines
- Method count: 34+ methods
- Mixed responsibilities: storage operations, graph operations, query building, helper utilities

## Acceptance Criteria
- [ ] Split KuzuStorageAdapter into 3-4 focused modules
- [ ] Maintain all existing functionality
- [ ] Preserve public API compatibility
- [ ] All existing tests must pass without modification
- [ ] File sizes should be under 500 lines each

## Proposed Structure

### 1. `KuzuStorageAdapter.ts` (Main adapter ~400 lines)
- Constructor and configuration
- Core BaseStorageAdapter implementation
- Public API methods that delegate to other modules
- Database initialization and connection management

### 2. `KuzuGraphOperations.ts` (~300 lines)
- Graph-specific operations (addNode, addEdge, traverse)
- Path finding methods (findConnected, shortestPath)
- Graph traversal logic
- Graph-specific helper methods

### 3. `KuzuStorageOperations.ts` (~200 lines)
- Basic CRUD operations (set, get, delete, clear)
- Entity validation and storage metadata
- Cache management

### 4. `KuzuQueryHelpers.ts` (~200 lines)
- Query building utilities
- Path conversion utilities
- Property parsing and formatting
- String escaping and validation

## Implementation Guide

1. **Create new module files**
   - Start with KuzuQueryHelpers (least dependencies)
   - Move helper methods and utilities
   - Export as classes or utility modules

2. **Extract graph operations**
   - Create KuzuGraphOperations class
   - Move traverse, findConnected, shortestPath
   - Inject dependencies (connection, queryBuilder)

3. **Extract storage operations**
   - Create KuzuStorageOperations class
   - Move CRUD operations
   - Share cache management

4. **Update main adapter**
   - Compose the extracted modules
   - Delegate method calls
   - Maintain backward compatibility

5. **Test incrementally**
   - Run tests after each extraction
   - Ensure no functionality is lost
   - Verify performance is maintained

## Benefits
- Improved maintainability
- Better separation of concerns
- Easier to test individual components
- Clearer code organization
- Easier parallel development

## Risks
- **Medium**: Could introduce subtle bugs if not careful with shared state
- **Mitigation**: Extensive testing after each step

## Dependencies
- Must maintain compatibility with existing code
- Tests should not need modification
- Performance monitoring integration must continue to work

## Effort Estimate
**Large** (4-6 hours)
- Planning and design: 1 hour
- Implementation: 3-4 hours
- Testing and validation: 1 hour

## Related Files
- `/app/src/storage/adapters/KuzuStorageAdapter.ts`
- `/app/src/storage/adapters/KuzuStorageAdapter.test.ts`
- `/app/src/storage/adapters/KuzuSecureQueryBuilder.ts`

## Notes
- This is a pure refactoring task - no functionality changes
- Consider using composition pattern for module integration
- Ensure performance monitoring hooks remain in place
- Document the module boundaries clearly