# Technical Design Document: React Native Privacy-Preserving Community Application

## Executive Summary

This document outlines the technical architecture for a privacy-preserving, decentralized community organizing application built with React Native. The design prioritizes local-first operation, peer-to-peer communication, and progressive decentralization while maintaining practical usability for non-technical users.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Core Modules](#core-modules)
4. [Data Models](#data-models)
5. [Security Architecture](#security-architecture)
6. [Network Protocol](#network-protocol)
7. [User Experience Flow](#user-experience-flow)
8. [Deployment Strategy](#deployment-strategy)
9. [Cost Analysis](#cost-analysis)
10. [Development Roadmap](#development-roadmap)

## Architecture Overview

### Design Principles

1. **Local-First**: All data primarily stored on user devices
2. **Offline-Capable**: Full functionality without internet connection
3. **Progressive Enhancement**: Start simple, add features based on availability
4. **Privacy by Default**: Minimal data collection, maximum user control
5. **Community Ownership**: Open source, self-hostable, forkable

### System Architecture

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

### Core Dependencies

```json
{
  "dependencies": {
    // React Native Core
    "react-native": "0.73.x",
    "react": "18.2.x",
    
    // Navigation
    "react-navigation": "^6.x",
    "@react-navigation/native-stack": "^6.x",
    
    // State Management
    "zustand": "^4.x",
    "immer": "^10.x",
    
    // Database
    "react-native-sqlite-storage": "^6.x",
    "react-native-sqlcipher-storage": "^6.x",
    
    // Cryptography
    "react-native-sodium": "^0.4.x",
    "react-native-keychain": "^8.x",
    
    // Networking
    "react-native-webrtc": "^118.x",
    "y-webrtc": "^10.x",
    
    // CRDTs
    "yjs": "^13.x",
    "y-indexeddb": "^9.x",
    
    // BLE & Proximity
    "react-native-ble-manager": "^11.x",
    "react-native-qrcode-scanner": "^1.5.x",
    "react-native-wifi-p2p": "^4.x",
    
    // UI Components
    "react-native-elements": "^3.x",
    "react-native-vector-icons": "^10.x",
    "react-native-gesture-handler": "^2.x"
  }
}
```

### Platform-Specific Requirements

#### iOS
- Minimum iOS version: 13.0
- Xcode 14+
- Swift 5.5+
- Capabilities: Bluetooth, Local Network, Background Modes

#### Android
- Minimum SDK: 23 (Android 6.0)
- Target SDK: 34 (Android 14)
- Kotlin 1.8+
- Permissions: Bluetooth, WiFi, Camera, Storage

## Core Modules

### 1. Identity Module

```typescript
// src/modules/identity/IdentityManager.ts

import sodium from 'react-native-sodium';
import Keychain from 'react-native-keychain';
import { Share } from './ShamirSecretSharing';

export interface Identity {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  deviceId: string;
  createdAt: Date;
  recoveryShares?: Share[];
}

export class IdentityManager {
  private identity: Identity | null = null;
  
  async initialize(): Promise<void> {
    // Check for existing identity in secure storage
    const stored = await Keychain.getInternetCredentials('app.identity');
    
    if (stored) {
      this.identity = await this.decryptIdentity(stored.password);
    } else {
      this.identity = await this.createNewIdentity();
    }
  }
  
  private async createNewIdentity(): Promise<Identity> {
    await sodium.ready;
    
    const keypair = sodium.crypto_sign_keypair();
    const deviceId = sodium.randombytes_buf(16);
    
    const identity: Identity = {
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
      deviceId: sodium.to_hex(deviceId),
      createdAt: new Date()
    };
    
    // Store encrypted in keychain
    await this.storeIdentity(identity);
    
    return identity;
  }
  
  async enableSocialRecovery(guardians: PublicKey[]): Promise<void> {
    if (!this.identity) throw new Error('No identity');
    
    // Create 3-of-5 threshold shares
    const shares = await ShamirSecretSharing.split(
      this.identity.privateKey,
      5,  // total shares
      3   // threshold
    );
    
    // Encrypt each share for respective guardian
    for (let i = 0; i < guardians.length; i++) {
      const encryptedShare = await this.encryptForGuardian(
        shares[i],
        guardians[i]
      );
      
      // Queue for sending when guardian is online
      await this.queueRecoveryShare(guardians[i], encryptedShare);
    }
    
    this.identity.recoveryShares = shares;
  }
  
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.identity) throw new Error('No identity');
    
    await sodium.ready;
    return sodium.crypto_sign(message, this.identity.privateKey);
  }
  
  async verifySignature(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    await sodium.ready;
    
    try {
      const opened = sodium.crypto_sign_open(signature, publicKey);
      return sodium.compare(opened, message) === 0;
    } catch {
      return false;
    }
  }
}
```

### 2. Group Management Module

```typescript
// src/modules/groups/GroupManager.ts

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export interface GroupConfig {
  id: string;
  name: string;
  created: Date;
  founder: PublicKey;
  governanceType: 'anarchic' | 'democratic' | 'delegated' | 'jury';
  membershipRequirements: MembershipRequirement[];
}

export interface MembershipRequirement {
  type: 'proximity' | 'vouch' | 'stake' | 'timelock';
  params: Record<string, any>;
}

export class GroupManager {
  private groups: Map<string, Group> = new Map();
  private ydoc: Y.Doc;
  private provider: WebrtcProvider | null = null;
  
  async createGroup(config: Partial<GroupConfig>): Promise<Group> {
    const groupId = await this.generateGroupId();
    
    const group = new Group({
      id: groupId,
      name: config.name || 'Unnamed Group',
      created: new Date(),
      founder: await this.identity.getPublicKey(),
      governanceType: config.governanceType || 'democratic',
      membershipRequirements: config.membershipRequirements || []
    });
    
    // Initialize CRDT document for group
    this.ydoc = new Y.Doc();
    
    // Set up group state as CRDT types
    const members = this.ydoc.getMap('members');
    const messages = this.ydoc.getArray('messages');
    const governance = this.ydoc.getMap('governance');
    
    // Store founder as first member
    members.set(group.founder.toString(), {
      publicKey: group.founder,
      joined: Date.now(),
      role: 'founder'
    });
    
    // Initialize WebRTC provider for P2P sync
    this.provider = new WebrtcProvider(
      groupId,
      this.ydoc,
      {
        signaling: ['wss://signaling.example.com'], // Community-run signaling
        password: groupId, // Simple room-level auth
        maxConns: 50,
        filterBcConns: true
      }
    );
    
    this.groups.set(groupId, group);
    await this.persistGroup(group);
    
    return group;
  }
  
  async joinGroupViaProximity(
    inviteCode: string,
    proximityProof: ProximityProof
  ): Promise<void> {
    // Verify proximity proof
    const isValid = await this.verifyProximityProof(proximityProof);
    if (!isValid) throw new Error('Invalid proximity proof');
    
    // Decode invite
    const invite = await this.decodeInvite(inviteCode);
    
    // Connect to group's CRDT network
    await this.connectToGroup(invite.groupId);
    
    // Add self to members
    const members = this.ydoc.getMap('members');
    members.set(this.identity.publicKey.toString(), {
      publicKey: this.identity.publicKey,
      joined: Date.now(),
      addedBy: proximityProof.witness,
      role: 'member'
    });
  }
  
  async implementGovernance(
    groupId: string,
    proposal: Proposal
  ): Promise<GovernanceResult> {
    const group = this.groups.get(groupId);
    if (!group) throw new Error('Group not found');
    
    switch (group.governanceType) {
      case 'anarchic':
        // No governance, individual blocking only
        return { accepted: false, reason: 'No governance in anarchic groups' };
        
      case 'democratic':
        return await this.democraticVote(group, proposal);
        
      case 'delegated':
        return await this.delegatedDecision(group, proposal);
        
      case 'jury':
        return await this.juryDecision(group, proposal);
    }
  }
  
  private async democraticVote(
    group: Group,
    proposal: Proposal
  ): Promise<GovernanceResult> {
    const votes = this.ydoc.getMap(`votes-${proposal.id}`);
    
    // Record vote
    votes.set(this.identity.publicKey.toString(), {
      vote: proposal.userVote,
      timestamp: Date.now(),
      signature: await this.identity.sign(proposal.hash)
    });
    
    // Count votes after voting period
    setTimeout(async () => {
      const members = this.ydoc.getMap('members');
      const totalMembers = members.size;
      const yesVotes = Array.from(votes.values())
        .filter(v => v.vote === 'yes').length;
      
      const passed = yesVotes > totalMembers / 2;
      
      if (passed) {
        await this.executeProposal(proposal);
      }
    }, proposal.votingPeriod);
    
    return { accepted: true, reason: 'Vote recorded' };
  }
}
```

### 3. Reputation Module

```typescript
// src/modules/reputation/ReputationManager.ts

export interface Attestation {
  subject: PublicKey;
  issuer: PublicKey;
  context: GroupId;
  type: 'positive' | 'neutral' | 'flag';
  reason?: string;
  timestamp: Date;
  signature: Signature;
}

export interface ReputationView {
  score: number;
  attestations: Attestation[];
  sharedContexts: GroupId[];
  visibility: 'full' | 'partial' | 'none';
}

export class ReputationManager {
  private attestations = new Y.Array<Attestation>();
  
  async addAttestation(
    subject: PublicKey,
    type: Attestation['type'],
    context: GroupId,
    reason?: string
  ): Promise<void> {
    const attestation: Attestation = {
      subject,
      issuer: this.identity.publicKey,
      context,
      type,
      reason,
      timestamp: new Date(),
      signature: await this.signAttestation(subject, type, context)
    };
    
    this.attestations.push([attestation]);
    
    // Broadcast to relevant contexts
    await this.broadcastAttestation(attestation);
  }
  
  getReputation(
    subject: PublicKey,
    viewer: PublicKey
  ): ReputationView {
    // Find shared contexts between viewer and subject
    const sharedContexts = this.getSharedContexts(subject, viewer);
    
    if (sharedContexts.length < 2) {
      // Need at least 2 shared contexts for reputation visibility
      return {
        score: 0,
        attestations: [],
        sharedContexts: [],
        visibility: 'none'
      };
    }
    
    // Filter attestations to shared contexts
    const relevantAttestations = this.attestations
      .toArray()
      .filter(a => 
        a.subject.equals(subject) &&
        sharedContexts.includes(a.context)
      );
    
    // Calculate weighted score
    const score = this.calculateWeightedScore(relevantAttestations);
    
    return {
      score,
      attestations: relevantAttestations,
      sharedContexts,
      visibility: sharedContexts.length >= 3 ? 'full' : 'partial'
    };
  }
  
  private calculateWeightedScore(attestations: Attestation[]): number {
    let score = 0;
    const weights = { positive: 1, neutral: 0, flag: -2 };
    
    // Group by issuer to prevent spam
    const byIssuer = new Map<string, Attestation[]>();
    attestations.forEach(a => {
      const key = a.issuer.toString();
      if (!byIssuer.has(key)) byIssuer.set(key, []);
      byIssuer.get(key)!.push(a);
    });
    
    // Weight recent attestations higher
    const now = Date.now();
    byIssuer.forEach(issuerAttestations => {
      const latest = issuerAttestations
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      const age = now - latest.timestamp.getTime();
      const timeWeight = Math.exp(-age / (30 * 24 * 60 * 60 * 1000)); // 30-day half-life
      
      score += weights[latest.type] * timeWeight;
    });
    
    return Math.max(-10, Math.min(10, score)); // Clamp to [-10, 10]
  }
}
```

### 4. Moderation Module

```typescript
// src/modules/moderation/ModerationEngine.ts

export interface ModerationPolicy {
  id: string;
  groupId: GroupId;
  rules: ModerationRule[];
  actions: ModerationAction[];
  appealProcess: AppealConfig;
}

export interface Report {
  id: string;
  reporter: PublicKey;
  reported: PublicKey;
  groupId: GroupId;
  type: 'spam' | 'harassment' | 'violence' | 'csam' | 'other';
  evidence: Evidence[];
  timestamp: Date;
  stake?: number;
}

export class ModerationEngine {
  private reports = new Y.Array<Report>();
  private policies = new Map<GroupId, ModerationPolicy>();
  
  async fileReport(
    reported: PublicKey,
    type: Report['type'],
    evidence: Evidence[],
    stake: number = 0
  ): Promise<void> {
    // Check for weaponized reporting patterns
    const reporterHistory = await this.getReporterHistory(this.identity.publicKey);
    const riskScore = this.calculateReporterRisk(reporterHistory);
    
    if (riskScore > 0.7) {
      // High risk of weaponized reporting
      stake = stake * 2; // Double the required stake
    }
    
    // Verify stake if required
    if (stake > 0) {
      await this.lockStake(stake);
    }
    
    const report: Report = {
      id: await this.generateReportId(),
      reporter: this.identity.publicKey,
      reported,
      groupId: this.currentGroup,
      type,
      evidence,
      timestamp: new Date(),
      stake
    };
    
    this.reports.push([report]);
    
    // Check for threshold patterns
    await this.checkThresholds(reported);
  }
  
  private async checkThresholds(subject: PublicKey): Promise<void> {
    const recentReports = this.reports
      .toArray()
      .filter(r => 
        r.reported.equals(subject) &&
        r.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
    
    // K-anonymity threshold (need 3+ unique reporters)
    const uniqueReporters = new Set(recentReports.map(r => r.reporter.toString()));
    if (uniqueReporters.size < 3) return;
    
    // Check for coordinated reporting
    const coordination = this.detectCoordination(recentReports);
    if (coordination > 0.6) {
      // Likely coordinated attack, investigate reporters instead
      await this.investigateReporters(Array.from(uniqueReporters));
      return;
    }
    
    // Legitimate threshold reached, take action
    const policy = this.policies.get(this.currentGroup);
    if (policy) {
      await this.executeModeration(subject, policy);
    }
  }
  
  private detectCoordination(reports: Report[]): number {
    // Check timing patterns
    const timestamps = reports.map(r => r.timestamp.getTime()).sort();
    const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(
      intervals.reduce((sq, n) => sq + Math.pow(n - avgInterval, 2), 0) / intervals.length
    );
    
    // Low standard deviation suggests coordination
    const timingScore = 1 - (stdDev / avgInterval);
    
    // Check reporter relationships
    let relationshipScore = 0;
    const reporters = reports.map(r => r.reporter);
    for (let i = 0; i < reporters.length; i++) {
      for (let j = i + 1; j < reporters.length; j++) {
        const shared = this.getSharedContexts(reporters[i], reporters[j]);
        if (shared.length > 2) relationshipScore += 0.1;
      }
    }
    
    return (timingScore + relationshipScore) / 2;
  }
  
  async implementGraduatedSanctions(
    subject: PublicKey,
    severity: number
  ): Promise<void> {
    const sanctions = [
      { threshold: 0.2, action: 'warning' },
      { threshold: 0.4, action: 'tempMute', duration: 3600000 }, // 1 hour
      { threshold: 0.6, action: 'restrictedReach', duration: 86400000 }, // 1 day
      { threshold: 0.8, action: 'groupSuspension', duration: 604800000 }, // 1 week
      { threshold: 1.0, action: 'permaBan' }
    ];
    
    const sanction = sanctions.find(s => severity <= s.threshold);
    if (!sanction) return;
    
    switch (sanction.action) {
      case 'warning':
        await this.sendWarning(subject);
        break;
      case 'tempMute':
        await this.muteUser(subject, sanction.duration);
        break;
      case 'restrictedReach':
        await this.restrictReach(subject, sanction.duration);
        break;
      case 'groupSuspension':
        await this.suspendFromGroup(subject, sanction.duration);
        break;
      case 'permaBan':
        await this.banUser(subject);
        break;
    }
  }
}
```

### 5. Network Module

```typescript
// src/modules/network/P2PNetwork.ts

import { RTCPeerConnection } from 'react-native-webrtc';

export class P2PNetwork {
  private connections = new Map<PeerId, RTCPeerConnection>();
  private messageHandlers = new Map<string, MessageHandler>();
  
  async initializeProximityDiscovery(): Promise<void> {
    // Start BLE advertising
    await BLEManager.startAdvertising({
      serviceUUID: APP_SERVICE_UUID,
      txPowerLevel: -56
    });
    
    // Start BLE scanning
    await BLEManager.startScan([APP_SERVICE_UUID], {
      allowDuplicates: false,
      scanMode: 'lowLatency'
    });
    
    // WiFi Direct discovery (Android only)
    if (Platform.OS === 'android') {
      await WiFiP2P.startDiscovery();
    }
  }
  
  async establishConnection(peerId: PeerId): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Community-run TURN servers
        {
          urls: 'turn:turn.community.example:3478',
          username: 'community',
          credential: 'shared-secret'
        }
      ]
    });
    
    // Create data channel for messages
    const dataChannel = pc.createDataChannel('messages', {
      ordered: true,
      maxRetransmits: 3
    });
    
    dataChannel.onmessage = (event) => {
      this.handleMessage(peerId, event.data);
    };
    
    // Set up offer/answer exchange
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Exchange offer/answer via QR code or existing channel
    const answer = await this.exchangeSignaling(peerId, offer);
    await pc.setRemoteDescription(answer);
    
    this.connections.set(peerId, pc);
  }
  
  async broadcastMessage(
    message: Message,
    groupId: GroupId
  ): Promise<void> {
    const envelope = {
      from: this.identity.publicKey,
      groupId,
      message,
      timestamp: Date.now(),
      signature: await this.identity.sign(message)
    };
    
    // Send to all connected peers in group
    const groupPeers = this.getGroupPeers(groupId);
    for (const peerId of groupPeers) {
      const conn = this.connections.get(peerId);
      if (conn?.connectionState === 'connected') {
        const channel = conn.getDataChannels().find(dc => dc.label === 'messages');
        if (channel?.readyState === 'open') {
          channel.send(JSON.stringify(envelope));
        }
      }
    }
    
    // Store for offline peers
    await this.storeForOfflineDelivery(envelope);
  }
  
  private async handleMessage(peerId: PeerId, data: string): Promise<void> {
    try {
      const envelope = JSON.parse(data);
      
      // Verify signature
      const valid = await this.identity.verifySignature(
        envelope.message,
        envelope.signature,
        envelope.from
      );
      
      if (!valid) {
        console.warn('Invalid signature from', peerId);
        return;
      }
      
      // Check group membership
      if (!this.isGroupMember(envelope.from, envelope.groupId)) {
        console.warn('Non-member message from', peerId);
        return;
      }
      
      // Process based on message type
      const handler = this.messageHandlers.get(envelope.message.type);
      if (handler) {
        await handler(envelope);
      }
      
      // Store in local database
      await this.persistMessage(envelope);
      
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }
}
```

## Data Models

### Database Schema

```sql
-- Identity table
CREATE TABLE identity (
  id INTEGER PRIMARY KEY,
  public_key BLOB NOT NULL,
  private_key_encrypted BLOB NOT NULL,
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  recovery_enabled BOOLEAN DEFAULT 0
);

-- Groups table
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  founder_public_key BLOB NOT NULL,
  governance_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ydoc_state BLOB -- Serialized CRDT state
);

-- Group members
CREATE TABLE group_members (
  group_id TEXT NOT NULL,
  public_key BLOB NOT NULL,
  joined_at INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  added_by BLOB,
  PRIMARY KEY (group_id, public_key),
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  sender_public_key BLOB NOT NULL,
  content_encrypted BLOB NOT NULL,
  timestamp INTEGER NOT NULL,
  signature BLOB NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Attestations for reputation
CREATE TABLE attestations (
  id TEXT PRIMARY KEY,
  subject_public_key BLOB NOT NULL,
  issuer_public_key BLOB NOT NULL,
  group_id TEXT NOT NULL,
  attestation_type TEXT NOT NULL,
  reason TEXT,
  timestamp INTEGER NOT NULL,
  signature BLOB NOT NULL
);

-- Reports for moderation
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_public_key BLOB NOT NULL,
  reported_public_key BLOB NOT NULL,
  group_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  evidence BLOB,
  stake INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,
  status TEXT DEFAULT 'pending'
);

-- Create indexes for performance
CREATE INDEX idx_messages_group_timestamp ON messages(group_id, timestamp);
CREATE INDEX idx_attestations_subject ON attestations(subject_public_key);
CREATE INDEX idx_reports_reported ON reports(reported_public_key);
```

## Security Architecture

### Threat Model

1. **State-level adversaries** attempting mass surveillance
2. **Malicious group members** attempting to disrupt operations
3. **Coordinated harassment campaigns** targeting individuals
4. **Law enforcement** seeking user data via legal process
5. **Platform-level attacks** (app store removal, DNS blocking)

### Security Measures

#### Cryptographic Security
- Ed25519 for signatures (via libsodium)
- X25519 for key exchange
- XChaCha20-Poly1305 for encryption
- Argon2id for key derivation
- BLAKE2b for hashing

#### Network Security
- Perfect forward secrecy via double ratchet protocol
- Onion routing for metadata protection (optional)
- Certificate pinning for any central services
- Domain fronting capability for censorship resistance

#### Application Security
- Secure storage using platform keystores
- Memory wiping for sensitive data
- Screenshot prevention for sensitive screens
- Root/jailbreak detection (optional warning)

## User Experience Flow

### First Launch

```
1. Welcome Screen
   ├─> Create New Identity
   │   ├─> Generate Keypair
   │   ├─> Optional: Add Recovery Email (hashed)
   │   └─> Store in Keychain
   │
   └─> Recover Existing Identity
       ├─> Social Recovery (3-of-5 friends)
       └─> Backup Phrase Recovery

2. Setup Profile
   ├─> Choose Display Name (per-group)
   ├─> Enable Biometric Auth
   └─> Set Privacy Preferences

3. Join/Create Group
   ├─> Scan QR Code (physical proximity)
   ├─> Enter Invite Code
   └─> Create New Group
```

### Group Interaction

```
Group View
├─> Members List
│   └─> View Reputation (if sufficient shared context)
├─> Messages
│   ├─> Encrypted Group Chat
│   └─> Announcements
├─> Governance
│   ├─> Active Proposals
│   ├─> Vote on Decisions
│   └─> View Decision History
└─> Settings
    ├─> Notification Preferences
    ├─> Privacy Settings
    └─> Leave Group
```

## Deployment Strategy

### Phase 1: Alpha (Months 1-3)
- TestFlight (iOS) / APK distribution (Android)
- 100-500 test users from trusted communities
- Core features: identity, groups, messaging
- Manual bug reporting and feedback

### Phase 2: Beta (Months 4-6)
- F-Droid distribution
- PWA for web access
- 1,000-5,000 users
- Community-run infrastructure begins

### Phase 3: Public Launch (Months 7-12)
- App store submission (if feasible)
- 10,000+ users
- Federation support
- Plugin ecosystem

## Cost Analysis

### Minimal Infrastructure Costs

| Service | Purpose | Monthly Cost | Provider |
|---------|---------|-------------|----------|
| Signaling Server | WebRTC connection setup | $5-20 | Community VPS |
| STUN Server | NAT traversal | $0 | Public servers |
| TURN Server | Relay when P2P fails | $10-50 | Community donation |
| Website | Documentation & downloads | $0 | GitHub Pages |
| CI/CD | Build automation | $0 | GitHub Actions |

**Total: $15-70/month initially, scaling with community support**

### Funding Sources
1. **Grants**: Open Tech Fund, Mozilla, EFF
2. **Donations**: Open Collective, GitHub Sponsors
3. **Community Infrastructure**: Donated servers and bandwidth
4. **Optional Premium Features**: Priority support, advanced governance modules

## Development Roadmap

### Milestone 1: Core Identity (Month 1)
- [x] Keypair generation and storage
- [x] QR code exchange
- [x] Basic UI framework
- [ ] Biometric authentication

### Milestone 2: P2P Messaging (Month 2)
- [ ] WebRTC data channels
- [ ] Message encryption/decryption
- [ ] Offline message queue
- [ ] Basic group creation

### Milestone 3: Reputation System (Month 3)
- [ ] Attestation creation and storage
- [ ] Context-based visibility
- [ ] Reputation UI components
- [ ] Anti-gaming measures

### Milestone 4: Moderation Tools (Month 4)
- [ ] Report filing system
- [ ] Threshold detection
- [ ] Graduated sanctions
- [ ] Appeal process

### Milestone 5: Governance (Month 5)
- [ ] Voting mechanisms
- [ ] Proposal system
- [ ] Decision execution
- [ ] Governance plugins

### Milestone 6: Federation (Month 6)
- [ ] Bridge node protocol
- [ ] Cross-group messaging
- [ ] Federated reputation
- [ ] Server mode

## Conclusion

This technical design provides a foundation for building a privacy-preserving community application that operates without central servers while maintaining usability. The architecture prioritizes user agency, community governance, and resistance to both technical attacks and legal coercion.

The key innovation is combining established cryptographic techniques with modern P2P networking and CRDTs to create a system that works offline, scales horizontally, and becomes more resilient as it grows. By starting simple and progressively adding features based on community needs, the project can achieve sustainable growth without venture capital or surveillance-based monetization.