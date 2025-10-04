# TECH-004: P2P Networking Strategy for Mobile

## Purpose
This document records the decision to use a dual-layer P2P networking approach combining WebRTC for internet-based communication and Bridgefy for offline Bluetooth mesh networking.

## Classification
- **Domain:** Architecture
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** Evolving

## Content

### Context
The Shareth platform requires robust peer-to-peer networking for:
- Direct communication without relying on central servers
- Offline-first functionality in areas with poor connectivity
- Local community coordination during internet outages
- Privacy-preserving data synchronization
- Resilient communication during emergencies or censorship

The mobile environment presents unique challenges:
- Battery optimization requirements
- Network switching between WiFi/cellular/Bluetooth
- Platform differences between iOS and Android
- Firewall and NAT traversal complexities

Research conducted in September 2024 examined various P2P networking approaches for React Native applications.

### Decision
**Implement a dual-layer P2P networking strategy:**
1. **Primary Layer**: WebRTC for internet-based P2P communication
2. **Mesh Layer**: Bridgefy for offline Bluetooth mesh networking

### Status
Accepted

### Consequences

**Positive consequences:**
- WebRTC provides robust internet-based P2P with NAT traversal
- Bridgefy enables true offline mesh networking via Bluetooth
- Dual-layer approach provides redundancy and resilience
- Works in diverse connectivity scenarios (online, limited, offline)
- Leverages established protocols and libraries
- Supports the platform's offline-first architecture

**Negative consequences:**
- Increased complexity managing two networking layers
- Higher battery usage from Bluetooth mesh operations
- Additional dependencies and potential points of failure
- Need for intelligent switching between networking modes

**Risks introduced:**
- Bridgefy dependency for mesh networking functionality
- Bluetooth permission and privacy concerns
- Potential performance degradation from network layer switching
- Complexity in data synchronization across different connection types

**Trade-offs made:**
- Simplicity vs. resilience (chose resilience)
- Battery life vs. offline capability (chose offline capability)
- Single protocol vs. multi-protocol flexibility (chose flexibility)

### Alternatives Considered

#### Alternative 1: WebRTC Only
Pure WebRTC implementation for all P2P communication

**Pros:**
- Mature and well-tested protocol
- Excellent NAT traversal capabilities
- Strong React Native ecosystem support
- Lower implementation complexity
- Good performance characteristics

**Cons:**
- Requires internet connectivity for initial handshake
- No functionality during complete internet outages
- Limited local networking capabilities
- Relies on STUN/TURN servers for connectivity

#### Alternative 2: Custom P2P Protocol
Building a custom P2P networking solution

**Pros:**
- Optimized for specific Shareth use cases
- Full control over protocol design
- No external dependencies
- Potential for innovative approaches

**Cons:**
- Massive development investment
- High risk of bugs and security vulnerabilities
- Need to solve well-understood problems (NAT traversal, etc.)
- No community support or peer review
- Significant ongoing maintenance burden

#### Alternative 3: Bluetooth Only
Pure Bluetooth-based mesh networking

**Pros:**
- True offline functionality
- Local community focus
- Lower infrastructure requirements
- Works in completely disconnected environments

**Cons:**
- Limited range and bandwidth
- Higher battery consumption
- Slower data transfer rates
- No support for internet-wide networking
- Platform differences in Bluetooth capabilities

#### Alternative 4: WiFi Direct + WebRTC
Combination of WiFi Direct for local networking and WebRTC for internet

**Pros:**
- Higher bandwidth than Bluetooth for local connections
- Good balance of local and internet connectivity
- Better performance for large data transfers

**Cons:**
- WiFi Direct has limited React Native support
- More complex device discovery and pairing
- Platform inconsistencies in WiFi Direct implementation
- User experience complexity

### Implementation Notes
- Integrate WebRTC during Foundation Phase for basic P2P messaging
- Add Bridgefy mesh networking capability in Foundation Phase
- Implement intelligent network switching based on connectivity status
- Design unified API abstracting underlying networking protocols
- Plan for graceful degradation based on available connectivity
- Monitor battery usage and optimize Bluetooth mesh operations
- Implement data synchronization strategies across different connection types

## Relationships
- **Parent Nodes:** [elements/technical/architecture.md], [foundation/project_definition.md]
- **Child Nodes:** [To be created: webrtc-implementation-guide.md], [To be created: mesh-networking-strategy.md]
- **Related Nodes:**
  - [tech-002-crdt-implementation.md] - enables - Distributed state synchronization
  - [planning/feature-roadmap/task-breakdown.md] - implements - Foundation Phase networking requirements
  - [planning/feature-roadmap/requirements.md] - satisfies - Offline-first and P2P communication requirements

## Navigation Guidance
- **Access Context:** When implementing P2P communication, offline functionality, or network resilience features
- **Common Next Steps:** Review WebRTC implementation details, mesh networking integration
- **Related Tasks:** Foundation phase networking, offline-first architecture, emergency communication features
- **Update Patterns:** Revisit if new P2P protocols emerge or Bridgefy alternatives become available

## Metadata
- **Decision Number:** TECH-004
- **Created:** 2025-09-23
- **Last Updated:** 2025-09-23
- **Updated By:** Research Agent
- **Deciders:** Technical Architecture Team, based on September 2024 P2P networking research

## Change History
- 2025-09-23: Initial decision record based on mobile P2P networking research