# service.applications

Applications vertical — Phase 5 of the microservices migration.

**The deepest extraction — CAD Phase 2 equivalent.** Owns the
`applications.*` schema (Application, ApplicationDraft, ApplicationAnswer,
ApplicationTimelineEntry, HomeVisit, Reference) and exposes
`ApplicationService` over gRPC.

Event-sourced — the application state machine
(`draft → submitted → under_review → home_visit_scheduled →
home_visit_completed → approved | rejected | withdrawn → adopted`)
drives multiple downstream consumers (notifications, moderation,
audit), and "how did we get here?" is a real product question for
adopters and rescue staff. Pure `apply`/`fold` domain + Postgres event
store + publish-after-commit on `applications.*` events.

## What's shipped so far

**Phase 5.1** — boot skeleton:
- `src/index.ts` starts a Fastify server on `APPLICATIONS_PORT`
  (default 5005), wires `/health/simple`.
- `src/instrumentation.ts` boots OpenTelemetry via
  `@adopt-dont-shop/observability` with
  `serviceName: 'service.applications'`.
- `src/config.ts` env validation. Hard-requires `DATABASE_URL` so
  misconfiguration fails fast at boot rather than at first request.
- `src/server.ts` `createServer({ config, logger? })`.

**Phase 5.2** — pure event-sourced application domain:
- `src/domain/types.ts` — `ApplicationState`, `ApplicationEvent`
  union (10 event types, one per command), `ApplicationCommand`
  union, `DomainError` with 4 codes
  (`ILLEGAL_TRANSITION` / `CONCURRENCY` / `INVALID_INPUT` /
  `MISSING_AGGREGATE`).
- `src/domain/apply.ts` — `apply(state, event)` pure reducer +
  `fold(events)` replay convenience + `INITIAL_STATE` sentinel. Same
  function runs at command time and hydration time so replay = live
  write.
- `src/domain/commands.ts` — `handle(state, command)` per-command
  invariant checks. Each command emits 0+ events; the gRPC handler
  in Phase 5.3b is the only thing that wraps this with DB writes
  and NATS publishes. Optimistic-concurrency check (`expectedVersion`
  vs `state.version`) on the draft-write commands.
- 47 tests across apply (per-event field stamping, immutability,
  fold-equals-event-by-event-apply) and commands (legal transitions,
  illegal-transition rejection, MISSING_AGGREGATE guard for non-
  StartDraft commands against INITIAL_STATE, the under_review
  self-loop for saveDraftAnswers, idempotent startReview, optimistic
  concurrency).

**Phase 5.3a** — proto + grpc-js stubs (lands in `@adopt-dont-shop/proto`):
- `proto/adopt_dont_shop/applications/v1/application.proto` defines
  `ApplicationService.{StartDraft, SaveDraftAnswers, SubmitDraft,
  StartReview, ScheduleHomeVisit, CompleteHomeVisit, Approve,
  Reject, Withdraw, MarkAdopted, Get, List}` + `Application`,
  `TimelineEntry` messages + `ApplicationStatus` (×9) /
  `HomeVisitOutcome` (×3) enums.

> The Phase 5.x rolling status that used to live here is no longer accurate — the schema, event store, gRPC handlers, and gateway routes all shipped. See the **Canonical reference** at the bottom of this README for the authoritative current state.

## Configuration

| Env var                  | Default            | Required | Purpose                                                                  |
| ------------------------ | ------------------ | -------- | ------------------------------------------------------------------------ |
| `APPLICATIONS_PORT`      | `5005`             |          | HTTP port for `/health/simple`.                                          |
| `APPLICATIONS_GRPC_PORT` | `6005`             |          | gRPC port `ApplicationService` will bind (Phase 5.3c).                   |
| `APPLICATIONS_HOST`      | `0.0.0.0`          |          | Bind interface (both HTTP + gRPC).                                       |
| `APPLICATIONS_SCHEMA`    | `applications`     |          | Postgres schema. Override for parallel test DBs.                         |
| `DATABASE_URL`           | —                  | ✅       | Postgres connection string. Same physical Postgres as `service.backend`. |
| `NATS_URL`               | `nats://nats:4222` |          | NATS bus URL.                                                            |
| `NODE_ENV`               | `development`      |          | Surfaces in health + logs.                                               |

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

Owns the event-sourced adoption-application lifecycle: draft → submit → review
→ home visit → approve / reject / withdraw / mark-adopted, plus document
attachments. Each application is an aggregate in a Postgres event store with a
denormalised read-model projection; every state change publishes an
`applications.*` event. Schema: `applications`.

### Schema (`applications`)

| Table | Purpose |
| --- | --- |
| `application_events` | Append-only event store (the source of truth). |
| `applications` | Denormalised read-model projection. |
| `application_status_transitions` | Status-change audit trail. |
| `home_visits` | Home-visit scheduling + outcome. |
| `home_visit_status_transitions` | Home-visit status audit. |
| `application_drafts` | In-progress draft persistence. |
| `application_documents` | Metadata for files attached to an application. |

Migrations: `services/applications/src/migrations/001`–`009` (006 installs a
home-visit status-propagation trigger).

### gRPC RPCs

`ApplicationService`. Scope is owner (adopter) or `rescue_id`; `super_admin`
bypasses.

| RPC | Permission |
| --- | --- |
| `StartDraft` | `applications.create` (resolves pet → rescue via pets gRPC) |
| `SaveDraftAnswers` | `applications.update` (owner/rescue scope) |
| `SubmitDraft` | `applications.update` (owner/rescue scope) |
| `StartReview` | `applications.process` (rescue scope) |
| `ScheduleHomeVisit` | `applications.process` (rescue scope) |
| `CompleteHomeVisit` | `applications.process` (rescue scope) |
| `Approve` | `applications.approve` (rescue scope) |
| `Reject` | `applications.reject` (rescue scope) |
| `Withdraw` | `applications.update` (owner/rescue scope) |
| `MarkAdopted` | `applications.approve` (rescue scope) |
| `Get` | `applications.view` (owner/rescue scope) |
| `List` | `applications.view` (scope-pinned) |
| `GetStats` | `applications.view` |
| `AddDocument` | `applications.update` (rescue scope) |
| `ListDocuments` | `applications.view` (owner/rescue scope) |
| `RemoveDocument` | `applications.update` (rescue scope) |

### NATS subjects

**Emits** (publish-after-commit): `applications.draftCreated`,
`applications.draftUpdated`, `applications.submitted`,
`applications.reviewStarted`, `applications.homeVisitScheduled`,
`applications.homeVisitCompleted`, `applications.approved`,
`applications.rejected`, `applications.withdrawn`, `applications.adopted`. Plus
`gdpr.erasureCompleted` as a saga participant.

**Consumes:** `gdpr.erasureRequested` (durable `gdpr-applications`).

### Dependencies

`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`. Cross-service gRPC: calls **service.pets**
(`PETS_GRPC_URL`) in `StartDraft` to resolve a pet's owning rescue.

### Testing strategy

Vitest. Pure handlers over the event store + projection — assert each lifecycle
transition (valid + invalid), permission/scope enforcement, the event-store →
read-model projection, document add/remove, and publish-after-commit ordering.
