# service.auth

## Purpose

Owns identity and access control: account lifecycle (register, verify, password
reset/change, account update), JWT auth with refresh-token rotation +
revocation, roles + permissions, sessions (per-device refresh chains), privacy
preferences, field-permission overrides, and admin user management. Maintains
the denormalised Principal (user + roles + permissions + optional rescue) that
the gateway validates on every request. Owns the `auth.*` schema — it is the
identity layer every other service and the gateway depend on.

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. This service makes **no**
outbound cross-service gRPC calls — it sits at the root of the dependency graph
(everyone calls it). The gateway's authenticate middleware calls
`AuthService.ValidateToken` on every request. Depends on the shared backend
packages `@adopt-dont-shop/{authz, config-secrets, db, events, lib.types,
observability, proto, service-bootstrap}`.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm db:seed      # seed reference/dev data
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `AuthService`
(`packages/proto`), proxied by the gateway under `/api/v1/auth/*`,
`/api/v1/sessions/*`, and `/api/v1/field-permissions/*`. `super_admin` bypasses
permission checks.

**Public (no principal):** `Login`, `RefreshToken`, `ValidateToken`,
`Register`, `VerifyEmail`, `ResendVerification`, `ForgotPassword`,
`ResetPassword`.

**Authenticated (self):** `Logout`, `GetMe`, `ChangePassword`, `UpdateAccount`,
`ListSessions`, `RevokeSession`, `GetPrivacyPreferences` /
`UpdatePrivacyPreferences` / `ResetPrivacyPreferences`.

**Admin-gated:**

| RPC | Permission |
| --- | --- |
| `AssignRole` | `admin.security.manage` |
| `SearchUsers` | `admin.users.search` |
| `AdminGetUser` / `GetUserStatistics` / `GetUserPermissions` | `admin.users.read` |
| `AdminUpdateUser` | `admin.users.update` |
| `DeactivateUser` | `admin.users.deactivate` |
| `ReactivateUser` | `admin.users.reactivate` |
| `BulkUpdateUsers` | `admin.users.bulk_update` |
| `ListUserIdsByCohort` | `admin.users.broadcast` |
| `GetFieldPermissionDefaults*` / `ListFieldPermissionOverrides*` | `admin.field_permissions.read` |
| `UpsertFieldPermission` / `BulkUpsertFieldPermissions` | `admin.field_permissions.write` |

Schema (`auth`): `users`, `roles` / `permissions`, `role_permissions` /
`user_roles`, `refresh_tokens`, `revoked_tokens`, `user_privacy_prefs`,
`field_permissions`, `ip_rules`, `user_invitations`. Migrations:
`src/migrations/001`–`028`.

**NATS** — emits (publish-after-commit): `auth.userLoggedIn`,
`auth.tokenRevoked`, `auth.tokenRefreshed`, `auth.roleAssigned`,
`auth.userRegistered`, `auth.emailVerified`, `auth.passwordResetRequested`,
`auth.actionTaken` (feeds the audit stream), and the admin/session/IP-rule
subjects; participates in the `gdpr.erasureCompleted` saga. Consumes
`gdpr.erasureRequested` (durable `gdpr-auth`).

## Environment variables consumed

`DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are **required** — boot
fails fast without them (a leaked access secret must not compromise refresh, so
the two JWT secrets are distinct by design). `AUTH_PORT` (5002), `AUTH_GRPC_PORT`
(6002), `AUTH_HOST`, `AUTH_SCHEMA` (`auth`), and `NATS_URL` have dev defaults,
plus the standard `@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. Pure handlers `(deps, principal, request) → response` with bcrypt/JWT
adapters injected (so tests don't pay real crypto cost) — assert every
INVALID_ARGUMENT / UNAUTHENTICATED / PERMISSION_DENIED / NOT_FOUND path, token
rotation + denylist + idempotency, enumeration-safe register/forgot flows,
`super_admin` bypass, and publish-after-commit ordering. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.

---

## Migration history

Auth was the Phase 2 extraction (CAD Phase 4 equivalent — Lucia + JWT + bcrypt +
CASL ability serialisation restated for adopt-dont-shop's domain), landed
incrementally:

- **Phase 2.1** — boot skeleton: Fastify `/health/simple` on `AUTH_PORT`,
  OpenTelemetry via `@adopt-dont-shop/observability`, `config.ts` hard-requiring
  `DATABASE_URL` / `JWT_SECRET` / `JWT_REFRESH_SECRET`.
- **Phase 2.2** — `auth.*` schema + migrations (`001`–`007` ported the
  monolith's users/roles/permissions/tokens tables verbatim; intra-schema FKs
  preserved).
- **Phase 2.3a–c** — proto + grpc-js stubs, pure handlers for all RPCs
  (`(deps, principal, request) → response` with injected `passwordHasher` /
  `tokenIssuer`), then the gRPC server boot + adapter (`adapt` / `adaptUnauth`,
  bcrypt hasher, JWT issuer — access 15m / refresh 30d on separate secrets).
- **Phase 2.4** — downstream NATS flow: `services/notifications` subscribes to
  `auth.userLoggedIn` (ACCOUNT_SECURITY) and `auth.roleAssigned`
  (STAFF_ASSIGNMENT).
- **Phase 2.5** — the gateway authenticate middleware (lives in
  `services/gateway`): strips spoofable `x-user-*` headers and calls
  `ValidateToken`, re-stamping the validated principal.
- **Phase 2.6** — gateway `/api/auth/*` cutover to gRPC; the monolith's
  endpoints became dead code (removed in Phase 11).
