# FEAT-001: Create Task Auto-ID Generator

## Metadata
- **Status:** ready
- **Type:** feat
- **Epic:** infrastructure
- **Priority:** medium
- **Size:** small
- **Created:** 2025-01-21
- **Updated:** 2025-01-21
- **Groomed:** 2025-09-23

## Branch Info
- **Branch:** feat/task-auto-id-generator
- **Worktree:** [will be set during implementation]
- **PR:** #pending

## Description
Implement an automatic task ID generator for the /plan command. This will ensure unique, sequential task IDs are assigned automatically when creating new tasks in the backlog.

## Acceptance Criteria
- [ ] Reads existing task files to find highest ID per prefix
- [ ] Generates next sequential ID for given type
- [ ] Supports all prefixes: TASK, FEAT, BUG, REFACTOR, DOC, INFRA, TEST, IMPL
- [ ] Creates ID in format PREFIX-NNN (e.g., TASK-042)
- [ ] Handles concurrent task creation safely
- [ ] Integrated into /plan command workflow
- [ ] Supports custom prefix addition via configuration
- [ ] Validates prefix format before generating ID

## Technical Notes
- Scan `backlog/tasks/` directory for existing IDs
- Parse filenames to extract highest number per prefix
- Consider using a simple counter file as cache (`.task-counters.json`)
- Must handle missing task files (gaps in sequence)
- Use file locking or atomic operations for concurrent safety
- Cache should be invalidated when task files are deleted
- Return format: `{prefix: string, number: number, full: string}`
- Example: `{prefix: "FEAT", number: 42, full: "FEAT-042"}`

## Dependencies
- Basic backlog structure must exist (✅ EXISTS)
- File system access with read permissions (✅ AVAILABLE)

## Testing Strategy
- Unit test ID generation with various existing files
  - Test each supported prefix
  - Test with 1, 10, 100+ existing tasks
- Test with empty backlog (first task)
  - Should generate PREFIX-001 for each type
- Test with gaps in sequence
  - Missing FEAT-002 should still generate FEAT-004 if FEAT-003 exists
- Test concurrent ID generation
  - Simulate multiple simultaneous requests
  - Verify no ID collisions occur
- Integration test with /plan command
  - Ensure seamless integration with existing workflow
- Edge cases:
  - Invalid prefix handling
  - Corrupted cache file recovery
  - Maximum ID number handling (999+)

## Notes
- Consider adding a lock mechanism for concurrent access
- May want to add ID recycling for deleted tasks later
- Could extend to support custom prefixes in future