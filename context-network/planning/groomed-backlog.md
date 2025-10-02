# CorticAI Groomed Backlog

## 📊 Project Status Summary
**Last Groomed**: 2025-10-01 (Re-groomed for vacation + real-world validation)
**Build Status**: ⚠️ Tests: 69 passing, 26 failing (CosmosDB mocking issue - non-blocking)
**Current Phase**: Phase 7 (Cloud Storage Architecture) - 85% COMPLETE
**Azure Status**: ⏸️ **BLOCKED** - No Azure access during vacation (day job requirement)
**Validation Approach**: Real markdown-based context networks (avoiding self-hosting scope confusion)
**Current Priority**: **Prepare for real-world testing** with existing context networks
**Foundation Status**: ✅ Solid foundation - ready for practical validation

---

## ✅ COMPLETED TASKS

### 0. Fix CosmosDB Test Mocking Issues ✅ COMPLETE (2025-10-01)
**One-liner**: Fixed vitest mock configuration for @azure/cosmos PartitionKeyKind export
**Completed**: 2025-10-01
**Result**: All 36 CosmosDB tests now passing (was 10/36 passing)

<details>
<summary>Full Implementation Details</summary>

**Problem**: 26/36 CosmosDB tests failing with error: `[vitest] No "PartitionKeyKind" export is defined on the "@azure/cosmos" mock`

**Root Cause**: The mock for @azure/cosmos only included CosmosClient class but was missing the PartitionKeyKind enum used by the adapter for partition configuration.

**Solution Implemented**:
1. Added PartitionKeyKind enum to @azure/cosmos mock with all values (Hash, Range, MultiHash)
2. Documented mocking strategy explaining difference between runtime values and TypeScript types
3. Verified all 36 tests now pass without requiring Azure connection

**Files Modified**:
- `app/tests/storage/adapters/CosmosDBStorageAdapter.test.ts` - Added PartitionKeyKind to mock, added documentation

**Key Learning**: When mocking Azure SDK, only runtime values (classes, enums, functions) need to be mocked. TypeScript types/interfaces (Container, Database, ItemResponse, etc.) are for compile-time type checking only.

**Test Results**: ✅ 36/36 tests passing (100%)

</details>

---

### 1. Fix Build Quality Issues ✅ COMPLETE
**One-liner**: Fixed 8 TypeScript errors and 1 test failure blocking production deployment
**Completed**: 2025-09-30
**Result**: Build now passes with 0 TypeScript errors, all critical tests passing

<details>
<summary>Full Implementation Details</summary>

**Context**: Phase 7 CosmosDB implementation is 80% complete but has 7 TypeScript compilation errors and 3 test failures. Build process also times out. This blocks ALL production deployment and further development.

**Critical Issues**:
1. **Missing dependency**: @azure/identity not in package.json
2. **CosmosDB type errors**: PartitionKey type incompatibility
3. **LocalStorageProvider interface mismatches**: 3 signature errors
4. **CodebaseAdapter type error**: Relationship type mismatch
5. **Test failures**: Performance monitor log format, edge filtering
6. **Build timeout**: Process hangs after 2 minutes

**Acceptance Criteria**:
- [ ] Add @azure/identity to package.json dependencies (CRITICAL)
- [ ] Fix CosmosDB partitionKey type error (line 256)
- [ ] Fix LocalStorageProvider getMany() return type (line 43)
- [ ] Fix LocalStorageProvider traverse() signature (line 47)
- [ ] Fix LocalStorageProvider findConnected() signature (line 69)
- [ ] Fix CodebaseAdapter "calls" relationship type (line 532)
- [ ] Update performance monitor tests for new log format
- [ ] Fix KuzuSecureQueryBuilder edge type filtering test
- [ ] Investigate and fix build timeout issue
- [ ] npm run build completes successfully in < 30 seconds
- [ ] npm test passes all tests with 0 failures

**Implementation Guide**:
1. Add @azure/identity to dependencies: `npm install @azure/identity`
2. Fix CosmosDB partitionKey: Use correct SDK types from @azure/cosmos
3. Fix LocalStorageProvider: Align interface signatures with PrimaryStorage
4. Fix CodebaseAdapter: Add "calls" to relationship type enum
5. Update test expectations for new logger output format
6. Fix edge type filtering logic in KuzuSecureQueryBuilder
7. Profile build process to identify timeout cause
8. Run full test suite and build to validate

**Files to modify**:
- `app/package.json` (add @azure/identity)
- `app/src/storage/adapters/CosmosDBStorageAdapter.ts` (fix partitionKey types)
- `app/src/storage/providers/LocalStorageProvider.ts` (fix interface mismatches)
- `app/src/adapters/CodebaseAdapter.ts` (fix relationship type)
- `app/src/storage/adapters/KuzuSecureQueryBuilder.ts` (fix edge filtering)
- `app/tests/**/performance.test.ts` (update log format expectations)

**Watch Out For**:
- Don't skip type checks by using `any` - fix the actual type mismatches
- Ensure LocalStorageProvider properly implements PrimaryStorage interface
- Validate CosmosDB types match the @azure/cosmos SDK version

**Evidence**: See `/context-network/tasks/sync-report-2025-09-30.md` for detailed analysis

</details>

---

## 🚀 Ready Now (No Azure Required - Vacation Friendly)

### 1. Make Query Result Limits Configurable
**One-liner**: Add configurable result limits to Kuzu query builder methods
**Complexity**: Trivial (15-30 min)
**Priority**: HIGH - API usability improvement
**Dependencies**: None
**Azure Required**: ❌ No

<details>
<summary>Full Implementation Details</summary>

**Context**: Query limits currently hardcoded (100, 1000). Need flexibility for different use cases.

**Acceptance Criteria**:
- [ ] Add `resultLimit` parameter to query builder methods
- [ ] Use sensible defaults (100 for traversal, 1000 for search)
- [ ] Validate against unreasonable limits (max 10000)
- [ ] Update JSDoc documentation
- [ ] Add tests for configurable limits
- [ ] Maintain backward compatibility

**Implementation Guide**:
1. Add optional `options?: { resultLimit?: number }` parameter
2. Extract default constants
3. Update all query building methods
4. Add input validation
5. Update tests

**Files to modify**:
- `app/src/storage/adapters/KuzuSecureQueryBuilder.ts` (lines 126, 146)

**Watch Out For**: Validate limits to prevent resource exhaustion

</details>

---

### 2. Validate Markdown Context Network Import
**One-liner**: Ensure CorticAI can properly index and query real markdown-based context networks
**Complexity**: Medium (2-3 hours)
**Priority**: HIGH - Critical for real-world validation
**Dependencies**: None
**Azure Required**: ❌ No - Uses local storage

<details>
<summary>Full Implementation Details</summary>

**Context**: Will test with real markdown context networks. Need to ensure entity extraction, relationship detection, and querying work on actual data.

**Acceptance Criteria**:
- [ ] Parse markdown files from existing context networks
- [ ] Extract entities from planning/architecture documents
- [ ] Detect relationships between documents
- [ ] Query across the context network
- [ ] Validate performance with realistic data volumes
- [ ] Document any issues or limitations found
- [ ] Create usage examples based on real data

**Implementation Guide**:
1. Create test harness for markdown import
2. Test entity extraction from various document types
3. Verify relationship detection works
4. Run queries on imported data
5. Measure performance
6. Document findings and issues

**Files to review/modify**:
- Markdown parsing in extractors
- Entity detection logic
- Relationship inference
- Query system validation

**Watch Out For**: Real data reveals edge cases tests miss

</details>

---

### 3. Complete CosmosDB Migration Utilities (Local Development - DEFERRED)
**One-liner**: Build bidirectional migration utilities between local and cloud storage
**Complexity**: Medium (3-4 hours)
**Priority**: LOW - Deferred until Azure access available
**Dependencies**: CosmosDB validation complete
**Azure Required**: ⚠️ Partially - Can develop with mocks but needs Azure to validate

<details>
<summary>Full Implementation Details</summary>

**Context**: CosmosDB adapter is 85% complete. Need migration utilities to enable developers to sync data between local Kuzu/DuckDB and cloud CosmosDB. Can be developed entirely with mocked CosmosDB for testing.

**Acceptance Criteria**:
- [ ] Create migration script: local → cloud (export/import)
- [ ] Create migration script: cloud → local (export/import)
- [ ] Handle incremental migrations (only changed entities)
- [ ] Add conflict resolution strategies
- [ ] Validate data integrity after migration
- [ ] Add rollback capability for failed migrations
- [ ] Test with mocked CosmosDB instances
- [ ] Document migration procedures and options

**Implementation Guide**:
1. Create `app/src/storage/migration/` directory
2. Implement `LocalToCloudMigration` class with incremental sync
3. Implement `CloudToLocalMigration` class with conflict detection
4. Add data validation and integrity checks
5. Create CLI interface for manual migrations
6. Build comprehensive test suite with mocks
7. Document migration workflows

**Files to create**:
- `app/src/storage/migration/LocalToCloudMigration.ts`
- `app/src/storage/migration/CloudToLocalMigration.ts`
- `app/src/storage/migration/MigrationValidator.ts`
- `app/src/storage/migration/ConflictResolver.ts`
- `app/tests/storage/migration/*.test.ts`

**Watch Out For**: Data format differences between Kuzu graph structure and CosmosDB documents

</details>

---

### 4. Improve Type Safety - Fix Type Assertions
**One-liner**: Remove unsafe `as any` type assertions from LocalStorageProvider
**Complexity**: Small (30-60 min)
**Priority**: MEDIUM - Code quality for open source
**Dependencies**: None
**Azure Required**: ❌ No

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

**Files to modify**:
- `app/src/storage/providers/LocalStorageProvider.ts`

**Watch Out For**: May reveal underlying design issues needing broader fixes

</details>

---

## ⏳ Blocked Until Azure Access (Post-Vacation - Day Job Requirement)

### Azure Cloud Storage Validation (REQUIRES AZURE)
**One-liner**: Validate CosmosDB integration with real Azure instance (day job requirement)
**Complexity**: Small (2-3 hours)
**Priority**: HIGH - Critical for day job use case
**Dependencies**: Test mocking issues fixed
**Azure Required**: ✅ YES - Requires live Azure CosmosDB connection (post-vacation)

<details>
<summary>Full Implementation Details</summary>

**Context**: CosmosDB implementation is 80% complete with excellent architecture, but 7 TypeScript errors prevent compilation. Once build is fixed, need to validate with real Azure instance and complete migration utilities.

**Completed Work** ✅:
- [x] Implement CosmosDBStorageAdapter with dual-role configuration (700+ lines)
- [x] Create storage provider abstraction (4 files: LocalStorageProvider, AzureStorageProvider, IStorageProvider, Factory)
- [x] Implement environment-based storage provider selection (automatic detection)
- [x] Add comprehensive test suite for cloud operations (36 tests passing)
- [x] Create comprehensive documentation (CosmosDB-Integration-README.md)

**Remaining Work** (After Build Fixed):
- [ ] Fix all TypeScript compilation errors (see task #0 above)
- [ ] Add @azure/identity dependency
- [ ] Validate with real Azure CosmosDB instance (not just mocked tests)
- [ ] Complete bidirectional migration utilities
- [ ] Test migration with realistic data volumes
- [ ] Create Azure deployment infrastructure configuration
- [ ] Validate feature parity between storage modes
- [ ] Measure RU cost optimization
- [ ] Performance test cloud vs local storage

**Implementation Guide**:
1. Design storage provider abstraction layer
2. Implement CosmosDB adapter following established patterns
3. Create migration and synchronization utilities
4. Add environment configuration management
5. Build comprehensive test coverage
6. Document deployment procedures

**Files to modify**:
- `app/src/storage/adapters/CosmosDBStorageAdapter.ts` (new)
- `app/src/storage/providers/` (new directory)
- `app/src/config/storage.ts` (new)
- Test files and documentation

**Watch Out For**: CosmosDB RU cost optimization and consistency model considerations

</details>

---

### Complete CosmosDB Migration Utilities
**Blocker**: Requires Azure access for validation
**Unblocks after**: Azure validation complete
**Effort**: 3-4 hours
**Note**: Can develop with mocks during vacation but needs Azure to validate properly

---

## 📝 Medium Priority (Quality Improvements)

### Improve CosmosDB Partition Key Distribution
**One-liner**: Replace weak hash function with better algorithm and increase partition count
**Complexity**: Small (30-60 min)
**Priority**: MEDIUM - Scalability for day job use
**Dependencies**: None
**Azure Required**: ❌ No - Can develop locally

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

**Files to modify**:
- `app/src/storage/adapters/CosmosDBStorageAdapter.ts:728`

**Watch Out For**: Changing strategy affects data distribution, may need migration

</details>

---

## 🗑️ Deferred / Out of Scope

### ~~CorticAI Self-Hosting Validation~~ - DEFERRED
**Reason**: Meta-use causes scope confusion with LLMs
**Alternative**: Validate with real external markdown context networks instead

### ~~Strategic Production Readiness Assessment~~ - NOT RELEVANT
**Reason**: Open source project, not enterprise SaaS product
**Alternative**: Focus on practical utility for personal/day job use

### Advanced Domain Adapter Framework - DEFERRED
**Reason**: Optimize for actual use cases first, then expand
**Future**: Build registry when multiple domains validated in practice

## 📝 Technical Debt and Code Quality Improvements

### Code Review Findings (2025-10-01)
**Discovery**: [2025-10-01-001-code-review-findings.md](../discoveries/2025-10-01-001-code-review-findings.md)
**Context**: Systematic review of storage adapters identified 9 issues, 3 applied immediately, 6 tracked as tasks

**Completed** (2025-10-01):
- ✅ **Optimize Relationship Queries** - 2000x performance improvement achieved
  - Task: [optimize-relationship-queries.md](../tasks/tech-debt/optimize-relationship-queries.md)
  - Implementation: [2025-10-01-002-relationship-query-optimization.md](../discoveries/2025-10-01-002-relationship-query-optimization.md)
  - Result: O(n) → O(degree), 1ms query time for 100 entities
  - Tests: 9/9 passing, 100% coverage

**High Priority Remaining**:
- (None - high priority task completed)

**Medium Priority**:
- **Improve CosmosDB Partitioning** - Better hash distribution and scalability
  - Task: [improve-cosmosdb-partitioning.md](../tasks/tech-debt/improve-cosmosdb-partitioning.md)
- **Make Query Limits Configurable** - API flexibility for different use cases
  - Task: [configurable-query-limits.md](../tasks/tech-debt/configurable-query-limits.md)
- **Fix Type Assertions** - Remove unsafe `as any` type assertions
  - Task: [fix-type-assertions-local-storage.md](../tasks/refactoring/fix-type-assertions-local-storage.md)

**Low Priority**:
- **Add Recursive Depth Limits** - Safety for file system operations
  - Task: [add-recursive-depth-limit.md](../tasks/refactoring/add-recursive-depth-limit.md)
- **Make Entity Types Extensible** - Allow custom entity types
  - Task: [extensible-entity-types.md](../tasks/refactoring/extensible-entity-types.md)

### Implement Edge Type Filtering for Variable-Length Paths
**Location**: `app/src/storage/adapters/KuzuSecureQueryBuilder.ts:117`
**Context**: Edge type filtering done in post-processing, tracked in tech-debt backlog
**Priority**: MEDIUM - Affects query precision but not blocking
**Complexity**: Small (1-2 hours)
**Dependencies**: Kuzu's variable-length path filtering capabilities
**Status**: Documented in code (changed TODO to NOTE)

---

## 🔍 Needs Decisions

### Strategic Focus Direction
**Decision needed**: Primary target market and deployment model for CorticAI?
**Options**:
- Enterprise development teams (cloud SaaS model)
- Open source development tool (self-hosted model)
- Research platform (academic/experimental focus)
- Internal Anthropic tooling (specialized internal use)
**Recommendation**: Enterprise development teams with cloud deployment - highest market value

### Technology Stack Evolution
**Decision needed**: Major technology upgrades for production scale?
**Options**:
- Migrate to PostgreSQL for better ACID guarantees
- Add Redis for caching and real-time features
- Implement GraphQL API for better client integration
- Add event sourcing for complete audit trails
**Recommendation**: Start with CosmosDB migration, add Redis caching as needed

## 🗑️ Archived Tasks

### Foundation Infrastructure - **Reason**: Complete with 22+ major components, 383 tests, 14,200+ lines
### Basic Storage & Query Systems - **Reason**: Comprehensive implementation with multiple adapters
### Core Intelligence (Continuity Cortex) - **Reason**: Complete with FileDecisionEngine and similarity analysis
### Progressive Loading & Lens System - **Reason**: Full implementation with comprehensive test coverage
### Basic Domain Adapters - **Reason**: NovelAdapter and UniversalFallbackAdapter complete and tested
### Phase 1-3 Implementation Tasks - **Reason**: All foundational phases complete and exceeded scope

---

## Summary Statistics
**Last Groomed**: 2025-10-01 (Re-groomed for vacation + real-world validation)
- **Build Status**: ✅ Tests: 95 passing, 0 failing (CosmosDB mocking fixed!)
- **Ready now (no Azure)**: 4 tasks focused on quality + validation prep
- **Blocked by Azure**: 2 tasks (day job requirement, post-vacation)
- **Deferred**: 3 tasks (self-hosting, strategic planning, advanced features)
- **Recent wins**: CosmosDB test fix (36/36 passing), Relationship optimization (2000x improvement)
- **Validation approach**: Real markdown context networks (not meta-use)

## Top 3 Priorities (Vacation Friendly)
1. **Make Query Limits Configurable** - API usability (15-30 min)
2. **Validate Markdown Import** - Prepare for real-world testing (2-3 hours)
3. **Improve Type Safety** - Fix type assertions (30-60 min)

---

## Context Integration

**Parent Planning**: [planning/index.md](./index.md) - Central planning navigation
**Related Planning**: [roadmap.md](./roadmap.md) - Strategic context
**Recent Updates**:
- 2025-10-01: Re-groomed for vacation + real-world validation focus
- 2025-10-01: Relationship query optimization completed (2000x improvement)
- 2025-09-30: Post-sync grooming - Build quality assessed
- 2025-09-27: Major sync - Discovered Phases 2-3 complete

This backlog reflects **vacation context**: No Azure access, will validate with real markdown context networks. Focus on quality improvements and preparation for practical testing with actual data.

**CURRENT PRIORITIES**:
1. **Test Quality** 🧪 Fix CosmosDB mocks, keep suite healthy
2. **Validation Prep** 📋 Ensure markdown import ready for real data
3. **API Usability** ⚙️ Configurable limits, type safety
4. **Azure Work** ☁️ Blocked until post-vacation (day job requirement)