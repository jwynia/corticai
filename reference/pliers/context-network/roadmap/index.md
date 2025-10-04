# Roadmap Index

## Overview
This roadmap coordinates with the [Backlog](../backlog/) for task execution using a branch-based workflow with git worktrees.

## Current Focus
- **Active Sprint:** Sprint 1 (2025-01-21 to 2025-02-04)
- **Sprint Goal:** Establish development workflow and tooling
- **Tasks in Progress:** 0
- **Tasks Ready:** 1

## Navigation
- [Current Sprint](./current-sprint.md) - Active work
- [Milestones](./milestones/) - Long-term goals
- [Backlog](../backlog/) - Task management
- [Existing Roadmap](../planning/roadmap/overview.md) - Detailed project roadmap

## Workflow States
Tasks flow through these states:
1. **Planned** - Created via `/plan`
2. **Ready** - Groomed via `/groom`
3. **In Progress** - Started via `/implement`
4. **In Review** - PR created via `/pr-prep`
5. **Completed** - Merged via `/pr-complete`

## Branch Strategy
- **Main Branch:** Production-ready code only
- **Feature Branches:** `task/[TASK-ID]-description`
- **Worktrees:** `.worktrees/[TASK-ID]/`
- **PR Merges:** Squash and merge to main

## Quick Commands
```bash
# Planning & grooming
/plan "Create new feature"        # Create task in backlog
/groom TASK-001                   # Refine task details

# Implementation
/implement TASK-001               # Start work in worktree

# PR workflow
/pr-prep                          # Create pull request
/pr-complete 42                   # Merge PR #42
```

## Metrics
- **Velocity:** [To be measured]
- **Cycle Time:** [To be measured]
- **PR Merge Rate:** [To be measured]

---
*Last Updated: 2025-01-21*