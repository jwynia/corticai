# Implementation Guide: Passkey Auth + Email Magic Links

## Classification
- **Domain:** Practical/Applied
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** High

## Quick Start Paths

### For Passkey Implementation

#### Beginner Path
1. **Start with:** SimpleWebAuthn library for Node.js/TypeScript
2. **Key concepts to understand:**
   - Registration vs Authentication ceremonies
   - Relying Party (your app) vs Authenticator (user device)
   - User verification vs User presence
3. **First practical step:** Implement basic registration flow
4. **Common mistakes to avoid:**
   - Not handling user verification properly
   - Inadequate error handling for unsupported browsers
   - Poor user onboarding experience

#### For Practitioners
1. **Assessment checklist:**
   - Browser compatibility requirements
   - Device ecosystem considerations
   - Existing authentication system integration
2. **Integration approach:**
   - Progressive enhancement over existing auth
   - Feature detection and graceful fallbacks
   - User migration strategy from passwords
3. **Advanced techniques:**
   - Conditional UI based on capability
   - Cross-platform synchronization handling
   - Enterprise attestation validation

### For Magic Link Implementation

#### Beginner Path
1. **Start with:** Token generation using crypto.randomBytes()
2. **Key concepts:**
   - Stateless vs stateful token approaches
   - Email delivery reliability
   - Token expiration and cleanup
3. **First practical step:** Create token generation and verification endpoints
4. **Common mistakes:**
   - Using weak random number generation
   - Not implementing proper rate limiting
   - Inadequate email deliverability measures

## Implementation Patterns

### Pattern: Hybrid Authentication Strategy
**Context:** Supporting both passkey and magic link authentication
**Solution:**
```typescript
class AuthenticationService {
  async authenticate(method: 'passkey' | 'magic-link', options: any) {
    switch(method) {
      case 'passkey':
        return this.authenticateWithPasskey(options);
      case 'magic-link':
        return this.authenticateWithMagicLink(options);
    }
  }

  private async detectCapabilities(userAgent: string) {
    // Feature detection for optimal method recommendation
    return {
      supportsPasskeys: this.supportsWebAuthn(userAgent),
      supportsCredentialManager: this.hasCredentialManager(userAgent),
      recommendedMethod: this.getRecommendedMethod(userAgent)
    };
  }
}
```
**Consequences:** Increased complexity but maximum user coverage
**Examples:** GitHub, Google, Microsoft implementations

### Pattern: Progressive Authentication Enhancement
**Context:** Gradually introducing passwordless methods
**Solution:**
1. Phase 1: Magic links as password reset alternative
2. Phase 2: Magic links for optional passwordless login
3. Phase 3: Passkey registration for enhanced security users
4. Phase 4: Passkey as primary, magic link as fallback

**Consequences:** Smooth user adoption with minimal disruption

### Pattern: Security-First Token Design
**Context:** Implementing secure magic link tokens
**Solution:**
```typescript
interface MagicLinkToken {
  id: string;           // Unique token identifier
  userId: string;       // Associated user
  action: string;       // 'login' | 'register' | 'reset'
  expiresAt: Date;      // Short expiration (5-15 minutes)
  usedAt?: Date;        // Single-use enforcement
  ipAddress?: string;   // Optional IP binding
  userAgent?: string;   // Optional UA binding
}
```

## Decision Framework

### Choosing Authentication Method by Use Case

```
IF user_device_supports_biometrics AND security_priority = HIGH
  THEN recommend_passkeys()
ELSE IF user_on_mobile AND email_accessible
  THEN recommend_magic_links()
ELSE IF user_on_shared_device
  THEN require_magic_links()
ELSE
  THEN offer_both_options()
```

### Token Expiration Strategy
```
IF action_type = 'login'
  THEN expiration = 5_minutes
ELSE IF action_type = 'register'
  THEN expiration = 15_minutes
ELSE IF action_type = 'password_reset'
  THEN expiration = 60_minutes
```

## Resource Requirements

### For Passkeys
**Knowledge Prerequisites:**
- JavaScript/TypeScript proficiency
- Understanding of public key cryptography basics
- Web API familiarity (Fetch, Promises, Error handling)

**Technical Requirements:**
- HTTPS-enabled domain (required for WebAuthn)
- Modern build toolchain supporting ES2017+
- Database for credential storage (public keys ~150-300 bytes each)
- Session management system

**Time Investment:**
- Basic implementation: 2-3 weeks
- Production-ready with UX: 6-8 weeks
- Enterprise-grade with attestation: 12+ weeks

### For Magic Links
**Knowledge Prerequisites:**
- Server-side development experience
- Email infrastructure understanding
- Token-based authentication concepts

**Technical Requirements:**
- Email delivery service (SendGrid, AWS SES, etc.)
- Secure token storage (Redis, database with TTL)
- Rate limiting infrastructure
- DNS configuration for email authentication

**Time Investment:**
- Basic implementation: 1 week
- Production-ready: 3-4 weeks
- High-volume optimized: 6-8 weeks

## Security Checklist

### Passkey Security
- [ ] HTTPS enforced on all authentication endpoints
- [ ] Proper origin validation in WebAuthn ceremonies
- [ ] User verification policy appropriate for security requirements
- [ ] Credential management (deletion, replacement) implemented
- [ ] Fallback authentication method available
- [ ] Error messages don't leak sensitive information

### Magic Link Security
- [ ] Tokens generated using cryptographically secure methods
- [ ] Token expiration strictly enforced (5-15 minutes)
- [ ] One-time use validation implemented
- [ ] Rate limiting on token generation (max 3-5 per hour)
- [ ] Email authentication protocols configured (SPF, DKIM, DMARC)
- [ ] TLS enforced for all verification endpoints
- [ ] Redirect validation prevents open redirects
- [ ] Token cleanup process removes expired tokens

## Integration with Existing Systems

### Database Schema Considerations

#### Passkeys
```sql
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);
```

#### Magic Links
```sql
CREATE TABLE magic_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash TEXT UNIQUE NOT NULL, -- Store hash, not plaintext
  action_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_expires_cleanup (expires_at),
  INDEX idx_token_lookup (token_hash)
);
```

### API Design Patterns

#### RESTful Endpoints
```
POST /auth/passkey/register/begin    # Start registration
POST /auth/passkey/register/finish   # Complete registration
POST /auth/passkey/login/begin       # Start authentication
POST /auth/passkey/login/finish      # Complete authentication

POST /auth/magic-link/request        # Request magic link
GET  /auth/magic-link/verify/:token  # Verify magic link
```

This implementation guide provides a practical roadmap for implementing both passkey and magic link authentication in the Pliers platform, with specific attention to security, user experience, and integration requirements.