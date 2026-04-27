# @adopt-dont-shop/lib.auth

Authentication and authorization for the monorepo (`AuthService`, `AuthProvider`, `useAuth`, plus drop-in `LoginForm` / `RegisterForm` / `TwoFactorSettings` components).

The canonical, code-verified reference lives next to the source:

> **[lib.auth/README.md](../../lib.auth/README.md)**

It covers exports, `AuthService` methods, the `useAuth` hook contract, project structure, and per-package scripts.

## See also

- [`@adopt-dont-shop/lib.api`](../../lib.api/README.md) — HTTP transport this library wraps
- [`@adopt-dont-shop/lib.permissions`](../../lib.permissions/README.md) — RBAC primitives used after sign-in
- [Backend auth notes](../backend/service-backend-prd.md) — server-side flow
