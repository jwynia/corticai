# CorticAI Groomed Backlog

## 📊 Project Status Summary
**Last Groomed**: 2025-10-02
**Build Status**: ✅ All tests passing (95 tests)
**Current Phase**: Foundation Complete - Ready for Domain Value Phase
**Test Suite**: 383 tests total across full system
**Foundation**: ✅ Phases 1-3 complete and exceeded scope
**Next Priority**: Domain versatility and user-facing intelligence features

---

## ✅ Recently Completed

### 1. Make Query Result Limits Configurable ✅ COMPLETE (2025-10-02)
**One-liner**: Add configurable result limits to Kuzu query builder methods
**Complexity**: Trivial
**Effort**: 30 minutes
**Results**: 42 tests added, all passing, 100% backward compatible

<details>
<summary>Implementation Summary</summary>

**Completed**:
- [x] Added `QueryOptions` interface with `resultLimit` parameter
- [x] Added validation for limits (1-10000, integer only)
- [x] Updated all three query methods (traversal, findConnected, shortestPath)
- [x] Used sensible defaults (100, 1000, 1)
- [x] Comprehensive JSDoc documentation
- [x] 42 comprehensive tests, all passing
- [x] Full backward compatibility maintained

**Files Modified**:
- `app/src/storage/adapters/KuzuSecureQueryBuilder.ts`
- `app/src/storage/adapters/KuzuSecureQueryBuilder.configurable-limits.test.ts` (new)

**Test Results**: ✅ 53/53 KuzuSecureQueryBuilder tests passing

**Documentation**: [Task Details](../tasks/tech-debt/configurable-query-limits-COMPLETE.md)

</details>

---

## 🚀 Ready for Implementation

### 1. Improve Type Safety - Fix Type Assertions
**One-liner**: Remove unsafe `as any` type assertions from LocalStorageProvider
**Complexity**: Small
**Priority**: MEDIUM - Code quality for open source
**Files to modify**:
- `app/src/storage/providers/LocalStorageProvider.ts`

<details>
<summary>Full Implementation Details</summary>

**Context**: Multiple `as any` assertions bypass TypeScript type safety in LocalStorageProvider.

**Acceptance Criteria**:
- [ ] Identify all `as any` assertions
- [ ] Replace with proper type guards or interfaces
- [ ] Verify strict TypeScript checks pass
- [ ] Add tests for edge cases
- [ ] Document type assumptions

**Implementation Guide**:
1. Search for `as any` in LocalStorageProvider
2. Determine proper types for each
3. Add type guards where needed
4. Update method signatures
5. Run TypeScript with strict mode

**Watch Out For**: May reveal underlying design issues needing broader fixes

</details>

---

### 2. Improve CosmosDB Partition Key Distribution
**One-liner**: Replace weak hash function with better algorithm and increase partition count
**Complexity**: Small
**Priority**: MEDIUM - Scalability for production use
**Files to modify**:
- `app/src/storage/adapters/CosmosDBStorageAdapter.ts:728`

<details>
<summary>Full Implementation Details</summary>

**Context**: Current hash function uses character sum with only 10 partitions - poor distribution and limited scalability.

**Current Problem**:
```typescript
const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
return `partition_${hash % 10}` // Only 10 partitions, weak distribution
```

**Acceptance Criteria**:
- [ ] Implement proper hash function (djb2 or similar)
- [ ] Increase partition count to 100+
- [ ] Document partitioning strategy
- [ ] Consider making partition count configurable
- [ ] Benchmark distribution on test data

**Watch Out For**: Changing strategy affects data distribution, may need migration

</details>

---

### 3. Add Recursive Depth Limits
**One-liner**: Add configurable depth limits to recursive file system operations
**Complexity**: Trivial
**Priority**: LOW - Safety improvement
**Files to modify**:
- `app/src/storage/providers/LocalStorageProvider.ts`

<details>
<summary>Full Implementation Details</summary>

**Context**: Recursive directory traversal could run indefinitely on circular symlinks or deep structures.

**Acceptance Criteria**:
- [ ] Add `maxDepth` parameter to recursive methods
- [ ] Default to reasonable limit (e.g., 100 levels)
- [ ] Throw descriptive error when limit exceeded
- [ ] Add tests for depth limit enforcement

**Implementation Guide**:
1. Add depth tracking parameter to recursive functions
2. Check depth before each recursion
3. Throw error with helpful message when exceeded
4. Make limit configurable via options

**Watch Out For**: Don't break existing legitimate use cases

</details>

---

### 4. Make Entity Types Extensible
**One-liner**: Allow domain adapters to register custom entity types
**Complexity**: Medium
**Priority**: LOW - Future extensibility
**Files to modify**:
- `app/src/storage/interfaces/Storage.ts`
- Domain adapter files

<details>
<summary>Full Implementation Details</summary>

**Context**: Entity types currently hardcoded as string literals, limiting domain adapter flexibility.

**Acceptance Criteria**:
- [ ] Create type registry system
- [ ] Allow runtime type registration
- [ ] Maintain backward compatibility
- [ ] Add validation for custom types
- [ ] Document extension pattern

**Implementation Guide**:
1. Create EntityTypeRegistry class
2. Add registration methods
3. Update type definitions to use registry
4. Create example custom type
5. Document pattern for domain adapters

**Watch Out For**: Type safety implications of runtime registration

</details>

---

## 📝 Domain Value Tasks (User-Facing Features)

### 5. Implement CodebaseAdapter
**One-liner**: Build domain adapter for code repository understanding with AST analysis
**Complexity**: Large
**Priority**: HIGH - Proves cross-domain versatility
**Dependencies**: None (foundation complete)

<details>
<summary>Full Implementation Details</summary>

**Context**: Demonstrate CorticAI's ability to understand code repositories through TypeScript/JavaScript AST analysis, function relationships, and import graphs.

**Acceptance Criteria**:
- [ ] Extract entities: functions, classes, modules, imports
- [ ] Detect relationships: calls, imports, extends, implements
- [ ] Parse TypeScript/JavaScript files with AST
- [ ] Handle both source and test files
- [ ] Integrate with existing TypeScriptDependencyAnalyzer
- [ ] Comprehensive test coverage
- [ ] Document usage patterns

**Implementation Guide**:
1. Create `app/src/adapters/CodebaseAdapter.ts`
2. Leverage existing TypeScriptDependencyAnalyzer
3. Extract AST-based entities (classes, functions, imports)
4. Map relationships (calls, dependencies, inheritance)
5. Add file type detection (source vs test)
6. Build comprehensive test suite
7. Create usage examples

**Files to create**:
- `app/src/adapters/CodebaseAdapter.ts`
- `app/tests/adapters/CodebaseAdapter.test.ts`
- `app/examples/codebase-usage.ts`

**Watch Out For**: Large codebases require efficient AST parsing and caching

</details>

---

### 6. Implement DebugLens
**One-liner**: Create lens that emphasizes debugging-relevant context (errors, stack traces, recent changes)
**Complexity**: Medium
**Priority**: HIGH - Proves lens system value
**Dependencies**: Lens system (complete)

<details>
<summary>Full Implementation Details</summary>

**Context**: When debugging issues, developers need to see error patterns, recent changes, related test failures, and dependency chains.

**Acceptance Criteria**:
- [ ] Emphasize entities with error keywords
- [ ] Surface recent file modifications
- [ ] Highlight test failures
- [ ] Show dependency chains to error sources
- [ ] Activation patterns for debug queries
- [ ] Filter out irrelevant stable code
- [ ] Comprehensive test coverage

**Implementation Guide**:
1. Create `app/src/lenses/DebugLens.ts` extending BaseLens
2. Implement activation detection (error keywords, "debug", "why")
3. Add emphasis rules for error-related entities
4. Filter stable, unchanged entities
5. Add relationship emphasis for error propagation
6. Create comprehensive test suite
7. Document activation patterns

**Files to create**:
- `app/src/lenses/DebugLens.ts`
- `app/tests/lenses/DebugLens.test.ts`

**Watch Out For**: Balance between showing context and hiding noise

</details>

---

### 7. Implement DocumentationLens
**One-liner**: Create lens that focuses on documentation, APIs, and public interfaces
**Complexity**: Medium
**Priority**: MEDIUM - Completes lens system proof
**Dependencies**: Lens system (complete)

<details>
<summary>Full Implementation Details</summary>

**Context**: When generating documentation or understanding APIs, emphasize public interfaces, exported functions, JSDoc comments, and readme files.

**Acceptance Criteria**:
- [ ] Emphasize public/exported entities
- [ ] Surface JSDoc and comments
- [ ] Highlight readme and doc files
- [ ] Filter internal implementation details
- [ ] Show API relationships
- [ ] Activation patterns for doc queries
- [ ] Comprehensive test coverage

**Implementation Guide**:
1. Create `app/src/lenses/DocumentationLens.ts`
2. Detect public/exported entities
3. Emphasize documented APIs
4. Filter private implementation
5. Add activation for "document", "API", "public"
6. Create test suite
7. Document usage examples

**Files to create**:
- `app/src/lenses/DocumentationLens.ts`
- `app/tests/lenses/DocumentationLens.test.ts`

</details>

---

## ⏳ Blocked / Deferred

### Azure Cloud Storage Validation (BLOCKED - Requires Azure Access)
**One-liner**: Validate CosmosDB integration with real Azure instance
**Complexity**: Small
**Priority**: MEDIUM - Nice-to-have for cloud deployment
**Blocker**: Requires Azure subscription and credentials
**Status**: CosmosDB adapter 85% complete, all tests passing with mocks

<details>
<summary>Full Implementation Details</summary>

**Context**: CosmosDB implementation complete and fully tested with mocks. Real Azure validation deferred until cloud deployment is needed.

**Completed Work** ✅:
- [x] Implement CosmosDBStorageAdapter with dual-role configuration (700+ lines)
- [x] Create storage provider abstraction (LocalStorageProvider, AzureStorageProvider)
- [x] Environment-based storage provider selection
- [x] Comprehensive test suite (36 tests, all passing with mocks)
- [x] Complete documentation

**Remaining Work** (When Azure access available):
- [ ] Test with real Azure CosmosDB instance
- [ ] Validate performance and RU costs
- [ ] Complete migration utilities
- [ ] Deployment configuration

**Unblocks after**: Azure subscription provisioned (optional for current use)

</details>

---

### Complete CosmosDB Migration Utilities (DEFERRED)
**One-liner**: Build bidirectional migration utilities between local and cloud storage
**Complexity**: Medium
**Priority**: LOW - Only needed for cloud deployment
**Dependencies**: Azure validation
**Status**: Can develop with mocks but validation needs Azure

---

## 🗑️ Archived / Out of Scope

### ~~CorticAI Self-Hosting Validation~~ - DEFERRED
**Reason**: Meta-use causes scope confusion with LLMs
**Alternative**: Validate with real external markdown context networks instead

### ~~Strategic Production Readiness Assessment~~ - NOT RELEVANT
**Reason**: Open source project, not enterprise SaaS product
**Alternative**: Focus on practical utility for personal/day job use

### Advanced Domain Adapter Framework - DEFERRED
**Reason**: Optimize for actual use cases first, then expand
**Future**: Build registry when multiple domains validated in practice

---

## 📊 Technical Debt Registry

### Code Review Findings (2025-10-01)

**Completed** (2025-10-01):
- ✅ **Optimize Relationship Queries** - 2000x performance improvement achieved
  - Result: O(n) → O(degree), 1ms query time for 100 entities
  - Tests: 9/9 passing, 100% coverage

**Medium Priority Remaining**:
- **Improve CosmosDB Partitioning** - Better hash distribution (see task #3)
- **Make Query Limits Configurable** - API flexibility (see task #1)
- **Fix Type Assertions** - Remove unsafe type assertions (see task #2)

**Low Priority**:
- **Add Recursive Depth Limits** - Safety for file operations (see task #4)
- **Make Entity Types Extensible** - Custom type support (see task #5)

### Known Technical Notes

**Edge Type Filtering for Variable-Length Paths**
- **Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:117`
- **Context**: Edge type filtering done in post-processing due to Kuzu 0.6.1 limitations
- **Priority**: MEDIUM - Affects query precision but not blocking
- **Status**: Documented in code (NOTE comment)
- **Future**: Upgrade when Kuzu adds native support

---

## 📈 Summary Statistics

**Last Groomed**: 2025-10-02
- **Total tests**: 425 tests across entire system (383 + 42 new)
- **Build status**: ✅ All passing
- **Recently completed**: 1 task (configurable query limits)
- **Ready now**: 7 tasks (4 quality improvements, 3 domain features)
- **Blocked**: 2 tasks (Azure access required, optional)
- **Deferred**: 3 tasks (out of scope for current phase)
- **Foundation**: ✅ Phases 1-3 complete and exceeded scope
- **Recent wins**:
  - ✅ **Configurable query limits** - 42 tests, 100% backward compatible (Oct 2)
  - Relationship optimization (2000x improvement)
  - CosmosDB test mocking (36/36 passing)
  - Progressive loading system complete
  - Lens system complete

## 🎯 Top 3 Priorities (Domain Value Focus)

1. **Implement CodebaseAdapter** - Prove cross-domain versatility (HIGH priority)
2. **Implement DebugLens** - Prove lens system value (HIGH priority)
3. **Improve Type Safety** - Remove unsafe type assertions (quick win, 30-60 min)

**Strategic Focus**: Shift from infrastructure to user-facing value. Foundation is solid (Phases 1-3 complete). Time to demonstrate practical utility with domain adapters and intelligent lenses.

---

## Context Integration

**Parent Planning**: [planning/index.md](./index.md) - Central planning navigation
**Related Planning**:
- [roadmap.md](./roadmap.md) - Strategic phases
- [implementation-tracker.md](./implementation-tracker.md) - Detailed progress

**Recent Updates**:
- 2025-10-02: **Configurable query limits implemented** - 42 tests, full TDD approach
- 2025-10-02: Major re-grooming - Foundation complete, focus on domain value
- 2025-10-01: Relationship query optimization completed
- 2025-10-01: CosmosDB test mocking fixed
- 2025-09-30: Post-sync grooming

**Phase Transition**: Moving from **Foundation Building** (Phases 1-3 ✅) to **User-Facing Value** (Domain adapters + Intelligence features). All infrastructure work complete and exceeded scope. Time to prove practical utility.

**Current Strategy**:
- ✅ Foundation solid (graph DB, query system, lens framework, progressive loading)
- 🎯 **Now**: Build domain adapters (CodebaseAdapter) and lenses (DebugLens) to demonstrate value
- 🔮 **Later**: Cloud deployment (CosmosDB validation when needed)
