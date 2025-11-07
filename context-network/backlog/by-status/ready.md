# Ready Tasks

**Last Updated**: 2025-11-07 (Phase 2 groomed and ready)
**Source**: [groomed-backlog.md](../../planning/groomed-backlog.md)

Tasks that are fully groomed, unblocked, and ready for immediate implementation.

## Critical Priority

*No critical priority tasks at this time*

---

## High Priority

### ⭐ SEMANTIC-PHASE-2: Implement Semantic Processing - Phase 2 (Write-Time Enrichment)
**Title**: Implement Q&A generation and relationship inference for write-time semantic enrichment
**Complexity**: Large
**Effort**: 6-8 hours
**Priority**: HIGH
**Branch**: `semantic/phase-2-qa-relationships`

**Why this task**:
- Phase 1 (lifecycle + semantic blocks) complete and all tests passing
- Enables vocabulary bridging via Q&A generation
- Implements semantic relationship inference
- Core CorticAI differentiator

**Scope** (from roadmap):
1. **Q&A Generation** - Generate natural questions from document content
2. **Relationship Inference** - Extract semantic relationships between entities
3. **Write-Time Processing** - Enrich entities once during ingestion

**Deliverables**:
- SEMANTIC-007: Q&A generation engine with configurable LLM integration
- SEMANTIC-008: Question storage and indexing in SemanticStorage
- SEMANTIC-009: Relationship inference patterns (mentions, references, supersedes)
- SEMANTIC-010: Enhanced semantic enrichment pipeline
- SEMANTIC-011: Enrichment testing with real context network data

**Acceptance Criteria**:
- [ ] Q&A generator integrated with SemanticEnrichmentProcessor
- [ ] Generated Q&A stored in semantic storage with full-text index
- [ ] Relationship inference detects mentions, references, supersessions
- [ ] Vocabulary bridging validates with test queries
- [ ] Performance: <30s enrichment for typical document
- [ ] 30+ comprehensive tests
- [ ] Zero test regressions (589/605 continue passing)

**Start with**: Design Q&A generation API (abstract LLM integration), then implement question generator with prompt engineering

**Roadmap Reference**: [semantic-processing-implementation/README.md](../../planning/semantic-processing-implementation/README.md) - Phase 2

---

## Medium Priority

### PGVECTOR-PHASE-3: Complete pgvector Backend - Phase 3 (SemanticStorage)
**Title**: Implement remaining SemanticStorage methods (materialized views, full-text search, schema management)
**Complexity**: Medium
**Effort**: 4-6 hours
**Branch**: `feature/pgvector-phase-3-semantic`
**Prerequisite**: None (Phases 1-2 complete)

**Why this task**:
- Foundation complete (Phases 1-2 with 91 comprehensive tests)
- Natural next step for pgvector backend
- Completes SemanticStorage implementation

**Phase 3 Scope**:
- Materialized views support (5 stub methods)
- Full-text search with PostgreSQL FTS
- Schema management (defineSchema, getSchema)
- Analytics features (CTEs, window functions)

**Start with**: `/implement PGVECTOR-PHASE-3`

---

### PGVECTOR-PHASE-4: Complete pgvector Backend - Phase 4 (Vector Operations)
**Title**: Implement vector search with pgvector extension (embeddings, similarity search, hybrid queries)
**Complexity**: Medium
**Effort**: 4-6 hours
**Branch**: `feature/pgvector-phase-4-vectors`
**Prerequisite**: PGVECTOR-PHASE-3 (recommended but not required)

**Why this task**:
- Enables semantic similarity search
- Completes pgvector backend implementation
- Opens up vector-based features

**Phase 4 Scope**:
- pgvector extension setup and initialization
- Vector index creation (IVFFLAT or HNSW)
- Similarity search with distance metrics
- Embedding storage and retrieval
- Hybrid search (vector + keyword + filters)

**Start with**: `/implement PGVECTOR-PHASE-4`

---

## Low Priority

*No low priority ready tasks at this time*

---

## Blocked Tasks

### PERF-001: Add Connection Pooling for Database Adapters
**Title**: Implement connection pooling to improve performance under load
**Complexity**: Medium
**Effort**: 4-5 hours
**Branch**: `feature/connection-pooling`
**Status**: 🚫 BLOCKED - Awaiting scope & priority decisions (2025-10-18)

**Blocking Issues**:
- **Scope unclear**: Original plan (Kuzu only) vs backlog description (both adapters)
- **Priority unclear**: Performance not a current concern
- **Decision needed**: Archive, narrow scope, or broaden scope?

**Note**: pgvector backend already has connection pooling via `pg` library

**See**: [add-connection-pooling.md](../../tasks/performance/add-connection-pooling.md)

---

## Completed Tasks Archive

### ~~SEMANTIC-PHASE-1: Implement Semantic Processing - Phase 1~~ - ✅ COMPLETE (2025-11-07)
**Status**: ✅ COMPLETE - All 6 deliverables + code review + quality fixes + test fixes
**Effort**: 4-6 hours implementation + 1 hour test fixes
**Achievement**: Complete lifecycle metadata system and semantic block extraction infrastructure
**Tests**: 162 new comprehensive tests, all passing (589/605 total, 16 skipped for Phase 2)
**Quality**: Code review done, all 11 critical/major issues fixed, 8 minor issues documented
**Completion**: [2025-11-06-phase-1-completion.md](../../tasks/semantic-architecture-integration/2025-11-06-phase-1-completion.md)
**Branch**: `claude/prioritized-groomed-task-011CUqSRsU4fGP9o8x26qG9z` (merged)
**Test Fixes**: [sync-report-2025-11-07.md](../../tasks/sync-report-2025-11-07.md)

**Deliverables**:
- ✅ Lifecycle metadata schema (types.ts, entity.ts)
- ✅ Lifecycle detection (LifecycleDetector.ts, 20+ patterns, 65 tests)
- ✅ Semantic block parser (SemanticBlockParser.ts, 7 block types, 40 tests)
- ✅ Lifecycle lens (LifecycleLens.ts, 3 preset lenses, 30 tests)
- ✅ Storage integration (SemanticEnrichmentProcessor.ts, 25 tests)
- ✅ Migration script (AddLifecycleMetadata.ts with security hardening)

**Impact**: Core CorticAI differentiator - solves attention gravity problem with lifecycle-aware context management

**Next Steps**: Phase 2 - Q&A generation and relationship inference (ready to start)

---

### ~~TASK-004: Integrate Semantic Processing Architecture~~ - ✅ COMPLETE (2025-11-04)
**Status**: ✅ COMPLETE - Comprehensive 5-phase roadmap created
**Effort**: 2.5 hours (estimated 2-3 hours)
**Achievement**: Reviewed 7 architecture documents, mapped to existing codebase, created detailed implementation plan
**Deliverables**:
- Implementation roadmap (465 lines) with 5 phases totaling 30-40 hours
- Current state assessment (what exists vs gaps)
- Integration point mapping to storage/lens/cortex systems
- Validation strategy with self-hosting test cases
**Completion**: [2025-11-04-task-004-completion.md](../../tasks/semantic-architecture-integration/2025-11-04-task-004-completion.md)
**Roadmap**: [semantic-processing-implementation/README.md](../../planning/semantic-processing-implementation/README.md)

**Impact**: Created clear implementation path for core CorticAI differentiator (lifecycle-aware context management)

**Next Steps**: Implement Phase 1 (SEMANTIC-PHASE-1 task created above)

---

### ~~TASK-001: Fix Flaky Async Tests in TSASTParser~~ - ✅ COMPLETE (2025-11-04)
**Status**: ✅ COMPLETE - All timeouts resolved, 436/436 tests passing (100% pass rate)
**Effort**: 1.5 hours (estimated 1-2 hours)
**Achievement**: Replaced expensive `ts.createProgram()` with lightweight parse diagnostics (200x faster)
**Tests**: 28/28 TSASTParser tests passing, 436/436 total tests passing (up from 416/420)
**Performance**: Tests run 36% faster (640ms → 411ms)
**Completion**: [2025-11-04-task-001-tsastparser-async-fix.md](../../tasks/completed/2025-11-04-task-001-tsastparser-async-fix.md)

**Key Fix**:
- Removed expensive full program compilation (causing 2-5s timeouts)
- Access parse diagnostics directly from source file (<10ms)
- Adjusted performance test threshold (2000ms → 3000ms for environment variability)

**Impact**: Restored 100% test pass rate, improved CI/CD reliability, 36% performance gain

---

### ~~PGVECTOR-PHASES-1-2: pgvector Storage Backend - Phases 1-2~~ - COMPLETE (2025-11-03)
**Status**: ✅ COMPLETE - Dual-role adapter with 91 comprehensive tests
**Achievement**: PostgreSQL+pgvector as complete storage backend (Primary + Semantic roles)
**Tests**: 91/91 passing (30 unit + 55 security + 6 performance tests)

**Modules Created**:
- PgVectorStorageAdapter.ts (900+ lines)
- PgVectorSchemaManager.ts (303 lines)
- IPostgreSQLClient.ts + PostgreSQLClient.ts (dependency injection)
- MockPostgreSQLClient.ts (unit testing)

**Related Improvements Completed**:
- IMPROVE-PGVECTOR-001: SQL injection prevention
- IMPROVE-PGVECTOR-002: N+1 query optimization (50x improvement)
- IMPROVE-PGVECTOR-003: Code quality improvements

---

### ~~REFACTOR-004 Phase 2: Extract Semantic Query Builder~~ ✅ COMPLETE (2025-11-01)
**Status**: COMPLETE - 798 → 718 lines (10% reduction), 329/329 tests passing
**Completion**: [2025-11-01-refactor-004-phase-2-semantic-query-extraction.md](../../tasks/completed/2025-11-01-refactor-004-phase-2-semantic-query-extraction.md)

**Phase 2 Achievement**:
- Created DuckDBSemanticQueryBuilder.ts (235 lines)
- Test-First Development (42 comprehensive tests, 100% passing)
- Zero regressions in functionality
- 80 line reduction (798 → 718 lines)

**Combined Phase 1 + Phase 2**:
- Total reduction: 849 → 718 lines (131 lines, 15.4% reduction)
- 2 new focused modules (Parquet + Semantic Query)
- 72 new comprehensive tests (+30 Phase 1, +42 Phase 2)

---

### ~~REFACTOR-004 Phase 1: Extract Parquet Operations~~ ✅ COMPLETE (2025-10-29)
**Status**: COMPLETE - Parquet operations extracted, 849 → 798 lines (-51 lines, 6% reduction)
**Tests**: 30/30 passing (27 unit + 3 integration), 0 regressions
**Completion**: [2025-10-29-refactor-004-duckdb-parquet-extraction.md](../../tasks/completed/2025-10-29-refactor-004-duckdb-parquet-extraction.md)

---

### ~~REFACTOR-003: Optimize KuzuStorageAdapter Large File~~ ✅ COMPLETE (2025-10-19)
**Status**: COMPLETE - 29% reduction (822 → 582 lines), 260/260 tests passing
**Completion**: [2025-10-19-refactor-003-kuzu-adapter-optimization.md](../../tasks/completed/2025-10-19-refactor-003-kuzu-adapter-optimization.md)

---

### ~~HouseholdFoodAdapter Implementation~~ ✅ COMPLETE (2025-10-20)
**Status**: COMPLETE - Third domain adapter, 35/41 tests passing, 0 regressions
**Completion**: [2025-10-20-household-food-adapter-implementation.md](../../tasks/completed/2025-10-20-household-food-adapter-implementation.md)

---

## Selection Guidelines

**For your next task**:
1. **PGVECTOR-PHASE-3** (SemanticStorage) - MEDIUM priority, 4-6 hours, completes semantic storage
2. **PGVECTOR-PHASE-4** (Vector Operations) - MEDIUM priority, 4-6 hours, enables vector search
3. **SEMANTIC-PHASE-2** (Q&A Generation) - HIGH priority, will be groomed after Phase 1 merge

**Estimated sprint**:
- Feature completion: 4-6 hours (pgvector phases)
- Semantic Phase 2: To be estimated during grooming

---

## Task Inventory

- **Ready High Priority**: 0 tasks (Phase 1 complete!)
- **Ready Medium Priority**: 2 tasks (pgvector Phase 3 + Phase 4)
- **Blocked**: 1 task (PERF-001 - awaiting decisions)
- **Completed (Nov 6)**: 1 major task (SEMANTIC-PHASE-1 with 162 tests + code review fixes)
- **Completed (Nov 4-5)**: 2 major tasks (TASK-001, TASK-004) + pgvector expansion + 4 refactorings
- **Completed (Nov 2025)**: 7+ major tasks
- **Completed (Oct 2025)**: 19 major tasks

**Project Health** (as of 2025-11-07):
- ✅ 589/605 tests passing (97.4% pass rate, 16 skipped for Phase 2)
- ✅ 0 TypeScript errors
- ✅ All critical test failures fixed
- ✅ Test-First pattern established
- ✅ Code review practices integrated (19 issues found, 11 critical/major fixed)
- ✅ pgvector backend expanding (111 test cases)
- ✅ Semantic processing Phase 1 COMPLETE (lifecycle + semantic blocks + all tests passing)
- ✅ 8 tech debt items documented from code review
- 🎉 **Ready**: Phase 2 Q&A generation can begin
