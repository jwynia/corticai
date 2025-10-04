# Backlog Index

## Quick Stats
- **Total Tasks:** 102
- **Ready:** 59
- **Planned:** 0
- **In Progress:** 0
- **In Review:** 1
- **Completed:** 40
- **Superseded:** 1
- **Archived:** 6 (oversized tasks decomposed + IMPL-003 parent)
- **Last Updated:** 2025-10-02 (Reality sync: 11 tasks moved from ready to completed)

## Navigation
- [By Status](./by-status/) - Tasks grouped by workflow state
- [By Epic](./by-epic/) - Tasks organized by feature area
- [Current Sprint](../roadmap/current-sprint.md) - Active work
- [Roadmap](../roadmap/index.md) - Long-term planning

## Task Workflow States
1. **Planned** - Initial task creation from /plan
2. **Ready** - Groomed and ready for implementation
3. **In Progress** - Active development in worktree
4. **In Review** - PR created and under review
5. **Completed** - Merged and deployed
6. **Superseded** - Replaced by other tasks or approaches
7. **Archived** - Moved to archive after sprint

## Task ID Patterns
- `TASK-XXX` - General development tasks
- `FEAT-XXX` - Feature implementation
- `BUG-XXX` - Bug fixes
- `REFACTOR-XXX` - Code refactoring
- `DOC-XXX` - Documentation tasks
- `INFRA-XXX` - Infrastructure and tooling
- `TEST-XXX` - Test coverage and quality

## Recently Updated
- 2025-10-02: **REALITY SYNC APPLIED** - 11 completed tasks discovered
  - Entire IMPL-003 authentication system (7 subtasks) completed via PRs #27-34
  - WEB-007-2 (Device Capability Detection) completed via PR #24
  - WEB-005-1 (Form Designer API Foundation) completed via PR #25
  - All tasks moved from ready to completed status
  - Status drift: ~7 days between completion and documentation
- 2025-10-02: IMPL-003 decomposed into 7 context-window-sized subtasks
  - IMPL-003 (14 acceptance criteria, large size) archived as oversized
  - Created IMPL-003-1 through IMPL-003-7 following Assessment → Foundation → Core → Security pattern
  - Subtasks: Assessment (1), JWT Foundation (1), Token Management (1), RBAC (1), Multi-Tenancy (1), Security Hardening (1), Extended Auth (1)
  - All subtasks are small/medium size with ≤5 acceptance criteria
  - Clear dependency chain and implementation sequence defined
  - Total ready tasks: 64 → 70 (+6 net)
- 2025-10-01: TEST-002 implemented and moved to in-review
  - Separated integration tests from CI suite
  - Unit tests (5 suites, 80 tests) now run without database
  - Integration tests moved to tests/integration/ (local validation only)
  - Removed itWithDb helper - integration tests fail loudly if DB unavailable
  - Created comprehensive testing documentation (tests/README.md)
  - Unblocks INFRA-006 once merged
  - Branch: task/TEST-002-separate-integration-tests
- 2025-10-01: INFRA-006 marked as blocked (waiting on TEST-002)
  - Moved from "in-review" to "ready" (no PR exists)
  - Blocked by TEST-002 - integration test separation must come first
- 2025-10-01: WEB-007-1 completed and merged (PR #26)
  - Authentication Context and Device Detection
  - 21 comprehensive tests, 357/357 passing
  - Foundation for WEB-007 authentication epic
  - Merged by jwynia
- 2025-10-01: PR #26 code review generated 4 new tasks
  - SEC-011: Implement Secure Authentication State Storage (High priority)
  - WEB-007-9: Replace Mock Authentication with Real API Integration (High priority)
  - REFACTOR-006: Clean Up ESLint Inline Disables in Auth Provider (Low priority)
  - QUALITY-002: Extract Magic Numbers to Named Constants (Low priority)
- 2025-10-01: AUTH-002 decomposed into 4 subtasks - Magic Link Authentication
  - AUTH-002 (100 lines) → AUTH-002-1 through AUTH-002-4
  - Subtasks: Token Infrastructure, Email Delivery, Verification & Rate Limiting, Cleanup & UX
- 2025-10-01: AUTH-005 superseded by WEB-007 series - Better task decomposition
- 2025-09-30: Decomposed 3 oversized tasks into 24 context-window-sized subtasks
  - WEB-005 (641 lines) → WEB-005-1 through WEB-005-8 (Form Designer)
  - WEB-006 (680 lines) → WEB-006-1 through WEB-006-8 (Dashboard)
  - WEB-007 (782 lines) → WEB-007-1 through WEB-007-8 (Authentication UI)
- 2025-09-27: WEB-004 completed - Dynamic Form Renderer Engine
- 2025-09-27: WEB-003 completed - API Client Integration
- 2025-09-26: WEB-002 completed - Design System and Component Library
- 2025-09-26: WEB-001 completed - React SPA Foundation

## Quick Commands
- `/plan <description>` - Create new task in planned state
- `/groom` - Review and refine planned tasks
- `/implement TASK-XXX` - Start work on ready task
- `/pr-prep` - Prepare and create pull request
- `/pr-complete` - Merge PR and cleanup

## Metadata
- **Created:** 2025-01-21
- **System:** Branch-based workflow with worktrees
- **Context Limit:** Task files max 200 lines