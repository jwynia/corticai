# Integration Analysis: Hanko with Pliers v3 Architecture

## Classification
- **Domain:** Security/Authentication/Integration
- **Stability:** Dynamic
- **Abstraction:** Detailed
- **Confidence:** High

## API Gateway Integration

### Current Gateway Architecture

The Pliers v3 API Gateway serves as the single entry point with:
- Request routing to microservices
- Authentication/authorization middleware
- Rate limiting and caching
- Request validation and logging

### Hanko Integration Points

#### Option 1: Gateway-Level JWT Verification (Recommended)

```typescript
// API Gateway Hanko Middleware
class HankoAuthMiddleware {
  private jwksClient: JwksClient;
  private jwksCache: Cache;

  constructor(hankoApiUrl: string) {
    this.jwksClient = jwksRsa({
      jwksUri: `${hankoApiUrl}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true
    });
  }

  async authenticate(req: Request): Promise<AuthContext> {
    // Extract token from cookie or header
    const token = this.extractToken(req);

    // Verify with Hanko JWKS
    const hankoPayload = await this.verifyHankoToken(token);

    // Enhance with Pliers context
    const pliersContext = await this.enrichAuthContext(hankoPayload);

    // Attach to request
    req.auth = pliersContext;

    return pliersContext;
  }

  private extractToken(req: Request): string {
    // Priority: Header > Cookie
    return req.headers['x-auth-token'] ||
           req.cookies['hanko'] ||
           this.extractBearerToken(req);
  }

  private async enrichAuthContext(hankoPayload: HankoJWT): Promise<PliersAuthContext> {
    // Fetch user from database
    const user = await this.userService.findByHankoId(hankoPayload.sub);

    // Build Pliers-compatible context
    return {
      userId: user.id,
      hankoUserId: hankoPayload.sub,
      email: hankoPayload.email,
      roles: user.roles,
      permissions: await this.computePermissions(user),
      tenantId: user.currentTenantId,
      sessionMetadata: {
        authProvider: 'hanko',
        isPasskey: true,
        verifiedAt: new Date()
      }
    };
  }
}
```

#### Option 2: Session Validation Endpoint

```typescript
// Use Hanko's session validation endpoint
class HankoSessionValidator {
  async validateSession(req: Request): Promise<boolean> {
    const sessionToken = req.cookies['hanko'];

    const response = await fetch(`${HANKO_API_URL}/sessions/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `hanko=${sessionToken}`
      }
    });

    if (!response.ok) {
      return false;
    }

    const session = await response.json();
    req.auth = await this.mapHankoSession(session);
    return true;
  }
}
```

### Gateway Configuration Updates

```yaml
# API Gateway configuration
gateway:
  authentication:
    providers:
      hanko:
        enabled: true
        apiUrl: ${HANKO_API_URL}
        jwksEndpoint: /.well-known/jwks.json
        sessionEndpoint: /sessions/validate
        priority: 1

      legacy:
        enabled: true
        priority: 2
        deprecationDate: 2025-12-31

  middleware:
    - name: hanko-auth
      path: /api/v1/*
      exclude:
        - /api/v1/auth/legacy/*
        - /api/v1/public/*
```

## Frontend Integration

### Current Frontend Architecture

The Pliers frontend expects:
- JWT in Authorization header
- Refresh token mechanism
- Role-based UI rendering
- MFA status indicators

### Hanko Elements Integration

#### Component Installation

```bash
npm install @teamhanko/hanko-elements
```

#### Authentication Component

```tsx
// components/auth/HankoAuth.tsx
import { register } from "@teamhanko/hanko-elements";

export function HankoAuth() {
  useEffect(() => {
    // Register Hanko web components
    register({
      shadow: true,  // Use shadow DOM
      injectStyles: true  // Inject default styles
    }).catch(console.error);
  }, []);

  return (
    <div className="auth-container">
      {/* Hanko's pre-built auth component */}
      <hanko-auth
        api={process.env.NEXT_PUBLIC_HANKO_API_URL}
        lang="en"
        experimental
      />
    </div>
  );
}
```

#### Profile Management Component

```tsx
// components/profile/HankoProfile.tsx
export function HankoProfile() {
  return (
    <hanko-profile
      api={process.env.NEXT_PUBLIC_HANKO_API_URL}
    />
  );
}
```

### Frontend State Management

```typescript
// stores/auth.store.ts
interface AuthState {
  user: User | null;
  hankoUser: HankoUser | null;
  isAuthenticated: boolean;
  isPasskeyUser: boolean;
}

class AuthStore {
  private hanko: Hanko;

  constructor() {
    this.hanko = new Hanko(process.env.NEXT_PUBLIC_HANKO_API_URL);
    this.initializeAuth();
  }

  async initializeAuth() {
    // Listen for Hanko auth events
    this.hanko.onAuthFlowCompleted(() => {
      this.syncWithBackend();
    });

    this.hanko.onSessionExpired(() => {
      this.handleSessionExpiry();
    });
  }

  async syncWithBackend() {
    // Get Hanko session
    const session = await this.hanko.session.get();

    // Sync with Pliers backend
    const response = await fetch('/api/v1/auth/sync', {
      method: 'POST',
      headers: {
        'X-Auth-Token': session.jwt
      }
    });

    const pliersUser = await response.json();
    this.updateAuthState(pliersUser);
  }
}
```

### API Client Updates

```typescript
// lib/api-client.ts
class ApiClient {
  private hanko: Hanko;

  constructor() {
    this.hanko = new Hanko(process.env.NEXT_PUBLIC_HANKO_API_URL);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(async (config) => {
      // Get current Hanko session
      const session = await this.hanko.session.get();

      if (session?.jwt) {
        // Add JWT to request
        config.headers['Authorization'] = `Bearer ${session.jwt}`;
      }

      return config;
    });

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try to refresh via Hanko
          const newSession = await this.hanko.session.refresh();
          if (newSession) {
            // Retry request with new token
            return this.client.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }
}
```

## Backend Service Integration

### Service-to-Service Authentication

```typescript
// Microservice authentication setup
class ServiceAuthConfig {
  // Services bypass Hanko for internal communication
  internalAuth: {
    method: 'mutual-tls' | 'service-token';
    skipHanko: true;
  };

  // External API calls go through Hanko
  externalAuth: {
    method: 'hanko-jwt';
    validateAt: 'gateway';
  };
}
```

### Database Schema Updates

```sql
-- User table modifications for Hanko integration
ALTER TABLE users
  ADD COLUMN hanko_user_id UUID UNIQUE,
  ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'legacy',
  ADD COLUMN passkey_registered_at TIMESTAMP,
  ADD COLUMN last_passkey_used_at TIMESTAMP;

-- Session tracking updates
ALTER TABLE sessions
  ADD COLUMN hanko_session_id VARCHAR(255),
  ADD COLUMN auth_method VARCHAR(20); -- 'passkey', 'passcode', 'password'

-- Audit log updates
ALTER TABLE audit_logs
  ADD COLUMN auth_provider VARCHAR(20),
  ADD COLUMN auth_method VARCHAR(20);
```

### User Service Updates

```typescript
class UserService {
  async findOrCreateFromHanko(hankoUserId: string, email?: string): Promise<User> {
    // Check if user exists
    let user = await this.userRepository.findByHankoId(hankoUserId);

    if (!user && email) {
      // Check by email for migration
      user = await this.userRepository.findByEmail(email);

      if (user) {
        // Link existing user to Hanko
        user.hankoUserId = hankoUserId;
        user.authProvider = 'hanko';
        await this.userRepository.save(user);
      }
    }

    if (!user) {
      // Create new user
      user = await this.createUser({
        hankoUserId,
        email,
        authProvider: 'hanko',
        roles: ['user'], // Default role
        tenantId: await this.getDefaultTenant()
      });
    }

    return user;
  }

  async migrateToHanko(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    // Create Hanko user
    const hankoUser = await this.hankoAdmin.createUser({
      email: user.email
    });

    // Update local user
    user.hankoUserId = hankoUser.id;
    user.authProvider = 'hanko';
    await this.userRepository.save(user);

    // Send migration email
    await this.emailService.sendPasskeySetupEmail(user);
  }
}
```

## Cross-Domain Configuration

### CORS Setup for Hanko

```typescript
// Hanko configuration for cross-domain
const hankoConfig = {
  cookie: {
    domain: '.pliers.io', // Allow subdomains
    secure: true,
    sameSite: 'lax',
    httpOnly: true
  },

  cors: {
    allowOrigins: [
      'https://app.pliers.io',
      'https://admin.pliers.io'
    ],
    allowCredentials: true
  },

  // If cookies can't be used
  headerAuth: {
    enabled: true,
    headerName: 'X-Auth-Token'
  }
};
```

## Webhook Integration

### Hanko Webhook Handler

```typescript
class HankoWebhookHandler {
  async handleWebhook(payload: any, signature: string): Promise<void> {
    // Verify webhook signature
    const isValid = await this.verifySignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Extract JWT from payload
    const jwt = payload.jwt;
    const decoded = await this.verifyHankoJWT(jwt);

    // Handle events
    switch (decoded.evt) {
      case 'user.created':
        await this.handleUserCreated(decoded.data);
        break;

      case 'user.deleted':
        await this.handleUserDeleted(decoded.data);
        break;

      case 'user.email.verified':
        await this.handleEmailVerified(decoded.data);
        break;

      case 'user.passkey.created':
        await this.handlePasskeyCreated(decoded.data);
        break;
    }
  }

  private async handleUserCreated(hankoUser: any) {
    // Create corresponding Pliers user
    await this.userService.findOrCreateFromHanko(
      hankoUser.id,
      hankoUser.email
    );
  }

  private async handlePasskeyCreated(data: any) {
    // Update user's passkey status
    await this.userService.updatePasskeyStatus(data.user_id, true);

    // Log security event
    await this.auditService.logSecurityEvent({
      type: 'PASSKEY_REGISTERED',
      userId: data.user_id,
      timestamp: new Date()
    });
  }
}
```

## Migration Strategy

### Phase 1: Parallel Authentication (Months 1-3)

```typescript
// Support both auth methods
app.post('/api/v1/auth/login', async (req, res) => {
  const { method } = req.body;

  if (method === 'hanko') {
    // New Hanko flow
    return hankoAuthController.login(req, res);
  } else {
    // Legacy flow
    return legacyAuthController.login(req, res);
  }
});
```

### Phase 2: User Migration (Months 3-6)

```typescript
// Prompt users to set up passkeys
class PasskeyMigrationService {
  async checkMigrationStatus(userId: string): Promise<MigrationPrompt | null> {
    const user = await this.userService.findById(userId);

    if (!user.passkeyRegistered && user.authProvider === 'legacy') {
      return {
        type: 'SETUP_PASSKEY',
        message: 'Enhance your security with passkeys',
        dismissible: true,
        priority: 'medium'
      };
    }

    return null;
  }
}
```

### Phase 3: Deprecation (Months 6-12)

```typescript
// Deprecate legacy authentication
class AuthDeprecationMiddleware {
  async handle(req: Request, res: Response, next: Next) {
    if (req.path.startsWith('/api/v1/auth/legacy')) {
      res.setHeader('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT');
      res.setHeader('Deprecation', 'true');
    }
    next();
  }
}
```

## Performance Optimization

### JWKS Caching Strategy

```typescript
class JWKSCache {
  private cache: Redis;
  private ttl = 600; // 10 minutes

  async getKey(kid: string): Promise<JsonWebKey | null> {
    // Check cache first
    const cached = await this.cache.get(`jwks:${kid}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from Hanko
    const keys = await this.fetchJWKS();
    const key = keys.find(k => k.kid === kid);

    if (key) {
      // Cache the key
      await this.cache.set(`jwks:${kid}`, JSON.stringify(key), this.ttl);
    }

    return key;
  }
}
```

### Connection Pooling

```typescript
// Optimize Hanko API calls
class HankoApiClient {
  private pool: ConnectionPool;

  constructor() {
    this.pool = new ConnectionPool({
      maxConnections: 10,
      keepAlive: true,
      timeout: 5000
    });
  }

  async validateSession(token: string): Promise<boolean> {
    return this.pool.execute(async (connection) => {
      return connection.post('/sessions/validate', { token });
    });
  }
}
```