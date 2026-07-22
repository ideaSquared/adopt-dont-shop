# service.rescue

## Purpose

Owns rescue organisations and their operational infrastructure: rescue CRUD, a
verification state machine (`pending` → `verified` / `rejected` / `suspended` /
`inactive`, admin-gated), staff invitations (one-time-readable token) + staff
membership, custom application questions, foster placements, and rescue-hosted
events. Owns the `rescue.*` schema. Classical (mostly CRUD with a few status
transitions).

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. Cross-service gRPC: calls
**service.pets** (`PETS_GRPC_URL`) in `CreateFosterPlacement` to validate pet
ownership. Read over gRPC by **service.notifications** (`ListStaffMembers` /
`Get`) for rescue fan-out. Depends on the shared backend packages
`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`.

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm db:seed      # seed dev data
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `RescueService`
(`packages/proto`), proxied by the gateway under `/api/v1/rescue(s)/*`,
`/api/v1/staff/*`, `/api/v1/foster/*`, `/api/v1/invitations/*`, and
`/api/v1/events/*`. Permission scope is the `rescue_id`; admin / `super_admin`
bypass scope.

| RPC | Permission |
| --- | --- |
| `Create` | `rescues.create` |
| `Get` / `List` | `rescues.read` (List defaults to verified-only) |
| `Update` | `rescues.update` (scoped; does not change status) |
| `Verify` | `admin.security.manage` (admin-only status transition) |
| `InviteStaff` | `staff.create` (scoped; mints token, returned once) |
| `GetMyStaffMembership` | authenticated (self-scoped) |
| `ListStaffMembers` | `staff.read` |
| `CreateFosterPlacement` | `foster.create` (scoped; validates pet via pets gRPC) |
| `ListFosterPlacements` / `GetFosterPlacement` | `foster.read` (scoped) |
| `EndFosterPlacement` | `foster.update` (scoped; idempotent) |
| `GetInvitationByToken` | none (the token is the credential) |

Schema (`rescue`): `rescues`, `rescue_settings`, `staff_members` (user↔rescue
join, no cross-schema FK), `invitations` (one-time token), `foster_placements`,
`application_questions`, `events`, `event_attendees`. Migrations:
`src/migrations/001`–`010`.

**NATS** — emits (publish-after-commit): `rescue.created`, `rescue.updated`,
`rescue.verified` / `rescue.rejected`, `rescue.staffInvited`,
`rescue.fosterPlacementCreated`, `rescue.fosterPlacementEnded`; participates in
the `gdpr.erasureCompleted` saga. Consumes `gdpr.erasureRequested` (durable
`gdpr-rescue`), with a reserved subscriber slot for `auth.userCreated` staff
denormalisation.

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `RESCUE_PORT`
(5004), `RESCUE_GRPC_PORT` (6004), `RESCUE_HOST`, `RESCUE_SCHEMA` (`rescue`),
`PETS_GRPC_URL`, and `NATS_URL` have dev defaults, plus the standard
`@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. The verification state machine is a pure, I/O-free transition table
tested directly; handlers are tested with pool + NATS (+ a stub pets client)
injected — assert each permission/scope path, one-time invitation-token
behaviour, foster-placement validation against the pets client, and
publish-after-commit ordering. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.

---

## Migration history

Rescue was the Phase 4 extraction: boot skeleton (4.1), the `rescue.*` schema
(4.2), the proto stubs + pure verification status-machine + handlers (4.3), and
the downstream NATS flow — the `rescue.verified` / `rescue.rejected` /
`rescue.staffInvited` subscribers in `services/notifications` (4.4). Gateway
routes (4.5) and the monolith cutover (4.6) followed.
