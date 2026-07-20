# service.auth

Auth vertical — Phase 2 of the microservices migration.

Owns the `auth.*` schema and exposes `AuthService` over gRPC. See the
canonical reference at the bottom of this file for the exact table + RPC
lists — the rest of the doc is historical migration context.

CAD Phase 4 equivalent — the auth pattern that brought CAD's gate
online (Lucia + JWT + bcrypt + CASL ability serialisation), restated
for adopt-dont-shop's domain.

## What's shipped so far

**Phase 2.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `AUTH_PORT` (default
  5002), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with `serviceName: 'service.auth'`.
- `src/config.ts` env validation. Hard-requires `DATABASE_URL`,
  `JWT_SECRET`, `JWT_REFRESH_SECRET` so misconfiguration fails fast
  at boot rather than at first login attempt.
- `src/server.ts` `createServer({ config, logger? })`.

**Phase 2.2** — `auth.*` schema + migrations:
- `001_create_users.ts` ports the monolith's `users` table verbatim
  (all columns, the 6-value `user_type` enum with `super_admin` +
  `support_agent` folded in from the `01-*` follow-up, `citext` email,
  PostGIS `location`).
- `002`-`007` mirror `roles`, `permissions`, `role_permissions`,
  `user_roles`, `refresh_tokens`, `revoked_tokens`. Intra-schema FKs
  (role↔permission, user↔role, refresh→user) stay enforced; they're
  WITHIN the `auth` schema so the no-cross-schema-joins rule doesn't
  apply.
- `src/db/migrate.ts` runs them via `@adopt-dont-shop/db.runMigrations`.
- Run with `pnpm db:migrate`.

**Phase 2.3a** — proto + grpc-js stubs:
- `proto/adopt_dont_shop/auth/v1/auth.proto` in `@adopt-dont-shop/proto`
  defines `AuthService.{Login, Logout, RefreshToken, ValidateToken,
  GetMe, AssignRole}` plus the supporting `Principal`, `User`,
  `TokenPair`, and `UserRole` / `UserStatus` enums (values mirror the
  `auth.user_type` / `auth.user_status` Postgres types AND
  `lib.types.UserRole`).
- `@adopt-dont-shop/proto` index re-exports the `AuthV1` value
  namespace (server/client constructors, enums) plus flat type-only
  re-exports for the request/response shapes (`AuthPrincipal`,
  `AuthUser` etc. — prefixed to avoid collision with
  `NotificationsV1` flat exports).

**Phase 2.3b** — handler logic (pure functions, no gRPC transport yet):
- `src/grpc/handlers.ts` implements all six RPCs over
  `(deps, principal, request) → Promise<response>`. Same
  pure-handler-plus-thin-adapter pattern as `service.notifications`.
- **`login`** — bcrypt-compare via `deps.passwordHasher`, lock + status
  checks gate access, JWT mint via `deps.tokenIssuer`, refresh-row
  persisted inside `withTransaction`, `auth.userLoggedIn` published
  after commit. Wrong password bumps `login_attempts`.
- **`logout`** — verify refresh JWT, idempotent denylist insert
  (`auth.revoked_tokens`), refresh-row revoked, `auth.tokenRevoked`
  published after commit. Malformed/expired token returns `OK`
  with `revoked:false` (idempotent).
- **`refreshToken`** — verify, denylist + stored-revoke check, rotate
  (old row revoked + jti denylisted, new row inserted),
  `auth.tokenRefreshed` published after commit.
- **`validateToken`** — hot path. JWT verify, denylist point-read,
  then hydrate the principal (roles + permissions). UNAUTHENTICATED
  on any failure. No user-row fetch unless JWT signature already
  validated.
- **`getMe`** — denormalised user row + aggregated roles +
  flattened permissions.
- **`assignRole`** — admin-gated (`admin.security.manage` via
  `requirePermission`; `super_admin` short-circuits), idempotent
  `INSERT … ON CONFLICT (user_id, role_id) DO UPDATE`,
  `auth.roleAssigned` published after commit.
- `passwordHasher` + `tokenIssuer` are injected on `HandlerDeps` so
  the handler tests stay pure and fast (no real bcrypt rounds, no
  real JWT signature work). Phase 2.3c wires the production
  implementations.
- 39 handler + enum-map tests assert: every INVALID_ARGUMENT /
  UNAUTHENTICATED / PERMISSION_DENIED / NOT_FOUND path, the
  publish-after-commit call ordering
  (`['BEGIN', '…', 'COMMIT', 'NATS_PUBLISH']`), idempotency on
  already-revoked tokens, and `super_admin` bypass.

**Phase 2.3c** — gRPC server boot + adapter:
- `src/grpc/adapter.ts` — `adapt` (principal-required) and
  `adaptUnauth` (principal-optional, for Login/RefreshToken/
  ValidateToken). Both map `HandlerError.code → grpc.status` and
  scrub unknown errors to `INTERNAL` (logged via `logger.error`).
- `src/grpc/principal.ts` — `extractPrincipal` from the
  `x-user-id` / `x-user-roles` / `x-user-permissions` / `x-rescue-id`
  metadata headers (same shape as services/notifications).
- `src/grpc/password-hasher.ts` — `createBcryptPasswordHasher`
  wrapping the same `bcryptjs` the monolith uses (existing hashes
  validate without a re-hash on first login).
- `src/grpc/token-issuer.ts` — `createJwtTokenIssuer` wrapping
  `jsonwebtoken`. Access tokens 15m, refresh tokens 30d. Separate
  secrets — a leaked access secret doesn't compromise refresh.
- `src/grpc/server.ts` — `createGrpcServer` + `startGrpcServer`.
  Same shape as services/notifications. Binds all six
  AuthService RPCs on `AUTH_GRPC_PORT` (default 6002).
- `src/index.ts` wires `pool` + `nats` + hasher + issuer into the
  gRPC server and runs it alongside the HTTP /health surface.

**Phase 2.4** — downstream NATS event flow:
- The Phase 2.3b handlers already publish `auth.userLoggedIn`,
  `auth.tokenRevoked`, `auth.tokenRefreshed`, and `auth.roleAssigned`
  via `@adopt-dont-shop/events.withTransaction` (publish-after-commit).
- `services/notifications` now subscribes to two of those subjects:
  - `auth.userLoggedIn` → `ACCOUNT_SECURITY` in-app notification
    ("New sign-in to your account from <ip> (<ua>)")
  - `auth.roleAssigned` → `STAFF_ASSIGNMENT` in-app notification
    ("You have been granted the <role> role")
- Both subscribers go through the existing
  `createNotification(SYSTEM_PRINCIPAL, …)` translation layer so
  the publish-after-commit + idempotency disciplines stay intact.

**Phase 2.5** — Gateway authenticate middleware (lands in
`services/gateway`, not here):
- An `onRequest` hook strips spoofable `x-user-id` / `x-user-roles` /
  `x-user-permissions` / `x-rescue-id` headers on EVERY request, then
  calls `service.auth.ValidateToken` for any inbound
  `Authorization: Bearer <token>`. The validated principal is
  stamped back onto those same headers so the downstream services
  (notifications, future pets/applications) keep consuming them
  unchanged. Forged headers can no longer reach the catch-all
  proxy or any extracted service.
- Public paths (`/health`, `/api/auth/{login,register,refresh-token,
  verify-email,forgot-password,reset-password}`) bypass token
  validation; everything else returns 401 on invalid / revoked tokens.

**Phase 2.6** — Gateway `/api/auth/*` cutover (lands in
`services/gateway/src/routes/auth.ts`):
- The gateway now translates `POST /api/auth/login`,
  `POST /api/auth/logout`, `POST /api/auth/refresh-token`,
  `GET /api/auth/me`, and `POST /api/auth/assign-role` into the
  corresponding `AuthService` gRPC calls. Same shape every
  extracted vertical will use — REST surface unchanged for the
  SPA, gRPC under the hood.
- The Phase 2.5 authenticate middleware sits in front of these
  routes — Logout / GetMe / AssignRole receive the validated
  principal via `x-user-*` metadata, Login / RefreshToken don't
  need it.
- The monolith's `/api/auth/*` endpoints become dead code; their
  removal is bundled into Phase 11 (decommission residual
  monolith) so this PR stays small and reversible.

## What's NOT here yet
- **Phase 3+** — pets, rescue, applications, chat, moderation,
  matching, audit verticals.
- **Phase 11** — delete the monolith's now-dead `/api/auth/*`
  surface.

## Configuration

| Env var               | Default            | Required | Purpose                                                       |
| --------------------- | ------------------ | -------- | ------------------------------------------------------------- |
| `AUTH_PORT`           | `5002`             |          | HTTP port for `/health/simple`.                               |
| `AUTH_GRPC_PORT`      | `6002`             |          | gRPC port `AuthService` will bind (Phase 2.3c).               |
| `AUTH_HOST`           | `0.0.0.0`          |          | Bind interface (both HTTP + gRPC).                            |
| `AUTH_SCHEMA`         | `auth`             |          | Postgres schema. Override for parallel test DBs.              |
| `DATABASE_URL`        | —                  | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`            | `nats://nats:4222` |          | NATS bus URL.                                                 |
| `JWT_SECRET`          | —                  | ✅       | Access-token signing secret. Boot fails without it.           |
| `JWT_REFRESH_SECRET`  | —                  | ✅       | Refresh-token signing secret. Distinct from `JWT_SECRET` by design — a leaked access secret doesn't compromise refresh. |
| `NODE_ENV`            | `development`      |          | Surfaces in health + logs.                                    |

Plus the standard observability env vars consumed by
`@adopt-dont-shop/observability`.

## Running

```bash
# Dev — hot reload, OTel SDK loaded via --import
pnpm dev

# Production build
pnpm build
pnpm start
```

---

## Canonical reference (ADS-817)

### Responsibility

Owns identity and access control: account lifecycle (register, verify, password
reset/change, account update), JWT auth with refresh-token rotation +
revocation, roles + permissions, sessions (per-device refresh chains), privacy
preferences, field-permission overrides, and admin user management. Maintains
the denormalised Principal (user + roles + permissions + optional rescue) that
the gateway validates on every request. Schema: `auth`.

### Schema (`auth`)

| Table | Purpose |
| --- | --- |
| `users` | Core user row — email, password hash, status, type, profile, login throttling. |
| `roles` / `permissions` | Reference data. |
| `role_permissions` / `user_roles` | Role↔permission and user↔role junctions. |
| `refresh_tokens` | Per-device refresh tokens (rotation chains). |
| `revoked_tokens` | JTI denylist for access + old refresh tokens. |
| `user_privacy_prefs` | Per-user privacy preferences. |
| `field_permissions` | Overrides to the default field-level access matrix. |
| `ip_rules` | Admin-managed IP allow/deny rules. |
| `user_invitations` | Staff / rescue invitation tokens. |

Migrations: `services/auth/src/migrations/001`–`028`.

### gRPC RPCs

`AuthService`. `super_admin` bypasses permission checks.

**Public (no principal):** `Login`, `RefreshToken`, `ValidateToken`,
`Register`, `VerifyEmail`, `ResendVerification`, `ForgotPassword`,
`ResetPassword`.

**Authenticated (self):** `Logout`, `GetMe`, `ChangePassword`, `UpdateAccount`,
`ListSessions`, `RevokeSession`, `GetPrivacyPreferences` /
`UpdatePrivacyPreferences` / `ResetPrivacyPreferences` (self; `privacy-prefs:*:any`
for others).

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
| `GetFieldPermissionDefaults` / `GetFieldPermissionDefaultsForRole` / `ListFieldPermissionOverrides` / `ListFieldPermissionOverridesForRole` | `admin.field_permissions.read` |
| `UpsertFieldPermission` / `BulkUpsertFieldPermissions` | `admin.field_permissions.write` |
| `DeleteFieldPermission` | (gated at the gateway; reverts a field to the default) |

### NATS subjects

**Emits** (publish-after-commit): `auth.userLoggedIn`, `auth.tokenRevoked`,
`auth.tokenRefreshed`, `auth.roleAssigned`, `auth.userRegistered`,
`auth.emailVerified`, `auth.passwordResetRequested`, `auth.passwordChanged`,
`auth.sessionRevoked`, `auth.privacyPrefsReset`, `auth.userUpdatedByAdmin`,
`auth.userInvited`, `auth.invitationRedeemed`, `auth.actionTaken` (feeds the
audit stream), `auth.accountDeletionRequested`, `auth.accountLockedByAdmin`,
`auth.accountUnlockedByAdmin`, `auth.allSessionsRevokedByAdmin`,
`auth.sessionRevokedByAdmin`, `auth.passwordResetByAdmin`,
`auth.ipRuleCreated`, `auth.ipRuleDeleted`. Plus `gdpr.erasureCompleted` as
a saga participant.

**Consumes:** `gdpr.erasureRequested` (durable `gdpr-auth`).

### Dependencies

`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`. No cross-service gRPC calls (it is the identity
layer everyone else calls).

### Testing strategy

Vitest. Pure handlers `(deps, principal, request) → response` with bcrypt/JWT
adapters injected (so tests don't pay real crypto cost) — assert every
INVALID_ARGUMENT / UNAUTHENTICATED / PERMISSION_DENIED / NOT_FOUND path, token
rotation + denylist + idempotency, enumeration-safe register/forgot flows,
`super_admin` bypass, and publish-after-commit ordering.
