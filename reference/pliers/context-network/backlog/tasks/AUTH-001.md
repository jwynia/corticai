# AUTH-001: Authentication Infrastructure Foundation

## Metadata
- **Status:** ready
- **Type:** feature
- **Epic:** passwordless-authentication
- **Priority:** high
- **Size:** medium
- **Created:** 2025-09-25
- **Branch:** task/AUTH-001-auth-infrastructure

## Description
Establish the foundational infrastructure for passwordless authentication without disrupting the existing JWT-based system. This includes database schema extensions, basic service interfaces, and capability detection.

## Acceptance Criteria
- [ ] Create database migration for user_credentials table (passkey storage)
- [ ] Create database migration for magic_tokens table (magic link tokens)
- [ ] Extend authentication service interface to support multiple auth methods
- [ ] Implement WebAuthn capability detection for client devices
- [ ] Add configuration for email service integration
- [ ] Create base authentication service class with method routing
- [ ] Ensure backwards compatibility with existing JWT authentication
- [ ] Add TypeScript interfaces for new authentication types

## Technical Notes
- Database tables follow UUID primary key pattern established in project
- Authentication service should use existing dependency injection patterns
- Capability detection should leverage user-agent analysis
- Email configuration should use environment variables for service selection

## Dependencies
- None - foundation task

## Security Impact
- **Current Risk:** NONE - No changes to existing auth flows
- **Post-Implementation Risk:** LOW - Foundation only, no auth logic changes

## Database Schema

### user_credentials table
```sql
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX idx_user_credentials_active ON user_credentials(user_id, is_active);
```

### magic_tokens table
```sql
CREATE TABLE magic_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('login', 'register')),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_magic_tokens_hash ON magic_tokens(token_hash);
CREATE INDEX idx_magic_tokens_cleanup ON magic_tokens(expires_at) WHERE used_at IS NULL;
```

## Testing Strategy
- Unit tests for capability detection function
- Database migration tests (up and down)
- Interface compatibility tests with existing auth system
- Configuration validation tests
- TypeScript compilation tests for new interfaces

## References
- Implementation Plan: context-network/plans/passwordless-authentication-implementation.md
- Research: context-network/research/passwordless-auth-passkeys-magic-links/

## Branch Naming
`task/AUTH-001-auth-infrastructure-foundation`