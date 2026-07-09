# service.audit

Audit vertical — Phase 10 of the microservices migration.

Append-only event store consuming `*.actionTaken` NATS topics from
every service. Idempotent on `event_id`. Row-level trigger rejects
UPDATE/DELETE so audit history is tamper-evident (CAD PR #49
pattern). Owns the `audit.*` schema. Replaces the monolith's
`auditLog.service.ts` + audit middleware.

## What's shipped so far

**Phase 10.1** — boot skeleton: `/health/simple` on `AUDIT_PORT`
(default 5009), OpenTelemetry boot, env-validated config.

**Phase 10.2** — `audit.*` schema + migrations:
- `001_create_audit_events.ts` — single `audit_events` table.
  Idempotent on `event_id` (producer's NATS message id is the PK).
  Columns capture both the actor (`actor_user_id`,
  `actor_email_snapshot`) and the target (`aggregate_type`,
  `aggregate_id`) so the gateway's `Query` and `GetByTarget` RPCs
  can serve admin forensic queries directly.
- Row-level trigger `audit_events_immutable` rejects UPDATE/DELETE
  (CAD PR #49 pattern, bundled with the table create so there's no
  install-time race). Per-transaction escape hatch via
  `SET LOCAL audit.allow_mutation = 'on'` for retention cleanups,
  mirroring the monolith's `audit_logs.allow_mutation` GUC.
- Indexes for forensic query patterns: `(aggregate_type,
  aggregate_id)`, `actor_user_id` (partial, NOT NULL),
  `occurred_at`, `service`, `subject`, `outcome`.
- Run via `pnpm db:migrate` (uses `@adopt-dont-shop/db` —
  inherits all four CAD-lesson fixes: `createSchema`,
  `ignorePattern`, `search_path`, advisory-lock retry).

## What's NOT here yet

- **Phase 10.3** — gRPC `AuditQueryService.{Query, GetByTarget}`
  with base64-JSON keyset cursors.
- **Phase 10.4** — NATS subscribers on every `*.actionTaken` topic
  (auth, pets, rescue, applications, chat, notifications,
  moderation, matching). Idempotent on `event_id`.
- **Phase 10.5** — Gateway routes `GET /api/audit/*` gated on
  `view Audit` ability (admin+).
- **Phase 10.6** — Cutover: delete `auditLog.service.ts`,
  `audit-log-formatting.ts`, and the audit middleware from the
  residual monolith. This service is then the sole
  producer/consumer.

## Configuration

| Env var           | Default            | Required | Purpose                         |
| ----------------- | ------------------ | -------- | ------------------------------- |
| `AUDIT_PORT`      | `5009`             |          | HTTP port for `/health/simple`. |
| `AUDIT_GRPC_PORT` | `6009`             |          | gRPC port (Phase 10.3c).        |
| `AUDIT_HOST`      | `0.0.0.0`          |          | Bind interface.                 |
| `AUDIT_SCHEMA`    | `audit`            |          | Postgres schema.                |
| `DATABASE_URL`    | —                  | ✅       | Postgres connection string.     |
| `NATS_URL`        | `nats://nats:4222` |          | NATS bus URL.                   |
| `NODE_ENV`        | `development`      |          | Surfaces in health + logs.      |

---

## Canonical reference (ADS-817)

### Responsibility

The forensic audit log + GDPR saga coordinator. Consumes state-changing domain
events (`*.actionTaken`) from every service and persists them to an append-only,
tamper-resistant store (a DB trigger blocks UPDATE/DELETE). Exposes read-only
gRPC queries for admins, manages saved report templates, and **coordinates the
GDPR erasure saga** — tracking each request until every expected service acks,
timing out / retrying stuck sagas, and exporting saga-state metrics. Schema:
`audit`.

### Schema (`audit`)

| Table | Purpose |
| --- | --- |
| `audit_events` | Append-only audit log (PK on `event_id` for idempotency). |
| `gdpr_erasure_requests` | GDPR saga state per `correlation_id` (completions JSONB, `completed_at` / `failed_at` / `timed_out_at`, `retry_count`). |
| `saved_reports` | User-created custom audit-report definitions. |
| `report_templates` | Seed/migration-owned report template library. |

Migrations: `services/audit/src/migrations/001`–`008`.

### gRPC RPCs

`AuditQueryService` — **read-only** (no write RPCs; writes happen via NATS
consumers). `super_admin` bypasses.

| RPC | Permission |
| --- | --- |
| `Query` | `admin.audit_logs` |
| `GetByTarget` | `admin.audit_logs` |
| `ListSavedReports` | `reports.read` (`reports.read` scoping for own) |
| `GetSavedReport` | `reports.read` |
| `CreateSavedReport` | `reports.create` |
| `UpdateSavedReport` | `reports.update` |
| `DeleteSavedReport` | `reports.delete` |
| `ListReportTemplates` | read-only (template library) |
| `GetGdprErasureRequest` | `admin.gdpr.read` (or the subject reading their own saga) |

### NATS subjects

**Consumes:**

| Subject | Effect |
| --- | --- |
| `*.actionTaken` | Persist an immutable audit event (idempotent on `event_id`). |
| `gdpr.erasureRequested` | INSERT/UPSERT the saga row (durable `audit-workers-gdpr-request`). |
| `gdpr.erasureCompleted` | Merge each service's completion; stamp `completed_at` once all 9 expected services ack, `failed_at` on an errored ack (durable `audit-workers-gdpr-completion`). |

**Emits:** `gdpr.erasureRequested` — **re-published by the saga sweep** to retry
a failed saga (same `correlationId`, distinct msgID; up to `GDPR_SAGA_MAX_RETRIES`).
Audit publishes no other domain events.

**Metrics:** exports the `gdpr_sagas{state}` gauge
(`in_progress`/`completed`/`failed`/`timed_out`) — see
[`docs/slo.md`](../../docs/slo.md) and the
[GDPR erasure runbook](../../docs/runbooks/gdpr-erasure-incident.md).

### Dependencies

`@adopt-dont-shop/{authz, config-secrets, db, events, lib.types, observability,
proto, service-bootstrap}`. No cross-service gRPC calls.

### Configuration extras

Beyond the standard vars: `GDPR_SAGA_DEADLINE_MS` (default 30 min — timeout
horizon) and `GDPR_SAGA_MAX_RETRIES` (default 3) tune the sweep scheduler.

### Testing strategy

Vitest. The query handlers, the GDPR subscribers (request/completion UPSERT
SQL), and the sweep scheduler (timeout + retry passes) are tested directly with
an injected pool + NATS — assert idempotent event persistence, the saga
completion/failure/timeout state machine, retry re-publish behaviour, and the
`gdpr_sagas` gauge values.
