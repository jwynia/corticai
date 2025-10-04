# Groomed Task Backlog - 2025-09-25

## 🚀 Ready for Implementation

### 1. Fix ESLint Configuration Jest Environment Issue
**One-liner**: Resolve configuration conflict to enable code quality checks
**Effort**: 30-60 minutes
**Files to modify**:
- `.eslintrc.js`
- Potentially `package.json` dependencies

<details>
<summary>Full Implementation Details</summary>

**Context**: ESLint fails due to @react-native-community preset expecting jest/globals environment that isn't properly configured.

**Acceptance Criteria**:
- [ ] ESLint runs without configuration errors
- [ ] Jest test files properly linted
- [ ] React Native specific rules still applied
- [ ] All existing code passes linting

**Implementation Guide**:
1. Update ESLint configuration to properly register jest plugin environments
2. Test with npm run lint command
3. Fix any linting errors in existing code
4. Verify CI/CD pipeline compatibility

**Watch Out For**:
- Version conflicts between @react-native-community and eslint-plugin-jest
- Potential need to update multiple dependency versions
- Impact on existing code that may fail new linting rules

</details>

---

### 2. Fix Failing IdentityService Tests
**One-liner**: Resolve test failures in identity service to restore test suite integrity
**Effort**: 1-2 hours
**Files to modify**:
- `mobile/src/services/identity/__tests__/IdentityService.test.js`
- `mobile/src/services/identity/__tests__/mocks/sodium.js`

<details>
<summary>Full Implementation Details</summary>

**Context**: 11 tests failing in IdentityService, appears to be mock configuration or test setup issues rather than implementation problems.

**Acceptance Criteria**:
- [ ] All IdentityService tests pass
- [ ] Test coverage maintained at 78%+
- [ ] Mock implementations properly configured
- [ ] No changes to production code unless bugs found

**Implementation Guide**:
1. Debug failing test cases to identify root cause
2. Update mock configurations as needed
3. Ensure test isolation and proper cleanup
4. Verify performance benchmarks still valid

**Watch Out For**:
- Mock state not being reset between tests
- Async timing issues in test setup
- Platform-specific behavior in mocks

</details>

---

### 3. Implement Proper Logging System
**One-liner**: Replace console.* with structured logging for production readiness
**Effort**: 4-6 hours
**Files to modify**:
- New file: `mobile/src/services/logging/LoggerService.js`
- Multiple files with console.* calls

<details>
<summary>Full Implementation Details</summary>

**Context**: Production readiness requires structured logging with levels, context, and potential remote collection.

**Acceptance Criteria**:
- [ ] LoggerService with debug, info, warn, error levels
- [ ] Structured JSON logging format
- [ ] All console.* calls replaced
- [ ] Sensitive data filtering
- [ ] Performance timing helpers
- [ ] < 1ms logging overhead

**Implementation Guide**:
1. Create LoggerService with adapter pattern
2. Implement console adapter for development
3. Add structured context support
4. Replace all console.* calls systematically
5. Add performance timing helpers
6. Test with different log levels

**Watch Out For**:
- Sensitive data in logs (keys, passwords, tokens)
- Performance impact on mobile devices
- Log storage and rotation strategy
- React Native compatibility

</details>

---

### 4. Split DatabaseService Architecture
**One-liner**: Decompose 606-line DatabaseService into focused modules
**Effort**: 1-2 days
**Files to modify**:
- `mobile/src/services/database/DatabaseService.js`
- New files for decomposed services

<details>
<summary>Full Implementation Details</summary>

**Context**: DatabaseService has grown to 606 lines indicating architectural decomposition need for maintainability.

**Acceptance Criteria**:
- [ ] ConnectionManager handles lifecycle (100-150 lines)
- [ ] QueryExecutor handles SQL operations (150-200 lines)
- [ ] TransactionManager handles transactions (100-150 lines)
- [ ] MigrationManager handles schema (100-150 lines)
- [ ] All existing functionality preserved
- [ ] Tests updated to match new structure

**Implementation Guide**:
1. Extract connection management to ConnectionManager
2. Move query execution to QueryExecutor
3. Isolate transaction logic in TransactionManager
4. Create MigrationManager for schema operations
5. Keep DatabaseService as facade/coordinator
6. Update all tests to use new structure

**Watch Out For**:
- Breaking existing API contracts
- Circular dependencies between modules
- State management across modules
- Test coverage gaps during refactoring

</details>

---

## ⏳ Ready Soon (Blocked)

### Social Recovery System Setup (TASK-F1-ID-002)
**Blocker**: Needs guardian management UI/UX design
**Estimated unblock**: After design phase (1-2 weeks)
**Prep work possible**:
- Research Shamir's Secret Sharing libraries
- Design guardian data models
- Plan key rotation strategy

### Signal Protocol Implementation (TASK-F1-MSG-001)
**Blocker**: Needs breakdown into smaller tasks
**Estimated unblock**: After task decomposition session
**Prep work possible**:
- Research Signal protocol libraries for React Native
- Design message state management
- Plan offline queue architecture

### CRDT Foundation (TASK-F1-DATA-002)
**Blocker**: Waiting for stable database layer
**Estimated unblock**: After DatabaseService refactoring
**Prep work possible**:
- Research Yjs integration patterns
- Design CRDT data models
- Plan sync architecture

## 🔍 Needs Decisions

### Module System Migration
**Decision needed**: When and how to migrate to ES modules?
**Options**:
1. **Gradual Migration** - File by file as touched
   - Pros: Low risk, can be done incrementally
   - Cons: Long transition period, mixed styles

2. **Big Bang** - All at once with tooling
   - Pros: Clean, consistent codebase
   - Cons: High risk, potential for breakage

3. **New Files Only** - ES modules for new code
   - Pros: Simple rule, no migration needed
   - Cons: Permanent inconsistency

**Recommendation**: New files only until React Native fully supports ES modules

### P2P Networking Architecture
**Decision needed**: WebRTC vs Bridgefy vs both?
**Options**:
1. **WebRTC Only** - Internet-based P2P
   - Pros: Simpler, well-supported
   - Cons: No offline capability

2. **Bridgefy Only** - Bluetooth mesh
   - Pros: Works offline
   - Cons: Limited range, battery impact

3. **Dual Layer** - Both with intelligent switching
   - Pros: Maximum connectivity options
   - Cons: Complex implementation

**Recommendation**: Start with WebRTC, add Bridgefy in Phase 2

## 📋 Needs Grooming

### Group Management System (TASK-F2-GRP-001)
**Why needs grooming**:
- XL task needs decomposition
- Governance model selection unclear
- Permission system design needed
- Group size limits undefined

### Voting System Implementation (TASK-F2-GOV-001)
**Why needs grooming**:
- Complex cryptographic requirements
- Groth16 setup ceremony planning needed
- Mobile proof verification approach unclear
- Integration with group management undefined

### Resource Coordination System (TASK-F3-RES-001)
**Why needs grooming**:
- Data model for resources undefined
- Search/filtering requirements vague
- Trust and verification approach needed
- Lifecycle management unclear

## 🗑️ Archived Tasks

### Fix Transaction Async Anti-Pattern
**Reason**: Completed in 2025-09-25 implementation sprint

### Standardize Error Handling
**Reason**: Completed in 2025-09-25 implementation sprint

### iOS and Android Platform Configuration
**Reason**: Completed in 2025-09-25 implementation sprint

### Cryptographic Key Generation (TASK-F1-ID-001)
**Reason**: Completed in 2025-09-25 implementation sprint

## Summary Statistics
- Total tasks reviewed: 35
- Ready for work: 4
- Blocked: 3
- Needs decisions: 2
- Needs grooming: 3
- Completed this sprint: 4
- Archived: 4

## Top 3 Recommendations
1. **Fix ESLint Configuration** - Unblocks CI/CD and code quality checks
2. **Fix Failing Tests** - Restores test suite confidence
3. **Implement Logging System** - Critical for production debugging

## Sprint Suggestion (1 Week)
If starting immediately with 1 developer:
- Day 1: Fix ESLint + Fix failing tests (quick wins)
- Day 2-3: Implement logging system
- Day 4-5: Begin DatabaseService refactoring
- Buffer for testing and documentation

This provides quick wins to restore CI/CD while making progress on architectural improvements.

## Recent Completions (2025-09-25)
Successfully completed 4 major tasks with TDD approach:
- ✅ Transaction async anti-pattern fixed
- ✅ Error handling standardized with custom types
- ✅ Platform bundle identifiers configured
- ✅ Complete cryptographic identity service with secure storage

Performance achievements:
- Key generation: 2.5ms average (50x faster than requirement)
- Test coverage: 78.1% overall
- 140+ tests written using TDD methodology

## Upcoming Milestones
- **Week 1-2**: Foundation cleanup (logging, testing, refactoring)
- **Week 3-4**: Social recovery and secure messaging foundation
- **Month 2**: P2P networking and CRDT synchronization
- **Month 3**: Group management and governance

## Technical Debt Priority
1. **High**: ESLint configuration (blocking CI/CD)
2. **High**: Failing tests (confidence issue)
3. **Medium**: Logging system (production readiness)
4. **Medium**: DatabaseService decomposition (maintainability)
5. **Low**: Module system migration (nice to have)

## Risk Items
- P2P networking complexity may require architecture spike
- CRDT synchronization needs thorough testing approach
- Group cryptography requires security review
- Battery optimization for Bluetooth mesh critical

---

*Generated by Task Grooming Specialist*
*Last groomed: 2025-09-25*