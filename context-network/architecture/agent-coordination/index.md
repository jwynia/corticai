# Agent Coordination Architecture

**Domain**: Multi-Agent Systems, Coordination Patterns, Documentation Automation
**Status**: Architectural Specification
**Created**: 2025-10-29
**Parent**: [[../index.md|Architecture Index]]

---

## Overview

This directory documents CorticAI's multi-agent coordination patterns, focusing on how CorticAI functions as a specialized documentation agent within a multi-agent workflow.

**Core Innovation**: CorticAI is not a database or RAG system - it's a **documentation agent** that observes implementation agents in real-time, preventing context drift through continuous observation rather than periodic synchronization.

---

## Documents

### Primary Architecture

**[[corticai-as-documentation-agent.md]]** - *Main specification*
Comprehensive documentation covering:
- **The Bootstrap Problem** (meta) - Why building CorticAI is hard
- **Paired Agent Architecture** - How CorticAI fits into multi-agent workflows
- **Event-Driven Design** - Real-time observation patterns
- **Usage Patterns** - How to use CorticAI once operational
- **Lessons from 100+ Networks** - Validated drift patterns
- **Implementation Roadmap** - 4-phase plan

**When to Read**:
- Understanding why CorticAI is architected as an agent
- Learning multi-agent coordination patterns
- Planning CorticAI integration
- Troubleshooting drift problems

---

## Key Concepts

### The Attention Problem

**Single Agent Architecture** (Current):
```
Implementation + Documentation = Attention Split
                ↓
        Context Switching
                ↓
   One or Both Suffer (Usually Docs)
```

**Paired Agent Architecture** (Target):
```
Implementation Agent → Pure Task Focus
CorticAI Agent → Pure Documentation Focus
                ↓
        No Context Switching
                ↓
        Both Concerns Excel
```

### Event-Driven Observation

CorticAI observes implementation agents through event hooks:
- File writes/edits → Record in context network
- Test runs → Update metrics
- Commits → Generate completion records
- Task boundaries → Trigger documentation

**Zero Drift Window**: Events recorded as they happen, not at task boundaries.

### Query-First Pattern

Implementation agents query CorticAI instead of reading files:
- **Fast**: <100ms semantic search
- **Accurate**: Lifecycle filtering (excludes deprecated)
- **Contextual**: Related information included automatically

### Write-Time Enrichment

Semantic processing happens during recording, not queries:
- Pay cost once (15-30s at write time)
- Benefit 1000+ queries (<100ms each)
- Consistent query performance

---

## Design Principles

### 1. Separation of Concerns (Agent Level)
Each agent has ONE primary concern:
- Implementation agent: Task completion
- CorticAI agent: Documentation & memory
- Supervisor agent: Coordination

**Why**: Attention is finite - can't split between concerns without reducing quality

### 2. Continuous Sync, Not Periodic
Documentation happens continuously, not at boundaries:
- Events recorded in real-time
- Zero drift by design
- No manual sync required

**Why**: Periodic sync is reactive (detects drift after accumulation) - continuous is preventive

### 3. Event-Driven, Not Polling
CorticAI observes events as fired, doesn't poll:
- Immediate recording
- Rich context captured
- Lower overhead

**Why**: Events include intent and context available at action time, polling only sees outcome

### 4. Query-First, Not Read-First
Implementation agents query CorticAI, don't read files:
- Faster (<100ms vs seconds)
- Lifecycle-aware
- Prevents attention gravity

**Why**: Search with semantic understanding and lifecycle filtering beats grep + file reading

---

## Architecture Patterns

### Pattern 1: Observer Agent
```typescript
CorticAI observes implementation agent:
- Non-intrusive (no blocking)
- Real-time recording
- Maintains full context network model in memory
- Answers queries from memory
```

### Pattern 2: Event Hooks
```typescript
Implementation agent fires events automatically:
onToolUse('Write', ...) → CorticAI.observe(...)
onToolUse('Edit', ...) → CorticAI.observe(...)
onToolUse('Bash', ...) → CorticAI.observe(...)
onTaskComplete(...) → CorticAI.flushCompletionRecord()
```

### Pattern 3: Query Interface
```typescript
Implementation agent queries instead of reading:
agent.ask("Does X exist?")
  ↓
CorticAI.query({
  literal: "X",
  lifecycle: "current",
  projection: "implementation"
})
  ↓
Response in <100ms with context
```

### Pattern 4: Automatic Documentation
```typescript
Task completes → CorticAI detects
  ↓
Generate completion record
Update planning docs
Update metrics
  ↓
Zero manual effort
```

---

## Validation from 100+ Context Networks

### Observed Drift Patterns

**High Quality** (well-documented):
- ✅ Completion records created
- ✅ Test results captured
- ✅ Code quality high

**Low Quality** (frequently missed):
- ❌ Planning docs not updated
- ❌ Architecture decisions not recorded
- ❌ Discovery records not created
- ❌ Metrics not recalculated

**Root Cause**: Single agent trying to do both implementation and documentation

**Evidence**: Consistent across 100+ networks, not a discipline problem

### Why /checklist Helps (Current Best Practice)

- ✅ Lightweight reminder
- ✅ Minimal context switch
- ❌ Still manual effort
- ❌ Still at task boundaries
- ❌ Doesn't solve query speed

### Why CorticAI Will Work Better

- ✅ Zero context switch (separate agent)
- ✅ Continuous, not periodic
- ✅ Automatic, not manual
- ✅ Fast queries replace file reading
- ✅ Proactive assistance possible

---

## Implementation Status

### Current State (2025-10-29)
- ⏳ Architecture documented
- ⏳ ADR proposed (pending approval)
- ⏳ Event hook specification defined
- ⏳ Query interface designed
- ⏳ Implementation roadmap created

### Next Steps
1. **Review & Approve ADR** - Team consensus on architecture
2. **Phase 1: Event Infrastructure** (Weeks 1-2) - Build observation hooks
3. **Phase 2: Query Interface** (Weeks 3-4) - Enable fast semantic queries
4. **Phase 3: Auto-Documentation** (Weeks 5-6) - Generate completion records
5. **Phase 4: Advanced Features** (Weeks 7-8) - Proactive assistance

### Bootstrap Complete When
CorticAI can document itself (self-hosting) - no manual sync required

---

## Related Documentation

### Architecture
- [[../semantic-processing/index.md]] - How CorticAI processes information
- [[../semantic-processing/attention-gravity-problem.md]] - Problem being solved
- [[../semantic-processing/write-time-enrichment.md]] - When semantic ops happen
- [[../dual-role-storage.md]] - Graph + Analytics storage

### Decisions
- [[../../decisions/adr-corticai-as-documentation-agent.md]] - Architectural decision
- [[../../decisions/adr-semantic-operations-placement.md]] - 5-stage pipeline
- [[../../decisions/adr_004_cosmos_db_dual_role_storage.md]] - Storage architecture

### Planning
- [[../../planning/groomed-backlog.md]] - Current priorities
- [[../../planning/roadmap.md]] - Project phases

---

## For Different Audiences

### Current CorticAI Development Team (Meta)
**Read**: [[corticai-as-documentation-agent.md#the-bootstrap-problem]]
- Understand why building this is hard
- Learn why drift happens
- See bootstrap strategy
- Know when bootstrap complete

### Future CorticAI Users (Usage)
**Read**: [[corticai-as-documentation-agent.md#usage-patterns]]
- How to integrate CorticAI
- Event hooks to implement
- Query patterns to use
- Expected benefits

### Architects/Researchers
**Read**: [[corticai-as-documentation-agent.md#design-principles]]
- Novel architectural patterns
- Validation from 100+ networks
- Comparison with single-agent
- Key innovations

---

## Key Questions Answered

**Meta Questions**:
- Why is building CorticAI hard? → Bootstrap problem
- Why manual sync needed? → Single-agent attention split
- When is bootstrap complete? → Self-documenting

**Architecture Questions**:
- What is CorticAI? → Documentation agent, not database
- Why paired agents? → Separation of concerns, no context switching
- How does it prevent drift? → Real-time observation, continuous sync

**Usage Questions**:
- How to integrate? → Event hooks + query interface
- What events to send? → File ops, tests, commits, boundaries
- How to query? → Natural language through CorticAI API

---

## Changelog

- **2025-10-29**: Created agent-coordination architecture directory
  - Documented CorticAI as documentation agent
  - Captured lessons from 100+ context networks
  - Defined paired-agent architecture
  - Specified event-driven design
  - Created implementation roadmap

---

*This directory captures the architectural insight that CorticAI is fundamentally an agent with a specialized role (documentation/memory), not a passive storage system. This understanding is critical for both building CorticAI correctly and using it effectively.*
