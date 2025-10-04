# WEB-007: Authentication Interface and User Experience

## Metadata
- **Status:** planned
- **Type:** feature
- **Epic:** web-auth
- **Priority:** high
- **Size:** large
- **Created:** 2025-09-26
- **Branch:** [not yet created]

## Description
Create comprehensive authentication user interfaces supporting multiple authentication methods (passkeys, magic links, passwords) with intelligent method recommendation, device capability detection, and seamless user onboarding flows.

## Acceptance Criteria
- [ ] Build login/register form interfaces for all auth methods
- [ ] Implement device capability detection for optimal auth recommendations
- [ ] Create authentication method selection interface
- [ ] Add passkey registration and authentication flows
- [ ] Implement magic link request and verification interfaces
- [ ] Build password authentication with strength indicators
- [ ] Create user onboarding flows for each authentication method
- [ ] Add account management and security settings interface
- [ ] Implement multi-factor authentication UI flows
- [ ] Support authentication method switching and fallbacks
- [ ] Add accessibility support for all authentication flows
- [ ] Create responsive design for mobile and desktop experiences

## Technical Notes
- Integrate with existing authentication API endpoints (AUTH-001, AUTH-004, AUTH-005)
- Use WebAuthn API for passkey functionality
- Implement proper error handling and user guidance
- Follow accessibility guidelines for authentication forms
- Support progressive enhancement for unsupported browsers

## Dependencies
- WEB-002: Design System and Component Library
- WEB-003: API Client Integration and State Management
- AUTH-001: Authentication Infrastructure Foundation
- AUTH-004: Passkey (WebAuthn) Authentication Implementation
- AUTH-005: Hybrid Authentication User Experience

## Authentication Flow Architecture
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  availableMethods: AuthMethod[];
  recommendedMethod: AuthMethod | null;
  deviceCapabilities: DeviceCapabilities;
}

interface DeviceCapabilities {
  supportsWebAuthn: boolean;
  supportsBiometrics: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  isSharedDevice: boolean;
  browserSupport: {
    webauthn: boolean;
    notifications: boolean;
    localStorage: boolean;
  };
}

type AuthMethod = 'passkey' | 'magic-link' | 'password' | 'mfa';
```

## Authentication Context Provider
```typescript
const AuthContext = createContext<{
  state: AuthState;
  login: (method: AuthMethod, data: any) => Promise<void>;
  logout: () => Promise<void>;
  register: (method: AuthMethod, data: any) => Promise<void>;
  switchMethod: (method: AuthMethod) => void;
  refreshToken: () => Promise<void>;
} | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
    availableMethods: [],
    recommendedMethod: null,
    deviceCapabilities: detectDeviceCapabilities()
  });

  useEffect(() => {
    // Initialize auth state
    initializeAuth();
  }, []);

  const login = async (method: AuthMethod, data: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.login(method, data);
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: response.user,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    }
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, register, switchMethod, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Device Capability Detection
```typescript
const detectDeviceCapabilities = (): DeviceCapabilities => {
  const isWebAuthnSupported = !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create
  );

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  const isDesktop = !isMobile;

  // Detect if device likely supports biometrics
  const supportsBiometrics = isWebAuthnSupported && (
    isMobile || // Mobile devices typically have biometrics
    navigator.userAgent.includes('Windows Hello') || // Windows Hello
    navigator.userAgent.includes('TouchID') || // macOS Touch ID
    navigator.userAgent.includes('FaceID') // macOS Face ID
  );

  return {
    supportsWebAuthn: isWebAuthnSupported,
    supportsBiometrics,
    isDesktop,
    isMobile,
    isSharedDevice: detectSharedDevice(),
    browserSupport: {
      webauthn: isWebAuthnSupported,
      notifications: 'Notification' in window,
      localStorage: 'localStorage' in window
    }
  };
};

const detectSharedDevice = (): boolean => {
  // Heuristics for shared/public device detection
  return (
    !window.localStorage || // No localStorage (incognito/private browsing)
    navigator.cookieEnabled === false || // Cookies disabled
    window.location.hostname.includes('kiosk') || // Kiosk mode
    window.location.hostname.includes('public') // Public terminals
  );
};
```

## Authentication Method Selector
```typescript
const AuthMethodSelector = ({
  availableMethods,
  recommendedMethod,
  onMethodSelect
}: {
  availableMethods: AuthMethod[];
  recommendedMethod: AuthMethod | null;
  onMethodSelect: (method: AuthMethod) => void;
}) => {
  return (
    <div className="auth-method-selector">
      <div className="method-grid">
        {availableMethods.map(method => (
          <AuthMethodCard
            key={method}
            method={method}
            isRecommended={method === recommendedMethod}
            onClick={() => onMethodSelect(method)}
          />
        ))}
      </div>

      {recommendedMethod && (
        <div className="recommendation">
          <Info size={16} />
          <span>
            We recommend {getMethodDisplayName(recommendedMethod)} for your device
          </span>
        </div>
      )}
    </div>
  );
};

const AuthMethodCard = ({
  method,
  isRecommended,
  onClick
}: {
  method: AuthMethod;
  isRecommended: boolean;
  onClick: () => void;
}) => {
  const methodInfo = getMethodInfo(method);

  return (
    <Card
      className={`auth-method-card ${isRecommended ? 'recommended' : ''}`}
      onClick={onClick}
    >
      {isRecommended && (
        <Badge className="recommended-badge">Recommended</Badge>
      )}

      <CardContent className="method-content">
        <methodInfo.icon size={32} className="method-icon" />
        <h3 className="method-title">{methodInfo.title}</h3>
        <p className="method-description">{methodInfo.description}</p>

        <div className="method-features">
          {methodInfo.features.map(feature => (
            <div key={feature} className="feature-item">
              <Check size={14} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

## Passkey Authentication Flow
```typescript
const PasskeyAuthFlow = ({
  mode,
  onSuccess,
  onError,
  onFallback
}: {
  mode: 'login' | 'register';
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
  onFallback: () => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'prompt' | 'waiting' | 'success' | 'error'>('prompt');

  const handlePasskeyAuth = async () => {
    setIsProcessing(true);
    setStep('waiting');

    try {
      if (mode === 'register') {
        const result = await registerPasskey();
        onSuccess(result);
        setStep('success');
      } else {
        const result = await authenticateWithPasskey();
        onSuccess(result);
        setStep('success');
      }
    } catch (error) {
      console.error('Passkey error:', error);
      onError(error.message);
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="passkey-auth-flow">
      {step === 'prompt' && (
        <div className="passkey-prompt">
          <div className="passkey-icon">
            <Fingerprint size={48} />
          </div>

          <h2>
            {mode === 'register' ? 'Set Up Passkey' : 'Sign In with Passkey'}
          </h2>

          <p className="passkey-description">
            {mode === 'register'
              ? 'Create a passkey using your fingerprint, face, or device PIN for secure, passwordless access.'
              : 'Use your fingerprint, face, or device PIN to sign in securely.'
            }
          </p>

          <div className="passkey-benefits">
            <div className="benefit-item">
              <Shield size={16} />
              <span>More secure than passwords</span>
            </div>
            <div className="benefit-item">
              <Zap size={16} />
              <span>Faster sign-in</span>
            </div>
            <div className="benefit-item">
              <Lock size={16} />
              <span>Phishing resistant</span>
            </div>
          </div>

          <Button
            onClick={handlePasskeyAuth}
            disabled={isProcessing}
            className="passkey-button"
          >
            {mode === 'register' ? 'Create Passkey' : 'Sign In'}
          </Button>

          <Button
            variant="outline"
            onClick={onFallback}
            className="fallback-button"
          >
            Use different method
          </Button>
        </div>
      )}

      {step === 'waiting' && (
        <div className="passkey-waiting">
          <div className="waiting-animation">
            <Fingerprint size={48} className="pulse" />
          </div>

          <h3>Waiting for authentication...</h3>
          <p>Follow the prompts on your device to complete authentication.</p>

          <Button variant="outline" onClick={() => setStep('prompt')}>
            Cancel
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="passkey-error">
          <AlertCircle size={48} className="error-icon" />
          <h3>Authentication failed</h3>
          <p>Please try again or use a different sign-in method.</p>

          <div className="error-actions">
            <Button onClick={() => setStep('prompt')}>
              Try Again
            </Button>
            <Button variant="outline" onClick={onFallback}>
              Use Different Method
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
```

## Magic Link Authentication Flow
```typescript
const MagicLinkAuthFlow = ({
  mode,
  onSuccess,
  onError
}: {
  mode: 'login' | 'register';
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'sent' | 'verifying'>('email');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendMagicLink(email, mode);
      setStep('sent');
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for magic link verification
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token && step === 'sent') {
      setStep('verifying');
      verifyMagicLink(token)
        .then(onSuccess)
        .catch(onError);
    }
  }, [step]);

  return (
    <div className="magic-link-flow">
      {step === 'email' && (
        <form onSubmit={handleSendMagicLink} className="magic-link-form">
          <div className="magic-link-icon">
            <Mail size={48} />
          </div>

          <h2>
            {mode === 'register' ? 'Create Account' : 'Sign In'} with Email
          </h2>

          <p className="magic-link-description">
            We'll send you a secure link to {mode === 'register' ? 'create your account' : 'sign in'}.
            No password required.
          </p>

          <FormField>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormField>

          <Button
            type="submit"
            disabled={!email || isLoading}
            className="magic-link-button"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              `Send ${mode === 'register' ? 'Sign Up' : 'Sign In'} Link`
            )}
          </Button>
        </form>
      )}

      {step === 'sent' && (
        <div className="magic-link-sent">
          <div className="sent-icon">
            <CheckCircle size={48} />
          </div>

          <h3>Check your email</h3>
          <p>
            We've sent a secure link to <strong>{email}</strong>.
            Click the link in your email to {mode === 'register' ? 'create your account' : 'sign in'}.
          </p>

          <div className="email-tips">
            <div className="tip-item">
              <Clock size={16} />
              <span>Link expires in 15 minutes</span>
            </div>
            <div className="tip-item">
              <Smartphone size={16} />
              <span>Works on any device</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setStep('email')}
            className="resend-button"
          >
            Didn't receive it? Send again
          </Button>
        </div>
      )}

      {step === 'verifying' && (
        <div className="magic-link-verifying">
          <div className="verifying-animation">
            <Loader2 size={48} className="animate-spin" />
          </div>

          <h3>Verifying your link...</h3>
          <p>Please wait while we verify your magic link.</p>
        </div>
      )}
    </div>
  );
};
```

## Password Authentication with Strength Indicator
```typescript
const PasswordAuthFlow = ({
  mode,
  onSuccess,
  onError
}: {
  mode: 'login' | 'register';
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode === 'register') {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (passwordStrength < 3) {
          throw new Error('Please use a stronger password');
        }
      }

      const result = await authenticateWithPassword(formData.email, formData.password, mode);
      onSuccess(result);
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="password-auth-form">
      <div className="password-icon">
        <Key size={48} />
      </div>

      <h2>{mode === 'register' ? 'Create Account' : 'Sign In'}</h2>

      <FormField>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </FormField>

      <FormField>
        <Label htmlFor="password">Password</Label>
        <div className="password-input-container">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Password"
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>

        {mode === 'register' && formData.password && (
          <PasswordStrengthIndicator strength={passwordStrength} />
        )}
      </FormField>

      {mode === 'register' && (
        <FormField>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm Password"
            required
            autoComplete="new-password"
          />
        </FormField>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="password-submit-button"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {mode === 'register' ? 'Creating Account...' : 'Signing In...'}
          </>
        ) : (
          mode === 'register' ? 'Create Account' : 'Sign In'
        )}
      </Button>
    </form>
  );
};

const PasswordStrengthIndicator = ({ strength }: { strength: number }) => {
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['red', 'orange', 'yellow', 'blue', 'green'];

  return (
    <div className="password-strength">
      <div className="strength-bar">
        {[1, 2, 3, 4, 5].map(level => (
          <div
            key={level}
            className={`strength-segment ${
              level <= strength ? strengthColors[strength - 1] : 'gray'
            }`}
          />
        ))}
      </div>
      <span className="strength-label">
        {strength > 0 ? strengthLabels[strength - 1] : ''}
      </span>
    </div>
  );
};
```

## Account Management Interface
```typescript
const AccountManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="account-management">
      <div className="account-header">
        <Avatar size="lg" src={user?.avatar} />
        <div className="user-info">
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings user={user} />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesSettings />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SecuritySettings = () => {
  const { data: authMethods } = useQuery({
    queryKey: ['user-auth-methods'],
    queryFn: () => apiClient.auth.getUserAuthMethods()
  });

  return (
    <div className="security-settings">
      <div className="auth-methods-section">
        <h3>Authentication Methods</h3>

        {authMethods?.map(method => (
          <AuthMethodCard
            key={method.id}
            method={method}
            onRemove={() => removeAuthMethod(method.id)}
            onSetPrimary={() => setPrimaryAuthMethod(method.id)}
          />
        ))}

        <Button onClick={() => openAddAuthMethodDialog()}>
          Add Authentication Method
        </Button>
      </div>

      <div className="mfa-section">
        <h3>Two-Factor Authentication</h3>
        <MFASettings />
      </div>

      <div className="device-management">
        <h3>Trusted Devices</h3>
        <TrustedDevices />
      </div>
    </div>
  );
};
```

## Responsive Design and Mobile Support
- Touch-friendly interface for mobile devices
- Biometric integration (Face ID, Touch ID, fingerprint)
- Progressive web app features
- Offline capability for cached authentication
- App switching support for email verification

## Accessibility Features
- Screen reader compatible authentication flows
- Keyboard navigation support
- High contrast mode for visual elements
- Clear focus indicators
- Alternative text for icons and images
- Voice control compatibility

## Testing Strategy
- Unit tests for authentication components
- Integration tests for auth flows
- Accessibility testing with screen readers
- Cross-browser compatibility testing
- Security testing for authentication flows
- User experience testing with real devices

## References
- WebAuthn specification: https://w3c.github.io/webauthn/
- Authentication UX best practices
- Accessibility guidelines for forms
- Mobile authentication patterns
- Progressive enhancement strategies

## Branch Naming
`feat/WEB-007-authentication-interface-ux`