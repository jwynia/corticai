# TECH-001: Cryptographic Library Selection for React Native

## Purpose
This document records the decision to use libsodium via react-native-sodium as the primary cryptographic library for the Shareth platform.

## Classification
- **Domain:** Security
- **Stability:** Static
- **Abstraction:** Detailed
- **Confidence:** Established

## Content

### Context
The Shareth platform requires robust cryptographic operations for:
- Ed25519 key generation and management
- Message encryption/decryption
- Digital signatures
- Key derivation and random number generation

Performance is critical since cryptographic operations will be frequent on mobile devices with limited resources. Security is paramount since any vulnerabilities would compromise user privacy completely.

Research conducted in September 2024 revealed significant performance differences between available React Native cryptographic libraries.

### Decision
**Use libsodium via react-native-sodium as the primary cryptographic library for Shareth.**

### Status
Accepted

### Consequences

**Positive consequences:**
- Superior performance: 2-22x faster than TweetNaCl depending on operation
- Well-established library with extensive security auditing
- Comprehensive cryptographic primitives in one package
- Active maintenance and security updates
- Industry standard used by Signal, Briar, and other privacy-focused applications

**Negative consequences:**
- Larger binary size compared to minimal libraries like TweetNaCl
- Native module dependency increases build complexity
- Platform-specific implementations may have subtle differences

**Risks introduced:**
- Dependency on react-native-sodium wrapper quality
- Potential platform-specific crypto behavior differences
- Need for careful key management in platform secure enclaves

**Trade-offs made:**
- Binary size vs. performance (chose performance)
- Simplicity vs. comprehensiveness (chose comprehensiveness)

### Alternatives Considered

#### Alternative 1: TweetNaCl-js
Pure JavaScript implementation of NaCl cryptographic library

**Pros:**
- Pure JavaScript, no native dependencies
- Smaller binary size
- Simpler build process
- Well-audited cryptographic implementation

**Cons:**
- 4.5-22x slower than libsodium in benchmarks
- Limited performance on mobile devices
- Only covers subset of needed primitives
- Memory usage concerns for large operations

#### Alternative 2: Noble Cryptography Libraries
Modern TypeScript cryptographic libraries

**Pros:**
- Excellent TypeScript support
- Pure JavaScript implementation
- Modular design allows selective inclusion
- Modern development practices

**Cons:**
- 2-6x slower than libsodium in key operations
- Newer library with less extensive auditing
- Limited React Native testing and optimization
- Missing some enterprise-grade features

#### Alternative 3: Platform Native Crypto APIs
Using iOS CryptoKit and Android Keystore directly

**Pros:**
- Optimal performance using hardware acceleration
- Deep platform integration
- Smaller app bundle size
- Platform-provided security guarantees

**Cons:**
- Platform-specific implementation complexity
- Inconsistent API surface between iOS/Android
- Significant development and testing overhead
- Limited cross-platform code reuse

### Implementation Notes
- Integrate react-native-sodium during Foundation Phase Task F1-ID-001
- Implement fallback key storage for devices without secure enclave
- Plan for deterministic key derivation in testing environments
- Document key format specifications and storage patterns
- Conduct security audit specifically for libsodium integration patterns

## Relationships
- **Parent Nodes:** [foundation/project_definition.md], [planning/feature-roadmap/requirements.md]
- **Child Nodes:** [To be created: key-management-architecture.md], [To be created: secure-storage-strategy.md]
- **Related Nodes:**
  - [planning/feature-roadmap/task-breakdown.md] - implements - TASK-F1-ID-001 cryptographic key generation
  - [planning/feature-roadmap/risk-assessment.md] - mitigates - RISK-F1-001 cryptographic implementation vulnerabilities

## Navigation Guidance
- **Access Context:** When implementing cryptographic operations, evaluating security architecture, or onboarding developers
- **Common Next Steps:** Review key management architecture, secure storage implementation
- **Related Tasks:** Foundation phase implementation, security auditing, performance benchmarking
- **Update Patterns:** Revisit if security vulnerabilities discovered or significant performance improvements available

## Metadata
- **Decision Number:** TECH-001
- **Created:** 2025-09-23
- **Last Updated:** 2025-09-23
- **Updated By:** Research Agent
- **Deciders:** Technical Architecture Team, based on September 2024 research findings

## Change History
- 2025-09-23: Initial decision record based on cryptographic library performance research