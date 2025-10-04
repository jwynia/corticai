# Sprint Priorities - September 2025

## Classification
- **Domain**: Planning
- **Stability**: Evolving
- **Abstraction**: Strategic
- **Confidence**: High

## Critical Security Priorities

### 1. SEC-004: WebSocket Authentication (CRITICAL)
**Why Now**: Event Engine deployed without authentication exposes all events
**Risk**: Unauthorized access to sensitive event streams
**Effort**: 4-6 hours implementation + 2-3 hours testing
**Dependencies**: Event Engine (IMPL-004) completed
**Recommendation**: Start immediately in next sprint

### 2. SEC-005: Plugin Sandboxing (HIGH)
**Why Important**: Plugins can execute arbitrary code
**Risk**: Code injection, system compromise
**Effort**: 8-10 hours + research time
**Dependencies**: Plugin system exists
**Recommendation**: Schedule architecture review first

## Performance Baselines Needed

### PERF-002 Prerequisites
Before implementing event indexing, establish baselines:

```typescript
// Metrics to capture before optimization
interface EventPerformanceBaseline {
  appendLatency: {
    p50: number;  // Target: < 10ms
    p95: number;  // Target: < 50ms
    p99: number;  // Target: < 100ms
  };
  queryLatency: {
    byAggregate: number;  // Current: O(n)
    byType: number;       // Current: O(n)
    byTimeRange: number;  // Current: O(n)
  };
  throughput: {
    eventsPerSecond: number;  // Measure max sustainable
    batchSize: number;        // Optimal batch size
  };
  memory: {
    perEvent: number;         // Bytes per stored event
    steadyState: number;      // Memory after 10K events
  };
}
```

## Documentation Gaps

### Database Migration Guide (REQUIRED before PostgreSQL)
**Content Needed**:
1. Schema migration from in-memory to PostgreSQL
2. Data migration strategy
3. Rollback procedures
4. Performance implications
5. Connection pooling configuration

**Effort**: 2-3 hours
**When**: Before any database integration work

## Process Improvements

### TDD Adoption Strategy
Based on IMPL-004 success:
1. **Mandate TDD for**: Security code, financial calculations, core business logic
2. **Encourage TDD for**: New features, bug fixes with reproducible cases
3. **Optional TDD for**: UI changes, configuration, documentation

### Code Review Integration
1. AI review for all PRs (quick security/quality check)
2. Human review for architecture changes
3. Automated recommendation triage

## Recommended Sprint Plan

### Sprint 1 (Next Sprint)
1. **SEC-004**: WebSocket Authentication (Critical)
2. **DOC-Task**: Database Migration Guide
3. **PERF-Baseline**: Capture current performance metrics

### Sprint 2
1. **SEC-005**: Plugin Sandboxing (after architecture review)
2. **PERF-002**: Event Store Indexing (with baselines)
3. **IMPL-003**: Authentication System (if SEC-004 complete)

### Sprint 3
1. **REFACTOR-004**: Structured Logging
2. **INFRA-004**: Workflow Automation
3. Technical debt reduction

## Success Criteria

### Sprint 1 Success:
- ✅ No unauthorized event access possible
- ✅ Performance baselines documented
- ✅ Database migration path clear

### Sprint 2 Success:
- ✅ Plugin security hardened
- ✅ Query performance improved 10x
- ✅ Auth system integrated

### Sprint 3 Success:
- ✅ Production-ready logging
- ✅ Automated workflows
- ✅ Tech debt reduced by 30%

## Risk Mitigation

### Immediate Risks:
1. **WebSocket exposure**: Mitigate with SEC-004
2. **Plugin vulnerabilities**: Mitigate with SEC-005
3. **Performance degradation**: Mitigate with PERF-002

### Process Risks:
1. **Skipping TDD**: Mitigate with process guide
2. **Deferred security**: Mitigate with sprint priorities
3. **Missing documentation**: Mitigate with templates

## Related Documents
- [[backlog/tasks/SEC-004.md]] - WebSocket Auth task
- [[backlog/tasks/SEC-005.md]] - Plugin Sandboxing task
- [[backlog/tasks/PERF-002.md]] - Event Indexing task
- [[tdd-process-guide]] - TDD methodology

## Task Context
- **Created from**: IMPL-004 retrospective recommendations
- **Relevance**: Sprint planning and prioritization