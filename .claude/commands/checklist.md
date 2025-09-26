## Quick Session Closure Checklist

We're about to close this session and lose anything not captured that we might need later. Are all of the following done?

## ⚠️ BLOCKING Completion Criteria (Cannot Close Session if Any Fail)

### Build & Test Status
- [ ] **Build compiles with ZERO TypeScript errors** (build errors block ALL functionality)
- [ ] **ALL tests pass with ZERO failures** (failing tests mean features don't work correctly)
- [ ] **NO tests are skipped, disabled, or marked as TODO** (incomplete test coverage)
- [ ] **Linting passes with ZERO errors/warnings** (code quality standards met)

> **Critical:** If any of the above are failing, the implementation is **NOT COMPLETE**. These are not "external issues" or "someone else's problem" - they are fundamental completion criteria that must be resolved before closing the session.

### Context Network Task Management
- [ ] Context network task entry exists and is updated with current status
- [ ] Task discoveries documented in `/discoveries/records/YYYY-MM-DD-###.md`
- [ ] All architectural decisions are documented (with ADRs if significant)
- [ ] Implementation approach is recorded

### Discovery Layer Updates
- [ ] **Discovery records created** for all insights meeting trigger criteria (see `/discoveries/triggers.md`)
- [ ] **Location indexes updated** with any new component/feature locations found
- [ ] **Learning paths updated** if understanding evolved significantly
- [ ] Code exploration insights captured with file paths and line numbers

### Relationship & Navigation
- [ ] Discovered relationships are mapped between components/concepts
- [ ] Navigation hubs updated if new paths discovered
- [ ] Bidirectional links established where appropriate

### Quality & Boundaries  
- [ ] Follow-up items are noted in appropriate sections
- [ ] **No planning documents exist outside the context network**
- [ ] All documents follow size limits (flag documents >300 lines)
- [ ] **Obsolete content archived** (not just deleted)

### Discovery Triggers Met?
Review `/discoveries/triggers.md` - did any of these happen without documentation?
- [ ] Spent >5 minutes figuring out how something works
- [ ] Read >3 files to understand one feature
- [ ] Found "I know I saw this somewhere" moments
- [ ] Discovered why something was designed a certain way

### Final Validation Before Session Close

**STOP:** Before closing this session, verify the fundamental principle:

- [ ] **If build errors exist, I have fixed them** (not documented them for others)
- [ ] **If tests are failing, I have made them pass** (not noted them as "known issues")
- [ ] **If implementation was started, it is functionally complete** (builds + tests pass)

**Remember:**
- Build errors aren't "technical debt" - they prevent ANY functionality from working
- Test failures aren't "minor issues" - they indicate the feature doesn't work as specified
- These are completion criteria, not optional improvements

$ARGUMENTS