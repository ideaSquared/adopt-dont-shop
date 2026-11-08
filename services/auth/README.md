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
for the shared service boundaries / ownership model. This service sits at the
root of the dependency graph (everyone calls it). Its one outbound gRPC call is
`GetApplicantProfile` → `ApplicationService.Get` on **service.applications**
(`APPLICATIONS_GRPC_URL`), made under the caller's own principal to confirm the
caller may see that application before revealing who applied. The gateway's authenticate middleware calls
`AuthService.ValidateToken` on every request. Depends on the shared backend
packages `@adopt-dont-shop/{authz, config-secrets, db, events, lib.types,
observability, proto, service-bootstrap}`. For how this service was carved out
of the monolith, see
[`docs/backend/microservices-extraction-history.md`](../../docs/backend/microservices-extraction-history.md#auth).

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm db:seed      # bootstrap super_admin (other personas: root `pnpm db:seed`)
pnpm bootstrap:admin  # first super_admin via tsx (dev); production runs the compiled CLI, below
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

### First super_admin (production)

`db:seed` refuses to run in production and `tsx` is not in the image, so the first
`super_admin` is created by a one-shot compiled CLI. The password comes from stdin only:

```bash
printf '%s' "$ADMIN_PW" | docker compose -f docker-compose.prod.yml exec -T service-auth \
  node dist/db/bootstrap-admin.js --password-stdin --email you@example.org --first-name Ada --last-name Admin
```

Email and names may also come from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_FIRST_NAME` /
`BOOTSTRAP_ADMIN_LAST_NAME`. It exits non-zero if an active `super_admin` already exists.
See `docs/infrastructure/DEPLOYMENT-PLAN.md`.

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-auth`, HTTP published on `127.0.0.1:5002`:

```bash
pnpm docker:dev:detach                   # start the whole stack
docker compose logs -f service-auth      # follow just this service
curl localhost:5002/health/simple        # liveness probe
# Expected: {"status":"ok","service":"service.auth","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`). Auth additionally hard-requires `JWT_SECRET`,
`JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY` (all distinct — see below), so boot
fails fast without them:

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
JWT_SECRET=dev-access JWT_REFRESH_SECRET=dev-refresh \
ENCRYPTION_KEY=$(openssl rand -hex 32) \
pnpm --filter @adopt-dont-shop/service.auth dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `AuthService`
(`packages/proto`), proxied by the gateway under `/api/v1/auth/*`,
`/api/v1/sessions/*`, and `/api/v1/field-permissions/*`. `super_admin` bypasses
permission checks.

**Public (no principal):** `Login`, `RefreshToken`, `ValidateToken`,
`Register`, `VerifyEmail`, `ResendVerification`, `ForgotPassword`,
`ResetPassword`, `RedeemInvitation`.

**Service-to-service (unauth adapter, called by other services):**
`ProvisionInvitedUser`, `VerifyCredentials`.

**Authenticated (self):** `Logout`, `GetMe`, `ChangePassword`, `UpdateAccount`,
`ListSessions`, `RevokeSession`, `GetPrivacyPreferences` /
`UpdatePrivacyPreferences` / `ResetPrivacyPreferences`, `SetupTwoFactor` /
`EnableTwoFactor` / `DisableTwoFactor` / `RegenerateBackupCodes`,
`RecordConsent` / `GetConsentStatus`, `ExportUserData`,
`RequestAccountDeletion`.

**Application-scoped:** `GetApplicantProfile` returns an applicant's name and
email to a caller who can read the application (via
`ApplicationService.Get`) and holds `applications.read` for its rescue, or who
holds `admin.users.read`.

**Rescue-scoped:** `ListColleagueProfiles` (`staff.read`, max 100 ids) returns
userId, name and email only for requested ids that are staff of the caller's own
rescue; other ids are silently omitted.

**Admin-gated:**

| RPC                                                                                                                               | Permission                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `AssignRole`                                                                                                                      | `admin.security.manage`         |
| `SearchUsers`                                                                                                                     | `admin.users.search`            |
| `AdminGetUser` / `GetUserStatistics` / `GetUserPermissions`                                                                       | `admin.users.read`              |
| `AdminCreateUser`                                                                                                                 | `admin.users.create`            |
| `AdminUpdateUser` / `AdminResetPassword`                                                                                          | `admin.users.update`            |
| `DeactivateUser`                                                                                                                  | `admin.users.deactivate`        |
| `ReactivateUser`                                                                                                                  | `admin.users.reactivate`        |
| `BulkUpdateUsers`                                                                                                                 | `admin.users.bulk_update`       |
| `ListUserIdsByCohort`                                                                                                             | `admin.users.broadcast`         |
| `AdminListSessions` / `ListIpRules`                                                                                               | `admin.security.read`           |
| `AdminRevokeSession` / `AdminRevokeAllUserSessions` / `AdminLockAccount` / `AdminUnlockAccount` / `CreateIpRule` / `DeleteIpRule` | `admin.security.manage`         |
| `GetFieldPermissionDefaults*` / `ListFieldPermissionOverrides*`                                                                   | `admin.field_permissions.read`  |
| `UpsertFieldPermission` / `BulkUpsertFieldPermissions` / `DeleteFieldPermission`                                                  | `admin.field_permissions.write` |

Schema (`auth`): `users`, `roles` / `permissions`, `role_permissions` /
`user_roles`, `refresh_tokens`, `revoked_tokens`, `user_privacy_prefs`,
`field_permissions`, `ip_rules`, `user_invitations`, `consent_events`,
`permission_grants`, and `event_outbox` (the transactional publish-after-commit
outbox — see [`packages/events`](../../packages/events/README.md)). Migrations:
`src/migrations/001`–`034`.

**NATS** — emits (publish-after-commit): `auth.userLoggedIn`,
`auth.tokenRevoked`, `auth.tokenRefreshed`, `auth.roleAssigned`,
`auth.userRegistered`, `auth.emailVerified`, `auth.passwordResetRequested`,
`auth.actionTaken` (feeds the audit stream), and the admin/session/IP-rule
subjects; participates in the `gdpr.erasureCompleted` saga. Consumes
`gdpr.erasureRequested` (durable `gdpr-auth`).

## Scheduled jobs

`suspension-expiry-lift` (`src/suspension-expiry-job.ts`, via `@adopt-dont-shop/scheduler`) runs every minute and on start. It reactivates users whose timed suspension has ended (`auth.users.suspended_until <= now()`; a NULL `suspended_until` is an indefinite suspension and is never touched), in bounded batches under `FOR UPDATE SKIP LOCKED`, and records one `auth.actionTaken` (`lift_suspension`, no human actor) per user. Each interval slot is claimed in `scheduled_job_runs` so one replica runs it. The login path lifts an ended suspension lazily as well, so a missed job cannot keep someone out past their date. `suspended_until` is set by `ApplyUserSanction` (moderation suspensions) and cleared by any admin status change.

## Environment variables consumed

`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY` are
**required** — boot fails fast without them (a leaked access secret must not
compromise refresh, so the two JWT secrets are distinct by design; the three
secrets must also be distinct from one another — ADS-1047). `ENCRYPTION_KEY` is
the AES-256-GCM key (64 hex chars) that encrypts TOTP secrets at rest.
`AUTH_PORT` (5002), `AUTH_GRPC_PORT`
(6002), `AUTH_HOST`, `AUTH_SCHEMA` (`auth`), `NATS_URL`, and
`APPLICATIONS_GRPC_URL` (`service-applications:6005`) have dev defaults,
plus the standard `@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. Pure handlers `(deps, principal, request) → response` with bcrypt/JWT
adapters injected (so tests don't pay real crypto cost) — assert every
INVALID_ARGUMENT / UNAUTHENTICATED / PERMISSION_DENIED / NOT_FOUND path, token
rotation + denylist + idempotency, enumeration-safe register/forgot flows,
`super_admin` bypass, and publish-after-commit ordering. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
