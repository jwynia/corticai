# Planning Index

## Purpose
Central navigation point for all project planning, prioritization, and task management. This section contains the roadmap, backlog, and implementation strategy.

## Classification
- **Domain:** Planning
- **Stability:** Dynamic
- **Abstraction:** Structural
- **Confidence:** Established

## Primary Planning Documents

### 🎯 Start Here for Task Selection
→ **[Technical Backlog](./backlog.md)** - Detailed technical tasks by phase with implementation specifics

### Strategic Planning
- [Roadmap](./roadmap.md) - High-level project phases and vision (UPDATED with use case insights)
- [Implementation Phases](./implementation_phases.md) - Detailed phase dependencies and approach
- [Milestones](./milestones.md) - Key delivery targets

### Future Phases Planning
- [Cosmos DB Integration Plan](./cosmos-db-integration-plan.md) - Cloud storage architecture strategy
- **→ [Cosmos Storage Tasks](./backlog/cosmos-storage-tasks.md)** - Detailed task breakdown for cloud deployment

### Validation & Meta-Planning
- [CorticAI Validation Cases](./corticai-validation-cases.md) - How CorticAI proves its value by solving its own coordination problems
- [Self-Hosting Transition Strategy](./self-hosting-transition-strategy.md) - Progressive transition from manual to automated context management

### Legacy Backlogs (Being Migrated)
- [Unified Backlog](./unified_backlog.md) - Previous combined backlog
- [Research Backlog](./research_backlog.md) - Research-specific tasks

## Current Status

### Active Phase
**Phase 1: Core Engine ✅ COMPLETE**
- KuzuStorageAdapter implemented
- QueryBuilder/QueryExecutor working
- UniversalFallbackAdapter created
- ContextInitializer functional

### Recently Completed
✅ **Phase 1 Core Engine** - Graph storage and query system complete
✅ **Use Case Analysis** - Place context validated design choices

### Next Priority: Phase 2 - Progressive Loading
1. Define ContextDepth enum (Week 1)
2. Implement depth-aware queries (Week 1-2)
3. Add property filtering (Week 2-3)
4. Create lazy loading (Week 3-4)

### Key Decisions Pending
- File watching library choice
- Memory consolidation strategy

### Future Architecture Decisions
- **Cloud Storage Strategy**: Cosmos DB dual-role architecture planned for Phase 7
  - **Context**: Local-first development with cloud-native deployment capability
  - **Decision Point**: After Phase 5 completion, before production scaling needs
  - **Detail Available**: [[cosmos-db-integration-plan]] and [[cosmos-storage-tasks]]

## Planning Principles

### Integration Over Separation
- Research tasks are first-class work items
- Validation happens before implementation
- Learning is documented as we go

### Dependency-Driven Sequencing
- Work is ordered by what enables what
- Blockers are explicitly identified
- Parallel work is highlighted

### Value-Focused Prioritization
- Validate risky assumptions early
- Deliver working pieces incrementally
- Defer optimization and nice-to-haves

## How to Use Planning Documents

### For Daily Work
1. Check [Unified Backlog](./unified_backlog.md) for next task
2. Look at "Next Up Queue" section
3. Pick top unblocked task
4. Update status when complete

### For Sprint Planning
1. Review validation milestones
2. Select tasks that advance milestones
3. Balance research with implementation
4. Include decision points that need resolution

### For Strategic Updates
1. Review [Roadmap](./roadmap.md) quarterly
2. Update phase status based on milestones
3. Adjust based on research findings
4. Document major pivots in decisions

## Task Types

### Research Tasks
- Validate assumptions
- Explore technical approaches
- Create proof of concepts
- Document findings

### Implementation Tasks
- Build core components
- Integrate systems
- Create production code
- Write tests

### Validation Tasks
- Confirm cross-domain application
- Benchmark performance
- Test scalability
- Verify user value

## Success Tracking

### Current Progress
- Research documents created: 20+
- Core concepts validated: ✅ Complete (externally validated)
- Foundation components: 1/3 (Universal Fallback Adapter ✅)
- Test coverage achieved: 95.71%
- Implementation confidence: HIGH (90%+)

### Validation Checkpoints
- [x] Universal entity extraction works ✅
- [ ] Dependency tracking validated
- [ ] Attribute queries functional
- [x] Cross-domain patterns confirmed ✅ (academically validated)
- [ ] Refactoring safety proven

## Relationships
- **Parent Nodes:** [context-network/discovery.md]
- **Child Nodes:** All planning documents
- **Related Nodes:** 
  - [research/index.md] - Research that informs planning
  - [architecture/corticai_architecture.md] - System design
  - [decisions/decision_index.md] - Decisions affecting plan

## Navigation Guidance
- **Access Context:** Start here for any project planning needs
- **Common Next Steps:** Check unified backlog, review roadmap
- **Related Tasks:** Sprint planning, task selection, progress tracking
- **Update Patterns:** Backlog updated daily, roadmap quarterly

## Metadata
- **Created:** 2025-08-28
- **Last Updated:** 2025-08-30
- **Updated By:** Retrospective Analysis
- **Major Update:** Implementation phase begun, Universal Fallback Adapter complete