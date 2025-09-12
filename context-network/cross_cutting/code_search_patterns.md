# Code Search Patterns

## Purpose
This document provides a comprehensive library of ast-grep and ripgrep patterns specifically tailored for the CorticAI codebase, enabling rapid code discovery, analysis, and refactoring.

## Classification
- **Domain:** Cross-Cutting
- **Stability:** Evolving
- **Abstraction:** Concrete
- **Confidence:** High

## Pattern Categories

### Storage Layer Patterns

#### Find All Storage Adapters
```bash
# Using ast-grep (structural)
ast-grep run --pattern 'class $NAME extends BaseStorageAdapter' --lang typescript

# Find specific adapter
ast-grep run --pattern 'class DuckDBStorageAdapter' --lang typescript

# Find storage adapter methods
ast-grep run --pattern 'class $_ extends BaseStorageAdapter {
  $$$
  async set($$$) {
    $$$
  }
  $$$
}' --lang typescript
```

#### Storage Configuration
```bash
# Find storage configurations
ast-grep run --pattern 'interface $NAME extends StorageConfig' --lang typescript

# Find storage initialization
ast-grep run --pattern 'new $ADAPTER($CONFIG)' --lang typescript
```

### Query Interface Patterns

#### Query Builder Usage
```bash
# Find query builder instantiation
ast-grep run --pattern 'new QueryBuilder($$$)' --lang typescript

# Find query chain patterns
ast-grep run --pattern '$QUERY.where($$$).select($$$)' --lang typescript

# Find aggregation usage
ast-grep run --pattern '$QUERY.aggregate($$$)' --lang typescript

# Find complex query conditions
ast-grep run --pattern 'condition($FIELD, $OP, $VALUE)' --lang typescript
```

#### Query Executors
```bash
# Find all query executor classes
ast-grep run --pattern 'class $NAME implements QueryExecutor' --lang typescript

# Find executor method implementations
ast-grep run --pattern 'async executeQuery($$$): Promise<QueryResult>' --lang typescript
```

### Entity and Adapter Patterns

#### Entity Structure
```bash
# Find Entity type definitions
ast-grep run --pattern 'interface Entity' --lang typescript

# Find entity creation
ast-grep run --pattern '{ id: $ID, type: $TYPE, content: $CONTENT }' --lang typescript

# Find entity validation
ast-grep run --pattern 'validateEntity($ENTITY)' --lang typescript
```

#### Adapter Patterns
```bash
# Find all adapter classes
ast-grep run --pattern 'class $NAME implements Adapter' --lang typescript

# Find adapt method implementations
ast-grep run --pattern 'adapt($INPUT): Entity[]' --lang typescript

# Find adapter registration
ast-grep run --pattern 'registerAdapter($NAME, $ADAPTER)' --lang typescript
```

### Testing Patterns

#### Test Structure Discovery
```bash
# Find all test suites
ast-grep run --pattern 'describe($NAME, $$$)' --lang typescript tests/

# Find nested test suites
ast-grep run --pattern 'describe($OUTER, () => {
  $$$
  describe($INNER, $$$)
  $$$
})' --lang typescript

# Find test cases
ast-grep run --pattern 'it($DESC, $$$)' --lang typescript

# Find async tests
ast-grep run --pattern 'it($DESC, async () => { $$$ })' --lang typescript
```

#### Test Assertions
```bash
# Find all expectations
ast-grep run --pattern 'expect($VALUE)' --lang typescript

# Find specific assertion types
ast-grep run --pattern 'expect($$$).toBe($$$)' --lang typescript
ast-grep run --pattern 'expect($$$).toEqual($$$)' --lang typescript
ast-grep run --pattern 'expect($$$).toThrow($$$)' --lang typescript

# Find mock usage
ast-grep run --pattern 'vi.mock($$$)' --lang typescript
ast-grep run --pattern 'vi.spyOn($$$)' --lang typescript
```

#### Test Coverage Gaps
```bash
# Find public methods in source
ast-grep run --pattern 'public $METHOD($$$): $RETURN' --lang typescript src/

# Find untested exports
comm -23 \
  <(ast-grep run --pattern 'export function $NAME' --lang typescript src/ | cut -d: -f3 | sort) \
  <(ast-grep run --pattern '$NAME(' --lang typescript tests/ | sort | uniq)
```

### Error Handling Patterns

#### Error Detection
```bash
# Find all error throws
ast-grep run --pattern 'throw new $ERROR($$$)' --lang typescript

# Find StorageError usage
ast-grep run --pattern 'throw new StorageError($MSG, $CODE, $$$)' --lang typescript

# Find try-catch blocks
ast-grep run --pattern 'try {
  $$$
} catch ($ERR) {
  $$$
}' --lang typescript

# Find error handling in async functions
ast-grep run --pattern 'async $FUNC($$$) {
  try {
    $$$
  } catch ($$$) {
    $$$
  }
}' --lang typescript
```

### Performance and Optimization Patterns

#### Performance Bottlenecks
```bash
# Find synchronous file operations
ast-grep run --pattern 'readFileSync($$$)' --lang typescript
ast-grep run --pattern 'writeFileSync($$$)' --lang typescript

# Find potential N+1 queries
ast-grep run --pattern 'for ($VAR of $ARRAY) {
  $$$
  await $QUERY($$$)
  $$$
}' --lang typescript

# Find Date.now() usage (for ID generation task)
ast-grep run --pattern 'Date.now()' --lang typescript

# Find large array operations
ast-grep run --pattern '$ARRAY.map($$$).filter($$$).reduce($$$)' --lang typescript
```

### Documentation Patterns

#### JSDoc Discovery
```bash
# Find documented functions
ast-grep run --pattern '/**
 * $$$
 */
export function $NAME' --lang typescript

# Find undocumented public methods
ast-grep run --pattern 'public $METHOD($$$)' --lang typescript | while read line; do
  file=$(echo $line | cut -d: -f1)
  method=$(echo $line | grep -o 'public [^(]*')
  if ! grep -B3 "$method" "$file" | grep -q "^\s*/\*\*"; then
    echo "$line - UNDOCUMENTED"
  fi
done

# Find @param tags
ast-grep run --pattern '* @param' --lang typescript

# Find @returns tags
ast-grep run --pattern '* @returns' --lang typescript
```

### Refactoring Patterns

#### Code Smell Detection
```bash
# Find large classes (potential split candidates)
for file in $(ast-grep run --pattern 'class $NAME' --lang typescript -l); do
  lines=$(wc -l < "$file")
  if [ $lines -gt 500 ]; then
    echo "$file: $lines lines"
  fi
done

# Find long methods
ast-grep run --pattern 'async $METHOD($$$) {
  $$$
}' --lang typescript | check-method-length

# Find deeply nested code
ast-grep run --pattern 'if ($$$) {
  $$$
  if ($$$) {
    $$$
    if ($$$) {
      $$$
    }
  }
}' --lang typescript
```

#### Consistency Checks
```bash
# Verify all adapters implement required methods
for adapter in $(ast-grep run --pattern 'class $NAME extends BaseStorageAdapter' --lang typescript -l); do
  echo "Checking $adapter"
  ast-grep run --pattern 'async set(' --lang typescript "$adapter" || echo "  Missing: set"
  ast-grep run --pattern 'async get(' --lang typescript "$adapter" || echo "  Missing: get"
  ast-grep run --pattern 'async delete(' --lang typescript "$adapter" || echo "  Missing: delete"
done

# Find inconsistent method signatures
ast-grep run --pattern 'adapt($$$): Entity[]' --lang typescript
ast-grep run --pattern 'adapt($$$): Promise<Entity[]>' --lang typescript
```

### Security Patterns

#### Security Audit
```bash
# Find SQL concatenation (potential injection)
ast-grep run --pattern '$SQL + $VAR' --lang typescript
ast-grep run --pattern '`$$$ ${$VAR} $$$`' --lang typescript | grep -i "select\|insert\|update\|delete"

# Find unvalidated inputs
ast-grep run --pattern 'function $NAME($PARAM) {
  $$$
  $QUERY($PARAM)
  $$$
}' --lang typescript

# Find exposed secrets (should not exist)
rg -i "api[_-]?key|secret|password|token" --type ts
```

## Combining Patterns

### Complex Searches

```bash
# Find all async methods that don't have error handling
ast-grep run --pattern 'async $METHOD($$$) {
  $$$
}' --lang typescript | while read match; do
  if ! echo "$match" | grep -q "try\|catch"; then
    echo "$match - No error handling"
  fi
done

# Find test files missing cleanup
for test in tests/**/*.test.ts; do
  if ast-grep run --pattern 'describe($$$)' --lang typescript "$test" > /dev/null; then
    if ! ast-grep run --pattern 'afterEach($$$)' --lang typescript "$test" > /dev/null; then
      echo "$test - Missing afterEach cleanup"
    fi
  fi
done
```

## Performance Benchmarks

Typical search performance on CorticAI codebase (11,000+ lines):

| Tool | Pattern Type | Time | Accuracy |
|------|-------------|------|----------|
| ast-grep | Class search | <100ms | 100% |
| ast-grep | Method search | <150ms | 100% |
| ast-grep | Complex pattern | <300ms | 100% |
| ripgrep | Text search | <50ms | Variable |
| grep | Text search | <200ms | Variable |

## Best Practices

1. **Use ast-grep for structure**: When searching for code patterns
2. **Use ripgrep for text**: When searching comments, strings, or docs
3. **Combine tools**: Use ast-grep to find files, ripgrep for details
4. **Cache patterns**: Save frequently used patterns as scripts
5. **Test before refactor**: Always dry-run rewrite operations

## Tool Integration

### VS Code Integration
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Find TODOs",
      "type": "shell",
      "command": "ast-grep run --pattern '// TODO: $$$' --lang typescript"
    }
  ]
}
```

### Git Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
# Check for console.log statements
if ast-grep run --pattern 'console.log($$$)' --lang typescript src/; then
  echo "Error: console.log found in source code"
  exit 1
fi
```

## See Also

- `/foundation/development_tools.md` - Tool documentation
- `/processes/testing_strategy.md` - Test pattern usage
- `/processes/code_review_checklist.md` - Review patterns
- [ast-grep Documentation](https://ast-grep.github.io/)