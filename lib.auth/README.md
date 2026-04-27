# @adopt-dont-shop/lib.auth

Authentication and authorization for the Adopt Don't Shop monorepo. Wraps `lib.api` with user-facing auth flows (login, registration, sessions, two-factor), a React `AuthProvider` + `useAuth` hook, and drop-in login/register components.

## Installation

Workspace package — add to a consumer's `package.json` and `npm install` at the repo root:

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
- `AuthLayout`, `LoginForm`, `RegisterForm`, `TwoFactorSettings` — UI components (plus `*Props` types)

**Types**

- `User`, `LoginRequest`, `RegisterRequest`, `AuthResponse`, `ChangePasswordRequest`, `RefreshTokenRequest`, `RefreshTokenResponse`
- `TwoFactorSetupResponse`, `TwoFactorEnableResponse`, `TwoFactorDisableResponse`, `TwoFactorBackupCodesResponse`
- `Rescue`, `RescueRole`, `Permission`, `rolePermissions`
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
- `register(userData: RegisterRequest): Promise<AuthResponse>`
- `logout(): Promise<void>`
- `refreshToken(): Promise<string>`
- `getCurrentUser(): User | null`
- `isAuthenticated(): boolean`

Profile:

- `getProfile(): Promise<User>`
- `updateProfile(partial: Partial<User>): Promise<User>`
- `deleteAccount(reason?: string): Promise<void>`

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

- `getToken(): string | null`
- `getRefreshToken(): string | null`
- `setToken(token: string): void`
- `clearTokens(): void`

## useAuth hook

`useAuth()` returns the full `AuthContextType`. Throws if called outside `AuthProvider`. See `src/contexts/AuthContext.tsx` for the exact shape.

## Project structure

```
lib.auth/
├── src/
│   ├── components/          AuthLayout, LoginForm, RegisterForm, TwoFactorSettings
│   ├── contexts/            AuthContext + AuthProvider
│   ├── hooks/               useAuth
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
npx turbo build --filter=@adopt-dont-shop/lib.auth
npx turbo test  --filter=@adopt-dont-shop/lib.auth
npx turbo lint  --filter=@adopt-dont-shop/lib.auth
```

## Related

- [`@adopt-dont-shop/lib.api`](../lib.api/README.md) — HTTP transport this library builds on
- [`@adopt-dont-shop/lib.permissions`](../lib.permissions/README.md) — role-based access control
