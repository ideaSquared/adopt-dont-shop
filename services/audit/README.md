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
- Run via `npm run db:migrate` (uses `@adopt-dont-shop/db` —
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
