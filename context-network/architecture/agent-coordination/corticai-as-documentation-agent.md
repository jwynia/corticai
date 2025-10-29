# CorticAI as Documentation Agent: Multi-Agent Architecture

**Status**: Architectural Specification
**Domain**: Agent Coordination, Documentation Automation, Context Management
**Created**: 2025-10-29
**Related**: [[../semantic-processing/index.md]], [[../../decisions/adr-semantic-operations-placement.md]]

---

## Overview

**Core Insight**: CorticAI is not a database or RAG system - it's a specialized **documentation agent** that observes and records the work of implementation agents in real-time, preventing context drift through continuous observation rather than periodic synchronization.

This document explains:
1. **The Meta Problem**: Why building CorticAI is hard (bootstrap problem)
2. **The Architecture**: How CorticAI fits into multi-agent workflows
3. **Usage Patterns**: How to use CorticAI once operational
4. **Lessons Learned**: Insights from 100+ context networks

---

## The Bootstrap Problem (Meta)

### Building a Documentation Agent Without a Documentation Agent

**The Irony**: We're building a system to solve context drift while actively experiencing context drift building it.

**Current Reality** (Building CorticAI):
```
┌─────────────────────────────────────────┐
│ Single Agent (Claude Code)             │
│                                         │
│ Task: "Implement feature X"             │
│   ├─ Write code                         │
│   ├─ Run tests                          │
│   ├─ Update documentation               │ ← Context switch
│   ├─ Update planning docs               │ ← Often forgotten
│   └─ Create completion record           │ ← Manual effort
│                                         │
│ Result: Drift accumulates               │
│ Solution: Manual /sync every few days   │
└─────────────────────────────────────────┘
```

**Evidence from Building CorticAI**:
- 3 major tasks completed (Oct 18-20)
- Planning docs not updated until sync (Oct 29)
- 18 days of drift before detection
- All work WAS documented (completion records exist)
- Problem: Planning docs out of sync with reality

**Why This Happens**:
- Implementation agent focused on task completion
- Documentation is secondary concern
- Context switching between implementation and documentation
- No real-time observation of progress
- Updates happen at task boundaries (too late)

### Lessons from 100+ Context Networks

**Observation** (from user experience managing 100+ context networks):

**Most Common Drift Patterns**:
1. ✅ Work completed with proper completion records
2. ❌ Planning docs not updated with completions
3. ❌ Architecture decisions made but not recorded
4. ❌ Implementation exists but task marked "blocked" or "pending"
5. ❌ Tests written but not counted in metrics

**What Causes Drift**:
- Single agent trying to do implementation + documentation
- Context switching overhead
- Documentation happens at boundaries, not continuously
- No automated observation/recording

**What Helps (Current Best Practices)**:
- `/checklist` commands - lightweight reminders
- Aggressive syncing - every few days
- Completion record templates - reduce friction
- But fundamentally, **architecture needs to change**

---

## The Solution: CorticAI as Paired Agent

### Separation of Concerns at Agent Level

**Target Architecture** (Once CorticAI is operational):

```
User Request: "Implement authentication"
         │
         ▼
┌────────────────────────────┐
│ Supervisor/Router Agent    │ ← Task decomposition
└──────┬─────────────────┬───┘   Event orchestration
       │                 │
       │                 │
┌──────▼──────────┐  ┌───▼────────────────────────────┐
│ Implementation  │  │ CorticAI Agent                 │
│ Agent           │  │ (Documentation/Memory)         │
│                 │  │                                 │
│ Focus:          │  │ Focus:                          │
│ - Write code    │  │ - Observe events                │
│ - Run tests     │  │ - Record decisions              │
│ - Commit        │  │ - Update planning docs          │
│                 │  │ - Maintain context network      │
│                 │  │ - Answer queries                │
│                 │  │                                 │
│ Events ────────►│  │ Observes:                       │
│ (automatic)     │  │ • File writes/edits             │
│                 │  │ • Test runs                     │
│                 │  │ • Commits                       │
│                 │  │ • Task boundaries               │
│                 │  │                                 │
│ Queries ◄───────│  │ Retrieves:                      │
│ "Does X exist?" │  │ • Current implementations       │
│ "Where is Y?"   │  │ • Architecture decisions        │
│ "What decided?" │  │ • Related context               │
└─────────────────┘  └─────────────────────────────────┘
                              │
                              ▼
                     Context Network
                     (Graph DB + Analytics DB)
                     Dual-role storage
```

### Why This Architecture Solves Drift

**Key Differences from Single Agent**:

| Aspect | Single Agent | Paired with CorticAI |
|--------|--------------|---------------------|
| **Context Switching** | Constant (code ↔ docs) | None (each agent focused) |
| **Documentation Timing** | At task boundaries | Real-time, continuous |
| **Drift Window** | Hours to days | Zero (immediate recording) |
| **Query Method** | Re-read files | Query CorticAI agent |
| **Sync Required** | Manual, periodic | Automatic, continuous |
| **Attention Split** | Both concerns | Single concern each |

**Implementation Agent Benefits**:
- ✅ Pure focus on task completion
- ✅ No context switching to documentation
- ✅ Fast queries via CorticAI (no file re-reading)
- ✅ Decisions recorded automatically

**CorticAI Agent Benefits**:
- ✅ Full context network model in memory
- ✅ Real-time observation of all changes
- ✅ Can apply semantic processing immediately
- ✅ Maintains planning/implementation alignment
- ✅ Zero drift by design

---

## Event-Driven Architecture

### Event Hooks Specification

**Implementation Agent → CorticAI Observation**:

```typescript
// File Operations
onToolUse('Write', (file: string, content: string) => {
  corticaiAgent.observe({
    type: 'file_created',
    file: file,
    content: content,
    purpose: inferFromTaskContext(),
    timestamp: now()
  })
})

onToolUse('Edit', (file: string, oldContent: string, newContent: string) => {
  corticaiAgent.observe({
    type: 'file_modified',
    file: file,
    changes: diff(oldContent, newContent),
    reason: inferFromContext(),
    timestamp: now()
  })
})

// Test Execution
onToolUse('Bash', (command: string, output: string) => {
  if (command.includes('npm test') || command.includes('vitest')) {
    const results = parseTestOutput(output)
    corticaiAgent.observe({
      type: 'tests_run',
      command: command,
      totalTests: results.total,
      passing: results.passing,
      failing: results.failing,
      newTests: results.new,
      regressions: detectRegressions(results),
      timestamp: now()
    })
  }
})

// Git Operations
onToolUse('Bash', (command: string, output: string) => {
  if (command.startsWith('git commit')) {
    const commitMsg = extractCommitMessage(command)
    corticaiAgent.observe({
      type: 'commit_created',
      message: commitMsg,
      files: parseGitStatus(output),
      timestamp: now()
    })
  }
})

// Task Boundaries
onTaskStart((task: string) => {
  corticaiAgent.observe({
    type: 'task_started',
    task: task,
    context: getCurrentContext(),
    timestamp: now()
  })
})

onTaskComplete((task: string) => {
  corticaiAgent.observe({
    type: 'task_completed',
    task: task,
    duration: calculateDuration(),
    timestamp: now()
  })

  // CorticAI generates completion record
  corticaiAgent.flushCompletionRecord()
  corticaiAgent.updatePlanningDocs()
})
```

### CorticAI Agent Responsibilities

**Real-Time Recording**:
```typescript
class CorticAIAgent {
  private observations: Observation[] = []
  private contextNetwork: ContextNetwork

  async observe(event: Event): Promise<void> {
    // 1. Record raw event
    this.observations.push(event)

    // 2. Apply semantic processing (write-time enrichment)
    const enriched = await this.enrichEvent(event)

    // 3. Update context network
    await this.contextNetwork.record(enriched)

    // 4. Check for completion signals
    if (this.isTaskComplete(event)) {
      await this.generateCompletionRecord()
      await this.updatePlanningDocs()
    }

    // 5. Detect drift patterns
    const drift = await this.detectDrift(event)
    if (drift.severity > threshold) {
      await this.notifySupervisor(drift)
    }
  }

  async query(request: QueryRequest): Promise<QueryResult> {
    // Implementation agent queries CorticAI instead of reading files
    return await this.contextNetwork.query({
      literal: request.query,
      lifecycle: 'current', // exclude deprecated
      projection: request.projection,
      semanticPipeline: this.buildPipeline(request)
    })
  }
}
```

**Semantic Processing (Write-Time)**:
```typescript
async enrichEvent(event: Event): Promise<EnrichedEvent> {
  const enriched = {
    ...event,

    // Q&A generation for vocabulary bridging
    qaEntries: await this.generateQAPairs(event),

    // Relationship inference
    relationships: await this.inferRelationships(event),

    // Lifecycle detection
    lifecycle: await this.detectLifecycle(event),

    // Semantic blocks
    semanticBlocks: await this.extractSemanticBlocks(event),

    // Attention weight (for preventing attention gravity)
    attentionWeight: this.calculateAttentionWeight(event)
  }

  return enriched
}
```

---

## Usage Patterns (How to Use CorticAI)

### Pattern 1: Query Before Implement

**Without CorticAI** (current):
```
Implementation Agent:
1. "Does authentication exist?"
2. Use Grep to search for "auth"
3. Read 5-10 files to understand
4. Maybe find deprecated implementation
5. Start implementing (might duplicate work)
```

**With CorticAI**:
```
Implementation Agent:
1. Query CorticAI: "Does authentication exist?"

CorticAI Agent:
- Searches context network (literal-first)
- Filters by lifecycle=current (excludes deprecated)
- Returns: "Yes, JWT auth in auth.ts:45-120 (current)"
- Includes: Related context, dependencies, recent changes

Implementation Agent:
2. Receives precise answer in <100ms
3. Reads only relevant section
4. Builds on existing work (no duplication)
```

### Pattern 2: Real-Time Documentation

**Without CorticAI** (current):
```
Implementation Agent:
1. Implements feature (30 minutes)
2. Writes tests (20 minutes)
3. Commits code
4. Context switch to documentation (10 minutes)
5. Updates planning docs (often forgotten)
6. Creates completion record (manual effort)

Total: 60+ minutes, drift risk if step 5-6 skipped
```

**With CorticAI**:
```
Implementation Agent:
1. Implements feature (30 minutes)
   └─ CorticAI observes file writes in real-time
2. Writes tests (20 minutes)
   └─ CorticAI records test results automatically
3. Commits code
   └─ CorticAI triggers completion record generation

CorticAI Agent (parallel):
- Observes all events as they happen
- Generates draft completion record
- Updates planning docs automatically
- No context switch required

Total: 50 minutes, zero drift
```

### Pattern 3: Architecture Decision Recording

**Without CorticAI** (current):
```
Implementation Agent:
1. Makes architectural decision during implementation
2. Implements based on decision
3. (Decision remains in agent's working memory)
4. Task completes
5. Decision lost unless manually documented
```

**With CorticAI**:
```
Implementation Agent:
1. Makes architectural decision
2. Signals decision to CorticAI (or CorticAI infers from code)

CorticAI Agent:
- Detects decision pattern in code
- Extracts decision context
- Creates ADR stub or decision record
- Links to implementation
- Flags for review if significant

3. Implementation continues
4. Decision preserved automatically
```

### Pattern 4: Continuous Sync (Zero Drift)

**Without CorticAI** (current):
```
Week 1:
- 3 tasks completed
- Documentation happens at boundaries
- Planning docs not updated
- Drift accumulates

Week 2:
- Manual /sync required
- 45 minutes to detect and document drift
- Risk of missing undocumented work
```

**With CorticAI**:
```
Week 1:
- 3 tasks completed
- CorticAI observes all work in real-time
- Planning docs updated automatically
- Completion records generated automatically
- Zero drift

Week 2:
- No sync needed (continuous sync)
- Optional review: "CorticAI, summarize last week"
- 5 minutes to review, not 45 to sync
```

---

## Integration with Semantic Processing Architecture

### How CorticAI Uses the 5-Stage Pipeline

**Stage 1: Query Parsing** (Literal Preservation)
```
Implementation Agent: "deprecated kuzu"
CorticAI: Preserves exact query, classifies intent
         Does NOT expand to "database" or "old"
```

**Stage 2: Structural Filtering** (Metadata-First)
```
CorticAI: Filters by lifecycle metadata FIRST
         lifecycle=deprecated + contains("kuzu")
         Returns only deprecation notices, not usage guides
```

**Stage 3: Semantic Enrichment** (Add Understanding)
```
CorticAI: Adds context, relationships, supersession info
         "Kuzu deprecated Oct 2025, replaced by SurrealDB"
         Links to migration guide
```

**Stage 4: Semantic Ranking** (Order Results)
```
CorticAI: Ranks by attention weight, recency, relevance
         Most recent deprecation notice ranked first
```

**Stage 5: Semantic Presentation** (Assemble Answer)
```
CorticAI: Returns coherent answer with:
         - Deprecation notice
         - Replacement recommendation
         - Migration status
         - Related context
```

### Attention Gravity Prevention

**The Problem CorticAI Solves**:
- Historical documentation (Kuzu usage guides) has more volume/detail
- Search engines bias toward volume → old info ranks higher
- Fresh agents get overwhelmed by superseded approaches

**How CorticAI Prevents This**:
1. **Lifecycle Metadata**: Every node tagged with lifecycle state
2. **Metadata-First Filtering**: lifecycle=current filter applied before semantic ops
3. **Attention Weights**: Current docs weighted higher than historical
4. **Projection-Based Compression**: Historical content compressed, not deleted
5. **Supersession Relationships**: Explicit "replaces" edges in graph

**Result**: Fresh agents see current guidance first, historical context on request

---

## Implementation Roadmap

### Phase 1: Event Observation Infrastructure (Weeks 1-2)

**Goal**: CorticAI can observe implementation agent events

**Tasks**:
- [ ] Design event hook architecture
- [ ] Implement file operation hooks (Write, Edit)
- [ ] Implement test execution hooks (Bash, test parsers)
- [ ] Implement git operation hooks (commits, branches)
- [ ] Create event queue/buffer for CorticAI agent
- [ ] Build event → context network recording pipeline

**Success Criteria**:
- CorticAI observes all file writes in real-time
- Test results automatically recorded
- Commit messages linked to code changes

### Phase 2: CorticAI Query Interface (Weeks 3-4)

**Goal**: Implementation agents can query CorticAI instead of reading files

**Tasks**:
- [ ] Implement query API for implementation agents
- [ ] Build 5-stage semantic pipeline
- [ ] Integrate lifecycle filtering
- [ ] Create projection-based response assembly
- [ ] Performance optimization (<100ms queries)

**Success Criteria**:
- "Does X exist?" queries return accurate results
- lifecycle=current filtering excludes deprecated content
- Query latency <100ms P95

### Phase 3: Automatic Documentation Generation (Weeks 5-6)

**Goal**: CorticAI generates completion records and updates planning docs

**Tasks**:
- [ ] Task completion detection
- [ ] Completion record template generation
- [ ] Planning doc update automation
- [ ] Metrics calculation and tracking
- [ ] Discovery record generation

**Success Criteria**:
- Completion records generated automatically on task completion
- Planning docs updated in real-time
- Zero manual sync required
- Drift score remains 9-10/10 continuously

### Phase 4: Advanced Features (Weeks 7-8)

**Goal**: CorticAI provides proactive assistance

**Tasks**:
- [ ] Architecture decision detection and recording
- [ ] Contradiction detection (conflicting implementations)
- [ ] Staleness detection (outdated documentation)
- [ ] Proactive recommendations ("Consider updating X")
- [ ] Multi-agent coordination (implementation + CorticAI + review agents)

**Success Criteria**:
- Architectural decisions captured automatically
- Contradictions flagged before merge
- Stale docs updated proactively

---

## Comparison: Current vs. Target Architecture

### Current Architecture (Building CorticAI)

```
┌──────────────────────────────────────────┐
│ Single Agent (Claude Code)              │
│                                          │
│ Responsibilities:                        │
│ ✓ Understand task                        │
│ ✓ Query context (read files)            │ ← Slow (re-read each time)
│ ✓ Implement feature                      │
│ ✓ Write tests                            │
│ ✓ Run tests                              │
│ ✓ Update documentation                   │ ← Context switch
│ ✓ Update planning docs                   │ ← Often forgotten
│ ✓ Create completion record               │ ← Manual effort
│ ✓ Maintain context in working memory     │ ← Limited capacity
│                                          │
│ Problems:                                │
│ • Attention split across 9 concerns      │
│ • Context switching overhead             │
│ • Documentation as afterthought          │
│ • Drift accumulates between syncs        │
│ • Must re-read files for every query     │
└──────────────────────────────────────────┘
```

### Target Architecture (Using CorticAI)

```
┌─────────────────────────┐  ┌──────────────────────────────┐
│ Implementation Agent    │  │ CorticAI Agent               │
│                         │  │                              │
│ Responsibilities:       │  │ Responsibilities:            │
│ ✓ Understand task       │  │ ✓ Observe events             │
│ ✓ Query CorticAI        │◄─┤ ✓ Maintain context network  │
│ ✓ Implement feature     │  │ ✓ Apply semantic processing  │
│ ✓ Write tests           │  │ ✓ Answer queries (<100ms)    │
│ ✓ Run tests             │──┤ ✓ Generate completion recs   │
│                         │  │ ✓ Update planning docs       │
│ Focus:                  │  │ ✓ Detect drift/contradictions│
│ • Pure task completion  │  │ ✓ Provide recommendations    │
│ • Zero context switch   │  │                              │
│ • Fast queries          │  │ Focus:                       │
│ • No documentation load │  │ • Real-time observation      │
│                         │  │ • Continuous documentation   │
│ Benefits:               │  │ • Context preservation       │
│ • 30% faster impl       │  │ • Zero drift                 │
│ • Better code quality   │  │                              │
│ • No drift              │  │ Benefits:                    │
│ • Happier agents        │  │ • Full context model         │
└─────────────────────────┘  │ • Immediate recording        │
                              │ • Proactive assistance       │
                              └──────────────────────────────┘
```

---

## Key Design Principles

### 1. Separation of Concerns (Agent Level)
**Principle**: Each agent should have ONE primary concern
- Implementation agent: Task completion
- CorticAI agent: Documentation and context management
- Supervisor agent: Coordination and routing

**Why**: Same reason functions should be single-purpose - reduces cognitive load, increases quality

### 2. Event-Driven, Not Polling
**Principle**: CorticAI observes events as they happen, doesn't poll for changes
- Implementation agent fires events automatically
- CorticAI receives events in real-time
- Zero latency between action and recording

**Why**: Continuous sync with zero drift window

### 3. Query-First, Not Read-First
**Principle**: Implementation agents query CorticAI instead of reading files
- Fast semantic search (<100ms)
- Lifecycle-aware results
- Context automatically included

**Why**: Faster, more accurate, prevents attention gravity

### 4. Write-Time Enrichment, Not Query-Time
**Principle**: Semantic processing happens during recording, not during queries
- Pay cost once (write-time)
- Benefit 1000+ queries
- Consistent query performance

**Why**: Speed and cost optimization (see [[../semantic-processing/write-time-enrichment.md]])

### 5. Continuous Sync, Not Periodic
**Principle**: Documentation happens continuously, not at boundaries
- Every event recorded immediately
- Planning docs updated in real-time
- Zero manual sync required

**Why**: Eliminates drift by design

---

## Lessons from 100+ Context Networks

### What We've Learned

**Drift Patterns** (across 100+ networks):
1. **Completion Record Discipline**: HIGH - Teams create completion records
2. **Planning Doc Updates**: LOW - Often forgotten during implementation
3. **Architecture Decisions**: MEDIUM - Recorded if prompted, missed if not
4. **Test Metrics**: LOW - Tests run but counts not updated
5. **Discovery Records**: LOW - Important findings lost in conversation

**Why Single Agent Struggles**:
- Attention is finite resource
- Context switching has cognitive cost
- Documentation feels like "extra work" when focused on implementation
- Humans do the same - can't code and document simultaneously at high quality

**Why /checklist Helps (Current Best Practice)**:
- ✅ Lightweight reminder (minimal context switch)
- ✅ Checklist persists across messages
- ❌ Still requires manual effort
- ❌ Still happens at task boundaries (not continuous)
- ❌ Doesn't solve query performance

**Why CorticAI Will Work Better**:
- ✅ Zero context switch (separate agent)
- ✅ Continuous, not periodic
- ✅ Automatic, not manual
- ✅ Fast queries replace file reading
- ✅ Proactive assistance possible

---

## Meta: Using This Document

### For Current CorticAI Development Team

**Understanding the Problem You're Solving**:
- You're experiencing the problem CorticAI will solve
- Manual syncs every few days = proof of need
- This document explains why you're building this

**Bootstrap Strategy**:
Until CorticAI is operational, use:
1. `/checklist` for task tracking
2. `/sync` every 2-3 days aggressively
3. Completion record templates
4. Focus on getting CorticAI working so you can use it

**Success Metric**:
When CorticAI can document itself → bootstrap complete

### For Future CorticAI Users

**How to Integrate CorticAI**:
1. Set up event hooks from implementation agents
2. Configure CorticAI agent with context network access
3. Route queries through CorticAI
4. Let CorticAI handle documentation automatically

**Expected Benefits**:
- 30% faster implementation (no context switch)
- Zero drift (continuous sync)
- Better code quality (focus on task)
- Faster queries (<100ms vs re-reading files)
- Proactive assistance (contradiction detection, stale doc warnings)

### For Researchers/Academics

**Novel Contributions**:
1. **Agent-level separation of concerns** - Not just function-level SRP
2. **Event-driven documentation** - Continuous, not periodic
3. **Attention gravity prevention** - Lifecycle metadata + semantic ranking
4. **Write-time enrichment** - Pay cost once, benefit many queries
5. **Paired agent pattern** - Observer + implementer collaboration

**Validation**:
- 100+ context networks show drift problem is real
- Manual sync requirements prove need for automation
- Single-agent architecture fundamentally limited by attention

---

## Related Documentation

### Architecture
- [[../semantic-processing/index.md]] - How CorticAI processes information
- [[../semantic-processing/attention-gravity-problem.md]] - The problem being solved
- [[../semantic-processing/write-time-enrichment.md]] - When semantic processing happens
- [[../dual-role-storage.md]] - Graph + Analytics storage architecture

### Decisions
- [[../../decisions/adr-semantic-operations-placement.md]] - 5-stage pipeline specification
- [[../../decisions/adr_004_cosmos_db_dual_role_storage.md]] - Storage architecture

### Implementation
- [[../../planning/groomed-backlog.md]] - Current development priorities
- [[../../planning/roadmap.md]] - Phases including semantic processing implementation

---

## Questions This Document Answers

**Meta Questions** (Building CorticAI):
- **Why is building CorticAI hard?** → Bootstrap problem - building documentation agent without one
- **Why do we need aggressive syncing?** → Single agent architecture causes drift
- **How long until bootstrap complete?** → When CorticAI can document itself

**Architecture Questions** (Using CorticAI):
- **What is CorticAI?** → Specialized documentation agent, not just storage
- **How does it prevent drift?** → Real-time observation, continuous sync
- **Why paired agents?** → Separation of concerns, no context switching
- **How fast are queries?** → <100ms P95 (vs seconds re-reading files)

**Usage Questions**:
- **How do I integrate CorticAI?** → Event hooks + query interface
- **What events should I send?** → File ops, tests, commits, task boundaries
- **How do I query?** → Natural language through CorticAI agent API
- **Do I still create completion records?** → No, CorticAI generates them

**Design Questions**:
- **Why event-driven?** → Continuous sync, zero drift window
- **Why write-time enrichment?** → Pay cost once, fast queries
- **Why lifecycle metadata?** → Prevents attention gravity (old docs overwhelming new)
- **Why separate agent?** → Attention is finite, can't split between concerns

---

## Success Criteria

**For Current Development** (Building CorticAI):
- ✅ Context network structure designed
- ✅ Semantic processing architecture documented
- ✅ Dual-role storage implemented (Kuzu + DuckDB)
- ⏳ Event hook infrastructure (Phase 1)
- ⏳ Query interface (Phase 2)
- ⏳ Auto-documentation (Phase 3)
- ⏳ Self-documentation (bootstrap complete)

**For Production Use** (Using CorticAI):
- Implementation agents query CorticAI, not files
- Zero manual sync required (continuous)
- Drift score remains 9-10/10 always
- Completion records generated automatically
- Planning docs updated in real-time
- Queries <100ms P95
- 30% faster implementation (measured)

---

## Changelog

- **2025-10-29**: Initial architecture specification
  - Documented bootstrap problem (meta)
  - Defined paired agent architecture
  - Specified event-driven design
  - Captured lessons from 100+ networks
  - Explained usage patterns
  - Created implementation roadmap

---

*This document serves dual purposes: understanding the challenges of building CorticAI (meta) and defining how CorticAI will be used (usage). Both perspectives are essential for the team building it and users who will integrate it.*
