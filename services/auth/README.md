# service.auth

Auth vertical — Phase 2 of the microservices migration.

Owns the `auth.*` schema (User, RefreshToken, RevokedToken, Role,
Permission, UserRole, RolePermission, TwoFactorRecovery, DeviceToken,
IpRule, UserConsent) and exposes `AuthService.{Login, Logout,
RefreshToken, ValidateToken, GetMe, AssignRole}` over gRPC.

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
- Run with `npm run db:migrate`.

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

## What's NOT here yet

- **Phase 2.3b–c** — gRPC `AuthService` runtime:
  - handler logic: Login (bcrypt compare → JWT mint), Logout
    (revoke refresh), RefreshToken (rotate), ValidateToken (cheap
    JWT verify — hot path), GetMe (denormalise principal),
    AssignRole (admin-only)
  - gRPC server boot + adapter (same pattern as `service.notifications`)
- **Phase 2.4** — NATS publishers: `auth.userCreated`,
  `auth.roleAssigned`, `auth.tokenRevoked`. Downstream services
  (notifications, applications) consume these.
- **Phase 2.5** — Gateway auth middleware: every non-auth route
  calls `service.auth.ValidateToken` to populate the
  `x-user-{id,roles,permissions,rescue-id}` metadata headers (which
  the Phase 1.6 dev-mode currently trusts from the client). Same
  middleware also gates HTTP routes by `ability.can` via
  `@adopt-dont-shop/authz`.
- **Phase 2.6** — Cutover: gateway routes `/api/auth/*` here; the
  monolith's auth code deletes.

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
npm run dev

# Production build
npm run build
npm run start
```
