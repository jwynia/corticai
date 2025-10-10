# Implementation Guide: Secure Kuzu Parameterized Queries

## Classification
- **Domain:** Practical/Implementation
- **Stability:** Semi-stable (evolves with best practices)
- **Abstraction:** Structural
- **Confidence:** High (based on production implementation)

---

## Quick Start Paths

### For Beginners

**1. Start with: Basic Parameterized Query**
```typescript
import { Connection } from 'kuzu'

// STEP 1: Write query with $parameters
const query = 'MATCH (n:Entity {id: $nodeId}) RETURN n'

// STEP 2: Create parameter object
const parameters = { nodeId: 'entity_123' }

// STEP 3: Execute with parameters
const result = await connection.query(query, parameters)
```

**2. Key concepts to understand:**
- `$parameterName` syntax marks parameters
- Parameters are passed as separate object
- Parameters can be string, number, boolean, or null
- Parameters are type-safe

**3. First practical step:**
Replace this UNSAFE pattern:
```typescript
// ❌ UNSAFE - Injection vulnerable
const query = `MATCH (n {id: '${userId}'}) RETURN n`
```

With this SAFE pattern:
```typescript
// ✅ SAFE - Injection proof
const query = 'MATCH (n {id: $userId}) RETURN n'
const result = await connection.query(query, { userId })
```

**4. Common mistakes to avoid:**
- ❌ Don't use parameters for node labels: `MATCH (n:$label)` - Won't work
- ❌ Don't use parameters for path depth: `*1..$depth` - Not supported
- ❌ Don't concatenate strings with parameters - Defeats the purpose
- ✅ DO validate inputs before using as literals
- ✅ DO use parameters for ALL data values

---

### For Practitioners

#### Assessment Checklist: Is Your Implementation Secure?

**Current State Evaluation:**
- [ ] All user inputs use parameterization (not string concatenation)
- [ ] Validation exists for any literal insertions (path depth, limits)
- [ ] Input validation includes type checking, not just sanitization
- [ ] Error messages don't leak query structure or sensitive data
- [ ] Security tests cover injection attempts
- [ ] Code review process checks for concatenation patterns

**Improvement Opportunities:**
- [ ] Replace escape functions with parameters
- [ ] Add validation for structural elements (depth, types)
- [ ] Implement query execution monitoring
- [ ] Add security-focused integration tests
- [ ] Document security patterns for team

#### Advanced Techniques

**1. Secure Query Builder Pattern**
```typescript
class SecureQueryBuilder {
  private connection: Connection

  // Encapsulate parameter handling
  async getEntity(id: string): Promise<Entity | null> {
    const query = 'MATCH (e:Entity {id: $id}) RETURN e'
    const result = await this.connection.query(query, { id })
    return this.parseEntity(result)
  }

  // Handle complex queries safely
  async findConnected(nodeId: string, depth: number): Promise<Entity[]> {
    // Validate structural elements
    this.validateDepth(depth)

    // Use parameter for data, validated literal for structure
    const query = `
      MATCH (source:Entity {id: $nodeId})-[*1..${depth}]-(connected:Entity)
      WHERE connected.id <> $nodeId
      RETURN DISTINCT connected
    `
    const result = await this.connection.query(query, { nodeId })
    return this.parseEntities(result)
  }

  private validateDepth(depth: number): void {
    if (!Number.isInteger(depth) || depth < 1 || depth > 50) {
      throw new ValidationError('Invalid depth parameter')
    }
  }
}
```

**2. Validation-First Approach**
```typescript
// Define strict validation rules
const ValidationRules = {
  depth: {
    type: 'integer',
    min: 1,
    max: 50,
    required: true
  },
  nodeId: {
    type: 'string',
    pattern: /^[a-zA-Z0-9_-]+$/,
    maxLength: 100,
    required: true
  },
  nodeType: {
    type: 'string',
    allowlist: ['Entity', 'User', 'Document', 'Concept'],
    required: true
  }
}

function validate(value: any, rules: ValidationRule): void {
  // Type check
  if (typeof value !== rules.type) {
    throw new ValidationError(`Expected ${rules.type}, got ${typeof value}`)
  }

  // Range check (for numbers)
  if (rules.min !== undefined && value < rules.min) {
    throw new ValidationError(`Value ${value} below minimum ${rules.min}`)
  }

  if (rules.max !== undefined && value > rules.max) {
    throw new ValidationError(`Value ${value} exceeds maximum ${rules.max}`)
  }

  // Pattern check (for strings)
  if (rules.pattern && !rules.pattern.test(value)) {
    throw new ValidationError(`Value doesn't match pattern ${rules.pattern}`)
  }

  // Allowlist check
  if (rules.allowlist && !rules.allowlist.includes(value)) {
    throw new ValidationError(`Value not in allowlist`)
  }
}

// Use in query building
function buildTraversalQuery(nodeId: string, depth: number) {
  validate(nodeId, ValidationRules.nodeId)
  validate(depth, ValidationRules.depth)

  // Safe to use - fully validated
  return `MATCH (n:Entity {id: $nodeId})-[*1..${depth}]-(m) RETURN m`
}
```

**3. Measurement Approaches**
```typescript
// Track query performance and security
class QueryMonitor {
  private metrics: QueryMetric[] = []

  async executeSecure(query: string, params: object): Promise<Result> {
    const startTime = Date.now()

    try {
      // Validate parameters
      this.validateParameters(params)

      // Execute query
      const result = await this.connection.query(query, params)

      // Record success metrics
      this.recordMetric({
        query,
        paramCount: Object.keys(params).length,
        executionTime: Date.now() - startTime,
        status: 'success'
      })

      return result
    } catch (error) {
      // Record failure (potential security issue)
      this.recordMetric({
        query,
        paramCount: Object.keys(params).length,
        executionTime: Date.now() - startTime,
        status: 'error',
        error: error.message
      })

      throw error
    }
  }

  private validateParameters(params: object): void {
    for (const [key, value] of Object.entries(params)) {
      // Check for suspicious patterns
      if (typeof value === 'string') {
        if (this.containsSuspiciousPatterns(value)) {
          console.warn(`Suspicious pattern detected in parameter ${key}`)
          // Could throw error, log to security system, etc.
        }
      }
    }
  }

  private containsSuspiciousPatterns(value: string): boolean {
    const suspiciousPatterns = [
      /MATCH.*DELETE/i,
      /DROP\s+TABLE/i,
      /;\s*--/,
      /\/\*.*\*\//,
      /<script>/i
    ]
    return suspiciousPatterns.some(pattern => pattern.test(value))
  }

  // Analytics
  getSecurityMetrics(): SecurityMetrics {
    return {
      totalQueries: this.metrics.length,
      failedQueries: this.metrics.filter(m => m.status === 'error').length,
      averageParamCount: this.metrics.reduce((sum, m) => sum + m.paramCount, 0) / this.metrics.length,
      suspiciousAttempts: this.metrics.filter(m => m.suspiciousPattern).length
    }
  }
}
```

---

## Implementation Patterns

### Pattern 1: Simple Data Query

**Context:** Retrieving entities by known identifiers

**Solution:**
```typescript
interface EntityQuery {
  statement: string
  parameters: Record<string, any>
}

function buildEntityQuery(entityId: string): EntityQuery {
  return {
    statement: 'MATCH (e:Entity {id: $entityId}) RETURN e',
    parameters: { entityId }
  }
}

// Usage
const query = buildEntityQuery('entity_123')
const result = await connection.query(query.statement, query.parameters)
```

**Consequences:**
- ✅ Injection-proof
- ✅ Type-safe
- ✅ Reusable query plan
- ⚠️ Simple pattern, may not scale to complex queries

---

### Pattern 2: Dynamic Filtering

**Context:** User-driven filters on entity properties

**Solution:**
```typescript
interface FilterOptions {
  type?: string
  minAge?: number
  tags?: string[]
}

function buildFilteredQuery(filters: FilterOptions): EntityQuery {
  const conditions: string[] = []
  const parameters: Record<string, any> = {}

  // Build WHERE clauses dynamically but safely
  if (filters.type) {
    conditions.push('e.type = $type')
    parameters.type = filters.type
  }

  if (filters.minAge !== undefined) {
    conditions.push('e.age >= $minAge')
    parameters.minAge = filters.minAge
  }

  if (filters.tags && filters.tags.length > 0) {
    // Handle array parameters
    conditions.push('ANY(tag IN $tags WHERE tag IN e.tags)')
    parameters.tags = filters.tags
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : ''

  return {
    statement: `MATCH (e:Entity) ${whereClause} RETURN e`,
    parameters
  }
}

// Usage
const query = buildFilteredQuery({
  type: 'Document',
  minAge: 30,
  tags: ['important', 'reviewed']
})
```

**Consequences:**
- ✅ Flexible filtering
- ✅ All user input parameterized
- ✅ Maintainable
- ⚠️ Query plan varies with filter combinations

---

### Pattern 3: Graph Traversal with Validation

**Context:** Traversing relationships with variable depth

**Solution:**
```typescript
interface TraversalQuery {
  statement: string
  parameters: Record<string, any>
}

function buildTraversalQuery(
  startNodeId: string,
  maxDepth: number,
  edgeTypes?: string[]
): TraversalQuery {
  // CRITICAL: Validate depth before using as literal
  if (!Number.isInteger(maxDepth)) {
    throw new ValidationError('Depth must be an integer')
  }
  if (maxDepth < 1 || maxDepth > 50) {
    throw new ValidationError('Depth must be between 1 and 50')
  }

  // Safe to use validated depth as literal
  const statement = `
    MATCH path = (start:Entity {id: $startNodeId})
                  -[r:Relationship*1..${maxDepth}]->
                  (end:Entity)
    RETURN path
  `

  return {
    statement,
    parameters: { startNodeId }
  }
}

// Usage with explicit validation
try {
  const query = buildTraversalQuery('node_1', 5, ['RELATED_TO'])
  const result = await connection.query(query.statement, query.parameters)
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle invalid input gracefully
    console.error('Invalid traversal parameters:', error.message)
  } else {
    throw error
  }
}
```

**Consequences:**
- ✅ Secure despite using literal
- ✅ Clear error handling
- ✅ Documents limitation inline
- ⚠️ Can't reuse query plan for different depths

---

### Pattern 4: Batch Operations

**Context:** Multiple entities to insert/update

**Solution:**
```typescript
async function batchInsertEntities(entities: Entity[]): Promise<void> {
  // Use UNWIND for efficient batching
  const statement = `
    UNWIND $entities AS entity
    MERGE (e:Entity {id: entity.id})
    SET e.type = entity.type,
        e.data = entity.data,
        e.updatedAt = timestamp()
  `

  const parameters = {
    entities: entities.map(e => ({
      id: e.id,
      type: e.type,
      data: JSON.stringify(e.properties)
    }))
  }

  await connection.query(statement, parameters)
}

// Usage
const entities = [
  { id: 'e1', type: 'Doc', properties: { title: 'A' } },
  { id: 'e2', type: 'Doc', properties: { title: 'B' } }
]
await batchInsertEntities(entities)
```

**Consequences:**
- ✅ Efficient batching
- ✅ All data parameterized
- ✅ Single transaction
- ✅ Reduced network overhead

---

### Pattern 5: Prepared Statement Reuse

**Context:** Repeatedly executing same query with different values

**Solution:**
```typescript
class PreparedQueries {
  private connection: Connection
  private preparedStatements = new Map<string, PreparedStatement>()

  async prepare(name: string, statement: string): Promise<void> {
    const prepared = await this.connection.prepare(statement)
    if (!prepared.isSuccess()) {
      throw new Error(`Failed to prepare ${name}: ${prepared.getErrorMessage()}`)
    }
    this.preparedStatements.set(name, prepared)
  }

  async execute(name: string, parameters: Record<string, any>): Promise<any> {
    const prepared = this.preparedStatements.get(name)
    if (!prepared) {
      throw new Error(`No prepared statement named ${name}`)
    }
    return await this.connection.execute(prepared, parameters)
  }
}

// Setup
const queries = new PreparedQueries(connection)
await queries.prepare('getEntity', 'MATCH (e:Entity {id: $id}) RETURN e')

// Reuse efficiently
const result1 = await queries.execute('getEntity', { id: 'e1' })
const result2 = await queries.execute('getEntity', { id: 'e2' })
const result3 = await queries.execute('getEntity', { id: 'e3' })
```

**Consequences:**
- ✅ Maximum performance (plan reuse)
- ✅ Type-safe execution
- ✅ Centralized query management
- ⚠️ Memory overhead for stored statements

---

## Decision Framework

### When to Use Parameterization
```
IF value is user-provided data THEN
  ✅ USE parameter
ELSE IF value is from database THEN
  ✅ USE parameter
ELSE IF value is computed/derived THEN
  ✅ USE parameter
ELSE IF value affects query structure THEN
  IF value can be from allowlist THEN
    ✅ VALIDATE against allowlist, use literal
  ELSE IF value is numeric range THEN
    ✅ VALIDATE strictly, use literal
  ELSE
    ❌ REDESIGN - find parameterizable approach
  END IF
ELSE
  ✅ DEFAULT to parameter (safer)
END IF
```

### Validation Checklist
```
FOR EACH literal value in query:
  1. ✅ Is it strictly validated (type, range, pattern)?
  2. ✅ Could it be from an allowlist instead?
  3. ✅ Is validation failure handled gracefully?
  4. ✅ Is there documentation explaining why it's literal?
  5. ✅ Are there tests covering boundary cases?
  IF any NO THEN
    🔴 REFACTOR before deployment
  END IF
END FOR
```

---

## Resource Requirements

### Knowledge Prerequisites
- **Essential:**
  - Basic Cypher query syntax
  - Understanding of SQL injection principles
  - TypeScript/JavaScript fundamentals

- **Helpful:**
  - Graph database concepts (nodes, edges, paths)
  - Prepared statement concepts from SQL
  - Security testing basics

### Technical Requirements
- **Required:**
  - Kuzu 0.11.2 or later
  - TypeScript 4.5+ (for type safety)
  - Node.js 16+ (for Kuzu bindings)

- **Optional:**
  - Testing framework (Vitest, Jest)
  - Linting tools (ESLint with security rules)
  - Query monitoring tools

### Time Investment
- **Basic Implementation:** 2-4 hours
  - Convert existing queries to parameterized
  - Add basic validation

- **Production-Ready:** 1-2 days
  - Comprehensive validation layer
  - Security test suite
  - Query monitoring
  - Documentation

- **Expert Level:** 1 week
  - Advanced patterns (batch, prepared statements)
  - Performance optimization
  - Security hardening
  - Team training

---

## Skill Development

### Learning Path

**Level 1: Beginner (1-2 days)**
1. Read Kuzu parameterization docs
2. Convert 5 simple queries to use parameters
3. Write basic validation functions
4. Run security tests

**Level 2: Intermediate (1 week)**
1. Implement query builder class
2. Add comprehensive validation
3. Handle edge cases (arrays, nulls)
4. Create test suite

**Level 3: Advanced (2-3 weeks)**
1. Implement prepared statement management
2. Add query performance monitoring
3. Optimize batch operations
4. Security audit and hardening

**Level 4: Expert (1-2 months)**
1. Architect secure query framework
2. Implement defense in depth
3. Train team on patterns
4. Contribute security patterns to project

---

## Common Pitfalls and Solutions

### Pitfall 1: Over-Reliance on Escape Functions

**Problem:**
```typescript
// ❌ FRAGILE - Escape function may have bugs
function escapeString(str: string): string {
  return str.replace(/'/g, "\\'")
}

const query = `MATCH (n {name: '${escapeString(userName)}'}) RETURN n`
```

**Solution:**
```typescript
// ✅ SECURE - Use parameters
const query = 'MATCH (n {name: $userName}) RETURN n'
const result = await connection.query(query, { userName })
```

**Why It Matters:** Escape functions can miss edge cases (Unicode, encoding issues, new syntax). Parameters are injection-proof by design.

---

### Pitfall 2: Partial Parameterization

**Problem:**
```typescript
// ❌ INCONSISTENT - Mixed approach without clear policy
const query = `MATCH (n:${nodeType}) WHERE n.id = $nodeId RETURN n`
```

**Solution:**
```typescript
// ✅ CONSISTENT - Clear rules for each element
// Validate structural element
if (!ALLOWED_NODE_TYPES.includes(nodeType)) {
  throw new ValidationError('Invalid node type')
}

// Parameterize data element
const query = `MATCH (n:${nodeType}) WHERE n.id = $nodeId RETURN n`
const result = await connection.query(query, { nodeId })
```

**Why It Matters:** Inconsistent patterns are hard to audit and maintain. Clear rules prevent mistakes.

---

### Pitfall 3: Insufficient Validation

**Problem:**
```typescript
// ❌ WEAK - Only checks for quotes
function validate(depth: number): void {
  if (String(depth).includes("'")) {
    throw new Error('Invalid depth')
  }
}
```

**Solution:**
```typescript
// ✅ STRONG - Multiple validation layers
function validate(depth: number): void {
  // Type check
  if (typeof depth !== 'number') {
    throw new ValidationError('Depth must be a number')
  }

  // Integer check
  if (!Number.isInteger(depth)) {
    throw new ValidationError('Depth must be an integer')
  }

  // Range check
  if (depth < 1 || depth > 50) {
    throw new ValidationError('Depth must be between 1 and 50')
  }

  // Safety check
  if (!Number.isSafeInteger(depth)) {
    throw new ValidationError('Depth exceeds safe integer range')
  }
}
```

**Why It Matters:** Weak validation can be bypassed. Multiple layers catch different attack vectors.

---

### Pitfall 4: Information Leakage in Errors

**Problem:**
```typescript
// ❌ LEAKY - Exposes query structure
catch (error) {
  throw new Error(`Query failed: ${query} with params ${JSON.stringify(params)}`)
}
```

**Solution:**
```typescript
// ✅ SAFE - Minimal information
catch (error) {
  // Log full details securely
  logger.error('Query execution failed', { query, params, error })

  // Return sanitized error to user
  throw new Error('Database query failed. Please try again.')
}
```

**Why It Matters:** Error messages can reveal schema, query patterns, and attack surface.

---

### Pitfall 5: Ignoring Type Safety

**Problem:**
```typescript
// ❌ UNSAFE - No type checking
function buildQuery(params: any): string {
  return `MATCH (n {id: $id}) WHERE n.age > $age RETURN n`
}
```

**Solution:**
```typescript
// ✅ TYPE-SAFE - Explicit parameter interface
interface QueryParams {
  id: string
  age: number
}

function buildQuery(params: QueryParams): EntityQuery {
  // TypeScript ensures correct types
  return {
    statement: 'MATCH (n {id: $id}) WHERE n.age > $age RETURN n',
    parameters: params
  }
}
```

**Why It Matters:** Type safety catches errors at compile time, before production.

---

## Testing Strategy

### Unit Tests

```typescript
describe('Secure Query Builder', () => {
  describe('Parameterization', () => {
    it('should use parameters for data values', () => {
      const query = buildEntityQuery('test_id')
      expect(query.statement).toContain('$id')
      expect(query.parameters.id).toBe('test_id')
    })

    it('should not concatenate user input', () => {
      const query = buildEntityQuery("test'; DROP TABLE Entity; --")
      expect(query.statement).not.toContain('DROP')
      expect(query.parameters.id).toBe("test'; DROP TABLE Entity; --")
    })
  })

  describe('Validation', () => {
    it('should reject invalid depth', () => {
      expect(() => buildTraversalQuery('node1', -1)).toThrow(ValidationError)
      expect(() => buildTraversalQuery('node1', 0)).toThrow(ValidationError)
      expect(() => buildTraversalQuery('node1', 100)).toThrow(ValidationError)
    })

    it('should reject non-integer depth', () => {
      expect(() => buildTraversalQuery('node1', 3.14)).toThrow(ValidationError)
      expect(() => buildTraversalQuery('node1', NaN)).toThrow(ValidationError)
    })

    it('should accept valid depth', () => {
      expect(() => buildTraversalQuery('node1', 5)).not.toThrow()
    })
  })
})
```

### Integration Tests

```typescript
describe('Injection Protection', () => {
  it('should block SQL injection attempts', async () => {
    const maliciousId = "'; DROP TABLE Entity; --"

    // Should not drop table
    const result = await queryBuilder.getEntity(maliciousId)

    // Table should still exist
    const tableCheck = await connection.query('MATCH (e:Entity) RETURN count(e)')
    expect(tableCheck).toBeDefined()
  })

  it('should handle Unicode exploits', async () => {
    const unicodeExploit = "test\u0027; DROP TABLE Entity; --"

    const result = await queryBuilder.getEntity(unicodeExploit)

    // Should treat as literal string, not execute
    expect(result).toBeNull() // Not found (good)
  })

  it('should block comment injection', async () => {
    const commentInjection = "valid' /* inject */ --"

    const result = await queryBuilder.getEntity(commentInjection)

    // Should search for literal string, not interpret comment
    expect(result).toBeNull()
  })
})
```

### Security Tests

```typescript
describe('Security Hardening', () => {
  it('should not leak query structure in errors', async () => {
    try {
      await connection.query('INVALID QUERY', {})
      fail('Should have thrown error')
    } catch (error) {
      // Error message should not expose full query
      expect(error.message).not.toContain('INVALID QUERY')
      expect(error.message).toMatch(/query failed|database error/i)
    }
  })

  it('should validate all parameters', async () => {
    const invalidParams = {
      depth: 'not a number',
      id: { malicious: 'object' }
    }

    expect(() => validateParameters(invalidParams)).toThrow(ValidationError)
  })

  it('should enforce parameter limits', async () => {
    const hugeString = 'x'.repeat(1000000)

    expect(() => {
      queryBuilder.getEntity(hugeString)
    }).toThrow(/exceeds maximum length/)
  })
})
```

---

## Migration Guide

### Migrating from String Concatenation

**Step 1: Inventory (1-2 hours)**
```bash
# Find all string concatenation patterns
grep -rn "query.*\${" app/src/
grep -rn 'query.*\`' app/src/
```

**Step 2: Categorize (2-4 hours)**
- Data values → Easy (use parameters)
- Structural elements → Medium (validate + literal)
- Complex dynamic → Hard (may need redesign)

**Step 3: Convert (varies)**
```typescript
// BEFORE
const query = `MATCH (n:Entity {id: '${userId}'}) RETURN n`

// AFTER
const query = 'MATCH (n:Entity {id: $userId}) RETURN n'
const result = await connection.query(query, { userId })
```

**Step 4: Test (1-2 days)**
- Add security test suite
- Run injection attempt tests
- Validate all edge cases

**Step 5: Deploy (with monitoring)**
- Deploy to staging first
- Monitor for query failures
- Watch for performance regressions
- Gradual rollout to production

---

## Production Checklist

### Before Deployment
- [ ] All user inputs use parameterization
- [ ] Structural elements have strict validation
- [ ] Error messages don't leak information
- [ ] Security tests cover injection attempts
- [ ] Performance tests show acceptable overhead
- [ ] Code review completed
- [ ] Documentation updated

### Monitoring
- [ ] Query execution time tracking
- [ ] Failed query logging
- [ ] Suspicious pattern detection
- [ ] Parameter validation failure alerts
- [ ] Regular security audits scheduled

### Maintenance
- [ ] Regular dependency updates
- [ ] Stay informed on Kuzu security advisories
- [ ] Quarterly security reviews
- [ ] Team training on secure patterns
- [ ] Incident response plan documented

---

## Related Resources

### Official Documentation
- [Kuzu Prepared Statements](https://docs.kuzudb.com/get-started/prepared-statements/)
- [openCypher Specification](https://s3.amazonaws.com/artifacts.opencypher.org/openCypher9.pdf)
- [Neo4j Cypher Injection KB](https://neo4j.com/developer/kb/protecting-against-cypher-injection/)

### CorticAI Implementation
- **Implementation:** `app/src/storage/adapters/KuzuSecureQueryBuilder.ts`
- **Tests:** `app/src/storage/adapters/KuzuStorageAdapter.security.test.ts`
- **Usage:** `app/src/storage/adapters/KuzuStorageAdapter.ts`

### Security Resources
- OWASP SQL Injection Prevention Cheat Sheet
- Pentester Land Cypher Injection Cheat Sheet
- CVE-2024-8309 (LangChain GraphCypherQAChain)

---

## Support and Questions

### Common Questions

**Q: Can I parameterize variable-length path depths?**
A: No, this is not supported by openCypher standard. Use validated literals instead.

**Q: Are parameters slower than literals?**
A: No, parameters are typically faster due to query plan reuse.

**Q: How do I handle array parameters?**
A: Pass arrays directly: `{ ids: ['a', 'b', 'c'] }` and use in query: `WHERE n.id IN $ids`

**Q: Can I use parameters for node labels?**
A: Not in standard openCypher. Use validated literals from an allowlist.

**Q: What about NULL values?**
A: Fully supported: `{ value: null }` works correctly in queries.

### Getting Help

**Project-Specific:**
- Review implementation: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts`
- Check tests: Look for examples in test files
- Ask team: Reference this guide in discussions

**External:**
- Kuzu GitHub Issues: Report bugs or ask questions
- Kuzu Documentation: Official guides and examples
- Stack Overflow: Tag with `kuzu` and `graph-database`

---

## Metadata

- **Guide Version:** 1.0
- **Last Updated:** 2025-10-10
- **Kuzu Version:** 0.11.2
- **Maintainer:** CorticAI Team
- **Status:** Production-Ready
