# Technical Architecture

## Purpose
Defines the technical architecture for the Shareth privacy-preserving community platform, including technology choices, system design, and implementation approach.

## Classification
- **Domain:** Technical
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Evolving

## Architecture Overview

### Design Principles
1. **Local-First**: All data primarily stored on user devices
2. **Offline-Capable**: Full functionality without internet connection
3. **Progressive Enhancement**: Start simple, add features based on availability
4. **Privacy by Default**: Minimal data collection, maximum user control
5. **Community Ownership**: Open source, self-hostable, forkable

### System Layers

```
┌─────────────────────────────────────────────────────┐
│                   User Device Layer                  │
├───────────────┬─────────────┬───────────────────────┤
│  React Native │  SQLCipher  │  Secure Keystore     │
│      App      │   Database  │  (iOS/Android)       │
└───────┬───────┴──────┬──────┴───────────┬──────────┘
        │              │                  │
        ▼              ▼                  ▼
┌─────────────────────────────────────────────────────┐
│              Local Services Layer                    │
├───────────────┬─────────────┬───────────────────────┤
│    WebRTC     │    CRDT     │   Cryptography       │
│  Data Channel │    Sync     │     Engine           │
└───────┬───────┴──────┬──────┴───────────┬──────────┘
        │              │                  │
        ▼              ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                P2P Network Layer                     │
├───────────────┬─────────────┬───────────────────────┤
│   Bluetooth   │   WiFi      │    Internet          │
│      LE       │   Direct    │   (Optional)         │
└───────────────┴─────────────┴───────────────────────┘
```

## Technology Stack

### Mobile Framework
- **React Native 0.73.x**: Cross-platform mobile development
- **TypeScript**: Type-safe development
- **React 18.2.x**: UI component framework

### State Management
- **Zustand**: Lightweight state management
- **Immer**: Immutable state updates
- **Yjs**: CRDT-based distributed state

### Data Storage
- **SQLCipher**: Encrypted local database
- **React Native Keychain**: Secure credential storage
- **Y-IndexedDB**: CRDT persistence

### Cryptography
- **libsodium (via react-native-sodium)**: Modern crypto primitives
- **Threshold signatures**: Distributed key management
- **Zero-knowledge proofs**: Privacy-preserving verification

### Networking
- **WebRTC**: P2P data channels
- **Bluetooth LE**: Local proximity networking
- **WiFi Direct**: High-bandwidth local transfer

### Platform Requirements
- **iOS**: Minimum iOS 13.0, Xcode 14+, Swift 5.5+
- **Android**: Minimum SDK 23 (Android 6.0), Target SDK 34 (Android 14)

## Core Modules

### Identity Management
- Cryptographic key generation and storage
- Social recovery with 3-of-5 threshold
- Zero-knowledge identity proofs
- Device-specific secure enclaves

### Group Management
- CRDT-based group state synchronization
- Multiple governance models (anarchic, democratic, delegated, jury)
- Proximity-based membership verification
- Distributed moderation consensus

### Messaging System
- End-to-end encryption with Signal protocol
- Offline message queuing
- Multi-device synchronization
- Ephemeral message support

### Resource Sharing
- Distributed resource catalogs
- Reputation-based allocation
- Mutual aid coordination
- Time-banking integration

## Security Architecture

### Threat Model
1. **Network adversaries**: ISPs, governments monitoring traffic
2. **Platform adversaries**: App stores, OS vendors
3. **Social adversaries**: Harassers, trolls, bad actors
4. **Physical adversaries**: Device seizure, coercion

### Security Measures

#### Data Protection
- At-rest encryption with SQLCipher
- In-transit encryption with TLS/DTLS
- End-to-end encryption for messages
- Perfect forward secrecy

#### Identity Security
- No phone numbers or emails required
- Cryptographic identity verification
- Social recovery without single points of failure
- Plausible deniability features

#### Network Security
- Onion routing for metadata protection
- Decoy traffic generation
- Connection padding
- Timing correlation resistance

## Deployment Strategy

### Progressive Rollout
1. **Alpha**: Core team and security researchers
2. **Beta**: Trusted community organizations
3. **Soft Launch**: Specific activist/mutual aid groups
4. **Public Launch**: Open availability with documentation

### Distribution Channels
- **Primary**: Direct APK/IPA downloads
- **Secondary**: F-Droid and alternative app stores
- **Fallback**: App Store/Google Play (if compliant)
- **Emergency**: USB/Bluetooth sideloading

### Infrastructure Requirements
- **Signaling servers**: WebRTC connection establishment
- **Bootstrap nodes**: Initial network discovery
- **Update servers**: App and security updates
- **All infrastructure**: Community-hosted, distributed

## Performance Considerations

### Optimization Targets
- App size < 50MB
- Cold start < 2 seconds
- Message send latency < 500ms (local network)
- Battery impact < 5% daily active use

### Scalability Approach
- Hierarchical group structures for large communities
- Selective message synchronization
- Efficient CRDT compression
- Progressive peer discovery

## Development Approach

### Code Organization
```
src/
├── modules/
│   ├── identity/        # Identity and key management
│   ├── groups/          # Group and community features
│   ├── messaging/       # Secure messaging
│   ├── resources/       # Resource sharing
│   └── network/         # P2P networking
├── components/          # React Native UI components
├── screens/            # Application screens
├── services/           # Background services
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

### Testing Strategy
- Unit tests for cryptographic functions
- Integration tests for P2P protocols
- E2E tests for user workflows
- Security audits by external firms

### Documentation Requirements
- API documentation for all modules
- Security architecture documentation
- User privacy guide
- Community deployment guide

## Relationships
- **Parent Nodes:** [elements/index.md]
- **Child Nodes:**
  - [elements/technical/security-implementation.md] - details - Security specifics
  - [elements/technical/network-protocol.md] - details - P2P protocol design
- **Related Nodes:**
  - [foundation/project_definition.md] - implements - Technical goals
  - [elements/research/privacy-community-platform.md] - based-on - Research findings
  - [planning/roadmap.md] - guides - Development timeline

## Navigation Guidance
- **Access Context:** Reference for technical decisions and implementation
- **Common Next Steps:** Review security details, network protocol design
- **Related Tasks:** Development, security audits, performance optimization
- **Update Patterns:** Update as architecture evolves during development

## Metadata
- **Created:** 2025-09-22
- **Last Updated:** 2025-09-22
- **Updated By:** Integration Agent

## Change History
- 2025-09-22: Created from privacy-community-app-tech-design.md in inbox