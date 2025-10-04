# MAINT-001: Project Root Documentation Migration

## Metadata
- **Status:** ready
- **Type:** maintenance
- **Epic:** infrastructure
- **Priority:** high
- **Size:** medium
- **Created:** 2025-09-27
- **Branch:** task/MAINT-001-root-cleanup

## Description
Move documentation files from project root to appropriate context network locations while preserving all internal references and links. This addresses critical boundary violations identified in the maintenance audit.

## Acceptance Criteria
- [ ] Move `AGENTS.md` to `context-network/elements/processes/agent-instructions.md`
- [ ] Move `apply-recommendations.md` to `context-network/processes/recommendation-triage.md`
- [ ] Move `DEVELOPMENT.md` to `context-network/foundation/development-guide.md`
- [ ] Move `ESLINT-SETUP.md` to `context-network/foundation/linting-setup.md`
- [ ] Move `pr-recommendations-report.md` to `context-network/sync-reports/pr-recs-2024-09-24.md`
- [ ] Move `recommendation-application-report.md` to `context-network/sync-reports/rec-app-2024-09-24.md`
- [ ] Update all internal references and links to moved files
- [ ] Verify no broken links remain after migration
- [ ] Update any CI/CD references to moved documentation

## Original Recommendation
From Context Network Audit: "Execute Project Root Cleanup - Move 6 docs to context network"

## Risk Assessment
**Risk Level:** Medium
- Could break internal documentation references
- May affect CI/CD or tooling that references these files
- Requires careful reference tracking

## Dependencies
- Requires understanding of all files that might reference these documents
- Need to check for hardcoded paths in tooling/scripts

## Effort Estimate
- **Time:** 45-60 minutes
- **Complexity:** Medium (file moves + reference updates)
- **Testing:** Verify all links work after migration