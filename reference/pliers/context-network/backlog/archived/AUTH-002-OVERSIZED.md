# AUTH-002: Magic Link Authentication Implementation

## Metadata
- **Status:** ready
- **Type:** feature
- **Epic:** passwordless-authentication
- **Priority:** high
- **Size:** large
- **Created:** 2025-09-25
- **Branch:** task/AUTH-002-magic-links

## Description
Implement secure magic link authentication as the first passwordless method. This includes token generation, email delivery, verification endpoints, and security controls including rate limiting.

## Acceptance Criteria
- [ ] Implement secure token generation using cryptographically secure methods
- [ ] Create magic link request endpoint with rate limiting (3-5 per hour)
- [ ] Implement token verification endpoint with single-use enforcement
- [ ] Set up email delivery service integration (SendGrid/AWS SES)
- [ ] Create HTML and text email templates for magic links
- [ ] Add token cleanup process for expired tokens
- [ ] Implement redirect validation to prevent open redirect attacks
- [ ] Add comprehensive logging for security monitoring
- [ ] Create user-facing magic link request flow
- [ ] Add resend functionality with appropriate delays

## Technical Notes
- Tokens must be 256+ bit cryptographically secure
- Store hashed tokens, never plaintext in database
- Token expiration: 5-15 minutes based on action type
- Email authentication: Ensure SPF, DKIM, DMARC are configured
- All verification endpoints must require HTTPS

## Dependencies
- AUTH-001: Authentication Infrastructure Foundation

## Security Impact
- **Current Risk:** LOW - New feature, existing auth unchanged
- **Post-Implementation Risk:** MEDIUM - Email-dependent authentication added
- **Mitigation:** Rate limiting, short expiration, secure token generation

## API Endpoints
```
POST /api/auth/magic-link/request        # Request magic link
GET  /api/auth/magic-link/verify/:token  # Verify magic link token
POST /api/auth/magic-link/resend         # Resend magic link
```

## Token Security Requirements
```typescript
interface MagicLinkToken {
  id: string;           // UUID
  userId: string;       // Associated user ID
  action: 'login' | 'register'; // Action type
  expiresAt: Date;      // 5-15 minute expiration
  usedAt?: Date;        // Single-use enforcement
  tokenHash: string;    // Hashed token (SHA-256)
  metadata: {
    ipAddress?: string; // Optional IP binding
    userAgent?: string; // Optional UA binding
  };
}
```

## Rate Limiting Strategy
- 3 magic links per hour per user
- 10 magic links per hour per IP address
- Exponential backoff for repeated requests
- Clear error messages for rate limit violations

## Email Template Requirements
- Professional branding consistent with platform
- Clear call-to-action button
- Security warning about link expiration
- Plain text fallback for all HTML content
- Mobile-responsive design
- Accessible markup for screen readers

## Testing Strategy
- Unit tests for token generation and validation
- Integration tests for email delivery
- Security tests for token collision and brute force
- Rate limiting tests with various scenarios
- Email template rendering tests
- End-to-end authentication flow tests
- Performance tests for token generation speed

## Monitoring and Alerting
- Token generation rate monitoring
- Email delivery success/failure rates
- Authentication success/failure tracking
- Rate limit violation alerting
- Token usage pattern analysis

## References
- Security analysis: context-network/research/passwordless-auth-passkeys-magic-links/findings.md
- Implementation patterns: context-network/research/passwordless-auth-passkeys-magic-links/implementation.md

## Branch Naming
`task/AUTH-002-magic-link-authentication`