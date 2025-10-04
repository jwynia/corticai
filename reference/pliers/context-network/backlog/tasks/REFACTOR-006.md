# REFACTOR-006: Clean Up ESLint Inline Disables in Auth Provider

## Metadata
- **Status:** ready
- **Type:** code-quality
- **Epic:** web-auth
- **Priority:** low
- **Size:** small
- **Estimated Effort:** 1-2 hours
- **Created:** 2025-10-01
- **Created From:** PR #26 code review feedback
- **Related Tasks:** WEB-007-1

## Description
Remove inline ESLint disable comments in the authentication provider by either configuring ESLint rules appropriately or using TypeScript conventions for unused parameters. The current implementation uses inline disables for interface method signatures which is a code smell.

## Problem Statement
From PR #26 code review:
> **ESLint Disable Comments** - Consider configuring ESLint rules instead of inline disables, or use TypeScript parameter names for documentation like `_email: string`

Current implementation in `auth-provider.tsx`:
```typescript
export interface AuthContextValue extends AuthState {
  // eslint-disable-next-line no-unused-vars
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // eslint-disable-next-line no-unused-vars
  register: (email: string, password: string, name: string) => Promise<void>;
}
```

## Acceptance Criteria
- [ ] Remove all inline `eslint-disable-next-line` comments from auth-provider.tsx
- [ ] Configure ESLint to allow unused parameters in interface signatures
- [ ] Ensure build and lint pass without warnings
- [ ] Document ESLint configuration changes

## Technical Approach

### Option A: Configure ESLint Rule (Recommended)
Update `.eslintrc.json` or `eslint.config.js`:
```json
{
  "rules": {
    "no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }]
  }
}
```

### Option B: Use TypeScript Convention
Prefix unused parameters with underscore:
```typescript
export interface AuthContextValue extends AuthState {
  login: (_email: string, _password: string) => Promise<void>;
  logout: () => void;
  register: (_email: string, _password: string, _name: string) => Promise<void>;
}
```

### Option C: Use @typescript-eslint Rule
For TypeScript projects:
```json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }]
  }
}
```

## Implementation Steps
1. Identify all inline ESLint disables in auth-provider.tsx
2. Choose appropriate ESLint configuration approach
3. Update ESLint configuration files
4. Remove inline disable comments
5. Run linter to verify no new warnings
6. Run tests to ensure functionality unchanged

## Files to Modify
- `apps/web/src/providers/auth-provider.tsx` - Remove inline disables
- `apps/web/.eslintrc.json` or `eslint.config.js` - Add rule configuration
- May need to update root ESLint config if using monorepo shared config

## Testing Strategy
- Run `npm run lint` and verify zero errors
- Run `npm run build` and verify success
- Run test suite to ensure no regressions
- Check that TypeScript types still work correctly

## Dependencies
- WEB-007-1: Auth provider implementation

## Related Issues
- Addresses code review feedback from PR #26
- May help resolve existing ESLint config issues in @pliers/shared

## Success Metrics
- Zero inline ESLint disable comments in auth-provider.tsx
- Lint passes with no warnings
- Configuration is reusable across other components
- Code maintains same functionality

## Notes
- This is a pure refactoring task with no behavior changes
- Good opportunity to standardize ESLint configuration across web app
- Consider applying same pattern to other files with inline disables
