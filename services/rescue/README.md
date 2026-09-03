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
ownership, and **service.applications** (`APPLICATIONS_GRPC_URL`) in
`GetEventAnalytics` → `CountAdoptedAdopters` to compute registered-then-adopted
attribution (ADS-941). Read over gRPC by **service.notifications**
(`ListStaffMembers` / `Get`) for rescue fan-out. Depends on the shared backend
packages `@adopt-dont-shop/{authz, config-secrets, db, events, lib.types,
observability, proto, service-bootstrap}`. For how this service was carved out
of the monolith, see
[`docs/backend/microservices-extraction-history.md`](../../docs/backend/microservices-extraction-history.md#rescue).

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

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-rescue`, HTTP published on `127.0.0.1:5004`:

```bash
pnpm docker:dev:detach                     # start the whole stack
docker compose logs -f service-rescue      # follow just this service
curl localhost:5004/health/simple          # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.rescue","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`). It also calls pets + applications over gRPC, so point
those at running services (or accept the degraded paths):

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
PETS_GRPC_URL=localhost:6003 APPLICATIONS_GRPC_URL=localhost:6005 \
pnpm --filter @adopt-dont-shop/service.rescue dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `RescueService`
(`packages/proto`), proxied by the gateway under `/api/v1/rescue(s)/*`,
`/api/v1/staff/*`, `/api/v1/foster/*`, `/api/v1/invitations/*`, and
`/api/v1/events/*`. Permission scope is the `rescue_id`; admin / `super_admin`
bypass scope.

| RPC                                                                                                                     | Permission                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Create`                                                                                                                | `rescues.create`                                                                      |
| `Get`                                                                                                                   | `rescues.read` (anonymous/non-privileged readers see a `verified` rescue only)        |
| `List`                                                                                                                  | `rescues.read` (defaults to verified-only; `admin.security.manage` sees all statuses) |
| `Update`                                                                                                                | `rescues.update` (scoped; does not change status)                                     |
| `Verify` / `Delete` / `UpdateRescuePlan` / `SendRescueEmail`                                                            | `admin.security.manage` (admin-only)                                                  |
| `GetRescueStatistics` / `CountRescues`                                                                                  | `rescues.read`                                                                        |
| `InviteStaff`                                                                                                           | `staff.create` (scoped) or `admin.security.manage`; mints token, returned once        |
| `GetMyStaffMembership`                                                                                                  | authenticated (self-scoped)                                                           |
| `ListStaffMembers`                                                                                                      | `staff.read` (or `admin.security.manage`)                                             |
| `CreateStaffMember`                                                                                                     | `staff.create` (scoped)                                                               |
| `UpdateStaffMember`                                                                                                     | `staff.update` (scoped)                                                               |
| `RemoveStaffMember`                                                                                                     | `staff.delete` (scoped) or `admin.security.manage`                                    |
| `ListRescueInvitations` / `CancelRescueInvitation`                                                                      | `admin.security.manage`                                                               |
| `CreateFosterPlacement`                                                                                                 | `foster.create` (scoped; validates pet via pets gRPC)                                 |
| `ListFosterPlacements` / `GetFosterPlacement`                                                                           | `foster.read` (scoped)                                                                |
| `EndFosterPlacement`                                                                                                    | `foster.update` (scoped; idempotent)                                                  |
| `GetInvitationByToken` / `AcceptInvitation`                                                                             | none (the token is the credential)                                                    |
| `ListApplicationQuestions`                                                                                              | `applications.read` (scoped)                                                          |
| `CreateApplicationQuestion` / `UpdateApplicationQuestion` / `DeleteApplicationQuestion` / `ReorderApplicationQuestions` | `applications.update` (scoped)                                                        |
| `ListEvents` / `GetEvent` / `GetEventAttendees` / `GetEventAnalytics`                                                   | `events.read` (+ rescue scope)                                                        |
| `CreateEvent`                                                                                                           | `events.create`                                                                       |
| `UpdateEvent` / `AddEventAttendee` / `CheckInAttendee`                                                                  | `events.update` (+ rescue scope)                                                      |
| `DeleteEvent`                                                                                                           | `events.delete` (+ rescue scope)                                                      |

Schema (`rescue`): `rescues`, `rescue_settings`, `staff_members` (user↔rescue
join, no cross-schema FK), `invitations` (one-time token), `foster_placements`,
`application_questions`, `events`, `event_attendees`, and `event_outbox` (the
transactional publish-after-commit outbox — see
[`packages/events`](../../packages/events/README.md)). Migrations:
`src/migrations/001`–`012`.

**NATS** — emits (publish-after-commit): `rescue.created`, `rescue.updated`,
`rescue.verified` / `rescue.rejected`, `rescue.staffInvited`,
`rescue.fosterPlacementCreated`, `rescue.fosterPlacementEnded`; participates in
the `gdpr.erasureCompleted` saga. Consumes `gdpr.erasureRequested` (durable
`gdpr-rescue`), with a reserved subscriber slot for `auth.userCreated` staff
denormalisation.

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `RESCUE_PORT`
(5004), `RESCUE_GRPC_PORT` (6004), `RESCUE_HOST`, `RESCUE_SCHEMA` (`rescue`),
`PETS_GRPC_URL`, `APPLICATIONS_GRPC_URL`, and `NATS_URL` have dev defaults,
plus the standard `@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. The verification state machine is a pure, I/O-free transition table
tested directly; handlers are tested with pool + NATS (+ a stub pets client
and a stub applications client) injected — assert each permission/scope path,
one-time invitation-token behaviour, foster-placement validation against the
pets client, event-analytics attribution against the applications client, and
publish-after-commit ordering. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
