# In Review Tasks

Tasks with pull requests awaiting review and merge.

## Pending Reviews

<!-- NOTE: TEST-002 shows implementation complete in task file but no PR created yet.
     Task file indicates comprehensive changes were made and validated.
     Awaiting PR creation or confirmation that work was merged without PR reference. -->

- **[TEST-002](../tasks/TEST-002.md)** - Separate Integration Tests from CI Suite
  - **Priority:** High (Blocks INFRA-006)
  - **PR:** Not yet created (awaiting PR or status clarification)
  - **Status:** Implementation noted as complete in task file (2025-10-01), but no PR found

## Navigation
- [Back to Status Index](../index.md)
- [In Progress Tasks](./in-progress.md)
- [Completed Tasks](./completed.md)

## PR Review Process
1. Automated checks must pass
2. Code review required
3. Testing verification
4. Documentation review
5. Merge via `/pr-complete`

## GitHub CLI Commands
```bash
# Check PR status
gh pr status

# View PR details
gh pr view [PR-NUMBER]

# Review PR
gh pr review [PR-NUMBER]
```

---
*Last Updated: 2025-10-01*
*Active Reviews: 1*