# service.audit

## Purpose

The forensic audit log + GDPR saga coordinator. Consumes state-changing domain
events (`*.actionTaken`) from every service and persists them to an
append-only, tamper-resistant store (a DB trigger blocks UPDATE/DELETE, CAD PR
#49 pattern; idempotent on `event_id`). Exposes read-only gRPC queries for
admins, manages saved report templates, and **coordinates the GDPR erasure
saga** — tracking each request until every expected service acks, timing
out / retrying stuck sagas, and exporting saga-state metrics. Owns the `audit.*`
schema.

## Location in the architecture

See [`docs/infrastructure/MICROSERVICES-STANDARDS.md`](../../docs/infrastructure/MICROSERVICES-STANDARDS.md)
for the shared service boundaries / ownership model. No outbound cross-service
gRPC calls — it is a pure event sink + query surface. Depends on the shared
backend packages `@adopt-dont-shop/{authz, config-secrets, db, events,
lib.types, observability, proto, service-bootstrap}`. The GDPR saga is
documented in [`docs/slo.md`](../../docs/slo.md) and the
[GDPR erasure runbook](../../docs/runbooks/gdpr-erasure-incident.md).

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

## REST / gRPC contract

HTTP surface: `/health/simple`. Everything else is gRPC `AuditQueryService`
(`packages/proto`), **read-only** — writes happen via NATS consumers, never an
RPC. Proxied by the gateway under `/api/v1/audit/*` and `/api/v1/reports/*`,
gated on the `view Audit` ability (admin+). `super_admin` bypasses.

| RPC | Permission |
| --- | --- |
| `Query` / `GetByTarget` | `admin.audit_logs` |
| `ListSavedReports` / `GetSavedReport` | `reports.read` |
| `CreateSavedReport` / `UpdateSavedReport` / `DeleteSavedReport` | `reports.create` / `.update` / `.delete` |
| `ListReportTemplates` | read-only (template library) |
| `GetGdprErasureRequest` | `admin.gdpr.read` (or the subject reading their own saga) |

Schema (`audit`): `audit_events` (append-only, PK `event_id`),
`gdpr_erasure_requests` (saga state per `correlation_id`), `saved_reports`,
`report_templates`. Migrations: `src/migrations/001`–`008`.

**NATS** — consumes `*.actionTaken` (persist an immutable event, idempotent on
`event_id`), `gdpr.erasureRequested` (durable `audit-workers-gdpr-request`), and
`gdpr.erasureCompleted` (merge each service's completion; stamp `completed_at`
once all 9 expected services ack — durable `audit-workers-gdpr-completion`).
Emits `gdpr.erasureRequested` only as a saga-sweep retry (same `correlationId`,
distinct msgID). Exports the `gdpr_sagas{state}` gauge.

## Environment variables consumed

`DATABASE_URL` is **required** (boot fails fast without it). `AUDIT_PORT`
(5009), `AUDIT_GRPC_PORT` (6009), `AUDIT_HOST`, `AUDIT_SCHEMA` (`audit`), and
`NATS_URL` have dev defaults. Two saga-sweep tunables:
`GDPR_SAGA_DEADLINE_MS` (default 30 min) and `GDPR_SAGA_MAX_RETRIES` (default
3). Plus the standard `@adopt-dont-shop/observability` vars. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest. The query handlers, the GDPR subscribers (request/completion UPSERT
SQL), and the sweep scheduler (timeout + retry passes) are tested directly with
an injected pool + NATS — assert idempotent event persistence, the saga
completion/failure/timeout state machine, retry re-publish behaviour, and the
`gdpr_sagas` gauge values. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.

---

## Migration history

Audit was the Phase 10 extraction — it replaces the monolith's
`auditLog.service.ts` + audit middleware. Landed as a boot skeleton (10.1), the
`audit.*` schema with the immutability trigger (10.2), the read-only gRPC query
service with keyset cursors (10.3), the `*.actionTaken` NATS subscribers across
all services (10.4), the gateway routes (10.5), and the monolith cutover (10.6).
