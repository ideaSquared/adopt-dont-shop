# service.applications

## Purpose

Owns the event-sourced adoption-application lifecycle: draft → submit → review
→ home visit → approve / reject / withdraw / mark-adopted, plus document
attachments. Each application is an aggregate in a Postgres event store with a
denormalised read-model projection; every state change publishes an
`applications.*` event. Owns the `applications.*` schema. This is the deepest
extraction (CAD Phase 2 equivalent) — the state machine drives multiple
downstream consumers (notifications, moderation, audit) and "how did we get
here?" is a real product question, so the event log is the source of truth.

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. Cross-service gRPC: calls
**service.pets** (`PETS_GRPC_URL`) in `StartDraft` to resolve a pet's owning
rescue. Depends on the shared backend packages `@adopt-dont-shop/{authz,
config-secrets, db, events, lib.types, observability, proto,
service-bootstrap}`.

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

HTTP surface: `/health/simple`. Everything else is gRPC `ApplicationService`
(`packages/proto`), proxied by the gateway under `/api/v1/applications/*`.
Scope is owner (adopter) or `rescue_id`; `super_admin` bypasses.

| RPC | Permission |
| --- | --- |
| `StartDraft` | `applications.create` (resolves pet → rescue via pets gRPC) |
| `SaveDraftAnswers` / `SubmitDraft` / `Withdraw` | `applications.update` (owner/rescue scope) |
| `StartReview` / `ScheduleHomeVisit` / `CompleteHomeVisit` | `applications.process` (rescue scope) |
| `Approve` / `MarkAdopted` | `applications.approve` (rescue scope) |
| `Reject` | `applications.reject` (rescue scope) |
| `Get` / `List` / `GetStats` / `ListDocuments` | `applications.view` (scope-pinned) |
| `AddDocument` / `RemoveDocument` | `applications.update` (rescue scope) |

Schema (`applications`): `application_events` (append-only event store — the
source of truth), `applications` (read-model projection),
`application_status_transitions`, `home_visits`,
`home_visit_status_transitions`, `application_drafts`, `application_documents`.
Migrations: `src/migrations/001`–`009`.

**NATS** — emits (publish-after-commit): `applications.draftCreated`,
`applications.draftUpdated`, `applications.submitted`,
`applications.reviewStarted`, `applications.homeVisitScheduled`,
`applications.homeVisitCompleted`, `applications.approved`,
`applications.rejected`, `applications.withdrawn`, `applications.adopted`;
participates in the `gdpr.erasureCompleted` saga. Consumes
`gdpr.erasureRequested` (durable `gdpr-applications`).

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `APPLICATIONS_PORT`
(5005), `APPLICATIONS_GRPC_PORT` (6005), `APPLICATIONS_HOST`,
`APPLICATIONS_SCHEMA` (`applications`), `PETS_GRPC_URL`, and `NATS_URL` have dev
defaults, plus the standard `@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. The domain is a pure `apply`/`fold` reducer with a separate
command layer (`handle(state, command)` → 0+ events), so the bulk of the suite
runs with no I/O — asserting each lifecycle transition (valid + invalid),
optimistic-concurrency (`expectedVersion` vs `state.version`), the event-store →
read-model projection, permission/scope enforcement, and publish-after-commit
ordering. See [`docs/backend/testing.md`](../../docs/backend/testing.md) for
shared conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.

---

## Migration history

Applications was the Phase 5 extraction (the deepest — CAD Phase 2 equivalent),
landed incrementally: a boot skeleton (5.1), the pure event-sourced domain —
`apply`/`fold` reducer + per-command invariant checks with the same function
running at command time and hydration time so replay equals live write (5.2) —
then the proto stubs, gRPC handlers wrapping the domain with DB writes + NATS
publishes, and the gateway routes (5.3+).
