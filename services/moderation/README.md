# service.moderation

## Purpose

Owns content moderation and user discipline: report filing, moderator
assignment / resolution, logged moderator actions + evidence, user sanctions
(warnings, restrictions, bans) + appeals, and support tickets. Subscribes to
content events from other services to auto-scan and auto-file reports as the
system user. Owns the `moderation.*` schema.

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. No outbound cross-service
gRPC calls (cross-cutting composition is done at the gateway); instead it
consumes content events from other services. Depends on the shared backend
packages `@adopt-dont-shop/{authz, config-secrets, db, events, lib.types,
observability, proto, service-bootstrap}`. For how this service was carved out
of the monolith, see
[`docs/backend/microservices-extraction-history.md`](../../docs/backend/microservices-extraction-history.md#moderation).

## Scripts

```bash
pnpm dev          # tsx watch — starts the HTTP + gRPC servers
pnpm build        # tsc build
pnpm start        # run the built server
pnpm test         # Vitest (run mode)
pnpm db:migrate   # run pending migrations (node-pg-migrate)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Running locally

In the Docker dev stack (primary workflow) this runs as container
`service-moderation`, HTTP published on `127.0.0.1:5007`:

```bash
pnpm docker:dev:detach                         # start the whole stack
docker compose logs -f service-moderation      # follow just this service
curl localhost:5007/health/simple              # liveness probe
# Expected: {"status":"ok","service":"@adopt-dont-shop/service.moderation","environment":"development"}
```

Bare-metal (this service alone, against host Postgres + NATS from
`pnpm dev:services`):

```bash
DATABASE_URL=postgres://adopt_user:adopt_pass@localhost:5432/adopt_dont_shop_dev \
NATS_URL=nats://localhost:4222 \
pnpm --filter @adopt-dont-shop/service.moderation dev
```

To debug the container, see
[`docs/runbooks/dev-stack-troubleshooting.md`](../../docs/runbooks/dev-stack-troubleshooting.md).

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `ModerationService`
(`packages/proto`), proxied by the gateway under `/api/v1/moderation/*`,
`/api/v1/admin/{moderation,support}/*`, `/api/v1/admin/inbox`, and
`/api/v1/support/*`. `super_admin` / admin bypass.

| RPC                                                           | Permission                                            |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `FileReport` / `OpenSupportTicket`                            | authenticated (any user)                              |
| `GetReport` / `ListReports`                                   | `moderation.reports.view` (reporter may read own)     |
| `AssignReport` / `ResolveReport`                              | `moderation.reports.manage`                           |
| `LogModeratorAction` / `ListModeratorActions` / `AddEvidence` | `moderation.actions.manage`                           |
| `IssueSanction`                                               | `moderation.sanctions.manage`                         |
| `ListUserSanctions`                                           | self-scoped; `moderation.sanctions.manage` for others |
| `AppealSanction`                                              | self-scoped (the sanctioned user)                     |
| `GetSupportTicket` / `RespondToTicket`                        | owner, or `moderation.tickets.manage`                 |
| `ListSupportTickets`                                          | self-scoped; `moderation.tickets.manage` for all      |

Schema (`moderation`): `reports`, `report_status_transitions`,
`moderator_actions`, `moderation_evidence` (polymorphic), `user_sanctions`,
`support_tickets`, `support_ticket_responses`, and `event_outbox` (the
transactional publish-after-commit outbox — see
[`packages/events`](../../packages/events/README.md)). Migrations:
`src/migrations/001`–`013` (003 installs a status-propagation trigger).

**NATS** — emits (publish-after-commit): `moderation.reportFiled`,
`moderation.reportAssigned`, `moderation.reportResolved`,
`moderation.actionLogged`, `moderation.sanctionIssued`,
`moderation.sanctionAppealed`, `moderation.ticketOpened`; participates in the
`gdpr.erasureCompleted` saga. Consumes `chat.messageCreated`, `pets.created`,
`applications.submitted` (content scanning → auto-report), and
`gdpr.erasureRequested` (durable `gdpr-moderation`).

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `MODERATION_PORT`
(5007), `MODERATION_GRPC_PORT` (6007), `MODERATION_HOST`, `MODERATION_SCHEMA`
(`moderation`), and `NATS_URL` have dev defaults, plus the standard
`@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. Pure handlers split per surface (reports / actions+evidence /
sanctions / tickets) with pool + NATS injected — assert each permission gate +
self-scope exception, the report/sanction state machines, the content-scanner
auto-report path, and publish-after-commit ordering. See
[`docs/testing.md`](../../docs/testing.md#backend-specifics) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
