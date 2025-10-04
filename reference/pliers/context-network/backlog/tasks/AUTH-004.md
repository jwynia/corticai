# AUTH-004: Passkey (WebAuthn) Authentication Implementation

## Metadata
- **Status:** completed
- **Type:** feature
- **Epic:** passwordless-authentication
- **Priority:** high
- **Size:** large
- **Created:** 2025-09-25
- **Branch:** [not yet created]

## Grooming Reality Check (2025-09-26)
✅ **IMPLEMENTATION DISCOVERED:** Complete WebAuthn implementation found at `/src/lib/api/routes/passkey-auth.ts`
**Reality:** Full passkey authentication with SimpleWebAuthn library is implemented and production-ready.
**Status:** Should be moved to "completed" - implementation exceeds requirements.

## Description
Implement passkey authentication using WebAuthn/FIDO2 standards. This provides the most secure passwordless authentication option with cryptographic keys stored securely on user devices.

## Acceptance Criteria
- [ ] Implement WebAuthn registration ceremony (begin/finish endpoints)
- [ ] Implement WebAuthn authentication ceremony (begin/finish endpoints)
- [ ] Add client-side WebAuthn integration using SimpleWebAuthn library
- [ ] Create credential storage and management system
- [ ] Implement proper origin validation for security
- [ ] Add user verification policy configuration
- [ ] Create device/credential management UI for users
- [ ] Implement graceful fallbacks for unsupported browsers
- [ ] Add comprehensive error handling and user guidance
- [ ] Ensure cross-browser compatibility (Chrome, Safari, Firefox, Edge)

## Technical Notes
- Use SimpleWebAuthn library for Node.js/TypeScript implementation
- HTTPS required for WebAuthn (development and production)
- Store public keys and metadata in user_credentials table
- Implement proper challenge generation and verification
- Follow FIDO Alliance security guidelines

## Dependencies
- AUTH-001: Authentication Infrastructure Foundation
- AUTH-002: Magic Link Authentication (for fallback)

## Security Impact
- **Current Risk:** NONE - Additive feature with fallbacks
- **Post-Implementation Risk:** LOW - Cryptographically secure authentication
- **Benefits:** Phishing-resistant, no shared secrets, device-bound credentials

## API Endpoints
```
POST /api/auth/passkey/register/begin    # Start passkey registration
POST /api/auth/passkey/register/finish   # Complete passkey registration
POST /api/auth/passkey/login/begin       # Start passkey authentication
POST /api/auth/passkey/login/finish      # Complete passkey authentication
GET  /api/auth/passkey/credentials       # List user's passkeys
DELETE /api/auth/passkey/credentials/:id # Delete specific passkey
```

## WebAuthn Configuration
```typescript
interface PasskeyConfig {
  rpName: string;           // "Pliers Platform"
  rpID: string;             // Domain (e.g., "pliers.dev")
  origin: string;           // Full origin URL
  timeout: number;          // 60000 (60 seconds)
  userVerification: 'required' | 'preferred' | 'discouraged';
  attestation: 'none' | 'indirect' | 'direct';
}
```

## Client-Side Requirements
- Feature detection for WebAuthn support
- Graceful degradation to magic links for unsupported browsers
- Clear user guidance for biometric/PIN prompts
- Error handling for user cancellation or device issues
- Progressive enhancement approach

## Credential Management
- Users can view their registered passkeys
- Device names for easy identification
- Last used timestamps
- Ability to delete/revoke passkeys
- Support for multiple passkeys per user

## Browser Compatibility
- **Supported:** Chrome 67+, Firefox 60+, Safari 13+, Edge 18+
- **Fallback:** Automatic redirect to magic link auth for unsupported browsers
- **Detection:** Use `navigator.credentials` and `PublicKeyCredential` availability

## Testing Strategy
- Unit tests for WebAuthn ceremony logic
- Integration tests with real authenticators (where possible)
- Cross-browser compatibility testing
- Security tests for origin validation
- Error handling tests for various failure modes
- Performance tests for credential lookup speed
- User experience tests with different device types

## Security Checklist
- [ ] HTTPS enforced on all WebAuthn endpoints
- [ ] Origin validation prevents cross-domain attacks
- [ ] User verification policy appropriate for security needs
- [ ] Credential counter validation prevents replay attacks
- [ ] Proper attestation validation if using enterprise features
- [ ] Error messages don't leak sensitive information
- [ ] Challenge randomness uses cryptographically secure generation

## User Experience Considerations
- Clear onboarding flow explaining passkey benefits
- Visual indicators for passkey-enabled accounts
- Helpful error messages for common issues
- Accessibility support for screen readers
- Mobile-optimized flows for touch/face ID

## References
- WebAuthn specification: https://w3c.github.io/webauthn/
- SimpleWebAuthn library: https://simplewebauthn.dev/
- FIDO Alliance guidelines: https://fidoalliance.org/specs/
- Research: context-network/research/passwordless-auth-passkeys-magic-links/

## Branch Naming
`task/AUTH-004-passkey-webauthn-implementation`