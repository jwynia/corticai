# ADR: CorticAI as Documentation Agent in Multi-Agent Architecture

**Status**: Proposed
**Date**: 2025-10-29
**Deciders**: Architecture Team
**Related**: [[../architecture/agent-coordination/corticai-as-documentation-agent.md]], [[adr-semantic-operations-placement.md]]

---

## Context

After managing 100+ context networks, a consistent pattern emerged: **context drift accumulates when a single agent handles both implementation and documentation**. This is the same attention management problem CorticAI aims to solve for LLMs - applied to the agents building CorticAI itself.

### The Bootstrap Problem

**Current State** (Building CorticAI):
- Single agent (Claude Code) handles implementation + documentation
- Documentation happens at task boundaries, not continuously
- Manual `/sync` required every 2-3 days to detect drift
- 18-day drift window observed (Oct 11 → Oct 29 sync)
- All work WAS documented (completion records exist)
- Problem: Planning docs not updated in real-time

**Root Cause**: Attention is a finite resource. Context switching between implementation and documentation reduces quality of both.

**Evidence**: 100+ context networks show this is a fundamental architectural limitation, not a discipline problem.

---

## Decision

**CorticAI will be architected as a specialized documentation agent** that pairs with implementation agents in a multi-agent workflow, rather than being a passive storage system.

### Architecture

```
Supervisor Agent
    ├─ Implementation Agent (focused on tasks)
    └─ CorticAI Agent (focused on documentation/memory)
         └─ Context Network (storage)
```

### Key Design Choices

1. **Event-Driven Observation**
   - Implementation agents fire events automatically (file writes, tests, commits)
   - CorticAI observes in real-time, no polling
   - Zero drift window (continuous sync)

2. **Query Interface**
   - Implementation agents query CorticAI instead of reading files
   - Sub-100ms semantic search with lifecycle filtering
   - Prevents attention gravity (current docs ranked before deprecated)

3. **Automatic Documentation**
   - Completion records generated on task completion
   - Planning docs updated in real-time
   - No manual sync required

4. **Separation of Concerns**
   - Implementation agent: Pure task focus
   - CorticAI agent: Pure documentation/memory focus
   - No context switching between concerns

---

## Rationale

### Why Not Single Agent?

**Alternative Considered**: Keep single-agent architecture with better discipline/tooling

**Why Rejected**:
- 100+ networks prove attention splitting is fundamental problem
- `/checklist` helps but still requires manual effort and context switching
- Periodic syncs detect drift after it accumulates (reactive, not preventive)
- Query performance: Re-reading files is slower than semantic search
- Humans can't code and document simultaneously at high quality - why expect agents to?

### Why Paired Agents?

**Benefits**:
1. **Zero Context Switching**
   - Implementation agent never switches to documentation
   - 30% estimated speed improvement from focus

2. **Continuous Sync**
   - Events recorded as they happen
   - Zero drift by design
   - No manual sync required

3. **Fast Queries**
   - CorticAI maintains context network in memory
   - Sub-100ms semantic search vs seconds of file reading
   - Lifecycle filtering prevents attention gravity

4. **Proactive Assistance**
   - CorticAI can detect contradictions
   - Flag stale documentation
   - Suggest related context
   - Warn about potential issues

### Why Event-Driven?

**Alternative Considered**: Polling for changes

**Why Rejected**:
- Polling introduces latency between action and recording
- Misses context available at event time
- Higher resource usage
- Doesn't capture intent, only outcome

**Our Approach**:
- Events include rich context (intent, purpose, relationships)
- Immediate recording (no drift window)
- Lower overhead
- Better semantic understanding

### Why Write-Time Enrichment?

**Alternative Considered**: Process semantics at query time

**Why Rejected**:
- Slow queries (50-200ms semantic processing each time)
- Repeated computation for same content
- ROI breakeven ~100 queries, but content queried 1000+ times

**Our Approach**:
- Pay 15-30s once during ingestion
- Fast queries (<100ms) forever after
- Consistent query performance

---

## Consequences

### Positive

1. **Zero Drift by Design**
   - Continuous sync eliminates drift window
   - Planning docs always current
   - No manual sync required

2. **Faster Implementation**
   - No context switching overhead
   - Fast queries replace file reading
   - Pure task focus

3. **Better Documentation Quality**
   - Dedicated agent focused on documentation
   - Real-time recording captures full context
   - Automatic generation reduces manual effort

4. **Attention Gravity Prevention**
   - Lifecycle filtering built into query interface
   - Current docs ranked before deprecated
   - Fresh agents see relevant guidance first

5. **Proactive Assistance**
   - CorticAI can detect patterns (contradictions, staleness)
   - Suggest improvements
   - Warn about potential issues

### Negative

1. **Increased Complexity**
   - Multi-agent coordination required
   - Event hook infrastructure needed
   - More moving parts to maintain

2. **Bootstrap Challenge**
   - Must build CorticAI without having CorticAI
   - Requires manual sync until operational
   - Chicken-and-egg problem

3. **Integration Effort**
   - Implementation agents need event hooks
   - Query patterns must change (CorticAI vs file reading)
   - Migration path for existing workflows

4. **Resource Usage**
   - Two agents running instead of one
   - CorticAI maintains context network in memory
   - Higher computational cost (but better overall efficiency)

### Neutral

1. **New Paradigm**
   - Teams must learn paired-agent patterns
   - Different from traditional single-agent workflows
   - Requires documentation and training

2. **Monitoring Required**
   - Need metrics on drift prevention effectiveness
   - Query performance monitoring
   - Event processing latency tracking

---

## Implementation

### Phase 1: Event Infrastructure (Weeks 1-2)
- Design event hook architecture
- Implement file operation observers
- Create test execution hooks
- Build event → context network pipeline

### Phase 2: Query Interface (Weeks 3-4)
- Implement CorticAI query API
- Build 5-stage semantic pipeline
- Integrate lifecycle filtering
- Optimize for <100ms P95 latency

### Phase 3: Auto-Documentation (Weeks 5-6)
- Task completion detection
- Completion record generation
- Planning doc updates
- Metrics tracking

### Phase 4: Advanced Features (Weeks 7-8)
- Architecture decision capture
- Contradiction detection
- Staleness monitoring
- Proactive recommendations

---

## Validation

### Success Criteria

**Quantitative**:
- Query latency: <100ms P95
- Drift score: Maintains 9-10/10 continuously (no manual sync)
- Implementation speed: 30% faster (measured)
- Documentation quality: 95%+ coverage (automated checks)

**Qualitative**:
- Implementation agents never context-switch to documentation
- Completion records generated automatically
- Planning docs updated in real-time
- Fresh agents find current guidance first (attention gravity prevented)

### Test Cases

```typescript
// Test 1: Zero drift
Given: Implementation agent completes 3 tasks over 5 days
When: No manual sync performed
Then: Planning docs accurately reflect all 3 completions
      Drift score remains 9-10/10

// Test 2: Fast queries
Given: Context network with 10,000 documents
When: Implementation agent queries "Does authentication exist?"
Then: Response returned in <100ms P95
      Only current implementations returned (deprecated filtered)

// Test 3: Automatic documentation
Given: Implementation agent completes task
When: Task completion detected
Then: Completion record generated automatically
      Planning docs updated
      Metrics recalculated
      No manual intervention required

// Test 4: Attention gravity prevention
Given: Deprecated Kuzu docs (high volume, detailed)
      Current SurrealDB docs (lower volume)
When: Implementation agent queries "database setup"
Then: SurrealDB docs ranked first
      Kuzu docs marked deprecated, lower rank
      Migration guide included in results
```

---

## Related Decisions

- [[adr-semantic-operations-placement.md]] - How CorticAI processes queries (5-stage pipeline)
- [[adr_004_cosmos_db_dual_role_storage.md]] - Storage architecture for context network
- [[adr_002_kuzu_graph_database.md]] - Original graph storage (now deprecated)

---

## References

**Internal**:
- [[../architecture/agent-coordination/corticai-as-documentation-agent.md]] - Full architecture specification
- [[../architecture/semantic-processing/index.md]] - Semantic processing system
- [[../architecture/semantic-processing/attention-gravity-problem.md]] - Problem definition

**Lessons**:
- 100+ context networks managed
- Consistent drift patterns observed
- Manual sync requirements prove need
- Single-agent architecture fundamentally limited by attention

---

## Notes

**The Key Insight**: The same attention management problem CorticAI solves for LLMs (preventing historical docs from overwhelming current guidance) also applies to the agents building CorticAI (preventing documentation from overwhelming implementation).

**Bootstrap Paradox**: We're building a documentation agent without having a documentation agent. This ADR documents the architectural decision that will eventually solve the problem we're experiencing making this decision.

**Success Metric**: When CorticAI can document itself, the bootstrap is complete.

---

*Created: 2025-10-29*
*Status: Proposed (pending team review and Phase 1 implementation)*
*Next Review: Before Phase 1 kickoff*
