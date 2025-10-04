# Groomed Task Backlog - 2025-09-24

## 🚀 Ready for Implementation

### 1. Fix Async Anti-Pattern in Transaction Method
**One-liner**: Remove async Promise constructor anti-pattern for cleaner error handling
**Effort**: 30-60 minutes
**Files to modify**:
- `mobile/src/services/database/DatabaseService.js` (lines 221-236)

<details>
<summary>Full Implementation Details</summary>

**Context**: The transaction() method uses an anti-pattern where async is placed inside Promise constructor, creating issues with error handling and code readability.

**Acceptance Criteria**:
- [ ] Remove async anti-pattern from transaction method
- [ ] Maintain backward compatibility with existing transaction usage
- [ ] Ensure proper error handling for BEGIN/COMMIT and ROLLBACK scenarios
- [ ] All existing tests continue to pass
- [ ] Add specific tests for transaction error scenarios

**Implementation Guide**:
1. Replace async Promise constructor with proper async/await pattern
2. Test with both callback and async transaction patterns
3. Verify rollback properly handles errors
4. Update tests to cover new error scenarios

**Watch Out For**:
- Ensure callback-style transactions still work
- Test rollback scenarios thoroughly
- Verify no race conditions in concurrent transactions

</details>

---

### 2. Standardize Error Handling with Custom Error Types
**One-liner**: Create consistent error handling with typed database errors
**Effort**: 45-90 minutes
**Files to modify**:
- `mobile/src/services/database/DatabaseService.js` (multiple locations)
- New file: `mobile/src/services/database/errors.js`

<details>
<summary>Full Implementation Details</summary>

**Context**: Current error handling is inconsistent - some places catch and rethrow, others let errors bubble, and error messages lack context and classification.

**Acceptance Criteria**:
- [ ] Define custom error types (DatabaseError, ConnectionError, QueryError, etc.)
- [ ] Implement consistent error handling pattern throughout service
- [ ] All database errors include relevant context
- [ ] Maintain backward compatibility for error catching
- [ ] Add error documentation
- [ ] Update tests to verify error types and messages

**Implementation Guide**:
1. Create error class hierarchy in new errors.js file
2. Replace generic error throwing with specific error types
3. Add context to all error messages (operation, query, etc.)
4. Update tests to check for specific error types
5. Document error types in JSDoc comments

**Watch Out For**:
- Keep backward compatibility - existing try/catch should work
- Don't expose sensitive information in error messages
- Consider error recovery suggestions in messages

</details>

---

### 3. iOS and Android Platform Configuration
**One-liner**: Configure proper bundle identifiers for both mobile platforms
**Effort**: 30-60 minutes
**Files to modify**:
- `ios/shareth/Info.plist`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`

<details>
<summary>Full Implementation Details</summary>

**Context**: Platform-specific configuration incomplete - bundle identifiers not properly set to 'com.shareth.app' causing test failures and deployment issues.

**Acceptance Criteria**:
- [ ] iOS Info.plist contains correct bundle identifier (com.shareth.app)
- [ ] Android manifest contains correct package name (com.shareth.app)
- [ ] App builds successfully for both platforms
- [ ] App icons and launch screens properly configured
- [ ] Development and production bundle identifiers properly set

**Implementation Guide**:
1. Update iOS Info.plist with CFBundleIdentifier
2. Verify Xcode project settings match
3. Update Android manifest package attribute
4. Update applicationId in build.gradle
5. Test builds on both platforms
6. Verify no conflicts with existing apps

**Watch Out For**:
- Bundle ID changes can break existing builds
- May need to update Java/Kotlin package structure
- Check for hardcoded references to old bundle IDs

</details>

---

### 4. Cryptographic Key Generation (TASK-F1-ID-001)
**One-liner**: Implement ed25519 key generation with secure storage
**Effort**: 1-2 weeks
**Files to modify**:
- New service: `mobile/src/services/identity/`
- Integrate with existing DatabaseService

<details>
<summary>Full Implementation Details</summary>

**Context**: Foundation for all identity and encryption features - generates and securely stores user cryptographic keys.

**Acceptance Criteria**:
- [ ] Ed25519 keypairs generated using libsodium
- [ ] Keys stored in platform secure enclave (iOS Keychain/Android Keystore)
- [ ] Key generation performance <100ms on target devices
- [ ] Unit tests cover key generation edge cases

**Implementation Guide**:
1. Install and configure react-native-sodium
2. Create IdentityService class with key generation methods
3. Implement secure storage integration (Keychain/Keystore)
4. Add fallback for devices without secure enclave
5. Write comprehensive tests including performance benchmarks
6. Document key format and storage specifications

**Watch Out For**:
- Platform differences in secure storage
- Performance variations across devices
- React-native-sodium wrapper maintenance
- Avoid TweetNaCl (2-22x slower per research)

</details>

---

## ⏳ Ready Soon (Blocked)

### Fix Connection Race Condition
**Blocker**: Needs architectural refactoring of database service first
**Estimated unblock**: After database service architecture refactor
**Prep work possible**: Document current race condition scenarios

### Migrate to ES Modules
**Blocker**: Needs team decision on module system strategy
**Estimated unblock**: After technical standards alignment
**Prep work possible**: Inventory current module usage patterns

### CRDT Foundation (TASK-F1-DATA-002)
**Blocker**: Waiting for more stable database layer after tech debt fixes
**Estimated unblock**: After transaction and error handling improvements
**Prep work possible**: Research Yjs integration patterns with React Native

## 🔍 Needs Decisions

### Database Service Architecture Refactoring
**Decision needed**: How to break up 423-line DatabaseService class?
**Options**:
1. **Repository Pattern** - Separate repositories for each data type
   - Pros: Clean separation, testable units
   - Cons: More files, potential duplication

2. **Service Layer Pattern** - Keep DatabaseService lean, add domain services
   - Pros: Clear responsibilities, easier to test
   - Cons: More abstraction layers

**Recommendation**: Repository pattern for cleaner separation of concerns

### ESLint Configuration Improvements
**Decision needed**: Which rules to enforce for React Native project?
**Options**:
1. **Airbnb Config** - Strict, opinionated rules
2. **Standard Config** - Less strict, more flexible
3. **Custom Mix** - Cherry-pick rules that fit project

**Recommendation**: Start with Airbnb and relax specific rules as needed

## 📋 Needs Grooming

### Signal Protocol Implementation (TASK-F1-MSG-001)
**Why needs grooming**:
- "XL" task needs breakdown into smaller chunks
- Dependencies on cryptographic foundation not clear
- Missing specific library selection (libsignal-protocol-javascript vs custom)

### P2P Networking Setup (TASK-F1-NET-001)
**Why needs grooming**:
- Dual-layer approach (WebRTC + Bridgefy) very complex
- Missing specific implementation steps
- Battery optimization strategy undefined

### Social Recovery System (TASK-F1-ID-002)
**Why needs grooming**:
- Guardian management flow not designed
- Missing UI/UX specifications
- Recovery simulation approach unclear

## 🗑️ Archived Tasks

### Enhance Test Configuration
**Reason**: Already completed as part of SQLCipher TDD implementation

### React Native Development Environment
**Reason**: Completed in task-completion-001-dev-environment

## Summary Statistics
- Total tasks reviewed: 32
- Ready for work: 4
- Blocked: 3
- Needs decisions: 2
- Needs grooming: 3
- Archived: 2

## Top 3 Recommendations
1. **Fix Transaction Anti-Pattern** - Quick win that improves database reliability
2. **Standardize Error Handling** - Sets foundation for better debugging
3. **Platform Configuration** - Unblocks mobile deployment and testing

## Sprint Suggestion (1 Week)
If starting immediately with 1 developer:
- Day 1-2: Fix transaction anti-pattern + Standardize error handling
- Day 3: iOS/Android platform configuration
- Day 4-5: Begin Cryptographic Key Generation implementation
- Buffer for testing and documentation

This provides a mix of quick wins (tech debt) and progress on core features (identity system).