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
→ **[Unified Backlog](./unified_backlog.md)** - Single source of truth for ALL work items (research + implementation)

### Strategic Planning
- [Roadmap](./roadmap.md) - High-level project phases and vision
- [Implementation Phases](./implementation_phases.md) - Detailed phase dependencies and approach
- [Milestones](./milestones.md) - Key delivery targets

### Specialized Backlogs (Reference Only)
- [Research Backlog](./research_backlog.md) - Detailed research tasks (integrated into unified backlog)

## Current Status

### Active Phase
**Implementation** - Building core components with validated research

### Recently Completed
✅ **Universal Fallback Adapter** - Foundation implementation complete (95.71% coverage)
✅ **Research Validation** - Universal patterns validated against academic sources

### Next Up (From Groomed Backlog 2025-08-30)
1. Create Basic Attribute Index (unblocked)
2. Prototype TypeScript Dependency Analyzer (unblocked)
3. Build Simple Novel Adapter (depends on #1)

### Key Decisions Pending
- File watching library choice
- Memory consolidation strategy

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