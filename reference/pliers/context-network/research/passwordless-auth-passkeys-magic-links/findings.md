# Research Findings: Passkey Auth + Email Magic Links

## Classification
- **Domain:** Authentication/Security
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** High (varies by finding)

## Structured Findings

### Core Concepts

#### Passkeys (WebAuthn/FIDO2)
- **Definition:** Passwordless authentication using public-private key cryptography stored securely on user devices
- **Key Characteristics:**
  - Phishing-resistant (no shared secrets)
  - Device-bound or synced across platform ecosystems
  - Based on W3C WebAuthn API and FIDO2 standards
  - Uses biometrics, PINs, or device unlock for verification
- **Source Consensus:** Strong - consistent across FIDO Alliance, major platforms

#### Magic Links
- **Definition:** Time-limited URLs with embedded tokens sent via email for one-time authentication
- **Key Characteristics:**
  - Token-based authentication strategy
  - Single-use, time-bound credentials
  - Relies on secure email delivery
  - No passwords to remember or type
- **Source Consensus:** Strong on concept, moderate on best practices

### Current State Analysis

#### Passkey Adoption (2024)
- **Mature Aspects:**
  - Browser support across Chrome, Safari, Firefox, Edge
  - Platform support on iOS, Android, Windows, macOS
  - Standard APIs (WebAuthn Level 2) widely implemented
- **Emerging Trends:**
  - 550% increase in daily passkey creation (Bitwarden, 2024)
  - 15+ billion online accounts now support passkeys
  - 20% of top 100 websites offer passkey support
  - Consumer awareness reached 84% (up from 39% in 2022)
- **Contested Areas:**
  - Cross-platform synchronization approaches
  - Enterprise deployment strategies
  - Recovery mechanisms for lost devices

#### Magic Link Usage
- **Mature Aspects:**
  - Well-established implementation patterns
  - Broad email provider compatibility
  - Simple integration with existing systems
- **Emerging Trends:**
  - Increased scrutiny of email-based authentication
  - Integration with multi-factor authentication
  - Enhanced security protocols (SPF, DKIM, DMARC)

### Security Analysis

#### Passkey Security Strengths
- **Phishing Resistance:** Cryptographic binding to origin prevents phishing
- **No Credential Reuse:** Each service gets unique key pair
- **Device Security:** Private keys stored in secure enclaves (TPM, Secure Element)
- **Replay Attack Resistance:** Challenge-response authentication prevents replay

#### Magic Link Vulnerabilities
- **Email Account Compromise:** Primary attack vector - if email is compromised, authentication is compromised
- **Token Interception:**
  - Man-in-the-middle attacks on unencrypted connections
  - Email scanning by corporate security tools
  - Browser/email client link previewing
- **Open Redirect Attacks:** Malicious manipulation of destination URLs
- **Session Hijacking:** If session management is weak post-authentication

### Implementation Requirements

#### Passkey Implementation
**Client-Side Requirements:**
- WebAuthn API integration
- Feature detection and fallbacks
- Error handling for unsupported devices
- User guidance and onboarding flows

**Server-Side Requirements:**
- Credential storage (public keys, metadata)
- Challenge generation and verification
- User verification policy enforcement
- Attestation validation (optional)

**Libraries and Tools:**
- SimpleWebAuthn (Node.js/TypeScript)
- @github/webauthn-json (simplified API)
- Yubico libraries (cross-platform)

#### Magic Link Implementation
**Core Components:**
- Secure token generation (CSPRNG, 256+ bits)
- Token storage and expiration management
- Email delivery infrastructure
- Verification endpoints
- Anti-tampering measures

**Security Requirements:**
- TLS encryption for all communications
- Email authentication (SPF, DKIM, DMARC)
- Short token lifespans (5-15 minutes)
- Rate limiting on token generation
- Secure redirect validation

### Performance and User Experience

#### Passkey UX Advantages
- **Speed:** Faster than password typing (biometric unlock ~2 seconds)
- **Consistency:** Same experience across devices and services
- **Accessibility:** Works with assistive technologies
- **No Cognitive Load:** Nothing to remember or type

#### Magic Link UX Considerations
- **Context Switching:** Requires checking email
- **Latency:** Email delivery delays (typically 1-30 seconds)
- **Mobile Optimization:** Works well on mobile devices
- **Device Dependency:** Requires access to registered email

### Cross-Domain Insights
- **Similar Concepts In:**
  - Certificate-based authentication (PKI)
  - Hardware security keys (FIDO U2F)
  - Mobile app authentication tokens
- **Contradicts:**
  - Traditional "something you know" authentication factors
  - Shared secret models
- **Complements:**
  - Multi-factor authentication strategies
  - Zero-trust security architectures
  - Identity federation protocols
- **Enables:**
  - Passwordless enterprise environments
  - Improved accessibility for authentication
  - Reduced help desk burden from password resets