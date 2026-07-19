# @adopt-dont-shop/lib.auth

Authentication and authorization for the Adopt Don't Shop monorepo. Wraps `lib.api` with user-facing auth flows (login, registration, sessions, two-factor), a React `AuthProvider` + `useAuth` hook, and drop-in login/register components.

## Installation

Workspace package — add to a consumer's `package.json` and `pnpm install` at the repo root:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.auth": "*"
  }
}
```

## Exports

From `@adopt-dont-shop/lib.auth`:

**Services**

- `AuthService` — the class
- `authService` — default singleton

**React integration**

- `AuthProvider`, `AuthContext` — provider + raw context
- `useAuth()` — hook that throws if used outside `AuthProvider`
- `PermissionsProvider`, `PermissionsContext`, `usePermissions()` — permission set for the current user
- `useHasPermission()`, `useHasAnyPermission()`, `useHasAllPermissions()` — permission-check hooks
- `PermissionGate` — declarative component gate (plus `PermissionGateProps`)
- `AuthLayout`, `LoginForm`, `RegisterForm`, `SocialSignInButtons`, `TwoFactorSettings` — UI components (plus `*Props` types)

**Types**

- `User`, `LoginRequest`, `RegisterRequest`, `AuthResponse`, `ChangePasswordRequest`, `RefreshTokenRequest`, `RefreshTokenResponse`
- `TwoFactorSetupResponse`, `TwoFactorEnableResponse`, `TwoFactorDisableResponse`, `TwoFactorBackupCodesResponse`
- `RescueRole`, `Permission`, `rolePermissions`
- And everything re-exported from `./types`

## Quick Start

### React app

```tsx
import { AuthProvider, useAuth, LoginForm } from '@adopt-dont-shop/lib.auth';

export function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginForm />;
  return (
    <div>
      <p>Hello, {user?.firstName}</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
```

### Direct service use

```typescript
import { authService } from '@adopt-dont-shop/lib.auth';

await authService.login({ email: 'user@example.com', password: '…' });
const user = authService.getCurrentUser();
if (authService.isAuthenticated()) { /* … */ }
await authService.logout();
```

## AuthService methods

Session:

- `login(credentials: LoginRequest): Promise<AuthResponse>`
- `register(userData: RegisterRequest): Promise<{ user: User; message: string }>` — registration requires email verification before login, so this returns just the user record and a server-supplied message; route the user to a "check your email" screen rather than treating the response as a successful session.
- `logout(): Promise<void>`
- `refreshToken(): Promise<string>`
- `getCurrentUser(): User | null`
- `isAuthenticated(): boolean`

Profile:

- `getProfile(): Promise<User>`
- `updateProfile(partial: Partial<User>): Promise<User>`
- `deleteAccount(password: string, options?: { twoFactorToken?: string; reason?: string }): Promise<void>` — backend requires step-up auth (ADS-592)

Password / email:

- `forgotPassword(email: string): Promise<void>`
- `resetPassword(token: string, newPassword: string): Promise<void>`
- `changePassword(data: ChangePasswordRequest): Promise<void>`
- `verifyEmail(token: string): Promise<void>`
- `resendVerificationEmail(): Promise<void>`

Two-factor:

- `twoFactorSetup(): Promise<TwoFactorSetupResponse>`
- `twoFactorEnable(secret: string, token: string): Promise<TwoFactorEnableResponse>`
- `twoFactorDisable(token: string): Promise<TwoFactorDisableResponse>`
- `twoFactorRegenerateBackupCodes(): Promise<TwoFactorBackupCodesResponse>`

Token storage (local):

- `getToken(): string | null` — returns the stored access token from `localStorage`. `lib.api` calls this via its `getAuthToken` hook to attach `Authorization: Bearer <token>` to HTTP requests; the Socket.IO clients read it the same way.
- `setToken(token: string | null | undefined): void` — writes (or clears) the access token in `localStorage`.
- `clearTokens(): void` — removes both the access token and refresh token from `localStorage`. Called on logout after the gateway revokes the refresh token, and when a session is found to be invalid.

## useAuth hook

`useAuth()` returns the full `AuthContextType`. Throws if called outside `AuthProvider`. See `src/contexts/AuthContext.tsx` for the exact shape.

## Project structure

```
lib.auth/
├── src/
│   ├── components/          AuthLayout, LoginForm, RegisterForm, SocialSignInButtons, TwoFactorSettings, PermissionGate
│   ├── contexts/            AuthContext + AuthProvider, PermissionsContext + PermissionsProvider
│   ├── hooks/               useAuth, useHasPermission (+ useHasAnyPermission, useHasAllPermissions)
│   ├── services/            AuthService + singleton
│   ├── types/               shared types
│   └── index.ts             public entrypoint
├── package.json
├── tsconfig.json
└── README.md                this file
```

## Development

From the repo root:

```bash
pnpm exec turbo build --filter=@adopt-dont-shop/lib.auth
pnpm exec turbo test  --filter=@adopt-dont-shop/lib.auth
pnpm exec turbo lint  --filter=@adopt-dont-shop/lib.auth
```

## Related

- [`@adopt-dont-shop/lib.api`](../lib.api/README.md) — HTTP transport this library builds on
- [`@adopt-dont-shop/lib.permissions`](../lib.permissions/README.md) — role-based access control

<!-- CONSUMERS:START (auto-generated by scripts/generate-dependency-docs.mjs — do not edit by hand) -->
## Consumers

4 workspace package(s) depend on this library. See [lib.auth-consumers.md](../../docs/libraries/lib.auth-consumers.md) for the auto-generated list — check it before making a breaking change.
<!-- CONSUMERS:END -->
