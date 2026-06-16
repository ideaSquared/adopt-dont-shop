# Services

The backend is a Fastify **gateway** (the single REST/WS edge) fronting ten
gRPC microservices, all communicating over gRPC (request/response) and a NATS
JetStream bus (domain events). Each service owns its own Postgres **schema**
within the shared database and migrates it on container start.

See each service's own `README.md` for the full contract (schema, gRPC RPCs +
required permissions, NATS subjects, dependencies, testing).

## Index

| Service | npm name | HTTP | gRPC | Schema | Purpose | Key deps |
| --- | --- | --- | --- | --- | --- | --- |
| [gateway](./gateway/README.md) | `service.gateway` | 4000 | — | — | REST/WS edge: authenticate middleware, REST→gRPC fan-out to all services, rate limiting, circuit breaking, WebSocket fan-out, GDPR erasure kickoff | all service clients, `events`, `storage`, `observability` |
| [auth](./auth/README.md) | `service.auth` | 5002 | 6002 | `auth` | Identity & access: login/JWT, refresh rotation + revocation, roles/permissions, sessions, privacy prefs, field-permission overrides, admin user mgmt | `authz`, `db`, `events`, `proto` |
| [notifications](./notifications/README.md) | `service.notifications` | 5001 | 6001 | `notifications` | In-app / email / push notifications, preferences, email templates, device tokens, event-driven fan-out, broadcast | `events`, `db`, `proto`; calls auth/pets/rescue gRPC |
| [pets](./pets/README.md) | `service.pets` | 5003 | 6003 | `pets` | Pet listing catalogue: CRUD, event-sourced status state machine, favourites/ratings, rescue stats | `authz`, `db`, `events`, `proto` |
| [rescue](./rescue/README.md) | `service.rescue` | 5004 | 6004 | `rescue` | Rescue orgs: CRUD, verification workflow, staff invitations + membership, foster placements | `authz`, `db`, `events`, `proto`; calls pets gRPC |
| [applications](./applications/README.md) | `service.applications` | 5005 | 6005 | `applications` | Event-sourced adoption application lifecycle: drafts → submit → review → home visit → approve/reject/withdraw/adopt, documents | `authz`, `db`, `events`, `proto`; calls pets gRPC |
| [chat](./chat/README.md) | `service.chat` | 5006 | 6006 | `chat` | Application-scoped messaging: chats, messages, reactions, read receipts, search; real-time via NATS→gateway WS | `authz`, `db`, `events`, `proto` |
| [moderation](./moderation/README.md) | `service.moderation` | 5007 | 6007 | `moderation` | Reports, moderator actions + evidence, user sanctions + appeals, support tickets; auto-scans content from other services | `authz`, `db`, `events`, `proto` |
| [matching](./matching/README.md) | `service.matching` | 5008 | 6008 | `matching` | Swipe-based discovery / recommender: sessions, swipe log, match profiles, ranked recommendations | `authz`, `db`, `events`, `proto`; calls pets gRPC |
| [audit](./audit/README.md) | `service.audit` | 5009 | 6009 | `audit` | Forensic audit log (consumer of `*.actionTaken`), saved reports, and the GDPR erasure saga coordinator | `db`, `events`, `proto` |
| [cms](./cms/README.md) | `service.cms` | 5010 | 6010 | `cms` | Content management: public pages / help articles / blog posts with version history, navigation menus | `authz`, `db`, `events`, `proto` |

Ports are the per-service defaults from each `src/config.ts` and can be
overridden by env. The gateway addresses services at `service-<name>:<grpcPort>`
(see `services/gateway/src/config.ts`).

## Shared substrate

Every service is built on the same packages (see [`packages/README.md`](../packages/README.md)):

- `@adopt-dont-shop/service-bootstrap` — Fastify health server, gRPC bind /
  graceful shutdown, adapters, principal extraction, `HandlerError`.
- `@adopt-dont-shop/proto` — generated gRPC stubs + NATS payload types.
- `@adopt-dont-shop/events` — NATS publish-after-commit, durable subscribers,
  the `DOMAIN_EVENTS` JetStream topology, and the GDPR saga helpers.
- `@adopt-dont-shop/db` — Postgres client + node-pg-migrate runner.
- `@adopt-dont-shop/authz` — `requirePermission` / scope checks.
- `@adopt-dont-shop/observability` — OpenTelemetry, Winston logger, the shared
  Prometheus `/metrics` registry (`http_request_duration_seconds`,
  `grpc_handler_duration_seconds`).

## Testing

Every service uses **Vitest** (`pnpm test` runs `vitest run`). Handlers are
written as pure functions tested directly; the gRPC adapter / NATS transport is
thin. See each README's "Testing strategy" section.
