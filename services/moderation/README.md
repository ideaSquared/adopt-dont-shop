# service.moderation

Moderation vertical — Phase 8 of the microservices migration.

Owns the `moderation.*` schema (Report, ModeratorAction,
ModerationEvidence, UserSanction, SupportTicket, SupportTicketResponse)
and exposes `ModerationService` over gRPC. Cross-cutting reads via
gRPC; consumes events (`chat.messageCreated`, `pets.created`,
`applications.submitted`) for content scanning + auto-report triggers.

## What's shipped so far

**Phase 8.1** — boot skeleton: `/health/simple` on `MODERATION_PORT`
(default 5007), OpenTelemetry boot, env-validated config.

**Phase 8.2** — `moderation.*` schema + migrations:
- `001_create_reports.ts` — reports with polymorphic
  (reported_entity_type, reported_entity_id).
- `002_create_report_status_transitions.ts` — append-only history
  feeding back into `reports.status`.
- `003_install_report_status_propagation_trigger.ts` — AFTER
  INSERT trigger that updates `reports.status` from
  `to_status`; DB owns the invariant.
- `004_create_moderator_actions.ts` — append-only history with
  `acknowledged_at` folded in from monolith migration 08.
- `005_create_moderation_evidence.ts` — polymorphic via
  (parent_type, parent_id) where parent_type is the enum
  discriminator.
- `006_create_user_sanctions.ts` — append-only sanction history
  with appeal + revocation columns and the
  `(user_id, is_active, end_date)` hot-path compound idx.
- `007_create_support_tickets.ts` — text[] tags with GIN idx,
  status/priority/category enums.
- `008_create_support_ticket_responses.ts` — paranoid with
  `deleted_at` idx, intra-schema FK to support_tickets with
  CASCADE.
- Run via `npm run db:migrate` (uses `@adopt-dont-shop/db` —
  inherits all four CAD-lesson fixes).

## What's NOT here yet

- **Phase 8.3** — gRPC `ModerationService` (file-report, moderator
  action, evidence upload, user sanction, support ticket).
- **Phase 8.4** — NATS subscribers on `chat.messageCreated`,
  `pets.created`, `applications.submitted`.
- **Phase 8.5** — Gateway routes `/api/moderation/*`.
- **Phase 8.6** — Cutover.

## Configuration

| Env var                | Default            | Required | Purpose                         |
| ---------------------- | ------------------ | -------- | ------------------------------- |
| `MODERATION_PORT`      | `5007`             |          | HTTP port for `/health/simple`. |
| `MODERATION_GRPC_PORT` | `6007`             |          | gRPC port (Phase 8.3c).         |
| `MODERATION_HOST`      | `0.0.0.0`          |          | Bind interface.                 |
| `MODERATION_SCHEMA`    | `moderation`       |          | Postgres schema.                |
| `DATABASE_URL`         | —                  | ✅       | Postgres connection string.     |
| `NATS_URL`             | `nats://nats:4222` |          | NATS bus URL.                   |
| `NODE_ENV`             | `development`      |          | Surfaces in health + logs.      |
