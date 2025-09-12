# Development Tools

## Purpose
This document catalogs the development tools available in the CorticAI project environment, their capabilities, and usage patterns specific to our codebase.

## Classification
- **Domain:** Foundation
- **Stability:** Stable
- **Abstraction:** Concrete
- **Confidence:** High

## Core Development Tools

### ast-grep - AST-Based Code Search and Transformation

**Status**: Installed and configured
**Version**: Latest via npm
**Installation**: Automatic via `.devcontainer/devcontainer.json`

#### What is ast-grep?

ast-grep is a powerful tool that searches, lints, and rewrites code using Abstract Syntax Tree (AST) patterns rather than text patterns. This makes it significantly more accurate than traditional grep for code-specific searches.

#### Key Capabilities

1. **Precise Code Search**: Find code patterns based on syntax structure, not text
2. **Batch Refactoring**: Apply consistent transformations across the entire codebase
3. **Custom Linting**: Define project-specific code quality rules
4. **Language-Aware**: Full TypeScript/JavaScript AST understanding

#### Why ast-grep for CorticAI?

With 11,000+ lines of TypeScript code across multiple architectural layers (adapters, storage, queries, analyzers), ast-grep provides:

- **Instant pattern discovery** across all components
- **Structural search** that understands TypeScript syntax
- **Refactoring safety** through AST-aware transformations
- **Test gap identification** by finding untested public methods
- **Consistency enforcement** across adapter implementations

### Common ast-grep Patterns for CorticAI

#### Finding Components

```bash
# Find all storage adapter classes
ast-grep run --pattern 'class $NAME extends BaseStorageAdapter' --lang typescript

# Find all test suites
ast-grep run --pattern 'describe($DESC, $$$)' --lang typescript

# Find all async methods
ast-grep run --pattern 'async $METHOD($$$)' --lang typescript

# Find all exported interfaces
ast-grep run --pattern 'export interface $NAME' --lang typescript

# Find all Entity type usages
ast-grep run --pattern 'Entity' --lang typescript

# Find all error handling
ast-grep run --pattern 'throw new $ERROR($$$)' --lang typescript
```

#### Analyzing Code Structure

```bash
# Find methods with specific return types
ast-grep run --pattern 'async $METHOD($$$): Promise<$TYPE>' --lang typescript

# Find all class constructors
ast-grep run --pattern 'constructor($$$)' --lang typescript

# Find all private methods
ast-grep run --pattern 'private $METHOD($$$)' --lang typescript

# Find all JSDoc comments
ast-grep run --pattern '/**
 * $$$
 */' --lang typescript
```

#### Refactoring Support

```bash
# Find Date.now() usage (for ID generation improvement)
ast-grep run --pattern 'Date.now()' --lang typescript

# Find console.log statements
ast-grep run --pattern 'console.log($$$)' --lang typescript

# Find TODO/FIXME comments (in code, not comment text)
ast-grep run --pattern '// TODO: $$$' --lang typescript
```

### Integration with Project Workflows

#### Test Discovery

Use ast-grep to find gaps in test coverage:

```bash
# Find public methods in src/
ast-grep run --pattern 'public $METHOD($$$)' --lang typescript src/

# Compare with test expectations
ast-grep run --pattern 'expect($$$).$METHOD($$$)' --lang typescript tests/
```

#### Code Quality Checks

```bash
# Find methods exceeding complexity thresholds
ast-grep run --pattern 'async $METHOD($$$) { $$$ }' --lang typescript | check-complexity

# Find missing error handling
ast-grep run --pattern 'async $METHOD($$$)' --lang typescript | verify-try-catch
```

#### Documentation Generation

```bash
# Find all public APIs needing documentation
ast-grep run --pattern 'export class $NAME' --lang typescript
ast-grep run --pattern 'export interface $NAME' --lang typescript
ast-grep run --pattern 'export function $NAME' --lang typescript
```

### Best Practices

1. **Use AST patterns over regex** when searching for code structures
2. **Test patterns in playground** before batch operations: https://ast-grep.github.io/playground.html
3. **Combine with other tools**: ast-grep for structure, ripgrep for text
4. **Version control safety**: Always review ast-grep rewrites before committing
5. **Pattern library**: Build up common patterns for the project

### Advanced Usage

#### Creating Project Rules

Location: `.ast-grep/rules/`

Example rule for ensuring all storage adapters implement required methods:

```yaml
id: storage-adapter-compliance
language: typescript
rule:
  pattern: class $NAME extends BaseStorageAdapter
  has:
    - pattern: async set($$$)
    - pattern: async get($$$)
    - pattern: async delete($$$)
    - pattern: async query($$$)
```

#### Batch Refactoring Example

Replacing Date.now() with crypto.randomUUID():

```bash
ast-grep run --pattern 'Date.now()' --rewrite 'crypto.randomUUID()' --lang typescript
```

### Performance Characteristics

- **Speed**: Processes 10,000+ files in seconds
- **Memory**: Efficient AST caching
- **Accuracy**: 100% syntax-aware (no false positives from comments/strings)
- **Parallelization**: Multi-threaded by default

### Limitations

1. **Pattern complexity**: Very complex patterns may need multiple passes
2. **Cross-file analysis**: Limited to single-file AST analysis
3. **Semantic understanding**: No type inference (syntax only)
4. **Language support**: TypeScript/JavaScript fully supported, other languages vary

### Related Tools

- **ripgrep (rg)**: Fast text search, complements ast-grep
- **TypeScript Compiler API**: For type-aware analysis
- **ESLint**: For enforcing code style rules
- **Vitest**: Test runner integrated with the project

## Tool Maintenance

### Updating ast-grep

ast-grep is automatically installed via npm in the devcontainer:

```json
"postCreateCommand": "sudo npm i -g @anthropic-ai/claude-code && sudo npm i @ast-grep/cli -g"
```

To update manually:
```bash
sudo npm update -g @ast-grep/cli
```

### Configuration Files

- **Global config**: `.ast-grep/sgconfig.yml`
- **Rules directory**: `.ast-grep/rules/`
- **Pattern library**: `.ast-grep/patterns/`

## See Also

- [ast-grep Documentation](https://ast-grep.github.io/)
- [ast-grep Playground](https://ast-grep.github.io/playground.html)
- [TypeScript AST Viewer](https://ts-ast-viewer.com/)
- `/cross_cutting/code_search_patterns.md` - Project-specific search patterns
- `/processes/testing_strategy.md` - Integration with test discovery