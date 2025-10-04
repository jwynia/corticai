# Decision Record Index

## Purpose
This document serves as an index of all key decisions made for the project, providing a centralized registry for easy reference and navigation.

## Classification
- **Domain:** Documentation
- **Stability:** Dynamic
- **Abstraction:** Structural
- **Confidence:** Established

## Content

### Decision Records

| ID | Title | Status | Date | Domain | Summary |
|----|-------|--------|------|--------|---------|
| TECH-001 | [Cryptographic Library Selection](./tech-001-cryptographic-library.md) | Accepted | 2025-09-23 | Security | Use libsodium via react-native-sodium for all cryptographic operations |
| TECH-002 | [CRDT Implementation Selection](./tech-002-crdt-implementation.md) | Accepted | 2025-09-23 | Architecture | Use Yjs for distributed state management and synchronization |
| TECH-003 | [Privacy-Preserving Voting Protocol](./tech-003-privacy-preserving-voting.md) | Accepted | 2025-09-23 | Security | Use Groth16 zk-SNARKs with BBS signatures for anonymous voting |
| TECH-004 | [P2P Networking Strategy](./tech-004-p2p-networking.md) | Accepted | 2025-09-23 | Architecture | Dual-layer approach: WebRTC + Bridgefy mesh networking |
| TECH-005 | [CommonJS Module System](./tech-005-commonjs-module-system.md) | Accepted | 2025-09-27 | Architecture | Use CommonJS syntax throughout React Native codebase for consistency |

### Decision Status Legend

- **Proposed**: A decision that is under consideration but not yet accepted
- **Accepted**: A decision that has been accepted and is currently in effect
- **Deprecated**: A decision that is no longer recommended but still in effect
- **Superseded**: A decision that has been replaced by a newer decision

### Decision Categories

#### By Domain
<!-- Categories should be customized based on project type -->

<!-- For Software Projects -->
- **Frontend**: [List of decision IDs related to frontend]
- **Backend**: [List of decision IDs related to backend]
- **DevOps**: [List of decision IDs related to DevOps]
- **Data**: [List of decision IDs related to data]
- **Security**: TECH-001 (Cryptographic Library), TECH-003 (Privacy-Preserving Voting)
- **Architecture**: TECH-002 (CRDT Implementation), TECH-004 (P2P Networking Strategy), TECH-005 (CommonJS Module System)

<!-- For Research Projects -->
- **Methodology**: [List of decision IDs related to research methodology]
- **Data Collection**: [List of decision IDs related to data collection]
- **Analysis**: [List of decision IDs related to analysis approaches]
- **Interpretation**: [List of decision IDs related to interpretation frameworks]

<!-- For Creative Projects -->
- **Narrative**: [List of decision IDs related to narrative structure]
- **Characters**: [List of decision IDs related to character development]
- **Setting**: [List of decision IDs related to setting design]
- **Style**: [List of decision IDs related to stylistic choices]

<!-- For Knowledge Base Projects -->
- **Structure**: [List of decision IDs related to knowledge organization]
- **Content**: [List of decision IDs related to content creation]
- **Access**: [List of decision IDs related to access patterns]
- **Integration**: [List of decision IDs related to external integrations]

#### By Status
- **Proposed**: [List of decision IDs with proposed status]
- **Accepted**: TECH-001, TECH-002, TECH-003, TECH-004, TECH-005
- **Deprecated**: [List of decision IDs with deprecated status]
- **Superseded**: [List of decision IDs with superseded status]

### Decision Relationships

[This section will contain a visualization or description of how decisions relate to each other]

## Relationships
- **Parent Nodes:** [foundation/structure.md]
- **Child Nodes:** [All individual decision records]
- **Related Nodes:** 
  - [processes/creation.md] - relates-to - Creation processes affected by decisions
  - [foundation/principles.md] - implements - Decisions implement project principles

## Navigation Guidance
- **Access Context:** Use this document when looking for specific key decisions or understanding decision history
- **Common Next Steps:** From here, navigate to specific decision records of interest
- **Related Tasks:** Project review, onboarding new team members, planning new work, understanding rationale
- **Update Patterns:** This index should be updated whenever a new decision is added or a decision status changes

## Metadata
- **Created:** 2025-09-23
- **Last Updated:** 2025-09-27
- **Updated By:** Claude Code Assistant

## Change History
- 2025-09-23: Added four initial technical decisions based on September 2024 research findings
- 2025-09-27: Added TECH-005 (CommonJS Module System) decision from Index File TODO cleanup task
