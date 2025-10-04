# Implementation Guide: Hanko Authentication in Pliers v3

## Classification
- **Domain:** Security/Authentication/Implementation
- **Stability:** Semi-stable
- **Abstraction:** Structural
- **Confidence:** High

## Quick Start Paths

### For Initial Setup (POC)
1. Deploy Hanko using Docker
2. Configure basic JWT verification at gateway
3. Integrate Hanko Elements in frontend
4. Test with a single tenant

### For Production Implementation
1. Choose deployment model (self-hosted vs cloud)
2. Implement JWT translation layer
3. Set up user migration pipeline
4. Configure monitoring and audit logging

## Implementation Patterns

### Pattern: JWT Translation at Gateway

**Context:** Need to maintain existing Pliers JWT structure while using Hanko
**Solution:** Implement translation middleware at API Gateway

```typescript
// gateway/middleware/hanko-translator.ts
export class HankoJWTTranslator {
  async translate(hankoToken: string): Promise<string> {
    // 1. Verify Hanko token
    const hankoPayload = await this.verifyHankoToken(hankoToken);

    // 2. Fetch user context
    const user = await this.userService.getByHankoId(hankoPayload.sub);

    // 3. Generate Pliers-compatible token
    const pliersPayload = {
      sub: user.id,
      email: hankoPayload.email || user.email,
      roles: user.roles,
      permissions: await this.permissionService.compute(user),
      tenantId: user.currentTenantId,
      sessionId: crypto.randomUUID(),
      mfaVerified: true, // Passkeys are inherently MFA
      ipAddress: this.request.ip,
      userAgent: this.request.userAgent,
      lastPasswordChange: user.lastPasswordChange,
      features: user.features,
      limitations: user.limitations
    };

    // 4. Sign with Pliers keys
    return jwt.sign(pliersPayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'pliers-api',
      audience: ['pliers-web', 'pliers-mobile', 'pliers-api']
    });
  }
}
```

**Consequences:**
- Minimal changes to existing services
- Additional processing overhead
- Maintains backward compatibility

### Pattern: Dual Authentication Support

**Context:** Need to support both legacy and Hanko authentication during migration
**Solution:** Implement authentication strategy pattern

```typescript
// auth/strategies/auth-strategy.ts
interface AuthStrategy {
  canHandle(request: Request): boolean;
  authenticate(request: Request): Promise<AuthResult>;
}

// auth/strategies/hanko-strategy.ts
export class HankoAuthStrategy implements AuthStrategy {
  canHandle(request: Request): boolean {
    return request.headers['x-hanko-token'] ||
           request.cookies['hanko'] ||
           request.body.authMethod === 'passkey';
  }

  async authenticate(request: Request): Promise<AuthResult> {
    const token = this.extractHankoToken(request);
    const isValid = await this.hankoClient.verifySession(token);

    if (isValid) {
      const user = await this.syncUser(token);
      return { success: true, user };
    }

    return { success: false, error: 'Invalid Hanko session' };
  }
}

// auth/strategies/legacy-strategy.ts
export class LegacyAuthStrategy implements AuthStrategy {
  canHandle(request: Request): boolean {
    return request.body.email && request.body.password;
  }

  async authenticate(request: Request): Promise<AuthResult> {
    // Existing authentication logic
    return this.legacyAuthService.authenticate(
      request.body.email,
      request.body.password
    );
  }
}

// auth/auth-manager.ts
export class AuthManager {
  private strategies: AuthStrategy[] = [
    new HankoAuthStrategy(),
    new LegacyAuthStrategy()
  ];

  async authenticate(request: Request): Promise<AuthResult> {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(request)) {
        return strategy.authenticate(request);
      }
    }

    throw new Error('No authentication strategy available');
  }
}
```

**Consequences:**
- Clean separation of concerns
- Easy to add/remove strategies
- Supports gradual migration

### Pattern: User Migration Pipeline

**Context:** Need to migrate existing users to Hanko
**Solution:** Implement automated migration with fallback

```typescript
// migration/user-migration.service.ts
export class UserMigrationService {
  async migrateUser(userId: string): Promise<MigrationResult> {
    const user = await this.userRepo.findById(userId);

    try {
      // 1. Create Hanko user
      const hankoUser = await this.hankoAdmin.users.create({
        email: user.email,
        // Don't set password - force passkey setup
      });

      // 2. Update local user record
      await this.userRepo.update(userId, {
        hankoUserId: hankoUser.id,
        authProvider: 'hanko',
        migrationStatus: 'pending_passkey'
      });

      // 3. Send migration email
      await this.emailService.sendMigrationEmail(user.email, {
        setupUrl: `${APP_URL}/auth/passkey-setup?token=${hankoUser.id}`
      });

      return { success: true, status: 'pending_passkey' };
    } catch (error) {
      // Log error and mark for retry
      await this.migrationQueue.add({
        userId,
        attempts: 1,
        lastError: error.message
      });

      return { success: false, error: error.message };
    }
  }

  async bulkMigrate(userIds: string[]): Promise<BulkMigrationResult> {
    const results = await Promise.allSettled(
      userIds.map(id => this.migrateUser(id))
    );

    return {
      total: userIds.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  }
}
```

**Consequences:**
- Controlled migration process
- User communication managed
- Retry mechanism for failures

## Decision Framework

### Deployment Model Decision

```typescript
if (requirements.dataResidency === 'strict' ||
    requirements.compliance.includes('HIPAA') ||
    infrastructure.hasKubernetes) {
  // Self-hosted Hanko
  deploymentModel = 'self-hosted';
} else if (requirements.timeToMarket === 'fast' ||
           team.size < 5 ||
           !infrastructure.hasDevOps) {
  // Hanko Cloud
  deploymentModel = 'cloud';
} else {
  // Start with cloud, migrate later if needed
  deploymentModel = 'cloud-with-migration-plan';
}
```

### Integration Depth Decision

```typescript
if (timeline < '3 months' && risk.tolerance === 'low') {
  // Minimal integration
  approach = {
    level: 'gateway-only',
    changes: ['API Gateway middleware', 'Frontend auth component'],
    preserves: ['All backend services', 'Session management', 'Authorization']
  };
} else if (modernization.priority === 'high') {
  // Full integration
  approach = {
    level: 'comprehensive',
    changes: ['Authentication', 'Session management', 'User model'],
    benefits: ['Passkey-first', 'Better UX', 'Enhanced security']
  };
} else {
  // Balanced approach
  approach = {
    level: 'hybrid',
    changes: ['Authentication', 'JWT structure'],
    preserves: ['Session management', 'Complex authorization']
  };
}
```

## Resource Requirements

### Knowledge Prerequisites
- WebAuthn/Passkey concepts
- JWT and JWKS understanding
- Docker/Kubernetes (for self-hosted)
- Frontend framework (React/Vue/Angular)

### Technical Requirements

#### Self-Hosted Deployment
```yaml
resources:
  hanko:
    cpu: 500m-2000m
    memory: 512Mi-2Gi
    storage: 10Gi (for audit logs)
    database: PostgreSQL 12+ or MySQL 8+

  infrastructure:
    loadBalancer: Required for HA
    ssl: Required (WebAuthn needs HTTPS)
    dns: Subdomain for auth service
```

#### Cloud Deployment
```yaml
requirements:
  account: Hanko Cloud account
  apiKeys: Admin API key for user management
  customDomain: Optional but recommended
  sso: Available in paid tiers
```

### Time Investment
- **POC Setup:** 1-2 days
- **Basic Integration:** 1-2 weeks
- **Full Production:** 4-6 weeks
- **User Migration:** 2-3 months (phased)

### Skill Development

#### For Backend Team
1. Learn Hanko API and webhooks
2. Understand WebAuthn flow
3. Master JWT translation patterns
4. Practice migration strategies

#### For Frontend Team
1. Learn Hanko Elements customization
2. Understand passkey UX patterns
3. Master session management with Hanko
4. Practice progressive enhancement

## Step-by-Step Implementation

### Week 1: Environment Setup

```bash
# 1. Deploy Hanko (Docker example)
docker run -d \
  --name hanko \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql://user:pass@db/hanko" \
  -e HANKO_API_URL="https://auth.pliers.io" \
  -e SECRETS_KEYS="generated-secret-key" \
  ghcr.io/teamhanko/hanko:latest

# 2. Configure API Gateway
kubectl apply -f gateway-config.yaml

# 3. Set up monitoring
docker run -d \
  --name hanko-metrics \
  -p 9090:9090 \
  prom/prometheus
```

### Week 2: Frontend Integration

```tsx
// 1. Install packages
npm install @teamhanko/hanko-elements @teamhanko/hanko-frontend-sdk

// 2. Create auth page
// pages/auth/login.tsx
import { HankoAuth } from '@/components/hanko/HankoAuth';

export default function LoginPage() {
  return (
    <div className="auth-container">
      <h1>Sign in to Pliers</h1>
      <HankoAuth
        onSuccess={handleAuthSuccess}
        onError={handleAuthError}
      />
      <Link href="/auth/legacy">Use password instead</Link>
    </div>
  );
}

// 3. Update API client
// lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
});

api.interceptors.request.use(async (config) => {
  const hanko = new Hanko(process.env.NEXT_PUBLIC_HANKO_API);
  const session = await hanko.session.get();

  if (session?.jwt) {
    config.headers.Authorization = `Bearer ${session.jwt}`;
  }

  return config;
});
```

### Week 3: Backend Integration

```typescript
// 1. Update user model
// models/user.model.ts
@Entity()
export class User {
  @Column({ nullable: true })
  hankoUserId?: string;

  @Column({ default: 'legacy' })
  authProvider: 'legacy' | 'hanko';

  @Column({ nullable: true })
  passkeyRegisteredAt?: Date;
}

// 2. Create sync endpoint
// controllers/auth.controller.ts
@Post('/auth/sync')
async syncHankoUser(@Headers('x-auth-token') token: string) {
  const hankoUser = await this.hankoService.verifyToken(token);
  const user = await this.userService.findOrCreateFromHanko(hankoUser);

  return {
    user,
    token: this.jwtService.generatePliersToken(user)
  };
}

// 3. Set up webhooks
// controllers/webhook.controller.ts
@Post('/webhooks/hanko')
async handleHankoWebhook(@Body() payload: any, @Headers() headers: any) {
  const signature = headers['x-hanko-signature'];

  if (!this.hankoService.verifyWebhook(payload, signature)) {
    throw new UnauthorizedException();
  }

  await this.eventBus.publish('hanko.event', payload);
}
```

### Week 4: Testing & Monitoring

```typescript
// 1. Integration tests
describe('Hanko Integration', () => {
  it('should authenticate with passkey', async () => {
    const response = await request(app)
      .post('/api/v1/auth/hanko')
      .set('X-Hanko-Token', mockHankoToken)
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user.authProvider).toBe('hanko');
  });

  it('should fall back to legacy auth', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'password' })
      .expect(200);

    expect(response.body.user.authProvider).toBe('legacy');
  });
});

// 2. Monitoring setup
// monitoring/hanko-metrics.ts
export class HankoMetrics {
  private prometheus = new PrometheusClient();

  recordAuthentication(method: 'passkey' | 'password', success: boolean) {
    this.prometheus.counter('auth_attempts', {
      method,
      success: success.toString(),
      provider: 'hanko'
    }).inc();
  }

  recordMigration(userId: string, status: 'success' | 'failure') {
    this.prometheus.counter('user_migrations', {
      status
    }).inc();
  }
}
```

## Rollback Strategy

### Emergency Rollback Plan

```typescript
// 1. Feature flag to disable Hanko
if (process.env.DISABLE_HANKO === 'true') {
  app.use('/api/v1/auth/*', legacyAuthRouter);
} else {
  app.use('/api/v1/auth/*', hankoAuthRouter);
}

// 2. Database rollback script
-- Revert user table changes
UPDATE users
SET auth_provider = 'legacy'
WHERE auth_provider = 'hanko'
  AND created_at > '2025-01-01';

-- Keep hanko_user_id for future re-migration

// 3. Frontend fallback
const AuthComponent = () => {
  if (featureFlags.hankoEnabled) {
    return <HankoAuth />;
  }
  return <LegacyAuth />;
};
```

## Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Authentication Speed | < 100ms | P95 latency |
| Passkey Adoption | > 60% in 6 months | User percentage |
| Auth Success Rate | > 99% | Daily average |
| Support Tickets | < 5% increase | Monthly comparison |
| User Satisfaction | > 4.5/5 | Survey score |

### Monitoring Dashboard

```typescript
// dashboards/hanko-dashboard.ts
export const hankoDashboard = {
  widgets: [
    {
      type: 'gauge',
      title: 'Passkey Adoption',
      query: 'users_with_passkeys / total_users * 100'
    },
    {
      type: 'line',
      title: 'Auth Methods Over Time',
      query: 'auth_attempts by method'
    },
    {
      type: 'counter',
      title: 'Failed Authentications',
      query: 'auth_attempts{success="false"}'
    },
    {
      type: 'heatmap',
      title: 'Auth Latency Distribution',
      query: 'auth_latency_histogram'
    }
  ]
};
```